import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PROMOTION_TYPE } from "@/lib/labels";
import { savePackageAction, saveProductAction } from "@/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { AdminFlash, HiddenBack, inputCls } from "@/components/admin/ui";
import type { TokenPackage } from "@prisma/client";

function PackageForm({ p }: { p?: TokenPackage }) {
  return (
    <form action={savePackageAction} className="grid items-end gap-2 rounded-lg border border-border bg-background-alt p-3 text-xs sm:grid-cols-[1fr_90px_90px_100px_70px_auto_auto]">
      <HiddenBack path="/admin/produkte" />
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <label>Name<input name="name" defaultValue={p?.name} required className={`${inputCls} w-full`} /></label>
      <label>Token<input name="tokens" type="number" defaultValue={p?.tokens} required className={`${inputCls} w-full`} /></label>
      <label>Bonus<input name="bonusTokens" type="number" defaultValue={p?.bonusTokens ?? 0} className={`${inputCls} w-full`} /></label>
      <label>Preis (€)<input name="price" defaultValue={p ? (p.priceCents / 100).toFixed(2).replace(".", ",") : ""} required className={`${inputCls} w-full`} /></label>
      <label>Sort.<input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className={`${inputCls} w-full`} /></label>
      <label className="flex items-center gap-1.5 pb-2"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="accent-[#C6A76B]" /> aktiv</label>
      <Button size="sm">{p ? "Speichern" : "Anlegen"}</Button>
    </form>
  );
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  await requirePermission("admin.products", "/admin");
  const sp = await searchParams;
  const [products, packages] = await Promise.all([db.premiumProduct.findMany({ orderBy: { priority: "desc" } }), db.tokenPackage.findMany({ orderBy: { sortOrder: "asc" } })]);
  return (
    <div>
      <PageHeader title="Premium-Produkte & Token-Pakete" description="Token-Kosten, Laufzeiten und Prioritäten der Premium-Funktionen sowie die Preise der Token-Pakete. Preisänderungen gelten nur für neue Buchungen." />
      <AdminFlash sp={sp} />
      <h2 className="mb-3 font-display text-2xl text-white">Premium-Produkte</h2>
      <div className="mb-10 space-y-2">
        {products.map((p) => (
          <form key={p.id} action={saveProductAction} className="grid items-end gap-2 rounded-lg border border-border bg-background-alt p-3 text-xs sm:grid-cols-[160px_1fr_2fr_90px_90px_80px_auto_auto]">
            <HiddenBack path="/admin/produkte" /><input type="hidden" name="id" value={p.id} />
            <p className="pb-2 font-medium text-gold">{PROMOTION_TYPE[p.type]}</p>
            <label>Name<input name="name" defaultValue={p.name} className={`${inputCls} w-full`} /></label>
            <label>Beschreibung<input name="description" defaultValue={p.description ?? ""} className={`${inputCls} w-full`} /></label>
            <label>Token<input name="tokenCost" type="number" defaultValue={p.tokenCost} className={`${inputCls} w-full`} /></label>
            <label>Tage<input name="durationDays" type="number" defaultValue={p.durationDays} className={`${inputCls} w-full`} /></label>
            <label>Priorität<input name="priority" type="number" defaultValue={p.priority} className={`${inputCls} w-full`} /></label>
            <label className="flex items-center gap-1.5 pb-2"><input type="checkbox" name="active" defaultChecked={p.active} className="accent-[#C6A76B]" /> aktiv</label>
            <Button size="sm">Speichern</Button>
          </form>
        ))}
      </div>
      <h2 className="mb-3 font-display text-2xl text-white">Token-Pakete</h2>
      <div className="space-y-2">{packages.map((p) => <PackageForm key={p.id} p={p} />)}<p className="pt-2 text-xs uppercase tracking-wider text-gold">Neues Paket</p><PackageForm /></div>
    </div>
  );
}
