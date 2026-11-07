# LOT SM-04 — Vérifications en lecture seule et protocole du premier test réel

Date : 2 novembre 2026. Branche `feat/sm-01-social-media`. Complète `LOT-SM-04-RELEASE-REPORT.md`.
Aucun push, merge, déploiement, écriture en base ni demande réelle. `TAX_REGIME = null`, `npm run check:release` en échec (attendu).

## 1. Compte rendu READ-ONLY

| Contrôle | Résultat |
| --- | --- |
| Accès SQL de l’assistant à `digital-lab-prod` | **Refusé** : le connecteur Supabase disponible ne voit que deux autres projets ; une requête de lecture sur `gcsqoluyfgkpwhtbpnzj` a reçu « You do not have permission ». Aucune autre voie n’a été tentée. |
| `project_type` (vérification propriétaire) | `text`, nullable, aucun CHECK |
| Configuration Supabase (rapport précédent) | `.env` local = build en production (même projet, empreinte de clé `827dfa510684`), clé valide |
| Projet Vercel lié | `.vercel/project.json` → projet **`digital-lab`** ; `.vercel` et `.env*` sont ignorés par Git |
| Fonction e-mail en production | Déployée (`GET` → 405) |
| `main` | Inchangé depuis la dernière revue : `5b710a1`, 28 entrées non commitées, aucun stash, empreinte `584059a37bb4f3da` ; fusion simulée avec la branche actuelle : sans conflit |

Les politiques RLS, contraintes d’unicité et déclencheurs restent à lire : la requête ci-dessous doit être exécutée par la propriétaire.

## 2. Requête SQL en lecture seule

Fichier : `docs/sql/sm04-contact-requests-readonly-checks.sql`. Un seul `SELECT` (l’éditeur SQL Supabase n’affiche que le dernier résultat) : catalogue PostgreSQL uniquement, plus, en section 8, les références en double et leur nombre. Aucune écriture possible.

À exécuter dans Supabase → SQL Editor du projet `digital-lab-prod`, puis partager le tableau obtenu.

### Ce que le code attend de la base

| Opération du site | Rôle | Droit nécessaire |
| --- | --- | --- |
| Envoi du formulaire (visiteur non connecté) | `anon` | `INSERT` avec `user_id` nul |
| Envoi du formulaire (client connecté) | `authenticated` | `INSERT` avec `user_id = auth.uid()` |
| Calcul de la référence `DL-2026-xxxx` avant envoi | `anon` / `authenticated` | `SELECT` (comptage) — si la RLS masque les lignes, le comptage vaut 0 sans erreur |
| Espace client | `authenticated` | `SELECT` de ses propres demandes |
| Administration | administrateur | `SELECT` de toutes les demandes, `UPDATE` du statut |

L’insertion n’utilise pas `.select()` : aucun droit de lecture n’est requis pour enregistrer la demande.

### Lecture des résultats

| Section | Résultat attendu | Si différent |
| --- | --- | --- |
| 1. RLS | `enabled` | **Bloquant sécurité** : sans RLS, la clé publique permet de lire toutes les demandes |
| 2. Politiques | Un `INSERT` pour `anon` (avec `user_id` nul) et pour `authenticated` ; `SELECT` limité à ses lignes ou aux administrateurs ; aucun `SELECT` pour `anon` | Sans `INSERT` pour `anon` : un visiteur non connecté voit « Connectez-vous puis réessayez » — décider s’il faut tester connecté. Un `SELECT` ouvert à `anon` est une **fuite de données** |
| 3–4. Contraintes et index uniques | Clé primaire sur `id` ; pas d’unicité sur `reference` | **Unicité sur `reference`** : comme un visiteur non connecté obtient toujours `DL-2026-0001` (comptage masqué = 0), la deuxième demande d’un visiteur échouerait — à corriger avant lancement |
| 5. Déclencheurs | Aucun, ou déclencheurs connus | **Webhook / n8n / CRM** : la demande de test serait transmise à ces outils ; les identifier et prévoir leur nettoyage avant le test |
| 6. Colonnes | `project_type text`, `message text`, `status` (défaut éventuel), `reference text` | Type ou longueur limitée sur `message` : vérifier que le récapitulatif (≈ 800 caractères) passe |
| 7. Droits | `anon` et `authenticated` avec au moins `INSERT` | Sans `INSERT` : l’envoi échoue quel que soit le RLS |
| 8. Références en double | Liste vide, ou doublons existants | Des doublons confirment que les références ne sont pas uniques en pratique (comportement existant, à noter pour l’administration) |

**Condition pour lancer le premier test :** sections 1, 2, 7 conformes, pas d’unicité bloquante, déclencheurs connus.

## 3. Preview Vercel isolée — préparation (sans déploiement)

