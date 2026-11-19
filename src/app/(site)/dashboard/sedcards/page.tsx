import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import { mediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/format";
import { PROFILE_STATUS } from "@/lib/labels";
import { createProfileAction } from "@/actions/profiles";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/form";

export const metadata = { title: "Sedcards" };

export default async function SedcardsPage({ searchParams }: { searchParams: Promise<{ limit?: string; geloescht?: string }> }) {
  const user = await requirePermission("profile.own");
  const sp = await searchParams;
  const settings = await getSettings();
  const profiles = await db.profile.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { category: true, images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }], take: 1 }, _count: { select: { images: true } } },
  });
  const max = can(user.role, "profile.multiple") ? settings.maxProfilesPerBusiness : settings.maxProfilesPerProvider;

  const newButton = profiles.length < max ? (
    <form action={createProfileAction}><SubmitButton pendingText="Wird angelegt …"><Plus /> Neue Sedcard</SubmitButton></form>
  ) : null;

  return (
    <div>
      <PageHeader title={can(user.role, "profile.multiple") ? "Sedcards verwalten" : "Meine Sedcard"} description={`Du nutzt ${profiles.length} von ${max} möglichen Sedcards.`} actions={newButton} />
      {sp.limit ? <Alert variant="warning" className="mb-6">Du hast die maximale Anzahl an Sedcards für deine Kontoart erreicht.</Alert> : null}
      {sp.geloescht ? <Alert variant="success" className="mb-6">Die Sedcard wurde gelöscht.</Alert> : null}
      {profiles.length === 0 ? (
        <EmptyState title="Noch keine Sedcard" text="Erstelle deine erste Sedcard in wenigen Schritten. Sie wird vor der Veröffentlichung von unserem Team geprüft." action={newButton} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {profiles.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="relative aspect-[4/3] bg-surface-2">
                {p.images[0] ? <Image src={mediaUrl(p.images[0].thumbKey)!} alt="" fill className="object-cover" unoptimized /> : <div className="flex h-full items-center justify-center font-display text-5xl text-gold/30">{p.stageName.slice(0, 1)}</div>}
                <Badge className="absolute left-3 top-3" variant={p.status === "PUBLISHED" ? "success" : p.status === "PENDING_REVIEW" ? "warning" : p.status === "REJECTED" || p.status === "BLOCKED" ? "danger" : "default"}>{PROFILE_STATUS[p.status]}</Badge>
              </div>
              <div className="p-4">
                <p className="font-display text-xl text-white">{p.stageName}</p>
                <p className="text-xs text-muted">{p.category.name}{p.city ? ` · ${p.city}` : ""} · {p._count.images} Bilder</p>
                {p.expiresAt && p.status === "PUBLISHED" ? <p className="mt-1 text-xs text-subtle">Online bis {formatDate(p.expiresAt)}</p> : null}
                {p.rejectionReason && (p.status === "REJECTED" || p.status === "PENDING_REVIEW") ? <p className="mt-2 text-xs text-danger">{p.rejectionReason}</p> : null}
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" className="flex-1"><Link href={`/dashboard/sedcards/${p.id}`}>Bearbeiten</Link></Button>
                  {p.status === "PUBLISHED" ? <Button asChild size="sm" variant="outline"><Link href={`/profil/${p.slug}`}>Ansehen</Link></Button> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
