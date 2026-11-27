import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MEETING_FILTER_KEY } from "@/lib/meeting";

export const PAGE_SIZE = 24;

export type SearchParams = Record<string, string | string[] | undefined>;

export const publicProfileWhere = (): Prisma.ProfileWhereInput => ({
  status: "PUBLISHED",
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  owner: { status: "ACTIVE" },
});

export const cardSelect = {
  id: true, slug: true, stageName: true, headline: true, city: true, age: true, age2: true, profileType: true, verified: true,
  premiumUntil: true, highlightUntil: true, sponsoredUntil: true,
  category: { select: { name: true, slug: true } },
  images: { where: { status: "APPROVED" }, orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }], take: 1, select: { thumbKey: true } },
  // Für Incall/Outcall-Symbole (siehe src/lib/meeting.ts)
  attributes: { where: { filter: { key: MEETING_FILTER_KEY } }, select: { options: { select: { option: { select: { value: true } } } } } },
} satisfies Prisma.ProfileSelect;

export type ProfileCardData = Prisma.ProfileGetPayload<{ select: typeof cardSelect }>;

const arr = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Lädt aktive Filter für eine Kategorie (oder alle, wenn keine Kategorie angegeben ist). */
export async function getFiltersForCategory(categoryId?: string) {
  return db.filterDefinition.findMany({
    where: { active: true, showInSearch: true, ...(categoryId ? { categories: { some: { categoryId } } } : {}) },
    orderBy: { sortOrder: "asc" },
    include: { options: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });
}

export type FilterWithOptions = Awaited<ReturnType<typeof getFiltersForCategory>>[number];

/**
 * Baut die Prisma-Bedingung aus URL-Parametern.
 * Dynamische Filter: f_<key>=<optionValue> (mehrfach), f_<key>=1 (Ja/Nein), f_<key>_min / f_<key>_max (Zahl).
 */
export function buildWhere(sp: SearchParams, filters: FilterWithOptions[], categoryId?: string): Prisma.ProfileWhereInput {
  const and: Prisma.ProfileWhereInput[] = [publicProfileWhere()];
  if (categoryId) and.push({ categoryId });
  const q = one(sp.q).trim().slice(0, 80);
  if (q) and.push({ OR: [{ stageName: { contains: q, mode: "insensitive" } }, { headline: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] });
  const city = one(sp.stadt).trim().slice(0, 80);
  if (city) and.push({ city: { contains: city, mode: "insensitive" } });
  if (one(sp.verifiziert) === "1") and.push({ verified: true });
  const ageMin = Number(one(sp.alter_min));
  const ageMax = Number(one(sp.alter_max));
  if (ageMin >= 18) and.push({ OR: [{ age: { gte: ageMin } }, { age2: { gte: ageMin } }] });
  if (ageMax >= 18) and.push({ OR: [{ age: { lte: ageMax } }, { age2: { lte: ageMax } }] });

  for (const f of filters) {
    const p = `f_${f.key}`;
    if (f.type === "SELECT" || f.type === "MULTISELECT") {
      const values = arr(sp[p]);
      const ids = f.options.filter((o) => values.includes(o.value)).map((o) => o.id);
      if (ids.length) and.push({ attributes: { some: { filterId: f.id, options: { some: { optionId: { in: ids } } } } } });
    } else if (f.type === "BOOLEAN") {
      if (one(sp[p]) === "1") and.push({ attributes: { some: { filterId: f.id, boolValue: true } } });
    } else if (f.type === "NUMBER") {
      const min = Number(one(sp[`${p}_min`]));
      const max = Number(one(sp[`${p}_max`]));
      const cond: Prisma.IntNullableFilter = {};
      if (one(sp[`${p}_min`]) && Number.isFinite(min)) cond.gte = min;
      if (one(sp[`${p}_max`]) && Number.isFinite(max)) cond.lte = max;
      if (Object.keys(cond).length) and.push({ attributes: { some: { filterId: f.id, numberValue: cond } } });
    }
  }
  return { AND: and };
}

export async function searchProfiles(sp: SearchParams, filters: FilterWithOptions[], categoryId?: string) {
  const where = buildWhere(sp, filters, categoryId);
  const page = Math.max(1, Math.min(500, Number(one(sp.seite)) || 1));
  const sort = one(sp.sortierung);
  const orderBy: Prisma.ProfileOrderByWithRelationInput[] =
    sort === "neu" ? [{ publishedAt: "desc" }] : [{ premiumUntil: { sort: "desc", nulls: "last" } }, { highlightUntil: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }];

  const [total, items, sponsored] = await Promise.all([
    db.profile.count({ where }),
    db.profile.findMany({ where, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, select: cardSelect }),
    page === 1 ? db.profile.findMany({ where: { AND: [where, { sponsoredUntil: { gt: new Date() } }] }, take: 3, orderBy: { sponsoredUntil: "desc" }, select: cardSelect }) : Promise.resolve([]),
  ]);
  return { total, items, sponsored, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getActiveAds(location: Prisma.AdPlacementWhereInput["location"], take = 3) {
  const now = new Date();
  return db.adBooking.findMany({
    where: { status: "ACTIVE", startsAt: { lte: now }, endsAt: { gte: now }, placement: { location, active: true } },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take,
    select: { id: true, title: true, subtitle: true, imageKey: true, targetUrl: true, profile: { select: { slug: true } }, placement: { select: { width: true, height: true } } },
  });
}
