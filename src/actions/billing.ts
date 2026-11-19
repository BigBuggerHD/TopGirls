"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { debitTokens, InsufficientTokensError } from "@/lib/tokens";
import { ADAPTERS, processPaymentEvent } from "@/lib/payments";
import { signSandboxPayload, SANDBOX_SIGNATURE_HEADER } from "@/lib/payments/sandbox";
import { PaymentConfigError } from "@/lib/payments/types";
import { processAndStoreImage, UploadError } from "@/lib/storage/images";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { PROMOTION_TYPE } from "@/lib/labels";
import type { ActionState } from "@/lib/validation";

const DAY = 86_400_000;
const APP_URL = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

// ─────────────── Promotions (Premium, Hervorhebung, Gesponsert, Verlängerung) ───────────────

export async function bookPromotionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requirePermission("promotion.book");
  const parsed = z.object({ profileId: z.string().min(1), type: z.enum(["PREMIUM", "HIGHLIGHT", "SPONSORED_SEARCH", "EXTENSION"]), requestId: z.string().uuid() }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Ungültige Anfrage." };
  const { profileId, type, requestId } = parsed.data;
  const product = await db.premiumProduct.findFirst({ where: { type, active: true } });
  if (!product) return { ok: false, message: "Dieses Produkt ist derzeit nicht verfügbar." };
  const profile = await db.profile.findFirst({ where: { id: profileId, ownerId: user.id } });
  if (!profile) return { ok: false, message: "Sedcard nicht gefunden." };
  if (type !== "EXTENSION" && profile.status !== "PUBLISHED") return { ok: false, message: "Promotions sind nur für veröffentlichte Sedcards möglich." };
  if (type === "EXTENSION" && !["PUBLISHED", "EXPIRED", "PAUSED"].includes(profile.status)) return { ok: false, message: "Verlängerungen sind nur für freigegebene Sedcards möglich." };

  try {
    await db.$transaction(async (tx) => {
      const txRow = await debitTokens(tx, {
        userId: user.id, tokens: product.tokenCost, reference: `promotion:${requestId}`,
        description: `${PROMOTION_TYPE[type]} für „${profile.stageName}“ (${product.durationDays} Tage)`,
      });
      const now = new Date();
      const field = type === "PREMIUM" ? "premiumUntil" : type === "HIGHLIGHT" ? "highlightUntil" : type === "SPONSORED_SEARCH" ? "sponsoredUntil" : "expiresAt";
      const current = (profile as unknown as Record<string, Date | null>)[field];
      const start = current && current > now ? current : now; // Laufzeiten werden verlängert, nicht überschrieben
      const endsAt = new Date(start.getTime() + product.durationDays * DAY);
      await tx.promotion.create({ data: { profileId, userId: user.id, type, startsAt: start, endsAt, tokenCost: product.tokenCost, priority: product.priority, transactionId: txRow.id } });
      await tx.profile.update({
        where: { id: profileId },
        data: { [field]: endsAt, ...(type === "EXTENSION" && profile.status === "EXPIRED" ? { status: "PUBLISHED" } : {}) },
      });
    });
  } catch (e) {
    if (e instanceof InsufficientTokensError) return { ok: false, message: e.message };
    if ((e as { code?: string }).code === "P2002") return { ok: true, message: "Diese Buchung wurde bereits ausgeführt." };
    throw e;
  }
  revalidatePath("/dashboard/anzeigen");
  return { ok: true, message: `${PROMOTION_TYPE[type]} gebucht. ${product.tokenCost} Token wurden abgebucht.` };
}

// ─────────────── Werbebuchungen ───────────────

