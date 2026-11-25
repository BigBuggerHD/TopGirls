import Link from "next/link";
import type { Role, UserStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/rbac";
import { USER_STATUS, VERIFICATION_STATUS } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; rolle?: string; status?: string }> }) {
  await requirePermission("admin.users", "/admin");
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 80);
  const users = await db.user.findMany({
    where: {
      ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { displayName: { contains: q, mode: "insensitive" } }, { companyName: { contains: q, mode: "insensitive" } }] } : {}),
      ...(sp.rolle && sp.rolle in ROLE_LABELS ? { role: sp.rolle as Role } : {}),
      ...(sp.status && sp.status in USER_STATUS ? { status: sp.status as UserStatus } : {}),
    },
    include: { _count: { select: { profiles: true } } }, orderBy: { createdAt: "desc" }, take: 200,
  });
  return (
    <div>
      <PageHeader title="Benutzer & Sperrungen" description="Konten suchen, Rollen ändern, sperren und Token-Guthaben anpassen." />
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_200px_200px_auto]">
        <Input name="q" defaultValue={q} placeholder="E-Mail, Name, Firma" aria-label="Suche" />
        <Select name="rolle" defaultValue={sp.rolle ?? ""} aria-label="Rolle"><option value="">Alle Rollen</option>{ASSIGNABLE_ROLES.map((k) => <option key={k} value={k}>{ROLE_LABELS[k]}</option>)}</Select>
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status"><option value="">Alle Status</option>{Object.entries(USER_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <Button type="submit">Filtern</Button>
      </form>
      <Table>
        <THead><tr><TH>Benutzer</TH><TH>Rolle</TH><TH>Status</TH><TH>Verifizierung</TH><TH className="text-right">Sedcards</TH><TH className="text-right">Token</TH><TH>Registriert</TH></tr></THead>
        <TBody>
          {users.map((u) => (
            <TR key={u.id}>
              <TD><Link href={`/admin/benutzer/${u.id}`} className="font-medium text-white hover:text-gold">{u.displayName}</Link><p className="text-xs text-subtle">{u.email}</p></TD>
              <TD>{ROLE_LABELS[u.role]}</TD>
              <TD><Badge variant={u.status === "ACTIVE" ? "success" : u.status === "DELETED" ? "default" : "danger"}>{USER_STATUS[u.status]}</Badge></TD>
              <TD className="text-xs">{VERIFICATION_STATUS[u.verificationStatus]}</TD>
              <TD className="text-right">{u._count.profiles}</TD>
              <TD className="text-right">{formatNumber(u.tokenBalance)}</TD>
              <TD className="text-xs">{formatDate(u.createdAt)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
