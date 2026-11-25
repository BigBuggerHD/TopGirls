import type { Role } from "@prisma/client";

/**
 * Rollen- und Rechteverwaltung (RBAC).
 * Die Zuordnung ist zentral definiert und wird serverseitig in Layouts, Server Actions und API-Routen geprüft.
 */
export const PERMISSIONS = [
  "dashboard.access",
  "profile.own", // eigene Sedcard(s) verwalten
  "profile.multiple", // mehrere Sedcards
  "promotion.book",
  "ads.book",
  "tokens.buy",
  "stats.view",
  "marketplace.post",
  "messages.use",
  "forum.use",
  "verification.request",
  // Moderation
  "moderation.access",
  "moderation.profiles",
  "moderation.images",
  "moderation.marketplace",
  "moderation.forum",
  "moderation.reports",
  "moderation.messages", // nur gemeldete Nachrichten
  "moderation.verifications",
  "moderation.ads",
  // Administration
  "admin.users",
  "admin.roles",
  "admin.categories",
  "admin.filters",
  "admin.ads",
  "admin.products",
  "admin.tokens",
  "admin.payments",
  "admin.settings",
  "admin.audit",
  "admin.stats",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const BUSINESS: Permission[] = [
  "dashboard.access", "profile.own", "promotion.book", "ads.book", "tokens.buy", "stats.view",
  "marketplace.post", "messages.use", "forum.use", "verification.request",
];

const MODERATION: Permission[] = [
  "moderation.access", "moderation.profiles", "moderation.images", "moderation.marketplace", "moderation.forum",
  "moderation.reports", "moderation.messages", "moderation.verifications", "moderation.ads",
];

/** Rechte eines Mitglieds: alle Funktionen für Inserenten, inkl. mehrerer Sedcards. */
const MEMBER_PERMISSIONS: Permission[] = [...BUSINESS, "profile.multiple"];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  MEMBER: MEMBER_PERMISSIONS,
  // Frühere Kontoarten (werden nicht mehr vergeben) erhalten die gleichen Rechte wie Mitglieder
  VISITOR: MEMBER_PERMISSIONS,
  PROVIDER: MEMBER_PERMISSIONS,
  AGENCY: MEMBER_PERMISSIONS,
  APARTMENT: MEMBER_PERMISSIONS,
  CLUB: MEMBER_PERMISSIONS,
  MASSAGE_STUDIO: MEMBER_PERMISSIONS,
  MODERATOR: ["dashboard.access", "messages.use", "forum.use", ...MODERATION],
  ADMIN: [...PERMISSIONS],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  MEMBER: "Mitglied",
  VISITOR: "Besucher (alt)",
  PROVIDER: "Einzelanbieterin (alt)",
  AGENCY: "Agentur (alt)",
  APARTMENT: "Apartmentanbieter (alt)",
  CLUB: "Clubbetreiber (alt)",
  MASSAGE_STUDIO: "Massagestudio (alt)",
  MODERATOR: "Moderator",
  ADMIN: "Administrator",
};

/** Rollen, die im Adminbereich vergeben werden können. */
export const ASSIGNABLE_ROLES: Role[] = ["MEMBER", "MODERATOR", "ADMIN"];

/** Einheitliche Kontoart bei der Registrierung. */
export const SELF_SERVICE_ROLES: Role[] = ["MEMBER"];

/** Alle Nicht-Team-Konten (benötigen Identitätsprüfung vor Veröffentlichung). */
export const BUSINESS_ROLES: Role[] = ["MEMBER", "VISITOR", "PROVIDER", "AGENCY", "APARTMENT", "CLUB", "MASSAGE_STUDIO"];

export const isStaff = (role: Role) => role === "ADMIN" || role === "MODERATOR";
