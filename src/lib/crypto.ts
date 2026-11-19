import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const sha256 = (input: string | Buffer) => createHash("sha256").update(input).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function hmacSha256Hex(secret: string, payload: string | Buffer) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** IP-Adressen werden nie im Klartext gespeichert (Datenminimierung). */
export function hashIp(ip: string | null | undefined) {
  if (!ip) return null;
  return sha256(`${process.env.SESSION_SECRET ?? ""}:${ip}`).slice(0, 32);
}
