# LOT SM-04 — Rapport de release

Date : 2 novembre 2026. Branche `feat/sm-01-social-media`. Complète `docs/LOT-SM-04-GO-NO-GO.md`.
Aucun push, merge, déploiement, écriture en base ni demande réelle n’a été effectué. Revue technique, sans validation juridique.

## Verdict

**NO-GO production.** Prochaine étape possible : **test réel sur Preview Vercel isolée**, dès l’autorisation de la propriétaire.

| Point | Statut | Preuve | Reste à faire |
| --- | --- | --- | --- |
| Régime TVA | **Ouvert** | `TAX_REGIME = null`, `npm run check:release` sort en 1 | Confirmation du SIE, puis `TAX_REGIME` |
| Contrainte `project_type` | **Levé** (vérification propriétaire) | `digital-lab-prod` (`gcsqoluyfgkpwhtbpnzj`) : colonne `text`, nullable, aucun CHECK ; un enum est exclu par le type | Lire déclencheurs, contraintes UNIQUE et politiques RLS (requêtes A ci-dessous) |
| Configuration Supabase | **Vérifié** | `.env` local et build en production : même projet, même clé `anon` (empreinte `827dfa510684`, JWT historique) ; clé acceptée par Supabase (200) | Vérifier les variables du scope **Preview** dans Vercel |
| Fonction e-mail | **Partiel** | `GET /api/send-contact-email` en production → 405 (fonction déployée) | Réception réelle à confirmer par le test |
| Parcours réel de devis | **Prêt, non exécuté** | `scripts/quote-request-smoke.mjs` ; essai à blanc 5/5 sur le bundle de production | Autorisation, Preview, exécution, contrôles B |
| Travail non commité de `main` | **Ouvert** | 28 entrées : 15 fichiers suivis (7 modifiés, 8 supprimés) + 13 non suivis ; empreinte `584059a37bb4f3da` ; fusion vérifiée sans conflit | Procédure de fusion ci-dessous |
| CGV | **Ouvert** (commercial) | Projet non validé juridiquement | Avant le premier client signé |

## 1. Configuration Supabase et Vercel

Vérifié sans exposer de clé (empreintes SHA-256 tronquées) :

- `.env` local : projet `gcsqoluyfgkpwhtbpnzj`, clé `anon` au format JWT historique, empreinte `827dfa510684`.
- Build actuellement en ligne sur `www.digitallab.studio` : même projet, même empreinte. La production utilise donc la même configuration que le `.env` local.
- Clé valide : `GET /auth/v1/settings` → 200. Le 401 obtenu plus tôt sur `/rest/v1/` vient de l’introspection du schéma, réservée aux clés secrètes, pas d’une clé périmée.

Non vérifiable sans accès Vercel : les variables du scope **Preview**. À contrôler dans Vercel → Settings → Environment Variables (ou `vercel env ls preview`, noms uniquement) :

| Variable | Rôle | Si absente en Preview |
| --- | --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Écriture de la demande | Formulaire en erreur « configuration » |
| `RESEND_API_KEY` | Envoi de l’e-mail | API e-mail en 500, **invisible pour le visiteur** |
| `RESEND_FROM_EMAIL`, `CONTACT_TO_EMAIL` | Expéditeur et destinataire | Valeurs par défaut du code |
| `VITE_DIGITAL_LAB_AUDIT_URL` | Lien vers l’application Audit | Lien de repli vers `/audit-site-web` |

Les variables `VITE_*` sont figées au build : toute modification impose de redéployer la Preview.

## 2. Test réel contrôlé (après autorisation)

**Préalables.** Accord écrit de la propriétaire : au plus 5 lignes dans `contact_requests` et 5 e-mails. Adresse de test contrôlée par la propriétaire. Preview Vercel de la branche, jamais la production (push ou `vercel deploy`, sur approbation). Si la Preview est protégée, utiliser un secret « Protection Bypass for Automation ». La mesure d’audience est désactivée sur `*.vercel.app` (vérifié).

**Exécution.**

```bash
node scripts/quote-request-smoke.mjs \
  --url https://<preview>.vercel.app \
  --email <adresse de test> \
  --confirm-real-write \
  [--bypass-token <secret>]
```

Garde-fous du script : refuse `digitallab.studio` et `www.digitallab.studio` ; une écriture réelle n’est permise que sur `*.vercel.app` et avec `--confirm-real-write` ; sans ce drapeau, la base et l’API e-mail sont interceptées. Chaque demande porte le nom « TEST SM-04 — à supprimer (Tn) », la structure « TEST SM-04 » et un message « ne pas traiter ». Le script relève les statuts HTTP de l’insertion (`201` attendu) et de l’API e-mail (`200` attendu), ce que l’interface ne montre pas. Rapport JSON écrit dans le dossier temporaire du système.

| Cas | Parcours | Type attendu | Montants attendus (moteur) |
| --- | --- | --- | --- |
| T1 | Accueil FR, site web par défaut | `Site web` | à partir de 800 € |
| T2 | Social Media : Visibilité, Instagram + Facebook, audit | `Réseaux sociaux` | 299 €/mois puis 390 €/mois, audit 150 €, premier mois 449 € |
| T3 | Reels : pack 4 | `Reels` | 249 €/mois |
| T4 | Site + Croissance, 3 réseaux, +2 Reels, audit | `Site web` | projet 800 € ; 747 €/mois puis 888 €/mois ; premier mois 897 € |
| T5 | Accueil EN, site + 1 Reel | `Site web` | récapitulatif en anglais, Reel 69 € ponctuel |

