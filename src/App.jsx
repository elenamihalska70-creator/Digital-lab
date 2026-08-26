import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { RequestConversation } from "./components/RequestConversation";
import { RequestDocuments } from "./components/RequestDocuments";
import { RequestQuotes } from "./components/RequestQuotes";
import { DesignSystemPage } from "./components/DesignSystemPage";
import { useAuth } from "./context/useAuth";
import { getUnreadMessageCounts } from "./services/requestMessages";
import { getLatestQuotesForRequests } from "./services/quotes";
import {
  createContactRequest,
  getAllContactRequests,
  getContactRequestsForUser,
  updateContactRequestStatus,
} from "./services/contactRequests";
import { supabase } from "./services/auth";
import { getProfileForUser } from "./services/profiles";
import { trackEvent, trackPageView } from "./utils/analytics";
import { getEstimatorResult } from "./utils/estimator";

const auditLandingPath = "/audit-site-web";
const legalNoticePath = "/mentions-legales";
const privatePaths = ["/login", "/dashboard", "/espace-client", "/admin", "/design-system"];
const configuredAuditUrl = import.meta.env.VITE_DIGITAL_LAB_AUDIT_URL?.trim() ?? "";
const auditAppUrl = configuredAuditUrl;
const auditLaunchHref = auditAppUrl || auditLandingPath;
const isAuditAppUrlConfigured = Boolean(configuredAuditUrl);

const services = [
  {
    icon: "site",
    title: "Création de sites web",
    summary: "Créer une présence qui inspire confiance.",
    problem: "Votre activité manque d’un point d’entrée fiable pour inspirer confiance et recevoir des demandes.",
    canDo: "Je structure vos pages, clarifie votre message et crée un parcours fluide jusqu’au contact.",
    expectedResult: "Un site prêt à partager, lisible sur tous les écrans et aligné avec vos objectifs commerciaux.",
    details: [
      "Site vitrine",
      "Landing page",
      "WordPress",
      "Formulaire",
      "Responsive",
      "Mise en ligne",
    ],
    examples:
      "Sites vitrines, landing pages, sites associatifs, sites événementiels, WordPress, sites custom HTML/CSS/JS/PHP, intégration de maquettes, responsive, formulaires, pages professionnelles, etc.",
    images: [
      "/projects/site-wordpress-ohmyfood-home.png",
      "/projects/maket-wordpress-ohmyfood-figma.png",
      "/projects/La_ferm_des_amanders.png",
    ],
    gallery: {
      type: "carousel",
      images: [
        "/projects/site-wordpress-ohmyfood-home.png",
        "/projects/maket-wordpress-ohmyfood-figma.png",
        "/projects/La_ferm_des_amanders.png",
      ],
    },
    transformation: {
      before: ["aucune présence claire en ligne", "informations dispersées", "site non responsive"],
      after: ["site moderne et clair", "navigation fluide", "version mobile optimisée"],
      result:
        "Le client peut présenter son activité de façon plus professionnelle et centraliser ses demandes.",
    },
    learnMoreHref: "/services/creation-site-web",
  },
  {
    icon: "repair",
    title: "Réparation & restauration de site",
    summary: "Retrouver un site fiable et agréable à utiliser.",
    problem:
      "Votre site est lent, instable, mal affiché ou difficile à gérer au quotidien.",
    canDo: "J’identifie les points bloquants, corrige les parcours et remets les bases techniques au propre.",
    expectedResult: "Un site plus stable, plus fluide et plus rassurant pour vos visiteurs.",
    details: [
      "Bugs",
      "Mobile",
      "Formulaires",
      "Vitesse",
      "Sauvegardes",
      "Sécurité",
    ],
    examples:
      "WordPress, sites custom, OVH, FTP, bases de données, menus, formulaires, plugins, responsive mobile, optimisation vitesse, sauvegardes, sécurité de base, etc.",
    images: [
      "/projects/reparation_dialogagency.png",
      "/projects/FileZila.jpeg",
      "/projects/php_my_admin.jpeg",
      "/projects/srtructure_du_menu.png",
    ],
    gallery: {
      type: "carousel",
      images: [
        "/projects/reparation_dialogagency.png",
        "/projects/FileZila.jpeg",
        "/projects/php_my_admin.jpeg",
        "/projects/srtructure_du_menu.png",
      ],
    },
    transformation: {
      before: ["site lent ou cassé", "menus confus", "problèmes mobiles"],
      after: ["structure nettoyée", "meilleure vitesse", "affichage plus stable"],
      result:
        "Votre site peut être remis en état, sécurisé et modernisé sans repartir de zéro. Les visiteurs trouvent plus facilement les informations et l’image du projet devient plus professionnelle.",
    },
  },
  {
    icon: "seo",
    title: "SEO & visibilité",
    summary: "Aider les bonnes personnes à vous trouver.",
    problem: "Votre site existe, mais il ne capte pas assez de trafic qualifié.",
    canDo: "Je clarifie la structure, les pages clés et les contenus pour mieux présenter votre offre.",
    expectedResult: "Un site plus lisible pour vos visiteurs et mieux préparé pour Google.",
    details: [
      "Balises SEO",
      "Structure Hn",
      "Textes",
      "Images ALT",
      "Maillage",
      "Performance",
    ],
    examples:
      "Audit SEO, optimisation technique, structure Hn, textes optimisés, balises meta, images ALT, Lighthouse, Google Business Profile, suivi KPI, etc.",
    images: [
      "/projects/SEO.png",
      "/projects/SEO_performance.png",
      "/projects/perfprmance.png",
      "/projects/looker_studio.jpg",
    ],
    gallery: {
      type: "carousel",
      images: [
        "/projects/SEO.png",
        "/projects/SEO_performance.png",
        "/projects/perfprmance.png",
        "/projects/looker_studio.jpg",
      ],
    },
    transformation: {
      before: ["site peu visible", "contenu mal structuré", "faible compréhension Google"],
      after: ["structure SEO optimisée", "meilleures performances", "contenu plus lisible"],
      result: "Le site devient plus crédible et plus facile à trouver.",
    },
  },
  {
    icon: "connect",
    title: "Automatisation & outils connectés",
    summary: "Libérer du temps pour l’essentiel.",
    problem: "Votre suivi repose sur trop de copier-coller, de messages manuels ou de fichiers dispersés.",
    canDo: "Je connecte les étapes importantes pour centraliser les demandes et fiabiliser le suivi.",
    expectedResult: "Moins de temps perdu, moins d’oublis et une organisation plus durable.",
    details: [
      "Formulaires",
      "Notifications",
      "CRM léger",
      "Google Sheets",
      "Tableaux de bord",
      "Suivi client",
    ],
    examples:
      "Simulateurs, calculateurs, formulaires intelligents, emails automatiques, Google Sheets, CRM adapté, tableaux de bord, notifications, suivi client, etc.",
    images: [
      "/projects/simulator_artfinanc.png",
      "/projects/simulator_artforgood_contact.png",
      "/projects/contactform.png",
      "/projects/automatisation.png",
    ],
    gallery: {
      type: "carousel",
      images: [
        "/projects/simulator_artfinanc.png",
        "/projects/simulator_artforgood_contact.png",
        "/projects/contactform.png",
        "/projects/automatisation.png",
      ],
    },
    transformation: {
      before: ["tâches répétitives", "copier-coller manuel", "suivi dispersé"],
      after: ["automatisations adaptées", "notifications et suivi", "centralisation des demandes"],
      result: "Gain de temps et meilleure organisation quotidienne.",
    },
    learnMoreHref: "/services/automatisation-pme",
  },
  {
    icon: "feature",
    title: "Chatbots & assistants IA",
    summary: "Guider vos visiteurs avant même le premier échange.",
    problem: "Vous recevez des questions répétitives et certaines demandes se perdent faute de réponse rapide.",
    canDo: "Je conçois un assistant utile, sobre et centré sur les besoins réels de vos clients.",
    expectedResult: "Des visiteurs mieux guidés et des demandes plus faciles à traiter.",
    details: [
      "FAQ",
      "Préqualification",
      "Réservation",
      "Collecte",
      "Scénarios",
      "Intégration",
    ],
    examples:
      "Assistant de réservation, chatbot de contact, FAQ automatisée, préqualification client, collecte de demandes, scénarios conversationnels, intégration site, etc.",
    images: [
      "/projects/chat-bot.png",
      "/projects/chat-bot_4.png",
      "/projects/assistent_ai.png",
      "/projects/QRcod.png",
    ],
    gallery: {
      type: "carousel",
      images: [
        "/projects/chat-bot.png",
        "/projects/chat-bot_4.png",
        "/projects/assistent_ai.png",
        "/projects/QRcod.png",
      ],
    },
    transformation: {
      before: ["trop de messages répétitifs", "réponses tardives", "demandes perdues"],
      after: ["réponses automatiques", "collecte simplifiée", "disponibilité 24h/24"],
      result: "Le client reçoit plus facilement les premières demandes.",
    },
    learnMoreHref: "/services/chatbot-ia",
  },
  {
    icon: "mvp",
    title: "MVP & prototypes web",
    summary: "Tester rapidement avant d’investir davantage.",
    problem: "Vous avez une idée, mais vous devez la rendre concrète avant d’investir davantage.",
    canDo: "Je construis une version ciblée pour montrer, tester et ajuster rapidement le concept.",
    expectedResult: "Un prototype concret pour décider des prochaines étapes avec plus de confiance.",
    details: [
      "Prototype",
      "Tableau de bord",
      "Espace client",
      "Parcours",
      "Démo",
      "Itérations",
    ],
    examples:
      "Prototype SaaS, plateforme locale, tableau de bord B2B, espace utilisateur, application web testable, parcours utilisateur, version démo, etc.",
    images: [
      "/projects/microassist.png",
      "/projects/microassist-expert.png",
      "/projects/socle-local.png",
      "/projects/microassist-expert.vercel.app.png",
    ],
    gallery: {
      type: "carousel",
      images: [
        "/projects/microassist.png",
        "/projects/microassist-expert.png",
        "/projects/socle-local.png",
        "/projects/microassist-expert.vercel.app.png",
      ],
    },
    transformation: {
      before: ["idée floue", "difficulté à expliquer le concept", "développement trop risqué"],
      after: ["prototype testable", "démonstration rapide", "première version concrète"],
      result: "Possibilité de tester une idée avant un investissement plus important.",
    },
  },
];

