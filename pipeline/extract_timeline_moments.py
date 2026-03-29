#!/usr/bin/env python3
"""Build timelineKeyMoments.json from 2060235_dynamic_events.csv (quoted CSV).

Goals: seven markers aligned with the match — possession shots where SkillCorner sets
lead_to_goal, score-changing shots, and supplemental frames for goals where the CSV
score column lags (e.g. ~41', 45+1', ~65' vs minute_start in file).

Shots: every other player_possession end_type=shot, excluding frames near a goal marker.

Run from repo root:
  uv run python pipeline/extract_timeline_moments.py

Or use ``pipeline/run_all.py`` to regenerate all frontend data assets.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
_DATA_DIR = _REPO_ROOT / "frontend" / "src" / "data"
CSV_PATH = _DATA_DIR / "2060235_dynamic_events.csv"
OUT_PATH = _DATA_DIR / "timelineKeyMoments.json"
SCORE_BREAKPOINTS_PATH = _DATA_DIR / "scoreBreakpoints.json"

SHOT_EXCLUDE_IF_NEAR_GOAL = 75
# When score updates on a pass/carry, attach to nearest shot within this window (10 Hz ≈ 90 s).
SCORE_GOAL_MAX_SHOT_DISTANCE = 950

# Bundle frame → which side scores (Switzerland = home in UI). CSV rows can disagree with TV.
SCORING_SIDE_OVERRIDES: dict[int, str] = {
    # Wirtz (GER) makes it 2–3; feed tied this instant to a CH-tagged shot row.
    50997: "Germany",
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


# Breakpoint / CSV goal frame → bundle frame used on the timeline (tracking clock ≈ TV).
# Example: 50997 sits at ~67' on the strip; 47634 matches ~61' (Wirtz goal).
GOAL_TIMELINE_FRAME: dict[int, int] = {
    50997: 47634,
}
_TIMELINE_GOAL_FRAMES = set(GOAL_TIMELINE_FRAME.values())


def _canonical_goal_frame(timeline_frame: int) -> int:
    for canon, tl in GOAL_TIMELINE_FRAME.items():
        if tl == timeline_frame:
            return canon
    return timeline_frame


# Broadcast scoreboard: SkillCorner timestamps / shot attribution ≠ TV minute or scorer text.
# Keys are canonical (breakpoint) frames, not GOAL_TIMELINE_FRAME remapped values.
GOAL_DISPLAY: dict[int, dict[str, str]] = {
    9778: {"label": "Goal · D. Ndoye (Switzerland)", "minuteLabel": "17'"},
    15275: {"label": "Goal · J. Tah (Germany)", "minuteLabel": "26'"},
    24721: {"label": "Goal · G. Xhaka (Switzerland)", "minuteLabel": "41'"},
    27614: {"label": "Goal · S. Gnabry (Germany)", "minuteLabel": "45+1'"},
    50997: {"label": "Goal · F. Wirtz (Germany)", "minuteLabel": "61'"},
    58294: {"label": "Goal · Joel Monteiro (Switzerland)", "minuteLabel": "79'"},
    62175: {"label": "Goal · F. Wirtz (Germany)", "minuteLabel": "85'"},
}


def _apply_goal_display(moments: list[dict[str, object]]) -> None:
    for m in moments:
        if m.get("kind") != "goal":
            continue
        ov = GOAL_DISPLAY.get(_canonical_goal_frame(int(m["frame"])))
        if ov:
            m["label"] = ov["label"]
            m["minuteLabel"] = ov["minuteLabel"]


def main() -> None:
    if not CSV_PATH.is_file():
        raise SystemExit(f"Dynamic events CSV not found: {CSV_PATH}")

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
        timeline_fs = GOAL_TIMELINE_FRAME.get(fs, fs)
        row = shot_by_frame.get(fs)
        label = goal_label_from_row(row) if row else "Goal"
        moments.append({"frame": timeline_fs, "label": label, "kind": "goal"})

    def near_goal(frame: int) -> bool:
        return any(abs(frame - g) <= SHOT_EXCLUDE_IF_NEAR_GOAL for g in goal_frames)

    for fs in shot_frames_sorted:
        if fs in goal_frames:
            continue
        if fs in _TIMELINE_GOAL_FRAMES:
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
    _apply_goal_display(moments)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(
            {
                "matchId": 2060235,
                "source": "2060235_dynamic_events.csv",
                "notes": (
                    "Goals: derived from CSV + supplemental frames; "
                    "GOAL_DISPLAY in pipeline/extract_timeline_moments.py fixes TV minute "
                    "labels and scorers. Shots: remaining possession shots."
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
