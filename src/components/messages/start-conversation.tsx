"use client";
import { useActionState } from "react";
import { startConversationAction } from "@/actions/messages";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Textarea } from "@/components/ui/input";

export function StartConversationForm({ profileId }: { profileId: string }) {
  const [state, action] = useActionState(startConversationAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="profileId" value={profileId} />
      <label htmlFor="msg-body" className="text-sm font-medium">Nachricht senden</label>
      <Textarea id="msg-body" name="body" rows={3} placeholder="Deine Nachricht …" maxLength={4000} />
      <SubmitButton variant="outline" className="w-full" pendingText="Wird gesendet …">Nachricht senden</SubmitButton>
    </form>
  );
}
