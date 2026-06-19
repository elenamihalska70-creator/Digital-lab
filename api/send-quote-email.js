// Email sending is paused from the quote workflow until a professional domain/email is configured.
// This Vercel route is kept for future use and is not called by the current quote publish flow.
const buildDashboardUrl = (request) => {
  const configuredUrl = process.env.VITE_APP_URL || process.env.VITE_PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL;
  const isLocalRequest = request.headers.host?.includes("localhost") || request.headers.host?.includes("127.0.0.1");
  const host = request.headers.host ? `https://${request.headers.host}` : "";
  const baseUrl = configuredUrl || (isLocalRequest ? "http://localhost:5173" : host || "http://localhost:5173");

  return `${baseUrl.replace(/\/$/, "")}/dashboard`;
};

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const buildEmailHtml = ({ clientName, dashboardUrl }) => {
  const safeClientName = escapeHtml(clientName || "Bonjour");
  const safeDashboardUrl = escapeHtml(dashboardUrl);

  return `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Votre devis Digital Lab est prêt</title>
  </head>
  <body style="margin:0;background:#f6f3ff;font-family:Arial,Helvetica,sans-serif;color:#171024;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 14px;background:#f6f3ff;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e7defc;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:34px 30px;">
                <p style="margin:0 0 18px;font-size:17px;line-height:1.6;">Bonjour ${safeClientName},</p>
                <h1 style="margin:0 0 14px;font-size:30px;line-height:1.12;color:#171024;">Votre devis est prêt.</h1>
                <p style="margin:0 0 22px;font-size:16px;line-height:1.65;color:#4b405f;">
                  Vous pouvez le consulter dans votre espace client.
                </p>
                <a href="${safeDashboardUrl}" style="display:inline-block;padding:15px 22px;border-radius:999px;background:#8B5CF6;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">
                  Accéder à mon espace client
                </a>
                <p style="margin:28px 0 8px;font-size:15px;line-height:1.65;color:#4b405f;">Digital Lab</p>
                <p style="margin:0;font-size:15px;font-weight:700;color:#171024;">Olena Mykhalska</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    return response.status(500).json({ error: "RESEND_API_KEY is not configured." });
  }

  const { quoteId, clientEmail, clientName } = request.body || {};

  if (!quoteId || !clientEmail) {
    return response.status(400).json({
      error: "Missing required fields: quoteId, clientEmail.",
    });
  }

  const dashboardUrl = buildDashboardUrl(request);
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Digital Lab <onboarding@resend.dev>",
      to: [clientEmail],
      subject: "Votre devis Digital Lab est prêt",
      html: buildEmailHtml({ clientName, dashboardUrl }),
    }),
  });

  const data = await resendResponse.json().catch(() => ({}));

  if (!resendResponse.ok) {
    return response.status(resendResponse.status).json({
      error: data?.message || "Resend email failed.",
      details: data,
    });
  }

  return response.status(200).json({ success: true, data });
}
