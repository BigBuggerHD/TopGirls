import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatEuro, formatNumber } from "@/lib/format";
import { simulateSandboxPaymentAction } from "@/actions/billing";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Testzahlung" };

/** Simulierte Bezahlseite eines externen Anbieters (nur Sandbox-Modus). */
export default async function SandboxCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.PAYMENT_SANDBOX !== "true") notFound();
  const user = await requireUser();
  const { id } = await params;
  const payment = await db.payment.findFirst({ where: { id, userId: user.id, provider: "SANDBOX" }, include: { package: true } });
  if (!payment) notFound();
  const open = ["CREATED", "PENDING"].includes(payment.status);
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-violet/40 bg-surface p-8">
      <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-violet"><FlaskConical className="size-4" /> Sandbox-Zahlungsanbieter</p>
      <h1 className="mt-4 font-display text-3xl text-white">Testzahlung</h1>
      <p className="mt-2 text-sm text-muted">Diese Seite simuliert einen externen Zahlungsanbieter. Es wird kein echtes Geld bewegt. Die Bestätigung läuft über einen signierten Webhook – genau wie bei echten Anbietern.</p>
      <dl className="my-6 space-y-2 rounded-lg bg-background-alt p-4 text-sm">
        <div className="flex justify-between"><dt className="text-subtle">Paket</dt><dd>{payment.package?.name}</dd></div>
        <div className="flex justify-between"><dt className="text-subtle">Token</dt><dd>{formatNumber(payment.tokens)}</dd></div>
        <div className="flex justify-between"><dt className="text-subtle">Betrag</dt><dd className="text-gold">{formatEuro(payment.amountCents)}</dd></div>
        <div className="flex justify-between"><dt className="text-subtle">Referenz</dt><dd className="font-mono text-xs">{payment.id}</dd></div>
      </dl>
      {open ? (
        <form action={simulateSandboxPaymentAction} className="grid gap-3">
          <input type="hidden" name="paymentId" value={payment.id} />
          <Button name="outcome" value="success" size="lg">Zahlung erfolgreich simulieren</Button>
          <Button name="outcome" value="fail" variant="destructive">Zahlung fehlschlagen lassen</Button>
          <Button name="outcome" value="cancel" variant="ghost">Abbrechen</Button>
        </form>
      ) : <p className="text-sm text-muted">Diese Zahlung ist bereits abgeschlossen.</p>}
    </div>
  );
}
