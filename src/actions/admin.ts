"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import type { Permission } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { requiresModelConsent } from "@/lib/model-consent";
import { storage } from "@/lib/storage";
import { getSettings, setSetting, DEFAULT_SETTINGS, type Settings } from "@/lib/settings";
import { creditTokens, debitTokens, InsufficientTokensError } from "@/lib/tokens";
import { mailTemplates, sendMail } from "@/lib/mail";
import { safeRedirectPath, slugify } from "@/lib/utils";

const DAY = 86_400_000;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const back = (fd: FormData, fallback: string, flag = "ok=1") => {
  // Fehler führen immer zur jeweiligen Detailseite zurück, Erfolge zur angegebenen Rücksprungseite
  const to = flag.startsWith("fehler=") ? fallback : safeRedirectPath(str(fd, "back"), fallback);
  redirect(`${to}${to.includes("?") ? "&" : "?"}${flag}`);
};

async function guard(p: Permission) {
  return requirePermission(p, "/admin");
}

async function notify(userId: string, title: string, body: string, link?: string) {
  await db.notification.create({ data: { userId, title, body, link } });
}

// ───────────────────────── Sedcards & Bilder ─────────────────────────

export async function reviewProfileAction(fd: FormData) {
  const mod = await guard("moderation.profiles");
  const id = str(fd, "profileId");
  const decision = str(fd, "decision"); // approve | reject | block
  const reason = str(fd, "reason").slice(0, 500) || null;
  const p = await db.profile.findUnique({ where: { id }, include: { owner: true, images: true, category: true, verifications: { where: { docType: "MODEL_CONSENT" }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!p) return back(fd, "/admin/sedcards", "fehler=nicht-gefunden");
  const settings = await getSettings();

  if (decision === "approve") {
    // Pflicht: Echtheit durch das Team bestätigt (Video oder Sichtung der Bilder)
    if (!p.authenticityVerifiedAt) return back(fd, `/admin/sedcards/${id}`, "fehler=echtheit-fehlt");
    const needsConsent = await requiresModelConsent(p);
    if (needsConsent && p.verifications[0]?.status !== "APPROVED") return back(fd, `/admin/sedcards/${id}`, "fehler=nachweis-fehlt");
    if (!p.images.some((i) => i.status === "APPROVED")) return back(fd, `/admin/sedcards/${id}`, "fehler=kein-bild-freigegeben");
    const now = new Date();
    await db.profile.update({
      where: { id },
      data: {
        status: "PUBLISHED", rejectionReason: null, reviewedAt: now, verified: true,
        publishedAt: p.publishedAt ?? now,
        expiresAt: p.expiresAt && p.expiresAt > now ? p.expiresAt : new Date(now.getTime() + settings.profileDurationDays * DAY),
        slug: p.slug.startsWith("entwurf-") ? `${slugify(`${p.stageName}-${p.city}`)}-${id.slice(-4)}` : p.slug,
      },
    });
    // Glocke nur, wenn in den Einstellungen der Sedcard „Freigabestatus“ aktiv ist (E-Mail wird immer gesendet)
    if (p.notifyReview) await notify(p.ownerId, "Sedcard freigegeben", `„${p.stageName}“ ist jetzt online.`, `/dashboard/sedcards/${id}`);
    const m = mailTemplates.profileDecision(p.owner.displayName, p.stageName, true);
    await sendMail(p.owner.email, m.subject, m.html, m.text).catch(() => {});
  } else if (decision === "reject" || decision === "block") {
    if (!reason) return back(fd, `/admin/sedcards/${id}`, "fehler=begruendung-fehlt");
    await db.profile.update({ where: { id }, data: { status: decision === "block" ? "BLOCKED" : "REJECTED", rejectionReason: reason, reviewedAt: new Date() } });
    if (p.notifyReview) await notify(p.ownerId, decision === "block" ? "Sedcard gesperrt" : "Sedcard abgelehnt", `„${p.stageName}“: ${reason}`, `/dashboard/sedcards/${id}`);
    const m = mailTemplates.profileDecision(p.owner.displayName, p.stageName, false, reason);
    await sendMail(p.owner.email, m.subject, m.html, m.text).catch(() => {});
  }
  await audit(mod.id, `profile.${decision}`, { type: "Profile", id }, { reason });
  revalidatePath("/admin/sedcards");
  back(fd, "/admin/sedcards");
}

export async function reviewImageAction(fd: FormData) {
  const mod = await guard("moderation.images");
  const id = str(fd, "imageId");
  const decision = str(fd, "decision"); // approve | reject | ban
  const reason = str(fd, "reason").slice(0, 300) || "Entspricht nicht den Richtlinien.";
  const img = await db.profileImage.findUnique({ where: { id }, include: { profile: true } });
  if (!img) return back(fd, "/admin/bilder");
  if (decision === "approve") {
    await db.profileImage.update({ where: { id }, data: { status: "APPROVED", rejectReason: null } });
  } else {
    // "ban" = Hash-Sperre: Bild kann nirgends erneut hochgeladen werden (z. B. nicht einvernehmliche Aufnahmen)
    await db.profileImage.update({ where: { id }, data: { status: "REJECTED", rejectReason: decision === "ban" ? `[SPERRE] ${reason}` : reason } });
    if (decision === "ban") await db.profileImage.updateMany({ where: { sha256: img.sha256, id: { not: id } }, data: { status: "REJECTED", rejectReason: `[SPERRE] ${reason}` } });
    if (img.profile.notifyReview) await notify(img.profile.ownerId, "Bild abgelehnt", `Ein Bild deiner Sedcard „${img.profile.stageName}“ wurde abgelehnt: ${reason}`, `/dashboard/sedcards/${img.profileId}?schritt=5`);
  }
  await audit(mod.id, `image.${decision}`, { type: "ProfileImage", id }, { reason });
  revalidatePath("/admin/bilder");
  back(fd, "/admin/bilder");
}

// ───────────────────────── Verifizierungen ─────────────────────────

export async function reviewVerificationAction(fd: FormData) {
  const mod = await guard("moderation.verifications");
  const id = str(fd, "verificationId");
  const approve = str(fd, "decision") === "approve";
  const note = str(fd, "note").slice(0, 500) || null;
  const v = await db.identityVerification.findUnique({ where: { id } });
  if (!v || v.status !== "PENDING") return back(fd, "/admin/verifizierungen");
  if (!approve && !note) return back(fd, "/admin/verifizierungen", "fehler=begruendung-fehlt");
  if (approve && v.birthYear && new Date().getFullYear() - v.birthYear < 18) return back(fd, "/admin/verifizierungen", "fehler=minderjaehrig");

  await db.$transaction([
    db.identityVerification.update({ where: { id }, data: { status: approve ? "APPROVED" : "REJECTED", reviewerId: mod.id, reviewedAt: new Date(), reviewNote: note, documentKey: null, selfieKey: null } }),
    ...(v.profileId ? [] : [db.user.update({ where: { id: v.userId }, data: { verificationStatus: approve ? "APPROVED" : "REJECTED" } })]),
  ]);
  // Datenminimierung: Dokumente nach der Entscheidung löschen
  for (const k of [v.documentKey, v.selfieKey]) if (k) await storage().delete(k).catch(() => {});
  const vProfile = v.profileId ? await db.profile.findUnique({ where: { id: v.profileId }, select: { notifyReview: true } }) : null;
  if (!vProfile || vProfile.notifyReview) await notify(v.userId, approve ? "Nachweis bestätigt" : "Nachweis abgelehnt", approve ? "Deine Prüfung wurde erfolgreich abgeschlossen." : `Grund: ${note}`, v.profileId ? `/dashboard/sedcards/${v.profileId}?schritt=9` : "/dashboard");
  await audit(mod.id, `verification.${approve ? "approve" : "reject"}`, { type: "IdentityVerification", id }, { note });
  revalidatePath("/admin/verifizierungen");
  back(fd, "/admin/verifizierungen");
}

// ───────────────────────── Meldungen ─────────────────────────

export async function handleReportAction(fd: FormData) {
  const mod = await guard("moderation.reports");
  const id = str(fd, "reportId");
  const status = z.enum(["IN_REVIEW", "RESOLVED", "DISMISSED"]).catch("IN_REVIEW").parse(str(fd, "status"));
  const resolution = str(fd, "resolution").slice(0, 1000) || null;
  const contentAction = str(fd, "contentAction"); // none | hide | remove | block_profile | suspend_user
  const r = await db.report.findUnique({ where: { id } });
  if (!r) return back(fd, "/admin/meldungen");

  if (contentAction && contentAction !== "none") {
    const t = r.targetId;
    switch (r.targetType) {
      case "PROFILE":
        await db.profile.updateMany({ where: { id: t }, data: contentAction === "block_profile" || contentAction === "remove" ? { status: "BLOCKED", rejectionReason: resolution ?? "Gesperrt nach Meldung." } : { status: "PAUSED" } });
        break;
      case "IMAGE":
        await db.profileImage.updateMany({ where: { id: t }, data: { status: "REJECTED", rejectReason: contentAction === "remove" ? `[SPERRE] ${resolution ?? "Nach Meldung gesperrt"}` : resolution ?? "Nach Meldung entfernt" } });
        break;
      case "LISTING":
        await db.marketplaceListing.updateMany({ where: { id: t }, data: { status: "REMOVED", moderationNote: resolution } });
        break;
      case "POST":
        await db.forumPost.updateMany({ where: { id: t }, data: { status: contentAction === "hide" ? "HIDDEN" : "REMOVED" } });
        break;
      case "THREAD":
        await db.forumThread.updateMany({ where: { id: t }, data: { status: contentAction === "hide" ? "HIDDEN" : "REMOVED" } });
        break;
      case "MESSAGE":
        await db.message.updateMany({ where: { id: t }, data: { hidden: true } });
        break;
      case "AD":
        await db.adBooking.updateMany({ where: { id: t }, data: { status: "CANCELLED", rejectReason: resolution } });
        break;
      case "USER":
        break;
    }
    if (contentAction === "suspend_user") {
      const ownerId = await resolveOwner(r.targetType, r.targetId);
      if (ownerId) await suspend(ownerId, 30, resolution ?? "Verstoß gegen die Richtlinien (Meldung)", mod.id);
    }
  }
  await db.report.update({ where: { id }, data: { status, resolution, handlerId: mod.id, resolvedAt: status === "IN_REVIEW" ? null : new Date() } });
  if (r.reporterId && status !== "IN_REVIEW") await notify(r.reporterId, "Deine Meldung wurde bearbeitet", status === "RESOLVED" ? "Wir haben Maßnahmen ergriffen. Vielen Dank für deinen Hinweis." : "Nach Prüfung konnten wir keinen Verstoß feststellen.");
  await audit(mod.id, `report.${status.toLowerCase()}`, { type: "Report", id }, { contentAction, resolution });
  revalidatePath("/admin/meldungen");
  back(fd, "/admin/meldungen");
}

async function resolveOwner(type: string, id: string): Promise<string | null> {
  switch (type) {
    case "PROFILE": return (await db.profile.findUnique({ where: { id }, select: { ownerId: true } }))?.ownerId ?? null;
    case "IMAGE": return (await db.profileImage.findUnique({ where: { id }, select: { profile: { select: { ownerId: true } } } }))?.profile.ownerId ?? null;
    case "LISTING": return (await db.marketplaceListing.findUnique({ where: { id }, select: { ownerId: true } }))?.ownerId ?? null;
    case "POST": return (await db.forumPost.findUnique({ where: { id }, select: { authorId: true } }))?.authorId ?? null;
    case "THREAD": return (await db.forumThread.findUnique({ where: { id }, select: { authorId: true } }))?.authorId ?? null;
    case "MESSAGE": return (await db.message.findUnique({ where: { id }, select: { senderId: true } }))?.senderId ?? null;
    case "AD": return (await db.adBooking.findUnique({ where: { id }, select: { userId: true } }))?.userId ?? null;
    case "USER": return (await db.user.findUnique({ where: { id }, select: { id: true } }))?.id ?? null;
  }
  return null;
}

async function suspend(userId: string, days: number | null, reason: string, actorId: string) {
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.role === "ADMIN") return;
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: days ? { status: "SUSPENDED", suspendedUntil: new Date(Date.now() + days * DAY), suspensionReason: reason } : { status: "BANNED", suspensionReason: reason } }),
    db.session.deleteMany({ where: { userId } }),
  ]);
  await audit(actorId, days ? "user.suspend" : "user.ban", { type: "User", id: userId }, { days, reason });
}

