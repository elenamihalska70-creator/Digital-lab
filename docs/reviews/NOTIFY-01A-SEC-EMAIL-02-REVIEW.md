# Dossier de revue — NOTIFY-01A et SEC-EMAIL-02

**Statut : en attente de validation par Digital Lab AI OS.** Rien n'est poussé, fusionné ou déployé. Aucun changement dans Supabase Production ni dans Vercel Production.

Ce dossier ne modifie aucun fichier fonctionnel : il décrit l'état du worktree `DigitalLab-notify01` au commit `4a206aa`.

| Élément | Valeur |
|---|---|
| Branche | `feat/notify-01`, sans branche distante |
| Base | `c80ce8e` = `origin/main` (OG-01), vérifié par `git ls-remote` le 2026-11-04 |
| Commit 1 | `37f95f12c0a8e7b1ae1047af572a7bd352f1b2eb`, 2026-11-04 22:46 +0100 : *feat(notify): reliable notification of new contact requests (LOT NOTIFY-01A)* |
| Commit 2 | `4a206aad4dcb798e1db7d44e4768444bafe6aa24`, 2026-11-04 23:27 +0100 : *fix(security): neutralise send-quote-email relay, safe rollback (LOT SEC-EMAIL-02)* |
| Volume | 29 fichiers, +4 474 / −195 (`c80ce8e..4a206aa`). **`src/` : aucune modification** |
| Rapports | `docs/LOT-NOTIFY-01A.md`, `docs/LOT-SEC-EMAIL-02.md` |

Blobs Git des trois fichiers les plus sensibles, au commit `4a206aa` :

| Fichier | Blob Git |
|---|---|
| `api/send-contact-email.js` | `a2206a3767d5aae9f25afc4b5d1267eb01277ad9` |
| `api/send-quote-email.js` | `4517ef60d33f0bc54e20da5e3c1fdcb6e2f15e3e` |
| `docs/sql/notify-01a/01-migration.sql` | `179be870d1194bf0bf0d2183291164f1734d8acb` |

---

## 1. Fichiers modifiés

### Commit 1 : `37f95f1` (NOTIFY-01A)

| État | Fichier | Rôle |
|---|---|---|
| M | `api/send-contact-email.js` | L'ancien relais devient une route de « réveil » qui ne lit plus le corps de la requête (§2.1) |
| A | `api/cron/notify-reconcile.js` | Rattrapage planifié, protégé par `CRON_SECRET` |
| A | `api/_lib/notify/config.js` | Destinataires fixes, contrôle de l'expéditeur, validation de la configuration |
| A | `api/_lib/notify/render.js` | Contenu de l'e-mail toujours identique pour une même demande, empreinte SHA-256 |
| A | `api/_lib/notify/resend.js` | Appel à Resend, `Idempotency-Key`, classement des erreurs |
| A | `api/_lib/notify/supabase.js` | Appels aux 3 fonctions de la base avec la clé `service_role` |
| A | `api/_lib/notify/worker.js` | Traitement de la file : réservation, envoi, enregistrement du résultat |
| A | `api/_lib/notify/http.js` | Origine, IP, limitation de débit, comparaison en temps constant |
| A | `api/_lib/notify/notify.test.js` | Tests unitaires (50) |
| M | `vercel.json` | 4 crons quotidiens, `maxDuration` |
| M | `package.json` | Script `test:notify` (aucune dépendance ajoutée) |
| A | `docs/sql/notify-01a/00-readonly-checks.sql`, `01-migration.sql`, `02-activate.sql`, `90-pause.sql`, `91-resume.sql`, `99-rollback.sql` | SQL **non appliqué** |
| A | `docs/sql/tests/notify-01a.model.mjs`, `notify-01a.pglite.mjs`, `notify-01a.e2e.mjs` | Tests SQL et de bout en bout |
| A | `docs/sql/tests/fixtures/db-sec-01.{01-migration,99-rollback}.sql`, `db-msg-01.{01-migration,99-rollback}.sql` | Copies des lots appliqués, pour les tests uniquement |
| A | `docs/LOT-NOTIFY-01A.md` | Rapport |

### Commit 2 : `4a206aa` (SEC-EMAIL-02)

