import assert from "node:assert/strict";
import test from "node:test";
import { getUnifiedEstimate, getProjectEstimate } from "./estimator.js";
import { getDiagnosticEstimate, INITIAL_REPAIR_DIAGNOSTIC, REPAIR_NEED } from "./repairDiagnostic.js";
import { WEBSITE_NEED } from "./websitePricing.js";
import { buildQuoteMailto, QUOTE_MAILTO_MAX_LENGTH } from "./quoteMailto.js";
import { getTaxMention } from "../config/taxMention.js";
import {
  SERVICE_PACKAGES, SERVICE_PACKAGE_NEEDS, INITIAL_SERVICE_PACKAGE_CHOICES, getCatalogEstimate, getServicePackageEstimate,
  getServicePackage, getServicePackageSummary, getServicePackageTerms, formatPackagePrice, isServicePackageNeed, SERVICE_PACKAGE_TIMING,
} from "./servicePackages.js";

// Independent literals: the owner-approved V4 matrix. Never read back from the configuration.
const APPROVED = {
  seo: [["essential", "SEO Essentiel", 190, "fixed"], ["visibility", "SEO Visibilité", 390, "fixed"], ["development", "SEO Développement", 700, "from"]],
  automation: [["essential", "Automatisation Essentielle", 190, "fixed"], ["business", "Automatisation Business", 490, "fixed"], ["advanced", "Automatisation Avancée", 950, "from"]],
  chatbot: [["essential", "Chatbot Essentiel", 390, "fixed"], ["business", "Chatbot Business", 790, "fixed"], ["advanced", "Chatbot Avancé", null, "quote"]],
  prototype: [["discovery", "Prototype Découverte", 490, "fixed"], ["functional", "Prototype Fonctionnel", 990, "fixed"], ["mvp", "MVP sur mesure", null, "quote"]],
};
// English labels exactly as shown by the estimator (App.jsx estimatorNeedOptions).
const NEEDS_EN = {
  seo: "Optimize SEO & visibility", automation: "Add an automation",
  chatbot: "Create an AI chatbot / assistant", prototype: "Create an MVP or web prototype",
};
const NEEDS = {
  seo: "Optimiser SEO & visibilité", automation: "Ajouter une automatisation",
  chatbot: "Créer un chatbot / assistant IA", prototype: "Créer un MVP ou prototype web",
};
const COMPLEXITIES = ["Simple : page ou fonctionnalité basique", "Standard : plusieurs pages ou plusieurs fonctions", "Avancé : espace utilisateur, tableau de bord, automatisation ou IA"];
const CONTENTS = ["Textes et images prêts", "Quelques éléments seulement", "Je pars de zéro"];
const URGENCIES = ["Normal", "Rapide", "Urgent"];
const FEATURE_SETS = [[], ["SEO"], ["Formulaire de contact", "Maintenance"], ["Paiement", "Chatbot", "Tableau de bord", "Google Sheets / CRM", "Réservation", "Email automatique", "SEO", "Maintenance", "Formulaire de contact"]];
const base = { profile: "Indépendant", priority: "Être visible", existing: "Non", pages: 1 };
const euro = amount => String(amount) + " €";

test("V4 price contract: exact owner-approved matrix, names and billing types", () => {
  assert.deepEqual(SERVICE_PACKAGE_NEEDS, NEEDS);
  assert.deepEqual(
    Object.fromEntries(Object.entries(SERVICE_PACKAGES).map(([key, category]) => [key, category.packages.map(p => [p.id, p.name.fr, p.price, p.billing])])),
    APPROVED,
  );
  assert.deepEqual(INITIAL_SERVICE_PACKAGE_CHOICES, { seo: "essential", automation: "essential", chatbot: "essential", prototype: "discovery" });
  for (const category of Object.values(SERVICE_PACKAGES)) for (const pack of category.packages) {
    assert.equal(pack.price === null, pack.billing === "quote", pack.id);
    assert.ok(Object.isFrozen(pack) && Object.isFrozen(pack.includes.fr), "configuration must be immutable");
  }
});

