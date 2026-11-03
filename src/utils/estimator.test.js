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

// LOT SM-01 — recurring social media pricing must stay separate from one-off projects.
import {
  getReelsPrice,
  getSocialMediaEstimate,
  SOCIAL_MEDIA_ADDONS,
  SOCIAL_MEDIA_PLANS,
} from "./estimator.js";

test("One-off chatbot estimates are unchanged by the recurring pricing module", () => {
  assert.deepEqual(result({ need: chatbot, features: ["Chatbot"] }), {
    type: "Intermédiaire",
    budget: "à partir de 800€",
    delay: "2–3 semaines",
    message: "Votre projet demande plusieurs éléments à coordonner. Une première version claire peut être créée rapidement.",
  });
  assert.equal(budget({ need: chatbot, complexity: advanced, features: ["Chatbot", "Email automatique"], urgency: "Urgent" }), 2000);
  assert.equal(result({ need: chatbot }).kind, undefined);
});

test("Social media plans match the launch and reference prices", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(SOCIAL_MEDIA_PLANS).map(([key, plan]) => [key, [plan.launchPrice, plan.referencePrice]])),
    { presence: [149, 190], visibilite: [299, 390], croissance: [549, 690] },
  );
  for (const plan of Object.keys(SOCIAL_MEDIA_PLANS)) {
    const estimate = getSocialMediaEstimate({ plan });
    assert.equal(estimate.kind, "recurring");
    assert.equal(estimate.launchMonthly, SOCIAL_MEDIA_PLANS[plan].launchPrice);
    assert.equal(estimate.referenceMonthly, SOCIAL_MEDIA_PLANS[plan].referencePrice);
    assert.equal(estimate.oneTime, 0);
    assert.equal(estimate.launchMonths, 3);
  }
});

test("Reels pricing uses the cheapest exact combination of units and packs", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 8, 12].map(getReelsPrice), [0, 69, 138, 207, 249, 318, 449, 698]);
  assert.equal(getReelsPrice(-2), 0);
});

test("Plan contents match the owner-approved offer table", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(SOCIAL_MEDIA_PLANS).map(([key, plan]) => [key, [plan.posts, plan.platforms, plan.reels]])),
    { presence: [4, 1, 0], visibilite: [8, 2, 0], croissance: [12, 2, 2] },
  );
});

test("Included posts, platforms and Reels are never charged twice", () => {
  const croissance = getSocialMediaEstimate({ plan: "croissance", platforms: 2, reels: 2 });
  assert.equal(croissance.launchMonthly, 549);
  assert.deepEqual(croissance.addons, { posts: 0, platforms: 0, reels: 0 });
  // Asking for fewer than included keeps the plan price, without a discount.
  assert.equal(getSocialMediaEstimate({ plan: "croissance", platforms: 1, reels: 0 }).launchMonthly, 549);
  // Only the Reels beyond the two included are charged: 4 extra = one pack.
  assert.equal(getSocialMediaEstimate({ plan: "croissance", reels: 6 }).addons.reels, 249);
  assert.equal(getSocialMediaEstimate({ plan: "visibilite", reels: 1 }).addons.reels, 69);
  // The configurator starts at zero: every plan then shows its bare price.
  for (const [plan, { launchPrice }] of Object.entries(SOCIAL_MEDIA_PLANS)) {
    assert.equal(getSocialMediaEstimate({ plan, platforms: 0, extraPosts: 0, reels: 0 }).launchMonthly, launchPrice);
  }
});

test("Switching plan keeps the requested totals and recomputes only the surplus", () => {
  const options = { platforms: 3, reels: 2, extraPosts: 4 };
  assert.deepEqual(getSocialMediaEstimate({ ...options, plan: "presence" }).addons, { posts: 180, platforms: 120, reels: 138 });
  assert.deepEqual(getSocialMediaEstimate({ ...options, plan: "croissance" }).addons, { posts: 180, platforms: 60, reels: 0 });
});

