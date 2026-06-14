import { useEffect, useRef, useState } from "react";
import "./App.css";

const services = [
  {
    icon: "site",
    title: "Création de sites web",
    summary: "Sites vitrines, landing pages, sites associatifs et pages professionnelles.",
    problem:
      "Vous avez besoin d’une présence professionnelle en ligne, mais vous ne savez pas par où commencer.",
    canDo:
      "Je peux travailler avec WordPress, créer un site custom, partir d’une maquette, m’inspirer d’un exemple existant ou proposer une structure claire si vous ne savez pas encore ce que vous voulez. Site vitrine, landing page, pages claires, formulaire de contact et responsive mobile/tablette.",
    expectedResult: "Un site clair, moderne, facile à partager et adapté à votre activité.",
    details: [
      "Création de site vitrine",
      "Landing page pour une offre ou un service",
      "Site associatif ou événementiel",
      "Site WordPress",
      "Structure claire des pages",
      "Formulaire de contact",
      "Version responsive mobile/tablette",
      "Mise en ligne et configuration de base",
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
    summary: "Correction de bugs, amélioration mobile, vitesse, structure et contenus.",
    problem:
      "Votre site est lent, cassé, mal affiché ou devenu difficile à gérer après des erreurs, mises à jour ou problèmes techniques.",
    canDo:
      "Correction de bugs, pages cassées, menus, formulaires, affichage mobile, sauvegardes, mises à jour, plugins, OVH, FTP, sécurité de base.",
    expectedResult: "Un site plus propre, plus fiable et plus facile à utiliser.",
    details: [
      "Correction de pages cassées",
      "Menus, liens, boutons et formulaires",
      "Problèmes d’affichage mobile",
      "Nettoyage de structure",
      "Sauvegardes et mises à jour",
      "Optimisation vitesse",
      "Vérification sécurité de base",
      "Amélioration UX/UI",
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
    summary: "Optimisation pour être mieux trouvé et mieux compris par Google.",
    problem: "Votre site existe, mais il est peu visible ou mal compris par Google.",
    canDo:
      "Titres SEO, meta descriptions, structure H1/H2, textes optimisés, images ALT, maillage interne, performance Lighthouse, Google Business Profile.",
    expectedResult: "Un site mieux structuré, plus clair pour Google et plus crédible pour les visiteurs.",
    details: [
      "Titres SEO et meta descriptions",
      "Structure H1/H2/H3",
      "Textes optimisés",
      "Images ALT",
      "Maillage interne",
      "Performance Lighthouse",
      "Google Business Profile",
      "Préparation de contenus pour réseaux sociaux",
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
    summary: "Automatiser les tâches répétitives et connecter vos outils.",
    problem: "Vous perdez du temps avec des tâches répétitives, des messages manuels ou des fichiers dispersés.",
    canDo:
      "Formulaires intelligents, emails automatiques, Google Sheets, CRM léger, notifications, simulateurs, calculateurs, dashboards.",
    expectedResult: "Moins de tâches manuelles, plus de suivi et une meilleure organisation.",
    details: [
      "Formulaires intelligents",
      "Emails automatiques",
      "Google Sheets",
      "CRM pratique",
      "Notifications",
      "Simulateurs et calculateurs",
      "Tableaux de bord",
      "Suivi de demandes clients",
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
    summary: "Répondre automatiquement aux premières demandes clients.",
    problem: "Vous recevez souvent les mêmes questions ou demandes, et vous ne pouvez pas répondre tout le temps.",
    canDo:
      "Assistant de réservation, FAQ automatisée, collecte de demandes, préqualification client, intégration sur site, scénarios conversationnels clairs.",
    expectedResult: "Des réponses disponibles 24h/24 et des demandes mieux organisées.",
    details: [
      "Assistant de réservation",
      "FAQ automatisée",
      "Collecte de demandes",
      "Préqualification client",
      "Intégration sur site",
      "Scénarios conversationnels clairs",
      "Réponses 24h/24",
      "Workflow configurable",
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
    summary: "Tester rapidement une idée avant d’investir dans un grand développement.",
    problem: "Vous avez une idée, mais vous ne voulez pas investir trop avant de la tester.",
    canDo:
      "Prototype SaaS, plateforme locale, dashboard B2B, espace utilisateur, version démonstration, parcours utilisateur.",
    expectedResult: "Une première version testable pour valider l’idée rapidement.",
    details: [
      "Prototype SaaS",
      "Plateforme locale",
      "Dashboard B2B",
      "Espace utilisateur",
      "Pages de test",
      "Version démonstration",
      "Parcours utilisateur",
      "Préparation pour amélioration future",
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
    text: "Vous expliquez votre besoin avec vos mots, même si votre idée n’est pas encore claire.",
  },
  {
    number: "02",
    icon: "◎",
    title: "Première piste concrète",
    text: "Je vous propose une structure claire, des fonctionnalités adaptées et une estimation réaliste.",
  },
  {
    number: "03",
    icon: "▣",
    title: "Prototype ou première version",
    text: "Vous voyez rapidement une première démo pour valider la direction du projet.",
  },
  {
    number: "04",
    icon: "✓",
    title: "Ajustements et mise en ligne",
    text: "Nous améliorons ensemble les détails avant la mise en ligne finale.",
  },
  {
    number: "05",
    icon: "+",
    title: "Suivi et évolutions",
    text: "Le projet peut évoluer ensuite : SEO, automatisation, nouvelles pages, maintenance, etc.",
  },
];

const methodBadges = [
  "Sans jargon technique",
  "Explications claires",
  "Solutions adaptées au budget",
  "Possibilité d’évolution progressive",
  "Compatible petites structures & associations",
];

const improvementCards = [
  {
    icon: "↗",
    title: "Recevoir plus facilement des demandes",
    text: "Un formulaire clair, un meilleur parcours et une structure efficace peuvent aider les visiteurs à vous contacter plus facilement.",
  },
  {
    icon: "⌁",
    title: "Gagner du temps",
    text: "Certaines tâches répétitives peuvent être allégées grâce à des automatisations adaptées et des outils pratiques.",
  },
  {
    icon: "✦",
    title: "Avoir une image plus professionnelle",
    text: "Un site clair et moderne inspire davantage confiance et valorise votre activité.",
  },
  {
    icon: "▣",
    title: "Mieux organiser son activité",
    text: "Centraliser les informations, demandes ou contenus permet souvent de travailler plus sereinement.",
  },
  {
    icon: "◎",
    title: "Améliorer sa visibilité",
    text: "Une meilleure structure SEO et un contenu plus clair peuvent aider votre activité à être mieux trouvée.",
  },
  {
    icon: "+",
    title: "Faire évoluer son projet progressivement",
    text: "Le projet peut démarrer de façon légère puis évoluer selon les besoins et le budget.",
  },
];

const trustCards = [
  {
    icon: "✓",
    title: "Pas besoin de langage technique",
    text: "Je traduis les besoins en solutions claires et compréhensibles.",
  },
  {
    icon: "↯",
    title: "Premières versions rapides",
    text: "Une première démo ou structure peut être proposée rapidement pour avancer concrètement.",
  },
  {
    icon: "▦",
    title: "Vision globale",
    text: "Site web, SEO, automatisation, UX, dashboard ou prototype : les outils sont choisis selon le besoin réel.",
  },
  {
    icon: "◈",
    title: "Échange humain et flexible",
    text: "Le projet peut évoluer progressivement selon les priorités, le budget et les retours.",
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
  { icon: "+", value: 10, suffix: "+", label: "projets réalisés" },
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
              <span>Problème client</span>
              <p>{service.problem}</p>
            </article>
            <article>
              <span>Ce que je peux faire</span>
              <p>{service.canDo}</p>
            </article>
            <article>
              <span>Résultat attendu</span>
              <p>{service.expectedResult}</p>
            </article>
            <article>
              <span>Exemples possibles</span>
              <p>{service.examples}</p>
            </article>
          </div>

          <div className="service-transformation-grid">
            <article className="service-transformation-card">
              <span className="service-transformation-label">
                <span aria-hidden="true">×</span>
                Avant
              </span>
              <ul>
                {service.transformation.before.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="service-transformation-card is-after">
              <span className="service-transformation-label">
                <span aria-hidden="true">✓</span>
                Après
              </span>
              <ul>
                {service.transformation.after.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="service-transformation-card is-result">
              <span className="service-transformation-label">
                <span aria-hidden="true">→</span>
                Résultat concret
              </span>
              <p>{service.transformation.result}</p>
            </article>
          </div>
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

function SiteHeader({ onNavigate, pathname }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeHref, setActiveHref] = useState("");
  const visibleActiveHref = pathname === "/" ? activeHref : "";

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
        </nav>
      </header>
    </>
  );
}

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [selectedProject, setSelectedProject] = useState(null);
  const activeProject = getProjectFromPath(pathname);

  const navigate = (target) => {
    if (isExternalLink(target)) {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }

    window.history.pushState({}, "", target);
    setPathname(window.location.pathname);

    if (target.includes("#") && window.location.hash) {
      window.setTimeout(() => {
        document.querySelector(window.location.hash)?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  if (pathname.startsWith("/projects/")) {
    return (
      <>
        <SiteHeader onNavigate={navigate} pathname={pathname} />

        <ProjectCasePage project={activeProject} onNavigate={navigate} />

        <SiteFooter onNavigate={navigate} />
      </>
    );
  }

  if (pathname === "/mentions-legales") {
    return (
      <>
        <SiteHeader onNavigate={navigate} pathname={pathname} />

        <LegalNoticePage onNavigate={navigate} />

        <SiteFooter onNavigate={navigate} />
      </>
    );
  }

  return (
    <>
      <SiteHeader onNavigate={navigate} pathname={pathname} />

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
              Solutions digitales pour petites structures
            </div>

            <h1 className="hero-title">
              <span className="hero-title-line">Des solutions digitales</span>
              <span className="hero-title-line">
                claires pour <span className="hero-title-accent">développer</span>
              </span>
              <span className="hero-title-line">votre activité</span>
            </h1>
            

            <p>
              Sites web, automatisation, IA et outils digitaux pour indépendants,
              associations et petites entreprises.
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

        <section className="section services-section reveal-on-scroll reveal-section" id="services">
          <div className="section-inner">
            <div className="section-heading">
              <span>Services</span>
              <h2>Ce que je peux faire pour vous</h2>
              <p>Création, réparation, optimisation et automatisation de vos outils digitaux.</p>
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
              <h2>Comment se déroule une mission ?</h2>
              <p>Une méthode fluide pour passer d’une idée floue à une solution concrète.</p>
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
                Vous n’avez pas besoin de connaître la technique. Je traduis votre besoin en solution claire,
                étape par étape.
              </p>
            </div>
          </div>
        </section>

        <section className="section about-section reveal-on-scroll reveal-section" id="about">
          <div className="section-inner about-layout">
            <div className="section-heading">
              <span>À propos</span>
              <h2>Pourquoi Digital Lab ?</h2>
            </div>

            <div className="about-content glass-card reveal-on-scroll reveal-card" style={{ "--reveal-delay": "120ms" }}>
              <p>
                Ancienne entrepreneure devenue cheffe de projet digital, je combine vision business et compétences
                techniques pour créer des outils utiles, accessibles et évolutifs.
              </p>

              <ul className="about-list">
                <li>Vision entrepreneuriale réelle</li>
                <li>Solutions claires et concrètes</li>
                <li>Développement rapide de MVP</li>
                <li>Communication claire, sans jargon</li>
                <li>Approche humaine et flexible</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="section trust-section reveal-on-scroll reveal-section">
          <div className="section-inner">
            <div className="section-heading">
              <span>Confiance</span>
              <h2>Une approche claire, concrète et orientée résultat</h2>
              <p>
                Je combine gestion de projet digital, création web, automatisation et expérience terrain pour proposer
                des solutions adaptées aux petites structures.
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
              <h2>Une expérience concrète, pensée pour avancer avec clarté</h2>
              <p>
                Des projets web, outils digitaux et automatisations créés pour rendre les idées plus claires, plus
                visibles et plus faciles à gérer.
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
                  {typeof stat.value === "number" && <p>{stat.label}</p>}
                </article>
              ))}
            </div>

            <div className="proof-stack-panel reveal-on-scroll reveal-card" style={{ "--reveal-delay": "220ms" }}>
              <div>
                <span>Stack & outils</span>
                <h3>Des outils choisis selon le besoin réel</h3>
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
                Associations, indépendants, commerces locaux, projets en création : des solutions accessibles,
                évolutives et adaptées.
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
                  Ce n’est pas un problème. Beaucoup de projets commencent avec une idée encore floue. Nous pouvons
                  clarifier ensemble les besoins, les priorités et les solutions possibles.
                </p>
              </details>

              <details className="faq-item reveal-on-scroll reveal-card" style={{ "--reveal-delay": "80ms" }}>
                <summary>Travaillez-vous avec des petits budgets ?</summary>
                <p>
                  Oui. L’objectif est de proposer une solution adaptée à votre activité et à vos moyens. Il est possible
                  de démarrer léger puis de faire évoluer le projet progressivement.
                </p>
              </details>

              <details className="faq-item reveal-on-scroll reveal-card" style={{ "--reveal-delay": "160ms" }}>
                <summary>Pouvez-vous reprendre un site existant ?</summary>
                <p>
                  Oui. Je peux intervenir sur un site WordPress ou un site existant pour corriger des bugs, améliorer
                  le mobile, optimiser le SEO, réparer certains problèmes ou moderniser la structure.
                </p>
              </details>

              <details className="faq-item reveal-on-scroll reveal-card" style={{ "--reveal-delay": "240ms" }}>
                <summary>Combien de temps faut-il pour créer un projet ?</summary>
                <p>
                  Cela dépend du type de projet. Une première version ciblée peut parfois être réalisée rapidement,
                  tandis qu’un projet plus avancé demande plusieurs étapes et ajustements.
                </p>
              </details>

              <details className="faq-item reveal-on-scroll reveal-card" style={{ "--reveal-delay": "320ms" }}>
                <summary>Peut-on commencer petit puis ajouter des fonctionnalités plus tard ?</summary>
                <p>
                  Oui. Beaucoup de projets évoluent progressivement : nouvelles pages, automatisation, espace client,
                  SEO, dashboard, chatbot, etc.
                </p>
              </details>

              <details className="faq-item reveal-on-scroll reveal-card" style={{ "--reveal-delay": "400ms" }}>
                <summary>Travaillez-vous avec des associations et petites structures ?</summary>
                <p>
                  Oui. Les solutions proposées sont pensées pour être claires, accessibles et adaptées aux petites
                  structures, indépendants, associations ou projets locaux.
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
                Un site ou un outil ne sert pas seulement à être joli. Il peut aussi simplifier votre activité au
                quotidien.
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

        <section className="section contact-section reveal-on-scroll reveal-section" id="contact">
          <div className="section-inner contact-panel reveal-on-scroll reveal-card" style={{ "--reveal-delay": "120ms" }}>
            <div className="contact-copy">
              <span>Contact</span>
              <h2>Vous avez une idée, un besoin ou un site à améliorer ?</h2>
              <p>
                Je peux vous aider à clarifier votre projet, créer une première version, améliorer un site existant
                ou automatiser certaines tâches. Même si votre besoin n’est pas encore totalement défini.
              </p>
            </div>

            <ul className="contact-points">
              <li className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "200ms" }}>
                création ou refonte de site
              </li>
              <li className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "260ms" }}>
                réparation et amélioration
              </li>
              <li className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "320ms" }}>
                SEO & visibilité
              </li>
              <li className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "380ms" }}>
                automatisation pratique
              </li>
              <li className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "440ms" }}>
                prototype ou MVP rapide
              </li>
            </ul>

            <div className="contact-badges" aria-label="Informations rassurantes">
              <span className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "520ms" }}>
                ✓ Réponse claire et sans jargon
              </span>
              <span className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "580ms" }}>
                ✓ Premier échange gratuit
              </span>
              <span className="reveal-on-scroll reveal-card" style={{ "--reveal-delay": "640ms" }}>
                ✓ Adapté aux petites structures
              </span>
            </div>

            <div className="contact-actions">
              <a className="btn btn-primary contact-cta-primary" href="mailto:elenamihalska70@gmail.com?subject=Demande%20de%20projet%20Digital%20Lab">
                Recevoir une première piste
              </a>
              <a className="btn btn-secondary contact-cta-secondary" href="mailto:elenamihalska70@gmail.com?subject=Discuter%20d’un%20projet%20Digital%20Lab">
                Discuter du projet
              </a>
            </div>

            <p className="contact-response-note">Réponse généralement sous 24–48h.</p>
          </div>
        </section>
      </main>

      <SiteFooter onNavigate={navigate} />
    </>
  );
}

export default App;
