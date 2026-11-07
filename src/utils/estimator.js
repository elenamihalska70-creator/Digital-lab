// Each value is an indicative starting point, not a quote. Keeping the pricing
// model in one configuration makes every simulator choice explicit and auditable.
const NEED_ADJUSTMENTS = {
  "Créer un site web": { budget: 400, days: 5, complexity: 0 },
  "Réparer / améliorer un site existant": { budget: 250, days: 3, complexity: 0 },
  "Optimiser SEO & visibilité": { budget: 300, days: 4, complexity: 1 },
  "Ajouter une automatisation": { budget: 550, days: 6, complexity: 2 },
  "Créer un chatbot / assistant IA": { budget: 800, days: 9, complexity: 4 },
  "Créer un MVP ou prototype web": { budget: 800, days: 10, complexity: 3 },
};

const COMPLEXITY_ADJUSTMENTS = {
  "Simple : page ou fonctionnalité basique": { budget: 0, days: 0, complexity: 0 },
  "Standard : plusieurs pages ou plusieurs fonctions": { budget: 250, days: 3, complexity: 2 },
  "Avancé : espace utilisateur, tableau de bord, automatisation ou IA": { budget: 650, days: 7, complexity: 5 },
};

// Features already included in the primary need add no adjustment. Higher
// complexity points ensure integrations such as IA, CRM and payments are not
// presented as a simple project even when they are selected on their own.
export const ESTIMATOR_FEATURE_ADJUSTMENTS = {
  "Formulaire de contact": { budget: 100, days: 1, complexity: 0 },
  Réservation: { budget: 300, days: 3, complexity: 2 },
  "Email automatique": { budget: 200, days: 2, complexity: 1 },
  "Google Sheets / CRM": { budget: 400, days: 4, complexity: 3 },
  "Tableau de bord": { budget: 550, days: 6, complexity: 4 },
  Paiement: { budget: 350, days: 4, complexity: 3 },
  Chatbot: { budget: 650, days: 7, complexity: 5 },
  SEO: { budget: 200, days: 2, complexity: 1 },
  Maintenance: { budget: 120, days: 1, complexity: 0 },
};

const PRIMARY_NEED_INCLUDED_FEATURES = {
  "Optimiser SEO & visibilité": ["SEO"],
  "Créer un chatbot / assistant IA": ["Chatbot"],
};

const PROJECT_LEVELS = ["Simple", "Intermédiaire", "Avancé"];

const COMPLEXITY_MINIMUM_LEVELS = {
  "Simple : page ou fonctionnalité basique": 0,
  "Standard : plusieurs pages ou plusieurs fonctions": 1,
  "Avancé : espace utilisateur, tableau de bord, automatisation ou IA": 2,
};

const NEED_MINIMUM_LEVELS = {
  "Ajouter une automatisation": 1,
  "Créer un chatbot / assistant IA": 1,
  "Créer un MVP ou prototype web": 1,
};

const PROFILE_ADJUSTMENTS = {
  Indépendant: { budget: 0, days: 0 },
  Association: { budget: 0, days: 1 },
  "Commerce local": { budget: 0, days: 1 },
  "Restaurant / service": { budget: 0, days: 1 },
  "Projet en création": { budget: 0, days: 1 },
  Autre: { budget: 0, days: 1 },
};

const PRIORITY_ADJUSTMENTS = {
  "Être visible": { budget: 0, days: 0 },
  "Recevoir plus de demandes": { budget: 0, days: 1 },
  "Gagner du temps": { budget: 0, days: 2 },
  "Réparer un site existant": { budget: 0, days: 0 },
  "Tester une idée": { budget: 0, days: 2 },
  "Automatiser une tâche": { budget: 0, days: 2 },
};

const EXISTING_ADJUSTMENTS = {
  Oui: { budget: 0, days: 1 },
  Non: { budget: 0, days: 0 },
  Partiellement: { budget: 0, days: 2 },
};

const CONTENT_ADJUSTMENTS = {
  "Textes et images prêts": { budget: 0, days: 0 },
  "Quelques éléments seulement": { budget: 120, days: 2 },
  "Je pars de zéro": { budget: 300, days: 4 },
};