test("Workload targets stay internal: kept in the config, never in an estimate or a quote summary", () => {
  const workloads = Object.fromEntries(Object.entries(SERVICE_PACKAGES).map(([key, c]) => [key, c.packages.map(p => p.workload)]));
  assert.deepEqual(workloads, {
    seo: [{ max: 3 }, { max: 7 }, { approx: 12 }],
    automation: [{ max: 3 }, { max: 8 }, { approx: 15 }],
    chatbot: [{ min: 5, max: 6 }, { min: 10, max: 12 }, null],
    prototype: [{ min: 6, max: 7 }, { min: 14, max: 16 }, null],
  });
  for (const isEnglish of [false, true]) for (const [category, packages] of Object.entries(APPROVED)) for (const [id] of packages) {
    const project = getServicePackageEstimate(NEEDS[category], id);
    assert.equal("workload" in project, false);
    const text = getServicePackageSummary(project, { isEnglish, formatPrice: euro, profile: "Autre", priority: "Autre", existing: "Non" }).join("\n");
    assert.doesNotMatch(text, /workload|charge (de travail|indicative)|\bheures?\b|\bhours?\b|\d\s*h\b/i, text);
  }
});

test("No delivery deadline is promised: timing is confirmed after assessing the project", () => {
  assert.deepEqual(SERVICE_PACKAGE_TIMING, {
    label: { fr: "Délai", en: "Timing" },
    value: { fr: "Confirmé après analyse du projet", en: "Confirmed after assessing the project" },
  });
  for (const [category, packages] of Object.entries(APPROVED)) for (const [id] of packages) {
    assert.equal(getServicePackageEstimate(NEEDS[category], id).delay, null);
  }
  const allText = JSON.stringify(SERVICE_PACKAGES);
  assert.doesNotMatch(allText, /jours ouvrés|business days|semaines|weeks|sous \d|within \d|48 ?h|24 ?h/i);
});

test("Generic answers never change a package price (no 250/120/300/650 or urgency surcharges)", () => {
  let checked = 0;
  for (const [category, packages] of Object.entries(APPROVED)) for (const [id, , price, billing] of packages) {
    for (const complexity of COMPLEXITIES) for (const content of CONTENTS) for (const urgency of URGENCIES) for (const features of FEATURE_SETS) {
      const project = { ...base, need: NEEDS[category], complexity, content, urgency, features };
      const { project: result } = getCatalogEstimate({ project, packageChoices: { [category]: id } });
      assert.deepEqual([result.kind, result.packageId, result.price, result.billing, result.delay], ["package", id, price, billing, null]);
      checked += 1;
    }
  }
  assert.equal(checked, 12 * 3 * 3 * 3 * 4);
  // The exact amounts the generic engine would have produced are never shown for a 190 EUR package.
  for (const category of ["seo", "automation"]) {
    const worst = { ...base, need: NEEDS[category], complexity: COMPLEXITIES[2], content: CONTENTS[1], urgency: "Urgent", features: FEATURE_SETS[3] };
    const generic = getProjectEstimate(worst).budget;
    assert.notEqual(generic, 190);
    const v4 = getCatalogEstimate({ project: worst, packageChoices: { [category]: "essential" } }).project.price;
    assert.equal(v4, 190);
    for (const forbidden of [440, 560, generic]) assert.notEqual(v4, forbidden);
  }
});

test("Unknown or missing package ids fall back to the smallest package, never to a generic price", () => {
  for (const [category, packages] of Object.entries(APPROVED)) {
    for (const choice of [undefined, "", "unknown", "__proto__"]) {
      const result = getServicePackageEstimate(NEEDS[category], choice);
      assert.equal(result.packageId, packages[0][0]);
      assert.equal(result.price, packages[0][2]);
    }
  }
  assert.throws(() => getServicePackageEstimate(WEBSITE_NEED, "essential"), /Not a package-based service/);
  assert.throws(() => getServicePackage("website"), /Unknown service package category/);
  assert.equal(isServicePackageNeed(WEBSITE_NEED), false);
  assert.equal(isServicePackageNeed(REPAIR_NEED), false);
});

test("Website, repair, Social Media and Reels results are byte-identical to the existing engine", () => {
  const website = { ...base, need: WEBSITE_NEED, pages: 3, complexity: COMPLEXITIES[1], content: CONTENTS[2], urgency: "Rapide", features: ["Paiement"] };
  const repair = { ...INITIAL_REPAIR_DIAGNOSTIC, issue: "button", intervention: "targeted", platform: "wordpress", scope: "local", urgency: "normal" };
  const cases = [
    { project: website },
    { project: { ...website, need: REPAIR_NEED }, repair },
    { project: null, contentService: "social", social: { plan: "croissance", networks: ["Instagram", "Facebook", "LinkedIn"], extraPosts: 4, extraReels: 2, setupAudit: true } },
    ...["single", "pack4", "pack8", "complex"].map(reels => ({ project: null, contentService: "reels", reels })),
    { project: website, contentService: "social", social: { plan: "presence", networks: [], setupAudit: false } },
  ];
  for (const options of cases) {
    assert.deepEqual(getCatalogEstimate({ ...options, packageChoices: { seo: "development" } }), getDiagnosticEstimate(options));
  }
  // 3-page package 590 + creation from scratch 300 + payments 350, x1.1 "Rapide", rounded up to the euro.
  assert.equal(getCatalogEstimate({ project: website }).project.budget, 1364);
  assert.equal(getCatalogEstimate({ project: { ...website, need: REPAIR_NEED }, repair }).project.price, 70);
});

