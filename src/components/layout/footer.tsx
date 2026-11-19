import Link from "next/link";
import { Logo } from "@/components/logo";

const cols = [
  { title: "Entdecken", links: [["/frauen", "Frauen"], ["/online-inserate", "Online-Inserate"], ["/clubs", "Clubs"], ["/massagen", "Massagen"], ["/marktplatz", "Marktplatz"], ["/suche", "Suche"]] },
  { title: "Für Inserenten", links: [["/registrieren", "Konto erstellen"], ["/dashboard", "Dashboard"], ["/werbung", "Werbung & Preise"], ["/richtlinien", "Inserats-Richtlinien"]] },
  { title: "Rechtliches", links: [["/impressum", "Impressum"], ["/datenschutz", "Datenschutz"], ["/agb", "AGB"], ["/jugendschutz", "Jugendschutz"]] },
  { title: "Sicherheit", links: [["/melden", "Inhalt melden"], ["/hilfe", "Hilfe für Betroffene"], ["/richtlinien", "Community-Richtlinien"]] },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-background-alt">
      <div className="container-page grid gap-10 py-14 md:grid-cols-5">
        <div className="md:col-span-1">
          <Logo />
          <p className="mt-4 text-xs leading-relaxed text-subtle">
            Top Girls ist ein Anzeigen- und Werbeportal für volljährige Anbieterinnen und Unternehmen. Top Girls vermittelt keine Dienstleistungen.
          </p>
          <p className="mt-4 inline-flex items-center rounded border border-danger/50 px-2 py-0.5 text-xs font-semibold text-danger">18+</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="mb-3 text-xs uppercase tracking-[0.2em] text-gold">{c.title}</p>
            <ul className="space-y-2">
              {c.links.map(([href, label]) => (
                <li key={href + label}><Link href={href} className="text-sm text-muted hover:text-gold">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-subtle sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Top Girls. Alle Rechte vorbehalten.</p>
          <p>Hinweise auf Zwang, Ausbeutung oder Minderjährigkeit? <Link href="/melden" className="text-gold hover:underline">Jetzt vertraulich melden</Link></p>
        </div>
      </div>
    </footer>
  );
}
