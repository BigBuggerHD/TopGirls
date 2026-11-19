import Link from "next/link";
import { db } from "@/lib/db";
import { formatEuro } from "@/lib/format";
import { AD_LOCATION } from "@/lib/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Werbung & Preise" };

export default async function PricingPage() {
  const [products, packages, placements] = await Promise.all([
    db.premiumProduct.findMany({ where: { active: true }, orderBy: { priority: "desc" } }),
    db.tokenPackage.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.adPlacement.findMany({ where: { active: true }, orderBy: { priority: "desc" } }),
  ]);
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Für Inserenten" title="Werbung & Preise" description="Die Basis-Sedcard ist kostenlos. Für zusätzliche Sichtbarkeit nutzt du Token – transparent, ohne Abo." actions={<Button asChild><Link href="/registrieren">Jetzt starten</Link></Button>} />
      <h2 className="mb-4 font-display text-3xl text-white">Token-Pakete</h2>
      <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {packages.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-surface p-6">
            <p className="text-xs uppercase tracking-wider text-subtle">{p.name}</p>
            <p className="mt-2 font-display text-4xl text-white">{(p.tokens + p.bonusTokens).toLocaleString("de-DE")}</p>
            <p className="text-xs text-muted">Token{p.bonusTokens ? ` inkl. ${p.bonusTokens} Bonus` : ""}</p>
            <p className="mt-4 text-xl text-gold">{formatEuro(p.priceCents)}</p>
          </div>
        ))}
      </div>
      <h2 className="mb-4 font-display text-3xl text-white">Premium-Funktionen</h2>
      <div className="mb-12 grid gap-4 md:grid-cols-2">
        {products.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-surface p-6">
            <p className="font-display text-2xl text-white">{p.name}</p>
            <p className="mt-2 text-sm text-muted">{p.description}</p>
            <p className="mt-4 text-gold">{p.tokenCost} Token · {p.durationDays} Tage</p>
          </div>
        ))}
      </div>
      <h2 className="mb-4 font-display text-3xl text-white">Werbeflächen</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {placements.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-surface p-6">
            <p className="font-medium text-white">{p.name}</p>
            <p className="text-xs text-subtle">{AD_LOCATION[p.location]} · {p.width} × {p.height} px · max. {p.maxActive} gleichzeitig</p>
            <p className="mt-3 text-gold">{p.tokenCostPerDay} Token / Tag</p>
          </div>
        ))}
      </div>
    </div>
  );
}
