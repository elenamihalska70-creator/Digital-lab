# LOT-WEB-AI-LAB-CAROUSELS-01 — rapport local

Date : 28 octobre 2026. Branche `main`, HEAD `1450361c9ffa80d673fa1297ebf6bccc4ee125fe`.

## Périmètre et préservation

Le dépôt contenait déjà les changements non commités des LOTs visuels et médias précédents. Ils sont préservés. Ce LOT modifie uniquement l’import et l’intégration des galeries dans `AILabSection` et ses données d’images ; les autres sections de `App.jsx` sont identiques à l’état d’entrée. `src/App.css` n’a pas été modifié dans ce LOT. Vérification SHA-256 : 80 fichiers préexistants contrôlés inchangés, dont les images originales, posters et vidéos. Les textes, noms et statuts FR/EN du laboratoire restent identiques.

Au terme de l’implémentation initiale, aucun commit, push ou déploiement n’avait été effectué. La publication ciblée et l’exception de cadrage décrite ci-dessous ont ensuite été autorisées explicitement. Aucun stash, reset ou ajout global à l’index.

## Les neuf chemins utilisés, dans l’ordre

| Projet | 1 | 2 | 3 |
| --- | --- | --- | --- |
| Local Business Discovery | `/projects/local-business-discovery.webp` | `/projects/local-business-discovery_2.jpg` | `/projects/local-business-discovery_3.jpg` |
| ReelsMaker | `/projects/reelsmaker.webp` | `/projects/reelsmaker_2.jpg` | `/projects/reelsmaker_3.jpg` |
| Digital Lab AI OS | `/projects/digital-lab-ai-os.webp` | `/projects/digital-lab-ai-os-2.jpg` | `/projects/digital-lab-ai-os-3.jpg` |

Les trois WebP sont des optimisations sans perte des PNG fournis, sans redimensionnement. L’identité des pixels RGBA décodés a été vérifiée avec FFmpeg. Poids totaux : 5 719 897 octets pour les trois PNG, 4 122 670 octets pour les WebP, soit environ 28 % de réduction. Les PNG restent présents.

Les deux JPG AI OS normalisés sont des copies exactes de `Tableau de bord Digital Lab AI OS_2.jpg` et `Tableau de bord Digital Lab AI OS_3.jpg`. Les originaux restent présents. Le fichier préexistant `Tableau de bord Digital Lab AI OS.png`, distinct du nom demandé pour le premier slide, reste conservé et inutilisé. Aucune nouvelle illustration n’a été générée.

## Fichiers du présent LOT

- Modifié : `src/App.jsx`.
- Créés : `src/components/AILabCarousel.jsx`, `src/components/AILabCarousel.css`.
- Créés : les trois WebP et les deux copies JPG normalisées listés ci-dessus.
- Créé : ce rapport.
- Les quatre JPG Local Business Discovery/ReelsMaker déjà fournis sont utilisés directement et inchangés. Les neuf sources préparées par l’utilisateur étaient non suivies au préflight ; elles n’ont pas été supprimées.

## Fonctionnement

Trois instances React indépendantes, sans bibliothèque supplémentaire. Chacune possède trois images, deux flèches, trois indicateurs et une commande de pause. Navigation circulaire ; transition d’opacité de 350 ms ; retour visuel au clic et focus visible. Les touches gauche/droite, Home et End fonctionnent depuis les commandes. Les contrôles sont de vrais boutons, nommés en FR/EN ; la position actuelle est exposée aux technologies d’assistance. Aucun changement de page ni ouverture de modale.

L’automatique avance toutes les 5 secondes lorsque la galerie est visible. Il s’arrête au survol, au focus clavier, après une pause explicite et avec `prefers-reduced-motion: reduce`. Le mode mouvements réduits supprime aussi les transitions. Les mentions « Illustrations conceptuelles » et « Concept illustrations » sont visibles sur chaque galerie : les interfaces et métriques restent présentées comme des illustrations.

