/**
 * Preisliste einer Sedcard (gespeichert als JSON in Profile.prices).
 * Je Zeile ein Preis für Incall und/oder Outcall. Ältere Einträge mit nur `amountCents`
 * werden als Preis für beide Varianten gelesen.
 */
export type PriceRow = { label: string; incallCents: number | null; outcallCents: number | null };
export const MAX_PRICE_ROWS = 8;

const cents = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);

export function parsePrices(value: unknown): PriceRow[] {
  if (!Array.isArray(value)) return [];
  const rows: PriceRow[] = [];
  for (const r of value) {
    if (!r || typeof r !== "object" || typeof (r as { label?: unknown }).label !== "string") continue;
    const o = r as { label: string; incallCents?: unknown; outcallCents?: unknown; amountCents?: unknown };
    const legacy = cents(o.amountCents);
    const row = { label: o.label, incallCents: cents(o.incallCents) ?? legacy, outcallCents: cents(o.outcallCents) ?? legacy };
    if (row.label.trim()) rows.push(row); // Zeilen ohne Preis erscheinen als „nach Absprache“
  }
  return rows.slice(0, MAX_PRICE_ROWS);
}

/** Wert für ein Eingabefeld (z. B. 25000 → "250", 25050 → "250,50"). */
export const centsToInput = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ",").replace(",00", ""));
