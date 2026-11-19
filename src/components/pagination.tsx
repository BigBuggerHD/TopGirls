import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, pages, basePath, params }: { page: number; pages: number; basePath: string; params: Record<string, string | string[] | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "seite" || v == null) continue;
      (Array.isArray(v) ? v : [v]).forEach((x) => sp.append(k, x));
    }
    if (p > 1) sp.set("seite", String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const cls = "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-border px-3 text-sm";
  return (
    <nav aria-label="Seitennavigation" className="mt-10 flex items-center justify-center gap-2">
      {page > 1 ? <Link href={href(page - 1)} className={`${cls} hover:border-gold`} aria-label="Vorherige Seite"><ChevronLeft className="size-4" /></Link> : null}
      <span className="px-3 text-sm text-muted">Seite {page} von {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className={`${cls} hover:border-gold`} aria-label="Nächste Seite"><ChevronRight className="size-4" /></Link> : null}
    </nav>
  );
}
