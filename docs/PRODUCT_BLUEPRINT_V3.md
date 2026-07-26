# MICROASSIST PRODUCT BLUEPRINT V3

Architecture produit, domaines métier, données, services et stratégie d'implémentation de Microassist V2.

## Introduction

Ce document traduit la Product Vision 2027, les Design Principles et le UX Blueprint V3 en architecture produit et technique cible pour Microassist V2.

Il remplace `PRODUCT_BLUEPRINT_V2.md` comme référence technique future. `PRODUCT_BLUEPRINT_V2.md` reste conservé comme photographie historique du cadrage précédent. `ARCHITECTURE_AUDIT.md` décrit l'existant et doit être utilisé pour mesurer l'écart entre l'application actuelle et la cible.

Ce document décrit la cible, pas le code final. Il ne définit aucune migration SQL, aucune configuration Supabase, aucun composant React et aucun calcul fiscal définitif. Toute implémentation future doit respecter les décisions UX validées : Microassist doit aider l'utilisateur à comprendre ce qu'il doit faire maintenant, ce qu'il devra préparer ensuite et combien il doit mettre de côté, sans prétendre réaliser des démarches officielles à sa place.

Note de contexte local : dans le workspace actuellement disponible, les documents de référence `.md` mentionnés ne sont pas présents dans `docs/`, et la branche active observée est `main`. Le présent fichier formalise donc la cible à partir du brief de création fourni et des demandes documentaires disponibles en pièces jointes. Cette absence de sources locales doit être résolue avant validation finale.

## 1. Sources De Vérité Et Hiérarchie

La hiérarchie documentaire cible est la suivante :

1. `MICROASSIST_PRODUCT_VISION_2027.md` définit la mission, les utilisateurs, la promesse et la direction produit.
2. `MICROASSIST_DESIGN_PRINCIPLES.md` définit les règles d'expérience non négociables : clarté, confiance, progressivité, absence de fausse promesse.
3. `UX_BLUEPRINT_V3.md` définit les parcours, écrans, états, transitions et règles de visibilité.
4. `PRODUCT_BLUEPRINT_V3.md` définit l'architecture produit et technique cible.
5. `ARCHITECTURE_AUDIT.md` décrit l'état technique actuel.
6. `PRODUCT_BLUEPRINT_V2.md` reste une référence historique, mais ne gouverne plus les nouveaux choix lorsque ses décisions contredisent V3.

En cas de contradiction, la Product Vision et le UX Blueprint validé priment sur les documents plus anciens. Les choix techniques doivent servir l'expérience validée, pas l'inverse.

## 2. Principes D'Architecture

Microassist V2 doit reposer sur une architecture modulaire par domaines fonctionnels, avec séparation explicite entre interface, logique métier, données, règles réglementaires et infrastructure.

Principes structurants :

- architecture par domaines fonctionnels ;
- séparation claire entre présentation, cas d'usage, modèles métier, règles et stockage ;
- aucun calcul fiscal directement dans les composants d'interface ;
- aucune règle réglementaire importante dispersée dans plusieurs fichiers ;
- séparation entre données saisies, confirmées, estimées et calculées ;
- conservation de l'historique des règles et décisions réglementaires ;
- progressive disclosure pilotée par des états de domaine, pas par du code UI improvisé ;
- cohérence entre mode découverte et compte connecté ;
- migration progressive depuis l'architecture existante ;
- tests des règles métier indépendamment de l'interface ;
- sécurité, traçabilité et minimisation des données par défaut ;
- aucune prétention d'action officielle si Microassist ne réalise pas réellement l'action.

Règle fondamentale : les composants d'interface affichent les décisions du domaine. Ils ne doivent pas décider eux-mêmes des règles fiscales, des priorités, de la validité d'un statut ou de l'urgence d'une action.

## 3. Architecture Globale De L'Application

### 3.1 Présentation

La couche Présentation contient les pages, la navigation, les formulaires, les messages utilisateur, les états de chargement, les états vides, les états d'erreur, l'affichage mobile et desktop, ainsi que les exigences d'accessibilité.

Elle ne doit pas contenir de taux fiscaux codés en dur, de priorités réglementaires, de calculs ACRE, de génération de dates réglementaires non validées ou de décisions métier complexes.

### 3.2 Domaines Métier

Domaines recommandés :

- Auth ;
- Discovery Mode ;
- Today ;
- Profile ;
- Revenue ;
- Declaration ;
- ACRE ;
- Invoice ;
- Deadline ;
- Document ;
- Notification ;
- Settings ;
- Analytics ;
- Assistant.

Chaque domaine contient ses modèles métier, cas d'usage, validations, états, règles de transition et accès contrôlés aux services nécessaires.

### 3.3 Services Partagés

Services cibles :

- Calculation Engine ;
- Rules Engine ;
- Today Decision Engine ;
- Visibility Engine ;
- Deadline Engine ;
- Notification Engine ;
- Document Engine ;
- Sync and Migration Service ;
- Audit and History Service ;
- Source Registry ;
- Storage Adapter ;
- Authentication Adapter.

