import Link from "next/link";
import type { ProfileStatus } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PROFILE_STATUS, VERIFICATION_STATUS } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AdminFlash } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export default async function AdminProfiles({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; ok?: string; fehler?: string }> }) {
  await requirePermission("moderation.profiles", "/admin");
  const sp = await searchParams;
  const status = (Object.keys(PROFILE_STATUS).includes(sp.status ?? "") ? sp.status : sp.status === "alle" ? undefined : "PENDING_REVIEW") as ProfileStatus | undefined;
  const q = (sp.q ?? "").slice(0, 80);
  const profiles = await db.profile.findMany({
    where: { ...(status ? { status } : {}), ...(q ? { OR: [{ stageName: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { owner: { email: { contains: q, mode: "insensitive" } } }] } : {}) },
    include: { owner: { select: { email: true, role: true, verificationStatus: true } }, category: true, _count: { select: { images: true } } },
    orderBy: [{ submittedAt: "asc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return (
    <div>
      <PageHeader title="Sedcard-Verwaltung" description="Prüfe eingereichte Sedcards und verwalte alle Profile." />
      <AdminFlash sp={sp} />
      <div className="mb-4 flex flex-wrap gap-1">
        {[["PENDING_REVIEW", "In Prüfung"], ["PUBLISHED", "Veröffentlicht"], ["REJECTED", "Abgelehnt"], ["BLOCKED", "Gesperrt"], ["DRAFT", "Entwürfe"], ["alle", "Alle"]].map(([v, l]) => (
          <Link key={v} href={`?status=${v}`} className={cn("rounded-full px-3 py-1.5 text-xs", (status ?? "alle") === v ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground")}>{l}</Link>
        ))}
      </div>
      <form className="mb-4 max-w-sm"><input type="hidden" name="status" value={status ?? "alle"} /><Input name="q" defaultValue={q} placeholder="Name, Stadt oder E-Mail" aria-label="Suche" /></form>
      <Table>
        <THead><tr><TH>Sedcard</TH><TH>Inhaber</TH><TH>Kategorie</TH><TH>Status</TH><TH>Eingereicht</TH><TH /></tr></THead>
        <TBody>
          {profiles.map((p) => (
            <TR key={p.id}>
              <TD className="font-medium text-white">{p.stageName}<p className="text-xs font-normal text-subtle">{p.city} · {p._count.images} Bilder</p></TD>
              <TD className="text-xs">{p.owner.email}<p className="text-subtle">{ROLE_LABELS[p.owner.role]} · {VERIFICATION_STATUS[p.owner.verificationStatus]}</p></TD>
              <TD>{p.category.name}</TD>
              <TD><Badge variant={p.status === "PUBLISHED" ? "success" : p.status === "PENDING_REVIEW" ? "warning" : p.status === "BLOCKED" || p.status === "REJECTED" ? "danger" : "default"}>{PROFILE_STATUS[p.status]}</Badge></TD>
              <TD className="text-xs">{formatDateTime(p.submittedAt)}</TD>
              <TD><Link href={`/admin/sedcards/${p.id}`} className="text-sm text-gold hover:underline">Prüfen</Link></TD>
            </TR>
          ))}
          {profiles.length === 0 ? <TR><TD colSpan={6} className="py-8 text-center text-muted">Keine Einträge.</TD></TR> : null}
        </TBody>
      </Table>
    </div>
  );
}
