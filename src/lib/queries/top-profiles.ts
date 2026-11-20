import "server-only";
import { db } from "@/lib/db";
import { cardSelect, publicProfileWhere, type ProfileCardData } from "@/lib/queries/profiles";

/**
 * Top-Sedcards nach Profilaufrufen (Klicks auf die Sedcard) der letzten `days` Tage.
 * Werden weniger als `limit` gefunden, wird mit den neuesten Sedcards aufgefüllt.
 */
export async function getTopProfiles(limit = 10, days = 30): Promise<ProfileCardData[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const ranked = await db.profileStatDaily.groupBy({
    by: ["profileId"],
    where: { date: { gte: since }, profile: publicProfileWhere() },
    _sum: { views: true },
    orderBy: { _sum: { views: "desc" } },
    take: limit,
  });
  const ids = ranked.filter((r) => (r._sum.views ?? 0) > 0).map((r) => r.profileId);
  const top = ids.length ? await db.profile.findMany({ where: { id: { in: ids } }, select: cardSelect }) : [];
  const sorted = ids.map((id) => top.find((p) => p.id === id)).filter((p): p is ProfileCardData => !!p);
  if (sorted.length < limit) {
    const fill = await db.profile.findMany({
      where: { AND: [publicProfileWhere(), { id: { notIn: sorted.map((p) => p.id) } }] },
      orderBy: { publishedAt: "desc" },
      take: limit - sorted.length,
      select: cardSelect,
    });
    sorted.push(...fill);
  }
  return sorted;
}
