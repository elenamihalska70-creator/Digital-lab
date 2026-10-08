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

const formatDelay = (days) => {
  const minimum = Math.max(2, Math.ceil(days * 0.85));
  const maximum = Math.max(minimum + 1, Math.ceil(days * 1.15));

  if (maximum <= 10) {
    return `${minimum}–${maximum} jours ouvrés`;
  }

  const minimumWeeks = Math.max(1, Math.ceil(minimum / 5));
  const maximumWeeks = Math.max(minimumWeeks + 1, Math.ceil(maximum / 5));

  return `${minimumWeeks}–${maximumWeeks} semaines`;
};

export function getEstimatorResult(answers) {
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
