"use client";

import { useState, useEffect, useCallback } from "react";
import InviteStaffModal from "@/components/ui/InviteStaffModal";
import StaffProgressTable from "@/components/ui/StaffProgressTable";
import StatsCard from "@/components/ui/StatsCard";
import PortalLayout, { NavTabItem } from "@/components/ui/PortalLayout";
import SaltEquipmentManager from "@/components/ui/SaltEquipmentManager";
import AuditLogPanel from "@/components/ui/AuditLogPanel";

interface ModuleItem {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  questionCount: number;
  createdAt: string;
}

interface StaffItem {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface ManagerViewProps {
  tenantName: string;
  managerName: string;
}

export default function ManagerView({ tenantName, managerName }: ManagerViewProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [modRes, staffRes] = await Promise.all([
        fetch("/api/manager/modules"),
        fetch("/api/manager/staff"),
      ]);

      if (modRes.ok) {
        const modData = await modRes.json();
        setModules(Array.isArray(modData) ? modData : []);
      }
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaff(Array.isArray(staffData) ? staffData : []);
      }
    } catch (err) {
      console.error("Failed to fetch manager data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadData, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleExportCSV = () => {
    window.location.href = "/api/manager/export/compliance";
  };

  // Tabs for Manager Portal (on the side)
  const tabs: NavTabItem[] = [
    {
      id: "overview",
      label: "Overview & KPIs",
      description: "Executive KPI metrics and team health",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      id: "roster",
      label: "Compliance Roster",
      description: "Live staff watch bars, quiz scores, and resets",
      badge: staff.length,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: "curriculums",
      label: "Assigned Curriculums",
      description: "State-accredited culinary training and evaluation modules",
      badge: modules.length,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "equipment",
      label: "Salt Slabs & Equipment",
      description: "Cooking plates 40-cook health meter, metal rings & serving platters",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },

    {
      id: "export",
      label: "Health Inspector Export",
      description: "Inspector-ready CSV compliance reports",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: "activity",
      label: "Activity Log",
      description: "Who changed accounts, passwords and training records",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <PortalLayout
      portalTitle={tenantName}
      portalSubtitle="General Manager Portal"
      portalType="manager"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      <div className="space-y-8">
        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW & KEY METRICS                            */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Header Greeting */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-neutral-900 border border-neutral-800 px-3 py-1 text-xs text-neutral-400 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  {tenantName} Operations
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Welcome, {managerName}
                </h1>
                <p className="mt-1 text-sm text-neutral-400">
                  Assign anti-cheat video curriculums, review compliance scores, and verify employee certificates.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setIsStaffModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-lg shadow-blue-600/25"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span>Onboard Staff</span>
                </button>
              </div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatsCard
                label="Active Staff"
                value={staff.length}
                icon={
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                }
                accent="text-blue-400"
              />
              <StatsCard
                label="Published Modules"
                value={modules.length}
                icon={
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                }
                accent="text-purple-400"
              />
              <StatsCard
                label="Passing Standard"
                value="90%"
                icon={
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                }
                accent="text-emerald-400"
              />
              <StatsCard
                label="Anti-Cheat System"
                value="Active"
                icon={
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                }
                accent="text-amber-400"
              />
            </div>

            {/* Himalayan Salt Cooking Slab & Equipment Quick Widget */}
            <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-neutral-900 to-neutral-900 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-950/60 border border-rose-500/30 px-3 py-0.5 text-[11px] font-semibold text-rose-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                  Salt Slab &amp; Equipment Lifecycle System
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Himalayan Salt Cooking Slabs &bull; 40-Cook Health Meter Active
                </h3>
                <p className="text-xs text-neutral-400 max-w-2xl">
                  Log table sears, monitor the 40-cook lifespan depletion threshold, and manage metal ring base trivets and cold steak serving boards.
                </p>
              </div>

              <button
                onClick={() => setActiveTab("equipment")}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-bold text-white transition shadow-lg shadow-rose-900/30 self-start md:self-auto shrink-0"
              >
                <span>Manage Salt Inventory</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Quick Feature Jump Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab("roster")}
                className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 text-left hover:border-blue-500/50 hover:bg-neutral-900 transition group shadow-lg"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-950 border border-blue-500/30 text-blue-400 mb-4 group-hover:scale-105 transition">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white">Live Compliance Roster</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Track employee video watch progress in real time, view quiz scores, and reset course attempts.
                </p>
              </button>

              <button
                onClick={() => setActiveTab("curriculums")}
                className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 text-left hover:border-purple-500/50 hover:bg-neutral-900 transition group shadow-lg"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-950 border border-purple-500/30 text-purple-400 mb-4 group-hover:scale-105 transition">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white">Assigned Curriculums</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  View standardized culinary video lessons and evaluation quizzes assigned to your restaurant.
                </p>
              </button>

              <button
                onClick={() => setActiveTab("export")}
                className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6 text-left hover:border-emerald-500/50 hover:bg-neutral-900 transition group shadow-lg"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 mb-4 group-hover:scale-105 transition">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-white">Health Inspector Export</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Export state/city food safety compliance audit reports in standard CSV format.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: COMPLIANCE ROSTER TABLE                           */}
        {/* ======================================================== */}
        {activeTab === "roster" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Staff Training &amp; Compliance Roster
                </h1>
                <p className="text-xs md:text-sm text-neutral-400 mt-1">
                  Real-time High-Water Mark verification, watch seconds, and official accreditation certificates.
                </p>
              </div>

              <button
                onClick={() => setIsStaffModalOpen(true)}
                className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition shadow-lg shadow-blue-600/25"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Add Staff Member</span>
              </button>
            </div>

            <StaffProgressTable />
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ASSIGNED CURRICULUMS (READ-ONLY INSPECTION)       */}
        {/* ======================================================== */}
        {activeTab === "curriculums" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Assigned Compliance Curriculums
                </h1>
                <p className="text-xs md:text-sm text-neutral-400 mt-1">
                  Official state-accredited training modules and evaluations. Centrally governed by Super Admin.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-blue-500/30 bg-blue-950/40 px-3.5 py-2 text-xs font-semibold text-blue-400">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                <span>Super Admin Governed Library</span>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-800 bg-neutral-900/90 p-6 md:p-8 space-y-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
                <span className="text-sm font-bold uppercase tracking-wider text-neutral-300">
                  Published Venue Modules ({modules.length})
                </span>
                <span className="text-xs text-neutral-400">
                  Sequential High-Water Mark &bull; 80% Passing Required
                </span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-neutral-500">
                  Loading curriculums from database...
                </div>
              ) : modules.length === 0 ? (
                <div className="p-12 text-center text-xs text-neutral-500">
                  No modules assigned to this venue yet. Your platform Super Admin will publish modules here.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {modules.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5 space-y-4 hover:border-neutral-700 transition group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-950/60 border border-blue-500/20 text-blue-400">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-white group-hover:text-blue-300 transition">
                              {m.title}
                            </h3>
                            <p className="text-xs text-neutral-400 line-clamp-1">
                              {m.description || "Video training and evaluation module"}
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 shrink-0">
                          Active
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-neutral-800/80 pt-3 text-xs text-neutral-400">
                        <span className="flex items-center gap-1.5 text-neutral-300">
                          <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{m.questionCount} Quiz Questions</span>
                        </span>

                        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span>Accredited</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: AUDIT EXPORT & HEALTH INSPECTION                  */}
        {/* ======================================================== */}
        {activeTab === "export" && (
          <div className="space-y-6 animate-in fade-in duration-200 max-w-3xl mx-auto">
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900/90 p-8 space-y-6 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 shadow-md">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Health Inspector Compliance Export
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Export a state/city food safety compliance report for {tenantName} ready for regulatory health audits.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 space-y-3 text-xs text-neutral-300">
                <div className="font-semibold text-white uppercase tracking-wider text-[11px]">
                  Included in This Compliance Record:
                </div>
                <ul className="space-y-2 text-neutral-400">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Employee Full Legal Names, Email Addresses, and Venue Roster status</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Anti-cheat verified watch times and completion percentages</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Accreditation quiz scores measured against the strict 90% pass threshold</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>Direct links to official downloadable and verifiable digital certificates</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleExportCSV}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3.5 text-xs font-semibold text-white transition shadow-lg shadow-emerald-600/30"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Inspector CSV Report</span>
                </button>

                <button
                  onClick={() => setActiveTab("roster")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-800 px-5 py-3.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-700 hover:text-white transition"
                >
                  <span>Preview Live Table</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: SALT SLABS & EQUIPMENT (40-COOK HEALTH METER)     */}
        {/* ======================================================== */}
        {activeTab === "equipment" && (
          <div className="animate-in fade-in duration-200">
            <SaltEquipmentManager tenantName={tenantName} />
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Activity Log</h1>
              <p className="text-xs md:text-sm text-neutral-400 mt-1">
                A record of account, password and training changes at {tenantName}.
              </p>
            </div>
            <AuditLogPanel />
          </div>
        )}
      </div>

      {/* Modals */}
      <InviteStaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onStaffAdded={loadData}
      />
    </PortalLayout>
  );
}
