import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-7xl text-gold-gradient">404</p>
      <h1 className="mt-4 font-display text-3xl text-white">Seite nicht gefunden</h1>
      <p className="mt-3 text-muted">Die Seite existiert nicht oder ist nicht mehr verfügbar.</p>
      <Button asChild className="mt-8"><Link href="/">Zur Startseite</Link></Button>
    </div>
  );
}
