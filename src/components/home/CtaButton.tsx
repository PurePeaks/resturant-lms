"use client";

import { useRef } from "react";
import type { PointerEvent, ReactNode } from "react";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

const MotionLink = motion.create(Link);

const VARIANTS = {
  primary:
    "bg-white text-black hover:shadow-[0_10px_40px_-6px_rgba(251,146,60,0.55),0_0_0_1px_rgba(255,255,255,0.6)]",
  ghost:
    "border border-white/25 text-white backdrop-blur-md hover:border-white/70 hover:shadow-[0_0_32px_-4px_rgba(244,114,182,0.45)]",
} as const;

interface CtaButtonProps {
  href: string;
  children: ReactNode;
  variant?: keyof typeof VARIANTS;
  arrow?: boolean;
  className?: string;
}

/** Pill CTA with a magnetic pull, a light sweep (primary) or cursor-tracked fill (ghost), and a sliding arrow. */
export default function CtaButton({ href, children, variant = "primary", arrow = true, className = "" }: CtaButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const calm = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 260, damping: 18, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 260, damping: 18, mass: 0.5 });

  const onMove = (e: PointerEvent<HTMLAnchorElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
    if (calm) return;
    x.set(dx * 0.22);
    y.set(dy * 0.35);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <MotionLink
      ref={ref}
      href={href}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ x: springX, y: springY }}
      whileTap={{ scale: 0.95 }}
      className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-semibold transition-[box-shadow,border-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${VARIANTS[variant]} ${className}`}
    >
      {variant === "primary" ? (
        <>
          {/* warm wash that blooms in from the cursor */}
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-[radial-gradient(140px_circle_at_var(--mx,50%)_var(--my,50%),rgba(253,186,116,0.55),rgba(251,207,232,0.35)_45%,transparent_75%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
          {/* glossy light sweep */}
          <span
            aria-hidden
            className="absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/90 to-transparent opacity-0 group-hover:opacity-100 motion-safe:transition-[left,opacity] motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:left-[120%]"
          />
        </>
      ) : (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-[radial-gradient(120px_circle_at_var(--mx,50%)_var(--my,50%),rgba(255,255,255,0.22),transparent_70%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}

      <span className="relative">{children}</span>

      {arrow && (
        <span aria-hidden className="relative -mr-1 inline-flex h-4 w-4 overflow-hidden">
          <Arrow className="absolute inset-0 transition-transform duration-300 ease-out group-hover:translate-x-full" />
          <Arrow className="absolute inset-0 -translate-x-full transition-transform duration-300 ease-out group-hover:translate-x-0" />
        </span>
      )}
    </MotionLink>
  );
}

function Arrow({ className }: { className: string }) {
  return (
    <svg className={`h-4 w-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 12h13m-5-6 6 6-6 6" />
    </svg>
  );
}
