"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { listingSchema, parseEuroToCents, zodErrors, type ActionState } from "@/lib/validation";
import { checkContent } from "@/lib/content-filter";
import { rateLimit } from "@/lib/rate-limit";

export async function saveListingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requirePermission("marketplace.post");
  if (!user.emailVerifiedAt) return { ok: false, message: "Bitte bestätige zuerst deine E-Mail-Adresse." };
  if (!rateLimit(`listing:${user.id}`, 20, 60 * 60_000).ok) return { ok: false, message: "Zu viele Inserate in kurzer Zeit." };
  const parsed = listingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;
  const cat = await db.marketplaceCategory.findFirst({ where: { id: d.categoryId, active: true } });
  if (!cat) return { ok: false, errors: { categoryId: ["Ungültige Kategorie."] } };
  // Personenbezogene Daten Dritter im Fließtext verhindern (Kontaktdaten gehören in die Kontaktfelder)
  const filter = checkContent(`${d.title}\n${d.description}`);
  const id = String(fd.get("id") ?? "");
  const data = {
    categoryId: cat.id, title: d.title, description: d.description, city: d.city, priceCents: parseEuroToCents(d.price), priceUnit: d.priceUnit,
    contactEmail: d.contactEmail ?? null, contactPhone: d.contactPhone ?? null, status: "PENDING_REVIEW" as const,
    moderationNote: filter.flagged ? `Automatischer Hinweis: ${filter.reasons.join(", ")}` : null,
  };
  if (id) {
    const existing = await db.marketplaceListing.findFirst({ where: { id, ownerId: user.id } });
    if (!existing || existing.status === "REMOVED") return { ok: false, message: "Inserat nicht gefunden." };
    await db.marketplaceListing.update({ where: { id }, data });
  } else {
    await db.marketplaceListing.create({ data: { ...data, ownerId: user.id } });
  }
  revalidatePath("/dashboard/marktplatz");
  redirect("/dashboard/marktplatz?gespeichert=1");
}

export async function deleteListingAction(fd: FormData) {
  const user = await requirePermission("marketplace.post");
  await db.marketplaceListing.deleteMany({ where: { id: String(fd.get("id")), ownerId: user.id } });
  revalidatePath("/dashboard/marktplatz");
}
