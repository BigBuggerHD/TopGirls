"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/validation";

const bodySchema = z.string().trim().min(1, "Die Nachricht ist leer.").max(4000, "Die Nachricht ist zu lang (max. 4.000 Zeichen).");

async function notify(userId: string, title: string, body: string, link: string) {
  await db.notification.create({ data: { userId, title, body, link } });
}

export async function startConversationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!can(user.role, "messages.use")) return { ok: false, message: "Dein Konto kann keine Nachrichten senden." };
  if (!user.emailVerifiedAt) return { ok: false, message: "Bitte bestätige zuerst deine E-Mail-Adresse." };
  if (!rateLimit(`msg-start:${user.id}`, 10, 60 * 60_000).ok) return { ok: false, message: "Du hast zu viele neue Unterhaltungen begonnen. Bitte warte etwas." };
  const body = bodySchema.safeParse(formData.get("body"));
  if (!body.success) return { ok: false, message: body.error.issues[0].message };
  const profile = await db.profile.findFirst({ where: { id: String(formData.get("profileId")), status: "PUBLISHED", allowMessages: true }, select: { id: true, ownerId: true, stageName: true } });
  if (!profile || profile.ownerId === user.id) return { ok: false, message: "Nachricht kann nicht gesendet werden." };

  // Bestehende Unterhaltung zu dieser Sedcard wiederverwenden
  const existing = await db.conversation.findFirst({
    where: { profileId: profile.id, AND: [{ participants: { some: { userId: user.id } } }, { participants: { some: { userId: profile.ownerId } } }] },
    include: { participants: true },
  });
  if (existing?.participants.some((p) => p.blocked)) return { ok: false, message: "Diese Unterhaltung wurde blockiert." };

  const conv = existing ?? (await db.conversation.create({
    data: { subject: `Anfrage zu ${profile.stageName}`, profileId: profile.id, participants: { create: [{ userId: user.id, lastReadAt: new Date() }, { userId: profile.ownerId }] } },
  }));
  await db.message.create({ data: { conversationId: conv.id, senderId: user.id, body: body.data } });
  await db.conversation.update({ where: { id: conv.id }, data: { updatedAt: new Date() } });
  await notify(profile.ownerId, "Neue Nachricht", `${user.displayName} hat dir zu „${profile.stageName}“ geschrieben.`, `/dashboard/nachrichten/${conv.id}`);
  redirect(`/dashboard/nachrichten/${conv.id}`);
}

export async function sendMessageAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!rateLimit(`msg:${user.id}`, 30, 60_000).ok) return { ok: false, message: "Du sendest zu viele Nachrichten. Bitte warte kurz." };
  const conversationId = String(formData.get("conversationId"));
  const body = bodySchema.safeParse(formData.get("body"));
  if (!body.success) return { ok: false, message: body.error.issues[0].message };
  const parts = await db.conversationParticipant.findMany({ where: { conversationId } });
  const me = parts.find((p) => p.userId === user.id);
  if (!me) return { ok: false, message: "Unterhaltung nicht gefunden." };
  if (parts.some((p) => p.blocked)) return { ok: false, message: "Diese Unterhaltung wurde blockiert." };
  await db.message.create({ data: { conversationId, senderId: user.id, body: body.data } });
  await db.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
  await db.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId: user.id } }, data: { lastReadAt: new Date(), archived: false } });
  for (const p of parts) if (p.userId !== user.id) await notify(p.userId, "Neue Nachricht", `${user.displayName} hat dir geantwortet.`, `/dashboard/nachrichten/${conversationId}`);
  revalidatePath(`/dashboard/nachrichten/${conversationId}`);
  return { ok: true };
}

export async function toggleBlockConversationAction(formData: FormData) {
  const user = await requireUser();
  const conversationId = String(formData.get("conversationId"));
  const me = await db.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId, userId: user.id } } });
  if (!me) return;
  await db.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId: user.id } }, data: { blocked: !me.blocked } });
  revalidatePath(`/dashboard/nachrichten/${conversationId}`);
}

export async function archiveConversationAction(formData: FormData) {
  const user = await requireUser();
  const conversationId = String(formData.get("conversationId"));
  await db.conversationParticipant.updateMany({ where: { conversationId, userId: user.id }, data: { archived: true } });
  redirect("/dashboard/nachrichten");
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/dashboard/benachrichtigungen");
}
