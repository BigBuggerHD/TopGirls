import "server-only";
import path from "node:path";
import { existsSync } from "node:fs";
import { headers } from "next/headers";
import type { CountryResponse, Reader } from "maxmind";

/**
 * Land des Besuchers (ISO-3166 Alpha-2, z. B. "DE") für den Länderfilter der Sedcards.
 * Reihenfolge: Länder-Header des Hosters/CDN (Cloudflare, Vercel) → lokale DB-IP-Lite-Datenbank
 * (data/geoip/dbip-country-lite.mmdb, laden mit `npm run geoip:update`). Es gehen keine Anfragen an Dritte.
 * Zum lokalen Testen: Umgebungsvariable GEOIP_TEST_COUNTRY (z. B. "AT").
 * IP-Adressen werden dabei nicht gespeichert.
 */
export const GEOIP_FILE = path.join(process.cwd(), "data", "geoip", "dbip-country-lite.mmdb");

let readerPromise: Promise<Reader<CountryResponse> | null> | null = null;
function reader() {
  if (!readerPromise) {
    readerPromise = (async () => {
      if (!existsSync(GEOIP_FILE)) return null;
      try {
        const maxmind = await import("maxmind");
        return await maxmind.open<CountryResponse>(GEOIP_FILE);
      } catch (e) {
        console.error("GeoIP-Datenbank konnte nicht geladen werden", e);
        return null;
      }
    })();
  }
  return readerPromise;
}

const valid = (c: string | null | undefined) => (c && /^[A-Z]{2}$/.test(c.toUpperCase()) && !["XX", "T1"].includes(c.toUpperCase()) ? c.toUpperCase() : null);

export async function getVisitorCountry(): Promise<string | null> {
  const test = valid(process.env.GEOIP_TEST_COUNTRY);
  if (test) return test;
  const h = await headers();
  const fromHeader = valid(h.get("cf-ipcountry")) ?? valid(h.get("x-vercel-ip-country"));
  if (fromHeader) return fromHeader;
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) return null;
  const r = await reader();
  try {
    return valid(r?.get(ip)?.country?.iso_code);
  } catch {
    return null;
  }
}
