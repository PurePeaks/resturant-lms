"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export interface NavTabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  badge?: number | string;
}

interface NavbarProps {
  title: string;
  subtitle?: string;
  portalType: "super-admin" | "manager" | "staff";
  tabs: NavTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function Navbar({
  title,
  subtitle,
  portalType,
  tabs,
  activeTab,
  onTabChange,
}: NavbarProps) {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const roleBadge = () => {
    switch (portalType) {
      case "super-admin":
        return {
          label: "Super Admin",
          bg: "bg-purple-950/80 border-purple-500/30 text-purple-400",
          dot: "bg-purple-400",
        };
      case "manager":
        return {
          label: "General Manager",
          bg: "bg-blue-950/80 border-blue-500/30 text-blue-400",
          dot: "bg-blue-400",
        };
      case "staff":
      default:
        return {
          label: "Certified Staff",
          bg: "bg-emerald-950/80 border-emerald-500/30 text-emerald-400",
          dot: "bg-emerald-400",
        };
    }
  };

  const badge = roleBadge();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/85 backdrop-blur-md px-4 sm:px-6">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4">
          {/* Brand & Portal Context */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700/80 text-white shadow-sm hover:border-neutral-600 transition"
              title="Return to Home"
            >
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">{title}</span>
                <span
                  className={`hidden sm:inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${badge.bg}`}
                >
                  <span className={`h-1 w-1 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
              </div>
              {subtitle && (
                <p className="hidden md:block text-[11px] text-neutral-400 leading-none mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Desktop Tab Switcher */}
          <nav className="hidden lg:flex items-center gap-1 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 p-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-neutral-800 text-white shadow-sm border border-neutral-700/80"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 ${active ? "text-blue-400" : "text-neutral-400"}`}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span className="ml-0.5 rounded-full bg-neutral-950 px-1.5 py-0.2 text-[10px] font-mono text-neutral-300">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Header Utilities & Hamburger Trigger */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Verification link shortcut */}
            <Link
              href="/verify"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
              title="Public Accreditation Verification"
            >
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="hidden xl:inline">Verify</span>
            </Link>

            {/* User Avatar & Name */}
            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-neutral-800 text-right">
              <div>
                <p className="text-xs font-semibold text-white leading-tight">
                  {session?.user?.name || "User"}
                </p>
                <p className="text-[10px] text-neutral-500 font-mono leading-tight">
                  {session?.user?.email}
                </p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-200">
                {(session?.user?.name || "U").charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-red-950/40 hover:border-red-500/30 hover:text-red-300 transition"
              title="Sign out of account"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign out</span>
            </button>

            {/* Hamburger Button (Mobile + Quick Navigation) */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                mobileMenuOpen
                  ? "bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-600/30"
                  : "bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hamburger Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop Blur Clickable Dismiss */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          />

          {/* Sliding Drawer Container */}
          <div className="relative z-10 w-full max-w-sm h-full bg-neutral-950 border-l border-neutral-800 shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              {/* Drawer Top Row */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Navigation Menu</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${badge.bg}`}
                  >
                    <span className={`h-1 w-1 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* User Profile Card */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md">
                    {(session?.user?.name || "U").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {session?.user?.name || "Staff Member"}
                    </p>
                    <p className="text-xs text-neutral-400 font-mono">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <div className="pt-2 text-[11px] text-neutral-500 flex justify-between border-t border-neutral-800/80 mt-2">
                  <span>Organization</span>
                  <span className="font-semibold text-neutral-300">
                    {session?.user?.tenantName || "Platform Central"}
                  </span>
                </div>
              </div>

              {/* Portal Feature Tabs */}
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold px-1">
                  Portal Features
                </div>

                <div className="space-y-1.5">
                  {tabs.map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          onTabChange(tab.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full text-left rounded-2xl p-3.5 transition-all flex items-start gap-3.5 border ${
                          active
                            ? "bg-blue-600/15 border-blue-500/50 text-white shadow-sm ring-1 ring-blue-500/30"
                            : "bg-neutral-900/50 border-neutral-800/80 text-neutral-300 hover:bg-neutral-900 hover:border-neutral-700"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                            active
                              ? "bg-blue-600 border-blue-400 text-white shadow-sm"
                              : "bg-neutral-800 border-neutral-700 text-neutral-400"
                          }`}
                        >
                          {tab.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold leading-tight truncate">
                              {tab.label}
                            </span>
                            {tab.badge !== undefined && (
                              <span className="rounded-full bg-neutral-800 border border-neutral-700 px-2 py-0.2 text-[10px] font-mono text-neutral-300">
                                {tab.badge}
                              </span>
                            )}
                          </div>
                          {tab.description && (
                            <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                              {tab.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Utilities */}
            <div className="space-y-3 pt-6 border-t border-neutral-800">
              <Link
                href="/verify"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-300 hover:bg-neutral-850 hover:text-white transition"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Public Accreditation Verification</span>
                </div>
                <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-xs font-semibold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out of Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
