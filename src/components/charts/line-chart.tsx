"use client";
import { useState } from "react";

/**
 * Schlanke Einzelreihen-Liniengrafik (SVG) mit Fadenkreuz-Tooltip.
 * Unterschiedlich skalierte Kennzahlen werden als Small Multiples (je ein Chart) dargestellt – keine Doppelachse.
 */
export function LineChart({ data, label, color = "#C6A76B" }: { data: { date: string; value: number }[]; label: string; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 600, H = 180, P = { l: 40, r: 12, t: 12, b: 24 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const niceMax = Math.ceil(max / Math.pow(10, Math.floor(Math.log10(max)))) * Math.pow(10, Math.floor(Math.log10(max)));
  const x = (i: number) => P.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - P.l - P.r));
  const y = (v: number) => H - P.b - (v / niceMax) * (H - P.t - P.b);
  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const fmt = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`;
  const ticks = [0, niceMax / 2, niceMax];
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - P.l) / (W - P.l - P.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  }

  const h = hover != null ? data[hover] : null;
  return (
    <figure className="relative">
      <figcaption className="mb-2 text-sm font-medium text-foreground">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" role="img" aria-label={`${label} im Zeitverlauf`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="#2a2a2a" strokeWidth={1} />
            <text x={P.l - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#737373">{t.toLocaleString("de-DE")}</text>
          </g>
        ))}
        {data.map((d, i) => (i % labelEvery === 0 || i === data.length - 1 ? <text key={d.date} x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="#737373">{fmt(d.date)}</text> : null))}
        <path d={`${path} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={color} opacity={0.08} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {h && hover != null ? (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="#a3a3a3" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.value)} r={4.5} fill={color} stroke="#171717" strokeWidth={2} />
          </g>
        ) : null}
      </svg>
      {h && hover != null ? (
        <div className="pointer-events-none absolute top-6 rounded-md border border-border bg-background-alt px-3 py-1.5 text-xs shadow-lg" style={{ left: `clamp(0px, calc(${(x(hover) / W) * 100}% - 50px), calc(100% - 110px))` }}>
          <p className="text-subtle">{new Date(h.date + "T00:00:00Z").toLocaleDateString("de-DE", { timeZone: "UTC" })}</p>
          <p className="font-medium text-foreground">{h.value.toLocaleString("de-DE")} {label}</p>
        </div>
      ) : null}
    </figure>
  );
}
