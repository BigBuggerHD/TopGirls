"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission, requireUser, type SessionUser } from "@/lib/auth/session";
import { can, isStaff } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { slugify, randomSuffix } from "@/lib/utils";
import { checkProfileText } from "@/lib/content-filter";
import { processAndStoreImage, storePrivateDocument, UploadError } from "@/lib/storage/images";
import { storage } from "@/lib/storage";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { PERSON_CATEGORIES, requiresModelConsent } from "@/lib/model-consent";
import { WIZARD_HIDDEN_FILTER_KEYS } from "@/lib/meeting";
import { WEEKDAYS } from "@/lib/labels";
import { MAX_PRICE_ROWS, type PriceRow } from "@/lib/prices";
import type { Availability } from "@/lib/availability";
import {
  parseEuroToCents,
  profileBasicsSchema, profileContactSchema, profileDescriptionSchema, profileLocationSchema, zodErrors, type ActionState,
} from "@/lib/validation";


async function ownedProfile(id: string, user: SessionUser) {
  const p = await db.profile.findUnique({ where: { id }, include: { category: true } });
  if (!p || (p.ownerId !== user.id && !isStaff(user.role))) return null;
  return p;
}

/** Inhaltliche Änderungen an veröffentlichten Sedcards werden erneut geprüft. */
function reviewIfPublished(status: string): Prisma.ProfileUncheckedUpdateInput {
  return status === "PUBLISHED" || status === "REJECTED" ? { status: status === "PUBLISHED" ? "PENDING_REVIEW" : "DRAFT", submittedAt: status === "PUBLISHED" ? new Date() : undefined } : {};
}

/** Nach dem Speichern: optional zum nächsten Schritt des Assistenten weiterleiten. */
function done(id: string, step: number, fd: FormData): ActionState {
  revalidatePath(`/dashboard/sedcards/${id}`);
  revalidatePath("/dashboard/sedcards");
  if (fd.get("continue") === "1") redirect(`/dashboard/sedcards/${id}?schritt=${step + 1}`);
  return { ok: true, message: "Gespeichert." };
}

export async function createProfileAction() {
  const user = await requirePermission("profile.own");
  const settings = await getSettings();
  const count = await db.profile.count({ where: { ownerId: user.id } });
  const max = can(user.role, "profile.multiple") ? settings.maxProfilesPerBusiness : settings.maxProfilesPerProvider;
  if (count >= max) redirect("/dashboard/sedcards?limit=1");
  const defaultCat = await db.category.findFirst({
    where: { active: true, slug: "frauen" },
  }) ?? (await db.category.findFirstOrThrow({ where: { active: true }, orderBy: { sortOrder: "asc" } }));
  const p = await db.profile.create({
    data: { ownerId: user.id, categoryId: defaultCat.id, stageName: "Neue Sedcard", slug: `entwurf-${randomSuffix(8)}` },
  });
  await audit(user.id, "profile.create", { type: "Profile", id: p.id });
  redirect(`/dashboard/sedcards/${p.id}?schritt=1`);
}

export async function saveProfileDataAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  const parsed = profileBasicsSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;
  const cat = await db.category.findFirst({ where: { id: d.categoryId, active: true } });
  if (!cat) return { ok: false, errors: { categoryId: ["Ungültige Kategorie."] } };
  if (PERSON_CATEGORIES.includes(cat.slug) && !d.age) return { ok: false, message: "Bitte prüfe deine Eingaben.", errors: { age: ["Bitte gib das Alter an (mindestens 18)."] } };
  const duo = d.profileType === "DUO";
  if (duo && PERSON_CATEGORIES.includes(cat.slug) && !d.age2) return { ok: false, message: "Bitte prüfe deine Eingaben.", errors: { age2: ["Bitte gib das Alter der zweiten Person an (mindestens 18)."] } };
  const text = checkProfileText(`${d.stageName} ${d.partnerName ?? ""}`);
  if (text.flagged) return { ok: false, message: `Unzulässiger Inhalt: ${text.reasons.join(", ")}.` };

  const changed = d.stageName !== p.stageName || d.age !== p.age || (duo && (d.age2 !== p.age2 || d.partnerName !== p.partnerName)) || d.profileType !== p.profileType;
  const slugBase = slugify(`${d.stageName}-${p.city || cat.slug}`) || "sedcard";
  await db.profile.update({
    where: { id: p.id },
    data: {
      stageName: d.stageName, age: d.age ?? null, categoryId: cat.id,
      profileType: d.profileType, partnerName: duo ? d.partnerName : null, age2: duo ? d.age2 ?? null : null,
      // Sprachen werden vorerst nicht abgefragt – vorhandene Angaben nur ändern, wenn das Feld gesendet wird
      ...(fd.has("languages") ? { languages: (d.languages ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8) } : {}),
      slug: p.slug.startsWith("entwurf-") || p.stageName !== d.stageName ? `${slugBase}-${randomSuffix(4)}` : p.slug,
      ...(changed ? reviewIfPublished(p.status) : {}),
    },
  });
  await writeAttributes({ id: p.id, profileType: d.profileType, categoryId: cat.id }, fd);
  return done(p.id, 1, fd);
}

