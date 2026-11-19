import "server-only";
import { db } from "@/lib/db";

export const DEFAULT_SETTINGS = {
  siteName: "Top Girls",
  profileDurationDays: 30, // Laufzeit einer freigegebenen Sedcard
  extensionDays: 30,
  maxImagesPerProfile: 12,
  maxProfilesPerProvider: 1,
  maxProfilesPerBusiness: 50,
  listingDurationDays: 30,
  requireVerificationForPublish: true,
  registrationOpen: true,
  maintenanceNotice: "",
  contactEmail: "kontakt@example.com",
  reportEmail: "meldestelle@example.com",
} as const;

export type Settings = { -readonly [K in keyof typeof DEFAULT_SETTINGS]: (typeof DEFAULT_SETTINGS)[K] extends boolean ? boolean : (typeof DEFAULT_SETTINGS)[K] extends number ? number : string };

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) out[r.key] = r.value;
  return out as Settings;
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
}
