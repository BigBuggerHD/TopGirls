/** Sprachen zur Auswahl im Sedcard-Assistenten (Vorgabe „Texte & Informationen“). */
export const LANGUAGES = [
  "Deutsch", "Englisch", "Russisch", "Ukrainisch", "Französisch", "Italienisch",
  "Spanisch", "Portugiesisch", "Türkisch", "Arabisch", "Polnisch",
] as const;

/** Höchstens so viele Sprachen gleichzeitig. */
export const MAX_LANGUAGES = 5;

/**
 * Übernimmt nur Sprachen aus der Liste – oder bereits gespeicherte (ältere Angaben bleiben wählbar).
 * Reihenfolge wie in der Liste, danach ältere Angaben; höchstens MAX_LANGUAGES.
 */
export function cleanLanguages(input: string[], previous: string[] = []): string[] {
  const wanted = new Set(input.map((s) => s.trim()).filter(Boolean));
  const allowed = [...LANGUAGES, ...previous.filter((l) => !(LANGUAGES as readonly string[]).includes(l))];
  return allowed.filter((l) => wanted.has(l)).slice(0, MAX_LANGUAGES);
}
