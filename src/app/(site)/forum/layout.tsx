import { requirePermission } from "@/lib/auth/session";

export const metadata = { title: "Forum", robots: { index: false } };

/** Geschlossenes Forum: nur für Inserenten und Moderation. */
export default async function ForumLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("forum.use", "/forum");
  return <div className="container-page max-w-5xl py-10">{children}</div>;
}
