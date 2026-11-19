import type { PaymentProvider } from "@prisma/client";

/**
 * Modulare Zahlungsarchitektur.
 * Jeder Anbieter implementiert diese Schnittstelle in einem eigenen Adapter.
 * Der Zahlungsstatus wird AUSSCHLIESSLICH serverseitig (Webhook bzw. serverseitiger Capture) gesetzt.
 */
export interface CheckoutInput {
  paymentId: string; // interne ID, wird als Referenz an den Anbieter übergeben
  amountCents: number;
  currency: "EUR";
  description: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  providerRef: string; // ID beim Zahlungsanbieter (z. B. PayPal Order ID)
  redirectUrl: string; // Weiterleitung zum Bezahlvorgang
}

/** Normalisiertes Ergebnis einer Webhook-Verarbeitung. */
export interface WebhookOutcome {
  eventId: string;
  type: string;
  providerRef?: string;
  paymentId?: string;
  status?: "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED" | "PENDING";
  amountCents?: number;
  currency?: string;
  raw: unknown;
}

export interface PaymentAdapter {
  readonly provider: PaymentProvider;
  readonly label: string;
  /** true, wenn alle Zugangsdaten konfiguriert sind und der Adapter produktiv genutzt werden kann */
  isAvailable(): boolean;
  /** Hinweistext, falls nicht verfügbar */
  unavailableReason(): string | null;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  /** Optional: serverseitige Bestätigung nach Rückkehr des Kunden (z. B. PayPal Capture) */
  confirmReturn?(providerRef: string): Promise<WebhookOutcome>;
  /** Prüft die Signatur und parst das Ereignis. Muss bei ungültiger Signatur werfen. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome>;
}

export class PaymentConfigError extends Error {}
export class WebhookSignatureError extends Error {}
