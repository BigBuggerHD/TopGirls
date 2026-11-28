import { describe, expect, it, vi } from "vitest";
import { isAgeGateExempt, isAllowedWhenDenied, signAgeCookie, verifyAgeCookie } from "@/lib/age-gate";

describe("Altersabfrage-Cookie", () => {
  it("signiert und verifiziert eine Bestätigung", async () => {
    const c = await signAgeCookie("ok", 60);
    expect(await verifyAgeCookie(c)).toBe("ok");
  });
  it("erkennt verweigerten Zugang", async () => {
    expect(await verifyAgeCookie(await signAgeCookie("denied", 60))).toBe("denied");
  });
  it("lehnt manipulierte Cookies ab", async () => {
    const c = await signAgeCookie("denied", 60);
    const forged = c.replace(/^denied/, "ok");
    expect(await verifyAgeCookie(forged)).toBeNull();
    expect(await verifyAgeCookie("ok.9999999999.deadbeef")).toBeNull();
    expect(await verifyAgeCookie("ok")).toBeNull();
    expect(await verifyAgeCookie(undefined)).toBeNull();
  });
  it("lehnt abgelaufene Cookies ab", async () => {
    const c = await signAgeCookie("ok", 1);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5000);
    expect(await verifyAgeCookie(c)).toBeNull();
    vi.useRealTimers();
  });
  it("schützt Inhalte, lässt Pflichtseiten zu", () => {
    expect(isAgeGateExempt("/impressum")).toBe(true);
    expect(isAgeGateExempt("/api/payments/paypal/webhook")).toBe(true);
    expect(isAgeGateExempt("/api/cron")).toBe(true);
    expect(isAgeGateExempt("/api/cronjob")).toBe(false);
    expect(isAgeGateExempt("/frauen")).toBe(false);
    expect(isAgeGateExempt("/api/media/profiles/x.webp")).toBe(false);
    expect(isAgeGateExempt("/profil/test")).toBe(false);
    expect(isAllowedWhenDenied("/frauen")).toBe(false);
    expect(isAllowedWhenDenied("/zugang-verweigert")).toBe(true);
  });
});
