import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const statics = ["", "/frauen", "/online-inserate", "/clubs", "/massagen", "/marktplatz", "/werbung", "/impressum", "/datenschutz", "/agb", "/jugendschutz"];
  const profiles = await db.profile.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true }, take: 5000 });
  return [...statics.map((p) => ({ url: `${base}${p}` })), ...profiles.map((p) => ({ url: `${base}/profil/${p.slug}`, lastModified: p.updatedAt }))];
}
