"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useInView, useMotionValue, useReducedMotion, useScroll, useTransform } from "framer-motion";
import CssSlab from "./CssSlab";
import HomeReserveButton from "./HomeReserveButton";

const DishesCanvas = dynamic(() => import("./DishesCanvas"), { ssr: false });

const DISHES = [
  {
    name: "Prime Ribeye & Wagyu",
    tone: "hot",
    temp: "450°F",
    time: "45–60 sec a side",
    body: "Sear thin strips at the table. Dry heat caramelizes the marbling while minerals season the crust.",
  },
  {
    name: "Sea Scallops & Salmon",
    tone: "hot",
    temp: "450°F",
    time: "2 min sear",
    body: "Dry diver scallops form a golden crust with crisp, savory sweetness. No table salt required.",
  },
  {
    name: "Beef Carpaccio",
    tone: "cold",
    temp: "0°F",
    time: "Served chilled",
    body: "Paper-thin tenderloin, olive oil and fresh herbs. The frozen slab gently cures the underside.",
  },
  {
    name: "Sashimi & Tuna Tartare",
    tone: "cold",
    temp: "0°F",
    time: "90 min cold",
    body: "Silky texture and balanced seasoning, held perfectly chilled right through dinner.",
  },
  {
    name: "Cheese & Charcuterie",
    tone: "cold",
    temp: "0°F",
    time: "Board service",
    body: "A cold mineral board that keeps artisanal cheese and cured meats at their best.",
  },
] as const;

/** Vertical scroll drives a horizontal rail of dish cards while the section is pinned. */
export default function DishesRail() {
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const distance = useMotionValue(0);
  const slots = useRef<(HTMLElement | null)[]>([]);
  const calm = useReducedMotion() ?? false;
  const inView = useInView(section);
  // Create the 3D dishes only once the section is about a screen away.
  const near = useInView(section, { margin: "900px 0px", once: true });
  const [dishesReady, setDishesReady] = useState(false);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform([scrollYProgress, distance], ([p, d]: number[]) => -p * d);

  // Size the pinned section so one pixel of vertical scroll moves the rail one pixel.
  useEffect(() => {
    const el = rail.current;
    const sec = section.current;
    if (!el || !sec) return;
    const observer = new ResizeObserver(() => {
      const d = Math.max(0, el.scrollWidth - document.documentElement.clientWidth);
      distance.set(d);
      sec.style.height = `calc(100svh + ${d}px)`;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [distance]);

  return (
    <section id="dishes" ref={section} className="relative h-[300vh] bg-black">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden pt-11">
        <div className="mx-auto mb-8 w-full max-w-6xl px-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-amber-300">Dining inspiration</p>
          <h2 className="mt-3 text-[clamp(2rem,5.5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
            What to cook on your slab.
          </h2>
        </div>

        <motion.div ref={rail} style={{ x }} className="flex w-max gap-4 px-5 sm:gap-6 sm:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))]">
          {DISHES.map((dish, i) => (
            <article
              key={dish.name}
              className={`relative flex h-[min(62svh,560px)] w-[80vw] shrink-0 flex-col overflow-hidden rounded-4xl border p-6 sm:w-[min(56vw,30rem)] sm:p-8 ${
                dish.tone === "hot"
                  ? "border-orange-500/20 bg-linear-to-b from-[#2a0d06] via-[#120604] to-black"
                  : "border-sky-400/20 bg-linear-to-b from-[#071a2b] via-[#050d16] to-black"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`rounded-full px-3 py-1 font-semibold ${
                    dish.tone === "hot" ? "bg-orange-500/15 text-orange-300" : "bg-sky-400/15 text-sky-200"
                  }`}
                >
                  {dish.tone === "hot" ? "Hot sear" : "Chilled"} &middot; {dish.temp}
                </span>
                <span className="text-neutral-500 tabular-nums">0{i + 1}</span>
              </div>

              {/* The 3D dish is drawn into this slot; the CSS slab holds the space until it's ready. */}
              <div
                ref={(el) => {
                  slots.current[i] = el;
                }}
                className="-mx-6 flex flex-1 items-center justify-center sm:-mx-8"
              >
                <div
                  className={`motion-safe:animate-float transition-opacity duration-700 ${dishesReady ? "opacity-0" : "opacity-100"}`}
                  style={{ animationDelay: `${i * -1.2}s` }}
                >
                  <CssSlab size={150} tone={dish.tone} />
                </div>
              </div>

              <div>
                <p className={`text-sm font-medium ${dish.tone === "hot" ? "text-orange-300" : "text-sky-300"}`}>{dish.time}</p>
                <h3 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-white sm:text-3xl">{dish.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">{dish.body}</p>
              </div>
            </article>
          ))}
        </motion.div>

        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-1000 ${dishesReady ? "opacity-100" : "opacity-0"}`}
        >
          {near && <DishesCanvas slots={slots} active={inView} calm={calm} onReady={() => setDishesReady(true)} />}
        </div>

        <div className="mx-auto mt-8 w-full max-w-6xl px-5 sm:px-6">
          <div className="h-px overflow-hidden bg-white/10">
            <motion.div style={{ scaleX: scrollYProgress }} className="h-full origin-left bg-linear-to-r from-rose-400 to-amber-300" />
          </div>
        </div>

        <div className="mx-auto mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl px-5 sm:px-6">
          <p className="text-xs sm:text-sm text-neutral-400 text-center sm:text-left">
            Ready to sear, chill, and serve at your own dining table?
          </p>
          <HomeReserveButton variant="pill">
            Reserve a Table Searing Set
          </HomeReserveButton>
        </div>
      </div>
    </section>
  );
}
