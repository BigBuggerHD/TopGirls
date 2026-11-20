"use client";
import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

/**
 * Kategorie-Auswahl im Stil der Website (statt des System-Dropdowns des Browsers).
 * Der gewählte Wert wird über ein verstecktes Feld mit dem Suchformular gesendet.
 */
export function CategorySelect({ categories, name = "kategorie" }: { categories: { slug: string; name: string }[]; name?: string }) {
  const [value, setValue] = useState("");
  const options = [{ slug: "", name: "Alle Kategorien" }, ...categories];
  const current = options.find((o) => o.slug === value) ?? options[0];
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          aria-label="Kategorie wählen"
          className="group flex h-12 w-full items-center justify-between rounded-md border border-transparent bg-background-alt px-3 text-left text-sm text-foreground transition-colors hover:border-border-strong focus:border-gold/70 focus:outline-none data-[state=open]:border-gold/70"
        >
          <span>{current.name}</span>
          <ChevronDown className="size-4 text-gold transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 w-[var(--radix-dropdown-menu-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface p-1.5 shadow-2xl shadow-black/60"
          >
            <DropdownMenu.RadioGroup value={value} onValueChange={setValue}>
              {options.map((o) => (
                <DropdownMenu.RadioItem
                  key={o.slug || "alle"}
                  value={o.slug}
                  className="flex cursor-pointer items-center justify-between rounded-md px-3 py-2.5 text-sm text-foreground outline-none transition-colors data-[highlighted]:bg-surface-3 data-[state=checked]:text-gold"
                >
                  {o.name}
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
