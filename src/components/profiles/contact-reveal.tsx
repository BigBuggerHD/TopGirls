"use client";
import { useState } from "react";
import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Telefonnummer erst nach Klick laden (Schutz vor Scraping, Klickstatistik). */
export function ContactReveal({ profileId, hasPhone, hasWhatsapp }: { profileId: string; hasPhone: boolean; hasWhatsapp: boolean }) {
  const [data, setData] = useState<{ phone: string | null; whatsapp: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!hasPhone && !hasWhatsapp) return null;
  async function reveal() {
    setError(null);
    const res = await fetch("/api/stats/click", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId }) });
    if (!res.ok) return setError("Kontaktdaten konnten nicht geladen werden.");
    setData(await res.json());
  }
  if (!data) {
    return (
      <div>
        <Button onClick={reveal} className="w-full" size="lg"><Phone /> Kontaktdaten anzeigen</Button>
        {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {data.phone ? <Button asChild variant="outline" className="w-full" size="lg"><a href={`tel:${data.phone.replace(/[^\d+]/g, "")}`}><Phone /> {data.phone}</a></Button> : null}
      {data.whatsapp ? <Button asChild variant="outline" className="w-full" size="lg"><a href={`https://wa.me/${data.whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noopener noreferrer nofollow"><MessageCircle /> WhatsApp</a></Button> : null}
    </div>
  );
}
