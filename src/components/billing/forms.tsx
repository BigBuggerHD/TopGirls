"use client";
import { useActionState, useMemo, useState } from "react";
import { bookAdAction, bookPromotionAction, startCheckoutAction } from "@/actions/billing";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PromotionForm({ profileId, type, cost, label, requestId, disabled }: { profileId: string; type: string; cost: number; label: string; requestId: string; disabled?: boolean }) {
  const [state, action] = useActionState(bookPromotionAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="requestId" value={requestId} />
      <SubmitButton size="sm" variant="outline" className="h-auto min-h-9 w-full whitespace-normal py-1.5 leading-tight" disabled={disabled} pendingText="Wird gebucht …">{label} · {cost} Token</SubmitButton>
      {state?.message ? <p className={cn("text-xs", state.ok ? "text-success" : "text-danger")}>{state.message}</p> : null}
    </form>
  );
}

type Placement = { id: string; name: string; description: string | null; tokenCostPerDay: number; width: number; height: number };
export function AdBookingForm({ placements, profiles, requestId, balance }: { placements: Placement[]; profiles: { id: string; stageName: string }[]; requestId: string; balance: number }) {
  const [state, action] = useActionState(bookAdAction, undefined);
  const [pid, setPid] = useState(placements[0]?.id ?? "");
  const [days, setDays] = useState(7);
  const p = placements.find((x) => x.id === pid);
  const cost = (p?.tokenCostPerDay ?? 0) * (days || 0);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  return (
    <form action={action} className="space-y-5" encType="multipart/form-data">
      <FormMessage state={state} />
      <input type="hidden" name="requestId" value={requestId} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Werbefläche" name="placementId" required>
          <Select id="placementId" name="placementId" value={pid} onChange={(e) => setPid(e.target.value)}>
            {placements.map((x) => <option key={x.id} value={x.id}>{x.name} – {x.tokenCostPerDay} Token/Tag</option>)}
          </Select>
        </Field>
        <Field label="Verknüpfte Sedcard (optional)" name="profileId">
          <Select id="profileId" name="profileId" defaultValue="">
            <option value="">Keine</option>
            {profiles.map((x) => <option key={x.id} value={x.id}>{x.stageName}</option>)}
          </Select>
        </Field>
        <Field label="Titel" name="title" required><Input id="title" name="title" maxLength={60} /></Field>
        <Field label="Untertitel" name="subtitle"><Input id="subtitle" name="subtitle" maxLength={120} /></Field>
        <Field label="Startdatum" name="startDate" required><Input id="startDate" name="startDate" type="date" min={today} defaultValue={today} /></Field>
        <Field label="Laufzeit (Tage)" name="days" required><Input id="days" name="days" type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} /></Field>
        <Field label="Ziel-URL (optional)" name="targetUrl" hint="Interner Pfad (z. B. /profil/…) oder https://-Adresse. Ohne Angabe: verknüpfte Sedcard.">
          <Input id="targetUrl" name="targetUrl" />
        </Field>
        <Field label="Bannerbild" name="image" hint={p ? `Empfohlen: ${p.width} × ${p.height} px, JPEG/PNG/WebP` : undefined}>
          <Input id="image" name="image" type="file" accept="image/jpeg,image/png,image/webp" className="h-auto py-2" />
        </Field>
      </div>
      {p?.description ? <p className="text-xs text-subtle">{p.description}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gold/30 bg-gold/5 px-4 py-3">
        <p className="text-sm">Kosten: <strong className="text-gold">{cost.toLocaleString("de-DE")} Token</strong> <span className="text-subtle">(Guthaben: {balance.toLocaleString("de-DE")})</span></p>
        <SubmitButton disabled={cost > balance} pendingText="Wird gebucht …">Kostenpflichtig buchen</SubmitButton>
      </div>
      {cost > balance ? <p className="text-xs text-warning">Dein Guthaben reicht für diese Buchung nicht aus.</p> : null}
    </form>
  );
}

type Pkg = { id: string; name: string; tokens: number; bonusTokens: number; priceCents: number };
type Provider = { provider: string; label: string; available: boolean; reason: string | null };
export function CheckoutForm({ packages, providers, idempotencyKey }: { packages: Pkg[]; providers: Provider[]; idempotencyKey: string }) {
  const [state, action] = useActionState(startCheckoutAction, undefined);
  const [pkg, setPkg] = useState(packages[1]?.id ?? packages[0]?.id);
  const firstAvailable = providers.find((p) => p.available)?.provider ?? "";
  const [prov, setProv] = useState(firstAvailable);
  const euro = (c: number) => (c / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" });
  return (
    <form action={action} className="space-y-6">
      <FormMessage state={state} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Paket wählen</legend>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {packages.map((p) => (
            <label key={p.id} className={cn("cursor-pointer rounded-xl border p-4 transition-colors", pkg === p.id ? "border-gold bg-gold/5" : "border-border hover:border-border-strong")}>
              <input type="radio" name="packageId" value={p.id} checked={pkg === p.id} onChange={() => setPkg(p.id)} className="sr-only" />
              <span className="block text-xs uppercase tracking-wider text-subtle">{p.name}</span>
              <span className="mt-1 block font-display text-3xl text-white">{(p.tokens + p.bonusTokens).toLocaleString("de-DE")}</span>
              <span className="block text-xs text-muted">Token{p.bonusTokens ? ` (inkl. ${p.bonusTokens} Bonus)` : ""}</span>
              <span className="mt-3 block text-lg text-gold">{euro(p.priceCents)}</span>
              <span className="block text-[11px] text-subtle">inkl. MwSt.</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm font-medium">Zahlungsart</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {providers.map((p) => (
            <label key={p.provider} className={cn("flex items-start gap-3 rounded-xl border p-4", !p.available ? "cursor-not-allowed opacity-50" : "cursor-pointer", prov === p.provider ? "border-gold bg-gold/5" : "border-border")}>
              <input type="radio" name="provider" value={p.provider} disabled={!p.available} checked={prov === p.provider} onChange={() => setProv(p.provider)} className="mt-1 accent-[#F3C2C6]" />
              <span>
                <span className="block text-sm font-medium text-white">{p.label}</span>
                {!p.available ? <span className="block text-xs text-subtle">{p.reason}</span> : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs leading-relaxed text-subtle">Mit Klick auf „Zahlungspflichtig bestellen“ schließt du einen Kaufvertrag über digitale Token ab. Du stimmst ausdrücklich zu, dass die Token sofort bereitgestellt werden, und nimmst zur Kenntnis, dass dein Widerrufsrecht damit erlischt (§ 356 Abs. 5 BGB).</p>
      <SubmitButton size="lg" disabled={!prov} pendingText="Weiterleitung …">Zahlungspflichtig bestellen</SubmitButton>
    </form>
  );
}
