"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  motion,
  useInView,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import type { MotionValue } from "framer-motion";
import {
  CHAPTERS,
  CHAPTER_LABELS,
  COOKS_RANGE,
  TEMP_INPUT,
  TEMP_OUTPUT,
  THICKNESS,
} from "./storyTimeline";
import type { ChapterKey } from "./storyTimeline";
import type { PlaceCallout } from "./HeroStoryCanvas";
import CtaButton from "./CtaButton";
import HomeReserveButton from "./HomeReserveButton";
import { paintSlabCanvases } from "./saltPaint";

const HeroStoryCanvas = dynamic(() => import("./HeroStoryCanvas"), { ssr: false });

const MINERALS = [
  { sym: "Fe", name: "Iron", note: "The rose hue and a deeper sear." },
  { sym: "Mg", name: "Magnesium", note: "Softens the sodium bite." },
  { sym: "K", name: "Potassium", note: "Keeps prime cuts juicy." },
  { sym: "Ca", name: "Calcium", note: "A dense, durable crystal core." },
];

const EASE = [0.16, 1, 0.3, 1] as const;

// Backdrop colour per stop: rose → plum → ember → ice → rose.
const BG_STOPS = [0, 0.2, 0.37, 0.57, 0.73, 0.9, 1];
const BG_COLORS = ["#070205", "#0a0306", "#0c0410", "#1a0603", "#020a15", "#090306", "#050203"];
const GLOW_COLORS = [
  "rgba(244,114,182,0.34)",
  "rgba(245,158,11,0.18)",
  "rgba(168,85,247,0.18)",
  "rgba(255,84,20,0.5)",
  "rgba(56,189,248,0.4)",
  "rgba(244,114,182,0.24)",
  "rgba(245,158,11,0.2)",
];

