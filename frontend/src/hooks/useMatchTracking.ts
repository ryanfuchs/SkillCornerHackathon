import { useEffect, useMemo, useState } from "react";
import type { PitchPlayer } from "@/components/PitchView";
import { usePlayback } from "@/context/PlaybackContext";

import trackingUrl from "@/data/2060235_tracking_extrapolated.jsonl?url";
import {
  GER_MATCH_COLOR as AWAY_COLOR,
  SUI_MATCH_COLOR as HOME_COLOR,
} from "@/lib/matchTeamColors";

/** One JSONL row from SkillCorner-style tracking (10 Hz: one row per 0.1 s). */
export type TrackingFrame = {
  frame: number;
  timestamp?: string | null;
  period?: number | null;
  ball_data: {
    x: number | null;
    y: number | null;
    z: number | null;
    is_detected: boolean | null;
  };
  player_data: Array<{
    x: number;
    y: number;
    player_id: number;
    is_detected: boolean;
  }>;
};

/** PitchView: x = across pitch, y = along pitch. Tracking: x = along, y = across. */
function trackingToPitch(jx: number, jy: number): { x: number; y: number } {
  return { x: jy, y: jx };
}

function frameToPitchPlayers(frame: TrackingFrame): PitchPlayer[] {
  const { player_data } = frame;
  const n = player_data.length;
  const half = Math.floor(n / 2);
  return player_data.map((p, i) => {
    const { x, y } = trackingToPitch(p.x, p.y);
    const teamHome = i < half;
    return {
      id: String(p.player_id),
      x,
      y,
      color: teamHome ? HOME_COLOR : AWAY_COLOR,
    };
  });
}

function frameToBall(
  frame: TrackingFrame,
): { x: number; y: number; z: number } | null {
  const { ball_data } = frame;
  if (
    !ball_data.is_detected ||
    ball_data.x == null ||
    ball_data.y == null
  ) {
    return null;
  }
  const { x, y } = trackingToPitch(ball_data.x, ball_data.y);
  const z = ball_data.z ?? 0;
  return { x, y, z };
}

/** Normalized x (0–1) and helpers for the header momentum strip (two halves, real play only). */
export type MomentumTimeline = {
  chartT: Float32Array;
  /** SkillCorner match-minute (~0–46 first half, ~45–93 second); -1 if missing. */
  matchMinutes: Float32Array;
  p1s: number;
  p1e: number;
  p2s: number;
  p2e: number;
  /** Width share of first half in [0,1] (rest is second half). */
  w1Norm: number;
  duration1Min: number;
  duration2Min: number;
  formatClockForFrame: (frameIndex: number) => string;
  frameIndexAtChartT: (t01: number) => number;
  /** Playback row index for a SkillCorner bundle `frame` id, if present in tracking. */
  rowIndexForBundleFrame: (bundleFrame: number) => number | null;
  /** Normalized position [0, 1] on the match spine for a bundle frame id. */
  chartTForBundleFrame: (bundleFrame: number) => number | null;
};