export async function bookAdAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requirePermission("ads.book");
  const parsed = z.object({
    placementId: z.string().min(1),
    title: z.string().trim().min(3, "Titel: mindestens 3 Zeichen.").max(60, "Titel: höchstens 60 Zeichen."),
    subtitle: z.string().trim().max(120).optional(),
    profileId: z.string().optional(),
    targetUrl: z.string().trim().max(300).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte gib ein Startdatum an."),
    days: z.coerce.number().int().min(1, "Mindestens 1 Tag.").max(90, "Höchstens 90 Tage."),
    requestId: z.string().uuid(),
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;

  const placement = await db.adPlacement.findFirst({ where: { id: d.placementId, active: true } });
  if (!placement) return { ok: false, message: "Werbefläche nicht verfügbar." };
  let profileId: string | null = null;
  if (d.profileId) {
    const prof = await db.profile.findFirst({ where: { id: d.profileId, ownerId: user.id } });
    if (!prof) return { ok: false, message: "Sedcard nicht gefunden." };
    profileId = prof.id;
  }
  let targetUrl: string | null = null;
  if (d.targetUrl) {
    if (!/^https:\/\/[^\s]+$/.test(d.targetUrl) && !/^\/[a-z0-9\-/]*$/i.test(d.targetUrl)) return { ok: false, message: "Ziel-URL muss mit https:// oder / beginnen." };
    targetUrl = d.targetUrl;
  }
  const startsAt = new Date(`${d.startDate}T00:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (startsAt < today) return { ok: false, message: "Das Startdatum darf nicht in der Vergangenheit liegen." };
  const endsAt = new Date(startsAt.getTime() + d.days * DAY - 1);

  // Kapazität prüfen
  const overlapping = await db.adBooking.count({ where: { placementId: placement.id, status: { in: ["PENDING_REVIEW", "SCHEDULED", "ACTIVE"] }, startsAt: { lte: endsAt }, endsAt: { gte: startsAt } } });
  if (overlapping >= placement.maxActive) return { ok: false, message: "Für diesen Zeitraum ist die Werbefläche bereits ausgebucht. Bitte wähle einen anderen Zeitraum." };

  let imageKey: string | null = null;
  const file = fd.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageKey = (await processAndStoreImage(file, "ads")).storageKey;
    } catch (e) {
      return { ok: false, message: e instanceof UploadError ? e.message : "Bild-Upload fehlgeschlagen." };
    }
  }

  const tokenCost = placement.tokenCostPerDay * d.days;
  try {
    await db.$transaction(async (tx) => {
      const t = await debitTokens(tx, { userId: user.id, tokens: tokenCost, reference: `ad:${d.requestId}`, description: `Werbebuchung „${placement.name}“ (${d.days} Tage)` });
      await tx.adBooking.create({
        data: { placementId: placement.id, userId: user.id, profileId, title: d.title, subtitle: d.subtitle || null, imageKey, targetUrl, startsAt, endsAt, days: d.days, tokenCost, priority: placement.priority, transactionId: t.id },
      });
    });
  } catch (e) {
    if (e instanceof InsufficientTokensError) return { ok: false, message: `${e.message} Benötigt: ${tokenCost} Token.` };
    if ((e as { code?: string }).code === "P2002") return { ok: true, message: "Diese Buchung wurde bereits ausgeführt." };
    throw e;
  }
  revalidatePath("/dashboard/werbung");
  return { ok: true, message: `Werbebuchung eingereicht (${tokenCost} Token). Sie wird nach der Prüfung zum Startdatum aktiv.` };
}

export async function cancelAdAction(fd: FormData) {
  const user = await requireUser();
  const id = String(fd.get("bookingId"));
  const booking = await db.adBooking.findFirst({ where: { id, userId: user.id, status: { in: ["PENDING_REVIEW", "SCHEDULED"] } } });
  if (!booking) return;
  // Stornierung vor Laufzeitbeginn: volle Rückerstattung
  await db.$transaction(async (tx) => {
    const upd = await tx.adBooking.updateMany({ where: { id, status: { in: ["PENDING_REVIEW", "SCHEDULED"] } }, data: { status: "CANCELLED" } });
    if (upd.count === 0) return;
    const u = await tx.user.update({ where: { id: user.id }, data: { tokenBalance: { increment: booking.tokenCost } } });
    await tx.tokenTransaction.create({ data: { userId: user.id, type: "REFUND", tokens: booking.tokenCost, balanceAfter: u.tokenBalance, reference: `ad-cancel:${id}`, description: `Erstattung Stornierung Werbebuchung „${booking.title}“` } });
  });
  revalidatePath("/dashboard/werbung");
}

// ─────────────── Token-Kauf ───────────────

export async function startCheckoutAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requirePermission("tokens.buy");
  if (!user.emailVerifiedAt) return { ok: false, message: "Bitte bestätige zuerst deine E-Mail-Adresse." };
  if (user.tokenBalance < 0) return { ok: false, message: "Dein Konto weist ein negatives Guthaben auf. Bitte kontaktiere den Support." };
  if (!rateLimit(`checkout:${user.id}`, 10, 60 * 60_000).ok) return { ok: false, message: "Zu viele Zahlungsversuche. Bitte warte etwas." };
  const parsed = z.object({ packageId: z.string().min(1), provider: z.enum(["PAYPAL", "CREDIT_CARD", "NEXTCOUP", "SANDBOX"]), idempotencyKey: z.string().uuid() }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: "Bitte wähle ein Paket und eine Zahlungsart." };
  const { packageId, provider, idempotencyKey } = parsed.data;
  const adapter = ADAPTERS[provider];
  if (!adapter.isAvailable()) return { ok: false, message: adapter.unavailableReason() ?? "Zahlungsart nicht verfügbar." };
  const pkg = await db.tokenPackage.findFirst({ where: { id: packageId, active: true } });
  if (!pkg) return { ok: false, message: "Paket nicht verfügbar." };

  // Idempotenz: doppelt abgeschickte Formulare erzeugen keine zweite Zahlung
  const existing = await db.payment.findUnique({ where: { idempotencyKey } });
  if (existing) {
    if (existing.userId !== user.id) return { ok: false, message: "Ungültige Anfrage." };
    if (existing.status === "CREATED" && provider === "SANDBOX") redirect(`/dashboard/tokens/sandbox/${existing.id}`);
    return { ok: false, message: "Diese Zahlung wurde bereits gestartet." };
  }

  const payment = await db.payment.create({
    data: { userId: user.id, packageId: pkg.id, provider, idempotencyKey, amountCents: pkg.priceCents, tokens: pkg.tokens + pkg.bonusTokens },
  });
  let redirectUrl: string;
  try {
    const res = await adapter.createCheckout({
      paymentId: payment.id, amountCents: pkg.priceCents, currency: "EUR",
      description: `Top Girls – ${pkg.name} (${pkg.tokens + pkg.bonusTokens} Token)`,
      returnUrl: `${APP_URL()}/api/payments/${provider === "PAYPAL" ? "paypal" : "sandbox"}/return?pid=${payment.id}`,
      cancelUrl: `${APP_URL()}/dashboard/tokens?abgebrochen=1`,
    });
    await db.payment.update({ where: { id: payment.id }, data: { providerRef: res.providerRef, status: "PENDING" } });
    redirectUrl = res.redirectUrl;
  } catch (e) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: (e as Error).message.slice(0, 300) } });
    return { ok: false, message: e instanceof PaymentConfigError ? e.message : "Die Zahlung konnte nicht gestartet werden. Bitte versuche es später erneut." };
  }
  await audit(user.id, "payment.start", { type: "Payment", id: payment.id }, { provider, amountCents: pkg.priceCents });
  redirect(redirectUrl);
}

/**
 * Sandbox: simuliert die Antwort des Zahlungsanbieters. Erzeugt ein signiertes Webhook-Ereignis
 * und verarbeitet es über denselben Weg wie echte Anbieter-Webhooks (Signaturprüfung → Verarbeitung).
 */
export async function simulateSandboxPaymentAction(fd: FormData) {
  const user = await requireUser();
  if (process.env.PAYMENT_SANDBOX !== "true") redirect("/dashboard/tokens");
  const payment = await db.payment.findFirst({ where: { id: String(fd.get("paymentId")), userId: user.id, provider: "SANDBOX" } });
  if (!payment) redirect("/dashboard/tokens");
  const outcome = String(fd.get("outcome"));
  const type = outcome === "success" ? "payment.succeeded" : outcome === "fail" ? "payment.failed" : "payment.cancelled";
  const body = JSON.stringify({ id: `evt_${randomUUID()}`, type, paymentId: payment.id, providerRef: payment.providerRef, amountCents: payment.amountCents, currency: payment.currency });
  const headers = new Headers({ [SANDBOX_SIGNATURE_HEADER]: signSandboxPayload(body) });
  const verified = await ADAPTERS.SANDBOX.verifyWebhook(body, headers);
  if (type === "payment.cancelled") verified.status = "CANCELLED";
  await processPaymentEvent("SANDBOX", verified);
  redirect(`/dashboard/tokens?zahlung=${outcome === "success" ? "ok" : outcome === "fail" ? "fehler" : "abgebrochen"}`);
}
