import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getUnifiedEstimate } from "./estimator.js";
import { getTaxMention } from "../config/taxMention.js";
import { buildQuoteMailto } from "./quoteMailto.js";
import { getEffectiveProjectAnswers } from "./estimatorAnswers.js";
import { verifyPricingLock } from "../../scripts/pricing-lock.mjs";
import {
  REPAIR_NEED, REPAIR_CATEGORIES, REPAIR_QUESTIONS, INITIAL_REPAIR_DIAGNOSTIC, getRepairEstimate,
  getDiagnosticEstimate, getRepairSummary, needsRepairScope, containsObviousSecret, validateRepairDetails,
} from "./repairDiagnostic.js";

const simple = { ...INITIAL_REPAIR_DIAGNOSTIC, issue: "button", intervention: "targeted", platform: "wordpress", scope: "local", urgency: "normal" };
const generic = { need: REPAIR_NEED, profile: "Indépendant", priority: "Être visible", existing: "Non", content: "Je pars de zéro", complexity: "Avancé : espace utilisateur, tableau de bord, automatisation ou IA", features: ["Paiement", "SEO"], urgency: "Urgent", pages: 5 };
const summary = (diagnostic, en = false, regime = "FRANCHISE") => getRepairSummary(diagnostic, {
  isEnglish: en, profile: en ? "Freelancer" : "Indépendant",
  formatPrice: amount => String(amount) + " EUR " + getTaxMention(regime)[en ? "shortEn" : "short"],
}).join("\n");

// Independent literals pin the approved commercial amounts, not values read back from the configuration.
test("Repair price contract: targeted 70 EUR and comprehensive 650 EUR, without urgency surcharges", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(REPAIR_CATEGORIES).map(([key, value]) => [key, value.price])), {
    small: 70, comprehensive: 650, technical: null, urgent: null,
  });
  for (const platform of ["wordpress", "hosted"]) for (const urgency of ["normal", "soon"]) {
    for (const issue of ["button", "display"]) {
      assert.equal(getRepairEstimate({ ...simple, issue, platform, urgency }).price, 70);
    }
    for (const issue of ["button", "display", "performance"]) {
      assert.equal(getRepairEstimate({ ...simple, issue, platform, urgency, intervention: "comprehensive" }).price, 650);
    }
  }
});

test("Repair commercial copy contract: FR/EN diagnosis, pre-work price confirmation and personalised quote", () => {
  for (const en of [false, true]) {
    const confirmation = en
      ? "The definitive price is confirmed after diagnosis, before work begins."
      : "Le prix définitif est confirmé après diagnostic, avant le début des travaux.";
    const small = summary(simple, en);
    assert.ok(small.includes(en ? "Indicative starting price for an eligible simple, targeted intervention" : "Prix de départ indicatif pour une intervention simple et ciblée éligible"));
    assert.ok(small.includes(en ? "limited to one hour of agreed work" : "limitée à une heure de travail convenue"));
    for (const diagnostic of [simple, { ...simple, intervention: "comprehensive" }, { ...simple, platform: "custom" }, { ...simple, issue: "outage" }]) {
      assert.ok(summary(diagnostic, en).includes(confirmation));
    }
    for (const diagnostic of [{ ...simple, platform: "custom" }, { ...simple, issue: "outage" }]) {
      assert.ok(summary(diagnostic, en).includes(en ? "request a personalised quote" : "demandez un devis personnalisé"));
    }
  }
});

test("Repair: exact commercial categories, no deadline or automatic extra fees", () => {
  for (const [patch, category, price] of [
    [{}, "small", 70], [{ issue: "display" }, "small", 70], [{ platform: "hosted" }, "small", 70],
    [{ intervention: "comprehensive", issue: "performance" }, "comprehensive", 650],
    [{ intervention: "several" }, "technical", null], [{ intervention: "unsure" }, "technical", null],
    [{ platform: "custom" }, "technical", null], [{ platform: "unknown" }, "technical", null],
    [{ issue: "performance" }, "technical", null], [{ issue: "other" }, "technical", null],
    [{ scope: "sensitive" }, "technical", null], [{ scope: "uncertain" }, "technical", null],
    [{ scope: "" }, "technical", null], [{ urgency: "soon" }, "small", 70],
    [{ issue: "outage", intervention: "comprehensive" }, "urgent", null],
    [{ urgency: "blocking", intervention: "comprehensive" }, "urgent", null],
  ]) {
    const result = getRepairEstimate({ ...simple, ...patch });
    assert.equal(result.category, category);
    assert.equal(result.price, price);
    assert.equal(result.delay, null);
    assert.equal(result.billing, price === null ? "quote" : "from");
    assert.ok(!("days" in result) && !("budget" in result));
  }
});