| État | Fichier | Rôle |
|---|---|---|
| M | `api/send-quote-email.js` | **410 Gone** (§2.2) |
| A | `api/_lib/security/public-routes.test.js` | Tests de la réponse 410 et garde-fou sur les routes exposées (13) |
| A | `docs/sql/notify-01a/80-daily-dead-check.sql` | Contrôle quotidien en lecture seule, sans données personnelles |
| M | `docs/sql/notify-01a/01-migration.sql`, `02-activate.sql`, `91-resume.sql` | **Commentaires uniquement** (procédure de rollback révisée) |
| M | `docs/sql/tests/notify-01a.model.mjs`, `notify-01a.pglite.mjs` | Tests du contrôle quotidien (+7) |
| M | `package.json` | `test:notify` couvre `api/_lib/**/*.test.js` |
| M / A | `docs/LOT-NOTIFY-01A.md` §9 à §12, `docs/LOT-SEC-EMAIL-02.md` | Rollback révisé, contrôle quotidien, rapport |

---

## 2. Vérification ciblée des fonctions publiques

Les fichiers exposés par Vercel sont ceux de `api/` dont le nom ne commence pas par `_`. Un test vérifie qu'il y en a **exactement trois** : `send-contact-email.js`, `send-quote-email.js` et `cron/notify-reconcile.js` (`public-routes.test.js`).

### 2.1 `api/send-contact-email.js` : route de réveil, plus de relais

Les contrôles s'enchaînent dans cet ordre, au commit `4a206aa` :

| Ligne | Contrôle | Réponse |
|---|---|---|
| 25 | Méthode différente de `POST` | 405, avec `Allow: POST` |
| 28 | `Content-Length` supérieur à 20 000 | 413 |
| 31 | `Origin` hors liste : www et apex de digitallab.studio, URLs Vercel du déploiement ; origines locales uniquement hors Production et Preview | 403 |
| 34–38 | Plus de 10 appels par IP en 10 minutes (compteur propre à chaque instance) | 429 |
| 40–44 | Configuration invalide (noms des variables dans les journaux, jamais leurs valeurs) | 503 |
| 46–56 | Traitement de 3 notifications au maximum | 202 dans tous les cas |

**Constats :**
- **Le corps n'est jamais lu.** Le fichier ne contient aucun accès à `request.body` (vérifié par test). Un corps JSON invalide ne provoque donc aucune erreur.
- **Destinataires** : `NOTIFY_RECIPIENTS` est figé (`config.js:5`), et aucune variable d'environnement ne le lit (testé avec `CONTACT_TO_EMAIL`).
- **Contenu** : il vient exclusivement de la ligne de `contact_requests` remise par `notify_01a_claim`.
- **Expéditeur** : obligatoirement en `@digitallab.studio` (`config.js:37`).
- **Réponse** : toujours la même (`202 {ok:true}`), y compris en cas d'erreur, pour ne rien révéler de l'état de la file.
- **Abus maximal** : déclencher plus tôt l'envoi de notifications déjà légitimes, toujours aux deux destinataires fixes, dans les plafonds calculés en base (20 par heure, 80 sur 24 h).
- **Compatibilité frontend** : le `ContactForm`, inchangé, envoie un `POST` de même origine avec un en-tête `Origin` et ignore la réponse. Il affiche donc toujours le même message de succès.
- **Limite connue** : la limitation par IP vit en mémoire de chaque instance. Le vrai plafond est celui de la base.

Tests : `notify.test.js` (« kick endpoint »), `public-routes.test.js` et le bout en bout E1, E4 et E5.

### 2.2 `api/send-quote-email.js` : 410 Gone

- Le gestionnaire tient en 2 lignes : `Cache-Control: no-store`, puis `410 {ok:false,error:"gone"}`.
- Il n'importe rien. Il ne lit ni le corps, ni les en-têtes (`Host` compris), ni les paramètres de la requête, ni l'environnement. Il n'appelle rien.
- **Tests, pour 7 méthodes HTTP :**
  - un Proxy espion confirme qu'**aucune propriété de la requête n'est lue** ;
  - `fetch` est remplacé par un espion : **0 appel** ;
  - `process.env` est remplacé par un espion : **0 lecture** ;
  - aucune donnée de l'attaquant n'apparaît dans la réponse.
