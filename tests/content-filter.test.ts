import { describe, expect, it } from "vitest";
import { checkContent, checkProfileText } from "@/lib/content-filter";

describe("Inhaltsfilter", () => {
  it("erkennt Telefonnummern, E-Mails und Adressen", () => {
    expect(checkContent("Ruf an: 0171 1234567").reasons).toContain("Telefonnummer");
    expect(checkContent("schreib an max@example.com").reasons).toContain("E-Mail-Adresse");
    expect(checkContent("Sie wohnt in der Hauptstraße 5").reasons).toContain("Wohnadresse");
  });
  it("erkennt unbelegte Anschuldigungen", () => {
    expect(checkContent("Der Typ ist ein Betrüger und hat mich abgezockt").flagged).toBe(true);
  });
  it("lässt normale Beiträge durch", () => {
    expect(checkContent("Wie lange dauert die Verlängerung der Anmeldung bei euch?").flagged).toBe(false);
  });
  it("blockiert Hinweise auf Minderjährigkeit und § 32 ProstSchG", () => {
    expect(checkProfileText("Süße Schülerin sucht").flagged).toBe(true);
    expect(checkProfileText("Alles ohne Kondom möglich").reasons).toContain("Nach § 32 ProstSchG unzulässige Werbung");
    expect(checkProfileText("Elegante Begleitung für Events").flagged).toBe(false);
  });
});
