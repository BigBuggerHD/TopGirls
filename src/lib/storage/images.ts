import "server-only";
import sharp, { type Metadata } from "sharp";
import { randomUUID } from "node:crypto";
import { sha256 } from "@/lib/crypto";
import { storage } from "@/lib/storage";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp"]);

export class UploadError extends Error {}

/** Prüft die Magic Bytes, nicht nur Dateiendung/MIME-Typ des Browsers. */
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

/**
 * Sichere Bildverarbeitung:
 *  - Größen- und Formatprüfung (Magic Bytes)
 *  - vollständiges Neu-Encodieren (entfernt EXIF/GPS-Metadaten und eingebettete Inhalte)
 *  - Größenbegrenzung, Vorschaubild
 *  - SHA-256 für Duplikat-/Sperrlistenabgleich
 */
export async function processAndStoreImage(file: File, prefix: string) {
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Die Datei ist größer als 10 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  const kind = sniff(input);
  if (!kind || !ALLOWED.has(kind)) throw new UploadError("Nur JPEG-, PNG- oder WebP-Bilder sind erlaubt.");

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new UploadError("Die Bilddatei ist beschädigt oder ungültig.");
  }
  if (!meta.width || !meta.height || meta.width < 300 || meta.height < 300) {
    throw new UploadError("Das Bild muss mindestens 300 × 300 Pixel groß sein.");
  }

  const main = await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  const thumb = await sharp(input).rotate().resize({ width: 480, height: 640, fit: "cover", position: "attention" }).webp({ quality: 78 }).toBuffer();

  const id = randomUUID();
  const storageKey = `${prefix}/${id}.webp`;
  const thumbKey = `${prefix}/${id}_thumb.webp`;
  await storage().put(storageKey, main.data, "image/webp");
  await storage().put(thumbKey, thumb, "image/webp");
  return { storageKey, thumbKey, width: main.info.width, height: main.info.height, sha256: sha256(input) };
}

/** Private Dokumente (Ausweise etc.): Neu-Encodierung, kein Thumbnail, eigener Präfix. */
export async function storePrivateDocument(file: File, prefix: string) {
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Die Datei ist größer als 10 MB.");
  const input = Buffer.from(await file.arrayBuffer());
  const kind = sniff(input);
  if (!kind) throw new UploadError("Bitte lade ein JPEG-, PNG- oder WebP-Bild des Dokuments hoch.");
  const out = await sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const key = `private/${prefix}/${randomUUID()}.jpg`;
  await storage().put(key, out, "image/jpeg");
  return key;
}
