# LOT SM-01 → SM-04 — Digital Lab Social Media — rapport

Mise à jour : 2 novembre 2026. Base : `5b710a1`, branche dédiée `feat/sm-01-social-media`.
Aucun merge, push ou déploiement ; aucune modification de base de données, CRM ou n8n.
Revue technique : elle ne constitue pas une validation juridique.

**Statut de publication : BLOQUÉ** — `npm run check:release` échoue tant que le régime TVA n’est pas confirmé (`TAX_REGIME = null`).

## Simulateur unifié (LOT SM-04)

Un seul composant, `UnifiedEstimator` (`src/App.jsx`), rendu sur l’accueil FR (`#estimation`), l’accueil EN (`#en-estimation`) et la page Social Media (`#simulateur-reseaux-sociaux`, Social Media présélectionné). L’ancien `ProjectEstimator` et le configurateur indépendant de la page Social Media sont supprimés.

Règles de calcul, toutes dans `src/utils/estimator.js` :

| Fonction | Rôle |
| --- | --- |
| `getProjectEstimate` | Projet ponctuel en nombres (budget, délai structuré, niveau) : urgence, arrondi à 50 € et délai inchangés |
| `getEstimatorResult` | Ancienne sortie texte FR, conservée et construite sur `getProjectEstimate` (648 combinaisons vérifiées identiques) |
| `getSocialMediaEstimate`, `getReelsPrice` | Abonnement et Reels (LOT SM-01/02), sans urgence, arrondi ni délai |
| `getUnifiedEstimate` | Assemble projet + Social Media ou Reels ; renvoie `project`, `recurring`, `oneTimeFees`, `onQuote`, `firstMonth` |

Choix possibles : projet ponctuel seul, Social Media seul, Reels seuls, projet + abonnement (Social Media ou Reels), Social Media avec Reels supplémentaires. Social Media et « Reels seuls » sont exclusifs : avec Social Media, les Reels s’ajoutent comme option de la formule, au-delà des Reels inclus — jamais facturés deux fois.

- 1 Reel (69 €) : prestation ponctuelle. Packs 4 et 8 : mensuels. Vidéo complexe : sur devis.
- Premier mois = abonnement de lancement + frais de mise en place (audit). Un projet ponctuel n’y est jamais ajouté ; il est affiché à part avec la mention « facturé selon son propre devis ».
- Questions affichées : projet → questions actuelles inchangées ; Social Media → formule, réseaux concernés, publications et Reels supplémentaires, audit ; Reels → 1 / pack 4 / pack 8 / vidéo complexe. Complexité, urgence et fonctionnalités web ne sont jamais montrées pour un abonnement.
- Textes FR/EN produits à partir des nombres (plus d’extraction de montant dans une chaîne).

### Demande de devis

« Demander ce devis » remplit le formulaire existant de la même page (`ContactForm`) au lieu d’ouvrir un `mailto:` : type de projet, message modifiable et récapitulatif (services, formule, réseaux, options, estimation ponctuelle, montants mensuels, frais uniques, premier mois). Le récapitulatif est ajouté au message envoyé à `contact_requests` et `/api/send-contact-email` ; le texte saisi par le visiteur est conservé lors des changements d’option. Schéma Supabase inchangé.

Types utilisés : ceux du formulaire existant (`Site web`… `MVP / prototype`) pour un projet, `Réseaux sociaux` ou `Reels` sinon. **Contrainte `project_type` en production : UNKNOWN** (projet Supabase du site non accessible depuis le compte connecté) ; parcours réel non vérifié, uniquement avec base et e-mail simulés.

Événements GA4 : `estimator_quote_request`, `estimator_quote_submit` (nouveaux) ; `social_media_offer_select` et `social_media_request_submit` conservés.

## Page Social Media (direction artistique Phase A)

Structure : 1. Hero (« Vos réseaux sociaux, sans y passer vos journées. ») · 2. Bénéfices · 3. Contenus par activité et prestations incluses · 4. Méthode en quatre temps · 5. Tarifs comparatifs · 6. Offre Reels · 7. Exemples (calendrier et bilan de démonstration) · 8. FAQ · 9. Simulateur et demande de devis.

Visuels : compositions HTML/CSS originales (smartphones, publications, Reels verticaux), marques fictives, mention « Exemple illustratif ». Aucune statistique, aucun avis ni logo client. Les trois anciennes illustrations « tableau de bord » et la fenêtre d’agrandissement associée sont supprimées. La carte « Réseaux sociaux & Reels » de l’accueil utilise trois images générées à partir de ces compositions (`public/projects/social/social-card-*.webp`).

