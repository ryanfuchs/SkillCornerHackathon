#!/usr/bin/env python3
"""Build timelineKeyMoments.json from 2060235_dynamic_events.csv (quoted CSV).

Goals: cluster rows with lead_to_goal (same scoring play → one marker).
Shots: every player_possession event that ends in a shot (all distinct shot attempts).
Shots that fall within the goal cluster window are omitted (shown as goals only).
"""
from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "src/data/2060235_dynamic_events.csv"
OUT_PATH = ROOT / "src/data/timelineKeyMoments.json"

GOAL_CLUSTER_GAP = 75
SHOT_EXCLUDE_IF_NEAR_GOAL = 75


def is_true(val: str | None) -> bool:
    return (val or "").strip().lower() == "true"


def merge_clusters(frames: list[int], gap: int) -> list[int]:
    if not frames:
        return []
    frames = sorted(frames)
    clusters: list[list[int]] = []
    cur = [frames[0]]
    for f in frames[1:]:
        if f - cur[0] <= gap:
            cur.append(f)
        else:
            clusters.append(cur)
            cur = [f]
    clusters.append(cur)
    return [c[len(c) // 2] for c in clusters]


def best_goal_label(cluster_rows: list[dict[str, str]]) -> str:
    if not cluster_rows:
        return "Goal"
    for row in cluster_rows:
        if row.get("event_type") == "player_possession" and row.get("end_type") == "shot":
            p = (row.get("player_in_possession_name") or row.get("player_name") or "").strip()
            t = (row.get("team_shortname") or "").strip()
            if p:
                return f"Goal · {p}" + (f" ({t})" if t else "")
    for row in cluster_rows:
        if row.get("event_type") == "on_ball_engagement":
            p = (row.get("player_name") or "").strip()
            t = (row.get("team_shortname") or "").strip()
            if p:
                return f"Goal · {p}" + (f" ({t})" if t else "")
    row = cluster_rows[0]
    p = (row.get("player_name") or row.get("player_in_possession_name") or "").strip()
    return f"Goal · {p}" if p else "Goal"


def shot_label(row: dict[str, str]) -> str:
    p = (row.get("player_in_possession_name") or row.get("player_name") or "").strip()
    t = (row.get("team_shortname") or "").strip()
    if p:
        return f"Shot · {p}" + (f" ({t})" if t else "")
    return "Shot"


def main() -> None:
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    goal_rows = [r for r in rows if is_true(r.get("lead_to_goal"))]
    goal_frames = [int(r["frame_start"]) for r in goal_rows]
    goal_rep = merge_clusters(goal_frames, GOAL_CLUSTER_GAP)
    goal_by_cluster: dict[int, list[dict[str, str]]] = defaultdict(list)
    for r in goal_rows:
        fs = int(r["frame_start"])
        rep = min(goal_rep, key=lambda x: abs(x - fs))
        if abs(rep - fs) <= GOAL_CLUSTER_GAP:
            goal_by_cluster[rep].append(r)

    moments: list[dict[str, str | int]] = []
    for rep in sorted(goal_rep):
        moments.append(
            {
                "frame": rep,
                "label": best_goal_label(goal_by_cluster[rep]),
                "kind": "goal",
            }
        )

    possession_shots = [
        r
        for r in rows
        if r.get("event_type") == "player_possession"
        and (r.get("end_type") or "").strip() == "shot"
    ]
    # One row per frame_start (CSV has unique frames for these events).
    by_frame: dict[int, dict[str, str]] = {}
    for r in possession_shots:
        fs = int(r["frame_start"])
        if fs not in by_frame:
            by_frame[fs] = r

    goal_frames_set = set(goal_rep)

    def near_goal(frame: int) -> bool:
        return any(abs(frame - g) <= SHOT_EXCLUDE_IF_NEAR_GOAL for g in goal_frames_set)

    for fs in sorted(by_frame):
        if near_goal(fs):
            continue
        r = by_frame[fs]
        moments.append(
            {
                "frame": fs,
                "label": shot_label(r),
                "kind": "shot",
            }
        )

    moments.sort(key=lambda m: m["frame"])

    OUT_PATH.write_text(
        json.dumps(
            {
                "matchId": 2060235,
                "source": "2060235_dynamic_events.csv",
                "notes": "Goals from lead_to_goal clusters; shots from player_possession end_type=shot",
                "moments": moments,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    n_goal = sum(1 for m in moments if m["kind"] == "goal")
    n_shot = sum(1 for m in moments if m["kind"] == "shot")
    print(f"Wrote {len(moments)} moments ({n_goal} goals, {n_shot} shots) to {OUT_PATH}")


if __name__ == "__main__":
    main()
