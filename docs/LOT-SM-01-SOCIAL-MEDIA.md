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

- Contenu des formules : Présence 8 publications / 1 réseau / 0 Reel ; Visibilité 12 / 2 / 1 ; Croissance 16 / 3 / 2. Bilans mensuels et point stratégique de 30 min (Croissance).
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
