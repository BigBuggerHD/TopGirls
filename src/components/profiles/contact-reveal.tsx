"use client";
import { useState } from "react";
import { BadgeCheck, MessageCircle, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/phone";
import { telegramLink, whatsappLink } from "@/lib/messenger";

type Contact = { phone: string | null; whatsapp: boolean; telegram: boolean; telegramUsername: string | null };

/** Telefonnummer erst nach Klick laden (Schutz vor Scraping, Klickstatistik). */
export function ContactReveal({ profileId, hasPhone }: { profileId: string; hasPhone: boolean }) {
  const [data, setData] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!hasPhone) return <p className="text-sm text-muted">Keine Kontaktdaten hinterlegt.</p>;
  async function reveal() {
    setError(null);
    const res = await fetch("/api/stats/click", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileId }) });
    if (!res.ok) return setError("Kontaktdaten konnten nicht geladen werden.");
    setData(await res.json());
  }
  return (
    <div className="space-y-2">
      {!data ? (
        <Button onClick={reveal} className="w-full" size="lg"><Phone /> Kontaktdaten anzeigen</Button>
      ) : data.phone ? (
        <>
          <Button asChild variant="outline" className="w-full" size="lg"><a href={`tel:${data.phone}`}><Phone /> {formatPhone(data.phone)}</a></Button>
          {data.whatsapp ? <Button asChild variant="outline" className="w-full" size="lg"><a href={whatsappLink(data.phone)} target="_blank" rel="noopener noreferrer nofollow"><MessageCircle /> WhatsApp</a></Button> : null}
          {data.telegram ? <Button asChild variant="outline" className="w-full" size="lg"><a href={telegramLink(data.phone, data.telegramUsername)!} target="_blank" rel="noopener noreferrer nofollow"><Send /> Telegram</a></Button> : null}
        </>
      ) : null}
      {data?.phone ? <p className="flex items-center justify-center gap-1.5 pt-1 text-xs text-success"><BadgeCheck className="size-3.5" /> Telefonnummer per SMS verifiziert</p> : null}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