Ces services exposent des décisions explicables aux domaines et à l'interface. Ils ne doivent pas dépendre d'un composant React pour fonctionner.

### 3.4 Infrastructure

L'infrastructure peut inclure Supabase Auth, base Supabase, Row Level Security, stockage local, stockage sécurisé de documents si validé, service email, notifications futures, génération PDF future, journalisation et monitoring.

L'infrastructure doit pouvoir évoluer sans modifier les règles métier fondamentales. Un changement de fournisseur ou de schéma ne doit pas forcer une réécriture des moteurs métier.

## 4. Découpage Par Domaines

### Auth

Responsabilité : gérer inscription, connexion, confirmation email, recovery, déconnexion, session et protection des routes.

Données principales : compte, email, statut de confirmation, session, expiration, destination demandée.

Actions utilisateur : créer un compte, confirmer l'email, se connecter, récupérer un mot de passe, se déconnecter.

Cas d'usage : `createAccount`, `signIn`, `confirmEmail`, `recoverPassword`, `signOut`, `protectPrivateRoute`.

Dépendances : Authentication Adapter, Storage Adapter, Audit and History Service.

États : inconnu, visiteur, connecté non confirmé si applicable, connecté confirmé, recovery actif, session expirée.

Limites : ne pas mélanger confirmation email et recovery ; ne pas considérer le mode découverte comme une session privée.

Priorité : P0.

### Discovery Mode

Responsabilité : offrir le coeur de valeur sans compte avec stockage local limité.

Données principales : profil minimal, revenus locaux, estimations simples, progression locale, statut de migration.

Actions utilisateur : démarrer, renseigner profil minimal, ajouter un revenu local, consulter une estimation indicative, créer un compte.

Cas d'usage : `startDiscoveryMode`, `saveLocalProfile`, `addLocalRevenue`, `calculateLocalEstimate`, `proposeMigration`.

Dépendances : Storage Adapter local, Calculation Engine, Visibility Engine, Sync and Migration Service.

États : aucune donnée, local uniquement, migration proposée, conflit, migration réussie, migration échouée.

Limites : pas de stockage cloud, pas de documents cloud, pas de promesse de déclaration officielle, capacités explicitement limitées.

Priorité : P0.

### Today

Responsabilité : synthétiser la situation actuelle, l'action principale, l'échéance utile, la réserve conseillée et les prochaines étapes.

Données principales : profil, revenus, échéances, déclarations, ACRE, incohérences, maturité utilisateur.

Actions utilisateur : comprendre la situation, lancer l'action principale, voir les actions secondaires, confirmer une information.

Cas d'usage : `loadToday`, `selectMainAction`, `resolveTodayAction`.

Dépendances : Today Decision Engine, Profile, Revenue, Deadline, ACRE, Declaration, Visibility Engine.

États : chargement, prêt, incomplet, incohérent, action urgente, rien à faire.

Limites : une seule action principale ; aucune alerte rouge pour une information non urgente.

Priorité : P0.

### Profile

Responsabilité : structurer l'activité, les informations fiscales déclaratives, ACRE, TVA, facturation, compte et historique des modifications.

Données principales : activité, catégories, activité mixte, SIREN, SIRET, date officielle d'ouverture, périodicité, TVA, ACRE, version du profil.

Actions utilisateur : créer ou compléter le profil, modifier un statut, confirmer une donnée, prévisualiser l'impact d'un changement.

Cas d'usage : `updateBusinessProfile`, `previewFiscalProfileChange`, `confirmProfileChange`.

Dépendances : Rules Engine, Calculation Engine, Audit and History Service, Source Registry.

États : absent, minimal, suffisant, à confirmer, incohérent, historique impacté.

Limites : ne pas réécrire silencieusement les données historiques confirmées.

Priorité : P0.

### Revenue

Responsabilité : gérer les revenus encaissés, leur catégorisation, leur modification, suppression et lien facultatif avec facture.

Données principales : montant encaissé, date d'encaissement, catégorie, description, client facultatif, facture liée, source, statut.

Actions utilisateur : ajouter, modifier, supprimer, catégoriser, associer à une facture.

Cas d'usage : `addRevenue`, `updateRevenue`, `deleteRevenue`, `categorizeRevenue`.

Dépendances : Profile, Calculation Engine, Audit and History Service, Invoice.

États : brouillon, valide, incomplet, lié à facture, supprimé logiquement si historique requis.

Limites : distinguer date de facture et date d'encaissement ; activité mixte au niveau de chaque revenu.

Priorité : P0.

### Declaration

Responsabilité : préparer une déclaration, regrouper les revenus par période, estimer les montants et suivre la confirmation utilisateur.

Données principales : période, revenus inclus, date limite, estimation, statut utilisateur, montant payé, date paiement.

Actions utilisateur : préparer, vérifier, ouvrir le site officiel, confirmer le statut, saisir le montant payé.

Cas d'usage : `prepareDeclaration`, `confirmDeclarationStatus`, `recordDeclarationPayment`.

Dépendances : Revenue, Profile, Calculation Engine, Deadline Engine, Rules Engine.

