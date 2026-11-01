// Single source of truth for the tax mention shown next to public prices
// (LOT SM-01). Digital Lab's VAT regime is NOT confirmed yet: keep
// TAX_REGIME at null until the owner validates it. While it is null, prices
// render without any tax mention and `npm run check:release` fails, which
// blocks publication of the social media offer.
//
// Allowed values: "HT", "TTC", "FRANCHISE" (TVA non applicable, art. 293 B du CGI).
export const TAX_REGIME = null;

export const TAX_MENTIONS = {
  HT: {
    short: "HT",
    note: "Prix indiqués hors taxes, TVA en sus au taux en vigueur.",
  },
  TTC: {
    short: "TTC",
    note: "Prix indiqués toutes taxes comprises.",
  },
  FRANCHISE: {
    short: "",
    note: "TVA non applicable, art. 293 B du CGI.",
  },
};

export function getTaxMention(regime = TAX_REGIME) {
  const mention = TAX_MENTIONS[regime];

  return mention
    ? { confirmed: true, regime, ...mention }
    : { confirmed: false, regime: null, short: "", note: "" };
}
