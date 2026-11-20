import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { mediaUrl } from "@/lib/media";
import type { ProfileCardData } from "@/lib/queries/profiles";

/**
 * Laufband mit den Top-Sedcards (meiste Profilaufrufe).
 * Inhalt wird zweimal gerendert, damit die Endlos-Animation nahtlos ist.
 * Bei „Bewegung reduzieren“ (Betriebssystem-Einstellung) steht das Band still und ist horizontal scrollbar.
 */
export function MarqueeBanner({ profiles }: { profiles: ProfileCardData[] }) {
  if (profiles.length === 0) return null;
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 gap-3 pr-3" aria-hidden={hidden || undefined}>
      {profiles.map((p, i) => {
        const img = mediaUrl(p.images[0]?.thumbKey);
        return (
          <li key={p.id}>
            <Link
              href={`/profil/${p.slug}`}
              tabIndex={hidden ? -1 : undefined}
              className="group/item flex w-64 items-center gap-3 rounded-lg border border-border bg-background-alt p-2 pr-4 transition-colors hover:border-border-strong"
            >
              <span className="relative block h-20 w-16 shrink-0 overflow-hidden rounded-md bg-surface-2">
                {img ? <Image src={img} alt="" fill sizes="64px" className="object-cover" unoptimized /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold tracking-wider text-gold">Top {i + 1}</span>
                <span className="block truncate font-display text-xl text-white">{p.stageName}{p.age ? <span className="text-base text-white/60">, {p.age}</span> : null}</span>
                <span className="flex items-center gap-1 truncate text-xs text-muted"><MapPin className="size-3 shrink-0" /> {p.city}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
  return (
    <section aria-label="Top 10 Sedcards" className="group relative overflow-hidden rounded-xl border border-border bg-surface py-3 motion-reduce:overflow-x-auto">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-surface to-transparent motion-reduce:hidden" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-surface to-transparent motion-reduce:hidden" />
      <div className="flex w-max animate-marquee pl-3 group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
        {row(false)}
        <div className="flex motion-reduce:hidden">{row(true)}</div>
      </div>
    </section>
  );
}
