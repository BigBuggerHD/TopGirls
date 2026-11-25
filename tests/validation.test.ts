import { describe, expect, it } from "vitest";
import { ageFromBirthDate, parseEuroToCents, passwordSchema, registerSchema } from "@/lib/validation";
import { formatDate, formatEuro } from "@/lib/format";
import { safeRedirectPath, slugify } from "@/lib/utils";

const base = { displayName: "Test", email: "a@b.de", password: "Sicher12345", passwordConfirm: "Sicher12345", terms: "on", adult: "on" };

describe("Validierung", () => {
  it("verlangt Volljährigkeit bei der Registrierung", () => {
    const y = new Date().getFullYear();
    expect(registerSchema.safeParse({ ...base, birthDate: `${y - 17}-01-01` }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, birthDate: `${y - 30}-01-01` }).success).toBe(true);
  });
  it("berechnet das Alter korrekt", () => {
    const d = new Date();
    const iso = `${d.getUTCFullYear() - 18}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    expect(ageFromBirthDate(iso)).toBe(18);
  });
  it("prüft Passwortstärke", () => {
    expect(passwordSchema.safeParse("kurz").success).toBe(false);
    expect(passwordSchema.safeParse("nurkleinbuchstaben1").success).toBe(false);
    expect(passwordSchema.safeParse("Gut-Passwort-2026").success).toBe(true);
  });
  it("parst Euro-Beträge", () => {
    expect(parseEuroToCents("12,50")).toBe(1250);
    expect(parseEuroToCents("")).toBeNull();
  });
});

describe("Formatierung & Hilfsfunktionen", () => {
  it("formatiert deutsch", () => {
    expect(formatDate(new Date("2026-03-05T12:00:00Z"))).toBe("05.03.2026");
    expect(formatEuro(123456).replace(/\s/g, " ")).toBe("1.234,56 €");
  });
  it("erzeugt Slugs mit Umlauten", () => expect(slugify("Lotus Studio München")).toBe("lotus-studio-muenchen"));
  it("verhindert Open Redirects", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
  });
});
