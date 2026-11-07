// LOT WEB-CONTACT-SIMPLE-01 — permanent shutdown of the legacy contact email relay.
// The public contact form was replaced by direct e-mail (mailto + copy address), so nothing calls
// this route any more. It used to forward the request body by e-mail to contact@, which anyone
// could abuse. Same pattern as api/send-quote-email.js (LOT SEC-EMAIL-02).
//
// Never inspect request data, environment variables, or call external services.
export default function handler(_request, response) {
  response.setHeader("Cache-Control", "no-store");
  return response.status(410).json({ ok: false, error: "gone" });
}