- **Contrôle du code source :** il ne contient ni `fetch`, ni `resend`, ni `process`, ni `Deno`, ni `import`, ni accès à la requête.
- **Contre-épreuve :** les mêmes tests lancés sur l'ancien fichier (`origin/main`) donnent **11 échecs**.
- **Appelants :** aucun. `src/services/quoteEmail.js` vise l'Edge Function, et ce fichier n'est importé nulle part (vérifié par `grep`).
- **Hors périmètre, à retenir :** `supabase/functions/send-quote-email/index.ts` sur `main` contient encore l'ancien code. La version en Production répond 410, mais elle **ne doit pas être redéployée depuis `main`**.

### 2.3 `api/cron/notify-reconcile.js` (pour mémoire)

- Toute méthode autre que `GET` reçoit 405.
- Si `CRON_SECRET` est absent ou fait moins de 16 caractères : 503.
- L'en-tête `Authorization` doit valoir exactement `Bearer <secret>` : la comparaison passe par `safeEqual` (SHA-256 des deux valeurs puis `timingSafeEqual`), sinon 401.
- La réponse ne contient que des compteurs.

---

## 3. Migration SQL et permissions `SECURITY DEFINER`

### 3.1 Fonctions créées

| Fonction | Mode | `search_path` | Volatilité | `EXECUTE` | Entrées et garde-fous |
|---|---|---|---|---|---|
| `notify_01a.enqueue_contact_request()` (trigger) | **DEFINER** | `''` | volatile | Révoqué pour `public`. Le test confirme que le trigger s'exécute quand même lors d'une insertion par `anon` : PostgreSQL ne vérifie ce droit qu'à la création du trigger | Aucune entrée. Insère uniquement si `enabled`. Bloc `EXCEPTION` : en cas d'erreur, `WARNING` et l'insertion réussit |
| `public.notify_01a_claim(int)` | **DEFINER** | `''` | volatile (transaction en écriture pour PostgREST) | **`service_role` seulement** | `p_limit` ramené entre 0 et 10. Verrou consultatif de transaction, `SKIP LOCKED`, bail, plafonds |
| `public.notify_01a_mark(bigint,int,text,text,text,text)` | **DEFINER** | `''` | volatile | **`service_role` seulement** | `p_result` limité à `sent` / `retry` / `dead` (exception sinon). Jeton anti-écrasement `attempts`. `resend_id` ≤ 128 et `last_error` ≤ 200 caractères. SHA-256 contrôlé par expression régulière |
| `public.notify_01a_reconcile()` | **DEFINER** | `''` | volatile | **`service_role` seulement** | Aucune entrée. Renvoie uniquement des compteurs |
| `notify_01a.requeue(uuid,bool)`, `notify_01a.cancel_pending()` | INVOKER | `''` | volatile | Aucun droit (éditeur SQL seulement) | Refus selon le statut et la fenêtre de 23 h |
| `notify_01a.backoff(int)` | INVOKER | `''` | immutable | Aucun droit | — |

### 3.2 Points vérifiés

- **Noms entièrement qualifiés.** Avec `search_path = ''`, une table temporaire (`pg_temp`) pourrait masquer une table appelée sans son schéma. Toutes les tables citées dans les corps `SECURITY DEFINER` portent leur schéma (`notify_01a.*`, `public.contact_requests`), et `pg_catalog` est toujours consulté (contrôle par `grep` des clauses `from` / `update` / `into` / `join` : aucune occurrence non qualifiée).
- **Droits par défaut de Supabase.** Ils accordent `EXECUTE` à `anon` et `authenticated` sur toute nouvelle fonction de `public`. La migration les **révoque dans la même transaction**, et un autocontrôle la fait échouer si l'un de ces rôles garde un accès au schéma, à ses tables ou vues, ou à l'une des fonctions.
- **Révocations explicites** : `revoke all … from public, anon, authenticated` sur toutes les tables, séquences et fonctions du schéma, et sur le schéma lui-même.
- **Schéma `notify_01a`** : il n'est pas exposé par l'API REST de Supabase. `service_role` n'y a **aucun accès direct** (testé) : il passe uniquement par les 3 fonctions.
- **Propriétaire.** Les fonctions appartiennent au rôle qui exécute la migration, qui doit être le propriétaire de `contact_requests` (précondition, refus sinon ; testé avec un autre rôle).
- **Aucun changement** des colonnes, politiques, droits ou données de `contact_requests` et des autres tables, ni des fonctions existantes, des droits par défaut ou des extensions.
- **Compatibilité DB-SEC-01 / DB-MSG-01** (réplique PGlite construite à partir des migrations appliquées) :
  - l'invariance est stricte avant et après : politiques, droits sur tables et colonnes, définitions et ACL des fonctions, droits par défaut, RLS ;
  - un visiteur ne peut toujours pas choisir le statut d'une demande, et un client ne lit toujours aucune conversation d'un autre ;
  - les rollbacks de DB-MSG-01 puis de DB-SEC-01 restent acceptés avec NOTIFY-01A en place ;
  - le rollback de NOTIFY-01A restaure l'état exact.