const URGENCY_ADJUSTMENTS = {
  Normal: { budgetMultiplier: 1, delayMultiplier: 1 },
  Rapide: { budgetMultiplier: 1.1, delayMultiplier: 0.85 },
  Urgent: { budgetMultiplier: 1.2, delayMultiplier: 0.7 },
};

const EMPTY_ADJUSTMENT = { budget: 0, days: 0, complexity: 0 };

// Structured delay range; the UI formats it per language.
const getDelayRange = (days) => {
  const minimum = Math.max(2, Math.ceil(days * 0.85));
  const maximum = Math.max(minimum + 1, Math.ceil(days * 1.15));

  if (maximum <= 10) {
    return { min: minimum, max: maximum, unit: "days" };
  }

  const minimumWeeks = Math.max(1, Math.ceil(minimum / 5));
  const maximumWeeks = Math.max(minimumWeeks + 1, Math.ceil(maximum / 5));

  return { min: minimumWeeks, max: maximumWeeks, unit: "weeks" };
};

const formatDelay = (days) => {
  const range = getDelayRange(days);
  return `${range.min}–${range.max} ${range.unit === "days" ? "jours ouvrés" : "semaines"}`;
};

// One-off project estimate as numbers. Urgency, the 50 € rounding and the
// delay apply to one-off projects only, never to subscriptions.
export function getProjectEstimate(answers) {
  const includedFeatures = PRIMARY_NEED_INCLUDED_FEATURES[answers.need] ?? [];
  const adjustments = [
    NEED_ADJUSTMENTS[answers.need],
    COMPLEXITY_ADJUSTMENTS[answers.complexity],
    PROFILE_ADJUSTMENTS[answers.profile],
    PRIORITY_ADJUSTMENTS[answers.priority],
    EXISTING_ADJUSTMENTS[answers.existing],
    CONTENT_ADJUSTMENTS[answers.content],
    ...answers.features
      .filter((feature) => !includedFeatures.includes(feature))
      .map((feature) => ESTIMATOR_FEATURE_ADJUSTMENTS[feature]),
  ].filter(Boolean);

  const totals = adjustments.reduce(
    (total, adjustment) => ({
      budget: total.budget + (adjustment.budget ?? 0),
      days: total.days + (adjustment.days ?? 0),
      complexity: total.complexity + (adjustment.complexity ?? 0),
    }),
    { ...EMPTY_ADJUSTMENT },
  );

  const urgency = URGENCY_ADJUSTMENTS[answers.urgency] ?? URGENCY_ADJUSTMENTS.Normal;
  const budget = Math.ceil((totals.budget * urgency.budgetMultiplier) / 50) * 50;
  const days = Math.max(2, Math.ceil(totals.days * urgency.delayMultiplier));

  // Explicit choices establish a minimum; budget and technical weight can raise it.
  let calculatedLevel = 0;
  if (budget >= 1900 || totals.complexity >= 8) calculatedLevel = 2;
  else if (budget >= 900 || totals.complexity >= 4) calculatedLevel = 1;

  const type = PROJECT_LEVELS[Math.max(
    calculatedLevel,
    COMPLEXITY_MINIMUM_LEVELS[answers.complexity] ?? 0,
    NEED_MINIMUM_LEVELS[answers.need] ?? 0,
  )];

  return { kind: "one-off", need: answers.need, budget, days, delay: getDelayRange(days), type };
}

// Legacy French text output, kept for existing callers and tests.
export function getEstimatorResult(answers) {
  const { budget, days, type } = getProjectEstimate(answers);

  const messages = {
    Simple: "Votre besoin semble ciblé. Une intervention courte peut probablement suffire pour avancer vite.",
    Intermédiaire: "Votre projet demande plusieurs éléments à coordonner. Une première version claire peut être créée rapidement.",
    Avancé: "Votre projet implique plusieurs fonctionnalités ou workflows. Un cadrage précis permettra de sécuriser le budget et les étapes.",
  };

  return {
    type,
    budget: `à partir de ${budget}€`,
    delay: formatDelay(days),
    message: messages[type],
  };
}

