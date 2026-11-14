import { getDiagnosticEstimate } from "./repairDiagnostic.js";

// DL-ESTIMATOR-PRICING-V4 — owner-approved packages for four one-off services.
// Single auditable source: every amount, inclusion, limit and exclusion lives here.
// Package prices are explicit and never derived from generic estimator answers
// (complexity, content, features, urgency, profile, priority, existing site):
// the locked V3 engine is not called for these services at all.
//
// billing: "fixed" = fixed-scope package price; "from" = starting price confirmed
// after diagnosis; "quote" = personalized quote, no amount shown.
// workload: INTERNAL profitability target of the defined scope, in hours ({ max }, { min, max } or { approx }).
// It is never displayed, returned in an estimate or sent in a quote e-mail.

export const SERVICE_PACKAGE_NEEDS = Object.freeze({
  seo: "Optimiser SEO & visibilité",
  automation: "Ajouter une automatisation",
  chatbot: "Créer un chatbot / assistant IA",
  prototype: "Créer un MVP ou prototype web",
});

const deepFreeze = (value) => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

// Applies to every package: nothing outside the package is ever priced automatically.
export const SERVICE_PACKAGE_GENERAL_TERMS = deepFreeze({
  fr: "Toute fonctionnalité hors forfait fait l’objet d’un devis personnalisé, avec votre accord préalable. Aucun abonnement ni frais récurrent n’est ajouté automatiquement.",
  en: "Any feature outside the package requires a personalized quote, with your prior approval. No subscription or recurring fee is ever added automatically.",
});

// No turnaround time is promised for packages: timing is agreed after assessing the project.
export const SERVICE_PACKAGE_TIMING = deepFreeze({
  label: { fr: "Délai", en: "Timing" },
  value: { fr: "Confirmé après analyse du projet", en: "Confirmed after assessing the project" },
});

