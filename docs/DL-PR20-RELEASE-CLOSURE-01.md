# DL-PR20-RELEASE-CLOSURE-01

Revue du 2026-11-26 (Europe/Paris). **NO-GO pour finaliser la date/publication**, limité aux points ci-dessous. Ce document actualise la décision du 23 novembre sans réécrire les preuves historiques.

## Etat et preuves consolidées

Worktree existant DigitalLab-release-candidate-01, branche feat/dl-release-candidate-01, HEAD 48de74dd63f91a497353838786674fcc8494f9dc. GitHub confirme PR #20 ouverte, Draft, non fusionnée, même SHA. Diff suivi vide ; document préexistant non suivi DL-PR20-FINAL-READINESS-01.md préservé. Checkout initial DigitalLab/main différent et modifié : préservé.

Acquis du présent mandat : deux demandes historiques dans digital-lab-prod ; permissions CRM/Content Planning inspectées ; responsable des demandes manuelles confirmé ; principes de conservation approuvés ; Audit récupéré séparément. Partage Content Hub corrigé : déclaration propriétaire, pas nouvelle inspection indépendante. Production inchangée et standby désactivé : faits fournis, aucune action externe effectuée. Les anciens tests restent attachés à leur SHA ; aucun audit fonctionnel refait.

Le dossier DL-PRIVACY-MAIL-01 décrit déjà réception à contact@digitallab.studio, suivi minimal, identité proportionnée, recherche Zimbra ET Gmail (Spam/Corbeille inclus), copies Drive/exports et coordination Systeme.io/Supabase, exceptions légales, effacement séparé, vérification et réponse. La confirmation du responsable ferme le précédent défaut de désignation. Ne pas transformer cette confirmation en preuve de suppression exécutée ou de purge des sauvegardes. Ajouter CRM/Content Planning au périmètre de recherche lorsque la demande les concerne ; après restauration, réappliquer les décisions d’effacement avant remise en usage. Aucun essai de suppression nécessaire dans ce LOT.

## Conditions fournisseurs : résultat ciblé

