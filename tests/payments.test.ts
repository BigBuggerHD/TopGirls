import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeAll(() => {
  process.env.PAYMENT_SANDBOX = "true";
  process.env.PAYMENT_SANDBOX_SECRET = "test-secret";
});

describe("Sandbox-Zahlungsadapter", () => {
  it("akzeptiert korrekt signierte Webhooks", async () => {
    const { sandboxAdapter, signSandboxPayload, SANDBOX_SIGNATURE_HEADER } = await import("@/lib/payments/sandbox");
    const body = JSON.stringify({ id: "evt_1", type: "payment.succeeded", paymentId: "p1", providerRef: "sbx_p1", amountCents: 1000, currency: "EUR" });
    const out = await sandboxAdapter.verifyWebhook(body, new Headers({ [SANDBOX_SIGNATURE_HEADER]: signSandboxPayload(body) }));
    expect(out.status).toBe("COMPLETED");
    expect(out.amountCents).toBe(1000);
  });
  it("lehnt manipulierte Webhooks ab", async () => {
    const { sandboxAdapter, signSandboxPayload, SANDBOX_SIGNATURE_HEADER } = await import("@/lib/payments/sandbox");
    const body = JSON.stringify({ id: "evt_2", type: "payment.succeeded", paymentId: "p1", amountCents: 1000 });
    const sig = signSandboxPayload(body);
    const tampered = body.replace("1000", "1");
    await expect(sandboxAdapter.verifyWebhook(tampered, new Headers({ [SANDBOX_SIGNATURE_HEADER]: sig }))).rejects.toThrow();
    await expect(sandboxAdapter.verifyWebhook(body, new Headers())).rejects.toThrow();
  });
  it("Platzhalter-Adapter sind nicht verfügbar und werfen bei Nutzung", async () => {
    const { creditCardAdapter, nextcoupAdapter } = await import("@/lib/payments/placeholders");
    expect(creditCardAdapter.isAvailable()).toBe(false);
    expect(nextcoupAdapter.isAvailable()).toBe(false);
    await expect(nextcoupAdapter.createCheckout({ paymentId: "x", amountCents: 1, currency: "EUR", description: "", returnUrl: "", cancelUrl: "" })).rejects.toThrow(/nicht integriert/);
  });
});
