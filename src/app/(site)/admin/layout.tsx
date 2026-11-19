import { requirePermission } from "@/lib/auth/session";
import { can, ROLE_LABELS, type Permission } from "@/lib/rbac";
import { db } from "@/lib/db";
import { SideNav, type NavItem } from "@/components/dashboard/sidebar";

export const metadata = { title: "Verwaltung", robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("moderation.access", "/admin");
  const [profiles, images, reports, verifications, listings, posts, ads] = await Promise.all([
    db.profile.count({ where: { status: "PENDING_REVIEW" } }),
    db.profileImage.count({ where: { status: "PENDING", profile: { status: { in: ["PUBLISHED", "PENDING_REVIEW"] } } } }),
    db.report.count({ where: { status: { in: ["OPEN", "IN_REVIEW"] } } }),
    db.identityVerification.count({ where: { status: "PENDING" } }),
    db.marketplaceListing.count({ where: { status: "PENDING_REVIEW" } }),
    db.forumPost.count({ where: { status: "PENDING_REVIEW" } }),
    db.adBooking.count({ where: { status: "PENDING_REVIEW" } }),
  ]);
  const items: (NavItem & { p: Permission })[] = [
    { href: "/admin", label: "Übersicht", icon: "LayoutDashboard", p: "moderation.access" },
    { href: "/admin/meldungen", label: "Meldungen", icon: "Gavel", p: "moderation.reports", badge: reports || undefined },
    { href: "/admin/sedcards", label: "Sedcards", icon: "FileText", p: "moderation.profiles", badge: profiles || undefined },
    { href: "/admin/bilder", label: "Bildprüfung", icon: "ImageIcon", p: "moderation.images", badge: images || undefined },
    { href: "/admin/verifizierungen", label: "Alters- & ID-Prüfung", icon: "ShieldCheck", p: "moderation.verifications", badge: verifications || undefined },
    { href: "/admin/marktplatz", label: "Marktplatz", icon: "Store", p: "moderation.marketplace", badge: listings || undefined },
    { href: "/admin/forum", label: "Forum-Moderation", icon: "MessagesSquare", p: "moderation.forum", badge: posts || undefined },
    { href: "/admin/werbung", label: "Werbung & Platzierungen", icon: "Megaphone", p: "moderation.ads", badge: ads || undefined },
    { href: "/admin/benutzer", label: "Benutzer & Sperrungen", icon: "Users", p: "admin.users" },
    { href: "/admin/rollen", label: "Rollen & Rechte", icon: "UserCog", p: "admin.roles" },
    { href: "/admin/kategorien", label: "Kategorien", icon: "FolderTree", p: "admin.categories" },
    { href: "/admin/filter", label: "Dynamische Filter", icon: "Filter", p: "admin.filters" },
    { href: "/admin/produkte", label: "Premium & Token-Pakete", icon: "Package", p: "admin.products" },
    { href: "/admin/transaktionen", label: "Transaktionen", icon: "Receipt", p: "admin.tokens" },
    { href: "/admin/zahlungen", label: "Zahlungen", icon: "CreditCard", p: "admin.payments" },
    { href: "/admin/statistiken", label: "Statistiken", icon: "BarChart3", p: "admin.stats" },
    { href: "/admin/protokoll", label: "Audit-Protokoll", icon: "ScrollText", p: "admin.audit" },
    { href: "/admin/einstellungen", label: "Systemeinstellungen", icon: "Settings", p: "admin.settings" },
  ];
  return (
    <div className="container-page py-8 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[250px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto">
          <div className="mb-4 hidden rounded-xl border border-gold/30 bg-gold/5 p-4 lg:block">
            <p className="text-xs uppercase tracking-[0.25em] text-gold">Top Girls Verwaltung</p>
            <p className="mt-1 text-sm text-white">{user.displayName}</p>
            <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
          </div>
          <SideNav title="Verwaltungsnavigation" items={items.filter((i) => can(user.role, i.p)).map(({ p: _p, ...i }) => i)} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