const navLinks = [
  { label: "Audit gratuit", href: auditLaunchHref, emphasized: true },
  { label: "Services", href: "/#services" },
  { label: "Projets", href: "/#projets" },
  { label: "Méthode", href: "/#method" },
  { label: "À propos", href: "/#about" },
  { label: "Blog", href: "/#blog" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/#contact" },
];

// English labels for the /en/ page only (LOT DL 2.5.1) — same order/hrefs as
// navLinks, deliberately kept as a separate array so translating a label
// never implies a translated destination: every href above still points at
// the existing French sections/pages (no /en/services/... routes exist).
const englishNavLabels = ["Free audit", "Services", "Projects", "Method", "About", "Blog", "FAQ", "Contact"];

const missionSteps = [
  {
    number: "01",
    icon: "↗",
    title: "Échange clair",
    text: "Tout part de votre réalité métier, pas d’un cahier des charges figé.",
  },
  {
    number: "02",
    icon: "◎",
    title: "Direction utile",
    text: "La solution est cadrée autour de vos priorités, de votre budget et de vos clients.",
  },
  {
    number: "03",
    icon: "▣",
    title: "Première version",
    text: "Vous validez rapidement un support concret avant d’aller plus loin.",
  },
  {
    number: "04",
    icon: "✓",
    title: "Mise en ligne",
    text: "Les derniers ajustements sécurisent une livraison fiable et utilisable.",
  },
  {
    number: "05",
    icon: "+",
    title: "Évolution",
    text: "Le projet reste pensé pour accompagner votre activité dans le temps.",
  },
];

const methodBadges = [
  "Sans jargon",
  "Budget maîtrisé",
  "Décisions lisibles",
  "Évolution progressive",
  "Suivi dans la durée",
];

const improvementCards = [
  {
    icon: "↗",
    title: "Recevoir des demandes plus qualifiées",
    text: "Un parcours mieux pensé aide les visiteurs à comprendre votre offre et à passer à l’action.",
  },
  {
    icon: "⌁",
    title: "Consacrer moins de temps aux tâches répétitives",
    text: "Les étapes manuelles sont allégées pour garder votre énergie sur les décisions importantes.",
  },
  {
    icon: "✦",
    title: "Inspirer confiance dès les premières secondes",
    text: "Votre présence digitale transmet une impression fiable, cohérente et professionnelle.",
  },
  {
    icon: "▣",
    title: "Mieux suivre vos demandes",
    text: "Les informations importantes sont regroupées pour éviter les oublis et les échanges dispersés.",
  },
  {
    icon: "◎",
    title: "Être plus facile à trouver",
    text: "Une structure lisible renforce votre visibilité et aide Google à comprendre votre activité.",
  },
  {
    icon: "+",
    title: "Construire une base durable",
    text: "Le projet peut démarrer simplement puis évoluer avec vos besoins réels.",
  },
];

const includedProjectItems = [
  {
    icon: "◎",
    title: "SEO de base",
    text: "Balises essentielles et structure lisible.",
  },
  {
    icon: "▱",
    title: "Responsive",
    text: "Une expérience fluide sur tous les écrans.",
  },
  {
    icon: "↯",
    title: "Performance",
    text: "Chargement rapide et navigation confortable.",
  },
  {
    icon: "◈",
    title: "Sécurité",
    text: "Bases configurées avec soin.",
  },
  {
    icon: "+",
    title: "Évolutif",
    text: "Une fondation prête à grandir.",
  },
  {
    icon: "✓",
    title: "Accompagnement",
    text: "Des réponses après la livraison.",
  },
];

const trustCards = [
  {
    icon: "✓",
    title: "Un langage métier avant la technique",
    text: "Les choix sont expliqués selon leur impact concret sur votre activité.",
  },
  {
    icon: "↯",
    title: "Des décisions plus rapides",
    text: "Une première version permet de valider la direction sans perdre des semaines.",
  },
  {
    icon: "▦",
    title: "Une vision d’ensemble",
    text: "Site, outil, automatisation ou assistant : chaque élément sert un objectif précis.",
  },
  {
    icon: "◈",
    title: "Une relation de confiance",
    text: "Un accompagnement construit avec méthode, écoute et continuité.",
  },
];

const trustBadges = [
  "WordPress",
  "Front-end",
  "UX/UI",
  "SEO",
  "Automatisation",
  "MVP",
  "Responsive",
  "Tableau de bord",
  "IA conversationnelle",
];

const proofStats = [
  {
    icon: "+",
    value: null,
    label: "Projet sur mesure",
    text: "Une solution pensée selon votre activité, vos objectifs et votre budget.",
  },
  { icon: "▦", value: null, label: "Création web & automatisation" },
  { icon: "◎", value: null, label: "UX/UI, SEO & tableaux de bord" },
  { icon: "✓", value: null, label: "Approche claire, orientée résultat" },
];

const proofStack = [
  "WordPress",
  "React",
  "Vite",
  "HTML/CSS",
  "JavaScript",
  "PHP",
  "Supabase",
  "Looker Studio",
  "Figma",
  "Canva",
  "Mailchimp",
  "SEO",
  "Notion",
];

const proofWorkflow = [
  { icon: "✦", title: "Idée", text: "Clarifier le besoin et les priorités." },
  { icon: "▣", title: "Prototype", text: "Créer une première version visible." },
  { icon: "↻", title: "Ajustements", text: "Affiner les pages, contenus et détails." },
  { icon: "↗", title: "Mise en ligne", text: "Publier une version propre et utilisable." },
  { icon: "+", title: "Évolution", text: "Ajouter SEO, automatisation ou nouvelles pages." },
];

const articles = [
  {
    title: "Comment savoir si votre site a besoin d’une refonte ?",
    description: "Les signes qui montrent qu’un site devient difficile à utiliser, lent ou peu efficace.",
    tags: ["SEO", "UX", "Site web"],
    link: "#contact",
  },
  {
    title: "3 signes que votre site fait perdre des clients",
    description: "Navigation confuse, lenteur, manque de clarté : des détails qui peuvent bloquer les demandes.",
    tags: ["Conversion", "Performance", "UX"],
    link: "#contact",
  },
  {
    title: "Automatiser sans compliquer son activité",
    description: "Des automatisations simples pour gagner du temps sans transformer toute votre organisation.",
    tags: ["Automatisation", "PME", "Flux de travail"],
    link: "#contact",
  },
  {
    title: "Faut-il créer un MVP avant un vrai projet ?",
    description: "Pourquoi commencer petit peut aider à tester une idée avant d’investir davantage.",
    tags: ["MVP", "Prototype", "Stratégie"],
    link: "#contact",
  },
];

const footerExpertise = ["IA", "Automatisation", "WordPress", "SEO", "UX/UI", "Développement Web"];

const businessContact = {
  name: "Olena Mykhalska",
  role: "Cheffe de projet digital • IA • Automatisation",
  brand: "Digital Lab",
  positioning: "Solutions digitales pour PME",
  expertise: "WordPress • IA • SEO • Automatisation",
  founderLabel: "Fondatrice",
  email: "contact@digitallab.studio",
  phoneDisplay: "+33 7 66 78 43 31",
  phoneHref: "tel:+33766784331",
  telephone: "+33766784331",
  siteDisplay: "www.digitallab.studio",
  url: "https://www.digitallab.studio",
  linkedin: "https://www.linkedin.com/in/olena-mykhalska/",
  github: "https://github.com/ElenaMihalska70-Creator",
  instagram: "https://www.instagram.com/digital.lab.fr/",
  facebook: "https://www.facebook.com/profile.php?id=61570761385765",
};

const siteUrl = "https://www.digitallab.studio";
const auditVideoSrc = "/videos/Digitallab_audit.mp4";
const auditVideoPoster = "/logo-digital-lab.png";

const auditBenefits = [
  "Un score clair",
  "3 risques prioritaires",
  "Un plan d’action concret",
];

const auditSignals = [
  "Visibilité et SEO",
  "Confiance et preuves",
  "Sécurité et Cyber Trust",
  "RGPD et mentions clés",
  "Performance perçue",
  "Conversion et CTA",
];

const auditDeliverables = [
  "Un Digital Score synthétique pour comprendre l’état général du site",
  "Les principaux risques qui peuvent freiner la confiance ou les demandes",
  "Des actions priorisées, expliquées dans un langage métier",
  "Une passerelle vers l’accompagnement Digital Lab si une correction est utile",
];

const auditEvents = {
  navClick: "audit_nav_click",
  homeCta: "audit_home_cta_click",
  landingCta: "audit_landing_cta_click",
  externalLaunch: "audit_external_app_click",
  videoPlay: "audit_video_play",
  footerCta: "audit_footer_cta_click",
  assistanceClick: "audit_assistance_click",
};

const englishHomePath = "/en";

const pageMetadata = {
  "/": {
    title: "Digital Lab — Solutions digitales pour petites structures",
    description:
      "Digital Lab accompagne les PME, indépendants et associations avec des sites web modernes, des automatisations utiles et des solutions IA adaptées à leurs besoins.",
    canonical: `${siteUrl}/`,
  },
  [englishHomePath]: {
    title: "Digital Lab — Digital Solutions for Small Businesses",
    description:
      "Digital Lab builds modern websites, useful automations, and practical AI tools for small businesses, freelancers, and nonprofits.",
    canonical: `${siteUrl}/en/`,
  },
  [auditLandingPath]: {
    title: "Audit de site web gratuit pour TPE et indépendants | Digital Lab",
    description:
      "Analysez gratuitement votre site : visibilité, confiance, sécurité, RGPD, performance et conversion. Recevez les priorités à traiter, expliquées simplement.",
    canonical: `${siteUrl}${auditLandingPath}`,
  },
  [legalNoticePath]: {
    title: "Mentions légales | Digital Lab",
    description:
      "Mentions légales de Digital Lab : éditeur du site, hébergement, propriété intellectuelle et gestion des données personnelles.",
    canonical: `${siteUrl}${legalNoticePath}`,
  },
};

const socialLinks = [
  {
    key: "linkedin",
    href: businessContact.linkedin,
    label: "Voir le profil LinkedIn de Digital Lab",
    title: "Profil LinkedIn Digital Lab",
  },
  {
    key: "github",
    href: businessContact.github,
    label: "Voir le profil GitHub de Digital Lab",
    title: "Profil GitHub Digital Lab",
  },
  {
    key: "instagram",
    href: businessContact.instagram,
    label: "Voir le compte Instagram de Digital Lab",
    title: "Compte Instagram Digital Lab",
  },
  {
    key: "facebook",
    href: businessContact.facebook,
    label: "Voir la page Facebook de Digital Lab",
    title: "Page Facebook Digital Lab",
  },
];

const contactProjectTypes = [
  "Site web",
  "Réparation / amélioration",
  "SEO & visibilité",
  "Automatisation",
  "Chatbot / assistant IA",
  "MVP / prototype",
  "Autre",
];

const initialContactForm = {
  name: "",
  email: "",
  company: "",
  projectType: contactProjectTypes[0],
  message: "",
};

const initialEstimatorAnswers = {
  profile: "Indépendant",
  priority: "Être visible",
  need: "Créer un site web",
  existing: "Non",
  content: "Quelques éléments seulement",
  complexity: "Standard : plusieurs pages ou plusieurs fonctions",
  features: [],
  urgency: "Normal",
};

const projects = [
  {
    slug: "microassist",
    title: "MicroAssist — Assistant fiscal SaaS",
    subtitle: "Assistant SaaS pour simplifier les démarches administratives.",
    description:
      "Assistant IA pour micro-entrepreneurs : suivi d’activité, génération documentaire et simplification des démarches administratives.",
    caseStudy: {
      problem: "Démarches fiscales peu claires pour les micro-entrepreneurs.",
      solution: "Profil fiscal, espace fiscal, alertes, factures et suivi clair.",
      result: "Meilleure visibilité sur les obligations et moins de stress administratif.",
    },
    details:
      "MicroAssist aide les indépendants à suivre leurs priorités fiscales, organiser leurs informations et réduire le temps passé sur les tâches administratives. L’objectif est de proposer un outil clair, rapide à comprendre et utilisable sans formation technique.",
    features: [
      "Tableau de bord clair pour suivre les actions importantes",
      "Automatisation des rappels et tâches répétitives",
      "Interface pensée pour les indépendants et petites structures",
      "Base solide pour tester rapidement un MVP SaaS",
    ],
    stack: ["React", "Vite", "SaaS", "Tableau de bord", "Automatisation"],
    objective:
      "Valider un produit digital capable de réduire la charge administrative et de créer une expérience plus fluide pour les indépendants.",
    tags: ["SaaS", "IA", "Automatisation", "Tableau de bord"],
    link: "/projects/microassist",
    demoUrl: "https://microassist.digitallab.studio/",
    demoCtaLabel: "Découvrir MicroAssist",
    image: "/projects/microassist.png",
    video: "/videos/microassist.mp4",
    cta: "Demander une démo",
    modal: {
      title: "Une logique SaaS pour simplifier le suivi de vos clients",
      description:
        "MicroAssist aide les micro-entrepreneurs à anticiper leurs charges et déclarations. La logique repose sur un tableau de bord, des alertes automatiques et un espace personnel clair.",
      adaptationTitle: "Comment l’adapter à votre métier ?",
      adaptations: [
        "Pour les enseignants / répétiteurs : espace élève, suivi des progrès, notes, devoirs à rendre et tableau de bord par élève.",
        "Pour les coachs sportifs : suivi personnalisé des objectifs, séances, performances et rappels de rendez-vous.",
        "Pour les formateurs / consultants : gestion des sessions, inscriptions, documents partagés et retours des participants.",
      ],
      cta: "Adapter cette logique à mon métier →",
    },
  },
  {
    slug: "socle-local",
    title: "Socle Local — Plateforme locale",
    subtitle: "Plateforme communautaire pour connecter une vie locale.",
    description:
      "Plateforme collaborative destinée aux habitants, associations et commerces locaux pour faciliter les échanges et les services de proximité.",
    caseStudy: {
      problem: "Annonces et initiatives locales dispersées.",
      solution: "Plateforme par catégories, communautés et annonces locales.",
      result: "Meilleure visibilité pour les habitants, associations et créateurs.",
    },
    details:
      "Socle Local centralise les annonces, initiatives associatives et demandes d’entraide dans une interface accessible. La plateforme met l’accent sur la lisibilité, la navigation rapide et une expérience responsive adaptée aux usages quotidiens.",
    features: [
      "Publication d’annonces locales et contenus communautaires",
      "Parcours responsive pour mobile et desktop",
      "Structure claire pour associations, habitants et petites structures",
      "Design sobre pour rendre l’information facile à consulter",
    ],
    stack: ["React", "Vite", "UX/UI", "Responsive", "Plateforme"],
    objective:
      "Créer un socle efficace pour renforcer la visibilité des initiatives locales et faciliter les échanges entre acteurs d’un territoire.",
    tags: ["Plateforme", "UX/UI", "Responsive", "Communauté"],
    link: "/projects/socle-local",
    demoUrl: "https://socle-mvp.vercel.app/",
    image: "/projects/socle-local.png",
    video: "/videos/socle-local.mp4",
    cta: "Demander une démo",
    modal: {
      title: "La puissance d’une plateforme communautaire pour votre écosystème",
      description:
        "Socle Local centralise annonces, associations et services de proximité. C’est une base adaptable pour créer du lien, organiser l’information et faciliter les échanges.",
      adaptationTitle: "Comment l’adapter à votre territoire ou réseau ?",
      adaptations: [
        "Pour une fédération d’associations : annuaire des associations membres, actualités, besoins en bénévoles et calendrier partagé.",
        "Pour un réseau de commerçants : mise en avant des offres, bons plans, horaires et contacts des commerces participants.",
        "Pour une mairie ou un tiers-lieu : agenda d’ateliers, inscriptions aux événements et annuaire de services locaux.",
      ],
      cta: "Adapter cette plateforme à mon territoire →",
    },
  },
  {
    slug: "microassist-expert",
    title: "MicroAssist Expert — Suivi B2B",
    subtitle: "Suivi multi-clients pour professionnels et experts.",
    description:
      "Plateforme B2B avec tableaux de bord, alertes, priorités et automatisation du suivi multi-clients.",
    caseStudy: {
      problem: "Suivi multi-clients difficile pour les professionnels.",
      solution: "Tableau de bord, alertes, priorités et fiches clients.",
      result: "Dossiers mieux organisés et risques plus faciles à suivre.",
    },
    details:
      "MicroAssist Expert transforme le suivi client en tableau de bord lisible, avec une vision des priorités, des alertes et des dossiers à traiter. Le prototype est conçu pour aider les professionnels à gagner du temps sans complexifier leur méthode de travail.",
    features: [
      "Vue multi-clients organisée par priorités",
      "Alertes et statuts pour suivre les dossiers sensibles",
      "Interface B2B claire pour limiter les frictions",
      "Prototype évolutif pour tester des flux de travail métier",
    ],
    stack: ["React", "Tableau de bord", "B2B", "Prototype", "Flux de travail"],
    objective:
      "Aider les professionnels à garder une vision claire de leurs clients, des urgences et des tâches à prioriser.",
    tags: ["B2B", "Tableau de bord", "Automatisation", "Prototype"],
    link: "/projects/microassist-expert",
    demoUrl: "https://microassist-expert.vercel.app/",
    image: "/projects/microassist-expert.png",
    video: "/videos/microassist-expert.mp4",
    cta: "Demander une démo",
    modal: {
      title: "Un tableau de bord pour piloter plusieurs dossiers en même temps",
      description:
        "MicroAssist Expert permet de suivre plusieurs clients, de visualiser les alertes et de prioriser les actions. L’objectif : ne plus perdre les informations importantes.",
      adaptationTitle: "Comment l’adapter à vos processus ?",
      adaptations: [
        "Pour les experts-comptables : suivi des dossiers clients, alertes déclaratives, documents manquants et priorités.",
        "Pour les responsables associatifs : suivi des adhésions, bénévoles, demandes entrantes et tâches à répartir.",
        "Pour les freelances ou petites équipes : vue d’ensemble des projets, délais, tâches et charge de travail.",
      ],
      cta: "Adapter ce tableau de bord à mes processus →",
    },
  },
  {
    slug: "assistant-reservation-ia",
    title: "Assistant de réservation IA",
    subtitle: "Assistant conversationnel pour réservations et demandes clients.",
    description:
      "Assistant conversationnel pour qualifier les demandes clients, automatiser les réservations et orchestrer des flux de travail métier.",
    caseStudy: {
      problem: "Demandes répétitives et réservations manuelles.",
      solution: "Assistant conversationnel, QR code, collecte de demandes.",
      result: "Prise de contact simplifiée et disponibilité 24/7.",
    },
    details:
      "Cet assistant aide les petites structures à recevoir, qualifier et organiser les demandes clients. Il peut guider une réservation, collecter les informations utiles et déclencher un flux de travail efficace pour éviter les oublis.",
    features: [
      "Conversation guidée pour qualifier les demandes",
      "Flux de travail automatisé pour organiser les réservations",
      "Interface adaptable selon le métier",
      "Base prête à connecter à d’autres outils",
    ],
    stack: ["IA", "Automatisation", "Chatbot", "Flux de travail", "Interface web"],
    objective:
      "Réduire le temps passé à répondre aux demandes répétitives tout en gardant une expérience claire et humaine pour les clients.",
    tags: ["IA", "Chatbot", "Automatisation", "Flux de travail"],
    link: "/projects/assistant-reservation-ia",
    demoUrl: "https://reservation-bot-demo.pages.dev/",
    image: "/projects/automatisation.png",
    video: "/videos/automatisation.mp4",
    cta: "Demander une démo",
    modal: {
      title: "Un assistant conversationnel pour automatiser les premières demandes",
      description:
        "Cet assistant permet de répondre aux questions fréquentes, collecter les informations utiles et guider le client vers une réservation ou une prise de contact.",
      adaptationTitle: "Comment l’adapter à votre activité ?",
      adaptations: [
        "Pour les restaurants : demandes de réservation, horaires, disponibilités, menus et réponses automatiques aux questions fréquentes.",
        "Pour les salons / instituts : prise de rendez-vous, choix du service, informations pratiques et rappels automatiques.",
        "Pour les associations ou événements : inscriptions, questions fréquentes, collecte des demandes et orientation des participants.",
      ],
      cta: "Créer un assistant adapté à mon activité →",
    },
  },
];

const servicePages = [
  {
    slug: "automatisation-pme",
    title: "Automatisation & outils connectés pour PME",
    metaTitle: "Automatisation pour PME : moins de tâches répétitives | Digital Lab",
    metaDescription:
      "Automatisation pour PME et indépendants : formulaires connectés, notifications, rappels et tableaux de bord pour centraliser le suivi et réduire les tâches manuelles.",
    intro:
      "Les petites structures perdent souvent du temps sur des tâches répétitives : relances manuelles, copier-coller entre outils, suivi dispersé dans plusieurs fichiers. Digital Lab connecte les étapes importantes de votre activité pour fiabiliser le suivi et libérer du temps pour l’essentiel.",
    audience:
      "Indépendants, PME et associations qui gèrent leur suivi client, leurs demandes ou leur organisation avec des outils dispersés (fichiers, échanges email, formulaires manuels).",
    problems: [
      "Trop de copier-coller entre formulaires, emails et fichiers de suivi",
      "Relances et rappels effectués manuellement, avec des oublis fréquents",
      "Informations importantes dispersées dans plusieurs outils",
      "Aucune vue d’ensemble claire sur les demandes en cours",
    ],
    capabilities: [
      "Connexion de formulaires à des notifications automatiques",
      "Mise en place de tableaux de bord simples pour centraliser le suivi",
      "Automatisation des rappels et tâches répétitives",
      "Intégration avec des outils déjà utilisés (Google Sheets, CRM léger)",
    ],
    expectedResults: [
      "Moins de temps passé sur des tâches manuelles répétitives",
      "Moins d’oublis grâce à des rappels automatiques",
      "Une organisation plus lisible et centralisée",
      "Une base évolutive, qui peut grandir avec vos besoins",
    ],
    useCases: [
      {
        title: "Suivi client centralisé",
        text: "Regrouper les demandes entrantes dans un tableau de bord unique plutôt que dans plusieurs boîtes mail.",
      },
      {
        title: "Notifications automatiques",
        text: "Recevoir une alerte dès qu’une nouvelle demande ou un nouveau formulaire est soumis, sans vérification manuelle.",
      },
      {
        title: "Rappels et relances",
        text: "Automatiser les rappels récurrents pour réduire les oublis liés au suivi manuel.",
      },
    ],
    method: [
      "Échange clair pour comprendre vos outils actuels et vos priorités",
      "Identification des tâches répétitives les plus coûteuses en temps",
      "Mise en place progressive, sans tout changer d’un coup",
      "Suivi dans la durée pour ajuster selon vos retours",
    ],
    relatedProjects: ["microassist", "microassist-expert", "assistant-reservation-ia"],
    cta: {
      title: "Une organisation plus fluide, sans complexité inutile",
      text: "Parlons de vos tâches répétitives : je vous propose une première piste concrète, adaptée à votre activité.",
      primaryLabel: "Faire un diagnostic gratuit",
      primaryHref: auditLandingPath,
      secondaryLabel: "Me contacter directement",
      secondaryHref: "/#contact",
    },
  },
  {
    slug: "chatbot-ia",
    title: "Chatbots & assistants IA pour PME et indépendants",
    metaTitle: "Chatbot IA pour PME : répondre plus vite sans tout automatiser | Digital Lab",
    metaDescription:
      "Chatbot et assistant IA pour PME et indépendants : réponses aux questions fréquentes, qualification des demandes, collecte d’informations et transfert vers un humain quand nécessaire.",
    intro:
      "Un chatbot ou assistant IA aide les petites structures à répondre plus vite aux questions répétitives et à mieux qualifier les demandes entrantes. Il ne remplace pas un échange humain : il traite les demandes simples, collecte les informations utiles, et transmet à une personne les situations qui nécessitent réellement un suivi humain.",
    audience:
      "Indépendants, PME, associations et structures qui reçoivent des questions répétitives par email, téléphone ou formulaire, et qui souhaitent mieux organiser les premières réponses sans recruter.",
    problems: [
      "Questions répétitives qui prennent du temps à traiter individuellement",
      "Demandes reçues en dehors des horaires d’ouverture, sans réponse immédiate",
      "Informations importantes mal collectées ou incomplètes dès le premier contact",
      "Difficulté à distinguer rapidement une demande simple d’une demande qui nécessite un suivi humain",
    ],
    capabilities: [
      "Réponses automatiques aux questions fréquentes (horaires, tarifs, informations pratiques)",
      "Qualification des demandes pour identifier le besoin avant un contact humain",
      "Collecte structurée d’informations utiles (coordonnées, contexte, besoin exprimé)",
      "Automatisation des demandes simples et répétitives (prise de rendez-vous, informations standard)",
      "Transfert vers un humain dès que la demande dépasse ce que l’assistant peut traiter correctement",
    ],
    expectedResults: [
      "Des réponses plus rapides aux questions les plus fréquentes",
      "Une meilleure qualification des demandes avant un échange humain",
      "Moins de questions répétitives à traiter manuellement",
      "Une disponibilité élargie sans remplacer le contact humain",
    ],
    useCases: [
      {
        title: "FAQ automatisée",
        text: "Répondre instantanément aux questions les plus posées, plutôt que de les traiter une par une.",
      },
      {
        title: "Préqualification avant contact",
        text: "Identifier le besoin du visiteur avant qu’il n’entre en contact direct, pour gagner du temps de part et d’autre.",
      },
      {
        title: "Collecte de demandes hors horaires",
        text: "Recueillir une demande structurée même lorsque personne n’est disponible pour répondre immédiatement.",
      },
    ],
    method: [
      "Échange clair pour identifier les questions et demandes les plus fréquentes",
      "Définition des scénarios que l’assistant peut traiter seul, et de ceux qui doivent être transférés",
      "Mise en place progressive, avec des réponses testées avant diffusion",
      "Ajustement dans la durée selon les retours et les demandes réelles reçues",
    ],
    relatedProjects: ["assistant-reservation-ia", "microassist", "microassist-expert"],
    cta: {
      title: "Un assistant utile, sans perdre le contact humain",
      text: "Parlons des questions que vous recevez le plus souvent : je vous propose une première piste concrète, adaptée à votre activité.",
      primaryLabel: "Faire un diagnostic gratuit",
      primaryHref: auditLandingPath,
      secondaryLabel: "Me contacter directement",
      secondaryHref: "/#contact",
    },
  },
  {
    slug: "creation-site-web",
    title: "Création et refonte de site web pour PME",
    metaTitle: "Création de site web pour PME et indépendants | Digital Lab",
    metaDescription:
      "Création ou refonte de site web pour PME, indépendants et associations : structure claire, responsive, formulaires de contact et bases SEO, pensé pour générer des demandes.",
    intro:
      "Un site vitrine ou une refonte bien pensée aide vos visiteurs à comprendre votre activité et à passer à l’action. Digital Lab conçoit des sites clairs, responsives et faciles à mettre à jour, avec les bases techniques nécessaires pour être visible et crédible.",
    audience:
      "Indépendants, PME et associations qui ont besoin d’un premier site professionnel ou qui doivent refondre un site ancien, lent ou peu clair.",
    problems: [
      "Un site qui ne génère pas ou peu de demandes",
      "Une image peu professionnelle qui freine la confiance des visiteurs",
      "Une navigation confuse qui complique la recherche d’information",
      "Une expérience mobile insuffisante alors qu’une grande partie des visiteurs consulte le site depuis un téléphone",
      "Un site difficile à mettre à jour au quotidien",
      "Une faible visibilité sur Google",
      "Une absence de call-to-action clair vers le contact",
    ],
    capabilities: [
      "Création de site vitrine, pensé pour présenter clairement votre activité",
      "Refonte de site existant, sans repartir de zéro lorsque ce n’est pas nécessaire",
      "Design responsive, pensé mobile en priorité",
      "Parcours utilisateur clarifié, pour guider le visiteur vers le contact",
      "Optimisation de la performance de chargement",
      "Bases SEO techniques (structure des titres, balises meta, maillage interne)",
      "Bonnes pratiques d’accessibilité pour un site utilisable par le plus grand nombre",
      "Formulaires de contact et prises de rendez-vous intégrés",
      "Intégrations simples si nécessaires (carte de localisation, réseaux sociaux, prise de rendez-vous)",
    ],
    expectedResults: [
      "Un site plus clair, qui aide les visiteurs à comprendre votre offre",
      "Une navigation plus fluide, sur ordinateur comme sur mobile",
      "Une meilleure base technique pour la visibilité sur Google",
      "Un site plus simple à mettre à jour au quotidien",
    ],
    useCases: [
      {
        title: "Premier site professionnel",
        text: "Mettre en ligne une présence claire et fiable lorsque l’activité n’a pas encore de site, ou repose uniquement sur les réseaux sociaux.",
      },
      {
        title: "Refonte d’un site vieillissant",
        text: "Reprendre un site existant devenu lent, mal affiché sur mobile ou difficile à faire évoluer, sans perdre le contenu utile déjà en place.",
      },
      {
        title: "Clarification du parcours de contact",
        text: "Revoir la structure des pages et les appels à l’action pour que les visiteurs sachent clairement comment vous contacter.",
      },
    ],
    method: [
      "Échange clair sur votre activité, vos priorités et votre budget",
      "Structuration des pages et du message avant tout travail visuel",
      "Construction progressive, avec des versions visibles à chaque étape",
      "Vérification du responsive, de la performance et des bases SEO avant mise en ligne",
    ],
    relatedProjects: ["socle-local", "microassist", "microassist-expert"],
    cta: {
      title: "Un site clair, qui reflète votre activité",
      text: "Parlons de votre projet de site ou de refonte : je vous propose une première piste concrète, adaptée à votre activité.",
      primaryLabel: "Faire un diagnostic gratuit",
      primaryHref: auditLandingPath,
      secondaryLabel: "Me contacter directement",
      secondaryHref: "/#contact",
    },
    localVariant: {
      slug: "creation-site-web-besancon",
      heading: "Vous êtes basé à Besançon ?",
      text: "Digital Lab accompagne aussi les PME, indépendants et associations situés à Besançon, avec un accompagnement réalisable à distance, du premier échange à la mise en ligne.",
      linkLabel: "Découvrir l’accompagnement pour Besançon",
    },
  },
  {
    slug: "creation-site-web-besancon",
    title: "Création et refonte de site web pour PME à Besançon",
    metaTitle: "Création site web Besançon : sites pros pour PME et indépendants | Digital Lab",
    metaDescription:
      "Digital Lab accompagne les PME, indépendants et associations à Besançon dans la création ou la refonte d’un site web professionnel, clair et responsive, avec un accompagnement à distance.",
    intro:
      "Digital Lab accompagne les PME, indépendants et associations à Besançon dans la création et la refonte de sites web professionnels. L’accompagnement se fait à distance, avec des échanges clairs à chaque étape, pour construire un site qui reflète réellement votre activité.",
    audience:
      "PME, indépendants et associations situés à Besançon qui ont besoin d’un premier site professionnel ou qui doivent moderniser un site devenu ancien, lent ou peu clair.",
    problems: [
      "Difficulté à être trouvé sur Google par des clients qui cherchent vos services à Besançon",
      "Un site qui n’inspire pas assez confiance auprès d’une clientèle de proximité avant un premier contact",
      "Une présence en ligne qui ne reflète pas le sérieux de votre activité locale",
      "Un parcours de contact peu clair pour les visiteurs qui souhaitent vous solliciter rapidement",
      "Une version mobile insuffisante, alors que les recherches locales se font majoritairement depuis un téléphone",
    ],
    capabilities: [
      "Création d’un site vitrine clair, pensé pour présenter votre activité aux visiteurs de Besançon",
      "Refonte d’un site existant devenu daté, lent ou peu adapté au mobile",
      "Structure de pages et de contenu pensée pour la visibilité locale sur Google",
      "Parcours de contact simplifié, pour transformer une visite en demande",
      "Design responsive, prioritaire sur mobile",
      "Bases SEO techniques cohérentes avec une activité locale (structure des titres, balises meta, maillage interne)",
      "Formulaires de contact adaptés à votre activité",
    ],
    expectedResults: [
      "Un site plus crédible pour les visiteurs de Besançon qui découvrent votre activité",
      "Une meilleure lisibilité sur mobile, là où se font la majorité des recherches locales",
      "Un parcours de contact plus simple, du premier clic à la demande",
      "Une base plus solide pour la visibilité locale sur Google",
    ],
    useCases: [
      {
        title: "Premier site pour une activité locale",
        text: "Mettre en ligne une présence claire pour une activité à Besançon qui ne dispose encore que d’une page réseau social ou d’aucune présence en ligne.",
      },
      {
        title: "Refonte d’un site local vieillissant",
        text: "Moderniser un site existant devenu difficile à consulter sur mobile ou peu représentatif de l’activité actuelle.",
      },
      {
        title: "Clarification du parcours de contact local",
        text: "Revoir la structure du site pour que les visiteurs de Besançon trouvent rapidement comment vous contacter.",
      },
    ],
    method: [
      "Échange à distance pour clarifier votre activité, vos priorités et votre budget",
      "Structuration des pages et du message avant tout travail visuel",
      "Construction progressive, avec des versions visibles à chaque étape, sans déplacement nécessaire",
      "Vérification du responsive, de la performance et des bases SEO avant mise en ligne",
    ],
    relatedProjects: ["socle-local", "microassist", "microassist-expert"],
    cta: {
      title: "Un site clair, construit à distance avec vous",
      text: "Parlons de votre projet de site ou de refonte à Besançon : je vous propose une première piste concrète, adaptée à votre activité.",
      primaryLabel: "Faire un diagnostic gratuit",
      primaryHref: auditLandingPath,
      secondaryLabel: "Me contacter directement",
      secondaryHref: "/#contact",
    },
  },
];

const optimizedImages = {
  "/projects/site-wordpress-ohmyfood-home.png": {
    src: "/projects/site-wordpress-ohmyfood-home.webp",
    srcSet:
      "/projects/site-wordpress-ohmyfood-home-640.webp 640w, /projects/site-wordpress-ohmyfood-home-960.webp 960w, /projects/site-wordpress-ohmyfood-home.webp 1762w",
  },
  "/projects/socle-local.png": {
    src: "/projects/socle-local.webp",
    srcSet: "/projects/socle-local-640.webp 640w, /projects/socle-local-960.webp 960w, /projects/socle-local.webp 1351w",
  },
  "/projects/maket-wordpress-ohmyfood-figma.png": {
    src: "/projects/maket-wordpress-ohmyfood-figma.webp",
    srcSet:
      "/projects/maket-wordpress-ohmyfood-figma-640.webp 640w, /projects/maket-wordpress-ohmyfood-figma-960.webp 960w, /projects/maket-wordpress-ohmyfood-figma.webp 1073w",
  },
  "/projects/La_ferm_des_amanders.png": {
    src: "/projects/La_ferm_des_amanders.webp",
    srcSet:
      "/projects/La_ferm_des_amanders-640.webp 640w, /projects/La_ferm_des_amanders-960.webp 960w, /projects/La_ferm_des_amanders.webp 1920w",
  },
  "/projects/srtructure_du_menu.png": {
    src: "/projects/srtructure_du_menu.webp",
    srcSet:
      "/projects/srtructure_du_menu-640.webp 640w, /projects/srtructure_du_menu-960.webp 960w, /projects/srtructure_du_menu.webp 1920w",
  },
  "/projects/microassist-expert (2).png": {
    src: "/projects/microassist-expert (2).webp",
    srcSet:
      "/projects/microassist-expert (2)-640.webp 640w, /projects/microassist-expert (2)-960.webp 960w, /projects/microassist-expert (2).webp 1341w",
  },
  "/projects/simulator_artforgood_contact.png": {
    src: "/projects/simulator_artforgood_contact.webp",
    srcSet:
      "/projects/simulator_artforgood_contact-640.webp 640w, /projects/simulator_artforgood_contact-960.webp 960w, /projects/simulator_artforgood_contact.webp 1920w",
  },
  "/projects/microassist.png": {
    src: "/projects/microassist.webp",
    srcSet: "/projects/microassist-640.webp 640w, /projects/microassist-960.webp 960w, /projects/microassist.webp 1387w",
  },
  "/projects/microassist (2).png": {
    src: "/projects/microassist (2).webp",
    srcSet:
      "/projects/microassist (2)-640.webp 640w, /projects/microassist (2)-960.webp 960w, /projects/microassist (2).webp 1809w",
  },
};

const getOptimizedImage = (src) => optimizedImages[src] ?? { src };

const getProjectFromPath = (pathname) => {
  const match = pathname.match(/^\/projects\/([^/]+)\/?$/);

  if (!match) {
    return null;
  }

  return projects.find((project) => project.slug === match[1]) ?? null;
};

const getServiceFromPath = (pathname) => {
  const match = pathname.match(/^\/services\/([^/]+)\/?$/);

  if (!match) {
    return null;
  }

  return servicePages.find((servicePage) => servicePage.slug === match[1]) ?? null;
};

const handleProjectEnter = (event) => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (reducedMotion || !canHover) {
    return;
  }

  const video = event.currentTarget.querySelector("video");

  if (video) {
    video.play().catch(() => {});
  }
};

const handleProjectLeave = (event) => {
  const video = event.currentTarget.querySelector("video");

  if (video) {
    video.pause();
    video.currentTime = 0;
  }
};

const isExternalLink = (href) => href.startsWith("http");

const normalizePathname = (path) => {
  if (!path || path === "/") {
    return "/";
  }

  return path.replace(/\/+$/, "");
};

const scrollToElementWithHeaderOffset = (selectorOrElement) => {
  const element =
    typeof selectorOrElement === "string" ? document.querySelector(selectorOrElement) : selectorOrElement;

  if (!element) {
    return;
  }

  const headerOffset = 104;
  const elementTop = element.getBoundingClientRect().top + window.scrollY;
  const targetTop = Math.max(0, elementTop - headerOffset);

  window.scrollTo({ top: targetTop, behavior: "smooth" });
};

const setMetaContent = (selector, content) => {
  if (!content) {
    return;
  }

  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    const nameMatch = selector.match(/\[name="([^"]+)"\]/);
    const propertyMatch = selector.match(/\[property="([^"]+)"\]/);

    if (nameMatch) {
      element.setAttribute("name", nameMatch[1]);
    }

    if (propertyMatch) {
      element.setAttribute("property", propertyMatch[1]);
    }

    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
};

const setCanonicalHref = (href) => {
  let element = document.head.querySelector('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
};

// FR/EN reciprocal alternates for the homepage pair only (LOT DL 2.5) — no
// other route has an English equivalent yet, so no other route gets these.
const homepageHreflangAlternates = [
  { hreflang: "fr", href: `${siteUrl}/` },
  { hreflang: "en", href: `${siteUrl}/en/` },
  { hreflang: "x-default", href: `${siteUrl}/` },
];

const setHreflangAlternates = (pathname) => {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((element) => element.remove());

  if (pathname !== "/" && pathname !== englishHomePath) {
    return;
  }

  homepageHreflangAlternates.forEach(({ hreflang, href }) => {
    const element = document.createElement("link");
    element.setAttribute("rel", "alternate");
    element.setAttribute("hreflang", hreflang);
    element.setAttribute("href", href);
    document.head.appendChild(element);
  });
};

const setJsonLd = (id, data) => {
  let element = document.getElementById(id);

  if (!element) {
    element = document.createElement("script");
    element.id = id;
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
};

const removeJsonLd = (id) => {
  document.getElementById(id)?.remove();
};

const applyPageMetadata = (pathname) => {
  const isProjectPath = pathname.startsWith("/projects/");
  const project = isProjectPath ? getProjectFromPath(pathname) : null;
  const projectMetadata = project
    ? {
        title: `${project.title} | Digital Lab`,
        description: project.description,
        canonical: `${siteUrl}/projects/${project.slug}`,
      }
    : null;

  const isServicePath = pathname.startsWith("/services/");
  const servicePage = isServicePath ? getServiceFromPath(pathname) : null;
  const servicePageMetadata = servicePage
    ? {
        title: servicePage.metaTitle,
        description: servicePage.metaDescription,
        canonical: `${siteUrl}/services/${servicePage.slug}`,
      }
    : null;

  const metadata = pageMetadata[pathname] ?? projectMetadata ?? servicePageMetadata ?? pageMetadata["/"];

  document.documentElement.lang = pathname === englishHomePath ? "en" : "fr";
  document.title = metadata.title;
  setMetaContent('meta[name="description"]', metadata.description);
  setMetaContent('meta[property="og:title"]', metadata.title);
  setMetaContent('meta[property="og:description"]', metadata.description);
  setMetaContent('meta[property="og:url"]', metadata.canonical);
  setMetaContent('meta[name="twitter:title"]', metadata.title);
  setMetaContent('meta[name="twitter:description"]', metadata.description);
  setCanonicalHref(metadata.canonical);
  setHreflangAlternates(pathname);

  const isUnknownProjectPath = isProjectPath && !project;
  const isUnknownServicePath = isServicePath && !servicePage;
  const isPrivatePath = privatePaths.includes(pathname);
  setMetaContent(
    'meta[name="robots"]',
    isPrivatePath || isUnknownProjectPath || isUnknownServicePath ? "noindex, nofollow" : "index, follow",
  );

  if (pathname === auditLandingPath) {
    setJsonLd("audit-landing-structured-data", {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          "@id": `${siteUrl}${auditLandingPath}#webapplication`,
          name: "Digital Lab Audit",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR",
          },
          provider: {
            "@type": "ProfessionalService",
            name: "Digital Lab",
            url: siteUrl,
          },
          url: metadata.canonical,
          description: metadata.description,
        },
        {
          "@type": "Service",
          "@id": `${siteUrl}${auditLandingPath}#service`,
          name: "Audit de site web gratuit Digital Lab",
          provider: {
            "@type": "ProfessionalService",
            name: "Digital Lab",
            url: siteUrl,
          },
          serviceType: "Diagnostic digital et commercial pour petites entreprises",
          areaServed: "France",
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Accueil",
              item: siteUrl,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Audit de site web gratuit",
              item: metadata.canonical,
            },
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Pourquoi utiliser Digital Lab Audit s’il existe déjà d’autres outils ?",
              acceptedAnswer: {
                "@type": "Answer",
                text:
                  "Les grandes plateformes SEO sont très puissantes pour les spécialistes. Digital Lab Audit a été conçu pour les dirigeants de petites entreprises qui veulent comprendre rapidement ce qui peut freiner la visibilité, la confiance et les demandes clients, sans devoir interpréter un rapport technique complexe.",
              },
            },
          ],
        },
      ],
    });
  } else {
    removeJsonLd("audit-landing-structured-data");
  }
};

const trackAuditCta = (eventName, location) => {
  trackEvent(eventName, {
    cta_location: location,
    destination_type: isAuditAppUrlConfigured ? "external_audit_app" : "configuration_fallback",
  });
};

const handleAuditLaunchClick = (event, { eventName, location, onNavigate }) => {
  trackAuditCta(eventName, location);

  if (isAuditAppUrlConfigured) {
    trackAuditCta(auditEvents.externalLaunch, location);
    return;
  }

  event.preventDefault();
  onNavigate(auditLandingPath);
};

function DeferredVideo({
  ariaLabel,
  autoPlay = false,
  className,
  loop = false,
  muted = true,
  onPlay,
  playWhenVisible = false,
  playsInline = true,
  poster,
  src,
}) {
  const videoRef = useRef(null);
  const [isSourceAttached, setIsSourceAttached] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || isSourceAttached || hasVideoError) {
      return undefined;
    }

    if (!("IntersectionObserver" in window)) {
      setIsSourceAttached(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsSourceAttached(true);
          observer.disconnect();
        }
      },
      { rootMargin: "420px 0px", threshold: 0.01 },
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, [hasVideoError, isSourceAttached]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !playWhenVisible || !isSourceAttached || reduceMotion || hasVideoError) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { rootMargin: "160px 0px", threshold: 0.28 },
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, [hasVideoError, isSourceAttached, playWhenVisible, reduceMotion]);

  return (
    <video
      ref={videoRef}
      aria-label={ariaLabel}
      autoPlay={!reduceMotion && autoPlay ? true : undefined}
      className={className}
      loop={loop}
      muted={muted}
      onError={() => setHasVideoError(true)}
      onPlay={onPlay}
      playsInline={playsInline}
      poster={poster}
      preload={isSourceAttached ? "metadata" : "none"}
      src={isSourceAttached && !hasVideoError ? src : undefined}
    ></video>
  );
}

const getUserDisplayName = (session) => {
  const user = session?.user;

  if (!user) {
    return "";
  }

  const metadataName = user.user_metadata?.full_name || user.user_metadata?.name;

  if (metadataName) {
    return metadataName.split(" ")[0];
  }

  return user.email?.split("@")[0] ?? "Compte";
};