export const SERVICE_PACKAGES = deepFreeze({
  seo: {
    need: SERVICE_PACKAGE_NEEDS.seo,
    terms: [
      {
        fr: "Le SEO de base déjà inclus dans nos forfaits de création de site n’est jamais facturé deux fois.",
        en: "Basic SEO already included in our website packages is never billed twice.",
      },
    ],
    packages: [
      {
        id: "essential", price: 190, billing: "fixed", workload: { max: 3 },
        name: { fr: "SEO Essentiel", en: "SEO Essential" },
        includes: {
          fr: ["Jusqu’à 2 pages existantes", "Vérification de l’indexation et des éléments SEO de base", "Corrections des titres, méta-descriptions et titres de section", "Recommandations synthétiques"],
          en: ["Up to 2 existing pages", "Basic indexing and SEO-element checks", "Title, meta description and heading corrections", "Brief recommendations"],
        },
        limits: { fr: [], en: [] },
      },
      {
        id: "visibility", price: 390, billing: "fixed", workload: { max: 7 },
        name: { fr: "SEO Visibilité", en: "SEO Visibility" },
        includes: {
          fr: ["Audit SEO d’un petit site, jusqu’à 5 pages", "Recherche de mots-clés de base", "Optimisation de 5 pages maximum", "Vérifications de base dans Google Search Console, si l’accès est fourni", "Recommandations de maillage interne et rapport court"],
          en: ["SEO audit of a small website, up to 5 pages", "Basic keyword research", "Optimization of up to 5 pages", "Basic Google Search Console checks, when access is provided", "Internal linking recommendations and short report"],
        },
        limits: { fr: [], en: [] },
      },
      {
        id: "development", price: 700, billing: "from", workload: { approx: 12 },
        name: { fr: "SEO Développement", en: "SEO Development" },
        includes: {
          fr: ["Audit approfondi, jusqu’à 15 pages", "Analyse de mots-clés et recommandations priorisées", "Mise en œuvre selon un périmètre convenu"],
          en: ["Extended audit, up to 15 pages", "Keyword analysis and prioritized recommendations", "Implementation within an agreed scope"],
        },
        limits: {
          fr: ["Prix et livrables exacts confirmés après diagnostic."],
          en: ["Exact price and deliverables confirmed after diagnosis."],
        },
      },
    ],
  },
  automation: {
    need: SERVICE_PACKAGE_NEEDS.automation,
    terms: [
      {
        fr: "Outils payants, hébergement, consommation d’IA et maintenance continue ne sont pas inclus dans la mise en place, sauf mention expresse dans un devis individuel.",
        en: "Paid tools, hosting, AI usage and ongoing maintenance are not included in the one-off implementation, unless expressly included in an individual quote.",
      },
    ],
    packages: [
      {
        id: "essential", price: 190, billing: "fixed", workload: { max: 3 },
        name: { fr: "Automatisation Essentielle", en: "Essential Automation" },
        includes: {
          fr: ["Un workflow simple", "Une source d’entrée et une sortie principale", "Intégrations standard prises en charge", "Tests de base et consignes de prise en main courtes"],
          en: ["One simple workflow", "One input source and one primary output", "Standard supported integrations", "Basic testing and short handover instructions"],
        },
        limits: { fr: [], en: [] },
      },
      {
        id: "business", price: 490, billing: "fixed", workload: { max: 8 },
        name: { fr: "Automatisation Business", en: "Business Automation" },
        includes: {
          fr: ["Un workflow métier défini", "Jusqu’à 3 intégrations standard", "Routage conditionnel et gestion d’erreurs standard", "Tests, prise en main et documentation de base"],
          en: ["One defined business workflow", "Up to 3 standard integrations", "Conditional routing and standard error handling", "Testing, handover and basic documentation"],
        },
        limits: { fr: [], en: [] },
      },
      {
        id: "advanced", price: 950, billing: "from", workload: { approx: 15 },
        name: { fr: "Automatisation Avancée", en: "Advanced Automation" },
        includes: {
          fr: ["Workflow plus complexe ou plusieurs processus connectés", "CRM, API, IA ou intégrations sur mesure, si techniquement réalisable", "Périmètre et critères de validation définis"],
          en: ["More complex workflow or several connected processes", "CRM, APIs, AI or custom integrations when technically feasible", "Defined scope and acceptance criteria"],
        },
        limits: {
          fr: ["Prix définitif confirmé après analyse."],
          en: ["Definitive price confirmed after assessment."],
        },
      },
    ],
  },
  chatbot: {
    need: SERVICE_PACKAGE_NEEDS.chatbot,
    terms: [
      {
        fr: "Jetons d’API IA, abonnements tiers, hébergement et maintenance sont distincts du prix de mise en place.",
        en: "AI API tokens, third-party subscriptions, hosting and maintenance are separate from the implementation price.",
      },
      {
        fr: "Une IA peut produire des réponses inexactes : l’absence d’erreur dans les réponses n’est pas garantie.",
        en: "AI can produce inaccurate answers: error-free responses are not guaranteed.",
      },
    ],
    packages: [
      {
        id: "essential", price: 390, billing: "fixed", workload: { min: 5, max: 6 },
        name: { fr: "Chatbot Essentiel", en: "Essential Chatbot" },
        includes: {
          fr: ["Configuration et intégration d’une solution de chatbot existante", "Jusqu’à 10 questions fréquentes fournies par vos soins", "Personnalisation visuelle légère", "Tests de réponses de base et renvoi vers un contact humain"],
          en: ["Configuration and integration of an existing chatbot solution", "Up to 10 client-provided FAQ entries", "Light visual customization", "Basic response testing and human contact fallback"],
        },
        limits: { fr: [], en: [] },
      },
      {
        id: "business", price: 790, billing: "fixed", workload: { min: 10, max: 12 },
        name: { fr: "Chatbot Business", en: "Business Chatbot" },
        includes: {
          fr: ["Assistant IA limité, basé sur une base de connaissances structurée fournie", "Jusqu’à 10 pages ou fiches d’information structurées", "Intégration à un site existant", "Tests et solution de repli en cas de réponse incertaine"],
          en: ["Limited AI assistant using a provided structured knowledge base", "Up to 10 pages or structured information sheets", "Integration with an existing website", "Tests and fallback for uncertain answers"],
        },
        limits: { fr: [], en: [] },
      },
      {
        id: "advanced", price: null, billing: "quote", workload: null,
        name: { fr: "Chatbot Avancé", en: "Advanced Chatbot" },
        includes: {
          fr: ["CRM, prise de rendez-vous, multicanal, actions ou intégrations complexes"],
          en: ["CRM, appointments, multichannel operation, actions or complex integrations"],
        },
        limits: {
          fr: ["Authentification, données sensibles et logique métier complexe : évaluation technique et sécurité individuelle."],
          en: ["Authentication, sensitive data and complex business logic: individual technical and security assessment."],
        },
      },
    ],
  },
  prototype: {
    need: SERVICE_PACKAGE_NEEDS.prototype,
    terms: [],
    packages: [
      {
        id: "discovery", price: 490, billing: "fixed", workload: { min: 6, max: 7 },
        name: { fr: "Prototype Découverte", en: "Discovery Prototype" },
        includes: {
          fr: ["Cadrage court du projet", "Prototype cliquable de 3 à 5 écrans reliés", "Un parcours utilisateur principal", "Une série de retouches limitée"],
          en: ["Short project framing", "Clickable prototype with 3–5 connected screens", "One principal user journey", "One limited revision round"],
        },
        limits: {
          fr: ["Sans backend de production, authentification ni paiement réel."],
          en: ["No production backend, authentication or real payment flow."],
        },
      },
      {
        id: "functional", price: 990, billing: "fixed", workload: { min: 14, max: 16 },
        name: { fr: "Prototype Fonctionnel", en: "Functional Prototype" },
        includes: {
          fr: ["Petit démonstrateur web interactif", "3 à 5 écrans", "Un parcours fonctionnel principal avec données de démonstration", "Mise en ligne de test pour démonstration"],
          en: ["Small interactive web demonstrator", "3–5 screens", "One core functional journey using demonstration data", "Test deployment for demonstration purposes"],
        },
        limits: {
          fr: ["Ce n’est pas un SaaS prêt pour la production."],
          en: ["Not a production-ready SaaS."],
        },
      },
      {
        id: "mvp", price: null, billing: "quote", workload: null,
        name: { fr: "MVP sur mesure", en: "Custom MVP" },
        includes: {
          fr: ["Utilisateurs réels, données de production persistantes, authentification, rôles, paiements, API, sécurité ou backend évolutif"],
          en: ["Real users, persistent production data, authentication, roles, payments, APIs, security or scalable backend"],
        },
        limits: {
          fr: ["Cahier des charges technique, revue des risques et devis individuel requis."],
          en: ["Requires a technical specification, risk review and individual quotation."],
        },
      },
    ],
  },
});

