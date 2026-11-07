// LOT WEB-SM-CONTACT-RELEASE-01 — e-mail version of the estimator quote request.
// The estimator summary (services, options, amounts already formatted by the pricing engine) is
// copied as is: this module never recomputes or rounds a price. It only builds the e-mail text and
// a mailto: link, with a short fallback link when the full text would make the URL too long.

// Conservative limit for the whole mailto: URL. Some mail handlers (notably on Windows) truncate or
// refuse links of about 2 000 characters; beyond this limit the visitor copies the summary instead.
export const QUOTE_MAILTO_MAX_LENGTH = 1900;

const copy = {
  fr: {
    subject: "Demande de devis Digital Lab",
    summaryTitle: "— Récapitulatif du simulateur —",
    footer: "Envoyé depuis le simulateur de digitallab.studio.",
    shortBody:
      "Bonjour,\n\nLe récapitulatif de mon estimation est trop long pour être ajouté automatiquement : je le colle ci-dessous.\n\n",
  },
  en: {
    subject: "Digital Lab quote request",
    summaryTitle: "— Estimator summary —",
    footer: "Sent from the digitallab.studio estimator.",
    shortBody:
      "Hello,\n\nMy estimate summary is too long to be added automatically, so I am pasting it below.\n\n",
  },
};

/** RFC 6068: line breaks are CRLF and every component is percent-encoded (UTF-8). */
export const buildMailtoHref = ({ to, subject, body }) => {
  const params = [`subject=${encodeURIComponent(subject)}`];

  if (body) {
    params.push(`body=${encodeURIComponent(body.replace(/\r?\n/g, "\r\n"))}`);
  }

  return `mailto:${to}?${params.join("&")}`;
};

/** Full plain-text e-mail: the visitor's opening line, the estimator summary and the tax note. */
export const buildQuoteEmailBody = ({ request, isEnglish = false, taxNote = "" }) => {
  const text = isEnglish ? copy.en : copy.fr;
  const parts = [String(request?.message ?? "").trimEnd(), "", text.summaryTitle, String(request?.summary ?? "").trim()];

  if (taxNote) {
    parts.push(taxNote);
  }

  parts.push("", text.footer);
  return parts.join("\n");
};

/**
 * { to, subject, body, href, fitsInMailto }.
 * `body` is always the complete text (used for the copy action). When the complete mailto: URL
 * exceeds `maxLength`, `href` carries only the subject and a short invitation to paste the summary.
 */
export const buildQuoteMailto = ({ to, request, isEnglish = false, taxNote = "", maxLength = QUOTE_MAILTO_MAX_LENGTH }) => {
  const text = isEnglish ? copy.en : copy.fr;
  const subject = text.subject;
  const body = buildQuoteEmailBody({ request, isEnglish, taxNote });
  const fullHref = buildMailtoHref({ to, subject, body });
  const fitsInMailto = fullHref.length <= maxLength;

  return {
    to,
    subject,
    body,
    fitsInMailto,
    href: fitsInMailto ? fullHref : buildMailtoHref({ to, subject, body: text.shortBody }),
  };
};
