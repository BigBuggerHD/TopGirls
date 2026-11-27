"use client";
import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { BadgeCheck, CircleAlert } from "lucide-react";
import {
  saveProfileDataAction, saveContactDataAction, saveServiceAction, saveDescriptionAction, saveTimesPricesAction,
  sendPhoneCodeAction, verifyPhoneCodeAction, submitForReviewAction, uploadImagesAction, uploadModelConsentAction,
  type PhoneCodeState,
} from "@/actions/profiles";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/input";
import { WEEKDAYS } from "@/lib/labels";
import type { ActionState } from "@/lib/validation";
import type { PriceRow } from "@/lib/prices";
import type { Availability } from "@/lib/availability";
import { AvailabilityEditor, PriceEditor } from "./availability-price-editors";
import { FancySelect } from "@/components/ui/fancy-select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { districtsForCity } from "@/lib/districts";
import { WHATSAPP_GREETING } from "@/lib/messenger";
import { MEETING_FILTER_KEY, OUTCALL_PLACE_KEY, OUTCALL_VALUE } from "@/lib/meeting";

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

type BasicsProfile = { id: string; stageName: string; age: number | null; languages: string[]; categoryId: string; profileType: string; partnerName: string | null; age2: number | null };

/**
 * Schritt 1 „Profildaten“: oben Profiltyp, Kategorie, Name, Alter – darunter die Eigenschaften.
 * Bei „Duo“ erscheint sofort die zweite Person (ohne vorheriges Speichern).
 */
