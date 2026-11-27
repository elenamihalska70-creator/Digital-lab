# DL-PRIVACY-RELEASE-CONSOLIDATION-01

Revue locale du 2026-11-22 ; DigitalLab-release-candidate-01 ; feat/dl-release-candidate-01 ; HEAD 2edd3c34deffd19c47e869f85b63aaafd799a916 et diff local préservé. Décisions acquises : DL-SEC-DECISION-01 (TEST seulement), DL-DATA-RETENTION-01 (principes, pas exécution), transfert OVHcloud Zimbra vers Gmail grand public avec copie Zimbra, acceptation visuelle du Preview PR #20. Aucun de ces accords n’autorise la publication actuelle ou ne valide les contrats fournisseurs.

## Périmètre exact de ce LOT

- src/App.jsx : ajout du seul paragraphe approuvé à la section 8 ; corrections Systeme.io et mail inchangées.
- scripts/check-consent-ui.mjs : assertions de contenu pour ce paragraphe.
- docs/DL-DATA-RETENTION-01.md : note d’intégration locale, sans réécrire l’historique.
- docs/DL-PRIVACY-FINAL-01.md : renvoi vers cette revue actuelle.
- docs/DL-PRIVACY-RELEASE-CONSOLIDATION-01.md : présent bilan.

Les autres modifications visibles dans git status appartiennent aux LOTs précédents. Le gate scripts/check-privacy-date.mjs, la proposition mail et le document release sont préservés octet pour octet dans ce LOT. Aucun workflow, source fonctionnelle, infrastructure ou compte modifié.

## Formulation française intégrée

> Les durées de conservation dépendent de la nature des informations et de leur finalité. Les pièces soumises à une obligation légale de conservation sont distinguées des copies qui ne sont plus nécessaires. Une demande d’effacement est examinée en tenant compte des obligations de conservation et des exceptions applicables à la défense de droits.

Maintien du constat de conservation actuelle et d’absence de suppression automatique, de la possibilité de demander l’effacement et des exceptions légales. Le paragraphe distingue les catégories juridiquement ; il ne prétend ni qu’une purge ou un archivage technique existe déjà, ni qu’un inventaire historique est achevé. Aucun délai 90 jours/3 ans/10 ans n’est présenté comme une purge universelle opérationnelle.

## Cohérence de la politique complète

| Sections | Conclusion de revue | Limite probatoire |
| --- | --- | --- |
| 1 et 10 : responsable/contact/droits | Contact public cohérent ; demande par email et CNIL accessibles. Le délai d’un mois est maintenu. | Vérifier la capacité réelle de réception/suivi des droits ; aucune suppression exécutée. |
| 2 et 4 : demandes, Systeme.io, legacy et mail | Formulaire externe, UTM de placement et limites du bandeau explicités ; demande d’audit distincte du marketing. Ancien portail décrit au passé ; maintien des données explicite. Routage/copie Gmail cohérents avec preuve propriétaire. | Aucune preuve de livraison universelle, rôle Workspace, effacement historique ou arrêt Auth serveur inventée. |
| 3 : GA/Clarity | Cohérent avec code/tests et paramètres GA déjà vérifiés par la propriétaire ; aucun Clarity actif dans le candidat. | Consentement du site ne gouverne pas Systeme.io ; tests interceptés ne prouvent pas traitement fournisseur live. Pas de réouverture des checks GA clos. |
| 4 : rôles et transferts | Introduction neutre ; déclarations Vercel/Supabase attribuées aux fournisseurs ; Gmail personnel sans garantie Workspace. | Les contrats applicables et mécanismes concrets restent A1, pas établis par la seule notice. |
| 5–7, 9 et 12 : Drive/Sheets | Finalités sélectionnées, accès/révocation et Limited Use ne se contredisent pas textuellement. | Affirmations factuelles sur le fonctionnement réel à étayer (A4) ; révocation d’accès ne signifie pas suppression des copies. |
| 8 : conservation | Paragraphe approuvé compatible avec constat d’absence d’automatisme ; objectifs internes distincts des obligations. | L’approbation ne prouve pas la mise en œuvre ni une durée illimitée licite ; qualification/capacité minimale restent A3. |
| 11 : date | null et état « Version non publiée — date de publication à confirmer. » maintenus. | Bloque volontairement le gate jusqu’à la fenêtre de release autorisée. |

Aucune contradiction interne supplémentaire établie nécessitant une autre modification du texte dans ce LOT. Cela ne certifie pas les faits externes ni la conformité juridique globale. Les affirmations non étayées restent des points A, pas une conclusion de conformité.

