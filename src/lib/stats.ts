import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { berlinDay } from "@/lib/format";

type Metric = "impressions" | "views" | "clicks";

/** Erhöht Tageszähler für mehrere Profile in einer einzigen Abfrage (keine personenbezogenen Daten). */
export async function trackProfiles(profileIds: string[], metric: Metric) {
  profileIds = [...new Set(profileIds)];
  if (profileIds.length === 0) return;
  const day = berlinDay();
  const col = Prisma.raw(`"${metric}"`);
  await db
    .$executeRaw`INSERT INTO "ProfileStatDaily" ("profileId", "date", ${col})
      SELECT id, ${day}::date, 1 FROM unnest(${profileIds}::text[]) AS id
      ON CONFLICT ("profileId", "date") DO UPDATE SET ${col} = "ProfileStatDaily".${col} + 1`
    .catch((e) => console.error("Statistik-Fehler", e));
}

export type StatRange = "tag" | "woche" | "monat" | "frei";

export function resolveRange(range: StatRange, from?: string, to?: string): { from: Date; to: Date } {
  const today = berlinDay();
  const ago = (d: number) => new Date(today.getTime() - d * 86_400_000);
  if (range === "tag") return { from: today, to: today };
  if (range === "woche") return { from: ago(6), to: today };
  if (range === "frei" && from && to) {
    const f = new Date(`${from}T00:00:00.000Z`);
    const t = new Date(`${to}T00:00:00.000Z`);
    if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && f <= t && t.getTime() - f.getTime() <= 366 * 86_400_000) return { from: f, to: t };
  }
  return { from: ago(29), to: today };
}

export async function getStatsSeries(profileIds: string[], from: Date, to: Date) {
  const rows = await db.profileStatDaily.findMany({ where: { profileId: { in: profileIds }, date: { gte: from, lte: to } } });
  const byDay = new Map<string, { impressions: number; views: number; clicks: number }>();
  for (let t = from.getTime(); t <= to.getTime(); t += 86_400_000) {
    byDay.set(new Date(t).toISOString().slice(0, 10), { impressions: 0, views: 0, clicks: 0 });
  }
  for (const r of rows) {
    const k = r.date.toISOString().slice(0, 10);
    const e = byDay.get(k);
    if (e) {
      e.impressions += r.impressions;
      e.views += r.views;
      e.clicks += r.clicks;
    }
  }
  const series = [...byDay.entries()].map(([date, v]) => ({ date, ...v }));
  const totals = series.reduce((a, s) => ({ impressions: a.impressions + s.impressions, views: a.views + s.views, clicks: a.clicks + s.clicks }), { impressions: 0, views: 0, clicks: 0 });
  return { series, totals };
}