- Vercel : [DPA](https://vercel.com/legal/dpa), introduction, champ Pro/Enterprise ; [conditions](https://vercel.com/legal/terms), Hobby réservé au personnel/non commercial. Lecture authentifiée : équipe et projet digital-lab identifiés, réponse get_team sans champ billing/plan. **Plan inconnu**, pas de violation démontrée. Une preuve de plan éligible ou accord applicable reste nécessaire ; aucun achat ni changement de compte autorisé.
- Supabase : [conditions §7(b)](https://supabase.com/terms) et [DPA](https://supabase.com/legal/customer-resources/data-processing-addendum) incorporé au contrat ; [transferts](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq) avec SCC. Ne pas exiger une signature séparée par défaut pour le compte standard existant. Région Irlande acquise, sans promesse de résidence exclusive. L’entité contractante exacte ne se déduit pas de la région ; les conditions prévoient plusieurs entités.
- Systeme.io : [conditions art.6](https://systeme.io/terms-and-conditions) et [notice](https://systeme.io/fr/privacy-policy) consultées ; elles ne suffisent pas à établir un DPA applicable au traitement des contacts pour Digital Lab. Demander seulement la référence contractuelle/incorporation ou réponse fournisseur ciblée. Aucune prétention que le DPA est absent.
- OVH Zimbra : usage acquis. La [page France](https://www.ovhcloud.com/fr/personal-data-protection/) est générale ; rattacher les clauses de traitement aux conditions Zimbra du compte, sans utiliser le DPA OVH US comme preuve du contrat français.
- Gmail personnel : [conditions](https://policies.google.com/terms?hl=fr&gl=fr), [confidentialité](https://policies.google.com/privacy?hl=fr), traitements internationaux et délais de suppression reconnus. Ces textes ne prouvent pas un contrat Workspace ni une sous-traitance professionnelle au titre de l’art.28. Qualification de l’usage/transfert restant à justifier de façon ciblée ; retirer une promesse de la notice ne régulariserait pas un traitement injustifié.
- GA : preuves compte déjà closes, non rouvertes. Google API : [règles](https://developers.google.com/terms/api-services-user-data-policy) exigent description exacte des données/finalités et accès minimal. Permissions inspectées ne prouvent pas seules destinations d’exécution ni respect de Limited Use. Pas de nouvelle inspection des permissions demandée.

## Corrections minimales préparées (non appliquées)

Dans src/App.jsx, section 4, remplacer seulement « Supabase (Supabase Pte. Ltd, Singapour) » par « Supabase ». Dans le paragraphe transferts remplacer « Vercel indique que ses principaux centres de traitement se situent aux États-Unis, et la société Supabase contractante est établie à Singapour ; le déploiement du projet Supabase en Irlande n’exclut pas que certaines données soient traitées ou consultées hors de l’Union européenne. » par :

> Vercel est établi aux États-Unis. Le déploiement du projet Supabase en Irlande n’exclut pas que certaines données soient traitées ou consultées hors de l’Union européenne.

Cela retire deux précisions non établies pour le compte, sans inventer une autre entité. Conserver l’attribution aux fournisseurs des SCC ; elle ne vaut pas preuve d’applicabilité au compte Vercel.

Section 8, remplacer le paragraphe « pendant la relation ... jusqu’à leur suppression » par :

> Les informations relatives aux demandes, aux échanges et aux anciens espaces clients sont conservées selon leur finalité et leur nécessité, en tenant compte des obligations légales et de la défense de droits. Leur conservation et les demandes d’effacement sont examinées manuellement par la responsable de Digital Lab. Aucune suppression automatique n’est actuellement en place.

Section 10, après le contact droits, formulation préparée :

> Les demandes sont traitées manuellement par Olena Mykhalska — Digital Lab. Une réponse vous est apportée dans un délai d’un mois à compter de la réception de votre demande. Si la complexité ou le nombre de demandes le nécessite, ce délai peut être prolongé de deux mois ; vous en êtes informé dans le premier mois, avec les motifs de la prolongation.

[CNIL : délai et prolongation](https://www.cnil.fr/fr/respecter-les-droits-des-personnes/professionnels-comment-repondre-une-demande-de-droit-dacces). Ce texte décrit le traitement des demandes, sans promettre l’effacement immédiat de toutes les sauvegardes.

Sections 5–7/12 : ne pas remplacer une garantie non prouvée par une autre. La seule inspection des permissions CRM/Content Planning ne permet ni d’ajouter des catégories de données inventées ni de certifier « uniquement les fichiers sélectionnés » ou Limited Use. Une courte confirmation des données réellement utilisées, finalités CRM/contenu et prestataires destinataires permet de confirmer le texte ou d’en faire la correction exacte ; aucune nouvelle architecture ni inventaire ligne à ligne requis.

## Trois actions restantes, dans cet ordre

1. **Clarification matériellement requise** : réunir les seules références manquantes du compte Vercel (plan/accord), Systeme.io (DPA/incorporation), Zimbra (clauses applicables) et justification de l’usage Gmail personnel ; confirmer en une fiche courte les données/finalités/destinataires effectifs CRM et contenu pour l’exactitude des sections 5–7/12. Réutiliser les inspections acquises ; aucune signature séparée imposée si incorporation suffisante, aucun secret demandé.
2. **Correction publique** : appliquer les remplacements exacts ci-dessus et seulement l’ajustement Google résultant des faits confirmés ; aligner les assertions de contenu correspondantes et contrôler le diff. L’historique Resend/Clarity n’est pas déclaré effacé dans la notice : pas de purge générale ni nouveau blocage automatique faute d’inventaire exhaustif ; traiter seulement une conservation active matérielle nouvellement établie.
3. **Date après readiness** : le 2026-11-24 est expiré. Nouvelle cible proposée : **2026-11-27, Europe/Paris**, conditionnelle à la clôture des deux actions et à une autorisation de publication pour ce jour. Si l’autorisation est postérieure, utiliser ce jour ultérieur. Alors seulement préparer la constante ISO fixe et l’assertion française du même jour ; jamais antidater ou injecter une date au build. Commit/push, CI hébergée du nouveau SHA, merge/production puis synchronisation Cloudflare restent les étapes distinctement autorisées prévues par le mandat.

Automatisation des droits, migration de messagerie si usage actuel justifié, amélioration du registre, audit d’autres projets Microassist et activation standby : hors prérequis de ce LOT. Les obligations contractuelles réelles ne deviennent pas facultatives par simple reformulation.

Vérification ciblée : check-privacy-date exécuté, FAIL attendu car constante null ; gate et assertion de non-publication préservés. Aucun code, client, base, secret, compte, DNS ou configuration Cloudflare modifié. Aucun commit/push/merge/deploy. Ce rapport et les remplacements préparés ne constituent pas une autorisation de publication.

## Application locale — DL-PR20-PRIVACY-CORRECTIONS-01 (2026-11-26)

Les remplacements préparés des sections 4, 8 et 10 sont appliqués dans src/App.jsx ; les assertions directement concernées sont alignées dans scripts/check-consent-ui.mjs. Les passages précédents restent la trace de la préparation initiale. Disclosures OVHcloud/Zimbra, Gmail et Systeme.io préservées ; aucune correction Google non confirmée ajoutée. Date=null, gate et contrôles Cloudflare inchangés. Les confirmations fournisseur/usage Google restent ouvertes ; cette correction ne constitue pas un GO de publication. Aucun commit/push/merge/deploy ni changement de données ou fournisseur.

Validation de cette application : build et prérendu 14 routes PASS ; assertions positives/négatives de la politique exécutées sur la page construite à 1440/390/320 px PASS, sans erreur de page ni requête externe (interception active). Sections 1–3, 5–7, 9, 11–12 et disclosures mail/Systeme.io comparées à HEAD et préservées (hors normalisation CRLF). Syntaxe du script PASS ; privacy-date FAIL attendu (null) ; git diff --check PASS. Premier build sandbox : spawn EPERM ; relance autorisée hors sandbox PASS. Aucun audit fonctionnel complet répété.

## DL-PR20-FINAL-COMMIT-CI-01 — préparation autorisée (2026-11-26)

Le propriétaire autorise un seul commit des trois fichiers désignés, le push sur la branche existante de PR #20 et la vérification de CI. La date fixe 2026-11-27 et son assertion française sont préparées comme date prévue, sans preuve de publication. Les mentions null des étapes précédentes sont historiques. Au 26 novembre, le contrôle anti-date future doit échouer ; ni horloge ni gate ne sont modifiés. Les confirmations fournisseurs/Google ci-dessus restent ouvertes. Aucun merge, déploiement production, upload ou activation Cloudflare autorisé.

Validation avant commit : 116/116 tests existants, 26/26 tests standby, release/pricing, build normal avec 14 routes prérendues, syntaxe et assertions de politique/date à 1440/390/320 px PASS ; aucune requête externe ni erreur de page dans ce contrôle ciblé. privacy-date FAIL attendu : 2026-11-27 est futur au 2026-11-26. Aucun contournement ; un échec CI de même cause ne justifiera ni correction de gate ni nouvelle date. git diff --check PASS. Logs locaux ignorés : validation.local/final-commit-ci-01. Les anciens constats sans commit/push restent historiques ; le mandat présent autorise uniquement le commit/push et la CI.
