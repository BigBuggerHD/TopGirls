import Image from "next/image";
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

/**
 * Hauptlogo (Bildmarke mit Schriftzug „TOP GIRLS“).
 * Die Datei hat einen transparenten Hintergrund und passt sich so dem Header an.
 */
export function Logo({ className }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image src="/brand/logo-topgirls.png" alt="Top Girls" width={404} height={192} priority unoptimized className="h-14 w-auto sm:h-16" />
    </span>
  );
}
