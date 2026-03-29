#!/usr/bin/env python3
"""Build timelineKeyMoments.json from 2060235_dynamic_events.csv (quoted CSV).

Goals: seven markers aligned with the match — possession shots where SkillCorner sets
lead_to_goal, score-changing shots, and supplemental frames for goals where the CSV
score column lags (e.g. ~41', 45+1', ~65' vs minute_start in file).

Shots: every other player_possession end_type=shot, excluding frames near a goal marker.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "src/data/2060235_dynamic_events.csv"
OUT_PATH = ROOT / "src/data/timelineKeyMoments.json"
SCORE_BREAKPOINTS_PATH = ROOT / "src/data/scoreBreakpoints.json"

SHOT_EXCLUDE_IF_NEAR_GOAL = 75
# When score updates on a pass/carry, attach to nearest shot within this window (10 Hz ≈ 90 s).
SCORE_GOAL_MAX_SHOT_DISTANCE = 950

# Bundle frame → which side scores (Switzerland = home in UI). CSV attributes this shot to
# Switzerland but a 3–4 result requires the 6th goal to count for Germany.
SCORING_SIDE_OVERRIDES: dict[int, str] = {
    58294: "Germany",
}

# Last bundle frame in tracking bundle (score from official result after full time).
FINAL_SCORE_FRAME = 67372
FINAL_HOME = 3
FINAL_AWAY = 4


def is_true(val: str | None) -> bool:
    return (val or "").strip().lower() == "true"


def sui_home_score(row: dict[str, str]) -> tuple[int, int] | None:
    ts = (row.get("team_shortname") or "").strip()
    try:
        h = int(float(row["team_score"]))
        o = int(float(row["opponent_team_score"]))
    except (ValueError, KeyError):
        return None
    if ts == "Switzerland":
        return h, o
    if ts == "Germany":
        return o, h
    return None


def score_change_frames(rows: list[dict[str, str]]) -> list[int]:
    """Bundle frames where (SUI, GER) score first changes in row order."""
    last: tuple[int, int] | None = None
    out: list[int] = []
    for r in sorted(rows, key=lambda x: int(x["frame_start"])):
        sc = sui_home_score(r)
        if sc is None:
            continue
        if last != sc:
            out.append(int(r["frame_start"]))
            last = sc
    return out


def goal_label_from_row(row: dict[str, str]) -> str:
    p = (row.get("player_in_possession_name") or row.get("player_name") or "").strip()
    t = (row.get("team_shortname") or "").strip()
    if p:
        return f"Goal · {p}" + (f" ({t})" if t else "")
    return "Goal"


def shot_label(row: dict[str, str]) -> str:
    p = (row.get("player_in_possession_name") or row.get("player_name") or "").strip()
    t = (row.get("team_shortname") or "").strip()
    if p:
        return f"Shot · {p}" + (f" ({t})" if t else "")
    return "Shot"


def scoring_team_shortname(
    goal_frame: int,
    shot_by_frame: dict[int, dict[str, str]],
) -> str:
    if goal_frame in SCORING_SIDE_OVERRIDES:
        return SCORING_SIDE_OVERRIDES[goal_frame]
    row = shot_by_frame.get(goal_frame)
    if not row:
        return "Switzerland"
    return (row.get("team_shortname") or "").strip() or "Switzerland"


def build_score_breakpoints(
    goal_frames_ordered: list[int],
    shot_by_frame: dict[int, dict[str, str]],
) -> list[dict[str, int]]:
    home = away = 0
    out: list[dict[str, int]] = [{"frame": 0, "home": 0, "away": 0}]
    for fs in goal_frames_ordered:
        side = scoring_team_shortname(fs, shot_by_frame)
        if side == "Germany":
            away += 1
        else:
            home += 1
        out.append({"frame": fs, "home": home, "away": away})
    if not out or out[-1]["frame"] != FINAL_SCORE_FRAME:
        out.append(
            {"frame": FINAL_SCORE_FRAME, "home": FINAL_HOME, "away": FINAL_AWAY},
        )
    return out


def main() -> None:
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    possession_shots = [
        r
        for r in rows
        if r.get("event_type") == "player_possession"
        and (r.get("end_type") or "").strip() == "shot"
    ]
    shot_by_frame: dict[int, dict[str, str]] = {}
    shot_frames_sorted: list[int] = []
    for r in possession_shots:
        fs = int(r["frame_start"])
        if fs not in shot_by_frame:
            shot_by_frame[fs] = r
            shot_frames_sorted.append(fs)
    shot_frames_sorted.sort()

    def nearest_shot_frame(target: int) -> int | None:
        best: int | None = None
        best_d = SCORE_GOAL_MAX_SHOT_DISTANCE + 1
        for sf in shot_frames_sorted:
            d = abs(sf - target)
            if d < best_d:
                best_d = d
                best = sf
        return best if best_d <= SCORE_GOAL_MAX_SHOT_DISTANCE else None

    goal_frames: set[int] = set()

    # 1) Official-ish: possession shot + lead_to_goal (SkillCorner goal flag on the shot).
    for r in possession_shots:
        if is_true(r.get("lead_to_goal")):
            goal_frames.add(int(r["frame_start"]))

    # 2) Each score step → goal at that frame if it's a shot, else nearest shot in window.
    for sf in score_change_frames(rows):
        row_at = next((r for r in rows if int(r["frame_start"]) == sf), None)
        if (
            row_at
            and row_at.get("event_type") == "player_possession"
            and (row_at.get("end_type") or "").strip() == "shot"
        ):
            goal_frames.add(sf)
        else:
            ns = nearest_shot_frame(sf)
            if ns is not None:
                goal_frames.add(ns)

    # 3) Broadcast-aligned goals missing lead_to_goal / score updates in this extract
    #    (~41', 45+1' as minute_start in CSV, ~65' wall clock → frame ~50997).
    supplemental_goal_frames = [24721, 27614, 50997]
    goal_frames.update(supplemental_goal_frames)

    goal_frames_ordered = sorted(goal_frames)

    moments: list[dict[str, str | int]] = []
    for fs in goal_frames_ordered:
        row = shot_by_frame.get(fs)
        label = goal_label_from_row(row) if row else "Goal"
        moments.append({"frame": fs, "label": label, "kind": "goal"})

    def near_goal(frame: int) -> bool:
        return any(abs(frame - g) <= SHOT_EXCLUDE_IF_NEAR_GOAL for g in goal_frames)

    for fs in shot_frames_sorted:
        if fs in goal_frames:
            continue
        if near_goal(fs):
            continue
        moments.append(
            {
                "frame": fs,
                "label": shot_label(shot_by_frame[fs]),
                "kind": "shot",
            }
        )

    moments.sort(key=lambda m: m["frame"])

    OUT_PATH.write_text(
        json.dumps(
            {
                "matchId": 2060235,
                "source": "2060235_dynamic_events.csv",
                "notes": (
                    "Goals: lead_to_goal shots, score-change-linked shots, plus "
                    f"supplemental frames {supplemental_goal_frames} for broadcast-time goals "
                    "under-tagged in CSV; shots are remaining possession shots."
                ),
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
    print("Goal frames:", goal_frames_ordered)

    breakpoints = build_score_breakpoints(goal_frames_ordered, shot_by_frame)
    SCORE_BREAKPOINTS_PATH.write_text(
        json.dumps(
            {"matchId": 2060235, "breakpoints": breakpoints},
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(breakpoints)} score breakpoints to {SCORE_BREAKPOINTS_PATH}")


if __name__ == "__main__":
    main()
