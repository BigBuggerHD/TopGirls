/**
 * Serverseitig signiertes Altersbestätigungs-Cookie.
 * Edge-kompatibel (Web Crypto), damit es in der Middleware geprüft werden kann.
 *
 * Format: <status>.<ablauf-unix-sekunden>.<hmac-hex>
 *   status = "ok" (≥ 18 bestätigt) | "denied" (unter 18 angegeben)
 *
 * WICHTIG: Eine Selbstauskunft ist KEINE Altersverifikation im Sinne des JMStV.
 * Sie dient als Zugangsschranke; Anbieterkonten durchlaufen eine zusätzliche Identitätsprüfung.
 */
export const AGE_COOKIE = "tg_age";
export type AgeStatus = "ok" | "denied";

const enc = new TextEncoder();

function getSecret(): string {
  const s = process.env.AGE_GATE_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AGE_GATE_SECRET fehlt oder ist zu kurz.");
  return "dev-age-gate-secret-nicht-fuer-produktion-0000";
}

export function ageGateTtlSeconds(): number {
  const h = Number(process.env.AGE_GATE_TTL_HOURS ?? "24");
  return Math.max(1, Number.isFinite(h) ? h : 24) * 3600;
}

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function signAgeCookie(status: AgeStatus, ttlSeconds = ageGateTtlSeconds()): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${status}.${exp}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function verifyAgeCookie(value: string | undefined | null): Promise<AgeStatus | null> {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [status, expStr, sig] = parts;
  if (status !== "ok" && status !== "denied") return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  const expected = await hmac(`${status}.${expStr}`);
  return constantTimeEqual(expected, sig) ? status : null;
}

/** Pfade, die ohne Altersbestätigung erreichbar sein müssen (Impressumspflicht, Webhooks, Assets). */
export function isAgeGateExempt(pathname: string): boolean {
  return (
    pathname === "/altersabfrage" ||
    pathname === "/zugang-verweigert" ||
    pathname === "/impressum" ||
    pathname === "/datenschutz" ||
    pathname === "/jugendschutz" ||
    pathname === "/hilfe" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    pathname.startsWith("/api/age-gate") ||
    /^\/api\/payments\/[a-z-]+\/webhook$/.test(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/brand/")
  );
}

/** Seiten, die auch bei verweigertem Zugang erreichbar bleiben. */
export function isAllowedWhenDenied(pathname: string): boolean {
  return (
    pathname === "/zugang-verweigert" ||
    pathname === "/impressum" ||
    pathname === "/datenschutz" ||
    pathname === "/jugendschutz" ||
    pathname === "/hilfe" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/brand/") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    /^\/api\/payments\/[a-z-]+\/webhook$/.test(pathname)
  );
}