- **Contenu non stocké** : `notify_01a.outbox` ne garde aucune copie de la demande, seulement des identifiants, statuts, codes d'erreur et empreintes.

**Risque résiduel :** une fuite de la clé `service_role` donne un accès complet à l'API Supabase, ce qui est propre à cette clé et ne dépend pas de ce lot. Avec les seules fonctions NOTIFY-01A, un attaquant pourrait au pire lire les demandes en attente, marquer des notifications comme envoyées sans qu'elles le soient, ou en déclencher l'envoi (toujours aux destinataires fixes).

---

## 4. Activation et rollback

| Procédure | Fichier | Vérifié par | Effet de bord | Rouvre une faille ? |
|---|---|---|---|---|
| Lecture seule avant et après | `00-readonly-checks.sql` | Test : exécution en lecture seule, sections 1 à 4 identiques avant et après | Aucun | — |
| Migration | `01-migration.sql` | Tests : préconditions, autocontrôles, second passage refusé | `enabled = false` : rien ne change pour les visiteurs | Non |
| Activation | `02-activate.sql` | Tests : fixe `cutover_at = now()`, refuse si déjà actif ou s'il reste des lignes non envoyées | Les demandes antérieures ne sont jamais notifiées | Non |
| R1 Pause / reprise | `90-pause.sql` / `91-resume.sql` | Tests : rien n'est envoyé pendant la pause, rattrapage à la reprise | Retard des notifications | **Non** |
| R2-A Version corrigée | `docs/LOT-NOTIFY-01A.md` §10.2–10.3 | Procédure documentée, non testée | Notifications coupées pendant la correction | **Non** |
| R2-B Firewall, puis ancien déploiement | §10.2 (ordre strict) | Procédure documentée, non testée (aucune règle Firewall réelle) | Aucune notification e-mail | **Non, tant que les 2 règles Deny restent actives** |
| R3 Retrait de la base | `99-rollback.sql` | Tests : refus si actif ou s'il reste des lignes non envoyées, option `force` explicite, état antérieur restauré, nouvelle application possible | Suppression des objets NOTIFY-01A uniquement | **Non** |
| Contrôle quotidien | `80-daily-dead-check.sql` | Tests : lecture seule, colonnes techniques uniquement, aucune valeur personnelle, interdit aux rôles de l'API | Aucun | — |

**Règle :** un déploiement antérieur à `4a206aa` contient les deux anciens relais. Un Instant Rollback vers ce déploiement n'est jamais présenté comme sûr, et il n'est autorisé que derrière les deux règles Deny vérifiées avant et après (§10.1 du rapport NOTIFY-01A).

**Points à surveiller :**
- **Notifications non envoyées après R2-B.** Les lignes annulées par `cancel_pending()` restent annulées : il faut contrôler dans `/admin` les demandes arrivées pendant cette période.
- **Pas de répétition réelle.** R2-A et R2-B n'ont pas été rejoués sur une vraie infrastructure, puisque le déploiement et le Firewall sont interdits à ce stade. Les procédures sont documentées, pas testées.

---

## 5. Tests (rejoués au commit `4a206aa`, Node 24.14.1)

