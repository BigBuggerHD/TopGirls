/**
 * Preisliste einer Sedcard (gespeichert als JSON in Profile.prices).
 * Feste Positionen gemäß Vorgabe „Preise“; je Position ein Preis für Incall und/oder Outcall.
 * Ältere Einträge (eigene Bezeichnungen, nur `amountCents`) werden beim Lesen übernommen.
 */
export type PriceRow = { label: string; incallCents: number | null; outcallCents: number | null };

/** Positionen in der Reihenfolge der Vorgabe. */
export const PRICE_DURATIONS = ["Quicky", "30 min", "45 min", "60 min", "2 Std", "3 Std", "4 Std", "5 Std", "6 Std", "Over-Night"] as const;

/** Frühere freie Bezeichnungen → feste Position. */
const ALIASES: Record<string, string> = {
  "quickie": "Quicky", "30 minuten": "30 min", "45 minuten": "45 min",
  "1 stunde": "60 min", "60 minuten": "60 min", "1 std": "60 min",
  "2 stunden": "2 Std", "3 stunden": "3 Std", "4 stunden": "4 Std", "5 stunden": "5 Std", "6 stunden": "6 Std",
  "übernachtung": "Over-Night", "overnight": "Over-Night", "over night": "Over-Night",
};

export function canonicalDuration(label: string): string | null {
  const l = label.trim();
  const fixed = PRICE_DURATIONS.find((d) => d.toLowerCase() === l.toLowerCase());
  return fixed ?? ALIASES[l.toLowerCase()] ?? null;
}

const cents = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);

/** Liest die gespeicherten Preise als feste Positionen (nur Positionen mit mindestens einem Preis, in Vorgabe-Reihenfolge). */
export function parsePrices(value: unknown): PriceRow[] {
  if (!Array.isArray(value)) return [];
  const byLabel = new Map<string, PriceRow>();
  for (const r of value) {
    if (!r || typeof r !== "object" || typeof (r as { label?: unknown }).label !== "string") continue;
    const o = r as { label: string; incallCents?: unknown; outcallCents?: unknown; amountCents?: unknown };
    const label = canonicalDuration(o.label);
    if (!label || byLabel.has(label)) continue;
    const legacy = cents(o.amountCents);
    const row = { label, incallCents: cents(o.incallCents) ?? legacy, outcallCents: cents(o.outcallCents) ?? legacy };
    if (row.incallCents != null || row.outcallCents != null) byLabel.set(label, row);
  }
  return PRICE_DURATIONS.filter((d) => byLabel.has(d)).map((d) => byLabel.get(d)!);
}

/** Wert für ein Eingabefeld (z. B. 25000 → "250", 25050 → "250,50"). */
export const centsToInput = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ",").replace(",00", ""));
