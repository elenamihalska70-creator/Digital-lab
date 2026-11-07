import assert from "node:assert/strict";
import test from "node:test";
import { buildMailtoHref, buildQuoteEmailBody, buildQuoteMailto, QUOTE_MAILTO_MAX_LENGTH } from "./quoteMailto.js";

const TO = "contact@digitallab.studio";

// Shapes produced by buildEstimateRequest (src/App.jsx): amounts are already formatted strings.
const frRequest = {
  message: "Bonjour, je souhaite un devis pour : gestion des réseaux sociaux (formule Visibilité) + Pack 4 Reels / mois. Mon activité : ",
  summary: [
    "Abonnement réseaux sociaux — formule Visibilité",
    "8 publications/mois · 2 réseaux (Instagram, Facebook) · 4 Reels/mois",
    "Tarif de lancement : 290 €/mois pendant 3 mois (5 premiers clients), puis 390 €/mois",
    "Reels — Pack 4 Reels / mois : 320 €/mois",
    "Audit de départ et mise en place (une seule fois) : 150 €",
    "Premier mois (abonnement + frais de mise en place) : 760 €",
    "Estimation indicative, à confirmer par devis.",
  ].join("\n"),
};

const enRequest = {
  message: "Hello, I'd like a quote for: Create a website + social media management (Visibility plan). My business: ",
  summary: [
    "One-off project : Create a website",
    "Project estimate : from €1,150 · timeline 2–3 weeks · level Intermediate",
    "Social media subscription — Visibility plan",
    "Price : €390/month",
    "Indicative estimate, to be confirmed by a quote.",
  ].join("\n"),
};

// Decodes one raw query component exactly once (a mail client does the same).
const decodeRaw = (href, key) => {
  const match = href.match(new RegExp(`[?&]${key}=([^&]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

test("FR: the mailto targets the contact address and carries the full summary unchanged", () => {
  const mail = buildQuoteMailto({ to: TO, request: frRequest, taxNote: "TVA non applicable, art. 293 B du CGI." });

  assert.ok(mail.href.startsWith(`mailto:${TO}?subject=`));
  assert.equal(mail.fitsInMailto, true);
  assert.equal(decodeRaw(mail.href, "subject"), "Demande de devis Digital Lab");

  const body = decodeRaw(mail.href, "body");
  assert.equal(body.replace(/\r\n/g, "\n"), mail.body);
  for (const line of frRequest.summary.split("\n")) assert.ok(body.includes(line), `missing line: ${line}`);
  assert.ok(body.includes("290 €/mois") && body.includes("760 €"), "amounts copied as formatted by the engine");
  assert.ok(body.includes("TVA non applicable, art. 293 B du CGI."));
  assert.ok(body.includes("— Récapitulatif du simulateur —"));
});

test("EN: English texts, euro amounts and tax note", () => {
  const mail = buildQuoteMailto({ to: TO, request: enRequest, isEnglish: true, taxNote: "VAT not applicable (French tax code, art. 293 B)." });

  assert.equal(decodeRaw(mail.href, "subject"), "Digital Lab quote request");
  const body = decodeRaw(mail.href, "body");
  assert.ok(body.startsWith("Hello, I'd like a quote for:"));
  assert.ok(body.includes("from €1,150") && body.includes("€390/month"));
  assert.ok(body.includes("— Estimator summary —"));
  assert.ok(body.includes("VAT not applicable (French tax code, art. 293 B)."));
});

test("Encoding: accents, €, ·, —, &, ?, # and line breaks survive a round trip; no raw separators", () => {
  const tricky = { message: "Café & co ? #1 — été", summary: "Ligne 1 · 1 150 €\nLigne 2 : 100% = ok" };
  const mail = buildQuoteMailto({ to: TO, request: tricky });
  const query = mail.href.slice(mail.href.indexOf("?") + 1);

  assert.equal(query.split("&").length, 2, "only subject and body parameters");
  assert.doesNotMatch(query, /[\s#€·—é]/u, "everything is percent-encoded");
  assert.ok(mail.href.includes("%0D%0A"), "CRLF line breaks (RFC 6068)");
  assert.equal(decodeRaw(mail.href, "body").replace(/\r\n/g, "\n"), mail.body);
  assert.ok(decodeRaw(mail.href, "body").includes("100% = ok"), "a literal % is encoded, not interpreted");
});

test("No tax note when the regime gives none", () => {
  const body = buildQuoteEmailBody({ request: frRequest, taxNote: "" });
  assert.doesNotMatch(body, /TVA/);
});

test("Long request: short mailto fallback, the full text stays available for copying", () => {
  const longRequest = { ...frRequest, summary: Array.from({ length: 60 }, (_, i) => `Option détaillée n°${i + 1} : 1 234 €/mois`).join("\n") };
  const mail = buildQuoteMailto({ to: TO, request: longRequest });

  assert.equal(mail.fitsInMailto, false);
  assert.ok(mail.href.length <= QUOTE_MAILTO_MAX_LENGTH, `fallback href length ${mail.href.length}`);
  assert.equal(decodeRaw(mail.href, "subject"), "Demande de devis Digital Lab");
  assert.match(decodeRaw(mail.href, "body"), /trop long/);
  for (const line of longRequest.summary.split("\n")) assert.ok(mail.body.includes(line), "copy text keeps every line");
});

test("The limit is applied to the complete URL", () => {
  const mail = buildQuoteMailto({ to: TO, request: frRequest });
  const exact = buildQuoteMailto({ to: TO, request: frRequest, maxLength: mail.href.length });
  const below = buildQuoteMailto({ to: TO, request: frRequest, maxLength: mail.href.length - 1 });

  assert.equal(exact.fitsInMailto, true);
  assert.equal(below.fitsInMailto, false);
});

test("buildMailtoHref without body", () => {
  assert.equal(buildMailtoHref({ to: TO, subject: "Discuter d’un projet" }), `mailto:${TO}?subject=Discuter%20d%E2%80%99un%20projet`);
});
