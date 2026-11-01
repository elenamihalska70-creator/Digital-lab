# LOT SM-01 — Digital Lab Social Media — rapport

Date : 1er novembre 2026. Base : `5b710a1`, branche dédiée `feat/sm-01-social-media`.
Aucun merge, push ou déploiement ; aucune modification de base de données, CRM ou n8n.
Revue technique : elle ne constitue pas une validation juridique.

**Statut de publication : BLOQUÉ** — `npm run check:release` échoue tant que le régime TVA n’est pas confirmé.

## Contenu du LOT

| Fichier | Rôle |
| --- | --- |
| `src/utils/estimator.js` | Tarification récurrente séparée : formules, options mensuelles, frais unique, offre Reels. `getEstimatorResult` (projets ponctuels) inchangé |
| `src/config/taxMention.js` | Configuration unique de la mention fiscale (`TAX_REGIME`, non confirmé = `null`) |
| `scripts/check-release.mjs`, `package.json` | `npm run check:release` : contrôle avant publication, échoue tant qu’un réglage bloquant n’est pas confirmé |
| `src/App.jsx` | Page `/services/gestion-reseaux-sociaux`, carte service accueil FR/EN, lien de navigation, types de demande « Réseaux sociaux » et « Reels », pré-remplissage du formulaire, JSON-LD |
| `src/App.css` | Styles `sm-*`, encadré « Offre sélectionnée », retours à la ligne du « Message initial » dans les dossiers |
| `src/utils/estimator.test.js`, `src/config/taxMention.test.js` | 10 tests ajoutés au total |
| `seo-routes.config.js`, `vite.config.js` | Route ajoutée au sitemap et au prérendu (priorité 0.8, mensuelle) |
| `public/projects/social/*.webp` | 3 captures de publications existantes du dépôt (`publication1-3.png`), WebP 640/960/pleine taille |

## Offre

| Formule | Lancement | Ensuite | Publications | Réseaux | Reels inclus |
| --- | --- | --- | --- | --- | --- |
| Présence | 149 €/mois | 190 €/mois | 4 | 1 | 0 |
| Visibilité | 299 €/mois | 390 €/mois | 8 | 2 | 0 |
| Croissance | 549 €/mois | 690 €/mois | 12 | 2 | 2 |

Lancement réservé aux 5 premiers clients, pendant les 3 premiers mois. Pas de prix barré, de pourcentage de remise, de compte à rebours ni de compteur de places. Reels : 69 € l’unité, 249 €/mois (4), 449 €/mois (8), vidéo complexe sur devis.

**Non approuvé** (dans `SOCIAL_MEDIA_ADDONS` et le texte de la page) : 20 €/publication supplémentaire, 40 €/mois par réseau supplémentaire, audit de départ 150 € ; bilans mensuels et point stratégique de 30 min ; contenu d’un Reel ; liste « non inclus » ; réseaux gérés.

## Mention fiscale (bloquant)

`TAX_REGIME = null` dans `src/config/taxMention.js` : le régime TVA n’est pas confirmé. Valeurs prévues : `HT`, `TTC`, `FRANCHISE` (« TVA non applicable, art. 293 B du CGI »).

Tant qu’il est `null`, aucun prix de l’offre n’affiche HT/TTC, aucune note fiscale n’apparaît et `npm run check:release` sort en erreur. Une fois défini, la même valeur alimente tous les prix de la page, la méta-description, le récapitulatif joint à la demande et une note sous les formules. Le contrôle n’est pas branché sur `npm run build` afin de ne pas bloquer les prévisualisations : il doit être lancé avant toute mise en production.

Emplacements affichant un prix de l’offre : cartes formules, prix de référence, configurateur (montants, détail, aides), cartes Reels, comparaison par Reel, récapitulatif de demande, méta-description. Hors périmètre : l’estimateur de projets ponctuel existant affiche « à partir de X€ » sans mention.

## Cohérence commerciale — forfaits et options

Calculé avec `getSocialMediaEstimate` ; aucun prix modifié. Les exemples A et B sont des illustrations.

| Formule | €/publication (lancement / ensuite) |
| --- | --- |
| Présence | 37,25 / 47,50 |
| Visibilité | 37,38 / 48,75 |
| Croissance | 45,75 / 57,50 (Reels inclus) |

