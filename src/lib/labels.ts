import type { ProfileStatus, ReportReason, ListingStatus, AdBookingStatus, PaymentStatus, TransactionType, TransactionStatus, PromotionType, VerificationStatus, VerificationDocType, AdLocation, ContentStatus, ReportStatus, PaymentProvider, UserStatus } from "@prisma/client";

export const PROFILE_STATUS: Record<ProfileStatus, string> = {
  DRAFT: "Entwurf", PENDING_REVIEW: "In Prüfung", PUBLISHED: "Veröffentlicht", REJECTED: "Abgelehnt",
  PAUSED: "Pausiert", EXPIRED: "Abgelaufen", BLOCKED: "Gesperrt",
};
export const LISTING_STATUS: Record<ListingStatus, string> = {
  DRAFT: "Entwurf", PENDING_REVIEW: "In Prüfung", PUBLISHED: "Veröffentlicht", REJECTED: "Abgelehnt", REMOVED: "Entfernt", EXPIRED: "Abgelaufen",
};
export const AD_STATUS: Record<AdBookingStatus, string> = {
  PENDING_REVIEW: "In Prüfung", SCHEDULED: "Geplant", ACTIVE: "Aktiv", REJECTED: "Abgelehnt", EXPIRED: "Abgelaufen", CANCELLED: "Storniert",
};
export const PAYMENT_STATUS: Record<PaymentStatus, string> = {
  CREATED: "Erstellt", PENDING: "Ausstehend", COMPLETED: "Abgeschlossen", FAILED: "Fehlgeschlagen", CANCELLED: "Abgebrochen", REFUNDED: "Erstattet",
};
export const PAYMENT_PROVIDER: Record<PaymentProvider, string> = { PAYPAL: "PayPal", CREDIT_CARD: "Kreditkarte", NEXTCOUP: "Nextcoup", SANDBOX: "Sandbox" };
export const TX_TYPE: Record<TransactionType, string> = {
  PURCHASE: "Kauf", SPEND: "Verbrauch", REFUND: "Erstattung", ADMIN_CREDIT: "Gutschrift (Admin)", ADMIN_DEBIT: "Belastung (Admin)", BONUS: "Bonus", REVERSAL: "Storno",
};
export const TX_STATUS: Record<TransactionStatus, string> = { PENDING: "Ausstehend", COMPLETED: "Gebucht", FAILED: "Fehlgeschlagen", REVERSED: "Storniert" };
export const PROMOTION_TYPE: Record<PromotionType, string> = {
  PREMIUM: "Premium-Sedcard", HIGHLIGHT: "Hervorhebung", SPONSORED_SEARCH: "Gesponsertes Suchergebnis", EXTENSION: "Laufzeitverlängerung",
};
export const VERIFICATION_STATUS: Record<VerificationStatus, string> = { NONE: "Nicht geprüft", PENDING: "In Prüfung", APPROVED: "Verifiziert", REJECTED: "Abgelehnt" };
export const DOC_TYPE: Record<VerificationDocType, string> = {
  ID_CARD: "Personalausweis", PASSPORT: "Reisepass", PROSTSCHG_CERT: "Anmeldebescheinigung (ProstSchG)",
  BUSINESS_REGISTRATION: "Gewerbeanmeldung / Handelsregisterauszug", MODEL_CONSENT: "Einwilligung & Altersnachweis der abgebildeten Person",
};
export const REPORT_REASON: Record<ReportReason, string> = {
  MINOR: "Verdacht auf Minderjährigkeit", COERCION: "Verdacht auf Zwang oder Menschenhandel", FRAUD: "Betrug",
  IDENTITY_MISUSE: "Identitätsmissbrauch / Fake-Profil", NON_CONSENSUAL_IMAGE: "Bild ohne Einwilligung veröffentlicht",
  PERSONAL_DATA: "Veröffentlichung privater Daten", DEFAMATION: "Unbelegte Anschuldigung", ILLEGAL_CONTENT: "Sonstiger rechtswidriger Inhalt",
  SPAM: "Spam / Werbung", OTHER: "Sonstiges",
};
export const REPORT_PRIORITY: Record<ReportReason, number> = {
  MINOR: 100, COERCION: 100, NON_CONSENSUAL_IMAGE: 80, IDENTITY_MISUSE: 60, ILLEGAL_CONTENT: 60, FRAUD: 50, PERSONAL_DATA: 50, DEFAMATION: 40, SPAM: 10, OTHER: 10,
};
export const REPORT_STATUS: Record<ReportStatus, string> = { OPEN: "Offen", IN_REVIEW: "In Bearbeitung", RESOLVED: "Erledigt", DISMISSED: "Abgewiesen" };
export const AD_LOCATION: Record<AdLocation, string> = {
  HOME_HERO: "Startseite – Hauptbanner", HOME_INLINE: "Startseite – zwischen Profilen", SEARCH_TOP: "Suche – oben",
  SEARCH_SIDEBAR: "Suche – Seitenleiste", PROFILE_SIDEBAR: "Sedcard – Seitenleiste", MARKETPLACE_TOP: "Marktplatz – oben",
};
export const CONTENT_STATUS: Record<ContentStatus, string> = { VISIBLE: "Sichtbar", PENDING_REVIEW: "Zurückgehalten", HIDDEN: "Ausgeblendet", REMOVED: "Entfernt" };
export const USER_STATUS: Record<UserStatus, string> = { ACTIVE: "Aktiv", SUSPENDED: "Befristet gesperrt", BANNED: "Dauerhaft gesperrt", DELETED: "Gelöscht" };

export const WEEKDAYS = [
  ["mo", "Montag"], ["di", "Dienstag"], ["mi", "Mittwoch"], ["do", "Donnerstag"], ["fr", "Freitag"], ["sa", "Samstag"], ["so", "Sonntag"],
] as const;