// Recurring social media subscriptions (LOT SM-01). Kept apart from
// getEstimatorResult so monthly fees never mix with one-off project budgets.
// Plan, add-on and Reels prices set by the owner (LOT SM-02); the setup audit
// stays provisional.
export const SOCIAL_MEDIA_LAUNCH_MONTHS = 3;
export const SOCIAL_MEDIA_LAUNCH_CLIENT_LIMIT = 5;

// Owner switch for the launch offer (LOT SM-06A, draft CGV art. 5.5). Set it to
// false once the launch places are taken: every price then falls back to the
// standard price and every launch mention disappears. Prices are never changed here.
export const SOCIAL_MEDIA_LAUNCH_ACTIVE = true;

// Monthly price of a plan as currently offered (launch price only while the offer runs).
export const getPlanMonthlyPrice = (plan, launchActive = SOCIAL_MEDIA_LAUNCH_ACTIVE) =>
  launchActive ? plan.launchPrice : plan.referencePrice;

// Each plan lists what its monthly price already covers, so add-ons are only
// charged beyond these quantities.
export const SOCIAL_MEDIA_PLANS = {
  presence: { name: "Présence", launchPrice: 149, referencePrice: 190, posts: 4, platforms: 1, reels: 0 },
  visibilite: { name: "Visibilité", launchPrice: 299, referencePrice: 390, posts: 8, platforms: 2, reels: 0 },
  croissance: { name: "Croissance", launchPrice: 549, referencePrice: 690, posts: 12, platforms: 2, reels: 2 },
};

// Add-ons stay above the per-unit cost of the next plan, so assembling a lower
// plan with options never undercuts a higher plan.
export const SOCIAL_MEDIA_ADDONS = {
  extraPost: 45,
  extraPlatform: 60,
  setupAudit: 150,
};

export const SOCIAL_MEDIA_MAX_PLATFORMS = 4;

// Standalone Reels offer. Complex videos (shooting, motion design, long
// editing) stay on quote and are never priced here.
export const REELS_PACKS = [
  { quantity: 1, price: 69 },
  { quantity: 4, price: 249 },
  { quantity: 8, price: 449 },
];

// Cheapest exact combination of units and packs for a monthly Reels quantity.
export function getReelsPrice(quantity) {
  const count = Math.max(0, Math.floor(Number(quantity) || 0));
  const cheapest = [0];

  for (let total = 1; total <= count; total += 1) {
    cheapest[total] = Math.min(
      ...REELS_PACKS.filter((pack) => pack.quantity <= total).map(
        (pack) => cheapest[total - pack.quantity] + pack.price,
      ),
    );
  }

  return cheapest[count];
}

const clampCount = (value, maximum = Infinity) => Math.min(maximum, Math.max(0, Math.floor(Number(value) || 0)));

export function getSocialMediaEstimate({
  plan = "visibilite",
  extraPosts = 0,
  platforms,
  reels,
  setupAudit = false,
  launchActive = SOCIAL_MEDIA_LAUNCH_ACTIVE,
} = {}) {
  const selectedPlan = SOCIAL_MEDIA_PLANS[plan] ?? SOCIAL_MEDIA_PLANS.visibilite;
  const totalPlatforms = Math.max(
    selectedPlan.platforms,
    clampCount(platforms ?? selectedPlan.platforms, SOCIAL_MEDIA_MAX_PLATFORMS),
  );
  const totalReels = Math.max(selectedPlan.reels, clampCount(reels ?? selectedPlan.reels));
  const addedPosts = clampCount(extraPosts);
  const addedPlatforms = totalPlatforms - selectedPlan.platforms;
  const addedReels = totalReels - selectedPlan.reels;

  const addons = {
    posts: addedPosts * SOCIAL_MEDIA_ADDONS.extraPost,
    platforms: addedPlatforms * SOCIAL_MEDIA_ADDONS.extraPlatform,
    reels: getReelsPrice(addedReels),
  };
  const monthlyAddons = addons.posts + addons.platforms + addons.reels;

  return {
    kind: "recurring",
    plan: plan in SOCIAL_MEDIA_PLANS ? plan : "visibilite",
    planName: selectedPlan.name,
    included: {
      posts: selectedPlan.posts,
      platforms: selectedPlan.platforms,
      reels: selectedPlan.reels,
    },
    totals: {
      posts: selectedPlan.posts + addedPosts,
      platforms: totalPlatforms,
      reels: totalReels,
    },
    added: { posts: addedPosts, platforms: addedPlatforms, reels: addedReels },
    addons,
    // Without the launch offer, the "launch" amount is the standard price and lasts 0 months.
    launchMonthly: getPlanMonthlyPrice(selectedPlan, launchActive) + monthlyAddons,
    referenceMonthly: selectedPlan.referencePrice + monthlyAddons,
    launchMonths: launchActive ? SOCIAL_MEDIA_LAUNCH_MONTHS : 0,
    oneTime: setupAudit ? SOCIAL_MEDIA_ADDONS.setupAudit : 0,
  };
}

