"use client";
import Image from "next/image";
import { useActionState } from "react";
import {
  saveAttributesAction, saveBasicsAction, saveContactAction, saveDescriptionAction, saveLocationAction,
  submitForReviewAction, uploadImagesAction, uploadModelConsentAction,
} from "@/actions/profiles";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { WEEKDAYS } from "@/lib/labels";
import type { ActionState } from "@/lib/validation";
import { centsToInput, type PriceRow } from "@/lib/prices";

type Action = (s: ActionState, fd: FormData) => Promise<ActionState>;

function StepForm({ action, profileId, children, last = false }: { action: Action; profileId: string; children: (s: ActionState) => React.ReactNode; last?: boolean }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="profileId" value={profileId} />
      {children(state)}
      <div className="flex flex-wrap gap-3 border-t border-border pt-5">
        <SubmitButton variant="outline">Speichern</SubmitButton>
        {!last ? <SubmitButton name="continue" value="1">Speichern & weiter</SubmitButton> : null}
      </div>
    </form>
  );
}

export function BasicsStep({ profile, categories }: { profile: { id: string; stageName: string; headline: string | null; age: number | null; languages: string[]; categoryId: string }; categories: { id: string; name: string; slug: string }[] }) {
  return (
    <StepForm action={saveBasicsAction} profileId={profile.id}>
      {(s) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Künstlername" name="stageName" errors={s?.errors?.stageName} required hint="Verwende keinen bürgerlichen Namen.">
              <Input id="stageName" name="stageName" defaultValue={profile.stageName === "Neue Sedcard" ? "" : profile.stageName} maxLength={40} />
            </Field>
            <Field label="Kategorie" name="categoryId" errors={s?.errors?.categoryId} required>
              <Select id="categoryId" name="categoryId" defaultValue={profile.categoryId}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Kurzbeschreibung / Slogan" name="headline" errors={s?.errors?.headline}>
            <Input id="headline" name="headline" defaultValue={profile.headline ?? ""} maxLength={90} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Alter" name="age" errors={s?.errors?.age} hint="Pflicht für persönliche Profile. Mindestens 18.">
              <Input id="age" name="age" type="number" min={18} max={99} defaultValue={profile.age ?? ""} />
            </Field>
            <Field label="Sprachen" name="languages" errors={s?.errors?.languages} hint="Kommagetrennt, z. B. Deutsch, Englisch">
              <Input id="languages" name="languages" defaultValue={profile.languages.join(", ")} />
            </Field>
          </div>
        </>
      )}
    </StepForm>
  );
}

export function DescriptionStep({ profile }: { profile: { id: string; description: string } }) {
  return (
    <StepForm action={saveDescriptionAction} profileId={profile.id}>
      {(s) => (
        <Field label="Beschreibung" name="description" errors={s?.errors?.description} required hint="80–5.000 Zeichen. Keine Angaben, die gegen § 32 ProstSchG verstoßen, keine Hinweise auf Minderjährigkeit.">
          <Textarea id="description" name="description" rows={12} defaultValue={profile.description} maxLength={5000} />
        </Field>
      )}
    </StepForm>
  );
}

