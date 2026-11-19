import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { can, ROLE_LABELS } from "@/lib/rbac";
import { db } from "@/lib/db";
import { countUnreadConversations } from "@/lib/queries/messages";
import { SideNav, type NavItem } from "@/components/dashboard/sidebar";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("dashboard.access");
  const [unreadConvs, unreadNotes] = await Promise.all([
    countUnreadConversations(user.id),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  const items: (NavItem & { show: boolean })[] = [
    { href: "/dashboard", label: "Übersicht", icon: "LayoutDashboard", show: true },
    { href: "/dashboard/sedcards", label: can(user.role, "profile.multiple") ? "Sedcards" : "Meine Sedcard", icon: "FileText", show: can(user.role, "profile.own") },
    { href: "/dashboard/anzeigen", label: "Anzeigenverwaltung", icon: "Gem", show: can(user.role, "promotion.book") },
    { href: "/dashboard/werbung", label: "Werbeplatzierungen", icon: "Megaphone", show: can(user.role, "ads.book") },
    { href: "/dashboard/tokens", label: "Token-Guthaben", icon: "Coins", show: can(user.role, "tokens.buy") },
    { href: "/dashboard/statistiken", label: "Statistiken", icon: "BarChart3", show: can(user.role, "stats.view") },
    { href: "/dashboard/marktplatz", label: "Marktplatz", icon: "Store", show: can(user.role, "marketplace.post") },
    { href: "/dashboard/nachrichten", label: "Nachrichten", icon: "MessageSquare", show: can(user.role, "messages.use"), badge: unreadConvs || undefined },
    { href: "/forum", label: "Forum", icon: "MessagesSquare", show: can(user.role, "forum.use") },
    { href: "/dashboard/benachrichtigungen", label: "Benachrichtigungen", icon: "Bell", show: true, badge: unreadNotes || undefined },
    { href: "/dashboard/verifizierung", label: "Verifizierung", icon: "ShieldCheck", show: can(user.role, "verification.request") },
    { href: "/dashboard/zahlungen", label: "Zahlungen", icon: "CreditCard", show: can(user.role, "tokens.buy") },
    { href: "/dashboard/einstellungen", label: "Kontoeinstellungen", icon: "Settings", show: true },
  ];

  return (
    <div className="container-page py-8 lg:py-10">
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 hidden rounded-xl border border-border bg-surface p-4 lg:block">
            <p className="truncate font-medium text-white">{user.companyName ?? user.displayName}</p>
            <p className="text-xs text-gold">{ROLE_LABELS[user.role]}</p>
            {can(user.role, "tokens.buy") ? <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"> {user.tokenBalance.toLocaleString("de-DE")} Token</p> : null}
          </div>
          <SideNav title="Dashboard-Navigation" items={items.filter((i) => i.show).map(({ show: _s, ...i }) => i)} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
