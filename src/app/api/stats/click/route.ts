import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { trackProfiles } from "@/lib/stats";
import { publicProfileWhere } from "@/lib/queries/profiles";
import { getVisitorCountry } from "@/lib/geo";
import { rateLimit } from "@/lib/rate-limit";

/** Erfasst Kontaktklicks (Telefon anzeigen, WhatsApp, Telegram) und gibt die Kontaktdaten zurück. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Ungültige Herkunft" }, { status: 403 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (!rateLimit(`click:${ip}`, 60, 60_000).ok) return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 });
  const body = z.object({ profileId: z.string().min(1).max(40) }).safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  const p = await db.profile.findFirst({ where: { AND: [publicProfileWhere(await getVisitorCountry()), { id: body.data.profileId }] }, select: { id: true, contactPhone: true, phoneVerifiedAt: true, whatsappEnabled: true, telegramEnabled: true, telegramUsername: true } });
  if (!p) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  await trackProfiles([p.id], "clicks");
  // Öffentlich nur per SMS bestätigte Nummern
  const phone = p.phoneVerifiedAt ? p.contactPhone : null;
  return NextResponse.json({ phone, whatsapp: !!phone && p.whatsappEnabled, telegram: !!phone && p.telegramEnabled, telegramUsername: p.telegramUsername });
}