// ───────────────────────── Marktplatz & Forum ─────────────────────────

export async function moderateListingAction(fd: FormData) {
  const mod = await guard("moderation.marketplace");
  const id = str(fd, "listingId");
  const decision = str(fd, "decision");
  const note = str(fd, "note").slice(0, 500) || null;
  const l = await db.marketplaceListing.findUnique({ where: { id } });
  if (!l) return back(fd, "/admin/marktplatz");
  const settings = await getSettings();
  if (decision === "approve") {
    await db.marketplaceListing.update({ where: { id }, data: { status: "PUBLISHED", publishedAt: new Date(), expiresAt: new Date(Date.now() + settings.listingDurationDays * DAY), moderationNote: null } });
    await notify(l.ownerId, "Inserat freigegeben", `„${l.title}“ ist jetzt im Marktplatz sichtbar.`, "/dashboard/marktplatz");
  } else {
    await db.marketplaceListing.update({ where: { id }, data: { status: decision === "remove" ? "REMOVED" : "REJECTED", moderationNote: note ?? "Entspricht nicht den Richtlinien." } });
    await notify(l.ownerId, decision === "remove" ? "Inserat entfernt" : "Inserat abgelehnt", `„${l.title}“: ${note ?? "Entspricht nicht den Richtlinien."}`, "/dashboard/marktplatz");
  }
  await audit(mod.id, `listing.${decision}`, { type: "MarketplaceListing", id }, { note });
  back(fd, "/admin/marktplatz");
}

