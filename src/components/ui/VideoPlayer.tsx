"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface VideoPlayerProps {
  src: string;
  moduleId: string;
  title: string;
  onCompletionChange?: (completed: boolean) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VideoPlayer({ src, moduleId, title, onCompletionChange }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [maxReached, setMaxReached] = useState(0); // high-water mark
  const [percent, setPercent] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "skip">("idle");
  const [skipNotice, setSkipNotice] = useState<string | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<{ seconds: number } | null>(null);

  const maxReachedRef = useRef(0);
  const lastReportedRef = useRef(0);
  const playingRef = useRef(false);
  const isSnappingRef = useRef(false);
  const isScrubbingRef = useRef(false);
  const noticeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    isScrubbingRef.current = isScrubbing;
  }, [isScrubbing]);

  const showSkipMessage = useCallback((msg: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setSkipNotice(msg);
    noticeTimerRef.current = setTimeout(() => {
      setSkipNotice(null);
    }, 4500);
  }, []);

  const snapBackToAllowed = useCallback(
    (targetPos: number, userInitiated = false) => {
      const v = videoRef.current;
      if (!v || isSnappingRef.current) return;
      isSnappingRef.current = true;

      const safePos = Math.max(0, targetPos);
      v.currentTime = safePos;
      setCurrentTime(safePos);

      const msg = userInitiated
        ? `Forward skipping is disabled. Scrubbing is only allowed within the watched section (${formatTime(safePos)}).`
        : `Unconfirmed skip detected. Returned to last confirmed point (${formatTime(safePos)}).`;

      showSkipMessage(msg);
      setSaveStatus("skip");

      setTimeout(() => {
        isSnappingRef.current = false;
        if (playingRef.current && v.paused) {
          v.play().catch(() => {});
        }
      }, 120);
    },
    [showSkipMessage]
  );

  const onCompletionChangeRef = useRef(onCompletionChange);
  useEffect(() => {
    onCompletionChangeRef.current = onCompletionChange;
  }, [onCompletionChange]);

  // ── Load existing user progress on mount ──────────────────────────────────
  useEffect(() => {
    let active = true;
    async function loadInitialProgress() {
      try {
        const res = await fetch(`/api/progress?moduleId=${encodeURIComponent(moduleId)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data && active) {
          const maxSec = Number(data.maxWatchedSeconds) || 0;
          maxReachedRef.current = maxSec;
          lastReportedRef.current = maxSec;
          setMaxReached(maxSec);
          setPercent(Number(data.percentWatched) || 0);

          if (data.completed) {
            setCompleted(true);
            // Do not call onCompletionChange here: parent already knows the completion
            // state from the initial module list. Calling it on mount causes infinite fetch loops.
          }

          // Offer Smart Resume if previously watched more than 5s and not completed
          if (!data.completed && maxSec > 5) {
            setResumePrompt({ seconds: maxSec });
          }
        }
      } catch {
        /* Ignore error on load */
      }
    }

    loadInitialProgress();
    return () => {
      active = false;
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [moduleId]);

  // ── Report progress to server ──────────────────────────────────────────────
  const reportProgress = useCallback(
    async (current: number, hwm: number, dur: number) => {
      if (!Number.isFinite(dur) || dur <= 0) return;
      if (!Number.isFinite(current) || current < 0) return;
      if (!Number.isFinite(hwm) || hwm < 0) return;

      const isFirst = lastReportedRef.current === 0 && hwm > 0;
      const isFiveSecInterval = hwm - lastReportedRef.current >= 5;
      const isEnd = current >= dur - 0.5;
      if (!isFirst && !isFiveSecInterval && !isEnd) return;

      lastReportedRef.current = hwm;
      setSaveStatus("saving");

      try {
        const res = await fetch("/api/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            moduleId,
            watchedSeconds: Math.round(current),
            maxWatchedSeconds: Math.round(hwm),
            durationSeconds: Math.round(dur),
          }),
        });

        if (res.status === 422) {
          const data = await res.json().catch(() => null);
          const confirmedPos = Number(
            data?.lastConfirmedSeconds ?? data?.record?.maxWatchedSeconds ?? maxReachedRef.current
          );
          maxReachedRef.current = confirmedPos;
          setMaxReached(confirmedPos);
          snapBackToAllowed(confirmedPos, false);
          return;
        }

        if (!res.ok) {
          setSaveStatus("idle");
          return;
        }

        const data = await res.json();
        if (data?.completed) {
          setCompleted(true);
          onCompletionChangeRef.current?.(true);
        }
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("idle");
      }
    },
    [moduleId, snapBackToAllowed]
  );

  // ── Scrubbing handler (works for clicks AND drag) ──────────────────────────
  const handleScrub = (targetSec: number) => {
    const v = videoRef.current;
    if (!v || !duration) return;

    const allowedMax = maxReachedRef.current;

    if (targetSec > allowedMax + 0.8) {
      v.currentTime = allowedMax;
      setCurrentTime(allowedMax);
      showSkipMessage(
        `Forward skipping is locked. You can scrub anywhere up to ${formatTime(allowedMax)}.`
      );
    } else {
      const safeTarget = Math.max(0, targetSec);
      v.currentTime = safeTarget;
      setCurrentTime(safeTarget);
    }
  };

  // ── Intercept browser-level seek attempts ───────────────────────────────────
  const handleSeeking = useCallback(() => {
    if (isSnappingRef.current) return;
    const v = videoRef.current;
    if (!v) return;

    if (v.currentTime > maxReachedRef.current + 1.2) {
      snapBackToAllowed(maxReachedRef.current, true);
    }
  }, [snapBackToAllowed]);

  const handleSeeked = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      setCurrentTime(v.currentTime);
    }
  }, []);

  // ── Time update — advance high-water mark during legitimate forward play ──
  const handleTimeUpdate = useCallback(() => {
    if (isSnappingRef.current || isScrubbingRef.current) return;
    const v = videoRef.current;
    if (!v) return;

    const ct = v.currentTime;
    const dur = v.duration;
    if (!Number.isFinite(dur) || dur <= 0) return;

    // Check for abnormal leaps
    if (ct > maxReachedRef.current + 2.5) {
      snapBackToAllowed(maxReachedRef.current, true);
      return;
    }

    setCurrentTime(ct);

    // High-water mark advances only when watching new content forward
    if (playing && ct > maxReachedRef.current) {
      maxReachedRef.current = ct;
      setMaxReached(ct);
      const pct = Math.min(100, Math.round((ct / dur) * 100));
      setPercent(pct);
    }

    if (playing) {
      reportProgress(ct, maxReachedRef.current, dur);
    }
  }, [playing, reportProgress, snapBackToAllowed]);

  const handleLoadedMetadata = () => {
    if (videoRef.current && Number.isFinite(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleEnded = useCallback(() => {
    const v = videoRef.current;
    if (v && Number.isFinite(v.duration)) {
      reportProgress(v.duration, v.duration, v.duration);
    }
    setPlaying(false);
  }, [reportProgress]);

  // Rate change check — enforce max 1.5x
  const handleRateChange = useCallback(() => {
    const v = videoRef.current;
    if (v && v.playbackRate > 1.5) {
      v.playbackRate = 1;
      setPlaybackSpeed(1);
      showSkipMessage("Playback speed is capped at 1.5x for accredited compliance.");
    }
  }, [showSkipMessage]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.addEventListener("seeking", handleSeeking);
    v.addEventListener("seeked", handleSeeked);
    v.addEventListener("ratechange", handleRateChange);
    return () => {
      v.removeEventListener("seeking", handleSeeking);
      v.removeEventListener("seeked", handleSeeked);
      v.removeEventListener("ratechange", handleRateChange);
    };
  }, [handleSeeking, handleSeeked, handleRateChange]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const jumpRelative = (deltaSeconds: number) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const target = v.currentTime + deltaSeconds;
    handleScrub(target);
  };

  const changeSpeed = (speed: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleResumeClick = () => {
    if (!resumePrompt || !videoRef.current) return;
    videoRef.current.currentTime = resumePrompt.seconds;
    setCurrentTime(resumePrompt.seconds);
    setResumePrompt(null);
    videoRef.current.play().catch(() => {});
    setPlaying(true);
  };

  const handleDismissResume = () => {
    setResumePrompt(null);
  };

  const durSafe = duration > 0 ? duration : 1;
  const watchedPct = Math.min(100, (maxReached / durSafe) * 100);
  const currentPct = Math.min(100, Math.max(0, (currentTime / durSafe) * 100));

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl border border-neutral-700/80 bg-black shadow-2xl"
    >
      {/* Smart Resume Toast */}
      {resumePrompt && (
        <div className="absolute top-3 left-3 right-3 z-40 flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/50 bg-neutral-900/95 p-3.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-400">
              <svg className="w-4 h-4 fill-none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-white">
              Resume where you left off at <strong className="text-indigo-400 font-mono">{formatTime(resumePrompt.seconds)}</strong>?
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResumeClick}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
            >
              Resume
            </button>
            <button
              onClick={handleDismissResume}
              className="rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs font-medium text-neutral-400 hover:text-white transition"
            >
              Start at 0:00
            </button>
          </div>
        </div>
      )}

      {/* Skip Warning Toast */}
      {skipNotice && (
        <div className="absolute top-3 left-3 right-3 z-30 flex items-start gap-3 rounded-xl border border-amber-500/60 bg-amber-950/95 p-3.5 shadow-2xl backdrop-blur transition-all duration-300">
          <svg className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1 text-xs">
            <p className="font-bold text-amber-200 uppercase tracking-wider text-[10px]">Anti-Cheat Enforcement</p>
            <p className="text-amber-100/90 mt-0.5 leading-relaxed">{skipNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setSkipNotice(null)}
            className="rounded-lg bg-amber-900/60 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-800 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full cursor-pointer aspect-video bg-black object-contain"
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        preload="metadata"
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
      />

      {/* Video Player Controls Deck */}
      <div className="bg-neutral-900/95 px-4 py-3 space-y-2.5 border-t border-neutral-800">
        {/* Scrub Bar */}
        <div className="relative flex items-center h-5 w-full select-none group">
          <div className="absolute inset-x-0 h-2 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all duration-100"
              style={{ width: `${watchedPct}%` }}
            />
          </div>

          <div
            className="absolute right-0 h-2 rounded-r-full bg-neutral-950/60 pointer-events-none"
            style={{ width: `${Math.max(0, 100 - watchedPct)}%` }}
          />

          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onPointerDown={() => setIsScrubbing(true)}
            onPointerUp={() => {
              setIsScrubbing(false);
              const v = videoRef.current;
              if (v && playingRef.current && v.paused) {
                v.play().catch(() => {});
              }
            }}
            onChange={(e) => handleScrub(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            title="Drag to scrub within watched territory"
          />

          <div
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-md border border-neutral-300 pointer-events-none transition-transform duration-75 ${
              isScrubbing ? "scale-125 ring-2 ring-indigo-400" : "group-hover:scale-110"
            }`}
            style={{ left: `calc(${currentPct}% - 7px)` }}
          />
        </div>

        {/* Controls Bar Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Left Controls: Play, Rewind, Time, Volume */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-md shadow-indigo-600/30"
              title={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={() => jumpRelative(-5)}
              className="flex items-center gap-1 rounded-lg bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700 hover:text-white transition font-medium"
              title="Rewind 5s"
            >
              -5s
            </button>

            <button
              type="button"
              onClick={() => jumpRelative(5)}
              className="flex items-center gap-1 rounded-lg bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 hover:bg-neutral-700 hover:text-white transition font-medium"
              title="Forward 5s (within watched limit)"
            >
              +5s
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="rounded-lg bg-neutral-800 p-1.5 text-neutral-400 hover:text-white transition"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            <span className="text-xs text-neutral-400 tabular-nums font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right Controls: Speed, Fullscreen, Status */}
          <div className="flex items-center gap-2">
            {/* Speed pills */}
            <div className="flex items-center rounded-lg bg-neutral-800 p-0.5 border border-neutral-700/60">
              {[1, 1.25, 1.5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => changeSpeed(spd)}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-semibold transition ${
                    playbackSpeed === spd
                      ? "bg-indigo-600 text-white"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            {/* Percent pill */}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                percent >= 80
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
                  : "bg-neutral-800 text-neutral-300"
              }`}
            >
              {percent}% watched
            </span>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="rounded-lg bg-neutral-800 p-1.5 text-neutral-400 hover:text-white transition"
              title="Fullscreen"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            {saveStatus === "saving" && (
              <span className="text-[11px] text-neutral-500 animate-pulse font-mono">syncing</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-[11px] text-emerald-400 font-mono">synced</span>
            )}
            {saveStatus === "skip" && (
              <span className="text-[11px] text-amber-400 font-mono">snapped</span>
            )}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-0.5 border-t border-neutral-800/60 font-mono">
          <span>
            {maxReached > 0
              ? `Verified Zone: 0:00 - ${formatTime(maxReached)}`
              : "Watch forward to unlock timeline"}
          </span>
          <span className="text-neutral-500 truncate max-w-[200px]">{title}</span>
        </div>
      </div>
    </div>
  );
}
