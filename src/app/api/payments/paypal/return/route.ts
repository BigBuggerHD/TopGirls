import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { ADAPTERS, processPaymentEvent } from "@/lib/payments";

/** Rückkehr von PayPal: Bestellung serverseitig capturen. Der Webhook bestätigt zusätzlich (idempotent). */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const pid = req.nextUrl.searchParams.get("pid");
  const orderId = req.nextUrl.searchParams.get("token");
  if (!user || !pid || !orderId) return NextResponse.redirect(new URL("/dashboard/tokens?zahlung=fehler", req.url));
  const payment = await db.payment.findFirst({ where: { id: pid, userId: user.id, provider: "PAYPAL", providerRef: orderId } });
  if (!payment) return NextResponse.redirect(new URL("/dashboard/tokens?zahlung=fehler", req.url));
  try {
    const outcome = await ADAPTERS.PAYPAL.confirmReturn!(orderId);
    outcome.paymentId = payment.id;
    await processPaymentEvent("PAYPAL", outcome);
    const fresh = await db.payment.findUnique({ where: { id: payment.id } });
    return NextResponse.redirect(new URL(`/dashboard/tokens?zahlung=${fresh?.status === "COMPLETED" ? "ok" : "ausstehend"}`, req.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard/tokens?zahlung=fehler", req.url));
  }
}
