import "server-only";
import { hmacSha256Hex, safeEqual } from "@/lib/crypto";
import { type CheckoutInput, type PaymentAdapter, WebhookSignatureError, type WebhookOutcome } from "./types";

/**
 * Sandbox-Adapter für lokale Entwicklung und Tests.
 * Simuliert einen externen Anbieter inkl. HMAC-signierter Webhooks (Header `x-sandbox-signature`).
 * Nur aktiv, wenn PAYMENT_SANDBOX=true.
 */
export const SANDBOX_SIGNATURE_HEADER = "x-sandbox-signature";

export function sandboxSecret() {
  return process.env.PAYMENT_SANDBOX_SECRET || "sandbox-dev-secret";
}

export function signSandboxPayload(body: string) {
  const ts = Math.floor(Date.now() / 1000);
  return `t=${ts},v1=${hmacSha256Hex(sandboxSecret(), `${ts}.${body}`)}`;
}

export const sandboxAdapter: PaymentAdapter = {
  provider: "SANDBOX",
  label: "Testzahlung (Sandbox)",
  isAvailable: () => process.env.PAYMENT_SANDBOX === "true",
  unavailableReason: () => (process.env.PAYMENT_SANDBOX === "true" ? null : "Sandbox ist deaktiviert."),
  async createCheckout(input: CheckoutInput) {
    return { providerRef: `sbx_${input.paymentId}`, redirectUrl: `/dashboard/tokens/sandbox/${input.paymentId}` };
  },
  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome> {
    const sig = headers.get(SANDBOX_SIGNATURE_HEADER) ?? "";
    const m = /^t=(\d+),v1=([a-f0-9]{64})$/.exec(sig);
    if (!m) throw new WebhookSignatureError("Signatur fehlt");
    const ts = Number(m[1]);
    if (Math.abs(Date.now() / 1000 - ts) > 300) throw new WebhookSignatureError("Signatur abgelaufen");
    if (!safeEqual(hmacSha256Hex(sandboxSecret(), `${ts}.${rawBody}`), m[2])) throw new WebhookSignatureError("Signatur ungültig");
    const evt = JSON.parse(rawBody) as { id: string; type: string; paymentId: string; providerRef: string; amountCents: number; currency: string };
    const status = evt.type === "payment.succeeded" ? "COMPLETED" : evt.type === "payment.failed" ? "FAILED" : evt.type === "payment.refunded" ? "REFUNDED" : undefined;
    return { eventId: evt.id, type: evt.type, paymentId: evt.paymentId, providerRef: evt.providerRef, status, amountCents: evt.amountCents, currency: evt.currency, raw: evt };
  },
};
