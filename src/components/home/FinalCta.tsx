"use client";

import { motion } from "framer-motion";
import CssSlab from "./CssSlab";
import CtaButton from "./CtaButton";
import HomeReserveButton from "./HomeReserveButton";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-black px-6 py-[16vh] text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[90vmax] w-[90vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(225,29,72,0.2)_0%,rgba(225,29,72,0.12)_30%,rgba(225,29,72,0.03)_52%,transparent_68%)] motion-safe:animate-aurora" />
        <div
          className="absolute left-1/3 top-2/3 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.15)_0%,rgba(245,158,11,0.09)_30%,rgba(245,158,11,0.02)_52%,transparent_68%)] motion-safe:animate-aurora"
          style={{ animationDelay: "-7s" }}
        />
      </div>

      <div className="relative mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -20 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1.4, ease: EASE }}
          className="mx-auto mb-10 w-fit motion-safe:animate-float"
        >
          <CssSlab size={180} tone="hot" spin tilt={64} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1, ease: EASE, delay: 0.1 }}
          className="text-[clamp(2.75rem,8vw,6.5rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-white"
        >
          Bring the sizzle
          <span className="block bg-linear-to-r from-rose-300 via-amber-200 to-orange-400 bg-clip-text pb-[0.06em] text-transparent">
            to the table.
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1, ease: EASE, delay: 0.2 }}
          className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-neutral-400 sm:text-lg"
        >
          Ancient Himalayan salt, a gentle three-stage heat, and forty unforgettable dinners.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1, ease: EASE, delay: 0.3 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <HomeReserveButton variant="final">
            Reserve a Slab Kit
          </HomeReserveButton>
          <CtaButton href="#story" variant="ghost">Replay the story</CtaButton>
          <CtaButton href="/login" variant="ghost">
            Restaurant sign in
          </CtaButton>
        </motion.div>
      </div>
    </section>
  );
}
