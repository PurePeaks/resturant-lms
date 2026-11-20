"use client";

import { useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { getSaltUrl, subscribeSaltUrl } from "./saltPaint";

/** The painted salt texture as an image URL (null until it's ready, and during SSR). */
function useSaltTexture() {
  return useSyncExternalStore(subscribeSaltUrl, getSaltUrl, () => null);
}

type Tone = "plain" | "hot" | "cold";

interface CssSlabProps {
  size: number;
  /** Short side as a fraction of the long side. */
  ratio?: number;
  /** Thickness as a fraction of the long side. */
  depth?: number;
  tone?: Tone;
  spin?: boolean;
  tilt?: number;
  className?: string;
}

const CORNERS = [
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
] as const;

/** A lightweight CSS-3D salt slab (rectangular, softly rounded corners) for places where WebGL would be overkill. */
export default function CssSlab({
  size,
  ratio = 0.67,
  depth = 0.17,
  tone = "plain",
  spin = false,
  tilt = 62,
  className = "",
}: CssSlabProps) {
  const texture = useSaltTexture();
  const w = size;
  const h = size * ratio;
  const t = size * depth;
  const round = size * 0.1;
  const skin: CSSProperties = {
    backgroundColor: "#f0c9bb",
    backgroundImage: texture ? `url(${texture})` : undefined,
    backgroundSize: `${w}px ${w}px`,
  };
  const face = (transform: string, width: number, height: number, shade: number): CSSProperties => ({
    ...skin,
    position: "absolute",
    width,
    height,
    left: (w - width) / 2,
    top: (h - height) / 2,
    transform,
    filter: `brightness(${shade})`,
  });
  // 45° faces that bridge each rounded corner between the straight edges.
  const corner = (sx: number, sy: number) => {
    const angle = Math.atan2(-sx, sy);
    const mx = sx * (w / 2 - round / 2);
    const my = sy * (h / 2 - round / 2);
    const dist = (mx * sx + my * sy) / Math.SQRT2;
    const along = mx * Math.cos(angle) + my * Math.sin(angle);
    return face(
      `rotateZ(${angle}rad) translateX(${along}px) rotateX(-90deg) translateZ(${dist}px)`,
      round * Math.SQRT2,
      t,
      0.78
    );
  };

  return (
    <div className={`relative perspective-[1400px] ${className}`} style={{ width: w, height: h }}>
      {tone === "hot" && (
        <div
          aria-hidden
          className="absolute inset-[-40%] rounded-full bg-[radial-gradient(circle,rgba(255,106,31,0.5)_0%,rgba(255,106,31,0.24)_30%,rgba(255,106,31,0.06)_52%,transparent_68%)]"
        />
      )}
      {tone === "cold" && (
        <div
          aria-hidden
          className="absolute inset-[-40%] rounded-full bg-[radial-gradient(circle,rgba(125,211,252,0.42)_0%,rgba(125,211,252,0.2)_30%,rgba(125,211,252,0.05)_52%,transparent_68%)]"
        />
      )}
      <div
        className={`relative h-full w-full transform-3d ${spin ? "motion-safe:animate-slab-spin" : ""}`}
        style={{ "--tilt": `${tilt}deg`, transform: spin ? undefined : `rotateX(${tilt}deg) rotateZ(-38deg)` } as CSSProperties}
      >
        {/* top */}
        <div style={{ ...face(`translateZ(${t / 2}px)`, w, h, 1.05), borderRadius: round }} className="overflow-hidden">
          {tone === "hot" && (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(255,120,40,0.55),rgba(255,60,20,0.15)_60%,transparent)] mix-blend-screen motion-safe:animate-pulse" />
          )}
          {tone === "cold" && (
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1.5px)] bg-[length:7px_7px] opacity-60 mix-blend-screen" />
          )}
          {tone === "cold" && <div className="absolute inset-0 bg-sky-200/35 mix-blend-soft-light" />}
          <div className="absolute inset-0 bg-linear-to-br from-white/30 via-transparent to-black/10" />
        </div>
        {/* bottom */}
        <div style={{ ...face(`rotateX(180deg) translateZ(${t / 2}px)`, w, h, 0.45), borderRadius: round }} />
        {/* edges */}
        <div style={face(`rotateX(-90deg) translateZ(${h / 2}px)`, w - round * 2, t, tone === "hot" ? 1.15 : 0.82)}>
          {tone === "hot" && <div className="absolute inset-0 bg-linear-to-t from-orange-500/70 to-transparent mix-blend-screen" />}
        </div>
        <div style={face(`rotateX(90deg) translateZ(${h / 2}px)`, w - round * 2, t, 0.7)} />
        <div style={face(`rotateY(90deg) translateZ(${w / 2}px)`, t, h - round * 2, 0.62)}>
          {tone === "hot" && <div className="absolute inset-0 bg-linear-to-l from-orange-500/60 to-transparent mix-blend-screen" />}
        </div>
        <div style={face(`rotateY(-90deg) translateZ(${w / 2}px)`, t, h - round * 2, 0.9)} />
        {CORNERS.map(([sx, sy]) => (
          <div key={`${sx}${sy}`} style={corner(sx, sy)} />
        ))}
      </div>
    </div>
  );
}
