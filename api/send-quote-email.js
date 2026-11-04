// Disabled in LOT SEC-EMAIL-02 (same decision as LOT SEC-EMAIL-01, never merged).
//
// The previous version let any anonymous caller send a "Votre devis Digital Lab est prêt" e-mail
// from the Digital Lab domain to ANY address given in the request (clientEmail), with a link built
// from the untrusted Host header, without authentication or rate limit. It was not called by the
// site, the client area, the admin area or any workflow.
//
// This handler sends nothing: it reads neither the request body nor any environment variable,
// calls no external service and answers 410 Gone to every method.
//
// Before ANY quote notification is re-enabled (separate LOT, separate review), the new route must:
// - verify a Supabase session server-side and require the admin role;
// - load the recipient and the quote from the database by quoteId (never from the request);
// - build links from a configured, validated canonical origin (never from Host);
// - rate limit and return no provider details to the caller.
// The previous implementation is only available in Git history (before LOT SEC-EMAIL-02).

export default function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  return response.status(410).json({ ok: false, error: "gone" });
}
