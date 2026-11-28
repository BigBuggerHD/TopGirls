"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { isStaff } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { storage } from "@/lib/storage";
import { UploadError } from "@/lib/storage/images";
import { newAuthLink, storeAuthPhoto } from "@/lib/authenticity";

export type AuthLinkState = { ok: boolean; message: string; url?: string };

const deleteKey = (key: string | null | undefined) => (key ? storage().delete(key).catch(() => {}) : Promise.resolve());

/** Schritt 7: Einmal-Link erstellen. Ein neuer Link macht ältere (noch nicht bestätigte) Links ungültig. */
export async function createAuthenticityLinkAction(profileId: string): Promise<AuthLinkState> {
  const user = await requireUser();
  const p = await db.profile.findUnique({ where: { id: profileId }, select: { id: true, ownerId: true, authenticityVerifiedAt: true } });
  if (!p || (p.ownerId !== user.id && !isStaff(user.role))) return { ok: false, message: "Sedcard nicht gefunden." };
  if (p.authenticityVerifiedAt) return { ok: false, message: "Die Echtheit dieser Sedcard ist bereits bestätigt." };
  if (!rateLimit(`authlink:${p.id}`, 10, 60 * 60_000).ok) return { ok: false, message: "Zu viele Links erstellt. Bitte versuche es später erneut." };
  const old = await db.authenticityCheck.findMany({ where: { profileId: p.id, status: { not: "APPROVED" } } });
  await Promise.all(old.map((c) => deleteKey(c.videoKey)));
  await db.authenticityCheck.deleteMany({ where: { id: { in: old.map((c) => c.id) } } });
  const link = newAuthLink();
  await db.authenticityCheck.create({ data: { profileId: p.id, tokenHash: link.tokenHash, createdById: user.id } });
  await audit(user.id, "authenticity.link", { type: "Profile", id: p.id });
  revalidatePath(`/dashboard/sedcards/${p.id}`);
  return { ok: true, message: "Link erstellt.", url: link.url };
}

async function notify(userId: string, title: string, body: string, link?: string) {
  await db.notification.create({ data: { userId, title, body, link } });
}

/** Team: Standbild aus dem Video als internes Echtheitsfoto speichern. */
export async function saveAuthenticityPhotoAction(profileId: string, jpegDataUrl: string): Promise<{ ok: boolean; message: string }> {
  const mod = await requirePermission("moderation.profiles", "/admin");
  const p = await db.profile.findUnique({ where: { id: profileId }, select: { id: true, authenticityPhotoKey: true } });
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  try {
    const key = await storeAuthPhoto(jpegDataUrl, p.id);
    await db.profile.update({ where: { id: p.id }, data: { authenticityPhotoKey: key } });
    await deleteKey(p.authenticityPhotoKey);
  } catch (e) {
    return { ok: false, message: e instanceof UploadError ? e.message : "Speichern fehlgeschlagen." };
  }
  await audit(mod.id, "authenticity.photo", { type: "Profile", id: p.id });
  revalidatePath(`/admin/sedcards/${p.id}`);
  return { ok: true, message: "Echtheitsfoto gespeichert." };
}

/** Team: Echtheit bestätigen (mit oder ohne Video – z. B. nach Sichtung der Bilder). Video und Standort werden gelöscht. */
export async function confirmAuthenticityAction(fd: FormData) {
  const mod = await requirePermission("moderation.profiles", "/admin");
  const id = String(fd.get("profileId") ?? "");
  const p = await db.profile.findUnique({ where: { id }, include: { authenticityChecks: true } });
  if (!p) return;
  await Promise.all(p.authenticityChecks.map((c) => deleteKey(c.videoKey)));
  await db.$transaction([
    db.profile.update({ where: { id }, data: { authenticityVerifiedAt: new Date(), verified: true } }),
    db.authenticityCheck.updateMany({
      where: { profileId: id },
      data: { status: "APPROVED", videoKey: null, videoMime: null, locationCity: null, locationKm: null, reviewerId: mod.id, reviewedAt: new Date() },
    }),
  ]);
  await audit(mod.id, "authenticity.confirm", { type: "Profile", id });
  await notify(p.ownerId, "Echtheit bestätigt", `Die Echtheit von „${p.stageName}“ wurde bestätigt.`, `/dashboard/sedcards/${id}?schritt=7`);
  revalidatePath(`/admin/sedcards/${id}`);
}

/** Team: Aufnahme ablehnen – der Link bleibt gültig, damit eine neue Aufnahme gemacht werden kann. */
export async function rejectAuthenticityAction(fd: FormData) {
  const mod = await requirePermission("moderation.profiles", "/admin");
  const id = String(fd.get("checkId") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 300) || "Die Aufnahme entspricht nicht den Vorgaben.";
  const c = await db.authenticityCheck.findUnique({ where: { id }, include: { profile: { select: { id: true, ownerId: true, stageName: true } } } });
  if (!c || c.status === "APPROVED") return;
  await deleteKey(c.videoKey);
  await db.authenticityCheck.update({ where: { id }, data: { status: "REJECTED", reviewNote: note, videoKey: null, videoMime: null, locationCity: null, locationKm: null, reviewerId: mod.id, reviewedAt: new Date() } });
  await audit(mod.id, "authenticity.reject", { type: "Profile", id: c.profileId });
  await notify(c.profile.ownerId, "Echtheits-Video abgelehnt", `„${c.profile.stageName}“: ${note} Über denselben Link kann ein neues Video aufgenommen werden.`, `/dashboard/sedcards/${c.profileId}?schritt=7`);
  revalidatePath(`/admin/sedcards/${c.profileId}`);
}

/** Team: Bestätigung zurücknehmen. */
export async function revokeAuthenticityAction(fd: FormData) {
  const mod = await requirePermission("moderation.profiles", "/admin");
  const id = String(fd.get("profileId") ?? "");
  await db.profile.update({ where: { id }, data: { authenticityVerifiedAt: null, verified: false } });
  await audit(mod.id, "authenticity.revoke", { type: "Profile", id });
  revalidatePath(`/admin/sedcards/${id}`);
}
