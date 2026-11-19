import { NextResponse, type NextRequest } from "next/server";
import { AGE_COOKIE, isAgeGateExempt, isAllowedWhenDenied, verifyAgeCookie } from "@/lib/age-gate";

/**
 * Serverseitiger 18+-Zugriffsschutz für ALLE Seiten- und API-Aufrufe.
 * Ohne gültiges, signiertes Cookie gibt es keine Inhalte – auch nicht über direkte URLs oder die API.
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const status = await verifyAgeCookie(req.cookies.get(AGE_COOKIE)?.value);
  const isApi = pathname.startsWith("/api/");

  if (status === "denied") {
    if (isAllowedWhenDenied(pathname)) return NextResponse.next();
    if (isApi) return NextResponse.json({ error: "Zugang verweigert (unter 18)." }, { status: 403 });
    return NextResponse.redirect(new URL("/zugang-verweigert", req.url));
  }

  if (status === "ok") {
    if (pathname === "/altersabfrage") return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  // Keine Bestätigung
  if (isAgeGateExempt(pathname)) return NextResponse.next();
  if (isApi) return NextResponse.json({ error: "Altersbestätigung erforderlich." }, { status: 403 });

  const url = new URL("/altersabfrage", req.url);
  const next = pathname + search;
  if (next !== "/") url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
