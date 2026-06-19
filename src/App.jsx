import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import { RequestConversation } from "./components/RequestConversation";
import { RequestDocuments } from "./components/RequestDocuments";
import { RequestQuotes } from "./components/RequestQuotes";
import { useAuth } from "./context/useAuth";
import { getUnreadMessageCounts } from "./services/requestMessages";
import { getLatestQuotesForRequests } from "./services/quotes";
import {
  createContactRequest,
  getAllContactRequests,
  getContactRequestsForUser,
  updateContactRequestStatus,
} from "./services/contactRequests";
import { getCurrentSession, supabase } from "./services/auth";
import { getProfileForUser } from "./services/profiles";

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
      "Dashboards",
      "Suivi client",
    ],
    examples:
      "Simulateurs, calculateurs, formulaires intelligents, emails automatiques, Google Sheets, CRM adapté, dashboards, notifications, suivi client, etc.",
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
      "Dashboard",
      "Espace client",
      "Parcours",
      "Démo",
      "Itérations",
    ],
    examples:
      "Prototype SaaS, plateforme locale, dashboard B2B, espace utilisateur, application web testable, parcours utilisateur, version démo, etc.",
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
  { label: "Services", href: "/#services" },
  { label: "Projets", href: "/#projets" },
  { label: "Méthode", href: "/#method" },
  { label: "À propos", href: "/#about" },
  { label: "Blog", href: "/#blog" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/#contact" },
];

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
    title: "Un langage business avant la technique",
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
  "Dashboard",
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
  { icon: "◎", value: null, label: "UX/UI, SEO & dashboards" },
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
    tags: ["Automatisation", "PME", "Workflow"],
    link: "#contact",
  },
  {
    title: "Faut-il créer un MVP avant un vrai projet ?",
    description: "Pourquoi commencer petit peut aider à tester une idée avant d’investir davantage.",
    tags: ["MVP", "Prototype", "Stratégie"],
    link: "#contact",
  },
];

const footerStack = ["WordPress", "React", "Vite", "Supabase", "SEO", "Automatisation"];

const estimatorNeeds = [
  "Créer un site web",
  "Réparer / améliorer un site existant",
  "Optimiser SEO & visibilité",
  "Ajouter une automatisation",
  "Créer un chatbot / assistant IA",
  "Créer un MVP ou prototype web",
];

