import Image from "next/image";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { formatDate, formatNumber } from "@/lib/format";
import { AD_LOCATION, AD_STATUS } from "@/lib/labels";
import { mediaUrl } from "@/lib/media";
import { reviewAdBookingAction, savePlacementAction } from "@/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AdminFlash, HiddenBack, inputCls } from "@/components/admin/ui";
import type { AdPlacement } from "@prisma/client";

function PlacementForm({ p }: { p?: AdPlacement }) {
  return (
    <form action={savePlacementAction} className="grid items-end gap-2 rounded-lg border border-border bg-background-alt p-3 text-xs sm:grid-cols-4 xl:grid-cols-9">
      <HiddenBack path="/admin/werbung" />
      {p ? <input type="hidden" name="id" value={p.id} /> : null}
      <label>Schlüssel<input name="key" defaultValue={p?.key} required className={`${inputCls} w-full`} /></label>
      <label className="xl:col-span-2">Name<input name="name" defaultValue={p?.name} required className={`${inputCls} w-full`} /></label>
      <label>Position
        <select name="location" defaultValue={p?.location ?? "HOME_HERO"} className={`${inputCls} w-full`}>
          {Object.entries(AD_LOCATION).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </label>
      <label>Breite<input name="width" type="number" defaultValue={p?.width ?? 1600} className={`${inputCls} w-full`} /></label>
      <label>Höhe<input name="height" type="number" defaultValue={p?.height ?? 500} className={`${inputCls} w-full`} /></label>
      <label>Max. aktiv<input name="maxActive" type="number" defaultValue={p?.maxActive ?? 2} className={`${inputCls} w-full`} /></label>
      <label>Token/Tag<input name="tokenCostPerDay" type="number" defaultValue={p?.tokenCostPerDay ?? 20} className={`${inputCls} w-full`} /></label>
      <label>Priorität<input name="priority" type="number" defaultValue={p?.priority ?? 0} className={`${inputCls} w-full`} /></label>
      <label className="sm:col-span-3 xl:col-span-6">Beschreibung<input name="description" defaultValue={p?.description ?? ""} className={`${inputCls} w-full`} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="accent-[#F3C2C6]" /> aktiv</label>
      <Button size="sm" className="xl:col-span-2">{p ? "Speichern" : "Werbefläche anlegen"}</Button>
    </form>
  );
}

export default async function AdminAds({ searchParams }: { searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  const user = await requirePermission("moderation.ads", "/admin");
  const sp = await searchParams;
  const [pending, bookings, placements] = await Promise.all([
    db.adBooking.findMany({ where: { status: "PENDING_REVIEW" }, include: { placement: true, user: { select: { email: true } } }, orderBy: { createdAt: "asc" } }),
    db.adBooking.findMany({ where: { status: { not: "PENDING_REVIEW" } }, include: { placement: true, user: { select: { email: true } } }, orderBy: { startsAt: "desc" }, take: 50 }),
    db.adPlacement.findMany({ orderBy: { priority: "desc" }, include: { _count: { select: { bookings: { where: { status: "ACTIVE" } } } } } }),
  ]);
  return (
    <div>
      <PageHeader title="Werbung & Platzierungen" description="Werbebuchungen prüfen und Werbeflächen konfigurieren (Position, Laufzeitpreise, Priorität, Kapazität). Premium-Produktpreise findest du unter „Premium & Token-Pakete“." />
      <AdminFlash sp={sp} />
      <h2 className="mb-3 font-display text-2xl text-white">Buchungen in Prüfung</h2>
      {pending.length === 0 ? <p className="mb-8 text-sm text-muted">Keine offenen Buchungen.</p> : (
        <div className="mb-10 grid gap-4 lg:grid-cols-2">
          {pending.map((b) => (
            <div key={b.id} className="overflow-hidden rounded-xl border border-border bg-surface text-sm">
              {b.imageKey ? <div className="relative aspect-[16/5] bg-surface-2"><Image src={mediaUrl(b.imageKey)!} alt="" fill className="object-cover" unoptimized /></div> : null}
              <div className="p-4">
                <p className="font-medium text-white">{b.title}</p>
                <p className="text-xs text-muted">{b.subtitle}</p>
                <p className="mt-2 text-xs text-subtle">{b.user.email} · {b.placement.name} · {formatDate(b.startsAt)} – {formatDate(b.endsAt)} · {b.tokenCost} Token · Ziel: {b.targetUrl ?? "verknüpfte Sedcard"}</p>
                <form action={reviewAdBookingAction} className="mt-3 flex flex-wrap gap-2">
                  <HiddenBack path="/admin/werbung" />
                  <input type="hidden" name="bookingId" value={b.id} />
                  <input name="reason" placeholder="Ablehnungsgrund" className={`${inputCls} min-w-48 flex-1`} />
                  <Button size="sm" name="decision" value="approve">Freigeben</Button>
                  <Button size="sm" variant="destructive" name="decision" value="reject">Ablehnen & erstatten</Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
      {can(user.role, "admin.ads") ? (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-2xl text-white">Werbeflächen</h2>
          <div className="space-y-2">
            {placements.map((p) => <div key={p.id}><p className="mb-1 text-xs text-subtle">{p.name} – aktuell {p._count.bookings} aktive Buchung(en)</p><PlacementForm p={p} /></div>)}
            <p className="pt-4 text-xs uppercase tracking-wider text-gold">Neue Werbefläche</p>
            <PlacementForm />
          </div>
        </section>
      ) : null}
      <h2 className="mb-3 font-display text-2xl text-white">Alle Buchungen</h2>
      <Table>
        <THead><tr><TH>Titel</TH><TH>Kunde</TH><TH>Fläche</TH><TH>Zeitraum</TH><TH>Status</TH><TH className="text-right">Impr./Klicks</TH></tr></THead>
        <TBody>
          {bookings.map((b) => (
            <TR key={b.id}>
              <TD className="text-white">{b.title}</TD><TD className="text-xs">{b.user.email}</TD><TD>{b.placement.name}</TD>
              <TD>{formatDate(b.startsAt)} – {formatDate(b.endsAt)}</TD>
              <TD><Badge variant={b.status === "ACTIVE" ? "success" : b.status === "REJECTED" ? "danger" : "default"}>{AD_STATUS[b.status]}</Badge></TD>
              <TD className="text-right">{formatNumber(b.impressions)} / {formatNumber(b.clicks)}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
