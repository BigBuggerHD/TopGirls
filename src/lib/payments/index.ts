import "server-only";
import type { PaymentProvider, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { creditTokens } from "@/lib/tokens";
import { mailTemplates, sendMail } from "@/lib/mail";
import { formatEuro } from "@/lib/format";
import { paypalAdapter } from "./paypal";
import { sandboxAdapter } from "./sandbox";
import { creditCardAdapter, nextcoupAdapter } from "./placeholders";
import type { PaymentAdapter, WebhookOutcome } from "./types";

export const ADAPTERS: Record<PaymentProvider, PaymentAdapter> = {
  PAYPAL: paypalAdapter,
  CREDIT_CARD: creditCardAdapter,
  NEXTCOUP: nextcoupAdapter,
  SANDBOX: sandboxAdapter,
};

export const PROVIDER_SLUGS: Record<string, PaymentProvider> = {
  paypal: "PAYPAL",
  kreditkarte: "CREDIT_CARD",
  nextcoup: "NEXTCOUP",
  sandbox: "SANDBOX",
};

export function getAdapter(p: PaymentProvider) {
  return ADAPTERS[p];
}

/**
 * Verarbeitet ein (bereits signaturgeprüftes) Zahlungsereignis idempotent:
 *  - jedes Anbieter-Ereignis wird genau einmal gespeichert (unique provider+eventId)
 *  - der Statusübergang zu COMPLETED erfolgt per bedingtem Update genau einmal
 *  - die Token-Gutschrift hat die eindeutige Referenz `payment:<id>`
 */
export async function processPaymentEvent(provider: PaymentProvider, outcome: WebhookOutcome): Promise<"processed" | "duplicate" | "ignored"> {
  const existing = await db.webhookEvent.findUnique({ where: { provider_eventId: { provider, eventId: outcome.eventId } } });
  if (existing && existing.status === "PROCESSED") return "duplicate";
  const event =
    existing ??
    (await db.webhookEvent.create({
      data: { provider, eventId: outcome.eventId, type: outcome.type, payload: (outcome.raw ?? {}) as Prisma.InputJsonValue },
    }));

  const payment = outcome.paymentId
    ? await db.payment.findUnique({ where: { id: outcome.paymentId } })
    : outcome.providerRef
      ? await db.payment.findUnique({ where: { provider_providerRef: { provider, providerRef: outcome.providerRef } } })
      : null;

  if (!payment || payment.provider !== provider || !outcome.status) {
    await db.webhookEvent.update({ where: { id: event.id }, data: { status: "IGNORED", processedAt: new Date(), error: payment ? "Kein relevanter Status" : "Zahlung unbekannt" } });
    return "ignored";
  }

  try {
    if (outcome.status === "COMPLETED") {
      if (outcome.amountCents != null && (outcome.amountCents !== payment.amountCents || (outcome.currency ?? "EUR") !== payment.currency)) {
        throw new Error("Betrag oder Währung stimmen nicht mit der Bestellung überein.");
      }
      const credited = await db.$transaction(async (tx) => {
        const upd = await tx.payment.updateMany({
          where: { id: payment.id, status: { in: ["CREATED", "PENDING"] } },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        if (upd.count === 0) return false;
        await creditTokens(tx, {
          userId: payment.userId,
          tokens: payment.tokens,
          type: "PURCHASE",
          reference: `payment:${payment.id}`,
          description: `Token-Kauf über ${ADAPTERS[provider].label}`,
          amountCents: payment.amountCents,
          paymentId: payment.id,
        });
        await tx.notification.create({
          data: { userId: payment.userId, title: "Zahlung erhalten", body: `${payment.tokens} Token wurden deinem Konto gutgeschrieben.`, link: "/dashboard/tokens" },
        });
        return true;
      });
      if (credited) {
        const user = await db.user.findUnique({ where: { id: payment.userId } });
        if (user) {
          const m = mailTemplates.paymentCompleted(user.displayName, payment.tokens, formatEuro(payment.amountCents));
          await sendMail(user.email, m.subject, m.html, m.text).catch(() => {});
        }
      }
    } else if (outcome.status === "FAILED" || outcome.status === "CANCELLED") {
      await db.payment.updateMany({
        where: { id: payment.id, status: { in: ["CREATED", "PENDING"] } },
        data: { status: outcome.status, failureReason: outcome.type },
      });
    } else if (outcome.status === "REFUNDED") {
      await db.$transaction(async (tx) => {
        const upd = await tx.payment.updateMany({ where: { id: payment.id, status: "COMPLETED" }, data: { status: "REFUNDED" } });
        if (upd.count === 0) return;
        // Gutgeschriebene Token zurückbuchen (Guthaben darf dabei negativ werden – Sperrung neuer Käufe)
        const user = await tx.user.update({ where: { id: payment.userId }, data: { tokenBalance: { decrement: payment.tokens } } });
        await tx.tokenTransaction.create({
          data: {
            userId: payment.userId, type: "REVERSAL", tokens: -payment.tokens, amountCents: -payment.amountCents,
            balanceAfter: user.tokenBalance, reference: `refund:${payment.id}`, description: "Rückbuchung wegen Erstattung", paymentId: payment.id,
          },
        });
        await tx.tokenTransaction.updateMany({ where: { reference: `payment:${payment.id}` }, data: { status: "REVERSED" } });
      });
    } else if (outcome.status === "PENDING") {
      await db.payment.updateMany({ where: { id: payment.id, status: "CREATED" }, data: { status: "PENDING" } });
    }
    await db.webhookEvent.update({ where: { id: event.id }, data: { status: "PROCESSED", processedAt: new Date(), error: null } });
    return "processed";
  } catch (e) {
    await db.webhookEvent.update({ where: { id: event.id }, data: { status: "FAILED", error: (e as Error).message.slice(0, 500) } });
    throw e;
  }
}
