import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/logo";

export const metadata: Metadata = { title: "Zugang verweigert", robots: { index: false } };

export default function DeniedPage() {
  return (
    <main id="inhalt" className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-lg text-center">
        <LogoMark className="mx-auto size-16 opacity-60" />
        <h1 className="mt-8 font-display text-3xl text-white">Zugang nicht möglich</h1>
        <p className="mt-6 text-lg leading-relaxed text-foreground">
          Der Zugang zu Top Girls ist nur Personen gestattet, die mindestens 18 Jahre alt sind.
        </p>
        <p className="mt-8 text-sm text-muted">
          Du hast Fragen oder brauchst Unterstützung? Die <strong className="text-foreground">Nummer gegen Kummer</strong> ist kostenlos und anonym erreichbar: <a href="tel:116111" className="text-gold">116 111</a>.
        </p>
        <p className="mt-8 text-xs text-subtle">
          <Link href="/jugendschutz" className="hover:text-gold">Jugendschutz</Link> · <Link href="/impressum" className="hover:text-gold">Impressum</Link> · <Link href="/datenschutz" className="hover:text-gold">Datenschutz</Link>
        </p>
      </div>
    </main>
  );
}
