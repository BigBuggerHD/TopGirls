/** Preisliste einer Sedcard: [{ label, amountCents }] (gespeichert als JSON in Profile.prices). */
export type PriceRow = { label: string; amountCents: number };
export const MAX_PRICE_ROWS = 8;

export function parsePrices(value: unknown): PriceRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is PriceRow => !!r && typeof r === "object" && typeof (r as PriceRow).label === "string" && Number.isInteger((r as PriceRow).amountCents))
    .slice(0, MAX_PRICE_ROWS);
}
