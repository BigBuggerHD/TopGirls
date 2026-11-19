"use server";

import { db } from "@/lib/db";
import { getClientIp, getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { reportSchema, zodErrors, type ActionState } from "@/lib/validation";
import { REPORT_PRIORITY } from "@/lib/labels";

/**
 * Melde-/Abhilfeverfahren (Art. 16 DSA). Auch ohne Konto möglich.
 * Meldungen zu Minderjährigkeit/Zwang erhalten höchste Priorität; betroffene Sedcards werden
 * bei solchen Meldungen sofort vorläufig vom Netz genommen, bis die Moderation entschieden hat.
 */
export async function submitReportAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const ip = (await getClientIp()) ?? "unknown";
  if (!rateLimit(`report:${ip}`, 10, 60 * 60_000).ok) return { ok: false, message: "Zu viele Meldungen. Bitte versuche es später erneut." };
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return zodErrors(parsed.error);
  const user = await getCurrentUser();
  const d = parsed.data;

  await db.report.create({
    data: {
      reporterId: user?.id, reporterEmail: user ? null : d.reporterEmail ?? null,
      targetType: d.targetType, targetId: d.targetId, reason: d.reason, details: d.details, priority: REPORT_PRIORITY[d.reason],
    },
  });

  if ((d.reason === "MINOR" || d.reason === "COERCION" || d.reason === "NON_CONSENSUAL_IMAGE") && d.targetType === "PROFILE") {
    await db.profile.updateMany({ where: { id: d.targetId, status: "PUBLISHED" }, data: { status: "PENDING_REVIEW", rejectionReason: "Vorläufig deaktiviert wegen einer Meldung – Prüfung läuft." } });
  }
  if (d.reason === "NON_CONSENSUAL_IMAGE" && d.targetType === "IMAGE") {
    await db.profileImage.updateMany({ where: { id: d.targetId }, data: { status: "PENDING" } });
  }
  return { ok: true, message: "Vielen Dank. Deine Meldung ist eingegangen und wird vorrangig geprüft." };
}
