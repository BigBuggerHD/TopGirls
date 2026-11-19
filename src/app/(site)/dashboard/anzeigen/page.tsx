import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Crown, Clock, Sparkles, Search } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { PROFILE_STATUS, PROMOTION_TYPE } from "@/lib/labels";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PromotionForm } from "@/components/billing/forms";

export const metadata = { title: "Anzeigenverwaltung" };

const ICONS = { PREMIUM: Crown, HIGHLIGHT: Sparkles, SPONSORED_SEARCH: Search, EXTENSION: Clock };

export default async function AdsManagementPage() {
  const user = await requirePermission("promotion.book");
  const [profiles, products, promotions] = await Promise.all([
    db.profile.findMany({ where: { ownerId: user.id }, orderBy: { updatedAt: "desc" } }),
    db.premiumProduct.findMany({ where: { active: true }, orderBy: { priority: "desc" } }),
    db.promotion.findMany({ where: { userId: user.id }, include: { profile: { select: { stageName: true } } }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  const now = new Date();

  return (
    <div>
      <PageHeader title="Anzeigenverwaltung" description="Steigere die Sichtbarkeit deiner Sedcards mit Premium-Platzierungen, Hervorhebungen und gesponserten Suchergebnissen. Laufzeiten werden bei erneuter Buchung verlängert." actions={<Button asChild variant="outline"><Link href="/dashboard/tokens">Guthaben: {formatNumber(user.tokenBalance)} Token</Link></Button>} />

      <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {products.map((p) => {
          const Icon = ICONS[p.type];
          return (
            <div key={p.id} className="rounded-xl border border-border bg-surface p-5">
              <Icon className="size-5 text-gold" />
              <p className="mt-3 font-medium text-white">{p.name}</p>
              <p className="mt-1 text-xs text-muted">{p.description}</p>
              <p className="mt-3 text-sm text-gold">{p.tokenCost} Token / {p.durationDays} Tage</p>
            </div>
          );
        })}
      </div>

      {profiles.length === 0 ? (
        <EmptyState title="Keine Sedcards" text="Erstelle zuerst eine Sedcard, um Promotions zu buchen." action={<Button asChild><Link href="/dashboard/sedcards">Zu den Sedcards</Link></Button>} />
      ) : (
        <div className="space-y-4">
          {profiles.map((p) => {
            const active = (d: Date | null) => (d && d > now ? `bis ${formatDate(d)}` : null);
            return (
              <div key={p.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl text-white">{p.stageName}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <Badge variant={p.status === "PUBLISHED" ? "success" : "default"}>{PROFILE_STATUS[p.status]}</Badge>
                      {active(p.premiumUntil) ? <Badge variant="gold">Premium {active(p.premiumUntil)}</Badge> : null}
                      {active(p.highlightUntil) ? <Badge variant="rose">Hervorgehoben {active(p.highlightUntil)}</Badge> : null}
                      {active(p.sponsoredUntil) ? <Badge variant="violet">Gesponsert {active(p.sponsoredUntil)}</Badge> : null}
                      {p.expiresAt ? <Badge>Laufzeit bis {formatDate(p.expiresAt)}</Badge> : null}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {products.map((prod) => (
                    <PromotionForm
                      key={prod.id}
                      profileId={p.id}
                      type={prod.type}
                      cost={prod.tokenCost}
                      label={prod.name}
                      requestId={randomUUID()}
                      disabled={prod.type === "EXTENSION" ? !["PUBLISHED", "EXPIRED", "PAUSED"].includes(p.status) : p.status !== "PUBLISHED"}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {promotions.length ? (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-2xl text-white">Gebuchte Promotions</h2>
          <Table>
            <THead><tr><TH>Gebucht am</TH><TH>Sedcard</TH><TH>Produkt</TH><TH>Zeitraum</TH><TH className="text-right">Token</TH></tr></THead>
            <TBody>
              {promotions.map((pr) => (
                <TR key={pr.id}>
                  <TD>{formatDateTime(pr.createdAt)}</TD>
                  <TD>{pr.profile.stageName}</TD>
                  <TD>{PROMOTION_TYPE[pr.type]}</TD>
                  <TD>{formatDate(pr.startsAt)} – {formatDate(pr.endsAt)}</TD>
                  <TD className="text-right">{pr.tokenCost}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </section>
      ) : null}
    </div>
  );
}
