// Single source of truth for the tax mention shown next to every public price
// (one-off projects, subscriptions, Reels). Digital Lab's VAT regime is NOT
// confirmed yet: keep TAX_REGIME at null until the owner validates it. While it
// is null, prices render without any tax mention and `npm run check:release`
// fails, which blocks publication.
//
// Allowed values: "HT", "TTC", "FRANCHISE" (TVA non applicable, art. 293 B du CGI).
export const TAX_REGIME = null;

export const TAX_MENTIONS = {
  HT: {
    short: "HT",
    shortEn: "excl. VAT",
    note: "Prix indiqués hors taxes, TVA en sus au taux en vigueur.",
    noteEn: "Prices exclude VAT, which is added at the applicable rate.",
  },
  TTC: {
    short: "TTC",
    shortEn: "incl. VAT",
    note: "Prix indiqués toutes taxes comprises.",
    noteEn: "Prices include all taxes.",
  },
  FRANCHISE: {
    short: "",
    shortEn: "",
    note: "TVA non applicable, art. 293 B du CGI.",
    noteEn: "VAT not applicable (French tax code, art. 293 B).",
  },
};

export function getTaxMention(regime = TAX_REGIME) {
  const mention = TAX_MENTIONS[regime];

  return mention
    ? { confirmed: true, regime, ...mention }
    : { confirmed: false, regime: null, short: "", shortEn: "", note: "", noteEn: "" };
}
