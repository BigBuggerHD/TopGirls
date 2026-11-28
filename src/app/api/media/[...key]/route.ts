import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { applyWatermark } from "@/lib/storage/watermark";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { AGE_COOKIE, verifyAgeCookie } from "@/lib/age-gate";
import { getVisitorCountry } from "@/lib/geo";

/**
 * Auslieferung von Bildern mit Zugriffsprüfung:
 *  - Altersbestätigung (zusätzlich zur Middleware)
 *  - öffentliche Bilder nur, wenn freigegeben UND Sedcard veröffentlicht
 *  - ungeprüfte Bilder nur für Eigentümer und Moderation
 *  - private Dateien (Nachweise, Echtheits-Videos/-Fotos) ausschließlich für Moderation
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params;
  const key = parts.join("/");
  if (key.includes("..")) return new NextResponse("Ungültig", { status: 400 });

  const jar = await cookies();
  if ((await verifyAgeCookie(jar.get(AGE_COOKIE)?.value)) !== "ok") return new NextResponse("Altersbestätigung erforderlich", { status: 403 });

  const user = await getCurrentUser();
  const isMod = !!user && can(user.role, "moderation.images");
  let allowed = false;
  let publicCache = false;
  let blurForGuest = false;

  if (key.startsWith("private/")) {
    allowed = !!user && can(user.role, "moderation.verifications");
  } else if (key.startsWith("profiles/")) {
    const img = await db.profileImage.findFirst({
      where: { OR: [{ storageKey: key }, { thumbKey: key }] },
      select: { status: true, profile: { select: { status: true, ownerId: true, blockedCountries: true, blurForGuests: true } } },
    });
    if (img) {
      const isOwner = img.profile.ownerId === user?.id;
      // Länderfilter der Sedcard gilt auch für die Bilder
      const country = img.profile.blockedCountries.length ? await getVisitorCountry() : null;
      const blockedHere = !!country && img.profile.blockedCountries.includes(country);
      const isPublic = img.status === "APPROVED" && img.profile.status === "PUBLISHED" && !blockedHere;
      allowed = isPublic || isMod || isOwner;
      // Einstellung „Bilder verschwommen für Gäste“: nicht angemeldete Besucher erhalten eine unscharfe Fassung
      blurForGuest = img.profile.blurForGuests && !user;
      publicCache = isPublic && !img.profile.blurForGuests;
    }
  } else if (key.startsWith("ads/")) {
    const ad = await db.adBooking.findFirst({ where: { imageKey: key }, select: { status: true, userId: true } });
    if (ad) {
      allowed = ad.status === "ACTIVE" || isMod || ad.userId === user?.id;
      publicCache = ad.status === "ACTIVE";
    }
  } else if (key.startsWith("demo/")) {
    allowed = true;
    publicCache = true;
  }

  if (!allowed) return new NextResponse("Nicht gefunden", { status: 404 });
  let data = await storage().get(key);
  if (!data) return new NextResponse("Nicht gefunden", { status: 404 });
  // Sedcard-Bilder erhalten automatisch das Top-Girls-Wasserzeichen
  if (key.startsWith("profiles/")) {
    try {
      data = await applyWatermark(key, data);
    } catch (e) {
      console.error("Wasserzeichen fehlgeschlagen", e);
    }
    if (blurForGuest) {
      const sharp = (await import("sharp")).default;
      data = await sharp(data).blur(28).webp({ quality: 70 }).toBuffer();
    }
  }

  // Echtheits-Videos (nur Team): mit Range-Unterstützung, damit im Video gespult werden kann
  const videoType = key.endsWith(".webm") ? "video/webm" : key.endsWith(".mp4") ? "video/mp4" : null;
  if (videoType) {
    const total = data.length;
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
    const base = { "Content-Type": videoType, "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
    if (range && (range[1] || range[2])) {
      const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
      const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
      if (start >= total || start > end) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
      return new NextResponse(new Uint8Array(data.subarray(start, end + 1)), { status: 206, headers: { ...base, "Content-Range": `bytes ${start}-${end}/${total}`, "Content-Length": String(end - start + 1) } });
    }
    return new NextResponse(new Uint8Array(data), { headers: { ...base, "Content-Length": String(total) } });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": key.endsWith(".jpg") ? "image/jpeg" : "image/webp",
      "Cache-Control": publicCache ? "private, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
