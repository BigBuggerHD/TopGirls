import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, MapPin } from "lucide-react";
import { mediaUrl } from "@/lib/media";
import type { ProfileCardData } from "@/lib/queries/profiles";
import { meetingTypes } from "@/lib/meeting";
import { MeetingIcons } from "./meeting-icons";

/**
 * variant "banner": nur Name, Alter, Ort und Prüfstatus (für das Laufband auf der Startseite).
 */
export function ProfileCard({ p, sponsored = false, priority = false, variant = "default", tabIndex }: { p: ProfileCardData; sponsored?: boolean; priority?: boolean; variant?: "default" | "banner"; tabIndex?: number }) {
  const banner = variant === "banner";
  const img = mediaUrl(p.images[0]?.thumbKey);
  return (
    <Link
      href={`/profil/${p.slug}`}
      tabIndex={tabIndex}
      className="group relative block overflow-hidden rounded-xl border border-border bg-surface transition-colors duration-300 hover:border-border-strong"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-2">
        {img ? (
          <Image src={img} alt={`Profilbild von ${p.stageName}`} fill sizes="(min-width:1536px) 25vw, (min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" priority={priority} unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-5xl text-gold/40">{p.stageName.slice(0, 1)}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <MeetingIcons {...meetingTypes(p)} className="absolute right-3 top-3" />
        {sponsored ? <span className="absolute left-2.5 top-2.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted ring-1 ring-white/10">Gesponsert</span> : null}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <p className="flex items-center gap-1.5 font-display text-2xl text-white sm:text-3xl">
            <span>{p.stageName}{p.age ? <span className="text-lg text-white/70 sm:text-xl">, {p.age}{p.profileType === "DUO" && p.age2 ? ` & ${p.age2}` : ""}</span> : null}</span>
            {!banner && p.verified ? <BadgeCheck className="size-4 text-gold" aria-label="Echtheit geprüft" /> : null}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-white/75"><MapPin className="size-3.5" /> {p.city}{banner ? "" : ` · ${p.category.name}`}</p>
          {banner ? (
            p.verified ? (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-gold"><BadgeCheck className="size-4" /> Echtheit geprüft</p>
            ) : (
              <p className="mt-2 text-sm text-white/50">Echtheit nicht geprüft</p>
            )
          ) : p.headline ? <p className="mt-1 line-clamp-1 text-sm text-white/60">{p.headline}</p> : null}
        </div>
      </div>
    </Link>
  );
}

export function ProfileGrid({ items, sponsored = [] }: { items: ProfileCardData[]; sponsored?: ProfileCardData[] }) {
  const sponsoredIds = new Set(sponsored.map((s) => s.id));
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4">
      {sponsored.map((p, i) => <ProfileCard key={`s-${p.id}`} p={p} sponsored priority={i < 2} />)}
      {items.filter((p) => !sponsoredIds.has(p.id)).map((p, i) => <ProfileCard key={p.id} p={p} priority={i < 4 && sponsored.length === 0} />)}
    </div>
  );
}
