import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/crypto";
import { getClientIp } from "@/lib/auth/session";

/** Protokolliert sicherheitsrelevante und administrative Aktionen. */
export async function audit(
  actorId: string | null,
  action: string,
  target?: { type: string; id: string },
  details?: Prisma.InputJsonValue,
) {
  let ip: string | null = null;
  try {
    ip = await getClientIp();
  } catch {
    /* außerhalb eines Requests */
  }
  await db.auditLog.create({
    data: { actorId, action, targetType: target?.type, targetId: target?.id, details, ipHash: hashIp(ip) },
  });
}
