"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

const RULES: { title: string; body: string; card: string; accent: string; icon: ReactNode }[] = [
  {
    title: "Oil the meat, never the slab.",
    body: "Brush avocado or grapeseed oil straight onto the steak. Oil poured on the slab seeps into the crystal’s fissures and smokes.",
    card: "from-[#2b0c18] to-[#120408] border-rose-500/25",
    accent: "text-rose-300",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 3c3 4 6 7.2 6 10.5A6 6 0 016 13.5C6 10.2 9 7 12 3z" />,
  },
  {
    title: "Always do the sizzle test.",
    body: "Flick a drop of water on the slab before cooking. It should dance and vanish instantly. If it doesn’t, keep heating.",
    card: "from-[#2d1606] to-[#130902] border-amber-500/25",
    accent: "text-amber-300",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M13 3L4 14h7l-1 7 9-11h-7l1-7z" />,
  },
  {
    title: "Zero soap. Zero soaking.",
    body: "Salt is naturally antimicrobial. Let it cool, scrape with a damp sponge or scouring pad, and dry it right away.",
    card: "from-[#0a1d2d] to-[#040b12] border-sky-400/25",
    accent: "text-sky-300",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M5 13l4 4L19 7" />,
  },
  {
    title: "Repurpose the spent slab.",
    body: "After about 40 cooks, crush what’s left in a mortar. It becomes the most delicious finishing salt in your pantry.",
    card: "from-[#22101f] to-[#0d050c] border-fuchsia-400/25",
    accent: "text-fuchsia-300",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 4v6h6M20 20v-6h-6M5.5 15a7 7 0 0012.4 2.5M18.5 9A7 7 0 006.1 6.5" />,
  },
];

/** Rule cards that pin and stack on top of one another as you scroll. */
export default function GoldenRules() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  return (
    <section id="rules" className="scroll-mt-12 bg-black px-4 pt-[14vh] sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, ease: EASE }}
        className="mx-auto max-w-5xl text-center"
      >
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-rose-300">Culinary best practice</p>
        <h2 className="mt-3 text-[clamp(2.25rem,6vw,5rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
          Four golden rules.
        </h2>
      </motion.div>

      <div ref={ref} className="mx-auto mt-12 max-w-5xl pb-[10vh]">
        {RULES.map((rule, i) => (
          <RuleCard key={rule.title} index={i} progress={scrollYProgress} {...rule} />
        ))}
      </div>
    </section>
  );
}

function RuleCard({
  index,
  progress,
  title,
  body,
  card,
  accent,
  icon,
}: {
  index: number;
  progress: MotionValue<number>;
  title: string;
  body: string;
  card: string;
  accent: string;
  icon: ReactNode;
}) {
  const total = RULES.length;
  const scale = useTransform(progress, [index / total, 1], [1, 1 - (total - 1 - index) * 0.045]);
  const dim = useTransform(progress, [index / total, 1], [1, 1 - (total - 1 - index) * 0.18]);
  const filter = useTransform(dim, (v) => `brightness(${v})`);

  return (
    <div className="sticky h-[78svh]" style={{ top: `calc(64px + ${index * 22}px)` }}>
      <motion.article
        style={{ scale, filter }}
        className={`origin-top grid min-h-[min(56svh,460px)] gap-8 rounded-4xl border bg-linear-to-br p-7 shadow-[0_-20px_60px_rgba(0,0,0,0.6)] sm:p-12 md:grid-cols-[auto_1fr] md:items-end ${card}`}
      >
        <div className="flex items-start justify-between md:flex-col md:justify-between md:self-stretch">
          <span className={`text-[clamp(4rem,12vw,8rem)] font-semibold leading-none tracking-[-0.06em] ${accent}`}>
            0{index + 1}
          </span>
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 ${accent}`}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              {icon}
            </svg>
          </span>
        </div>
        <div>
          <h3 className="text-[clamp(1.75rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-white">{title}</h3>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-neutral-300 sm:text-lg">{body}</p>
        </div>
      </motion.article>
    </div>
  );
}
