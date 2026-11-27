import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { publicLocation } from "@/lib/districts";
import { parsePrices } from "@/lib/prices";
import { normalizeTelegramUsername, telegramLink, whatsappLink } from "@/lib/messenger";

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

describe("Messenger-Links", () => {
  it("WhatsApp mit vorausgefülltem Text", () => {
    expect(whatsappLink("+491511234567")).toBe("https://wa.me/491511234567?text=Hallo%2C%20ich%20habe%20deine%20Sedcard%20auf%20Top%20Girls%20gesehen.");
  });
  it("Telegram bevorzugt den Benutzernamen", () => {
    expect(telegramLink("+491511234567", "lara_berlin")).toBe("https://t.me/lara_berlin");
    expect(telegramLink("+491511234567", null)).toBe("https://t.me/+491511234567");
  });
  it("Telegram-Benutzername wird bereinigt und geprüft", () => {
    expect(normalizeTelegramUsername("@lara_berlin")).toBe("lara_berlin");
    expect(normalizeTelegramUsername("https://t.me/lara_berlin")).toBe("lara_berlin");
    expect(normalizeTelegramUsername("t.me/Lara2026/")).toBe("Lara2026");
    expect(normalizeTelegramUsername("")).toBe("");
    expect(normalizeTelegramUsername("abc")).toBeNull();
    expect(normalizeTelegramUsername("1lara")).toBeNull();
    expect(normalizeTelegramUsername("lara berlin")).toBeNull();
  });
});

describe("Preise", () => {
  it("ordnet alte Bezeichnungen den festen Positionen zu und sortiert nach Vorgabe", () => {
    const rows = parsePrices([
      { label: "Übernachtung", incallCents: 150000, outcallCents: null },
      { label: "1 Stunde", incallCents: 25000, outcallCents: 30000 },
      { label: "Eigene Position", incallCents: 1000, outcallCents: null },
      { label: "2 Std", amountCents: 45000 },
      { label: "3 Std", incallCents: null, outcallCents: null },
    ]);
    expect(rows).toEqual([
      { label: "60 min", incallCents: 25000, outcallCents: 30000 },
      { label: "2 Std", incallCents: 45000, outcallCents: 45000 },
      { label: "Over-Night", incallCents: 150000, outcallCents: null },
    ]);
  });
});
