"use client";
import { useActionState } from "react";
import { resendVerificationAction } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/form";

export function ResendVerificationButton() {
  const [state, action] = useActionState(async () => resendVerificationAction(), undefined);
  return (
    <form action={action} className="flex items-center gap-3">
      {state?.message ? <span className="text-xs">{state.message}</span> : null}
      <SubmitButton size="sm" variant="outline" pendingText="Wird gesendet …">Bestätigungs-E-Mail erneut senden</SubmitButton>
    </form>
  );
}
