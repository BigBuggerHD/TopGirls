"use client";
import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, requestPasswordResetAction, resetPasswordAction } from "@/actions/auth";
import { Input, Select, Checkbox } from "@/components/ui/input";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="E-Mail-Adresse" name="email" errors={state?.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!state?.errors?.email} />
      </Field>
      <Field label="Passwort" name="password" errors={state?.errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end">
        <Link href="/passwort-vergessen" className="text-xs text-gold hover:underline">Passwort vergessen?</Link>
      </div>
      <SubmitButton className="w-full" size="lg" pendingText="Anmeldung läuft …">Anmelden</SubmitButton>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, undefined);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Anzeigename" name="displayName" errors={e.displayName} required>
          <Input id="displayName" name="displayName" autoComplete="nickname" />
        </Field>
        <Field label="Geburtsdatum" name="birthDate" errors={e.birthDate} required hint="Wird nur zur Altersprüfung verwendet und nicht gespeichert.">
          <Input id="birthDate" name="birthDate" type="date" />
        </Field>
      </div>
      <Field label="Firmenname (optional)" name="companyName" errors={e.companyName} hint="Nur für Agenturen, Clubs, Studios und andere Unternehmen.">
        <Input id="companyName" name="companyName" autoComplete="organization" />
      </Field>
      <Field label="E-Mail-Adresse" name="email" errors={e.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Passwort" name="password" errors={e.password} required hint="Mind. 10 Zeichen, Groß-/Kleinbuchstaben und Ziffer.">
          <Input id="password" name="password" type="password" autoComplete="new-password" />
        </Field>
        <Field label="Passwort wiederholen" name="passwordConfirm" errors={e.passwordConfirm} required>
          <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" />
        </Field>
      </div>
      <div className="space-y-3 rounded-lg border border-border bg-background-alt p-4 text-sm">
        <label className="flex items-start gap-3">
          <Checkbox name="adult" className="mt-0.5" />
          <span>Ich bestätige, dass ich mindestens 18 Jahre alt bin. <span className="text-gold">*</span></span>
        </label>
        {e.adult?.map((m) => <p key={m} className="text-xs text-danger">{m}</p>)}
        <label className="flex items-start gap-3">
          <Checkbox name="terms" className="mt-0.5" />
          <span>Ich akzeptiere die <Link href="/agb" target="_blank" className="text-gold underline">AGB</Link>, die <Link href="/richtlinien" target="_blank" className="text-gold underline">Richtlinien</Link> und habe die <Link href="/datenschutz" target="_blank" className="text-gold underline">Datenschutzerklärung</Link> gelesen. <span className="text-gold">*</span></span>
        </label>
        {e.terms?.map((m) => <p key={m} className="text-xs text-danger">{m}</p>)}
      </div>
      <p className="text-xs leading-relaxed text-subtle">
        Ein Konto für alle: Anbieterinnen, Agenturen, Clubs, Studios und weitere Inserenten. Vor der Veröffentlichung von Inseraten ist eine Identitäts- und Altersprüfung erforderlich. Anbieterinnen in Deutschland benötigen eine gültige Anmeldebescheinigung nach dem Prostituiertenschutzgesetz.
      </p>
      <SubmitButton className="w-full" size="lg" pendingText="Konto wird erstellt …">Konto erstellen</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field label="E-Mail-Adresse" name="email" errors={state?.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" />
      </Field>
      <SubmitButton className="w-full" pendingText="Wird gesendet …">Link anfordern</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="Neues Passwort" name="password" errors={state?.errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" />
      </Field>
      <Field label="Passwort wiederholen" name="passwordConfirm" errors={state?.errors?.passwordConfirm}>
        <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" />
      </Field>
      <SubmitButton className="w-full">Passwort speichern</SubmitButton>
    </form>
  );
}
