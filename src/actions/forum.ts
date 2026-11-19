"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { checkContent } from "@/lib/content-filter";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/validation";

export async function acceptForumRulesAction() {
  const user = await requirePermission("forum.use");
  await db.user.update({ where: { id: user.id }, data: { forumRulesAcceptedAt: new Date() } });
  revalidatePath("/forum");
}

const body = z.string().trim().min(5, "Der Beitrag ist zu kurz.").max(8000, "Der Beitrag ist zu lang.");

export async function createThreadAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requirePermission("forum.use");
  if (!user.forumRulesAcceptedAt) return { ok: false, message: "Bitte akzeptiere zuerst die Forenregeln." };
  if (!rateLimit(`thread:${user.id}`, 5, 60 * 60_000).ok) return { ok: false, message: "Du hast zu viele Themen erstellt. Bitte warte etwas." };
  const parsed = z.object({ categoryId: z.string().min(1), title: z.string().trim().min(5, "Titel: mindestens 5 Zeichen.").max(120), body }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const cat = await db.forumCategory.findFirst({ where: { id: parsed.data.categoryId, active: true } });
  if (!cat) return { ok: false, message: "Kategorie nicht gefunden." };
  const check = checkContent(`${parsed.data.title}\n${parsed.data.body}`);
  const status = check.flagged ? "PENDING_REVIEW" : "VISIBLE";
  const thread = await db.forumThread.create({
    data: { categoryId: cat.id, authorId: user.id, title: parsed.data.title, status, posts: { create: { authorId: user.id, body: parsed.data.body, status, flagReason: check.flagged ? check.reasons.join(", ") : null } } },
  });
  if (check.flagged) return { ok: true, message: `Dein Thema wurde zur Prüfung zurückgehalten (${check.reasons.join(", ")}). Bitte veröffentliche keine privaten Daten oder unbelegten Anschuldigungen.` };
  redirect(`/forum/thema/${thread.id}`);
}

export async function replyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requirePermission("forum.use");
  if (!user.forumRulesAcceptedAt) return { ok: false, message: "Bitte akzeptiere zuerst die Forenregeln." };
  if (!rateLimit(`post:${user.id}`, 20, 10 * 60_000).ok) return { ok: false, message: "Du schreibst zu schnell. Bitte warte kurz." };
  const threadId = String(fd.get("threadId"));
  const parsed = body.safeParse(fd.get("body"));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const thread = await db.forumThread.findFirst({ where: { id: threadId, status: "VISIBLE" } });
  if (!thread) return { ok: false, message: "Thema nicht gefunden." };
  if (thread.locked) return { ok: false, message: "Dieses Thema ist geschlossen." };
  const check = checkContent(parsed.data);
  await db.forumPost.create({ data: { threadId, authorId: user.id, body: parsed.data, status: check.flagged ? "PENDING_REVIEW" : "VISIBLE", flagReason: check.flagged ? check.reasons.join(", ") : null } });
  if (!check.flagged) await db.forumThread.update({ where: { id: threadId }, data: { lastPostAt: new Date() } });
  revalidatePath(`/forum/thema/${threadId}`);
  return check.flagged
    ? { ok: true, message: `Dein Beitrag wurde zur Prüfung zurückgehalten (${check.reasons.join(", ")}).` }
    : { ok: true, message: "Beitrag veröffentlicht." };
}
