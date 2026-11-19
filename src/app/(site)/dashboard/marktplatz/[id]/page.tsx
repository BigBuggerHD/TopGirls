import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { ListingForm } from "@/components/marketplace/listing-form";

export const metadata = { title: "Inserat bearbeiten" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("marketplace.post");
  const { id } = await params;
  const listing = await db.marketplaceListing.findFirst({ where: { id, ownerId: user.id } });
  if (!listing || listing.status === "REMOVED") notFound();
  const categories = await db.marketplaceCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <PageHeader title="Inserat bearbeiten" description="Änderungen werden erneut geprüft." />
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-8"><ListingForm listing={listing} categories={categories} /></div>
    </div>
  );
}
