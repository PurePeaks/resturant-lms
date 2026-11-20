"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import SecuritySettingsModal from "@/components/ui/SecuritySettingsModal";

export interface NavTabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
  badge?: number | string;
}

interface PortalLayoutProps {
  portalTitle: string;
  portalSubtitle?: string;
  portalType: "super-admin" | "manager" | "staff";
  tabs: NavTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
}

export default function PortalLayout({
  portalTitle,
  portalSubtitle,
  portalType,
  tabs,
  activeTab,
  onTabChange,
  children,
}: PortalLayoutProps) {
  const { data: session } = useSession();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Prevent background scroll when mobile sidebar drawer is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileSidebarOpen]);

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
  const currentTabObj = tabs.find((t) => t.id === activeTab) || tabs[0];

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-5">
      {/* Top Section */}
      <div className="space-y-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700/80 text-white shadow-sm hover:border-neutral-600 transition"
            title="Return to Home"
          >
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight truncate">
                {portalTitle}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.2 text-[10px] font-semibold border ${badge.bg}`}
              >
                <span className={`h-1 w-1 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-3.5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-bold text-white text-xs shadow-sm">
              {(session?.user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {session?.user?.name || "User"}
              </p>
              <p className="text-[10px] text-neutral-400 font-mono truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-800/80 pt-2 text-[10px] text-neutral-500">
            <span>Venue</span>
            <span className="font-semibold text-neutral-300 truncate max-w-[120px]">
              {session?.user?.tenantName || "Platform Central"}
            </span>
          </div>
        </div>

        {/* Navigation Tabs on the Side */}
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold px-2 mb-2">
            Features &amp; Modules
          </div>

          <nav className="space-y-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full text-left rounded-2xl px-3.5 py-3 transition-all flex items-center justify-between gap-3 border ${
                    active
                      ? "bg-blue-600/15 border-blue-500/50 text-white shadow-sm ring-1 ring-blue-500/30"
                      : "border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/70"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all ${
                        active
                          ? "bg-blue-600 border-blue-400 text-white shadow-sm"
                          : "bg-neutral-900 border-neutral-800 text-neutral-400"
                      }`}
                    >
                      {tab.icon}
                    </span>
                    <span className="text-xs font-semibold truncate leading-tight">
                      {tab.label}
                    </span>
                  </div>

                  {tab.badge !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold shrink-0 ${
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-neutral-900 border border-neutral-800 text-neutral-400"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="space-y-2 pt-6 border-t border-neutral-800/80">
        <button
          type="button"
          onClick={() => setSecurityModalOpen(true)}
          className="w-full flex items-center justify-between rounded-xl border border-neutral-800/80 bg-neutral-900/50 px-3.5 py-2.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Password &amp; Security</span>
          </div>
          <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <Link
          href="/verify"
          className="w-full flex items-center justify-between rounded-xl border border-neutral-800/80 bg-neutral-900/50 px-3.5 py-2.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Public Verification</span>
          </div>
          <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-950/20 px-3.5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* 1. Permanent Side Navbar on Desktop / Full Screen */}
      <aside className="hidden lg:flex w-64 xl:w-72 shrink-0 h-screen sticky top-0 border-r border-neutral-800 bg-neutral-950 overflow-y-auto">
        {renderSidebarContent()}
      </aside>

      {/* 2. Mobile Drawer Navigation (Triggered by Hamburger on small screens) */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            onClick={() => setMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
          />

          {/* Slide-out Left Sidebar Drawer */}
          <div className="relative z-10 w-72 h-full bg-neutral-950 border-r border-neutral-800 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200">
            {renderSidebarContent()}
          </div>
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-16 border-b border-neutral-800 bg-neutral-950/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation sidebar"
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Current Active View Title Breadcrumb */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-400 hidden sm:inline">
                  {portalTitle}
                </span>
                <span className="text-xs text-neutral-600 hidden sm:inline">/</span>
                <span className="text-sm font-bold text-white tracking-tight">
                  {currentTabObj.label}
                </span>
              </div>
              {portalSubtitle && (
                <p className="hidden md:block text-[11px] text-neutral-500 leading-tight">
                  {portalSubtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/verify"
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/70 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
              title="Accreditation Verification"
            >
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="hidden sm:inline">Verify Credential</span>
            </Link>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-red-400"
              title="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Security & Password Settings Modal */}
      <SecuritySettingsModal
        isOpen={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
        userName={session?.user?.name || "User"}
        userEmail={session?.user?.email || ""}
        userRole={session?.user?.role || "STAFF"}
      />
    </div>
  );
}