États : non préparée, préparée, à confirmer, confirmée, payée, incohérente.

Limites : Microassist peut préparer et guider, mais ne doit pas prétendre déclarer officiellement si l'action n'est pas réalisée.

Priorité : P0.

### ACRE

Responsabilité : suivre l'éligibilité, la demande, l'envoi, l'accord, le refus, les délais et la période d'application.

Données principales : statut, date officielle d'ouverture, date demande, date réponse, règle applicable, source, niveau de confirmation.

Actions utilisateur : renseigner l'état, indiquer l'envoi, confirmer accord ou refus, consulter le délai.

Cas d'usage : `updateAcreStatus`, `evaluateAcreDeadline`, `applyAcreRuleToEstimate`.

Dépendances : Profile, Rules Engine, Deadline Engine, Calculation Engine, Source Registry.

États : éligibilité inconnue, à demander, demande envoyée, en attente, approuvée, refusée, délai dépassé, non éligible, inconnu.

Limites : ACRE ne doit pas être considérée automatiquement accordée ; l'application dans un calcul dépend d'un statut permettant de l'appliquer.

Priorité : P1 complet, avec base P0 si nécessaire au calcul.

### Invoice

Responsabilité : gérer la facturation complète en P1 : brouillon, finalisation, numérotation, statut, paiement, lien avec encaissement et PDF futur.

Données principales : numéro, client, lignes, total, dates, statut, paiements, revenu lié, version.

Actions utilisateur : créer, modifier un brouillon, finaliser, marquer payé, proposer un revenu lié.

Cas d'usage : `createInvoice`, `finalizeInvoice`, `markInvoicePaid`, `createRevenueFromInvoicePayment`.

Dépendances : Revenue, Document Engine, Audit and History Service.

États : brouillon, finalisée, envoyée, payée, annulée, en retard.

Limites : Invoice peut proposer un Revenue, mais ne crée jamais automatiquement un encaissement sans confirmation.

Priorité : P1.

### Deadline

Responsabilité : gérer les dates confirmées, estimées ou inconnues, leur fiabilité, priorité, statut et source.

Données principales : type, date, priorité, statut, fiabilité, source, action associée.

Actions utilisateur : consulter, confirmer, reporter si autorisé, créer un rappel.

Cas d'usage : `listDeadlines`, `confirmDeadline`, `resolveDeadlineAction`.

Dépendances : Deadline Engine, Rules Engine, Profile, ACRE, Declaration.

États : inconnue, estimée, confirmée, urgente, passée, traitée.

Limites : une date inconnue doit rester inconnue ; ne pas inventer d'échéances.

Priorité : P0 puis P1 avancé.

### Document

Responsabilité : gérer documents générés et documents ajoutés par l'utilisateur.

Données principales : type, origine, stockage, propriétaire, date, statut, métadonnées, suppression.

Actions utilisateur : générer, télécharger, uploader si validé, supprimer, consulter.

Cas d'usage : `uploadDocument`, `generateDocument`, `deleteDocument`, `listDocuments`.

Dépendances : Document Engine, Storage Adapter, Auth, Audit and History Service.

États : généré, uploadé, disponible, supprimé, erreur stockage.

Limites : Documents est P1 ; l'upload dépend d'un stockage sécurisé validé ; pas de stockage cloud en découverte.

Priorité : P1.

### Notification

Responsabilité : gérer rappels internes et notifications distantes futures.

Données principales : consentement, canal, fréquence, fuseau, statut, priorité, historique d'envoi.

Actions utilisateur : activer, désactiver, régler fréquence, traiter un rappel.

Cas d'usage : `scheduleReminder`, `sendNotification`, `recordNotificationResult`.

Dépendances : Notification Engine, Deadline, Today, Auth.

États : interne, programmée, envoyée, échouée, désactivée.

Limites : pas de spam, pas de fausse urgence, aucune notification distante sans consentement valide.

Priorité : P1.

### Settings

Responsabilité : préférences, accessibilité, consentements, sécurité du compte et options futures.

Données principales : préférences utilisateur, canaux, langue, consentements, options d'affichage.

Actions utilisateur : modifier préférences, gérer notifications, préparer suppression de compte future.

Cas d'usage : `updateSettings`, `updateConsent`, `requestAccountDeletion`.

Dépendances : Auth, Notification, Audit.

États : chargé, sauvegarde, erreur, conflit éventuel.

Limites : ne pas cacher des décisions métier critiques dans des préférences visuelles.

Priorité : P1.

### Analytics

Responsabilité : tendances, projections, seuils, analyses progressives.

Données principales : revenus agrégés, périodes, seuils, tendances, projections.

Actions utilisateur : consulter tendances, masquer analyses avancées, comprendre une projection.

Cas d'usage : `loadAnalytics`, `calculateProjection`, `evaluateThresholdProximity`.

Dépendances : Revenue, Profile, Calculation Engine, Visibility Engine.

États : non disponible, partiel, fiable selon données, masqué.

Limites : affichage progressif ; aucune projection présentée comme certitude.

Priorité : P2.

### Assistant

Responsabilité : fournir explications, navigation contextuelle et aide à la compréhension.

