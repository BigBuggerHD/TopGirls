"use client";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Gallery({ images, name }: { images: { id: string; src: string; thumb: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-border bg-surface-2 font-display text-7xl text-gold/30">{name.slice(0, 1)}</div>;
  }
  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-surface-2">
        <Image src={images[active].src} alt={`${name} – Bild ${active + 1} von ${images.length}`} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" priority unoptimized />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-5 gap-2" role="tablist" aria-label="Bildauswahl">
          {images.map((img, i) => (
            <button key={img.id} type="button" role="tab" aria-selected={i === active} aria-label={`Bild ${i + 1}`} onClick={() => setActive(i)}
              className={cn("relative aspect-square overflow-hidden rounded-md border", i === active ? "border-gold" : "border-border opacity-60 hover:opacity-100")}>
              <Image src={img.thumb} alt="" fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
