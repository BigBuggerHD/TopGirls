import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { storage } from "@/lib/storage";
import { UploadError } from "@/lib/storage/images";
import { hashAuthToken, storeAuthVideo } from "@/lib/authenticity";
import { nearestCity } from "@/data/cities-de";

/**
 * Empfängt das Echtheits-Video über den Einmal-Link (ohne Anmeldung).
 * Datum/Uhrzeit setzt der Server. Vom Standort wird nur die nächstgelegene größere Stadt gespeichert – keine Koordinaten.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Ungültige Herkunft" }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`echtheit:${ip}`, 20, 60 * 60_000).ok) return NextResponse.json({ error: "Zu viele Versuche. Bitte später erneut." }, { status: 429 });

  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return NextResponse.json({ error: "Link ungültig." }, { status: 404 });
  const check = await db.authenticityCheck.findUnique({ where: { tokenHash: hashAuthToken(token) } });
  if (!check || check.status === "APPROVED") return NextResponse.json({ error: "Dieser Link ist nicht mehr gültig." }, { status: 404 });

  const fd = await req.formData().catch(() => null);
  const file = fd?.get("video");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Keine Aufnahme erhalten." }, { status: 400 });
  const lat = Number(fd?.get("lat"));
  const lon = Number(fd?.get("lon"));
  const place = fd?.get("lat") != null && fd?.get("lon") != null ? nearestCity(lat, lon) : null;

  try {
    const video = await storeAuthVideo(file, check.profileId);
    if (check.videoKey) await storage().delete(check.videoKey).catch(() => {});
    await db.authenticityCheck.update({
      where: { id: check.id },
      data: {
        status: "SUBMITTED", videoKey: video.key, videoMime: video.mime, recordedAt: new Date(),
        locationShared: !!place, locationCity: place?.city ?? null, locationKm: place?.km ?? null, reviewNote: null,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof UploadError ? e.message : "Upload fehlgeschlagen." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
