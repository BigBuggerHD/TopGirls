import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatNumber } from "@/lib/format";
import { AD_LOCATION, AD_STATUS } from "@/lib/labels";
import { cancelAdAction } from "@/actions/billing";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AdBookingForm } from "@/components/billing/forms";

export const metadata = { title: "Werbeplatzierungen" };

export default async function AdBookingsPage() {
  const user = await requirePermission("ads.book");
  const [placements, profiles, bookings] = await Promise.all([
    db.adPlacement.findMany({ where: { active: true }, orderBy: { priority: "desc" } }),
    db.profile.findMany({ where: { ownerId: user.id }, select: { id: true, stageName: true } }),
    db.adBooking.findMany({ where: { userId: user.id }, include: { placement: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div>
      <PageHeader title="Werbeplatzierungen" description="Buche Werbebanner auf Startseite, Suche, Sedcards und im Marktplatz. Jede Buchung wird vor dem Start geprüft. Stornierungen vor Laufzeitbeginn werden vollständig erstattet." />
      <section className="mb-10 rounded-xl border border-border bg-surface p-5 sm:p-8">
        <h2 className="mb-6 font-display text-2xl text-white">Neue Werbebuchung</h2>
        {placements.length ? <AdBookingForm placements={placements} profiles={profiles} requestId={randomUUID()} balance={user.tokenBalance} /> : <p className="text-sm text-muted">Derzeit sind keine Werbeflächen buchbar.</p>}
      </section>
      <h2 className="mb-4 font-display text-2xl text-white">Deine Buchungen</h2>
      {bookings.length === 0 ? <p className="text-sm text-muted">Noch keine Buchungen.</p> : (
        <Table>
          <THead><tr><TH>Titel</TH><TH>Werbefläche</TH><TH>Zeitraum</TH><TH>Status</TH><TH className="text-right">Impr. / Klicks</TH><TH className="text-right">Token</TH><TH /></tr></THead>
          <TBody>
            {bookings.map((b) => (
              <TR key={b.id}>
                <TD className="font-medium text-white">{b.title}{b.rejectReason ? <p className="text-xs font-normal text-danger">{b.rejectReason}</p> : null}</TD>
                <TD>{AD_LOCATION[b.placement.location]}</TD>
                <TD>{formatDate(b.startsAt)} – {formatDate(b.endsAt)}</TD>
                <TD><Badge variant={b.status === "ACTIVE" ? "success" : b.status === "PENDING_REVIEW" ? "warning" : b.status === "REJECTED" ? "danger" : "default"}>{AD_STATUS[b.status]}</Badge></TD>
                <TD className="text-right">{formatNumber(b.impressions)} / {formatNumber(b.clicks)}</TD>
                <TD className="text-right">{b.tokenCost}</TD>
                <TD>{["PENDING_REVIEW", "SCHEDULED"].includes(b.status) ? <form action={cancelAdAction}><input type="hidden" name="bookingId" value={b.id} /><Button size="sm" variant="ghost" className="text-danger">Stornieren</Button></form> : null}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