Données principales : contexte utilisateur autorisé, écran courant, états de domaine, limites.

Actions utilisateur : poser une question, demander une explication, naviguer vers une action.

Cas d'usage : `explainCurrentSituation`, `suggestNavigation`, `summarizeEstimate`.

Dépendances : domaines métier en lecture, Visibility Engine, Audit si action sensible future.

États : disponible, limité, contexte insuffisant, désactivé.

Limites : aucune action silencieuse ; l'assistant ne remplace pas les cas d'usage métier.

Priorité : P2.

## 5. Routing Et Protection Des Parcours

Routes publiques : accueil, connexion, inscription, confirmation email, mot de passe oublié, nouveau mot de passe, mentions légales, confidentialité, aide publique.

Routes mode découverte : Aujourd'hui découverte, profil minimal, revenus locaux, ajout revenu local, estimation simple.

Routes privées : Aujourd'hui, revenus, ajout revenu, déclaration, ACRE, factures, échéances, documents, profil, paramètres.

Routes spéciales : email confirmation, recovery actif, erreur auth, 404, accès interdit, session expirée, migration locale en attente.

Règles :

- après connexion réussie, destination vers Aujourd'hui ou destination privée demandée si cohérente ;
- après confirmation email, destination vers Aujourd'hui ;
- après recovery réussi, destination vers Aujourd'hui ou connexion selon session ;
- onboarding terminé ne doit jamais être relancé automatiquement ;
- route privée sans session redirige vers connexion avec destination mémorisée ;
- mode découverte ne doit pas être interprété comme session privée ;
- aucune route ne doit mélanger confirmation email et recovery mot de passe.

## 6. Modèle D'État Global

L'application ne doit pas avoir un seul gros état global contenant tout le produit. Elle doit préférer des états par domaine avec orchestration explicite par cas d'usage.

État d'authentification : inconnu, visiteur, découverte, connecté non confirmé si applicable, connecté confirmé, recovery actif, session expirée.

État du profil : absent, minimal, suffisant, à confirmer, incohérent, historique impacté.

État des données : local uniquement, cloud, en synchronisation, migration proposée, conflit, sauvegarde échouée, hors ligne futur.

État réglementaire : inconnu, estimé, confirmé par l'utilisateur, confirmé par document, historique, obsolète, à revalider.

État des calculs : non disponible, partiel, estimé, fiable selon données disponibles, invalidé par incohérence, recalcul nécessaire.

## 7. Stratégie De Gestion D'État

Données persistantes utilisateur : profil, revenus, factures, statuts ACRE, déclarations, échéances confirmées, préférences, historique.

Données locales découverte : profil minimal, revenus, estimations, progression locale, statut de migration.

Données dérivées : total de période, réserve conseillée, prochaine action, niveau de fiabilité, prochaine échéance, visibilité des fonctions.

Données temporaires UI : formulaire en cours, modale ouverte, filtre actif, message temporaire, étape de parcours.

Règles :

- ne pas persister ce qui peut être recalculé de manière fiable ;
- ne pas recalculer silencieusement les données historiques confirmées ;
- conserver les brouillons en cas d'erreur ;
- ne pas mélanger données métier et états purement visuels ;
- éviter les duplications de source de vérité.

## 8. Modèles Métier Cibles

`UserAccount` : identité de compte, email, statut de confirmation, préférences, dates techniques importantes.

`BusinessProfile` : identité activité, type activité, catégories, activité mixte, SIREN, SIRET, date officielle d'ouverture, périodicité, TVA, ACRE, version du profil.

`Revenue` : identifiant, montant encaissé, date d'encaissement, catégorie, description, client facultatif, facture liée facultative, source, statut, dates de création et modification.

`Invoice` : identifiant, numéro, client, lignes, total, dates, statut, paiements, revenu lié éventuel, version.

`DeclarationPeriod` : type, période, date limite, fiabilité, revenus inclus, montants préparés, statut utilisateur, montant payé, date paiement.

`AcreStatus` : état, date officielle, date demande, date réponse, règle applicable, source, période, niveau de confirmation.

`Deadline` : type, date, priorité, statut, fiabilité, source, action associée.

`Estimation` : type, période, entrées utilisées, données manquantes, résultat, taux utilisés, règle utilisée, niveau de confiance, date de calcul.

`RegulatoryRule` : identifiant, domaine, période d'application, conditions, valeurs, source, date de vérification, version, statut actif ou historique.

`DocumentRecord` : type, origine, stockage, propriétaire, date, statut, métadonnées, suppression.

`AuditEvent` : action, auteur, date, ancienne valeur, nouvelle valeur, raison, source.

## 9. Rules Engine

Le Rules Engine est la source structurée des règles réglementaires et produit.

Responsabilités : taux, seuils, périodes d'application, catégories d'activité, ACRE, TVA, échéances, dates frontières, sources officielles, historique, version des règles.

Exigences :

- aucune règle importante uniquement codée dans un composant ;
- toute règle a une période d'application, une source et une date de vérification ;
- les règles historiques restent disponibles ;
- les calculs passés peuvent expliquer quelle règle a été utilisée ;
- les dates frontières sont testées ;
- une règle produit est distinguée d'une règle légale.