Ratio réservé 16:9, images en `object-fit: cover`, sans déformation, sauf `digital-lab-ai-os-2.jpg` en `object-fit: contain` selon la correction explicitement validée : ce visuel carré est entièrement visible sur le fond sombre, avec des bandes latérales. Les huit autres images restent en `cover`. Les premiers slides utilisent `loading="eager"` ; les autres ont `loading="lazy"` et ne reçoivent leur `src` qu’à leur premier affichage. Les slides déjà affichés restent en cache pour éviter les rechargements. Aucune vidéo dans les galeries.

## Contrôles

- Les neuf images ont été décodées dans Chromium avec des dimensions naturelles non nulles, dans l’ordre demandé.
- FR/EN : noms, légendes, commandes et statuts vérifiés.
- Desktop : largeur effective 1440 px, trois colonnes et aucun débordement horizontal.
- Mobile : largeur effective 390 px, une colonne, ratio 16:9 et aucun débordement horizontal ; contrôle visuel et navigation FR/EN.
- Souris : flèches et indicateurs ; pause au survol vérifiée sans focus dans la galerie.
- Clavier : sélection par Entrée, gauche/droite, Home/End, retour circulaire ; pause au focus vérifiée pendant que les autres galeries continuent.
- Automatique : progression indépendante observée ; période configurée à 5000 ms. Navigation sans changement d’URL ni dialogue ouvert.
- Reduced motion : vérifié sur une page de test locale isolée injectant `matchMedia(...).matches = true` avant montage. Automatique désactivé, bouton automatique désactivé, transitions à `0s`, premier slide stable et navigation manuelle fonctionnelle. Il s’agit d’une simulation de préférence, pas d’une modification des réglages système. La page temporaire a été supprimée.
- Console du site : aucune erreur observée. Une erreur d’import dans la page de test temporaire a été corrigée avant le contrôle reduced motion ; elle n’appartient pas au site.
- ESLint du nouveau composant : réussi. Diagnostics globaux identiques à HEAD : 22 erreurs et 3 avertissements préexistants, sans nouvelle erreur.
- `git diff --check` : réussi.
- `npm run build` : réussi, compilation Vite et prérendu des 13 routes inclus ; avertissement préexistant de bundle supérieur à 500 Ko.

Limites : Chromium uniquement, mobile vérifié par largeur de viewport ; pas de test sur appareil physique, Safari ou lecteur d’écran réel. Les visuels non 16:9 en `cover` sont recadrés ; le second visuel AI OS carré bénéficie de l’exception `contain` validée. Aucun correctif du projet Audit n’est inclus.

## Isolation de la publication

Le candidat de publication est construit depuis HEAD avec seulement l’import `AILabCarousel`, les données d’images et la section `AILabSection` du présent LOT. `src/App.jsx` est indexé partiellement ; ses modifications locales du lecteur vidéo et du lien vers la vidéo v2 restent hors du commit. `src/App.css`, les posters, toutes les vidéos, les SVG du précédent LOT, son rapport et les originaux d’images non utilisés sont exclus.

Les styles nécessaires au cadrage et à la disposition des cartes sont autonomes dans `AILabCarousel.css` et limités aux cartes marquées `ai-lab-has-carousel`. Ils ne dépendent pas des styles non commités du LOT précédent. Un export isolé de ce candidat est utilisé pour la compilation et les contrôles avant publication.

Contrôles du candidat isolé après correction : `npm run build` réussi avec prérendu des 13 routes ; `git diff --check` réussi ; composant sans diagnostic ESLint ; trois carrousels FR/EN vérifiés à 1440 et 390 px, neuf images décodées, aucune erreur console ni débordement horizontal. Le second slide AI OS a été contrôlé visuellement sur desktop et mobile : image entière dans le cadre 16:9 avec fond sombre et bandes latérales. Les huit autres images restent en `cover`. Les changements des autres LOTs et les fichiers originaux inutilisés restent exclus.

Statut : publication autorisée pour ce seul LOT ; résultats Git, SHA et déploiement rapportés dans le compte rendu de livraison.
