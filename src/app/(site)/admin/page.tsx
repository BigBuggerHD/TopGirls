import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { formatDateTime, formatEuro, formatNumber } from "@/lib/format";
import { REPORT_REASON } from "@/lib/labels";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";

export default async function AdminHome() {
  const user = await requirePermission("moderation.access", "/admin");
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [users, published, pendingProfiles, reports, revenue, urgent, newUsers] = await Promise.all([
    db.user.count({ where: { status: { not: "DELETED" } } }),
    db.profile.count({ where: { status: "PUBLISHED" } }),
    db.profile.count({ where: { status: "PENDING_REVIEW" } }),
    db.report.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    db.payment.aggregate({ where: { status: "COMPLETED", completedAt: { gte: since } }, _sum: { amountCents: true } }),
    db.report.findMany({ where: { status: { in: ["OPEN", "IN_REVIEW"] } }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }], take: 6 }),
    db.user.count({ where: { createdAt: { gte: since } } }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Verwaltung" title="Übersicht" description="Aktuelle Aufgaben und Kennzahlen von Top Girls." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Offene Meldungen" value={reports} />
        <StatCard label="Sedcards in Prüfung" value={pendingProfiles} />
        <StatCard label="Veröffentlichte Sedcards" value={formatNumber(published)} />
        <StatCard label="Benutzer" value={formatNumber(users)} hint={`+${newUsers} in 30 Tagen`} />
        {can(user.role, "admin.payments") ? <StatCard label="Umsatz (30 Tage)" value={formatEuro(revenue._sum.amountCents ?? 0)} /> : null}
      </div>
      <section className="mt-8 rounded-xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl text-white">Dringende Meldungen</h2><Link href="/admin/meldungen" className="text-xs text-gold hover:underline">Alle Meldungen</Link></div>
        {urgent.length === 0 ? <p className="text-sm text-muted">Keine offenen Meldungen.</p> : (
          <ul className="divide-y divide-border">
            {urgent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <Link href={`/admin/meldungen?id=${r.id}`} className="hover:text-gold">{REPORT_REASON[r.reason]} · {r.targetType}</Link>
                <span className="flex items-center gap-3"><Badge variant={r.priority >= 80 ? "danger" : r.priority >= 50 ? "warning" : "default"}>Priorität {r.priority}</Badge><span className="text-xs text-subtle">{formatDateTime(r.createdAt)}</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