Maillage interne : les quatre autres pages services renvoient vers la page Social Media.

### Améliorations futures (non bloquantes)

Ajout progressif de photographies éditoriales réelles : bureaux créatifs, smartphones en situation, mises en scène de produits, photographie lifestyle, exemples de contenus clients. Uniquement avec droits d’exploitation établis (photos propres, banque d’images sous licence documentée, accord écrit des clients).

## Offre

| Formule | Lancement | Prix standard | Publications | Réseaux | Reels inclus |
| --- | --- | --- | --- | --- | --- |
| Présence | 149 €/mois | 190 €/mois | 4 | 1 | 0 |
| Visibilité | 299 €/mois | 390 €/mois | 8 | 2 | 0 |
| Croissance | 549 €/mois | 690 €/mois | 12 | 2 | 2 |

Lancement réservé aux 5 premiers clients, pendant 3 mois. Options : publication 45 €, réseau 60 €/mois, Reels 69 € / 249 €/mois / 449 €/mois, vidéo complexe sur devis, audit 150 € (facultatif, provisoire). Une formule inférieure complétée par des options n’est jamais moins chère que la formule supérieure (test dédié).

## Fiscalité et mesure d’audience

- `src/config/taxMention.js` : mention unique pour tous les prix du site (projets ponctuels inclus), libellés FR/EN. `TAX_REGIME = null` : aucune mention affichée, `npm run check:release` en échec.
- `src/utils/trackingEnvironment.js` : GA4 et Clarity uniquement sur `digitallab.studio` et `www.digitallab.studio`, en build de production. Localhost, réseau local, previews Vercel et prérendu exclus. Les balises sont injectées au chargement de la page (elles ne sont plus figées dans le HTML prérendu).

## Validations (LOT SM-04)

- Tests unitaires : 50/50 (`node --test src/utils/estimator.test.js src/config/taxMention.test.js src/utils/trackingEnvironment.test.js`).
- ESLint : 22 erreurs, 3 avertissements, identiques à `5b710a1`.
- `npm run build` : réussi, 14 routes prérendues.
- Navigateur, bundle de production, Supabase/e-mail/analytics interceptés : 55/55 — six services ponctuels identiques au moteur, non-régression Chatbot, combinaisons, Reels, premier mois, parcours FR/EN jusqu’à l’envoi, présélections de la page Social Media, SEO, absence de mention fiscale, responsive 1440/1024/768/390/320 px, 14 routes sans image cassée, mesure d’audience par domaine.

Limites : pas d’appareil physique, ni Safari/Firefox ; pas de soumission réelle vers Supabase.

## Décisions restantes avant publication

1. Régime TVA → `TAX_REGIME`, puis `npm run check:release`.
2. Contrainte `project_type` en production (UNKNOWN) et test réel du parcours de devis.
3. CGV : relecture juridique de `docs/CGV-SOCIAL-MEDIA-PROJET.md` (le site emploie désormais « prix standard »).
4. Audit de départ à 150 € (provisoire) ; contenus supposés (bilans, point stratégique, contenu d’un Reel, exclusions).
5. Historique Git public contenant `publication2.png` : conservé (pas de réécriture).

## Visuels V3 (validés par la propriétaire)

Six photographies Unsplash (licence vérifiée photo par photo, provenance dans `docs/visuals/SOCIAL-MEDIA-V3-PROVENANCE.md`), recadrées sans visage identifiable, textes en HTML :

- Hero : publication café (téléphone principal, chargement immédiat) et avant / après atelier (téléphone secondaire, badge « Simulation »).
- « Des contenus à votre image » : café, coach (squat sumo), atelier (badge « Simulation »).
- Offre Reels : couvertures barista, kettlebell, transformation (badge « Simulation ») — sans bouton Lecture ni barre de progression, légende « aucune vidéo ».
- Carte de l’accueil : trois images régénérées à partir de ces compositions (`social-v3-card-*`).

Fichiers : `public/projects/social/v3/` (21 WebP, 1,6 Mo au total, variantes 432/648/640/960 px). Anciennes images `social-card-*` supprimées ; aucune référence restante. Poids des visuels sur la page : 261 Ko (ordinateur), 891 Ko (mobile haute densité).
