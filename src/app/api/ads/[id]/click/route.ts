import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";

/** Klickzählung und sichere Weiterleitung (nur interne Pfade oder https-Ziele aus geprüften Buchungen). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = await db.adBooking.findFirst({ where: { id, status: "ACTIVE" }, select: { targetUrl: true, profile: { select: { slug: true } } } });
  if (!ad) return NextResponse.redirect(new URL("/", req.url));
  await db.adBooking.update({ where: { id }, data: { clicks: { increment: 1 } } });
  let target = ad.profile ? `/profil/${ad.profile.slug}` : "/";
  if (ad.targetUrl) {
    if (ad.targetUrl.startsWith("/") && !ad.targetUrl.startsWith("//")) target = ad.targetUrl;
    else if (/^https:\/\//.test(ad.targetUrl)) return NextResponse.redirect(ad.targetUrl);
  }
  return NextResponse.redirect(new URL(target, req.url));
}
