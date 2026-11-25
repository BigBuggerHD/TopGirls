"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession, getClientIp, getCurrentUser } from "@/lib/auth/session";
import { dummyVerify, hashPassword, verifyPassword } from "@/lib/auth/password";
import { randomToken, sha256 } from "@/lib/crypto";
import { emailSchema, loginSchema, passwordSchema, registerSchema, zodErrors, type ActionState } from "@/lib/validation";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { mailTemplates, sendMail } from "@/lib/mail";
import { audit } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { safeRedirectPath } from "@/lib/utils";

const APP_URL = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function issueToken(userId: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET", ttlMs: number) {
  const token = randomToken(32);
  await db.authToken.deleteMany({ where: { userId, type, usedAt: null } });
  await db.authToken.create({ data: { id: sha256(token), userId, type, expiresAt: new Date(Date.now() + ttlMs) } });
  return token;
}

export async function sendVerificationEmail(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const token = await issueToken(userId, "EMAIL_VERIFICATION", 24 * 3600_000);
  const m = mailTemplates.verifyEmail(user.displayName, `${APP_URL()}/email-bestaetigen?token=${token}`);
  await sendMail(user.email, m.subject, m.html, m.text);
}

export async function registerAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const ip = (await getClientIp()) ?? "unknown";
  if (!rateLimit(`register:${ip}`, 5, 60 * 60_000).ok) return { ok: false, message: "Zu viele Registrierungen. Bitte versuche es später erneut." };
  const settings = await getSettings();
  if (!settings.registrationOpen) return { ok: false, message: "Die Registrierung ist derzeit geschlossen." };

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const d = parsed.data;

  const exists = await db.user.findUnique({ where: { email: d.email } });
  if (exists) return { ok: false, errors: { email: ["Diese E-Mail-Adresse ist bereits registriert."] }, message: "Bitte prüfe deine Eingaben." };

  const user = await db.user.create({
    data: {
      email: d.email,
      passwordHash: await hashPassword(d.password),
      displayName: d.displayName,
      companyName: d.companyName || null,
      role: "MEMBER",
      termsAcceptedAt: new Date(),
    },
  });
  await audit(user.id, "user.register", { type: "User", id: user.id }, { role: "MEMBER" });
  await sendVerificationEmail(user.id);
  await createSession(user.id);
  redirect("/dashboard?willkommen=1");
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const { email, password } = parsed.data;
  const ip = (await getClientIp()) ?? "unknown";

  if (!rateLimit(`login:ip:${ip}`, 20, 15 * 60_000).ok || !rateLimit(`login:email:${email}`, 8, 15 * 60_000).ok) {
    return { ok: false, message: "Zu viele Anmeldeversuche. Bitte warte 15 Minuten." };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    await dummyVerify(password);
    return { ok: false, message: "E-Mail-Adresse oder Passwort ist falsch." };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, message: "Dein Konto ist nach mehreren Fehlversuchen vorübergehend gesperrt. Bitte versuche es später erneut." };
  }
  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    const fails = user.failedLoginCount + 1;
    await db.user.update({
      where: { id: user.id },
      data: { failedLoginCount: fails, lockedUntil: fails >= 10 ? new Date(Date.now() + 30 * 60_000) : null },
    });
    return { ok: false, message: "E-Mail-Adresse oder Passwort ist falsch." };
  }
  if (user.status === "BANNED" || user.status === "DELETED") return { ok: false, message: "Dieses Konto ist gesperrt." };
  if (user.status === "SUSPENDED" && (!user.suspendedUntil || user.suspendedUntil > new Date())) {
    return { ok: false, message: `Dein Konto ist gesperrt${user.suspendedUntil ? ` bis ${user.suspendedUntil.toLocaleDateString("de-DE")}` : ""}. Grund: ${user.suspensionReason ?? "–"}` };
  }

  await db.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), ...(user.status === "SUSPENDED" ? { status: "ACTIVE", suspendedUntil: null } : {}) },
  });
  resetRateLimit(`login:email:${email}`);
  await createSession(user.id);
  await audit(user.id, "user.login");
  const fallback = user.role === "ADMIN" || user.role === "MODERATOR" ? "/admin" : "/dashboard";
  redirect(safeRedirectPath(String(formData.get("next") ?? ""), fallback));
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function requestPasswordResetAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ email: emailSchema }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const ip = (await getClientIp()) ?? "unknown";
  if (!rateLimit(`reset:${ip}`, 5, 60 * 60_000).ok) return { ok: false, message: "Zu viele Anfragen. Bitte versuche es später erneut." };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user && user.status !== "DELETED" && user.status !== "BANNED") {
    const token = await issueToken(user.id, "PASSWORD_RESET", 3600_000);
    const m = mailTemplates.passwordReset(user.displayName, `${APP_URL()}/passwort-zuruecksetzen?token=${token}`);
    await sendMail(user.email, m.subject, m.html, m.text);
  }
  // Immer gleiche Antwort (keine Preisgabe registrierter Adressen)
  return { ok: true, message: "Falls ein Konto mit dieser E-Mail-Adresse existiert, haben wir dir einen Link zum Zurücksetzen gesendet." };
}

export async function resetPasswordAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z
    .object({ token: z.string().min(10), password: passwordSchema, passwordConfirm: z.string() })
    .refine((d) => d.password === d.passwordConfirm, { path: ["passwordConfirm"], message: "Die Passwörter stimmen nicht überein." })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const t = await db.authToken.findUnique({ where: { id: sha256(parsed.data.token) } });
  if (!t || t.type !== "PASSWORD_RESET" || t.usedAt || t.expiresAt < new Date()) {
    return { ok: false, message: "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an." };
  }
  await db.$transaction([
    db.user.update({ where: { id: t.userId }, data: { passwordHash: await hashPassword(parsed.data.password), failedLoginCount: 0, lockedUntil: null } }),
    db.authToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { userId: t.userId } }), // alle Sitzungen beenden
  ]);
  await audit(t.userId, "user.password_reset");
  redirect("/login?zurueckgesetzt=1");
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  const t = await db.authToken.findUnique({ where: { id: sha256(token) } });
  if (!t || t.type !== "EMAIL_VERIFICATION" || t.usedAt || t.expiresAt < new Date()) return false;
  await db.$transaction([
    db.user.update({ where: { id: t.userId }, data: { emailVerifiedAt: new Date() } }),
    db.authToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
  ]);
  return true;
}

export async function resendVerificationAction(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Bitte melde dich an." };
  if (user.emailVerifiedAt) return { ok: true, message: "Deine E-Mail-Adresse ist bereits bestätigt." };
  if (!rateLimit(`resend:${user.id}`, 3, 60 * 60_000).ok) return { ok: false, message: "Bitte warte etwas, bevor du eine neue E-Mail anforderst." };
  await sendVerificationEmail(user.id);
  return { ok: true, message: "Wir haben dir eine neue Bestätigungs-E-Mail gesendet." };
}
