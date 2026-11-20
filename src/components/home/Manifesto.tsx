"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";

const SEGMENTS: { text: string; accent?: boolean }[] = [
  { text: "Pans trap steam and boil your steak in its own juices." },
  { text: "Salt doesn’t.", accent: true },
  { text: "A solid slab of Himalayan crystal conducts dry, blistering heat, seasons with a whisper of minerals, and builds" },
  { text: "a crust you can hear.", accent: true },
];

const WORDS = SEGMENTS.flatMap((s) => s.text.split(" ").map((word) => ({ word, accent: !!s.accent })));

/** A paragraph that lights up word by word as it scrolls through the viewport. */
export default function Manifesto() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.5"] });

  return (
    <section className="bg-black px-6 py-[16vh] sm:py-[20vh]">
      <p
        ref={ref}
        className="mx-auto max-w-5xl text-[clamp(1.85rem,5vw,4rem)] font-semibold leading-[1.12] tracking-[-0.035em]"
      >
        {WORDS.map(({ word, accent }, i) => (
          <Word key={i} progress={scrollYProgress} range={[i / WORDS.length, (i + 1) / WORDS.length]} accent={accent}>
            {word}
          </Word>
        ))}
      </p>
    </section>
  );
}

function Word({
  progress,
  range,
  accent,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  accent: boolean;
  children: ReactNode;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className={accent ? "text-rose-300" : "text-white"}>
      {children}{" "}
    </motion.span>
  );
}
