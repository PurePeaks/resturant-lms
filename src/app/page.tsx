import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { auth } from "@/auth";
import { ROLE_DASHBOARD } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";
import ScrollProgressBar from "@/components/ui/ScrollProgressBar";
import HeroStory from "@/components/home/HeroStory";
import Marquee from "@/components/home/Marquee";
import Manifesto from "@/components/home/Manifesto";
import Stats from "@/components/home/Stats";
import ScienceBento from "@/components/home/ScienceBento";
import HeatCurve from "@/components/home/HeatCurve";
import CloserLook from "@/components/home/CloserLook";
import DishesRail from "@/components/home/DishesRail";
import GoldenRules from "@/components/home/GoldenRules";
import FinalCta from "@/components/home/FinalCta";
import HomeReserveButton from "@/components/home/HomeReserveButton";
import { ReserveModalProvider } from "@/components/home/ReserveModalContext";

export const metadata: Metadata = {
  title: "Himalayan Reserves — Hand-Carved Himalayan Salt Slabs for Cooking",
  description:
    "Cook, sear and serve on hand-carved Himalayan salt slabs. Heat to 450°F for steak or chill to 0°F for sashimi, with 84 trace minerals in every bite.",
};

const NAV_LINKS = [
  { href: "#story", label: "Overview" },
  { href: "#science", label: "Science" },
  { href: "#heat-curve", label: "Heat curve" },
  { href: "#closer-look", label: "Closer look" },
  { href: "#dishes", label: "Dishes" },
  { href: "#rules", label: "Care" },
];

export default function HomePage() {
  return (
    <ReserveModalProvider>
      <div className="min-h-screen overflow-x-clip bg-black text-white antialiased selection:bg-rose-500 selection:text-white">
        <ScrollProgressBar />

        {/* ─── Navigation ─────────────────────────────────────────────────── */}
        <header className="fixed inset-x-0 top-0 z-50 h-11 border-b border-white/10 bg-black/60 backdrop-blur-xl backdrop-saturate-150">
          <nav className="mx-auto grid h-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
            <Link href="/" aria-label="The Himalayan Reserve, home" className="group col-start-1 flex items-center gap-3 justify-self-start">
              <Image
                src="/logo-mark.png"
                alt=""
                width={438}
                height={148}
                priority
                className="h-6 w-auto transition-[transform,filter] duration-500 ease-out group-hover:scale-105 group-hover:drop-shadow-[0_0_10px_rgba(232,141,130,0.55)]"
              />
              <span aria-hidden className="hidden h-4 w-px bg-white/20 sm:block" />
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-300 transition-colors duration-300 group-hover:text-white sm:block">
                The Himalayan Reserve
              </span>
            </Link>

            <div className="col-start-2 hidden items-center gap-7 text-xs text-neutral-300 lg:flex">
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="link-underline transition-colors hover:text-white">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="col-start-3 justify-self-end flex items-center gap-3">
              <HomeReserveButton variant="nav">Reserve a Slab</HomeReserveButton>
              <Suspense fallback={<SignInLink />}>
                <AccountLink />
              </Suspense>
            </div>
          </nav>
        </header>

      <main>
        <HeroStory />
        <Marquee />
        <Manifesto />
        <Stats />
        <ScienceBento />
        <HeatCurve />
        <CloserLook />
        <DishesRail />
        <GoldenRules />
        <FinalCta />
      </main>

      {/* ─── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-black px-6 py-14 text-xs text-neutral-500">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <p className="text-sm font-semibold text-white">
                Salt<span className="text-rose-300">Craft</span>
              </p>
              <p className="max-w-xs leading-relaxed">
                Hand-carved Himalayan salt slabs, searing science and table-side dining.
              </p>
            </div>
            <FooterColumn
              title="The slab"
              links={[
                ["#reserve", "Reserve your slab set"],
                ["#story", "250 million years"],
                ["#story", "84 trace minerals"],
                ["#science", "Why it tastes better"],
                ["#closer-look", "The set"],
              ]}
            />
            <FooterColumn
              title="Cooking"
              links={[
                ["#heat-curve", "3-stage preheat"],
                ["#dishes", "Ribeye & wagyu"],
                ["#dishes", "Chilled carpaccio"],
                ["#dishes", "Seared scallops"],
              ]}
            />
            <FooterColumn
              title="Care"
              links={[
                ["#rules", "Oil the meat"],
                ["#rules", "The sizzle test"],
                ["#rules", "Zero-soap cleaning"],
                ["#rules", "Finishing salt"],
              ]}
            />
          </div>
          <div className="flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
            <p>
              &copy; <CopyrightYear /> Himalayan Reserves. Crafted for food lovers and steak connoisseurs.
            </p>
            <Link href="/login" className="group link-underline inline-flex items-center gap-1 text-neutral-400 transition-colors hover:text-white">
              Restaurant portal sign in
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                &rarr;
              </span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  </ReserveModalProvider>
  );
}

async function AccountLink() {
  // auth() touches crypto before reading cookies, so opt this island into request time.
  await connection();
  const session = await auth();
  const role = (session?.user as { role?: UserRole } | undefined)?.role;
  if (!role) return <SignInLink />;
  return (
    <Link
      href={ROLE_DASHBOARD[role]}
      className="rounded-full bg-white px-3.5 py-1 text-[11px] font-semibold text-black transition-[box-shadow,transform] duration-300 hover:-translate-y-px hover:shadow-[0_6px_24px_-4px_rgba(251,146,60,0.7)] active:scale-95"
    >
      My Dashboard
    </Link>
  );
}

function SignInLink() {
  return (
    <Link
      href="/login"
      className="rounded-full border border-white/20 bg-[linear-gradient(white,white)] bg-size-[0%_100%] bg-no-repeat px-3.5 py-1 text-[11px] font-semibold text-white transition-[background-size,color,border-color,transform] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-white hover:bg-size-[100%_100%] hover:text-black active:scale-95"
    >
      Restaurant Sign In
    </Link>
  );
}

async function CopyrightYear() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}

function FooterColumn({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-300">{title}</p>
      <ul className="space-y-2">
        {links.map(([href, label]) => (
          <li key={label}>
            <a href={href} className="link-underline transition-colors hover:text-white">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
