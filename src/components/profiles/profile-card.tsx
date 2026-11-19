import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Crown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { mediaUrl } from "@/lib/media";
import type { ProfileCardData } from "@/lib/queries/profiles";

export function ProfileCard({ p, sponsored = false, priority = false }: { p: ProfileCardData; sponsored?: boolean; priority?: boolean }) {
  const now = Date.now();
  const premium = p.premiumUntil && p.premiumUntil.getTime() > now;
  const highlight = p.highlightUntil && p.highlightUntil.getTime() > now;
  const img = mediaUrl(p.images[0]?.thumbKey);
  return (
    <Link
      href={`/profil/${p.slug}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border bg-surface transition-all duration-300 hover:-translate-y-0.5",
        highlight || premium ? "border-gold/60 shadow-[0_0_0_1px_rgba(198,167,107,0.25),0_10px_40px_-12px_rgba(198,167,107,0.35)]" : "border-border hover:border-border-strong",
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-2">
        {img ? (
          <Image src={img} alt={`Profilbild von ${p.stageName}`} fill sizes="(min-width:1280px) 20vw, (min-width:768px) 30vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" priority={priority} unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-5xl text-gold/40">{p.stageName.slice(0, 1)}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
          {sponsored ? <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted ring-1 ring-white/10">Gesponsert</span> : null}
          {premium ? <span className="inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background"><Crown className="size-3" /> Premium</span> : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <p className="flex items-center gap-1.5 font-display text-xl text-white">
            {p.stageName}
            {p.age ? <span className="text-base text-white/70">, {p.age}</span> : null}
            {p.verified ? <BadgeCheck className="size-4 text-gold" aria-label="Verifiziert" /> : null}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-white/70"><MapPin className="size-3" /> {p.city} · {p.category.name}</p>
          {p.headline ? <p className="mt-1 line-clamp-1 text-xs text-white/60">{p.headline}</p> : null}
        </div>
      </div>
    </Link>
  );
}

export function ProfileGrid({ items, sponsored = [] }: { items: ProfileCardData[]; sponsored?: ProfileCardData[] }) {
  const sponsoredIds = new Set(sponsored.map((s) => s.id));
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {sponsored.map((p, i) => <ProfileCard key={`s-${p.id}`} p={p} sponsored priority={i < 2} />)}
      {items.filter((p) => !sponsoredIds.has(p.id)).map((p, i) => <ProfileCard key={p.id} p={p} priority={i < 4 && sponsored.length === 0} />)}
    </div>
  );
}
