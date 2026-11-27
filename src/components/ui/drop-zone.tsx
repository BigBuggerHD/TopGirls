"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Prüft Dateityp und Größe im Browser (der Server prüft zusätzlich Inhalt, Mindestgröße usw.). */
export function checkImageFiles(files: File[]): { ok: File[]; errors: string[] } {
  const ok: File[] = [];
  const errors: string[] = [];
  for (const f of files) {
    if (!IMAGE_ACCEPT.split(",").includes(f.type)) errors.push(`${f.name}: Nur JPEG, PNG oder WebP.`);
    else if (f.size > MAX_IMAGE_BYTES) errors.push(`${f.name}: größer als 10 MB.`);
    else ok.push(f);
  }
  return { ok, errors };
}

function usePreviews(files: File[]) {
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return urls;
}

/**
 * Feld zum Hineinziehen von Bildern mit Vorschau; darunter „Durchsuchen“ zur manuellen Auswahl.
 * Einzelbild (multiple = false): eine neue Auswahl ersetzt die vorherige; `current` zeigt das gespeicherte Bild.
 */
export function DropZone({
  files, onChange, multiple = false, current, label, hint, disabled = false, onErrors, aspect = "aspect-[3/4]",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  multiple?: boolean;
  current?: { src: string; badge?: string } | null;
  label: string;
  hint?: string;
  disabled?: boolean;
  onErrors?: (errors: string[]) => void;
  aspect?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const previews = usePreviews(files);

  const add = (list: FileList | null) => {
    if (!list || disabled) return;
    const { ok, errors } = checkImageFiles(Array.from(list));
    onErrors?.(errors); // leere Liste löscht alte Hinweise
    if (!ok.length) return;
    onChange(multiple ? [...files, ...ok] : ok.slice(0, 1));
  };

  const single = !multiple;
  const singleSrc = single ? previews[0] ?? current?.src : null;

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${label}: Bilder hierher ziehen oder klicken zum Auswählen`}
        onClick={() => !disabled && input.current?.click()}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !disabled) { e.preventDefault(); input.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files); }}
        className={cn(
          "rounded-xl border-2 border-dashed p-4 transition-colors",
          over ? "border-gold bg-gold/10" : "border-border bg-background-alt/60 hover:border-gold/50",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        )}
      >
        {single && singleSrc ? (
          // Einzelbild: große Vorschau
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
            <div className={cn("relative w-40 shrink-0 overflow-hidden rounded-lg bg-surface-2", aspect)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={singleSrc} alt="" className="absolute inset-0 size-full object-cover" />
              {files.length ? (
                <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold uppercase text-background">Neu</span>
              ) : current?.badge ? (
                <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[10px] uppercase tracking-wider text-foreground">{current.badge}</span>
              ) : null}
              {files.length ? (
                <button type="button" aria-label="Auswahl entfernen" onClick={(e) => { e.stopPropagation(); onChange([]); }}
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black">
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
            <div className="text-center text-sm text-muted sm:text-left">
              <ImagePlus className="mx-auto mb-2 size-6 text-gold sm:mx-0" />
              <p>{files.length ? "Neues Anzeigebild ausgewählt – wird beim Speichern hochgeladen." : "Neues Bild hierher ziehen, um es zu ersetzen."}</p>
              {hint ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
            </div>
          </div>
        ) : files.length ? (
          // Mehrere: Vorschau-Kacheln
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {files.map((f, i) => (
              <div key={`${f.name}-${i}`} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previews[i]} alt={f.name} className="absolute inset-0 size-full object-cover" />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-semibold uppercase text-background">Neu</span>
                <button type="button" aria-label={`${f.name} entfernen`} onClick={(e) => { e.stopPropagation(); onChange(files.filter((_, j) => j !== i)); }}
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-lg border border-dashed border-border text-center text-xs text-subtle">
              <ImagePlus className="mb-1 size-5 text-gold" /> Weitere hierher ziehen
            </div>
          </div>
        ) : (
          // Leer
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <ImagePlus className="mb-3 size-8 text-gold" />
            <p className="text-sm text-foreground">{multiple ? "Bilder hierher ziehen" : "Bild hierher ziehen"}</p>
            {hint ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={disabled} onClick={() => input.current?.click()}
          className="rounded-md border border-border bg-surface-2 px-4 py-2 text-sm text-foreground transition-colors hover:border-gold/60 hover:text-gold disabled:cursor-not-allowed disabled:opacity-50">
          Durchsuchen …
        </button>
        {multiple && files.length ? <span className="text-xs text-subtle">{files.length} {files.length === 1 ? "Bild" : "Bilder"} ausgewählt</span> : null}
      </div>
      <input ref={input} type="file" accept={IMAGE_ACCEPT} multiple={multiple} className="hidden" aria-hidden tabIndex={-1}
        onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
    </div>
  );
}
