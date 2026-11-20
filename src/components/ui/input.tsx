import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-md border border-border bg-background-alt px-3 py-2 text-sm text-foreground placeholder:text-subtle transition-colors focus:border-gold/70 focus:outline-none focus:ring-1 focus:ring-gold/40 disabled:opacity-50 aria-[invalid=true]:border-danger";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(base, "h-10", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(base, "min-h-28", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(base, "h-10 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23F3C2C6%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat pr-9", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={cn("size-4 shrink-0 rounded border-border accent-[#F3C2C6]", className)} {...props} />;
}
