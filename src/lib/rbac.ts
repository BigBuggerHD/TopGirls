import type { Role } from "@prisma/client";

/**
 * Rollen- und Rechteverwaltung (RBAC).
 * Die Zuordnung ist zentral definiert und wird serverseitig in Layouts, Server Actions und API-Routen geprüft.
 */
export const PERMISSIONS = [
  "dashboard.access",
  "profile.own", // eigene Sedcard(s) verwalten
  "profile.multiple", // mehrere Sedcards (Agentur, Club, Studio)
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

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  VISITOR: ["dashboard.access", "messages.use"],
  PROVIDER: BUSINESS,
  AGENCY: [...BUSINESS, "profile.multiple"],
  APARTMENT: ["dashboard.access", "ads.book", "tokens.buy", "marketplace.post", "messages.use", "forum.use", "verification.request", "stats.view"],
  CLUB: [...BUSINESS, "profile.multiple"],
  MASSAGE_STUDIO: [...BUSINESS, "profile.multiple"],
  MODERATOR: ["dashboard.access", "messages.use", "forum.use", ...MODERATION],
  ADMIN: [...PERMISSIONS],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  VISITOR: "Besucher",
  PROVIDER: "Einzelanbieterin",
  AGENCY: "Agentur",
  APARTMENT: "Apartmentanbieter",
  CLUB: "Clubbetreiber",
  MASSAGE_STUDIO: "Massagestudio",
  MODERATOR: "Moderator",
  ADMIN: "Administrator",
};

/** Rollen, die bei der Registrierung frei wählbar sind. */
export const SELF_SERVICE_ROLES: Role[] = ["VISITOR", "PROVIDER", "AGENCY", "APARTMENT", "CLUB", "MASSAGE_STUDIO"];

/** Rollen mit geschäftlicher Tätigkeit (benötigen Identitätsprüfung vor Veröffentlichung). */
export const BUSINESS_ROLES: Role[] = ["PROVIDER", "AGENCY", "APARTMENT", "CLUB", "MASSAGE_STUDIO"];

export const isStaff = (role: Role) => role === "ADMIN" || role === "MODERATOR";
