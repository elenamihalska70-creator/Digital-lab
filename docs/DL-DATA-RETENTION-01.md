# DL-DATA-RETENTION-01 — décision propriétaire

Date : 2026-11-22. Projet Digital Lab. Worktree DigitalLab-release-candidate-01 ; branche feat/dl-release-candidate-01 ; HEAD 2edd3c34deffd19c47e869f85b63aaafd799a916, avec travaux locaux précédents préservés.

## Décision et limites d’autorité

La propriétaire approuve les principes ci-dessous sous réserve de vérification des exigences françaises et européennes applicables. Cette approbation clôt le choix des principes ; elle ne prouve ni leur mise en œuvre ni une purge historique. Autorisation limitée à la documentation locale et préparation étroite de la notice. Aucun effacement manuel/automatique, accès ou écriture de base, changement fournisseur, commit/push/merge/déploiement ni activation production/Cloudflare TEST. CLOUDFLARE_TEST_DEPLOY_ENABLED doit rester false et n’est pas lu ou modifié.

1. Audits gratuits sans conversion : examiner le dossier clos et retirer les copies inutiles dans les 90 jours après clôture, sauf obligation ou exception justifiée/documentée.
2. Correspondance ordinaire de prospects : conserver seulement tant qu’une finalité professionnelle légitime demeure, sans écarter une obligation légale applicable.
3. Prospection licite : évaluer le repère CNIL de trois ans à partir du dernier contact pertinent émanant du prospect ; pas d’application automatique à toute correspondance. En l’absence de contact ultérieur, examiner le point de départ à la collecte prévu par le référentiel.
4. Contrats, factures et pièces comptables : conserver selon les obligations applicables à leur nature.
5. Données historiques Supabase : inventorier/classer avant toute décision d’effacement. Cette décision n’autorise pas l’inventaire réel ni un accès aux données dans ce LOT.
6. Zimbra et Gmail grand public : établir une procédure coordonnée couvrant copies, archives, Envoyés, sauvegardes et exceptions légales. La proposition mail précédente reste à vérifier et tester sous autorisation distincte.

## Vérification des exigences — sources officielles consultées le 2026-11-22

| Nature | Règle établie / portée | Conséquence pour Digital Lab |
| --- | --- | --- |
| Obligation UE : RGPD art. 5(1)(e), 5(2) | Limiter la conservation au nécessaire et pouvoir justifier les choix. Une finalité professionnelle ne constitue pas à elle seule une nouvelle base légale. | Registre par catégorie : finalité/base déjà justifiée, durée/critère, point de départ, exception, responsable et preuve de revue. L’ancienneté seule n’autorise pas une suppression de pièces obligatoires. |
| Information / effacement : art. 13(2)(a), 17(3)(b/e), 19 | Informer des durées ou critères ; exceptions à l’effacement pour obligation et défense de droits ; notification aux destinataires selon les conditions de l’art. 19. | Ne pas annoncer une purge déjà opérationnelle. Examiner les exceptions et les destinataires concernés ; effacer Zimbra ne prouve rien sur Gmail ou les sauvegardes. |
| Objectif interne : 90 jours | Aucune obligation générale de 90 jours établie pour tout audit gratuit. Choix propriétaire pour la revue/retrait des copies inutiles après clôture. | Définir la clôture, l’échéance et l’exception AVANT exécution ; conserver une pièce légalement nécessaire même si elle provient d’un audit non converti. |
| Repère CNIL : 3 ans | Recommandation de prospection : collecte ou dernier contact émanant du prospect ; ce n’est pas une obligation universelle de conserver 3 ans. Une simple ouverture d’email ne relance pas le délai. | Ne pas compter un envoi sortant ou un transfert Bark comme un nouveau contact du prospect ; documenter la finalité licite et son déclencheur réel, sans inventer de consentement. |
| Pièces comptables : Code de commerce L123-22 | Conservation de 10 ans des documents comptables et pièces justificatives ; fiche officielle : à compter de la clôture de l’exercice. | Qualifier les factures/pièces nécessaires ; ne pas appliquer 10 ans à tous les emails ou devis sans distinction. Confirmer régime/statut exact et obligations fiscales cumulatives. |
| Documents commerciaux / fiscaux : fiches officielles | Documents commerciaux : repère officiel de 5 ans pour contrats/correspondance ; documents fiscaux : 6 ans avec point de départ propre. Certains contrats électroniques consommateurs ≥120 EUR ont une règle spécifique de 10 ans. | Cartographier les catégories et règles cumulatives, le statut exact (EI/micro) et les points de départ. La cible de 90 jours ne déroge jamais aux obligations applicables. Ne pas généraliser une prescription ou une fiche à tout message. |
| Archivage intermédiaire : CNIL | Séparer les seules pièces nécessaires à une obligation ou un contentieux, avec accès restreint et finalité dédiée. | Établir ce dispositif ; aucune affirmation qu’il existe déjà. Documenter aussi récupération/sauvegardes et prévention de réintroduction lors d’une restauration. |