export default function HeroStory() {
  const ref = useRef<HTMLElement>(null);
  const callouts = useRef<(HTMLDivElement | null)[]>([]);
  const calloutShown = useRef<boolean[]>([]);
  const calloutWidths = useRef<number[]>([]);
  const [sceneReady, setSceneReady] = useState(false);

  // Start painting the slab textures right away, while the 3D engine is still downloading.
  useEffect(() => {
    void paintSlabCanvases();
  }, []);
  const calm = useReducedMotion() ?? false;
  const inView = useInView(ref);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  // One smoothed value drives both the WebGL scene and the overlays.
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.6, restDelta: 0.0002 });

  const bg = useTransform(progress, BG_STOPS, BG_COLORS);
  const glow = useTransform(progress, BG_STOPS, GLOW_COLORS);
  const glowBg = useMotionTemplate`radial-gradient(70% 55% at 50% 58%, ${glow}, transparent 72%)`;

  const placeCallout: PlaceCallout = (i, x, y, opacity, viewport) => {
    const el = callouts.current[i];
    if (!el) return;
    const shown = opacity > 0;
    if (!shown && !calloutShown.current[i]) return;
    // Measure the label once as it appears, not on every frame.
    if (shown && !calloutShown.current[i]) {
      calloutWidths.current[i] = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    }
    calloutShown.current[i] = shown;
    el.style.opacity = String(opacity);
    if (!shown) return;
    // Keep the whole label on screen; on narrow phones it may overlap the slab edge.
    const width = calloutWidths.current[i] ?? 0;
    const px = i % 2 === 0 ? Math.min(x, viewport - width - 8) : Math.max(x, width + 8);
    el.style.transform = `translate3d(${px.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  };

  return (
    <section id="story" ref={ref} className="relative h-[700vh]" aria-label="The Himalayan Reserves slab, chapter by chapter">
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <motion.div aria-hidden className="absolute inset-0" style={{ backgroundColor: bg }} />
        <motion.div aria-hidden className="absolute inset-0" style={{ background: glowBg }} />

        <motion.div
          aria-hidden
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: sceneReady ? 1 : 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          <HeroStoryCanvas
            progress={progress}
            placeCallout={placeCallout}
            calm={calm}
            active={inView}
            onReady={() => setSceneReady(true)}
          />
        </motion.div>

        <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/55 via-transparent to-black/65" />

        {/* Mineral callouts — positioned every frame by the scene */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {MINERALS.map((m, i) => {
            const right = i % 2 === 0;
            return (
              <div
                key={m.sym}
                ref={(el) => {
                  callouts.current[i] = el;
                }}
                className="absolute left-0 top-0 opacity-0 will-change-transform"
              >
                <div className={`flex items-center gap-2 -translate-y-1/2 ${right ? "" : "-translate-x-full flex-row-reverse"}`}>
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.9)]" />
                  <span
                    className={`h-px w-4 shrink-0 sm:w-10 ${
                      right ? "bg-linear-to-r" : "bg-linear-to-l"
                    } from-amber-300/80 to-amber-300/10`}
                  />
                  <div className="rounded-2xl border border-white/15 bg-black/55 px-2.5 py-1.5 backdrop-blur-md sm:px-3.5 sm:py-2.5">
                    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                      <span className="text-base font-semibold text-amber-200 sm:text-xl">{m.sym}</span>
                      <span className="text-[11px] font-medium text-white sm:text-xs">{m.name}</span>
                    </div>
                    <p className="hidden max-w-[11rem] text-[11px] leading-snug text-neutral-400 md:block">{m.note}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Chapter 0 · Hero ── */}
        <Chapter
          progress={progress}
          range={CHAPTERS.hero}
          className="inset-y-0 flex flex-col items-center justify-between pb-[4svh] pt-[calc(44px+5svh)]"
        >
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
              className="text-[11px] font-medium uppercase tracking-[0.3em] text-rose-200/80 sm:text-xs"
            >
              Himalayan Reserves &middot; Himalayan Salt Slab
            </motion.p>
            <h1 className="mt-4 text-[clamp(3rem,9.5vw,7rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-white">
              <RevealWords text="Ancient salt." delay={0.2} />
              <RevealWords
                text="Modern fire."
                delay={0.45}
                className="bg-linear-to-r from-rose-300 via-amber-200 to-orange-400 bg-clip-text text-transparent"
              />
            </h1>
          </div>

          <div className="flex flex-col items-center gap-5">
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.9 }}
              className="max-w-xl text-[15px] leading-relaxed text-neutral-300 sm:text-lg"
            >
              A 250-million-year-old slab of Himalayan rock salt that sears steak at 450&deg;F, chills sashimi at
              0&deg;F, and seasons every bite with 84 trace minerals.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 1.05 }}
              className="pointer-events-auto flex flex-wrap items-center justify-center gap-3"
            >
              <HomeReserveButton variant="hero">
                Reserve a Slab Kit
              </HomeReserveButton>
              <CtaButton href="#closer-look" variant="ghost">Take a closer look</CtaButton>
              <CtaButton href="#science" variant="ghost">
                Why it tastes better
              </CtaButton>
            </motion.div>
            <ScrollCue />
          </div>
        </Chapter>

        {/* ── Chapter 1 · Origin ── */}
        <Chapter progress={progress} range={CHAPTERS.origin} className={SPLIT}>
          <Heading eyebrow="Khewra foothills" title="250 million years" accent="in the making." />
          <div className="flex flex-col items-center gap-4">
            <Copy>
              Hand-carved from ancient seabed rock salt. Unrefined, unbleached and dense enough to hold a 450&deg;F sear.
            </Copy>
            <div className="flex flex-wrap justify-center gap-2">
              {["8 × 8 × 2 in", "Hand-carved", "Unrefined", "Food-safe"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-neutral-200 backdrop-blur-md"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </Chapter>

        {/* ── Chapter 2 · Minerals (exploded view) ── */}
        <Chapter progress={progress} range={CHAPTERS.minerals} className={SPLIT}>
          <Heading
            eyebrow="Exploded view"
            title="84 trace minerals."
            accent="Layer by layer."
            accentClass="from-amber-200 via-rose-200 to-fuchsia-300"
          />
          <Copy>Nothing added. Nothing stripped out. The ancient seabed&apos;s mineral matrix, intact in every slab.</Copy>
        </Chapter>

        {/* ── Chapter 3 · Heat ── */}
        <Chapter progress={progress} range={CHAPTERS.heat} className={SPLIT}>
          <div>
            <Eyebrow className="text-orange-300">Hot sear &middot; surface temperature</Eyebrow>
            <TempReadout progress={progress} className="from-amber-200 via-orange-400 to-red-500" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-[clamp(1.75rem,4.5vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-white">
              Blistering heat. <span className="text-orange-300">Held for 40 minutes.</span>
            </h2>
            <Copy>
              Warm it gently to 200&deg;F, then 300&deg;F, then 450&deg;F+. Set it on the metal trivet ring and carry the
              sizzle straight to the table.
            </Copy>
          </div>
        </Chapter>

        {/* ── Chapter 4 · Chill ── */}
        <Chapter progress={progress} range={CHAPTERS.chill} className={SPLIT}>
          <div>
            <Eyebrow className="text-sky-300">Chilled service &middot; surface temperature</Eyebrow>
            <TempReadout progress={progress} className="from-white via-sky-200 to-sky-500" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-[clamp(1.75rem,4.5vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-white">
              Then take it <span className="text-sky-300">to zero.</span>
            </h2>
            <Copy>
              Two hours in the freezer turns the same slab into a chilled platter. Sashimi, carpaccio and tartare stay
              cold for 90 minutes, with a gentle mineral cure.
            </Copy>
          </div>
        </Chapter>

        {/* ── Chapter 5 · 40 cooks ── */}
        <Chapter progress={progress} range={CHAPTERS.cooks} className={SPLIT}>
          <div>
            <Eyebrow className="text-rose-300">The 40-cook journey</Eyebrow>
            <CookCounter progress={progress} />
          </div>
          <div className="flex w-full max-w-xl flex-col items-center gap-4">
            <h2 className="text-[clamp(1.75rem,4.5vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-white">
              Forty dinners. <span className="text-rose-300">Then finishing salt.</span>
            </h2>
            <ThicknessBar progress={progress} />
            <Copy>
              Every sear seasons your steak with a whisper of the slab. When it&apos;s spent, crush it into the finest
              finishing salt in your pantry.
            </Copy>
          </div>
        </Chapter>

        <ChapterRail progress={progress} />
      </div>
    </section>
  );
}

const SPLIT =
  "inset-y-0 flex flex-col items-center justify-between pb-[7svh] pt-[calc(44px+6svh)]";

function Chapter({
  progress,
  range,
  className = "",
  children,
}: {
  progress: MotionValue<number>;
  range: readonly [number, number];
  className?: string;
  children: ReactNode;
}) {
  const [a, b] = range;
  const f = 0.022;
  const input = [a - f, a + f, b - f, b + f];
  const opacity = useTransform(progress, input, [0, 1, 1, 0]);
  const y = useTransform(progress, input, [60, 0, 0, -60]);
  const blur = useTransform(progress, input, [10, 0, 0, 10]);
  // "none" rather than blur(0px), so settled chapters skip the filter pass entirely.
  const filter = useTransform(blur, (b) => (b < 0.05 ? "none" : `blur(${b.toFixed(2)}px)`));
  const visibility = useTransform(opacity, (o) => (o < 0.01 ? "hidden" : "visible"));

  return (
    <motion.div
      style={{ opacity, y, filter, visibility }}
      className={`pointer-events-none absolute inset-x-0 px-5 text-center ${className}`}
    >
      {children}
    </motion.div>
  );
}

function RevealWords({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  return (
    <span className="block">
      {text.split(" ").map((word, i) => (
        <span key={i} className="-mb-[0.1em] inline-block overflow-hidden pb-[0.1em] align-bottom">
          <motion.span
            className={`inline-block ${className}`}
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1.1, ease: EASE, delay: delay + i * 0.09 }}
          >
            {word}
            {i < text.split(" ").length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[11px] font-medium uppercase tracking-[0.25em] sm:text-xs ${className}`}>{children}</p>
  );
}