1. **Variables du scope Preview** (Vercel → projet `digital-lab` → Settings → Environment Variables) : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_TO_EMAIL`, `VITE_DIGITAL_LAB_AUDIT_URL`. Cocher le scope Preview, idéalement limité à la branche `feat/sm-01-social-media`.
2. **Contrôle sans exposer les clés** : `npx vercel env pull .env.preview.local --environment=preview` (le fichier est ignoré par Git), puis :
   ```bash
   node -e "const f=require('fs').readFileSync('.env.preview.local','utf8');const g=k=>(f.match(new RegExp('^'+k+'=\"?([^\"\\n]*)','m'))||[])[1]||'';console.log('ref', g('VITE_SUPABASE_URL').replace(/^https:\/\/|\.supabase\.co$/g,''),'| key fp', require('crypto').createHash('sha256').update(g('VITE_SUPABASE_ANON_KEY')).digest('hex').slice(0,12),'| resend', g('RESEND_API_KEY')?'present':'MISSING','| to', g('CONTACT_TO_EMAIL')?'present':'MISSING')"
   ```
   Attendu : `ref gcsqoluyfgkpwhtbpnzj`, `key fp 827dfa510684`, `resend present`, `to present`. Supprimer ensuite `.env.preview.local`.
3. **Isolation** : laisser la protection « Vercel Authentication » active sur les previews ; créer un secret « Protection Bypass for Automation » pour le script, ou faire le test dans un navigateur connecté à Vercel. La mesure d’audience est désactivée sur `*.vercel.app` (vérifié). La base reste celle de production (pas de projet de recette) : d’où une seule demande, marquée, puis nettoyée.
4. **Création de la Preview (sur autorisation)** : push de la branche `feat/sm-01-social-media` (Preview automatique, URL de branche stable). Alternative : `npx vercel deploy` sans `--prod` depuis un dossier lié au projet.
5. **Contrôles de la Preview avant le test** : build et prérendu réussis dans les logs ; page `/services/gestion-reseaux-sociaux` affichée ; aucune mention HT/TTC ; simulateur fonctionnel.

## 4. Premier test réel — une seule demande (cas T2)

**Préalables :** section 2 conforme ; automatisations en aval identifiées ; autorisation écrite pour **une** demande ; adresse de test contrôlée par la propriétaire ; accès au compte administrateur et à la boîte `CONTACT_TO_EMAIL` ; Preview prête.

**Pourquoi T2** (Social Media seul : Visibilité, Instagram + Facebook, audit) : il valide la nouvelle valeur `Réseaux sociaux`, le récapitulatif et les montants mensuels, sans dépendre d’un projet web.

**Commande** (le script refuse la production, exige `--cases` et refuse plusieurs demandes sans `--allow-multiple`) :

```bash
node scripts/quote-request-smoke.mjs \
  --url https://<preview-de-la-branche>.vercel.app \
  --email <adresse de test> \
  --confirm-real-write --cases T2 \
  [--bypass-token <secret>]
```

La demande porte : nom « TEST SM-04 — à supprimer (T2) », structure « TEST SM-04 », message « Demande de test T2, ne pas traiter ».

### Vérifications séparées

**A. Message affiché au visiteur** — relevé par le script (texte + capture d’écran du formulaire).
- Attendu : « Votre demande a bien été envoyée. Je vous répondrai sous 24–48h. »
- « Connectez-vous puis réessayez… » → pas d’`INSERT` pour `anon`. « …n’a pas pu être envoyée… » → autre erreur Supabase.
- Rappel : ce message s’affiche même si l’e-mail échoue ; il ne prouve que l’enregistrement.

**B. Enregistrement Supabase** — lecture seule :
```sql
select id, reference, created_at, user_id, name, company, project_type, status,
       position('— Offre sélectionnée —' in message) > 0 as has_summary,
       position('formule Visibilité' in message) > 0 as has_plan,
       position('449' in message) > 0 as has_first_month,
       length(message) as message_length
from public.contact_requests
where email = '<adresse de test>' and name = 'TEST SM-04 — à supprimer (T2)'
order by created_at desc;
```
Attendu : **une** ligne ; `project_type = Réseaux sociaux` ; `status = new` ; `user_id` nul (visiteur non connecté) ; `company = TEST SM-04` ; les trois indicateurs à `true` ; `created_at` proche de l’heure relevée par le script ; insertion `201` dans le rapport du script.

**C. Administration** — compte administrateur → `/admin` → recherche « TEST SM-04 ».
Attendu : la demande apparaît une seule fois, type « Réseaux sociaux », statut « Nouvelle », référence affichée, « Message initial » sur plusieurs lignes avec le récapitulatif (formule, réseaux, 299 €/mois puis 390 €/mois, audit 150 €, premier mois 449 €). Ne pas changer son statut.

**D. E-mail** — le script relève le statut de `/api/send-contact-email` (`200` attendu) et l’identifiant Resend renvoyé.
Attendu dans la boîte `CONTACT_TO_EMAIL` (vérifier aussi les indésirables) : objet « Nouvelle demande Digital Lab - Réseaux sociaux », expéditeur `RESEND_FROM_EMAIL`, réponse adressée à l’adresse de test, corps avec le récapitulatif et ses retours à la ligne. En cas d’absence : rechercher l’identifiant dans les journaux Resend.

### Décision après le premier test

- **A, B, C et D conformes** → demander l’autorisation des quatre autres cas (`--cases T1,T3,T4,T5 --allow-multiple`).
- **Un seul écart** → arrêt ; aucune autre demande ; diagnostic ; pas de mise en production.

**Nettoyage (écriture, autorisation séparée)** : suppression de la seule ligne identifiée en B, par son `id` :
```sql
delete from public.contact_requests where id = '<id relevé en B>' returning id, name;
```
Plus, le cas échéant, l’entrée créée dans les outils en aval (n8n, CRM) et l’e-mail de test.

## 5. Fusion sécurisée (préparée, non exécutée)

État confirmé : `main` inchangé (empreinte `584059a37bb4f3da`), fusion simulée sans conflit. Procédure inchangée (voir `LOT-SM-04-RELEASE-REPORT.md`, section 4) : tag de sauvegarde, commit de l’autre LOT sur sa branche, vérification, branche d’intégration, Preview, tests, pull request. Interdits : `git stash` ou `git checkout -- .` dans le dossier `main`, réécriture d’historique, push forcé.
