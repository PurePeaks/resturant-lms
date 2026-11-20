import { describe, expect, it } from "vitest";
import { evaluateProgress, isQuizEligible, isVideoCompleted, type ProgressState } from "@/lib/training";

const t0 = new Date("2026-01-01T10:00:00Z");
const at = (seconds: number) => new Date(t0.getTime() + seconds * 1000);

/** Feeds reports through evaluateProgress, saving accepted ones like the API does. */
function simulate(reports: { atSecond: number; reported: number }[]) {
  let state: ProgressState | null = null;
  const results: boolean[] = [];
  for (const r of reports) {
    const now = at(r.atSecond);
    const d = evaluateProgress(state, r.reported, now);
    results.push(d.accepted);
    if (d.accepted) {
      state = {
        maxWatchedSeconds: d.maxWatchedSeconds,
        updatedAt: now,
        segmentStartedAt: d.segmentStartedAt,
        segmentStartSeconds: d.segmentStartSeconds,
      };
    }
  }
  return { results, state };
}

describe("evaluateProgress", () => {
  it("accepts honest viewing at normal speed", () => {
    const reports = Array.from({ length: 20 }, (_, i) => ({ atSecond: i * 5, reported: i * 5 }));
    const { results, state } = simulate(reports);
    expect(results.every(Boolean)).toBe(true);
    expect(state?.maxWatchedSeconds).toBe(95);
  });

  it("accepts viewing at the 1.5x speed cap", () => {
    const reports = Array.from({ length: 20 }, (_, i) => ({ atSecond: i * (5 / 1.5), reported: i * 5 }));
    expect(simulate(reports).results.every(Boolean)).toBe(true);
  });

  it("rejects a jump straight to the end of the video", () => {
    const { results } = simulate([
      { atSecond: 0, reported: 0 },
      { atSecond: 5, reported: 600 },
    ]);
    expect(results).toEqual([true, false]);
  });

  it("does not let many small requests outrun real time", () => {
    // The old check allowed +12s per request, so one request a second covered 10 minutes in under a minute.
    const spam = Array.from({ length: 60 }, (_, i) => ({ atSecond: i + 1, reported: (i + 1) * 10 }));
    const { state } = simulate([{ atSecond: 0, reported: 0 }, ...spam]);
    expect(state!.maxWatchedSeconds).toBeLessThanOrEqual(60 * 1.5 + 3);
  });

  it("does not let a long pause be banked to skip ahead", () => {
    const { results } = simulate([
      { atSecond: 0, reported: 0 },
      { atSecond: 5, reported: 5 },
      // Paused for an hour, then claims to be ten minutes further on.
      { atSecond: 3605, reported: 605 },
    ]);
    expect(results[2]).toBe(false);
  });

  it("allows resuming normally after a pause", () => {
    const { results } = simulate([
      { atSecond: 0, reported: 0 },
      { atSecond: 5, reported: 5 },
      { atSecond: 3605, reported: 10 },
      { atSecond: 3610, reported: 15 },
    ]);
    expect(results.every(Boolean)).toBe(true);
  });

  it("accepts rewatching earlier parts without lowering the high-water mark", () => {
    const { state } = simulate([
      { atSecond: 0, reported: 0 },
      { atSecond: 5, reported: 5 },
      { atSecond: 10, reported: 10 },
      { atSecond: 15, reported: 2 },
    ]);
    expect(state!.maxWatchedSeconds).toBe(10);
  });
});

describe("completion thresholds use the module's stored duration", () => {
  it("is never complete when the duration is unknown", () => {
    expect(isVideoCompleted(1_000_000, null)).toBe(false);
    expect(isQuizEligible(1_000_000, null)).toBe(false);
  });

  it("requires 95% for completion and 80% for the quiz", () => {
    expect(isVideoCompleted(94, 100)).toBe(false);
    expect(isVideoCompleted(95, 100)).toBe(true);
    expect(isQuizEligible(79, 100)).toBe(false);
    expect(isQuizEligible(80, 100)).toBe(true);
  });
});
