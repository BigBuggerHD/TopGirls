import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
      <p className="font-display text-7xl text-gold-gradient">404</p>
      <h1 className="mt-4 font-display text-3xl text-white">Seite nicht gefunden</h1>
      <Link href="/" className="mt-8 text-gold underline">Zur Startseite</Link>
    </main>
  );
}
