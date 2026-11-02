# LOT SM-04 — Revue finale GO / NO-GO

Date : 2 novembre 2026. Branche `feat/sm-01-social-media`, HEAD `cd37f85`. `main` : `5b710a1` + 28 fichiers non commités (autre LOT).
Revue technique, sans validation juridique. Aucun merge, push, déploiement ni écriture en base.

## Verdict

**NO-GO pour la production.** Le code est prêt ; quatre blocages vérifiés restent à lever.
**GO conditionnel** pour un test réel contrôlé sur un déploiement de prévisualisation, après approbation explicite.

| # | Blocage | Vérification | Action pour le lever |
| --- | --- | --- | --- |
| B1 | Régime TVA non confirmé | `TAX_REGIME = null`, `npm run check:release` sort en 1 | Fournir le justificatif, renseigner `TAX_REGIME`, relancer `check:release` (sortie 0) |
| B2 | Contrainte `contact_requests.project_type` inconnue | `CREATE TABLE` absent du dépôt et de son historique ; projet Supabase `gcsqoluyfgkpwhtbpnzj` absent du compte connecté ; schéma PostgREST : 401 « Invalid API key » avec la clé `anon` du `.env` local | Exécuter les requêtes en lecture seule ci-dessous ; confirmer que la clé `anon` du `.env` correspond à celle de Vercel |
| B3 | Parcours réel de devis non vérifié | Testé uniquement avec base et e-mail simulés ; un échec d’e-mail n’est jamais signalé au visiteur (comportement existant) | Protocole de test réel ci-dessous, après approbation |
| B4 | `main` n’est pas une base propre | 28 entrées non commitées de l’autre LOT : 15 fichiers suivis (7 modifiés, 8 supprimés) et 13 fichiers non suivis | Commiter l’autre LOT sur sa propre branche, puis suivre l’ordre de fusion ci-dessous |

Blocage commercial (avant le premier client signé, pas avant la mise en ligne de la page) : CGV non validées (section 5).

## 1. Simulateur — vérifications

Bundle de production, Supabase, e-mail et mesure d’audience interceptés localement.

| Suite | Résultat |
| --- | --- |
| Tests unitaires (calculs, TVA, domaines de mesure) | 50/50 |
| Navigateur, suite principale (six services ponctuels, combinaisons, Reels, premier mois, parcours FR/EN jusqu’à l’envoi, page Social Media, SEO, responsive, 15 routes, mesure d’audience) | 55/55 |
| Navigateur, abonnements et offres combinées FR/EN (montants comparés au moteur) | 16/16 |

Exemples vérifiés en FR et en EN : projet + Présence + audit ; Présence + 2 réseaux + 8 publications = 629 €/mois puis 670 €/mois ; Croissance + 1 réseau + 8 publications + 2 Reels = 1 107 €/mois ; projet + pack 8 Reels (449 €/mois, premier mois 449 €, projet à part) ; projet + 1 Reel (deux montants ponctuels, pas de premier mois) ; vidéo complexe seule (sur devis, aucun montant).

## 2. Contrainte `contact_requests.project_type`

Ce que le code envoie : `project_type` texte, valeurs `Site web`, `Réparation / amélioration`, `SEO & visibilité`, `Automatisation`, `Chatbot / assistant IA`, `MVP / prototype`, `Autre` (existantes) et **`Réseaux sociaux`**, **`Reels`** (nouvelles). Un projet combiné garde le type du projet.

Requêtes **en lecture seule** à exécuter dans le SQL Editor Supabase du projet `gcsqoluyfgkpwhtbpnzj` :

```sql
-- 1. Type exact de la colonne (text, varchar(n), enum…)
select column_name, data_type, udt_name, character_maximum_length, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'contact_requests'
order by ordinal_position;

-- 2. Contraintes CHECK, UNIQUE, clés
select conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.contact_requests'::regclass;

-- 3. Si project_type est un enum : valeurs autorisées
select e.enumlabel
from pg_type t join pg_enum e on e.enumtypid = t.oid
where t.typname = (
  select udt_name from information_schema.columns
  where table_schema = 'public' and table_name = 'contact_requests' and column_name = 'project_type'
)
order by e.enumsortorder;

-- 4. Déclencheurs pouvant filtrer ou transformer la valeur
select tgname, pg_get_triggerdef(oid)
from pg_trigger
where tgrelid = 'public.contact_requests'::regclass and not tgisinternal;

-- 5. Politiques RLS (un WITH CHECK peut restreindre l’insertion)
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'contact_requests';

-- 6. Valeurs déjà utilisées (comptage uniquement, aucune donnée personnelle)
select project_type, count(*) from public.contact_requests group by 1 order by 2 desc;
```

