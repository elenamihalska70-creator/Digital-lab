import assert from "node:assert/strict";
import test from "node:test";
import {
  BILLING_TYPES, createEstimatorTracker, ESTIMATOR_EVENTS, getPricedItems, PRICE_VIEW_CURRENCY, SERVICE_CATEGORIES,
} from "./estimatorTracking.js";
import { getCatalogEstimate, SERVICE_PACKAGES, SERVICE_PACKAGE_NEEDS } from "./servicePackages.js";
import { REELS_OFFERS, SOCIAL_MEDIA_PLANS } from "./estimator.js";
import { REPAIR_NEED } from "./repairDiagnostic.js";
import { WEBSITE_NEED } from "./websitePricing.js";
import { getEffectiveProjectAnswers } from "./estimatorAnswers.js";

const ANSWERS = {
  pages: 1, profile: "Indépendant", priority: "Être visible", need: WEBSITE_NEED, existing: "Non",
  content: "Quelques éléments seulement", complexity: "Standard : plusieurs pages ou plusieurs fonctions",
  features: [], urgency: "Normal",
};
const SOCIAL = { plan: "visibilite", networks: [], extraPosts: 0, extraReels: 0, setupAudit: false };
const PRIVATE_REPAIR = { url: "https://client-private.example/?token=abc", description: "Secret problem: password hunter2" };

// Mirrors UnifiedEstimator: same answers, package choices, repair and content service inputs.
const estimateFor = ({ need = WEBSITE_NEED, answers = {}, packages = {}, repair = {}, content = "none", social = {}, reels = "pack4" } = {}) =>
  getCatalogEstimate({
    project: need ? getEffectiveProjectAnswers({ ...ANSWERS, ...answers }, need) : null,
    packageChoices: { seo: "essential", automation: "essential", chatbot: "essential", prototype: "discovery", ...packages },
    repair: { issue: "", intervention: "", platform: "", scope: "", urgency: "", ...PRIVATE_REPAIR, ...repair },
    contentService: content,
    social: { ...SOCIAL, ...social },
    reels,
  });

const recorder = (options = {}) => {
  const sent = [];
  const tracker = createEstimatorTracker({ variant: "main", language: "fr", send: (name, params) => sent.push([name, params]), ...options });
  return { sent, tracker, views: () => sent.filter(([name]) => name === ESTIMATOR_EVENTS.priceView).map(([, params]) => params) };
};
// One user action: trusted interaction captured, then React commits the resulting estimate.
const act = (tracker, estimate) => { tracker.noteInteraction(); return tracker.commit(estimate); };

test("Nothing is sent on mount, re-render, StrictMode double effects or visibility", () => {
  const { sent, tracker } = recorder();
  for (let index = 0; index < 5; index += 1) tracker.commit(estimateFor());
  tracker.commit(estimateFor({ answers: { pages: 3 } }), { interactive: true }); // a render without interaction
  assert.deepEqual(sent, []);
});

test("estimator_open fires once, on the first intentional interaction, with categorical parameters only", () => {
  const { sent, tracker } = recorder({ variant: "social", language: "en" });
  tracker.commit(estimateFor({ need: null, content: "social" }));
  tracker.noteInteraction();
  tracker.noteInteraction();
  tracker.commit(estimateFor({ need: null, content: "social" }));
  act(tracker, estimateFor({ need: null, content: "social", social: { plan: "croissance" } }));
  assert.deepEqual(sent.filter(([name]) => name === ESTIMATOR_EVENTS.open), [[ESTIMATOR_EVENTS.open, { estimator_variant: "social", page_language: "en" }]]);
  assert.equal(sent[0][0], ESTIMATOR_EVENTS.open);
});

test("Cosmetic interactions (details dialog, profile, priority, existing site, repair text) never send a price view", () => {
  const { tracker, views } = recorder();
  tracker.commit(estimateFor());
  act(tracker, estimateFor());
  act(tracker, estimateFor({ answers: { profile: "Entreprise", priority: "Gagner du temps", existing: "Oui" } }));
  tracker.commit(estimateFor({ need: SERVICE_PACKAGE_NEEDS.seo }));
  act(tracker, estimateFor({ need: SERVICE_PACKAGE_NEEDS.seo, answers: { content: "Je pars de zéro", urgency: "Urgent", complexity: "Avancé : espace utilisateur, tableau de bord, automatisation ou IA" } }));
  tracker.commit(estimateFor({ need: REPAIR_NEED }));
  act(tracker, estimateFor({ need: REPAIR_NEED, repair: { url: "https://other.example", description: "typed text" } }));
  assert.deepEqual(views(), []);
});