test("Packages add no subscription, recurring charge or first-month amount", () => {
  for (const category of Object.keys(APPROVED)) {
    const estimate = getCatalogEstimate({ project: { ...base, need: NEEDS[category], features: [] } });
    assert.equal(estimate.recurring, null);
    assert.equal(estimate.firstMonth, null);
    assert.deepEqual(estimate.oneTimeFees, []);
    assert.equal(estimate.onQuote, false);
    // Combined with Social Media, the first month stays subscription + set-up only.
    const combined = getCatalogEstimate({ project: { ...base, need: NEEDS[category], features: [] }, contentService: "social", social: { plan: "visibilite", networks: [], setupAudit: true } });
    const socialOnly = getUnifiedEstimate({ contentService: "social", social: { plan: "visibilite", networks: [], setupAudit: true } });
    assert.deepEqual(combined.firstMonth, socialOnly.firstMonth);
    assert.deepEqual(combined.recurring, socialOnly.recurring);
  }
});

test("Price labels distinguish fixed-scope, starting and on-quote packages in FR and EN", () => {
  const label = (category, id, isEnglish) => formatPackagePrice(getServicePackage(category, id), { isEnglish, formatPrice: euro });
  assert.equal(label("seo", "essential"), "190 €");
  assert.equal(label("seo", "development"), "dès 700 €");
  assert.equal(label("automation", "advanced", true), "from 950 €");
  assert.equal(label("chatbot", "advanced"), "sur devis");
  assert.equal(label("prototype", "mvp", true), "on quote");
});

test("FR/EN deliverables, limits and exclusions stay complete and accessible", () => {
  for (const [category, { packages }] of Object.entries(SERVICE_PACKAGES)) for (const pack of packages) {
    assert.ok(pack.name.fr && pack.name.en);
    assert.ok(pack.includes.fr.length > 0);
    assert.equal(pack.includes.fr.length, pack.includes.en.length, pack.id);
    assert.equal(pack.limits.fr.length, pack.limits.en.length, pack.id);
    assert.equal(getServicePackageTerms(category).length, getServicePackageTerms(category, true).length);
  }
  const terms = (category, en = false) => getServicePackageTerms(category, en).join(" ");
  assert.match(terms("seo"), /jamais facturé deux fois/);
  assert.match(terms("automation", true), /Paid tools, hosting, AI usage and ongoing maintenance are not included/);
  assert.match(terms("chatbot"), /Jetons d’API IA, abonnements tiers, hébergement et maintenance sont distincts/);
  assert.match(terms("chatbot", true), /error-free responses are not guaranteed/);
  for (const category of Object.keys(APPROVED)) {
    assert.match(terms(category), /devis personnalisé.*Aucun abonnement ni frais récurrent/);
  }
  assert.match(getServicePackage("prototype", "discovery").limits.fr[0], /Sans backend de production, authentification ni paiement réel/);
  assert.match(getServicePackage("prototype", "functional").limits.en[0], /Not a production-ready SaaS/);
  assert.match(getServicePackage("chatbot", "advanced").limits.fr[0], /sécurité individuelle/);
  assert.match(getServicePackage("seo", "development").limits.fr[0], /confirmés après diagnostic/);
  assert.match(getServicePackage("automation", "advanced").limits.en[0], /confirmed after assessment/);
  const allText = JSON.stringify(SERVICE_PACKAGES);
  assert.doesNotMatch(allText, /garanti[e]? sans erreur|guaranteed error-free|100 ?%/i);
});