export function ImagesStep({ profileId, images, onDelete, onCover }: {
  profileId: string;
  images: { id: string; thumb: string; status: string; isCover: boolean; rejectReason: string | null }[];
  onDelete: (fd: FormData) => Promise<void>;
  onCover: (fd: FormData) => Promise<void>;
}) {
  const statusLabel: Record<string, string> = { PENDING: "In Prüfung", APPROVED: "Freigegeben", REJECTED: "Abgelehnt" };
  return (
    <div className="space-y-8">
      {images.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="overflow-hidden rounded-lg border border-border bg-surface-2">
              <div className="relative aspect-[3/4]">
                <Image src={img.thumb} alt="" fill className="object-cover" unoptimized />
                <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${img.status === "APPROVED" ? "bg-success/80 text-black" : img.status === "REJECTED" ? "bg-danger/90 text-white" : "bg-warning/90 text-black"}`}>{statusLabel[img.status]}</span>
                {img.isCover ? <span className="absolute right-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold uppercase text-background">Titelbild</span> : null}
              </div>
              {img.rejectReason ? <p className="px-2 pt-2 text-[11px] text-danger">{img.rejectReason.replace("[SPERRE] ", "")}</p> : null}
              <div className="flex gap-1 p-2">
                {!img.isCover ? (
                  <form action={onCover} className="flex-1"><input type="hidden" name="imageId" value={img.id} /><button className="w-full rounded px-2 py-1 text-xs text-muted hover:bg-surface-3 hover:text-gold">Als Titelbild</button></form>
                ) : <span className="flex-1" />}
                <form action={onDelete}><input type="hidden" name="imageId" value={img.id} /><button className="rounded px-2 py-1 text-xs text-danger hover:bg-danger/10">Löschen</button></form>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <StepForm action={uploadImagesAction} profileId={profileId}>
        {() => (
          <>
            <Field label="Bilder hochladen" name="images" hint="JPEG, PNG oder WebP, max. 10 MB je Bild, mind. 300 × 300 Pixel. Metadaten (z. B. GPS) werden automatisch entfernt.">
              <Input id="images" name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="h-auto py-2 file:mr-4 file:rounded file:border-0 file:bg-gold/15 file:px-3 file:py-1 file:text-gold" />
            </Field>
            <label className="flex items-start gap-3 rounded-lg border border-border bg-background-alt p-4 text-sm">
              <Checkbox name="imageConsent" className="mt-0.5" />
              <span>Ich bestätige, dass ich alle Rechte an den Bildern besitze, die abgebildete Person volljährig ist und der Veröffentlichung ausdrücklich und freiwillig zugestimmt hat. Pornografische Darstellungen sind nicht erlaubt.</span>
            </label>
          </>
        )}
      </StepForm>
    </div>
  );
}

type FilterDef = { id: string; key: string; label: string; type: "SELECT" | "MULTISELECT" | "BOOLEAN" | "NUMBER"; unit: string | null; helpText: string | null; minValue: number | null; maxValue: number | null; options: { id: string; label: string }[] };
type AttrValue = { filterId: string; numberValue: number | null; boolValue: boolean | null; optionIds: string[] };

export function AttributesStep({ profileId, filters, values }: { profileId: string; filters: FilterDef[]; values: AttrValue[] }) {
  const byFilter = new Map(values.map((v) => [v.filterId, v]));
  if (filters.length === 0) return <p className="text-sm text-muted">Für diese Kategorie sind keine Eigenschaften konfiguriert.</p>;
  return (
    <StepForm action={saveAttributesAction} profileId={profileId}>
      {() => (
        <div className="grid gap-6 sm:grid-cols-2">
          {filters.map((f) => {
            const v = byFilter.get(f.id);
            const name = `attr_${f.key}`;
            if (f.type === "SELECT") {
              return (
                <Field key={f.id} label={f.label} name={name} hint={f.helpText ?? undefined}>
                  <Select id={name} name={name} defaultValue={v?.optionIds[0] ?? ""}>
                    <option value="">Keine Angabe</option>
                    {f.options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </Select>
                </Field>
              );
            }
            if (f.type === "MULTISELECT") {
              return (
                <fieldset key={f.id} className="space-y-2 sm:col-span-2">
                  <legend className="text-sm font-medium">{f.label}</legend>
                  <div className="flex flex-wrap gap-2">
                    {f.options.map((o) => (
                      <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm has-[:checked]:border-gold has-[:checked]:bg-gold/10 has-[:checked]:text-gold">
                        <input type="checkbox" name={name} value={o.id} defaultChecked={v?.optionIds.includes(o.id)} className="sr-only" />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            }
            if (f.type === "BOOLEAN") {
              return (
                <Field key={f.id} label={f.label} name={name}>
                  <Select id={name} name={name} defaultValue={v?.boolValue == null ? "" : v.boolValue ? "yes" : "no"}>
                    <option value="">Keine Angabe</option>
                    <option value="yes">Ja</option>
                    <option value="no">Nein</option>
                  </Select>
                </Field>
              );
            }
            return (
              <Field key={f.id} label={`${f.label}${f.unit ? ` (${f.unit})` : ""}`} name={name} hint={f.minValue != null && f.maxValue != null ? `${f.minValue}–${f.maxValue}` : undefined}>
                <Input id={name} name={name} type="number" min={f.minValue ?? undefined} max={f.maxValue ?? undefined} defaultValue={v?.numberValue ?? ""} />
              </Field>
            );
          })}
        </div>
      )}
    </StepForm>
  );
}

export function LocationStep({ profile }: { profile: { id: string; city: string; postalCode: string | null; region: string | null } }) {
  return (
    <StepForm action={saveLocationAction} profileId={profile.id}>
      {(s) => (
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Stadt" name="city" errors={s?.errors?.city} required>
            <Input id="city" name="city" defaultValue={profile.city} />
          </Field>
          <Field label="Postleitzahl" name="postalCode" errors={s?.errors?.postalCode}>
            <Input id="postalCode" name="postalCode" defaultValue={profile.postalCode ?? ""} inputMode="numeric" maxLength={5} />
          </Field>
          <Field label="Bundesland / Region" name="region" errors={s?.errors?.region}>
            <Input id="region" name="region" defaultValue={profile.region ?? ""} />
          </Field>
          <p className="text-xs text-subtle sm:col-span-3">Gib aus Sicherheitsgründen keine genaue Wohnadresse an. Die Stadt genügt für die Suche.</p>
        </div>
      )}
    </StepForm>
  );
}

type Avail = Record<string, { active?: boolean; from?: string; to?: string }>;
export function ContactStep({ profile }: { profile: { id: string; contactPhone: string | null; contactWhatsapp: string | null; contactEmail: string | null; contactWebsite: string | null; showPhone: boolean; allowMessages: boolean; availabilityNote: string | null; availability: Avail; prices: PriceRow[]; priceNote: string | null } }) {
  return (
    <StepForm action={saveContactAction} profileId={profile.id}>
      {(s) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Telefon" name="contactPhone" errors={s?.errors?.contactPhone}><Input id="contactPhone" name="contactPhone" type="tel" defaultValue={profile.contactPhone ?? ""} /></Field>
            <Field label="WhatsApp" name="contactWhatsapp" errors={s?.errors?.contactWhatsapp}><Input id="contactWhatsapp" name="contactWhatsapp" type="tel" defaultValue={profile.contactWhatsapp ?? ""} /></Field>
            <Field label="E-Mail" name="contactEmail" errors={s?.errors?.contactEmail}><Input id="contactEmail" name="contactEmail" type="email" defaultValue={profile.contactEmail ?? ""} /></Field>
            <Field label="Website" name="contactWebsite" errors={s?.errors?.contactWebsite}><Input id="contactWebsite" name="contactWebsite" type="url" placeholder="https://" defaultValue={profile.contactWebsite ?? ""} /></Field>
          </div>
          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:gap-8">
            <label className="flex items-center gap-2"><Checkbox name="showPhone" defaultChecked={profile.showPhone} /> Telefon/WhatsApp öffentlich anzeigen</label>
            <label className="flex items-center gap-2"><Checkbox name="allowMessages" defaultChecked={profile.allowMessages} /> Nachrichten über Top Girls erlauben</label>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Verfügbarkeit</legend>
            {WEEKDAYS.map(([k, label]) => {
              const a = profile.availability[k] ?? {};
              return (
                <div key={k} className="grid grid-cols-[110px_auto_1fr_1fr] items-center gap-3 rounded-md bg-background-alt px-3 py-2 text-sm">
                  <span>{label}</span>
                  <Checkbox name={`av_${k}_active`} defaultChecked={!!a.active} aria-label={`${label} verfügbar`} />
                  <Input type="time" name={`av_${k}_from`} defaultValue={a.from ?? "10:00"} aria-label={`${label} von`} className="h-9" />
                  <Input type="time" name={`av_${k}_to`} defaultValue={a.to ?? "20:00"} aria-label={`${label} bis`} className="h-9" />
                </div>
              );
            })}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Preise</legend>
            <p className="text-xs text-subtle">Bis zu 8 Positionen, z. B. „1 Stunde“. Trage den Preis für Incall (bei dir) und/oder Outcall (Haus-/Hotelbesuch) ein. Angezeigt wird nur, was du unter „Treffpunkt“ (Schritt 4) gewählt hast.</p>
            <div className="hidden grid-cols-[1fr_130px_130px] gap-3 text-xs text-subtle sm:grid"><span>Bezeichnung</span><span>Incall</span><span>Outcall</span></div>
            {Array.from({ length: 8 }, (_, i) => {
              const r = profile.prices[i];
              const euro = (name: string, value: number | null | undefined, label: string) => (
                <div className="relative">
                  <Input name={name} defaultValue={centsToInput(value)} inputMode="decimal" placeholder={label} aria-label={`Preis ${i + 1} – ${label} in Euro`} className="pr-8" />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-subtle">€</span>
                </div>
              );
              return (
                <div key={i} className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_130px_130px]">
                  <Input name={`price_label_${i}`} defaultValue={r?.label ?? ""} placeholder={i === 0 ? "z. B. 1 Stunde" : ""} maxLength={60} aria-label={`Preis ${i + 1} – Bezeichnung`} className="col-span-2 sm:col-span-1" />
                  {euro(`price_in_${i}`, r?.incallCents, "Incall")}
                  {euro(`price_out_${i}`, r?.outcallCents, "Outcall")}
                </div>
              );
            })}
          </fieldset>
          <Field label="Hinweis zu den Preisen" name="priceNote">
            <Input id="priceNote" name="priceNote" defaultValue={profile.priceNote ?? ""} maxLength={300} placeholder="z. B. Preise sind Richtwerte, Details nach Absprache" />
          </Field>
        </>
      )}
    </StepForm>
  );
}

export function ModelConsentUpload({ profileId }: { profileId: string }) {
  const [state, action] = useActionState(uploadModelConsentAction, undefined);
  return (
    <form action={action} className="space-y-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
      <FormMessage state={state} />
      <input type="hidden" name="profileId" value={profileId} />
      <p className="text-sm text-warning">Für Profile, die über eine Agentur, einen Club oder ein Studio veröffentlicht werden, ist ein Altersnachweis und eine unterschriebene Einwilligung der dargestellten Person erforderlich.</p>
      <Input name="document" type="file" accept="image/jpeg,image/png,image/webp" className="h-auto py-2" aria-label="Nachweis hochladen" />
      <SubmitButton size="sm" variant="outline" pendingText="Wird hochgeladen …">Nachweis hochladen</SubmitButton>
    </form>
  );
}

export function SubmitStep({ profileId, ready, status }: { profileId: string; ready: boolean; status: string }) {
  const [state, action] = useActionState(submitForReviewAction, undefined);
  const canSubmit = ["DRAFT", "REJECTED", "PAUSED", "EXPIRED"].includes(status);
  if (!canSubmit) {
    return <p className="text-sm text-muted">{status === "PENDING_REVIEW" ? "Deine Sedcard wird gerade geprüft." : status === "PUBLISHED" ? "Deine Sedcard ist veröffentlicht." : "Diese Sedcard kann derzeit nicht eingereicht werden."}</p>;
  }
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="profileId" value={profileId} />
      <div className="space-y-3 rounded-lg border border-border bg-background-alt p-4 text-sm">
        {[
          ["consentAdult", "Die dargestellte Person ist mindestens 18 Jahre alt."],
          ["consentVoluntary", "Die Anzeige wird freiwillig und ohne Druck oder Zwang Dritter veröffentlicht."],
          ["consentRights", "Für alle Bilder liegen die Rechte und die Einwilligung der abgebildeten Person vor."],
          ["consentLaw", "Die Anzeige entspricht den gesetzlichen Vorgaben (u. a. ProstSchG) und den Richtlinien von Top Girls. Eine erforderliche Anmeldebescheinigung liegt vor."],
        ].map(([n, l]) => (
          <label key={n} className="flex items-start gap-3"><Checkbox name={n} className="mt-0.5" /><span>{l}</span></label>
        ))}
      </div>
      <SubmitButton disabled={!ready} size="lg" pendingText="Wird eingereicht …">{status === "PAUSED" ? "Wieder aktivieren" : "Veröffentlichung beantragen"}</SubmitButton>
      {!ready ? <p className="text-xs text-subtle">Bitte vervollständige zuerst alle Punkte der Checkliste.</p> : null}
    </form>
  );
}
