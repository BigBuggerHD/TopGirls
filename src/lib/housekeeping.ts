import "server-only";
import { db } from "@/lib/db";

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
