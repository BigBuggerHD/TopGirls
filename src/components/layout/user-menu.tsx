"use client";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Coins, LogOut, Settings, User } from "lucide-react";
import { logoutAction } from "@/actions/auth";

export function UserMenu({ name, email, tokens, isStaff }: { name: string; email: string; tokens: number; isStaff: boolean }) {
  const item = "flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-surface-3";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="flex size-10 items-center justify-center rounded-full border border-gold/40 bg-surface-2 font-display text-lg text-gold" aria-label="Benutzermenü">
        {name.slice(0, 1).toUpperCase()}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-50 w-64 rounded-lg border border-border bg-background-alt p-1.5 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-xs text-subtle">{email}</p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-gold"><Coins className="size-3.5" /> {tokens.toLocaleString("de-DE")} Token</p>
          </div>
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item asChild><Link href="/dashboard" className={item}><User className="size-4" /> Dashboard</Link></DropdownMenu.Item>
          <DropdownMenu.Item asChild><Link href="/dashboard/einstellungen" className={item}><Settings className="size-4" /> Kontoeinstellungen</Link></DropdownMenu.Item>
          {isStaff ? <DropdownMenu.Item asChild><Link href="/admin" className={item}><Settings className="size-4" /> Verwaltung</Link></DropdownMenu.Item> : null}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <form action={logoutAction}>
            <DropdownMenu.Item asChild>
              <button type="submit" className={item + " w-full"}><LogOut className="size-4" /> Abmelden</button>
            </DropdownMenu.Item>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