Concepts à prévoir : rule selector, rule resolver, rule versioning, source metadata, test fixtures réglementaires.

## 10. Calculation Engine

Le Calculation Engine est le moteur unique de calcul.

Responsabilités : cotisations estimées, réserve conseillée, argent restant indicatif, regroupement par catégorie, activité mixte, ACRE, périodes, arrondis, données manquantes, niveau de fiabilité.

Entrées : profil, revenus, période, règles applicables, statut ACRE, statut TVA si pertinent, historique.

Sorties : estimation, détail du calcul, taux utilisés, règles utilisées, données manquantes, avertissements, niveau de confiance.

Règles :

- aucun `amount * 0.22` dans les composants ;
- aucun taux placeholder en production ;
- aucun calcul sans type d'activité suffisant ;
- ACRE appliquée uniquement si le statut permet de le faire ;
- les estimations restent explicitement indicatives ;
- les résultats doivent être reproductibles ;
- toute modification du profil peut déclencher une prévisualisation d'impact.

## 11. Today Decision Engine

Le Today Decision Engine sélectionne l'action principale de Aujourd'hui.

Entrées : profil, revenus, échéances, ACRE, déclarations, incohérences, données manquantes, historique, maturité.

Sorties : situation actuelle, action principale, actions secondaires, niveau de priorité, justification, échéance associée, message utilisateur, destination.

Ordre de priorité validé :

1. erreur bloquante ou incohérence critique ;
2. échéance urgente connue ;
3. action réglementaire avec délai réel ;
4. donnée indispensable à un calcul demandé ;
5. premier revenu ;
6. action utile non urgente ;
7. rien à faire.

Règles : une seule action principale ; aucune alerte rouge pour une information non urgente ; rien à faire est valide ; le moteur décide et l'interface affiche ; les décisions sont testables sans navigateur.

## 12. Visibility Engine

Le Visibility Engine décide quelles fonctions et informations sont visibles.

Entrées : mode découverte ou compte, maturité utilisateur, nombre de revenus, historique, proximité de seuil, fonctions utilisées, préférences, droits éventuels, niveau gratuit ou premium futur.

Sorties : navigation visible, sections visibles, détail simple ou avancé, CTA contextuels, recommandations, limites.

Règles : progressive disclosure ; pas de bascule brutale ; les calculs de base ne changent pas selon l'affichage ; l'utilisateur peut masquer les analyses avancées ; les fonctions non disponibles ne sont pas simulées ; Documents et fonctions avancées restent P1 ou P2 selon validation.

## 13. Deadline Engine

Responsabilités : calculer ou recevoir les échéances, distinguer confirmé, estimé et inconnu, associer une source, une priorité et une action utile.

Entrées : date officielle d'ouverture, périodicité, historique déclaratif, ACRE, TVA, règles applicables, confirmations utilisateur.

Sorties : échéance, niveau de confiance, source, statut, rappel possible, action.

Règle centrale : une date inconnue doit rester inconnue. Microassist ne doit pas inventer de date réglementaire pour donner une fausse impression de précision.

## 14. Migration Du Mode Découverte

Le Sync and Migration Service transfère les données locales vers un compte.

Étapes :

1. détecter des données locales ;
2. proposer la migration ;
3. afficher les données concernées ;
4. vérifier les données cloud existantes ;
5. choisir fusion ou remplacement selon politique ;
6. transférer ;
7. vérifier le succès ;
8. conserver la copie locale jusqu'à confirmation ;
9. journaliser le résultat ;
10. permettre une reprise en cas d'échec.

États : aucune donnée, migration proposée, analyse, conflit, en cours, réussie, partielle, échouée, annulée.

Contraintes : aucune suppression silencieuse, aucun doublon non signalé, revenus comparés avec stratégie de détection, migration idempotente autant que possible, utilisateur informé avant chaque remplacement. La politique exacte de fusion reste ouverte, mais les exigences de sécurité sont validées.

## 15. Historique Et Audit

À historiser : modification de catégorie, date officielle, périodicité, ACRE, TVA, déclaration confirmée, estimation utilisée, règle réglementaire, migration locale, suppression importante.

Règles :

- les déclarations historiques confirmées ne sont pas réécrites silencieusement ;
- toute estimation importante conserve ses entrées et la règle utilisée ;
- les anciennes règles restent consultables ;
- les changements sensibles doivent pouvoir être expliqués ;
- l'historique n'est pas forcément visible intégralement, mais doit exister pour la fiabilité.

## 16. Document Engine

Documents générés par Microassist : récapitulatif, brouillon de déclaration, facture PDF, export, attestation interne, synthèse.

Documents ajoutés par l'utilisateur : justificatif de création, attestation d'immatriculation, document ACRE, attestation Urssaf.

Responsabilités : génération, métadonnées, téléchargement, stockage, suppression, droits, durée de conservation, traçabilité.

Documents est P1. L'upload dépend de la validation d'un stockage sécurisé. Le mode découverte ne propose pas de stockage cloud. La génération PDF et Factur-X ne doivent être promises que si réellement implémentées.

