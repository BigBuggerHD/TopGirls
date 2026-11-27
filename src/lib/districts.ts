/** Bezirke je Stadt für die Auswahlliste im Sedcard-Assistenten (andere Städte: Freitext). */
export const CITY_DISTRICTS: Record<string, string[]> = {
  berlin: [
    "Charlottenburg-Wilmersdorf", "Friedrichshain-Kreuzberg", "Lichtenberg", "Marzahn-Hellersdorf", "Mitte", "Neukölln",
    "Pankow", "Reinickendorf", "Spandau", "Steglitz-Zehlendorf", "Tempelhof-Schöneberg", "Treptow-Köpenick",
  ],
};

export function districtsForCity(city: string): string[] | null {
  return CITY_DISTRICTS[city.trim().toLowerCase()] ?? null;
}

/** Öffentliche Ortsangabe: volle Adresse nur bei „Adresse anzeigen“, sonst Bezirk + Stadt. */
export function publicLocation(p: { city: string; district: string | null; street: string | null; houseNumber: string | null; postalCode: string | null; showAddress: boolean }): string {
  const area = [p.district, p.city].filter(Boolean).join(", ");
  if (!p.showAddress || !p.street) return area;
  const streetLine = [p.street, p.houseNumber].filter(Boolean).join(" ");
  const cityLine = [p.postalCode, p.city].filter(Boolean).join(" ");
  return [streetLine, cityLine, p.district].filter(Boolean).join(", ");
}
