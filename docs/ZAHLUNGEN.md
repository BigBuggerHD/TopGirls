# Zahlungsarchitektur

## Schnittstelle

Jeder Anbieter implementiert `PaymentAdapter` (`src/lib/payments/types.ts`):

```ts
interface PaymentAdapter {
  provider: PaymentProvider;
  label: string;
  isAvailable(): boolean;
  unavailableReason(): string | null;
  createCheckout(input: CheckoutInput): Promise<{ providerRef: string; redirectUrl: string }>;
  confirmReturn?(providerRef: string): Promise<WebhookOutcome>;   // optional
  verifyWebhook(rawBody: string, headers: Headers): Promise<WebhookOutcome>; // wirft bei ungültiger Signatur
}
```

## Ablauf

1. Nutzer wählt Paket + Zahlungsart. Formular enthält einen Idempotenzschlüssel (UUID) → doppeltes Absenden erzeugt keine zweite Zahlung (`Payment.idempotencyKey` unique).
2. `Payment` wird mit Status `CREATED` angelegt; Adapter erstellt die Zahlung beim Anbieter → Status `PENDING`, Weiterleitung.
3. Bestätigung **ausschließlich serverseitig**: Webhook `POST /api/payments/{paypal|kreditkarte|nextcoup|sandbox}/webhook` (Signaturprüfung im Adapter) bzw. serverseitiger Capture bei Rückkehr (PayPal).
4. `processPaymentEvent()`:
   - speichert jedes Ereignis genau einmal (`WebhookEvent` unique `provider + eventId`)
   - prüft Betrag und Währung gegen die Bestellung
   - Statuswechsel nach `COMPLETED` per bedingtem Update genau einmal
   - Token-Gutschrift mit eindeutiger Referenz `payment:<id>`
   - Erstattungen/Chargebacks → `REFUNDED`, Rückbuchung `refund:<id>`
   - Fehler → HTTP 500, damit der Anbieter erneut zustellt (Verarbeitung ist idempotent)

## Adapter

| Adapter | Status | Hinweise |
|---|---|---|
| Sandbox | aktiv bei `PAYMENT_SANDBOX=true` | Simulierte Bezahlseite, HMAC-SHA256-signierte Webhooks (`x-sandbox-signature: t=<ts>,v1=<hex>`, 5 Minuten gültig). **In Produktion deaktivieren.** |
| PayPal | implementiert, aktiv bei gesetzten Zugangsdaten | Offizielle REST API: `/v1/oauth2/token`, `/v2/checkout/orders`, `/v2/checkout/orders/{id}/capture`, `/v1/notifications/verify-webhook-signature`. Webhook-URL im PayPal-Dashboard: `<APP_URL>/api/payments/paypal/webhook`, Ereignisse `PAYMENT.CAPTURE.COMPLETED/DENIED/REFUNDED/REVERSED`. **Vorher klären, ob das Geschäftsmodell nach der PayPal Acceptable Use Policy zulässig ist.** |
| Kreditkarte | Platzhalter (nicht integriert) | Es wurde bewusst kein Zahlungsdienstleister erfunden. Viele Kartenakquirer verlangen für Erwachsenenbranchen spezielle Verträge (High-Risk-MCC). |
| Nextcoup | Platzhalter (nicht integriert) | Keine offizielle API-Dokumentation vorliegend – es wurden keine Endpunkte erfunden. |

In der Oberfläche werden nicht verfügbare Zahlungsarten deaktiviert und als „noch nicht integriert“ gekennzeichnet.

## Neuen Anbieter integrieren

1. Offizielle API-Dokumentation und Vertragsunterlagen beschaffen.
2. Adapter in `src/lib/payments/<anbieter>.ts` implementieren (Platzhalter in `placeholders.ts` ersetzen).
3. `verifyWebhook` gemäß Anbieter-Spezifikation (HMAC, Zertifikat, Zeitstempel/Replay-Schutz) umsetzen.
4. In `ADAPTERS` registrieren; Zugangsdaten nur über Umgebungsvariablen.
5. Tests nach Vorbild `tests/payments.test.ts` ergänzen.
