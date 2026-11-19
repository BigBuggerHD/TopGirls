import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { formatDate, formatEuro } from "@/lib/format";
import { LISTING_STATUS } from "@/lib/labels";
import { deleteListingAction } from "@/actions/marketplace";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata = { title: "Meine Marktplatz-Inserate" };

export default async function MyListingsPage({ searchParams }: { searchParams: Promise<{ gespeichert?: string }> }) {
  const user = await requirePermission("marketplace.post");
  const sp = await searchParams;
  const listings = await db.marketplaceListing.findMany({ where: { ownerId: user.id }, include: { category: true }, orderBy: { updatedAt: "desc" } });
  const add = <Button asChild><Link href="/dashboard/marktplatz/neu"><Plus /> Neues Inserat</Link></Button>;
  return (
    <div>
      <PageHeader title="Marktplatz" description="Apartments, Stellenangebote und Geschäftsanzeigen für die Branche." actions={add} />
      {sp.gespeichert ? <Alert variant="success" className="mb-6">Dein Inserat wurde gespeichert und zur Prüfung eingereicht.</Alert> : null}
      {listings.length === 0 ? <EmptyState title="Noch keine Inserate" action={add} /> : (
        <Table>
          <THead><tr><TH>Titel</TH><TH>Kategorie</TH><TH>Preis</TH><TH>Status</TH><TH>Läuft bis</TH><TH /></tr></THead>
          <TBody>
            {listings.map((l) => (
              <TR key={l.id}>
                <TD className="font-medium text-white">{l.title}{l.status === "REJECTED" && l.moderationNote ? <p className="text-xs font-normal text-danger">{l.moderationNote}</p> : null}</TD>
                <TD>{l.category.name}</TD>
                <TD>{l.priceCents != null ? `${formatEuro(l.priceCents)} ${l.priceUnit ?? ""}` : "–"}</TD>
                <TD><Badge variant={l.status === "PUBLISHED" ? "success" : l.status === "PENDING_REVIEW" ? "warning" : l.status === "REJECTED" || l.status === "REMOVED" ? "danger" : "default"}>{LISTING_STATUS[l.status]}</Badge></TD>
                <TD>{formatDate(l.expiresAt)}</TD>
                <TD className="flex justify-end gap-2">
                  {l.status !== "REMOVED" ? <Button asChild size="sm" variant="outline"><Link href={`/dashboard/marktplatz/${l.id}`}>Bearbeiten</Link></Button> : null}
                  <form action={deleteListingAction}><input type="hidden" name="id" value={l.id} /><Button size="sm" variant="ghost" className="text-danger">Löschen</Button></form>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