function parseTimestampToMatchMinutes(ts: string | null | undefined): number | null {
  if (ts == null || ts === "") return null;
  const parts = ts.split(":");
  if (parts.length < 3) return null;
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  const s = Number(parts[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null;
  return h * 60 + m + s / 60;
}

function formatBroadcastClock(frame: TrackingFrame): string {
  const mins = parseTimestampToMatchMinutes(frame.timestamp ?? undefined);
  if (mins == null || frame.period == null) return "—";
  const mi = Math.floor(mins);
  const sec = Math.floor((mins - mi) * 60 + 1e-6);
  return `${mi}:${String(Math.min(59, sec)).padStart(2, "0")}`;
}

function buildMomentumTimeline(frames: TrackingFrame[]): MomentumTimeline | null {
  const n = frames.length;
  if (n === 0) return null;

  let p1s = -1;
  let p1e = -1;
  let p2s = -1;
  let p2e = -1;
  for (let i = 0; i < n; i++) {
    const p = frames[i]!.period;
    if (p === 1) {
      if (p1s < 0) p1s = i;
      p1e = i;
    }
    if (p === 2) {
      if (p2s < 0) p2s = i;
      p2e = i;
    }
  }

  if (p1s < 0 || p1e < 0 || p2s < 0 || p2e < 0) return null;

  const len1 = p1e - p1s + 1;
  const len2 = p2e - p2s + 1;
  const total = len1 + len2;
  const w1Norm = total > 0 ? len1 / total : 0.5;

  const chartT = new Float32Array(n);
  const matchMinutes = new Float32Array(n);
  const span1 = Math.max(1, len1 - 1);
  const span2 = Math.max(1, len2 - 1);
  const w2Norm = 1 - w1Norm;

  for (let i = 0; i < n; i++) {
    const mm = parseTimestampToMatchMinutes(frames[i]!.timestamp ?? undefined);
    matchMinutes[i] = mm ?? -1;

    if (i < p1s) chartT[i] = 0;
    else if (i <= p1e)
      chartT[i] = ((i - p1s) / span1) * w1Norm;
    else if (i < p2s) chartT[i] = w1Norm;
    else if (i <= p2e)
      chartT[i] = w1Norm + ((i - p2s) / span2) * w2Norm;
    else chartT[i] = 1;
  }

  const end1 = parseTimestampToMatchMinutes(frames[p1e]!.timestamp ?? undefined);
  const end2 = parseTimestampToMatchMinutes(frames[p2e]!.timestamp ?? undefined);
  const duration1Min = end1 ?? len1 / 600;
  const duration2Min =
    end2 != null ? Math.max(0.01, end2 - 45) : len2 / 600;

  const formatClockForFrame = (frameIndex: number) => {
    const i = Math.min(Math.max(0, frameIndex), n - 1);
    return formatBroadcastClock(frames[i]!);
  };

  const frameIndexAtChartT = (t01: number) => {
    const target = Math.max(0, Math.min(1, t01));
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (chartT[mid]! < target) lo = mid + 1;
      else hi = mid;
    }
    let best = lo;
    if (lo > 0) {
      const dL = Math.abs(chartT[lo - 1]! - target);
      const dR = Math.abs(chartT[lo]! - target);
      if (dL < dR) best = lo - 1;
    }
    return best;
  };

  const rowIndexByBundleFrame = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const fid = frames[i]!.frame;
    if (!rowIndexByBundleFrame.has(fid)) rowIndexByBundleFrame.set(fid, i);
  }

  const rowIndexForBundleFrame = (bundleFrame: number) =>
    rowIndexByBundleFrame.get(bundleFrame) ?? null;

  const chartTForBundleFrame = (bundleFrame: number) => {
    const idx = rowIndexForBundleFrame(bundleFrame);
    if (idx == null) return null;
    return chartT[idx]!;
  };

  return {
    chartT,
    matchMinutes,
    p1s,
    p1e,
    p2s,
    p2e,
    w1Norm,
    duration1Min,
    duration2Min,
    formatClockForFrame,
    frameIndexAtChartT,
    rowIndexForBundleFrame,
    chartTForBundleFrame,
  };
}

export function useMatchTracking() {
  const { frameIndex, setPlaybackFrameCount, setFrameIndex } = usePlayback();
  const [frames, setFrames] = useState<TrackingFrame[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(trackingUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        const lines = text.split("\n").filter((line) => line.trim().length > 0);
        const parsed: TrackingFrame[] = [];
        for (const line of lines) {
          try {
            parsed.push(JSON.parse(line) as TrackingFrame);
          } catch {
            /* skip bad lines */
          }
        }
        const n = parsed.length;
        const firstWithPlayers = parsed.findIndex(
          (f) => f.player_data?.length > 0,
        );
        const target =
          firstWithPlayers >= 0 ? firstWithPlayers : 0;
        const clamped = n > 0 ? Math.min(Math.max(0, target), n - 1) : 0;
        setFrames(parsed);
        setPlaybackFrameCount(n);
        setFrameIndex(clamped);
      })
      .catch((e: Error) => {
        if (!cancelled) setLoadError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [setFrameIndex, setPlaybackFrameCount]);

  const snapshot = useMemo(() => {
    if (!frames?.length) {
      return {
        players: [] as PitchPlayer[],
        ball: null as { x: number; y: number; z: number } | null,
        frame: 0,
        timestamp: null as string | null,
      };
    }
    const safe = Math.min(Math.max(0, frameIndex), frames.length - 1);
    const f = frames[safe]!;
    return {
      players: frameToPitchPlayers(f),
      ball: frameToBall(f),
      frame: f.frame,
      timestamp: f.timestamp ?? null,
    };
  }, [frames, frameIndex]);

  const momentumTimeline = useMemo(
    () => (frames?.length ? buildMomentumTimeline(frames) : null),
    [frames],
  );

  return {
    players: snapshot.players,
    ball: snapshot.ball,
    frame: snapshot.frame,
    timestamp: snapshot.timestamp,
    loadError,
    loaded: frames !== null,
    momentumTimeline,
  };
}
