import Image from "next/image";
import Link from "next/link";

export const authInputClass =
  "w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500";

export const authLabelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400";

export const authButtonClass =
  "w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 shadow-lg shadow-indigo-600/30";

export function AuthMessage({ tone, children }: { tone: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-red-500/40 bg-red-950/40 text-red-300",
    success: "border-emerald-500/40 bg-emerald-950/40 text-emerald-300",
    info: "border-amber-500/40 bg-amber-950/30 text-amber-200",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border p-3 text-xs leading-relaxed ${styles}`}>
      {children}
    </div>
  );
}

/** Centered card layout shared by the sign-in related pages. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block mb-3">
            <Image
              src="/logo-mark.png"
              alt="Himalayan Reserves"
              width={438}
              height={148}
              priority
              className="mx-auto h-7 w-auto"
            />
          </Link>
          <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{subtitle}</p>}
        </div>

        <div className="space-y-4 rounded-3xl border border-neutral-800 bg-neutral-900 p-6 md:p-7 shadow-xl">
          {children}
        </div>

        {footer && <div className="text-center">{footer}</div>}
      </div>
    </div>
  );
}
