import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { publicLocation } from "@/lib/districts";

describe("Telefonnummer", () => {
  it("wandelt deutsche Eingaben ins internationale Format", () => {
    expect(normalizePhone("0151 1234567")).toBe("+491511234567");
    expect(normalizePhone("+49 (151) 123-4567")).toBe("+491511234567");
    expect(normalizePhone("0049 151 1234567")).toBe("+491511234567");
    expect(normalizePhone("+43 660 1234567")).toBe("+436601234567");
  });
  it("lehnt ungültige Nummern ab", () => {
    expect(normalizePhone("abc")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("0151")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
  it("formatiert lesbar", () => {
    expect(formatPhone("+491511234567")).toBe("+49 1511234567");
  });
});

describe("Öffentliche Adresse", () => {
  const base = { city: "Berlin", district: "Mitte", street: "Musterstraße", houseNumber: "12", postalCode: "10115" };
  it("zeigt ohne Freigabe nur Bezirk und Stadt", () => {
    expect(publicLocation({ ...base, showAddress: false })).toBe("Mitte, Berlin");
  });
  it("zeigt mit Freigabe die volle Adresse", () => {
    expect(publicLocation({ ...base, showAddress: true })).toBe("Musterstraße 12, 10115 Berlin, Mitte");
  });
});
