// Email sending is paused from the quote workflow until a professional domain/email is configured.
// This Edge Function is kept for future use and is not called by the current quote publish flow.
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Digital Lab <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type QuoteEmailPayload = {
  to: string;
  clientName?: string;
  quoteTitle?: string;
  quoteNumber?: string;
  totalTtc?: string | number;
  appUrl: string;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: string | number | undefined) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const buildEmailHtml = ({ clientName, quoteTitle, quoteNumber, totalTtc, appUrl }: QuoteEmailPayload) => {
  const safeClientName = escapeHtml(clientName || "Bonjour");
  const safeQuoteTitle = escapeHtml(quoteTitle);
  const safeQuoteNumber = escapeHtml(quoteNumber);
  const safeTotalTtc = escapeHtml(totalTtc);
  const safeAppUrl = escapeHtml(appUrl);

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Votre devis Digital Lab est prêt</title>
  </head>
  <body style="margin:0;background:#f7f4ff;font-family:Arial,Helvetica,sans-serif;color:#171024;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 14px;background:#f7f4ff;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e7defc;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">Bonjour ${safeClientName},</p>
                <h1 style="margin:0 0 14px;font-size:28px;line-height:1.15;color:#171024;">Votre devis est prêt.</h1>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.65;color:#4b405f;">
                  Vous pouvez le consulter dans votre espace client.
                </p>
                ${
                  safeQuoteTitle || safeQuoteNumber || safeTotalTtc
                    ? `<p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#6b5d85;">
                        ${safeQuoteTitle ? `<strong style="color:#171024;">${safeQuoteTitle}</strong><br />` : ""}
                        ${safeQuoteNumber ? `Référence : ${safeQuoteNumber}<br />` : ""}
                        ${safeTotalTtc ? `Total TTC : ${safeTotalTtc}` : ""}
                      </p>`
                    : ""
                }
                <a href="${safeAppUrl}" style="display:inline-block;padding:14px 20px;border-radius:999px;background:#8B5CF6;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">
                  Accéder à mon espace client
                </a>
                <p style="margin:28px 0 0;font-size:15px;line-height:1.6;color:#171024;">
                  Digital Lab<br />
                  Olena Mykhalska
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  if (!RESEND_API_KEY) {
    return jsonResponse({ ok: false, error: "RESEND_API_KEY is not configured." }, 500);
  }

  try {
    const payload = (await request.json()) as QuoteEmailPayload;

    if (!payload.to || !payload.appUrl) {
      return jsonResponse({ ok: false, error: "Missing required fields: to and appUrl." }, 400);
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [payload.to],
        subject: "Votre devis Digital Lab est prêt",
        html: buildEmailHtml(payload),
      }),
    });

    const resendData = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      return jsonResponse({ ok: false, error: resendData?.message || "Resend email failed." }, resendResponse.status);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