## 17. Notification Engine

Rappels internes : cartes Aujourd'hui, échéances, éléments à confirmer, actions non terminées.

Notifications distantes futures : email, push, autres canaux éventuels.

Données nécessaires : consentement, canal, fréquence, fuseau, statut, priorité, historique d'envoi.

Règles : pas de spam, pas de fausse urgence, possibilité de désactiver, distinction rappel et alerte réglementaire, aucune notification distante sans consentement valide. Les canaux et la fréquence exacte restent ouverts.

## 18. Authentification Et Sécurité

À couvrir : session, confirmation email, recovery, expiration, routes protégées, séparation des données utilisateur, contrôle d'accès, suppression de compte future, journalisation des actions sensibles.

Exigences :

- confirmation email et recovery séparés ;
- aucun accès aux données d'un autre utilisateur ;
- données locales non confondues avec données cloud ;
- validation côté serveur pour les écritures sensibles ;
- règles d'accès Supabase à revoir avant production ;
- secrets jamais exposés dans le client ;
- stockage de documents protégé ;
- erreurs d'authentification sans fuite d'information excessive.

## 19. Stratégie Supabase

Supabase peut fournir Auth, base de données, Row Level Security, stockage, fonctions serveur éventuelles, événements et logs.

Règles :

- le client ne doit pas être l'unique autorité métier ;
- RLS obligatoire pour les données privées ;
- migrations versionnées ;
- environnements séparés ;
- données de test distinctes ;
- aucune table créée avant validation du modèle ;
- ne pas adapter le domaine aux limites d'une ancienne table si elle ne correspond plus au produit cible.

Le schéma définitif sera traité dans un futur Technical Data Blueprint ou plan de migration, pas dans ce document.

## 20. Architecture Des Composants

Pages : orchestrent route, chargement, état global de page et composition.

Feature Components : `TodayAction`, `RevenueForm`, `DeclarationPreparation`, `AcreStatus`, `InvoiceEditor`, `DeadlineList`. Ils consomment les cas d'usage du domaine.

Shared Components : `StatusBadge`, `ConfidenceLabel`, `SourceLink`, `EmptyState`, `ErrorState`, `ConfirmationDialog`, `MoneySummary`.

UI Primitives : `Button`, `Input`, `Select`, `Modal`, `Card`, `Tabs`, `Skeleton`.

Règles : pas de logique fiscale dans les UI Primitives ; composants accessibles ; pas de duplication massive ; composants métiers nommés selon leur responsabilité ; ne pas créer un composant géant `App` contenant tout le produit.

## 21. Cas D'Usage Et Services D'Application

`startDiscoveryMode` : entrée vide ou intention utilisateur ; valide la disponibilité du stockage local ; domaine Discovery ; résultat profil local initial ; erreurs stockage ; effet de bord local ; audit non requis sauf migration.

`createAccount` : email et mot de passe ; valide format et consentements ; domaine Auth ; résultat compte ou confirmation email ; erreurs auth ; effet de bord session éventuelle ; audit compte.

`migrateDiscoveryData` : données locales et utilisateur connecté ; valide conflits ; domaines Discovery et Sync ; résultat transfert ; erreurs conflit ou réseau ; effet de bord cloud ; audit migration.

`signIn` : identifiants ; valide session ; domaine Auth ; résultat session ; erreurs auth ; effet de bord destination mémorisée.

`confirmEmail` : token ou événement auth ; valide type de flux ; domaine Auth ; résultat compte confirmé ; erreurs lien expiré ; audit auth.

`recoverPassword` : email ou nouveau mot de passe ; valide flux recovery ; domaine Auth ; résultat mot de passe réinitialisé ; erreurs token ; audit auth.

`loadToday` : utilisateur ou découverte ; valide données accessibles ; domaine Today ; résultat décision principale ; erreurs données absentes ; aucun effet de bord sauf logs.

`updateBusinessProfile` : changement profil ; valide impact ; domaine Profile ; résultat profil versionné ; erreurs incohérence ; audit sensible.

`previewFiscalProfileChange` : changement envisagé ; valide historique ; domaines Profile et Calculation ; résultat prévisualisation ; pas d'effet de bord persistant.

`addRevenue`, `updateRevenue`, `deleteRevenue` : données revenu ; valide montant, date, catégorie ; domaine Revenue ; résultat revenu ; erreurs validation ; audit si modification ou suppression.

`prepareDeclaration` : période ; valide revenus et profil ; domaine Declaration ; résultat préparation indicative ; erreurs règle absente ; audit si estimation utilisée.

`confirmDeclarationStatus` : période et statut ; valide cohérence ; domaine Declaration ; résultat confirmation utilisateur ; audit obligatoire.

`updateAcreStatus` : statut et dates ; valide délai et source ; domaine ACRE ; résultat statut ; erreurs incohérence ; audit obligatoire.

`calculateEstimate` : profil, revenus, période ; valide règles ; domaine Calculation ; résultat estimation ; erreurs règle absente ou profil insuffisant ; historique si estimation confirmée.

