"use client";
import { useActionState } from "react";
import { changePasswordAction, deleteAccountAction, requestVerificationAction, updateAccountAction } from "@/actions/account";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { Checkbox, Input, Select } from "@/components/ui/input";

export function AccountForm({ displayName, companyName, business }: { displayName: string; companyName: string | null; business: boolean }) {
  const [state, action] = useActionState(updateAccountAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Anzeigename" name="displayName" errors={state?.errors?.displayName}><Input id="displayName" name="displayName" defaultValue={displayName} /></Field>
      {business ? <Field label="Firmenname" name="companyName" errors={state?.errors?.companyName}><Input id="companyName" name="companyName" defaultValue={companyName ?? ""} /></Field> : null}
      <SubmitButton>Speichern</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Aktuelles Passwort" name="current" errors={state?.errors?.current}><Input id="current" name="current" type="password" autoComplete="current-password" /></Field>
      <Field label="Neues Passwort" name="password" errors={state?.errors?.password}><Input id="password" name="password" type="password" autoComplete="new-password" /></Field>
      <Field label="Neues Passwort wiederholen" name="passwordConfirm" errors={state?.errors?.passwordConfirm}><Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" /></Field>
      <SubmitButton>Passwort ändern</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Passwort" name="del-password"><Input id="del-password" name="password" type="password" autoComplete="current-password" /></Field>
      <Field label="Zur Bestätigung LÖSCHEN eingeben" name="confirm"><Input id="confirm" name="confirm" autoComplete="off" /></Field>
      <SubmitButton variant="destructive" pendingText="Wird gelöscht …">Konto endgültig löschen</SubmitButton>
    </form>
  );
}

export function VerificationForm() {
  const [state, action] = useActionState(requestVerificationAction, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-5" encType="multipart/form-data">
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Dokumentart" name="docType" errors={state?.errors?.docType}>
          <Select id="docType" name="docType" defaultValue="ID_CARD">
            <option value="ID_CARD">Personalausweis</option>
            <option value="PASSPORT">Reisepass</option>
            <option value="PROSTSCHG_CERT">Anmeldebescheinigung (ProstSchG)</option>
            <option value="BUSINESS_REGISTRATION">Gewerbeanmeldung / Handelsregister</option>
          </Select>
        </Field>
        <Field label="Geburtsjahr" name="birthYear" errors={state?.errors?.birthYear}><Input id="birthYear" name="birthYear" type="number" min={1920} /></Field>
        <Field label="Bild des Dokuments" name="document" errors={state?.errors?.document} hint="Nicht benötigte Daten (z. B. Zugangsnummer) darfst du schwärzen.">
          <Input id="document" name="document" type="file" accept="image/jpeg,image/png,image/webp" className="h-auto py-2" />
        </Field>
        <Field label="Selfie mit Dokument (optional)" name="selfie"><Input id="selfie" name="selfie" type="file" accept="image/jpeg,image/png,image/webp" className="h-auto py-2" /></Field>
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-border bg-background-alt p-4 text-sm">
        <Checkbox name="consent" className="mt-0.5" />
        <span>Ich willige ein, dass Top Girls meine Unterlagen ausschließlich zur Alters- und Identitätsprüfung verarbeitet. Die Bilder werden nach Abschluss der Prüfung gelöscht; gespeichert bleibt nur das Prüfergebnis.</span>
      </label>
      {state?.errors?.consent?.map((m) => <p key={m} className="text-xs text-danger">{m}</p>)}
      <SubmitButton pendingText="Wird übermittelt …">Zur Prüfung einreichen</SubmitButton>
    </form>
  );
}