test("An intentional package change sends exactly one event; repeat clicks on the selected option do not", () => {
  const { tracker, views } = recorder();
  tracker.commit(estimateFor());
  act(tracker, estimateFor({ need: SERVICE_PACKAGE_NEEDS.chatbot }));
  act(tracker, estimateFor({ need: SERVICE_PACKAGE_NEEDS.chatbot, packages: { chatbot: "business" } }));
  for (let index = 0; index < 4; index += 1) act(tracker, estimateFor({ need: SERVICE_PACKAGE_NEEDS.chatbot, packages: { chatbot: "business" } }));
  assert.deepEqual(views(), [
    { estimator_variant: "main", page_language: "fr", service_category: "chatbot", package_id: "chatbot_essential", billing_type: "fixed", currency: "EUR" },
    { estimator_variant: "main", page_language: "fr", service_category: "chatbot", package_id: "chatbot_business", billing_type: "fixed", currency: "EUR" },
  ]);
});

test("Identical priced configurations are counted once per instance; the passive initial one counts once when chosen again", () => {
  const { tracker, views } = recorder();
  tracker.commit(estimateFor());
  act(tracker, estimateFor({ need: SERVICE_PACKAGE_NEEDS.seo }));
  act(tracker, estimateFor());
  act(tracker, estimateFor({ need: SERVICE_PACKAGE_NEEDS.seo }));
  act(tracker, estimateFor());
  act(tracker, estimateFor({ answers: { pages: 3 } }));
  act(tracker, estimateFor());
  assert.deepEqual(views().map(({ package_id }) => package_id), ["seo_essential", "website_1_page", "website_3_pages"]);
  // A second instance (another page view) has its own count.
  const other = recorder();
  other.tracker.commit(estimateFor());
  act(other.tracker, estimateFor({ need: SERVICE_PACKAGE_NEEDS.seo }));
  assert.equal(other.views().length, 1);
});

test("A website surcharge is a new price for the same package; removing a service is not a price view", () => {
  const { tracker, views } = recorder();
  tracker.commit(estimateFor());
  act(tracker, estimateFor({ answers: { content: "Je pars de zéro" } }));
  act(tracker, estimateFor({ answers: { content: "Je pars de zéro" }, content: "social" }));
  act(tracker, estimateFor({ answers: { content: "Je pars de zéro" }, content: "social", social: { networks: ["Instagram", "Facebook", "LinkedIn"] } }));
  act(tracker, estimateFor({ answers: { content: "Je pars de zéro" } }));
  act(tracker, estimateFor({ need: null }));
  assert.deepEqual(views().map((view) => [view.service_category, view.package_id, view.billing_type]), [
    ["website", "website_1_page", "from"],
    ["social_media", "social_visibilite", "monthly"],
    ["social_media", "social_visibilite", "monthly"],
  ]);
});

test("A preset applied from a CTA outside the estimator is passive", () => {
  const { sent, tracker, views } = recorder({ variant: "social" });
  tracker.commit(estimateFor({ need: null, content: "social" }));
  tracker.commit(estimateFor({ need: null, content: "social", social: { plan: "croissance" } }), { interactive: false });
  tracker.noteInteraction();
  tracker.commit(estimateFor({ need: null, content: "reels", reels: "pack8" }), { interactive: false });
  assert.deepEqual(views(), []);
  assert.equal(sent.length, 1); // estimator_open only
  act(tracker, estimateFor({ need: null, content: "reels", reels: "single" }));
  assert.deepEqual(views().map((view) => [view.service_category, view.package_id, view.billing_type]), [["reels", "reels_1", "fixed"]]);
});

test("Every service, package and offer maps to an approved categorical identifier", () => {
  const seen = new Map();
  const add = (estimate) => getPricedItems(estimate).forEach((entry) => seen.set(entry.package_id, entry));
  [1, 3, 5].forEach((pages) => add(estimateFor({ answers: { pages } })));
  for (const [category, { packages }] of Object.entries(SERVICE_PACKAGES)) {
    for (const pack of packages) add(estimateFor({ need: SERVICE_PACKAGE_NEEDS[category], packages: { [category]: pack.id } }));
  }
  for (const repair of [{}, { issue: "outage" }, { issue: "performance", intervention: "comprehensive", platform: "wordpress", urgency: "normal" },
    { issue: "button", intervention: "targeted", platform: "hosted", urgency: "soon", scope: "local" }]) add(estimateFor({ need: REPAIR_NEED, repair }));
  Object.keys(SOCIAL_MEDIA_PLANS).forEach((plan) => add(estimateFor({ need: null, content: "social", social: { plan } })));
  Object.keys(REELS_OFFERS).forEach((reels) => add(estimateFor({ need: null, content: "reels", reels })));
  assert.deepEqual([...seen.keys()].sort(), [
    "automation_advanced", "automation_business", "automation_essential", "chatbot_advanced", "chatbot_business", "chatbot_essential",
    "prototype_discovery", "prototype_functional", "prototype_mvp", "reels_1", "reels_4", "reels_8", "reels_complex",
    "repair_comprehensive", "repair_small", "repair_technical", "repair_urgent", "seo_development", "seo_essential", "seo_visibility",
    "social_croissance", "social_presence", "social_visibilite", "website_1_page", "website_3_pages", "website_5_pages",
  ]);
  for (const entry of seen.values()) {
    assert.ok(SERVICE_CATEGORIES.includes(entry.service_category));
    assert.ok(BILLING_TYPES.includes(entry.billing_type));
  }
  assert.equal(seen.get("seo_development").billing_type, "from");
  assert.equal(seen.get("prototype_mvp").billing_type, "quote");
  assert.equal(seen.get("repair_urgent").billing_type, "quote");
  assert.equal(seen.get("repair_small").billing_type, "from");
  assert.equal(seen.get("reels_complex").billing_type, "quote");
  assert.equal(seen.get("reels_4").billing_type, "monthly");
  assert.equal(seen.get("social_presence").billing_type, "monthly");
});

