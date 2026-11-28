/**
 * Größere Städte in Deutschland mit ungefähren Koordinaten (öffentliche Geodaten, gerundet).
 * Dient nur dazu, den Standort einer Echtheits-Aufnahme grob einer Stadt zuzuordnen –
 * Koordinaten selbst werden nicht gespeichert.
 */
export const CITIES_DE: [name: string, lat: number, lon: number][] = [
  ["Berlin", 52.52, 13.405], ["Hamburg", 53.551, 9.994], ["München", 48.137, 11.575], ["Köln", 50.938, 6.96],
  ["Frankfurt am Main", 50.111, 8.682], ["Stuttgart", 48.776, 9.183], ["Düsseldorf", 51.227, 6.774], ["Leipzig", 51.34, 12.375],
  ["Dortmund", 51.514, 7.466], ["Essen", 51.456, 7.012], ["Bremen", 53.079, 8.802], ["Dresden", 51.05, 13.738],
  ["Hannover", 52.376, 9.732], ["Nürnberg", 49.452, 11.077], ["Duisburg", 51.435, 6.762], ["Bochum", 51.482, 7.216],
  ["Wuppertal", 51.256, 7.15], ["Bielefeld", 52.03, 8.532], ["Bonn", 50.737, 7.098], ["Münster", 51.961, 7.626],
  ["Mannheim", 49.487, 8.466], ["Karlsruhe", 49.007, 8.404], ["Augsburg", 48.371, 10.898], ["Wiesbaden", 50.078, 8.24],
  ["Mönchengladbach", 51.18, 6.443], ["Gelsenkirchen", 51.518, 7.086], ["Aachen", 50.776, 6.084], ["Braunschweig", 52.269, 10.521],
  ["Kiel", 54.323, 10.123], ["Chemnitz", 50.828, 12.921], ["Halle (Saale)", 51.482, 11.97], ["Magdeburg", 52.12, 11.628],
  ["Freiburg im Breisgau", 47.999, 7.842], ["Krefeld", 51.339, 6.586], ["Mainz", 49.993, 8.247], ["Lübeck", 53.866, 10.686],
  ["Erfurt", 50.979, 11.033], ["Rostock", 54.092, 12.1], ["Kassel", 51.312, 9.48], ["Saarbrücken", 49.234, 6.997],
  ["Potsdam", 52.391, 13.064], ["Würzburg", 49.791, 9.953], ["Regensburg", 49.013, 12.102], ["Ingolstadt", 48.766, 11.425],
  ["Heidelberg", 49.399, 8.672], ["Darmstadt", 49.872, 8.651], ["Osnabrück", 52.279, 8.047], ["Oldenburg", 53.143, 8.214],
  ["Ulm", 48.401, 9.987], ["Göttingen", 51.541, 9.916], ["Trier", 49.75, 6.637], ["Schwerin", 53.635, 11.401],
];

/** Nächstgelegene Stadt und gerundete Entfernung in km (Haversine). */
export function nearestCity(lat: number, lon: number): { city: string; km: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const rad = (d: number) => (d * Math.PI) / 180;
  let best: { city: string; km: number } | null = null;
  for (const [city, la, lo] of CITIES_DE) {
    const dLat = rad(la - lat);
    const dLon = rad(lo - lon);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(la)) * Math.sin(dLon / 2) ** 2;
    const km = 2 * 6371 * Math.asin(Math.sqrt(a));
    if (!best || km < best.km) best = { city, km };
  }
  return best ? { city: best.city, km: Math.round(best.km) } : null;
}
