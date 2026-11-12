import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { AILabCarousel } from "./components/AILabCarousel";
import { RequestConversation } from "./components/RequestConversation";
import { RequestDocuments } from "./components/RequestDocuments";
import { RequestQuotes } from "./components/RequestQuotes";
import { DesignSystemPage } from "./components/DesignSystemPage";
import { useAuth } from "./context/useAuth";
import { getUnreadMessageCounts } from "./services/requestMessages";
import { getLatestQuotesForRequests } from "./services/quotes";
import {
  getAllContactRequests,
  getContactRequestsForUser,
  updateContactRequestStatus,
} from "./services/contactRequests";
import { supabase } from "./services/auth";
import { getProfileForUser } from "./services/profiles";
import { trackEvent, trackPageView } from "./utils/analytics";
import {
  getPlanMonthlyPrice,
  getUnifiedEstimate,
  REELS_OFFERS,
  SOCIAL_MEDIA_ADDONS,
  SOCIAL_MEDIA_LAUNCH_ACTIVE,
  SOCIAL_MEDIA_LAUNCH_CLIENT_LIMIT,
  SOCIAL_MEDIA_LAUNCH_MONTHS,
  SOCIAL_MEDIA_NETWORKS,
  SOCIAL_MEDIA_PLANS,
} from "./utils/estimator";
import { WEBSITE_NEED, WEBSITE_PACKAGES } from "./utils/websitePricing";
import { getEffectiveProjectAnswers, isFeatureSelectable } from "./utils/estimatorAnswers";
import { getTaxMention } from "./config/taxMention";
import { buildQuoteMailto } from "./utils/quoteMailto";