export async function saveDescriptionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  const parsed = profileDescriptionSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const { description, headline } = parsed.data;
  const text = checkProfileText(`${headline ?? ""} ${description}`);
  if (text.flagged) return { ok: false, message: `Unzulässiger Inhalt: ${text.reasons.join(", ")}. Bitte beachte unsere Richtlinien.` };
  const changed = description !== p.description || headline !== p.headline;
  await db.profile.update({
    where: { id: p.id },
    data: { description, headline, ...(changed ? reviewIfPublished(p.status) : {}) },
  });
  return done(p.id, 2, fd);
}

export async function saveLocationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  const parsed = profileLocationSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  await db.profile.update({ where: { id: p.id }, data: { city: parsed.data.city, postalCode: parsed.data.postalCode ?? null, region: parsed.data.region } });
  return done(p.id, 4, fd);
}

export async function saveContactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  const parsed = profileContactSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;
  const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
  const availability: Availability = {};
  for (const [k] of WEEKDAYS) {
    const mode = String(fd.get(`av_${k}_mode`) ?? "none");
    const from = String(fd.get(`av_${k}_from`) ?? "");
    const to = String(fd.get(`av_${k}_to`) ?? "");
    if (mode === "allday" || mode === "arrange") availability[k] = { active: true, mode };
    else if (mode === "time" && timeRe.test(from) && timeRe.test(to)) availability[k] = { active: true, mode: "time", from, to };
    else availability[k] = { active: false }; // erscheint als „nach Absprache“
  }
  await db.profile.update({
    where: { id: p.id },
    data: {
      contactPhone: d.contactPhone ?? null, contactWhatsapp: d.contactWhatsapp ?? null, contactEmail: d.contactEmail ?? null,
      contactWebsite: d.contactWebsite ?? null, showPhone: d.showPhone === "on", allowMessages: d.allowMessages === "on",
      availabilityNote: d.availabilityNote, availability,
      prices: readPrices(fd),
      priceNote: String(fd.get("priceNote") ?? "").trim().slice(0, 300) || null,
    },
  });
  return done(p.id, 5, fd);
}

/** Liest die Preiszeilen (price_label_N, price_in_N, price_out_N). Zeilen ohne Bezeichnung werden ignoriert. */
function readPrices(fd: FormData): PriceRow[] {
  const rows: PriceRow[] = [];
  const amount = (name: string) => {
    const c = parseEuroToCents(String(fd.get(name) ?? "").trim());
    return c != null && c >= 0 && c <= 10_000_000 ? c : null;
  };
  for (let i = 0; i < MAX_PRICE_ROWS; i++) {
    const label = String(fd.get(`price_label_${i}`) ?? "").trim().slice(0, 60);
    const incallCents = amount(`price_in_${i}`);
    const outcallCents = amount(`price_out_${i}`);
    if (label) rows.push({ label, incallCents, outcallCents }); // ohne Preis → „nach Absprache“
  }
  return rows;
}

/**
 * Schreibt die Eigenschaften (Formularfelder attr_<key>, bei Duo zusätzlich attr2_<key>) für die Filter der Kategorie.
 * Eigenschaften, die nicht (mehr) zur Kategorie gehören, werden entfernt.
 */
async function writeAttributes(p: { id: string; profileType: string; categoryId: string }, fd: FormData) {
  const filters = await db.filterDefinition.findMany({ where: { active: true, categories: { some: { categoryId: p.categoryId } } }, include: { options: { where: { active: true } } } });
  await db.profileAttribute.deleteMany({ where: { profileId: p.id, filter: { active: true }, filterId: { notIn: filters.map((f) => f.id) } } });
  const duo = p.profileType === "DUO";
  await db.$transaction(async (tx) => {
    // Bei Wechsel von Duo zu Einzel: Angaben der zweiten Person entfernen
    if (!duo) await tx.profileAttribute.deleteMany({ where: { profileId: p.id, person: 2 } });
    for (const f of filters) {
      if (WIZARD_HIDDEN_FILTER_KEYS.includes(f.key)) continue; // nicht im Formular → vorhandene Werte unverändert lassen
      const persons = duo && f.perPerson ? [1, 2] : [1];
      for (const person of persons) {
        const name = `${person === 2 ? "attr2" : "attr"}_${f.key}`;
        await tx.profileAttribute.deleteMany({ where: { profileId: p.id, filterId: f.id, person } });
        const base = { profileId: p.id, filterId: f.id, person };
        if (f.type === "SELECT" || f.type === "MULTISELECT") {
          const values = fd.getAll(name).map(String);
          const optionIds = f.options.filter((o) => values.includes(o.id)).map((o) => o.id).slice(0, f.type === "SELECT" ? 1 : 50);
          if (optionIds.length) await tx.profileAttribute.create({ data: { ...base, options: { create: optionIds.map((optionId) => ({ optionId })) } } });
        } else if (f.type === "BOOLEAN") {
          const v = fd.get(name);
          if (v === "yes" || v === "no") await tx.profileAttribute.create({ data: { ...base, boolValue: v === "yes" } });
        } else if (f.type === "NUMBER") {
          const raw = String(fd.get(name) ?? "").trim();
          if (raw) {
            const n = Math.round(Number(raw));
            if (Number.isFinite(n) && (f.minValue == null || n >= f.minValue) && (f.maxValue == null || n <= f.maxValue)) {
              await tx.profileAttribute.create({ data: { ...base, numberValue: n } });
            }
          }
        }
      }
    }
  });
}

