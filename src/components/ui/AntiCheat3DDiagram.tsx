"use client";

import { motion } from "framer-motion";

export default function AntiCheat3DDiagram() {
  return (
    <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-[#141416] via-[#0d0d0f] to-[#080809] p-6 sm:p-8 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
      {/* Background ambient grid and glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header telemetry tag */}
      <div className="relative z-10 flex items-center justify-between pb-6 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-semibold">
            Anti-Cheat Verification Engine
          </span>
        </div>
        <span className="text-[11px] font-mono text-neutral-500">Protocol v2.4</span>
      </div>

      {/* 3D Visual Flow Layers */}
      <div className="relative z-10 py-6 space-y-4">
        {/* Tier 1: Client Video High-Water Mark */}
        <motion.div
          whileHover={{ x: 6, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-between rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/30 border border-indigo-400/30 text-indigo-300">
              <svg className="w-4 h-4 fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-wide">Tier 1: Client High-Water Mark (HWM)</p>
              <p className="text-[11px] text-neutral-400">Scrubbing strictly clamped to watched intervals</p>
            </div>
          </div>
          <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
            Realtime Locked
          </span>
        </motion.div>

        {/* Downward Pulse Flow Line */}
        <div className="flex justify-center -my-1">
          <div className="h-5 w-[1.5px] bg-gradient-to-b from-indigo-500 to-amber-500" />
        </div>

        {/* Tier 2: Drift & Jitter Filtering */}
        <motion.div
          whileHover={{ x: 6, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600/30 border border-amber-400/30 text-amber-300">
              <svg className="w-4 h-4 fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-wide">Tier 2: Network Jitter Tolerance Window</p>
              <p className="text-[11px] text-neutral-400">Permits 12-second packet latency without false alerts</p>
            </div>
          </div>
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
            &plusmn;12s Buffer
          </span>
        </motion.div>

        {/* Downward Pulse Flow Line */}
        <div className="flex justify-center -my-1">
          <div className="h-5 w-[1.5px] bg-gradient-to-b from-amber-500 to-emerald-500" />
        </div>

        {/* Tier 3: Neon Postgres Cryptographic Verification */}
        <motion.div
          whileHover={{ x: 6, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600/30 border border-emerald-400/30 text-emerald-300">
              <svg className="w-4 h-4 fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-white tracking-wide">Tier 3: Database Verification Vault</p>
              <p className="text-[11px] text-neutral-400">Rejects illegal seek deltas with HTTP 422 Snapback</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
            Auto-Snapback
          </span>
        </motion.div>
      </div>

      {/* Footer live status bar */}
      <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
        <span>Tamper Probability: &lt; 0.001%</span>
        <span className="text-emerald-400">Integrity: Verified</span>
      </div>
    </div>
  );
}
