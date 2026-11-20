"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";

const STATS = [
  { value: 250, suffix: "M", label: "years in the making", note: "Ancient Khewra seabed salt" },
  { value: 84, label: "trace minerals", note: "Iron, magnesium, potassium, calcium and more" },
  { value: 450, suffix: "°F", label: "searing surface", note: "Dry heat. No steam." },
  { value: 40, suffix: "+", label: "minutes of table heat", note: "Keeps sizzling long after the burner" },
  { value: 90, label: "minutes chilled", note: "From a two-hour freeze" },
  { value: 40, prefix: "~", label: "cooks per slab", note: "Then crushed into finishing salt" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Stats() {
  return (
    <section className="bg-black px-6 pb-[14vh]">
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: EASE }}
          className="text-[clamp(2.25rem,5.5vw,4.5rem)] font-semibold tracking-[-0.04em] text-white"
        >
          By the numbers.
        </motion.h2>

        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-12 sm:gap-x-10 lg:grid-cols-3">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.9, ease: EASE, delay: (i % 3) * 0.08 }}
              className="border-t border-white/15 pt-5"
            >
              <CountUp to={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
              <p className="mt-2 text-sm font-medium text-white sm:text-base">{stat.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500 sm:text-sm">{stat.note}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CountUp({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const calm = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!inView || !el) return;
    if (calm) {
      el.textContent = `${prefix}${to}${suffix}`;
      return;
    }
    const controls = animate(0, to, {
      duration: 1.8,
      ease: EASE,
      onUpdate: (v) => {
        el.textContent = `${prefix}${Math.round(v)}${suffix}`;
      },
    });
    return () => controls.stop();
  }, [inView, calm, to, prefix, suffix]);

  return (
    <span
      ref={ref}
      className="block bg-linear-to-br from-white via-rose-100 to-amber-300 bg-clip-text text-[clamp(3rem,8vw,6rem)] font-semibold leading-none tracking-[-0.05em] text-transparent tabular-nums"
    >
      {prefix}0{suffix}
    </span>
  );
}
