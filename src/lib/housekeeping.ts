import "server-only";
import { db } from "@/lib/db";
import { DEFAULT_ORDER, PAGE_SIZE, publicProfileWhere } from "@/lib/queries/profiles";

let lastRun = 0;

/**
 * Wartungsaufgaben: abgelaufene Sedcards, Promotions, Werbebuchungen und Inserate aktualisieren.
 * Wird gedrosselt (max. 1× pro Minute) bei Seitenaufrufen ausgeführt und kann zusätzlich
 * per Cron über /api/cron?secret=… angestoßen werden.
 */
export async function runHousekeeping(force = false) {
  if (!force && Date.now() - lastRun < 60_000) return;
  lastRun = Date.now();
  const now = new Date();
  await notifyPromotionEvents(now).catch((e) => console.error("Benachrichtigungen (Werbung & Push-Up) fehlgeschlagen", e));
  await db.$transaction([
    db.profile.updateMany({ where: { status: "PUBLISHED", expiresAt: { lt: now } }, data: { status: "EXPIRED" } }),
    db.profile.updateMany({ where: { premiumUntil: { lt: now } }, data: { premiumUntil: null } }),
    db.profile.updateMany({ where: { highlightUntil: { lt: now } }, data: { highlightUntil: null } }),
    db.profile.updateMany({ where: { sponsoredUntil: { lt: now } }, data: { sponsoredUntil: null } }),
    db.adBooking.updateMany({ where: { status: { in: ["ACTIVE", "SCHEDULED"] }, endsAt: { lt: now } }, data: { status: "EXPIRED" } }),
    db.adBooking.updateMany({ where: { status: "SCHEDULED", startsAt: { lte: now }, endsAt: { gte: now } }, data: { status: "ACTIVE" } }),
    db.marketplaceListing.updateMany({ where: { status: "PUBLISHED", expiresAt: { lt: now } }, data: { status: "EXPIRED" } }),
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.authToken.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } } }),
  ]);
}

const PROMO_LABEL = { premiumUntil: "Premium-Platzierung", highlightUntil: "Hervorhebung", sponsoredUntil: "Gesponserte Platzierung" } as const;

/**
 * Glocke „Werbung & Push-Up“ (Einstellung der Sedcard): abgelaufene Platzierungen und Werbebanner,
 * außerdem wenn eine Sedcard von der ersten Seite ihrer Kategorie rutscht.
 */
async function notifyPromotionEvents(now: Date) {
  const notes: { userId: string; title: string; body: string; link: string }[] = [];

  // 1) Abgelaufene Platzierungen (werden direkt danach zurückgesetzt – daher genau eine Meldung)
  const expired = await db.profile.findMany({
    where: { notifyPromotion: true, OR: [{ premiumUntil: { lt: now } }, { highlightUntil: { lt: now } }, { sponsoredUntil: { lt: now } }] },
    select: { ownerId: true, stageName: true, premiumUntil: true, highlightUntil: true, sponsoredUntil: true },
  });
  for (const p of expired) {
    for (const k of Object.keys(PROMO_LABEL) as (keyof typeof PROMO_LABEL)[]) {
      if (p[k] && p[k]! < now) notes.push({ userId: p.ownerId, title: `${PROMO_LABEL[k]} abgelaufen`, body: `Die ${PROMO_LABEL[k]} von „${p.stageName}“ ist abgelaufen. Jetzt verlängern, um weiter oben zu stehen.`, link: "/dashboard/anzeigen" });
    }
  }

  // 2) Auslaufende Werbebanner
  const ads = await db.adBooking.findMany({
    where: { status: { in: ["ACTIVE", "SCHEDULED"] }, endsAt: { lt: now } },
    select: { userId: true, title: true, profile: { select: { notifyPromotion: true } } },
  });
  for (const a of ads) {
    if (a.profile && !a.profile.notifyPromotion) continue;
    notes.push({ userId: a.userId, title: "Werbebanner abgelaufen", body: `Dein Werbebanner „${a.title}“ ist abgelaufen.`, link: "/dashboard/werbung" });
  }

  // 3) Von der ersten Seite der Kategorie gerutscht (Sortierung „Empfohlen“)
  const watched = await db.profile.findMany({ where: { AND: [publicProfileWhere(), { notifyPromotion: true }] }, select: { id: true, ownerId: true, stageName: true, categoryId: true, onFirstPage: true } });
  const byCategory = new Map<string, typeof watched>();
  for (const p of watched) byCategory.set(p.categoryId, [...(byCategory.get(p.categoryId) ?? []), p]);
  const nowOn: string[] = [];
  const nowOff: string[] = [];
  for (const [categoryId, list] of byCategory) {
    const first = await db.profile.findMany({ where: { AND: [publicProfileWhere(), { categoryId }] }, orderBy: DEFAULT_ORDER, take: PAGE_SIZE, select: { id: true } });
    const ids = new Set(first.map((f) => f.id));
    for (const p of list) {
      const on = ids.has(p.id);
      if (on && p.onFirstPage !== true) nowOn.push(p.id);
      if (!on && p.onFirstPage !== false) {
        nowOff.push(p.id);
        if (p.onFirstPage === true) notes.push({ userId: p.ownerId, title: "Sedcard nach unten gerutscht", body: `„${p.stageName}“ steht nicht mehr auf der ersten Seite. Mit einer Premium-Platzierung kommst du wieder nach oben.`, link: "/dashboard/anzeigen" });
      }
    }
  }
  await db.$transaction([
    ...(nowOn.length ? [db.profile.updateMany({ where: { id: { in: nowOn } }, data: { onFirstPage: true } })] : []),
    ...(nowOff.length ? [db.profile.updateMany({ where: { id: { in: nowOff } }, data: { onFirstPage: false } })] : []),
    ...(notes.length ? [db.notification.createMany({ data: notes })] : []),
  ]);
}
