import assert from "node:assert/strict";
import test from "node:test";
import { getTaxMention, TAX_REGIME } from "./taxMention.js";

// LOT WEB-SM-CONTACT-RELEASE-01: franchise en base confirmed by the owner. Changing the regime
// must be a deliberate change of this test too.
test("VAT regime is the confirmed franchise en base (art. 293 B du CGI)", () => {
  assert.equal(TAX_REGIME, "FRANCHISE");
  assert.deepEqual(getTaxMention(), {
    confirmed: true,
    regime: "FRANCHISE",
    short: "",
    shortEn: "",
    note: "TVA non applicable, art. 293 B du CGI.",
    noteEn: "VAT not applicable (French tax code, art. 293 B).",
  });
});

test("An unknown or empty regime stays unconfirmed", () => {
  assert.deepEqual(getTaxMention(null), { confirmed: false, regime: null, short: "", shortEn: "", note: "", noteEn: "" });
  assert.equal(getTaxMention("unknown").confirmed, false);
});

test("Each allowed regime yields its price suffix and note", () => {
  assert.equal(getTaxMention("HT").short, "HT");
  assert.equal(getTaxMention("TTC").short, "TTC");
  const franchise = getTaxMention("FRANCHISE");
  assert.equal(franchise.short, "");
  assert.equal(franchise.note, "TVA non applicable, art. 293 B du CGI.");
});

test("Every regime has French and English labels", () => {
  for (const regime of ["HT", "TTC", "FRANCHISE"]) {
    const mention = getTaxMention(regime);
    assert.equal(typeof mention.shortEn, "string");
    assert.ok(mention.note.length > 0 && mention.noteEn.length > 0, regime);
  }
  assert.equal(getTaxMention("HT").shortEn, "excl. VAT");
});
