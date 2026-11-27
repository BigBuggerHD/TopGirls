/**
 * Verfügbarkeit je Wochentag (gespeichert als JSON in Profile.availability).
 *  - nicht aktiv            → „nach Absprache“
 *  - mode "time"            → feste Uhrzeit (von – bis)
 *  - mode "allday"          → ganztägig
 *  - mode "arrange"         → Tag verfügbar, Uhrzeit nach Absprache
 * Ältere Einträge ohne `mode` mit active=true werden als feste Uhrzeit gelesen.
 */
export type DayMode = "time" | "allday" | "arrange";
export type DayAvailability = { active?: boolean; mode?: DayMode; from?: string; to?: string };
export type Availability = Record<string, DayAvailability>;

export const BY_ARRANGEMENT = "nach Absprache";

export function dayMode(d: DayAvailability | undefined): DayMode | null {
  if (!d?.active) return null;
  return d.mode ?? "time";
}

export function dayLabel(d: DayAvailability | undefined): string {
  const mode = dayMode(d);
  if (mode === "allday") return "ganztägig";
  if (mode === "arrange") return "Uhrzeit nach Absprache";
  if (mode === "time" && d?.from && d?.to) return `${d.from} – ${d.to} Uhr`;
  return BY_ARRANGEMENT;
}

export function hasAnyAvailability(a: Availability | null | undefined): boolean {
  return !!a && Object.values(a).some((d) => d?.active);
}
