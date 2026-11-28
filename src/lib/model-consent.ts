import "server-only";
import { db } from "@/lib/db";

/** Kategorien, in denen eine reale Person dargestellt wird. */
export const PERSON_CATEGORIES = ["frauen", "online-inserate"];

/**
 * Schutzregel (Minderjährigkeit, Zwang, Identitätsmissbrauch):
 * Die erste Personen-Sedcard eines Kontos wird über die Echtheitsprüfung (Schritt 7) abgedeckt.
 * Jede WEITERE Personen-Sedcard (z. B. von Agenturen) benötigt einen Alters- und Einwilligungsnachweis
 * der dargestellten Person.
 */
export async function requiresModelConsent(p: { id: string; ownerId: string; createdAt: Date; category: { slug: string } }): Promise<boolean> {
  if (!PERSON_CATEGORIES.includes(p.category.slug)) return false;
  const earlier = await db.profile.count({
    where: { ownerId: p.ownerId, id: { not: p.id }, createdAt: { lt: p.createdAt }, category: { slug: { in: PERSON_CATEGORIES } } },
  });
  return earlier > 0;
}
