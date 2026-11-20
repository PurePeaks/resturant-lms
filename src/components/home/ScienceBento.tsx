"use client";

import { useRef } from "react";
import type { PointerEvent, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const ELEMENTS = [
  { sym: "Fe", name: "Iron", n: 26, tone: "from-rose-500/30 to-rose-900/20 text-rose-200" },
  { sym: "Mg", name: "Magnesium", n: 12, tone: "from-amber-400/30 to-amber-900/20 text-amber-200" },
  { sym: "K", name: "Potassium", n: 19, tone: "from-orange-400/30 to-orange-900/20 text-orange-200" },
  { sym: "Ca", name: "Calcium", n: 20, tone: "from-fuchsia-400/25 to-fuchsia-900/20 text-fuchsia-200" },
];

export default function ScienceBento() {
  return (
    <section id="science" className="scroll-mt-12 bg-black px-5 py-[14vh] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: EASE }}
          className="max-w-3xl"
        >
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-rose-300">The science of the sear</p>
          <h2 className="mt-3 text-[clamp(2.25rem,5.5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
            Why steaks taste better on salt.
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          {/* Salinity */}
          <Card className="md:col-span-4" glow="244,114,182">
            <Kicker className="text-rose-300">Micro-contact seasoning</Kicker>
            <CardTitle>Subtle salinity. Never over-salted.</CardTitle>
            <CardBody>
              Solid crystal has near-zero porosity, so it transfers only a microscopic layer of minerals against the
              steak&apos;s surface moisture &mdash; about a 1.2% infusion rate. You taste the beef, elevated.
            </CardBody>
            <SalinityScale />
          </Card>

          {/* Minerals */}
          <Card className="md:col-span-2" glow="251,191,36" delay={0.08}>
            <Kicker className="text-amber-300">Natural terroir</Kicker>
            <CardTitle>84 synergistic minerals.</CardTitle>
            <div className="mt-7 grid grid-cols-2 gap-3">
              {ELEMENTS.map((el, i) => (
                <motion.div
                  key={el.sym}
                  initial={{ opacity: 0, y: 20, rotateX: -40 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.2 + i * 0.1 }}
                  className={`rounded-2xl border border-white/10 bg-linear-to-br p-3 ${el.tone}`}
                >
                  <span className="block text-[10px] text-white/50">{el.n}</span>
                  <span className="block text-3xl font-semibold leading-none tracking-tight">{el.sym}</span>
                  <span className="mt-1 block text-[11px] text-white/60">{el.name}</span>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Heat retention */}
          <Card className="md:col-span-2" glow="249,115,22" delay={0.08}>
            <Kicker className="text-orange-300">Thermal mass</Kicker>
            <CardTitle>Holds 450&deg;F for 40+ minutes.</CardTitle>
            <CardBody>Dense rock stores heat, so the slab keeps sizzling at the table long after the burner.</CardBody>
            <HeatWaves />
          </Card>

          {/* Hot & cold */}
          <Card className="md:col-span-4" glow="56,189,248" delay={0.16}>
            <Kicker className="text-sky-300">Dual thermal</Kicker>
            <CardTitle>One slab. Sizzling hot or ice cold.</CardTitle>
            <CardBody>
              Sear prime cuts at 450&deg;F, or freeze it for two hours and serve carpaccio, sashimi and cheese with a
              gentle ambient cure.
            </CardBody>
            <HotColdSplit />
          </Card>
        </div>
      </div>
    </section>
  );
}

function Card({
  children,
  className = "",
  glow,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  glow: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, ease: EASE, delay }}
      className={`group relative overflow-hidden rounded-[28px] border border-white/10 bg-neutral-950 p-7 perspective-midrange sm:p-9 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(520px circle at var(--mx) var(--my), rgba(${glow},0.16), transparent 45%)` }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function Kicker({ children, className }: { children: ReactNode; className: string }) {
  return <p className={`text-xs font-medium uppercase tracking-[0.2em] ${className}`}>{children}</p>;
}

function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-3xl">{children}</h3>;
}

function CardBody({ children }: { children: ReactNode }) {
  return <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-400 sm:text-[15px]">{children}</p>;
}

/** Shaker salt lands on "harsh"; the slab settles in the sweet spot. */
function SalinityScale() {
  return (
    <div className="mt-9">
      <div className="relative h-2 rounded-full bg-linear-to-r from-neutral-700 via-rose-400 to-red-600">
        <motion.div
          initial={{ left: "0%" }}
          whileInView={{ left: "44%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: EASE, delay: 0.3 }}
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <span className="block h-5 w-5 rounded-full border-2 border-white bg-rose-400 shadow-[0_0_20px_rgba(244,114,182,0.9)]" />
          <span className="absolute left-1/2 top-7 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black">
            Salt slab
          </span>
        </motion.div>
        <div className="absolute right-[4%] top-1/2 -translate-y-1/2">
          <span className="block h-3 w-3 rounded-full bg-neutral-500" />
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-neutral-500">
            Shaker salt
          </span>
        </div>
      </div>
      <div className="mt-12 flex justify-between text-[11px] uppercase tracking-wider text-neutral-500">
        <span>Bland</span>
        <span>Subtle</span>
        <span>Harsh</span>
      </div>
    </div>
  );
}

function HeatWaves() {
  return (
    <div aria-hidden className="relative mt-8 h-28">
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-5">
        {[0, 1, 2, 3].map((i) => (
          <svg
            key={i}
            viewBox="0 0 20 60"
            className="h-16 w-5 text-orange-400/80 motion-safe:animate-heat-wave"
            style={{ animationDelay: `${i * 0.45}s` }}
          >
            <path
              d="M10 58 C 2 48, 18 40, 10 30 S 2 12, 10 2"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          </svg>
        ))}
      </div>
      <div className="absolute inset-x-6 bottom-0 h-3 rounded-full bg-linear-to-r from-rose-500 via-orange-400 to-rose-500 shadow-[0_0_40px_rgba(249,115,22,0.8)]" />
    </div>
  );
}

function HotColdSplit() {
  const calm = useReducedMotion();
  return (
    <div className="relative mt-8 h-36 overflow-hidden rounded-2xl border border-white/10 sm:h-40">
      <div className="absolute inset-0 flex items-center bg-linear-to-br from-orange-600 via-rose-600 to-red-900 px-6">
        <div>
          <span className="block text-4xl font-semibold tracking-tight text-white sm:text-5xl">450&deg;F</span>
          <span className="text-xs uppercase tracking-widest text-orange-100/80">Sizzle</span>
        </div>
      </div>
      <motion.div
        className="absolute inset-0 flex items-center justify-end bg-linear-to-br from-sky-200 via-sky-500 to-indigo-900 px-6"
        style={{ clipPath: "inset(0 0 0 50%)" }}
        animate={calm ? undefined : { clipPath: ["inset(0 0 0 38%)", "inset(0 0 0 62%)", "inset(0 0 0 38%)"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-right">
          <span className="block text-4xl font-semibold tracking-tight text-white sm:text-5xl">0&deg;F</span>
          <span className="text-xs uppercase tracking-widest text-sky-50/80">Cure</span>
        </div>
      </motion.div>
    </div>
  );
}