| Comparaison (options / forfait) | Actuel 20 €/40 € | Exemple A 30 €/50 € | Exemple B 45 €/60 € |
| --- | --- | --- | --- |
| Présence + 4 publ. + 1 réseau ≈ Visibilité — lancement | 269 / 299 ✗ | 319 / 299 ✓ | 389 / 299 ✓ |
| — ensuite | 310 / 390 ✗ | 360 / 390 ✗ | 430 / 390 ✓ |
| Visibilité + 4 publ. + 2 Reels ≈ Croissance — lancement | 517 / 549 ✗ | 557 / 549 ✓ | 617 / 549 ✓ |
| — ensuite | 608 / 690 ✗ | 648 / 690 ✗ | 708 / 690 ✓ |
| Présence + 8 publ. + 1 réseau + 2 Reels ≈ Croissance — lancement | 487 / 549 ✗ | 577 / 549 ✓ | 707 / 549 ✓ |
| — ensuite | 528 / 690 ✗ | 618 / 690 ✗ | 748 / 690 ✓ |

Seuils : publication supplémentaire ≥ 40,50 € ; à ce prix, réseau supplémentaire ≥ 38 €. En dessous, assembler une formule inférieure et des options coûte moins cher que la formule supérieure. Constat annexe : Visibilité ajoute un réseau sans baisser le prix par publication par rapport à Présence.

## Formulaire et demandes

Chaque CTA pré-sélectionne le type « Réseaux sociaux » ou « Reels » et affiche un récapitulatif (formule, volumes, prix de lancement et ensuite, audit, réserve « estimation indicative »). Le récapitulatif est ajouté au message envoyé, que le visiteur réécrive ou non son texte ; un message déjà saisi n’est pas écrasé lors d’un changement d’offre. Sans pré-remplissage (formulaires de l’accueil FR/EN), le message est transmis inchangé.

`project_type` est un texte libre côté code (espaces client/admin, devis, PDF). **Contrainte Supabase en production : UNKNOWN** — le projet du site (`gcsqoluyfgkpwhtbpnzj`) n’est pas accessible depuis le compte Supabase connecté ; la base n’a pas été modifiée.

## Visuels

- Image 2 : photo de profil personnelle et haut d’un nom (« Elena Mikh… ») partiellement visibles sous l’encart Éclat Lifestyle.
- Droits d’usage non confirmés pour les trois captures (marque, photos produits, avis « Clara » dans la légende).
- Éléments d’interface Meta visibles autour des captures.
- Rendu contrôlé à 1440, 1280, 1024, 768, 390 et 320 px ; cohérent avec le design existant (panneaux sombres, accents violets). Images non remplacées.

## Validations

- Tests : `node --test src/utils/estimator.test.js src/config/taxMention.test.js` — 38/38. Résultat chatbot identique au moteur de `5b710a1`.
- ESLint : 22 erreurs, 3 avertissements, identiques à `5b710a1` ; aucun nouveau diagnostic.
- `npm run build` : réussi, 14 routes prérendues. Avertissement de bundle > 500 Ko préexistant.
- SEO prérendu : title, description, canonical, `og:url`, `index, follow`, 1 `h1`, 10 `h2` ; JSON-LD `Service`, `BreadcrumbList`, `FAQPage` (7 questions, identiques à la FAQ visible), absent des autres routes ; route présente dans `sitemap.xml`.
- `npm run check:release` : sortie 1 (attendu tant que la TVA n’est pas confirmée).
- Chromium (Supabase, email et analytics interceptés) : 55/55 contrôles — absence de mention fiscale, contenu des formules, configurateur, pré-remplissage, payloads base/email, régression des formulaires d’accueil FR/EN, événements GA4, navigation, clavier, débordement.
- Fusion simulée avec le travail non commité de `main` (`git stash create` + `git merge-tree`, sans modification) : aucun conflit.

Limites : pas d’appareil physique, ni Safari/Firefox ; pas de soumission réelle vers Supabase.

## Décisions requises avant publication

1. Régime TVA → `TAX_REGIME`.
2. Prix des options (seuils ci-dessus) et audit de départ.
3. Formulations « tarif de référence », renouvellement après 3 mois, résiliation, durée d’engagement (CGV).
4. Images : droits d’usage ; recadrage, floutage ou remplacement de l’image 2.
5. Contrainte `project_type` en production.
6. Contenus supposés : bilans, point stratégique, contenu d’un Reel, exclusions, réseaux.