export function ProfileDataStep({ profile, categories, filters, values }: { profile: BasicsProfile; categories: { id: string; name: string; slug: string }[]; filters: FilterDef[]; values: AttrValue[] }) {
  const [duo, setDuo] = useState(profile.profileType === "DUO");
  const [name1, setName1] = useState(profile.stageName === "Neue Sedcard" ? "" : profile.stageName);
  const [name2, setName2] = useState(profile.partnerName ?? "");
  const [categoryId, setCategoryId] = useState(profile.categoryId);
  const categoryChanged = categoryId !== profile.categoryId;

  const valueOf = (filterId: string, person: number) => values.find((v) => v.filterId === filterId && v.person === person);
  const personal = filters.filter((f) => f.perPerson);
  const shared = filters.filter((f) => !f.perPerson);

  /** Ein Eingabefeld; Person 2 erhält das Präfix attr2_. */
  const field = (f: FilterDef, person: 1 | 2) => {
    const v = valueOf(f.id, person);
    const name = `${person === 2 ? "attr2" : "attr"}_${f.key}`;
    const aria = duo && f.perPerson ? `${f.label} (Person ${person})` : f.label;
    if (f.type === "SELECT") {
      return (
        <Field key={name} label={f.label} name={name} hint={f.helpText ?? undefined}>
          <FancySelect name={name} defaultValue={v?.optionIds[0] ?? ""} ariaLabel={aria} options={f.options.map((o) => ({ value: o.id, label: o.label }))} />
        </Field>
      );
    }
    if (f.type === "BOOLEAN") {
      return (
        <Field key={name} label={f.label} name={name}>
          <FancySelect name={name} defaultValue={v?.boolValue == null ? "" : v.boolValue ? "yes" : "no"} ariaLabel={aria} options={[{ value: "yes", label: "Ja" }, { value: "no", label: "Nein" }]} />
        </Field>
      );
    }
    if (f.type === "MULTISELECT") {
      return (
        <fieldset key={name} className="space-y-2 sm:col-span-2">
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
    return (
      <Field key={name} label={`${f.label}${f.unit ? ` (${f.unit})` : ""}`} name={name} hint={f.minValue != null && f.maxValue != null ? `${f.minValue}–${f.maxValue}` : undefined}>
        <Input id={name} name={name} type="number" min={f.minValue ?? undefined} max={f.maxValue ?? undefined} defaultValue={v?.numberValue ?? ""} aria-label={aria} />
      </Field>
    );
  };

  return (
    <StepForm action={saveProfileDataAction} profileId={profile.id}>
      {(s) => (
        <div className="space-y-8">
          {/* Grunddaten */}
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Profiltyp" name="profileType" required hint="Duo: zwei Personen mit jeweils eigenen Eigenschaften.">
                <FancySelect name="profileType" allowEmpty={false} defaultValue={profile.profileType} onChange={(v) => setDuo(v === "DUO")} ariaLabel="Profiltyp"
                  options={[{ value: "SINGLE", label: "Einzel" }, { value: "DUO", label: "Duo" }]} />
              </Field>
              <Field label="Kategorie" name="categoryId" errors={s?.errors?.categoryId} required>
                <FancySelect name="categoryId" allowEmpty={false} defaultValue={profile.categoryId} onChange={setCategoryId} ariaLabel="Kategorie" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-5">
              <Field label="Sedcard Name" name="stageName" errors={s?.errors?.stageName} required hint={duo ? "z. B. „Lara & Mia“ – der erste Name gilt für Person 1. Keine bürgerlichen Namen." : "Verwende keinen bürgerlichen Namen."}>
                <Input id="stageName" name="stageName" value={name1} onChange={(e) => setName1(e.target.value)} maxLength={40} />
              </Field>
              <Field label={duo ? "Alter Person 1" : "Alter"} name="age" errors={s?.errors?.age} hint="Mindestens 18.">
                <Input id="age" name="age" type="number" min={18} max={99} defaultValue={profile.age ?? ""} />
              </Field>
            </div>
            {duo ? (
              <div className="grid grid-cols-2 gap-4 sm:gap-5">
                <Field label="Name Person 2" name="partnerName" errors={s?.errors?.partnerName} hint="Künstlername der zweiten Person.">
                  <Input id="partnerName" name="partnerName" value={name2} onChange={(e) => setName2(e.target.value)} maxLength={40} />
                </Field>
                <Field label="Alter Person 2" name="age2" errors={s?.errors?.age2} hint="Mindestens 18.">
                  <Input id="age2" name="age2" type="number" min={18} max={99} defaultValue={profile.age2 ?? ""} />
                </Field>
              </div>
            ) : null}
          </div>

          {/* Eigenschaften */}
          <div className="space-y-5 border-t border-border pt-6">
            <h3 className="font-display text-xl text-white">Eigenschaften</h3>
            {categoryChanged ? (
              <p className="text-sm text-warning">Du hast die Kategorie geändert. Bitte speichere zuerst – danach erscheinen die passenden Eigenschaften.</p>
            ) : filters.length === 0 ? (
              <p className="text-sm text-muted">Für diese Kategorie sind keine Eigenschaften konfiguriert.</p>
            ) : (
              <>
                {duo ? (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {([1, 2] as const).map((person) => {
                      const label = person === 1 ? name1.split("&")[0]?.trim() : name2.trim();
                      return (
                        <section key={person} className="space-y-4 rounded-lg border border-border bg-background-alt p-4">
                          <h4 className="font-display text-lg text-white">Person {person}{label ? ` – ${label}` : ""}</h4>
                          <div className="grid gap-4 sm:grid-cols-2">{personal.map((f) => field(f, person))}</div>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">{personal.map((f) => field(f, 1))}</div>
                )}
                {shared.length ? <div className="grid gap-6 sm:grid-cols-2">{shared.map((f) => field(f, 1))}</div> : null}
              </>
            )}
          </div>
        </div>
      )}
    </StepForm>
  );
}

export function DescriptionStep({ profile }: { profile: { id: string; description: string; headline: string | null } }) {
  return (
    <StepForm action={saveDescriptionAction} profileId={profile.id}>
      {(s) => (
        <>
          <Field label="Slogan" name="headline" errors={s?.errors?.headline} hint="Kurze Überschrift unter deinem Namen, max. 90 Zeichen.">
            <Input id="headline" name="headline" defaultValue={profile.headline ?? ""} maxLength={90} />
          </Field>
          <Field label="Beschreibung" name="description" errors={s?.errors?.description} required hint="80–5.000 Zeichen. Keine Angaben, die gegen § 32 ProstSchG verstoßen, keine Hinweise auf Minderjährigkeit.">
            <Textarea id="description" name="description" rows={12} defaultValue={profile.description} maxLength={5000} />
          </Field>
        </>
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

type FilterDef = { id: string; key: string; label: string; type: "SELECT" | "MULTISELECT" | "BOOLEAN" | "NUMBER"; unit: string | null; helpText: string | null; minValue: number | null; maxValue: number | null; perPerson: boolean; options: { id: string; label: string; value?: string }[] };
type AttrValue = { filterId: string; person: number; numberValue: number | null; boolValue: boolean | null; optionIds: string[] };


type ContactDataProfile = {
  id: string; contactPhone: string | null; phoneVerified: boolean; whatsappEnabled: boolean; telegramEnabled: boolean; telegramUsername: string | null;
  street: string | null; houseNumber: string | null; postalCode: string | null; city: string; district: string | null; showAddress: boolean;
};

/** Schritt 2 „Kontaktdaten“: Telefonnummer (SMS-Bestätigung), Messenger, Adresse. */
export function ContactDataStep({ profile }: { profile: ContactDataProfile }) {
  const [phone, setPhone] = useState(profile.contactPhone ? formatPhone(profile.contactPhone) : "");
  const [verifiedPhone, setVerifiedPhone] = useState(profile.phoneVerified ? profile.contactPhone : null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [sms, setSms] = useState<PhoneCodeState | null>(null);
  const [pending, startTransition] = useTransition();
  const [city, setCity] = useState(profile.city);
  const [district, setDistrict] = useState(profile.district ?? "");
  const [showAddress, setShowAddress] = useState(profile.showAddress);
  const [telegram, setTelegram] = useState(profile.telegramEnabled);
  const verified = !!verifiedPhone && normalizePhone(phone) === verifiedPhone;
  const districts = districtsForCity(city);

  const sendCode = () => startTransition(async () => {
    const r = await sendPhoneCodeAction(profile.id, phone);
    setSms(r);
    if (r.verified && r.phone) setVerifiedPhone(r.phone);
    else if (r.ok) { setCodeSent(true); setCode(""); }
  });
  const verifyCode = () => startTransition(async () => {
    const r = await verifyPhoneCodeAction(profile.id, code);
    setSms(r);
    if (r.verified && r.phone) { setVerifiedPhone(r.phone); setCodeSent(false); setPhone(formatPhone(r.phone)); }
  });

  return (
    <StepForm action={saveContactDataAction} profileId={profile.id}>
      {(s) => (
        <div className="space-y-8">
          {/* Adresse */}
          <div className="space-y-5">
            <h3 className="font-display text-xl text-white">Adresse</h3>
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-4 sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-5">
              <Field label="Straße" name="street" errors={s?.errors?.street}>
                <Input id="street" name="street" autoComplete="address-line1" defaultValue={profile.street ?? ""} maxLength={80} />
              </Field>
              <Field label="Hausnr." name="houseNumber" errors={s?.errors?.houseNumber}>
                <Input id="houseNumber" name="houseNumber" defaultValue={profile.houseNumber ?? ""} maxLength={10} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
              <Field label="PLZ" name="postalCode" errors={s?.errors?.postalCode}>
                <Input id="postalCode" name="postalCode" autoComplete="postal-code" defaultValue={profile.postalCode ?? ""} inputMode="numeric" maxLength={5} />
              </Field>
              <Field label="Stadt" name="city" errors={s?.errors?.city} required>
                <Input id="city" name="city" autoComplete="address-level2" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} />
              </Field>
              <div className="col-span-2 sm:col-span-1">
                <Field label="Bezirk" name="district" errors={s?.errors?.district}>
                  {districts ? (
                    <FancySelect key={`d-${city.trim().toLowerCase()}`} name="district" ariaLabel="Bezirk" placeholder="Bezirk wählen" defaultValue={districts.includes(district) ? district : ""}
                      onChange={setDistrict} options={districts.map((d) => ({ value: d, label: d }))} />
                  ) : (
                    <Input id="district" name="district" value={district} onChange={(e) => setDistrict(e.target.value)} maxLength={80} />
                  )}
                </Field>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="showAddress" name="showAddress" checked={showAddress} onChange={setShowAddress} label="Adresse anzeigen" />
              <label htmlFor="showAddress" className="text-sm font-medium text-foreground">Adresse anzeigen: <span className={showAddress ? "text-gold" : "text-muted"}>{showAddress ? "Ja" : "Nein"}</span></label>
            </div>
            <p className="text-xs text-subtle">
              {showAddress ? "Straße, Hausnummer, PLZ, Stadt und Bezirk sind auf deiner Sedcard sichtbar." : "Öffentlich sind nur Bezirk und Stadt sichtbar – Straße und Hausnummer bleiben verborgen."}
            </p>
          </div>
          {/* Telefonnummer + Messenger nebeneinander */}
          <div className="grid gap-8 border-t border-border pt-6 md:grid-cols-2">
            {/* Telefonnummer */}
            <div className="min-w-0 space-y-3">
              <Field label="Telefonnummer" name="contactPhone" errors={s?.errors?.contactPhone} required hint="Wird per SMS-Code bestätigt. Pflicht für die Veröffentlichung.">
                <div className="flex flex-col gap-3 sm:flex-row md:flex-col xl:flex-row">
                  <Input id="contactPhone" name="contactPhone" type="tel" autoComplete="tel" placeholder="z. B. 0151 1234567" value={phone}
                    onChange={(e) => { setPhone(e.target.value); setCodeSent(false); setSms(null); }} className="min-w-0 sm:flex-1" />
                  {!verified ? (
                    <Button type="button" variant="outline" className="shrink-0" onClick={sendCode} disabled={pending || !phone.trim()}>{codeSent ? "Code erneut senden" : "Code per SMS senden"}</Button>
                  ) : null}
                </div>
              </Field>
              <p className={verified ? "flex items-center gap-1.5 text-sm text-success" : "flex items-center gap-1.5 text-sm text-warning"}>
                {verified ? <BadgeCheck className="size-4" /> : <CircleAlert className="size-4" />}
                {verified ? "Telefonnummer verifiziert" : "Telefonnummer noch nicht verifiziert"}
              </p>
              {codeSent && !verified ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="space-y-1.5">
                    <label htmlFor="smsCode" className="text-sm font-medium text-foreground">SMS-Code</label>
                    <Input id="smsCode" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6-stelliger Code" value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); verifyCode(); } }} className="sm:w-48" />
                  </div>
                  <Button type="button" onClick={verifyCode} disabled={pending || code.length !== 6}>Bestätigen</Button>
                </div>
              ) : null}
              {sms ? <p role="status" className={sms.ok ? "text-sm text-muted" : "text-sm text-danger"}>{sms.message}</p> : null}
              {sms?.devCode ? <p className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">Testmodus (noch kein SMS-Anbieter angebunden): Dein Code lautet <strong>{sms.devCode}</strong>.</p> : null}
            </div>

            {/* Messenger */}
            <div className="min-w-0 space-y-3">
              <div className="space-y-1.5">
                <Label>Messenger</Label>
                <div className="flex h-10 flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                  <label className="flex items-center gap-2"><Checkbox name="whatsappEnabled" defaultChecked={profile.whatsappEnabled} /> WhatsApp</label>
                  <label className="flex items-center gap-2"><Checkbox name="telegramEnabled" checked={telegram} onChange={(e) => setTelegram(e.target.checked)} /> Telegram</label>
                </div>
                <p className="text-xs text-subtle">Über deine Telefonnummer. WhatsApp öffnet für Kunden direkt den Chat mit dir, vorausgefüllt mit „{WHATSAPP_GREETING}“</p>
              </div>
              {telegram ? (
                <Field label="Telegram-Benutzername (empfohlen)" name="telegramUsername" errors={s?.errors?.telegramUsername}
                  hint="Mit Benutzername öffnet der Telegram-Button immer deinen Chat – auch wenn deine Nummer in Telegram nicht auffindbar ist.">
                  <Input id="telegramUsername" name="telegramUsername" placeholder="@benutzername" defaultValue={profile.telegramUsername ? `@${profile.telegramUsername}` : ""} maxLength={60} autoComplete="off" />
                </Field>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </StepForm>
  );
}

/** Häkchen im Pillen-Stil (für kurze Auswahllisten). */
function CheckPill({ name, value, label, defaultChecked, onChange }: { name: string; value: string; label: string; defaultChecked?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3.5 py-2 text-sm text-muted transition-colors hover:border-border-strong has-[:checked]:border-gold/70 has-[:checked]:bg-gold/10 has-[:checked]:text-foreground">
      <Checkbox name={name} value={value} defaultChecked={defaultChecked} onChange={onChange ? (e) => onChange(e.target.checked) : undefined} />
      {label}
    </label>
  );
}

/** Ein Service-Abschnitt als Karte: Überschrift, Zähler, „Alle auswählen“ und alle Punkte als anklickbare Felder. */
function ServiceGroup({ name, label, options, initial }: { name: string; label: string; options: { id: string; label: string }[]; initial: string[] }) {
  const [selected, setSelected] = useState<string[]>(initial);
  const all = selected.length === options.length;
  const toggle = (id: string, on: boolean) => setSelected((cur) => (on ? [...cur, id] : cur.filter((x) => x !== id)));
  return (
    <section className="rounded-xl border border-border bg-surface-2 p-3 sm:p-5" aria-label={label}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h4 className="font-display text-lg text-white">{label}</h4>
          <span className={selected.length ? "text-xs text-gold" : "text-xs text-subtle"}>{selected.length}/{options.length}</span>
        </div>
        <button type="button" onClick={() => setSelected(all ? [] : options.map((o) => o.id))}
          className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-gold/60 hover:text-gold">
          {all ? "Alle abwählen" : "Alle auswählen"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
        {options.map((o) => {
          const on = selected.includes(o.id);
          return (
            <label key={o.id} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[13px] leading-snug transition-colors sm:gap-2.5 sm:px-3 sm:text-sm",
              on ? "border-gold/60 bg-gold/10 text-foreground" : "border-border bg-background-alt/60 text-muted hover:border-border-strong hover:text-foreground")}>
              <Checkbox name={name} value={o.id} checked={on} onChange={(e) => toggle(o.id, e.target.checked)} />
              <span className="min-w-0 hyphens-auto [overflow-wrap:anywhere]" lang="de">{o.label}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

const SERVICE_TOP_KEYS = ["wen_treff_ich", MEETING_FILTER_KEY, OUTCALL_PLACE_KEY, "auch_mit"];

/** Schritt 3 „Service“: Wen treff ich?, Treffmöglichkeiten, Auch mit, dann jede Service-Gruppe als eigener Abschnitt mit Häkchen. */
export function ServiceStep({ profileId, filters, values }: { profileId: string; filters: FilterDef[]; values: AttrValue[] }) {
  const byKey = (k: string) => filters.find((f) => f.key === k);
  const sel = (f: FilterDef) => values.find((v) => v.filterId === f.id && v.person === 1)?.optionIds ?? [];
  const meeting = byKey(MEETING_FILTER_KEY);
  const outcallOpt = meeting?.options.find((o) => o.value === OUTCALL_VALUE);
  const [outcall, setOutcall] = useState(!!meeting && !!outcallOpt && sel(meeting).includes(outcallOpt.id));
  const place = byKey(OUTCALL_PLACE_KEY);
  const rest = filters.filter((f) => !SERVICE_TOP_KEYS.includes(f.key));
  const groups = rest.filter((f) => f.type === "MULTISELECT" || f.type === "SELECT");
  const flags = rest.filter((f) => f.type === "BOOLEAN");

  const pills = (f: FilterDef | undefined) =>
    f ? (
      <fieldset className="space-y-2.5">
        <legend className="mb-2.5 text-sm font-medium text-foreground/90">{f.label}</legend>
        <div className="flex flex-wrap gap-2">
          {f.options.map((o) => <CheckPill key={o.id} name={`attr_${f.key}`} value={o.id} label={o.label} defaultChecked={sel(f).includes(o.id)} />)}
        </div>
      </fieldset>
    ) : null;

  if (!filters.length) return <p className="text-sm text-muted">Für diese Kategorie sind keine Service-Angaben konfiguriert.</p>;

  return (
    <StepForm action={saveServiceAction} profileId={profileId}>
      {() => (
        <div className="space-y-8">
          <div className="space-y-6 rounded-xl border border-border bg-surface-2 p-4 sm:p-5">
            {pills(byKey("wen_treff_ich"))}
            {meeting ? (
              <fieldset>
                <legend className="mb-2.5 text-sm font-medium text-foreground/90">{meeting.label}</legend>
                <div className="flex flex-wrap items-center gap-2">
                  {meeting.options.map((o) => (
                    <CheckPill key={o.id} name={`attr_${meeting.key}`} value={o.id} label={o.label} defaultChecked={sel(meeting).includes(o.id)}
                      onChange={o.id === outcallOpt?.id ? setOutcall : undefined} />
                  ))}
                  {outcall && place ? (
                    <div className="w-44">
                      <FancySelect name={`attr_${place.key}`} ariaLabel="Outcall-Ort" placeholder="Wo?" defaultValue={sel(place)[0] ?? ""}
                        options={place.options.map((o) => ({ value: o.id, label: o.label }))} />
                    </div>
                  ) : null}
                </div>
              </fieldset>
            ) : null}
            {pills(byKey("auch_mit"))}
          </div>

          {/* Serviceleistungen: Abschnitt für Abschnitt als Karten, alle Punkte mit Häkchen */}
          {groups.length ? (
            <div className="space-y-4 border-t border-border pt-6">
              <h3 className="font-display text-2xl text-white">Serviceleistungen</h3>
              <div className="space-y-4">
                {groups.map((f) =>
                  f.type === "MULTISELECT" ? (
                    <ServiceGroup key={f.id} name={`attr_${f.key}`} label={f.label} options={f.options} initial={sel(f)} />
                  ) : (
                    <div key={f.id} className="rounded-xl border border-border bg-surface-2 p-4">
                      <p className="mb-3 font-display text-lg text-white">{f.label}</p>
                      <FancySelect name={`attr_${f.key}`} ariaLabel={f.label} defaultValue={sel(f)[0] ?? ""} options={f.options.map((o) => ({ value: o.id, label: o.label }))} />
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : null}
          {flags.length ? (
            <div className="space-y-3">
              {flags.map((f) => (
                <label key={f.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-4 py-3.5 text-sm transition-colors hover:border-border-strong has-[:checked]:border-gold/60 has-[:checked]:bg-gold/10">
                  <Checkbox name={`attr_${f.key}`} value="yes" defaultChecked={values.find((v) => v.filterId === f.id && v.person === 1)?.boolValue === true} /> {f.label}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </StepForm>
  );
}

type Avail = Availability;
/** Schritt 6 „Zeiten & Preise“. */
export function TimesPricesStep({ profile }: { profile: { id: string; availability: Avail; prices: PriceRow[]; priceNote: string | null } }) {
  return (
    <StepForm action={saveTimesPricesAction} profileId={profile.id}>
      {() => (
        <>
          <AvailabilityEditor initial={profile.availability} />
          <PriceEditor initial={profile.prices} />
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
