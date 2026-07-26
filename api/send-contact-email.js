const CONTACT_EMAIL = process.env.CONTACT_TO_EMAIL || "contact@digitallab.studio";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Digital Lab <onboarding@resend.dev>";

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const buildEmailHtml = ({ name, email, company, projectType, message }) => `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Nouvelle demande Digital Lab</title>
  </head>
  <body style="margin:0;background:#f6f3ff;font-family:Arial,Helvetica,sans-serif;color:#171024;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 14px;background:#f6f3ff;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e7defc;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#6b5d85;">Nouvelle demande depuis digitallab.studio</p>
                <h1 style="margin:0 0 20px;font-size:28px;line-height:1.15;color:#171024;">${escapeHtml(projectType || "Projet Digital Lab")}</h1>
                <p style="margin:0 0 8px;font-size:15px;line-height:1.6;"><strong>Nom :</strong> ${escapeHtml(name)}</p>
                <p style="margin:0 0 8px;font-size:15px;line-height:1.6;"><strong>E-mail :</strong> ${escapeHtml(email)}</p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.6;"><strong>Structure :</strong> ${escapeHtml(company || "Non renseignée")}</p>
                <div style="padding:18px;border-radius:16px;background:#f7f4ff;border:1px solid #e7defc;color:#322342;font-size:15px;line-height:1.65;">
                  ${escapeHtml(message).replaceAll("\n", "<br />")}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    return response.status(500).json({ error: "RESEND_API_KEY is not configured." });
  }

  const { name, email, company, projectType, message } = request.body || {};

  if (!name || !email || !message) {
    return response.status(400).json({
      error: "Missing required fields: name, email, message.",
    });
  }

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [CONTACT_EMAIL],
      reply_to: email,
      subject: `Nouvelle demande Digital Lab - ${projectType || "Contact"}`,
      html: buildEmailHtml({ name, email, company, projectType, message }),
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