const estimatorFeatures = [
  "Formulaire de contact",
  "Réservation",
  "Email automatique",
  "Google Sheets / CRM",
  "Dashboard",
  "Paiement",
  "Chatbot",
  "SEO",
  "Maintenance",
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
    description: "SaaS pour alléger les tâches administratives des indépendants.",
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
    stack: ["React", "Vite", "SaaS", "Dashboard", "Automatisation"],
    objective:
      "Valider un produit digital capable de réduire la charge administrative et de créer une expérience plus fluide pour les indépendants.",
    tags: ["SaaS", "MVP", "Dashboard", "Automatisation"],
    link: "/projects/microassist",
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
        "Pour les formateurs / consultants : gestion des sessions, inscriptions, documents partagés et feedback des participants.",
      ],
      cta: "Adapter cette logique à mon métier →",
    },
  },
  {
    slug: "socle-local",
    title: "Socle Local — Plateforme locale",
    subtitle: "Plateforme communautaire pour connecter une vie locale.",
    description: "Plateforme locale pour annonces, associations et entraide.",
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
    tags: ["Plateforme", "UX/UI", "Responsive"],
    link: "/projects/socle-local",
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
    description: "Dashboard B2B pour suivre clients, alertes et priorités.",
    caseStudy: {
      problem: "Suivi multi-clients difficile pour les professionnels.",
      solution: "Dashboard, alertes, priorités et fiches clients.",
      result: "Dossiers mieux organisés et risques plus faciles à suivre.",
    },
    details:
      "MicroAssist Expert transforme le suivi client en tableau de bord lisible, avec une vision des priorités, des alertes et des dossiers à traiter. Le prototype est conçu pour aider les professionnels à gagner du temps sans complexifier leur méthode de travail.",
    features: [
      "Vue multi-clients organisée par priorités",
      "Alertes et statuts pour suivre les dossiers sensibles",
      "Interface B2B claire pour limiter les frictions",
      "Prototype évolutif pour tester des workflows métier",
    ],
    stack: ["React", "Dashboard", "B2B", "Prototype", "Workflow"],
    objective:
      "Aider les professionnels à garder une vision claire de leurs clients, des urgences et des tâches à prioriser.",
    tags: ["Dashboard", "B2B", "Prototype"],
    link: "/projects/microassist-expert",
    image: "/projects/microassist-expert.png",
    video: "/videos/microassist-expert.mp4",
    cta: "Demander une démo",
    modal: {
      title: "Un tableau de bord pour piloter plusieurs dossiers en même temps",
      description:
        "MicroAssist Expert permet de suivre plusieurs clients, de visualiser les alertes et de prioriser les actions. L’objectif : ne plus perdre les informations importantes.",
      adaptationTitle: "Comment l’adapter à vos process ?",
      adaptations: [
        "Pour les experts-comptables : suivi des dossiers clients, alertes déclaratives, documents manquants et priorités.",
        "Pour les responsables associatifs : suivi des adhésions, bénévoles, demandes entrantes et tâches à répartir.",
        "Pour les freelances ou petites équipes : vue d’ensemble des projets, délais, tâches et charge de travail.",
      ],
      cta: "Adapter ce tableau de bord à mes process →",
    },
  },
  {
    slug: "assistant-reservation-ia",
    title: "Assistant de réservation IA",
    subtitle: "Assistant conversationnel pour réservations et demandes clients.",
    description:
      "Assistant conversationnel pour réservations, demandes clients et workflows automatisés.",
    caseStudy: {
      problem: "Demandes répétitives et réservations manuelles.",
      solution: "Assistant conversationnel, QR code, collecte de demandes.",
      result: "Prise de contact simplifiée et disponibilité 24/7.",
    },
    details:
      "Cet assistant aide les petites structures à recevoir, qualifier et organiser les demandes clients. Il peut guider une réservation, collecter les informations utiles et déclencher un workflow efficace pour éviter les oublis.",
    features: [
      "Conversation guidée pour qualifier les demandes",
      "Workflow automatisé pour organiser les réservations",
      "Interface adaptable selon le métier",
      "Base prête à connecter à d’autres outils",
    ],
    stack: ["IA", "Automatisation", "Chatbot", "Workflow", "Interface web"],
    objective:
      "Réduire le temps passé à répondre aux demandes répétitives tout en gardant une expérience claire et humaine pour les clients.",
    tags: ["IA", "Automatisation", "Chatbot", "Workflow"],
    link: "https://reservation-bot-demo.pages.dev/",
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

const getProjectFromPath = (pathname) => {
  const match = pathname.match(/^\/projects\/([^/]+)\/?$/);

  if (!match) {
    return null;
  }

  return projects.find((project) => project.slug === match[1]) ?? null;
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
          <img
            alt={`Aperçu ${index + 1} pour ${service.title}`}
            className={index === safeActiveIndex ? "is-active" : ""}
            key={image}
            onError={() => {
              setFailedImages((currentImages) =>
                currentImages.includes(image) ? currentImages : [...currentImages, image],
              );
            }}
            src={image}
          />
        ))}
        <span className="service-gallery-overlay"></span>
      </div>

      <div className="service-gallery-dots" aria-label={`Aperçus pour ${service.title}`}>
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

