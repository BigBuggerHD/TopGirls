"use client";
import { useActionState, useEffect, useRef } from "react";
import { createThreadAction, replyAction } from "@/actions/forum";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Textarea } from "@/components/ui/input";

export function NewThreadForm({ categoryId }: { categoryId: string }) {
  const [state, action] = useActionState(createThreadAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="categoryId" value={categoryId} />
      <Field label="Titel" name="title"><Input id="title" name="title" maxLength={120} /></Field>
      <Field label="Beitrag" name="body"><Textarea id="body" name="body" rows={6} maxLength={8000} /></Field>
      <SubmitButton pendingText="Wird erstellt …">Thema erstellen</SubmitButton>
    </form>
  );
}

export function ReplyForm({ threadId }: { threadId: string }) {
  const [state, action] = useActionState(replyAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="threadId" value={threadId} />
      <label htmlFor="reply" className="text-sm font-medium">Antworten</label>
      <Textarea id="reply" name="body" rows={4} maxLength={8000} />
      <SubmitButton pendingText="Wird gesendet …">Antwort veröffentlichen</SubmitButton>
    </form>
  );
}
