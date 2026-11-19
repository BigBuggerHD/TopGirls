"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { destroySession, requirePermission, requireUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { passwordSchema, zodErrors, type ActionState } from "@/lib/validation";
import { storePrivateDocument, UploadError } from "@/lib/storage/images";
import { storage } from "@/lib/storage";
import { randomToken } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export async function updateAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z.object({
    displayName: z.string().trim().min(2, "Mindestens 2 Zeichen.").max(60),
    companyName: z.string().trim().max(120).optional(),
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  await db.user.update({ where: { id: user.id }, data: { displayName: parsed.data.displayName, companyName: parsed.data.companyName || null } });
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "Deine Angaben wurden gespeichert." };
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = z.object({ current: z.string().min(1, "Bitte gib dein aktuelles Passwort ein."), password: passwordSchema, passwordConfirm: z.string() })
    .refine((d) => d.password === d.passwordConfirm, { path: ["passwordConfirm"], message: "Die Passwörter stimmen nicht überein." })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const full = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(full.passwordHash, parsed.data.current))) return { ok: false, errors: { current: ["Das aktuelle Passwort ist falsch."] } };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await audit(user.id, "user.password_change");
  return { ok: true, message: "Dein Passwort wurde geändert." };
}

export async function requestVerificationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requirePermission("verification.request");
  if (user.verificationStatus === "PENDING") return { ok: false, message: "Es läuft bereits eine Prüfung." };
  if (user.verificationStatus === "APPROVED") return { ok: true, message: "Dein Konto ist bereits verifiziert." };
  const parsed = z.object({
    docType: z.enum(["ID_CARD", "PASSPORT", "PROSTSCHG_CERT", "BUSINESS_REGISTRATION"]),
    birthYear: z.coerce.number().int().min(1920).max(new Date().getFullYear() - 18, "Du musst mindestens 18 Jahre alt sein."),
    consent: z.literal("on", { message: "Bitte stimme der Verarbeitung zu." }),
  }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const doc = fd.get("document");
  const selfie = fd.get("selfie");
  if (!(doc instanceof File) || doc.size === 0) return { ok: false, errors: { document: ["Bitte lade ein Bild des Dokuments hoch."] } };
  try {
    const documentKey = await storePrivateDocument(doc, `verifications/${user.id}`);
    const selfieKey = selfie instanceof File && selfie.size > 0 ? await storePrivateDocument(selfie, `verifications/${user.id}`) : null;
    await db.$transaction([
      db.identityVerification.create({ data: { userId: user.id, docType: parsed.data.docType, documentKey, selfieKey, birthYear: parsed.data.birthYear } }),
      db.user.update({ where: { id: user.id }, data: { verificationStatus: "PENDING" } }),
    ]);
  } catch (e) {
    return { ok: false, message: e instanceof UploadError ? e.message : "Upload fehlgeschlagen." };
  }
  await audit(user.id, "verification.request");
  revalidatePath("/dashboard/verifizierung");
  return { ok: true, message: "Deine Unterlagen wurden übermittelt. Die Prüfung dauert in der Regel 1–2 Werktage." };
}

/** DSGVO Art. 17: Konto löschen. Buchhaltungsrelevante Daten werden anonymisiert aufbewahrt (§ 147 AO, § 257 HGB). */
export async function deleteAccountAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.role === "ADMIN") return { ok: false, message: "Administratorkonten können nicht selbst gelöscht werden." };
  if (fd.get("confirm") !== "LÖSCHEN") return { ok: false, message: "Bitte gib zur Bestätigung LÖSCHEN ein." };
  const full = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(full.passwordHash, String(fd.get("password") ?? "")))) return { ok: false, message: "Das Passwort ist falsch." };

  const images = await db.profileImage.findMany({ where: { profile: { ownerId: user.id } } });
  const docs = await db.identityVerification.findMany({ where: { userId: user.id } });
  const ads = await db.adBooking.findMany({ where: { userId: user.id, imageKey: { not: null } } });
  await db.$transaction([
    db.profile.deleteMany({ where: { ownerId: user.id } }),
    db.marketplaceListing.deleteMany({ where: { ownerId: user.id } }),
    db.identityVerification.deleteMany({ where: { userId: user.id } }),
    db.notification.deleteMany({ where: { userId: user.id } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.forumPost.updateMany({ where: { authorId: user.id }, data: { body: "[Beitrag wurde vom Verfasser gelöscht]" } }),
    db.message.updateMany({ where: { senderId: user.id }, data: { body: "[Nachricht gelöscht]" } }),
    db.user.update({
      where: { id: user.id },
      data: { status: "DELETED", email: `geloescht-${user.id}@invalid.local`, displayName: "Gelöschtes Konto", companyName: null, passwordHash: await hashPassword(randomToken()), emailVerifiedAt: null },
    }),
  ]);
  for (const k of [...images.flatMap((i) => [i.storageKey, i.thumbKey]), ...docs.flatMap((d) => [d.documentKey, d.selfieKey]), ...ads.map((a) => a.imageKey)]) {
    if (k) await storage().delete(k).catch(() => {});
  }
  await audit(user.id, "user.self_delete");
  await destroySession();
  redirect("/?konto-geloescht=1");
}
