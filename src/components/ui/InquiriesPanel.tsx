"use client";

import { useCallback, useEffect, useState } from "react";

type InquiryStatus = "NEW" | "CONTACTED" | "CLOSED";

interface Inquiry {
  id: string;
  referenceCode: string;
  name: string;
  email: string;
  phone: string | null;
  purpose: string | null;
  kitType: string | null;
  city: string | null;
  notes: string | null;
  status: InquiryStatus;
  createdAt: string;
}

interface InquiryList {
  inquiries: Inquiry[];
  counts: Partial<Record<InquiryStatus, number>>;
}

const FILTERS: { id: InquiryStatus | "ALL"; label: string }[] = [
  { id: "NEW", label: "New" },
  { id: "CONTACTED", label: "Contacted" },
  { id: "CLOSED", label: "Closed" },
  { id: "ALL", label: "All" },
];

const STATUS_STYLE: Record<InquiryStatus, string> = {
  NEW: "bg-blue-950/80 border-blue-500/30 text-blue-300",
  CONTACTED: "bg-amber-950/80 border-amber-500/30 text-amber-300",
  CLOSED: "bg-neutral-800 border-neutral-700 text-neutral-400",
};

async function fetchInquiries(filter: InquiryStatus | "ALL"): Promise<InquiryList> {
  const res = await fetch(`/api/admin/inquiries${filter === "ALL" ? "" : `?status=${filter}`}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load inquiries.");
  return data;
}

/** Kit reservations submitted from the public website. */
export default function InquiriesPanel() {
  const [filter, setFilter] = useState<InquiryStatus | "ALL">("NEW");
  const [data, setData] = useState<InquiryList>({ inquiries: [], counts: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const reload = useCallback(async (f: InquiryStatus | "ALL") => {
    try {
      setData(await fetchInquiries(f));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetchInquiries(filter)
      .then((d) => {
        if (!ignore) {
          setData(d);
          setError(null);
        }
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [filter]);

  const setStatus = async (inquiry: Inquiry, status: InquiryStatus) => {
    setUpdatingId(inquiry.id);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inquiry.id, status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not update the inquiry.");
      await reload(filter);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const total = Object.values(data.counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter inquiries by status">
        {FILTERS.map((f) => {
          const count = f.id === "ALL" ? total : (data.counts[f.id] ?? 0);
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              role="tab"
              aria-selected={active}
              onClick={() => {
                setLoading(true);
                setFilter(f.id);
              }}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-blue-600 border-blue-400 text-white"
                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-12 text-center text-xs text-neutral-500">Loading inquiries...</p>
      ) : data.inquiries.length === 0 ? (
        <div className="rounded-3xl border border-neutral-800 bg-neutral-900 py-12 text-center text-sm text-neutral-500">
          No {filter === "ALL" ? "" : filter.toLowerCase() + " "}inquiries.
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {data.inquiries.map((q) => (
            <li key={q.id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 space-y-3 shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white break-words">{q.name}</p>
                  <p className="font-mono text-[11px] text-neutral-500">{q.referenceCode}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[q.status]}`}>
                  {q.status.toLowerCase()}
                </span>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="min-w-0">
                  <dt className="text-neutral-500">Email</dt>
                  <dd>
                    <a href={`mailto:${q.email}`} className="text-blue-400 hover:underline break-all">
                      {q.email}
                    </a>
                  </dd>
                </div>
                {q.phone && (
                  <div>
                    <dt className="text-neutral-500">Phone</dt>
                    <dd>
                      <a href={`tel:${q.phone}`} className="text-blue-400 hover:underline">
                        {q.phone}
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-neutral-500">Kit</dt>
                  <dd className="text-neutral-200">{q.kitType ?? "Not specified"}</dd>
                </div>
                {q.city && (
                  <div>
                    <dt className="text-neutral-500">City</dt>
                    <dd className="text-neutral-200">{q.city}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-neutral-500">Received</dt>
                  <dd className="text-neutral-200">
                    {new Date(q.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </dd>
                </div>
              </dl>

              {q.notes && (
                <p className="rounded-xl bg-neutral-950/70 border border-neutral-800 p-3 text-xs text-neutral-300 whitespace-pre-wrap break-words">
                  {q.notes}
                </p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {q.status !== "CONTACTED" && (
                  <button
                    onClick={() => setStatus(q, "CONTACTED")}
                    disabled={updatingId === q.id}
                    className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-900/40 transition disabled:opacity-50"
                  >
                    Mark contacted
                  </button>
                )}
                {q.status !== "CLOSED" && (
                  <button
                    onClick={() => setStatus(q, "CLOSED")}
                    disabled={updatingId === q.id}
                    className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:bg-neutral-700 transition disabled:opacity-50"
                  >
                    Close
                  </button>
                )}
                {q.status !== "NEW" && (
                  <button
                    onClick={() => setStatus(q, "NEW")}
                    disabled={updatingId === q.id}
                    className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition disabled:opacity-50"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
