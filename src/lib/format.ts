export const LOCALE = "de-DE";
export const TIME_ZONE = "Europe/Berlin";

const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TIME_ZONE });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: TIME_ZONE,
});
const eurFmt = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const numFmt = new Intl.NumberFormat(LOCALE);

/** TT.MM.JJJJ */
export const formatDate = (d: Date | string | null | undefined) => (d ? dateFmt.format(new Date(d)) : "–");
/** TT.MM.JJJJ, HH:MM */
export const formatDateTime = (d: Date | string | null | undefined) => (d ? dateTimeFmt.format(new Date(d)) : "–");
export const formatEuro = (cents: number | null | undefined) => (cents == null ? "–" : eurFmt.format(cents / 100));
export const formatNumber = (n: number | null | undefined) => (n == null ? "–" : numFmt.format(n));
export const formatTokens = (n: number) => `${numFmt.format(n)} Token`;

/** Kalendertag in Europe/Berlin als UTC-Mitternacht (für @db.Date-Spalten). */
export function berlinDay(d = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return new Date(`${parts}T00:00:00.000Z`);
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