Interprétation : **OK** si la colonne est `text` (ou `varchar` ≥ 30) sans CHECK, enum, déclencheur ni politique qui limite les valeurs. **Bloquant** si un CHECK ou un enum ne contient pas `Réseaux sociaux` et `Reels` : une migration serait nécessaire, uniquement après approbation.

Autres moyens en lecture seule : Dashboard Supabase → Table Editor → `contact_requests` → définition ; `supabase db dump --schema public` (schéma uniquement) ; ou connecter l’organisation propriétaire du projet au connecteur Supabase pour que ces requêtes soient exécutées en lecture seule.

## 3. Protocole de test réel contrôlé (après approbation)

**Préalables.** B2 levé ; accord écrit pour écrire au plus 5 lignes de test et recevoir 5 e-mails ; adresse de test contrôlée par la propriétaire ; nom « TEST SM-04 — à supprimer », structure « TEST ».

**Environnement.** Déploiement **Preview** Vercel de la branche (jamais la production), via push de la branche ou `vercel deploy` — chacune de ces actions demande une approbation. Variables Preview requises : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_TO_EMAIL`. Si un projet Supabase de recette existe, le préférer à la base de production. La mesure d’audience est désactivée sur les previews (vérifié).

**Cas (montants attendus calculés par `estimator.js`).**

| Cas | Saisie | Attendu |
| --- | --- | --- |
| T1 | Projet « Créer un site web », réponses par défaut | `project_type` = `Site web` ; projet à partir de 800 € |
| T2 | Social Media seul : Visibilité, Instagram + Facebook, audit | `Réseaux sociaux` ; 299 €/mois puis 390 €/mois ; audit 150 € ; premier mois 449 € |
| T3 | Reels seuls : pack 4 | `Reels` ; 249 €/mois ; premier mois 249 € |
| T4 | Site + Croissance, 3 réseaux, +2 Reels, audit | `Site web` ; projet 800 € ; 747 €/mois puis 888 €/mois ; premier mois 897 € (projet exclu) |
| T5 | Version anglaise : site + 1 Reel | `Site web` ; récapitulatif en anglais ; 1 Reel 69 € ponctuel, pas de premier mois |

**Contrôles pour chaque cas.**
1. Message de succès affiché, formulaire réinitialisé.
2. Base (lecture) : `select id, reference, project_type, status, created_at, message from public.contact_requests where email = '<adresse de test>' order by created_at desc;` → type exact, `status = new`, message = texte saisi + « — Offre sélectionnée — » + récapitulatif complet.
3. E-mail reçu sur `CONTACT_TO_EMAIL` : objet « Nouvelle demande Digital Lab - <type> », retours à la ligne conservés, `reply_to` = adresse de test.
4. Espace admin : la demande s’affiche avec le récapitulatif sur plusieurs lignes.

**Critère d’arrêt.** Tout écart arrête le test : aucun déploiement en production.

**Nettoyage (écriture, approbation séparée).** `delete from public.contact_requests where email = '<adresse de test>' and name like 'TEST SM-04%' returning id;` — les tables liées (`quotes`, `request_messages`, `request_documents`) sont en `on delete cascade` ; aucune ligne liée n’est attendue.

## 4. Risques de fusion avec l’autre LOT

Vérification sur le résultat **réel** de la fusion, dans un worktree temporaire supprimé ensuite. `main` et ses 28 fichiers n’ont pas été modifiés.

- Fichiers modifiés des deux côtés : `src/App.css`, `src/App.jsx` — fusion automatique, aucun marqueur de conflit.
- Les 50 lignes ajoutées par l’autre LOT dans `App.jsx` et ses 138 lignes CSS sont toutes présentes dans le résultat.
- Résultat fusionné : tests 50/50, ESLint inchangé (22 erreurs, 3 avertissements préexistants), build + prérendu 14 routes, navigateur 55/55 + 16/16, et fonctions de l’autre LOT opérationnelles (couvertures vidéo, lecteur en dialogue, fermeture par Échap, illustrations du laboratoire) : 6/6.

Ordre recommandé :
1. Commiter l’autre LOT sur sa propre branche, **en incluant ses fichiers non suivis utiles** (13 fichiers, 19 Mo ; plus gros : `Digitallab_audit_site.mp4`, 5,8 Mo). Sans eux, ses images seraient absentes.
2. Fusionner l’autre LOT dans `main`, puis `feat/sm-01-social-media`.
3. Relancer tests, build et vérification navigateur sur `main`.

Points à trancher pour l’autre LOT : `Tableau de bord Digital Lab AI OS*.png` et `public/projects/lab/*.svg` ne sont référencés par aucun code ; son rapport mentionne des SVG alors que le code utilise les `lab/*.webp`.

## 5. CGV — décisions encore nécessaires

Le projet `docs/CGV-SOCIAL-MEDIA-PROJET.md` n’est pas validé juridiquement.

**Commerciales :** durée (au mois ou minimum 3 mois) ; préavis de résiliation ; échéances de paiement (abonnements d’avance, audit et Reel à l’unité à la commande) ; moyens de paiement ; délai de validation du calendrier et nombre de retouches incluses ; sort des contenus non validés ; critère des 5 premiers clients (date de signature du devis) ; information avant le passage au prix standard ; audit de départ à 150 € (provisoire) ; contenu des bilans et du point stratégique ; contenu d’un Reel.

**Juridiques :** forme juridique et mention fiscale ; clients consommateurs (droit de rétractation, médiateur de la consommation) ; cession écrite des droits sur les contenus ; plafond de responsabilité ; annexe de sous-traitance RGPD (accès aux comptes clients) ; pénalités de retard B2B ; tribunal compétent.

**Nouveau avec le LOT SM-04 :** le simulateur indique qu’un projet ponctuel est « facturé selon son propre devis (acompte et échéances) ». Les conditions d’acompte et d’échéancier des projets web doivent exister dans les devis ou des CGV « prestations web », distinctes de celles de l’abonnement.

## 6. Checklist de déploiement Vercel

**Avant**
- [ ] B1 à B4 levés ; `npm run check:release` sort en 0.
- [ ] Autre LOT commité et fusionné ; branche Social Media fusionnée ; `npm test`-équivalent (`node --test …`), `npm run lint` (22/3 attendus), `npm run build` réussis sur `main`.
- [ ] Variables Production présentes : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_DIGITAL_LAB_AUDIT_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `CONTACT_TO_EMAIL`. Les variables `VITE_*` sont figées au build : toute modification impose un redéploiement.
- [ ] Node ≥ 22.17 ; commande `npm run build` (prérendu Chromium via `@sparticuz/chromium`).
- [ ] Noter l’identifiant du déploiement Production actuel et le commit en ligne, pour le retour arrière.
- [ ] Preview du commit final relue (mesure d’audience désactivée sur preview).

**Déploiement**
- [ ] Promouvoir la Preview validée en Production, ou fusionner dans `main` (déploiement automatique) — sur approbation.

**Vérifications dans les 30 minutes**
- [ ] 200 sur `/`, `/en/`, `/services/gestion-reseaux-sociaux`, les quatre autres services, `/audit-site-web`, pages légales.
- [ ] Code source de la page Social Media : titre, description, canonical, JSON-LD, mention fiscale conforme au régime confirmé.
- [ ] `/sitemap.xml` contient la nouvelle URL.
- [ ] 404 attendus : `/projects/publication2.png`, `/projects/social/social-example-1.webp`.
- [ ] Simulateur : trois cas de contrôle (T1, T2, T4) en FR, un en EN.
- [ ] Une demande réelle (approuvée) → base + e-mail.
- [ ] GA4 Temps réel : `page_view` depuis `www.digitallab.studio` ; Clarity actif ; aucune donnée depuis une preview.
- [ ] Search Console : soumettre le sitemap, inspecter la nouvelle URL.

**Retour arrière**
- Déclencheurs : erreurs 5xx, page blanche, formulaire en échec, prix erronés, prérendu cassé.
- Vercel → Deployments → déploiement Production précédent → **Instant Rollback** (ou `vercel rollback <url-du-déploiement>`), effectif en quelques secondes.
- Aucune migration de base dans ce LOT : pas de retour arrière de données. Les lignes de test éventuelles se nettoient séparément.
- Correction durable : `git revert -m 1 <sha-de-fusion>` sur `main`, puis redéploiement (push sur approbation).
- Après retour arrière : revérifier les routes principales et le formulaire.
