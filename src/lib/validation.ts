import { z } from "zod";

const trimmed = (min: number, max: number, msg?: string) =>
  z.string().trim().min(min, msg ?? `Mindestens ${min} Zeichen.`).max(max, `Höchstens ${max} Zeichen.`);

export const passwordSchema = z
  .string()
  .min(10, "Das Passwort muss mindestens 10 Zeichen lang sein.")
  .max(200, "Das Passwort ist zu lang.")
  .regex(/[a-zäöüß]/, "Mindestens ein Kleinbuchstabe.")
  .regex(/[A-ZÄÖÜ]/, "Mindestens ein Großbuchstabe.")
  .regex(/\d/, "Mindestens eine Ziffer.");

export const emailSchema = z.string().trim().toLowerCase().email("Bitte gib eine gültige E-Mail-Adresse ein.").max(200);

/** Registrierung: nur E-Mail und Passwort sowie die Pflichtbestätigungen (Volljährigkeit, AGB/Datenschutz). */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  terms: z.literal("on", { message: "Bitte akzeptiere die AGB und die Datenschutzerklärung." }),
  adult: z.literal("on", { message: "Bitte bestätige, dass du volljährig bist." }),
});

export function ageFromBirthDate(iso: string): number {
  const b = new Date(`${iso}T00:00:00Z`);
  if (isNaN(b.getTime())) return -1;
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Bitte gib dein Passwort ein.").max(200) });

const optionalText = (max: number) => z.string().trim().max(max, `Höchstens ${max} Zeichen.`).optional().transform((v) => (v ? v : null));

export const profileBasicsSchema = z.object({
  stageName: trimmed(2, 40, "Der Künstlername muss mindestens 2 Zeichen haben."),
  categoryId: z.string().min(1, "Bitte wähle eine Kategorie."),
  headline: optionalText(90),
  age: z.coerce.number().int().min(18, "Das Mindestalter beträgt 18 Jahre.").max(99).optional().or(z.literal("").transform(() => undefined)),
  languages: z.string().trim().max(200).optional(),
  profileType: z.enum(["SINGLE", "DUO"]).default("SINGLE"),
  partnerName: optionalText(40),
  age2: z.coerce.number().int().min(18, "Das Mindestalter beträgt 18 Jahre.").max(99).optional().or(z.literal("").transform(() => undefined)),
});

export const profileDescriptionSchema = z.object({
  description: z.string().trim().min(80, "Die Beschreibung sollte mindestens 80 Zeichen lang sein.").max(5000, "Höchstens 5.000 Zeichen."),
});

export const profileLocationSchema = z.object({
  city: trimmed(2, 80, "Bitte gib eine Stadt an."),
  postalCode: z.string().trim().regex(/^\d{5}$/, "Bitte gib eine gültige fünfstellige Postleitzahl an.").optional().or(z.literal("").transform(() => undefined)),
  region: optionalText(80),
});

const phoneRe = /^\+?[0-9 ()/-]{6,25}$/;
export const profileContactSchema = z.object({
  contactPhone: z.string().trim().regex(phoneRe, "Ungültige Telefonnummer.").optional().or(z.literal("").transform(() => undefined)),
  contactWhatsapp: z.string().trim().regex(phoneRe, "Ungültige WhatsApp-Nummer.").optional().or(z.literal("").transform(() => undefined)),
  contactEmail: z.string().trim().email("Ungültige E-Mail-Adresse.").optional().or(z.literal("").transform(() => undefined)),
  contactWebsite: z.string().trim().url("Ungültige Website (mit https://).").refine((u) => u.startsWith("https://") || u.startsWith("http://"), "Nur http(s)-Links.").optional().or(z.literal("").transform(() => undefined)),
  showPhone: z.literal("on").optional(),
  allowMessages: z.literal("on").optional(),
  availabilityNote: optionalText(300),
});

export const listingSchema = z.object({
  categoryId: z.string().min(1, "Bitte wähle eine Kategorie."),
  title: trimmed(5, 100),
  description: trimmed(30, 5000),
  city: trimmed(2, 80),
  price: z.string().trim().regex(/^\d{1,7}([.,]\d{1,2})?$/, "Ungültiger Preis.").optional().or(z.literal("").transform(() => undefined)),
  priceUnit: optionalText(40),
  contactEmail: z.string().trim().email("Ungültige E-Mail-Adresse.").optional().or(z.literal("").transform(() => undefined)),
  contactPhone: z.string().trim().regex(phoneRe, "Ungültige Telefonnummer.").optional().or(z.literal("").transform(() => undefined)),
});

export const reportSchema = z.object({
  targetType: z.enum(["PROFILE", "IMAGE", "LISTING", "THREAD", "POST", "MESSAGE", "USER", "AD"]),
  targetId: z.string().min(1).max(60),
  reason: z.enum(["MINOR", "COERCION", "FRAUD", "IDENTITY_MISUSE", "NON_CONSENSUAL_IMAGE", "PERSONAL_DATA", "DEFAMATION", "ILLEGAL_CONTENT", "SPAM", "OTHER"]),
  details: trimmed(10, 3000, "Bitte beschreibe den Sachverhalt (mind. 10 Zeichen)."),
  reporterEmail: z.string().trim().email("Ungültige E-Mail-Adresse.").optional().or(z.literal("").transform(() => undefined)),
});

export type FieldErrors = Record<string, string[] | undefined>;
export type ActionState = { ok?: boolean; message?: string; errors?: FieldErrors } | undefined;

export function zodErrors(e: z.ZodError): ActionState {
  return { ok: false, message: "Bitte prüfe deine Eingaben.", errors: e.flatten().fieldErrors as FieldErrors };
}

export function parseEuroToCents(v: string | undefined | null): number | null {
  if (!v) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
