import Link from "next/link";
import { Bell, LayoutDashboard, Shield } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { MobileNav } from "./mobile-nav";
import { UserMenu } from "./user-menu";

export const NAV = [
  { href: "/", label: "Startseite" },
  { href: "/frauen", label: "Frauen" },
  { href: "/online-inserate", label: "Online-Inserate" },
  { href: "/clubs", label: "Clubs" },
  { href: "/massagen", label: "Massagen" },
  { href: "/marktplatz", label: "Marktplatz" },
];

export async function Header() {
  const user = await getCurrentUser();
  const unread = user ? await db.notification.count({ where: { userId: user.id, readAt: null } }) : 0;
  const staff = user && can(user.role, "moderation.access");

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="container-page flex min-h-18 items-center justify-between gap-4 py-2">
        <Link href="/" aria-label="Top Girls – Startseite" className="shrink-0">
          <Logo />
        </Link>
        <nav aria-label="Hauptnavigation" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:text-gold">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {staff ? (
                <Button asChild variant="ghost" size="icon" className="hidden sm:inline-flex">
                  <Link href="/admin" aria-label="Verwaltung"><Shield /></Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="icon" className="relative">
                <Link href="/dashboard/benachrichtigungen" aria-label={`Benachrichtigungen (${unread} ungelesen)`}>
                  <Bell />
                  {unread > 0 ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-gold" /> : null}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link href="/dashboard"><LayoutDashboard /> Dashboard</Link>
              </Button>
              <UserMenu name={user.displayName} email={user.email} tokens={user.tokenBalance} isStaff={!!staff} />
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm"><Link href="/login">Login</Link></Button>
              <Button asChild size="sm"><Link href="/registrieren">Registrieren</Link></Button>
            </div>
          )}
          <MobileNav loggedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
