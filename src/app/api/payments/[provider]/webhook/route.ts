import { NextResponse, type NextRequest } from "next/server";
import { ADAPTERS, PROVIDER_SLUGS, processPaymentEvent } from "@/lib/payments";
import { PaymentConfigError, WebhookSignatureError } from "@/lib/payments/types";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Zentraler Webhook-Endpunkt: /api/payments/{paypal|kreditkarte|nextcoup|sandbox}/webhook
 * 1. Roh-Body lesen (für Signaturprüfung unverändert)
 * 2. Signatur über den Adapter prüfen – bei Fehler 400, keine Verarbeitung
 * 3. Ereignis idempotent verarbeiten
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: slug } = await params;
  const provider = PROVIDER_SLUGS[slug];
  if (!provider) return NextResponse.json({ error: "Unbekannter Anbieter" }, { status: 404 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`webhook:${provider}:${ip}`, 300, 60_000).ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const adapter = ADAPTERS[provider];
  if (provider === "SANDBOX" && !adapter.isAvailable()) return NextResponse.json({ error: "Sandbox deaktiviert" }, { status: 404 });
  const raw = await req.text();
  if (raw.length > 512_000) return NextResponse.json({ error: "Zu groß" }, { status: 413 });

  let outcome;
  try {
    outcome = await adapter.verifyWebhook(raw, req.headers);
  } catch (e) {
    if (e instanceof WebhookSignatureError) return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
    if (e instanceof PaymentConfigError) return NextResponse.json({ error: e.message }, { status: 501 });
    return NextResponse.json({ error: "Ungültiges Ereignis" }, { status: 400 });
  }
  try {
    const result = await processPaymentEvent(provider, outcome);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("Webhook-Verarbeitung fehlgeschlagen", e);
    // 500 → Anbieter wiederholt die Zustellung; Verarbeitung ist idempotent
    return NextResponse.json({ error: "Verarbeitung fehlgeschlagen" }, { status: 500 });
  }
}
