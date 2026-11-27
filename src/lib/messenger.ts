import { phoneDigits } from "@/lib/phone";

/** Vorausgefüllter Text, wenn ein Kunde über die Sedcard einen WhatsApp-Chat öffnet. */
export const WHATSAPP_GREETING = "Hallo, ich habe deine Sedcard auf Top Girls gesehen.";

export function whatsappLink(e164: string): string {
  return `https://wa.me/${phoneDigits(e164)}?text=${encodeURIComponent(WHATSAPP_GREETING)}`;
}

/** Mit Benutzername funktioniert der Link immer; über die Nummer nur, wenn sie in Telegram auffindbar ist. */
export function telegramLink(e164: string | null, username: string | null): string | null {
  if (username) return `https://t.me/${username}`;
  return e164 ? `https://t.me/+${phoneDigits(e164)}` : null;
}

/**
 * Telegram-Benutzername aus Eingaben wie „@lara_berlin“, „t.me/lara_berlin“ oder „https://t.me/lara_berlin“.
 * Telegram erlaubt 5–32 Zeichen: Buchstaben, Ziffern, Unterstrich; Beginn mit Buchstabe.
 * Rückgabe: "" für leere Eingabe, null für ungültige Eingabe.
 */
export function normalizeTelegramUsername(input: string): string | null {
  const s = input.trim().replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\//i, "").replace(/^@/, "").replace(/\/+$/, "");
  if (!s) return "";
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(s) && !s.endsWith("_") ? s : null;
}
