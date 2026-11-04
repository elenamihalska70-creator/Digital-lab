# LOT NOTIFY-01A — Notification fiable des nouvelles demandes clients

**Statut : implémenté et testé en local. Rien n'est appliqué ni déployé.**
Aucune écriture dans Supabase Production, aucun déploiement (Preview ou Production), aucun secret réel, aucun e-mail réel envoyé.

Branche `feat/notify-01`, à partir de `origin/main` `c80ce8e` (OG-01), intégré par fast-forward.

## 1. Objectif et périmètre

Chaque nouvelle demande enregistrée dans `public.contact_requests` déclenche **un seul** e-mail, envoyé à deux destinataires fixes :

- `contact@digitallab.studio`
- `elenamihalska70@gmail.com`

| Dans le périmètre | Hors périmètre (reporté) |
|---|---|
| File d'envoi PostgreSQL, idempotence, plafonds, relances, diagnostic, pause, rollback | Panneau d'administration, bouton « renvoyer » |
| Neutralisation du relais public `/api/send-contact-email` | Refonte des références `DL-AAAA-NNNN` |
| Rattrapage planifié par Vercel Cron | `pg_cron` / `pg_net` (NOTIFY-01B, si autorisé) |
| — | Turnstile / insertion côté serveur |

**Inchangé :**
- le frontend (`src/` : aucune ligne modifiée) ;
- les politiques RLS ;
- les colonnes, droits et données de `contact_requests` ;
- DB-SEC-01 et DB-MSG-01 ;
- les anciennes fonctions e-mail désactivées.

Aucune dépendance à n8n.

## 2. Architecture retenue (B′)

```
Navigateur (inchangé)
  1. INSERT contact_requests (clé anon, droits DB-SEC-01)
        │ trigger AFTER INSERT notify_01a_enqueue (n'empêche jamais l'insertion)
        ▼
     notify_01a.outbox  (pending)
  2. POST /api/send-contact-email (appel existant du ContactForm)
        │ le corps n'est JAMAIS lu : la route réveille le worker
        ▼
     worker Vercel ── RPC service_role ──▶ notify_01a_claim / _mark / _reconcile
        │ Idempotency-Key = notify-01a/<request_id>
        ▼
     Resend ──▶ contact@digitallab.studio + elenamihalska70@gmail.com (un seul envoi)

Vercel Cron 4×/jour (01, 07, 13, 19 h UTC) ──▶ /api/cron/notify-reconcile (Bearer CRON_SECRET)
     reconcile (demandes sans ligne de file) + relances + jusqu'à 20 envois
```

**Pourquoi ce n'est pas un relais :** l'appelant de `/api/send-contact-email` ne choisit rien.
- Les destinataires sont codés en dur (`api/_lib/notify/config.js`).
- Le contenu vient uniquement de la demande déjà enregistrée en base.
- Le corps de la requête n'est jamais lu.
- Un appel sans demande en attente n'envoie rien.

## 3. Objets créés en base (`docs/sql/notify-01a/01-migration.sql`)

| Objet | Rôle | Accès |
|---|---|---|
| Schéma `notify_01a` | Privé, non exposé par l'API | Aucun droit pour `anon` / `authenticated` |
| `notify_01a.settings` | `enabled` (false à la création), `cutover_at`, plafonds (20/h, 80/24 h glissantes), 8 tentatives, fenêtre de 23 h, bail de 2 min | Propriétaire uniquement |
| `notify_01a.outbox` | Une ligne par notification. `request_id` unique, FK `on delete cascade`, **aucune copie du contenu** | Propriétaire uniquement |
| Trigger `notify_01a_enqueue` sur `contact_requests` | Met en file si `enabled`. Sur erreur : `WARNING`, l'insertion réussit, `reconcile` rattrape | — |
| `public.notify_01a_claim(int)` | Distribue au plus 10 lignes dues, dans les plafonds, sous verrou consultatif et `SKIP LOCKED`, avec bail | `service_role` seulement |
| `public.notify_01a_mark(...)` | Résultat d'une tentative. `attempts` sert de jeton anti-écrasement | `service_role` seulement |
| `public.notify_01a_reconcile()` | Remet en file les demandes postérieures à `cutover_at` qui n'ont pas de ligne, et renvoie des compteurs | `service_role` seulement |
| `notify_01a.requeue(uuid, bool)`, `cancel_pending()`, `v_diagnostic` | Outils d'exploitation dans l'éditeur SQL | Propriétaire uniquement |

