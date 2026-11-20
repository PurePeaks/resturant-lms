"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

export type EquipmentType = "COOKING_PLATE" | "METAL_RING" | "SERVING_PLATE";
export type EquipmentStatus = "ACTIVE" | "MAINTENANCE" | "RETIRED";

export interface EquipmentItem {
  id: string;
  tenantId: string;
  name: string;
  type: EquipmentType;
  cooksCount: number;
  maxCooks: number;
  quantity: number;
  status: EquipmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentStats {
  totalCookingPlates: number;
  averagePlateHealth: number;
  totalMetalRings: number;
  totalServingPlates: number;
  nearDepletedCount: number;
  retiredCount: number;
}

interface SaltEquipmentManagerProps {
  tenantName: string;
  tenantId?: string; // Optional if super admin views specific tenant
  isReadOnly?: boolean;
}

export default function SaltEquipmentManager({
  tenantName,
  tenantId,
  isReadOnly = false,
}: SaltEquipmentManagerProps) {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [stats, setStats] = useState<EquipmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EquipmentItem | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<EquipmentType>("COOKING_PLATE");
  const [formQuantity, setFormQuantity] = useState(1);
  const [formCooksCount, setFormCooksCount] = useState(0);
  const [formMaxCooks, setFormMaxCooks] = useState(40);
  const [formStatus, setFormStatus] = useState<EquipmentStatus>("ACTIVE");
  const [formNotes, setFormNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load Equipment Data
  const loadEquipment = useCallback(async () => {
    try {
      setLoading(true);
      const url = tenantId
        ? `/api/manager/equipment?tenantId=${tenantId}`
        : "/api/manager/equipment";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setStats(data.stats || null);
    } catch (err) {
      console.error("Failed to load equipment:", err);
      setToast({ message: "Failed to load equipment inventory.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    const timer = setTimeout(loadEquipment, 0);
    return () => clearTimeout(timer);
  }, [loadEquipment]);

  // Toast Auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Open Modal for Add
  const handleOpenAddModal = (presetType: EquipmentType = "COOKING_PLATE") => {
    setEditingItem(null);
    setFormType(presetType);
    setFormName(
      presetType === "COOKING_PLATE"
        ? `Himalayan Salt Cooking Slab #${(items.filter((i) => i.type === "COOKING_PLATE").length + 1).toString().padStart(2, "0")}`
        : presetType === "METAL_RING"
        ? "Heavy-Duty Base Metal Ring Trivet"
        : "Carved Salt Steak Presentation Platter"
    );
    setFormQuantity(presetType === "COOKING_PLATE" ? 1 : 4);
    setFormCooksCount(0);
    setFormMaxCooks(40);
    setFormStatus("ACTIVE");
    setFormNotes("");
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: EquipmentItem) => {
    setEditingItem(item);
    setFormType(item.type);
    setFormName(item.name);
    setFormQuantity(item.quantity);
    setFormCooksCount(item.cooksCount);
    setFormMaxCooks(item.maxCooks || 40);
    setFormStatus(item.status);
    setFormNotes(item.notes || "");
    setIsModalOpen(true);
  };

  // Submit Add or Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setToast({ message: "Equipment name is required", type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        // PATCH
        const res = await fetch(`/api/manager/equipment/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName,
            type: formType,
            quantity: formQuantity,
            cooksCount: formCooksCount,
            maxCooks: formMaxCooks,
            status: formStatus,
            notes: formNotes,
          }),
        });
        if (!res.ok) throw new Error("Update failed");
        setToast({ message: `Updated "${formName}" successfully.`, type: "success" });
      } else {
        // POST
        const res = await fetch("/api/manager/equipment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            name: formName,
            type: formType,
            quantity: formQuantity,
            cooksCount: formCooksCount,
            maxCooks: formMaxCooks,
            status: formStatus,
            notes: formNotes,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Creation failed");
        }
        setToast({ message: `Added "${formName}" to inventory.`, type: "success" });
      }
      setIsModalOpen(false);
      loadEquipment();
    } catch (err: unknown) {
      setToast({ message: err instanceof Error ? err.message : "Operation failed", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Action: +1 Cook on a Cooking Plate
  const handleIncrementCook = async (item: EquipmentItem, amount = 1) => {
    setActionLoadingId(item.id);
    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? {
              ...i,
              cooksCount: i.cooksCount + amount,
              status: i.cooksCount + amount >= (i.maxCooks || 40) ? "RETIRED" : i.status,
            }
          : i
      )
    );

    try {
      const res = await fetch(`/api/manager/equipment/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "increment_cook",
          amount,
        }),
      });

      if (!res.ok) throw new Error("Failed to log cook");
      const data = await res.json();
      if (data.reachedLifespan) {
        setToast({
          message: `Warning: "${item.name}" has reached its full 40-cook lifespan! Ready for cold repurposing.`,
          type: "error",
        });
      } else {
        setToast({
          message: `Cook cycle logged for "${item.name}" (${item.cooksCount + amount}/${item.maxCooks || 40} cooks).`,
          type: "success",
        });
      }
      loadEquipment();
    } catch (err) {
      setToast({ message: "Failed to log cook cycle", type: "error" });
      loadEquipment();
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Action: Adjust Quantity (+1 or -1 for rings/serving plates)
  const handleAdjustQuantity = async (item: EquipmentItem, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    if (newQty === 0) {
      if (!confirm(`Are you sure you want to remove "${item.name}" from inventory?`)) return;
      handleDeleteItem(item.id, item.name);
      return;
    }

    setActionLoadingId(item.id);
    try {
      const res = await fetch(`/api/manager/equipment/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!res.ok) throw new Error("Quantity update failed");
      loadEquipment();
    } catch (err) {
      setToast({ message: "Failed to update quantity", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Quick Action: Retire Item
  const handleToggleRetire = async (item: EquipmentItem) => {
    const newStatus = item.status === "RETIRED" ? "ACTIVE" : "RETIRED";
    setActionLoadingId(item.id);
    try {
      const res = await fetch(`/api/manager/equipment/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_status", status: newStatus }),
      });
      if (!res.ok) throw new Error("Status update failed");
      setToast({
        message: `Status updated to ${newStatus} for "${item.name}".`,
        type: "success",
      });
      loadEquipment();
    } catch (err) {
      setToast({ message: "Failed to update status", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"?`)) return;
    try {
      const res = await fetch(`/api/manager/equipment/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Deletion failed");
      setToast({ message: `Deleted "${name}".`, type: "success" });
      loadEquipment();
    } catch (err) {
      setToast({ message: "Failed to delete item", type: "error" });
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type filter
      if (filterType === "COOKING_PLATE" && item.type !== "COOKING_PLATE") return false;
      if (filterType === "METAL_RING" && item.type !== "METAL_RING") return false;
      if (filterType === "SERVING_PLATE" && item.type !== "SERVING_PLATE") return false;
      if (filterType === "CRITICAL" && (item.type !== "COOKING_PLATE" || item.cooksCount < 36)) return false;
      if (filterType === "RETIRED" && item.status !== "RETIRED") return false;

      // Search
      if (search.trim()) {
        const query = search.toLowerCase();
        return (
          item.name.toLowerCase().includes(query) ||
          item.type.toLowerCase().includes(query) ||
          (item.notes && item.notes.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [items, filterType, search]);

  // Health Meter Helper (0 to 40 cooks)
  const getHealthMeta = (cooksCount: number, maxCooks = 40) => {
    const percentage = Math.max(0, Math.round(((maxCooks - cooksCount) / maxCooks) * 100));
    const usedPercentage = Math.min(100, Math.round((cooksCount / maxCooks) * 100));

    if (cooksCount >= maxCooks) {
      return {
        label: "Depleted (40/40)",
        description: "Lifespan exhausted. Repurpose as finishing salt.",
        barColor: "bg-rose-500",
        textColor: "text-rose-400",
        badgeBg: "bg-rose-950/80 border-rose-500/40 text-rose-300",
        percentage,
        usedPercentage: 100,
      };
    }
    if (cooksCount >= 36) {
      return {
        label: "Critical Wear (36-39/40)",
        description: "Under 1 inch thickness. Replace soon to prevent breakage.",
        barColor: "bg-amber-500",
        textColor: "text-amber-400",
        badgeBg: "bg-amber-950/80 border-amber-500/40 text-amber-300",
        percentage,
        usedPercentage,
      };
    }
    if (cooksCount >= 25) {
      return {
        label: "Mid-Life Wear (25-35/40)",
        description: "Stable thermal retention. Inspect for micro-fissures.",
        barColor: "bg-blue-500",
        textColor: "text-blue-400",
        badgeBg: "bg-blue-950/80 border-blue-500/40 text-blue-300",
        percentage,
        usedPercentage,
      };
    }
    return {
      label: "Prime Condition",
      description: "Full thickness and peak mineral heat retention.",
      barColor: "bg-emerald-500",
      textColor: "text-emerald-400",
      badgeBg: "bg-emerald-950/80 border-emerald-500/40 text-emerald-300",
      percentage,
      usedPercentage,
    };
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`rounded-2xl border px-4 py-3 text-xs flex items-center justify-between transition shadow-lg ${
            toast.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/70 text-emerald-300"
              : "border-rose-500/40 bg-rose-950/70 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                toast.type === "success" ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
            &times;
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-900 border border-neutral-800 px-3 py-1 text-xs text-neutral-400 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
            Himalayan Salt Slab &amp; Equipment Lifecycle
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            {tenantName} Salt Slabs &amp; Equipment Hub
          </h2>
          <p className="text-xs md:text-sm text-neutral-400 mt-1 max-w-3xl">
            Track cooking plates with the 40-cook health meter, monitor protective metal burner base rings, and audit cold steak presentation platters.
          </p>
        </div>

        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenAddModal("COOKING_PLATE")}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 px-4 py-2 text-xs font-semibold text-white transition shadow-lg shadow-rose-900/30"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Add Cooking Plate</span>
            </button>

            <button
              onClick={() => handleOpenAddModal("METAL_RING")}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 hover:text-white transition"
            >
              <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Metal Ring</span>
            </button>

            <button
              onClick={() => handleOpenAddModal("SERVING_PLATE")}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 hover:text-white transition"
            >
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Serving Plate</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {/* Cooking Plates */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Cooking Plates
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {stats?.totalCookingPlates ?? 0}
            </span>
            <span className="text-[11px] text-neutral-400">Active Slabs</span>
          </div>
          <div className="space-y-1 pt-1 border-t border-neutral-800/60">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-neutral-400">Fleet Health:</span>
              <span className="font-bold text-emerald-400">
                {stats?.averagePlateHealth ?? 100}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${stats?.averagePlateHealth ?? 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* 40-Cook Health Meter Watch */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Health Meter Alert
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400 tracking-tight">
              {stats?.nearDepletedCount ?? 0}
            </span>
            <span className="text-[11px] text-neutral-400">Near 40 Cooks</span>
          </div>
          <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/60 leading-tight">
            Slabs with 36+ cooks requiring thickness inspection before dinner service.
          </p>
        </div>

        {/* Metal Base Rings */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Metal Base Rings
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {stats?.totalMetalRings ?? 0}
            </span>
            <span className="text-[11px] text-neutral-400">Units in Service</span>
          </div>
          <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/60 leading-tight">
            Cast iron &amp; stainless rings holding hot slabs above direct burner heat.
          </p>
        </div>

        {/* Serving Platters */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Steak Serving Plates
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {stats?.totalServingPlates ?? 0}
            </span>
            <span className="text-[11px] text-neutral-400">Platters</span>
          </div>
          <p className="text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/60 leading-tight">
            Chilled &amp; room-temp salt slabs used for tabletop steak presentation.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="rounded-3xl border border-neutral-800 bg-neutral-900 overflow-hidden shadow-xl">
        <div className="border-b border-neutral-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-neutral-900/90">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: `All Equipment (${items.length})` },
              {
                id: "COOKING_PLATE",
                label: `Cooking Slabs (${items.filter((i) => i.type === "COOKING_PLATE").length})`,
              },
              {
                id: "METAL_RING",
                label: `Metal Rings (${items.filter((i) => i.type === "METAL_RING").length})`,
              },
              {
                id: "SERVING_PLATE",
                label: `Serving Plates (${items.filter((i) => i.type === "SERVING_PLATE").length})`,
              },
              {
                id: "CRITICAL",
                label: `36+ Cooks Alert (${items.filter((i) => i.type === "COOKING_PLATE" && i.cooksCount >= 36).length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  filterType === tab.id
                    ? "bg-neutral-800 text-white shadow-sm border border-neutral-700"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-800/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slab name or station..."
              className="rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-1.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-rose-500 transition w-full md:w-56"
            />

            <button
              onClick={loadEquipment}
              className="p-1.5 rounded-lg border border-neutral-800 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              title="Refresh inventory"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin text-rose-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Auditing salt slab inventory and health meters...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-500">
            No equipment items found matching the selected criteria.
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/80">
            {filteredItems.map((item) => {
              const isCookingPlate = item.type === "COOKING_PLATE";
              const meta = isCookingPlate ? getHealthMeta(item.cooksCount, item.maxCooks || 40) : null;
              const isActionLoading = actionLoadingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-5 transition hover:bg-neutral-800/20 ${
                    item.status === "RETIRED" ? "opacity-60 bg-neutral-950/40" : ""
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Item Identity & Type */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${
                            item.type === "COOKING_PLATE"
                              ? "bg-rose-950/70 border-rose-500/30 text-rose-300"
                              : item.type === "METAL_RING"
                              ? "bg-blue-950/70 border-blue-500/30 text-blue-300"
                              : "bg-emerald-950/70 border-emerald-500/30 text-emerald-300"
                          }`}
                        >
                          {item.type === "COOKING_PLATE"
                            ? "Cooking Slab"
                            : item.type === "METAL_RING"
                            ? "Metal Ring"
                            : "Serving Platter"}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                            item.status === "ACTIVE"
                              ? "bg-neutral-900 border-neutral-700 text-neutral-300"
                              : item.status === "MAINTENANCE"
                              ? "bg-amber-950/60 border-amber-500/30 text-amber-300"
                              : "bg-neutral-950 border-neutral-800 text-neutral-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.status === "ACTIVE"
                                ? "bg-emerald-400"
                                : item.status === "MAINTENANCE"
                                ? "bg-amber-400"
                                : "bg-neutral-600"
                            }`}
                          />
                          {item.status}
                        </span>

                        {!isCookingPlate && (
                          <span className="rounded-md bg-neutral-800 border border-neutral-700 px-2 py-0.5 text-[11px] font-bold text-white">
                            Qty: {item.quantity}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white tracking-tight">
                        {item.name}
                      </h3>

                      {item.notes && (
                        <p className="text-xs text-neutral-400 line-clamp-2">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    {/* Middle: 40-Cook Health Meter (for Cooking Slabs) or Quantity Controls */}
                    {isCookingPlate && meta ? (
                      <div className="w-full lg:w-96 rounded-2xl border border-neutral-800 bg-neutral-950 p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-300">Health Meter:</span>
                            <span className={`font-mono font-bold ${meta.textColor}`}>
                              {item.cooksCount} / {item.maxCooks || 40} Cooks
                            </span>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${meta.badgeBg}`}>
                            {meta.percentage}% Life Left
                          </span>
                        </div>

                        {/* Visual Progress Bar (40 Cooks scale) */}
                        <div className="h-2.5 w-full rounded-full bg-neutral-800 overflow-hidden relative">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${meta.barColor}`}
                            style={{ width: `${meta.usedPercentage}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-neutral-400">
                          <span>{meta.label}</span>
                          <span>Max Lifespan: 40 Cooks</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 self-start lg:self-center">
                        {!isReadOnly && (
                          <div className="inline-flex items-center rounded-xl border border-neutral-800 bg-neutral-950 p-1">
                            <button
                              onClick={() => handleAdjustQuantity(item, -1)}
                              disabled={isActionLoading}
                              className="px-2.5 py-1 text-xs font-bold text-neutral-400 hover:text-white transition disabled:opacity-50"
                              title="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="px-3 text-xs font-bold font-mono text-white">
                              {item.quantity} units
                            </span>
                            <button
                              onClick={() => handleAdjustQuantity(item, 1)}
                              disabled={isActionLoading}
                              className="px-2.5 py-1 text-xs font-bold text-neutral-400 hover:text-white transition disabled:opacity-50"
                              title="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Right: Actions */}
                    {!isReadOnly && (
                      <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                        {/* Quick +1 Cook button for Cooking Slabs */}
                        {isCookingPlate && item.status !== "RETIRED" && (
                          <button
                            onClick={() => handleIncrementCook(item, 1)}
                            disabled={isActionLoading}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 text-xs font-bold transition shadow-sm disabled:opacity-50"
                            title="Register a steak sear on this slab"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>+1 Cook</span>
                          </button>
                        )}

                        {/* Status Toggle / Retire */}
                        <button
                          onClick={() => handleToggleRetire(item)}
                          disabled={isActionLoading}
                          className="rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white transition disabled:opacity-50"
                        >
                          {item.status === "RETIRED" ? "Reactivate" : "Retire"}
                        </button>

                        {/* Edit Item */}
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white transition"
                          title="Edit details"
                        >
                          <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>

                        {/* Delete Item */}
                        <button
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="rounded-xl border border-rose-500/20 bg-rose-950/30 hover:bg-rose-950/60 px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 transition"
                          title="Delete item"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Equipment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-900 p-6 md:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {editingItem ? "Edit Equipment Item" : "Add Salt Slab / Equipment Item"}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Register cooking plates, metal burner rings, or cold presentation platters.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Type Selector */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1.5">
                  Equipment Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "COOKING_PLATE", label: "Cooking Slab" },
                    { id: "METAL_RING", label: "Metal Ring" },
                    { id: "SERVING_PLATE", label: "Serving Plate" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormType(t.id as EquipmentType)}
                      className={`rounded-xl border py-2 text-xs font-bold transition text-center ${
                        formType === t.id
                          ? "border-rose-500 bg-rose-950/50 text-rose-300 shadow-sm"
                          : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Item Name / Identification
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Himalayan Salt Cooking Slab #07 or Cast Iron Base Ring"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-rose-500"
                />
              </div>

              {/* Cooking Plate Specifics (Health Meter & Cooks Count) */}
              {formType === "COOKING_PLATE" ? (
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">40-Cook Health Meter Initializer</span>
                    <span className="text-[10px] text-rose-400 font-mono font-semibold">
                      Max: {formMaxCooks} Cooks Lifespan
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                        Current Cooks Count
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={formMaxCooks}
                        value={formCooksCount}
                        onChange={(e) => setFormCooksCount(parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white outline-none focus:border-rose-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                        Max Cooks Lifespan
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formMaxCooks}
                        onChange={(e) => setFormMaxCooks(parseInt(e.target.value, 10) || 40)}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-white outline-none focus:border-rose-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-rose-500 transition-all"
                      style={{
                        width: `${Math.min(100, Math.round((formCooksCount / (formMaxCooks || 40)) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-400">
                    <span>{formCooksCount} sears completed</span>
                    <span>
                      {Math.max(0, Math.round((((formMaxCooks || 40) - formCooksCount) / (formMaxCooks || 40)) * 100))}% Life remaining
                    </span>
                  </div>
                </div>
              ) : (
                /* Quantity for rings and serving plates */
                <div>
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                    Quantity in Service
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              )}

              {/* Status */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Operational Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as EquipmentStatus)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white outline-none focus:border-rose-500"
                >
                  <option value="ACTIVE">Active in Service</option>
                  <option value="MAINTENANCE">Maintenance / Seasoning</option>
                  <option value="RETIRED">Retired / Slated for Grinding</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Notes &amp; Observations
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Station A sear burner. Inspected for micro-cracks. Use 450°F maximum."
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-xs text-white placeholder-neutral-500 outline-none focus:border-rose-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 px-5 py-2 text-xs font-semibold text-white transition shadow-lg shadow-rose-900/40 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingItem ? "Update Equipment" : "Add to Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