test("Add-ons are monthly and the setup audit is one-time only", () => {
  assert.deepEqual(SOCIAL_MEDIA_ADDONS, { extraPost: 45, extraPlatform: 60, setupAudit: 150 });
  const estimate = getSocialMediaEstimate({ plan: "presence", extraPosts: 4, platforms: 3, reels: 4, setupAudit: true });
  assert.deepEqual(estimate.addons, { posts: 180, platforms: 120, reels: 249 });
  assert.equal(estimate.launchMonthly, 149 + 180 + 120 + 249);
  assert.equal(estimate.referenceMonthly, 190 + 180 + 120 + 249);
  assert.equal(estimate.oneTime, 150);
  assert.deepEqual(estimate.totals, { posts: 8, platforms: 3, reels: 4 });
  // The one-time audit never changes the monthly amounts.
  const withoutAudit = getSocialMediaEstimate({ plan: "presence", extraPosts: 4, platforms: 3, reels: 4 });
  assert.equal(withoutAudit.launchMonthly, estimate.launchMonthly);
  assert.equal(withoutAudit.oneTime, 0);
});

test("A lower plan plus add-ons never costs less than the higher plan", () => {
  const plans = Object.entries(SOCIAL_MEDIA_PLANS);
  for (const [lowKey, low] of plans) {
    for (const [, high] of plans.filter(([, plan]) => plan.launchPrice > low.launchPrice)) {
      const equivalent = getSocialMediaEstimate({
        plan: lowKey,
        extraPosts: high.posts - low.posts,
        platforms: high.platforms,
        reels: high.reels,
      });
      assert.ok(equivalent.launchMonthly >= high.launchPrice, `${low.name} → ${high.name} (lancement)`);
      assert.ok(equivalent.referenceMonthly >= high.referencePrice, `${low.name} → ${high.name} (ensuite)`);
    }
  }
});

test("Invalid social media inputs fall back safely", () => {
  const estimate = getSocialMediaEstimate({ plan: "unknown", extraPosts: -3, platforms: 99, reels: "x" });
  assert.equal(estimate.plan, "visibilite");
  assert.equal(estimate.totals.platforms, 4);
  assert.equal(estimate.added.posts, 0);
  assert.equal(estimate.totals.reels, 0);
});

// LOT SM-04 — unified estimator: one-off projects and subscriptions side by side.
import { getProjectEstimate, getUnifiedEstimate, REELS_OFFERS, SOCIAL_MEDIA_NETWORKS } from "./estimator.js";

const allNeeds = [website, "Réparer / améliorer un site existant", seo, automation, chatbot, mvp];

test("Numeric project estimate matches the legacy text result on every combination", () => {
  let compared = 0;
  for (const need of allNeeds) {
    for (const complexity of [simple, standard, advanced]) {
      for (const features of [[], ["Chatbot"], ["SEO", "Chatbot"], ["Paiement", "Tableau de bord"]]) {
        for (const urgency of ["Normal", "Rapide", "Urgent"]) {
          for (const content of ["Textes et images prêts", partialContent, "Je pars de zéro"]) {
            const answers = { ...base, need, complexity, features, urgency, content };
            const numeric = getProjectEstimate(answers);
            const legacy = getEstimatorResult(answers);
            const unit = numeric.delay.unit === "days" ? "jours ouvrés" : "semaines";
            assert.equal(legacy.budget, `à partir de ${numeric.budget}€`);
            assert.equal(legacy.delay, `${numeric.delay.min}–${numeric.delay.max} ${unit}`);
            assert.equal(legacy.type, numeric.type);
            compared += 1;
          }
        }
      }
    }
  }
  assert.equal(compared, 648);
});

test("Unified: one-off project only keeps the current amounts and no subscription", () => {
  const estimate = getUnifiedEstimate({ project: { ...base, need: chatbot, features: ["Chatbot"] } });
  assert.equal(estimate.project.budget, 800);
  assert.equal(estimate.recurring, null);
  assert.equal(estimate.firstMonth, null);
  assert.deepEqual(estimate.oneTimeFees, []);
});