const CATEGORY_BY_NEED = Object.fromEntries(
  Object.entries(SERVICE_PACKAGES).map(([category, { need }]) => [need, category]),
);

export const getServicePackageCategory = (need) => CATEGORY_BY_NEED[need] ?? null;
export const isServicePackageNeed = (need) => Boolean(getServicePackageCategory(need));

// Default selection per category: the first (smallest) package.
export const INITIAL_SERVICE_PACKAGE_CHOICES = Object.freeze(
  Object.fromEntries(Object.entries(SERVICE_PACKAGES).map(([category, { packages }]) => [category, packages[0].id])),
);

export const getServicePackage = (category, packageId) => {
  const packages = SERVICE_PACKAGES[category]?.packages;
  if (!packages) throw new RangeError("Unknown service package category");
  return packages.find((pack) => pack.id === packageId) ?? packages[0];
};

// Only the service and the chosen package are inputs: no generic answer can reach the price.
export function getServicePackageEstimate(need, packageId) {
  const category = getServicePackageCategory(need);
  if (!category) throw new RangeError("Not a package-based service");
  const pack = getServicePackage(category, packageId);
  return {
    kind: "package", need, category, packageId: pack.id,
    price: pack.price, billing: pack.billing, delay: null,
  };
}

// Same unified result as before for every other service; package services replace only `project`.
// Subscriptions, Reels, one-time fees and first-month totals stay computed by the locked engine.
export function getCatalogEstimate({ project = null, packageChoices = INITIAL_SERVICE_PACKAGE_CHOICES, ...options } = {}) {
  const category = getServicePackageCategory(project?.need);
  if (!category) return getDiagnosticEstimate({ project, ...options });
  const result = getDiagnosticEstimate({ ...options, project: null });
  return { ...result, project: getServicePackageEstimate(project.need, packageChoices?.[category]) };
}

// `formatPrice` is supplied by the caller so the confirmed tax mention stays in its existing module.
export function formatPackagePrice(pack, { isEnglish = false, formatPrice }) {
  if (pack.billing === "quote") return isEnglish ? "on quote" : "sur devis";
  const amount = formatPrice(pack.price);
  return pack.billing === "from" ? (isEnglish ? "from " : "dès ") + amount : amount;
}

export const getBillingLabel = (billing, isEnglish = false) => ({
  fixed: isEnglish ? "Fixed-scope package" : "Forfait à périmètre défini",
  from: isEnglish ? "Starting price, confirmed after diagnosis" : "Prix de départ, confirmé après diagnostic",
  quote: isEnglish ? "Personalized quote" : "Devis personnalisé",
})[billing];

export function getServicePackageTerms(category, isEnglish = false) {
  const lang = isEnglish ? "en" : "fr";
  return [...SERVICE_PACKAGES[category].terms.map((term) => term[lang]), SERVICE_PACKAGE_GENERAL_TERMS[lang]];
}

// Quote/e-mail lines for a package result. Amounts are only formatted, never recomputed.
// The complete summary, deliverables included, must fit in a mailto: link (QUOTE_MAILTO_MAX_LENGTH is
// measured on the percent-encoded URL); servicePackages.test.js checks every package in FR and EN.
export function getServicePackageSummary(project, { isEnglish = false, formatPrice, profile, priority, existing }) {
  const lang = isEnglish ? "en" : "fr";
  const pack = getServicePackage(project.category, project.packageId);
  return [
    `${isEnglish ? "Package" : "Forfait"} : ${pack.name[lang]} — ${formatPackagePrice(pack, { isEnglish, formatPrice })} (${getBillingLabel(pack.billing, isEnglish)})`,
    `${isEnglish ? "Included" : "Inclus"} : ${pack.includes[lang].join(" ; ")}`,
    ...pack.limits[lang],
    `${SERVICE_PACKAGE_TIMING.label[lang]} : ${SERVICE_PACKAGE_TIMING.value[lang].toLowerCase()}`,
    `${isEnglish ? "Profile" : "Profil"} : ${profile} · ${isEnglish ? "Priority" : "Priorité"} : ${priority} · ${isEnglish ? "Existing site" : "Existant"} : ${existing}`,
    ...SERVICE_PACKAGES[project.category].terms.map((term) => term[lang]),
    isEnglish ? "Anything outside the package: personalized quote." : "Hors forfait : devis personnalisé.",
  ];
}
