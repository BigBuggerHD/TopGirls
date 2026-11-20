import Link from "next/link";
import { MapPin } from "lucide-react";

/**
 * Langsam durchlaufendes Banner (Platzhalter-Inhalt: Städte).
 * Inhalt wird zweimal gerendert, damit die Endlos-Animation nahtlos ist.
 * Bei „Bewegung reduzieren“ (Betriebssystem-Einstellung) steht das Banner still.
 */
const CITIES = ["Berlin", "Hamburg", "München", "Köln", "Frankfurt am Main", "Düsseldorf", "Stuttgart", "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden", "Hannover", "Nürnberg"];

export function MarqueeBanner() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {CITIES.map((c) => (
        <li key={c} className="flex items-center">
          <Link href={`/suche?stadt=${encodeURIComponent(c)}`} tabIndex={hidden ? -1 : undefined} className="flex items-center gap-2 px-6 font-display text-xl text-foreground/85 transition-colors hover:text-gold sm:text-2xl">
            <MapPin className="size-4 text-gold" /> {c}
          </Link>
          <span className="text-gold/50" aria-hidden>·</span>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Städte" className="group relative overflow-hidden rounded-xl border border-border bg-surface py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-surface to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-surface to-transparent" />
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        {row(false)}
        {row(true)}
      </div>
    </section>
  );
}
