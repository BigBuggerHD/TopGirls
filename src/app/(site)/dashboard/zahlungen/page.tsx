import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime, formatEuro, formatNumber } from "@/lib/format";
import { PAYMENT_PROVIDER, PAYMENT_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata = { title: "Zahlungen" };

export default async function PaymentsPage() {
  const user = await requirePermission("tokens.buy");
  const payments = await db.payment.findMany({ where: { userId: user.id }, include: { package: true }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <PageHeader title="Zahlungen" description="Übersicht deiner Zahlungsvorgänge. Rechnungen werden nach Integration eines Rechnungsmoduls hier bereitgestellt (noch nicht integriert)." />
      <Table>
        <THead><tr><TH>Datum</TH><TH>Paket</TH><TH>Zahlungsart</TH><TH>Status</TH><TH className="text-right">Token</TH><TH className="text-right">Betrag</TH></tr></THead>
        <TBody>
          {payments.map((p) => (
            <TR key={p.id}>
              <TD>{formatDateTime(p.createdAt)}</TD>
              <TD>{p.package?.name ?? "–"}</TD>
              <TD>{PAYMENT_PROVIDER[p.provider]}</TD>
              <TD><Badge variant={p.status === "COMPLETED" ? "success" : p.status === "FAILED" ? "danger" : "default"}>{PAYMENT_STATUS[p.status]}</Badge></TD>
              <TD className="text-right">{formatNumber(p.tokens)}</TD>
              <TD className="text-right">{formatEuro(p.amountCents)}</TD>
            </TR>
          ))}
          {payments.length === 0 ? <TR><TD colSpan={6} className="py-8 text-center text-muted">Noch keine Zahlungen.</TD></TR> : null}
        </TBody>
      </Table>
    </div>
  );
}