| Suite | Commande | Résultat |
|---|---|---|
| Unitaires (NOTIFY-01A + SEC-EMAIL-02) | `npm run test:notify` | **63/63** |
| SQL, PGlite 0.2.17 (réplique de la Production après DB-SEC-01 + DB-MSG-01) | `node --expose-gc notify-01a.pglite.mjs <repo>`, depuis un dossier temporaire (voir le rapport §11) | **110/110** |
| Bout en bout local (vraies routes HTTP, worker, RPC en `service_role`, faux Resend reproduisant l'idempotence documentée) | `node --expose-gc notify-01a.e2e.mjs <repo>` | **35/35** |
| Contre-épreuve sur l'ancien `send-quote-email.js` | — | 11 échecs, comme attendu |
| Build | `npm run build` | OK, 13 routes pré-rendues |
| ESLint | `npx eslint .` | 16 problèmes, tous dans `src/` (non modifié) ; 25 sur `c80ce8e` |
| Frontend | `git diff c80ce8e 4a206aa -- src` | Vide |

**Non couvert :**
- le vrai PostgREST et supabase-js sur une vraie base (Docker n'est pas démarré) ;
- le runtime et le Firewall Vercel ;
- le vrai Resend ;
- le comportement de Gmail avec le transfert Zimbra.

Ces points sont couverts par les contrôles du §6 et les vérifications de la phase 2.

---

## 6. Contrôles à réaliser avant la mise en Production

Responsables : **DL** = Digital Lab (propriétaire), **AI OS** = Digital Lab AI OS (revue). Aucun de ces contrôles n'a été réalisé ici.

| # | Contrôle | Par | Résultat attendu | Bloquant pour |
|---|---|---|---|---|
| C1 | Revue indépendante de `37f95f1` et `4a206aa`, et du commit de phase 1 (§7) | AI OS | GO écrit | Phases 1 et 2 |
| C2 | Les SHA-256 des fixtures sont ceux des versions DB-SEC-01 et DB-MSG-01 appliquées le 2026-11-04 (`db-sec-01.01-migration.sql` = `b75d850900b70ef1ea5baee82107abe048bd6248a5562231f415a4315147ca93`, `db-msg-01.01-migration.sql` = `af3263f454f06609a51b0cdf1b831932c08121c823471aee6429978217b13a60`) | DL | Identiques | Phase 2 |
| C3 | Plan Vercel du compte `elenamihalska70-creators-projects` (Hobby ou Pro) et usage commercial conforme | DL | Plan connu et conforme | Phase 2 |
| C4 | Vercel Firewall : règles personnalisées disponibles sur ce plan (nombre), action *Deny*, condition « Request Path starts with », règles au niveau du projet (maintenues après un Instant Rollback) | DL | Disponibles | Phase 1 (option 1A) et rollback R2-B |
| C5 | Resend : domaine `digitallab.studio` **vérifié** (SPF et DKIM au vert), adresse d'expédition choisie (par exemple `notifications@digitallab.studio`), quota compatible (le plan gratuit permet 100 e-mails par jour) | DL | Vérifié | Phase 2 |
| C6 | Variables Vercel actuelles, **par leur nom seulement** : `RESEND_API_KEY` et `RESEND_FROM_EMAIL` existent, et `RESEND_FROM_EMAIL` est sur le domaine vérifié | DL | Présentes | Phase 2 |
| C7 | **Nouvelles variables en portée Production uniquement** : `SUPABASE_SERVICE_ROLE_KEY` et `CRON_SECRET` (au moins 32 caractères aléatoires, *Sensitive*). **Jamais en Preview** : sinon, chaque déploiement de branche deviendrait un worker sur la base de Production | DL | Production uniquement | Phase 2 |
| C8 | Edge Functions Supabase `resend-email` et `send-quote-email` : répondent toujours 410, et aucun redéploiement depuis `main` n'est prévu | DL | 410 | Phase 1 |
| C9 | `00-readonly-checks.sql` exécuté en lecture seule : propriétaire `postgres`, colonnes attendues, politiques DB-SEC-01 et DB-MSG-01, pas de schéma `notify_01a`, `service_role` présent, volume sur 30 jours | DL | Conforme, résultat conservé | Phase 2 (étape 2.2) |
| C10 | Schémas exposés par l'API REST Supabase (*Exposed schemas*) : `notify_01a` n'y figure pas | DL | `public` (et `graphql_public`) seulement | Phase 2 |
| C11 | Volume constaté (C9, section 10) compatible avec 20 par heure et 80 sur 24 h | DL | Oui, sinon ajuster `settings` après la migration | Phase 2 |
| C12 | Personne chargée du contrôle quotidien (`80-daily-dead-check.sql`), avec accès à l'éditeur SQL et un journal d'exploitation sans données personnelles | DL | Désignée | Phase 2 |
| C13 | Créneau de déploiement en semaine, propriétaire disponible pour l'étape 2.6 (`02-activate`, puis `promote` immédiat) | DL | Planifié | Phase 2 |
| C14 | Tests rejoués sur le commit réellement fusionné (63, 110 et 35, plus le build) | AI OS / DL | Tous verts | Phases 1 et 2 |
| C15 | Ordre de fusion : la phase 1 dans `main` d'abord, puis `feat/notify-01` rebasé sur `main` (contenu identique pour `api/send-quote-email.js`, donc aucun conflit attendu) | DL | Historique linéaire | Phase 2 |
| C16 | État du transfert Zimbra vers Gmail connu (pour interpréter le test T-Z) ; filtre Gmail sur `X-DigitalLab-Notification` prévu si nécessaire | DL | Connu | Non bloquant |
| C17 | DMARC `p=none` (lot DNS séparé) | DL | — | Non bloquant |

---

## 7. Plan de déploiement en deux phases

### Phase 1 : sécuriser les routes e-mail (sans toucher aux notifications)

**Pourquoi séparer :** déployer la branche complète remplacerait l'ancien `send-contact-email` par la route de réveil. Tant que la migration n'est pas appliquée et activée, **plus aucune notification ne partirait**. La phase 1 ne contient donc **que** la neutralisation de `send-quote-email`. L'ancien `send-contact-email` reste en place jusqu'à la phase 2 : il est moins grave, puisque son destinataire est fixé à contact@, mais son contenu est libre et il n'a pas de limitation.

**Option 1A, immédiate, sans déploiement (sur autorisation) :**
- dans Vercel Firewall, une règle *Deny* `Request Path starts with /api/send-quote-email`, qui couvre aussi les variantes avec barre oblique finale ou extension ;
- vérification : `curl -i -X POST https://www.digitallab.studio/api/send-quote-email` doit répondre **403** ;
- aucun effet sur le site, puisque rien n'appelle cette route ;
- **garder cette règle jusqu'à la fin de la phase 2** : c'est elle qui rend sûr un rollback de la phase 1.

**Option 1B, correctif déployé** (préparé sur autorisation, rien n'est créé à l'avance) :

```sh
git switch -c release/sec-email-02-phase1 origin/main
git checkout 4a206aa -- api/send-quote-email.js      # uniquement ce fichier (410)
npm run build                                        # vérification locale
# test ciblé : public-routes.test.js dépend des fichiers NOTIFY-01A ; en phase 1, vérifier le 410
# avec un test minimal tiré de la section "api/send-quote-email.js (410 Gone)" de ce fichier
git commit -m "fix(security): neutralise send-quote-email relay (LOT SEC-EMAIL-02, phase 1)"
# revue (C1), fusion dans main, déploiement Production par la procédure habituelle
```

**Vérifications de la phase 1 :**
- `POST /api/send-quote-email` → **410**, sans aucune trace dans les journaux Resend ;
- une demande réelle par le formulaire (décision de DL) : la notification habituelle de l'ancien relais arrive toujours ;
- noter l'URL et le commit du déploiement.

**Rollback de la phase 1 :** un Instant Rollback vers le déploiement précédent rouvre le relais des devis. Il n'est **acceptable que si la règle Deny de l'option 1A est active** (vérifier le 403 avant et après).

### Phase 2 : activer les notifications NOTIFY-01A

Prérequis : phase 1 terminée, et C1 à C15 validés. La procédure détaillée est celle du rapport `docs/LOT-NOTIFY-01A.md` §9.

| Étape | Action | Vérification |
|---|---|---|
| 2.1 | Rebaser `feat/notify-01` sur `main`, revue, fusion | Tests verts sur le commit fusionné (C14) |
| 2.2 | `00-readonly-checks.sql`, puis `01-migration.sql`, puis `00` à nouveau | Sections 1 à 4 identiques, section 11 vide, `enabled = false` |
| 2.3 | Variables Vercel en Production uniquement (C7) | Noms présents, aucune valeur affichée |
| 2.4 | `vercel deploy --prod --skip-domain` (déploiement préparé, sans domaine) | Réveil → **202**, envoi de devis → **410**, cron sans secret → **401**, cron avec secret → **200** `"enabled": false`. En cas d'erreur `PGRST202` : `notify pgrst, 'reload schema';`. Si Vercel refuse les 4 crons, arrêt ici, sans impact |
| 2.5 | Noter l'URL et le commit : c'est la **première version sûre** (cible autorisée des futurs Instant Rollback) | — |
| 2.6 | `02-activate.sql`, puis **immédiatement** `vercel promote` | Seules les demandes des quelques secondes entre les deux sont notifiées deux fois |
| 2.7 | Appel manuel du cron avec le secret, puis `v_diagnostic` | `enqueued` et `sent` cohérents, 0 `dead` |
| 2.8 | Test T-Z : une demande réelle | Deux boîtes, une seule ligne dans Resend, copies Gmail notées, `sent` |
| 2.9 | Contrôle quotidien pendant 14 jours (`80-daily-dead-check.sql`), puis hebdomadaire | Requête 2 vide, requête 3 à 0 |
| 2.10 | Retirer la règle Deny de la phase 1 seulement quand **aucun** déploiement antérieur à la phase 1 ne peut plus être promu par erreur. Sinon, la garder | — |

**Rollback de la phase 2 :**
- **R1 Pause**, par défaut ;
- **R2-A** : version corrigée, ou Instant Rollback vers un déploiement de phase 2 ;
- **R2-B** : deux règles Deny (`send-contact-email` et `send-quote-email`) vérifiées, puis ancien déploiement, puis pause et `cancel_pending()` ;
- **R3** : retrait de la base.

**Un retour vers le déploiement de phase 1 n'est pas une cible sûre**, car il contient encore l'ancien `send-contact-email`. Il relève de R2-B.

---

## 8. Risques restants

| # | Risque | Gravité | Traitement |
|---|---|---|---|
| R-1 | Le relais des devis reste actif en Production jusqu'à la phase 1 | **Élevée** | Option 1A dès l'autorisation |
| R-2 | L'Edge Function `send-quote-email` sur `main` contient encore l'ancien code (la Production répond 410) | Moyenne | Ne pas redéployer depuis `main` ; lot dédié |
| R-3 | L'ancien `send-contact-email` (contenu libre vers contact@) reste actif entre les phases 1 et 2 | Moyenne | Réduire l'intervalle ; une règle de limitation Firewall est possible si le plan le permet |
| R-4 | Plan Hobby : 4 crons non vérifiés, délai de relance pouvant atteindre environ 7 h, conditions d'usage commercial | Moyenne | C3, et l'étape 2.4 échoue sans risque |
| R-5 | Notifications `dead` sans alerte automatique | Moyenne | Contrôle quotidien (2.9), alerte prévue dans NOTIFY-01B |
| R-6 | Clé `service_role` dans Vercel | Moyenne | C7 : Production uniquement, *Sensitive*, régénération en cas de doute |
| R-7 | Insertion anonyme toujours ouverte : seul le nombre d'e-mails est plafonné | Faible | Lot Turnstile / insertion côté serveur |
| R-8 | Doublons Gmail dus au transfert Zimbra ; pas de DMARC | Faible | Test T-Z, C16, C17 |
| R-9 | Doubles notifications pendant la bascule (entre 2.6 `activate` et `promote`) | Faible | Enchaîner les deux immédiatement |
| R-10 | Une reprise manuelle après 24 h peut produire un doublon | Faible | `requeue(id, true)` seulement après lecture des journaux Resend |
| R-11 | R2-A et R2-B ne sont pas répétés sur une vraie infrastructure | Faible | Lire la procédure avant la phase 2 ; noter où se trouvent le Firewall et l'Instant Rollback |

---

## 9. Verdict proposé (à confirmer par Digital Lab AI OS)

- **Revue technique de `37f95f1` et `4a206aa` : GO.**
- **Phase 1 : GO dès autorisation.** Option 1A en priorité, puis 1B après revue de son commit dédié.
- **Phase 2 : NO-GO** tant que la phase 1 n'est pas terminée et que C1 à C15 ne sont pas validés.
