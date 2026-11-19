import Image from "next/image";
import type { AdLocation } from "@prisma/client";
import { db } from "@/lib/db";
import { getActiveAds } from "@/lib/queries/profiles";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

/** Rendert aktive Werbebuchungen einer Werbefläche und zählt Impressionen. */
export async function AdSlot({ location, className, take = 1, layout = "banner" }: { location: AdLocation; className?: string; take?: number; layout?: "banner" | "stack" }) {
  const ads = await getActiveAds(location, take);
  if (ads.length === 0) return null;
  await db.adBooking.updateMany({ where: { id: { in: ads.map((a) => a.id) } }, data: { impressions: { increment: 1 } } }).catch(() => {});
  return (
    <aside aria-label="Werbung" className={cn(layout === "stack" ? "flex flex-col gap-4" : "grid gap-4", layout === "banner" && ads.length > 1 && "md:grid-cols-2", className)}>
      {ads.map((ad) => {
        const img = mediaUrl(ad.imageKey);
        return (
          <a key={ad.id} href={`/api/ads/${ad.id}/click`} rel="sponsored nofollow" className="group relative block overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-br from-surface-2 to-background-alt">
            <div className={cn("relative", layout === "stack" ? "aspect-[4/5]" : "aspect-[16/5] min-h-36")}>
              {img ? <Image src={img} alt="" fill className="object-cover opacity-70 transition-opacity group-hover:opacity-90" unoptimized /> : null}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-8">
                <span className="mb-2 text-[10px] uppercase tracking-[0.3em] text-gold">Anzeige</span>
                <p className="font-display text-2xl text-white sm:text-3xl">{ad.title}</p>
                {ad.subtitle ? <p className="mt-1 max-w-md text-sm text-white/70">{ad.subtitle}</p> : null}
              </div>
            </div>
          </a>
        );
      })}
    </aside>
  );
}
