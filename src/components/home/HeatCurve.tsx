"use client";

import { useRef } from "react";
import { motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion";
import type { MotionValue } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1] as const;

// Chart space: 0–45 minutes across, 50–500 °F up.
const W = 640;
const H = 340;
const PAD = { l: 48, r: 18, t: 24, b: 40 };
const X = (min: number) => PAD.l + (min / 45) * (W - PAD.l - PAD.r);
const Y = (f: number) => PAD.t + (1 - (f - 50) / 450) * (H - PAD.t - PAD.b);

const POINTS: [number, number][] = [
  [0, 72],
  [3, 200],
  [15, 200],
  [18, 300],
  [30, 300],
  [34, 450],
  [45, 465],
];

const CURVE = POINTS.reduce((d, [m, f], i) => {
  if (i === 0) return `M ${X(m)} ${Y(f)}`;
  const [pm, pf] = POINTS[i - 1];
  const cx = (X(pm) + X(m)) / 2;
  return `${d} C ${cx} ${Y(pf)}, ${cx} ${Y(f)}, ${X(m)} ${Y(f)}`;
}, "");
const AREA = `${CURVE} L ${X(45)} ${Y(50)} L ${X(0)} ${Y(50)} Z`;

const STAGES = [
  { at: 0.05, temp: "200°F", title: "Warm", body: "15 minutes on low drives out trapped moisture.", min: 9 },
  { at: 0.38, temp: "300°F", title: "Build", body: "15 more minutes so the crystal heats evenly.", min: 24 },
  { at: 0.72, temp: "450°F+", title: "Sear", body: "Finish hot. Now it’s ready for steak.", min: 39.5 },
];

export default function HeatCurve() {
  const ref = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);
  const pathLength = useRef(0);
  const dot = useRef<SVGGElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.55"] });
  const draw = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.001 });
  const clipWidth = useTransform(draw, [0, 1], [0, W]);

  useMotionValueEvent(draw, "change", (v) => {
    const p = path.current;
    const g = dot.current;
    if (!p || !g) return;
    // The path never changes, so measure its length once.
    pathLength.current ||= p.getTotalLength();
    const pt = p.getPointAtLength(pathLength.current * Math.min(1, Math.max(0, v)));
    g.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
    g.style.opacity = v > 0.01 ? "1" : "0";
  });

  return (
    <section id="heat-curve" className="scroll-mt-12 bg-black px-5 py-[14vh] sm:px-6">
      <div ref={ref} className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-amber-300">The secret to a long-lasting slab</p>
          <h2 className="mt-3 text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em] text-white">
            Patience makes the sear.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-neutral-400 sm:text-base">
            Never rush a cold slab. Three gentle steps let moisture escape so the crystal stays whole for 40+ dinners.
          </p>

          <ol className="mt-8 space-y-3">
            {STAGES.map((s, i) => (
              <Stage key={s.title} progress={draw} index={i + 1} {...s} />
            ))}
          </ol>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
            className="mt-6 flex items-center gap-4 rounded-2xl border border-amber-400/25 bg-amber-500/7 p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3c3 4 6 7.2 6 10.5A6 6 0 016 13.5C6 10.2 9 7 12 3z" />
              </svg>
            </span>
            <p className="text-sm leading-snug text-neutral-300">
              <strong className="font-semibold text-white">The sizzle test.</strong> Flick a drop of water on the slab. If
              it dances and vanishes instantly, you&apos;re at 450&deg;F.
            </p>
          </motion.div>
        </div>

        <div className="relative rounded-[28px] border border-white/10 bg-linear-to-b from-neutral-950 to-black p-3 sm:p-6">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Slab temperature over 45 minutes of preheating: 200°F, then 300°F, then 450°F and above">
            <defs>
              <linearGradient id="curve-stroke" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#fda4af" />
                <stop offset="55%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <linearGradient id="curve-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
              </linearGradient>
              <clipPath id="curve-reveal">
                <motion.rect x="0" y="0" height={H} width={clipWidth} />
              </clipPath>
            </defs>

            {[100, 200, 300, 400, 500].map((f) => (
              <g key={f}>
                <line x1={PAD.l} x2={W - PAD.r} y1={Y(f)} y2={Y(f)} stroke="white" strokeOpacity={0.07} />
                <text x={PAD.l - 10} y={Y(f) + 4} textAnchor="end" fontSize="11" fill="#737373">
                  {f}&deg;
                </text>
              </g>
            ))}
            {[0, 15, 30, 45].map((m) => (
              <text key={m} x={X(m)} y={H - 14} textAnchor="middle" fontSize="11" fill="#737373">
                {m} min
              </text>
            ))}

            <path d={AREA} fill="url(#curve-fill)" clipPath="url(#curve-reveal)" />
            <path d={CURVE} fill="none" stroke="white" strokeOpacity={0.08} strokeWidth={3} />
            <motion.path
              ref={path}
              d={CURVE}
              fill="none"
              stroke="url(#curve-stroke)"
              strokeWidth={3.5}
              strokeLinecap="round"
              style={{ pathLength: draw }}
            />

            {STAGES.map((s) => (
              <StageLabel key={s.title} progress={draw} at={s.at} x={X(s.min)} temp={s.temp} />
            ))}

            <g ref={dot} style={{ opacity: 0 }}>
              <circle r="14" fill="#f97316" opacity="0.25" />
              <circle r="6" fill="#fff" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}

function Stage({
  progress,
  at,
  index,
  temp,
  title,
  body,
}: {
  progress: MotionValue<number>;
  at: number;
  index: number;
  temp: string;
  title: string;
  body: string;
}) {
  const lit = useTransform(progress, [at, at + 0.08], [0, 1]);
  const opacity = useTransform(lit, [0, 1], [0.35, 1]);
  const borderColor = useTransform(lit, [0, 1], ["rgba(255,255,255,0.08)", "rgba(251,191,36,0.45)"]);
  return (
    <motion.li style={{ opacity, borderColor }} className="flex items-center gap-4 rounded-2xl border bg-white/2 p-4">
      <span className="w-16 shrink-0 text-lg font-semibold tracking-tight text-amber-200 tabular-nums">{temp}</span>
      <div>
        <p className="text-sm font-semibold text-white">
          Stage {index} &middot; {title}
        </p>
        <p className="text-xs leading-relaxed text-neutral-400 sm:text-sm">{body}</p>
      </div>
    </motion.li>
  );
}

function StageLabel({ progress, at, x, temp }: { progress: MotionValue<number>; at: number; x: number; temp: string }) {
  const opacity = useTransform(progress, [at + 0.04, at + 0.12], [0, 1]);
  const y = useTransform(progress, [at + 0.04, at + 0.12], [8, 0]);
  const f = parseInt(temp, 10);
  return (
    <motion.g style={{ opacity, y }}>
      <rect x={x - 34} y={Y(f) - 38} width="68" height="24" rx="12" fill="white" fillOpacity="0.08" />
      <text x={x} y={Y(f) - 21.5} textAnchor="middle" fontSize="12" fontWeight="600" fill="#fde68a">
        {temp}
      </text>
    </motion.g>
  );
}
