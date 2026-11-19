import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ADAPTERS } from "@/lib/payments";
import { formatDateTime, formatEuro, formatNumber } from "@/lib/format";
import { PAYMENT_PROVIDER, PAYMENT_STATUS } from "@/lib/labels";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function AdminPayments() {
  await requirePermission("admin.payments", "/admin");
  const [payments, events, completed] = await Promise.all([
    db.payment.findMany({ include: { user: { select: { email: true } }, package: true }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.webhookEvent.findMany({ orderBy: { receivedAt: "desc" }, take: 50 }),
    db.payment.groupBy({ by: ["provider"], where: { status: "COMPLETED" }, _sum: { amountCents: true }, _count: true }),
  ]);
  return (
    <div>
      <PageHeader title="Zahlungsübersicht" description="Zahlungsvorgänge, Zahlungsanbieter und eingegangene Webhook-Ereignisse." />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(ADAPTERS) as (keyof typeof ADAPTERS)[]).map((p) => {
          const c = completed.find((x) => x.provider === p);
          return (
            <div key={p} className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wider text-subtle">{ADAPTERS[p].label}</p>
              <p className="mt-2 font-display text-2xl text-white">{formatEuro(c?._sum.amountCents ?? 0)}</p>
              <p className="text-xs text-muted">{c?._count ?? 0} abgeschlossene Zahlungen</p>
              <Badge className="mt-2" variant={ADAPTERS[p].isAvailable() ? "success" : "default"}>{ADAPTERS[p].isAvailable() ? "Aktiv" : "Nicht aktiv"}</Badge>
              {!ADAPTERS[p].isAvailable() ? <p className="mt-1 text-[11px] text-subtle">{ADAPTERS[p].unavailableReason()}</p> : null}
            </div>
          );
        })}
      </div>
      <Table>
        <THead><tr><TH>Datum</TH><TH>Kunde</TH><TH>Paket</TH><TH>Anbieter</TH><TH>Anbieter-Referenz</TH><TH>Status</TH><TH className="text-right">Token</TH><TH className="text-right">Betrag</TH></tr></THead>
        <TBody>
          {payments.map((p) => (
            <TR key={p.id}>
              <TD className="text-xs">{formatDateTime(p.createdAt)}</TD><TD className="text-xs">{p.user.email}</TD><TD>{p.package?.name ?? "–"}</TD><TD>{PAYMENT_PROVIDER[p.provider]}</TD>
              <TD className="font-mono text-[11px] text-subtle">{p.providerRef ?? "–"}</TD>
              <TD><Badge variant={p.status === "COMPLETED" ? "success" : p.status === "FAILED" || p.status === "REFUNDED" ? "danger" : "default"}>{PAYMENT_STATUS[p.status]}</Badge>{p.failureReason ? <p className="text-[11px] text-subtle">{p.failureReason}</p> : null}</TD>
              <TD className="text-right">{formatNumber(p.tokens)}</TD><TD className="text-right">{formatEuro(p.amountCents)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <h2 className="mb-3 mt-10 font-display text-2xl text-white">Webhook-Ereignisse</h2>
      <Table>
        <THead><tr><TH>Eingang</TH><TH>Anbieter</TH><TH>Ereignis-ID</TH><TH>Typ</TH><TH>Status</TH></tr></THead>
        <TBody>
          {events.map((e) => (
            <TR key={e.id}><TD className="text-xs">{formatDateTime(e.receivedAt)}</TD><TD>{PAYMENT_PROVIDER[e.provider]}</TD><TD className="font-mono text-[11px]">{e.eventId}</TD><TD>{e.type}</TD><TD><Badge variant={e.status === "PROCESSED" ? "success" : e.status === "FAILED" ? "danger" : "default"}>{e.status}</Badge>{e.error ? <p className="text-[11px] text-danger">{e.error}</p> : null}</TD></TR>
          ))}
          {events.length === 0 ? <TR><TD colSpan={5} className="py-6 text-center text-muted">Noch keine Webhook-Ereignisse.</TD></TR> : null}
        </TBody>
      </Table>
    </div>
  );
}
