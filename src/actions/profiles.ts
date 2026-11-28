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
import { hmacSha256Hex, safeEqual } from "@/lib/crypto";
import { env } from "@/lib/env";
import { normalizePhone } from "@/lib/phone";
import { normalizeTelegramUsername } from "@/lib/messenger";
import { cleanLanguages, MAX_LANGUAGES } from "@/lib/languages";
import { isCountryCode } from "@/lib/countries";
import { sendSms, smsDevMode, SmsNotConfiguredError } from "@/lib/sms";
import { randomInt } from "node:crypto";
import { audit } from "@/lib/audit";
import { PERSON_CATEGORIES, requiresModelConsent } from "@/lib/model-consent";
import { WEEKDAYS } from "@/lib/labels";
import { MEETING_FILTER_KEY, OUTCALL_VALUE } from "@/lib/meeting";
import type { FilterSection } from "@/lib/filter-sections";
import { PRICE_DURATIONS, type PriceRow } from "@/lib/prices";
import type { Availability } from "@/lib/availability";
import {
  parseEuroToCents,
  profileBasicsSchema, profileContactDataSchema, profileDescriptionSchema, zodErrors, type ActionState,
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
  await writeAttributes({ id: p.id, profileType: d.profileType, categoryId: cat.id }, fd, "eigenschaften");
  return done(p.id, 1, fd);
}

/** Schritt 3 „Service“. */
export async function saveServiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  // Outcall-Ort nur speichern, wenn Outcall gewählt ist
  const meeting = await db.filterDefinition.findUnique({ where: { key: MEETING_FILTER_KEY }, include: { options: true } });
  const outcallId = meeting?.options.find((o) => o.value === OUTCALL_VALUE)?.id;
  if (!outcallId || !fd.getAll(`attr_${MEETING_FILTER_KEY}`).includes(outcallId)) fd.delete("attr_outcall_ort");
  await writeAttributes({ id: p.id, profileType: p.profileType, categoryId: p.categoryId }, fd, "service");
  return done(p.id, 3, fd);
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
  const requested = fd.getAll("languages").map(String);
  if (new Set(requested).size > MAX_LANGUAGES) return { ok: false, message: `Bitte wähle höchstens ${MAX_LANGUAGES} Sprachen.`, errors: { languages: [`Höchstens ${MAX_LANGUAGES} Sprachen.`] } };
  await db.profile.update({
    where: { id: p.id },
    data: { description, headline, languages: cleanLanguages(requested, p.languages), ...(changed ? reviewIfPublished(p.status) : {}) },
  });
  return done(p.id, 6, fd);
}

/** Schritt 2 „Kontaktdaten“: Telefonnummer, Messenger, Adresse. */
export async function saveContactDataAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  const parsed = profileContactDataSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;
  const phone = d.contactPhone ? normalizePhone(d.contactPhone) : null;
  if (d.contactPhone && !phone) return { ok: false, message: "Bitte prüfe deine Eingaben.", errors: { contactPhone: ["Ungültige Telefonnummer, z. B. 0151 1234567 oder +49 151 1234567."] } };
  const telegramEnabled = d.telegramEnabled === "on";
  const tgUser = normalizeTelegramUsername(d.telegramUsername ?? "");
  if (telegramEnabled && tgUser === null) return { ok: false, message: "Bitte prüfe deine Eingaben.", errors: { telegramUsername: ["Ungültiger Benutzername (5–32 Zeichen: Buchstaben, Ziffern, _)."] } };
  const showAddress = d.showAddress === "on";
  if (showAddress && (!d.street || !d.houseNumber)) {
    return { ok: false, message: "Bitte prüfe deine Eingaben.", errors: { street: d.street ? [] : ["Für die Anzeige der Adresse bitte Straße angeben."], houseNumber: d.houseNumber ? [] : ["Bitte Hausnr. angeben."] } };
  }
  const text = checkProfileText(`${d.street ?? ""} ${d.district ?? ""} ${d.city} ${tgUser ?? ""}`);
  if (text.flagged) return { ok: false, message: `Unzulässiger Inhalt: ${text.reasons.join(", ")}.` };
  await db.profile.update({
    where: { id: p.id },
    data: {
      contactPhone: phone,
      // Neue oder geänderte Nummer muss erneut per SMS bestätigt werden
      ...(phone !== p.contactPhone ? { phoneVerifiedAt: null } : {}),
      whatsappEnabled: d.whatsappEnabled === "on", telegramEnabled,
      // Benutzername nur ändern, wenn Telegram aktiv ist (sonst bleibt er für später erhalten)
      ...(telegramEnabled ? { telegramUsername: tgUser || null } : {}),
      street: d.street, houseNumber: d.houseNumber ?? null, postalCode: d.postalCode ?? null,
      city: d.city, district: d.district, showAddress,
    },
  });
  return done(p.id, 2, fd);
}

const SMS_CODE_TTL_MS = 10 * 60_000;
const SMS_MAX_ATTEMPTS = 5;
const codeHash = (profileId: string, phone: string, code: string) => hmacSha256Hex(env.sessionSecret, `sms:${profileId}:${phone}:${code}`);

