export const getQuoteReference = (request, quote) =>
  `${request?.reference || "DL-2026-0000"}-V${quote?.version || 1}`;
