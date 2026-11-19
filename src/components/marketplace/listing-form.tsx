"use client";
import { useActionState } from "react";
import { saveListingAction } from "@/actions/marketplace";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";

type L = { id?: string; categoryId?: string; title?: string; description?: string; city?: string; priceCents?: number | null; priceUnit?: string | null; contactEmail?: string | null; contactPhone?: string | null };

export function ListingForm({ listing = {}, categories }: { listing?: L; categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState(saveListingAction, undefined);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      {listing.id ? <input type="hidden" name="id" value={listing.id} /> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Kategorie" name="categoryId" errors={e.categoryId} required>
          <Select id="categoryId" name="categoryId" defaultValue={listing.categoryId ?? ""}>
            <option value="" disabled>Bitte wählen</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Stadt" name="city" errors={e.city} required><Input id="city" name="city" defaultValue={listing.city ?? ""} /></Field>
      </div>
      <Field label="Titel" name="title" errors={e.title} required><Input id="title" name="title" defaultValue={listing.title ?? ""} maxLength={100} /></Field>
      <Field label="Beschreibung" name="description" errors={e.description} required hint="Keine Namen, Adressen oder Kontaktdaten Dritter. Stellenanzeigen müssen gesetzeskonform sein (u. a. AGG, keine Ausbeutung).">
        <Textarea id="description" name="description" rows={8} defaultValue={listing.description ?? ""} maxLength={5000} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Preis in € (optional)" name="price" errors={e.price}><Input id="price" name="price" inputMode="decimal" defaultValue={listing.priceCents != null ? (listing.priceCents / 100).toFixed(2).replace(".", ",") : ""} /></Field>
        <Field label="Preiseinheit" name="priceUnit" errors={e.priceUnit}><Input id="priceUnit" name="priceUnit" placeholder="z. B. pro Woche" defaultValue={listing.priceUnit ?? ""} /></Field>
        <Field label="Kontakt-E-Mail" name="contactEmail" errors={e.contactEmail}><Input id="contactEmail" name="contactEmail" type="email" defaultValue={listing.contactEmail ?? ""} /></Field>
        <Field label="Kontakt-Telefon" name="contactPhone" errors={e.contactPhone}><Input id="contactPhone" name="contactPhone" type="tel" defaultValue={listing.contactPhone ?? ""} /></Field>
      </div>
      <p className="text-xs text-subtle">Inserate werden vor der Veröffentlichung geprüft und sind 30 Tage sichtbar.</p>
      <SubmitButton pendingText="Wird gespeichert …">{listing.id ? "Änderungen einreichen" : "Inserat einreichen"}</SubmitButton>
    </form>
  );
}
