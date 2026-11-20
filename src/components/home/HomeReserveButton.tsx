"use client";

import { useReserveModal } from "./ReserveModalContext";

interface HomeReserveButtonProps {
  className?: string;
  variant?: "nav" | "hero" | "final" | "pill" | "inline";
  defaultKit?: string;
  children?: React.ReactNode;
}

export default function HomeReserveButton({
  className = "",
  variant = "nav",
  defaultKit,
  children,
}: HomeReserveButtonProps) {
  const { openReserveModal } = useReserveModal();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    openReserveModal(defaultKit);
  };

  if (variant === "hero" || variant === "final") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-linear-to-r from-rose-400 via-rose-500 to-amber-400 px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-rose-500/25 transition-[transform,filter] duration-300 hover:brightness-110 active:scale-95 ${className}`}
      >
        <span>{children || "Reserve a Slab Kit"}</span>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 12h13m-5-6 6 6-6 6" />
        </svg>
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 transition hover:border-rose-400 hover:bg-rose-500/20 active:scale-95 ${className}`}
      >
        <span>{children || "Reserve This Set"}</span>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`link-underline inline-flex items-center gap-1 text-xs text-rose-300 hover:text-white transition-colors ${className}`}
      >
        <span>{children || "Reserve your slab set"}</span>
        <span aria-hidden>&rarr;</span>
      </button>
    );
  }

  // default 'nav' variant
  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1 text-[11px] font-semibold text-rose-300 transition-colors hover:border-rose-400 hover:bg-rose-500/20 active:scale-95 ${className}`}
    >
      {children || "Reserve Kit"}
    </button>
  );
}