export async function moderatePostAction(fd: FormData) {
  const mod = await guard("moderation.forum");
  const id = str(fd, "postId");
  const decision = str(fd, "decision"); // approve | hide | remove
  const post = await db.forumPost.findUnique({ where: { id }, include: { thread: { include: { posts: { orderBy: { createdAt: "asc" }, take: 1 } } } } });
  if (!post) return back(fd, "/admin/forum");
  const status = decision === "approve" ? "VISIBLE" : decision === "hide" ? "HIDDEN" : "REMOVED";
  await db.forumPost.update({ where: { id }, data: { status } });
  // Erster Beitrag bestimmt Sichtbarkeit des Themas
  if (post.thread.posts[0]?.id === id) await db.forumThread.update({ where: { id: post.threadId }, data: { status, lastPostAt: new Date() } });
  else if (status === "VISIBLE") await db.forumThread.update({ where: { id: post.threadId }, data: { lastPostAt: new Date() } });
  await audit(mod.id, `forum_post.${decision}`, { type: "ForumPost", id });
  back(fd, "/admin/forum");
}

export async function moderateThreadAction(fd: FormData) {
  const mod = await guard("moderation.forum");
  const id = str(fd, "threadId");
  const op = str(fd, "op");
  const t = await db.forumThread.findUnique({ where: { id } });
  if (!t) return back(fd, "/admin/forum");
  const data: Prisma.ForumThreadUpdateInput =
    op === "lock" ? { locked: !t.locked } : op === "pin" ? { pinned: !t.pinned } : op === "remove" ? { status: "REMOVED" } : op === "restore" ? { status: "VISIBLE" } : {};
  await db.forumThread.update({ where: { id }, data });
  await audit(mod.id, `forum_thread.${op}`, { type: "ForumThread", id });
  back(fd, "/admin/forum");
}