`listDeadlines` : profil et règles ; valide sources ; domaine Deadline ; résultat échéances ; erreurs dates inconnues ; pas de date inventée.

`createInvoice`, `markInvoicePaid`, `createRevenueFromInvoicePayment` : données facture et paiement ; valide statut ; domaine Invoice ; résultat facture ou proposition de revenu ; audit P1.

`uploadDocument`, `generateDocument` : fichier ou demande de génération ; valide stockage et droits ; domaine Document ; résultat document ; erreurs sécurité ou stockage ; audit selon type.

`scheduleReminder` : échéance, canal, consentement ; valide fréquence ; domaine Notification ; résultat rappel ; erreurs consentement ; historique notification.

## 22. Gestion Des Erreurs

Catégories : validation utilisateur, authentification, réseau, stockage local, base de données, migration, calcul impossible, règle absente, incohérence historique, document, service externe.

Règles : message utilisateur simple ; détail technique journalisé séparément ; aucune perte silencieuse de formulaire ; possibilité de réessayer ; éviter les erreurs génériques si une action claire existe ; ne pas afficher une estimation si le calcul est invalide ; fallback sûr lorsqu'une règle n'est pas disponible.

## 23. Observabilité Et Journalisation

À suivre : erreurs critiques, échec de sauvegarde, échec de migration, calcul sans règle, incohérences, auth, temps de chargement, échec de génération de document, échec de notification.

Séparer logs techniques, audit métier, analytics produit et données personnelles.

Règles : minimisation des données, pas de secret dans les logs, identifiants pseudonymisés si possible, respect RGPD, outils à choisir plus tard.

## 24. Accessibilité Et Internationalisation

Accessibilité : structure sémantique, clavier, focus, contraste, labels, erreurs associées, annonces dynamiques, taille des cibles, aucun sens uniquement par couleur.

Internationalisation : textes séparés de la logique, formats de dates, formats monétaires, pluriels, vocabulaire réglementaire français, possibilité future d'autres langues. Les règles réglementaires restent françaises même si l'interface est traduite.

## 25. Stratégie De Test

Tests unitaires : Calculation Engine, Rules Engine, Today Decision Engine, Deadline Engine, validations, visibilité.

Tests d'intégration : profil + revenus + estimation, ACRE + calcul, facture payée + revenu, migration locale, auth, préparation déclaration.

Tests de parcours : première visite, découverte, création de compte, confirmation email, premier revenu, première déclaration, modification fiscale, erreur réseau, déconnexion.

Tests réglementaires : dates frontières, règles historiques, ACRE, activité mixte, changement de taux, période mensuelle et trimestrielle.

Tests accessibilité : clavier, lecteur d'écran, contraste, labels, messages d'erreur.

Règle : aucune règle fiscale critique ne doit dépendre uniquement d'un test manuel dans l'interface.

## 26. Stratégie De Migration De L'Existant

Phase 0 - Stabilisation : inventaire, sauvegarde, tests de non-régression, suppression des placeholders fiscaux critiques, identification des fonctions dupliquées, clarification auth.

Phase 1 - Fondations : routing, séparation public / découverte / privé, modèles de domaine, services, gestion d'état, règles communes.

Phase 2 - Moteurs métier : Rules Engine, Calculation Engine, Today Decision Engine, Deadline Engine.

Phase 3 - P0 UX : Aujourd'hui, profil progressif, revenus, estimation, préparation déclaration, erreurs, mobile.

Phase 4 - Migration découverte : transfert local, conflits, reprise, audit.

Phase 5 - P1 : factures, ACRE complet, documents, rappels, historique.

Phase 6 - P2 : analytics, assistant, premium, partage conseiller, projections.

Règles de migration : ne pas tout réécrire en une seule fois ; conserver des points de retour ; migrer par domaines ; ne pas supprimer l'existant avant validation fonctionnelle ; chaque phase doit avoir ses critères de sortie.

## 27. Dépendances Entre Modules

- Today dépend de Profile, Revenue, Deadline, ACRE et Declaration.
- Calculation dépend de Profile, Revenue et Rules.
- Deadline dépend de Profile, Rules, ACRE et Declaration.
- Declaration dépend de Revenue, Profile, Calculation et Deadline.
- Invoice peut créer une proposition de Revenue, mais ne crée jamais automatiquement un encaissement.
- Visibility dépend des états de domaine, mais ne modifie pas les calculs.
- Assistant consomme les domaines, mais ne remplace pas leurs cas d'usage.
- Document dépend des résultats de Declaration ou Invoice selon le type.
- Audit reçoit des événements de domaines, mais ne doit pas piloter leurs décisions.

Risques : dépendances circulaires entre Today, Deadline, Declaration et Calculation ; couplage trop fort entre Invoice et Revenue ; logique de visibilité qui modifie les données. Recommandation : orchestrer par cas d'usage applicatifs et limiter les imports directs entre domaines.

## 28. Priorités Techniques

P0 technique : auth cohérente, routing, séparation découverte / connecté, modèles Profile et Revenue, Rules Engine, Calculation Engine, Today Decision Engine, profil progressif, revenus, déclaration préparée, stockage fiable, erreurs, tests.

