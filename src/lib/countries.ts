/** ISO-3166-1 Alpha-2-Ländercodes für den Länderfilter. Häufige Länder stehen in der Auswahl oben. */
export const POPULAR_COUNTRIES = ["DE", "AT", "CH", "NL", "BE", "LU", "FR", "DK", "PL", "CZ", "IT", "ES", "GB", "US"];

export const COUNTRY_CODES = (
  "AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ " +
  "DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HK HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MO MR MT MU MV MW MX MY MZ NA NE NG NI NL " +
  "NO NP NR NZ OM PA PE PG PH PK PL PS PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN " +
  "TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VN VU WS XK YE ZA ZM ZW"
).split(" ");

export const isCountryCode = (c: string) => COUNTRY_CODES.includes(c);

/** Länder mit deutschen Namen, häufige zuerst, danach alphabetisch (serverseitig erzeugt, damit Server und Browser gleich anzeigen). */
export function countryOptions(): { code: string; name: string; popular: boolean }[] {
  const names = new Intl.DisplayNames(["de"], { type: "region" });
  const name = (c: string) => (c === "XK" ? "Kosovo" : names.of(c) ?? c);
  const popular = POPULAR_COUNTRIES.map((code) => ({ code, name: name(code), popular: true }));
  const rest = COUNTRY_CODES.filter((c) => !POPULAR_COUNTRIES.includes(c))
    .map((code) => ({ code, name: name(code), popular: false }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  return [...popular, ...rest];
}
