"use client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
/** Minuten in 5er-Schritten */
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

/**
 * Uhrzeitfeld im Dropdown-Design: freie Eingabe (Stunden/Minuten wie beim normalen Zeitfeld)
 * oder Auswahl über die Spalten „Std“ und „Min“.
 */
export function TimeField({ value, onChange, disabled = false, ariaLabel, className }: { value: string; onChange: (v: string) => void; disabled?: boolean; ariaLabel: string; className?: string }) {
  const [h = "00", m = "00"] = value.split(":");
  const column = (title: string, items: string[], current: string, pick: (v: string) => void, keepOpen: boolean) => (
    <div className="flex flex-col">
      <p className="px-2 pb-1 text-center text-[11px] uppercase tracking-wider text-subtle">{title}</p>
      <div
        className="max-h-56 w-14 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        ref={(el) => {
          const item = el?.querySelector<HTMLElement>('[data-current="true"]');
          if (el && item) requestAnimationFrame(() => { el.scrollTop = item.offsetTop - el.offsetTop - el.clientHeight / 2 + item.clientHeight / 2; });
        }}
      >
        {items.map((v) => (
          <DropdownMenu.Item
            key={v}
            data-current={v === current}
            onSelect={(e) => { if (keepOpen) e.preventDefault(); pick(v); }}
            className={cn(
              "cursor-pointer rounded-md px-2 py-1.5 text-center text-sm outline-none transition-colors data-[highlighted]:bg-surface-3",
              v === current ? "bg-gold/10 text-gold" : "text-foreground",
            )}
          >
            {v}
          </DropdownMenu.Item>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "flex h-10 w-full items-center rounded-md border border-border bg-background-alt pl-3 text-sm transition-colors hover:border-border-strong focus-within:border-gold/70",
        disabled && "cursor-not-allowed opacity-40 hover:border-border",
        className,
      )}
    >
      <input
        type="time"
        step={300}
        value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="min-w-0 flex-1 bg-transparent text-foreground outline-none [color-scheme:dark] disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:hidden"
      />
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          disabled={disabled}
          aria-label={`${ariaLabel} auswählen`}
          className="group flex h-full items-center px-3 text-gold outline-none disabled:cursor-not-allowed"
        >
          <Clock className="size-4 transition-opacity group-hover:opacity-80" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={6} className="z-50 flex gap-1 rounded-lg border border-border bg-surface p-1.5 shadow-2xl shadow-black/60">
            {column("Std", HOURS, h, (v) => onChange(`${v}:${m}`), true)}
            <div className="w-px bg-border" />
            {column("Min", MINUTES.includes(m) ? MINUTES : [...MINUTES, m].sort(), m, (v) => onChange(`${h}:${v}`), false)}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
