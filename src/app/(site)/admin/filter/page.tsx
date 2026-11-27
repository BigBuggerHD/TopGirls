import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AdminFlash } from "@/components/admin/ui";
import { FilterForm } from "@/components/admin/filter-form";

const TYPE: Record<string, string> = { SELECT: "Einfachauswahl", MULTISELECT: "Mehrfachauswahl", BOOLEAN: "Ja/Nein", NUMBER: "Zahl" };

export default async function FiltersPage({ searchParams }: { searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  await requirePermission("admin.filters", "/admin");
  const sp = await searchParams;
  const [filters, categories] = await Promise.all([
    db.filterDefinition.findMany({ orderBy: [{ section: "asc" }, { sortOrder: "asc" }], include: { categories: { include: { category: true } }, _count: { select: { options: true, values: true } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="Dynamische Filter" description="Eigenschaften und Suchfilter anlegen, Kategorien zuordnen, sortieren und deaktivieren. Änderungen wirken sofort im Sedcard-Assistenten und in der Suche." />
      <AdminFlash sp={sp} />
      <Table>
        <THead><tr><TH>Sort.</TH><TH>Filter</TH><TH>Typ</TH><TH>Bereich</TH><TH>Kategorien</TH><TH className="text-right">Optionen</TH><TH className="text-right">Verwendet</TH><TH>Status</TH></tr></THead>
        <TBody>
          {filters.map((f) => (
            <TR key={f.id}>
              <TD>{f.sortOrder}</TD>
              <TD><Link href={`/admin/filter/${f.id}`} className="font-medium text-white hover:text-gold">{f.label}</Link><p className="font-mono text-[11px] text-subtle">f_{f.key}</p></TD>
              <TD>{TYPE[f.type]}</TD>
              <TD className="text-xs">{f.section === "service" ? "Service" : "Eigenschaften"}</TD>
              <TD className="text-xs">{f.categories.map((c) => c.category.name).join(", ") || "–"}</TD>
              <TD className="text-right">{f._count.options}</TD>
              <TD className="text-right">{f._count.values}</TD>
              <TD><Badge variant={f.active ? "success" : "default"}>{f.active ? (f.showInSearch ? "Aktiv" : "Nur Profil") : "Inaktiv"}</Badge></TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <h2 className="mb-3 mt-10 font-display text-2xl text-white">Neuer Filter</h2>
      <FilterForm categories={categories} back="/admin/filter" />
    </div>
  );
}
