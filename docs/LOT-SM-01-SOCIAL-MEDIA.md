# LOT SM-01 — Digital Lab Social Media — rapport

Date : 1er novembre 2026. Base : `5b710a1`, branche dédiée `feat/sm-01-social-media`.
Aucun push, aucun déploiement, aucune modification CRM/n8n. Publication soumise à validation explicite.

## Changements

| Fichier | Rôle |
| --- | --- |
| `src/utils/estimator.js` | Tarification récurrente séparée : formules, options mensuelles, frais unique, offre Reels. `getEstimatorResult` (projets ponctuels) inchangé |
| `src/utils/estimator.test.js` | 6 tests ajoutés : régression chatbot, prix, Reels, absence de double comptage, frais unique, entrées invalides |
| `src/App.jsx` | Page `/services/gestion-reseaux-sociaux`, carte service accueil FR/EN, lien de navigation, types de demande « Réseaux sociaux » et « Reels », pré-remplissage du formulaire de contact, JSON-LD |
| `src/App.css` | Styles `sm-*` de la page et encadré « Offre sélectionnée » du formulaire |
| `seo-routes.config.js`, `vite.config.js` | Route ajoutée au sitemap et au prérendu (priorité 0.8, mensuelle) |
| `public/projects/social/*.webp` | 3 captures de publications existantes du dépôt (`publication1-3.png`), converties en WebP 640/960/pleine taille |

## Page et parcours

Hero, bénéfices, inclus / non inclus, méthode en 4 étapes, 3 formules, configurateur, exemples visuels, section Reels distincte (`#reels`), FAQ (7 questions, identiques au JSON-LD `FAQPage`), formulaire de demande intégré.

Chaque CTA (carte formule, configurateur, pack Reels, vidéo complexe) pré-sélectionne le type de demande et affiche un récapitulatif de l’offre. Ce récapitulatif est ajouté au message envoyé (table `contact_requests` et email `/api/send-contact-email`), même si le visiteur réécrit son message. Un message déjà saisi n’est pas écrasé lors d’un changement d’offre. Événements GA4 : `social_media_offer_select` et `social_media_request_submit` (paramètre `offer`).

## Hypothèses tarifaires à valider

Les montants fournis sont repris tels quels : Présence 149/190 €, Visibilité 299/390 €, Croissance 549/690 €, Reels 69 € l’unité, 249 €/mois (4), 449 €/mois (8), vidéo complexe sur devis. Les éléments suivants sont **des hypothèses** à confirmer, tous centralisés dans `src/utils/estimator.js` ou en tête du bloc `LOT SM-01` de `App.jsx` :

- Contenu des formules : aligné lors de la revue sur le tableau du propriétaire — Présence 4 publications / 1 réseau ; Visibilité 8 / 2 ; Croissance 12 / 2 / 2 Reels. Restent des hypothèses : bilans mensuels et point stratégique de 30 min (Croissance).
- Options : 20 € par publication supplémentaire, 40 €/mois par réseau supplémentaire, audit de départ et mise en place 150 € (unique, optionnel).
- Reels au-delà de la formule : combinaison exacte la moins chère d’unités et de packs (ex. 6 Reels = 249 + 2 × 69).
- Contenu d’un Reel : script, montage 9:16 à partir des médias du client, sous-titres, musique libre de droits, une série de retouches.
- Non inclus : budget publicitaire, tournage/shooting, modération en continu.
- Réseaux gérés : Instagram, Facebook, LinkedIn, Google Business Profile.

## Points juridiques à revoir avant publication

