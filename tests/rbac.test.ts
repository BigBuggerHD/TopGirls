import { describe, expect, it } from "vitest";
import { ASSIGNABLE_ROLES, can, ROLE_PERMISSIONS, SELF_SERVICE_ROLES } from "@/lib/rbac";

describe("Rollen & Rechte", () => {
  it("Registrierung kennt nur eine einheitliche Kontoart", () => {
    expect(SELF_SERVICE_ROLES).toEqual(["MEMBER"]);
    expect(ASSIGNABLE_ROLES).toEqual(["MEMBER", "MODERATOR", "ADMIN"]);
  });
  it("Mitglieder haben alle Inserenten-Funktionen inkl. mehrerer Sedcards", () => {
    for (const p of ["profile.own", "profile.multiple", "promotion.book", "ads.book", "tokens.buy", "marketplace.post", "messages.use", "forum.use"] as const) {
      expect(can("MEMBER", p)).toBe(true);
    }
  });
  it("Mitglieder haben keine Moderations- oder Admin-Rechte", () => {
    expect(ROLE_PERMISSIONS.MEMBER.some((p) => p.startsWith("moderation.") || p.startsWith("admin."))).toBe(false);
  });
  it("Frühere Kontoarten haben exakt die Rechte von Mitgliedern", () => {
    for (const r of ["VISITOR", "PROVIDER", "AGENCY", "APARTMENT", "CLUB", "MASSAGE_STUDIO"] as const) {
      expect(ROLE_PERMISSIONS[r]).toEqual(ROLE_PERMISSIONS.MEMBER);
    }
  });
  it("Admin hat alle Rechte, Moderator keine Admin-Rechte", () => {
    expect(can("ADMIN", "admin.settings")).toBe(true);
    expect(can("MODERATOR", "moderation.profiles")).toBe(true);
    expect(can("MODERATOR", "admin.users")).toBe(false);
  });
  it("lehnt fehlende Rolle ab", () => expect(can(null, "dashboard.access")).toBe(false));
});
