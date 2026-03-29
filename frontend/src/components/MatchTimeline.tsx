import { memo, useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, Pause, Play } from "lucide-react";
import { usePlayback } from "@/context/PlaybackContext";
import { PLAYBACK_SPEED_OPTIONS } from "@/lib/playback";
import type { MomentumTimeline } from "@/hooks/useMatchTracking";
import { cn } from "@/lib/utils";
import keyMoments from "@/data/timelineKeyMoments.json";

type MomentKind = "goal" | "shot";

type MomentRow = {
  frame: number;
  label: string;
  kind: MomentKind;
};

const payload = keyMoments as {
  matchId: number;
  moments: MomentRow[];
};

type Props = {
  timeline: MomentumTimeline | null;
  className?: string;
};

function momentColor(kind: MomentKind): string {
  if (kind === "goal") return "var(--destructive)";
  return "var(--primary)";
}

export const MatchTimeline = memo(function MatchTimeline({
  timeline,
  className,
}: Props) {
  const {
    frameIndex,
    playbackFrameCount,
    jumpToFrame,
    isPlaying,
    pause,
    resume,
    playbackSpeed,
    setPlaybackSpeed,
  } = usePlayback();
  const trackRef = useRef<HTMLDivElement>(null);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const [hoverMoment, setHoverMoment] = useState<MomentRow | null>(null);

  const moments = useMemo(() => {
    if (!timeline) return [] as Array<MomentRow & { t: number }>;
    const out: Array<MomentRow & { t: number }> = [];
    for (const m of payload.moments) {
      const t = timeline.chartTForBundleFrame(m.frame);
      if (t == null) continue;
      out.push({ ...m, t });
    }
    return out;
  }, [timeline]);

  const playT =
    timeline && playbackFrameCount > 0
      ? timeline.chartT[Math.min(frameIndex, timeline.chartT.length - 1)]!
      : null;

  const clientToT01 = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const x = clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }, []);

  const onTrackPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!timeline || playbackFrameCount <= 0) return;
    const t01 = clientToT01(e.clientX);
    jumpToFrame(timeline.frameIndexAtChartT(t01));
  };

  const onTrackMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timeline) return;
    setHoverT(clientToT01(e.clientX));
  };

  const onTrackLeave = () => {
    setHoverT(null);
  };

  const w1Pct = timeline ? timeline.w1Norm * 100 : 50;

  const matchClockLabel =
    timeline && playbackFrameCount > 0
      ? timeline.formatClockForFrame(frameIndex)
      : "—";

  return (
    <div className={cn("flex flex-col gap-4 select-none", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex justify-between text-[10px] font-medium tabular-nums text-[#86868b] sm:text-[11px] dark:text-[#98989d]">
            <span>Kickoff</span>
            <span className="opacity-90">Half</span>
            <span>Full time</span>
          </div>

          <div
            data-tour="match-timeline"
            className="rounded-[1.25rem] border border-black/[0.06] bg-white/55 p-3 shadow-[0_2px_20px_-10px_rgba(0,0,0,0.1)] backdrop-blur-2xl backdrop-saturate-150 sm:p-4 dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-[0_2px_32px_-12px_rgba(0,0,0,0.55)]"
          >
            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={playT != null ? Math.round(playT * 100) : 0}
              aria-label="Match timeline"
              className="relative h-16 w-full cursor-ew-resize touch-none outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f]/15 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent sm:h-[4.25rem] dark:focus-visible:ring-white/25"
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                onTrackPointer(e);
              }}
              onPointerMove={(e) => {
                if (e.buttons !== 1 && e.pointerType === "mouse") return;
                if (e.pressure > 0 || e.buttons === 1) onTrackPointer(e);
              }}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("button")) return;
                if (!timeline || playbackFrameCount <= 0) return;
                jumpToFrame(
                  timeline.frameIndexAtChartT(clientToT01(e.clientX)),
                );
              }}
              onMouseMove={onTrackMove}
              onMouseLeave={onTrackLeave}
              onKeyDown={(e) => {
                if (!timeline || playbackFrameCount <= 0) return;
                const step = 0.002;
                const cur =
                  timeline.chartT[
                    Math.min(frameIndex, timeline.chartT.length - 1)
                  ]!;
                if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                  e.preventDefault();
                  jumpToFrame(timeline.frameIndexAtChartT(cur + step));
                } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                  e.preventDefault();
                  jumpToFrame(timeline.frameIndexAtChartT(cur - step));
                }
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-black/[0.09] dark:bg-white/[0.14]"
                aria-hidden
              />

              {timeline ? (
                <div
                  className="pointer-events-none absolute inset-y-0 z-[5] w-px -translate-x-1/2 bg-black/[0.12] dark:bg-white/[0.18]"
                  style={{ left: `${w1Pct}%` }}
                  aria-hidden
                >
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap text-[9px] font-semibold uppercase tracking-wider text-[#86868b] dark:text-[#98989d]">
                    HT
                  </span>
                </div>
              ) : null}

              {moments
                .filter((m) => m.kind === "shot")
                .map((m, shotIndex) => (
                  <button
                    key={`shot-${m.frame}`}
                    type="button"
                    title={m.label}
                    data-tour={
                      shotIndex === 0 ? "match-timeline-shots" : undefined
                    }
                    className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-white shadow-md transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]/35 dark:border-[#2c2c2e] dark:focus-visible:outline-white/40"
                    style={{
                      left: `${m.t * 100}%`,
                      width: 9,
                      height: 9,
                      backgroundColor: momentColor("shot"),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = timeline?.rowIndexForBundleFrame(m.frame);
                      if (idx != null) jumpToFrame(idx);
                    }}
                    onMouseEnter={() => setHoverMoment(m)}
                    onMouseLeave={() => setHoverMoment(null)}
                    aria-label={m.label}
                  />
                ))}
              {moments
                .filter((m) => m.kind === "goal")
                .map((m, goalIndex) => (
                  <button
                    key={`goal-${m.frame}`}
                    type="button"
                    title={m.label}
                    data-tour={
                      goalIndex === 0 ? "match-timeline-goals" : undefined
                    }
                    className="absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-white shadow-md transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d1d1f]/35 dark:border-[#2c2c2e] dark:focus-visible:outline-white/40"
                    style={{
                      left: `${m.t * 100}%`,
                      width: 12,
                      height: 12,
                      backgroundColor: momentColor("goal"),
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = timeline?.rowIndexForBundleFrame(m.frame);
                      if (idx != null) jumpToFrame(idx);
                    }}
                    onMouseEnter={() => setHoverMoment(m)}
                    onMouseLeave={() => setHoverMoment(null)}
                    aria-label={m.label}
                  />
                ))}

              {playT != null && playbackFrameCount > 0 ? (
                <div
                  className="pointer-events-none absolute inset-y-0 z-20 w-px -translate-x-1/2 bg-[#1a3263] dark:bg-[#547792]"
                  style={{ left: `${playT * 100}%` }}
                >
                  <div className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#1a3263] shadow-md dark:border-[#2c2c2e] dark:bg-[#547792]" />
                </div>
              ) : null}

              {hoverT != null && timeline && playbackFrameCount > 0 ? (
                <div
                  className="pointer-events-none absolute bottom-full z-[15] mb-1 -translate-x-1/2 opacity-90"
                  style={{ left: `${hoverT * 100}%` }}
                >
                  <span className="whitespace-nowrap rounded-lg border border-black/[0.06] bg-white/90 px-2 py-0.5 text-[10px] font-medium tabular-nums text-[#1d1d1f] shadow-[0_4px_16px_-6px_rgba(0,0,0,0.15)] backdrop-blur-md dark:border-white/[0.1] dark:bg-[#3a3a3c]/95 dark:text-[#f5f5f7]">
                    {timeline.formatClockForFrame(
                      timeline.frameIndexAtChartT(hoverT),
                    )}
                  </span>
                </div>
              ) : null}

              {hoverMoment ? (
                <div className="pointer-events-none absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-black/[0.06] bg-white/90 px-3 py-2 text-center text-[11px] leading-snug text-[#1d1d1f] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#3a3a3c]/95 dark:text-[#f5f5f7] sm:text-left">
                  <span className="font-semibold capitalize text-[#86868b] dark:text-[#98989d]">
                    {hoverMoment.kind}
                  </span>
                  <span className="block text-[12px]">{hoverMoment.label}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="hidden w-[min(100%,13rem)] shrink-0 text-[11px] leading-snug text-[#86868b] dark:text-[#98989d] sm:block">
          <p className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Key moments
          </p>
          <p className="mt-1">
            Goals and shots from dynamic events (merged windows). Drag the bar
            or tap a dot to seek.
          </p>
          <ul className="mt-2 space-y-1">
            <li className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: momentColor("goal") }}
              />
              Goal
            </li>
            <li className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: momentColor("shot") }}
              />
              Shot
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block h-3 w-0.5 shrink-0 rounded-full bg-[#1a3263] dark:bg-[#547792]" />
              Now
            </li>
          </ul>
        </div>
      </div>

      <div className="flex justify-center px-1">
        <div
          data-tour="match-timeline-playback"
          className="inline-flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-2 rounded-full border border-black/[0.06] bg-white/60 px-3 py-2 shadow-[0_2px_24px_-10px_rgba(0,0,0,0.12)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/[0.08] dark:bg-white/[0.07] dark:shadow-[0_2px_40px_-12px_rgba(0,0,0,0.65)] sm:gap-x-2 sm:px-5 sm:py-2.5"
          role="group"
          aria-label="Playback controls"
        >
          <p
            className="min-w-[3.25rem] text-center text-[15px] font-semibold tabular-nums tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]"
            aria-live="polite"
          >
            {matchClockLabel}
          </p>

          <span
            className="hidden h-7 w-px shrink-0 bg-black/[0.08] sm:block dark:bg-white/[0.12]"
            aria-hidden
          />

          <div className="flex items-center gap-2">
            <label
              htmlFor="match-timeline-playback-speed"
              className="hidden text-[11px] font-medium text-[#86868b] dark:text-[#98989d] sm:inline"
            >
              Speed
            </label>
            <div className="relative">
              <select
                id="match-timeline-playback-speed"
                className="h-9 min-w-[4.75rem] cursor-pointer appearance-none rounded-full border border-black/[0.08] bg-black/[0.04] py-2 pr-8 pl-3.5 text-[13px] font-semibold tabular-nums text-[#1d1d1f] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] outline-none transition-[background-color,box-shadow] duration-200 hover:bg-black/[0.07] focus-visible:border-[#1a3263]/35 focus-visible:ring-2 focus-visible:ring-[#1a3263]/18 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.12] dark:bg-white/[0.1] dark:text-[#f5f5f7] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:bg-white/[0.14] dark:focus-visible:border-[#547792]/50 dark:focus-visible:ring-[#547792]/22"
                disabled={playbackFrameCount === 0}
                value={playbackSpeed}
                aria-label="Playback speed"
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              >
                {PLAYBACK_SPEED_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 top-1/2 size-[15px] -translate-y-1/2 text-[#86868b] opacity-80 dark:text-[#98989d]"
                strokeWidth={2}
                aria-hidden
              />
            </div>
          </div>

          <span
            className="hidden h-7 w-px shrink-0 bg-black/[0.08] sm:block dark:bg-white/[0.12]"
            aria-hidden
          />

          <button
            type="button"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1d1d1f] text-[#f5f5f7] shadow-[0_2px_8px_-2px_rgba(0,0,0,0.35)] transition-[transform,box-shadow,background-color] duration-200 hover:bg-black hover:shadow-[0_4px_14px_-4px_rgba(0,0,0,0.4)] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d1d1f]/25 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-40 dark:bg-[#f5f5f7] dark:text-[#1d1d1f] dark:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.9)] dark:hover:bg-white dark:focus-visible:ring-white/35 dark:focus-visible:ring-offset-[#1d1d1f]"
            disabled={playbackFrameCount === 0}
            aria-label={isPlaying ? "Pause" : "Resume"}
            aria-pressed={isPlaying}
            onClick={(e) => {
              e.stopPropagation();
              if (isPlaying) pause();
              else resume();
            }}
          >
            {isPlaying ? (
              <Pause className="size-[18px]" strokeWidth={2} />
            ) : (
              <Play className="size-[18px] pl-0.5" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
});