Essai à blanc sur le bundle de production local : **5/5** (types, récapitulatifs, montants, appels base 201 et e-mail 200 simulés).

## 3. Vérification de la réception

**A. Avant le test — lecture seule (SQL Editor, `digital-lab-prod`).** Complète la vérification déjà faite :

```sql
-- RLS active et politiques : un visiteur non connecté peut-il insérer ?
select relrowsecurity from pg_class where oid = 'public.contact_requests'::regclass;
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'contact_requests';

-- Contraintes UNIQUE / clés (la référence DL-2026-xxxx est-elle unique ?)
select conname, contype, pg_get_constraintdef(oid)
from pg_constraint where conrelid = 'public.contact_requests'::regclass;

-- Déclencheurs
select tgname, pg_get_triggerdef(oid)
from pg_trigger where tgrelid = 'public.contact_requests'::regclass and not tgisinternal;
```

Points d’attention : sans politique `INSERT` pour `anon`, un visiteur non connecté voit « Connectez-vous puis réessayez » (comportement existant) ; prévoir alors le test aussi en étant connecté. Pour un visiteur non connecté, la référence `DL-2026-xxxx` est calculée par un comptage que la RLS peut refuser ; le code utilise alors une valeur de repli basée sur l’heure, qui peut produire des doublons. Si `reference` porte une contrainte UNIQUE, une insertion pourrait échouer ponctuellement.

**B. Après le test — base (lecture seule).**

```sql
select id, reference, created_at, name, project_type, status,
       position('— Offre sélectionnée —' in message) > 0 as has_summary,
       position('— Selected offer —' in message) > 0 as has_summary_en
from public.contact_requests
where email = '<adresse de test>' and name like 'TEST SM-04%'
order by created_at;
```

Attendu : 5 lignes, `project_type` conforme au tableau, `status = new`, récapitulatif présent (FR pour T1–T4, EN pour T5).

**C. Administration.** Connexion avec le compte administrateur → `/admin` → recherche « TEST SM-04 » → chaque dossier affiche le type, le statut « Nouvelle » et le « Message initial » sur plusieurs lignes avec le récapitulatif.

**D. E-mail.** Boîte `CONTACT_TO_EMAIL` (et dossier indésirables) : 5 e-mails « Nouvelle demande Digital Lab - <type> », retours à la ligne conservés, `reply_to` = adresse de test.

**E. Nettoyage — écriture, autorisation séparée.**

```sql
delete from public.contact_requests
where email = '<adresse de test>' and name like 'TEST SM-04%'
returning id;
```

Les tables liées (`quotes`, `request_messages`, `request_documents`) sont en `on delete cascade` ; aucune ligne liée n’est attendue.

**Critère d’arrêt.** Un seul écart (statut HTTP, type, récapitulatif, e-mail absent) arrête la procédure : pas de déploiement en production.

## 4. Fusion sécurisée avec le travail de `main`

État vérifié : `main` à `5b710a1` (dernier commit le 29 octobre 2026), 28 entrées non commitées, aucun stash. La fusion de ce contenu avec `feat/sm-01-social-media` a été vérifiée sur le résultat réel (tests, lint, build, navigateur 55/55 + 16/16, fonctions de l’autre LOT 6/6). Si l’empreinte `584059a37bb4f3da` change, refaire cette vérification.

Procédure proposée (chaque étape sur approbation) :

1. **Sauvegarde** : `git tag backup/main-before-sm04 5b710a1`.
2. **Commiter l’autre LOT** dans le dossier `main`, sur sa propre branche, sans toucher au contenu : `git switch -c feat/web-visual-01-media-02`, puis `git add` des fichiers retenus (décider avant : `Tableau de bord Digital Lab AI OS*.png` et `public/projects/lab/*.svg` ne sont référencés par aucun code), `git commit`.
3. **Vérifier cette branche seule** : tests, lint, build.
4. **Branche d’intégration** : `git switch -c release/sm-04 feat/web-visual-01-media-02`, puis `git merge --no-ff feat/sm-01-social-media` (aucun conflit attendu) ; tests, lint, build, suites navigateur.
5. **Preview Vercel** de `release/sm-04` (push sur approbation), test réel (section 2), contrôles (section 3).
6. **Fusion dans `main`** par pull request, puis déploiement Production (checklist de `LOT-SM-04-GO-NO-GO.md`).

Interdits pendant toute la procédure : `git stash` ou `git checkout -- .` sur le dossier `main` (risque de perte du travail de l’autre LOT), réécriture d’historique, push forcé.

## 5. Avant publication — synthèse

1. TVA : confirmation du SIE → `TAX_REGIME` → `check:release` à 0.
2. Lecture seule : requêtes A (RLS, UNIQUE, déclencheurs).
3. Vercel : variables du scope Preview.
4. Autorisations : Preview, test réel (5 demandes), puis nettoyage.
5. Fusion selon la section 4.
6. CGV : décisions commerciales et relecture juridique avant le premier client.
