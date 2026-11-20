import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

/**
 * Wasserzeichen: Silhouette aus dem Top-Girls-Logo, mittig im Bild.
 * Wird bei der Auslieferung über /api/media eingefügt; die Originale bleiben unverändert gespeichert.
 * Dadurch gilt eine Änderung der Einstellungen sofort für alle Bilder (auch Vorschaubilder).
 * Nach einer Änderung MEDIA_VERSION in src/lib/media.ts erhöhen, damit Browser die Bilder neu laden.
 */
export const WATERMARK = {
  opacity: 0.2, // Deckkraft (0 = unsichtbar, 1 = voll deckend)
  width: 0.7, // Breite der Silhouette relativ zur Bildbreite
};

const FILE = path.join(process.cwd(), "assets", "wm-silhouette.png");
let silhouette: Promise<Buffer> | null = null;
const loadSilhouette = () => (silhouette ??= fs.readFile(FILE));

// Kleiner In-Memory-Cache, damit häufig aufgerufene Bilder nicht jedes Mal neu berechnet werden
const cache = new Map<string, Buffer>();
const CACHE_MAX = 300;

export async function applyWatermark(key: string, image: Buffer): Promise<Buffer> {
  const cacheKey = `${key}:${WATERMARK.opacity}:${WATERMARK.width}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;
  const meta = await sharp(image).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return image;
  const overlay = await sharp(await loadSilhouette())
    .resize({ width: Math.round(w * WATERMARK.width), height: Math.round(h * 0.9), fit: "inside" })
    .ensureAlpha()
    .composite([{ input: Buffer.from([255, 255, 255, Math.round(255 * WATERMARK.opacity)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: "dest-in" }])
    .png()
    .toBuffer();
  const out = await sharp(image).composite([{ input: overlay, gravity: "center" }]).webp({ quality: 84 }).toBuffer();
  cache.set(cacheKey, out);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  return out;
}
