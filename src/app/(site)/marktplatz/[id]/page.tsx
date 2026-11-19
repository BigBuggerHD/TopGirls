import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { formatDate, formatEuro } from "@/lib/format";
import { ReportDialog } from "@/components/report/report-dialog";
import { Button } from "@/components/ui/button";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await db.marketplaceListing.findFirst({ where: { id, status: "PUBLISHED", owner: { status: "ACTIVE" } }, include: { category: true, owner: { select: { companyName: true, displayName: true } } } });
  if (!l) notFound();
  const user = await getCurrentUser();
  return (
    <div className="container-page max-w-4xl py-10">
      <Link href={`/marktplatz?kategorie=${l.category.slug}`} className="text-xs text-subtle hover:text-gold">← {l.category.name}</Link>
      <h1 className="mt-3 font-display text-4xl text-white">{l.title}</h1>
      <p className="mt-2 flex flex-wrap gap-4 text-sm text-muted"><span className="flex items-center gap-1"><MapPin className="size-4 text-gold" /> {l.city}</span><span>Inserent: {l.owner.companyName ?? l.owner.displayName}</span><span>Online seit {formatDate(l.publishedAt)}</span></p>
      {l.priceCents != null ? <p className="mt-4 text-2xl text-gold">{formatEuro(l.priceCents)} <span className="text-sm text-muted">{l.priceUnit}</span></p> : null}
      <div className="gold-hairline my-8" />
      <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{l.description}</div>
      <div className="mt-8 flex flex-wrap gap-3">
        {l.contactEmail ? <Button asChild><a href={`mailto:${l.contactEmail}`}><Mail /> E-Mail senden</a></Button> : null}
        {l.contactPhone ? <Button asChild variant="outline"><a href={`tel:${l.contactPhone.replace(/[^\d+]/g, "")}`}><Phone /> {l.contactPhone}</a></Button> : null}
      </div>
      <div className="mt-10 flex justify-between border-t border-border pt-4 text-xs text-subtle">
        <span>Gültig bis {formatDate(l.expiresAt)}</span>
        <ReportDialog targetType="LISTING" targetId={l.id} loggedIn={!!user} />
      </div>
    </div>
  );
}
