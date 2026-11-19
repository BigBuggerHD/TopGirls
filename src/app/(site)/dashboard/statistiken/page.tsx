import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getStatsSeries, resolveRange, type StatRange } from "@/lib/stats";
import { formatDate, formatNumber } from "@/lib/format";
import { PageHeader, StatCard, EmptyState } from "@/components/ui/page-header";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { LineChart } from "@/components/charts/line-chart";
import { cn } from "@/lib/utils";

export const metadata = { title: "Statistiken" };

const RANGES: [StatRange, string][] = [["tag", "Heute"], ["woche", "7 Tage"], ["monat", "30 Tage"], ["frei", "Zeitraum"]];

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ zeitraum?: string; von?: string; bis?: string; sedcard?: string }> }) {
  const user = await requirePermission("stats.view");
  const sp = await searchParams;
  const range = (RANGES.some(([r]) => r === sp.zeitraum) ? sp.zeitraum : "monat") as StatRange;
  const profiles = await db.profile.findMany({ where: { ownerId: user.id }, select: { id: true, stageName: true }, orderBy: { stageName: "asc" } });
  if (profiles.length === 0) return <div><PageHeader title="Statistiken" /><EmptyState title="Noch keine Daten" text="Sobald deine Sedcard veröffentlicht ist, siehst du hier Impressionen, Aufrufe und Klicks." /></div>;

  const selected = profiles.find((p) => p.id === sp.sedcard);
  const ids = selected ? [selected.id] : profiles.map((p) => p.id);
  const { from, to } = resolveRange(range, sp.von, sp.bis);
  const { series, totals } = await getStatsSeries(ids, from, to);
  const perProfile = selected ? [] : await Promise.all(profiles.map(async (p) => ({ p, t: (await getStatsSeries([p.id], from, to)).totals })));
  const ctr = totals.views ? ((totals.clicks / totals.views) * 100).toFixed(1).replace(".", ",") : "0";
  const qs = (r: string) => `?zeitraum=${r}${selected ? `&sedcard=${selected.id}` : ""}`;

  return (
    <div>
      <PageHeader title="Statistiken" description={`Zeitraum: ${formatDate(from)} – ${formatDate(to)}`} />
      <div className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex gap-1">
          {RANGES.filter(([r]) => r !== "frei").map(([r, l]) => (
            <Link key={r} href={qs(r)} className={cn("rounded-full px-3 py-1.5 text-xs", range === r ? "bg-gold/15 text-gold" : "text-muted hover:text-foreground")}>{l}</Link>
          ))}
        </div>
        <form className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="zeitraum" value="frei" />
          <label className="text-xs text-subtle">Von<Input type="date" name="von" defaultValue={from.toISOString().slice(0, 10)} className="h-9" /></label>
          <label className="text-xs text-subtle">Bis<Input type="date" name="bis" defaultValue={to.toISOString().slice(0, 10)} className="h-9" /></label>
          <label className="text-xs text-subtle">Sedcard
            <Select name="sedcard" defaultValue={selected?.id ?? ""} className="h-9 min-w-40">
              <option value="">Alle Sedcards</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.stageName}</option>)}
            </Select>
          </label>
          <Button size="sm" type="submit">Anwenden</Button>
        </form>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Impressionen" value={formatNumber(totals.impressions)} hint="Einblendungen in Listen" />
        <StatCard label="Profilaufrufe" value={formatNumber(totals.views)} />
        <StatCard label="Kontaktklicks" value={formatNumber(totals.clicks)} />
        <StatCard label="Klickrate" value={`${ctr} %`} hint="Klicks / Aufrufe" />
      </div>

      {series.length > 1 ? (
        <div className="mb-8 grid gap-6 rounded-xl border border-border bg-surface p-5 lg:grid-cols-3">
          <LineChart label="Impressionen" data={series.map((s) => ({ date: s.date, value: s.impressions }))} />
          <LineChart label="Profilaufrufe" data={series.map((s) => ({ date: s.date, value: s.views }))} />
          <LineChart label="Kontaktklicks" data={series.map((s) => ({ date: s.date, value: s.clicks }))} />
        </div>
      ) : null}

      {perProfile.length > 1 ? (
        <section className="mb-8">
          <h2 className="mb-4 font-display text-2xl text-white">Nach Sedcard</h2>
          <Table>
            <THead><tr><TH>Sedcard</TH><TH className="text-right">Impressionen</TH><TH className="text-right">Aufrufe</TH><TH className="text-right">Klicks</TH></tr></THead>
            <TBody>
              {perProfile.sort((a, b) => b.t.views - a.t.views).map(({ p, t }) => (
                <TR key={p.id}><TD><Link href={`?zeitraum=${range}&sedcard=${p.id}`} className="hover:text-gold">{p.stageName}</Link></TD><TD className="text-right">{formatNumber(t.impressions)}</TD><TD className="text-right">{formatNumber(t.views)}</TD><TD className="text-right">{formatNumber(t.clicks)}</TD></TR>
              ))}
            </TBody>
          </Table>
        </section>
      ) : null}

      <details className="rounded-xl border border-border bg-surface p-4">
        <summary className="cursor-pointer text-sm text-gold">Tabellenansicht (Tageswerte)</summary>
        <div className="mt-4">
          <Table>
            <THead><tr><TH>Datum</TH><TH className="text-right">Impressionen</TH><TH className="text-right">Aufrufe</TH><TH className="text-right">Klicks</TH></tr></THead>
            <TBody>
              {[...series].reverse().map((s) => (
                <TR key={s.date}><TD>{formatDate(s.date + "T12:00:00Z")}</TD><TD className="text-right">{formatNumber(s.impressions)}</TD><TD className="text-right">{formatNumber(s.views)}</TD><TD className="text-right">{formatNumber(s.clicks)}</TD></TR>
              ))}
            </TBody>
          </Table>
        </div>
      </details>
    </div>
  );
}
