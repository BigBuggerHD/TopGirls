/** Bereiche der dynamischen Filter: bestimmen, in welchem Schritt des Sedcard-Assistenten sie abgefragt werden. */
export const FILTER_SECTIONS = { eigenschaften: "Eigenschaften (Schritt 1)", service: "Service (Schritt 3)" } as const;
export type FilterSection = keyof typeof FILTER_SECTIONS;
export const isFilterSection = (s: string): s is FilterSection => s in FILTER_SECTIONS;
