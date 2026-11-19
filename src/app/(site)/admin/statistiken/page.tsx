import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatEuro, formatNumber } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/rbac";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { LineChart } from "@/components/charts/line-chart";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export default async function PlatformStats() {
  await requirePermission("admin.stats", "/admin");
  const since = new Date(Date.now() - 29 * 86_400_000);
  const [daily, roles, revenue, top, cats] = await Promise.all([
    db.$queryRaw<{ date: Date; impressions: bigint; views: bigint; clicks: bigint }[]>`SELECT date, SUM(impressions) AS impressions, SUM(views) AS views, SUM(clicks) AS clicks FROM "ProfileStatDaily" WHERE date >= ${since}::date GROUP BY date ORDER BY date`,
    db.user.groupBy({ by: ["role"], _count: true, where: { status: { not: "DELETED" } } }),
    db.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amountCents: true }, _count: true }),
    db.$queryRaw<{ stageName: string; views: bigint }[]>`SELECT p."stageName", SUM(s.views) AS views FROM "ProfileStatDaily" s JOIN "Profile" p ON p.id = s."profileId" WHERE s.date >= ${since}::date GROUP BY p."stageName" ORDER BY views DESC LIMIT 10`,
    db.profile.groupBy({ by: ["categoryId", "status"], _count: true }),
  ]);
  const categories = await db.category.findMany();
  const series = daily.map((d) => ({ date: d.date.toISOString().slice(0, 10), impressions: Number(d.impressions), views: Number(d.views), clicks: Number(d.clicks) }));
  return (
    <div>
      <PageHeader title="Plattform-Statistiken" description="Aggregierte Kennzahlen der letzten 30 Tage – ohne personenbezogene Daten." />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Umsatz gesamt" value={formatEuro(revenue._sum.amountCents ?? 0)} hint={`${revenue._count} Zahlungen`} />
        <StatCard label="Profilaufrufe (30 T.)" value={formatNumber(series.reduce((a, s) => a + s.views, 0))} />
        <StatCard label="Impressionen (30 T.)" value={formatNumber(series.reduce((a, s) => a + s.impressions, 0))} />
        <StatCard label="Kontaktklicks (30 T.)" value={formatNumber(series.reduce((a, s) => a + s.clicks, 0))} />
      </div>
      {series.length > 1 ? (
        <div className="mb-8 grid gap-6 rounded-xl border border-border bg-surface p-5 lg:grid-cols-3">
          <LineChart label="Impressionen" data={series.map((s) => ({ date: s.date, value: s.impressions }))} />
          <LineChart label="Profilaufrufe" data={series.map((s) => ({ date: s.date, value: s.views }))} />
          <LineChart label="Kontaktklicks" data={series.map((s) => ({ date: s.date, value: s.clicks }))} />
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-3">
        <section><h2 className="mb-3 font-display text-xl text-white">Konten nach Rolle</h2>
          <Table><THead><tr><TH>Rolle</TH><TH className="text-right">Anzahl</TH></tr></THead><TBody>{roles.map((r) => <TR key={r.role}><TD>{ROLE_LABELS[r.role]}</TD><TD className="text-right">{r._count}</TD></TR>)}</TBody></Table>
        </section>
        <section><h2 className="mb-3 font-display text-xl text-white">Top-Sedcards (Aufrufe)</h2>
          <Table><THead><tr><TH>Sedcard</TH><TH className="text-right">Aufrufe</TH></tr></THead><TBody>{top.map((t) => <TR key={t.stageName}><TD>{t.stageName}</TD><TD className="text-right">{formatNumber(Number(t.views))}</TD></TR>)}</TBody></Table>
        </section>
        <section><h2 className="mb-3 font-display text-xl text-white">Sedcards nach Kategorie</h2>
          <Table><THead><tr><TH>Kategorie</TH><TH>Status</TH><TH className="text-right">Anzahl</TH></tr></THead><TBody>{cats.map((c) => <TR key={c.categoryId + c.status}><TD>{categories.find((x) => x.id === c.categoryId)?.name}</TD><TD className="text-xs">{c.status}</TD><TD className="text-right">{c._count}</TD></TR>)}</TBody></Table>
        </section>
      </div>
    </div>
  );
}
