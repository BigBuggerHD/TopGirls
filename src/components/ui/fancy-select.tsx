"use client";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Auswahlfeld im Stil der Website (statt der System-Auswahlliste des Browsers).
 * Der gewählte Wert wird über ein verstecktes Feld mit dem Formular gesendet.
 */
export function FancySelect({
  name, options, defaultValue = "", placeholder = "Keine Angabe", allowEmpty = true, ariaLabel, className, onChange, disabled = false,
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  placeholder?: string;
  /** false: keine „Keine Angabe“-Option (Pflichtauswahl) */
  allowEmpty?: boolean;
  ariaLabel?: string;
  className?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const all = allowEmpty ? [{ value: "", label: placeholder }, ...options] : options;
  const current = all.find((o) => o.value === value) ?? all[0];
  const choose = (v: string) => {
    setValue(v);
    onChange?.(v);
  };
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "group flex h-10 w-full items-center justify-between rounded-md border border-border bg-background-alt px-3 text-left text-sm transition-colors hover:border-border-strong focus:border-gold/70 focus:outline-none data-[state=open]:border-gold/70",
            value ? "text-foreground" : "text-subtle",
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border",
            className,
          )}
        >
          <span className="truncate">{current.label}</span>
          <ChevronDown className="size-4 shrink-0 text-gold transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            // Lange Listen (z. B. Uhrzeiten): beim Öffnen zur aktuellen Auswahl scrollen
            ref={(el) => {
              const item = el?.querySelector<HTMLElement>('[data-state="checked"]');
              if (el && item) requestAnimationFrame(() => { el.scrollTop = item.offsetTop - el.clientHeight / 2 + item.clientHeight / 2; });
            }}
            align="start"
            sideOffset={6}
            className="z-50 max-h-72 w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto rounded-lg border border-border bg-surface p-1.5 shadow-2xl shadow-black/60"
          >
            <DropdownMenu.RadioGroup value={value} onValueChange={choose}>
              {all.map((o) => (
                <DropdownMenu.RadioItem
                  key={o.value || "__none"}
                  value={o.value}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm outline-none transition-colors data-[highlighted]:bg-surface-3 data-[state=checked]:text-gold",
                    o.value ? "text-foreground" : "text-subtle",
                  )}
                >
                  {o.label}
                  <DropdownMenu.ItemIndicator><Check className="size-4" /></DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
