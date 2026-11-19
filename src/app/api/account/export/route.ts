import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

/** DSGVO Art. 15 / 20: Export aller personenbezogenen Daten als JSON. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!rateLimit(`export:${user.id}`, 5, 60 * 60_000).ok) return NextResponse.json({ error: "Zu viele Anfragen" }, { status: 429 });
  const data = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true, email: true, role: true, status: true, displayName: true, companyName: true, emailVerifiedAt: true, verificationStatus: true,
      tokenBalance: true, termsAcceptedAt: true, lastLoginAt: true, createdAt: true,
      profiles: { include: { images: { select: { id: true, status: true, createdAt: true } }, attributes: { include: { options: true } } } },
      transactions: true,
      payments: { select: { id: true, provider: true, amountCents: true, currency: true, tokens: true, status: true, createdAt: true } },
      adBookings: true, listings: true, promotions: true,
      messages: { select: { id: true, conversationId: true, body: true, createdAt: true } },
      forumThreads: { select: { id: true, title: true, createdAt: true } },
      forumPosts: { select: { id: true, threadId: true, body: true, createdAt: true } },
      reports: { select: { id: true, targetType: true, reason: true, details: true, createdAt: true } },
      notifications: true,
      verifications: { select: { id: true, docType: true, status: true, createdAt: true, reviewedAt: true } },
      sessions: { select: { createdAt: true, expiresAt: true, userAgent: true } },
    },
  });
  await audit(user.id, "user.data_export");
  return new NextResponse(JSON.stringify({ exportiertAm: new Date().toISOString(), plattform: "Top Girls", daten: data }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="top-girls-datenexport.json"`, "Cache-Control": "no-store" },
  });
}
