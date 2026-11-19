import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { ListingForm } from "@/components/marketplace/listing-form";

export const metadata = { title: "Neues Inserat" };

export default async function NewListingPage() {
  await requirePermission("marketplace.post");
  const categories = await db.marketplaceCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <PageHeader title="Neues Marktplatz-Inserat" />
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-8"><ListingForm categories={categories} /></div>
    </div>
  );
}