## A — points matériels non clos : release non autorisable sur les seules preuves disponibles

Classement de préparation fondé sur l’information disponible : UNKNOWN ne signifie pas violation démontrée, mais empêche de donner un feu vert sans preuve ou traitement du point. Une décision propriétaire ne remplace pas une obligation légale.

| ID | Point et raison | Preuves existantes utilisées | Minimum supplémentaire nécessaire / condition de clôture |
| --- | --- | --- | --- |
| A1 | Conditions des traitements et transferts réellement utilisés : information exacte, rôles et garanties applicables (RGPD art. 13, 28 si sous-traitance, 44 et suivants). | Vercel héberge ; région Supabase Irlande vérifiée ; fournisseur Systeme.io identifié ; OVH Zimbra et Gmail personnel confirmés. Conditions GA acceptées et paramètres owner déjà documentés. | Pour Vercel/Supabase/Systeme.io/OVH : référence/version des conditions réellement applicables au compte et DPA lorsqu’ils agissent comme sous-traitants ; liste/documentation de sous-traitants ultérieurs et lieux/accès concernés ; mécanisme de transfert pertinent. Une preuve d’applicabilité automatique peut suffire, pas nécessairement une signature séparée. Pour Gmail grand public : conditions/entité/role et garanties applicables à l’usage professionnel réel ; aucune assimilation Workspace. Seules les métadonnées/attestations nécessaires, sans secret ni messages. Aucun besoin de revalider les paramètres GA déjà clos sans élément nouveau. |
| A2 | Traitements propres au funnel externe et information/consentement correspondants, s’ils existent. | Collecte email/URL, stockage demande/contact et confirmation/notification constatés par owner ; lien externe UTM connu. | Relevé fournisseur/owner de scripts, cookies/stockage et UTM réellement persistés/associés/transmis ; état avant choix et après refus/accord si traceurs ; finalités et destinataires. Une preuve d’absence de traceurs peut clore ce volet sans nouveau parcours complet. Pas de soumission réelle nécessaire ; rien de ceci n’est prouvé par les tests du site. |
| A3 | Conservation nécessaire et exercice effectif des droits, y compris copies mail et legacy : une cible approuvée ne suffit pas si personne ne peut déterminer les pièces ni agir. | Principes 90 jours conditionnels, correspondance nécessaire, 3 ans ciblés et obligations approuvés ; suppression automatique absente ; procédure mail proposée ; données legacy décrites. | Matrice minimale catégorie/finalité/base/critère et point de départ/exception/responsable ; confirmation de la capacité manuelle de retrouver, qualifier et traiter une demande dans chaque système/copie, avec limites sauvegardes. Avant toute décision de suppression Supabase : inventaire/classification sous autorisation distincte. Preuves fournisseur des fonctions de récupération/expiration et procédure pour une restauration ; pas besoin de purger tout l’historique ni d’automatiser pour clore ce minimum. Si une demande en cours ou des données sans nécessité sont identifiées, les traiter dans un LOT autorisé ; ne pas les repousser silencieusement. |
| A4 | Exactitude des déclarations d’automatisation Google et éventuels traitements historiques. | Sections 5–7/12 déclarent fichiers sélectionnés, finalités internes, destinataires limités, Limited Use ; Resend/Clarity désactivés dans le code candidat. | Inventaire owner minimal : scopes réellement consentis, fichiers/types de données, hôte d’exécution, destinations et réutilisations ; confirmer ces affirmations ou corriger le texte avant release. Pour Resend/Clarity : attestation d’absence de données personnelles résiduelles ou catégories/retention/accès encore présents et information appropriée. Aucun audit fonctionnel intégral requis ; aucune suppression induite. |
| A5 | Publication/intégrité de release et protections techniques. | SHA publié/Preview PR #20 acceptés, checks antérieurs verts ; single-owner TEST approuvé ; local date=null. | Fenêtre explicite, date fixe revue et assertion alignée, nouveau SHA/artefacts après autorisations ; pricing/verify incluant consentement/carousel verts. Vérifier protections/rollback nécessaires avant action de production. Aucun nouveau défaut de sécurité établi ici ; ne pas confondre politique TEST approuvée et protection technique déjà démontrée. |

Ce minimum demande des preuves ciblées, pas une collection exhaustive de captures ni de nouvelles données personnelles. L’acceptation publique de conditions ou la mention d’un pays ne prouvent pas à elles seules les contrats/transferts effectifs. Si l’usage actuel d’un fournisseur n’est pas justifiable, arrêter la release et préparer une correction/migration distinctement autorisée ; ne changer aucun compte dans ce LOT.

