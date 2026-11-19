import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { trackProfiles } from "@/lib/stats";
import { publicProfileWhere } from "@/lib/queries/profiles";
import { rateLimit } from "@/lib/rate-limit";

/** Erfasst Kontaktklicks (Telefon anzeigen, WhatsApp, Website) und gibt die Kontaktdaten zurück. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Ungültige Herkunft" }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`click:${ip}`, 60, 60_000).ok) return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 });
  const body = z.object({ profileId: z.string().min(1).max(40) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  const p = await db.profile.findFirst({ where: { AND: [publicProfileWhere(), { id: body.data.profileId }] }, select: { id: true, contactPhone: true, contactWhatsapp: true, showPhone: true } });
  if (!p) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  await trackProfiles([p.id], "clicks");
  return NextResponse.json({ phone: p.showPhone ? p.contactPhone : null, whatsapp: p.showPhone ? p.contactWhatsapp : null });
}
