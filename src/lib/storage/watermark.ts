import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

/**
 * Wasserzeichen „TOP“ (oben links) und „GIRLS“ (unten rechts) aus dem Logo.
 * Wird bei der Auslieferung über /api/media eingefügt; die Originale bleiben unverändert gespeichert.
 * Dadurch gilt eine Änderung der Einstellungen sofort für alle Bilder.
 */
export const WATERMARK = {
  opacity: 0.4, // Deckkraft (0 = unsichtbar, 1 = voll deckend)
  topWidth: 0.22, // Breite von „TOP“ relativ zur Bildbreite
  girlsWidth: 0.32, // Breite von „GIRLS“ relativ zur Bildbreite
  margin: 0.045, // Abstand zum Rand relativ zur Bildbreite
};

const ASSET_DIR = path.join(process.cwd(), "assets");
let overlays: Promise<{ top: Buffer; girls: Buffer }> | null = null;
const loadOverlays = () =>
  (overlays ??= Promise.all([fs.readFile(path.join(ASSET_DIR, "wm-top.png")), fs.readFile(path.join(ASSET_DIR, "wm-girls.png"))]).then(([top, girls]) => ({ top, girls })));

/** Skaliert ein Overlay und reduziert seine Deckkraft. */
async function prepare(overlay: Buffer, width: number) {
  return sharp(overlay)
    .resize({ width: Math.max(16, Math.round(width)) })
    .ensureAlpha()
    .composite([{ input: Buffer.from([255, 255, 255, Math.round(255 * WATERMARK.opacity)]), raw: { width: 1, height: 1, channels: 4 }, tile: true, blend: "dest-in" }])
    .png()
    .toBuffer({ resolveWithObject: true });
}

// Kleiner In-Memory-Cache, damit häufig aufgerufene Bilder nicht jedes Mal neu berechnet werden
const cache = new Map<string, Buffer>();
const CACHE_MAX = 300;

export async function applyWatermark(key: string, image: Buffer): Promise<Buffer> {
  const hit = cache.get(key);
  if (hit) return hit;
  const { top, girls } = await loadOverlays();
  const meta = await sharp(image).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return image;
  const m = Math.round(w * WATERMARK.margin);
  const t = await prepare(top, w * WATERMARK.topWidth);
  const g = await prepare(girls, w * WATERMARK.girlsWidth);
  const out = await sharp(image)
    .composite([
      { input: t.data, left: m, top: m },
      { input: g.data, left: Math.max(0, w - g.info.width - m), top: Math.max(0, h - g.info.height - m) },
    ])
    .webp({ quality: 84 })
    .toBuffer();
  cache.set(key, out);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  return out;
}