const auditLandingPath = "/audit-site-web";
const legalNoticePath = "/mentions-legales";
const privacyPolicyPath = "/politique-de-confidentialite";
const socialMediaServicePath = "/services/gestion-reseaux-sociaux";
// Tax mention for every public price (one-off projects, subscriptions, Reels,
// meta description, request summary). Configured only in config/taxMention.js;
// while the VAT regime is unconfirmed, prices carry no mention and
// `npm run check:release` fails.
const priceTax = getTaxMention();
const withTaxMention = (price, isEnglish = false) => {
  const mention = isEnglish ? priceTax.shortEn : priceTax.short;
  return mention ? `${price} ${mention}` : price;
};
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
    icon: "social",
    title: "Réseaux sociaux & Reels",
    summary: "Publier régulièrement, sans y passer vos soirées.",
    problem: "Vos réseaux sont irréguliers faute de temps, d’idées ou de visuels prêts à publier.",
    canDo: "Je prépare un calendrier, les visuels, les textes et les Reels, puis je publie après votre validation.",
    expectedResult: "Une présence régulière et cohérente, avec un abonnement mensuel clair.",
    details: ["Calendrier éditorial", "Visuels", "Textes", "Reels", "Publication", "Bilan mensuel"],
    examples:
      "Gestion mensuelle Instagram, Facebook, LinkedIn ou Google Business Profile, création de visuels, rédaction de légendes, Reels et vidéos courtes, bilan mensuel.",
    images: [
      "/projects/social/v3/social-v3-card-1.webp",
      "/projects/social/v3/social-v3-card-2.webp",
      "/projects/social/v3/social-v3-card-3.webp",
    ],
    gallery: {
      type: "carousel",
      images: [
        "/projects/social/v3/social-v3-card-1.webp",
        "/projects/social/v3/social-v3-card-2.webp",
        "/projects/social/v3/social-v3-card-3.webp",
      ],
    },
    transformation: {
      before: ["publications irrégulières", "visuels improvisés", "aucun suivi"],
      after: ["calendrier mensuel", "visuels cohérents", "bilan chaque mois"],
      result: "Vos réseaux restent actifs et reflètent sérieusement votre activité.",
    },
    learnMoreHref: socialMediaServicePath,
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
  { label: "Réseaux sociaux", href: socialMediaServicePath },
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
const englishNavLabels = ["Free audit", "Services", "Social media", "Projects", "Method", "About", "Blog", "FAQ", "Contact"];

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
const auditVideoSrc = "/videos/digitallab-audit-site-web.mp4";
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
  [privacyPolicyPath]: {
    title: "Politique de confidentialité | Digital Lab",
    description:
      "Politique de confidentialité de Digital Lab : données collectées, services Google, finalités, conservation, sécurité et droits RGPD.",
    canonical: `${siteUrl}${privacyPolicyPath}`,
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

const initialEstimatorAnswers = {
  pages: WEBSITE_PACKAGES[0].pages,
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
  {
    // Rendered by SocialMediaServicePage; only the routing and SEO fields are read here.
    slug: "gestion-reseaux-sociaux",
    customPage: "social-media",
    title: "Gestion des réseaux sociaux pour TPE, indépendants et associations",
    metaTitle: "Gestion des réseaux sociaux pour TPE et indépendants : abonnement mensuel | Digital Lab",
    metaDescription: `Abonnement mensuel de gestion des réseaux sociaux : calendrier, visuels, textes, Reels et publication après votre validation. ${SOCIAL_MEDIA_LAUNCH_ACTIVE ? "Tarif de lancement dès" : "Dès"} ${withTaxMention(`${getPlanMonthlyPrice(SOCIAL_MEDIA_PLANS.presence)} €`)}/mois, Reels dès ${withTaxMention(`${REELS_OFFERS.single.price} €`)}.`,
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

// Homepage card images rendered from the Visuals V3 page compositions (fictional brands), 1100 × 720.
[1, 2, 3].forEach((index) => {
  const base = `/projects/social/v3/social-v3-card-${index}`;
  optimizedImages[`${base}.webp`] = {
    src: `${base}.webp`,
    srcSet: `${base}-640.webp 640w, ${base}-960.webp 960w, ${base}.webp 1100w`,
  };
});

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

  if (pathname === socialMediaServicePath) {
    setJsonLd("social-media-structured-data", {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Service",
          "@id": `${metadata.canonical}#service`,
          name: "Gestion des réseaux sociaux Digital Lab",
          serviceType: "Gestion mensuelle des réseaux sociaux et création de Reels",
          description: metadata.description,
          url: metadata.canonical,
          areaServed: "France",
          provider: {
            "@type": "ProfessionalService",
            name: "Digital Lab",
            url: siteUrl,
          },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: siteUrl },
            { "@type": "ListItem", position: 2, name: "Gestion des réseaux sociaux", item: metadata.canonical },
          ],
        },
        {
          "@type": "FAQPage",
          mainEntity: socialMediaFaq.map(({ question, answer }) => ({
            "@type": "Question",
            name: question,
            acceptedAnswer: { "@type": "Answer", text: answer },
          })),
        },
      ],
    });
  } else {
    removeJsonLd("social-media-structured-data");
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
    social: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm0 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7Zm3 4.2 5.4 2.8-5.4 2.8V9.2Z",
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

// LOT SM-04 — unified estimator, rendered on the FR/EN homepages and on the
// social media page. Every amount comes from getUnifiedEstimate
// (utils/estimator.js); this component only shows the relevant questions and
// formats the structured result per language.
const NBSP = String.fromCharCode(160);

const formatEuros = (amount, isEnglish = false) =>
  isEnglish
    ? `€${new Intl.NumberFormat("en-GB").format(amount)}`
    : `${new Intl.NumberFormat("fr-FR").format(amount)}${NBSP}€`;
const formatTaxedPrice = (amount, isEnglish = false) => withTaxMention(formatEuros(amount, isEnglish), isEnglish);
const formatMonthlyPrice = (amount, isEnglish = false) =>
  `${formatTaxedPrice(amount, isEnglish)}${isEnglish ? "/month" : "/mois"}`;
const pluralize = (count, singular, plural) => `${count} ${count > 1 ? plural : singular}`;
const formatReelsPerMonth = (count, isEnglish = false) =>
  count ? `${pluralize(count, "Reel", "Reels")}${isEnglish ? "/month" : "/mois"}` : isEnglish ? "no Reels" : "sans Reel";
const formatDelayRange = (delay, isEnglish = false) =>
  `${delay.min}–${delay.max} ${
    delay.unit === "days" ? (isEnglish ? "business days" : "jours ouvrés") : isEnglish ? "weeks" : "semaines"
  }`;

const estimatorProjectTypeByNeed = {
  "Créer un site web": "Site web",
  "Réparer / améliorer un site existant": "Réparation / amélioration",
  "Optimiser SEO & visibilité": "SEO & visibilité",
  "Ajouter une automatisation": "Automatisation",
  "Créer un chatbot / assistant IA": "Chatbot / assistant IA",
  "Créer un MVP ou prototype web": "MVP / prototype",
};

const estimatorContentServiceOptions = [
  { value: "none", fr: "Aucun", en: "None" },
  { value: "social", fr: "Gestion des réseaux sociaux", en: "Social media management" },
  { value: "reels", fr: "Reels / vidéos courtes", en: "Reels / short videos" },
];

const estimatorReelsOptions = [
  { value: "single", fr: "1 Reel", en: "1 Reel" },
  { value: "pack4", fr: "Pack 4 Reels / mois", en: "4 Reels / month" },
  { value: "pack8", fr: "Pack 8 Reels / mois", en: "8 Reels / month" },
  { value: "complex", fr: "Vidéo complexe", en: "Complex video" },
];

const projectLevelLabels = {
  Simple: { fr: "Simple", en: "Simple" },
  Intermédiaire: { fr: "Intermédiaire", en: "Intermediate" },
  Avancé: { fr: "Avancé", en: "Advanced" },
};

const projectLevelMessages = {
  Simple: {
    fr: "Votre besoin semble ciblé. Une intervention courte peut probablement suffire pour avancer vite.",
    en: "Your need looks well-defined. A short intervention is likely enough to move fast.",
  },
  Intermédiaire: {
    fr: "Votre projet demande plusieurs éléments à coordonner. Une première version claire peut être créée rapidement.",
    en: "Your project involves several elements to coordinate. A clear first version can be built quickly.",
  },
  Avancé: {
    fr: "Votre projet implique plusieurs fonctionnalités ou workflows. Un cadrage précis permettra de sécuriser le budget et les étapes.",
    en: "Your project involves several features or workflows. A precise scoping phase will help secure the budget and the steps.",
  },
};

const initialSocialOptions = { plan: "visibilite", networks: [], extraPosts: 0, extraReels: 0, setupAudit: false };

const reelsAnalyticsKey = { single: "reels_1", pack4: "reels_4", pack8: "reels_8", complex: "reels_complex" };

// Subscription add-on lines, shared by the estimator result and the quote summary
// (same amounts, same wording).
const getSocialAddonLines = (estimate, isEnglish = false) => {
  if (!estimate.social) {
    return [];
  }
  const t = (fr, en) => (isEnglish ? en : fr);
  const { added, addons } = estimate.social;

  return [
    added.posts > 0 &&
      `${pluralize(added.posts, t("publication supplémentaire", "extra post"), t("publications supplémentaires", "extra posts"))} : +${formatTaxedPrice(addons.posts, isEnglish)}`,
    added.platforms > 0 &&
      `${pluralize(added.platforms, t("réseau supplémentaire", "extra network"), t("réseaux supplémentaires", "extra networks"))} : +${formatTaxedPrice(addons.platforms, isEnglish)}`,
    added.reels > 0 &&
      `${pluralize(added.reels, t("Reel supplémentaire", "extra Reel"), t("Reels supplémentaires", "extra Reels"))} : +${formatTaxedPrice(addons.reels, isEnglish)}`,
  ].filter(Boolean);
};

// Builds the quote request: opening message and a summary of every selected
// service, option and amount, so the visitor never retypes it (sent by e-mail,
// see buildQuoteMailto).
const buildEstimateRequest = ({ estimate, answers, reelsChoice, isEnglish }) => {
  const t = (fr, en) => (isEnglish ? en : fr);
  const labelFor = (options, value) =>
    isEnglish ? options.find((option) => option.value === value)?.label ?? value : value;
  const lines = [];
  const services = [];

  if (estimate.project) {
    const need = labelFor(estimatorNeedOptions, estimate.project.need);
    const isWebsite = estimate.project.need === WEBSITE_NEED;
    services.push(need);
    lines.push(
      `${t("Projet ponctuel", "One-off project")} : ${need}`,
      ...(isWebsite
        ? [
            `${t("Pages du site (maximum)", "Website pages (maximum)")} : ${estimate.project.pages}`,
            `${t("Inclus", "Included")} : ${websiteIncludedServices.map((item) => (isEnglish ? item.en : item.fr)).join(", ")}`,
          ]
        : []),
      // Websites are scoped by their page package; the hidden complexity selector is not quoted.
      `${isWebsite ? "" : `${t("Complexité", "Complexity")} : ${labelFor(estimatorComplexityOptions, answers.complexity)} · `}${t("Fonctionnalités", "Features")} : ${
        answers.features.length
          ? answers.features.map((feature) => labelFor(estimatorFeatureOptions, feature)).join(", ")
          : t("à préciser", "to be defined")
      } · ${t("Contenus", "Content")} : ${labelFor(estimatorContentOptions, answers.content)} · ${t("Urgence", "Urgency")} : ${labelFor(estimatorUrgencyOptions, answers.urgency)}`,
      `${t("Profil", "Profile")} : ${labelFor(estimatorProfileOptions, answers.profile)} · ${t("Priorité", "Priority")} : ${labelFor(estimatorPriorityOptions, answers.priority)} · ${t("Existant", "Existing site")} : ${labelFor(estimatorExistingOptions, answers.existing)}`,
      `${t("Estimation projet", "Project estimate")} : ${t("à partir de", "from")} ${formatTaxedPrice(estimate.project.budget, isEnglish)} · ${t("délai", "timeline")} ${formatDelayRange(estimate.project.delay, isEnglish)} · ${t("niveau", "level")} ${projectLevelLabels[estimate.project.type][isEnglish ? "en" : "fr"]}`,
      t("Projet facturé selon son devis (acompte et échéances), hors premier mois d’abonnement.", "Project billed according to its own quote (deposit and instalments), separate from the subscription."),
    );
  }

  if (estimate.social) {
    const { social } = estimate;
    services.push(t(`gestion des réseaux sociaux (formule ${social.planName})`, `social media management (${social.planName} plan)`));
    lines.push(
      `${t("Abonnement réseaux sociaux — formule", "Social media subscription —")} ${social.planName}${isEnglish ? " plan" : ""}`,
      `${pluralize(social.totals.posts, t("publication", "post"), t("publications", "posts"))}${t("/mois", "/month")} · ${pluralize(social.totals.platforms, t("réseau", "network"), t("réseaux", "networks"))} (${
        social.networks.length ? social.networks.join(", ") : t("à préciser", "to be defined")
      }) · ${formatReelsPerMonth(social.totals.reels, isEnglish)}`,
      ...getSocialAddonLines(estimate, isEnglish).map((line) => `${t("Option", "Add-on")} — ${line}`),
      social.launchMonths > 0
        ? `${t("Tarif de lancement", "Launch price")} : ${formatMonthlyPrice(estimate.recurring.launchMonthly, isEnglish)} ${t(
            `pendant ${social.launchMonths} mois (${SOCIAL_MEDIA_LAUNCH_CLIENT_LIMIT} premiers clients), puis`,
            `for ${social.launchMonths} months (first ${SOCIAL_MEDIA_LAUNCH_CLIENT_LIMIT} clients), then`,
          )} ${formatMonthlyPrice(estimate.recurring.standardMonthly, isEnglish)}`
        : `${t("Tarif", "Price")} : ${formatMonthlyPrice(estimate.recurring.standardMonthly, isEnglish)}`,
    );
  }

  if (estimate.reels) {
    const offer = estimatorReelsOptions.find((option) => option.value === reelsChoice);
    services.push(isEnglish ? offer.en : offer.fr);
    const price =
      estimate.reels.billing === "quote"
        ? t("sur devis", "on quote")
        : estimate.reels.billing === "monthly"
          ? formatMonthlyPrice(estimate.reels.price, isEnglish)
          : `${formatTaxedPrice(estimate.reels.price, isEnglish)} ${t("(prestation ponctuelle)", "(one-off service)")}`;
    lines.push(`Reels — ${isEnglish ? offer.en : offer.fr} : ${price}`);
  }

  estimate.oneTimeFees
    .filter((fee) => fee.key === "setupAudit")
    .forEach((fee) => lines.push(`${t("Audit de départ et mise en place (une seule fois)", "Initial audit and set-up (one-time)")} : ${formatTaxedPrice(fee.amount, isEnglish)}`));

  if (estimate.firstMonth) {
    lines.push(
      `${t("Premier mois (abonnement + frais de mise en place)", "First month (subscription + set-up fees)")} : ${formatTaxedPrice(estimate.firstMonth.total, isEnglish)}`,
    );
  }

  lines.push(t("Estimation indicative, à confirmer par devis.", "Indicative estimate, to be confirmed by a quote."));

  const socialOffer = estimate.social
    ? `social_${estimate.social.plan}`
    : estimate.reels
      ? reelsAnalyticsKey[estimate.reels.key]
      : null;

  return {
    offer: [estimate.project && `project:${estimatorProjectTypeByNeed[estimate.project.need]}`, socialOffer].filter(Boolean).join("|"),
    socialOffer,
    projectType: estimate.project
      ? estimatorProjectTypeByNeed[estimate.project.need]
      : estimate.social
        ? "Réseaux sociaux"
        : "Reels",
    message: t(`Bonjour, je souhaite un devis pour : ${services.join(" + ")}. Mon activité : `, `Hello, I'd like a quote for: ${services.join(" + ")}. My business: `),
    summary: lines.join("\n"),
  };
};

// LOT WEB-SM-CONTACT-RELEASE-01 — the estimator request is sent by e-mail (no form, no API).
// Shows the quote e-mail panel of the page and brings it into view.
const showEstimateEmail = (request, setRequest, anchor) => {
  setRequest(request);
  window.setTimeout(() => {
    scrollToElementWithHeaderOffset(`#${anchor}`);
    document.getElementById(quoteEmailPanelTitleId)?.focus({ preventScroll: true });
  }, 0);
};

// Same analytics events as the former form submission, sent when the e-mail is opened.
const trackQuoteEmailOpened = (request) => {
  if (!request) {
    return;
  }
  trackEvent("estimator_quote_submit", { offer: request.offer });
  if (request.socialOffer) {
    trackEvent("social_media_request_submit", { offer: request.socialOffer });
  }
};

// Opens a mailto: link from a user gesture without leaving the page.
const openMailtoLink = (href) => {
  const link = document.createElement("a");
  link.href = href;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const createEstimatorSelection = (variant) => ({
  projectNeed: variant === "social" ? null : "Créer un site web",
  contentService: variant === "social" ? "social" : "none",
});

function UnifiedEstimator({ isEnglish = false, variant = "home", preset = null, onRequest }) {
  const [selection, setSelection] = useState(() => createEstimatorSelection(variant));
  const [answers, setAnswers] = useState(initialEstimatorAnswers);
  const [social, setSocial] = useState(initialSocialOptions);
  const [reelsChoice, setReelsChoice] = useState("pack4");
  const [appliedPreset, setAppliedPreset] = useState(null);
  const t = (fr, en) => (isEnglish ? en : fr);
  const idPrefix = `estimator-${variant}${isEnglish ? "-en" : ""}`;

  // A CTA elsewhere on the page (plan card, Reels offer) preselects a service once per click.
  if (preset && preset !== appliedPreset) {
    setAppliedPreset(preset);
    if (preset.contentService) setSelection((current) => ({ ...current, contentService: preset.contentService }));
    if (preset.plan) setSocial((current) => ({ ...current, plan: preset.plan }));
    if (preset.reels) setReelsChoice(preset.reels);
  }

  const isWebsiteProject = selection.projectNeed === WEBSITE_NEED;
  // Website mode derives its scope from the page package, so a complexity chosen for
  // another project type stays stored (restored on switch back) but never prices a website.
  const projectAnswers = selection.projectNeed ? getEffectiveProjectAnswers(answers, selection.projectNeed) : null;
  const estimate = getUnifiedEstimate({
    project: projectAnswers,
    contentService: selection.contentService,
    social,
    reels: reelsChoice,
  });
  const hasSelection = Boolean(estimate.project || estimate.social || estimate.reels);

  const steps = [hasSelection];
  if (selection.projectNeed) {
    steps.push(answers.profile, answers.priority, answers.existing, answers.content, isWebsiteProject ? answers.pages : answers.complexity, projectAnswers.features.length > 0, answers.urgency);
  }
  if (selection.contentService === "social") steps.push(social.plan, social.networks.length > 0, true, true, true);
  if (selection.contentService === "reels") steps.push(reelsChoice);
  const progress = Math.round((steps.filter(Boolean).length / steps.length) * 100);

  const updateAnswer = (key, value) => setAnswers((current) => ({ ...current, [key]: value }));
  const toggleFeature = (feature) =>
    setAnswers((current) => ({
      ...current,
      features: current.features.includes(feature)
        ? current.features.filter((currentFeature) => currentFeature !== feature)
        : [...current.features, feature],
    }));
  const updateSocial = (key, value) => setSocial((current) => ({ ...current, [key]: value }));
  const toggleNetwork = (network) =>
    setSocial((current) => ({
      ...current,
      networks: current.networks.includes(network)
        ? current.networks.filter((currentNetwork) => currentNetwork !== network)
        : [...current.networks, network],
    }));

  const optionGroup = (key, options, selectedValue, onSelect, className = "") => (
    <div className={`estimator-options ${className}`.trim()} role="group" aria-labelledby={`${idPrefix}-${key}`}>
      {options.map((option) => (
        <button
          className={selectedValue === option.value ? "is-selected" : ""}
          key={String(option.value)}
          type="button"
          aria-pressed={selectedValue === option.value}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
  const localized = (options) => options.map((option) => ({ value: option.value, label: isEnglish ? option.label : option.value }));

  const handleRequest = () => {
    const request = buildEstimateRequest({ estimate, answers: projectAnswers ?? answers, reelsChoice, isEnglish });
    trackEvent("estimator_quote_request", {
      offer: request.offer,
      has_project: Boolean(estimate.project),
      content_service: selection.contentService,
      cta_location: `estimator_${variant}`,
    });
    if (request.socialOffer) {
      trackEvent("social_media_offer_select", { offer: request.socialOffer, cta_location: `estimator_${variant}` });
    }
    const email = buildQuoteMailto({
      to: businessContact.email,
      request,
      isEnglish,
      taxNote: isEnglish ? priceTax.noteEn : priceTax.note,
    });
    // The full summary fits in the link: open the visitor's mail app right away. Otherwise the
    // panel shown by onRequest offers the copyable summary first (nothing is lost).
    if (email.fitsInMailto) {
      trackQuoteEmailOpened(request);
      openMailtoLink(email.href);
    }
    onRequest?.({ ...request, email });
  };

  const plan = estimate.social ? SOCIAL_MEDIA_PLANS[estimate.social.plan] : SOCIAL_MEDIA_PLANS[social.plan];
  const sectionId = variant === "social" ? "simulateur-reseaux-sociaux" : isEnglish ? "en-estimation" : "estimation";
  const addonLines = getSocialAddonLines(estimate, isEnglish);

  return (
    <section className={`section estimator-section reveal-on-scroll reveal-section estimator-${variant}`} id={sectionId}>
      <div className="section-inner">
        <div className="section-heading">
          <span>{variant === "social" ? t("Simulateur", "Estimator") : t("Estimation", "Estimate")}</span>
          <h2>
            {variant === "social"
              ? t("Estimez votre abonnement en une minute", "Estimate your subscription in a minute")
              : t("Estimez votre projet ou votre abonnement", "Estimate your project or subscription")}
          </h2>
          <p>
            {t(
              "Choisissez un projet ponctuel, un abonnement réseaux sociaux ou les deux : chaque montant est affiché séparément.",
              "Choose a one-off project, a social media subscription, or both: each amount is shown separately.",
            )}
          </p>
        </div>

        <div className="estimator-panel reveal-on-scroll reveal-card" style={{ "--reveal-delay": "120ms" }}>
          <div
            className="estimator-progress"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t(`Progression ${progress}%`, `Progress ${progress}%`)}
          >
            <span style={{ width: `${progress}%` }}></span>
          </div>

          <div className="estimator-grid">
            <div className="estimator-questions">
              <div className="estimator-question estimator-services">
                <h3 id={`${idPrefix}-project`}>{t("Projet ponctuel", "One-off project")}</h3>
                {optionGroup(
                  "project",
                  [{ value: null, label: t("Aucun", "None") }, ...localized(estimatorNeedOptions)],
                  selection.projectNeed,
                  (value) => setSelection((current) => ({ ...current, projectNeed: value })),
                )}
                <h3 id={`${idPrefix}-content`} className="estimator-subheading">
                  {t("Réseaux sociaux et vidéo", "Social media and video")}
                </h3>
                {optionGroup(
                  "content",
                  estimatorContentServiceOptions.map((option) => ({ value: option.value, label: isEnglish ? option.en : option.fr })),
                  selection.contentService,
                  (value) => setSelection((current) => ({ ...current, contentService: value })),
                )}
                {selection.contentService === "social" && (
                  <p className="estimator-hint">
                    {t("Les Reels s’ajoutent dans les options de l’abonnement.", "Reels are added in the subscription options.")}
                  </p>
                )}
              </div>

              {selection.projectNeed && (
                <>
                  <div className="estimator-question">
                    <h3 id={`${idPrefix}-profile`}>{t("Vous êtes :", "You are:")}</h3>
                    {optionGroup("profile", localized(estimatorProfileOptions), answers.profile, (value) => updateAnswer("profile", value))}
                  </div>
                  <div className="estimator-question">
                    <h3 id={`${idPrefix}-priority`}>{t("Votre priorité principale :", "Your main priority:")}</h3>
                    {optionGroup("priority", localized(estimatorPriorityOptions), answers.priority, (value) => updateAnswer("priority", value))}
                  </div>
                  <div className="estimator-question estimator-question-inline">
                    <div>
                      <h3 id={`${idPrefix}-existing`}>{t("Avez-vous déjà un site ou un outil existant ?", "Do you already have a site or tool?")}</h3>
                      {optionGroup("existing", localized(estimatorExistingOptions), answers.existing, (value) => updateAnswer("existing", value))}
                    </div>
                    <div>
                      <h3 id={`${idPrefix}-content-ready`}>{t("Avez-vous déjà les contenus ?", "Do you already have the content?")}</h3>
                      {optionGroup("content-ready", localized(estimatorContentOptions), answers.content, (value) => updateAnswer("content", value))}
                    </div>
                  </div>
                  {isWebsiteProject && (
                    <div className="estimator-question">
                      <h3 id={`${idPrefix}-pages`}>{t("Pages du site", "Website pages")}</h3>
                      {optionGroup(
                        "pages",
                        WEBSITE_PACKAGES.map(({ pages, price }) => ({
                          value: pages,
                          label: (pages === 1 ? t("1 page", "1 page") : t("Jusqu’à " + pages + " pages", "Up to " + pages + " pages")) + " · " + formatTaxedPrice(price, isEnglish),
                        })),
                        answers.pages,
                        (value) => updateAnswer("pages", value),
                      )}
                      <div className="estimator-included">
                        <p id={`${idPrefix}-included`} className="estimator-included-title">{t("Inclus dans votre site", "Included in your website")}</p>
                        <ul aria-labelledby={`${idPrefix}-included`}>
                          {websiteIncludedServices.map((item) => (
                            <li key={item.fr}>{isEnglish ? item.en : item.fr}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="estimator-hint">
                        {t(
                          "Création de contenu et fonctions complexes en supplément ; au-delà de 5 pages, devis personnalisé.",
                          "Content creation and complex features cost extra; more than 5 pages requires a custom quote.",
                        )}
                      </p>
                    </div>
                  )}
                  {!isWebsiteProject && (
                    <div className="estimator-question">
                      <h3 id={`${idPrefix}-complexity`}>{t("Niveau de complexité souhaité", "Desired complexity level")}</h3>
                      {optionGroup("complexity", localized(estimatorComplexityOptions), answers.complexity, (value) => updateAnswer("complexity", value))}
                    </div>
                  )}
                  <div className="estimator-question">
                    <h3 id={`${idPrefix}-features`}>{t("Fonctionnalités souhaitées", "Desired features")}</h3>
                    <div className="estimator-checkboxes" role="group" aria-labelledby={`${idPrefix}-features`}>
                      {estimatorFeatureOptions.filter((feature) => isFeatureSelectable(selection.projectNeed, feature.value)).map((feature) => (
                        <label className={answers.features.includes(feature.value) ? "is-selected" : ""} key={feature.value}>
                          <input checked={answers.features.includes(feature.value)} type="checkbox" onChange={() => toggleFeature(feature.value)} />
                          <span>{isEnglish ? feature.label : feature.value}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="estimator-question">
                    <h3 id={`${idPrefix}-urgency`}>{t("Urgence", "Urgency")}</h3>
                    {optionGroup("urgency", localized(estimatorUrgencyOptions), answers.urgency, (value) => updateAnswer("urgency", value))}
                  </div>
                </>
              )}

              {selection.contentService === "social" && (
                <>
                  <div className="estimator-question">
                    <h3 id={`${idPrefix}-plan`}>{t("Formule", "Plan")}</h3>
                    {optionGroup(
                      "plan",
                      Object.entries(SOCIAL_MEDIA_PLANS).map(([key, option]) => ({
                        value: key,
                        label: `${option.name} · ${formatMonthlyPrice(getPlanMonthlyPrice(option), isEnglish)}`,
                      })),
                      social.plan,
                      (value) => updateSocial("plan", value),
                    )}
                    <p className="estimator-hint">
                      {t(
                        `Inclus chaque mois : ${pluralize(plan.posts, "publication", "publications")}, ${pluralize(plan.platforms, "réseau", "réseaux")}${plan.reels ? ` et ${pluralize(plan.reels, "Reel", "Reels")}` : ", sans Reel"}.`,
                        `Included each month: ${pluralize(plan.posts, "post", "posts")}, ${pluralize(plan.platforms, "network", "networks")}${plan.reels ? ` and ${pluralize(plan.reels, "Reel", "Reels")}` : ", no Reels"}.`,
                      )}
                    </p>
                  </div>
                  <div className="estimator-question">
                    <h3 id={`${idPrefix}-networks`}>{t("Réseaux sociaux concernés", "Social networks")}</h3>
                    <div className="estimator-checkboxes" role="group" aria-labelledby={`${idPrefix}-networks`}>
                      {SOCIAL_MEDIA_NETWORKS.map((network) => (
                        <label className={social.networks.includes(network) ? "is-selected" : ""} key={network}>
                          <input checked={social.networks.includes(network)} type="checkbox" onChange={() => toggleNetwork(network)} />
                          <span>{network}</span>
                        </label>
                      ))}
                    </div>
                    <p className="estimator-hint">
                      {t(
                        `${pluralize(plan.platforms, "réseau inclus", "réseaux inclus")}, puis +${formatMonthlyPrice(SOCIAL_MEDIA_ADDONS.extraPlatform)} par réseau supplémentaire.`,
                        `${pluralize(plan.platforms, "network", "networks")} included, then +${formatMonthlyPrice(SOCIAL_MEDIA_ADDONS.extraPlatform, true)} per extra network.`,
                      )}
                    </p>
                  </div>
                  <div className="estimator-question estimator-question-inline">
                    <div>
                      <h3 id={`${idPrefix}-posts`}>{t("Publications supplémentaires / mois", "Extra posts / month")}</h3>
                      {optionGroup(
                        "posts",
                        [0, 4, 8].map((value) => ({ value, label: value ? `+${value}` : t("Aucune", "None") })),
                        social.extraPosts,
                        (value) => updateSocial("extraPosts", value),
                        "is-numeric",
                      )}
                      <p className="estimator-hint">
                        {formatTaxedPrice(SOCIAL_MEDIA_ADDONS.extraPost, isEnglish)} {t("par publication et par mois", "per post, per month")}
                      </p>
                    </div>
                    <div>
                      <h3 id={`${idPrefix}-extra-reels`}>{t("Reels supplémentaires / mois", "Extra Reels / month")}</h3>
                      {optionGroup(
                        "extra-reels",
                        [0, 1, 2, 4, 8].map((value) => ({ value, label: value ? `+${value}` : t("Aucun", "None") })),
                        social.extraReels,
                        (value) => updateSocial("extraReels", value),
                        "is-numeric",
                      )}
                      <p className="estimator-hint">{t("Au meilleur tarif Reels (unité ou pack).", "At the best Reels rate (single or pack).")}</p>
                    </div>
                  </div>
                  <div className="estimator-question">
                    <h3 id={`${idPrefix}-setup`}>{t("Démarrage", "Getting started")}</h3>
                    <div className="estimator-checkboxes" role="group" aria-labelledby={`${idPrefix}-setup`}>
                      <label className={social.setupAudit ? "is-selected" : ""}>
                        <input checked={social.setupAudit} type="checkbox" onChange={(event) => updateSocial("setupAudit", event.target.checked)} />
                        <span>
                          {t("Audit de départ et mise en place", "Initial audit and set-up")} — {formatTaxedPrice(SOCIAL_MEDIA_ADDONS.setupAudit, isEnglish)}
                          {t(", une seule fois", ", one-time")}
                        </span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {selection.contentService === "reels" && (
                <div className="estimator-question">
                  <h3 id={`${idPrefix}-reels`}>{t("Offre Reels", "Reels offer")}</h3>
                  {optionGroup(
                    "reels",
                    estimatorReelsOptions.map((option) => {
                      const offer = REELS_OFFERS[option.value];
                      const price =
                        offer.billing === "quote"
                          ? t("sur devis", "on quote")
                          : offer.billing === "monthly"
                            ? formatMonthlyPrice(offer.price, isEnglish)
                            : formatTaxedPrice(offer.price, isEnglish);
                      return { value: option.value, label: `${isEnglish ? option.en : option.fr} · ${price}` };
                    }),
                    reelsChoice,
                    setReelsChoice,
                  )}
                </div>
              )}
            </div>

            <aside className="estimator-result unified-result" aria-labelledby={`${idPrefix}-result`}>
              <span id={`${idPrefix}-result`}>{t("Résultat indicatif", "Indicative result")}</span>
              <div className="estimate-blocks" aria-live="polite">
                {!hasSelection && (
                  <p className="estimate-empty">
                    {t("Choisissez au moins une prestation pour obtenir une estimation.", "Choose at least one service to get an estimate.")}
                  </p>
                )}

                {estimate.project && (
                  <div className="estimate-block">
                    <h3>
                      {t("Projet ponctuel", "One-off project")} · {projectLevelLabels[estimate.project.type][isEnglish ? "en" : "fr"]}
                    </h3>
                    <div className="result-metrics">
                      <div>
                        <small>{t("Budget indicatif", "Estimated budget")}</small>
                        <strong>
                          {t("à partir de", "from")} {formatTaxedPrice(estimate.project.budget, isEnglish)}
                        </strong>
                      </div>
                      <div>
                        <small>{t("Délai indicatif", "Estimated timeline")}</small>
                        <strong>{formatDelayRange(estimate.project.delay, isEnglish)}</strong>
                      </div>
                    </div>
                    <p>{projectLevelMessages[estimate.project.type][isEnglish ? "en" : "fr"]}</p>
                  </div>
                )}

                {estimate.social && (
                  <div className="estimate-block">
                    <h3>
                      {t("Abonnement", "Subscription")} · {estimate.social.planName}
                    </h3>
                    <div className="result-metrics">
                      {estimate.recurring.launchMonths > 0 ? (
                        <>
                          <div>
                            <small>{t(`Les ${estimate.recurring.launchMonths} premiers mois`, `First ${estimate.recurring.launchMonths} months`)}</small>
                            <strong>{formatMonthlyPrice(estimate.recurring.launchMonthly, isEnglish)}</strong>
                          </div>
                          <div>
                            <small>{t("Ensuite (prix standard)", "Then (standard price)")}</small>
                            <strong>{formatMonthlyPrice(estimate.recurring.standardMonthly, isEnglish)}</strong>
                          </div>
                        </>
                      ) : (
                        <div>
                          <small>{t("Chaque mois", "Each month")}</small>
                          <strong>{formatMonthlyPrice(estimate.recurring.standardMonthly, isEnglish)}</strong>
                        </div>
                      )}
                    </div>
                    <ul className="estimate-lines">
                      <li>
                        {pluralize(estimate.social.totals.posts, t("publication", "post"), t("publications", "posts"))}
                        {t("/mois", "/month")} · {pluralize(estimate.social.totals.platforms, t("réseau", "network"), t("réseaux", "networks"))} ·{" "}
                        {formatReelsPerMonth(estimate.social.totals.reels, isEnglish)}
                      </li>
                      {addonLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {estimate.reels && estimate.reels.billing === "monthly" && (
                  <div className="estimate-block">
                    <h3>{t(`Pack ${estimate.reels.quantity} Reels`, `${estimate.reels.quantity} Reels pack`)}</h3>
                    <div className="result-metrics">
                      <div>
                        <small>{t("Chaque mois", "Each month")}</small>
                        <strong>{formatMonthlyPrice(estimate.reels.price, isEnglish)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {estimate.oneTimeFees.length > 0 && (
                  <div className="estimate-block">
                    <h3>{t("Frais uniques", "One-time fees")}</h3>
                    <ul className="estimate-lines">
                      {estimate.oneTimeFees.map((fee) => (
                        <li key={fee.key}>
                          {fee.key === "setupAudit"
                            ? t("Audit de départ et mise en place", "Initial audit and set-up")
                            : t("1 Reel (prestation ponctuelle)", "1 Reel (one-off service)")}{" "}
                          : <strong>{formatTaxedPrice(fee.amount, isEnglish)}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {estimate.onQuote && (
                  <div className="estimate-block">
                    <h3>{t("Vidéo complexe", "Complex video")}</h3>
                    <p>{t("Tournage, motion design ou montage long : prix sur devis.", "Shooting, motion design or long editing: price on quote.")}</p>
                  </div>
                )}

                {estimate.firstMonth && (
                  <div className="estimate-block is-first-month">
                    <h3>{t("Premier mois", "First month")}</h3>
                    <strong className="estimate-total">{formatTaxedPrice(estimate.firstMonth.total, isEnglish)}</strong>
                    <p>
                      {t("Abonnement", "Subscription")} {formatTaxedPrice(estimate.firstMonth.subscription, isEnglish)}
                      {estimate.firstMonth.setupFees > 0 &&
                        ` + ${t("frais de mise en place", "set-up fees")} ${formatTaxedPrice(estimate.firstMonth.setupFees, isEnglish)}`}
                      .
                    </p>
                  </div>
                )}

                {estimate.project && (estimate.recurring || estimate.oneTimeFees.length > 0) && (
                  <p className="estimator-note">
                    {t(
                      "Le projet ponctuel est facturé selon son propre devis (acompte et échéances) ; il n’est pas inclus dans le premier mois.",
                      "The one-off project is billed according to its own quote (deposit and instalments); it is not part of the first month.",
                    )}
                  </p>
                )}
              </div>

              {estimate.social?.launchMonths > 0 && (
                <p className="estimator-note">
                  {t(
                    `Tarif de lancement réservé aux ${SOCIAL_MEDIA_LAUNCH_CLIENT_LIMIT} premiers clients, pendant ${SOCIAL_MEDIA_LAUNCH_MONTHS} mois.`,
                    `Launch price reserved for the first ${SOCIAL_MEDIA_LAUNCH_CLIENT_LIMIT} clients, for ${SOCIAL_MEDIA_LAUNCH_MONTHS} months.`,
                  )}
                </p>
              )}
              {(isEnglish ? priceTax.noteEn : priceTax.note) && <p className="estimator-note">{isEnglish ? priceTax.noteEn : priceTax.note}</p>}
              <p className="estimator-note">
                {t(
                  "Estimation indicative. Le devis final dépendra du brief, des contenus disponibles et des prestations exactes.",
                  "This estimate is indicative. The final quote will depend on the brief, available content, and exact services.",
                )}
              </p>
              <button className="btn btn-primary" type="button" disabled={!hasSelection} onClick={handleRequest}>
                {t("Demander ce devis", "Request this quote")}
              </button>
            </aside>
          </div>
        </div>

        {variant === "home" && (
          <div className="estimator-help reveal-on-scroll reveal-card" style={{ "--reveal-delay": "560ms" }}>
            <span className="estimator-help-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5.5 5.8A5.2 5.2 0 0 1 9.2 4.3h5.6A5.2 5.2 0 0 1 20 9.5v.9a5.2 5.2 0 0 1-5.2 5.2h-3.6l-3.7 3.1v-3.3a5.2 5.2 0 0 1-4-5v-.9c0-1.4.7-2.8 2-3.7Zm3.7.5a3.2 3.2 0 0 0-3.2 3.2v.9a3.2 3.2 0 0 0 3.2 3.2h.3v.8l1-0.8h4.3a3.2 3.2 0 0 0 3.2-3.2v-.9a3.2 3.2 0 0 0-3.2-3.2H9.2Z" />
              </svg>
            </span>
            <p>
              {t(
                "Vous ne trouvez pas exactement votre besoin ? Vous pouvez aussi me contacter directement et expliquer votre projet avec vos mots, même s’il est encore flou.",
                "Can't find exactly what you need? You can also contact me directly and describe your project in your own words, even if it's still unclear.",
              )}
            </p>
            <a href={isEnglish ? "#en-contact" : "#contact"}>{t("Discuter de mon projet", "Discuss my project")}</a>
          </div>
        )}
      </div>
    </section>
  );
}

function AIWebsiteTransformationSection({ isEnglish = false }) {
  const videoFrameRef = useRef(null);

  const handleWatchTransformation = (event) => {
    const frame = videoFrameRef.current;
    const video = frame?.querySelector("video");

    if (!frame || !video) {
      return;
    }

    event.preventDefault();
    scrollToElementWithHeaderOffset(frame);

    // Explicit request to watch: restart from the beginning and expose native controls (sound, pause).
    const startPlayback = () => {
      video.controls = true;
      video.currentTime = 0;
      video.play().catch(() => {});
      video.focus({ preventScroll: true });
    };

    if (video.readyState > 0) {
      startPlayback();
    } else {
      video.addEventListener("loadedmetadata", startPlayback, { once: true });
    }
  };

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
            <small>
              {isEnglish
                ? "Illustrative AI-generated animation, not a recording of working software."
                : "Animation illustrative générée par IA, pas une capture de logiciel en fonctionnement."}
            </small>

            <div className="ai-transformation-actions">
              <a
                className="btn btn-primary"
                href="#ai-website-transformation-video"
                aria-controls="ai-website-transformation-video"
                onClick={handleWatchTransformation}
              >
                {isEnglish ? "▶ Watch the transformation" : "▶ Voir la transformation"}
              </a>
              <a className="ai-transformation-link" href={isEnglish ? "#en-contact" : "#contact"}>
                {isEnglish ? "Discuss your project" : "Discuter de votre projet"}
              </a>
            </div>
          </div>

          <div className="ai-transformation-visual">
            <div className="ai-transformation-video-frame" id="ai-website-transformation-video" ref={videoFrameRef}>
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

// LOT WEB-CONTACT-SIMPLE-01 — direct e-mail contact (replaces the former ContactForm).
// No network call, no data stored by the site: the visitor writes from their own mailbox.
const contactMailContent = {
  fr: {
    primarySubject: "Demande de projet Digital Lab",
    secondarySubject: "Discuter d’un projet Digital Lab",
    body: [
      "Bonjour,",
      "",
      "Mon activité / ma structure :",
      "Mon besoin :",
      "Délai souhaité :",
      "",
      "Merci,",
    ].join("\n"),
  },
  en: {
    primarySubject: "Digital Lab project inquiry",
    secondarySubject: "Digital Lab project discussion",
    body: [
      "Hello,",
      "",
      "My business / organization:",
      "What I need:",
      "Preferred timeline:",
      "",
      "Thank you,",
    ].join("\n"),
  },
};

const buildContactMailto = ({ subject, body }) => {
  const params = [`subject=${encodeURIComponent(subject)}`];

  if (body) {
    params.push(`body=${encodeURIComponent(body)}`);
  }

  return `mailto:${businessContact.email}?${params.join("&")}`;
};

const getContactMailLinks = (isEnglish = false) => {
  const content = isEnglish ? contactMailContent.en : contactMailContent.fr;

  return {
    primary: buildContactMailto({ subject: content.primarySubject, body: content.body }),
    secondary: buildContactMailto({ subject: content.secondarySubject }),
  };
};

// Clipboard API first; legacy fallback for browsers / contexts without it (older Safari, http).
async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission refused: fall through to the legacy path.
    }
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "-1000px";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();

  let copied;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  document.body.removeChild(field);
  return copied;
}

function ContactEmailCard({ isEnglish = false }) {
  const [copyState, setCopyState] = useState("idle");
  const resetTimerRef = useRef(null);
  const statusId = isEnglish ? "en-contact-email-copy-status" : "contact-email-copy-status";
  const mailLinks = getContactMailLinks(isEnglish);

  useEffect(() => () => window.clearTimeout(resetTimerRef.current), []);

  const handleCopy = async () => {
    const copied = await copyTextToClipboard(businessContact.email);

    setCopyState(copied ? "copied" : "error");
    window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => setCopyState("idle"), 4000);
  };

  const statusMessage = {
    idle: "",
    copied: isEnglish ? "Address copied to the clipboard." : "Adresse copiée dans le presse-papiers.",
    error: isEnglish
      ? `Copy unavailable: select the address ${businessContact.email} manually.`
      : `Copie impossible : sélectionnez l’adresse ${businessContact.email} manuellement.`,
  }[copyState];

  return (
    <div className="contact-email-card reveal-on-scroll reveal-card" style={{ "--reveal-delay": "700ms" }}>
      <p className="contact-email-label">{isEnglish ? "Write to me directly" : "Écrivez-moi directement"}</p>

      <div className="contact-email-row">
        <a className="contact-email-address" href={mailLinks.primary}>
          {businessContact.email}
        </a>
        <button
          className={`contact-email-copy${copyState === "copied" ? " is-copied" : ""}`}
          type="button"
          onClick={handleCopy}
          aria-describedby={statusId}
        >
          <span aria-hidden="true">{copyState === "copied" ? "✓" : "⧉"}</span>
          {copyState === "copied"
            ? isEnglish ? "Copied" : "Copiée"
            : isEnglish ? "Copy address" : "Copier l’adresse"}
        </button>
      </div>

      <p className="contact-email-hint">
        {isEnglish
          ? "A few lines are enough: your business, your need and your timeline, even if the idea is still unclear."
          : "Quelques lignes suffisent : votre activité, votre besoin et votre délai, même si l’idée est encore floue."}
      </p>

      <p className={`contact-email-copy-status is-${copyState}`} id={statusId} role="status" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}

const quoteEmailPanelTitleId = "quote-email-title";

// LOT WEB-SM-CONTACT-RELEASE-01 — quote request from the estimator, sent by e-mail.
// `request.email` comes from buildQuoteMailto: complete text (always copyable) and a mailto: link
// (complete, or short when the full text would make the link too long).
function QuoteEmailPanel({ request, isEnglish = false }) {
  const [copyState, setCopyState] = useState("idle");
  const resetTimerRef = useRef(null);
  const email = request?.email;
  const t = (fr, en) => (isEnglish ? en : fr);

  useEffect(() => () => window.clearTimeout(resetTimerRef.current), []);

  if (!email) {
    return null;
  }

  const handleCopy = async () => {
    const copied = await copyTextToClipboard(email.body);

    setCopyState(copied ? "copied" : "error");
    window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => setCopyState("idle"), 4000);
  };

  const statusMessage = {
    idle: "",
    copied: t("Récapitulatif copié dans le presse-papiers.", "Summary copied to the clipboard."),
    error: t(
      "Copie impossible : sélectionnez le texte du récapitulatif manuellement.",
      "Copy unavailable: select the summary text manually.",
    ),
  }[copyState];

  return (
    <div className="quote-email-panel" aria-labelledby={quoteEmailPanelTitleId}>
      <h3 id={quoteEmailPanelTitleId} tabIndex={-1}>
        {t("Votre demande de devis", "Your quote request")}
      </h3>
      <p className="quote-email-intro">
        {email.fitsInMailto
          ? t(
              `Votre messagerie s’ouvre avec ce récapitulatif, adressé à ${businessContact.email}. Si rien ne s’ouvre, copiez-le et envoyez-le depuis votre adresse e-mail.`,
              `Your mail app opens with this summary, addressed to ${businessContact.email}. If nothing opens, copy it and send it from your own e-mail address.`,
            )
          : t(
              `Le récapitulatif est trop long pour être ajouté automatiquement à l’e-mail : copiez-le, puis collez-le dans votre message à ${businessContact.email}.`,
              `The summary is too long to be added to the e-mail automatically: copy it, then paste it into your message to ${businessContact.email}.`,
            )}
      </p>

      <label className="quote-email-summary-label" htmlFor="quote-email-summary">
        {t("Récapitulatif", "Summary")}
      </label>
      <textarea
        id="quote-email-summary"
        className="quote-email-summary"
        readOnly
        value={email.body}
        rows={Math.min(14, email.body.split("\n").length + 1)}
        onFocus={(event) => event.target.select()}
      ></textarea>

      <div className="quote-email-actions">
        <button className="btn btn-primary" type="button" onClick={handleCopy} aria-describedby="quote-email-copy-status">
          {copyState === "copied" ? t("✓ Récapitulatif copié", "✓ Summary copied") : t("Copier le récapitulatif", "Copy the summary")}
        </button>
        <a className="btn btn-secondary" href={email.href} onClick={() => trackQuoteEmailOpened(request)}>
          {email.fitsInMailto ? t("Ouvrir l’e-mail", "Open the e-mail") : t("Ouvrir l’e-mail, puis coller", "Open the e-mail, then paste")}
        </a>
      </div>

      <p className={`quote-email-status is-${copyState}`} id="quote-email-copy-status" role="status" aria-live="polite">
        {statusMessage}
      </p>
    </div>
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
              <span>Besançon, France</span>
            </span>
            <span className="footer-siret">SIRET : 10575928600021</span>
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
        <nav className="footer-legal-nav" aria-label={isEnglish ? "Legal pages" : "Pages légales"}>
          <a href={legalNoticePath} onClick={(event) => {
            event.preventDefault();
            onNavigate(legalNoticePath);
          }}>
            {isEnglish ? "Legal notice" : "Mentions légales"}
          </a>
          <a href={privacyPolicyPath} onClick={(event) => {
            event.preventDefault();
            onNavigate(privacyPolicyPath);
          }}>
            {isEnglish ? "Privacy policy" : "Politique de confidentialité"}
          </a>
        </nav>
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
                <p>SIRET : 105 759 286 00021</p>
                <p>Code APE : 6201Z</p>
                <p>Besançon, France</p>
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
                <p>
                  Pour plus de détails, consultez la <a href={privacyPolicyPath} onClick={(event) => {
                    event.preventDefault();
                    onNavigate(privacyPolicyPath);
                  }}>politique de confidentialité</a>.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PrivacyPolicyPage({ onNavigate }) {
  return (
    <main className="legal-page fade-in-page">
      <section className="legal-hero">
        <div className="case-bg" aria-hidden="true"></div>
        <div className="case-shell">
          <button className="back-button" type="button" onClick={() => onNavigate("/")}>
            Retour
          </button>

          <div className="legal-panel">
            <span>Protection des données</span>
            <h1>Politique de confidentialité</h1>
            <div className="legal-grid">
              <article>
                <h2>1. Responsable du traitement</h2>
                <p>Olena Mykhalska — Digital Lab</p>
                <p>Entrepreneure individuelle</p>
                <p>SIREN : 105 759 286</p>
                <p>Besançon, France</p>
                <p>Email : <a href={`mailto:${businessContact.email}`}>{businessContact.email}</a></p>
              </article>

              <article>
                <h2>2. Données collectées sur le site</h2>
                <p>
                  Le site ne propose plus de formulaire de contact public : pour toute demande, vous écrivez directement à
                  {" "}<a href={`mailto:${businessContact.email}`}>{businessContact.email}</a>. Digital Lab traite alors les
                  données que vous envoyez volontairement par e-mail, notamment vos coordonnées, votre message et les
                  informations utiles au traitement de votre demande.
                </p>
                <p>
                  Si vous disposez d’un espace client, Digital Lab traite également les informations que vous y échangez
                  (messages, documents, devis), ainsi que les demandes envoyées auparavant via l’ancien formulaire du site,
                  qui restent consultables dans votre espace client et par Digital Lab.
                </p>
                <p>
                  Le site utilise également Google Analytics afin de mesurer l’audience et d’améliorer l’expérience de navigation.
                  Des données techniques peuvent être traitées à cette occasion, comme les pages consultées, le type d’appareil,
                  le navigateur, des informations de performance et des identifiants de mesure associés aux cookies analytics.
                </p>
              </article>

              <article>
                <h2>3. Utilisation des services Google</h2>
                <p>
                  Une automatisation privée et interne de Digital Lab peut accéder à certains services Google lorsque cela est
                  nécessaire à l’organisation et à la publication de contenus Digital Lab.
                </p>
                <ul>
                  <li>Google Sheets : lecture et mise à jour du Content Hub.</li>
                  <li>Google Drive : lecture et téléchargement d’images, de documents et de vidéos sélectionnés pour publication.</li>
                </ul>
              </article>

              <article>
                <h2>4. Finalités</h2>
                <p>Les données sont utilisées pour les finalités suivantes :</p>
                <ul>
                  <li>planification du contenu Digital Lab ;</li>
                  <li>préparation des publications ;</li>
                  <li>publication du contenu Digital Lab ;</li>
                  <li>suivi du statut des publications ;</li>
                  <li>réponse aux demandes reçues par e-mail ou via l’espace client, et suivi des demandes déjà enregistrées.</li>
                </ul>
              </article>

              <article>
                <h2>5. Limitation d’accès</h2>
                <p>
                  L’automatisation fonctionne uniquement avec les fichiers et tableaux explicitement sélectionnés ou fournis
                  par Digital Lab.
                </p>
                <p>
                  Les données utilisateur Google ne sont pas vendues, ne sont pas utilisées à des fins publicitaires et ne sont
                  pas transmises à des tiers, sauf aux prestataires techniques nécessaires à l’exécution de l’automatisation.
                </p>
              </article>

              <article>
                <h2>6. Conservation et sécurité</h2>
                <p>
                  Digital Lab applique un principe de minimisation des données et conserve les informations uniquement pendant
                  la durée nécessaire aux finalités décrites dans cette politique.
                </p>
                <p>
                  Des mesures techniques raisonnables sont mises en place pour protéger les accès et limiter les risques.
                  Les credentials, tokens et secrets techniques ne sont pas publiés sur le site.
                </p>
              </article>

              <article>
                <h2>7. Révocation de l’accès Google</h2>
                <p>
                  L’accès accordé aux services Google peut être révoqué à tout moment depuis la page de gestion des autorisations
                  Google : <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
                    https://myaccount.google.com/permissions
                  </a>.
                </p>
              </article>

              <article>
                <h2>8. Droits RGPD</h2>
                <p>
                  Conformément au RGPD, vous pouvez demander l’accès, la rectification, l’effacement ou la limitation du
                  traitement de vos données. Vous pouvez également vous opposer à certains traitements lorsque la réglementation
                  le permet.
                </p>
                <p>
                  Pour exercer vos droits, contactez Digital Lab à l’adresse suivante :
                  {" "}<a href={`mailto:${businessContact.email}`}>{businessContact.email}</a>.
                </p>
              </article>

              <article>
                <h2>9. Mise à jour de la politique</h2>
                <p>Dernière mise à jour : 1er septembre 2026.</p>
                <p>
                  Cette politique peut être mise à jour en cas d’évolution du site, des services utilisés ou des automatisations
                  internes de Digital Lab.
                </p>
              </article>

              <article>
                <h2>10. Google API disclosure</h2>
                <p>
                  L’utilisation et le transfert vers toute autre application des informations reçues depuis les APIs Google
                  respectent la <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
                    Google API Services User Data Policy
                  </a>, y compris les exigences Limited Use.
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
    title: "Social media & Reels",
    summary: "Post consistently without spending your evenings on it.",
    problem: "Your social accounts are irregular for lack of time, ideas, or ready-to-post visuals.",
    canDo: "I prepare a calendar, visuals, captions, and Reels, then publish once you approve them.",
    expectedResult: "A regular, consistent presence with a clear monthly subscription.",
    details: ["Content calendar", "Visuals", "Captions", "Reels", "Publishing", "Monthly review"],
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

// Showcase cards use their own video frames and link to a product or illustrative video.
const portfolioShowcaseCards = {
  audit: {
    title: "Digital Lab Audit",
    image: "/projects/digitallab-audit-site-poster.webp",
    video: auditVideoSrc,
    href: auditLaunchHref,
    fr: {
      description:
        "Diagnostic gratuit de site web pour petites structures : visibilité, confiance, sécurité, RGPD, performance et conversion, avec un score et un plan d’action priorisé.",
      tags: ["Audit", "SEO", "RGPD", "Bêta"],
      cta: "Lancer mon audit gratuit",
    },
    en: {
      description:
        "A free website diagnostic for small businesses: visibility, trust, security, GDPR, performance, and conversion, with a score and a prioritized action plan.",
      tags: ["Audit", "SEO", "GDPR", "Beta"],
      cta: "Start my free audit",
    },
  },
  automation: {
    image: "/projects/automatisation-communications-web-poster.webp",
    video: "/videos/automatisation-communications-web.mp4",
    href: "/videos/automatisation-communications-web.mp4",
    fr: {
      title: "Automatisation des processus & communications",
      description: "Automatiser les tâches répétitives et les échanges pour mieux organiser l’activité.",
      note: "Vidéo illustrative des processus, pas une démonstration de logiciel en production.",
      tags: ["Automatisation", "Communications", "Illustration vidéo"],
      cta: "Voir la vidéo",
    },
    en: {
      title: "Process & Communication Automation",
      description: "Automating repetitive tasks and communications to organize daily operations.",
      note: "Illustrative process video, not a demonstration of production software.",
      tags: ["Automation", "Communications", "Video illustration"],
      cta: "Watch the video",
    },
  },
};

function PortfolioShowcaseCard({ card, isEnglish = false, onNavigate, revealDelay }) {
  const copy = isEnglish ? card.en : card.fr;
  const title = copy.title || card.title;
  const isExternal = isExternalLink(card.href);
  const revealClassName = revealDelay === undefined ? "" : " reveal-on-scroll reveal-card";

  const handleClick = (event) => {
    if (card === portfolioShowcaseCards.audit) {
      handleAuditLaunchClick(event, { eventName: auditEvents.homeCta, location: "homepage_portfolio", onNavigate });
      return;
    }

    if (card.video) return;

    const target = document.querySelector(card.href);

    if (target) {
      event.preventDefault();
      scrollToElementWithHeaderOffset(target);
    }
  };

  return (
    <article
      className={`glass-card project-card premium-card gradient-border soft-hover${revealClassName}`}
      style={revealDelay === undefined ? undefined : { "--reveal-delay": revealDelay }}
      onMouseEnter={handleProjectEnter}
      onMouseLeave={handleProjectLeave}
    >
      <div className="project-media showcase-media">
        <img
          className="project-image"
          src={card.image}
          alt={isEnglish ? `Preview of the ${title} project` : `Aperçu du projet ${title}`}
          loading="lazy"
          decoding="async"
        />
        {card.video && (
          <DeferredVideo
            muted
            loop
            playsInline
            poster={card.image}
            src={card.video}
            ariaLabel={isEnglish ? `Video preview of the ${title} project` : `Aperçu vidéo du projet ${title}`}
          />
        )}
        <span className="project-media-overlay"></span>
      </div>
      <div className="project-body">
        <h3>{title}</h3>
        <p>{copy.description}</p>
        {copy.note && <small>{copy.note}</small>}
        <div className="tags">
          {copy.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <div className="project-actions">
          <a
            className="project-link"
            href={card.href}
            target={isExternal || card.video ? "_blank" : undefined}
            rel={isExternal || card.video ? "noreferrer" : undefined}
            onClick={handleClick}
          >
            {copy.cta}
          </a>
        </div>
      </div>
    </article>
  );
}

// Internal experiments only: statuses mirror the digital-lab-core registry and none is sold as a product.
const aiLabExperiments = [
  {
    name: "Local Business Discovery",
    images: ["/projects/lab/local-business-discovery-1.webp", "/projects/lab/local-business-discovery-2.webp", "/projects/lab/local-business-discovery-3.webp"],
    fr: {
      status: "Prototype en validation",
      problem:
        "Repérer les entreprises locales qui pourraient avoir besoin d’un accompagnement digital reste long et très manuel.",
      solution:
        "Des workflows n8n qui collectent, normalisent et qualifient des données d’entreprises issues de sources ouvertes, testés sur une zone géographique limitée.",
    },
    en: {
      status: "Prototype in validation",
      problem: "Finding local businesses that may need digital support is slow and largely manual.",
      solution:
        "n8n workflows that collect, normalize, and qualify business data from open sources, tested on a limited geographic area.",
    },
  },
  {
    name: "ReelsMaker",
    images: ["/projects/lab/reelsmaker-1.webp", "/projects/lab/reelsmaker-2.webp", "/projects/lab/reelsmaker-3.webp"],
    fr: {
      status: "MVP, en partie manuel",
      problem: "Produire régulièrement des vidéos courtes demande beaucoup de temps : idées, accroches, script, montage.",
      solution:
        "Un workflow assisté par IA qui prépare la veille de tendances, les accroches, le storyboard, la voix off et les légendes. La publication reste validée à la main.",
    },
    en: {
      status: "MVP, partly manual",
      problem: "Publishing short videos regularly takes a lot of time: ideas, hooks, scripts, and editing.",
      solution:
        "An AI-assisted workflow that prepares trend research, hooks, storyboards, voice-over, and captions. Publishing is still approved by hand.",
    },
  },
  {
    name: "Digital Lab AI OS",
    images: ["/projects/lab/digital-lab-ai-os-1.webp", "/projects/lab/digital-lab-ai-os-2.webp", "/projects/lab/digital-lab-ai-os-3.webp"],
    fr: {
      status: "Prototype interne",
      problem: "Faire travailler ensemble plusieurs agents et automatisations sans perdre le contrôle ni la traçabilité.",
      solution:
        "Une couche d’orchestration multi-agents (n8n, agents spécialisés), avec un suivi en lecture seule de l’état des services.",
    },
    en: {
      status: "Internal prototype",
      problem: "Getting several agents and automations to work together without losing control or traceability.",
      solution: "A multi-agent orchestration layer (n8n, specialized agents) with read-only monitoring of service health.",
    },
  },
];

function AILabSection({ isEnglish = false }) {
  return (
    <section
      className="section ai-lab-section reveal-on-scroll reveal-section"
      id={isEnglish ? "en-ai-lab" : "laboratoire-ia"}
    >
      <div className="section-inner">
        <div className="section-heading">
          <span>{isEnglish ? "Experiments" : "Expérimentations"}</span>
          <h2>{isEnglish ? "My AI lab" : "Mon laboratoire IA"}</h2>
          <p>
            {isEnglish
              ? "Internal tools I build to test what AI can automate in prospecting, content, and operations. They are prototypes, not products for sale."
              : "Des outils internes pour tester ce que l’IA peut automatiser dans la prospection, le contenu et l’organisation. Ce sont des prototypes, pas des produits commercialisés."}
          </p>
        </div>

        <ul className="ai-lab-experiments">
          {aiLabExperiments.map((experiment) => {
            const copy = isEnglish ? experiment.en : experiment.fr;

            return (
              <li className="ai-lab-experiment ai-lab-has-carousel premium-card premium-card-subtle gradient-border soft-hover" key={experiment.name}>
                <AILabCarousel images={experiment.images} name={experiment.name} isEnglish={isEnglish} />
                <div className="ai-lab-experiment-content">
                  <div className="ai-lab-experiment-header">
                    <h3>{experiment.name}</h3>
                    <span className="ai-lab-status">{copy.status}</span>
                  </div>
                  <dl>
                    <div>
                      <dt>{isEnglish ? "Problem" : "Problème"}</dt>
                      <dd>{copy.problem}</dd>
                    </div>
                    <div>
                      <dt>{isEnglish ? "Approach tested" : "Solution expérimentée"}</dt>
                      <dd>{copy.solution}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

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

// Services included in every website package (V3): displayed, never selectable or charged.
const websiteIncludedServices = [
  { fr: "Design responsive (mobile, tablette, ordinateur)", en: "Responsive design (mobile, tablet, desktop)" },
  { fr: "SEO de base", en: "Basic SEO" },
  { fr: "Formulaire de contact simple", en: "Simple contact form" },
  { fr: "Adaptation légère des contenus fournis", en: "Minor adaptation of supplied content" },
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

function EnglishHomePage({ onNavigate }) {
  const [selectedProject, setSelectedProject] = useState(null);
  const [quoteRequest, setQuoteRequest] = useState(null);

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
            <PortfolioShowcaseCard card={portfolioShowcaseCards.audit} isEnglish onNavigate={onNavigate} />
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
            <PortfolioShowcaseCard card={portfolioShowcaseCards.automation} isEnglish onNavigate={onNavigate} />
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
              <li className="premium-card roadmap-mini-card soft-hover"><strong>AI Website Transformation</strong><span>AI-assisted redesign — illustrative animation available, service in design</span></li>
              <li className="premium-card roadmap-mini-card soft-hover"><strong>AI Growth Engine</strong><span>SEO and marketing content automation</span></li>
              <li className="premium-card roadmap-mini-card soft-hover"><strong>AI Workforce</strong><span>Specialized AI agent architecture</span></li>
            </ul>
            <p className="ai-roadmap-note">
              These projects are currently in design or prototyping and will be released progressively.
            </p>
          </div>
        </div>
      </section>

      <AILabSection isEnglish />

      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} isEnglish />

      <UnifiedEstimator isEnglish onRequest={(request) => showEstimateEmail(request, setQuoteRequest, "en-contact")} />

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

          <QuoteEmailPanel request={quoteRequest} isEnglish />
          <ContactEmailCard isEnglish />

          <div className="contact-actions">
            <a className="btn btn-primary contact-cta-primary" href={getContactMailLinks(true).primary}>
              Send an email
            </a>
            <a className="btn btn-secondary contact-cta-secondary" href={getContactMailLinks(true).secondary}>
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
                  ← Retour aux projets
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
  if (servicePage?.customPage === "social-media") {
    return <SocialMediaServicePage onNavigate={onNavigate} />;
  }

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

      <section className="case-section case-section-tight">
        <div className="case-shell">
          <article className="case-panel">
            <span>Aussi chez Digital Lab</span>
            <h2>Des réseaux sociaux actifs, chaque mois</h2>
            <p>
              Un abonnement pour publier régulièrement : contenus créés pour vous, validés par vous, publiés aux bonnes dates.
              Dès {formatMonthlyPrice(getPlanMonthlyPrice(SOCIAL_MEDIA_PLANS.presence))}
              {SOCIAL_MEDIA_LAUNCH_ACTIVE ? " pendant l’offre de lancement." : "."}
            </p>
            <p>
              <a href={socialMediaServicePath} onClick={handleNavigateTo(socialMediaServicePath)}>
                Découvrir la gestion des réseaux sociaux →
              </a>
            </p>
          </article>
        </div>
      </section>

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

// LOT SM-04 — social media page (art direction approved in Phase A). Prices
// and quantities come from utils/estimator.js; the estimator at the bottom of
// the page is the same UnifiedEstimator as on the homepage.
const socialMediaEstimatorAnchor = "simulateur-reseaux-sociaux";
const socialMediaRequestAnchor = "demande-reseaux-sociaux";

const socialMediaPlanCopy = {
  presence: {
    audience: "Rester visible sur votre réseau principal.",
    features: ["Calendrier éditorial", "Visuels et légendes", "Publication après validation", "Bilan mensuel"],
  },
  visibilite: {
    audience: "Publier chaque semaine sur deux réseaux.",
    features: ["Tout Présence", "Deux réseaux coordonnés", "Bilan avec recommandations"],
    recommended: true,
  },
  croissance: {
    audience: "Une présence soutenue, avec de la vidéo.",
    features: ["Tout Visibilité", "2 Reels par mois", "Point stratégique mensuel"],
  },
};

const socialMediaBenefits = [
  { title: "Du temps pour votre métier", text: "Vous validez un calendrier au lieu de chercher chaque soir quoi publier." },
  { title: "Une présence régulière", text: "Vos comptes restent actifs chaque semaine, même pendant les périodes chargées." },
  { title: "Une image professionnelle", text: "Visuels, ton et messages suivent une même ligne, alignée avec votre activité." },
  { title: "Un interlocuteur humain", text: "Une personne dédiée prépare, ajuste et vous explique chaque mois ce qui a été fait." },
];

// Visuals V3: licensed Unsplash photographs (see docs/visuals/SOCIAL-MEDIA-V3-PROVENANCE.md),
// cropped without identifiable faces. Text stays in HTML. The two before/after
// images are simulations: one photo, "before" aged digitally.
const socialMediaPhotos = {
  cafe: {
    src: "/projects/social/v3/post-cafe.webp",
    srcSet: "/projects/social/v3/post-cafe-648.webp 648w, /projects/social/v3/post-cafe.webp 1080w",
    alt: "Cappuccino avec dessin de mousse dans une tasse bleue sur une table en bois, croissant doré en arrière-plan",
  },
  coach: {
    src: "/projects/social/v3/post-coach.webp",
    srcSet: "/projects/social/v3/post-coach-648.webp 648w, /projects/social/v3/post-coach.webp 1080w",
    alt: "Personne en squat sumo tenant une kettlebell à deux mains dans une salle d’entraînement",
  },
  atelier: {
    src: "/projects/social/v3/post-atelier.webp",
    srcSet: "/projects/social/v3/post-atelier-648.webp 648w, /projects/social/v3/post-atelier.webp 1080w",
    alt: "Simulation d’avant / après d’une même pièce : à gauche terne et sale, à droite rénovée et lumineuse",
    simulation: true,
  },
  reelCafe: {
    src: "/projects/social/v3/reel-cafe.webp",
    srcSet: "/projects/social/v3/reel-cafe-432.webp 432w, /projects/social/v3/reel-cafe.webp 720w",
    alt: "Mains d’un barista versant du lait mousseux dans une tasse",
  },
  reelCoach: {
    src: "/projects/social/v3/reel-coach.webp",
    srcSet: "/projects/social/v3/reel-coach-432.webp 432w, /projects/social/v3/reel-coach.webp 720w",
    alt: "Bras tendus soulevant une kettlebell au-dessus de la tête dans une salle de sport",
  },
  reelAtelier: {
    src: "/projects/social/v3/reel-atelier.webp",
    srcSet: "/projects/social/v3/reel-atelier-432.webp 432w, /projects/social/v3/reel-atelier.webp 720w",
    alt: "Simulation de transformation : en haut la pièce avant travaux, en bas la même pièce rénovée",
    simulation: true,
  },
};

const socialMediaPersonas = [
  {
    photo: "cafe",
    tag: "Commerce de proximité",
    headline: "Votre pause préférée commence ici.",
    title: "Pour un commerce",
    text: "Nouveautés, coulisses, événements en boutique",
    networks: ["Instagram", "Facebook", "Google Business"],
  },
  {
    photo: "coach",
    tag: "Indépendant",
    headline: "Votre progression commence par la bonne méthode.",
    title: "Pour un professionnel indépendant",
    text: "Conseils, expertise, prise de rendez-vous",
    networks: ["Instagram", "LinkedIn"],
  },
  {
    photo: "atelier",
    tag: "Petite entreprise",
    headline: "Un espace. Une nouvelle histoire.",
    title: "Pour une petite entreprise",
    text: "Réalisations, équipe, recrutement",
    networks: ["LinkedIn", "Facebook"],
  },
];

const socialMediaReelCovers = [
  { photo: "reelCafe", intent: "Coulisses", hook: "Dans les coulisses de votre café" },
  { photo: "reelCoach", intent: "Conseil", hook: "3 mouvements avant votre séance" },
  { photo: "reelAtelier", intent: "Avant / après", hook: "Vous ne reconnaîtrez pas cet atelier." },
];

const socialMediaIncluded = [
  "Analyse de vos comptes et de votre ligne éditoriale",
  "Calendrier mensuel des publications à valider",
  "Création des visuels aux formats de chaque réseau",
  "Rédaction des légendes et choix des hashtags",
  "Programmation et publication après votre accord",
  "Bilan mensuel des publications réalisées",
];

const socialMediaExcluded = ["Budget de publicité payante", "Tournage ou shooting photo sur place", "Réponse en continu aux messages et commentaires"];

const socialMediaWorkflow = [
  { when: "Semaine 1", title: "Échange de départ", text: "Votre activité, vos clients, vos réseaux et le ton à adopter." },
  { when: "Avant chaque mois", title: "Calendrier à valider", text: "Les sujets et dates prévus, ajustés avec vous." },
  { when: "Chaque semaine", title: "Création et validation", text: "Visuels, textes et Reels soumis à votre accord." },
  { when: "Chaque mois", title: "Publication et bilan", text: "Publication aux dates prévues, puis un bilan pour préparer la suite." },
];

const socialMediaReelsOffers = [
  { key: "single", title: "1 Reel", note: "Prestation ponctuelle, idéale pour tester ou annoncer un événement." },
  { key: "pack4", title: "Pack 4 Reels", note: "Une vidéo courte par semaine." },
  { key: "pack8", title: "Pack 8 Reels", note: "Deux vidéos courtes par semaine." },
  { key: "complex", title: "Vidéo complexe", note: "Tournage, motion design ou montage long." },
];

const socialMediaReelsIncluded = [
  "Idée, accroche et script court",
  "Montage vertical 9:16 à partir de vos photos et vidéos",
  "Sous-titres, musique libre de droits et texte à l’écran",
  "Une série de retouches avant livraison",
];

const socialMediaFaq = [
  {
    question: "Est-ce que je valide les publications avant leur mise en ligne ?",
    answer: "Oui. Rien n’est publié sans votre accord : vous recevez le calendrier du mois, puis les visuels et textes à valider.",
  },
  {
    question: "Quels réseaux sociaux pouvez-vous gérer ?",
    answer: "Instagram, Facebook, LinkedIn et Google Business Profile. Un autre réseau peut être étudié lors du premier échange.",
  },
  {
    question: "Dois-je fournir des photos ou des vidéos ?",
    answer:
      "Vos propres photos et vidéos rendent les publications plus authentiques. À défaut, les visuels sont créés à partir de vos contenus existants et de ressources libres de droits.",
  },
  {
    // Shown only while SOCIAL_MEDIA_LAUNCH_ACTIVE is true.
    launchOffer: true,
    question: "Comment fonctionne le tarif de lancement ?",
    answer: `Il est réservé aux ${SOCIAL_MEDIA_LAUNCH_CLIENT_LIMIT} premiers clients de l’offre et s’applique pendant les ${SOCIAL_MEDIA_LAUNCH_MONTHS} premiers mois. Le prix standard s’applique ensuite, comme indiqué sur chaque formule.`,
  },
  {
    question: "Y a-t-il une durée d’engagement ?",
    answer: "La durée, les conditions de résiliation et le détail des prestations sont précisés dans le devis, avant tout démarrage.",
  },
  {
    question: "Garantissez-vous un nombre d’abonnés ou de ventes ?",
    answer:
      "Non. Aucun prestataire sérieux ne peut garantir ces résultats. L’objectif est une présence régulière, cohérente et suivie, que nous ajustons chaque mois.",
  },
  {
    question: "Puis-je commander des Reels sans abonnement ?",
    answer: "Oui. L’offre Reels est indépendante : un Reel à l’unité ou un pack mensuel, sans souscrire à la gestion des réseaux sociaux.",
  },
];

// Photographic post: licensed photo + HTML tag/headline; simulations are labelled.
// `eager` is for the hero, visible on first paint (not lazy-loaded).
function SocialPhoto({ photo, tag, headline, sizes, decorative = false, eager = false }) {
  const image = socialMediaPhotos[photo];

  return (
    <div className="sm-post-art sm-photo" data-photo={photo}>
      <img
        alt={decorative ? "" : image.alt}
        decoding="async"
        fetchPriority={eager ? "high" : undefined}
        loading={eager ? "eager" : "lazy"}
        sizes={sizes}
        src={image.src}
        srcSet={image.srcSet}
      />
      <span className="sm-photo-shade" aria-hidden="true"></span>
      {image.simulation && <span className="sm-sim-badge">Simulation</span>}
      {tag && <span className="sm-post-tag">{tag}</span>}
      {headline && <p className="sm-post-headline">{headline}</p>}
    </div>
  );
}

function SocialMediaServicePage({ onNavigate }) {
  const [quoteRequest, setQuoteRequest] = useState(null);
  const [estimatorPreset, setEstimatorPreset] = useState(null);

  const handleNavigateTo = (target) => (event) => {
    event.preventDefault();
    onNavigate(target);
  };

  const scrollToSection = (id) => (event) => {
    event.preventDefault();
    scrollToElementWithHeaderOffset(`#${id}`);
  };

  // Plan cards, the hero and Reels offers preselect the shared estimator.
  const openEstimator = (preset, location) => (event) => {
    event.preventDefault();
    trackEvent("social_media_offer_select", {
      offer: preset.plan ? `social_${preset.plan}` : preset.reels ? reelsAnalyticsKey[preset.reels] : "social",
      cta_location: location,
    });
    setEstimatorPreset({ ...preset });
    window.setTimeout(() => scrollToElementWithHeaderOffset(`#${socialMediaEstimatorAnchor}`), 0);
  };

  const requestQuote = (request) => showEstimateEmail(request, setQuoteRequest, socialMediaRequestAnchor);

  return (
    <main className="case-page sm-page fade-in-page">
      <section className="sm-hero">
        <div className="case-bg" aria-hidden="true"></div>
        <div className="case-shell">
          <button className="back-button" type="button" onClick={() => onNavigate("/#services")}>
            Retour
          </button>

          <div className="sm-hero-grid">
            <div className="sm-hero-copy">
              <span className="sm-eyebrow">Gestion des réseaux sociaux</span>
              <h1>
                Vos réseaux sociaux, <em>sans y passer vos journées.</em>
              </h1>
              <p className="sm-hero-lead">
                Nous créons vos contenus, vous les validez, nous organisons leur publication.{" "}
                <strong>Une présence régulière, des visuels professionnels et un accompagnement humain.</strong>
              </p>
              <div className="sm-hero-actions">
                <a className="btn btn-primary" href={`#${socialMediaEstimatorAnchor}`} onClick={openEstimator({ contentService: "social" }, "hero")}>
                  Estimer mon abonnement
                </a>
                <a className="btn btn-secondary" href="#formules" onClick={scrollToSection("formules")}>
                  Voir les formules
                </a>
              </div>
              <ul className="sm-reassure">
                <li>Rien n’est publié sans votre accord</li>
                <li>
                  Dès {formatMonthlyPrice(getPlanMonthlyPrice(SOCIAL_MEDIA_PLANS.presence))}
                  {SOCIAL_MEDIA_LAUNCH_ACTIVE && " (offre de lancement)"}
                </li>
                <li>Un interlocuteur dédié</li>
              </ul>
            </div>

            <figure className="sm-hero-visual">
              <div className="sm-stage" aria-hidden="true">
                <div className="sm-phone sm-phone-back">
                  <div className="sm-screen">
                    <div className="sm-li-card">
                      <div className="sm-app-top">
                        <span className="sm-avatar sm-avatar-studio">CA</span>
                        <span>
                          <strong>Cabinet d’architecture</strong>
                          <small>Publication professionnelle</small>
                        </span>
                      </div>
                      <p>Nouvelle réalisation : un atelier rénové.</p>
                      <div className="sm-li-visual">
                        <SocialPhoto photo="atelier" sizes="240px" decorative eager />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="sm-phone sm-phone-main">
                  <div className="sm-screen">
                    <div className="sm-app-top">
                      <span className="sm-avatar sm-avatar-florist">VC</span>
                      <span>
                        <strong>votre.cafe</strong>
                        <small>Sponsorisé</small>
                      </span>
                    </div>
                    <SocialPhoto photo="cafe" tag="Café de quartier" headline="Votre pause préférée commence ici." sizes="250px" decorative eager />
                    <div className="sm-post-actions">♡ ◯ ➤</div>
                    <p className="sm-post-caption">
                      <b>votre.cafe</b> Pâtisseries maison.
                    </p>
                  </div>
                </div>
                <span className="sm-float-chip sm-chip-validated">
                  <span className="sm-dot sm-dot-mint"></span>Validé par vous
                </span>
                <span className="sm-float-chip sm-chip-scheduled">
                  <span className="sm-dot sm-dot-violet"></span>Programmé mardi 18 h
                </span>
              </div>
              <figcaption>Exemple illustratif — marques fictives.</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="sm-section" aria-labelledby="sm-benefits-title">
        <div className="case-shell">
          <div className="sm-section-heading">
            <span className="sm-eyebrow">Ce que vous y gagnez</span>
            <h2 id="sm-benefits-title">Une présence qui tient dans la durée.</h2>
          </div>
          <div className="sm-benefits">
            {socialMediaBenefits.map((benefit, index) => (
              <article className="sm-benefit" key={benefit.title}>
                <span className="sm-benefit-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sm-section" aria-labelledby="sm-contents-title">
        <div className="case-shell">
          <div className="sm-section-heading">
            <span className="sm-eyebrow">Des contenus à votre image</span>
            <h2 id="sm-contents-title">Chaque activité a sa façon de parler à ses clients.</h2>
            <p>Nous adaptons le ton, les visuels et le rythme à votre métier. Vous recevez chaque mois des publications prêtes à valider.</p>
          </div>
          <div className="sm-personas">
            {socialMediaPersonas.map((persona) => (
              <article className="sm-persona" key={persona.title}>
                <SocialPhoto
                  photo={persona.photo}
                  tag={persona.tag}
                  headline={persona.headline}
                  sizes="(max-width: 960px) 92vw, 380px"
                />
                <div className="sm-persona-meta">
                  <h3>{persona.title}</h3>
                  <p>{persona.text}</p>
                  <ul aria-label="Réseaux adaptés">
                    {persona.networks.map((network) => (
                      <li key={network}>{network}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
          <p className="sm-fiction-note">
            Exemples illustratifs, marques fictives. Photographies Unsplash ; l’avant / après est une simulation.
          </p>

          <div className="sm-included">
            <article>
              <h3>Inclus chaque mois</h3>
              <ul className="sm-check-list">
                {socialMediaIncluded.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article>
              <h3>Non inclus, sur devis si besoin</h3>
              <ul className="sm-check-list is-muted">
                {socialMediaExcluded.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <section className="sm-section" aria-labelledby="sm-method-title">
        <div className="case-shell">
          <div className="sm-section-heading">
            <span className="sm-eyebrow">Méthode</span>
            <h2 id="sm-method-title">Un mois avec Digital Lab, en quatre temps.</h2>
          </div>
          <ol className="sm-method">
            {socialMediaWorkflow.map((step) => (
              <li key={step.title}>
                <span className="sm-method-when">{step.when}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="sm-section" id="formules" aria-labelledby="sm-pricing-title">
        <div className="case-shell">
          <div className="sm-section-heading">
            <span className="sm-eyebrow">Formules</span>
            <h2 id="sm-pricing-title">Un abonnement clair, adapté à votre rythme.</h2>
            <p>Choisissez une formule, ajoutez des options si besoin, et obtenez votre estimation en une minute.</p>
          </div>
          {SOCIAL_MEDIA_LAUNCH_ACTIVE && (
            <p className="sm-launch-band">
              <strong>Offre de lancement</strong> Réservée aux {SOCIAL_MEDIA_LAUNCH_CLIENT_LIMIT} premiers clients, pendant vos{" "}
              {SOCIAL_MEDIA_LAUNCH_MONTHS} premiers mois. Le prix standard s’applique ensuite.
            </p>
          )}
          <div className="sm-plans">
            {Object.entries(SOCIAL_MEDIA_PLANS).map(([planKey, plan]) => {
              const copy = socialMediaPlanCopy[planKey];

              return (
                <article className={`sm-plan${copy.recommended ? " is-featured" : ""}`} key={planKey} aria-labelledby={`sm-plan-${planKey}`}>
                  {copy.recommended && <span className="sm-plan-badge">Recommandée pour démarrer</span>}
                  <h3 id={`sm-plan-${planKey}`}>{plan.name}</h3>
                  <p className="sm-plan-for">{copy.audience}</p>
                  <p className="sm-plan-price">
                    <strong>{formatTaxedPrice(getPlanMonthlyPrice(plan))}</strong>
                    <span>/mois</span>
                  </p>
                  {SOCIAL_MEDIA_LAUNCH_ACTIVE && (
                    <p className="sm-plan-then">puis {formatMonthlyPrice(plan.referencePrice)} (prix standard)</p>
                  )}
                  <dl className="sm-volumes">
                    <div>
                      <dt>publications</dt>
                      <dd>{plan.posts}</dd>
                    </div>
                    <div>
                      <dt>{plan.platforms > 1 ? "réseaux" : "réseau"}</dt>
                      <dd>{plan.platforms}</dd>
                    </div>
                    <div>
                      <dt>Reels</dt>
                      <dd>{plan.reels || "—"}</dd>
                    </div>
                  </dl>
                  <ul className="sm-check-list">
                    {copy.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <a
                    className={`btn ${copy.recommended ? "btn-primary" : "btn-secondary"}`}
                    href={`#${socialMediaEstimatorAnchor}`}
                    onClick={openEstimator({ contentService: "social", plan: planKey }, "pricing_card")}
                  >
                    Estimer avec {plan.name}
                  </a>
                </article>
              );
            })}
          </div>
          <p className="sm-footnote">
            Options : publication supplémentaire {formatTaxedPrice(SOCIAL_MEDIA_ADDONS.extraPost)} par publication et par mois, réseau supplémentaire{" "}
            {formatMonthlyPrice(SOCIAL_MEDIA_ADDONS.extraPlatform)}, audit de départ {formatTaxedPrice(SOCIAL_MEDIA_ADDONS.setupAudit)} (facultatif, une seule fois).
            Budget publicitaire non inclus.{priceTax.note ? ` ${priceTax.note}` : ""}
          </p>
        </div>
      </section>

      <section className="sm-section sm-reels" id="reels" aria-labelledby="sm-reels-title">
        <div className="case-shell">
          <div className="sm-reels-layout">
            <div>
              <div className="sm-section-heading">
                <span className="sm-eyebrow">Offre Reels</span>
                <h2 id="sm-reels-title">Des Reels qui donnent envie de regarder jusqu’au bout.</h2>
                <p>
                  Des vidéos courtes prêtes à publier sur Instagram, Facebook ou TikTok, à l’unité ou en abonnement mensuel, avec ou
                  sans gestion de vos réseaux sociaux.
                </p>
              </div>
              <ul className="sm-check-list">
                {socialMediaReelsIncluded.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <figure className="sm-reels-visual">
              {/* Covers only: no video exists, so no play button or progress bar. */}
              <div className="sm-reel-phones">
                {socialMediaReelCovers.map((reel) => {
                  const image = socialMediaPhotos[reel.photo];

                  return (
                    <div className="sm-reel-phone" key={reel.hook}>
                      <img alt={image.alt} decoding="async" loading="lazy" sizes="(max-width: 600px) 112px, 178px" src={image.src} srcSet={image.srcSet} />
                      <span className="sm-photo-shade" aria-hidden="true"></span>
                      <span className="sm-reel-intent">{reel.intent}</span>
                      {image.simulation && <span className="sm-sim-badge">Simulation</span>}
                      <span className="sm-reel-hook">{reel.hook}</span>
                    </div>
                  );
                })}
              </div>
              <figcaption>
                Exemples illustratifs : couvertures de Reels verticaux 9:16 (aucune vidéo). Avant / après : simulation.
              </figcaption>
            </figure>
          </div>

          <div className="sm-reels-offers">
            {socialMediaReelsOffers.map((offer) => {
              const pricing = REELS_OFFERS[offer.key];
              const price =
                pricing.billing === "quote"
                  ? "Sur devis"
                  : pricing.billing === "monthly"
                    ? formatMonthlyPrice(pricing.price)
                    : formatTaxedPrice(pricing.price);

              return (
                <article className="sm-reels-offer" key={offer.key} aria-labelledby={`sm-reels-${offer.key}`}>
                  <h3 id={`sm-reels-${offer.key}`}>{offer.title}</h3>
                  <p className="sm-reels-price">{price}</p>
                  <p>{offer.note}</p>
                  {pricing.billing === "monthly" && (
                    <p className="sm-reels-unit">
                      Soit environ {formatTaxedPrice(Math.round(pricing.price / pricing.quantity))} par Reel
                    </p>
                  )}
                  <a
                    className="btn btn-secondary"
                    href={`#${socialMediaEstimatorAnchor}`}
                    onClick={openEstimator({ contentService: "reels", reels: offer.key }, "reels_card")}
                  >
                    {pricing.billing === "quote" ? "Demander un devis" : "Estimer"}
                  </a>
                </article>
              );
            })}
          </div>
          {priceTax.note && <p className="sm-footnote">{priceTax.note}</p>}
        </div>
      </section>

      <section className="sm-section" aria-labelledby="sm-examples-title">
        <div className="case-shell">
          <div className="sm-section-heading">
            <span className="sm-eyebrow">Exemples</span>
            <h2 id="sm-examples-title">Ce que vous recevez chaque mois.</h2>
            <p>Un calendrier clair avant de commencer, un bilan simple à la fin du mois. Exemples de démonstration, sans données clients.</p>
          </div>
          <div className="sm-examples">
            <article className="sm-demo-card" aria-labelledby="sm-demo-calendar">
              <header>
                <h3 id="sm-demo-calendar">Calendrier du mois</h3>
                <span className="sm-demo-badge">Démonstration</span>
              </header>
              <ol className="sm-calendar">
                {[
                  ["Semaine 1", "Carrousel conseil", "Instagram"],
                  ["Semaine 2", "Coulisses de l’équipe", "Facebook"],
                  ["Semaine 3", "Reel : avant / après", "Instagram"],
                  ["Semaine 4", "Annonce d’un événement", "Facebook"],
                ].map(([week, topic, network]) => (
                  <li key={week}>
                    <span>{week}</span>
                    <strong>{topic}</strong>
                    <em>{network}</em>
                  </li>
                ))}
              </ol>
              <p className="sm-demo-status">✓ Validé avec vous avant toute création</p>
            </article>
            <article className="sm-demo-card" aria-labelledby="sm-demo-report">
              <header>
                <h3 id="sm-demo-report">Bilan du mois</h3>
                <span className="sm-demo-badge">Démonstration</span>
              </header>
              <div className="sm-report">
                <div>
                  <h4>Réalisé</h4>
                  <p>8 publications sur 2 réseaux, toutes validées avant publication.</p>
                </div>
                <div>
                  <h4>Sujets traités</h4>
                  <p>Conseils, coulisses, nouveautés, événement du mois.</p>
                </div>
                <div>
                  <h4>Proposé pour le mois prochain</h4>
                  <p>Une série « questions fréquentes » et un Reel de présentation de l’équipe.</p>
                </div>
              </div>
              <p className="sm-demo-status">Exemple de présentation, sans résultats clients</p>
            </article>
          </div>
        </div>
      </section>

      <section className="sm-section" aria-labelledby="sm-faq-title">
        <div className="case-shell sm-faq">
          <div className="sm-section-heading">
            <span className="sm-eyebrow">FAQ</span>
            <h2 id="sm-faq-title">Questions fréquentes</h2>
          </div>
          {socialMediaFaq.filter((item) => SOCIAL_MEDIA_LAUNCH_ACTIVE || !item.launchOffer).map((item) => (
            <details className="sm-faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <UnifiedEstimator variant="social" preset={estimatorPreset} onRequest={requestQuote} />

      <section className="sm-section sm-request" id={socialMediaRequestAnchor} aria-labelledby="sm-request-title">
        <div className="case-shell">
          <div className="sm-section-heading">
            <span className="sm-eyebrow">Demande de devis</span>
            <h2 id="sm-request-title">Parlons de vos réseaux sociaux.</h2>
            <p>
              Vos choix du simulateur sont repris dans un e-mail prêt à envoyer. Réponse sous 24–48h avec une
              proposition adaptée.
            </p>
          </div>
          <QuoteEmailPanel request={quoteRequest} />
          <ContactEmailCard />
          <p className="contact-form-privacy">
            Vos informations sont utilisées uniquement pour traiter votre demande et vous répondre.{" "}
            <a href={privacyPolicyPath} onClick={handleNavigateTo(privacyPolicyPath)}>
              Politique de confidentialité
            </a>
          </p>
          <p className="sm-related-links">
            Vous préférez commencer par votre site ?{" "}
            <a href={auditLandingPath} onClick={handleNavigateTo(auditLandingPath)}>
              Faire l’audit gratuit
            </a>{" "}
            ou{" "}
            <a href="/services/creation-site-web" onClick={handleNavigateTo("/services/creation-site-web")}>
              découvrir la création de site web
            </a>
            .
          </p>
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
  const visibleActiveHref = isAuditPage
    ? auditLandingPath
    : pathname === socialMediaServicePath
      ? socialMediaServicePath
      : pathname === "/"
        ? activeHref
        : "";
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
              aria-current={
                visibleActiveHref === link.href
                  ? isAuditPage || pathname === socialMediaServicePath
                    ? "page"
                    : "true"
                  : undefined
              }
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
  const [homeQuoteRequest, setHomeQuoteRequest] = useState(null);
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
      // A ratio threshold is never reached by sections taller than the viewport (stacked project cards on mobile),
      // so reveal as soon as the element's top enters the lower 85% of the viewport.
      { threshold: 0, rootMargin: "0px 0px -15% 0px" },
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

  if (pathname === legalNoticePath) {
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

  if (pathname === privacyPolicyPath) {
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

        <PrivacyPolicyPage onNavigate={navigate} />

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

        <EnglishHomePage onNavigate={navigate} />

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
                <h3>Des solutions et des expérimentations</h3>
                <p>
                  Ces projets explorent l’intelligence artificielle appliquée
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
              <PortfolioShowcaseCard card={portfolioShowcaseCards.audit} onNavigate={navigate} revealDelay="0ms" />
              {projects.map((project, index) => (
                <article
                  className="glass-card project-card premium-card gradient-border soft-hover reveal-on-scroll reveal-card"
                  key={project.title}
                  style={{ "--reveal-delay": `${(index + 1) * 90}ms` }}
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
              <PortfolioShowcaseCard
                card={portfolioShowcaseCards.automation}
                onNavigate={navigate}
                revealDelay={`${(projects.length + 1) * 90}ms`}
              />
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
                <li className="premium-card roadmap-mini-card soft-hover"><strong>AI Website Transformation</strong><span>Refonte assistée par IA — animation illustrative disponible, offre en conception</span></li>
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

        <AILabSection />

        <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />

        <UnifiedEstimator onRequest={(request) => showEstimateEmail(request, setHomeQuoteRequest, "contact")} />

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

            <QuoteEmailPanel request={homeQuoteRequest} />
            <ContactEmailCard />

            <div className="contact-actions">
              <a className="btn btn-primary contact-cta-primary" href={getContactMailLinks().primary}>
                Envoyer un email
              </a>
              <a className="btn btn-secondary contact-cta-secondary" href={getContactMailLinks().secondary}>
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