export type PhoneCodeState = { ok: boolean; message: string; devCode?: string; phone?: string; verified?: boolean };

/** Sendet einen 6-stelligen Bestätigungscode per SMS an die angegebene Nummer. */
export async function sendPhoneCodeAction(profileId: string, rawPhone: string): Promise<PhoneCodeState> {
  const user = await requireUser();
  const p = await ownedProfile(profileId, user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  const phone = normalizePhone(rawPhone);
  if (!phone) return { ok: false, message: "Ungültige Telefonnummer, z. B. 0151 1234567 oder +49 151 1234567." };
  if (phone === p.contactPhone && p.phoneVerifiedAt) return { ok: true, verified: true, phone, message: "Diese Nummer ist bereits verifiziert." };
  if (!rateLimit(`sms:wait:${p.id}`, 1, 60_000).ok) return { ok: false, message: "Bitte warte eine Minute, bevor du einen neuen Code anforderst." };
  if (!rateLimit(`sms:profile:${p.id}`, 5, 60 * 60_000).ok || !rateLimit(`sms:user:${user.id}`, 10, 60 * 60_000).ok) {
    return { ok: false, message: "Zu viele Codes angefordert. Bitte versuche es später erneut." };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.phoneVerification.deleteMany({ where: { profileId: p.id } });
  await db.phoneVerification.create({ data: { profileId: p.id, phone, codeHash: codeHash(p.id, phone, code), expiresAt: new Date(Date.now() + SMS_CODE_TTL_MS) } });
  try {
    await sendSms(phone, `Dein Top Girls Bestätigungscode: ${code}. Gültig für 10 Minuten. Gib ihn niemals weiter.`);
  } catch (e) {
    await db.phoneVerification.deleteMany({ where: { profileId: p.id } });
    return { ok: false, message: e instanceof SmsNotConfiguredError ? e.message : "Die SMS konnte nicht gesendet werden. Bitte versuche es später erneut." };
  }
  await audit(user.id, "profile.phone.code", { type: "Profile", id: p.id });
  return { ok: true, phone, message: "Code gesendet. Bitte gib den 6-stelligen Code aus der SMS ein.", ...(smsDevMode() ? { devCode: code } : {}) };
}

/** Prüft den SMS-Code und speichert die Nummer als verifiziert. */
export async function verifyPhoneCodeAction(profileId: string, rawCode: string): Promise<PhoneCodeState> {
  const user = await requireUser();
  const p = await ownedProfile(profileId, user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  const code = rawCode.replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, message: "Bitte gib den 6-stelligen Code ein." };
  const v = await db.phoneVerification.findFirst({ where: { profileId: p.id }, orderBy: { createdAt: "desc" } });
  if (!v || v.expiresAt < new Date()) return { ok: false, message: "Der Code ist abgelaufen. Bitte fordere einen neuen an." };
  if (v.attempts >= SMS_MAX_ATTEMPTS) return { ok: false, message: "Zu viele Fehlversuche. Bitte fordere einen neuen Code an." };
  if (!safeEqual(v.codeHash, codeHash(p.id, v.phone, code))) {
    await db.phoneVerification.update({ where: { id: v.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, message: "Der Code ist falsch." };
  }
  await db.$transaction([
    db.profile.update({ where: { id: p.id }, data: { contactPhone: v.phone, phoneVerifiedAt: new Date() } }),
    db.phoneVerification.deleteMany({ where: { profileId: p.id } }),
  ]);
  await audit(user.id, "profile.phone.verified", { type: "Profile", id: p.id });
  revalidatePath(`/dashboard/sedcards/${p.id}`);
  return { ok: true, verified: true, phone: v.phone, message: "Telefonnummer verifiziert." };
}

/** Schritt 8 „Einstellungen“: Länderfilter, Sichtbarkeit, Benachrichtigungen (Glocke). */
export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  const countries = [...new Set(fd.getAll("blockedCountries").map(String))].filter(isCountryCode).slice(0, 250);
  await db.profile.update({
    where: { id: p.id },
    data: {
      blockedCountries: countries,
      blurForGuests: fd.get("blurForGuests") === "on",
      showOnlineStatus: fd.get("showOnlineStatus") === "on",
      notifyReview: fd.get("notifyReview") === "on",
      notifyPromotion: fd.get("notifyPromotion") === "on",
    },
  });
  revalidatePath(`/profil/${p.slug}`);
  return done(p.id, 8, fd);
}

/** Schritt 4 „Verfügbarkeit & Preise“. */
export async function saveTimesPricesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
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
      availability,
      prices: readPrices(fd),
      priceNote: String(fd.get("priceNote") ?? "").trim().slice(0, 300) || null,
    },
  });
  return done(p.id, 4, fd);
}

