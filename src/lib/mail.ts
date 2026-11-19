import "server-only";
import nodemailer from "nodemailer";

/** E-Mail-Versand. Ohne SMTP-Konfiguration werden E-Mails in der Konsole ausgegeben (Entwicklung). */
const transport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    })
  : null;

const FROM = process.env.MAIL_FROM ?? "Top Girls <no-reply@example.com>";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Gemeinsame Dark-Luxury-Vorlage für alle E-Mails. */
export function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html lang="de"><body style="margin:0;background:#0D0D0D;font-family:Helvetica,Arial,sans-serif;color:#f5f5f5">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0D0D0D;padding:32px 0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#121212;border:1px solid #2a2a2a;border-radius:12px;padding:40px">
<tr><td style="font-family:Georgia,serif;font-size:28px;letter-spacing:4px;color:#C6A76B;text-align:center;padding-bottom:24px">TOP GIRLS</td></tr>
<tr><td style="font-size:20px;color:#fff;padding-bottom:16px">${esc(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.6;color:#cfcfcf">${bodyHtml}</td></tr>
${cta ? `<tr><td style="padding:28px 0" align="center"><a href="${esc(cta.url)}" style="background:#C6A76B;color:#0D0D0D;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:bold;display:inline-block">${esc(cta.label)}</a></td></tr>` : ""}
<tr><td style="font-size:12px;color:#7a7a7a;border-top:1px solid #2a2a2a;padding-top:20px">Diese E-Mail wurde automatisch von Top Girls versendet. Wenn du diese Aktion nicht ausgelöst hast, kannst du die Nachricht ignorieren.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendMail(to: string, subject: string, html: string, text: string) {
  if (!transport) {
    console.info(`\n──── E-Mail (Entwicklung) ────\nAn: ${to}\nBetreff: ${subject}\n\n${text}\n──────────────────────────────\n`);
    return;
  }
  await transport.sendMail({ from: FROM, to, subject, html, text });
}

export const mailTemplates = {
  verifyEmail: (name: string, url: string) => ({
    subject: "Bitte bestätige deine E-Mail-Adresse – Top Girls",
    html: layout(`Hallo ${name},`, "willkommen bei Top Girls! Bitte bestätige deine E-Mail-Adresse, um dein Konto vollständig zu nutzen. Der Link ist 24 Stunden gültig.", { label: "E-Mail-Adresse bestätigen", url }),
    text: `Hallo ${name},\n\nbitte bestätige deine E-Mail-Adresse: ${url}\n\nDer Link ist 24 Stunden gültig.\n\nDein Top-Girls-Team`,
  }),
  passwordReset: (name: string, url: string) => ({
    subject: "Passwort zurücksetzen – Top Girls",
    html: layout(`Hallo ${name},`, "du hast angefordert, dein Passwort zurückzusetzen. Der Link ist 1 Stunde gültig.", { label: "Neues Passwort festlegen", url }),
    text: `Hallo ${name},\n\nüber folgenden Link kannst du ein neues Passwort festlegen (1 Stunde gültig): ${url}\n\nDein Top-Girls-Team`,
  }),
  profileDecision: (name: string, stageName: string, approved: boolean, reason?: string | null) => ({
    subject: approved ? `Deine Sedcard „${stageName}“ ist online – Top Girls` : `Deine Sedcard „${stageName}“ wurde nicht freigegeben – Top Girls`,
    html: layout(`Hallo ${name},`, approved
      ? `deine Sedcard <strong>${esc(stageName)}</strong> wurde geprüft und ist jetzt veröffentlicht.`
      : `deine Sedcard <strong>${esc(stageName)}</strong> konnte leider nicht freigegeben werden.<br><br>Begründung: ${esc(reason ?? "–")}<br><br>Du kannst die Sedcard überarbeiten und erneut einreichen.`),
    text: approved ? `Deine Sedcard „${stageName}“ ist jetzt veröffentlicht.` : `Deine Sedcard „${stageName}“ wurde nicht freigegeben. Begründung: ${reason ?? "–"}`,
  }),
  paymentCompleted: (name: string, tokens: number, amount: string) => ({
    subject: "Zahlung erhalten – Top Girls",
    html: layout(`Hallo ${name},`, `vielen Dank für deinen Einkauf. Dir wurden <strong>${tokens} Token</strong> gutgeschrieben (Betrag: ${esc(amount)}).`),
    text: `Vielen Dank! Dir wurden ${tokens} Token gutgeschrieben (Betrag: ${amount}).`,
  }),
};