// ───────────────────────── Werbung ─────────────────────────

export async function reviewAdBookingAction(fd: FormData) {
  const mod = await guard("moderation.ads");
  const id = str(fd, "bookingId");
  const approve = str(fd, "decision") === "approve";
  const reason = str(fd, "reason").slice(0, 300) || "Entspricht nicht den Werberichtlinien.";
  const b = await db.adBooking.findUnique({ where: { id } });
  if (!b || b.status !== "PENDING_REVIEW") return back(fd, "/admin/werbung");
  if (approve) {
    const now = new Date();
    await db.adBooking.update({ where: { id }, data: { status: b.startsAt <= now ? "ACTIVE" : "SCHEDULED", rejectReason: null } });
    await notify(b.userId, "Werbebuchung freigegeben", `„${b.title}“ wurde freigegeben.`, "/dashboard/werbung");
  } else {
    await db.$transaction(async (tx) => {
      const upd = await tx.adBooking.updateMany({ where: { id, status: "PENDING_REVIEW" }, data: { status: "REJECTED", rejectReason: reason } });
      if (upd.count === 0) return;
      await creditTokens(tx, { userId: b.userId, tokens: b.tokenCost, type: "REFUND", reference: `ad-reject:${id}`, description: `Erstattung abgelehnte Werbebuchung „${b.title}“`, createdById: mod.id });
    });
    await notify(b.userId, "Werbebuchung abgelehnt", `„${b.title}“: ${reason}. Die Token wurden erstattet.`, "/dashboard/werbung");
  }
  await audit(mod.id, `ad.${approve ? "approve" : "reject"}`, { type: "AdBooking", id }, { reason });
  back(fd, "/admin/werbung");
}

