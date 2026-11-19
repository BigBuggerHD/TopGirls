import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePermission("admin.audit", "/admin");
  const q = ((await searchParams).q ?? "").slice(0, 60);
  const logs = await db.auditLog.findMany({
    where: q ? { OR: [{ action: { contains: q } }, { targetId: q }, { actor: { email: { contains: q, mode: "insensitive" } } }] } : {},
    include: { actor: { select: { email: true } } }, orderBy: { createdAt: "desc" }, take: 300,
  });
  return (
    <div>
      <PageHeader title="Audit-Protokoll" description="Protokollierung sicherheitsrelevanter und administrativer Aktionen. IP-Adressen werden nur als gekürzter Hash gespeichert." />
      <form className="mb-4 max-w-sm"><Input name="q" defaultValue={q} placeholder="Aktion, Ziel-ID oder E-Mail" aria-label="Suche" /></form>
      <Table>
        <THead><tr><TH>Zeitpunkt</TH><TH>Akteur</TH><TH>Aktion</TH><TH>Ziel</TH><TH>Details</TH></tr></THead>
        <TBody>
          {logs.map((l) => (
            <TR key={l.id}>
              <TD className="whitespace-nowrap text-xs">{formatDateTime(l.createdAt)}</TD>
              <TD className="text-xs">{l.actor?.email ?? "System"}</TD>
              <TD className="font-mono text-xs text-gold">{l.action}</TD>
              <TD className="font-mono text-[11px] text-subtle">{l.targetType ? `${l.targetType}:${l.targetId}` : "–"}</TD>
              <TD className="max-w-xs truncate font-mono text-[11px] text-subtle" title={l.details ? JSON.stringify(l.details) : ""}>{l.details ? JSON.stringify(l.details) : ""}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