function SolutionIcon({ type }) {
  const paths = {
    site: "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm2 2h12v-2a.5.5 0 0 0-.5-.5h-11a.5.5 0 0 0-.5.5v2Zm0 2v7a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-7H6Z",
    repair: "M14.6 4.4a4.8 4.8 0 0 0-5.8 6.3l-4.1 4.1a2.7 2.7 0 1 0 3.8 3.8l4.1-4.1a4.8 4.8 0 0 0 6.3-5.8l-3.1 3.1-2.3-2.3 3.1-3.1c-.6-.3-1.2-.6-2-.8Z",
    feature: "M12 3.8 13.9 9l5.5.2-4.3 3.4 1.5 5.4-4.6-3-4.6 3 1.5-5.4-4.3-3.4L10.1 9 12 3.8Z",
    seo: "M10.5 5a5.5 5.5 0 0 1 4.3 8.9l3.6 3.6-1.4 1.4-3.6-3.6A5.5 5.5 0 1 1 10.5 5Zm0 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0 1.2 1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3 1-2.1Z",
    connect: "M7.5 7a3.5 3.5 0 0 1 3.3 2.4h2.4A3.5 3.5 0 1 1 13.2 12h-2.4A3.5 3.5 0 1 1 7.5 7Zm0 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm9 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z",
    mvp: "M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17.5v-11Zm3 1.5v2h8V8H8Zm0 4v2h5v-2H8Zm0 4v2h8v-2H8Z",
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[type]} />
    </svg>
  );
}

function ContactIcon({ type }) {
  const paths = {
    mail: [
      "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2Z",
      "m22 6-10 7L2 6",
    ],
    phone: [
      "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z",
    ],
    globe: [
      "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z",
      "M2 12h20",
      "M12 2a15.3 15.3 0 0 1 0 20",
      "M12 2a15.3 15.3 0 0 0 0 20",
    ],
    mapPin: [
      "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z",
      "M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    ],
    linkedin: [
      "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z",
      "M2 9h4v12H2z",
      "M4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    ],
    github: [
      "M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4",
      "M9 18c-4.51 2-5-2-7-2",
    ],
    instagram: [
      "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z",
      "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z",
      "M17.5 6.5h.01",
    ],
    facebook: [
      "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3Z",
    ],
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[type].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}

function ServiceGallery({ service, isOpen }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failedImages, setFailedImages] = useState([]);
  const images = service.gallery?.images ?? service.images ?? [];
  const visibleImages = images.filter((image) => !failedImages.includes(image));
  const safeActiveIndex = visibleImages.length > 0 ? activeIndex % visibleImages.length : 0;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!isOpen || isPaused || reduceMotion || visibleImages.length < 2) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % visibleImages.length);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [visibleImages.length, isOpen, isPaused, reduceMotion]);

  if (visibleImages.length === 0) {
    return (
      <div className="solution-preview" aria-hidden="true">
        <SolutionIcon type={service.icon} />
      </div>
    );
  }

  return (
    <div
      className="service-gallery"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="service-gallery-frame">
        {visibleImages.map((image, index) => (
          (() => {
            const optimizedImage = getOptimizedImage(image);

            return (
              <img
                alt={`Aperçu ${index + 1} pour ${service.title}`}
                className={index === safeActiveIndex ? "is-active" : ""}
                decoding="async"
                key={image}
                loading="lazy"
                onError={() => {
                  setFailedImages((currentImages) =>
                    currentImages.includes(image) ? currentImages : [...currentImages, image],
                  );
                }}
                sizes="(max-width: 768px) 88vw, 420px"
                src={optimizedImage.src}
                srcSet={optimizedImage.srcSet}
              />
            );
          })()
        ))}
        <span className="service-gallery-overlay"></span>
      </div>

      <div className="service-gallery-dots" role="group" aria-label={`Aperçus pour ${service.title}`}>
        {visibleImages.map((image, index) => (
          <button
            aria-label={`Afficher l’aperçu ${index + 1}`}
            className={index === safeActiveIndex ? "is-active" : ""}
            key={image}
            type="button"
            onClick={() => setActiveIndex(index)}
          ></button>
        ))}
      </div>
    </div>
  );
}

function ServiceAccordionCard({ service, onNavigate, isEnglish = false }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <details className="service-accordion-card" onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        <span className="solution-icon">
          <SolutionIcon type={service.icon} />
        </span>
        <span className="solution-summary-copy">
          <strong>{service.title}</strong>
          <span>{service.summary}</span>
        </span>
        <span className="solution-toggle" aria-hidden="true"></span>
      </summary>

      <div className="solution-details">
        <div className="solution-detail-copy">
          <div className="service-sales-grid">
            <article>
              <span>{isEnglish ? "Your challenge" : "Votre problème"}</span>
              <p>{service.problem}</p>
            </article>
            <article>
              <span>{isEnglish ? "Our solution" : "Notre solution"}</span>
              <p>{service.canDo}</p>
            </article>
            <article>
              <span>{isEnglish ? "Concrete result" : "Résultat concret"}</span>
              <p>{service.expectedResult}</p>
            </article>
          </div>

          <ul>
            {service.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>

          {service.learnMoreHref && (
            <a
              className="service-learn-more"
              href={service.learnMoreHref}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(service.learnMoreHref);
              }}
            >
              {isEnglish ? "Learn more →" : "En savoir plus →"}
            </a>
          )}
        </div>
        <ServiceGallery isOpen={isOpen} service={service} />
      </div>
    </details>
  );
}