Les fonctions `public.notify_01a_*` reçoivent de Supabase un `EXECUTE` par défaut pour `anon` et `authenticated`. Il est **révoqué dans la même transaction**, et un autocontrôle fait échouer la migration si un rôle de l'API garde un accès.

## 4. Idempotence Resend : sémantique vérifiée et conséquences

Source : <https://resend.com/docs/dashboard/emails/idempotency-keys> (consultée le 2026-11-04).

| Cas | Comportement Resend |
|---|---|
| Durée de conservation des clés | **24 h** ; 256 caractères maximum |
| Même clé et même contenu | Réponse d'origine, **pas de nouvel envoi** |
| Même clé et contenu différent | `409 invalid_idempotent_request` (réessayer ne sert à rien) |
| Même clé, requête encore en cours | `409 concurrent_idempotent_requests` (réessayer plus tard) |
| Délai dépassé | **Non documenté.** Réessayer avec la même clé et le même contenu dans les 24 h est sûr dans les deux cas (vérifié en local avec le faux Resend, scénario E3) |

**Conséquences dans le code :**
1. **Contenu déterministe** (`render.js`).
   - Seuls des champs immuables sont utilisés : pas de statut, pas d'heure courante, une date formatée à partir de parties numériques.
   - Le SHA-256 du JSON exact envoyé est stocké. S'il change à la tentative suivante (par exemple `RESEND_FROM_EMAIL` modifié), la ligne passe en `dead: payload_changed` sans envoi.
2. **Relances automatiques limitées à 23 h** après la première tentative. Au-delà, la ligne passe en `dead: window_expired`, et la reprise est manuelle : `requeue(id, true)` génère une nouvelle clé `…/manual-<epoch>`, après vérification des journaux Resend.
3. **Classement des erreurs :**

   | Erreur | Traitement |
   |---|---|
   | `timeout`, `network`, 5xx, 429, 409 `concurrent`, 401/403 (clé ou domaine, corrigeables) | Relance |
   | 409 `invalid`, 400, 422, autres 4xx | `dead` immédiat |

4. **Envoi réussi mais enregistrement raté :** le bail expire, la ligne est redistribuée avec la même clé, Resend renvoie la réponse d'origine, puis la ligne passe en `sent`.

## 5. Limites de Vercel Hobby et délais réels

Source : <https://vercel.com/docs/cron-jobs/usage-and-pricing> et `/manage-cron-jobs` (consultées le 2026-11-04).

- **Hobby :**
  - chaque expression cron s'exécute **au plus une fois par jour**, à n'importe quelle minute de l'heure prévue (±59 min) ;
  - une expression plus fréquente fait échouer le déploiement ;
  - le plan autorise 100 crons par projet, d'où les **4 entrées quotidiennes** de `vercel.json` (un passage environ toutes les 6 h).
- **Tous les plans :**
  - la livraison est sans garantie : une exécution peut être manquée ou **doublée** ;
  - **pas de relance** d'une exécution en échec ;
  - le cron ne tourne que sur le déploiement de Production ;
  - `Authorization: Bearer $CRON_SECRET`.
- **À vérifier au premier déploiement :** que Vercel accepte bien 4 expressions quotidiennes sur le même chemin. La doc le montre pour un compte Pro, mais je n'ai pas pu le tester ici. Si le déploiement est refusé, n'en garder qu'une (dégradation décrite ci-dessous).
- **Conditions d'utilisation :** le plan Hobby est réservé à un usage non commercial. Le plan du compte n'a pas pu être lu (Vercel MCP : 403). À vérifier.

### Calendrier des tentatives

| Tentative échouée n° | Prochaine tentative au plus tôt | Cumul |
|---|---|---|
| 1 | +1 min | 1 min |
| 2 | +5 min | 6 min |
| 3 | +15 min | 21 min |
| 4 | +1 h | 1 h 21 |
| 5 | +3 h | 4 h 21 |
| 6 | +6 h | 10 h 21 |
| 7 | +12 h | 22 h 21 |
| 8 | — | `dead` (`max_attempts`) |

