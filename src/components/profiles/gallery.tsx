"use client";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Bildergalerie: großes Vorzeigebild, daneben (ab Tablet) eine senkrechte Leiste mit den weiteren Bildern.
 * Auf dem Handy liegen die Vorschaubilder unter dem Bild.
 */
export function Gallery({ images, name }: { images: { id: string; src: string; thumb: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) {
    return <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-border bg-surface-2 font-display text-7xl text-gold/30">{name.slice(0, 1)}</div>;
  }
  const thumbs = images.length > 1 && (
    <div role="tablist" aria-label="Bildauswahl" className="flex gap-2 overflow-x-auto sm:absolute sm:inset-y-0 sm:right-0 sm:w-20 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden lg:w-24">
      {images.map((img, i) => (
        <button
          key={img.id}
          type="button"
          role="tab"
          aria-selected={i === active}
          aria-label={`Bild ${i + 1}`}
          onClick={() => setActive(i)}
          className={cn("relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-md border transition-opacity sm:w-full", i === active ? "border-gold" : "border-border opacity-60 hover:opacity-100")}
        >
          <Image src={img.thumb} alt="" fill sizes="96px" className="object-cover" unoptimized />
        </button>
      ))}
    </div>
  );
  return (
    <div className={cn("relative flex flex-col gap-2", images.length > 1 && "sm:pr-[5.5rem] lg:pr-[6.5rem]")}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-surface-2">
        <Image src={images[active].src} alt={`${name} – Bild ${active + 1} von ${images.length}`} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-cover" priority unoptimized />
      </div>
      {thumbs}
    </div>
  );
}