test("Repair: exhaustive structured choices prioritise critical cases and fail closed", () => {
  for (const [issue] of REPAIR_QUESTIONS.issue.options) for (const [intervention] of REPAIR_QUESTIONS.intervention.options)
    for (const [platform] of REPAIR_QUESTIONS.platform.options) for (const [urgency] of REPAIR_QUESTIONS.urgency.options)
      for (const scope of ["", "local", "sensitive", "uncertain"]) {
        const input = { ...simple, issue, intervention, platform, urgency, scope };
        const result = getRepairEstimate(input);
        if (issue === "outage" || urgency === "blocking") assert.equal(result.category, "urgent");
        else if (result.price === 70) {
          assert.ok(["button", "display"].includes(issue));
          assert.equal(intervention, "targeted"); assert.equal(scope, "local");
          assert.ok(["wordpress", "hosted"].includes(platform));
        } else if (result.price === 650) {
          assert.equal(intervention, "comprehensive");
          assert.ok(["button", "display", "performance"].includes(issue));
          assert.ok(["wordpress", "hosted"].includes(platform));
        } else assert.equal(result.category, "technical");
      }
  for (const key of ["issue", "intervention", "platform", "urgency"]) for (const value of ["", null, undefined, "unsupported", {}, 70]) {
    assert.equal(getRepairEstimate({ ...simple, [key]: value }).category, "technical");
  }
  assert.equal(getRepairEstimate().category, "technical");
  assert.equal(getRepairEstimate(null).category, "technical");
  assert.equal(getRepairEstimate({ issue: "outage" }).category, "urgent");
  assert.equal(getRepairEstimate({ urgency: "blocking" }).category, "urgent");
});

test("Repair adapter: no generic adjustments, no mutation, billing kept separate", () => {
  const frozen = Object.freeze({ ...simple });
  for (const urgency of ["Normal", "Rapide", "Urgent"]) for (const content of ["Textes et images prêts", "Je pars de zéro"]) {
    const estimate = getDiagnosticEstimate({ project: { ...generic, urgency, content }, repair: frozen, contentService: "social", social: { setupAudit: true } });
    const base = getUnifiedEstimate({ contentService: "social", social: { setupAudit: true } });
    assert.deepEqual(estimate.project, getRepairEstimate(simple));
    assert.deepEqual(estimate.firstMonth, base.firstMonth);
    assert.deepEqual(estimate.social, base.social);
    assert.deepEqual(estimate.oneTimeFees, base.oneTimeFees);
  }
  for (const reels of ["single", "pack4", "pack8", "complex"]) {
    const base = getUnifiedEstimate({ contentService: "reels", reels });
    const repair = getDiagnosticEstimate({ project: generic, repair: simple, contentService: "reels", reels });
    assert.deepEqual({ ...repair, project: null }, base);
  }
});

test("Repair adapter: website 390/590/890 and every other service remain byte-equivalent outputs", () => {
  for (const need of ["Créer un site web", "Optimiser SEO & visibilité", "Ajouter une automatisation", "Créer un chatbot / assistant IA", "Créer un MVP ou prototype web"])
    for (const pages of [1, 3, 5]) for (const contentService of ["none", "social", "reels"]) {
      const project = getEffectiveProjectAnswers({ ...generic, pages, content: "Quelques éléments seulement", features: [], urgency: "Normal" }, need);
      const input = { project, contentService };
      assert.deepEqual(getDiagnosticEstimate({ ...input, repair: simple }), getUnifiedEstimate(input));
      if (need === "Créer un site web") assert.equal(getDiagnosticEstimate(input).project.budget, { 1: 390, 3: 590, 5: 890 }[pages]);
    }
  assert.deepEqual(getDiagnosticEstimate(), getUnifiedEstimate());
  assert.equal(getDiagnosticEstimate({ project: generic, repair: {} }).onQuote, false);
});

