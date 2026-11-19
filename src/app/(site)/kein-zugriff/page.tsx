import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Kein Zugriff", robots: { index: false } };

export default function Page() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-4xl text-white">Kein Zugriff</h1>
      <p className="mt-4 text-muted">Für diesen Bereich hat dein Konto keine Berechtigung.</p>
      <Button asChild className="mt-8"><Link href="/dashboard">Zum Dashboard</Link></Button>
    </div>
  );
}
