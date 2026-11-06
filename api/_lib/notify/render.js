// LOT NOTIFY-01A — e-mail content. Deterministic: the same outbox row always gives the same payload,
// byte for byte (Resend rejects a reused idempotency key with a different payload: 409).
// Only fields that never change are used (no status, no "now").
import { createHash } from "node:crypto";
import { LIMITS, isValidEmail } from "./config.js";

// Mostly from LOT SEC-EMAIL-01 (api/_lib/contactEmail.js, branch fix/sec-email-01).
export const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_KEEP_NEWLINES = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const oneLine = (value, max) => {
  const text = String(value ?? "").replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const multiLine = (value, max) => {
  const text = String(value ?? "").replace(/\r\n?/g, "\n").replace(CONTROL_CHARS_KEEP_NEWLINES, "").trim();
  return text.length > max ? `${text.slice(0, max)}\n[… message tronqué à ${max} caractères]` : text;
};

// Numeric parts only: stable across ICU versions (no localized month names or special spaces).
export const formatParisDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "date inconnue";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute} (heure de Paris)`;
};

const layout = (title, inner) => `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f6f3ff;font-family:Arial,Helvetica,sans-serif;color:#171024;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:28px 14px;background:#f6f3ff;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e7defc;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:30px;">
${inner}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const line = (label, value) =>
  `                <p style="margin:0 0 8px;font-size:15px;line-height:1.6;"><strong>${label} :</strong> ${escapeHtml(value)}</p>`;

const newRequest = (row, { from, to }) => {
  const reference = oneLine(row.reference, 40) || "sans référence";
  const projectType = oneLine(row.project_type, 60) || "Contact";
  const name = oneLine(row.name, 120);
  const email = oneLine(row.email, 254);
  const company = oneLine(row.company, 160) || "Non renseignée";
  const message = multiLine(row.message, LIMITS.messageChars);
  const received = formatParisDate(row.request_created_at);
  const subject = oneLine(`Nouvelle demande ${reference} — ${projectType}`, LIMITS.subjectChars);

  const html = layout(subject, [
    `                <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#6b5d85;">Nouvelle demande depuis digitallab.studio · ${escapeHtml(reference)}</p>`,
    `                <h1 style="margin:0 0 20px;font-size:28px;line-height:1.15;color:#171024;">${escapeHtml(projectType)}</h1>`,
    line("Nom", name),
    line("E-mail", email),
    line("Structure", company),
    line("Reçue le", received),
    `                <div style="margin-top:18px;padding:18px;border-radius:16px;background:#f7f4ff;border:1px solid #e7defc;color:#322342;font-size:15px;line-height:1.65;">${escapeHtml(message).replaceAll("\n", "<br />")}</div>`,
    `                <p style="margin:22px 0 0;font-size:12px;line-height:1.5;color:#8a7fa0;">La demande est enregistrée dans l’espace admin. Répondre à cet e-mail écrit au visiteur.</p>`,
  ].join("\n"));

  const text = [
    `Nouvelle demande depuis digitallab.studio — ${reference}`,
    `Type : ${projectType}`,
    `Nom : ${name}`,
    `E-mail : ${email}`,
    `Structure : ${company}`,
    `Reçue le : ${received}`,
    "",
    message,
    "",
    "La demande est enregistrée dans l’espace admin. Répondre à cet e-mail écrit au visiteur.",
  ].join("\n");

  const payload = { from, to, subject, html, text, headers: { "X-DigitalLab-Notification": `notify-01a/${row.request_id}` } };
  if (isValidEmail(row.email)) payload.reply_to = row.email;
  return payload;
};

const volumeAlert = (row, { from, to }) => {
  const day = oneLine(row.alert_day, 10);
  const subject = `[Digital Lab] Plafond de notifications atteint — ${day}`;
  const explanation = "Le plafond d’envoi des notifications (par heure ou sur 24 h) est atteint. Des demandes attendent : elles restent enregistrées et leurs notifications partiront automatiquement dès que le plafond le permettra. Un volume inhabituel peut signaler un envoi automatisé : vérifiez /admin et notify_01a.v_diagnostic.";
  const html = layout(subject, [
    `                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#171024;">${escapeHtml(subject)}</h1>`,
    `                <p style="margin:0;font-size:15px;line-height:1.6;">${escapeHtml(explanation)}</p>`,
  ].join("\n"));
  return { from, to, subject, html, text: `${subject}\n\n${explanation}`, headers: { "X-DigitalLab-Notification": `notify-01a/volume-alert/${day}` } };
};

/** Builds the Resend payload for one claimed outbox row. */
export const buildPayload = (row, routing) => (row.kind === "volume_alert" ? volumeAlert(row, routing) : newRequest(row, routing));

/** SHA-256 of the exact JSON body sent to Resend. */
export const payloadSha256 = (payload) => createHash("sha256").update(JSON.stringify(payload)).digest("hex");
