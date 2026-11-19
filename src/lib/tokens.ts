import "server-only";
import { Prisma, type TransactionType } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Token-Buchhaltung. Das Guthaben wird ausschließlich serverseitig in einer
 * Datenbanktransaktion verändert; jede Änderung erzeugt einen Journaleintrag.
 * `reference` ist eindeutig und macht jede Buchung idempotent.
 */
export class InsufficientTokensError extends Error {
  constructor() {
    super("Dein Token-Guthaben reicht nicht aus.");
  }
}

type Tx = Prisma.TransactionClient;

export async function debitTokens(
  tx: Tx,
  opts: { userId: string; tokens: number; type?: TransactionType; reference: string; description: string; createdById?: string },
) {
  if (!Number.isInteger(opts.tokens) || opts.tokens <= 0) throw new Error("Ungültige Token-Anzahl");
  // Atomare, bedingte Belastung – verhindert negatives Guthaben auch bei parallelen Requests
  const res = await tx.user.updateMany({
    where: { id: opts.userId, tokenBalance: { gte: opts.tokens } },
    data: { tokenBalance: { decrement: opts.tokens } },
  });
  if (res.count !== 1) throw new InsufficientTokensError();
  const user = await tx.user.findUniqueOrThrow({ where: { id: opts.userId }, select: { tokenBalance: true } });
  return tx.tokenTransaction.create({
    data: {
      userId: opts.userId,
      type: opts.type ?? "SPEND",
      tokens: -opts.tokens,
      balanceAfter: user.tokenBalance,
      reference: opts.reference,
      description: opts.description,
      createdById: opts.createdById,
    },
  });
}

export async function creditTokens(
  tx: Tx,
  opts: { userId: string; tokens: number; type: TransactionType; reference: string; description: string; amountCents?: number; paymentId?: string; createdById?: string },
) {
  if (!Number.isInteger(opts.tokens) || opts.tokens <= 0) throw new Error("Ungültige Token-Anzahl");
  const existing = await tx.tokenTransaction.findUnique({ where: { reference: opts.reference } });
  if (existing) return existing; // idempotent
  const user = await tx.user.update({ where: { id: opts.userId }, data: { tokenBalance: { increment: opts.tokens } }, select: { tokenBalance: true } });
  return tx.tokenTransaction.create({
    data: {
      userId: opts.userId,
      type: opts.type,
      tokens: opts.tokens,
      amountCents: opts.amountCents,
      balanceAfter: user.tokenBalance,
      reference: opts.reference,
      description: opts.description,
      paymentId: opts.paymentId,
      createdById: opts.createdById,
    },
  });
}

export function withSerializable<T>(fn: (tx: Tx) => Promise<T>) {
  return db.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
