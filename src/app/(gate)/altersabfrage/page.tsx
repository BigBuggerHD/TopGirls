import type { Metadata } from "next";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Altersabfrage", robots: { index: false } };

export default async function AgeGatePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main id="inhalt" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(243,194,198,0.14),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(142,124,195,0.08),transparent_55%)]" />
      <div className="relative w-full max-w-xl text-center">
        <LogoMark className="mx-auto size-20" />
        <p className="mt-6 text-xs uppercase tracking-[0.5em] text-gold">Nur für Erwachsene</p>
        <h1 className="mt-4 font-display text-4xl text-white sm:text-5xl">
          Willkommen bei <span className="text-gold-gradient">Top Girls</span>
        </h1>
        <div className="gold-hairline mx-auto my-8 w-40" />
        <p className="font-display text-2xl text-foreground sm:text-3xl">Bist du mindestens 18 Jahre alt?</p>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
          Diese Website enthält Anzeigen mit erotischem Bezug und ist ausschließlich für volljährige Personen bestimmt.
          Mit deiner Bestätigung erklärst du, dass du mindestens 18 Jahre alt bist und die Inhalte freiwillig aufrufst.
        </p>
        <form action="/api/age-gate" method="post" className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <input type="hidden" name="next" value={safeRedirectPath(next)} />
          <button name="answer" value="yes" type="submit" className="h-14 rounded-md bg-gold px-8 text-sm font-semibold tracking-wider text-background transition-colors hover:bg-gold-light">
            JA, ICH BIN 18 ODER ÄLTER
          </button>
          <button name="answer" value="no" type="submit" className="h-14 rounded-md border border-border-strong px-8 text-sm font-semibold tracking-wider text-muted transition-colors hover:border-foreground hover:text-foreground">
            NEIN, ICH BIN UNTER 18
          </button>
        </form>
        <p className="mx-auto mt-10 max-w-md text-xs leading-relaxed text-subtle">
          Eltern können ihre Kinder mit Jugendschutzprogrammen schützen. Diese Website ist mit dem RTA-Label gekennzeichnet.
          Weitere Informationen: <Link href="/jugendschutz" className="text-gold underline-offset-2 hover:underline">Jugendschutz</Link> ·{" "}
          <Link href="/impressum" className="text-gold underline-offset-2 hover:underline">Impressum</Link> ·{" "}
          <Link href="/datenschutz" className="text-gold underline-offset-2 hover:underline">Datenschutz</Link>
        </p>
      </div>
    </main>
  );
}
