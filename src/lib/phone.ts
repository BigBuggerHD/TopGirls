/**
 * Telefonnummern: Eingabe wie „0151 1234567“, „+49 151 1234567“ oder „0049…“
 * wird ins internationale Format (E.164, z. B. +491511234567) umgewandelt.
 */
export function normalizePhone(input: string): string | null {
  let s = input.trim().replace(/[\s()/.-]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = "+" + s.slice(2);
  else if (s.startsWith("0")) s = "+49" + s.slice(1);
  else if (!s.startsWith("+")) return null;
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

/** Lesbare Darstellung, z. B. +49 1511234567. */
export function formatPhone(e164: string): string {
  return e164.startsWith("+49") ? `+49 ${e164.slice(3)}` : e164;
}

export const phoneDigits = (e164: string) => e164.replace(/\D/g, "");
