import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Role, User } from "@prisma/client";
import { db } from "@/lib/db";
import { hashIp, randomToken, sha256 } from "@/lib/crypto";
import { can, type Permission } from "@/lib/rbac";

export const SESSION_COOKIE = "tg_session";
const SESSION_DAYS = 30;
const RENEW_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 7;

export type SessionUser = Pick<
  User,
  "id" | "email" | "role" | "status" | "displayName" | "companyName" | "tokenBalance" | "verificationStatus" | "emailVerifiedAt" | "suspendedUntil" | "forumRulesAcceptedAt"
>;

export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function createSession(userId: string) {
  const token = randomToken(32);
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({
    data: {
      id: sha256(token),
      userId,
      expiresAt,
      ipHash: hashIp(await getClientIp()),
      userAgent: h.get("user-agent")?.slice(0, 250) ?? null,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Aktuellen Benutzer laden (pro Request gecacht). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    include: {
      user: {
        select: {
          id: true, email: true, role: true, status: true, displayName: true, companyName: true, tokenBalance: true,
          verificationStatus: true, emailVerifiedAt: true, suspendedUntil: true, forumRulesAcceptedAt: true,
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const u = session.user;
  if (u.status === "BANNED" || u.status === "DELETED") return null;
  if (u.status === "SUSPENDED" && (!u.suspendedUntil || u.suspendedUntil > new Date())) return null;
  // Gleitende Verlängerung
  if (session.expiresAt.getTime() - Date.now() < RENEW_THRESHOLD_MS) {
    await db.session.update({ where: { id: session.id }, data: { expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) } }).catch(() => {});
  }
  return u;
});

export async function requireUser(nextPath = "/dashboard"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

export async function requirePermission(permission: Permission, nextPath = "/dashboard"): Promise<SessionUser> {
  const user = await requireUser(nextPath);
  if (!can(user.role, permission)) redirect("/kein-zugriff");
  return user;
}

export async function requireRole(roles: Role[], nextPath = "/dashboard"): Promise<SessionUser> {
  const user = await requireUser(nextPath);
  if (!roles.includes(user.role)) redirect("/kein-zugriff");
  return user;
}
