import "server-only";
import { type CheckoutInput, type PaymentAdapter, PaymentConfigError, WebhookSignatureError, type WebhookOutcome } from "./types";

/**
 * PayPal-Adapter auf Basis der offiziellen PayPal REST API:
 *  - OAuth2:              POST /v1/oauth2/token
 *  - Orders v2:           POST /v2/checkout/orders, POST /v2/checkout/orders/{id}/capture
 *  - Webhook-Prüfung:     POST /v1/notifications/verify-webhook-signature
 * Dokumentation: https://developer.paypal.com/docs/api/orders/v2/ und https://developer.paypal.com/api/rest/webhooks/
 *
 * Hinweis: PayPal schränkt Zahlungen für bestimmte Erwachsenen-Branchen ein (Acceptable Use Policy).
 * Vor Aktivierung muss die Zulässigkeit für das Geschäftsmodell mit PayPal geklärt werden.
 */
function base() {
  return process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

function configured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_WEBHOOK_ID);
}

async function accessToken(): Promise<string> {
  if (!configured()) throw new PaymentConfigError("PayPal ist nicht konfiguriert.");
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new PaymentConfigError(`PayPal-Authentifizierung fehlgeschlagen (${res.status}).`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

const centsToValue = (c: number) => (c / 100).toFixed(2);
const valueToCents = (v: string) => Math.round(Number(v) * 100);

type PayPalCapture = { id: string; status: string; amount?: { value: string; currency_code: string }; custom_id?: string; supplementary_data?: { related_ids?: { order_id?: string } } };

function mapCaptureStatus(s: string): WebhookOutcome["status"] {
  if (s === "COMPLETED") return "COMPLETED";
  if (s === "DECLINED" || s === "FAILED") return "FAILED";
  if (s === "REFUNDED") return "REFUNDED";
  return "PENDING";
}

export const paypalAdapter: PaymentAdapter = {
  provider: "PAYPAL",
  label: "PayPal",
  isAvailable: configured,
  unavailableReason: () => (configured() ? null : "PayPal-Zugangsdaten sind noch nicht hinterlegt."),

  async createCheckout(input: CheckoutInput) {
    const token = await accessToken();
    const res = await fetch(`${base()}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "PayPal-Request-Id": input.paymentId },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ reference_id: input.paymentId, custom_id: input.paymentId, description: input.description, amount: { currency_code: input.currency, value: centsToValue(input.amountCents) } }],
        payment_source: { paypal: { experience_context: { return_url: input.returnUrl, cancel_url: input.cancelUrl, brand_name: "Top Girls", locale: "de-DE", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING" } } },
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`PayPal-Bestellung konnte nicht erstellt werden (${res.status}).`);
    const order = (await res.json()) as { id: string; links: { rel: string; href: string }[] };
    const approve = order.links.find((l) => l.rel === "payer-action" || l.rel === "approve");
    if (!approve) throw new Error("PayPal hat keinen Freigabe-Link geliefert.");
    return { providerRef: order.id, redirectUrl: approve.href };
  },

  async confirmReturn(orderId: string): Promise<WebhookOutcome> {
    const token = await accessToken();
    const res = await fetch(`${base()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "PayPal-Request-Id": `capture-${orderId}` },
      cache: "no-store",
    });
    const json = (await res.json()) as { id: string; status: string; purchase_units?: { custom_id?: string; payments?: { captures?: PayPalCapture[] } }[] };
    const capture = json.purchase_units?.[0]?.payments?.captures?.[0];
    return {
      eventId: `return-capture-${orderId}`,
      type: "RETURN.CAPTURE",
      providerRef: orderId,
      paymentId: capture?.custom_id,
      status: capture ? mapCaptureStatus(capture.status) : res.ok ? "PENDING" : "FAILED",
      amountCents: capture?.amount ? valueToCents(capture.amount.value) : undefined,
      currency: capture?.amount?.currency_code,
      raw: json,
    };
  },

  async verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome> {
    const token = await accessToken();
    const event = JSON.parse(rawBody) as { id: string; event_type: string; resource: PayPalCapture };
    const res = await fetch(`${base()}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: process.env.PAYPAL_WEBHOOK_ID,
        webhook_event: event,
      }),
      cache: "no-store",
    });
    const result = (await res.json().catch(() => ({}))) as { verification_status?: string };
    if (!res.ok || result.verification_status !== "SUCCESS") throw new WebhookSignatureError("PayPal-Webhook-Signatur ungültig");

    const r = event.resource;
    let status: WebhookOutcome["status"];
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") status = "COMPLETED";
    else if (event.event_type === "PAYMENT.CAPTURE.DENIED") status = "FAILED";
    else if (event.event_type === "PAYMENT.CAPTURE.REFUNDED" || event.event_type === "PAYMENT.CAPTURE.REVERSED") status = "REFUNDED";
    return {
      eventId: event.id,
      type: event.event_type,
      providerRef: r?.supplementary_data?.related_ids?.order_id,
      paymentId: r?.custom_id,
      status,
      amountCents: r?.amount ? valueToCents(r.amount.value) : undefined,
      currency: r?.amount?.currency_code,
      raw: event,
    };
  },
};
