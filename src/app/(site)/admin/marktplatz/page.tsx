import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDateTime, formatEuro } from "@/lib/format";
import { LISTING_STATUS } from "@/lib/labels";
import { moderateListingAction } from "@/actions/admin";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminFlash, HiddenBack, inputCls } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export default async function AdminMarketplace({ searchParams }: { searchParams: Promise<{ ansicht?: string; ok?: string; fehler?: string }> }) {
  await requirePermission("moderation.marketplace", "/admin");
  const sp = await searchParams;
  const pendingView = sp.ansicht !== "alle";
  const listings = await db.marketplaceListing.findMany({
    where: pendingView ? { status: "PENDING_REVIEW" } : {},
    include: { category: true, owner: { select: { email: true } } }, orderBy: { updatedAt: pendingView ? "asc" : "desc" }, take: 100,
  });
  const self = `/admin/marktplatz?ansicht=${pendingView ? "pruefung" : "alle"}`;
  return (
    <div>
      <PageHeader title="Marktplatz-Moderation" description="Inserate prüfen, freigeben, ablehnen oder entfernen. Kategorien verwaltest du unter „Kategorien“." />
      <AdminFlash sp={sp} />
      <div className="mb-4 flex gap-1">
        <Link href="?ansicht=pruefung" className={cn("rounded-full px-3 py-1.5 text-xs", pendingView ? "bg-gold/15 text-gold" : "text-muted")}>In Prüfung</Link>
        <Link href="?ansicht=alle" className={cn("rounded-full px-3 py-1.5 text-xs", !pendingView ? "bg-gold/15 text-gold" : "text-muted")}>Alle</Link>
      </div>
      {listings.length === 0 ? <EmptyState title="Keine Inserate" /> : (
        <div className="space-y-4">
          {listings.map((l) => (
            <div key={l.id} className="rounded-xl border border-border bg-surface p-5 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gold">{l.category.name} · {l.city}</p>
                  <p className="font-display text-xl text-white">{l.title}</p>
                  <p className="text-xs text-subtle">{l.owner.email} · {formatDateTime(l.updatedAt)} · {l.priceCents != null ? `${formatEuro(l.priceCents)} ${l.priceUnit ?? ""}` : "ohne Preis"}</p>
                </div>
                <Badge variant={l.status === "PUBLISHED" ? "success" : l.status === "PENDING_REVIEW" ? "warning" : "danger"}>{LISTING_STATUS[l.status]}</Badge>
              </div>
              <p className="mt-3 line-clamp-4 whitespace-pre-line text-foreground/80">{l.description}</p>
              {l.moderationNote ? <p className="mt-2 text-xs text-warning">{l.moderationNote}</p> : null}
              <form action={moderateListingAction} className="mt-4 flex flex-wrap items-center gap-2">
                <HiddenBack path={self} />
                <input type="hidden" name="listingId" value={l.id} />
                <input name="note" placeholder="Begründung" className={`${inputCls} min-w-60 flex-1`} />
                {l.status !== "PUBLISHED" ? <Button size="sm" name="decision" value="approve">Freigeben</Button> : null}
                {l.status === "PENDING_REVIEW" ? <Button size="sm" variant="secondary" name="decision" value="reject">Ablehnen</Button> : null}
                {l.status !== "REMOVED" ? <Button size="sm" variant="destructive" name="decision" value="remove">Entfernen</Button> : null}
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
