/**
 * Lädt die kostenlose Länder-Datenbank „DB-IP Lite“ (Lizenz: CC BY 4.0, https://db-ip.com)
 * nach data/geoip/dbip-country-lite.mmdb. Einmal ausführen und danach etwa monatlich:
 *   npm run geoip:update
 */
import { mkdir, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const target = path.join(process.cwd(), "data", "geoip", "dbip-country-lite.mmdb");
const month = (offset) => {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - offset);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

for (const offset of [0, 1]) {
  const url = `https://download.db-ip.com/free/dbip-country-lite-${month(offset)}.mmdb.gz`;
  process.stdout.write(`Lade ${url} … `);
  const res = await fetch(url).catch((e) => ({ ok: false, status: e.message }));
  if (!res.ok) { console.log(`nicht verfügbar (${res.status})`); continue; }
  const data = gunzipSync(Buffer.from(await res.arrayBuffer()));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  console.log(`fertig (${(data.length / 1024 / 1024).toFixed(1)} MB) → ${path.relative(process.cwd(), target)}`);
  console.log("Hinweis: Server neu starten, damit die Datenbank geladen wird.");
  process.exit(0);
}
console.error("Die Länder-Datenbank konnte nicht geladen werden. Bitte später erneut versuchen.");
process.exit(1);