Sources :

- [RGPD art. 5/6, texte CNIL](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre2).
- [RGPD art. 13/17/19, texte CNIL](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3).
- [CNIL, référentiels commerciaux](https://www.cnil.fr/fr/questions-reponses-sur-les-referentiels-relatifs-la-gestion-des-activites-commerciales-et-des) ; [référentiel publié / dernier contact](https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000045538582).
- [Code de commerce L123-22](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006219327) ; [Service Public, durées par document](https://entreprendre.service-public.gouv.fr/vosdroits/F10029) ; [documents commerciaux EI](https://entreprendre.service-public.gouv.fr/vosdroits/F37370). Attention : ces fiches signalent un champ EI/hors micro ; utiliser le régime réellement applicable avant exécution, sans le déduire du seul code du site.
- [CNIL, archivage](https://www.cnil.fr/fr/comment-concilier-les-durees-de-conservation-et-les-archives).

Vérification de sources générales, pas audit du statut fiscal/juridique ni de dossiers réels : les catégories, délais et exceptions concrets restent à qualifier. Le lien EUR-Lex direct était inaccessible au navigateur de recherche ; le texte RGPD publié par la CNIL a été utilisé.

## Préparation de la notice française — proposition non appliquée au code

Formulation minimale proposée pour compléter la section 8 lors de la mise en œuvre vérifiée :

> Les durées de conservation dépendent de la nature des informations et de leur finalité. Les pièces soumises à une obligation légale de conservation sont distinguées des copies qui ne sont plus nécessaires. Une demande d’effacement est examinée en tenant compte des obligations de conservation et des exceptions applicables à la défense de droits.

Ce texte décrit des critères, sans promettre de purge à 90 jours ni prétendre qu’un archivage est déjà opérationnel. Il n’est pas inséré dans App.jsx dans ce LOT : la notice existante expose encore l’absence de suppression automatique et les données actuellement conservées. L’information finale devra refléter les critères réellement mis en œuvre ; l’approbation interne ne suffit pas à transformer une cible en fait public. Aucune garantie de conformité ni nouvelle base légale ajoutée.

## Conditions restantes avant mise en œuvre et release

- Cartographier catégories/statut/obligations/points de départ et exceptions ; nommer le responsable et les preuves de revue. Les principes ne sont plus à approuver, mais la qualification juridique et les modalités ne sont pas closes.
- Établir la date de clôture des audits, l’inventaire autorisé des données/copies et les capacités d’effacement/récupération par fournisseur ; qualifier les anciennes données Supabase avant toute décision. Obtenir une nouvelle autorisation pour tout accès réel ou suppression.
- Confirmer DPA, sous-traitants/transferts et traitement des sauvegardes, dont Gmail grand public et Systeme.io ; vérifier les autres inconnues matérielles déjà recensées, sans rouvrir les audits achevés.
- Date de publication=null inchangée ; finalisation séparée à la release, nouveau SHA/artefacts et CI à revalider après changements autorisés. Aucune acceptation visuelle/CI passée n’atteste une future procédure de suppression.

## Validation locale

Sources officielles examinées pour la qualification générale. App.jsx, assertions navigateur, gate de date et document release précédent inchangés octet pour octet par ce LOT. null conservé ; privacy-date FAIL attendu (1) ; release/pricing PASS ; diff --check PASS. Aucun nouveau build ou audit fonctionnel : aucune entrée de build ni test modifié dans ce LOT documentaire. Aucun compte/base/message consulté ou modifié.

## DL-PRIVACY-RELEASE-CONSOLIDATION-01 — intégration locale autorisée

Le 2026-11-22, la propriétaire autorise explicitement l’intégration du paragraphe minimal ci-dessus dans App.jsx. La mention antérieure « proposition non appliquée au code » décrit le LOT précédent ; elle est remplacée par ce statut actuel : paragraphe intégré localement, sans publication. Aucun délai de purge, automatisme ou archivage technique opérationnel n’est promis. Les principes de qualification des pièces ne prouvent pas un inventaire historique achevé. La date reste null ; aucune suppression autorisée.
