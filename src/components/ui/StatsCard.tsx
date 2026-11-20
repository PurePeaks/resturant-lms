import React from "react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string; // tailwind color class e.g. "text-indigo-400"
}

export default function StatsCard({ label, value, icon, accent = "text-indigo-400" }: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex items-center gap-3">
        <div className={`text-2xl ${accent}`}>{icon}</div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            {label}
          </p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

