"use client";
import * as React from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "./button";
import { Label } from "./label";
import { Alert } from "./alert";
import type { ActionState } from "@/lib/validation";

export function SubmitButton({ children, pendingText = "Wird gespeichert …", ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending ? pendingText : children}
    </Button>
  );
}

export function Field({ label, name, errors, hint, children, required }: { label: string; name: string; errors?: string[]; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>
        {label}
        {required ? <span className="ml-0.5 text-gold" aria-hidden>*</span> : null}
      </Label>
      {children}
      {hint && !errors?.length ? <p className="text-xs text-subtle">{hint}</p> : null}
      {errors?.map((e) => (
        <p key={e} id={`${name}-error`} className="text-xs text-danger">{e}</p>
      ))}
    </div>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return <Alert variant={state.ok ? "success" : "error"}>{state.message}</Alert>;
}
