import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { applyWatermark } from "@/lib/storage/watermark";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/rbac";
import { AGE_COOKIE, verifyAgeCookie } from "@/lib/age-gate";

/**
 * Auslieferung von Bildern mit Zugriffsprüfung:
 *  - Altersbestätigung (zusätzlich zur Middleware)
 *  - öffentliche Bilder nur, wenn freigegeben UND Sedcard veröffentlicht
 *  - ungeprüfte Bilder nur für Eigentümer und Moderation
 *  - private Dokumente (Ausweise) ausschließlich für Moderation
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params;
  const key = parts.join("/");
  if (key.includes("..")) return new NextResponse("Ungültig", { status: 400 });

  const jar = await cookies();
  if ((await verifyAgeCookie(jar.get(AGE_COOKIE)?.value)) !== "ok") return new NextResponse("Altersbestätigung erforderlich", { status: 403 });

  const user = await getCurrentUser();
  const isMod = !!user && can(user.role, "moderation.images");
  let allowed = false;
  let publicCache = false;

  if (key.startsWith("private/")) {
    allowed = !!user && can(user.role, "moderation.verifications");
  } else if (key.startsWith("profiles/")) {
    const img = await db.profileImage.findFirst({
      where: { OR: [{ storageKey: key }, { thumbKey: key }] },
      select: { status: true, profile: { select: { status: true, ownerId: true } } },
    });
    if (img) {
      const isPublic = img.status === "APPROVED" && img.profile.status === "PUBLISHED";
      allowed = isPublic || isMod || img.profile.ownerId === user?.id;
      publicCache = isPublic;
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