function ServiceAccordionCard({ service }) {
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
              <span>Votre problème</span>
              <p>{service.problem}</p>
            </article>
            <article>
              <span>Notre solution</span>
              <p>{service.canDo}</p>
            </article>
            <article>
              <span>Résultat concret</span>
              <p>{service.expectedResult}</p>
            </article>
          </div>

          <ul>
            {service.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
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

function ProjectModal({ project, onClose }) {
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
          aria-label="Fermer la fenêtre"
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

function ArticleSoonModal({ article, onClose }) {
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
          aria-label="Fermer la fenêtre"
          onClick={onClose}
          ref={closeButtonRef}
        >
          ×
        </button>
        <span>Conseil pratique</span>
        <h2 id="article-modal-title">Article bientôt disponible</h2>
        <p>
          Les articles complets seront ajoutés progressivement. Vous pouvez déjà me contacter si vous avez une question
          sur ce sujet.
        </p>
        <small>{article.title}</small>
        <a className="btn btn-primary" href="#contact" onClick={onClose}>
          Me poser une question
        </a>
      </section>
    </div>
  );
}

function BlogCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const trackRef = useRef(null);

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
    const nextIndex = Math.max(0, Math.min(articles.length - 1, activeIndex + direction));
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

    setActiveIndex(Math.max(0, Math.min(articles.length - 1, nextIndex)));
  };

  return (
    <section className="section articles-section reveal-on-scroll reveal-section" id="blog">
      <div className="section-inner">
        <div className="articles-header">
          <div className="section-heading">
            <span>Conseils pratiques</span>
            <h2>Articles & conseils</h2>
            <p>
              Des conseils pratiques pour mieux comprendre le web, améliorer sa visibilité et éviter les erreurs
              fréquentes.
            </p>
          </div>

          <div className="articles-controls" aria-label="Navigation des articles">
            <button type="button" onClick={() => scrollByDirection(-1)} aria-label="Article précédent">
              ←
            </button>
            <button type="button" onClick={() => scrollByDirection(1)} aria-label="Article suivant">
              →
            </button>
          </div>
        </div>

        <div className="articles-carousel" ref={trackRef} onScroll={handleScroll}>
          {articles.map((article, index) => (
            <article
              className="article-card reveal-on-scroll reveal-card"
              key={article.title}
              style={{ "--reveal-delay": `${index * 80}ms` }}
            >
              <div className="article-tags" aria-label="Thèmes de l’article">
                {article.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <h3>{article.title}</h3>
              <p>{article.description}</p>
              <button type="button" onClick={() => setSelectedArticle(article)}>
                Lire l’article <span aria-hidden="true">→</span>
              </button>
            </article>
          ))}
        </div>

        <div className="articles-pagination" aria-label="Pagination des articles">
          {articles.map((article, index) => (
            <button
              className={activeIndex === index ? "is-active" : ""}
              type="button"
              key={article.title}
              onClick={() => scrollToArticle(index)}
              aria-label={`Afficher l’article ${index + 1}`}
            ></button>
          ))}
        </div>

        <button className="articles-soon-button" type="button" onClick={() => setSelectedArticle(articles[0])}>
          Articles complets à venir
        </button>
      </div>

      <ArticleSoonModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
    </section>
  );
}

function getEstimatorResult(answers) {
  let score = 0;

  if (answers.complexity.startsWith("Standard")) {
    score += 1;
  }

  if (answers.complexity.startsWith("Avancé")) {
    score += 2;
  }

  if (
    answers.need.includes("automatisation") ||
    answers.need.includes("chatbot") ||
    answers.need.includes("MVP")
  ) {
    score += 1;
  }

  if (answers.features.length >= 3) {
    score += 1;
  }

  if (answers.features.some((feature) => ["Dashboard", "Paiement", "Chatbot", "Google Sheets / CRM"].includes(feature))) {
    score += 1;
  }

  if (answers.urgency === "Urgent") {
    score += 1;
  }

  if (score <= 1) {
    return {
      type: "Simple",
      budget: "à partir de 300€",
      delay: "3–5 jours",
      message: "Votre besoin semble ciblé. Une intervention courte peut probablement suffire pour avancer vite.",
    };
  }

  if (score <= 3) {
    return {
      type: "Intermédiaire",
      budget: "à partir de 800€",
      delay: "1–2 semaines",
      message: "Votre projet demande plusieurs éléments à coordonner. Une première version claire peut être créée rapidement.",
    };
  }

  return {
    type: "Avancé",
    budget: "à partir de 1500€",
    delay: "3–4 semaines",
    message: "Votre projet implique plusieurs fonctionnalités ou workflows. Un cadrage précis permettra de sécuriser le budget et les étapes.",
  };
}

function ProjectEstimator() {
  const [answers, setAnswers] = useState(initialEstimatorAnswers);
  const result = getEstimatorResult(answers);
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
  const emailBody = [
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
  const mailtoHref = `mailto:elenamihalska70@gmail.com?subject=${encodeURIComponent(
    "Demande de projet Digital Lab",
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
    <section className="section estimator-section reveal-on-scroll reveal-section" id="estimation">
      <div className="section-inner">
        <div className="section-heading">
          <span>Estimation</span>
          <h2>Estimez une première version de votre projet</h2>
          <p>Répondez à quelques questions ciblées pour obtenir une première indication de budget, délai et complexité.</p>
        </div>

        <div className="estimator-panel reveal-on-scroll reveal-card" style={{ "--reveal-delay": "120ms" }}>
          <div className="estimator-progress" aria-label={`Progression ${progress}%`}>
            <span style={{ width: `${progress}%` }}></span>
          </div>

          <div className="estimator-grid">
            <div className="estimator-questions">
              <div className="estimator-question reveal-on-scroll reveal-card" style={{ "--reveal-delay": "180ms" }}>
                <h3>Vous êtes :</h3>
                <div className="estimator-options">
                  {["Indépendant", "Association", "Commerce local", "Restaurant / service", "Projet en création", "Autre"].map((profile) => (
                    <button
                      className={answers.profile === profile ? "is-selected" : ""}
                      key={profile}
                      type="button"
                      onClick={() => updateAnswer("profile", profile)}
                    >
                      {profile}
                    </button>
                  ))}
                </div>
              </div>

              <div className="estimator-question reveal-on-scroll reveal-card" style={{ "--reveal-delay": "220ms" }}>
                <h3>Votre priorité principale :</h3>
                <div className="estimator-options">
                  {[
                    "Être visible",
                    "Recevoir plus de demandes",
                    "Gagner du temps",
                    "Réparer un site existant",
                    "Tester une idée",
                    "Automatiser une tâche",
                  ].map((priority) => (
                    <button
                      className={answers.priority === priority ? "is-selected" : ""}
                      key={priority}
                      type="button"
                      onClick={() => updateAnswer("priority", priority)}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              <div className="estimator-question reveal-on-scroll reveal-card" style={{ "--reveal-delay": "260ms" }}>
                <h3>Quel est votre besoin principal ?</h3>
                <div className="estimator-options">
                  {estimatorNeeds.map((need) => (
                    <button
                      className={answers.need === need ? "is-selected" : ""}
                      key={need}
                      type="button"
                      onClick={() => updateAnswer("need", need)}
                    >
                      {need}
                    </button>
                  ))}
                </div>
              </div>

              <div className="estimator-question estimator-question-inline reveal-on-scroll reveal-card" style={{ "--reveal-delay": "320ms" }}>
                <div>
                  <h3>Avez-vous déjà un site ou un outil existant ?</h3>
                  <div className="estimator-options compact">
                    {["Oui", "Non", "Partiellement"].map((option) => (
                      <button
                        className={answers.existing === option ? "is-selected" : ""}
                        key={option}
                        type="button"
                        onClick={() => updateAnswer("existing", option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3>Avez-vous déjà les contenus ?</h3>
                  <div className="estimator-options compact">
                    {["Textes et images prêts", "Quelques éléments seulement", "Je pars de zéro"].map((option) => (
                      <button
                        className={answers.content === option ? "is-selected" : ""}
                        key={option}
                        type="button"
                        onClick={() => updateAnswer("content", option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="estimator-question reveal-on-scroll reveal-card" style={{ "--reveal-delay": "380ms" }}>
                <h3>Niveau de complexité souhaité</h3>
                <div className="estimator-options">
                  {[
                    "Simple : page ou fonctionnalité basique",
                    "Standard : plusieurs pages ou plusieurs fonctions",
                    "Avancé : espace utilisateur, dashboard, automatisation ou IA",
                  ].map((option) => (
                    <button
                      className={answers.complexity === option ? "is-selected" : ""}
                      key={option}
                      type="button"
                      onClick={() => updateAnswer("complexity", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="estimator-question reveal-on-scroll reveal-card" style={{ "--reveal-delay": "440ms" }}>
                <h3>Fonctionnalités souhaitées</h3>
                <div className="estimator-checkboxes">
                  {estimatorFeatures.map((feature) => (
                    <label className={answers.features.includes(feature) ? "is-selected" : ""} key={feature}>
                      <input
                        checked={answers.features.includes(feature)}
                        type="checkbox"
                        onChange={() => toggleFeature(feature)}
                      />
                      <span>{feature}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="estimator-question reveal-on-scroll reveal-card" style={{ "--reveal-delay": "500ms" }}>
                <h3>Urgence</h3>
                <div className="estimator-options compact">
                  {["Normal", "Rapide", "Urgent"].map((option) => (
                    <button
                      className={answers.urgency === option ? "is-selected" : ""}
                      key={option}
                      type="button"
                      onClick={() => updateAnswer("urgency", option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <aside className="estimator-result reveal-on-scroll reveal-card" style={{ "--reveal-delay": "300ms" }}>
              <span>Résultat indicatif</span>
              <h3>{result.type}</h3>
              <div className="result-metrics">
                <div>
                  <small>Budget indicatif</small>
                  <strong>{result.budget}</strong>
                </div>
                <div>
                  <small>Délai indicatif</small>
                  <strong>{result.delay}</strong>
                </div>
              </div>
              <p>{result.message}</p>
              <p className="estimator-note">
                Cette estimation est indicative. Le devis final dépendra du brief, des contenus disponibles et des
                fonctionnalités exactes.
              </p>
              <a className="btn btn-primary" href={mailtoHref}>
                Recevoir cette estimation
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
            Vous ne trouvez pas exactement votre besoin ? Vous pouvez aussi me contacter directement et expliquer
            votre projet avec vos mots, même s’il est encore flou.
          </p>
          <a href="#contact">Discuter de mon projet</a>
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

function ContactForm({ onAuthOpen }) {
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
    const { error } = await createContactRequest({
      userId: session?.user?.id,
      name: form.name.trim(),
      email,
      company: form.company.trim(),
      projectType: form.projectType,
      message: form.message.trim(),
    });

    if (error) {
      const guestNeedsLogin = !session && isSupabaseAccessError(error);

      setSubmitStatus({
        type: "error",
        message: guestNeedsLogin
          ? "Connectez-vous puis réessayez, ou envoyez-moi un email directement."
          : "Votre demande n’a pas pu être envoyée pour le moment. Réessayez dans quelques instants.",
      });

      if (guestNeedsLogin) {
        onAuthOpen();
      }

      setIsSending(false);
      return;
    }

    setSubmitStatus({
      type: "success",
      message: "Votre demande a bien été envoyée. Je vous répondrai sous 24–48h.",
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
          Nom
          <input
            id="contact-name"
            name="name"
            type="text"
            value={form.name}
            placeholder="Votre nom"
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
            placeholder={sessionEmail || "vous@email.com"}
            required={!sessionEmail}
            onChange={updateField}
          />
        </label>

        <label className="contact-field" htmlFor="contact-company">
          Structure
          <input
            id="contact-company"
            name="company"
            type="text"
            value={form.company}
            placeholder="Entreprise, association, projet..."
            onChange={updateField}
          />
        </label>

        <label className="contact-field" htmlFor="contact-project-type">
          Type de projet
          <select id="contact-project-type" name="projectType" value={form.projectType} onChange={updateField}>
            {contactProjectTypes.map((projectType) => (
              <option key={projectType} value={projectType}>
                {projectType}
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
            placeholder="Expliquez simplement votre besoin, même s’il est encore flou."
            required
            onChange={updateField}
          ></textarea>
        </label>
      </div>

      <div className="contact-form-footer">
        <button className="btn btn-primary contact-cta-primary" type="submit" disabled={isSending}>
          {isSending ? "Envoi en cours..." : "Envoyer ma demande"}
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

function SiteFooter({ onNavigate }) {
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
          <p>Solutions web, automatisation et outils digitaux pour petites structures.</p>
        </div>

        <div className="footer-column">
          <h3>Navigation</h3>
          <nav className="footer-nav" aria-label="Navigation de pied de page">
            {navLinks.map((link) => (
              <a
                href={link.href}
                key={link.href}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(link.href);
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="footer-column">
          <h3>Contact</h3>
          <div className="footer-links">
            <a href="mailto:elenamihalska70@gmail.com">Email</a>
            <a href="https://www.linkedin.com/in/olena-mykhalska-90ab5730b/" target="_blank" rel="noreferrer">
              LinkedIn
            </a>
            <a href="https://github.com/elenamihalska70-creator/" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <span>Belfort, France</span>
            <span>SIRET : 10575928600013</span>
          </div>
        </div>

        <div className="footer-column">
          <h3>Stack</h3>
          <div className="footer-stack" aria-label="Stack technique">
            {footerStack.map((tool) => (
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
          Mentions légales
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
            {/* Remplacer “À compléter” par le numéro SIREN/SIRET réel et les informations de l’hébergeur avant publication officielle. */}
            <div className="legal-grid">
              <article>
                <h2>Éditeur du site</h2>
                <p>Olena Mykhalska — Digital Lab</p>
                <p>Entrepreneure individuelle / Micro-entreprise</p>
                <p>SIREN/SIRET : 10575928600013</p>
                <p>Email : <a href="mailto:elenamihalska70@gmail.com">elenamihalska70@gmail.com</a></p>
              </article>

              <article>
                <h2>Hébergement</h2>
                <p>À compléter selon l’hébergeur utilisé pour la version finale.</p>
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
                <a className="btn btn-primary" href="mailto:elenamihalska70@gmail.com">
                  {project.cta}
                </a>
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
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster={project.image}
                  src={project.video}
                ></video>
              ) : (
                <img src={project.image} alt={`Aperçu du projet ${project.title}`} />
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
            <span>Objectif business</span>
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
            <a className="btn btn-primary" href="mailto:elenamihalska70@gmail.com">
              Demander une démo
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

      <div className="client-timeline" aria-label="Avancement du projet">
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
          <div className="dashboard-skeleton-grid" aria-label="Chargement des demandes">
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
                  <div className="request-mini-timeline" aria-label="Avancement de la demande">
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
          <div className="admin-filter-tabs" aria-label="Filtrer par statut">
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
        <div className="dashboard-skeleton-grid" aria-label="Chargement des demandes admin">
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

                  <div className="admin-status-actions" aria-label={`Changer le statut de ${request.name || "la demande"}`}>
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
  const [clientUnreadMessageCount, setClientUnreadMessageCount] = useState(0);
  const userEmail = session?.user?.email;
  const displayName = getUserDisplayName(session);
  const updateClientUnreadMessageCount = useCallback(
    (count) => {
      const nextCount = Number(count) || 0;
      setClientUnreadMessageCount(nextCount);
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
  const visibleActiveHref = pathname === "/" ? activeHref : "";
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
          {navLinks.map((link) => (
            <a
              className={visibleActiveHref === link.href ? "is-active" : ""}
              href={link.href}
              key={link.href}
              onClick={(event) => handleNavigate(event, link.href)}
            >
              {link.label}
            </a>
          ))}
          <a className="navbar-cta" href="/#contact" onClick={(event) => handleNavigate(event, "/#contact")}>
            Parler de mon projet
          </a>
          {session ? (
            <div className="navbar-auth-state">
              <span title={userEmail}>{userDisplayName}</span>
              <button
                className={`navbar-client-button${hasClientUnreadMessages ? " has-unread" : ""}`}
                type="button"
                title={hasClientUnreadMessages ? clientUnreadTooltip : undefined}
                onClick={() => {
                  setIsMenuOpen(false);
                  onNavigate("/dashboard");
                }}
              >
                Espace client
                {hasClientUnreadMessages && (
                  <span
                    className="navbar-notification-badge is-clickable"
                    aria-label={clientUnreadTooltip}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      setIsMenuOpen(false);
                      onClientUnreadBadgeClick?.();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        setIsMenuOpen(false);
                        onClientUnreadBadgeClick?.();
                      }
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
                      aria-label={adminUnreadTooltip}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsMenuOpen(false);
                        onAdminUnreadBadgeClick?.();
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsMenuOpen(false);
                          onAdminUnreadBadgeClick?.();
                        }
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
                Déconnexion
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
                Espace client
              </button>
              <button
                className="navbar-auth-button"
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onNavigate("/login");
                }}
              >
                Connexion
              </button>
            </div>
          )}
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

  const handleLogout = async () => {
    await logout();
    if (pathname === "/dashboard" || pathname === "/espace-client" || pathname === "/admin") {
      navigate("/");
    }
  };

  const isDashboardPath = pathname === "/dashboard" || pathname === "/espace-client";
  const isLoginPath = pathname === "/login";
  const isAdminPath = pathname === "/admin";

  useEffect(() => {
    let isMounted = true;
    let profileTimer = 0;

    profileTimer = window.setTimeout(async () => {
      setIsProfileLoading(true);

      const { data: sessionData, error: sessionError } = await getCurrentSession();
      const currentSession = sessionData?.session ?? session;

      if (!isMounted) {
        return;
      }

      if (sessionError || !currentSession?.user?.id) {
        console.log("ADMIN CHECK user id:", currentSession?.user?.id ?? "none");
        console.log("ADMIN CHECK email:", currentSession?.user?.email ?? "none");
        console.log("ADMIN CHECK profile:", null);
        console.log("ADMIN CHECK role:", undefined);
        setProfileRole("");
        setProfileError(sessionError?.message ?? "");
        setIsProfileLoading(false);
        return;
      }

      const { data, error } = await getProfileForUser(currentSession.user.id);

      if (!isMounted) {
        return;
      }

      const profile = error ? null : data;
      const nextRole = profile?.role ?? "";

      console.log("ADMIN CHECK user id:", currentSession.user.id);
      console.log("ADMIN CHECK email:", currentSession.user.email);
      console.log("ADMIN CHECK profile:", profile);
      console.log("ADMIN CHECK role:", profile?.role);

      if (error) {
        console.error("Profile role fetch failed:", error.message);
      }

      setProfileRole(nextRole);
      setProfileError(error?.message ?? "");
      setIsProfileLoading(false);
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(profileTimer);
    };
  }, [isAdminPath, session]);

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
    const revealItems = document.querySelectorAll(".reveal-on-scroll");

    if (revealItems.length === 0) {
      return undefined;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 },
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
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
              L’objectif est de créer des sites, automatisations, assistants IA et outils métiers qui rendent le
              quotidien des entrepreneurs plus fluide.
            </p>

            <div className="hero-buttons">
              <a href="#services" className="btn btn-primary">
                Explorer les solutions <strong>→</strong>
              </a>

              <a href="#projets" className="btn btn-secondary">
                Voir les projets
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

            <div className="about-content glass-card reveal-on-scroll reveal-card" style={{ "--reveal-delay": "120ms" }}>
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
                  <ServiceAccordionCard service={service} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section projects-section reveal-on-scroll reveal-section" id="projets">
          <div className="section-inner">
            <div className="section-heading">
              <span>Projets</span>
              <h2>Mes projets phares</h2>
            </div>

            <div className="cards-grid project-grid">
              {projects.map((project, index) => (
                <article
                  className="glass-card project-card reveal-on-scroll reveal-card"
                  key={project.title}
                  style={{ "--reveal-delay": `${index * 90}ms` }}
                  onMouseEnter={handleProjectEnter}
                  onMouseLeave={handleProjectLeave}
                >
                  <div className="project-media">
                    {project.image ? (
                      <img className="project-image" src={project.image} alt={`Aperçu du projet ${project.title}`} />
                    ) : (
                      <div className="project-placeholder"></div>
                    )}
                    {project.video && (
                      <video
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        src={project.video}
                        aria-label={`Aperçu vidéo du projet ${project.title}`}
                      ></video>
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
                  <div className="method-step-card">
                    <span className="method-step-icon" aria-hidden="true">
                      {step.icon}
                    </span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="method-badges" aria-label="Garanties de méthode">
              {methodBadges.map((badge) => (
                <span key={badge}>✓ {badge}</span>
              ))}
            </div>

            <div className="method-reassurance">
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

            <div className="about-content glass-card reveal-on-scroll reveal-card" style={{ "--reveal-delay": "120ms" }}>
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
                  className="trust-card reveal-on-scroll reveal-card"
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

            <div className="trust-badges" aria-label="Compétences et outils">
              {trustBadges.map((badge, index) => (
                <span
                  className="reveal-on-scroll reveal-card"
                  key={badge}
                  style={{ "--reveal-delay": `${index * 45}ms` }}
                >
                  ✓ {badge}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="section proof-section reveal-on-scroll reveal-section">
          <div className="section-inner">
            <div className="section-heading">
              <span>Preuves & confiance</span>
              <h2>Une expérience concrète, pensée pour avancer avec justesse</h2>
              <p>
                Des projets conçus pour rendre les idées plus lisibles, les échanges plus fluides et les décisions plus sûres.
              </p>
            </div>

            <div className="proof-stats">
              {proofStats.map((stat, index) => (
                <article
                  className="proof-stat-card reveal-on-scroll reveal-card"
                  key={stat.label}
                  style={{ "--reveal-delay": `${index * 70}ms` }}
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

            <div className="proof-stack-panel reveal-on-scroll reveal-card" style={{ "--reveal-delay": "220ms" }}>
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

            <div className="proof-workflow" aria-label="Mini workflow réel">
              {proofWorkflow.map((step, index) => (
                <article
                  className="proof-workflow-step reveal-on-scroll reveal-card"
                  key={step.title}
                  style={{ "--reveal-delay": `${index * 70}ms` }}
                >
                  <span aria-hidden="true">{step.icon}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>

            <div className="proof-highlight reveal-on-scroll reveal-card" style={{ "--reveal-delay": "260ms" }}>
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
                  className="improvement-card reveal-on-scroll reveal-card"
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
                  className="included-card reveal-on-scroll reveal-card"
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
              <div aria-label="Garanties incluses">
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

            <div className="contact-badges" aria-label="Informations rassurantes">
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

            <ContactForm onAuthOpen={() => setIsAuthOpen(true)} />

            <div className="contact-actions">
              <a className="btn btn-primary contact-cta-primary" href="mailto:elenamihalska70@gmail.com?subject=Demande%20de%20projet%20Digital%20Lab">
                Envoyer un email
              </a>
              <a className="btn btn-secondary contact-cta-secondary" href="mailto:elenamihalska70@gmail.com?subject=Discuter%20d’un%20projet%20Digital%20Lab">
                Discuter du projet
              </a>
            </div>

            <p className="contact-response-note">Réponse généralement sous 24–48h.</p>
          </div>
        </section>
      </main>

      <a
        className={`mobile-sticky-cta${isMobileCtaVisible ? " is-visible" : ""}`}
        href="/#contact"
        onClick={(event) => {
          event.preventDefault();
          navigate("/#contact");
        }}
      >
        Parler de mon projet
      </a>

      <SiteFooter onNavigate={navigate} />
      {isAuthOpen && <AuthModal onClose={closeAuthModal} />}
      <AuthToast message={authToast} onClose={clearAuthToast} />
    </>
  );
}

export default App;
