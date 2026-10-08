import assert from "node:assert/strict";
import test from "node:test";
import { getEstimatorResult, ESTIMATOR_FEATURE_ADJUSTMENTS } from "./estimator.js";

const simple = "Simple : page ou fonctionnalité basique";
const standard = "Standard : plusieurs pages ou plusieurs fonctions";
const advanced = "Avancé : espace utilisateur, tableau de bord, automatisation ou IA";
const website = "Créer un site web";
const seo = "Optimiser SEO & visibilité";
const automation = "Ajouter une automatisation";
const chatbot = "Créer un chatbot / assistant IA";
const mvp = "Créer un MVP ou prototype web";
const partialContent = "Quelques éléments seulement";
const base = {
  need: website, complexity: simple, features: [],
  content: "Textes et images prêts", urgency: "Normal",
  profile: "Indépendant", priority: "Être visible", existing: "Non",
};
const result = (answers = {}) => getEstimatorResult({ ...base, ...answers });
const budget = (answers) => Number(result(answers).budget.match(/\d+/)[0]);

const scenarios = [
  ["A", {}, 400],
  ["B", { features: ["SEO"] }, 600],
  ["C", { complexity: standard, features: ["SEO"] }, 850],
  ["D", { complexity: standard, features: ["Formulaire de contact", "SEO"] }, 950],
  ["E", { complexity: standard, features: ["SEO"], content: partialContent }, 1000],
  ["F", { complexity: standard, features: ["Réservation", "SEO"] }, 1150],
  ["G", { need: "Réparer / améliorer un site existant", features: ["SEO"] }, 450],
  ["H", { need: seo, features: ["SEO"] }, 300],
  ["I", { need: automation }, 550],
  ["J", { need: automation, complexity: standard, features: ["Google Sheets / CRM", "Email automatique"] }, 1400],
  ["K", { need: chatbot, features: ["Chatbot"] }, 800],
  ["L", { complexity: standard, features: ["Chatbot"] }, 1300],
  ["M", { need: mvp }, 800],
  ["N", { need: mvp, complexity: advanced, features: ["Tableau de bord"] }, 2000],
  ["O", { complexity: advanced, features: ["Paiement", "Tableau de bord", "SEO"], content: partialContent, urgency: "Urgent" }, 2750],
];

for (const [name, answers, expected] of scenarios) {
  test(`Scenario ${name}: ${expected} euros`, () => assert.equal(budget(answers), expected));
}

for (const [field, values] of Object.entries({
  profile: ["Indépendant", "Association", "Commerce local", "Restaurant / service", "Projet en création", "Autre"],
  priority: ["Être visible", "Recevoir plus de demandes", "Gagner du temps", "Réparer un site existant", "Tester une idée", "Automatiser une tâche"],
  existing: ["Oui", "Non", "Partiellement"],
})) {
  test(`${field} never changes budget or input data`, () => {
    for (const value of values) {
      const answers = { ...base, complexity: advanced, features: ["Paiement"], urgency: "Urgent", [field]: value };
      const original = structuredClone(answers);
      assert.equal(budget(answers), 1700);
      assert.deepEqual(answers, original);
    }
  });
}

for (const [need, feature, extraBudget] of [[seo, "SEO", 500], [chatbot, "Chatbot", 1000]]) {
  test(`${feature} duplicate preserves budget, delay and type`, () => {
    for (const complexity of [simple, standard, advanced]) {
      for (const urgency of ["Normal", "Rapide", "Urgent"]) {
        for (const features of [[], ["Email automatique"]]) {
          const answers = { need, complexity, urgency, features };
          assert.deepEqual(
            result({ ...answers, features: [...features, feature] }),
            result(answers),
          );
        }
      }
    }
  });
  test(`${feature} is included only for its explicit primary need`, () => {
    assert.equal(budget({ need, features: [feature] }), budget({ need }));
    assert.equal(budget({ need, features: [feature, "Email automatique"] }), extraBudget);
    assert.equal(budget({ features: [feature] }), feature === "SEO" ? 600 : 1050);
  });
}

test("Urgency is applied before rounding up to 50 euros", () => {
  assert.equal(budget({ urgency: "Normal" }), 400);
  assert.equal(budget({ urgency: "Rapide" }), 450);
  assert.equal(budget({ urgency: "Urgent" }), 500);
  assert.equal(budget({ complexity: standard, features: ["SEO"], urgency: "Rapide" }), 950);
  assert.equal(budget({ complexity: standard, content: partialContent }), 800);
  assert.equal(budget({ features: ["Maintenance"] }), 550);
  assert.equal(budget({ content: "Je pars de zéro" }), 700);
});

test("All feature prices match V2", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(ESTIMATOR_FEATURE_ADJUSTMENTS).map(([name, adjustment]) => [name, adjustment.budget])), {
    "Formulaire de contact": 100, Réservation: 300, "Email automatique": 200,
    "Google Sheets / CRM": 400, "Tableau de bord": 550, Paiement: 350,
    Chatbot: 650, SEO: 200, Maintenance: 120,
  });
});

test("Explicit complexity sets the minimum displayed level", () => {
  assert.equal(result().type, "Simple");
  assert.equal(result({ complexity: standard, features: ["SEO"] }).type, "Intermédiaire");
  assert.equal(result({ complexity: standard, features: ["Formulaire de contact", "SEO"] }).type, "Intermédiaire");
  const advancedResult = result({ complexity: advanced });
  assert.equal(advancedResult.budget, "à partir de 1050€");
  assert.equal(advancedResult.type, "Avancé");
});

test("Automation, chatbot and MVP needs have at least an intermediate level", () => {
  for (const need of [automation, chatbot, mvp]) {
    assert.equal(result({ need }).type, "Intermédiaire");
    assert.equal(result({ need, complexity: advanced }).type, "Avancé");
  }
});

test("Budget and technical complexity can raise the minimum displayed level", () => {
  // Technical points reach 8 while budget remains below the advanced threshold.
  const technical = result({ need: automation, complexity: standard, features: ["Google Sheets / CRM", "Email automatique"] });
  assert.equal(technical.budget, "à partir de 1400€");
  assert.equal(technical.type, "Avancé");
  // These features have only 3 points; budget alone reaches the advanced threshold.
  const monetary = result({
    features: ["Réservation", "Email automatique", "SEO", "Maintenance", "Formulaire de contact"],
    content: "Je pars de zéro", urgency: "Urgent",
  });
  assert.equal(monetary.budget, "à partir de 1950€");
  assert.equal(monetary.type, "Avancé");
  assert.equal(result({ features: ["Chatbot"] }).type, "Intermédiaire");
});

test("Delivery-time logic is preserved except for fully excluded duplicate features", () => {
  assert.equal(result().delay, "5–6 jours ouvrés");
  assert.equal(result({ profile: "Association", priority: "Gagner du temps", existing: "Partiellement" }).delay, "2–3 semaines");
  assert.equal(result({ need: seo, features: ["SEO"] }).delay, "4–5 jours ouvrés");
  assert.equal(result({ need: chatbot, features: ["Chatbot"] }).delay, "2–3 semaines");
  assert.equal(result({ urgency: "Rapide" }).delay, "5–6 jours ouvrés");
  assert.equal(result({ urgency: "Urgent" }).delay, "4–5 jours ouvrés");
});
