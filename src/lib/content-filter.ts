/**
 * Inhaltsfilter für Forum, Nachrichten und Marktplatz.
 * Erkennt private personenbezogene Daten und typische Muster unbelegter Anschuldigungen.
 * Treffer führen nicht zur automatischen Löschung, sondern zur Zurückhaltung für die Moderation.
 */
export type FilterResult = { flagged: boolean; reasons: string[] };

const PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /(?:\+|00)\s?\d{2}[\s\-/]?\(?\d{2,5}\)?[\s\-/]?\d{3,}[\s\-/]?\d{0,6}/, reason: "Telefonnummer" },
  { re: /\b0\d{2,5}[\s\-/]?\d{5,9}\b/, reason: "Telefonnummer" },
  { re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, reason: "E-Mail-Adresse" },
  { re: /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}\b/, reason: "IBAN/Kontodaten" },
  { re: /\b[A-ZÄÖÜ][a-zäöüß]+(?:straße|strasse|str\.|weg|gasse|allee|platz)\s+\d+[a-z]?\b/i, reason: "Wohnadresse" },
  { re: /\b(?:klarname|echter name|heißt in wirklichkeit|wohnt in der|wohnadresse)\b/i, reason: "Identifizierung einer Person" },
  { re: /\b(?:ist eine betrügerin|ist ein betrüger|hat (?:mich|uns) abgezockt|ist kriminell|polizeibekannt|hat aids|hat hiv|ist krank)\b/i, reason: "Mögliche unbelegte Anschuldigung" },
];

export function checkContent(text: string): FilterResult {
  const reasons = new Set<string>();
  for (const { re, reason } of PATTERNS) if (re.test(text)) reasons.add(reason);
  return { flagged: reasons.size > 0, reasons: [...reasons] };
}

/** Für Nachrichten: Kontaktdaten sind erlaubt, nur Anschuldigungen/Identifizierung Dritter werden markiert. */
export function checkMessage(text: string): FilterResult {
  const reasons = new Set<string>();
  for (const { re, reason } of PATTERNS.slice(4)) if (re.test(text)) reasons.add(reason);
  return { flagged: reasons.size > 0, reasons: [...reasons] };
}

/** Begriffe, die auf Minderjährigkeit oder Zwang hindeuten – blockieren Veröffentlichung von Sedcards. */
const BLOCKED_PROFILE_TERMS = [
  /\b(?:minderjährig|schülerin|schulmädchen|teen(?:ie)?s?\b|lolita|jungfrau\s*1[0-7]|1[0-7]\s*(?:jahre|j\.)\b)/i,
  /\b(?:ohne\s+gummi|ohne\s+kondom|tabulos\s+ohne|af\b.*ohne|schwanger)\b/i, // § 32 ProstSchG
];

export function checkProfileText(text: string): FilterResult {
  const reasons: string[] = [];
  if (BLOCKED_PROFILE_TERMS[0].test(text)) reasons.push("Hinweis auf Minderjährigkeit");
  if (BLOCKED_PROFILE_TERMS[1].test(text)) reasons.push("Nach § 32 ProstSchG unzulässige Werbung");
  return { flagged: reasons.length > 0, reasons };
}
