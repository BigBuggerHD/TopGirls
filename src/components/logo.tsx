import { cn } from "@/lib/utils";

/** Top-Girls-Bildmarke: stilisierte Krone über einem „TG“-Monogramm in Gold. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-9", className)} aria-hidden="true">
      <defs>
        <linearGradient id="tg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FBE3E5" />
          <stop offset="0.5" stopColor="#F3C2C6" />
          <stop offset="1" stopColor="#D99BA2" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22.5" fill="none" stroke="url(#tg-gold)" strokeWidth="1" />
      <path d="M14 15.5 L18 19 L24 12.5 L30 19 L34 15.5 L32.5 22 H15.5 Z" fill="url(#tg-gold)" />
      <text x="24" y="36.5" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="13" letterSpacing="1" fill="url(#tg-gold)">TG</text>
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-2xl tracking-[0.22em] text-gold-gradient">TOP GIRLS</span>
          <span className="mt-0.5 text-[9px] uppercase tracking-[0.45em] text-subtle">Premium-Anzeigen</span>
        </span>
      )}
      <span className="sr-only">Top Girls</span>
    </span>
  );
}
