import berlin from "@/data/maps/berlin.json";
import { slugify } from "@/lib/utils";

type CityMapData = { city: string; width: number; height: number; attribution: string; districts: { name: string; path: string; label: [number, number] | number[] }[] };

/** Verfügbare Stadtkarten (Umriss + Bezirke). Weitere Städte: JSON in src/data/maps ablegen und hier eintragen. */
const MAPS: Record<string, CityMapData> = {
  berlin: berlin as CityMapData,
};

/** Vereinfachte Stadtkarte ohne Straßen: nur Stadtumriss und Bezirksgrenzen. */
export function CityMap({ city }: { city: string }) {
  const map = MAPS[slugify(city)];
  if (!map) {
    return (
      <div className="flex aspect-[16/7] items-center justify-center rounded-lg border border-dashed border-border-strong bg-background-alt text-sm text-subtle">
        Karte für {city || "diese Stadt"} folgt in Kürze.
      </div>
    );
  }
  return (
    <figure>
      <svg viewBox={`-10 -10 ${map.width + 20} ${map.height + 20}`} className="mx-auto max-h-[520px] w-full" role="img" aria-label={`Karte von ${map.city} mit Bezirken`}>
        {map.districts.map((d) => (
          <path key={d.name} d={d.path} className="fill-surface-2 stroke-gold/60 transition-colors hover:fill-gold/10" strokeWidth={1.5} strokeLinejoin="round">
            <title>{d.name}</title>
          </path>
        ))}
        {map.districts.map((d) => (
          <text key={`l-${d.name}`} x={d.label[0]} y={d.label[1]} textAnchor="middle" dominantBaseline="middle" className="pointer-events-none fill-muted text-[15px]">
            {d.name}
          </text>
        ))}
      </svg>
      <figcaption className="mt-2 text-right text-[11px] text-subtle">{map.attribution}</figcaption>
    </figure>
  );
}
