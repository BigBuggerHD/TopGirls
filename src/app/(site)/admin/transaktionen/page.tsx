import Link from "next/link";
import type { TransactionType } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime, formatEuro, formatNumber } from "@/lib/format";
import { TX_STATUS, TX_TYPE } from "@/lib/labels";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ typ?: string; q?: string }> }) {
  await requirePermission("admin.tokens", "/admin");
  const sp = await searchParams;
  const type = sp.typ && sp.typ in TX_TYPE ? (sp.typ as TransactionType) : undefined;
  const q = (sp.q ?? "").slice(0, 80);
  const where = { ...(type ? { type } : {}), ...(q ? { OR: [{ reference: { contains: q } }, { user: { email: { contains: q, mode: "insensitive" as const } } }] } : {}) };
  const [rows, totals, circulating] = await Promise.all([
    db.tokenTransaction.findMany({ where, include: { user: { select: { email: true, id: true } }, createdBy: { select: { displayName: true } } }, orderBy: { createdAt: "desc" }, take: 300 }),
    db.tokenTransaction.groupBy({ by: ["type"], where: { status: "COMPLETED" }, _sum: { tokens: true } }),
    db.user.aggregate({ _sum: { tokenBalance: true } }),
  ]);
  const sum = (t: TransactionType) => totals.find((x) => x.type === t)?._sum.tokens ?? 0;
  return (
    <div>
      <PageHeader title="Transaktionsjournal" description="Alle Token-Buchungen plattformweit. Einträge sind unveränderlich; Korrekturen erfolgen über Gegenbuchungen." />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Token im Umlauf" value={formatNumber(circulating._sum.tokenBalance ?? 0)} />
        <StatCard label="Gekauft" value={formatNumber(sum("PURCHASE"))} />
        <StatCard label="Verbraucht" value={formatNumber(-sum("SPEND"))} />
        <StatCard label="Admin-Buchungen" value={formatNumber(sum("ADMIN_CREDIT") + sum("ADMIN_DEBIT"))} />
      </div>
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_220px_auto]">
        <Input name="q" defaultValue={q} placeholder="E-Mail oder Referenz" aria-label="Suche" />
        <Select name="typ" defaultValue={type ?? ""} aria-label="Buchungstyp"><option value="">Alle Buchungstypen</option>{Object.entries(TX_TYPE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Button type="submit">Filtern</Button>
      </form>
      <Table>
        <THead><tr><TH>Buchungsdatum</TH><TH>Benutzer</TH><TH>Typ</TH><TH>Beschreibung</TH><TH>Referenz</TH><TH>Status</TH><TH className="text-right">Betrag</TH><TH className="text-right">Token</TH><TH className="text-right">Saldo</TH></tr></THead>
        <TBody>
          {rows.map((t) => (
            <TR key={t.id}>
              <TD className="whitespace-nowrap text-xs">{formatDateTime(t.createdAt)}</TD>
              <TD className="text-xs"><Link href={`/admin/benutzer/${t.user.id}`} className="hover:text-gold">{t.user.email}</Link></TD>
              <TD>{TX_TYPE[t.type]}</TD>
              <TD className="text-xs">{t.description}{t.createdBy ? <span className="block text-subtle">durch {t.createdBy.displayName}</span> : null}</TD>
              <TD className="font-mono text-[11px] text-subtle">{t.reference}</TD>
              <TD><Badge variant={t.status === "COMPLETED" ? "success" : "danger"}>{TX_STATUS[t.status]}</Badge></TD>
              <TD className="text-right">{t.amountCents != null ? formatEuro(t.amountCents) : "–"}</TD>
              <TD className={`text-right ${t.tokens > 0 ? "text-success" : ""}`}>{t.tokens > 0 ? "+" : ""}{formatNumber(t.tokens)}</TD>
              <TD className="text-right">{formatNumber(t.balanceAfter)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
