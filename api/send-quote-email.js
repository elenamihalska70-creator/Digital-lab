// LOT SEC-EMAIL-02 — permanent shutdown of the legacy quote email relay.
// The old endpoint accepted an arbitrary clientEmail and could send mail
// without server-side authorization. Quote notifications require a separate,
// reviewed implementation before they can be enabled again.
//
// Never inspect request data, environment variables, or call external services.
export default function handler(_request, response) {
  response.setHeader("Cache-Control", "no-store");
  return response.status(410).json({ ok: false, error: "gone" });
}
