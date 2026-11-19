import { describe, expect, it } from "vitest";
import { can, ROLE_PERMISSIONS } from "@/lib/rbac";

describe("Rollen & Rechte", () => {
  it("Admin hat alle Rechte", () => {
    expect(can("ADMIN", "admin.settings")).toBe(true);
    expect(can("ADMIN", "moderation.reports")).toBe(true);
  });
  it("Moderator hat keine Admin-Rechte", () => {
    expect(can("MODERATOR", "moderation.profiles")).toBe(true);
    expect(can("MODERATOR", "admin.users")).toBe(false);
    expect(can("MODERATOR", "admin.tokens")).toBe(false);
  });
  it("Besucher kann keine Sedcards erstellen oder Moderation nutzen", () => {
    expect(can("VISITOR", "profile.own")).toBe(false);
    expect(can("VISITOR", "forum.use")).toBe(false);
    expect(can("VISITOR", "moderation.access")).toBe(false);
  });
  it("Nur Agenturen, Clubs und Studios verwalten mehrere Sedcards", () => {
    expect(can("AGENCY", "profile.multiple")).toBe(true);
    expect(can("CLUB", "profile.multiple")).toBe(true);
    expect(can("PROVIDER", "profile.multiple")).toBe(false);
  });
  it("Kein Geschäftskonto hat Moderationsrechte", () => {
    for (const r of ["PROVIDER", "AGENCY", "APARTMENT", "CLUB", "MASSAGE_STUDIO", "VISITOR"] as const) {
      expect(ROLE_PERMISSIONS[r].some((p) => p.startsWith("moderation.") || p.startsWith("admin."))).toBe(false);
    }
  });
  it("lehnt fehlende Rolle ab", () => expect(can(null, "dashboard.access")).toBe(false));
});