P1 technique : Invoice, ACRE complet, Deadline avancé, Documents, notifications, audit enrichi, migration locale robuste.

P2 technique : analytics, assistant, premium, partage, projections, fonctions collaboratives.

Cette priorité technique doit être comparée à l'état réel décrit dans `ARCHITECTURE_AUDIT.md` avant planification.

## 29. Décisions Validées

- Aujourd'hui est la page principale.
- Onboarding progressif.
- Une action principale.
- Mode découverte limité au coeur de valeur.
- Migration locale proposée à la création du compte.
- Séparation facture / encaissement.
- Facturation complète en P1.
- Documents en P1.
- Confirmation de déclaration par l'utilisateur.
- Activité mixte au niveau de chaque revenu.
- Historique réglementaire.
- Prévisualisation avant modification fiscale rétroactive.
- Assistant en P2.
- Progressive disclosure.
- Aucun taux fiscal dans les composants.
- Moteur unique de calcul.
- Moteur de règles versionné.
- Logique Aujourd'hui séparée de l'interface.

## 30. Décisions Encore Ouvertes

- Bibliothèque exacte de gestion d'état : ouverte pour respecter l'architecture existante ; à trancher en Phase 1 ; document attendu : `IMPLEMENTATION_ROADMAP_V3.md`.
- Structure précise des dossiers : ouverte jusqu'à audit de l'existant ; à trancher en Phase 1 ; document attendu : roadmap technique.
- Politique de fusion des données locales : ouverte car dépend des modèles réels ; à trancher avant Phase 4 ; document attendu : migration blueprint.
- Schéma Supabase définitif : ouvert pour éviter d'adapter le domaine à d'anciennes tables ; à trancher après modèles ; document attendu : Technical Data Blueprint.
- Stockage de documents : ouvert pour sécurité et RGPD ; à trancher avant P1 Documents ; document attendu : storage decision record.
- Service PDF : ouvert car génération PDF et Factur-X ne doivent pas être promises sans validation ; à trancher avant Invoice/Documents P1.
- Service email : ouvert selon canaux et consentements ; à trancher avant notifications distantes.
- Canaux de notification : ouverts ; à trancher avant Notification Engine distant.
- Fréquence des rappels : ouverte pour éviter spam ; à trancher avec tests UX.
- Granularité des règles : ouverte pour équilibrer maintenabilité et précision ; à trancher avant Rules Engine.
- Niveau exact des détails d'estimation : ouvert pour rester simple ; à trancher avec UX tests.
- Modèle gratuit / premium : ouvert ; à trancher avant fonctions P2.
- Analytics et monitoring : ouverts ; à trancher avant instrumentation production.
- Stratégie offline éventuelle : ouverte ; à trancher après stabilisation P0.
- Outils d'internationalisation : ouverts ; à trancher avant extraction massive des textes.
- Critères chiffrés d'activation des analyses avancées : ouverts ; à trancher avant Analytics P2.

## 31. Critères De Validation Du Blueprint

Le document peut être considéré comme validé si :

- il respecte Product Vision et UX Blueprint ;
- les domaines sont clairement séparés ;
- les règles fiscales ne sont pas dans l'UI ;
- les calculs passent par un moteur unique ;
- Aujourd'hui repose sur un moteur de décision testable ;
- les données locales et cloud sont distinctes ;
- la migration est sécurisée ;
- les modèles métier sont identifiés ;
- les dépendances sont explicites ;
- les états réglementaires sont traçables ;
- les règles sont versionnées ;
- les tests sont prévus ;
- la migration de l'existant est progressive ;
- P0, P1 et P2 sont cohérents ;
- les décisions ouvertes sont clairement isolées.

## 32. Prochaine Étape Après Validation

La prochaine étape ne doit pas être une refonte complète immédiate.

Après validation de `PRODUCT_BLUEPRINT_V3.md`, il faudra créer un plan d'implémentation progressif :

`docs/IMPLEMENTATION_ROADMAP_V3.md`

Ce futur document devra comparer l'existant avec la cible, définir les lots, définir l'ordre des fichiers et modules, définir les tests de sortie, limiter les risques et empêcher une réécriture incontrôlée.

## Contradictions Détectées Entre L'Existant Disponible Et La Cible

- Les cinq documents de référence obligatoires ne sont pas présents dans le workspace local sous `docs/`.
- Le dossier `docs/` n'existait pas dans le workspace avant la création de ce fichier.
- La branche active observée est `main`, alors que les briefs précédents mentionnent `refactor/saas-shell-v2`.
- Le fichier applicatif principal observé est un `src/App.jsx` très volumineux, ce qui contredit la cible de séparation par pages, domaines et feature components.
- Les capacités Microassist V2 décrites ici ne doivent pas être considérées comme implémentées : moteurs métier, Documents, Invoice P1, notifications distantes, assistant et analytics restent des cibles.
- En l'absence de `ARCHITECTURE_AUDIT.md` local, les contradictions techniques détaillées doivent être revérifiées dès que ce document sera restauré.