**Important :** une tentative n'a lieu que lorsqu'un appel arrive (le formulaire d'un visiteur, un cron, ou un `curl` manuel avec le secret). En Hobby, après un échec, la relance effective arrive donc **au prochain cron, c'est-à-dire en moins de 7 h environ**, ou plus tôt si un autre visiteur soumet le formulaire.

**Délai de notification :**
- cas normal : immédiat, quelques secondes après la soumission ;
- appel du navigateur perdu, ou Resend en panne : jusqu'à environ 7 h ;
- avec un seul cron quotidien (repli) : jusqu'à environ 25 h, avec un risque de `window_expired` si le premier échec a eu lieu peu après le passage du cron.

## 6. Protections

| Menace | Protection |
|---|---|
| Relais public | Corps ignoré, destinataires codés en dur, contenu lu en base uniquement |
| Appels non autorisés au cron | `CRON_SECRET` d'au moins 16 caractères, comparaison en temps constant, 503 si absent |
| Appels répétés au réveil | Origine vérifiée (garde-fou, pas une authentification), 10 appels par IP sur 10 min (mémoire de l'instance), 413 au-delà de 20 ko, au plus 3 envois par appel |
| Accès à la file | Schéma privé ; trois fonctions exécutables par `service_role` seulement ; `service_role` n'a aucun accès direct aux tables |
| Doublons | `request_id` unique, verrou et bail, jeton `attempts`, clé d'idempotence, contenu déterministe, `cutover_at` (pas de renvoi de l'historique) |
| Pertes | File remplie dans la transaction de la demande, `reconcile` sur `cutover_at`, aucune suppression automatique, `dead` visible dans `v_diagnostic` |
| Afflux (l'insertion anonyme reste ouverte) | 20 par heure et 80 sur 24 h, plus une seule alerte de volume par jour. Les demandes en attente partent plus tard |
| Fuite dans les journaux | Uniquement des identifiants, des compteurs et des codes courts. Jamais de nom, d'e-mail, de message ni de secret (testé) |
| Mauvaise configuration | Expéditeur obligatoirement en `@digitallab.studio` (l'adresse de test `resend.dev` ne livre qu'au propriétaire du compte) ; clé `anon` refusée comme clé de service ; redirection vers un faux Resend ignorée sur Vercel |

## 7. Doublons Zimbra → Gmail

Un seul envoi Resend avec les deux adresses en `To` produit un seul `Message-ID`. La copie transférée par Zimbra porte en principe le même `Message-ID`, et Gmail fusionne généralement ce type de doublon, **sans garantie**.

En-tête de secours pour un filtre Gmail : `X-DigitalLab-Notification: notify-01a/<id>`.

Le **test T-Z** (§9, étape 8) permet de constater le comportement réel. Il n'y a toujours pas de DMARC, ce qui est à traiter dans un autre lot.

## 8. Fichiers

| Fichier | Statut |
|---|---|
| `api/send-contact-email.js` | **Réécrit** : route de réveil, plus de relais |
| `api/cron/notify-reconcile.js` | Nouveau |
| `api/_lib/notify/config.js`, `render.js`, `resend.js`, `supabase.js`, `worker.js`, `http.js` | Nouveaux (non exposés : `_lib`) |
| `api/_lib/notify/notify.test.js` | Nouveau : tests unitaires |
| `vercel.json` | 4 crons, `maxDuration` |
| `package.json` | Script `test:notify` (aucune dépendance ajoutée) |
| `docs/sql/notify-01a/00-readonly-checks.sql`, `01-migration.sql`, `02-activate.sql`, `90-pause.sql`, `91-resume.sql`, `99-rollback.sql` | Nouveaux, **non appliqués** |
| `docs/sql/tests/notify-01a.model.mjs`, `notify-01a.pglite.mjs`, `notify-01a.e2e.mjs` | Nouveaux : tests SQL et de bout en bout |
| `docs/sql/tests/fixtures/db-sec-01.*.sql`, `db-msg-01.*.sql` | Copies exactes (SHA-256 vérifiés) des migrations et retours arrière appliqués, prises sur `fix/db-msg-01`, **pour les tests uniquement** |
| `docs/LOT-NOTIFY-01A.md` | Ce rapport |

**À confirmer par Digital Lab :** que les fixtures sont bien les versions appliquées le 2026-11-04.

| Fixture | SHA-256 |
|---|---|
| `db-sec-01.01-migration.sql` | `b75d850900b70ef1ea5baee82107abe048bd6248a5562231f415a4315147ca93` |
| `db-msg-01.01-migration.sql` | `af3263f454f06609a51b0cdf1b831932c08121c823471aee6429978217b13a60` |

## 9. Procédure d'activation (À NE PAS EXÉCUTER sans autorisation, étape par étape)

**Prérequis :**
- revue de ce lot et fusion dans `main` (lot séparé) ;
- domaine `digitallab.studio` vérifié dans Resend ;
- quota Resend compatible (le plan gratuit permet 100 e-mails par jour) ;
- plan Vercel confirmé.

1. **Lecture seule :** exécuter `00-readonly-checks.sql` dans l'éditeur SQL et conserver le résultat.
2. **Migration (en `postgres`) :** exécuter `01-migration.sql`. L'effet est nul, puisque `enabled = false`. Relancer ensuite `00` : les sections 1 à 4 doivent être identiques, la section 11 vide, et `settings` doit indiquer `enabled = false`.
3. **Variables Vercel (Production), par leur nom :**

   | Variable | Valeur attendue |
   |---|---|
   | `SUPABASE_URL` | URL du projet ; sinon `VITE_SUPABASE_URL` est utilisée |
   | `SUPABASE_SERVICE_ROLE_KEY` | Clé de service, à marquer *Sensitive* |
   | `RESEND_API_KEY` | Existante |
   | `RESEND_FROM_EMAIL` | Par exemple `Digital Lab <notifications@digitallab.studio>`, sur le domaine vérifié |
   | `CRON_SECRET` | Chaîne aléatoire d'au moins 32 caractères, *Sensitive* |

   Ne pas modifier `RESEND_FROM_EMAIL` tant que des notifications sont en cours d'envoi (voir §4, `payload_changed`).
4. **Déploiement préparé, sans le domaine :** `vercel deploy --prod --skip-domain`, puis sur l'URL obtenue :
   - `POST /api/send-contact-email` (avec un `Origin` égal à l'URL du déploiement) → **202**, rien n'est envoyé ;
   - `GET /api/cron/notify-reconcile` sans secret → **401** ;
   - avec `Authorization: Bearer <CRON_SECRET>` → **200**, `"enabled": false`. Cela prouve que la clé de service et les RPC fonctionnent.
5. **Activation :** exécuter `02-activate.sql`, ce qui fixe `cutover_at = now()`.
6. **Immédiatement après :** `vercel promote <url du déploiement préparé>`. L'ancien relais disparaît à cet instant.
   - Seules les demandes arrivées entre les étapes 5 et 6 (quelques secondes) reçoivent deux e-mails : un de l'ancien relais, un de NOTIFY-01A.
   - Aucune demande n'est perdue.
7. Appeler le cron manuellement avec le secret, puis lire `select * from notify_01a.v_diagnostic;`.
8. **Test T-Z :** soumettre une demande réelle par le formulaire, puis vérifier :
   - la réception dans les deux boîtes ;
   - le nombre de copies dans Gmail (transfert Zimbra) ;
   - le dossier spam ;
   - la ligne dans les journaux Resend (une seule) ;
   - `v_diagnostic` (`sent`).
9. **Surveillance pendant 48 h :**
   - journaux Vercel (`requestPath:/api/cron/notify-reconcile`, `[notify-01a]`) ;
   - `v_diagnostic` : 0 ligne en `dead`, et `oldest_waiting_minutes` qui reste faible.

## 10. Rollback

| Niveau | Action | Effet |
|---|---|---|
| R1 Pause (secondes) | `90-pause.sql` | Plus aucun envoi. Les demandes restent enregistrées. Reprise par `91-resume.sql`, qui rattrape tout depuis `cutover_at` |
| R2 Retour à l'ancien relais | `90-pause.sql`, puis `select notify_01a.cancel_pending();`, puis **Instant Rollback** Vercel vers le déploiement précédent | Ancien comportement, anciens crons (aucun). Une réactivation ultérieure passe par `02-activate.sql` (nouveau `cutover_at`) |
| R3 Retrait de la base | Après R1 ou R2 : `99-rollback.sql` | Supprime le trigger, les 3 fonctions et le schéma. Refuse s'il reste des notifications non envoyées (sauf option explicite `notify_01a.force_rollback`). Ne modifie aucune ligne de `contact_requests` (vérifié) |
| Secrets | Supprimer `CRON_SECRET` et `SUPABASE_SERVICE_ROLE_KEY` de Vercel en cas d'abandon ; régénérer la clé de service en cas de doute | — |

**Ordre avec les autres lots :** testé dans les deux sens. Les retours arrière de DB-MSG-01 puis de DB-SEC-01 restent acceptés avec NOTIFY-01A en place, et celui de NOTIFY-01A restaure exactement l'état DB-SEC-01 + DB-MSG-01.

## 11. Tests (tous en local)

| Suite | Commande | Résultat |
|---|---|---|
| SQL, PGlite 0.2.17 (réplique Production après DB-SEC-01 + DB-MSG-01) | Copier `docs/sql/tests/notify-01a.{model,pglite}.mjs` dans un dossier temporaire, puis `npm i @electric-sql/pglite@0.2.17 && node --expose-gc notify-01a.pglite.mjs <repo>` | **103/103** |
| Unitaires Node (`node:test`, sans réseau) | `npm run test:notify` | **50/50** |
| Bout en bout local (vraies routes servies en HTTP, worker, RPC en `service_role` sur PGlite, `fetch` réel vers un faux Resend qui reproduit l'idempotence documentée) | Copier `notify-01a.{model,e2e}.mjs`, puis `node --expose-gc notify-01a.e2e.mjs <repo>` | **35/35** |
| Build | `npm run build` | OK, 13 routes pré-rendues |
| ESLint | `npx eslint .` | 22 problèmes, contre 25 avant ce lot. Aucun dans les nouveaux fichiers |
| Frontend | `git diff c80ce8e -- src` | Vide |

**Couverture principale :**
- **SQL :**
  - invariance stricte des politiques, droits, colonnes, fonctions, droits par défaut et RLS ;
  - lecture seule de `00` avant et après ;
  - aucun accès pour `anon` / `authenticated` ;
  - le trigger s'exécute sans `EXECUTE` pour l'appelant ;
  - une panne du trigger ne bloque pas l'insertion ;
  - bail, jeton anti-écrasement, délais entre tentatives, 8 tentatives, fenêtre de 23 h, plafonds et alerte unique ;
  - `requeue`, pause et reprise, rollback (refus, option `force`, réapplication) ;
  - compatibilité avec DB-SEC-01 et DB-MSG-01.
- **Node :**
  - destinataires fixes et non modifiables ;
  - expéditeur limité au domaine ;
  - injections (retours à la ligne dans l'objet, HTML) ;
  - déterminisme ;
  - classement de tous les codes Resend, délai dépassé ;
  - corps ignoré ;
  - 405 / 403 / 413 / 429 / 503 ;
  - 401 sur le cron ;
  - lots de 5 jusqu'à 20 ;
  - double exécution du cron ;
  - journaux sans données.
- **Bout en bout :**
  - parcours normal ;
  - Resend en panne puis rattrapage par le cron ;
  - **délai dépassé après livraison : aucun second e-mail** ;
  - 4 appels simultanés : 1 e-mail ;
  - aucun relais ;
  - panne du trigger rattrapée ;
  - plafonds et alerte ;
  - `payload_changed` ;
  - pause et reprise ;
  - `cutover_at` respecté.

**Non couvert ici :**
- **le vrai PostgREST et supabase-js contre une vraie base.** L'adaptateur est testé avec un `fetch` simulé, et `supabase start` demande Docker, dont le daemon n'est pas démarré sur ce poste ;
- le runtime Vercel ;
- le vrai Resend ;
- le comportement de Gmail.

Ces points sont couverts par les étapes 4, 7 et 8 de l'activation.

## 12. Risques restants

1. **Critique, hors périmètre : `api/send-quote-email.js` sur `origin/main` est toujours l'ancien relais ouvert.** Il envoie vers n'importe quel `clientEmail`, avec un lien construit à partir de l'en-tête `Host`. SEC-EMAIL-01 l'avait neutralisé en 410, mais sur une branche non fusionnée. Ce lot ne l'a pas modifié (consigne : ne neutraliser que `send-contact-email`). Recommandation : une règle Vercel Firewall *Deny* immédiate, ou une neutralisation en 410 dans un lot dédié.
2. Plan Vercel non confirmé (Hobby : délais et conditions d'utilisation commerciale) ; 4 crons quotidiens acceptés ou non, à vérifier au déploiement.
3. La clé `service_role` est désormais présente dans Vercel. Elle donne un accès complet à l'API Supabase, au-delà des trois fonctions.
4. L'insertion anonyme reste ouverte (DB-SEC-01) : le volume d'e-mails est borné, pas celui des demandes enregistrées.
5. Les limites par IP sont propres à chaque instance (pas de Redis). Le plafond global reste exact, puisqu'il est calculé en base.
6. Doublons Gmail dus au transfert Zimbra ; pas de DMARC.
7. Domaine et quota Resend à confirmer.
8. Le visiteur voit toujours « bien envoyée », même si la notification est retardée : choix assumé de ne pas modifier le frontend. La demande, elle, est bien enregistrée.
