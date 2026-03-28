import { useEffect, useMemo, useState } from "react";
import type { PitchPlayer } from "@/components/PitchView";
import { usePlayback } from "@/context/PlaybackContext";

import trackingUrl from "@/data/2060235_tracking_extrapolated.jsonl?url";

/** One JSONL row from SkillCorner-style tracking (10 Hz: one row per 0.1 s). */
export type TrackingFrame = {
  frame: number;
  timestamp?: string | null;
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

const HOME_COLOR = "#2563eb";
const AWAY_COLOR = "#dc2626";

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
): { x: number; y: number } | null {
  const { ball_data } = frame;
  if (
    !ball_data.is_detected ||
    ball_data.x == null ||
    ball_data.y == null
  ) {
    return null;
  }
  return trackingToPitch(ball_data.x, ball_data.y);
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
        ball: null as { x: number; y: number } | null,
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

  return {
    players: snapshot.players,
    ball: snapshot.ball,
    frame: snapshot.frame,
    timestamp: snapshot.timestamp,
    loadError,
    loaded: frames !== null,
  };
}
