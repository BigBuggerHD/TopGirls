import { NextResponse, type NextRequest } from "next/server";
import { runHousekeeping } from "@/lib/housekeeping";
import { safeEqual } from "@/lib/crypto";

/** Für externe Cron-Jobs: POST /api/cron mit Header `Authorization: Bearer <CRON_SECRET>`. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || !safeEqual(auth, secret)) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  await runHousekeeping(true);
  return NextResponse.json({ ok: true });
}