/** Liest die festen Preispositionen (price_in_N, price_out_N; N = Index in PRICE_DURATIONS). Positionen ohne Preis entfallen. */
function readPrices(fd: FormData): PriceRow[] {
  const amount = (name: string) => {
    const c = parseEuroToCents(String(fd.get(name) ?? "").trim());
    return c != null && c >= 0 && c <= 10_000_000 ? c : null;
  };
  return PRICE_DURATIONS.map((label, i) => ({ label, incallCents: amount(`price_in_${i}`), outcallCents: amount(`price_out_${i}`) }))
    .filter((r) => r.incallCents != null || r.outcallCents != null);
}

/**
 * Schreibt die Eigenschaften (Formularfelder attr_<key>, bei Duo zusätzlich attr2_<key>) für die Filter der Kategorie.
 * Eigenschaften, die nicht (mehr) zur Kategorie gehören, werden entfernt.
 */
/** Schreibt die Angaben eines Bereichs („eigenschaften“ = Schritt 1, „service“ = Schritt 3). Andere Bereiche bleiben unverändert. */
async function writeAttributes(p: { id: string; profileType: string; categoryId: string }, fd: FormData, section: FilterSection) {
  const filters = await db.filterDefinition.findMany({ where: { active: true, section, categories: { some: { categoryId: p.categoryId } } }, include: { options: { where: { active: true } } } });
  // Angaben zu Filtern, die nicht (mehr) zur Kategorie gehören, entfernen
  await db.profileAttribute.deleteMany({ where: { profileId: p.id, filter: { active: true, section, categories: { none: { categoryId: p.categoryId } } } } });
  const duo = p.profileType === "DUO";
  await db.$transaction(async (tx) => {
    // Bei Wechsel von Duo zu Einzel: Angaben der zweiten Person entfernen
    if (!duo) await tx.profileAttribute.deleteMany({ where: { profileId: p.id, person: 2, filter: { section } } });
    for (const f of filters) {
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

/**
 * Lädt EIN Bild hoch (der Assistent sendet die Bilder einzeln nacheinander – so bleibt jede Anfrage unter dem Größenlimit).
 * kind = "cover": Anzeigebild (das bisherige Anzeigebild bleibt als normales Galeriebild erhalten); "gallery": weiteres Bild.
 */
export async function uploadProfileImageAction(fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const p = await ownedProfile(String(fd.get("profileId")), user);
  if (!p) return { ok: false, message: "Sedcard nicht gefunden." };
  if (!rateLimit(`upload:${user.id}`, 60, 60 * 60_000).ok) return { ok: false, message: "Upload-Limit erreicht. Bitte versuche es später erneut." };
  if (fd.get("imageConsent") !== "on") return { ok: false, message: "Bitte bestätige die Bildrechte und die Einwilligung der abgebildeten Person." };
  const file = fd.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Keine Datei ausgewählt." };
  const kind = fd.get("kind") === "cover" ? "cover" : "gallery";
  const settings = await getSettings();
  const existing = await db.profileImage.findMany({ where: { profileId: p.id }, select: { sortOrder: true, isCover: true } });
  if (existing.length >= settings.maxImagesPerProfile) return { ok: false, message: `${file.name}: Es sind maximal ${settings.maxImagesPerProfile} Bilder pro Sedcard erlaubt.` };

  try {
    const img = await processAndStoreImage(file, `profiles/${p.id}`);
    // Abgleich mit gesperrten Bildern (Hash-Sperrliste)
    const blocked = await db.profileImage.findFirst({ where: { sha256: img.sha256, status: "REJECTED", rejectReason: { startsWith: "[SPERRE]" } } });
    if (blocked) {
      await storage().delete(img.storageKey);
      await storage().delete(img.thumbKey);
      return { ok: false, message: `${file.name}: Dieses Bild wurde gesperrt und darf nicht verwendet werden.` };
    }
    const hasCover = existing.some((e) => e.isCover);
    const maxSort = existing.reduce((m, e) => Math.max(m, e.sortOrder), -1);
    if (kind === "cover") {
      await db.$transaction([
        db.profileImage.updateMany({ where: { profileId: p.id }, data: { isCover: false } }),
        db.profileImage.create({ data: { ...img, profileId: p.id, isCover: true, sortOrder: maxSort + 1 } }),
      ]);
    } else {
      // Ohne Anzeigebild wird das erste Bild automatisch zum Anzeigebild
      await db.profileImage.create({ data: { ...img, profileId: p.id, isCover: !hasCover, sortOrder: maxSort + 1 } });
    }
  } catch (e) {
    return { ok: false, message: `${file.name}: ${e instanceof UploadError ? e.message : "Upload fehlgeschlagen."}` };
  }
  await db.profile.update({ where: { id: p.id }, data: { consentConfirmedAt: new Date() } });
  revalidatePath(`/dashboard/sedcards/${p.id}`);
  return { ok: true, message: "Hochgeladen." };
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
    { ok: p.images.length > 0, label: "Anzeigebild hochgeladen", link: "?schritt=5" },
    { ok: !!(p.contactPhone && p.phoneVerifiedAt), label: "Telefonnummer per SMS verifiziert", link: "?schritt=2" },
    { ok: p.city.length >= 2, label: "Stadt angegeben", link: "?schritt=2" },
    { ok: !!p.owner.emailVerifiedAt, label: "E-Mail-Adresse bestätigt" },
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
