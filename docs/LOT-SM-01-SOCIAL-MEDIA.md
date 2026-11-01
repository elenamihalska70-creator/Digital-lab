# LOT SM-01 / SM-02 — Digital Lab Social Media — rapport

Date : 1er novembre 2026. Base : `5b710a1`, branche dédiée `feat/sm-01-social-media`.
Aucun merge, push ou déploiement ; aucune modification de base de données, CRM ou n8n.
Revue technique : elle ne constitue pas une validation juridique.

**Statut de publication : BLOQUÉ** — `npm run check:release` échoue tant que le régime TVA n’est pas confirmé (`TAX_REGIME = null`).

## Contenu du LOT

| Fichier | Rôle |
| --- | --- |
| `src/utils/estimator.js` | Tarification récurrente séparée : formules, options, frais unique, offre Reels. `getEstimatorResult` (projets ponctuels) inchangé |
| `src/config/taxMention.js` | Configuration unique de la mention fiscale (`TAX_REGIME`, non confirmé = `null`) |
| `scripts/check-release.mjs`, `package.json` | `npm run check:release` : contrôle avant publication |
| `src/App.jsx` | Page `/services/gestion-reseaux-sociaux`, carte service accueil FR/EN, navigation, types de demande « Réseaux sociaux » et « Reels », pré-remplissage du formulaire, JSON-LD |
| `src/App.css` | Styles `sm-*`, encadré « Offre sélectionnée », retours à la ligne du « Message initial » dans les dossiers |
| `src/utils/estimator.test.js`, `src/config/taxMention.test.js` | 11 tests ajoutés au total |
| `seo-routes.config.js`, `vite.config.js` | Route ajoutée au sitemap et au prérendu |
| `public/projects/social/social-example-*.webp` | 3 exemples illustratifs originaux (marque fictive), 640/960/1100 px, 264 Ko au total |
| `docs/CGV-SOCIAL-MEDIA-PROJET.md` | Projet de CGV, non validé juridiquement |

## Offre

| Formule | Lancement | Ensuite | Publications | Réseaux | Reels inclus |
| --- | --- | --- | --- | --- | --- |
| Présence | 149 €/mois | 190 €/mois | 4 | 1 | 0 |
| Visibilité | 299 €/mois | 390 €/mois | 8 | 2 | 0 |
| Croissance | 549 €/mois | 690 €/mois | 12 | 2 | 2 |

Options (LOT SM-02) : publication supplémentaire 45 €, réseau supplémentaire 60 €/mois. Reels : 69 € l’unité, 249 €/mois (4), 449 €/mois (8), vidéo complexe sur devis. Audit de départ : 150 €, facultatif, une seule fois, **provisoire**.

Lancement réservé aux 5 premiers clients, pendant les 3 premiers mois. Pas de prix barré, de remise en pourcentage, de compte à rebours ni de compteur de places.

## Cohérence commerciale

Avec 45 € et 60 €, une formule inférieure complétée par des options n’est jamais moins chère que la formule supérieure ; un test le vérifie pour toutes les paires.

| Comparaison | Lancement : options / forfait | Ensuite : options / forfait |
| --- | --- | --- |
| Présence + 4 publ. + 1 réseau ≈ Visibilité | 389 € / 299 € | 430 € / 390 € |
| Visibilité + 4 publ. + 2 Reels ≈ Croissance | 617 € / 549 € | 708 € / 690 € |
| Présence + 8 publ. + 1 réseau + 2 Reels ≈ Croissance | 707 € / 549 € | 748 € / 690 € |

## Mention fiscale (bloquant)

`TAX_REGIME = null` dans `src/config/taxMention.js`. Valeurs prévues : `HT`, `TTC`, `FRANCHISE` (« TVA non applicable, art. 293 B du CGI »). Tant qu’elle est `null`, aucun prix n’affiche HT/TTC, aucune note fiscale n’apparaît et `npm run check:release` sort en erreur. Le contrôle n’est pas branché sur `npm run build` : il doit être lancé avant toute mise en production.

## Visuels

Les droits sur les captures Éclat Lifestyle n’étant pas confirmés, elles sont retirées de la page et de la carte d’accueil, et leurs dérivés WebP supprimés de la branche. Elles sont remplacées par trois exemples originaux créés pour cette page (publication préparée, calendrier éditorial, validation avant publication), avec une marque fictive, un badge « Exemple illustratif » dans l’image, des textes alternatifs et légendes explicites, et aucun chiffre ni résultat client.

Une version de l’image 2 sans photo de profil ni nom a été préparée hors dépôt, utilisable si les droits sont confirmés.

**Attention :** les fichiers source `public/projects/publication1-3.png` sont présents dans le dépôt depuis le premier déploiement et ne font pas partie de ce LOT. `publication2.png` contient la photo de profil et le nom ; il est vraisemblablement accessible sur le site en production. Non modifié sans accord.

## Formulaire et demandes

Chaque CTA pré-sélectionne « Réseaux sociaux » ou « Reels » et joint un récapitulatif (formule, volumes, prix de lancement et ensuite, audit, réserve « estimation indicative ») au message enregistré et envoyé par e-mail. Sans pré-remplissage, le message est transmis inchangé. **Contrainte Supabase `project_type` en production : UNKNOWN** (projet non accessible depuis le compte connecté) ; base non modifiée.

## Validations

- Tests : `node --test src/utils/estimator.test.js src/config/taxMention.test.js` — 39/39. Estimateur de projets ponctuels : 810 combinaisons identiques à `5b710a1`.
- ESLint : 22 erreurs, 3 avertissements, identiques à `5b710a1`.
- `npm run build` : réussi, 14 routes prérendues ; avertissement de bundle préexistant.
- `npm run check:release` : sortie 1 (attendu).
- Prévisualisation du bundle de production (`vite build` + `vite preview`, Supabase/e-mail interceptés) : 65/65 contrôles, dont le parcours complet navigation → page → formule → formulaire → envoi, avec contrôle des données transmises.
- Fusion simulée avec le travail non commité de `main` : aucun conflit.

Limites : pas d’appareil physique, ni Safari/Firefox ; pas de soumission réelle vers Supabase.

## Décisions requises avant publication

1. Régime TVA → `TAX_REGIME`, puis `npm run check:release`.
2. Relecture juridique du projet de CGV et arbitrage des mentions `[À VALIDER]` (durée, résiliation, droits, paiement, consommateurs).
3. Audit de départ : confirmer 150 €.
4. Contrainte `project_type` en production.
5. Fichier `public/projects/publication2.png` en production.
6. Contenus supposés : bilans, point stratégique, contenu d’un Reel, exclusions, réseaux ; terme « tarif de référence » ou « prix standard ».
7. P2 préexistant : lien « En savoir plus » des cartes services sans style.
