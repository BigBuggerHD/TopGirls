import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ADAPTERS } from "@/lib/payments";
import { formatDateTime, formatEuro, formatNumber } from "@/lib/format";
import { TX_STATUS, TX_TYPE } from "@/lib/labels";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { CheckoutForm } from "@/components/billing/forms";

export const metadata = { title: "Token-Guthaben" };

const MESSAGES: Record<string, { v: "success" | "error" | "warning"; t: string }> = {
  ok: { v: "success", t: "Zahlung erfolgreich. Die Token wurden deinem Konto gutgeschrieben." },
  fehler: { v: "error", t: "Die Zahlung ist fehlgeschlagen. Es wurde nichts abgebucht." },
  abgebrochen: { v: "warning", t: "Die Zahlung wurde abgebrochen." },
  ausstehend: { v: "warning", t: "Die Zahlung wird noch verarbeitet. Die Gutschrift erfolgt automatisch nach Bestätigung durch den Zahlungsanbieter." },
};

export default async function TokensPage({ searchParams }: { searchParams: Promise<{ zahlung?: string; abgebrochen?: string }> }) {
  const user = await requirePermission("tokens.buy");
  const sp = await searchParams;
  const [packages, transactions, sums] = await Promise.all([
    db.tokenPackage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.tokenTransaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.tokenTransaction.groupBy({ by: ["type"], where: { userId: user.id, status: "COMPLETED" }, _sum: { tokens: true } }),
  ]);
  const spent = -(sums.find((s) => s.type === "SPEND")?._sum.tokens ?? 0);
  const bought = sums.find((s) => s.type === "PURCHASE")?._sum.tokens ?? 0;
  const providers = (["SANDBOX", "PAYPAL", "CREDIT_CARD", "NEXTCOUP"] as const)
    .filter((p) => p !== "SANDBOX" || ADAPTERS.SANDBOX.isAvailable())
    .map((p) => ({ provider: p, label: ADAPTERS[p].label, available: ADAPTERS[p].isAvailable(), reason: ADAPTERS[p].unavailableReason() }));
  const msg = MESSAGES[sp.zahlung ?? (sp.abgebrochen ? "abgebrochen" : "")];

  return (
    <div>
      <PageHeader title="Token-Guthaben" description="Token sind das interne Guthaben von Top Girls für Premium-Funktionen und Werbung. Alle Buchungen werden serverseitig im Transaktionsjournal erfasst." />
      {msg ? <Alert variant={msg.v} className="mb-6">{msg.t}</Alert> : null}
      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard label="Aktuelles Guthaben" value={formatNumber(user.tokenBalance)} hint="Token" />
        <StatCard label="Gekauft (gesamt)" value={formatNumber(bought)} />
        <StatCard label="Verbraucht (gesamt)" value={formatNumber(spent)} />
      </div>
      <section className="mb-10 rounded-xl border border-border bg-surface p-5 sm:p-8">
        <h2 className="mb-6 font-display text-2xl text-white">Token kaufen</h2>
        <CheckoutForm packages={packages} providers={providers} idempotencyKey={randomUUID()} />
      </section>
      <h2 className="mb-4 font-display text-2xl text-white">Transaktionsjournal</h2>
      <Table>
        <THead><tr><TH>Buchungsdatum</TH><TH>Typ</TH><TH>Beschreibung</TH><TH>Referenz</TH><TH>Status</TH><TH className="text-right">Betrag</TH><TH className="text-right">Token</TH><TH className="text-right">Saldo</TH></tr></THead>
        <TBody>
          {transactions.map((t) => (
            <TR key={t.id}>
              <TD className="whitespace-nowrap">{formatDateTime(t.createdAt)}</TD>
              <TD>{TX_TYPE[t.type]}</TD>
              <TD>{t.description}</TD>
              <TD className="font-mono text-[11px] text-subtle">{t.reference.slice(0, 22)}</TD>
              <TD><Badge variant={t.status === "COMPLETED" ? "success" : t.status === "REVERSED" ? "danger" : "default"}>{TX_STATUS[t.status]}</Badge></TD>
              <TD className="text-right">{t.amountCents != null ? formatEuro(t.amountCents) : "–"}</TD>
              <TD className={`text-right font-medium ${t.tokens >= 0 ? "text-success" : "text-foreground"}`}>{t.tokens > 0 ? "+" : ""}{formatNumber(t.tokens)}</TD>
              <TD className="text-right">{formatNumber(t.balanceAfter)}</TD>
            </TR>
          ))}
          {transactions.length === 0 ? <TR><TD colSpan={8} className="py-8 text-center text-muted">Noch keine Transaktionen.</TD></TR> : null}
        </TBody>
      </Table>
    </div>
  );
}