export async function uploadImagesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  if (!rateLimit(`upload:${user.id}`, 40, 60 * 60_000).ok) return { ok: false, message: "Upload-Limit erreicht. Bitte versuche es später erneut." };
  if (fd.get("imageConsent") !== "on") return { ok: false, message: "Bitte bestätige die Bildrechte und die Einwilligung der abgebildeten Person." };
  const files = fd.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, message: "Bitte wähle mindestens ein Bild aus." };
  const settings = await getSettings();
  const existing = await db.profileImage.count({ where: { profileId: p.id } });
  if (existing + files.length > settings.maxImagesPerProfile) return { ok: false, message: `Es sind maximal ${settings.maxImagesPerProfile} Bilder pro Sedcard erlaubt.` };

  const errors: string[] = [];
  let added = 0;
  for (const [i, file] of files.entries()) {
    try {
      const img = await processAndStoreImage(file, `profiles/${p.id}`);
      // Abgleich mit gesperrten Bildern (Hash-Sperrliste)
      const blocked = await db.profileImage.findFirst({ where: { sha256: img.sha256, status: "REJECTED", rejectReason: { startsWith: "[SPERRE]" } } });
      if (blocked) {
        await storage().delete(img.storageKey);
        await storage().delete(img.thumbKey);
        errors.push(`${file.name}: Dieses Bild wurde gesperrt und darf nicht verwendet werden.`);
        continue;
      }
      await db.profileImage.create({ data: { ...img, profileId: p.id, isCover: existing + i === 0, sortOrder: existing + i } });
      added++;
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof UploadError ? e.message : "Upload fehlgeschlagen."}`);
    }
  }
  await db.profile.update({ where: { id: p.id }, data: { consentConfirmedAt: new Date() } });
  revalidatePath(`/dashboard/sedcards/${p.id}`);
  if (errors.length) return { ok: added > 0, message: `${added} Bild(er) hochgeladen. ${errors.join(" ")}` };
  return { ok: true, message: `${added} Bild(er) hochgeladen. Neue Bilder werden vor der Veröffentlichung geprüft.` };
}

export async function deleteImageAction(fd: FormData) {
  const user = await requireUser();
  const img = await db.profileImage.findUnique({ where: { id: String(fd.get("imageId")) }, include: { profile: true } });
  if (!img || (img.profile.ownerId !== user.id && !isStaff(user.role))) return;
  await db.profileImage.delete({ where: { id: img.id } });
  await storage().delete(img.storageKey).catch(() => {});
  await storage().delete(img.thumbKey).catch(() => {});
  if (img.isCover) {
    const next = await db.profileImage.findFirst({ where: { profileId: img.profileId }, orderBy: { sortOrder: "asc" } });
    if (next) await db.profileImage.update({ where: { id: next.id }, data: { isCover: true } });
  }
  revalidatePath(`/dashboard/sedcards/${img.profileId}`);
}

export async function setCoverImageAction(fd: FormData) {
  const user = await requireUser();
  const img = await db.profileImage.findUnique({ where: { id: String(fd.get("imageId")) }, include: { profile: true } });
  if (!img || img.profile.ownerId !== user.id) return;
  await db.$transaction([
    db.profileImage.updateMany({ where: { profileId: img.profileId }, data: { isCover: false } }),
    db.profileImage.update({ where: { id: img.id }, data: { isCover: true } }),
  ]);
  revalidatePath(`/dashboard/sedcards/${img.profileId}`);
}

export async function uploadModelConsentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  const file = fd.get("document");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Bitte lade den Nachweis hoch." };
  try {
    const key = await storePrivateDocument(file, `verifications/${user.id}`);
    await db.identityVerification.create({ data: { userId: user.id, profileId: p.id, docType: "MODEL_CONSENT", documentKey: key } });
  } catch (e) {
    return { ok: false, message: e instanceof UploadError ? e.message : "Upload fehlgeschlagen." };
  }
  revalidatePath(`/dashboard/sedcards/${p.id}`);
  return { ok: true, message: "Nachweis hochgeladen. Er wird vertraulich geprüft und danach gelöscht." };
}

/** Prüft alle Voraussetzungen für die Veröffentlichung und gibt fehlende Punkte zurück. */
export async function getPublishChecklist(profileId: string) {
  const p = await db.profile.findUniqueOrThrow({
    where: { id: profileId },
    include: { category: true, owner: true, images: true, verifications: { where: { docType: "MODEL_CONSENT" }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const settings = await getSettings();
  const needsModelConsent = await requiresModelConsent(p);
  const items = [
    { ok: p.stageName !== "Neue Sedcard" && p.stageName.length >= 2, label: "Profildaten ausgefüllt" },
    { ok: p.description.length >= 80, label: "Beschreibung (mind. 80 Zeichen)" },
    { ok: p.images.length > 0, label: "Mindestens ein Bild hochgeladen" },
    { ok: p.city.length >= 2, label: "Standort festgelegt" },
    { ok: !!(p.contactPhone || p.contactEmail || p.contactWebsite || p.allowMessages), label: "Mindestens eine Kontaktmöglichkeit" },
    { ok: !!p.owner.emailVerifiedAt, label: "E-Mail-Adresse bestätigt" },
    ...(settings.requireVerificationForPublish ? [{ ok: p.owner.verificationStatus === "APPROVED", label: "Identitäts- und Altersprüfung des Kontos abgeschlossen", link: "/dashboard/verifizierung" }] : []),
    ...(needsModelConsent ? [{ ok: ["PENDING", "APPROVED"].includes(p.verifications[0]?.status ?? ""), label: "Einwilligung & Altersnachweis der dargestellten Person hochgeladen" }] : []),
  ];
  return { items, ready: items.every((i) => i.ok), needsModelConsent, modelConsent: p.verifications[0] ?? null };
}

export async function submitForReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  if (!["DRAFT", "REJECTED", "PAUSED", "EXPIRED"].includes(p.status)) return { ok: false, message: "Diese Sedcard kann derzeit nicht eingereicht werden." };
  const required = ["consentAdult", "consentVoluntary", "consentRights", "consentLaw"];
  if (required.some((k) => fd.get(k) !== "on")) return { ok: false, message: "Bitte bestätige alle Erklärungen." };
  const check = await getPublishChecklist(p.id);
  if (!check.ready) return { ok: false, message: "Es fehlen noch Angaben: " + check.items.filter((i) => !i.ok).map((i) => i.label).join(", ") + "." };
  const text = checkProfileText(`${p.stageName} ${p.headline ?? ""} ${p.description}`);
  if (text.flagged) return { ok: false, message: `Unzulässiger Inhalt: ${text.reasons.join(", ")}.` };

  // Pausierte, noch laufende Sedcards können direkt wieder aktiviert werden
  if (p.status === "PAUSED" && p.publishedAt && p.expiresAt && p.expiresAt > new Date()) {
    await db.profile.update({ where: { id: p.id }, data: { status: "PUBLISHED" } });
    revalidatePath(`/dashboard/sedcards/${p.id}`);
    return { ok: true, message: "Deine Sedcard ist wieder online." };
  }
  await db.profile.update({ where: { id: p.id }, data: { status: "PENDING_REVIEW", submittedAt: new Date(), consentConfirmedAt: new Date(), rejectionReason: null } });
  await audit(user.id, "profile.submit", { type: "Profile", id: p.id });
  revalidatePath(`/dashboard/sedcards/${p.id}`);
  return { ok: true, message: "Deine Sedcard wurde zur Prüfung eingereicht. Du wirst benachrichtigt, sobald sie freigegeben ist." };
}

export async function pauseProfileAction(fd: FormData) {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p || p.status !== "PUBLISHED") return;
  await db.profile.update({ where: { id: p.id }, data: { status: "PAUSED" } });
  revalidatePath("/dashboard/sedcards");
  revalidatePath(`/dashboard/sedcards/${p.id}`);
}

export async function deleteProfileAction(fd: FormData) {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return;
  const images = await db.profileImage.findMany({ where: { profileId: p.id } });
  await db.profile.delete({ where: { id: p.id } });
  for (const img of images) {
    await storage().delete(img.storageKey).catch(() => {});
    await storage().delete(img.thumbKey).catch(() => {});
  }
  await audit(user.id, "profile.delete", { type: "Profile", id: p.id }, { stageName: p.stageName });
  redirect("/dashboard/sedcards?geloescht=1");
}
