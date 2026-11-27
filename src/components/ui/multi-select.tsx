"use client";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Dropdown mit Häkchen (Mehrfachauswahl). Bleibt beim Anklicken geöffnet.
 * Sendet für jede gewählte Option ein verstecktes Feld `name=<value>`.
 */
export function MultiSelect({
  name, options, defaultValue = [], ariaLabel, placeholder = "Keine Auswahl",
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string[];
  ariaLabel?: string;
  placeholder?: string;
}) {
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const toggle = (v: string) => setSelected((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));
  // Anzeige in der Reihenfolge der Optionen
  const labels = options.filter((o) => selected.includes(o.value)).map((o) => o.label);
  return (
    <>
      {selected.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          aria-label={ariaLabel}
          className={cn(
            "group flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-background-alt px-3 text-left text-sm transition-colors hover:border-border-strong focus:border-gold/70 focus:outline-none data-[state=open]:border-gold/70",
            labels.length ? "text-foreground" : "text-subtle",
          )}
        >
          <span className="truncate">{labels.length ? labels.join(", ") : placeholder}</span>
          <span className="flex shrink-0 items-center gap-2">
            {labels.length ? <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">{labels.length}</span> : null}
            <ChevronDown className="size-4 text-gold transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </span>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 max-h-80 w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 overflow-y-auto rounded-lg border border-border bg-surface p-1.5 shadow-2xl shadow-black/60"
          >
            {options.map((o) => {
              const on = selected.includes(o.value);
              return (
                <DropdownMenu.CheckboxItem
                  key={o.value}
                  checked={on}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => toggle(o.value)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-surface-3 data-[state=checked]:text-gold"
                >
                  <span className={cn("flex size-4 shrink-0 items-center justify-center rounded border", on ? "border-gold bg-gold text-background" : "border-border-strong")}>
                    {on ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  {o.label}
                </DropdownMenu.CheckboxItem>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