## B — améliorations planifiables après release, sous réserve de A

- Automatiser rappels, tri et échéances, améliorer l’ergonomie du registre et périodicité des revues ; seulement si la capacité manuelle A3 existe et les demandes/échéances sont respectées.
- Dérouler le nettoyage historique par lots, après inventaire et qualification/autorisation ; cette planification n’autorise pas de conserver des données déjà reconnues injustifiées ou de manquer une demande de droits.
- Traduction anglaise complète (liens actuels indiquent déjà le français), affichage des valeurs GA exactes plutôt que la borne actuelle cohérente, éventuel raccourcissement des cookies après décision. Ne pas rouvrir les réglages GA déjà vérifiés.
- Suppression administrative de comptes Resend/Clarity inactifs, seulement si A4 a établi l’absence d’un traitement matériel non résolu.
- Migration éventuelle de la messagerie pour simplifier la gestion : amélioration B uniquement si l’usage actuel Gmail est justifié par A1. Sinon remédiation A, pas reportable.

Ne sont pas des exigences de ce LOT : suppression automatique, purge générale, second reviewer TEST désormais remplacé par DL-SEC-DECISION-01, nouvelle preuve de l’activation du transfert Gmail ou nouvelle acceptation des principes déjà approuvés. La nouvelle apparence locale pourra être revue sans refaire les parcours fonctionnels clos.

## Décisions et séquence finale recommandée

1. Owner fournit/valide les preuves minimales A1–A4 et les qualifications non closes ; demander un avis juridique ciblé si rôle/base/transfert/exception reste incertain. Aucun « consentement au risque » ne remplace une exigence légale. Les décisions SEC, principes retention, routage mail et acceptation visuelle sont conservées acquises.
2. Ajuster uniquement les faits démontrés ; arrêter si une correction exige une action production non autorisée. Conserver null pendant la préparation.
3. Après autorisation séparée commit/push/Preview et vérification des effets de bord, publier le diff revu sur la branche dédiée et actualiser la seule PR #20 ; pas de nouvelle PR ni fermeture des parentes implicite. Refaire les gates pertinents sur ce SHA. verify doit rester rouge tant que null est conservé.
4. Dans une fenêtre de release explicitement autorisée : fixer la date ISO du jour prévu en Europe/Paris et l’assertion française, revue du diff, commit/push distinctement autorisés, nouveaux builds/artefacts/CI exact-SHA. Si changement de jour avant publication : nouvelle correction revue, pas d’injection au build. Le merge peut déclencher Vercel production : autorisation production explicite avant merge, avec rollback/protections vérifiés.
5. Après release autorisée : vérifier politique/date/SHA publics et acceptation consent-first, zéro Clarity et FR/EN ciblés ; consigner l’heure de publication réelle. Ne pas déclarer la date prévue comme fait historique avant cette preuve.
6. Planifier B et les opérations de données séparément autorisées. Cloudflare TEST reste désactivé ; aucun déploiement ou changement de variable implicite.

## Références de qualification

Preuves projet : DL-PRIVACY-CONSENT-01.md, DL-PRIVACY-FINAL-01.md et ses mises à jour, DL-PRIVACY-MAIL-01.md, DL-DATA-RETENTION-01.md, DL-SINGLE-OWNER-DEPLOYMENT-PROPOSAL-01.md ; checks/Preview de PR #20 dans la conversation précédente. Aucune configuration live recontrôlée dans ce LOT.

Sources primaires relues le 2026-11-22 pour cette qualification, sans répéter d’audit : [RGPD droits/information](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3), [responsabilité et sous-traitance](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre4), [transferts](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre5). La vérification des délais français et leur distinction des cibles internes figurent dans DL-DATA-RETENTION-01.md.

## Résultats locaux

Build normal/prérendu PASS (gros chunk existant) ; release/pricing PASS ; syntaxe des assertions PASS ; toutes les assertions positives de contenu de la section politique du script consentement exécutées sur navigateur local à 1440/390/320 PASS, garde-fous négatifs (pas de promesse 90 jours/3 ans/10 ans ni ancienne date/Irlande-exclusive), 12 sections, absence de débordement, zéro écriture externe/page error PASS ; HTML pré-rendu PASS. privacy-date FAIL attendu (null). Gate de date, proposition mail et ancien document release préservés octet pour octet ; comparaison exacte App.jsx prouve le seul ajout approuvé. Diff --check PASS. Aucune suite fonctionnelle déjà close répétée, aucune nouvelle exécution hosted, aucun commit/push/merge/deploy. Les résultats PR #20 restent attachés à son SHA publié.
