"use client";

import { useRef, useState } from "react";
import type { PointerEvent } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useInView } from "framer-motion";
import type { DragState, SetPiece } from "./CloserLookCanvas";
import HomeReserveButton from "./HomeReserveButton";

const CloserLookCanvas = dynamic(() => import("./CloserLookCanvas"), { ssr: false });

const EASE = [0.16, 1, 0.3, 1] as const;

const PIECES: Record<
  SetPiece,
  {
    label: string;
    tag: string;
    title: string;
    body: string;
    specs: [string, string][];
    stage: string;
  }
> = {
  slab: {
    label: "Cooking Slab",
    tag: "~40 sizzles",
    title: "Hand-carved mineral block.",
    body: "A solid 8 × 8 × 2-inch slab built for blistering heat. It holds that energy for 40+ minutes at the table, so every guest can cook each bite exactly how they like it.",
    specs: [
      ["8 × 8 × 2 in", "Hand-carved size"],
      ["450°F+", "Searing surface"],
      ["40+ min", "Table-side heat"],
      ["~40", "Cooks per slab"],
    ],
    stage: "from-[#2a0f18] via-[#120509] to-black",
  },
  trivet: {
    label: "Ring Trivet",
    tag: "Essential base",
    title: "Flame convection and safety.",
    body: "The metal ring lifts the slab over gas burners so heat circulates evenly with no direct-flame hot-spots, then doubles as an insulated trivet on the dining table.",
    specs: [
      ["Even", "Convection heat"],
      ["Zero", "Flame hot-spots"],
      ["Burner → table", "One base, both jobs"],
      ["Table-safe", "Insulated trivet"],
    ],
    stage: "from-[#3a1206] via-[#170703] to-black",
  },
  platter: {
    label: "Serving Platter",
    tag: "Cold display",
    title: "Chilled presentation board.",
    body: "Keeps cold cuts, seafood, sushi and tartare beautifully chilled for over 90 minutes, while adding a delicate hint of mineral seasoning to every slice.",
    specs: [
      ["0°F", "Freezer-chilled"],
      ["90+ min", "Cold at the table"],
      ["2 hrs", "Freezer prep"],
      ["Raw & cured", "Serving style"],
    ],
    stage: "from-[#0b2236] via-[#06111d] to-black",
  },
};

const ORDER: SetPiece[] = ["slab", "trivet", "platter"];

export default function CloserLook() {
  const [piece, setPiece] = useState<SetPiece>("slab");
  const stageRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stageRef, { margin: "100px 0px" });
  // Create the WebGL context only once the viewer is about a screen away.
  const near = useInView(stageRef, { margin: "900px 0px", once: true });
  const [sceneReady, setSceneReady] = useState(false);
  const drag = useRef<DragState>({ offset: 0, down: false, lastX: 0 });
  const info = PIECES[piece];

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    drag.current.down = true;
    drag.current.lastX = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.down) return;
    d.offset += (e.clientX - d.lastX) * 0.01;
    d.lastX = e.clientX;
  };
  const onUp = () => {
    drag.current.down = false;
  };

  return (
    <section id="closer-look" className="scroll-mt-12 bg-black px-4 py-[14vh] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: EASE }}
          className="text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-rose-300">The set</p>
          <h2 className="mt-3 text-[clamp(2.25rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
            Take a closer look.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[15px] text-neutral-400 sm:text-base">
            Three pieces, one ritual. Drag to turn it in your hands.
          </p>
        </motion.div>

        <motion.div
          ref={stageRef}
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: EASE }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="relative mt-10 aspect-[4/5] cursor-grab touch-pan-y select-none overflow-hidden rounded-4xl border border-white/10 active:cursor-grabbing sm:aspect-[16/10] sm:rounded-[40px]"
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={piece}
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className={`absolute inset-0 bg-linear-to-b ${info.stage}`}
            />
          </AnimatePresence>
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_45%,rgba(255,255,255,0.08),transparent_70%)]" />

          <div
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${sceneReady ? "opacity-100" : "opacity-0"}`}
          >
            {near && (
              <CloserLookCanvas piece={piece} drag={drag} active={inView} onReady={() => setSceneReady(true)} />
            )}
          </div>

          <div className="pointer-events-none absolute left-5 top-5 sm:left-8 sm:top-7">
            <AnimatePresence mode="wait">
              <motion.span
                key={piece}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.35 }}
                className="inline-block rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-md"
              >
                {info.tag}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="pointer-events-none absolute right-5 top-5 flex items-center gap-1.5 text-[11px] text-white/50 sm:right-8 sm:top-7">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 12a8 8 0 0114-5.3M20 12a8 8 0 01-14 5.3M18 3v4h-4M6 21v-4h4" />
            </svg>
            Drag to rotate
          </div>

          {/* Segmented control */}
          <div className="absolute inset-x-0 bottom-5 flex justify-center px-3 sm:bottom-8">
            <div
              role="tablist"
              aria-label="Choose a piece of the set"
              onPointerDown={(e) => e.stopPropagation()}
              className="flex rounded-full border border-white/15 bg-black/50 p-1 backdrop-blur-xl"
            >
              {ORDER.map((key) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={piece === key}
                  onClick={() => setPiece(key)}
                  className={`relative rounded-full px-3.5 py-2 text-xs font-medium transition-[color,background-color,transform] duration-200 active:scale-95 sm:px-5 sm:text-sm ${
                    piece === key ? "text-black" : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {piece === key && (
                    <motion.span
                      layoutId="piece-pill"
                      className="absolute inset-0 rounded-full bg-white"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative whitespace-nowrap">{PIECES[key].label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={piece}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: EASE }}
            className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start"
          >
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">{info.title}</h3>
              <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-neutral-400">{info.body}</p>
              <div className="mt-6 flex items-center gap-3">
                <HomeReserveButton
                  variant="hero"
                  defaultKit={
                    piece === "slab"
                      ? "The Master Searing Set"
                      : piece === "platter"
                      ? "Dual Temperature Presentation Set"
                      : "The Master Searing Set"
                  }
                >
                  Reserve {info.label} Set
                </HomeReserveButton>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3">
              {info.specs.map(([value, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/3 p-4">
                  <dt className="text-xs text-neutral-500">{label}</dt>
                  <dd className="mt-1 text-lg font-semibold tracking-tight text-white sm:text-xl">{value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