function Heading({
  eyebrow,
  title,
  accent,
  accentClass = "from-rose-200 via-amber-200 to-amber-400",
}: {
  eyebrow: string;
  title: string;
  accent: string;
  accentClass?: string;
}) {
  return (
    <div>
      <Eyebrow className="text-amber-200/80">{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-[clamp(2.25rem,7vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-white">
        {title}
        <span className={`block bg-linear-to-r bg-clip-text pb-[0.06em] text-transparent ${accentClass}`}>{accent}</span>
      </h2>
    </div>
  );
}

function Copy({ children }: { children: ReactNode }) {
  return <p className="max-w-xl text-[15px] leading-relaxed text-neutral-300 sm:text-lg">{children}</p>;
}

function TempReadout({ progress, className }: { progress: MotionValue<number>; className: string }) {
  const temp = useTransform(progress, TEMP_INPUT, TEMP_OUTPUT);
  const label = useTransform(temp, (v) => String(Math.round(v)));
  return (
    <div
      className={`mt-2 bg-linear-to-b bg-clip-text text-[clamp(4.5rem,17vw,11rem)] font-semibold leading-none tracking-[-0.06em] text-transparent tabular-nums ${className}`}
    >
      <motion.span>{label}</motion.span>
      <span className="align-top text-[0.45em] tracking-normal">&deg;F</span>
    </div>
  );
}

function CookCounter({ progress }: { progress: MotionValue<number> }) {
  const cooks = useTransform(progress, [...COOKS_RANGE], [1, 40]);
  const label = useTransform(cooks, (v) => String(Math.round(v)).padStart(2, "0"));
  return (
    <div className="mt-2 flex items-baseline justify-center gap-3 font-semibold tracking-[-0.05em] tabular-nums">
      <span className="text-lg font-medium tracking-normal text-neutral-400 sm:text-2xl">Cook</span>
      <motion.span className="bg-linear-to-b from-white via-rose-200 to-rose-400 bg-clip-text text-[clamp(4.5rem,15vw,10rem)] leading-none text-transparent">
        {label}
      </motion.span>
      <span className="text-lg font-medium tracking-normal text-neutral-400 sm:text-2xl">/ 40</span>
    </div>
  );
}

function ThicknessBar({ progress }: { progress: MotionValue<number> }) {
  const range = [THICKNESS[0][0], THICKNESS[1][0]];
  const inches = useTransform(progress, range, [2, 0.9]);
  const label = useTransform(inches, (v) => `${v.toFixed(1)}"`);
  const scaleX = useTransform(inches, [0, 2], [0, 1]);
  return (
    <div className="w-full max-w-sm">
      <div className="mb-1.5 flex justify-between text-xs text-neutral-400">
        <span>Slab thickness</span>
        <motion.span className="font-medium text-white tabular-nums">{label}</motion.span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          style={{ scaleX }}
          className="h-full origin-left rounded-full bg-linear-to-r from-rose-400 via-amber-300 to-orange-400"
        />
      </div>
    </div>
  );
}

function ScrollCue() {
  return (
    <div className="flex flex-col items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-neutral-500">
      <span>Scroll</span>
      <span className="relative h-9 w-[22px] rounded-full border border-white/25">
        <motion.span
          className="absolute left-1/2 top-1.5 h-2 w-[3px] -translate-x-1/2 rounded-full bg-white/80"
          animate={{ y: [0, 12, 0], opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </span>
    </div>
  );
}

function ChapterRail({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-3 lg:flex">
      {(Object.keys(CHAPTERS) as ChapterKey[]).map((key) => (
        <RailItem key={key} progress={progress} range={CHAPTERS[key]} label={CHAPTER_LABELS[key]} />
      ))}
    </div>
  );
}

function RailItem({
  progress,
  range,
  label,
}: {
  progress: MotionValue<number>;
  range: readonly [number, number];
  label: string;
}) {
  const [a, b] = range;
  const active = useTransform(progress, [a - 0.02, a + 0.01, b - 0.01, b + 0.02], [0, 1, 1, 0]);
  const height = useTransform(active, [0, 1], [6, 26]);
  const opacity = useTransform(active, [0, 1], [0.3, 1]);
  const x = useTransform(active, [0, 1], [6, 0]);
  return (
    <div className="flex items-center gap-3">
      <motion.span style={{ opacity: active, x }} className="text-[11px] font-medium text-white/80">
        {label}
      </motion.span>
      <motion.span style={{ height, opacity }} className="w-[3px] rounded-full bg-white" />
    </div>
  );
}
