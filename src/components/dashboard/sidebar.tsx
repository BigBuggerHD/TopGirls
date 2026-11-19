"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Bell, Coins, CreditCard, FileText, Filter, FolderTree, Gavel, Gem, Image as ImageIcon, LayoutDashboard, Megaphone,
  MessageSquare, MessagesSquare, Package, Receipt, ScrollText, Settings, ShieldCheck, Store, UserCog, Users, type LucideIcon,
} from "lucide-react";

/** Icons werden per Name übergeben, da Komponenten nicht von Server- an Client-Komponenten serialisiert werden können. */
const ICONS = {
  BarChart3, Bell, Coins, CreditCard, FileText, Filter, FolderTree, Gavel, Gem, ImageIcon, LayoutDashboard, Megaphone,
  MessageSquare, MessagesSquare, Package, Receipt, ScrollText, Settings, ShieldCheck, Store, UserCog, Users,
} satisfies Record<string, LucideIcon>;
export type IconName = keyof typeof ICONS;
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: IconName; badge?: number };

export function SideNav({ items, title }: { items: NavItem[]; title: string }) {
  const path = usePathname();
  return (
    <nav aria-label={title} className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
      {items.map(({ href, label, icon, badge }) => {
        const Icon = ICONS[icon];
        const active = href === "/dashboard" || href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active ? "bg-gold/10 text-gold" : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{label}</span>
            {badge ? <span className="ml-auto rounded-full bg-gold px-1.5 text-[10px] font-semibold text-background">{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
