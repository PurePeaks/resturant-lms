"use client";

import { useCallback, useEffect, useState } from "react";

interface AuditEntry {
  id: string;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  targetType: string;
  summary: string;
  tenantId: string | null;
  createdAt: string;
}

interface AuditPage {
  entries: AuditEntry[];
  hasMore: boolean;
}

async function fetchAuditPage(tenantId: string | undefined, before: string | null): Promise<AuditPage> {
  const params = new URLSearchParams();
  if (tenantId) params.set("tenantId", tenantId);
  if (before) params.set("before", before);
  const res = await fetch(`/api/audit?${params}`, { cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load the activity log.");
  return data;
}

// Colour by area so destructive or sensitive actions stand out.
function actionTone(action: string): string {
  if (/deactivated|erased|archived|deleted|reset|anonymized/.test(action)) return "bg-red-500";
  if (/password/.test(action)) return "bg-amber-500";
  if (/created|issued|restored|reactivated/.test(action)) return "bg-emerald-500";
  return "bg-blue-500";
}

/** Who did what, newest first. Managers see their venue; super admins can filter by venue. */
export default function AuditLogPanel({ tenantId, title = "Activity Log" }: { tenantId?: string; title?: string }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    fetchAuditPage(tenantId, null)
      .then((page) => {
        if (ignore) return;
        setEntries(page.entries);
        setHasMore(page.hasMore);
        setError(null);
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
  }, [tenantId]);

  const loadMore = useCallback(async () => {
    const last = entries[entries.length - 1];
    if (!last) return;
    setLoading(true);
    try {
      const page = await fetchAuditPage(tenantId, last.createdAt);
      setEntries((prev) => [...prev, ...page.entries]);
      setHasMore(page.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [entries, tenantId]);

  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-900 overflow-hidden shadow-xl">
      <div className="border-b border-neutral-800 px-5 py-4 md:px-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300">{title}</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Account changes, password resets, training resets and curriculum edits, with who made them.
        </p>
      </div>

      {error && (
        <div role="alert" className="m-5 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="px-6 py-12 text-center text-sm text-neutral-500">No activity recorded yet.</p>
      )}

      <ul className="divide-y divide-neutral-800/80">
        {entries.map((e) => (
          <li key={e.id} className="flex gap-3 px-5 py-3.5 md:px-6">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${actionTone(e.action)}`} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-neutral-200 break-words">{e.summary}</p>
              <p className="mt-0.5 text-[11px] text-neutral-500">
                <time dateTime={e.createdAt}>
                  {new Date(e.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </time>
                {e.actorRole && e.actorRole !== "SYSTEM" && <> · {e.actorRole.replace("_", " ").toLowerCase()}</>}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {(loading || hasMore) && (
        <div className="border-t border-neutral-800 px-6 py-4 text-center">
          {loading ? (
            <span className="text-xs text-neutral-500">Loading...</span>
          ) : (
            <button
              type="button"
              onClick={loadMore}
              className="rounded-xl border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition"
            >
              Load older activity
            </button>
          )}
        </div>
      )}
    </div>
  );
}