- **TVA** : le statut n’est indiqué nulle part sur le site. Libellé provisoire « HT » dans une seule constante (`socialMediaTaxLabel`). À remplacer par TTC ou « TVA non applicable, art. 293 B du CGI » selon le régime.
- **Tarif de lancement** : présenté comme « 149 € les 3 premiers mois, puis 190 € (tarif de référence) », sans prix barré ni pourcentage de remise. Les tarifs de référence n’ayant jamais été pratiqués, un prix barré pourrait être assimilé à une réduction trompeuse. Aucun compte à rebours ni compteur de places restantes.
- **Durée d’engagement / résiliation** : non définies ; la FAQ renvoie au devis. À compléter dans des CGV.
- **Méta-description** : mentionne « dès 149 €/mois » ; à mettre à jour à la fin de l’offre de lancement.
- **Visuels Éclat Lifestyle** : captures de publications préparées, déjà présentes dans le dépôt depuis le premier déploiement mais jamais publiées. Confirmer le droit de les montrer (client réel ou projet de démonstration). Aucune statistique ni capture de performance n’est affichée. La capture 2 laisse apparaître partiellement le nom d’un compte personnel.

## Validations

- Tests : `node --test src/utils/estimator.test.js` — 34/34 (28 existants + 6). Le résultat chatbot est identique à celui du moteur de `HEAD` (comparaison directe).
- ESLint : 22 erreurs et 3 avertissements, identiques à `HEAD` ; aucun nouveau diagnostic.
- `npm run build` : réussi, 14 routes prérendues dont la nouvelle (titre, canonical, `index, follow`, un seul `h1`, JSON-LD présent). Avertissement de bundle > 500 Ko préexistant.
- `git diff --check` : réussi.
- Chromium (Playwright, Supabase et email interceptés, aucune donnée réelle écrite) : 41 contrôles automatisés réussis, dont calculs du configurateur, absence de double comptage, pré-remplissage, payload base et email, événements GA4, navigation FR/EN, menu mobile, absence de débordement à 1440/1024/390/320 px, FAQ au clavier, aucune erreur JS. Un contrôle a échoué à cause d’une attente erronée dans le script (le récapitulatif correspondait bien à l’état du configurateur).

Limites : pas d’appareil physique, ni Safari/Firefox. La soumission réelle vers Supabase n’a pas été testée ; `project_type` étant un texte libre dans le code, vérifier qu’aucune contrainte en base ne rejette « Réseaux sociaux » ou « Reels ».

## Revue et durcissement (1er novembre 2026)

Revue technique ; elle ne constitue pas une validation juridique.

### Corrections effectuées

| Fichier | Correction |
| --- | --- |
| `src/utils/estimator.js` | Contenu des formules aligné sur le tableau validé : 4/1/0, 8/2/0, 12/2/2 (publications/réseaux/Reels) |
| `src/App.jsx` | État initial du configurateur à zéro (sinon Visibilité ajoutait un Reel payant par défaut) ; textes d’audience des formules ; mention fiscale unique `socialMediaTaxLabel` en tête de fichier, utilisée par tous les prix de la page, la méta-description et le récapitulatif ; `aria-live` limité aux prix ; libellé accessible du storyboard Reels |
| `src/App.css` | Retours à la ligne conservés dans « Message initial » des dossiers client/admin (le récapitulatif d’offre s’affichait sur une ligne) |
| `src/utils/estimator.test.js` | Contenu des formules, prix nu de chaque formule, changement de formule |

### Points ouverts

- **P1 — cohérence des options** : avec 20 €/publication et 40 €/réseau, Présence + 4 publications + 1 réseau = 269 € (310 € ensuite) < Visibilité 299 € (390 €) ; Visibilité + 4 publications + 2 Reels = 517 € (608 €) < Croissance 549 € (690 €). Les options rendent les formules supérieures moins intéressantes. Exemple de grille cohérente : 45 €/publication et 60 €/réseau. Décision propriétaire.
- **P1 — image 2** : photo de profil personnelle et haut d’un nom (« Elena Mikh… ») partiellement visibles sous l’encart Éclat Lifestyle. Droits d’usage de la marque et des photos à confirmer pour les trois captures.
- **P1 — contrainte base** : le projet Supabase du site (`gcsqoluyfgkpwhtbpnzj`) n’est pas accessible depuis le compte connecté ; acceptation de « Réseaux sociaux » et « Reels » dans `project_type` non vérifiée en production.
- **P2** : estimateur ponctuel existant sans mention HT/TTC ; cartes de formules sur une colonne entre 600 et 900 px ; éléments d’interface Meta visibles autour des captures ; pas de lien vers la page depuis les autres pages service.