test("Unified: Social Media only — monthly amounts without urgency, rounding or delay", () => {
  const estimate = getUnifiedEstimate({
    contentService: "social",
    social: { plan: "presence", networks: ["Instagram", "Facebook", "LinkedIn"], extraPosts: 4, extraReels: 1, setupAudit: true },
  });
  // 149 + 4 × 45 + 2 extra networks × 60 + 1 Reel 69 = 518 ; standard 190 + 369 = 559.
  assert.deepEqual(estimate.recurring, { launchMonthly: 518, standardMonthly: 559, launchMonths: 3 });
  assert.deepEqual(estimate.oneTimeFees, [{ key: "setupAudit", amount: 150 }]);
  assert.deepEqual(estimate.firstMonth, { subscription: 518, setupFees: 150, total: 668 });
  assert.equal(estimate.project, null);
  assert.equal("delay" in estimate.recurring, false);
});

test("Unified: included Reels and networks are never billed twice", () => {
  const croissance = getUnifiedEstimate({ contentService: "social", social: { plan: "croissance", networks: ["Instagram", "LinkedIn"] } });
  assert.equal(croissance.recurring.launchMonthly, 549);
  assert.deepEqual(croissance.social.addons, { posts: 0, platforms: 0, reels: 0 });
  assert.equal(croissance.social.totals.reels, 2);
  // Fewer networks than included keep the plan price; unknown networks are ignored.
  const fewer = getUnifiedEstimate({ contentService: "social", social: { plan: "visibilite", networks: ["Instagram", "MySpace"] } });
  assert.equal(fewer.recurring.launchMonthly, 299);
  assert.deepEqual(fewer.social.networks, ["Instagram"]);
  // 4 extra Reels on top of the 2 included = one pack of 4.
  assert.equal(getUnifiedEstimate({ contentService: "social", social: { plan: "croissance", extraReels: 4 } }).social.addons.reels, 249);
});

test("Unified: Reels only — single Reel is one-off, packs are monthly, complex is quoted", () => {
  const single = getUnifiedEstimate({ contentService: "reels", reels: "single" });
  assert.equal(single.recurring, null);
  assert.equal(single.firstMonth, null);
  assert.deepEqual(single.oneTimeFees, [{ key: "singleReel", amount: 69 }]);
  for (const [key, price] of [["pack4", 249], ["pack8", 449]]) {
    const pack = getUnifiedEstimate({ contentService: "reels", reels: key });
    assert.deepEqual(pack.recurring, { launchMonthly: price, standardMonthly: price, launchMonths: 0 });
    assert.deepEqual(pack.firstMonth, { subscription: price, setupFees: 0, total: price });
  }
  const complex = getUnifiedEstimate({ contentService: "reels", reels: "complex" });
  assert.equal(complex.onQuote, true);
  assert.equal(complex.recurring, null);
  assert.deepEqual(complex.oneTimeFees, []);
  assert.deepEqual(Object.fromEntries(Object.entries(REELS_OFFERS).map(([k, o]) => [k, o.billing])), { single: "one-time", pack4: "monthly", pack8: "monthly", complex: "quote" });
});

test("Unified: project + subscription keeps both apart; first month excludes the web project", () => {
  const estimate = getUnifiedEstimate({
    project: { ...base, complexity: standard, features: ["Chatbot"] },
    contentService: "social",
    social: { plan: "visibilite", networks: ["Instagram", "Facebook"], setupAudit: true },
  });
  assert.equal(estimate.project.budget, 1300);
  assert.deepEqual(estimate.recurring, { launchMonthly: 299, standardMonthly: 390, launchMonths: 3 });
  assert.deepEqual(estimate.firstMonth, { subscription: 299, setupFees: 150, total: 449 });
  // Project + single Reel: two one-off amounts, still no first-month total.
  const withReel = getUnifiedEstimate({ project: base, contentService: "reels", reels: "single" });
  assert.equal(withReel.project.budget, 400);
  assert.deepEqual(withReel.oneTimeFees, [{ key: "singleReel", amount: 69 }]);
  assert.equal(withReel.firstMonth, null);
});

test("Unified: nothing selected returns an empty estimate", () => {
  assert.deepEqual(getUnifiedEstimate(), { project: null, social: null, reels: null, recurring: null, oneTimeFees: [], onQuote: false, firstMonth: null });
  assert.deepEqual(SOCIAL_MEDIA_NETWORKS, ["Instagram", "Facebook", "LinkedIn", "Google Business Profile"]);
});

