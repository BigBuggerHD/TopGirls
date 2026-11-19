"use client";
import { useActionState, useEffect, useRef } from "react";
import { sendMessageAction } from "@/actions/messages";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Textarea } from "@/components/ui/input";

export function MessageForm({ conversationId, disabled }: { conversationId: string; disabled?: boolean }) {
  const [state, action] = useActionState(sendMessageAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      {state && !state.ok ? <FormMessage state={state} /> : null}
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor="reply" className="sr-only">Antwort</label>
      <Textarea id="reply" name="body" rows={3} placeholder={disabled ? "Diese Unterhaltung ist blockiert." : "Antwort schreiben …"} disabled={disabled} maxLength={4000} />
      <div className="flex justify-end"><SubmitButton disabled={disabled} pendingText="Wird gesendet …">Senden</SubmitButton></div>
    </form>
  );
}
