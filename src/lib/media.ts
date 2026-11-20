/**
 * Version der Bilddarstellung (Wasserzeichen). Bei jeder Änderung am Wasserzeichen erhöhen,
 * damit Browser die zwischengespeicherten Bilder neu laden.
 */
export const MEDIA_VERSION = "wm4";

export const mediaUrl = (key: string | null | undefined) => (key ? `/api/media/${key}?v=${MEDIA_VERSION}` : null);