// Networks the subscription can cover; their count drives extra-network fees.
export const SOCIAL_MEDIA_NETWORKS = ["Instagram", "Facebook", "LinkedIn", "Google Business Profile"];

// Standalone Reels offer (LOT SM-04): a single Reel is a one-off service, packs
// are monthly, complex videos are quoted. Prices come from REELS_PACKS.
const reelsPackPrice = (quantity) => REELS_PACKS.find((pack) => pack.quantity === quantity).price;

export const REELS_OFFERS = {
  single: { quantity: 1, price: reelsPackPrice(1), billing: "one-time" },
  pack4: { quantity: 4, price: reelsPackPrice(4), billing: "monthly" },
  pack8: { quantity: 8, price: reelsPackPrice(8), billing: "monthly" },
  complex: { quantity: null, price: null, billing: "quote" },
};

// Single entry point for the unified estimator. Each block keeps its own rules:
// one-off projects keep urgency, rounding and delays; subscriptions do not.
// `contentService` is "none", "social" or "reels": with Social Media, extra
// Reels are an option of the plan, so included Reels are never billed twice.
export function getUnifiedEstimate({
  project = null,
  contentService = "none",
  social = {},
  reels = "pack4",
  launchActive = SOCIAL_MEDIA_LAUNCH_ACTIVE,
} = {}) {
  const projectEstimate = project ? getProjectEstimate(project) : null;
  let socialEstimate = null;
  let reelsOffer = null;
  let recurring = null;
  const oneTimeFees = [];

  if (contentService === "social") {
    const plan = SOCIAL_MEDIA_PLANS[social.plan] ? social.plan : "visibilite";
    const networks = (social.networks ?? []).filter((network) => SOCIAL_MEDIA_NETWORKS.includes(network));
    socialEstimate = getSocialMediaEstimate({
      plan,
      platforms: networks.length,
      extraPosts: social.extraPosts,
      reels: SOCIAL_MEDIA_PLANS[plan].reels + clampCount(social.extraReels),
      setupAudit: Boolean(social.setupAudit),
      launchActive,
    });
    socialEstimate = { ...socialEstimate, networks };
    recurring = {
      launchMonthly: socialEstimate.launchMonthly,
      standardMonthly: socialEstimate.referenceMonthly,
      launchMonths: socialEstimate.launchMonths,
    };
    if (socialEstimate.oneTime) {
      oneTimeFees.push({ key: "setupAudit", amount: socialEstimate.oneTime });
    }
  }

  if (contentService === "reels") {
    const offerKey = REELS_OFFERS[reels] ? reels : "pack4";
    reelsOffer = { key: offerKey, ...REELS_OFFERS[offerKey] };
    if (reelsOffer.billing === "monthly") {
      recurring = { launchMonthly: reelsOffer.price, standardMonthly: reelsOffer.price, launchMonths: 0 };
    }
    if (reelsOffer.billing === "one-time") {
      oneTimeFees.push({ key: "singleReel", amount: reelsOffer.price });
    }
  }

  // First month = subscription + set-up fees only. A one-off web project is
  // billed according to its own quote and is never added here.
  const setupFees = oneTimeFees.filter((fee) => fee.key === "setupAudit").reduce((sum, fee) => sum + fee.amount, 0);
  const firstMonth = recurring
    ? { subscription: recurring.launchMonthly, setupFees, total: recurring.launchMonthly + setupFees }
    : null;

  return {
    project: projectEstimate,
    social: socialEstimate,
    reels: reelsOffer,
    recurring,
    oneTimeFees,
    onQuote: reelsOffer?.billing === "quote",
    firstMonth,
  };
}
