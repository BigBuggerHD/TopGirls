import "server-only";
import { randomUUID } from "node:crypto";
import { sha256, randomToken } from "@/lib/crypto";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";
import { UploadError } from "@/lib/storage/images";

/** Höchstgröße eines Echtheits-Videos (ca. 10 Sekunden reichen). */
export const MAX_AUTH_VIDEO_BYTES = 40 * 1024 * 1024;

export const hashAuthToken = (token: string) => sha256(`echtheit:${token}`);

/** Neuer Einmal-Link: der Klartext-Token steht nur im Link, gespeichert wird der Hash. */
export function newAuthLink() {
  const token = randomToken(24);
  return { token, tokenHash: hashAuthToken(token), url: `${env.appUrl}/echtheit/${token}` };
}

/** Erkennt WebM/Matroska und MP4/MOV anhand der ersten Bytes. */
function sniffVideo(buf: Buffer): { ext: "webm" | "mp4"; mime: string } | null {
  if (buf.length > 12 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { ext: "webm", mime: "video/webm" };
  if (buf.length > 12 && buf.subarray(4, 8).toString("latin1") === "ftyp") return { ext: "mp4", mime: "video/mp4" };
  return null;
}

/** Speichert das Video privat (nur für das Team abrufbar). */
export async function storeAuthVideo(file: File, profileId: string) {
  if (file.size > MAX_AUTH_VIDEO_BYTES) throw new UploadError("Das Video ist zu groß (max. 40 MB). Bitte nimm etwa 10 Sekunden auf.");
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffVideo(buf);
  if (!kind) throw new UploadError("Unbekanntes Videoformat.");
  const key = `private/authenticity/${profileId}/${randomUUID()}.${kind.ext}`;
  await storage().put(key, buf, kind.mime);
  return { key, mime: kind.mime };
}

/** Speichert das vom Team gewählte Standbild als internes Echtheitsfoto (JPEG, neu encodiert). */
export async function storeAuthPhoto(jpegDataUrl: string, profileId: string) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(jpegDataUrl);
  if (!m) throw new UploadError("Ungültiges Bild.");
  const input = Buffer.from(m[1], "base64");
  if (input.length > 8 * 1024 * 1024) throw new UploadError("Bild zu groß.");
  const sharp = (await import("sharp")).default;
  const out = await sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  const key = `private/authenticity/${profileId}/foto-${randomUUID()}.jpg`;
  await storage().put(key, out, "image/jpeg");
  return key;
}