export async function savePlacementAction(fd: FormData) {
  const admin = await guard("admin.ads");
  const parsed = z.object({
    id: z.string().optional(), key: z.string().regex(/^[a-z0-9-]{2,40}$/), name: z.string().min(2).max(80), description: z.string().max(300).optional(),
    location: z.enum(["HOME_HERO", "HOME_INLINE", "SEARCH_TOP", "SEARCH_SIDEBAR", "PROFILE_SIDEBAR", "MARKETPLACE_TOP"]),
    width: z.coerce.number().int().min(50).max(4000), height: z.coerce.number().int().min(50).max(4000),
    maxActive: z.coerce.number().int().min(1).max(20), tokenCostPerDay: z.coerce.number().int().min(0).max(100000), priority: z.coerce.number().int().min(0).max(1000),
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return back(fd, "/admin/werbung", "fehler=ungueltig");
  const { id, ...d } = parsed.data;
  const data = { ...d, description: d.description || null, active: fd.get("active") === "on" };
  const res = id ? await db.adPlacement.update({ where: { id }, data }) : await db.adPlacement.create({ data });
  await audit(admin.id, id ? "placement.update" : "placement.create", { type: "AdPlacement", id: res.id }, data);
  back(fd, "/admin/werbung");
}

// ───────────────────────── Benutzer ─────────────────────────

export async function updateUserAction(fd: FormData) {
  const admin = await guard("admin.users");
  const id = str(fd, "userId");
  const op = str(fd, "op");
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return back(fd, "/admin/benutzer");
  if (target.id === admin.id && op !== "verify") return back(fd, `/admin/benutzer/${id}`, "fehler=eigenes-konto");

  if (op === "role") {
    await guard("admin.roles");
    const role = z.enum(["MEMBER", "MODERATOR", "ADMIN"]).parse(str(fd, "role")) as Role;
    await db.user.update({ where: { id }, data: { role } });
    await db.session.deleteMany({ where: { userId: id } });
    await audit(admin.id, "user.role_change", { type: "User", id }, { from: target.role, to: role });
  } else if (op === "suspend") {
    const days = Math.max(1, Math.min(365, Number(str(fd, "days")) || 7));
    await suspend(id, days, str(fd, "reason") || "Verstoß gegen die Nutzungsbedingungen", admin.id);
  } else if (op === "ban") {
    await suspend(id, null, str(fd, "reason") || "Schwerer Verstoß gegen die Nutzungsbedingungen", admin.id);
    await db.profile.updateMany({ where: { ownerId: id, status: { in: ["PUBLISHED", "PENDING_REVIEW"] } }, data: { status: "BLOCKED", rejectionReason: "Konto gesperrt" } });
  } else if (op === "unban") {
    await db.user.update({ where: { id }, data: { status: "ACTIVE", suspendedUntil: null, suspensionReason: null, failedLoginCount: 0, lockedUntil: null } });
    await audit(admin.id, "user.unban", { type: "User", id });
  } else if (op === "verify") {
    await db.user.update({ where: { id }, data: { verificationStatus: str(fd, "value") === "revoke" ? "NONE" : "APPROVED" } });
    await audit(admin.id, "user.verification_override", { type: "User", id }, { value: str(fd, "value") });
  } else if (op === "verifyEmail") {
    await db.user.update({ where: { id }, data: { emailVerifiedAt: new Date() } });
    await audit(admin.id, "user.email_verified_manual", { type: "User", id });
  } else if (op === "logout") {
    await db.session.deleteMany({ where: { userId: id } });
    await audit(admin.id, "user.sessions_revoked", { type: "User", id });
  }
  revalidatePath(`/admin/benutzer/${id}`);
  back(fd, `/admin/benutzer/${id}`);
}

export async function adjustTokensAction(fd: FormData) {
  const admin = await guard("admin.tokens");
  const id = str(fd, "userId");
  const amount = Math.trunc(Number(str(fd, "amount")));
  const reason = str(fd, "reason").slice(0, 200);
  if (!amount || !reason || Math.abs(amount) > 1_000_000) return back(fd, `/admin/benutzer/${id}`, "fehler=ungueltig");
  try {
    await db.$transaction(async (tx) => {
      if (amount > 0) await creditTokens(tx, { userId: id, tokens: amount, type: "ADMIN_CREDIT", reference: `admin:${randomUUID()}`, description: reason, createdById: admin.id });
      else await debitTokens(tx, { userId: id, tokens: -amount, type: "ADMIN_DEBIT", reference: `admin:${randomUUID()}`, description: reason, createdById: admin.id });
    });
  } catch (e) {
    if (e instanceof InsufficientTokensError) return back(fd, `/admin/benutzer/${id}`, "fehler=guthaben");
    throw e;
  }
  await audit(admin.id, "tokens.adjust", { type: "User", id }, { amount, reason });
  back(fd, `/admin/benutzer/${id}`);
}

// ───────────────────────── Kategorien & Filter ─────────────────────────

export async function saveCategoryAction(fd: FormData) {
  const admin = await guard("admin.categories");
  const kind = str(fd, "kind"); // profile | marketplace | forum
  const id = str(fd, "id");
  const name = str(fd, "name").slice(0, 80);
  if (name.length < 2) return back(fd, "/admin/kategorien", "fehler=name");
  const data = { name, slug: slugify(str(fd, "slug") || name), description: str(fd, "description").slice(0, 300) || null, sortOrder: Number(str(fd, "sortOrder")) || 0, active: fd.get("active") === "on" };
  try {
    if (kind === "marketplace") id ? await db.marketplaceCategory.update({ where: { id }, data }) : await db.marketplaceCategory.create({ data });
    else if (kind === "forum") id ? await db.forumCategory.update({ where: { id }, data }) : await db.forumCategory.create({ data });
    else id ? await db.category.update({ where: { id }, data }) : await db.category.create({ data });
  } catch {
    return back(fd, "/admin/kategorien", "fehler=slug-vergeben");
  }
  await audit(admin.id, `category.${id ? "update" : "create"}`, { type: kind, id: id || data.slug }, data);
  back(fd, "/admin/kategorien");
}

export async function saveFilterAction(fd: FormData) {
  const admin = await guard("admin.filters");
  const parsed = z.object({
    id: z.string().optional(), key: z.string().regex(/^[a-z0-9_]{2,40}$/, "Schlüssel: nur a-z, 0-9, _"), label: z.string().trim().min(2).max(60),
    type: z.enum(["SELECT", "MULTISELECT", "BOOLEAN", "NUMBER"]), unit: z.string().max(10).optional(), helpText: z.string().max(200).optional(),
    sortOrder: z.coerce.number().int().default(0), minValue: z.string().optional(), maxValue: z.string().optional(),
    section: z.enum(["eigenschaften", "service"]).default("eigenschaften"),
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return back(fd, "/admin/filter", "fehler=ungueltig");
  const { id, minValue, maxValue, ...d } = parsed.data;
  const categoryIds = fd.getAll("categories").map(String);
  const data = {
    ...d, unit: d.unit || null, helpText: d.helpText || null,
    minValue: minValue ? Number(minValue) : null, maxValue: maxValue ? Number(maxValue) : null,
    active: fd.get("active") === "on", showInSearch: fd.get("showInSearch") === "on", perPerson: fd.get("perPerson") === "on",
  };
  try {
    const f = id ? await db.filterDefinition.update({ where: { id }, data }) : await db.filterDefinition.create({ data });
    await db.$transaction([
      db.filterCategory.deleteMany({ where: { filterId: f.id } }),
      db.filterCategory.createMany({ data: categoryIds.map((categoryId) => ({ filterId: f.id, categoryId })) }),
    ]);
    await audit(admin.id, `filter.${id ? "update" : "create"}`, { type: "FilterDefinition", id: f.id }, { ...data, categoryIds });
    if (!id) redirect(`/admin/filter/${f.id}?ok=1`);
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    return back(fd, "/admin/filter", "fehler=schluessel-vergeben");
  }
  back(fd, "/admin/filter");
}

export async function saveFilterOptionAction(fd: FormData) {
  const admin = await guard("admin.filters");
  const filterId = str(fd, "filterId");
  const id = str(fd, "id");
  const label = str(fd, "label").slice(0, 60);
  if (label.length < 1) return back(fd, `/admin/filter/${filterId}`, "fehler=label");
  const data = { label, value: slugify(str(fd, "value") || label) || label.toLowerCase(), sortOrder: Number(str(fd, "sortOrder")) || 0, active: fd.get("active") === "on" };
  try {
    id ? await db.filterOption.update({ where: { id }, data }) : await db.filterOption.create({ data: { ...data, filterId } });
  } catch {
    return back(fd, `/admin/filter/${filterId}`, "fehler=wert-vergeben");
  }
  await audit(admin.id, `filter_option.${id ? "update" : "create"}`, { type: "FilterDefinition", id: filterId }, data);
  back(fd, `/admin/filter/${filterId}`);
}

export async function deleteFilterOptionAction(fd: FormData) {
  const admin = await guard("admin.filters");
  const id = str(fd, "id");
  const o = await db.filterOption.delete({ where: { id } });
  await audit(admin.id, "filter_option.delete", { type: "FilterDefinition", id: o.filterId }, { label: o.label });
  back(fd, `/admin/filter/${o.filterId}`);
}

// ───────────────────────── Produkte, Pakete, Einstellungen ─────────────────────────

export async function saveProductAction(fd: FormData) {
  const admin = await guard("admin.products");
  const id = str(fd, "id");
  const data = {
    name: str(fd, "name").slice(0, 80), description: str(fd, "description").slice(0, 300) || null,
    tokenCost: Math.max(0, Math.trunc(Number(str(fd, "tokenCost")))), durationDays: Math.max(1, Math.trunc(Number(str(fd, "durationDays")))),
    priority: Math.trunc(Number(str(fd, "priority"))) || 0, active: fd.get("active") === "on",
  };
  if (!data.name || !Number.isFinite(data.tokenCost)) return back(fd, "/admin/produkte", "fehler=ungueltig");
  await db.premiumProduct.update({ where: { id }, data });
  await audit(admin.id, "product.update", { type: "PremiumProduct", id }, data);
  back(fd, "/admin/produkte");
}

export async function savePackageAction(fd: FormData) {
  const admin = await guard("admin.products");
  const id = str(fd, "id");
  const data = {
    name: str(fd, "name").slice(0, 60), tokens: Math.max(1, Math.trunc(Number(str(fd, "tokens")))), bonusTokens: Math.max(0, Math.trunc(Number(str(fd, "bonusTokens")) || 0)),
    priceCents: Math.max(1, Math.round(Number(str(fd, "price").replace(",", ".")) * 100)), sortOrder: Math.trunc(Number(str(fd, "sortOrder"))) || 0, active: fd.get("active") === "on",
  };
  if (!data.name || !Number.isFinite(data.priceCents) || !Number.isFinite(data.tokens)) return back(fd, "/admin/produkte", "fehler=ungueltig");
  const res = id ? await db.tokenPackage.update({ where: { id }, data }) : await db.tokenPackage.create({ data });
  await audit(admin.id, id ? "package.update" : "package.create", { type: "TokenPackage", id: res.id }, data);
  back(fd, "/admin/produkte");
}

export async function saveSettingsAction(fd: FormData) {
  const admin = await guard("admin.settings");
  const changes: Partial<Settings> = {};
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS) as [keyof Settings, unknown][]) {
    if (typeof def === "boolean") (changes as Record<string, unknown>)[key] = fd.get(key) === "on";
    else if (typeof def === "number") {
      const n = Math.trunc(Number(str(fd, key)));
      if (Number.isFinite(n) && n >= 0) (changes as Record<string, unknown>)[key] = n;
    } else (changes as Record<string, unknown>)[key] = str(fd, key).slice(0, 500);
  }
  for (const [k, v] of Object.entries(changes)) await setSetting(k as keyof Settings, v as never);
  await audit(admin.id, "settings.update", undefined, changes as Prisma.InputJsonValue);
  back(fd, "/admin/einstellungen");
}