test("Repair summary: FR/EN details, tax formatting, approval, no generic fields or fixed deadline", () => {
  const d = { ...simple, url: "https://example.com/problem", description: "A synthetic button does not work." };
  for (const en of [false, true]) for (const regime of ["FRANCHISE", "HT", "TTC"]) {
    const text = summary(d, en, regime);
    assert.ok(text.includes(d.url) && text.includes(d.description));
    assert.ok(text.includes(en ? "one hour of agreed work" : "une heure de travail convenue"));
    assert.ok(text.includes(en ? "No additional work without your prior approval" : "Aucun travail supplémentaire sans votre accord préalable"));
    assert.ok(text.includes(en ? "timeline will be confirmed after diagnosis" : "délai sera confirmé après diagnostic"));
    assert.ok(text.includes("70 EUR " + getTaxMention(regime)[en ? "shortEn" : "short"]));
    assert.doesNotMatch(text, /Complexité|Complexity|Contenus|Content:|Fonctionnalités|Features:|[0-9]–[0-9]/);
    const mail = buildQuoteMailto({ to: "synthetic@example.com", request: { message: "Quote", summary: text }, isEnglish: en, taxNote: getTaxMention(regime)[en ? "noteEn" : "note"] });
    assert.ok(mail.body.includes(text));
    assert.ok(mail.href.length <= 1900);
    assert.ok(!mail.fitsInMailto || new URL(mail.href).searchParams.get("body").includes(d.url));
  }
  const quote = summary({ ...d, urgency: "blocking" });
  assert.ok(quote.includes("sur devis")); assert.doesNotMatch(quote, /70 EUR|650 EUR/);
  const long = buildQuoteMailto({ to: "synthetic@example.com", request: { summary: summary({ ...d, description: "é".repeat(1500) }) } });
  assert.equal(long.fitsInMailto, false); assert.ok(long.body.includes("é".repeat(1500))); assert.ok(long.href.length <= 1900);
});

test("Conditional scope is relevant only for targeted display/button repairs and never leaks stale answers", () => {
  assert.equal(needsRepairScope(simple), true);
  for (const patch of [{ issue: "performance" }, { issue: "outage" }, { intervention: "comprehensive" }, { intervention: "unsure" }]) {
    const d = { ...simple, ...patch, scope: "sensitive" };
    assert.equal(needsRepairScope(d), false);
    assert.ok(!summary(d).includes("Paiement, accès au compte ou sécurité"));
  }
});

test("Privacy guard blocks obvious secrets, URL credentials/parameters, unsafe schemes and control characters", () => {
  for (const secret of ["password: synthetic-only", "mot de passe = synthetic-only", "mdp est synthetic-only", "API_KEY=synthetic-only", "Bearer synthetic-only", "sk-00000000000000000000", "ghp_00000000000000000000", "-----BEGIN PRIVATE KEY-----", "eyJabc.eyJdef.abcdef", "https://user:pass@example.com", "password%3Dsynthetic-only", "token：synthetic-only", "cookie=synthetic-only", "code d’accès: synthetic-only"]) {
    assert.equal(containsObviousSecret(secret), true, secret);
    const d = { ...simple, description: secret };
    assert.ok(validateRepairDetails(d).description);
    assert.throws(() => summary(d), /Unsafe repair details/);
  }
  for (const url of ["javascript:alert(1)", "file:///private", "https://example.com/?token=synthetic", "https://example.com/?x=1", "https://example.com/#private", "https://user@example.com", "http://localhost", "http://127.0.0.1", "http://192.168.1.2", "http://172.16.0.1", "https://example.internal", "example.com", "https://example.com/?"]) {
    assert.ok(validateRepairDetails({ url }).url, url);
    assert.throws(() => summary({ ...simple, url }), /Unsafe repair details/);
  }
  assert.deepEqual(validateRepairDetails({ url: "https://example.com/page", description: "My password reset button does not work." }), {});
  assert.deepEqual(validateRepairDetails(INITIAL_REPAIR_DIAGNOSTIC), {});
  assert.ok(validateRepairDetails({ description: "x".repeat(1501) }).description);
  assert.ok(validateRepairDetails({ description: "x\u0000" }).description);
  assert.ok(validateRepairDetails({ url: null }).url);
});

test("Existing price lock and engine/tax/mailto source stay unchanged", () => {
  const root = new URL("../../", import.meta.url);
  const lock = JSON.parse(readFileSync(new URL("docs/pricing-v3-lock.json", root), "utf8"));
  verifyPricingLock(lock, path => readFileSync(new URL(path, root), "utf8"));
});
