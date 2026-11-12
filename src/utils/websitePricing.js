// V3-03: owner-approved website-only pricing. Other services keep production rules.
export const WEBSITE_NEED = "Créer un site web";
export const WEBSITE_PACKAGES = [
  { pages: 1, price: 390 },
  { pages: 3, price: 590 },
  { pages: 5, price: 890 },
];
export const WEBSITE_PRICING = {
  includedFeatures: ["SEO", "Formulaire de contact"],
  complexity: {
    "Simple : page ou fonctionnalité basique": 0,
    "Standard : plusieurs pages ou plusieurs fonctions": 0,
    "Avancé : espace utilisateur, tableau de bord, automatisation ou IA": 650,
  },
  content: {
    "Textes et images prêts": 0,
    "Quelques éléments seulement": 0,
    "Je pars de zéro": 300,
  },
  urgency: {
    Normal: { budgetMultiplier: 1, delayMultiplier: 1 },
    Rapide: { budgetMultiplier: 1.1, delayMultiplier: 0.85 },
    Urgent: { budgetMultiplier: 1.2, delayMultiplier: 0.7 },
  },
  roundingEuros: 1,
};