// LOT SM-06A — launch offer switch. Both states are tested explicitly; the
// default follows SOCIAL_MEDIA_LAUNCH_ACTIVE, which stays true for now.
import { getPlanMonthlyPrice, SOCIAL_MEDIA_LAUNCH_ACTIVE } from "./estimator.js";

test("Launch switch: the offer is active by default", () => {
  assert.equal(SOCIAL_MEDIA_LAUNCH_ACTIVE, true);
  for (const plan of Object.values(SOCIAL_MEDIA_PLANS)) {
    assert.equal(getPlanMonthlyPrice(plan), plan.launchPrice);
  }
});

test("Launch switch on: launch prices for 3 months, then standard prices (unchanged behaviour)", () => {
  const social = { plan: "croissance", networks: ["Instagram", "Facebook", "LinkedIn"], extraPosts: 4, extraReels: 1, setupAudit: true };
  const explicit = getUnifiedEstimate({ contentService: "social", social, launchActive: true });
  assert.deepEqual(explicit, getUnifiedEstimate({ contentService: "social", social }));
  // 549 + 4 × 45 + 1 network × 60 + 1 Reel 69 = 858 ; standard 690 + 309 = 999.
  assert.deepEqual(explicit.recurring, { launchMonthly: 858, standardMonthly: 999, launchMonths: 3 });
  assert.deepEqual(explicit.firstMonth, { subscription: 858, setupFees: 150, total: 1008 });
  assert.equal(explicit.social.launchMonths, 3);
});

test("Launch switch off: standard prices everywhere, no launch period", () => {
  for (const [key, plan] of Object.entries(SOCIAL_MEDIA_PLANS)) {
    assert.equal(getPlanMonthlyPrice(plan, false), plan.referencePrice);
    const estimate = getSocialMediaEstimate({ plan: key, launchActive: false });
    assert.equal(estimate.launchMonthly, plan.referencePrice);
    assert.equal(estimate.referenceMonthly, plan.referencePrice);
    assert.equal(estimate.launchMonths, 0);
  }

  const social = { plan: "croissance", networks: ["Instagram", "Facebook", "LinkedIn"], extraPosts: 4, extraReels: 1, setupAudit: true };
  const off = getUnifiedEstimate({ contentService: "social", social, launchActive: false });
  assert.deepEqual(off.recurring, { launchMonthly: 999, standardMonthly: 999, launchMonths: 0 });
  assert.deepEqual(off.firstMonth, { subscription: 999, setupFees: 150, total: 1149 });
  // Add-ons and the setup audit keep their price whatever the offer state.
  const on = getUnifiedEstimate({ contentService: "social", social, launchActive: true });
  assert.deepEqual(off.social.addons, on.social.addons);
  assert.deepEqual(off.oneTimeFees, on.oneTimeFees);
});

test("Launch switch off: reference prices and the Reels offer are not changed", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(SOCIAL_MEDIA_PLANS).map(([key, plan]) => [key, [plan.launchPrice, plan.referencePrice]])),
    { presence: [149, 190], visibilite: [299, 390], croissance: [549, 690] },
  );
  for (const reels of Object.keys(REELS_OFFERS)) {
    assert.deepEqual(
      getUnifiedEstimate({ contentService: "reels", reels, launchActive: false }),
      getUnifiedEstimate({ contentService: "reels", reels, launchActive: true }),
    );
  }
});

test("Launch switch off: a lower plan plus add-ons still never costs less than the higher plan", () => {
  const plans = Object.entries(SOCIAL_MEDIA_PLANS);
  for (const [lowKey, low] of plans) {
    for (const [, high] of plans.filter(([, plan]) => plan.referencePrice > low.referencePrice)) {
      const equivalent = getSocialMediaEstimate({
        plan: lowKey,
        extraPosts: Math.max(0, high.posts - low.posts),
        platforms: high.platforms,
        reels: high.reels,
        launchActive: false,
      });
      assert.ok(equivalent.launchMonthly >= high.referencePrice, `${low.name} → ${high.name}`);
    }
  }
});