function AnimatedCounter({ value, suffix = "" }) {
  const [displayValue, setDisplayValue] = useState(() => {
    if (typeof value !== "number") {
      return 0;
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? value : 0;
  });

  useEffect(() => {
    if (typeof value !== "number") {
      return undefined;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      return undefined;
    }

    let animationFrame = 0;
    const duration = 900;
    const startTime = performance.now();

    const tick = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      setDisplayValue(Math.round(value * easedProgress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
      }
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(animationFrame);
  }, [value]);

  return (
    <>
      {displayValue}
      {suffix}
    </>
  );
}

function ProjectModal({ project, onClose, isEnglish = false }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!project) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [project, onClose]);

  if (!project) {
    return null;
  }

  const modalTitleId = `project-modal-title-${project.slug}`;

  return (
    <div className="project-modal-overlay" onMouseDown={onClose}>
      <section
        className="project-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="project-modal-close"
          type="button"
          aria-label={isEnglish ? "Close the window" : "Fermer la fenêtre"}
          onClick={onClose}
          ref={closeButtonRef}
        >
          ×
        </button>

        <div className="project-modal-content">
          <span className="project-modal-kicker">{project.title}</span>
          <h2 id={modalTitleId}>{project.modal.title}</h2>
          <p className="project-modal-description">{project.modal.description}</p>

          <div className="project-modal-adaptations">
            <h3>{project.modal.adaptationTitle}</h3>
            <div className="project-modal-grid">
              {project.modal.adaptations.map((adaptation, index) => (
                <article key={adaptation}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{adaptation}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="project-modal-actions">
            <a className="btn btn-primary" href="#estimation" onClick={onClose}>
              {project.modal.cta}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function ArticleSoonModal({ article, onClose, isEnglish = false }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!article) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [article, onClose]);

  if (!article) {
    return null;
  }

  return (
    <div className="article-modal-overlay" onMouseDown={onClose}>
      <section
        className="article-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="article-modal-close"
          type="button"
          aria-label={isEnglish ? "Close the window" : "Fermer la fenêtre"}
          onClick={onClose}
          ref={closeButtonRef}
        >
          ×
        </button>
        <span>{isEnglish ? "Practical tip" : "Conseil pratique"}</span>
        <h2 id="article-modal-title">{isEnglish ? "Article coming soon" : "Article bientôt disponible"}</h2>
        <p>
          {isEnglish
            ? "Full articles will be added progressively. Feel free to contact me already if you have a question on this topic."
            : "Les articles complets seront ajoutés progressivement. Vous pouvez déjà me contacter si vous avez une question sur ce sujet."}
        </p>
        <small>{article.title}</small>
        <a className="btn btn-primary" href={isEnglish ? "#en-contact" : "#contact"} onClick={onClose}>
          {isEnglish ? "Ask me a question" : "Me poser une question"}
        </a>
      </section>
    </div>
  );
}

function BlogCarousel({ isEnglish = false }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const trackRef = useRef(null);
  const displayedArticles = isEnglish ? englishArticles : articles;

  const scrollToArticle = (index) => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const card = track.children[index];

    if (card) {
      card.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      setActiveIndex(index);
    }
  };

  const scrollByDirection = (direction) => {
    const nextIndex = Math.max(0, Math.min(displayedArticles.length - 1, activeIndex + direction));
    scrollToArticle(nextIndex);
  };

  const handleScroll = () => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const cardWidth = track.children[0]?.getBoundingClientRect().width ?? 1;
    const gap = 18;
    const nextIndex = Math.round(track.scrollLeft / (cardWidth + gap));

    setActiveIndex(Math.max(0, Math.min(displayedArticles.length - 1, nextIndex)));
  };

  return (
    <section className="section articles-section reveal-on-scroll reveal-section" id={isEnglish ? "en-blog" : "blog"}>
      <div className="section-inner">
        <div className="articles-header">
          <div className="section-heading">
            <span>{isEnglish ? "Practical tips" : "Conseils pratiques"}</span>
            <h2>{isEnglish ? "Articles & tips" : "Articles & conseils"}</h2>
            <p>
              {isEnglish
                ? "Practical tips to better understand the web, improve your visibility, and avoid common mistakes."
                : "Des conseils pratiques pour mieux comprendre le web, améliorer sa visibilité et éviter les erreurs fréquentes."}
            </p>
          </div>

          <div className="articles-controls" role="group" aria-label={isEnglish ? "Article navigation" : "Navigation des articles"}>
            <button type="button" onClick={() => scrollByDirection(-1)} aria-label={isEnglish ? "Previous article" : "Article précédent"}>
              ←
            </button>
            <button type="button" onClick={() => scrollByDirection(1)} aria-label={isEnglish ? "Next article" : "Article suivant"}>
              →
            </button>
          </div>
        </div>

        <div className="articles-carousel" ref={trackRef} onScroll={handleScroll}>
          {displayedArticles.map((article, index) => (
            <article
              className="article-card premium-card gradient-border soft-hover reveal-on-scroll reveal-card"
              key={article.title}
              style={{ "--reveal-delay": `${index * 80}ms` }}
            >
              <div className="article-tags" role="group" aria-label={isEnglish ? "Article topics" : "Thèmes de l’article"}>
                {article.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <h3>{article.title}</h3>
              <p>{article.description}</p>
              <button type="button" onClick={() => setSelectedArticle(article)}>
                {isEnglish ? "Read the article" : "Lire l’article"} <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </div>

        <div className="articles-pagination" role="group" aria-label={isEnglish ? "Article pagination" : "Pagination des articles"}>
          {displayedArticles.map((article, index) => (
            <button
              className={activeIndex === index ? "is-active" : ""}
              type="button"
              key={article.title}
              onClick={() => scrollToArticle(index)}
              aria-label={isEnglish ? `Show article ${index + 1}` : `Afficher l’article ${index + 1}`}
            ></button>
          ))}
        </div>

        <button className="articles-soon-button" type="button" onClick={() => setSelectedArticle(displayedArticles[0])}>
          {isEnglish ? "Full articles coming soon" : "Articles complets à venir"}
        </button>
      </div>

      <ArticleSoonModal article={selectedArticle} onClose={() => setSelectedArticle(null)} isEnglish={isEnglish} />
    </section>
  );
}

function ProjectEstimator({ isEnglish = false }) {
  const [answers, setAnswers] = useState(initialEstimatorAnswers);
  const rawResult = getEstimatorResult(answers);
  const result = translateEstimatorResult(rawResult, isEnglish);
  const answeredSteps = [
    answers.profile,
    answers.priority,
    answers.need,
    answers.existing,
    answers.content,
    answers.complexity,
    answers.features.length > 0,
    answers.urgency,
  ].filter(Boolean).length;
  const progress = Math.round((answeredSteps / 8) * 100);
  const labelFor = (options, value) => options.find((option) => option.value === value)?.label ?? value;
  const emailBody = isEnglish
    ? [
        "Hello Digital Lab,",
        "",
        "I'd like to talk about a project.",
        "",
        `Profile: ${labelFor(estimatorProfileOptions, answers.profile)}`,
        `Main priority: ${labelFor(estimatorPriorityOptions, answers.priority)}`,
        `Main need: ${labelFor(estimatorNeedOptions, answers.need)}`,
        `Existing site or tool: ${labelFor(estimatorExistingOptions, answers.existing)}`,
        `Content: ${labelFor(estimatorContentOptions, answers.content)}`,
        `Desired complexity: ${labelFor(estimatorComplexityOptions, answers.complexity)}`,
        `Desired features: ${
          answers.features.length
            ? answers.features.map((feature) => labelFor(estimatorFeatureOptions, feature)).join(", ")
            : "To be defined"
        }`,
        `Urgency: ${labelFor(estimatorUrgencyOptions, answers.urgency)}`,
        "",
        `Indicative estimate: ${result.type} — ${result.budget} — ${result.delay}`,
        "",
        "Could you suggest a first direction?",
      ].join("\n")
    : [
        "Bonjour Digital Lab,",
        "",
        "Je souhaite échanger sur un projet.",
        "",
        `Profil : ${answers.profile}`,
        `Priorité principale : ${answers.priority}`,
        `Besoin principal : ${answers.need}`,
        `Site ou outil existant : ${answers.existing}`,
        `Contenus : ${answers.content}`,
        `Complexité souhaitée : ${answers.complexity}`,
        `Fonctionnalités souhaitées : ${answers.features.length ? answers.features.join(", ") : "À préciser"}`,
        `Urgence : ${answers.urgency}`,
        "",
        `Estimation indicative : ${result.type} — ${result.budget} — ${result.delay}`,
        "",
        "Pouvez-vous me proposer une première piste ?",
      ].join("\n");
  const mailtoHref = `mailto:${businessContact.email}?subject=${encodeURIComponent(
    isEnglish ? "Digital Lab project inquiry" : "Demande de projet Digital Lab",
  )}&body=${encodeURIComponent(emailBody)}`;

  const updateAnswer = (key, value) => {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [key]: value,
    }));
  };

  const toggleFeature = (feature) => {
    setAnswers((currentAnswers) => {
      const hasFeature = currentAnswers.features.includes(feature);

      return {
        ...currentAnswers,
        features: hasFeature
          ? currentAnswers.features.filter((currentFeature) => currentFeature !== feature)
          : [...currentAnswers.features, feature],
      };
    });
  };

  return (
    <section className="section estimator-section reveal-on-scroll reveal-section" id={isEnglish ? "en-estimation" : "estimation"}>
      <div className="section-inner">
        <div className="section-heading">
          <span>{isEnglish ? "Estimate" : "Estimation"}</span>
          <h2>{isEnglish ? "Estimate a first version of your project" : "Estimez une première version de votre projet"}</h2>
          <p>
            {isEnglish
              ? "Answer a few targeted questions to get an initial idea of budget, timeline, and complexity."
              : "Répondez à quelques questions ciblées pour obtenir une première indication de budget, délai et complexité."}
          </p>
        </div>

        <div className="estimator-panel reveal-on-scroll reveal-card" style={{ "--reveal-delay": "120ms" }}>
          <div
            className="estimator-progress"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={isEnglish ? `Progress ${progress}%` : `Progression ${progress}%`}
          >
            <span style={{ width: `${progress}%` }}></span>
          </div>

          <div className="estimator-grid">
            <div className="estimator-questions">
              <div className="estimator-question reveal-on-scroll reveal-card" style={{ "--reveal-delay": "180ms" }}>
                <h3>{isEnglish ? "You are:" : "Vous êtes :"}</h3>
                <div className="estimator-options">
                  {estimatorProfileOptions.map((profile) => (
                    <button
                      className={answers.profile === profile.value ? "is-selected" : ""}
                      key={profile.value}
                      type="button"
                      onClick={() => updateAnswer("profile", profile.value)}
                    >
                      {isEnglish ? profile.label : profile.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="estimator-question reveal-on-scroll reveal-card" style={{ "--reveal-delay": "220ms" }}>
                <h3>{isEnglish ? "Your main priority:" : "Votre priorité principale :"}</h3>
                <div className="estimator-options">
                  {estimatorPriorityOptions.map((priority) => (
                    <button
                      className={answers.priority === priority.value ? "is-selected" : ""}
                      key={priority.value}
                      type="button"
                      onClick={() => updateAnswer("priority", priority.value)}
                    >
                      {isEnglish ? priority.label : priority.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="estimator-question reveal-on-scroll reveal-card" style={{ "--reveal-delay": "260ms" }}>
                <h3>{isEnglish ? "What's your main need?" : "Quel est votre besoin principal ?"}</h3>
                <div className="estimator-options">
                  {estimatorNeedOptions.map((need) => (
                    <button
                      className={answers.need === need.value ? "is-selected" : ""}
                      key={need.value}
                      type="button"
                      onClick={() => updateAnswer("need", need.value)}
                    >
                      {isEnglish ? need.label : need.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="estimator-question estimator-question-inline reveal-on-scroll reveal-card" style={{ "--reveal-delay": "320ms" }}>
                <div>
                  <h3>{isEnglish ? "Do you already have a site or tool?" : "Avez-vous déjà un site ou un outil existant ?"}</h3>
                  <div className="estimator-options compact">
                    {estimatorExistingOptions.map((option) => (
                      <button
                        className={answers.existing === option.value ? "is-selected" : ""}
                        key={option.value}
                        type="button"
                        onClick={() => updateAnswer("existing", option.value)}
                      >
                        {isEnglish ? option.label : option.value}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3>{isEnglish ? "Do you already have the content?" : "Avez-vous déjà les contenus ?"}</h3>
                  <div className="estimator-options compact">
                    {estimatorContentOptions.map((option) => (
                      <button
                        className={answers.content === option.value ? "is-selected" : ""}
                        key={option.value}
                        type="button"
                        onClick={() => updateAnswer("content", option.value)}
                      >
                        {isEnglish ? option.label : option.value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="estimator-question reveal-on-scroll reveal-card" style={{ "--reveal-delay": "380ms" }}>
                <h3>{isEnglish ? "Desired complexity level" : "Niveau de complexité souhaité"}</h3>
                <div className="estimator-options">
                  {estimatorComplexityOptions.map((option) => (
                    <button
                      className={answers.complexity === option.value ? "is-selected" : ""}
                      key={option.value}
                      type="button"
                      onClick={() => updateAnswer("complexity", option.value)}
                    >
                      {isEnglish ? option.label : option.value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="estimator-question reveal-on-scroll reveal-card" style={{ "--reveal-delay": "440ms" }}>
                <h3>{isEnglish ? "Desired features" : "Fonctionnalités souhaitées"}</h3>
                <div className="estimator-checkboxes">
                  {estimatorFeatureOptions.map((feature) => (
                    <label className={answers.features.includes(feature.value) ? "is-selected" : ""} key={feature.value}>
                      <input
                        checked={answers.features.includes(feature.value)}
                        type="checkbox"
                        onChange={() => toggleFeature(feature.value)}
                      />
                      <span>{isEnglish ? feature.label : feature.value}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="estimator-question reveal-on-scroll reveal-card" style={{ "--reveal-delay": "500ms" }}>
                <h3>{isEnglish ? "Urgency" : "Urgence"}</h3>
                <div className="estimator-options compact">
                  {estimatorUrgencyOptions.map((option) => (
                    <button
                      className={answers.urgency === option.value ? "is-selected" : ""}
                      key={option.value}
                      type="button"
                      onClick={() => updateAnswer("urgency", option.value)}
                    >
                      {isEnglish ? option.label : option.value}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <aside className="estimator-result reveal-on-scroll reveal-card" style={{ "--reveal-delay": "300ms" }}>
              <span>{isEnglish ? "Indicative result" : "Résultat indicatif"}</span>
              <h3>{result.type}</h3>
              <div className="result-metrics">
                <div>
                  <small>{isEnglish ? "Estimated budget" : "Budget indicatif"}</small>
                  <strong>{result.budget}</strong>
                </div>
                <div>
                  <small>{isEnglish ? "Estimated timeline" : "Délai indicatif"}</small>
                  <strong>{result.delay}</strong>
                </div>
              </div>
              <p>{result.message}</p>
              <p className="estimator-note">
                {isEnglish
                  ? "This estimate is indicative. The final quote will depend on the brief, available content, and exact features."
                  : "Cette estimation est indicative. Le devis final dépendra du brief, des contenus disponibles et des fonctionnalités exactes."}
              </p>
              <a className="btn btn-primary" href={mailtoHref}>
                {isEnglish ? "Get this estimate" : "Recevoir cette estimation"}
              </a>
            </aside>
          </div>
        </div>

        <div className="estimator-help reveal-on-scroll reveal-card" style={{ "--reveal-delay": "560ms" }}>
          <span className="estimator-help-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5.5 5.8A5.2 5.2 0 0 1 9.2 4.3h5.6A5.2 5.2 0 0 1 20 9.5v.9a5.2 5.2 0 0 1-5.2 5.2h-3.6l-3.7 3.1v-3.3a5.2 5.2 0 0 1-4-5v-.9c0-1.4.7-2.8 2-3.7Zm3.7.5a3.2 3.2 0 0 0-3.2 3.2v.9a3.2 3.2 0 0 0 3.2 3.2h.3v.8l1-0.8h4.3a3.2 3.2 0 0 0 3.2-3.2v-.9a3.2 3.2 0 0 0-3.2-3.2H9.2Z" />
            </svg>
          </span>
          <p>
            {isEnglish
              ? "Can't find exactly what you need? You can also contact me directly and describe your project in your own words, even if it's still unclear."
              : "Vous ne trouvez pas exactement votre besoin ? Vous pouvez aussi me contacter directement et expliquer votre projet avec vos mots, même s’il est encore flou."}
          </p>
          <a href={isEnglish ? "#en-contact" : "#contact"}>{isEnglish ? "Discuss my project" : "Discuter de mon projet"}</a>
        </div>
      </div>
    </section>
  );
}

function AIWebsiteTransformationSection({ isEnglish = false }) {
  return (
    <section className="section ai-transformation-section reveal-on-scroll reveal-section">
      <div className="section-inner">
        <div className="ai-transformation-panel reveal-on-scroll reveal-card">
          <div className="ai-transformation-copy">
            <span className="ai-transformation-eyebrow">AI Website Transformation</span>
            <h2>
              {isEnglish ? (
                <>
                  Same business.
                  <br />
                  New perception.
                </>
              ) : (
                <>
                  Même activité.
                  <br />
                  Nouvelle perception.
                </>
              )}
            </h2>
            <p>
              {isEnglish
                ? "Turning existing websites into digital experiences that change how your brand is perceived."
                : "Transformer des sites existants en expériences digitales qui changent la perception de votre marque."}
            </p>

            <div className="ai-transformation-actions">
              <a className="btn btn-primary" href="#ai-website-transformation-video">
                {isEnglish ? "▶ Watch the transformation" : "▶ Voir la transformation"}
              </a>
              <a className="ai-transformation-link" href={isEnglish ? "#en-contact" : "#contact"}>
                {isEnglish ? "See the full case" : "Voir le cas complet"}
              </a>
            </div>
          </div>

          <div className="ai-transformation-visual">
            <div className="ai-transformation-video-frame" id="ai-website-transformation-video">
              <DeferredVideo
                ariaLabel={
                  isEnglish
                    ? "Video transformation of an old e-commerce site into a premium digital experience"
                    : "Transformation vidéo d’un ancien site e-commerce en expérience digitale premium"
                }
                muted
                loop
                playsInline
                playWhenVisible
                src="/videos/AI_Website_Transformation.mp4"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function isSupabaseAccessError(error) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("policy") ||
    message.includes("jwt")
  );
}

function ContactForm({ onAuthOpen, isEnglish = false }) {
  const { session } = useAuth();
  const [form, setForm] = useState(initialContactForm);
  const [isSending, setIsSending] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: "", message: "" });
  const statusRef = useRef(null);
  const sessionEmail = session?.user?.email ?? "";

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSending(true);
    setSubmitStatus({ type: "", message: "" });

    const email = form.email.trim() || sessionEmail;
    const contactPayload = {
      name: form.name.trim(),
      email,
      company: form.company.trim(),
      projectType: form.projectType,
      message: form.message.trim(),
    };
    const { error } = await createContactRequest({
      userId: session?.user?.id,
      name: contactPayload.name,
      email,
      company: contactPayload.company,
      projectType: contactPayload.projectType,
      message: contactPayload.message,
    });

    if (error) {
      const guestNeedsLogin = !session && isSupabaseAccessError(error);

      setSubmitStatus({
        type: "error",
        message: guestNeedsLogin
          ? isEnglish
            ? "Sign in and try again, or email me directly."
            : "Connectez-vous puis réessayez, ou envoyez-moi un email directement."
          : isEnglish
            ? "Your request couldn't be sent right now. Please try again in a moment."
            : "Votre demande n’a pas pu être envoyée pour le moment. Réessayez dans quelques instants.",
      });

      if (guestNeedsLogin) {
        onAuthOpen();
      }

      setIsSending(false);
      return;
    }

    try {
      await fetch("/api/send-contact-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactPayload),
      });
    } catch (notificationError) {
      console.error("CONTACT EMAIL ERROR:", notificationError);
    }

    setSubmitStatus({
      type: "success",
      message: isEnglish
        ? "Your request has been sent. I'll get back to you within 24–48h."
        : "Votre demande a bien été envoyée. Je vous répondrai sous 24–48h.",
    });
    setForm({ ...initialContactForm, email: sessionEmail });
    setIsSending(false);
    window.setTimeout(() => {
      statusRef.current?.focus();
      statusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  return (
    <form className="contact-form reveal-on-scroll reveal-card" style={{ "--reveal-delay": "700ms" }} onSubmit={handleSubmit}>
      <div className="contact-form-grid">
        <label className="contact-field" htmlFor="contact-name">
          {isEnglish ? "Name" : "Nom"}
          <input
            id="contact-name"
            name="name"
            type="text"
            value={form.name}
            placeholder={isEnglish ? "Your name" : "Votre nom"}
            required
            onChange={updateField}
          />
        </label>

        <label className="contact-field" htmlFor="contact-email">
          Email
          <input
            id="contact-email"
            name="email"
            type="email"
            value={form.email}
            placeholder={sessionEmail || (isEnglish ? "you@email.com" : "vous@email.com")}
            required={!sessionEmail}
            onChange={updateField}
          />
        </label>

        <label className="contact-field" htmlFor="contact-company">
          {isEnglish ? "Organization" : "Structure"}
          <input
            id="contact-company"
            name="company"
            type="text"
            value={form.company}
            placeholder={isEnglish ? "Company, nonprofit, project..." : "Entreprise, association, projet..."}
            onChange={updateField}
          />
        </label>

        <label className="contact-field" htmlFor="contact-project-type">
          {isEnglish ? "Project type" : "Type de projet"}
          <select id="contact-project-type" name="projectType" value={form.projectType} onChange={updateField}>
            {contactProjectTypeOptions.map((projectType) => (
              <option key={projectType.value} value={projectType.value}>
                {isEnglish ? projectType.label : projectType.value}
              </option>
            ))}
          </select>
        </label>

        <label className="contact-field is-full" htmlFor="contact-message">
          Message
          <textarea
            id="contact-message"
            name="message"
            value={form.message}
            placeholder={
              isEnglish
                ? "Describe your need in plain terms, even if it's still unclear."
                : "Expliquez simplement votre besoin, même s’il est encore flou."
            }
            required
            onChange={updateField}
          ></textarea>
        </label>
      </div>

      <div className="contact-form-footer">
        <button className="btn btn-primary contact-cta-primary" type="submit" disabled={isSending}>
          {isSending ? (isEnglish ? "Sending..." : "Envoi en cours...") : isEnglish ? "Send my request" : "Envoyer ma demande"}
        </button>
        {submitStatus.message && (
          <p className={`contact-form-status is-${submitStatus.type}`} role="status" tabIndex={-1} ref={statusRef}>
            {submitStatus.message}
          </p>
        )}
      </div>
    </form>
  );
}

function AuditVideoCard({ compact = false, isEnglish = false }) {
  const hasTrackedPlayRef = useRef(false);

  const trackVideoPlay = () => {
    if (hasTrackedPlayRef.current) {
      return;
    }

    hasTrackedPlayRef.current = true;
    trackAuditCta(auditEvents.videoPlay, compact ? "audit_landing_video" : "homepage_spotlight_video");
  };

  const playVideo = (event) => {
    const video = event.currentTarget.querySelector("video");

    if (video) {
      video.play().catch(() => {});
    }
  };

  const pauseVideo = (event) => {
    const video = event.currentTarget.querySelector("video");

    if (video) {
      video.pause();
    }
  };

  return (
    <div
      className={`audit-video-card premium-card gradient-border${compact ? " is-compact" : ""}`}
      onMouseEnter={playVideo}
      onMouseLeave={pauseVideo}
      onBlur={pauseVideo}
      onClick={playVideo}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          playVideo(event);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={isEnglish ? "Play the Digital Lab Audit preview video" : "Lire l’aperçu vidéo Digital Lab Audit"}
    >
      <div className="project-media audit-video-media">
        <DeferredVideo
          ariaLabel={isEnglish ? "Digital Lab Audit preview video" : "Aperçu vidéo Digital Lab Audit"}
          muted
          loop
          onPlay={trackVideoPlay}
          playsInline
          poster={auditVideoPoster}
          src={auditVideoSrc}
        />
      </div>
    </div>
  );
}

function AuditSpotlightSection({ onNavigate, isEnglish = false }) {
  const handleLandingClick = (event) => {
    handleAuditLaunchClick(event, {
      eventName: auditEvents.homeCta,
      location: "homepage_spotlight",
      onNavigate,
    });
  };
  const displayedAuditBenefits = isEnglish ? englishAuditBenefits : auditBenefits;

  return (
    <section className="section audit-spotlight-section reveal-on-scroll reveal-section" id="audit-gratuit">
      <div className="section-inner audit-spotlight-grid">
        <div className="audit-spotlight-copy">
          <div className="section-heading">
            <span>{isEnglish ? "Free diagnostic" : "Diagnostic gratuit"}</span>
            <h2>{isEnglish ? "Does your site really inspire trust?" : "Votre site inspire-t-il vraiment confiance ?"}</h2>
            <p>
              {isEnglish
                ? "Identify the main obstacles related to visibility, trust, security, and conversion, then discover the actions to prioritize."
                : "Identifiez les principaux freins liés à la visibilité, à la confiance, à la sécurité et à la conversion, puis découvrez les actions à traiter en priorité."}
            </p>
          </div>

          <ul className="audit-benefit-list">
            {displayedAuditBenefits.map((benefit, index) => (
              <li className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": `${index * 55}ms` }} key={benefit}>
                <span aria-hidden="true">✓</span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="audit-actions">
            <a
              className="btn btn-primary"
              href={auditLaunchHref}
              target={isExternalLink(auditLaunchHref) ? "_blank" : undefined}
              rel={isExternalLink(auditLaunchHref) ? "noreferrer" : undefined}
              onClick={handleLandingClick}
            >
              {isEnglish ? "Start my free audit" : "Lancer mon audit gratuit"} <strong>→</strong>
            </a>
          </div>

          {isAuditAppUrlConfigured && (
            <p className="audit-secondary-link">
              <a
                href={auditLandingPath}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(auditLandingPath);
                }}
              >
                {isEnglish ? "See how the audit works →" : "Découvrir comment fonctionne l’audit →"}
              </a>
            </p>
          )}
        </div>

        <AuditVideoCard isEnglish={isEnglish} />
      </div>
    </section>
  );
}

function AuditLandingPage({ onNavigate }) {
  useEffect(() => {
    if (!isAuditAppUrlConfigured) {
      console.warn("Digital Lab Audit launch URL is not configured.");
    }
  }, []);

  const handleLaunchClick = () => {
    trackAuditCta(auditEvents.landingCta, "audit_landing_primary");

    if (isAuditAppUrlConfigured) {
      trackAuditCta(auditEvents.externalLaunch, "audit_landing_primary");
    }
  };

  return (
    <main className="audit-page fade-in-page">
      <section className="audit-landing-hero">
        <div className="case-bg" aria-hidden="true"></div>
        <div className="section-inner audit-landing-hero-grid">
          <div className="audit-landing-copy">
            <nav className="audit-breadcrumb" aria-label="Fil d’Ariane">
              <a
                href="/#"
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate("/#");
                }}
              >
                Accueil
              </a>
              <span aria-hidden="true">/</span>
              <span>Audit gratuit</span>
            </nav>

            <div className="audit-offer-row">
              <span className="audit-offer-badge">Diagnostic gratuit offert par Digital Lab</span>
              <span className="audit-beta-badge">Version bêta</span>
            </div>

            <h1>Découvrez gratuitement ce qui freine votre site</h1>
            <p>
              Un diagnostic Digital Lab pour comprendre ce qui limite la confiance, la visibilité et les demandes
              clients, avec des priorités expliquées simplement.
            </p>
            <div className="audit-landing-actions" id="audit-launch">
              <a
                className="btn btn-primary"
                href={auditLaunchHref}
                target={isExternalLink(auditLaunchHref) ? "_blank" : undefined}
                rel={isExternalLink(auditLaunchHref) ? "noreferrer" : undefined}
                onClick={handleLaunchClick}
              >
                Lancer mon audit gratuit <strong>→</strong>
              </a>
            </div>

            <ul className="audit-trust-points" aria-label="Rassurances sur l’audit gratuit">
              {[
                "Résultats expliqués simplement",
                "Priorités classées par impact",
                "Aucun accès technique à votre site nécessaire",
              ].map((point) => (
                <li key={point}>
                  <span aria-hidden="true">✓</span>
                  {point}
                </li>
              ))}
            </ul>

            <p className="audit-beta-note">
              Version bêta gratuite — capacité quotidienne limitée pendant la phase de test.
            </p>
            {!isAuditAppUrlConfigured && (
              <div className="audit-availability-note" role="status">
                <p>L’audit gratuit sera bientôt rouvert aux nouveaux tests bêta.</p>
                <a
                  href="/#contact"
                  onClick={(event) => {
                    event.preventDefault();
                    trackAuditCta(auditEvents.assistanceClick, "audit_landing_beta_contact");
                    onNavigate("/#contact");
                  }}
                >
                  Demander un accès testeur
                </a>
              </div>
            )}
          </div>

          <AuditVideoCard compact />
        </div>
      </section>

      <section className="section audit-details-section" id="audit-details">
        <div className="section-inner audit-detail-grid">
          <article className="audit-info-card premium-card gradient-border">
            <span>Ce que l’audit analyse</span>
            <h2>Les signaux qui influencent la visibilité et la confiance</h2>
            <div className="audit-chip-grid">
              {auditSignals.map((signal) => (
                <span key={signal}>{signal}</span>
              ))}
            </div>
          </article>

          <article className="audit-info-card premium-card gradient-border">
            <span>Ce que vous recevez</span>
            <h2>Des priorités lisibles, pas un rapport technique interminable</h2>
            <ul className="audit-detail-list">
              {auditDeliverables.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="section audit-positioning-section">
        <div className="section-inner audit-positioning-panel premium-card premium-card-hero gradient-border">
          <div>
            <span>Pourquoi c’est différent</span>
            <h2>Pourquoi utiliser Digital Lab Audit s’il existe déjà d’autres outils ?</h2>
          </div>
          <p>
            Les grandes plateformes SEO sont très puissantes pour les spécialistes. Digital Lab Audit a été conçu pour
            les dirigeants de petites entreprises qui veulent comprendre rapidement ce qui peut freiner la visibilité,
            la confiance et les demandes clients, sans devoir interpréter un rapport technique complexe.
          </p>
        </div>
      </section>

      <section className="section audit-ecosystem-section">
        <div className="section-inner">
          <div className="section-heading">
            <span>Écosystème Digital Lab</span>
            <h2>Du diagnostic aux améliorations concrètes</h2>
            <p>
              Le diagnostic identifie les priorités. Digital Lab peut ensuite vous aider à les transformer en
              améliorations concrètes.
            </p>
          </div>

          <div className="audit-ecosystem-grid">
            {[
              "AI Website Transformation",
              "Optimisation et corrections",
              "Stratégie digitale",
              "Automatisation métier",
            ].map((item) => (
              <article className="audit-ecosystem-card premium-card gradient-border soft-hover" key={item}>
                <span aria-hidden="true">✦</span>
                <h3>{item}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section audit-data-section">
        <div className="section-inner audit-data-grid">
          <article>
            <span>Pourquoi gratuit aujourd’hui ?</span>
            <h2>Une bêta ouverte pour améliorer le diagnostic</h2>
            <p>
              L’accès gratuit permet de tester la clarté des analyses, d’améliorer les priorités proposées et de
              vérifier que le rapport reste utile pour les petites structures.
            </p>
          </article>
          <article>
            <span>Données</span>
            <h2>Une approche sobre des informations traitées</h2>
            <p>
              Le parcours doit uniquement utiliser les informations nécessaires au diagnostic du site et au suivi de la
              demande. Les pages de résultats individuelles ne doivent pas être indexées.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}

function AuditFooterReminder({ onNavigate, isEnglish = false }) {
  return (
    <section className="audit-footer-reminder" aria-label={isEnglish ? "Free audit reminder" : "Rappel audit gratuit"}>
      <div className="section-inner audit-footer-reminder-inner">
        <h2>{isEnglish ? "Does your site really inspire trust?" : "Votre site inspire-t-il vraiment confiance ?"}</h2>
        <a
          className="btn btn-primary"
          href={auditLaunchHref}
          target={isExternalLink(auditLaunchHref) ? "_blank" : undefined}
          rel={isExternalLink(auditLaunchHref) ? "noreferrer" : undefined}
          onClick={(event) => {
            handleAuditLaunchClick(event, {
              eventName: auditEvents.footerCta,
              location: "footer_reminder",
              onNavigate,
            });
          }}
        >
          {isEnglish ? "Start my free audit" : "Lancer mon audit gratuit"}
        </a>
      </div>
    </section>
  );
}

// English aria-labels for the footer social links on /en/ (LOT DL 2.5.1) —
// keyed the same way as socialLinks, hrefs untouched.
const englishSocialLinkAriaLabels = {
  linkedin: "View Digital Lab's LinkedIn profile",
  github: "View Digital Lab's GitHub profile",
  instagram: "View Digital Lab's Instagram account",
  facebook: "View Digital Lab's Facebook page",
};

function SiteFooter({ onNavigate, isEnglish = false }) {
  return (
    <footer className="footer">
      <div className="footer-smoke" aria-hidden="true"></div>
      <div className="footer-inner">
        <div className="footer-column footer-brand-column">
          <a className="footer-brand" href="/#" onClick={(event) => {
            event.preventDefault();
            onNavigate("/#");
          }}>
            <img src="/logo-digital-lab.png" alt="Digital Lab" />
            <span>Digital Lab</span>
          </a>
          <p>
            {isEnglish
              ? "Digital transformation, AI, and automation for small businesses, freelancers, and nonprofits."
              : "Transformation digitale, IA & automatisation pour PME, indépendants et associations."}
          </p>
        </div>

        <div className="footer-column">
          <h3>Navigation</h3>
          <nav className="footer-nav" aria-label={isEnglish ? "Footer navigation" : "Navigation de pied de page"}>
            {navLinks.map((link, index) => (
              <a
                href={link.href}
                key={link.href}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(link.href);
                }}
              >
                {isEnglish ? englishNavLabels[index] : link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="footer-column footer-contact-column">
          <h3>Contact</h3>
          <div className="footer-links">
            <a
              className="footer-contact-link"
              href={`mailto:${businessContact.email}`}
              aria-label={isEnglish ? "Email Digital Lab" : "Envoyer un e-mail à Digital Lab"}
            >
              <ContactIcon type="mail" />
              <span>{businessContact.email}</span>
            </a>
            <a
              className="footer-contact-link"
              href={businessContact.phoneHref}
              aria-label={isEnglish ? "Call Digital Lab" : "Appeler Digital Lab"}
            >
              <ContactIcon type="phone" />
              <span>{businessContact.phoneDisplay}</span>
            </a>
            <a
              className="footer-contact-link"
              href={businessContact.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isEnglish ? "Open the Digital Lab website" : "Ouvrir le site Digital Lab"}
            >
              <ContactIcon type="globe" />
              <span>{businessContact.siteDisplay}</span>
            </a>
            <div
              className="footer-social-links"
              role="group"
              aria-label={isEnglish ? "Digital Lab social media" : "Réseaux sociaux Digital Lab"}
            >
              {socialLinks.map((socialLink) => (
                <a
                  className="social-icon-link"
                  href={socialLink.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={isEnglish ? englishSocialLinkAriaLabels[socialLink.key] : socialLink.label}
                  title={socialLink.title}
                  key={socialLink.key}
                >
                  <ContactIcon type={socialLink.key} />
                </a>
              ))}
            </div>
            <span className="footer-contact-link footer-contact-static">
              <ContactIcon type="mapPin" />
              <span>Belfort, France</span>
            </span>
            <span className="footer-siret">SIRET : 10575928600013</span>
          </div>
        </div>

        <div className="footer-column">
          <h3>{isEnglish ? "Our expertise" : "Nos expertises"}</h3>
          <div className="footer-stack" role="group" aria-label={isEnglish ? "Digital Lab expertise" : "Expertises Digital Lab"}>
            {footerExpertise.map((tool) => (
              <span key={tool}>{tool}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 Digital Lab — Olena Mykhalska</span>
        <a href="/mentions-legales" onClick={(event) => {
          event.preventDefault();
          onNavigate("/mentions-legales");
        }}>
          {isEnglish ? "Legal notice" : "Mentions légales"}
        </a>
      </div>
    </footer>
  );
}

function LegalNoticePage({ onNavigate }) {
  return (
    <main className="legal-page fade-in-page">
      <section className="legal-hero">
        <div className="case-bg" aria-hidden="true"></div>
        <div className="case-shell">
          <button className="back-button" type="button" onClick={() => onNavigate("/")}>
            Retour
          </button>

          <div className="legal-panel">
            <span>Informations légales</span>
            <h1>Mentions légales</h1>
            <div className="legal-grid">
              <article>
                <h2>Éditeur du site</h2>
                <p>Olena Mykhalska — Digital Lab</p>
                <p>Entrepreneure individuelle</p>
                <p>SIREN : 105 759 286</p>
                <p>SIRET : 105 759 286 00013</p>
                <p>Belfort, France</p>
                <p>Email : <a href={`mailto:${businessContact.email}`}>{businessContact.email}</a></p>
                <p>Téléphone : <a href={businessContact.phoneHref}>{businessContact.phoneDisplay}</a></p>
                <p>Site : <a href={businessContact.url}>{businessContact.url}</a></p>
              </article>

              <article>
                <h2>Hébergement</h2>
                <p>Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis.</p>
              </article>

              <article>
                <h2>Propriété intellectuelle</h2>
                <p>
                  Les contenus, textes, images, vidéos et éléments graphiques présents sur ce site sont protégés.
                  Toute reproduction sans autorisation est interdite.
                </p>
              </article>

              <article>
                <h2>Données personnelles</h2>
                <p>
                  Les informations envoyées par email ou via un formulaire sont utilisées uniquement pour répondre
                  aux demandes de contact.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// LOT DL 2.5.5 — English homepage parity. The English homepage now mirrors
// the French homepage's full section structure (same components, same
// media, same order). Rather than a second copy of every section, each
// array below supplies English text for the exact same data-driven
// sections the French homepage already renders, keyed positionally to the
// French arrays above. Linked service/project detail pages stay
// French-only in this LOT — only the homepage itself is bilingual — so
// hrefs, slugs, images, and videos are reused unchanged.

// Translated overrides for `services`, merged positionally in englishServices below.
const englishServiceTranslations = [
  {
    title: "Website creation",
    summary: "Build a presence that inspires trust.",
    problem: "Your business lacks a reliable entry point to inspire trust and receive requests.",
    canDo: "I structure your pages, clarify your message, and build a smooth path to contact.",
    expectedResult:
      "A site that's ready to share, easy to read on every screen, and aligned with your business goals.",
    details: ["Showcase site", "Landing page", "WordPress", "Contact form", "Responsive", "Going live"],
  },
  {
    title: "Site repair & recovery",
    summary: "Get back a site that's reliable and pleasant to use.",
    problem: "Your site is slow, unstable, poorly displayed, or hard to manage day to day.",
    canDo: "I identify the blocking points, fix the user journeys, and clean up the technical foundations.",
    expectedResult: "A more stable, smoother site that reassures your visitors.",
    details: ["Bugs", "Mobile", "Forms", "Speed", "Backups", "Security"],
  },
  {
    title: "SEO & visibility",
    summary: "Help the right people find you.",
    problem: "Your site exists, but it isn't capturing enough qualified traffic.",
    canDo: "I clarify the structure, key pages, and content to better present your offer.",
    expectedResult: "A site that's easier for visitors to read and better prepared for Google.",
    details: ["SEO tags", "Heading structure", "Copy", "Alt text", "Internal linking", "Performance"],
  },
  {
    title: "Business automation",
    summary: "Free up time for what matters.",
    problem: "Your follow-up relies on too much copy-pasting, manual messages, or scattered files.",
    canDo: "I connect the important steps to centralize requests and make follow-up reliable.",
    expectedResult:
      "Less wasted time, fewer things falling through the cracks, and a more sustainable organization.",
    details: ["Forms", "Notifications", "Lightweight CRM", "Google Sheets", "Dashboards", "Client tracking"],
  },
  {
    title: "AI chatbots & assistants",
    summary: "Guide your visitors before the first conversation.",
    problem: "You receive repetitive questions, and some requests get lost for lack of a quick answer.",
    canDo: "I design a useful, unobtrusive assistant focused on your clients' real needs.",
    expectedResult: "Better-guided visitors and requests that are easier to handle.",
    details: ["FAQ", "Prequalification", "Booking", "Collection", "Scenarios", "Integration"],
  },
  {
    title: "MVPs & web prototypes",
    summary: "Test quickly before investing further.",
    problem: "You have an idea, but need to make it concrete before investing further.",
    canDo: "I build a targeted version to show, test, and quickly adjust the concept.",
    expectedResult: "A concrete prototype to decide on next steps with more confidence.",
    details: ["Prototype", "Dashboard", "Client area", "User journey", "Demo", "Iterations"],
  },
];

const englishServices = services.map((service, index) => ({
  ...service,
  ...englishServiceTranslations[index],
}));

// Translated overrides for `projects`, merged positionally in englishProjects below.
const englishProjectTranslations = [
  {
    title: "MicroAssist — Tax & Admin SaaS Assistant",
    subtitle: "A SaaS assistant that simplifies administrative tasks.",
    description:
      "An AI assistant for freelancers and micro-entrepreneurs: activity tracking, document generation, and simplified admin work.",
    tags: ["SaaS", "AI", "Automation", "Dashboard"],
    cta: "Request a demo",
    modal: {
      title: "A SaaS approach to simplifying client follow-up",
      description:
        "MicroAssist helps freelancers and micro-entrepreneurs stay ahead of charges and filings. It's built around a dashboard, automatic alerts, and a clear personal space.",
      adaptationTitle: "How could this be adapted to your business?",
      adaptations: [
        "For tutors / teachers: a student space, progress tracking, grades, assignments due, and a per-student dashboard.",
        "For sports coaches: personalized tracking of goals, sessions, performance, and appointment reminders.",
        "For trainers / consultants: session management, sign-ups, shared documents, and participant feedback.",
      ],
      cta: "Adapt this approach to my business →",
    },
  },
  {
    title: "Socle Local — Local Community Platform",
    subtitle: "A community platform connecting local life.",
    description:
      "A collaborative platform for residents, nonprofits, and local shops to make everyday exchanges and neighborhood services easier.",
    tags: ["Platform", "UX/UI", "Responsive", "Community"],
    cta: "Request a demo",
    modal: {
      title: "The power of a community platform for your ecosystem",
      description:
        "Socle Local centralizes listings, nonprofits, and neighborhood services. It's an adaptable base for building connections, organizing information, and enabling exchanges.",
      adaptationTitle: "How could this be adapted to your area or network?",
      adaptations: [
        "For a federation of nonprofits: a directory of member organizations, news, volunteer needs, and a shared calendar.",
        "For a network of local shops: featured offers, deals, hours, and contact details for participating businesses.",
        "For a town hall or community space: a workshop calendar, event sign-ups, and a directory of local services.",
      ],
      cta: "Adapt this platform to my area →",
    },
  },
  {
    title: "MicroAssist Expert — B2B Client Tracking",
    subtitle: "Multi-client tracking for professionals and experts.",
    description:
      "A B2B platform with dashboards, alerts, priorities, and automated multi-client tracking.",
    tags: ["B2B", "Dashboard", "Automation", "Prototype"],
    cta: "Request a demo",
    modal: {
      title: "A dashboard to manage several cases at once",
      description:
        "MicroAssist Expert lets you track multiple clients, view alerts, and prioritize actions. The goal: never lose track of what matters.",
      adaptationTitle: "How could this be adapted to your process?",
      adaptations: [
        "For accountants: client case tracking, filing alerts, missing documents, and priorities.",
        "For nonprofit managers: membership tracking, volunteers, incoming requests, and task distribution.",
        "For freelancers or small teams: an overview of projects, deadlines, tasks, and workload.",
      ],
      cta: "Adapt this dashboard to my process →",
    },
  },
  {
    title: "AI Booking Assistant",
    subtitle: "A conversational assistant for bookings and client requests.",
    description:
      "A conversational assistant that qualifies client requests, automates bookings, and orchestrates business workflows.",
    tags: ["AI", "Chatbot", "Automation", "Workflow"],
    cta: "Request a demo",
    modal: {
      title: "A conversational assistant to automate first requests",
      description:
        "This assistant answers frequent questions, collects useful information, and guides the client toward a booking or a first contact.",
      adaptationTitle: "How could this be adapted to your business?",
      adaptations: [
        "For restaurants: booking requests, hours, availability, menus, and automatic answers to common questions.",
        "For salons / studios: appointment booking, service selection, practical information, and automatic reminders.",
        "For nonprofits or events: sign-ups, FAQs, request collection, and participant guidance.",
      ],
      cta: "Build an assistant for my business →",
    },
  },
];

const englishProjects = projects.map((project, index) => ({
  ...project,
  ...englishProjectTranslations[index],
}));

const englishMissionStepTranslations = [
  { title: "Clear conversation", text: "Everything starts with your business reality, not a rigid spec sheet." },
  { title: "Useful direction", text: "The solution is scoped around your priorities, budget, and clients." },
  { title: "First version", text: "You quickly validate something concrete before going further." },
  { title: "Going live", text: "Final adjustments ensure a reliable, ready-to-use delivery." },
  { title: "Evolution", text: "The project stays built to support your business over time." },
];

const englishMissionSteps = missionSteps.map((step, index) => ({
  ...step,
  ...englishMissionStepTranslations[index],
}));

const englishMethodBadges = ["No jargon", "Controlled budget", "Clear decisions", "Gradual evolution", "Long-term follow-up"];

const englishImprovementCardTranslations = [
  {
    title: "Receive better-qualified requests",
    text: "A better-designed journey helps visitors understand your offer and take action.",
  },
  {
    title: "Spend less time on repetitive tasks",
    text: "Manual steps are streamlined so you can focus your energy on the decisions that matter.",
  },
  {
    title: "Inspire trust from the first few seconds",
    text: "Your digital presence conveys a reliable, consistent, and professional impression.",
  },
  {
    title: "Keep better track of your requests",
    text: "Important information is grouped together to avoid missed details and scattered conversations.",
  },
  {
    title: "Be easier to find",
    text: "A clear structure strengthens your visibility and helps Google understand your business.",
  },
  {
    title: "Build a durable foundation",
    text: "The project can start simply, then evolve with your real needs.",
  },
];

const englishImprovementCards = improvementCards.map((card, index) => ({
  ...card,
  ...englishImprovementCardTranslations[index],
}));

const englishIncludedProjectItemTranslations = [
  { title: "Basic SEO", text: "Essential tags and a clear structure." },
  { title: "Responsive", text: "A smooth experience on every screen." },
  { title: "Performance", text: "Fast loading and comfortable navigation." },
  { title: "Security", text: "Foundations configured with care." },
  { title: "Scalable", text: "A foundation ready to grow." },
  { title: "Support", text: "Answers after delivery." },
];

const englishIncludedProjectItems = includedProjectItems.map((item, index) => ({
  ...item,
  ...englishIncludedProjectItemTranslations[index],
}));

const englishTrustCardTranslations = [
  {
    title: "Business language before technical jargon",
    text: "Choices are explained by their concrete impact on your business.",
  },
  {
    title: "Faster decisions",
    text: "A first version lets you validate the direction without losing weeks.",
  },
  {
    title: "A complete picture",
    text: "Website, tool, automation, or assistant: every piece serves a specific goal.",
  },
  {
    title: "A trusted relationship",
    text: "Support built with method, listening, and continuity.",
  },
];

const englishTrustCards = trustCards.map((card, index) => ({
  ...card,
  ...englishTrustCardTranslations[index],
}));

const englishTrustBadges = [
  "WordPress",
  "Front-end",
  "UX/UI",
  "SEO",
  "Automation",
  "MVP",
  "Responsive",
  "Dashboards",
  "Conversational AI",
];

const englishProofStatTranslations = [
  { label: "Tailor-made project", text: "A solution designed around your business, goals, and budget." },
  { label: "Web creation & automation" },
  { label: "UX/UI, SEO & dashboards" },
  { label: "Clear, results-driven approach" },
];

const englishProofStats = proofStats.map((stat, index) => ({
  ...stat,
  ...englishProofStatTranslations[index],
}));

const englishProofWorkflowTranslations = [
  { title: "Idea", text: "Clarify the need and the priorities." },
  { title: "Prototype", text: "Create a first visible version." },
  { title: "Adjustments", text: "Refine pages, content, and details." },
  { title: "Going live", text: "Publish a clean, usable version." },
  { title: "Evolution", text: "Add SEO, automation, or new pages." },
];

const englishProofWorkflow = proofWorkflow.map((step, index) => ({
  ...step,
  ...englishProofWorkflowTranslations[index],
}));

const englishArticleTranslations = [
  {
    title: "How do you know if your site needs a redesign?",
    description: "The signs that show a site is becoming hard to use, slow, or ineffective.",
    tags: ["SEO", "UX", "Website"],
  },
  {
    title: "3 signs your site is losing you clients",
    description: "Confusing navigation, slow loading, lack of clarity: details that can block inquiries.",
    tags: ["Conversion", "Performance", "UX"],
  },
  {
    title: "Automating without complicating your business",
    description: "Simple automations to save time without overhauling your entire organization.",
    tags: ["Automation", "Small business", "Workflow"],
  },
  {
    title: "Should you build an MVP before the real project?",
    description: "Why starting small can help you test an idea before investing further.",
    tags: ["MVP", "Prototype", "Strategy"],
  },
];

const englishArticles = articles.map((article, index) => ({
  ...article,
  ...englishArticleTranslations[index],
}));

const englishAuditBenefits = ["A clear score", "3 priority risks", "A concrete action plan"];

const englishFaqItems = [
  {
    question: "I'm not exactly sure what I need.",
    answer: "That's common. I'll help you clarify the need, the priorities, and the best first step.",
  },
  {
    question: "Do you work with small budgets?",
    answer: "Yes. The project can start with a targeted version, then evolve based on your resources and feedback.",
  },
  {
    question: "Can you take over an existing site?",
    answer: "Yes. I can fix, reorganize, or improve a site that's already live.",
  },
  {
    question: "How long does a project take?",
    answer: "It depends on the scope. A first, targeted version often allows for quick progress.",
  },
  {
    question: "Can we start small and add features later?",
    answer: "Yes. The goal is to build a reliable foundation, then add what becomes useful.",
  },
  {
    question: "Do you work with nonprofits and small organizations?",
    answer: "Yes. I support entrepreneurs, nonprofits, and local projects that want to move forward with method.",
  },
];

// Estimator option pairs: `value` is the exact French string the pricing
// engine (utils/estimator.js) keys off — kept unchanged so the calculator's
// business logic never has to know about language. `label` is what's shown
// on screen. English answers are still stored/compared as `value`.
const estimatorProfileOptions = [
  { value: "Indépendant", label: "Freelancer / independent" },
  { value: "Association", label: "Nonprofit / association" },
  { value: "Commerce local", label: "Local shop" },
  { value: "Restaurant / service", label: "Restaurant / service business" },
  { value: "Projet en création", label: "Project in the works" },
  { value: "Autre", label: "Other" },
];

const estimatorPriorityOptions = [
  { value: "Être visible", label: "Get found online" },
  { value: "Recevoir plus de demandes", label: "Get more inquiries" },
  { value: "Gagner du temps", label: "Save time" },
  { value: "Réparer un site existant", label: "Fix an existing site" },
  { value: "Tester une idée", label: "Test an idea" },
  { value: "Automatiser une tâche", label: "Automate a task" },
];

const estimatorNeedOptions = [
  { value: "Créer un site web", label: "Create a website" },
  { value: "Réparer / améliorer un site existant", label: "Repair / improve an existing site" },
  { value: "Optimiser SEO & visibilité", label: "Optimize SEO & visibility" },
  { value: "Ajouter une automatisation", label: "Add an automation" },
  { value: "Créer un chatbot / assistant IA", label: "Create an AI chatbot / assistant" },
  { value: "Créer un MVP ou prototype web", label: "Create an MVP or web prototype" },
];

const estimatorExistingOptions = [
  { value: "Oui", label: "Yes" },
  { value: "Non", label: "No" },
  { value: "Partiellement", label: "Partially" },
];

const estimatorContentOptions = [
  { value: "Textes et images prêts", label: "Text and images ready" },
  { value: "Quelques éléments seulement", label: "A few elements only" },
  { value: "Je pars de zéro", label: "Starting from scratch" },
];

const estimatorComplexityOptions = [
  { value: "Simple : page ou fonctionnalité basique", label: "Simple: a page or basic feature" },
  { value: "Standard : plusieurs pages ou plusieurs fonctions", label: "Standard: several pages or features" },
  {
    value: "Avancé : espace utilisateur, tableau de bord, automatisation ou IA",
    label: "Advanced: client area, dashboard, automation, or AI",
  },
];

const estimatorFeatureOptions = [
  { value: "Formulaire de contact", label: "Contact form" },
  { value: "Réservation", label: "Booking" },
  { value: "Email automatique", label: "Automatic emails" },
  { value: "Google Sheets / CRM", label: "Google Sheets / CRM" },
  { value: "Tableau de bord", label: "Dashboard" },
  { value: "Paiement", label: "Payments" },
  { value: "Chatbot", label: "Chatbot" },
  { value: "SEO", label: "SEO" },
  { value: "Maintenance", label: "Maintenance" },
];

const estimatorUrgencyOptions = [
  { value: "Normal", label: "Normal" },
  { value: "Rapide", label: "Fast" },
  { value: "Urgent", label: "Urgent" },
];

// Translates the pricing engine's French output for display only — the
// engine itself (utils/estimator.js) keeps matching on French option
// values, so its budget/complexity logic never changes between languages.
function translateEstimatorResult(result, isEnglish) {
  if (!isEnglish) {
    return result;
  }

  const typeLabels = { Simple: "Simple", Intermédiaire: "Intermediate", Avancé: "Advanced" };
  const messages = {
    Simple: "Your need looks well-defined. A short intervention is likely enough to move fast.",
    Intermédiaire: "Your project involves several elements to coordinate. A clear first version can be built quickly.",
    Avancé:
      "Your project involves several features or workflows. A precise scoping phase will help secure the budget and the steps.",
  };
  const budgetAmount = result.budget.match(/(\d+)/)?.[1];

  return {
    type: typeLabels[result.type] ?? result.type,
    budget: budgetAmount ? `from €${budgetAmount}` : result.budget,
    delay: result.delay
      .replace(/(\d+)–(\d+) jours ouvrés/, "$1–$2 business days")
      .replace(/(\d+)–(\d+) semaines/, "$1–$2 weeks"),
    message: messages[result.type] ?? result.message,
  };
}

const contactProjectTypeOptions = [
  { value: "Site web", label: "Website" },
  { value: "Réparation / amélioration", label: "Repair / improvement" },
  { value: "SEO & visibilité", label: "SEO & visibility" },
  { value: "Automatisation", label: "Automation" },
  { value: "Chatbot / assistant IA", label: "AI chatbot / assistant" },
  { value: "MVP / prototype", label: "MVP / prototype" },
  { value: "Autre", label: "Other" },
];

function EnglishHomePage({ onNavigate, onAuthOpen }) {
  const [selectedProject, setSelectedProject] = useState(null);

  const handleAuditClick = (event) => {
    handleAuditLaunchClick(event, {
      eventName: auditEvents.homeCta,
      location: "en_homepage_hero",
      onNavigate,
    });
  };

  return (
    <main>
      <section className="hero">
        <div className="hero-smoke" aria-hidden="true">
          <div className="smoke-left"></div>
          <div className="smoke-right"></div>
          <div className="smoke-center"></div>
        </div>

        <div className="hero-content">
          <a
            href="/en/"
            className="logo"
            onClick={(event) => {
              event.preventDefault();
              onNavigate("/en/");
            }}
          >
            <img src="/logo-digital-lab.png" alt="Digital Lab" />
            <span>Digital Lab</span>
          </a>

          <div className="badge">
            <span></span>
            Digital studio for entrepreneurs
          </div>

          <h1 className="hero-title">
            <span className="hero-title-line">Turning your ideas</span>
            <span className="hero-title-line">
              into <span className="hero-title-accent">digital solutions</span>.
            </span>
          </h1>

          <p>
            Websites, automations, and AI tools designed to simplify day-to-day operations for small businesses.
          </p>

          <div className="hero-buttons">
            <a
              href={auditLaunchHref}
              className="btn btn-primary"
              target={isExternalLink(auditLaunchHref) ? "_blank" : undefined}
              rel={isExternalLink(auditLaunchHref) ? "noreferrer" : undefined}
              onClick={handleAuditClick}
            >
              Start my free audit <strong>→</strong>
            </a>

            <a href="#en-services" className="btn btn-secondary">
              Explore our services
            </a>
          </div>
        </div>
      </section>

      <section className="section brand-story-section reveal-on-scroll reveal-section">
        <div className="section-inner about-layout">
          <div className="section-heading">
            <span>Why Digital Lab?</span>
            <h2>Technology should simplify your work, not complicate it.</h2>
          </div>

          <div className="about-content glass-card premium-card gradient-border soft-hover">
            <p>Many small business owners spend more time managing their tools than growing their business.</p>
            <p>
              Digital Lab was built on a simple idea: a digital tool should help you decide, organize, and move
              forward with more confidence.
            </p>
            <p>
              We design for the long run, with reliable foundations that evolve step by step as your needs grow.
            </p>
          </div>
        </div>
      </section>

      <AuditSpotlightSection onNavigate={onNavigate} isEnglish />

      <section className="section services-section reveal-on-scroll reveal-section" id="en-services">
        <div className="section-inner">
          <div className="section-heading">
            <span>Services</span>
            <h2>Tools built around your business</h2>
            <p>Each service solves a concrete need: getting found, saving time, or steering your project with more clarity.</p>
          </div>

          <div className="services-accordion">
            {englishServices.map((service) => (
              <ServiceAccordionCard key={service.title} service={service} onNavigate={onNavigate} isEnglish />
            ))}
          </div>
        </div>
      </section>

      <AIWebsiteTransformationSection isEnglish />

      <section className="section projects-section reveal-on-scroll reveal-section" id="en-work">
        <div className="section-inner">
          <div className="section-heading">
            <span>Projects</span>
            <h2>Featured projects</h2>
          </div>

          <div className="ai-lab-intro glass-section premium-card premium-card-hero gradient-border soft-hover">
            <div className="ai-lab-intro-copy">
              <span className="ai-lab-kicker">Lab &amp; experimentation</span>
              <h3>AI innovation lab</h3>
              <p>
                These projects make up my AI innovation lab for businesses. I design and build SaaS solutions, AI
                assistants, business tools, and automations aimed at improving operational processes.
              </p>
            </div>
            <p className="ai-lab-technologies">
              Claude <span>•</span> ChatGPT <span>•</span> Cursor <span>•</span> Lovable <span>•</span> React
              <span>•</span> Supabase <span>•</span> APIs <span>•</span> WordPress <span>•</span> JavaScript
              <span>•</span> GitHub <span>•</span> Vercel
            </p>
          </div>

          <div className="cards-grid project-grid">
            {englishProjects.map((project) => (
              <article
                className="glass-card project-card premium-card gradient-border soft-hover"
                key={project.title}
                onMouseEnter={handleProjectEnter}
                onMouseLeave={handleProjectLeave}
              >
                <div className="project-media">
                  {project.image ? (
                    (() => {
                      const optimizedImage = getOptimizedImage(project.image);

                      return (
                        <img
                          className="project-image"
                          src={optimizedImage.src}
                          srcSet={optimizedImage.srcSet}
                          sizes="(max-width: 768px) 88vw, 420px"
                          alt={`Preview of the ${project.title} project`}
                          loading="lazy"
                          decoding="async"
                        />
                      );
                    })()
                  ) : (
                    <div className="project-placeholder"></div>
                  )}
                  {project.video && (
                    <DeferredVideo
                      muted
                      loop
                      playsInline
                      poster={getOptimizedImage(project.image).src}
                      src={project.video}
                      ariaLabel={`Video preview of the ${project.title} project`}
                    />
                  )}
                  <span className="project-media-overlay"></span>
                </div>
                <div className="project-body">
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <div className="tags">
                    {project.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="project-actions">
                    <button
                      className="project-detail-button"
                      type="button"
                      onClick={() => setSelectedProject(project)}
                    >
                      View details
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="ai-roadmap glass-section premium-card premium-card-subtle gradient-border soft-hover">
            <div className="ai-roadmap-heading">
              <span>AI roadmap</span>
              <h3>In development</h3>
              <p>
                New modules are being designed to strengthen the Digital Lab ecosystem around automation, generative
                AI, and business support.
              </p>
            </div>
            <ul className="ai-roadmap-list">
              <li className="premium-card roadmap-mini-card soft-hover"><strong>AI Website Transformation</strong><span>AI-assisted website redesign</span></li>
              <li className="premium-card roadmap-mini-card soft-hover"><strong>AI Growth Engine</strong><span>SEO and marketing content automation</span></li>
              <li className="premium-card roadmap-mini-card soft-hover"><strong>AI Workforce</strong><span>Specialized AI agent architecture</span></li>
            </ul>
            <p className="ai-roadmap-note">
              These projects are currently in design or prototyping and will be released progressively.
            </p>
          </div>
        </div>
      </section>

      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} isEnglish />

      <ProjectEstimator isEnglish />

      <BlogCarousel isEnglish />

      <section className="section method-section reveal-on-scroll reveal-section" id="en-method">
        <div className="section-inner">
          <div className="section-heading">
            <span>Method</span>
            <h2>A method designed for calm decisions</h2>
            <p>Every step turns an idea into concrete choices, without unnecessary jargon.</p>
          </div>

          <div className="method-timeline">
            {englishMissionSteps.map((step) => (
              <article className="method-step" key={step.title}>
                <div className="method-step-marker">
                  <span>{step.number}</span>
                </div>
                <div className="method-step-card premium-card gradient-border soft-hover">
                  <span className="method-step-icon" aria-hidden="true">
                    {step.icon}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="method-badges" role="group" aria-label="Method guarantees">
            {englishMethodBadges.map((badge) => (
              <span className="badge-pill" key={badge}>✓ {badge}</span>
            ))}
          </div>

          <div className="method-reassurance glass-section premium-card premium-card-subtle gradient-border soft-hover">
            <span aria-hidden="true">✓</span>
            <p>Digital Lab exists to make technology more useful, more reliable, and more durable for entrepreneurs.</p>
          </div>
        </div>
      </section>

      <section className="section about-section reveal-on-scroll reveal-section" id="en-about">
        <div className="section-inner about-layout">
          <div className="section-heading">
            <span>About</span>
            <h2>A studio born from real entrepreneurial experience</h2>
          </div>

          <div className="about-content glass-card premium-card gradient-border soft-hover">
            <p>
              Before Digital Lab, there are more than 25 years of entrepreneurship: clients to understand, budgets
              to arbitrate, shifting priorities, and decisions to make fast.
            </p>
            <p>
              That experience now feeds a digital project lead's approach: building concrete solutions, useful day
              to day, able to support a business over time.
            </p>

            <ul className="about-list">
              <li>Understanding of on-the-ground realities</li>
              <li>Decisions guided by real-world use</li>
              <li>Practical, reliable, scalable solutions</li>
              <li>A human, ongoing relationship</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section trust-section reveal-on-scroll reveal-section">
        <div className="section-inner">
          <div className="section-heading">
            <span>Trust</span>
            <h2>An approach centered on your business reality</h2>
            <p>Technology is never the starting point. It serves your organization, your clients, and your growth.</p>
          </div>

          <div className="trust-grid">
            {englishTrustCards.map((card) => (
              <article className="trust-card premium-card gradient-border soft-hover" key={card.title}>
                <span className="trust-icon" aria-hidden="true">
                  {card.icon}
                </span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>

          <div className="trust-badges" role="group" aria-label="Skills and tools">
            {englishTrustBadges.map((badge) => (
              <span className="badge-pill" key={badge}>✓ {badge}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="section proof-section reveal-on-scroll reveal-section">
        <div className="section-inner">
          <div className="section-heading">
            <span>Proof &amp; trust</span>
            <h2>Concrete experience, designed to move forward with precision</h2>
            <p>Projects designed to make ideas clearer, exchanges smoother, and decisions safer.</p>
          </div>

          <div className="proof-stats">
            {englishProofStats.map((stat) => (
              <article className="proof-stat-card premium-card gradient-border soft-hover" key={stat.label}>
                <span className="proof-icon" aria-hidden="true">
                  {stat.icon}
                </span>
                <strong>
                  {typeof stat.value === "number" ? (
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  ) : (
                    stat.label
                  )}
                </strong>
                {(stat.text || typeof stat.value === "number") && <p>{stat.text || stat.label}</p>}
              </article>
            ))}
          </div>

          <div className="proof-stack-panel premium-card gradient-border soft-hover">
            <div>
              <span>Tools</span>
              <h3>A lean stack, chosen based on the need</h3>
            </div>
            <div className="proof-stack">
              {proofStack.map((tool) => (
                <span key={tool}>{tool}</span>
              ))}
            </div>
          </div>

          <div className="proof-workflow" role="group" aria-label="A quick look at the real workflow">
            {englishProofWorkflow.map((step) => (
              <article className="proof-workflow-step premium-card gradient-border soft-hover" key={step.title}>
                <span aria-hidden="true">{step.icon}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>

          <div className="proof-highlight premium-card premium-card-subtle gradient-border soft-hover">
            <span aria-hidden="true">✓</span>
            <p>I support entrepreneurs who want to move forward with method, without unnecessary complexity.</p>
          </div>
        </div>
      </section>

      <section className="section faq-section reveal-on-scroll reveal-section" id="en-faq">
        <div className="section-inner">
          <div className="section-heading">
            <span>FAQ</span>
            <h2>Frequently asked questions</h2>
          </div>

          <div className="faq-list">
            {englishFaqItems.map((item) => (
              <details className="faq-item" key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section improvements-section reveal-on-scroll reveal-section">
        <div className="section-inner">
          <div className="section-heading">
            <span>Impact</span>
            <h2>What your project can improve</h2>
            <p>A good digital tool should support your business, not just exist online.</p>
          </div>

          <div className="improvements-grid">
            {englishImprovementCards.map((card) => (
              <article className="improvement-card premium-card gradient-border soft-hover" key={card.title}>
                <span className="improvement-icon" aria-hidden="true">
                  {card.icon}
                </span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section included-section reveal-on-scroll reveal-section">
        <div className="section-inner">
          <div className="section-heading">
            <span>Included</span>
            <h2>What's included in every project</h2>
            <p>The essential foundations are built in from delivery.</p>
          </div>

          <div className="included-grid">
            {englishIncludedProjectItems.map((item) => (
              <article className="included-card premium-card gradient-border soft-hover" key={item.title}>
                <span className="included-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          <div className="included-reassurance">
            <div>
              <span>✓ No hidden costs</span>
              <span>✓ Best practices built in</span>
              <span>✓ Solution ready to evolve</span>
            </div>
            <p>You get a solution built to last, not just a web page.</p>
          </div>
        </div>
      </section>

      <section className="section contact-section reveal-on-scroll reveal-section" id="en-contact">
        <div className="section-inner contact-panel">
          <div className="contact-copy">
            <span>Contact</span>
            <h2>Let's talk about your project.</h2>
            <p>Even if your idea is still unclear, a first conversation can help clarify the right direction.</p>
          </div>

          <ul className="contact-points">
            <li>website or redesign</li>
            <li>improving an existing site</li>
            <li>SEO &amp; visibility</li>
            <li>useful automation</li>
            <li>prototype or MVP</li>
          </ul>

          <div className="contact-badges" role="group" aria-label="Reassuring information">
            <span>✓ No-jargon first conversation</span>
            <span>✓ Concrete scoping</span>
            <span>✓ Ongoing relationship</span>
          </div>

          <address className="contact-details">
            <div className="contact-brand-block">
              <strong>{businessContact.brand}</strong>
              <span>Digital transformation • AI • Automation</span>
            </div>

            <div className="contact-founder-block">
              <strong>{businessContact.name}</strong>
              <span>Founder &amp; Digital Project Lead</span>
            </div>

            <div className="contact-link-list" role="group" aria-label="Digital Lab contact details">
              <a href={`mailto:${businessContact.email}`} aria-label="Email Digital Lab">
                <ContactIcon type="mail" />
                <span>{businessContact.email}</span>
              </a>
              <a href={businessContact.phoneHref} aria-label="Call Digital Lab">
                <ContactIcon type="phone" />
                <span>{businessContact.phoneDisplay}</span>
              </a>
              <a
                href={businessContact.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open the Digital Lab website"
              >
                <ContactIcon type="globe" />
                <span>{businessContact.siteDisplay}</span>
              </a>
            </div>

            <div className="contact-social-links" role="group" aria-label="Professional profiles">
              {socialLinks.map((socialLink) => (
                <a
                  className="social-icon-link"
                  href={socialLink.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={englishSocialLinkAriaLabels[socialLink.key]}
                  title={englishSocialLinkAriaLabels[socialLink.key]}
                  key={socialLink.key}
                >
                  <ContactIcon type={socialLink.key} />
                </a>
              ))}
            </div>
          </address>

          <ContactForm onAuthOpen={onAuthOpen} isEnglish />

          <div className="contact-actions">
            <a className="btn btn-primary contact-cta-primary" href={`mailto:${businessContact.email}?subject=Digital%20Lab%20project%20inquiry`}>
              Send an email
            </a>
            <a className="btn btn-secondary contact-cta-secondary" href={`mailto:${businessContact.email}?subject=Digital%20Lab%20project%20discussion`}>
              Discuss the project
            </a>
          </div>

          <p className="contact-response-note">I typically reply within 24–48h.</p>
        </div>
      </section>
    </main>
  );
}

function ProjectCasePage({ project, onNavigate }) {
  if (!project) {
    return (
      <main className="case-page fade-in-page">
        <section className="case-hero case-not-found">
          <div className="case-shell">
            <button className="back-button" type="button" onClick={() => onNavigate("/")}>
              Retour aux projets
            </button>
            <div className="case-hero-copy">
              <span>Projet introuvable</span>
              <h1>Cette étude de cas n’existe pas encore.</h1>
              <p>Revenez à la page principale pour consulter les projets disponibles.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="case-page fade-in-page">
      <section className="case-hero">
        <div className="case-bg" aria-hidden="true"></div>
        <div className="case-shell">
          <button className="back-button" type="button" onClick={() => onNavigate("/#projets")}>
            Retour
          </button>

          <div className="case-hero-grid">
            <div className="case-hero-copy">
              <span>Étude de cas</span>
              <h1>{project.title}</h1>
              <p>{project.subtitle}</p>
              <div className="case-actions">
                <a className="btn btn-primary" href={`mailto:${businessContact.email}`}>
                  {project.cta}
                </a>
                {project.demoUrl && (
                  <a
                    className="btn btn-secondary"
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {project.demoCtaLabel ?? "Voir la démo en ligne ↗"}
                  </a>
                )}
                <a className="btn btn-secondary" href="/#projets" onClick={(event) => {
                  event.preventDefault();
                  onNavigate("/#projets");
                }}>
                  Voir les projets
                </a>
              </div>
            </div>

            <div className="case-media">
              {project.video ? (
                <DeferredVideo
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster={getOptimizedImage(project.image).src}
                  src={project.video}
                />
              ) : (
                (() => {
                  const optimizedImage = getOptimizedImage(project.image);

                  return (
                    <img
                      src={optimizedImage.src}
                      srcSet={optimizedImage.srcSet}
                      sizes="(max-width: 900px) 92vw, 50vw"
                      alt={`Aperçu du projet ${project.title}`}
                    />
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="case-section">
        <div className="case-shell case-detail-grid">
          <article className="case-panel case-description">
            <span>Description</span>
            <h2>Une solution pensée pour un usage réel</h2>
            <p>{project.details}</p>
          </article>

          <article className="case-panel">
            <span>Objectif métier</span>
            <h2>Créer un outil utile et mesurable</h2>
            <p>{project.objective}</p>
          </article>
        </div>
      </section>

      <section className="case-section case-section-tight">
        <div className="case-shell case-detail-grid">
          <article className="case-panel">
            <span>Fonctionnalités</span>
            <h2>Ce que le projet apporte</h2>
            <ul className="case-list">
              {project.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>

          <article className="case-panel">
            <span>Stack</span>
            <h2>Technologies utilisées</h2>
            <div className="case-stack">
              {project.stack.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="case-section case-final-cta">
        <div className="case-shell">
          <div className="case-cta-panel">
            <span>Votre projet</span>
            <h2>Créer une version claire, utile et testable.</h2>
            <p>Parlez-moi de votre idée : je vous répondrai avec une première piste claire et concrète.</p>
            <a className="btn btn-primary" href={`mailto:${businessContact.email}`}>
              Demander une démo
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function ServicePage({ servicePage, onNavigate }) {
  if (!servicePage) {
    return (
      <main className="case-page fade-in-page">
        <section className="case-hero case-not-found">
          <div className="case-shell">
            <button className="back-button" type="button" onClick={() => onNavigate("/")}>
              Retour à l’accueil
            </button>
            <div className="case-hero-copy">
              <span>Service introuvable</span>
              <h1>Cette page service n’existe pas encore.</h1>
              <p>Revenez à la page principale pour consulter les services disponibles.</p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const relatedProjects = (servicePage.relatedProjects ?? [])
    .map((slug) => projects.find((project) => project.slug === slug))
    .filter(Boolean);

  const handleNavigateTo = (target) => (event) => {
    event.preventDefault();
    onNavigate(target);
  };

  return (
    <main className="case-page fade-in-page">
      <section className="case-hero">
        <div className="case-bg" aria-hidden="true"></div>
        <div className="case-shell">
          <button className="back-button" type="button" onClick={() => onNavigate("/#services")}>
            Retour
          </button>

          <div className="case-hero-copy">
            <span>Service</span>
            <h1>{servicePage.title}</h1>
            <p>{servicePage.intro}</p>
            <div className="case-actions">
              <a
                className="btn btn-primary"
                href={servicePage.cta.primaryHref}
                onClick={handleNavigateTo(servicePage.cta.primaryHref)}
              >
                {servicePage.cta.primaryLabel}
              </a>
              <a
                className="btn btn-secondary"
                href={servicePage.cta.secondaryHref}
                onClick={handleNavigateTo(servicePage.cta.secondaryHref)}
              >
                {servicePage.cta.secondaryLabel}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="case-section">
        <div className="case-shell case-detail-grid">
          <article className="case-panel">
            <span>Pour qui</span>
            <h2>Un service pensé pour les structures qui manquent de temps</h2>
            <p>{servicePage.audience}</p>
          </article>

          <article className="case-panel case-description">
            <span>Problèmes fréquents</span>
            <h2>Ce qui ralentit votre organisation au quotidien</h2>
            <ul className="case-list">
              {servicePage.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="case-section case-section-tight">
        <div className="case-shell case-detail-grid">
          <article className="case-panel">
            <span>Ce qui peut être automatisé</span>
            <h2>Des automatisations concrètes, adaptées à votre activité</h2>
            <ul className="case-list">
              {servicePage.capabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </article>

          <article className="case-panel">
            <span>Bénéfices attendus</span>
            <h2>Ce que cela change concrètement</h2>
            <ul className="case-list">
              {servicePage.expectedResults.map((result) => (
                <li key={result}>{result}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="case-section">
        <div className="case-shell">
          <span>Exemples d’usage</span>
          <h2>Des cas concrets pour les petites structures</h2>
          <div className="case-detail-grid">
            {servicePage.useCases.map((useCase) => (
              <article className="case-panel" key={useCase.title}>
                <h3>{useCase.title}</h3>
                <p>{useCase.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="case-section case-section-tight">
        <div className="case-shell">
          <article className="case-panel">
            <span>Méthode Digital Lab</span>
            <h2>Une mise en place progressive, sans tout bouleverser</h2>
            <ul className="case-list">
              {servicePage.method.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <p>
              <a href="/#method" onClick={handleNavigateTo("/#method")}>
                Découvrir la méthode Digital Lab →
              </a>
            </p>
          </article>
        </div>
      </section>

      {relatedProjects.length > 0 && (
        <section className="case-section">
          <div className="case-shell">
            <span>Projets liés</span>
            <h2>Des exemples déjà mis en œuvre</h2>
            <div className="case-detail-grid">
              {relatedProjects.map((project) => (
                <article className="case-panel" key={project.slug}>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <a href={`/projects/${project.slug}`} onClick={handleNavigateTo(`/projects/${project.slug}`)}>
                    Voir le projet →
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {servicePage.localVariant && (
        <section className="case-section case-section-tight">
          <div className="case-shell">
            <article className="case-panel">
              <span>Zone locale</span>
              <h2>{servicePage.localVariant.heading}</h2>
              <p>{servicePage.localVariant.text}</p>
              <p>
                <a
                  href={`/services/${servicePage.localVariant.slug}`}
                  onClick={handleNavigateTo(`/services/${servicePage.localVariant.slug}`)}
                >
                  {servicePage.localVariant.linkLabel} →
                </a>
              </p>
            </article>
          </div>
        </section>
      )}

      <section className="case-section case-final-cta">
        <div className="case-shell">
          <div className="case-cta-panel">
            <span>Votre organisation</span>
            <h2>{servicePage.cta.title}</h2>
            <p>{servicePage.cta.text}</p>
            <a
              className="btn btn-primary"
              href={servicePage.cta.primaryHref}
              onClick={handleNavigateTo(servicePage.cta.primaryHref)}
            >
              {servicePage.cta.primaryLabel}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

const formatRequestDate = (createdAt) => {
  if (!createdAt) {
    return "Date non disponible";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(createdAt));
};

const getProjectReference = (request, index = 0) => {
  if (request?.reference) {
    return request.reference;
  }

  const source = request?.id ? String(request.id).replace(/\D/g, "") : "";
  const numericPart = source ? Number(source.slice(-4)) : index + 1;

  return `DL-2026-${String(numericPart || index + 1).padStart(4, "0")}`;
};

const getRequestStatusMeta = (status) => {
  const normalizedStatus = status || "new";
  const labels = {
    new: "Nouvelle",
    pending: "En attente",
    in_progress: "En cours",
    done: "Terminée",
    completed: "Terminée",
    archived: "Archivée",
  };
  const classNames = {
    new: "is-new",
    pending: "is-pending",
    in_progress: "is-progress",
    done: "is-done",
    completed: "is-done",
    archived: "is-archived",
  };

  return {
    label: labels[normalizedStatus] ?? normalizedStatus,
    className: classNames[normalizedStatus] ?? "is-pending",
  };
};

const getQuoteStatusLabel = (status) => {
  const labels = {
    draft: "Brouillon",
    sent: "Envoyé",
    accepted: "Accepté",
    refused: "Refusé",
    expired: "Expiré",
  };

  return labels[status] ?? "Aucun devis";
};

function QuoteBadge({ quote }) {
  const status = quote?.status || "none";

  return (
    <span className={`quote-card-badge is-${status}`}>
      {quote ? getQuoteStatusLabel(status) : "Aucun devis"}
    </span>
  );
}

function QuoteNotificationBadge({ quote, role }) {
  if (role === "client") {
    if (quote?.status === "sent") {
      return <span className="quote-notification-badge is-sent">Nouveau devis</span>;
    }

    return null;
  }

  if (quote?.status === "accepted") {
    return <span className="quote-notification-badge is-accepted">Nouveau devis accepté</span>;
  }

  if (quote?.status === "refused") {
    return <span className="quote-notification-badge is-refused">Devis refusé</span>;
  }

  if (quote?.status === "sent") {
    return <span className="quote-notification-badge is-sent">Devis envoyé</span>;
  }

  return null;
}

const getProjectTimeline = (status, quoteStatus) => {
  const activeStatus = status || "new";
  const quoteProgress = quoteStatus === "accepted" ? 3 : quoteStatus === "sent" || quoteStatus === "refused" ? 2 : -1;
  const statusProgress = activeStatus === "completed" ? 4 : activeStatus === "in_progress" ? 1 : 0;
  const completedIndex = Math.max(statusProgress, quoteProgress);

  return ["Demande reçue", "Analyse", "Proposition", "Développement", "Livraison"].map((label, index) => ({
    label,
    isDone: index <= completedIndex,
  }));
};

const getNextActionText = (status, quoteStatus) => {
  if (quoteStatus === "accepted") {
    return "Le devis est accepté. Le projet peut passer en phase de développement.";
  }

  if (quoteStatus === "sent") {
    return "Le devis a été envoyé. La prochaine étape consiste à valider ou ajuster la proposition.";
  }

  if (status === "completed") {
    return "Le projet est terminé. Vous pouvez me contacter pour une évolution, un suivi ou une nouvelle demande.";
  }

  if (status === "in_progress") {
    return "Votre projet est en cours. Nous préparons les prochaines étapes et les éléments utiles pour avancer.";
  }

  return "Votre projet est actuellement en cours d’analyse. Je prépare une première piste claire pour vous répondre.";
};

function UnreadMessageBadge({ count }) {
  if (!count) {
    return null;
  }

  return (
    <span className="unread-message-badge">
      Nouveau message
    </span>
  );
}

const getDossierTabs = (role) => [
  { id: "summary", label: "Résumé" },
  { id: "conversation", label: role === "admin" ? "Conversation" : "Messages" },
  { id: "documents", label: "Documents" },
  { id: "quote", label: "Devis" },
];

function RequestSummaryPanel({ activeQuote, request, role }) {
  const statusMeta = getRequestStatusMeta(request.status);
  const quoteStatus = activeQuote?.status;

  return (
    <div className="dossier-summary">
      <div className="project-detail-heading">
        <div>
          <span>{getProjectReference(request)}</span>
          <h2>{request.project_type || "Projet à préciser"}</h2>
          <p>{formatRequestDate(request.created_at)}</p>
        </div>
        <strong className={`request-status ${statusMeta.className}`}>{statusMeta.label}</strong>
      </div>

      <div className="project-detail-grid">
        <article className="project-message-card">
          <span>Message initial</span>
          <p>{request.message}</p>
        </article>
        <article>
          <span>Projet</span>
          <p>
            {request.project_type || "Projet à préciser"}
            <br />
            {getProjectReference(request)}
          </p>
        </article>
        <article>
          <span>{role === "admin" ? "Client" : "Contact"}</span>
          <p>
            {request.name || "Nom non renseigné"}
            <br />
            {request.email || "Email non renseigné"}
          </p>
        </article>
        <article>
          <span>Structure</span>
          <p>{request.company || "Non renseignée"}</p>
        </article>
      </div>

      <div className="next-action-card">
        <span>Prochaine action</span>
        <p>{getNextActionText(request.status, quoteStatus)}</p>
      </div>

      <div className="client-timeline" role="group" aria-label="Avancement du projet">
        {getProjectTimeline(request.status, quoteStatus).map((step) => (
          <div className={step.isDone ? "is-done" : ""} key={step.label}>
            <span>{step.isDone ? "✓" : "○"}</span>
            <p>{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequestDossierPanel({ request, role, session, focusTab, focusKey, onMessagesRead, onQuoteChange }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [activeQuote, setActiveQuote] = useState(null);
  const dossierPanelRef = useRef(null);
  const tabs = getDossierTabs(role);
  const hasAvailableQuote = role === "client" && activeQuote?.status === "sent";

  useEffect(() => {
    setActiveTab("summary");
    setActiveQuote(null);
  }, [request?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadActiveQuote = async () => {
      if (!request?.id) {
        return;
      }

      const { data, error } = await getLatestQuotesForRequests([request.id]);

      if (!isMounted) {
        return;
      }

      if (!error) {
        const nextQuote = data?.[request.id] ?? null;
        setActiveQuote(role === "client" && nextQuote?.status === "draft" ? null : nextQuote);
      }
    };

    loadActiveQuote();

    return () => {
      isMounted = false;
    };
  }, [request?.id, role]);

  useEffect(() => {
    if (!request?.id || !focusTab) {
      return;
    }

    setActiveTab(focusTab);

    window.setTimeout(() => {
      const conversationBlock = dossierPanelRef.current?.querySelector(".request-conversation");
      scrollToElementWithHeaderOffset(conversationBlock || dossierPanelRef.current);
    }, 120);
  }, [focusKey, focusTab, request?.id]);

  const activateTab = (tabId) => {
    setActiveTab(tabId);

    window.setTimeout(() => {
      const target =
        tabId === "conversation"
          ? dossierPanelRef.current?.querySelector(".request-conversation")
          : dossierPanelRef.current?.querySelector(".dossier-tab-panel");

      scrollToElementWithHeaderOffset(target || dossierPanelRef.current);
      target?.querySelector("textarea, button, a, input, select")?.focus();
    }, 80);
  };

  if (!request?.id) {
    return (
      <section className="dashboard-section request-dossier-panel">
        <div className="dossier-empty">
          <span>Dossier</span>
          <h2>Sélectionnez une demande</h2>
          <p>Ouvrez un dossier pour consulter le résumé, les messages, les documents et les devis.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="dashboard-section request-dossier-panel client-project-detail" ref={dossierPanelRef}>
      <div className="dossier-panel-heading">
        <div>
          <span>Dossier de demande</span>
          <h2>{getProjectReference(request)}</h2>
        </div>
        <strong className={`request-status ${getRequestStatusMeta(request.status).className}`}>
          {getRequestStatusMeta(request.status).label}
        </strong>
      </div>

      <div className="dossier-tabs" role="tablist" aria-label="Sections du dossier">
        {tabs.map((tab) => (
          <button
            aria-selected={activeTab === tab.id}
            className={`${activeTab === tab.id ? "is-active" : ""}${
              hasAvailableQuote && tab.id === "quote" ? " has-notification" : ""
            }`.trim()}
            key={tab.id}
            role="tab"
            type="button"
            onClick={() => activateTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {hasAvailableQuote && <p className="dossier-quote-hint">Votre devis est disponible.</p>}

      <div className="dossier-tab-panel" role="tabpanel">
        {activeTab === "summary" && <RequestSummaryPanel activeQuote={activeQuote} request={request} role={role} />}
        {activeTab === "conversation" && (
          <RequestConversation
            request={request}
            senderId={session?.user?.id}
            senderRole={role}
            onMessagesRead={onMessagesRead}
          />
        )}
        {activeTab === "documents" && <RequestDocuments request={request} role={role} userId={session?.user?.id} />}
        {activeTab === "quote" && (
          <RequestQuotes
            request={request}
            role={role}
            session={session}
            onQuoteChange={(quote) => {
              setActiveQuote(quote);
              onQuoteChange?.(request.id, quote);
            }}
          />
        )}
      </div>
    </section>
  );
}

function ContactRequestsPanel({ session, userId, messageFocus, onUnreadCountChange }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [quoteByRequestId, setQuoteByRequestId] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const dossierRef = useRef(null);

  const loadUnreadCounts = useCallback(async (nextRequests) => {
    const requestIds = nextRequests.map((request) => request.id).filter(Boolean);

    if (requestIds.length === 0) {
      setUnreadCounts({});
      return;
    }

    const { data, error } = await getUnreadMessageCounts({ requestIds, viewerRole: "client" });

    if (error) {
      console.warn("CLIENT UNREAD MESSAGES ERROR:", error);
      setUnreadCounts({});
      return;
    }

    setUnreadCounts(data ?? {});
  }, []);

  const clearUnreadForRequest = useCallback(
    (requestId) => {
      setUnreadCounts((currentCounts) => ({ ...currentCounts, [requestId]: 0 }));
      loadUnreadCounts(requests);
    },
    [loadUnreadCounts, requests],
  );

  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((total, count) => total + (Number(count) || 0), 0);
    onUnreadCountChange?.(totalUnread);
  }, [onUnreadCountChange, unreadCounts]);

  const loadQuoteBadges = useCallback(async (nextRequests) => {
    const requestIds = nextRequests.map((request) => request.id).filter(Boolean);

    if (requestIds.length === 0) {
      setQuoteByRequestId({});
      return;
    }

    const { data, error } = await getLatestQuotesForRequests(requestIds);

    if (error) {
      console.warn("CLIENT QUOTES ERROR:", error);
      return;
    }

    const visibleQuotes = Object.fromEntries(
      Object.entries(data ?? {}).filter(([, quote]) => quote?.status !== "draft"),
    );

    setQuoteByRequestId(visibleQuotes);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadRequests = async () => {
      if (!userId) {
        setRequests([]);
        setIsLoading(false);
        setErrorMessage("");
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      const { data, error } = await getContactRequestsForUser(userId);

      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("CLIENT REQUESTS LOAD ERROR:", error);
        setErrorMessage("Vos demandes n’ont pas pu être chargées pour le moment.");
        setRequests([]);
      } else {
        const nextRequests = data ?? [];
        setRequests(nextRequests);
        loadUnreadCounts(nextRequests);
        loadQuoteBadges(nextRequests);
      }

      setIsLoading(false);
    };

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, [loadQuoteBadges, loadUnreadCounts, userId]);

  useEffect(() => {
    if (!supabase || requests.length === 0) {
      return undefined;
    }

    const requestIds = new Set(requests.map((request) => request.id));
    const channel = supabase
      .channel(`client-unread-messages:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_messages" },
        (payload) => {
          const requestId = payload.new?.request_id ?? payload.old?.request_id;

          if (requestIds.has(requestId)) {
            loadUnreadCounts(requests);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadUnreadCounts, requests, userId]);

  useEffect(() => {
    if (!supabase || requests.length === 0) {
      return undefined;
    }

    const requestIds = new Set(requests.map((request) => request.id));
    const channel = supabase
      .channel(`client-quote-badges:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quotes" },
        (payload) => {
          const requestId = payload.new?.request_id ?? payload.old?.request_id;

          if (requestIds.has(requestId)) {
            loadQuoteBadges(requests);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadQuoteBadges, requests, userId]);

  useEffect(() => {
    if (!messageFocus?.requestId || requests.length === 0) {
      return;
    }

    if (requests.some((request) => request.id === messageFocus.requestId)) {
      setSelectedRequestId(messageFocus.requestId);
    }
  }, [messageFocus?.key, messageFocus?.requestId, requests]);

  const selectedRequest = requests.find((request) => request.id === selectedRequestId);

  useEffect(() => {
    if (!selectedRequest?.id) {
      return;
    }

    window.setTimeout(() => {
      scrollToElementWithHeaderOffset(dossierRef.current);
    }, 80);
  }, [selectedRequest?.id]);

  return (
    <div className="client-project-space">
      <section className="dashboard-section">
        <div>
          <span>Espace client</span>
          <h2>Mes demandes envoyées</h2>
        </div>

        {isLoading && (
          <div className="dashboard-skeleton-grid" role="status" aria-label="Chargement des demandes">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        {!isLoading && errorMessage && (
          <div className="dashboard-placeholder dashboard-error" role="status">
            <p>{errorMessage}</p>
          </div>
        )}

        {!isLoading && !errorMessage && requests.length === 0 && (
          <div className="dashboard-placeholder client-empty-state">
            <div className="client-empty-illustration" aria-hidden="true">DL</div>
            <h3>Aucune demande n’est encore rattachée à ce compte.</h3>
            <p>Créez une demande pour transformer une idée, un besoin ou un site existant en projet suivi.</p>
            <a className="btn btn-primary" href="/#contact">Créer une demande</a>
          </div>
        )}

        {!isLoading && !errorMessage && requests.length > 0 && (
          <div className="dashboard-requests-list">
            {requests.map((request, index) => {
              const statusMeta = getRequestStatusMeta(request.status);

              return (
                <button
                  className={`dashboard-request-card client-project-card${
                    selectedRequestId === request.id ? " is-active" : ""
                  }`}
                  key={request.id}
                  type="button"
                  onClick={() => setSelectedRequestId(request.id)}
                >
                  <div className="request-card-header">
                    <div>
                      <span>{getProjectReference(request, index)}</span>
                      <h3>{request.project_type || "Projet à préciser"}</h3>
                      <small>{formatRequestDate(request.created_at)}</small>
                    </div>
                    <div className="request-card-badges">
                      <UnreadMessageBadge count={unreadCounts[request.id]} />
                      <QuoteNotificationBadge quote={quoteByRequestId[request.id]} role="client" />
                      <strong className={`request-status ${statusMeta.className}`}>{statusMeta.label}</strong>
                    </div>
                  </div>
                  <p>{request.message}</p>
                  <div className="request-mini-timeline" role="group" aria-label="Avancement de la demande">
                    {getProjectTimeline(request.status).map((step) => (
                      <span className={step.isDone ? "is-done" : ""} key={step.label}>
                        {step.label}
                      </span>
                    ))}
                  </div>
                  <span className="client-detail-link">Voir le dossier</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedRequest && (
        <div ref={dossierRef}>
          <RequestDossierPanel
            request={selectedRequest}
            role="client"
            session={session}
            focusTab={selectedRequest.id === messageFocus?.requestId ? messageFocus?.tab || "conversation" : ""}
            focusKey={messageFocus?.key}
            onMessagesRead={clearUnreadForRequest}
            onQuoteChange={(requestId, quote) => {
              setQuoteByRequestId((currentQuotes) => ({ ...currentQuotes, [requestId]: quote }));
            }}
          />
        </div>
      )}
    </div>
  );
}

const adminStatuses = ["new", "in_progress", "completed"];

function AdminRequestsPanel({ session, messageFocus, onUnreadCountChange }) {
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [quoteByRequestId, setQuoteByRequestId] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState("");
  const dossierRef = useRef(null);

  const loadUnreadCounts = useCallback(async (nextRequests) => {
    const requestIds = nextRequests.map((request) => request.id).filter(Boolean);

    if (requestIds.length === 0) {
      setUnreadCounts({});
      return;
    }

    const { data, error } = await getUnreadMessageCounts({ requestIds, viewerRole: "admin" });

    if (error) {
      console.warn("ADMIN UNREAD MESSAGES ERROR:", error);
      setUnreadCounts({});
      return;
    }

    setUnreadCounts(data ?? {});
  }, []);

  const clearUnreadForRequest = useCallback(
    (requestId) => {
      setUnreadCounts((currentCounts) => ({ ...currentCounts, [requestId]: 0 }));
      loadUnreadCounts(requests);
    },
    [loadUnreadCounts, requests],
  );

  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((total, count) => total + (Number(count) || 0), 0);
    onUnreadCountChange?.(totalUnread);
  }, [onUnreadCountChange, unreadCounts]);

  const loadQuoteBadges = useCallback(async (nextRequests) => {
    const requestIds = nextRequests.map((request) => request.id).filter(Boolean);

    if (requestIds.length === 0) {
      setQuoteByRequestId({});
      return;
    }

    const { data, error } = await getLatestQuotesForRequests(requestIds);

    if (error) {
      console.warn("ADMIN QUOTES ERROR:", error);
      return;
    }

    setQuoteByRequestId(data ?? {});
  }, []);

  const loadRequests = async () => {
    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await getAllContactRequests();

    if (error) {
      console.error("ADMIN REQUESTS LOAD ERROR:", error);
      setErrorMessage("Les demandes n’ont pas pu être chargées pour le moment.");
      setRequests([]);
    } else {
      const nextRequests = data ?? [];
      setRequests(nextRequests);
      loadUnreadCounts(nextRequests);
      loadQuoteBadges(nextRequests);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      loadRequests();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadQuoteBadges, loadUnreadCounts]);

  useEffect(() => {
    if (!supabase || requests.length === 0) {
      return undefined;
    }

    const requestIds = new Set(requests.map((request) => request.id));
    const channel = supabase
      .channel("admin-unread-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_messages" },
        (payload) => {
          const requestId = payload.new?.request_id ?? payload.old?.request_id;

          if (requestIds.has(requestId)) {
            loadUnreadCounts(requests);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadUnreadCounts, requests]);

  useEffect(() => {
    if (!supabase || requests.length === 0) {
      return undefined;
    }

    const requestIds = new Set(requests.map((request) => request.id));
    const channel = supabase
      .channel("admin-quote-badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quotes" },
        (payload) => {
          const requestId = payload.new?.request_id ?? payload.old?.request_id;

          if (requestIds.has(requestId)) {
            loadQuoteBadges(requests);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadQuoteBadges, requests]);

  const updateStatus = async (requestId, status) => {
    setUpdatingId(requestId);
    setUpdatingStatus(status);
    setErrorMessage("");

    const { error } = await updateContactRequestStatus({ requestId, status });

    if (error) {
      console.error(error);
      setErrorMessage("Le statut n’a pas pu être mis à jour.");
      setToastMessage("Le statut n’a pas pu être mis à jour.");
    } else {
      setRequests((currentRequests) =>
        currentRequests.map((request) => (request.id === requestId ? { ...request, status } : request)),
      );
    }

    setUpdatingId("");
    setUpdatingStatus("");
  };

  const stats = {
    total: requests.length,
    new: requests.filter((request) => (request.status || "new") === "new").length,
    in_progress: requests.filter((request) => request.status === "in_progress").length,
    completed: requests.filter((request) => request.status === "completed").length,
  };
  const filteredRequests = requests
    .filter((request) => {
      const searchableContent = [request.name, request.email, request.company, request.project_type, request.message]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = searchableContent.includes(searchTerm.trim().toLowerCase());
      const matchesStatus = statusFilter === "all" || (request.status || "new") === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((firstRequest, secondRequest) => {
      const firstDate = new Date(firstRequest.created_at).getTime();
      const secondDate = new Date(secondRequest.created_at).getTime();

      if (sortOrder === "asc") {
        return firstDate - secondDate;
      }

      if (sortOrder === "client") {
        return (firstRequest.name || "").localeCompare(secondRequest.name || "", "fr", { sensitivity: "base" });
      }

      if (sortOrder === "project") {
        return (firstRequest.project_type || "").localeCompare(secondRequest.project_type || "", "fr", {
          sensitivity: "base",
        });
      }

      if (sortOrder === "status") {
        return (firstRequest.status || "new").localeCompare(secondRequest.status || "new", "fr", {
          sensitivity: "base",
        });
      }

      return secondDate - firstDate;
    });
  const requestsPerPage = 10;
  const totalPages = Math.ceil(filteredRequests.length / requestsPerPage);
  const visibleRequests = filteredRequests.slice((currentPage - 1) * requestsPerPage, currentPage * requestsPerPage);
  const selectedRequest = requests.find((request) => request.id === selectedRequestId);
  const activeMessageFocusTab =
    selectedRequest?.id && selectedRequest.id === messageFocus?.requestId ? messageFocus?.tab || "conversation" : "";
  const openDossier = (requestId) => {
    setSelectedRequestId(requestId);
    window.setTimeout(() => {
      dossierRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  useEffect(() => {
    if (!messageFocus?.requestId || requests.length === 0) {
      return;
    }

    if (requests.some((request) => request.id === messageFocus.requestId)) {
      openDossier(messageFocus.requestId);
    }
  }, [messageFocus?.key, messageFocus?.requestId, requests]);

  return (
    <div className="dashboard-section admin-requests-section">
      {toastMessage && (
        <div className="admin-inline-toast" role="status">
          <span>{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage("")} aria-label="Fermer l’erreur">
            ×
          </button>
        </div>
      )}

      <div className="admin-section-heading">
        <div>
          <span>Demandes clients</span>
          <h2>Toutes les demandes reçues</h2>
        </div>
        <button className="dashboard-refresh-button" type="button" onClick={loadRequests} disabled={isLoading}>
          Actualiser
        </button>
      </div>

      <div className="admin-stats-grid">
        <article>
          <span>Total demandes</span>
          <strong>{stats.total}</strong>
        </article>
        <article>
          <span>Nouvelles</span>
          <strong>{stats.new}</strong>
        </article>
        <article>
          <span>En cours</span>
          <strong>{stats.in_progress}</strong>
        </article>
        <article>
          <span>Terminées</span>
          <strong>{stats.completed}</strong>
        </article>
      </div>

      <div className="admin-crm-controls">
        <label>
          Recherche rapide
          <input
            type="search"
            value={searchTerm}
            placeholder="Rechercher un client, un email ou un projet..."
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
          />
        </label>
        <div className="admin-filter-group">
          <span>Filtrer par statut</span>
          <div className="admin-filter-tabs" role="group" aria-label="Filtrer par statut">
            {[
              ["all", "Toutes"],
              ["new", "Nouvelles"],
              ["in_progress", "En cours"],
              ["completed", "Terminées"],
            ].map(([value, label]) => (
              <button
                className={statusFilter === value ? "is-selected" : ""}
              key={value}
              type="button"
              onClick={() => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label>
          Tri
          <select
            value={sortOrder}
            onChange={(event) => {
              setSortOrder(event.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="desc">Plus récentes</option>
            <option value="asc">Plus anciennes</option>
            <option value="client">Nom du client</option>
            <option value="project">Projet</option>
            <option value="status">Statut</option>
          </select>
        </label>
      </div>

      {isLoading && (
        <div className="dashboard-skeleton-grid" role="status" aria-label="Chargement des demandes admin">
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="dashboard-placeholder dashboard-error" role="status">
          <p>{errorMessage}</p>
        </div>
      )}

      {!isLoading && !errorMessage && requests.length === 0 && (
        <div className="dashboard-placeholder">
          <p>Aucune demande client n’a encore été envoyée.</p>
        </div>
      )}

      {!isLoading && !errorMessage && requests.length > 0 && filteredRequests.length === 0 && (
        <div className="dashboard-placeholder">
          <p>Aucune demande ne correspond à ces critères.</p>
        </div>
      )}

      {!isLoading && filteredRequests.length > 0 && (
        <div className="admin-crm-workspace">
          <div className="admin-requests-list">
            {visibleRequests.map((request, index) => {
              const statusMeta = getRequestStatusMeta(request.status);

              return (
                <article
                  className={`admin-request-card${selectedRequestId === request.id ? " is-active" : ""}`}
                  key={request.id}
                >
                  <div className="admin-request-main">
                    <div className="request-card-header">
                      <div>
                        <span>{getProjectReference(request, index + (currentPage - 1) * requestsPerPage)}</span>
                        <h3>{request.project_type || "Projet à préciser"}</h3>
                        <small>{formatRequestDate(request.created_at)}</small>
                      </div>
                      <div className="request-card-badges">
                        <UnreadMessageBadge count={unreadCounts[request.id]} />
                        <QuoteNotificationBadge quote={quoteByRequestId[request.id]} role="admin" />
                        <QuoteBadge quote={quoteByRequestId[request.id]} />
                        <strong className={`request-status ${statusMeta.className}`}>{statusMeta.label}</strong>
                      </div>
                    </div>

                    <p>{request.message}</p>
                  </div>

                  <div className="admin-request-meta">
                    <div>
                      <span>Client</span>
                      <strong>{request.name || "Nom non renseigné"}</strong>
                    </div>
                    <div>
                      <span>Email</span>
                      <a href={`mailto:${request.email}`}>{request.email || "Email non renseigné"}</a>
                    </div>
                    {request.company && (
                      <div>
                        <span>Structure</span>
                        <strong>{request.company}</strong>
                      </div>
                    )}
                  </div>

                  <div className="admin-status-actions" role="group" aria-label={`Changer le statut de ${request.name || "la demande"}`}>
                    <button className="admin-open-dossier" type="button" onClick={() => openDossier(request.id)}>
                      Ouvrir le dossier
                    </button>
                    {adminStatuses.map((status) => (
                    <button
                      className={request.status === status ? "is-selected" : ""}
                      key={status}
                      type="button"
                      disabled={updatingId === request.id}
                      onClick={() => updateStatus(request.id, status)}
                    >
                      {updatingId === request.id && updatingStatus === status
                        ? "Mise à jour..."
                        : getRequestStatusMeta(status).label}
                    </button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="admin-pagination" aria-label="Pagination demandes admin">
          <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>
            &lt; Précédent
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <button
              className={currentPage === page ? "is-selected" : ""}
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => page + 1)}
          >
            Suivant &gt;
          </button>
        </nav>
      )}

      <div className="admin-dossier-anchor" ref={dossierRef}>
        <RequestDossierPanel
          request={selectedRequest}
          role="admin"
          session={session}
          focusTab={activeMessageFocusTab}
          focusKey={messageFocus?.key}
          onMessagesRead={clearUnreadForRequest}
          onQuoteChange={(requestId, quote) => {
            setQuoteByRequestId((currentQuotes) => ({ ...currentQuotes, [requestId]: quote }));
          }}
        />
      </div>
    </div>
  );
}

function AdminDashboardPage({ session, isAuthLoading, profileError, messageFocus, onUnreadCountChange }) {
  const displayName = getUserDisplayName(session);

  return (
    <main className="client-page admin-page fade-in-page">
      <section className="client-hero admin-hero">
        <div className="case-bg" aria-hidden="true"></div>
        <div className="case-shell">
          <div className="client-panel admin-panel">
            <span>Administration</span>
            {isAuthLoading ? (
              <>
                <h1>Chargement de l’espace admin...</h1>
                <p>Vérification de votre session et de vos permissions.</p>
                <div className="dashboard-skeleton-grid" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </>
            ) : profileError ? (
              <>
                <h1>Accès admin à vérifier</h1>
                <p>
                  La lecture du profil a échoué. Vérifiez que la policy RLS autorise l’utilisateur connecté à lire sa
                  ligne dans `profiles`.
                </p>
                <div className="dashboard-placeholder dashboard-error" role="status">
                  <p>{profileError}</p>
                </div>
              </>
            ) : (
              <>
                <h1>Bonjour {displayName}</h1>
                <p>
                  Gérez les demandes envoyées depuis le site Digital Lab, suivez leur statut et priorisez les réponses
                  clients.
                </p>
                <AdminRequestsPanel
                  session={session}
                  messageFocus={messageFocus}
                  onUnreadCountChange={onUnreadCountChange}
                />
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ClientAreaPage({ session, onAuthOpen, onLogout, isAuthLoading, messageFocus, onUnreadCountChange }) {
  const userEmail = session?.user?.email;
  const displayName = getUserDisplayName(session);
  const updateClientUnreadMessageCount = useCallback(
    (count) => {
      const nextCount = Number(count) || 0;
      onUnreadCountChange?.(nextCount);
    },
    [onUnreadCountChange],
  );

  return (
    <main className="client-page fade-in-page">
      <section className="client-hero">
        <div className="case-bg" aria-hidden="true"></div>
        <div className="case-shell">
          <div className="client-panel">
            <span>Espace client</span>
            {isAuthLoading ? (
              <>
                <h1>Chargement de votre espace</h1>
                <p>Vérification de votre session en cours.</p>
                <div className="dashboard-skeleton-grid" aria-hidden="true">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </>
            ) : session ? (
              <>
                <h1>Bonjour {displayName}</h1>
                <p>
                  Bienvenue dans votre espace Digital Lab. Vous pouvez suivre chaque étape de vos projets, consulter
                  les prochaines actions et retrouver vos demandes au même endroit.
                </p>

                <div className="client-info-grid">
                  <article>
                    <span>Compte connecté</span>
                    <strong>{userEmail}</strong>
                  </article>
                  <article>
                    <span>Statut</span>
                    <strong>Session active</strong>
                  </article>
                  <article>
                    <span>Prochainement</span>
                    <strong>Suivi projet, documents, messages</strong>
                  </article>
                </div>

                <div className="dashboard-section">
                  <div>
                    <span>Actions rapides</span>
                    <h2>Avancer sur votre projet</h2>
                  </div>
                  <div className="dashboard-actions">
                    <a href="/#estimation">Recevoir une estimation</a>
                    <a href="/#contact">Contacter Digital Lab</a>
                    <button type="button" onClick={onLogout}>
                      Déconnexion
                    </button>
                  </div>
                </div>

                <ContactRequestsPanel
                  session={session}
                  userId={session.user.id}
                  messageFocus={messageFocus}
                  onUnreadCountChange={updateClientUnreadMessageCount}
                />
              </>
            ) : (
              <>
                <h1>Connectez-vous pour accéder à votre espace</h1>
                <p>
                  Cet espace est réservé aux utilisateurs connectés. Vous pourrez bientôt y retrouver vos projets,
                  documents et demandes.
                </p>
                <button className="btn btn-primary" type="button" onClick={onAuthOpen}>
                  Se connecter
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animationFrame = 0;

    const updateProgress = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const nextProgress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
        setProgress(Math.min(1, Math.max(0, nextProgress)));
      });
    };

    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${progress})` }}></span>
    </div>
  );
}

function AuthModal({ onClose }) {
  const {
    isSupabaseConfigured,
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    showAuthToast,
  } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const runAuthAction = async (action) => {
    setIsLoading(true);
    setMessage("");

    const { error } = await action();

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    if (mode === "signup") {
      setMessage("Compte créé. Vérifiez votre email si une confirmation vous est demandée.");
      showAuthToast("Compte créé. Vérifiez votre email si besoin.");
      setIsLoading(false);
      return;
    }

    showAuthToast("Connexion réussie.");
    setIsLoading(false);
    onClose();
  };

  const handleEmailSubmit = (event) => {
    event.preventDefault();

    runAuthAction(() =>
      mode === "signup"
        ? signUpWithEmail({ email, password })
        : signInWithEmail({ email, password }),
    );
  };

  const handleGoogleSignIn = () => {
    runAuthAction(signInWithGoogle);
  };

  return (
    <div className="auth-modal-overlay" onMouseDown={onClose}>
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="auth-modal-close"
          type="button"
          aria-label="Fermer la connexion"
          onClick={onClose}
          ref={closeButtonRef}
        >
          ×
        </button>

        <span>Accès client</span>
        <h2 id="auth-modal-title">{mode === "signup" ? "Créer un compte" : "Connexion"}</h2>
        <p>Connectez-vous pour accéder aux futurs espaces privés Digital Lab.</p>

        {!isSupabaseConfigured && (
          <div className="auth-message is-error">
            La connexion n’est pas disponible pour le moment.
          </div>
        )}

        <button className="auth-google-button" type="button" onClick={handleGoogleSignIn} disabled={isLoading}>
          <span aria-hidden="true">G</span>
          Continuer avec Google
        </button>

        <div className="auth-divider">
          <span>ou</span>
        </div>

        <form className="auth-form" onSubmit={handleEmailSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@email.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Mot de passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
              required
            />
          </label>

          <button className="btn btn-primary auth-submit" type="submit" disabled={isLoading}>
            {isLoading ? "Connexion en cours..." : mode === "signup" ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>

        {message && <div className="auth-message">{message}</div>}

        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setMode((currentMode) => (currentMode === "signup" ? "login" : "signup"));
            setMessage("");
          }}
        >
          {mode === "signup" ? "J’ai déjà un compte" : "Créer un compte email"}
        </button>
      </section>
    </div>
  );
}

function AuthToast({ message, onClose }) {
  if (!message) {
    return null;
  }

  return (
    <div className="auth-toast" role="status">
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Fermer la notification">
        ×
      </button>
    </div>
  );
}

function LoginPage({ onAuthOpen }) {
  return (
    <main className="client-page login-page fade-in-page">
      <section className="client-hero login-hero">
        <div className="case-bg" aria-hidden="true"></div>
        <div className="case-shell">
          <div className="client-panel login-panel">
            <span>Connexion</span>
            <h1>Accéder à votre espace client</h1>
            <p>
              Connectez-vous pour retrouver vos demandes envoyées, votre statut de compte et les prochaines étapes
              liées à votre projet Digital Lab.
            </p>
            <button className="btn btn-primary" type="button" onClick={onAuthOpen}>
              Ouvrir la connexion
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function SiteHeader({
  onNavigate,
  pathname,
  session,
  isAdmin,
  clientUnreadMessageCount = 0,
  adminUnreadMessageCount = 0,
  onClientUnreadBadgeClick,
  onAdminUnreadBadgeClick,
  onLogout,
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("");
  const isAuditPage = pathname === auditLandingPath;
  const isEnglishPath = pathname === englishHomePath;
  const visibleActiveHref = isAuditPage ? auditLandingPath : pathname === "/" ? activeHref : "";
  const userEmail = session?.user?.email;
  const userDisplayName = getUserDisplayName(session);
  const hasClientUnreadMessages = Boolean(session && !isAdmin && clientUnreadMessageCount > 0);
  const hasAdminUnreadMessages = Boolean(session && isAdmin && adminUnreadMessageCount > 0);
  const clientUnreadTooltip =
    clientUnreadMessageCount > 1
      ? `Vous avez ${clientUnreadMessageCount} nouveaux messages`
      : "Vous avez 1 nouveau message";
  const adminUnreadTooltip =
    adminUnreadMessageCount > 1
      ? `${adminUnreadMessageCount} nouveaux messages client`
      : "1 nouveau message client";

  const handleNavigate = (event, target) => {
    event.preventDefault();
    setIsMenuOpen(false);
    onNavigate(target);
  };

  useEffect(() => {
    const updateScrollState = () => {
      setIsScrolled(window.scrollY > 24);
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });

    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      return undefined;
    }

    const sections = navLinks
      .map((link) => {
        const sectionId = link.href.split("#")[1];
        return sectionId ? document.getElementById(sectionId) : null;
      })
      .filter(Boolean);

    if (sections.length === 0) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((firstEntry, secondEntry) => secondEntry.intersectionRatio - firstEntry.intersectionRatio)[0];

        if (visibleEntry) {
          setActiveHref(`/#${visibleEntry.target.id}`);
        }
      },
      {
        rootMargin: "-36% 0px -52% 0px",
        threshold: [0.12, 0.2, 0.35],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <ScrollProgress />
      <header className={`navbar${isScrolled ? " is-scrolled" : ""}${isMenuOpen ? " is-menu-open" : ""}`}>
        <a className="navbar-brand" href="/#" onClick={(event) => handleNavigate(event, "/#")}>
          <img src="/logo-digital-lab.png" alt="" />
          <span>Digital Lab</span>
        </a>

        <button
          className="navbar-burger"
          type="button"
          aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((currentState) => !currentState)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className="navbar-menu" aria-label="Navigation principale">
          {navLinks.map((link, index) => (
            <a
              className={`${visibleActiveHref === link.href ? "is-active" : ""}${link.emphasized ? " nav-link-emphasis" : ""}`.trim()}
              href={link.href}
              target={isExternalLink(link.href) ? "_blank" : undefined}
              rel={isExternalLink(link.href) ? "noreferrer" : undefined}
              key={link.href}
              aria-current={visibleActiveHref === link.href ? (isAuditPage ? "page" : "true") : undefined}
              onClick={(event) => {
                if (link.label === "Audit gratuit") {
                  trackAuditCta(auditEvents.navClick, isAuditPage ? "audit_page_nav" : "global_nav");
                }

                if (isExternalLink(link.href)) {
                  setIsMenuOpen(false);
                  return;
                }

                handleNavigate(event, link.href);
              }}
            >
              {isEnglishPath ? englishNavLabels[index] : link.label}
            </a>
          ))}
          {/* LOT DL 2.5.4.4 — groups the CTA/auth/switcher cluster so desktop
              CSS can place it on the header's top row next to the brand,
              while .navbar-menu's nav links form their own row below. On
              mobile this wrapper is display:contents (see App.css), so it's
              invisible to layout and the dropdown list is byte-identical to
              before: same flat children, same order, same behavior. */}
          <div className="navbar-actions">
          <a
            className="navbar-cta"
            href="/#contact"
            onClick={(event) => {
              if (isAuditPage) {
                trackAuditCta(auditEvents.assistanceClick, "audit_nav_assistance");
              }

              handleNavigate(event, "/#contact");
            }}
          >
            {isEnglishPath ? "Discuss my project" : isAuditPage ? "Besoin d’aide ?" : "Parler de mon projet"}
          </a>
          {session ? (
            <div className="navbar-auth-state">
              <span title={userEmail}>{userDisplayName}</span>
              <button
                className={`navbar-client-button${hasClientUnreadMessages ? " has-unread" : ""}`}
                type="button"
                aria-label={hasClientUnreadMessages ? `Espace client, ${clientUnreadTooltip}` : undefined}
                title={hasClientUnreadMessages ? clientUnreadTooltip : undefined}
                onClick={() => {
                  setIsMenuOpen(false);
                  onNavigate("/dashboard");
                }}
              >
                {isEnglishPath ? "Client area" : "Espace client"}
                {hasClientUnreadMessages && (
                  <span
                    className="navbar-notification-badge is-clickable"
                    aria-hidden="true"
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsMenuOpen(false);
                      onClientUnreadBadgeClick?.();
                    }}
                  >
                    {clientUnreadMessageCount > 9 ? "9+" : clientUnreadMessageCount}
                  </span>
                )}
              </button>
              {isAdmin && (
                <button
                  className={`navbar-admin-button${hasAdminUnreadMessages ? " has-unread" : ""}`}
                  type="button"
                  aria-label={hasAdminUnreadMessages ? `Admin, ${adminUnreadTooltip}` : undefined}
                  title={hasAdminUnreadMessages ? adminUnreadTooltip : undefined}
                  onClick={() => {
                    setIsMenuOpen(false);
                    onNavigate("/admin");
                  }}
                >
                  Admin
                  {hasAdminUnreadMessages && (
                    <span
                      className="navbar-notification-badge is-clickable"
                      aria-hidden="true"
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsMenuOpen(false);
                        onAdminUnreadBadgeClick?.();
                      }}
                    >
                      {adminUnreadMessageCount > 9 ? "9+" : adminUnreadMessageCount}
                    </span>
                  )}
                </button>
              )}
              <button
                className="navbar-logout-button"
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onLogout();
                }}
              >
                {isEnglishPath ? "Sign out" : "Déconnexion"}
              </button>
            </div>
          ) : (
            <div className="navbar-auth-state is-guest">
              <button
                className="navbar-client-button"
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onNavigate("/login");
                }}
              >
                {isEnglishPath ? "Client area" : "Espace client"}
              </button>
              <button
                className="navbar-auth-button"
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onNavigate("/login");
                }}
              >
                {isEnglishPath ? "Sign in" : "Connexion"}
              </button>
            </div>
          )}

          <div className="lang-switcher" role="group" aria-label="Choisir la langue du site / Choose site language">
            <a
              className={`lang-switcher-link${!isEnglishPath ? " is-active" : ""}`}
              href="/"
              lang="fr"
              aria-current={!isEnglishPath ? "true" : undefined}
              aria-label="Français"
              onClick={(event) => (isEnglishPath ? handleNavigate(event, "/") : event.preventDefault())}
            >
              <span className="lang-switcher-flag lang-switcher-flag--fr" aria-hidden="true"></span>
              FR
            </a>
            <span className="lang-switcher-divider" aria-hidden="true">
              /
            </span>
            <a
              className={`lang-switcher-link${isEnglishPath ? " is-active" : ""}`}
              href="/en/"
              lang="en"
              aria-current={isEnglishPath ? "true" : undefined}
              aria-label="English"
              onClick={(event) => (!isEnglishPath ? handleNavigate(event, "/en/") : event.preventDefault())}
            >
              <span className="lang-switcher-flag lang-switcher-flag--gb" aria-hidden="true">
                <svg viewBox="0 0 60 30" focusable="false">
                  <rect width="60" height="30" fill="#00247d" />
                  <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
                  <path d="M0,0 L60,30 M60,0 L0,30" stroke="#cf142b" strokeWidth="2" />
                  <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
                  <path d="M30,0 V30 M0,15 H60" stroke="#cf142b" strokeWidth="6" />
                </svg>
              </span>
              EN
            </a>
          </div>
          </div>
        </nav>
      </header>
    </>
  );
}

function App() {
  const { session, isAuthLoading, authToast, clearAuthToast, logout } = useAuth();
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  const [selectedProject, setSelectedProject] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [profileRole, setProfileRole] = useState("");
  const [profileError, setProfileError] = useState("");
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [clientUnreadMessageCount, setClientUnreadMessageCount] = useState(0);
  const [clientUnreadRequestId, setClientUnreadRequestId] = useState("");
  const [clientMessageFocus, setClientMessageFocus] = useState(null);
  const [adminUnreadMessageCount, setAdminUnreadMessageCount] = useState(0);
  const [adminUnreadRequestId, setAdminUnreadRequestId] = useState("");
  const [adminMessageFocus, setAdminMessageFocus] = useState(null);
  const [isMobileCtaVisible, setIsMobileCtaVisible] = useState(false);
  const previousPageRef = useRef("/");
  const activeProject = getProjectFromPath(pathname);
  const activeServicePage = getServiceFromPath(pathname);
  const isAdmin = profileRole === "admin";

  const loadClientUnreadMessageCount = useCallback(async () => {
    if (!session?.user?.id || isAdmin) {
      setClientUnreadMessageCount(0);
      setClientUnreadRequestId("");
      return;
    }

    const { data: clientRequests, error: requestsError } = await getContactRequestsForUser(session.user.id);

    if (requestsError) {
      console.warn("CLIENT NAV UNREAD REQUESTS ERROR:", requestsError);
      setClientUnreadMessageCount(0);
      setClientUnreadRequestId("");
      return;
    }

    const requestIds = (clientRequests ?? []).map((request) => request.id).filter(Boolean);

    if (requestIds.length === 0) {
      setClientUnreadMessageCount(0);
      setClientUnreadRequestId("");
      return;
    }

    const { data, error } = await getUnreadMessageCounts({ requestIds, viewerRole: "client" });

    if (error) {
      console.warn("CLIENT NAV UNREAD MESSAGES ERROR:", error);
      setClientUnreadMessageCount(0);
      setClientUnreadRequestId("");
      return;
    }

    const totalUnread = Object.values(data ?? {}).reduce((total, count) => total + (Number(count) || 0), 0);
    const firstUnreadRequestId = requestIds.find((requestId) => Number(data?.[requestId]) > 0) ?? "";
    setClientUnreadMessageCount(totalUnread);
    setClientUnreadRequestId(firstUnreadRequestId);
  }, [isAdmin, session?.user?.id]);

  const loadAdminUnreadMessageCount = useCallback(async () => {
    if (!session?.user?.id || !isAdmin) {
      setAdminUnreadMessageCount(0);
      setAdminUnreadRequestId("");
      return;
    }

    const { data: allRequests, error: requestsError } = await getAllContactRequests();

    if (requestsError) {
      console.warn("ADMIN NAV UNREAD REQUESTS ERROR:", requestsError);
      setAdminUnreadMessageCount(0);
      setAdminUnreadRequestId("");
      return;
    }

    const requestIds = (allRequests ?? []).map((request) => request.id).filter(Boolean);

    if (requestIds.length === 0) {
      setAdminUnreadMessageCount(0);
      setAdminUnreadRequestId("");
      return;
    }

    const { data, error } = await getUnreadMessageCounts({ requestIds, viewerRole: "admin" });

    if (error) {
      console.warn("ADMIN NAV UNREAD MESSAGES ERROR:", error);
      setAdminUnreadMessageCount(0);
      setAdminUnreadRequestId("");
      return;
    }

    const totalUnread = Object.values(data ?? {}).reduce((total, count) => total + (Number(count) || 0), 0);
    const firstUnreadRequestId = requestIds.find((requestId) => Number(data?.[requestId]) > 0) ?? "";
    setAdminUnreadMessageCount(totalUnread);
    setAdminUnreadRequestId(firstUnreadRequestId);
  }, [isAdmin, session?.user?.id]);

  const navigate = (target) => {
    if (isExternalLink(target)) {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }

    window.history.pushState({}, "", target);
    setPathname(normalizePathname(window.location.pathname));

    if (target.includes("#") && window.location.hash) {
      window.setTimeout(() => {
        scrollToElementWithHeaderOffset(window.location.hash);
      }, 0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const openClientUnreadMessages = useCallback(() => {
    if (!clientUnreadRequestId) {
      return;
    }

    setClientMessageFocus({
      requestId: clientUnreadRequestId,
      tab: "conversation",
      key: Date.now(),
    });
    navigate("/dashboard");
  }, [clientUnreadRequestId]);

  const openAdminUnreadMessages = useCallback(() => {
    if (!adminUnreadRequestId) {
      return;
    }

    setAdminMessageFocus({
      requestId: adminUnreadRequestId,
      tab: "conversation",
      key: Date.now(),
    });
    navigate("/admin");
  }, [adminUnreadRequestId]);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(normalizePathname(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    applyPageMetadata(pathname);
    trackPageView();
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    if (pathname === "/dashboard" || pathname === "/espace-client" || pathname === "/admin") {
      navigate("/");
    }
  };

  const isDashboardPath = pathname === "/dashboard" || pathname === "/espace-client";
  const isLoginPath = pathname === "/login";
  const isAdminPath = pathname === "/admin";
  const isDesignSystemPath = pathname === "/design-system";
  const isAuditLandingPath = pathname === auditLandingPath;

  useEffect(() => {
    let isMounted = true;

    if (!session?.user?.id) {
      setProfileRole("");
      setProfileError("");
      setIsProfileLoading(false);
      return undefined;
    }

    setIsProfileLoading(true);

    getProfileForUser(session.user.id).then(({ data, error }) => {
      if (!isMounted) {
        return;
      }

      const profile = error ? null : data;

      if (error) {
        console.error("Profile role fetch failed:", error.message);
      }

      setProfileRole(profile?.role ?? "");
      setProfileError(error?.message ?? "");
      setIsProfileLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [session]);

  useEffect(() => {
    loadClientUnreadMessageCount();
  }, [loadClientUnreadMessageCount]);

  useEffect(() => {
    loadAdminUnreadMessageCount();
  }, [loadAdminUnreadMessageCount]);

  useEffect(() => {
    if (!supabase || !session?.user?.id || isAdmin) {
      return undefined;
    }

    const channel = supabase
      .channel(`client-nav-unread-messages:${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "request_messages" }, () => {
        loadClientUnreadMessageCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, loadClientUnreadMessageCount, session?.user?.id]);

  useEffect(() => {
    if (!supabase || !session?.user?.id || !isAdmin) {
      return undefined;
    }

    const channel = supabase
      .channel(`admin-nav-unread-messages:${session.user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "request_messages" }, () => {
        loadAdminUnreadMessageCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, loadAdminUnreadMessageCount, session?.user?.id]);

  const closeAuthModal = () => {
    setIsAuthOpen(false);

    if (isLoginPath && !session) {
      navigate(previousPageRef.current || "/");
    }
  };

  useEffect(() => {
    let redirectTimer = 0;

    if (!isAuthLoading && isDashboardPath && !session) {
      window.history.replaceState({}, "", "/login");
      redirectTimer = window.setTimeout(() => {
        setPathname("/login");
        setIsAuthOpen(true);
      }, 0);
    }

    if (!isAuthLoading && isLoginPath && session) {
      window.history.replaceState({}, "", "/dashboard");
      redirectTimer = window.setTimeout(() => {
        setPathname("/dashboard");
        setIsAuthOpen(false);
      }, 0);
    }

    if (!isAuthLoading && !isProfileLoading && isAdminPath && !session) {
      window.history.replaceState({}, "", "/login");
      redirectTimer = window.setTimeout(() => {
        setPathname("/login");
        setIsAuthOpen(true);
      }, 0);
    }

    if (!isAuthLoading && !isProfileLoading && isAdminPath && session && !profileError && !isAdmin) {
      window.history.replaceState({}, "", "/dashboard");
      redirectTimer = window.setTimeout(() => {
        setPathname("/dashboard");
      }, 0);
    }

    return () => window.clearTimeout(redirectTimer);
  }, [isAdmin, isAdminPath, isAuthLoading, isDashboardPath, isLoginPath, isProfileLoading, profileError, session]);

  useEffect(() => {
    if (!isLoginPath && !isDashboardPath && !isAdminPath) {
      previousPageRef.current = pathname;
    }
  }, [isAdminPath, isDashboardPath, isLoginPath, pathname]);

  useEffect(() => {
    let modalTimer = 0;

    if (!isAuthLoading && isLoginPath && !session) {
      modalTimer = window.setTimeout(() => {
        setIsAuthOpen(true);
      }, 0);
    }

    return () => window.clearTimeout(modalTimer);
  }, [isAuthLoading, isLoginPath, session]);

  useEffect(() => {
    const revealItems = document.querySelectorAll(".reveal-on-scroll:not(.proof-reveal-item)");

    if (revealItems.length === 0) {
      return undefined;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return undefined;
    }

    const revealItem = (entry, observer) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => revealItem(entry, observer));
      },
      { threshold: 0.18 },
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    const proofSection = document.querySelector(".proof-reveal-section");
    const proofRevealItems = proofSection
      ? [proofSection, ...proofSection.querySelectorAll(".proof-reveal-item")]
      : [];

    if (!proofSection || proofRevealItems.length === 0) {
      return undefined;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      proofRevealItems.forEach((item) => item.classList.add("is-visible"));
      return undefined;
    }

    let revealTimer = 0;
    let isRevealScheduled = false;

    const revealProofSection = () => {
      if (isRevealScheduled) {
        return;
      }

      isRevealScheduled = true;
      revealTimer = window.setTimeout(() => {
        proofRevealItems.forEach((item) => item.classList.add("is-visible"));
      }, 200);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealProofSection();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.01 },
    );

    observer.observe(proofSection);

    return () => {
      window.clearTimeout(revealTimer);
      observer.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/") {
      setIsMobileCtaVisible(false);
      return undefined;
    }

    let animationFrame = 0;

    const updateMobileCta = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const hero = document.querySelector(".hero");
        const contact = document.getElementById("contact");

        if (!hero || !contact || window.innerWidth > 768) {
          setIsMobileCtaVisible(false);
          return;
        }

        const heroBottom = hero.getBoundingClientRect().bottom;
        const contactTop = contact.getBoundingClientRect().top;
        const hasPassedHero = heroBottom < window.innerHeight * 0.72;
        const isNearContact = contactTop < window.innerHeight * 0.78;

        setIsMobileCtaVisible(hasPassedHero && !isNearContact);
      });
    };

    updateMobileCta();
    window.addEventListener("scroll", updateMobileCta, { passive: true });
    window.addEventListener("resize", updateMobileCta);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("scroll", updateMobileCta);
      window.removeEventListener("resize", updateMobileCta);
    };
  }, [pathname]);

  if (pathname.startsWith("/projects/")) {
    return (
      <>
        <SiteHeader
          onNavigate={navigate}
          pathname={pathname}
          session={session}
          isAdmin={isAdmin}
          clientUnreadMessageCount={clientUnreadMessageCount}
          adminUnreadMessageCount={adminUnreadMessageCount}
          onClientUnreadBadgeClick={openClientUnreadMessages}
          onAdminUnreadBadgeClick={openAdminUnreadMessages}
          onAuthOpen={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
        />

        <ProjectCasePage project={activeProject} onNavigate={navigate} />

        <SiteFooter onNavigate={navigate} />
        {isAuthOpen && <AuthModal onClose={closeAuthModal} />}
        <AuthToast message={authToast} onClose={clearAuthToast} />
      </>
    );
  }

  if (pathname.startsWith("/services/")) {
    return (
      <>
        <SiteHeader
          onNavigate={navigate}
          pathname={pathname}
          session={session}
          isAdmin={isAdmin}
          clientUnreadMessageCount={clientUnreadMessageCount}
          adminUnreadMessageCount={adminUnreadMessageCount}
          onClientUnreadBadgeClick={openClientUnreadMessages}
          onAdminUnreadBadgeClick={openAdminUnreadMessages}
          onAuthOpen={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
        />

        <ServicePage servicePage={activeServicePage} onNavigate={navigate} />

        <SiteFooter onNavigate={navigate} />
        {isAuthOpen && <AuthModal onClose={closeAuthModal} />}
        <AuthToast message={authToast} onClose={clearAuthToast} />
      </>
    );
  }

  if (pathname === "/mentions-legales") {
    return (
      <>
        <SiteHeader
          onNavigate={navigate}
          pathname={pathname}
          session={session}
          isAdmin={isAdmin}
          clientUnreadMessageCount={clientUnreadMessageCount}
          adminUnreadMessageCount={adminUnreadMessageCount}
          onClientUnreadBadgeClick={openClientUnreadMessages}
          onAdminUnreadBadgeClick={openAdminUnreadMessages}
          onAuthOpen={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
        />

        <LegalNoticePage onNavigate={navigate} />

        <SiteFooter onNavigate={navigate} />
        {isAuthOpen && <AuthModal onClose={closeAuthModal} />}
        <AuthToast message={authToast} onClose={clearAuthToast} />
      </>
    );
  }

  if (isDesignSystemPath) {
    return (
      <>
        <SiteHeader
          onNavigate={navigate}
          pathname={pathname}
          session={session}
          isAdmin={isAdmin}
          clientUnreadMessageCount={clientUnreadMessageCount}
          adminUnreadMessageCount={adminUnreadMessageCount}
          onClientUnreadBadgeClick={openClientUnreadMessages}
          onAdminUnreadBadgeClick={openAdminUnreadMessages}
          onAuthOpen={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
        />

        <DesignSystemPage />

        <SiteFooter onNavigate={navigate} />
        {isAuthOpen && <AuthModal onClose={closeAuthModal} />}
        <AuthToast message={authToast} onClose={clearAuthToast} />
      </>
    );
  }

  if (isAdminPath) {
    return (
      <>
        <SiteHeader
          onNavigate={navigate}
          pathname={pathname}
          session={session}
          isAdmin={isAdmin}
          clientUnreadMessageCount={clientUnreadMessageCount}
          adminUnreadMessageCount={adminUnreadMessageCount}
          onClientUnreadBadgeClick={openClientUnreadMessages}
          onAdminUnreadBadgeClick={openAdminUnreadMessages}
          onAuthOpen={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
        />

        {isAdmin || isAuthLoading || isProfileLoading || profileError ? (
          <AdminDashboardPage
            session={session}
            isAuthLoading={isAuthLoading || isProfileLoading}
            profileError={profileError}
            messageFocus={adminMessageFocus}
            onUnreadCountChange={setAdminUnreadMessageCount}
          />
        ) : (
          <ClientAreaPage
            session={session}
            isAuthLoading={isAuthLoading}
            messageFocus={clientMessageFocus}
            onUnreadCountChange={setClientUnreadMessageCount}
            onAuthOpen={() => setIsAuthOpen(true)}
            onLogout={handleLogout}
          />
        )}

        <SiteFooter onNavigate={navigate} />
        {isAuthOpen && <AuthModal onClose={closeAuthModal} />}
        <AuthToast message={authToast} onClose={clearAuthToast} />
      </>
    );
  }

  if (isDashboardPath) {
    return (
      <>
        <SiteHeader
          onNavigate={navigate}
          pathname={pathname}
          session={session}
          isAdmin={isAdmin}
          clientUnreadMessageCount={clientUnreadMessageCount}
          adminUnreadMessageCount={adminUnreadMessageCount}
          onClientUnreadBadgeClick={openClientUnreadMessages}
          onAdminUnreadBadgeClick={openAdminUnreadMessages}
          onAuthOpen={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
        />

        <ClientAreaPage
          session={session}
          isAuthLoading={isAuthLoading}
          messageFocus={clientMessageFocus}
          onUnreadCountChange={setClientUnreadMessageCount}
          onAuthOpen={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
        />

        <SiteFooter onNavigate={navigate} />
        {isAuthOpen && <AuthModal onClose={closeAuthModal} />}
        <AuthToast message={authToast} onClose={clearAuthToast} />
      </>
    );
  }

  if (isLoginPath) {
    return (
      <>
        <SiteHeader
          onNavigate={navigate}
          pathname={pathname}
          session={session}
          isAdmin={isAdmin}
          clientUnreadMessageCount={clientUnreadMessageCount}
          adminUnreadMessageCount={adminUnreadMessageCount}
          onClientUnreadBadgeClick={openClientUnreadMessages}
          onAdminUnreadBadgeClick={openAdminUnreadMessages}
          onAuthOpen={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
        />

        <LoginPage onAuthOpen={() => setIsAuthOpen(true)} />

        <SiteFooter onNavigate={navigate} />
        {isAuthOpen && <AuthModal onClose={closeAuthModal} />}
        <AuthToast message={authToast} onClose={clearAuthToast} />
      </>
    );
  }

  if (isAuditLandingPath) {
    return (
      <>
        <SiteHeader
          onNavigate={navigate}
          pathname={pathname}
          session={session}
          isAdmin={isAdmin}
          clientUnreadMessageCount={clientUnreadMessageCount}
          adminUnreadMessageCount={adminUnreadMessageCount}
          onClientUnreadBadgeClick={openClientUnreadMessages}
          onAdminUnreadBadgeClick={openAdminUnreadMessages}
          onAuthOpen={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
        />

        <AuditLandingPage onNavigate={navigate} />

        <AuditFooterReminder onNavigate={navigate} />
        <SiteFooter onNavigate={navigate} />
        {isAuthOpen && <AuthModal onClose={closeAuthModal} />}
        <AuthToast message={authToast} onClose={clearAuthToast} />
      </>
    );
  }

  if (pathname === englishHomePath) {
    return (
      <>
        <SiteHeader
          onNavigate={navigate}
          pathname={pathname}
          session={session}
          isAdmin={isAdmin}
          clientUnreadMessageCount={clientUnreadMessageCount}
          adminUnreadMessageCount={adminUnreadMessageCount}
          onClientUnreadBadgeClick={openClientUnreadMessages}
          onAdminUnreadBadgeClick={openAdminUnreadMessages}
          onAuthOpen={() => setIsAuthOpen(true)}
          onLogout={handleLogout}
        />

        <EnglishHomePage onNavigate={navigate} onAuthOpen={() => setIsAuthOpen(true)} />

        <AuditFooterReminder onNavigate={navigate} isEnglish />
        <SiteFooter onNavigate={navigate} isEnglish />
        {isAuthOpen && <AuthModal onClose={closeAuthModal} />}
        <AuthToast message={authToast} onClose={clearAuthToast} />
      </>
    );
  }

  return (
    <>
      <SiteHeader
        onNavigate={navigate}
        pathname={pathname}
        session={session}
        isAdmin={isAdmin}
        clientUnreadMessageCount={clientUnreadMessageCount}
        adminUnreadMessageCount={adminUnreadMessageCount}
        onClientUnreadBadgeClick={openClientUnreadMessages}
        onAdminUnreadBadgeClick={openAdminUnreadMessages}
        onAuthOpen={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      <main>
        <section className="hero">
          <div className="hero-smoke" aria-hidden="true">
            <div className="smoke-left"></div>
            <div className="smoke-right"></div>
            <div className="smoke-center"></div>
            <div className="hero-smoke smoke-ribbon-one"></div>
            <div className="hero-smoke smoke-ribbon-two">

            </div>
          </div>

          <div className="hero-content">
          
            <a href="#" className="logo">
          <img src="/logo-digital-lab.png" alt="Digital Lab" />
          <span>Digital Lab</span>
        </a>
        
            <div className="badge">
              <span></span>
              Studio digital pour entrepreneurs
            </div>

            <h1 className="hero-title">
              <span className="hero-title-line">Transformons vos idées</span>
              <span className="hero-title-line">
                en <span className="hero-title-accent">solutions digitales</span>.
              </span>
            </h1>
            

            <p>
              Sites, automatisations et outils IA conçus pour simplifier le quotidien des petites entreprises.
            </p>

            <div className="hero-buttons">
              <a
                href={auditLaunchHref}
                className="btn btn-primary"
                target={isExternalLink(auditLaunchHref) ? "_blank" : undefined}
                rel={isExternalLink(auditLaunchHref) ? "noreferrer" : undefined}
                onClick={(event) => {
                  handleAuditLaunchClick(event, {
                    eventName: auditEvents.homeCta,
                    location: "homepage_hero",
                    onNavigate: navigate,
                  });
                }}
              >
                Lancer mon audit gratuit <strong>→</strong>
              </a>

              <a href="#services" className="btn btn-secondary">
                Découvrir nos solutions
              </a>
            </div>

          </div>
        </section>

        <section className="section brand-story-section reveal-on-scroll reveal-section">
          <div className="section-inner about-layout">
            <div className="section-heading">
              <span>Pourquoi Digital Lab ?</span>
              <h2>Le numérique doit simplifier le travail, pas le compliquer.</h2>
            </div>

            <div className="about-content glass-card premium-card gradient-border soft-hover reveal-on-scroll reveal-card" style={{ "--reveal-delay": "120ms" }}>
              <p>
                Beaucoup d’entrepreneurs passent plus de temps à gérer leurs outils qu’à développer leur activité.
              </p>
              <p>
                Digital Lab est né d’une conviction simple : un outil numérique doit aider à décider, organiser et
                avancer avec plus de sérénité.
              </p>
              <p>
                L’accompagnement est pensé pour durer, avec des bases fiables et une évolution progressive selon vos
                besoins.
              </p>
            </div>
          </div>
        </section>

        <AuditSpotlightSection onNavigate={navigate} />

        <section className="section services-section reveal-on-scroll reveal-section" id="services">
          <div className="section-inner">
            <div className="section-heading">
              <span>Services</span>
              <h2>Des outils pensés pour votre activité</h2>
              <p>Chaque service répond à un besoin concret : être visible, gagner du temps ou mieux piloter votre projet.</p>
            </div>

            <div className="services-accordion">
              {services.map((service, index) => (
                <div
                  className="reveal-on-scroll reveal-card"
                  key={service.title}
                  style={{ "--reveal-delay": `${index * 80}ms` }}
                >
                  <ServiceAccordionCard service={service} onNavigate={navigate} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <AIWebsiteTransformationSection />

        <section className="section projects-section reveal-on-scroll reveal-section" id="projets">
          <div className="section-inner">
            <div className="section-heading">
              <span>Projets</span>
              <h2>Mes projets phares</h2>
            </div>

            <div className="ai-lab-intro glass-section premium-card premium-card-hero gradient-border soft-hover reveal-on-scroll reveal-card" style={{ "--reveal-delay": "80ms" }}>
              <div className="ai-lab-intro-copy">
                <span className="ai-lab-kicker">Laboratoire &amp; expérimentation</span>
                <h3>Laboratoire d’innovation IA</h3>
                <p>
                  Ces projets constituent mon laboratoire d’innovation autour de l’intelligence artificielle appliquée
                  aux entreprises. J’y conçois et développe des solutions SaaS, des assistants IA, des outils métiers
                  et des automatisations destinés à améliorer les processus opérationnels.
                </p>
              </div>
              <p className="ai-lab-technologies">
                Claude <span>•</span> ChatGPT <span>•</span> Cursor <span>•</span> Lovable <span>•</span> React
                <span>•</span> Supabase <span>•</span> APIs <span>•</span> WordPress <span>•</span> JavaScript
                <span>•</span> GitHub <span>•</span> Vercel
              </p>
            </div>

            <div className="cards-grid project-grid">
              {projects.map((project, index) => (
                <article
                  className="glass-card project-card premium-card gradient-border soft-hover reveal-on-scroll reveal-card"
                  key={project.title}
                  style={{ "--reveal-delay": `${index * 90}ms` }}
                  onMouseEnter={handleProjectEnter}
                  onMouseLeave={handleProjectLeave}
                >
                  <div className="project-media">
                    {project.image ? (
                      (() => {
                        const optimizedImage = getOptimizedImage(project.image);

                        return (
                          <img
                            className="project-image"
                            src={optimizedImage.src}
                            srcSet={optimizedImage.srcSet}
                            sizes="(max-width: 768px) 88vw, 420px"
                            alt={`Aperçu du projet ${project.title}`}
                            loading="lazy"
                            decoding="async"
                          />
                        );
                      })()
                    ) : (
                      <div className="project-placeholder"></div>
                    )}
                    {project.video && (
                      <DeferredVideo
                        muted
                        loop
                        playsInline
                        poster={getOptimizedImage(project.image).src}
                        src={project.video}
                        ariaLabel={`Aperçu vidéo du projet ${project.title}`}
                      />
                    )}
                    <span className="project-media-overlay"></span>
                  </div>
                  <div className="project-body">
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                    <div className="tags">
                      {project.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                    <div className="project-actions">
                      <button
                        className="project-detail-button"
                        type="button"
                        onClick={() => setSelectedProject(project)}
                      >
                        Voir le détail
                      </button>
                      <a
                        className="project-link"
                        href={project.link}
                        target={isExternalLink(project.link) ? "_blank" : undefined}
                        rel={isExternalLink(project.link) ? "noreferrer" : undefined}
                        onClick={(event) => {
                          event.preventDefault();
                          navigate(project.link);
                        }}
                      >
                        Voir le projet
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="ai-roadmap glass-section premium-card premium-card-subtle gradient-border soft-hover reveal-on-scroll reveal-card" style={{ "--reveal-delay": "120ms" }}>
              <div className="ai-roadmap-heading">
                <span>Roadmap IA</span>
                <h3>En développement</h3>
                <p>
                  De nouveaux modules sont en cours de conception pour renforcer l’écosystème Digital Lab autour de
                  l’automatisation, de l’IA générative et de l’accompagnement des entreprises.
                </p>
              </div>
              <ul className="ai-roadmap-list">
                <li className="premium-card roadmap-mini-card soft-hover"><strong>AI Website Transformation</strong><span>Refonte de sites web assistée par IA</span></li>
                <li className="premium-card roadmap-mini-card soft-hover"><strong>AI Growth Engine</strong><span>Automatisation de contenus SEO et marketing</span></li>
                <li className="premium-card roadmap-mini-card soft-hover"><strong>AI Workforce</strong><span>Architecture d’agents IA spécialisés</span></li>
              </ul>
              <p className="ai-roadmap-note">
                Ces projets sont actuellement en phase de conception ou de prototypage et seront publiés
                progressivement.
              </p>
            </div>

            <div className="projects-more">
              <a
                className="btn btn-secondary"
                href="https://elenamihalska70-creator.github.io/Portfolio/"
                target="_blank"
                rel="noreferrer"
              >
                Voir plus de projets
              </a>
            </div>
          </div>
        </section>

        <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />

        <ProjectEstimator />

        <BlogCarousel />

        <section className="section method-section reveal-on-scroll reveal-section" id="method">
          <div className="section-inner">
            <div className="section-heading">
              <span>Méthode</span>
              <h2>Une méthode pensée pour décider sereinement</h2>
              <p>Chaque étape transforme une idée en choix concrets, sans jargon inutile.</p>
            </div>

            <div className="method-timeline">
              {missionSteps.map((step, index) => (
                <article
                  className="method-step reveal-on-scroll reveal-card"
                  key={step.title}
                  style={{ "--reveal-delay": `${index * 80}ms` }}
                >
                  <div className="method-step-marker">
                    <span>{step.number}</span>
                  </div>
                  <div className="method-step-card premium-card gradient-border soft-hover">
                    <span className="method-step-icon" aria-hidden="true">
                      {step.icon}
                    </span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="method-badges" role="group" aria-label="Garanties de méthode">
              {methodBadges.map((badge) => (
                <span className="badge-pill" key={badge}>✓ {badge}</span>
              ))}
            </div>

            <div className="method-reassurance glass-section premium-card premium-card-subtle gradient-border soft-hover reveal-on-scroll reveal-card">
              <span aria-hidden="true">✓</span>
              <p>
                Digital Lab existe pour rendre le numérique plus utile, plus fiable et plus durable pour les entrepreneurs.
              </p>
            </div>
          </div>
        </section>

        <section className="section about-section reveal-on-scroll reveal-section" id="about">
          <div className="section-inner about-layout">
            <div className="section-heading">
              <span>À propos</span>
              <h2>Un studio né d’une expérience entrepreneuriale réelle</h2>
            </div>

            <div className="about-content glass-card premium-card gradient-border soft-hover reveal-on-scroll reveal-card" style={{ "--reveal-delay": "120ms" }}>
              <p>
                Avant Digital Lab, il y a plus de 25 ans d’entrepreneuriat : des clients à comprendre, des budgets à
                arbitrer, des priorités qui changent, des décisions à prendre vite.
              </p>
              <p>
                Cette expérience nourrit aujourd’hui une approche de cheffe de projet digital : créer des solutions
                concrètes, utiles au quotidien, capables d’accompagner une activité dans le temps.
              </p>

              <ul className="about-list">
                <li>Compréhension des enjeux terrain</li>
                <li>Décisions guidées par l’usage réel</li>
                <li>Solutions pratiques, fiables et évolutives</li>
                <li>Relation humaine et suivie</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section trust-section reveal-on-scroll reveal-section">
          <div className="section-inner">
            <div className="section-heading">
              <span>Confiance</span>
              <h2>Une approche centrée sur votre réalité métier</h2>
              <p>
                La technologie n’est jamais le point de départ. Elle sert votre organisation, vos clients et votre croissance.
              </p>
            </div>

            <div className="trust-grid">
              {trustCards.map((card, index) => (
                <article
                  className="trust-card premium-card gradient-border soft-hover reveal-on-scroll reveal-card"
                  key={card.title}
                  style={{ "--reveal-delay": `${index * 80}ms` }}
                >
                  <span className="trust-icon" aria-hidden="true">
                    {card.icon}
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>

            <div className="trust-badges" role="group" aria-label="Compétences et outils">
              {trustBadges.map((badge, index) => (
                <span
                  className="badge-pill reveal-on-scroll reveal-card"
                  key={badge}
                  style={{ "--reveal-delay": `${index * 45}ms` }}
                >
                  ✓ {badge}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section
          className="section proof-section proof-reveal-section reveal-on-scroll reveal-section proof-reveal-item"
          style={{ "--reveal-delay": "0ms" }}
        >
          <div className="section-inner">
            <div
              className="section-heading reveal-on-scroll reveal-section proof-reveal-item"
              style={{ "--reveal-delay": "0ms" }}
            >
              <span>Preuves & confiance</span>
              <h2>Une expérience concrète, pensée pour avancer avec justesse</h2>
              <p>
                Des projets conçus pour rendre les idées plus lisibles, les échanges plus fluides et les décisions plus sûres.
              </p>
            </div>

            <div className="proof-stats">
              {proofStats.map((stat, index) => (
                <article
                  className="proof-stat-card premium-card gradient-border soft-hover reveal-on-scroll reveal-card proof-reveal-item"
                  key={stat.label}
                  style={{ "--reveal-delay": `${140 + index * 70}ms` }}
                >
                  <span className="proof-icon" aria-hidden="true">
                    {stat.icon}
                  </span>
                  <strong>
                    {typeof stat.value === "number" ? (
                      <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                    ) : (
                      stat.label
                    )}
                  </strong>
                  {(stat.text || typeof stat.value === "number") && <p>{stat.text || stat.label}</p>}
                </article>
              ))}
            </div>

            <div
              className="proof-stack-panel premium-card gradient-border soft-hover reveal-on-scroll reveal-card proof-reveal-item"
              style={{ "--reveal-delay": "480ms" }}
            >
              <div>
                <span>Outils</span>
                <h3>Une stack discrète, choisie selon le besoin</h3>
              </div>
              <div className="proof-stack">
                {proofStack.map((tool) => (
                  <span key={tool}>{tool}</span>
                ))}
              </div>
            </div>

            <div className="proof-workflow" role="group" aria-label="Mini flux réel">
              {proofWorkflow.map((step, index) => (
                <article
                  className="proof-workflow-step premium-card gradient-border soft-hover reveal-on-scroll reveal-card proof-reveal-item"
                  key={step.title}
                  style={{ "--reveal-delay": `${620 + index * 70}ms` }}
                >
                  <span aria-hidden="true">{step.icon}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>

            <div
              className="proof-highlight premium-card premium-card-subtle gradient-border soft-hover reveal-on-scroll reveal-card proof-reveal-item"
              style={{ "--reveal-delay": "1040ms" }}
            >
              <span aria-hidden="true">✓</span>
              <p>
                J’accompagne les entrepreneurs qui veulent avancer avec méthode, sans complexité inutile.
              </p>
            </div>
          </div>
        </section>

        <section className="section faq-section reveal-on-scroll reveal-section" id="faq">
          <div className="section-inner">
            <div className="section-heading">
              <span>FAQ</span>
              <h2>Questions fréquentes</h2>
            </div>

            <div className="faq-list">
              <details className="faq-item reveal-on-scroll reveal-card" style={{ "--reveal-delay": "0ms" }}>
                <summary>Je ne sais pas exactement ce qu’il me faut.</summary>
                <p>
                  C’est fréquent. Je vous aide à clarifier le besoin, les priorités et la meilleure première étape.
                </p>
              </details>

              <details className="faq-item reveal-on-scroll reveal-card" style={{ "--reveal-delay": "80ms" }}>
                <summary>Travaillez-vous avec des petits budgets ?</summary>
                <p>
                  Oui. Le projet peut démarrer avec une version ciblée, puis évoluer selon vos moyens et vos retours.
                </p>
              </details>

              <details className="faq-item reveal-on-scroll reveal-card" style={{ "--reveal-delay": "160ms" }}>
                <summary>Pouvez-vous reprendre un site existant ?</summary>
                <p>
                  Oui. Je peux corriger, réorganiser ou améliorer un site déjà en ligne.
                </p>
              </details>

              <details className="faq-item reveal-on-scroll reveal-card" style={{ "--reveal-delay": "240ms" }}>
                <summary>Combien de temps faut-il pour créer un projet ?</summary>
                <p>
                  Cela dépend du périmètre. Une première version ciblée permet souvent d’avancer rapidement.
                </p>
              </details>

              <details className="faq-item reveal-on-scroll reveal-card" style={{ "--reveal-delay": "320ms" }}>
                <summary>Peut-on commencer petit puis ajouter des fonctionnalités plus tard ?</summary>
                <p>
                  Oui. L’objectif est de construire une base fiable, puis d’ajouter ce qui devient utile.
                </p>
              </details>

              <details className="faq-item reveal-on-scroll reveal-card" style={{ "--reveal-delay": "400ms" }}>
                <summary>Travaillez-vous avec des associations et petites structures ?</summary>
                <p>
                  Oui. J’accompagne les entrepreneurs, associations et projets locaux qui veulent avancer avec méthode.
                </p>
              </details>
            </div>
          </div>
        </section>

        <section className="section improvements-section reveal-on-scroll reveal-section">
          <div className="section-inner">
            <div className="section-heading">
              <span>Impact</span>
              <h2>Ce que votre projet peut améliorer</h2>
              <p>
                Un bon outil digital doit soutenir votre activité, pas seulement exister en ligne.
              </p>
            </div>

            <div className="improvements-grid">
              {improvementCards.map((card, index) => (
                <article
                  className="improvement-card premium-card gradient-border soft-hover reveal-on-scroll reveal-card"
                  key={card.title}
                  style={{ "--reveal-delay": `${index * 80}ms` }}
                >
                  <span className="improvement-icon" aria-hidden="true">
                    {card.icon}
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section included-section reveal-on-scroll reveal-section">
          <div className="section-inner">
            <div className="section-heading">
              <span>Inclus</span>
              <h2>Ce qui est inclus dans chaque projet</h2>
              <p>
                Les bases essentielles sont intégrées dès la livraison.
              </p>
            </div>

            <div className="included-grid">
              {includedProjectItems.map((item, index) => (
                <article
                  className="included-card premium-card gradient-border soft-hover reveal-on-scroll reveal-card"
                  key={item.title}
                  style={{ "--reveal-delay": `${index * 70}ms` }}
                >
                  <span className="included-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>

            <div className="included-reassurance reveal-on-scroll reveal-card" style={{ "--reveal-delay": "420ms" }}>
              <div>
                <span>✓ Pas de coûts cachés</span>
                <span>✓ Bonnes pratiques intégrées</span>
                <span>✓ Solution prête à évoluer</span>
              </div>
              <p>Vous recevez une solution pensée pour durer, pas simplement une page web.</p>
            </div>
          </div>
        </section>

        <section className="section contact-section reveal-on-scroll reveal-section" id="contact">
          <div className="section-inner contact-panel reveal-on-scroll reveal-card" style={{ "--reveal-delay": "120ms" }}>
            <div className="contact-copy">
              <span>Contact</span>
              <h2>Parlons de votre projet.</h2>
              <p>
                Même si votre idée est encore floue, un premier échange peut aider à clarifier la bonne direction.
              </p>
            </div>

            <ul className="contact-points">
              <li className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "200ms" }}>
                site ou refonte
              </li>
              <li className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "260ms" }}>
                amélioration d’un existant
              </li>
              <li className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "320ms" }}>
                SEO & visibilité
              </li>
              <li className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "380ms" }}>
                automatisation utile
              </li>
              <li className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "440ms" }}>
                prototype ou MVP
              </li>
            </ul>

            <div className="contact-badges" role="group" aria-label="Informations rassurantes">
              <span className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "520ms" }}>
                ✓ Premier échange sans jargon
              </span>
              <span className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "580ms" }}>
                ✓ Cadrage concret
              </span>
              <span className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "640ms" }}>
                ✓ Relation suivie
              </span>
            </div>

            <address className="contact-details reveal-on-scroll reveal-card" style={{ "--reveal-delay": "660ms" }}>
              <div className="contact-brand-block">
                <strong>{businessContact.brand}</strong>
                <span>Transformation digitale • IA • Automatisation</span>
              </div>

              <div className="contact-founder-block">
                <strong>{businessContact.name}</strong>
                <span>Fondatrice & Cheffe de projet digitale</span>
              </div>

              <div className="contact-link-list" role="group" aria-label="Coordonnées Digital Lab">
                <a href={`mailto:${businessContact.email}`} aria-label="Envoyer un e-mail à Digital Lab">
                  <ContactIcon type="mail" />
                  <span>{businessContact.email}</span>
                </a>
                <a href={businessContact.phoneHref} aria-label="Appeler Digital Lab">
                  <ContactIcon type="phone" />
                  <span>{businessContact.phoneDisplay}</span>
                </a>
                <a
                  href={businessContact.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Ouvrir le site Digital Lab"
                >
                  <ContactIcon type="globe" />
                  <span>{businessContact.siteDisplay}</span>
                </a>
              </div>

              <div className="contact-social-links" role="group" aria-label="Profils professionnels">
                {socialLinks.map((socialLink) => (
                  <a
                    className="social-icon-link"
                    href={socialLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={socialLink.label}
                    title={socialLink.title}
                    key={socialLink.key}
                  >
                    <ContactIcon type={socialLink.key} />
                  </a>
                ))}
              </div>
            </address>

            <ContactForm onAuthOpen={() => setIsAuthOpen(true)} />

            <div className="contact-actions">
              <a className="btn btn-primary contact-cta-primary" href={`mailto:${businessContact.email}?subject=Demande%20de%20projet%20Digital%20Lab`}>
                Envoyer un email
              </a>
              <a className="btn btn-secondary contact-cta-secondary" href={`mailto:${businessContact.email}?subject=Discuter%20d’un%20projet%20Digital%20Lab`}>
                Discuter du projet
              </a>
            </div>

            <p className="contact-response-note">Réponse généralement sous 24–48h.</p>
          </div>
        </section>
      </main>

      <a
        className={`mobile-sticky-cta${isMobileCtaVisible ? " is-visible" : ""}`}
        href={auditLaunchHref}
        target={isExternalLink(auditLaunchHref) ? "_blank" : undefined}
        rel={isExternalLink(auditLaunchHref) ? "noreferrer" : undefined}
        onClick={(event) => {
          handleAuditLaunchClick(event, {
            eventName: auditEvents.homeCta,
            location: "homepage_mobile_sticky",
            onNavigate: navigate,
          });
        }}
      >
        Audit gratuit
      </a>

      <AuditFooterReminder onNavigate={navigate} />
      <SiteFooter onNavigate={navigate} />
      {isAuthOpen && <AuthModal onClose={closeAuthModal} />}
      <AuthToast message={authToast} onClose={clearAuthToast} />
    </>
  );
}

export default App;
