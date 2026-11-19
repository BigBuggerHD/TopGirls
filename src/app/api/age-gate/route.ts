import { NextResponse, type NextRequest } from "next/server";
import { AGE_COOKIE, ageGateTtlSeconds, signAgeCookie } from "@/lib/age-gate";
import { safeRedirectPath } from "@/lib/utils";

/**
 * Setzt das serverseitig signierte Altersbestätigungs-Cookie.
 * Funktioniert als normales Formular-POST (ohne JavaScript).
 */
export async function POST(req: NextRequest) {
  // CSRF-Schutz: nur Same-Origin-Formulare
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Ungültige Herkunft" }, { status: 403 });

  const form = await req.formData();
  const answer = form.get("answer");
  const next = safeRedirectPath(String(form.get("next") ?? "/"));
  const ttl = ageGateTtlSeconds();
  const confirmed = answer === "yes";

  const res = NextResponse.redirect(new URL(confirmed ? next : "/zugang-verweigert", req.url), 303);
  res.cookies.set(AGE_COOKIE, await signAgeCookie(confirmed ? "ok" : "denied", ttl), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttl,
  });
  return res;
}
