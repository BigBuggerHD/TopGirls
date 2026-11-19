import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { AdminFlash } from "@/components/admin/ui";
import { ImageReviewCard } from "@/components/admin/image-review";

export default async function AdminImages({ searchParams }: { searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  await requirePermission("moderation.images", "/admin");
  const sp = await searchParams;
  const images = await db.profileImage.findMany({
    where: { status: "PENDING", profile: { status: { in: ["PUBLISHED", "PENDING_REVIEW", "PAUSED"] } } },
    include: { profile: { select: { id: true, stageName: true } } },
    orderBy: { createdAt: "asc" },
    take: 60,
  });
  return (
    <div>
      <PageHeader title="Bildprüfung" description="Neue Bilder werden erst nach Freigabe öffentlich angezeigt. „Sperren“ setzt den Bild-Hash auf die Sperrliste (z. B. bei nicht einvernehmlich veröffentlichten Bildern) – er kann dann nicht erneut hochgeladen werden." />
      <AdminFlash sp={sp} />
      {images.length === 0 ? <EmptyState title="Keine Bilder in Prüfung" /> : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {images.map((img) => (
            <div key={img.id}>
              <Link href={`/admin/sedcards/${img.profile.id}`} className="mb-1 block truncate text-xs text-gold hover:underline">{img.profile.stageName}</Link>
              <ImageReviewCard img={img} back="/admin/bilder" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
