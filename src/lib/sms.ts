import "server-only";

/**
 * SMS-Versand (Adapter).
 * Ein echter Anbieter (z. B. seven.io, Twilio, MessageBird) ist noch nicht angebunden –
 * er wird hier ergänzt, sobald Zugangsdaten vorliegen. Es werden keine Anbieter-APIs erfunden.
 *
 * SMS_PROVIDER:
 *   ""/"console" → SMS wird nur im Terminal ausgegeben (Entwicklung; in Produktion nur mit "console" explizit)
 */
export class SmsNotConfiguredError extends Error {}

export function smsProvider(): "console" | "none" {
  const p = (process.env.SMS_PROVIDER ?? "").trim().toLowerCase();
  if (p === "console") return "console";
  if (!p && process.env.NODE_ENV !== "production") return "console";
  return "none";
}

/** Im Entwicklungsmodus wird der Code zusätzlich im Assistenten angezeigt. */
export const smsDevMode = () => smsProvider() === "console" && process.env.NODE_ENV !== "production";

export async function sendSms(to: string, text: string) {
  switch (smsProvider()) {
    case "console":
      console.info(`\n──── SMS (Entwicklung) ────\nAn: ${to}\n\n${text}\n───────────────────────────\n`);
      return;
    default:
      throw new SmsNotConfiguredError("Der SMS-Versand ist noch nicht eingerichtet.");
  }
}
