import { ProfileCard } from "@/components/profiles/profile-card";
import type { ProfileCardData } from "@/lib/queries/profiles";

/**
 * Laufband mit den Top-Sedcards (meiste Profilaufrufe).
 * Die Karten sind exakt so breit wie die Sedcards im Raster darunter: Die Breite wird über
 * Container-Query-Einheiten (cqw) aus der Bandbreite und der Spaltenzahl des Rasters berechnet
 * (1 / 2 / 3 / 4 Spalten, Abstände 1rem bzw. 1,25rem – identisch zum Raster).
 * Der Inhalt wird zweimal gerendert, damit die Endlos-Animation nahtlos ist.
 * Links und rechts blendet eine Maske die Karten weich aus, damit sie nicht abrupt abgeschnitten wirken.
 * Bei „Bewegung reduzieren“ steht das Band still und ist horizontal scrollbar.
 */
const ITEM =
  "w-[100cqw] shrink-0 sm:w-[calc((100cqw-1.25rem)/2)] lg:w-[calc((100cqw-2.5rem)/3)] 2xl:w-[calc((100cqw-3.75rem)/4)]";

export function MarqueeBanner({ profiles }: { profiles: ProfileCardData[] }) {
  if (profiles.length === 0) return null;
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 gap-4 pr-4 sm:gap-5 sm:pr-5" aria-hidden={hidden || undefined}>
      {profiles.map((p) => (
        <li key={p.id} className={ITEM}>
          <ProfileCard p={p} variant="banner" tabIndex={hidden ? -1 : undefined} />
        </li>
      ))}
    </ul>
  );
  return (
    <section
      aria-label="Top 10 Sedcards"
      className="group @container overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_7%,black_93%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]"
    >
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
        {row(false)}
        <div className="flex motion-reduce:hidden">{row(true)}</div>
      </div>
    </section>
  );
}
