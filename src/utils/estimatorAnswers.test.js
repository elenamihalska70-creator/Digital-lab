import assert from "node:assert/strict";
import test from "node:test";
import { getProjectEstimate, ESTIMATOR_FEATURE_ADJUSTMENTS } from "./estimator.js";
import { getEffectiveProjectAnswers, getWebsiteComplexity, isFeatureSelectable, WEBSITE_INCLUDED_FEATURES } from "./estimatorAnswers.js";
import { WEBSITE_NEED, WEBSITE_PACKAGES } from "./websitePricing.js";

const COMPLEXITIES = [
  "Simple : page ou fonctionnalité basique",
  "Standard : plusieurs pages ou plusieurs fonctions",
  "Avancé : espace utilisateur, tableau de bord, automatisation ou IA",
];
const OTHER_NEEDS = [
  "Réparer / améliorer un site existant",
  "Optimiser SEO & visibilité",
  "Ajouter une automatisation",
  "Créer un chatbot / assistant IA",
  "Créer un MVP ou prototype web",
];
const base = {
  pages: 1,
  profile: "Indépendant",
  priority: "Être visible",
  existing: "Non",
  content: "Quelques éléments seulement",
  features: [],
  urgency: "Normal",
};
const websiteEstimate = (answers) => getProjectEstimate(getEffectiveProjectAnswers(answers, WEBSITE_NEED));

test("Website package determines scope: 1 page is simple, 3/5 pages are standard", () => {
  assert.equal(getWebsiteComplexity(1), COMPLEXITIES[0]);
  assert.equal(getWebsiteComplexity(3), COMPLEXITIES[1]);
  assert.equal(getWebsiteComplexity(5), COMPLEXITIES[1]);
});

test("Website packages stay at 390/590/890 EUR whatever hidden complexity is stored", () => {
  assert.deepEqual(WEBSITE_PACKAGES.map((pack) => pack.price), [390, 590, 890]);
  for (const pack of WEBSITE_PACKAGES) {
    const reference = websiteEstimate({ ...base, pages: pack.pages, complexity: COMPLEXITIES[0] });
    assert.equal(reference.budget, pack.price);
    assert.equal(reference.pages, pack.pages);
    for (const complexity of COMPLEXITIES) {
      assert.deepEqual(websiteEstimate({ ...base, pages: pack.pages, complexity }), reference, `${pack.pages} pages / ${complexity}`);
    }
  }
});

test("A stale advanced complexity never adds a hidden surcharge to a website", () => {
  for (const content of ["Textes et images prêts", "Quelques éléments seulement", "Je pars de zéro"]) {
    for (const urgency of ["Normal", "Rapide", "Urgent"]) {
      for (const pack of WEBSITE_PACKAGES) {
        const stale = websiteEstimate({ ...base, content, urgency, pages: pack.pages, complexity: COMPLEXITIES[2] });
        const clean = websiteEstimate({ ...base, content, urgency, pages: pack.pages, complexity: COMPLEXITIES[0] });
        assert.deepEqual(stale, clean);
      }
    }
  }
  // 1-page package is simple: no contradictory "multi-page" level or delay.
  assert.equal(websiteEstimate({ ...base, complexity: COMPLEXITIES[2] }).type, "Simple");
});

test("Explicitly selected advanced features keep their website surcharges", () => {
  const included = ["SEO", "Formulaire de contact"];
  for (const pack of WEBSITE_PACKAGES) {
    for (const [feature, adjustment] of Object.entries(ESTIMATOR_FEATURE_ADJUSTMENTS)) {
      const estimate = websiteEstimate({ ...base, pages: pack.pages, complexity: COMPLEXITIES[2], features: [feature] });
      assert.equal(estimate.budget, pack.price + (included.includes(feature) ? 0 : adjustment.budget), `${pack.pages} pages + ${feature}`);
    }
  }
  assert.equal(websiteEstimate({ ...base, pages: 3, features: ["Paiement"], content: "Je pars de zéro", complexity: COMPLEXITIES[2] }).budget, 1240);
});

test("Other project types keep the visitor's complexity selection and production results", () => {
  for (const need of OTHER_NEEDS) {
    for (const complexity of COMPLEXITIES) {
      const answers = { ...base, pages: 5, complexity, features: ["Paiement"] };
      const effective = getEffectiveProjectAnswers(answers, need);
      assert.deepEqual(effective, { ...answers, need });
      assert.deepEqual(getProjectEstimate(effective), getProjectEstimate({ ...answers, need }));
    }
  }
});

test("Website-included SEO and contact form are not selectable for websites, but remain options elsewhere", () => {
  assert.deepEqual([...WEBSITE_INCLUDED_FEATURES].sort(), ["Formulaire de contact", "SEO"]);
  const features = Object.keys(ESTIMATOR_FEATURE_ADJUSTMENTS);
  assert.deepEqual(
    features.filter((feature) => !isFeatureSelectable(WEBSITE_NEED, feature)).sort(),
    ["Formulaire de contact", "SEO"],
  );
  for (const need of OTHER_NEEDS) for (const feature of features) assert.equal(isFeatureSelectable(need, feature), true);

  // Stale ticks from another project type are dropped from the website quote, at no price change.
  const stale = { ...base, pages: 3, complexity: COMPLEXITIES[1], features: ["SEO", "Formulaire de contact", "Paiement"] };
  const website = getEffectiveProjectAnswers(stale, WEBSITE_NEED);
  assert.deepEqual(website.features, ["Paiement"]);
  assert.equal(getProjectEstimate(website).budget, 590 + ESTIMATOR_FEATURE_ADJUSTMENTS.Paiement.budget);
  assert.deepEqual(getProjectEstimate(website), getProjectEstimate({ ...stale, need: WEBSITE_NEED }));
  // Other types still charge them.
  assert.deepEqual(getEffectiveProjectAnswers(stale, OTHER_NEEDS[0]).features, stale.features);
});

test("Switching to website mode and back does not alter the stored answers", () => {
  const answers = Object.freeze({ ...base, pages: 3, complexity: COMPLEXITIES[2], features: Object.freeze(["Chatbot"]) });
  const website = getEffectiveProjectAnswers(answers, WEBSITE_NEED);
  assert.equal(website.complexity, COMPLEXITIES[1]);
  assert.equal(answers.complexity, COMPLEXITIES[2]);
  const back = getEffectiveProjectAnswers(answers, "Ajouter une automatisation");
  assert.equal(back.complexity, COMPLEXITIES[2]);
});