// GA4 limits: event names ≤ 40 characters, letters/digits/underscores, starting with a letter,
// no reserved prefix or name; ≤ 25 parameters; parameter names ≤ 40; string values ≤ 100.
const RESERVED_PREFIXES = ["google_", "ga_", "firebase_", "_"];
const RESERVED_EVENTS = ["ad_activeview", "ad_click", "ad_exposure", "ad_query", "ad_reward", "adunit_exposure", "app_background",
  "app_clear_data", "app_exception", "app_remove", "app_store_refund", "app_store_subscription_cancel", "app_store_subscription_convert",
  "app_store_subscription_renew", "app_update", "app_upgrade", "dynamic_link_app_open", "dynamic_link_app_update",
  "dynamic_link_first_open", "error", "first_open", "first_visit", "in_app_purchase", "notification_dismiss", "notification_foreground",
  "notification_open", "notification_receive", "os_update", "screen_view", "session_start", "session_start_with_rollout", "user_engagement"];
const GA4_NAME = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
const ALLOWED_PARAMETERS = ["estimator_variant", "page_language", "service_category", "package_id", "billing_type", "currency"];

test("Every payload respects GA4 naming limits and contains no personal, free-text, amount or identifier value", () => {
  const { sent, tracker } = recorder();
  tracker.commit(estimateFor());
  act(tracker, estimateFor({ need: REPAIR_NEED, repair: { issue: "outage" } }));
  for (const [category, { packages }] of Object.entries(SERVICE_PACKAGES)) {
    for (const pack of packages) act(tracker, estimateFor({ need: SERVICE_PACKAGE_NEEDS[category], packages: { [category]: pack.id } }));
  }
  act(tracker, estimateFor({ need: null, content: "social", social: { plan: "croissance", networks: ["Instagram"], setupAudit: true } }));
  assert.ok(sent.length >= 14);
  const serialized = JSON.stringify(sent);
  for (const forbidden of ["client-private", "token", "hunter2", "Secret", "@", "http", "Indépendant", "Être visible", "390", "790", "€"]) {
    assert.ok(!serialized.includes(forbidden), forbidden);
  }
  for (const [name, params] of sent) {
    assert.match(name, GA4_NAME);
    assert.ok(!RESERVED_PREFIXES.some((prefix) => name.startsWith(prefix)) && !RESERVED_EVENTS.includes(name), name);
    assert.ok(Object.keys(params).length <= 25);
    for (const [key, value] of Object.entries(params)) {
      assert.ok(ALLOWED_PARAMETERS.includes(key), `unexpected parameter ${key}`);
      assert.match(key, GA4_NAME);
      assert.equal(typeof value, "string");
      assert.match(value, /^[a-z][a-z0-9_]{0,39}$|^EUR$/);
    }
    // No hand-made user, client, session or instance identifier: GA4 counts users itself.
    // (package_id identifies an offer, not a person.)
    assert.ok(!Object.keys(params).some((key) => /user|client|session|visitor|instance|device|uid|cid|email|name|url|value|price|amount/i.test(key)));
  }
  assert.ok(sent.filter(([name]) => name === ESTIMATOR_EVENTS.priceView).every(([, params]) => params.currency === PRICE_VIEW_CURRENCY));
});

test("Unknown variants or languages fall back to safe enumerated values", () => {
  const sent = [];
  const tracker = createEstimatorTracker({ variant: "user@example.com", language: "https://x", send: (...args) => sent.push(args) });
  tracker.noteInteraction();
  assert.deepEqual(sent, [[ESTIMATOR_EVENTS.open, { estimator_variant: "main", page_language: "fr" }]]);
  assert.deepEqual(getPricedItems(null), []);
  assert.deepEqual(getPricedItems({ project: { kind: "package", category: "seo", packageId: "Évil value", billing: "fixed", price: 1 } }), []);
});
