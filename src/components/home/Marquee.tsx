"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const ROW_ONE = "Sear · Chill · Season · Serve · ";
const ROW_TWO = "450°F · 0°F · 84 minerals · 40 cooks · ";

/** Two oversized type bands that slide in opposite directions as you scroll past. */
export default function Marquee() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const forward = useTransform(scrollYProgress, [0, 1], ["0%", "-30%"]);
  const backward = useTransform(scrollYProgress, [0, 1], ["-30%", "0%"]);

  return (
    <section
      ref={ref}
      aria-hidden
      className="relative overflow-hidden border-y border-white/10 bg-black py-10 text-[clamp(3rem,10vw,9rem)] font-semibold leading-[1.05] tracking-[-0.045em] sm:py-14"
    >
      <motion.div style={{ x: forward }} className="w-max whitespace-nowrap text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.28)]">
        {ROW_ONE.repeat(4)}
      </motion.div>
      <motion.div
        style={{ x: backward }}
        className="w-max whitespace-nowrap bg-linear-to-r from-rose-300 via-amber-200 to-orange-400 bg-clip-text text-transparent"
      >
        {ROW_TWO.repeat(4)}
      </motion.div>
    </section>
  );
}
