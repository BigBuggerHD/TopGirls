import "server-only";
import { type PaymentAdapter, PaymentConfigError } from "./types";

/**
 * Platzhalter-Adapter für noch nicht integrierte Zahlungsanbieter.
 *
 * Es werden bewusst KEINE API-Endpunkte erfunden. Sobald die offizielle Dokumentation und
 * Vertragsunterlagen des jeweiligen Anbieters vorliegen, wird hier die echte Implementierung
 * gemäß der Schnittstelle `PaymentAdapter` ergänzt (siehe docs/ZAHLUNGEN.md):
 *   1. createCheckout(): Zahlungssitzung beim Anbieter anlegen, Weiterleitungs-URL zurückgeben
 *   2. verifyWebhook(): Signatur nach Anbieter-Spezifikation prüfen (HMAC, Zertifikat …), Ereignis normalisieren
 *   3. optional confirmReturn(): serverseitige Statusabfrage nach Rückkehr des Kunden
 */
function placeholder(provider: "CREDIT_CARD" | "NEXTCOUP", label: string, envKeys: string[]): PaymentAdapter {
  const notIntegrated = `${label} ist vorbereitet, aber noch nicht integriert.`;
  return {
    provider,
    label,
    isAvailable: () => false,
    unavailableReason: () =>
      envKeys.every((k) => process.env[k]) ? `${notIntegrated} Zugangsdaten sind hinterlegt, die Adapter-Implementierung fehlt noch.` : notIntegrated,
    async createCheckout() {
      throw new PaymentConfigError(notIntegrated);
    },
    async verifyWebhook() {
      throw new PaymentConfigError(notIntegrated);
    },
  };
}

export const creditCardAdapter = placeholder("CREDIT_CARD", "Kreditkarte", ["CREDITCARD_PROVIDER", "CREDITCARD_API_KEY", "CREDITCARD_WEBHOOK_SECRET"]);
export const nextcoupAdapter = placeholder("NEXTCOUP", "Nextcoup", ["NEXTCOUP_API_BASE", "NEXTCOUP_MERCHANT_ID", "NEXTCOUP_API_KEY", "NEXTCOUP_WEBHOOK_SECRET"]);
