"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "Startseite" },
  { href: "/frauen", label: "Frauen" },
  { href: "/online-inserate", label: "Online-Inserate" },
  { href: "/clubs", label: "Clubs" },
  { href: "/massagen", label: "Massagen" },
  { href: "/marktplatz", label: "Marktplatz" },
  { href: "/suche", label: "Suche" },
];

export function MobileNav({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menü öffnen"><Menu /></Button>
      </DialogTrigger>
      <DialogContent title="Menü">
        <nav className="flex flex-col" aria-label="Mobile Navigation">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="border-b border-border py-3 text-lg text-foreground hover:text-gold">
              {n.label}
            </Link>
          ))}
          <div className="mt-6 grid grid-cols-2 gap-3">
            {loggedIn ? (
              <Button asChild className="col-span-2"><Link href="/dashboard" onClick={() => setOpen(false)}>Dashboard</Link></Button>
            ) : (
              <>
                <Button asChild variant="outline"><Link href="/login" onClick={() => setOpen(false)}>Login</Link></Button>
                <Button asChild><Link href="/registrieren" onClick={() => setOpen(false)}>Registrieren</Link></Button>
              </>
            )}
          </div>
        </nav>
      </DialogContent>
    </Dialog>
  );
}
