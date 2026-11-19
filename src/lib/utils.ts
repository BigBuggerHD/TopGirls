import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const umlauts: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss", Ä: "ae", Ö: "oe", Ü: "ue" };

export function slugify(input: string): string {
  return input
    .replace(/[äöüßÄÖÜ]/g, (c) => umlauts[c] ?? c)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function randomSuffix(len = 5): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (const b of bytes) s += chars[b % chars.length];
  return s;
}

/** Nur relative, interne Pfade erlauben (Open-Redirect-Schutz). */
export function safeRedirectPath(p: string | null | undefined, fallback = "/"): string {
  if (!p || typeof p !== "string") return fallback;
  if (!p.startsWith("/") || p.startsWith("//") || p.startsWith("/\\")) return fallback;
  return p;
}
