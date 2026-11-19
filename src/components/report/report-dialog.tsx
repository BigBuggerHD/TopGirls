"use client";
import { useActionState } from "react";
import { Flag } from "lucide-react";
import { submitReportAction } from "@/actions/report";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select, Textarea } from "@/components/ui/input";

const REASONS: [string, string][] = [
  ["MINOR", "Verdacht auf Minderjährigkeit"],
  ["COERCION", "Verdacht auf Zwang oder Menschenhandel"],
  ["NON_CONSENSUAL_IMAGE", "Bild ohne Einwilligung veröffentlicht"],
  ["IDENTITY_MISUSE", "Identitätsmissbrauch / Fake-Profil"],
  ["FRAUD", "Betrug"],
  ["PERSONAL_DATA", "Veröffentlichung privater Daten"],
  ["DEFAMATION", "Unbelegte Anschuldigung"],
  ["ILLEGAL_CONTENT", "Sonstiger rechtswidriger Inhalt"],
  ["SPAM", "Spam / Werbung"],
  ["OTHER", "Sonstiges"],
];

export function ReportForm({ targetType, targetId, loggedIn }: { targetType: string; targetId: string; loggedIn: boolean }) {
  const [state, action] = useActionState(submitReportAction, undefined);
  if (state?.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <Field label="Grund" name="reason" errors={state?.errors?.reason}>
        <Select id="reason" name="reason" defaultValue="">
          <option value="" disabled>Bitte auswählen</option>
          {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <Field label="Beschreibung" name="details" errors={state?.errors?.details} hint="Bitte beschreibe möglichst genau, warum der Inhalt rechtswidrig ist oder gegen die Richtlinien verstößt.">
        <Textarea id="details" name="details" rows={4} />
      </Field>
      {!loggedIn ? (
        <Field label="E-Mail für Rückfragen (optional)" name="reporterEmail" errors={state?.errors?.reporterEmail}>
          <Input id="reporterEmail" name="reporterEmail" type="email" />
        </Field>
      ) : null}
      <p className="text-xs text-subtle">Bei akuter Gefahr wende dich bitte sofort an die Polizei (110). Hilfe für Betroffene von Menschenhandel findest du auf unserer Seite „Hilfe für Betroffene“.</p>
      <SubmitButton className="w-full" pendingText="Wird gesendet …">Meldung absenden</SubmitButton>
    </form>
  );
}

export function ReportDialog({ targetType, targetId, loggedIn, label = "Melden" }: { targetType: string; targetId: string; loggedIn: boolean; label?: string }) {
  return (
    <Dialog>
      <DialogTrigger className="inline-flex items-center gap-1.5 text-xs text-subtle hover:text-danger">
        <Flag className="size-3.5" /> {label}
      </DialogTrigger>
      <DialogContent title="Inhalt melden" description="Meldungen werden vertraulich behandelt und vorrangig geprüft.">
        <ReportForm targetType={targetType} targetId={targetId} loggedIn={loggedIn} />
      </DialogContent>
    </Dialog>
  );
}