test("Complete quote e-mail (deliverables, price, accents) fits the percent-encoded mailto limit for every package", () => {
  const tax = getTaxMention();
  assert.equal(tax.regime, "FRANCHISE");
  // Same formatting as the site: French amounts use a non-breaking space before the euro sign.
  const sitePrice = isEnglish => amount => isEnglish ? "€" + amount : amount + "\u00a0€";
  // Every real context label (App.jsx estimatorProfileOptions / PriorityOptions / ExistingOptions);
  // the one with the longest percent-encoded form is used, so the limit is checked against the worst case.
  const CONTEXT = {
    fr: {
      profile: ["Indépendant", "Association", "Commerce local", "Restaurant / service", "Projet en création", "Autre"],
      priority: ["Être visible", "Recevoir plus de demandes", "Gagner du temps", "Réparer un site existant", "Tester une idée", "Automatiser une tâche"],
      existing: ["Oui", "Non", "Partiellement"],
    },
    en: {
      profile: ["Freelancer / independent", "Nonprofit / association", "Local shop", "Restaurant / service business", "Project in the works", "Other"],
      priority: ["Get found online", "Get more inquiries", "Save time", "Fix an existing site", "Test an idea", "Automate a task"],
      existing: ["Yes", "No", "Partially"],
    },
  };
  const longestEncoded = list => list.reduce((a, b) => (encodeURIComponent(b).length > encodeURIComponent(a).length ? b : a));
  let worst = 0;
  for (const isEnglish of [false, true]) for (const [category, packages] of Object.entries(APPROVED)) for (const [id, , price] of packages) {
    const lang = isEnglish ? "en" : "fr";
    const pack = getServicePackage(category, id);
    const project = getServicePackageEstimate(NEEDS[category], id);
    const context = CONTEXT[lang];
    const lines = getServicePackageSummary(project, {
      isEnglish, formatPrice: sitePrice(isEnglish),
      profile: longestEncoded(context.profile), priority: longestEncoded(context.priority), existing: longestEncoded(context.existing),
    });
    const summary = lines.join("\n");
    assert.ok(lines[0].startsWith(`${isEnglish ? "Package" : "Forfait"} : ${pack.name[lang]} — `), lines[0]);
    if (price !== null) assert.ok(lines[0].includes(sitePrice(isEnglish)(price)), lines[0]);
    else assert.match(lines[0], isEnglish ? /on quote/ : /sur devis/);
    // Necessary customer information is kept: every deliverable, every limit, the exclusions and timing.
    for (const item of [...pack.includes[lang], ...pack.limits[lang], ...SERVICE_PACKAGES[category].terms.map(term => term[lang])]) {
      assert.ok(summary.includes(item), item);
    }
    assert.ok(summary.includes(`${SERVICE_PACKAGE_TIMING.label[lang]} : `));
    assert.doesNotMatch(summary, /Complexité|Complexity|Urgence|Urgency|Contenus|jours ouvrés|business days/);
    // Same opening message and closing lines as the estimator's quote request (App.jsx buildEstimateRequest).
    const need = isEnglish ? NEEDS_EN[category] : NEEDS[category];
    const email = buildQuoteMailto({
      to: "contact@digitallab.studio", isEnglish, taxNote: isEnglish ? tax.noteEn : tax.note,
      request: {
        message: isEnglish ? `Hello, I'd like a quote for: ${need} — ${pack.name.en}. My business: ` : `Bonjour, je souhaite un devis pour : ${need} — ${pack.name.fr}. Mon activité : `,
        summary: [
          `${isEnglish ? "One-off project" : "Projet ponctuel"} : ${need}`, ...lines,
          isEnglish ? "Project billed according to its own quote (deposit and instalments), separate from the subscription." : "Projet facturé selon son devis (acompte et échéances), hors premier mois d’abonnement.",
          isEnglish ? "Indicative estimate, to be confirmed by a quote." : "Estimation indicative, à confirmer par devis.",
        ].join("\n"),
      },
    });
    assert.ok(email.body.includes(isEnglish ? "VAT not applicable" : "TVA non applicable"));
    // The limit applies to the real percent-encoded URI, which is much longer than the raw text.
    assert.ok(email.href.length > email.body.length);
    assert.equal(email.fitsInMailto, true, `${category}/${id}/${lang} encoded length ${email.href.length}`);
    assert.ok(email.href.length <= QUOTE_MAILTO_MAX_LENGTH);
    // Lossless UTF-8 round trip: accents, typographic apostrophes, € and non-breaking spaces survive.
    const body = new URLSearchParams(email.href.slice(email.href.indexOf("?") + 1)).get("body");
    assert.equal(body.replace(/\r\n/g, "\n"), email.body);
    if (!isEnglish) assert.match(body, /é.*’|’.*é/s);
    worst = Math.max(worst, email.href.length);
  }
  // Keep a safety margin so a small copy edit fails here rather than silently falling back to copy/paste.
  assert.ok(worst <= QUOTE_MAILTO_MAX_LENGTH - 25, `worst encoded mailto length ${worst}`);
});
