"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ReserveKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultKit?: string;
}

const KIT_OPTIONS = [
  {
    id: "master-set",
    title: "The Master Searing Set",
    description: "8 × 8 × 2 in hand-carved cooking slab, ring trivet, and care guide.",
    badge: "Most Popular",
  },
  {
    id: "dual-temp",
    title: "Dual Temperature Presentation Set",
    description: "One high-heat searing slab, one chilled raw serving platter, and dual bases.",
    badge: "Table Service",
  },
  {
    id: "commercial-bulk",
    title: "Commercial Restaurant Searing Program",
    description: "12+ culinary slabs, stainless steel cradles, and kitchen compliance access.",
    badge: "Venues",
  },
];

export default function ReserveKitModal({ isOpen, onClose, defaultKit }: ReserveKitModalProps) {
  const [selectedKit, setSelectedKit] = useState(defaultKit || KIT_OPTIONS[0].title);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    referenceCode: string;
    kitType: string;
  } | null>(null);

  // Follow the kit chosen by whichever button opened the modal.
  const [prevDefaultKit, setPrevDefaultKit] = useState(defaultKit);
  if (defaultKit !== prevDefaultKit) {
    setPrevDefaultKit(defaultKit);
    if (defaultKit) setSelectedKit(defaultKit);
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          kitType: selectedKit,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit reservation.");
      }

      setConfirmation({
        referenceCode: data.referenceCode,
        kitType: data.kitType,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error submitting inquiry.");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setConfirmation(null);
    setError(null);
    setName("");
    setEmail("");
    setPhone("");
    setNotes("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetAndClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0d0d10] p-6 sm:p-8 text-white shadow-2xl shadow-rose-950/20 max-h-[92vh] overflow-y-auto"
          >
            {/* Close button */}
            <button
              onClick={resetAndClose}
              className="absolute right-5 top-5 rounded-full p-2 text-neutral-400 hover:bg-white/10 hover:text-white transition"
              aria-label="Close modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {confirmation ? (
              /* Success Confirmation View */
              <div className="py-6 text-center space-y-5 animate-in fade-in duration-300">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-500/20 to-amber-500/10 text-rose-300 shadow-lg shadow-rose-500/20">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>

                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-white">
                    Reservation Allocation Secured
                  </h3>
                  <p className="mt-1.5 text-xs text-neutral-400 max-w-sm mx-auto">
                    Your request for <strong className="text-rose-200">{confirmation.kitType}</strong> has been confirmed.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 max-w-sm mx-auto space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400">
                    Reservation Reference
                  </span>
                  <p className="font-mono text-base font-bold text-rose-300 tracking-wider">
                    {confirmation.referenceCode}
                  </p>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
                  Our cellar concierge will contact you shortly at{" "}
                  <span className="text-white font-medium">{email}</span>
                  {phone ? (
                    <>
                      {" "}or by phone at <span className="text-white font-medium">{phone}</span>
                    </>
                  ) : null}
                  {" "}with pre-conditioning instructions and dispatch timings.
                </p>

                {/* Direct concierge contact reminder */}
                <div className="rounded-2xl border border-white/10 bg-white/3 p-3.5 text-xs text-neutral-400 space-y-1 max-w-sm mx-auto">
                  <p className="font-semibold text-neutral-300">Direct Concierge Inquiries</p>
                  <p className="flex items-center justify-center gap-3 text-neutral-400">
                    <a href="tel:+18008407258" className="hover:text-rose-300 transition">
                      +1 (800) 840-7258
                    </a>
                    <span>&bull;</span>
                    <a href="mailto:concierge@himalayanreserves.com" className="hover:text-rose-300 transition">
                      concierge@himalayanreserves.com
                    </a>
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={resetAndClose}
                    className="w-full sm:w-auto rounded-full bg-white px-8 py-3 text-xs font-bold text-black transition hover:bg-neutral-200"
                  >
                    Return to Experience
                  </button>
                </div>
              </div>
            ) : (
              /* Inquiry Form View */
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-300">
                    Direct Artisan Allocation
                  </div>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Reserve a Himalayan Salt Slab
                  </h3>
                  <p className="mt-1 text-xs text-neutral-400">
                    Hand-carved 250-million-year-old rock salt. Enter your contact info below or connect directly with our cellar concierge.
                  </p>
                </div>

                {/* Direct Concierge Contact Card */}
                <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-3.5 sm:p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300/80 mb-2">
                    Direct Concierge Contact
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <a
                      href="mailto:info@pure-peaks.com"
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-neutral-300 hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-white transition"
                    >
                      <svg className="h-4 w-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">info@pure-peaks.com</span>
                    </a>

                    <a
                      href="tel:+923065567790"
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-neutral-300 hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-white transition"
                    >
                      <svg className="h-4 w-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>+92 (306) 556-7790</span>
                    </a>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
                    {error}
                  </div>
                )}

              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
