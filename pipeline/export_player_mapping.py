#!/usr/bin/env python3
"""
Export a mapping from ``player_id`` to player info as a single JSON file.

By default this is “static” info only (match metadata + physical per-player stats)
so it does not need to scan the huge ``*_tracking_extrapolated.jsonl``.

Usage:
  uv run python pipeline/export_player_mapping.py
  uv run python pipeline/export_player_mapping.py --match-json data/2060235_match.json

Or use ``pipeline/run_all.py`` to regenerate all frontend data assets.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from parsing.match import parse_match_json
from parsing.physical_data import parse_physical_data_csv


def _safe_full_name(first: str | None, last: str | None) -> str:
    first_s = (first or "").strip()
    last_s = (last or "").strip()
    out = f"{first_s} {last_s}".strip()
    return out


def _team_by_id(match_data) -> dict[int, dict]:
    home = match_data.home_team
    away = match_data.away_team
    return {
        int(home.id): {
            "id": int(home.id),
            "name": home.name,
            "short_name": home.short_name,
            "acronym": home.acronym,
            "side": "home",
        },
        int(away.id): {
            "id": int(away.id),
            "name": away.name,
            "short_name": away.short_name,
            "acronym": away.acronym,
            "side": "away",
        },
    }


def _physical_by_player_id(path: Path) -> dict[int, dict]:
    rows = parse_physical_data_csv(path)
    return {int(r.player_id): r.model_dump(mode="json") for r in rows}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--match-json",
        type=Path,
        default=_REPO_ROOT / "data" / "2060235_match.json",
        help="Path to *_match.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=_REPO_ROOT / "frontend" / "src" / "data" / "playerInfoById.json",
        help="Where to write the JSON mapping",
    )
    args = parser.parse_args()

    os.chdir(_REPO_ROOT)

    match_json = args.match_json
    if not match_json.is_file():
        raise SystemExit(f"Match JSON not found: {match_json}")

    match_data = parse_match_json(match_json)
    data_dir = match_json.parent
    prefix = match_json.stem.removesuffix("_match")
    physical_csv = data_dir / f"{prefix}_physical_data.csv"
    if not physical_csv.is_file():
        raise SystemExit(f"Physical data CSV not found: {physical_csv}")

    teams = _team_by_id(match_data)
    physical = _physical_by_player_id(physical_csv)

    players_by_id: dict[str, dict] = {}
    for p in match_data.players:
        pid = int(p.id)
        team = teams.get(int(p.team_id), {"id": int(p.team_id), "side": None})

        info: dict = {
            "id": pid,
            "team": team,
            "name": {
                "first_name": p.first_name,
                "last_name": p.last_name,
                "full_name": _safe_full_name(p.first_name, p.last_name),
                "short_name": p.short_name,
            },
            # Position here means the tactical role/position-group from SkillCorner metadata.
            "position": {
                "role_id": int(p.player_role.id),
                "position_group": p.player_role.position_group,
                "role_name": p.player_role.name,
                "role_acronym": p.player_role.acronym,
            },
            "match": {
                "team_player_id": int(p.team_player_id),
                "number": int(p.number),
                "yellow_card": int(p.yellow_card),
                "red_card": int(p.red_card),
                "injured": bool(p.injured),
                "goal": int(p.goal),
                "own_goal": int(p.own_goal),
                "trackable_object": int(p.trackable_object)
                if p.trackable_object is not None
                else None,
                "gender": p.gender,
                "birthday": p.birthday,
                "playing_time": p.playing_time.model_dump(mode="json"),
            },
        }

        ph = physical.get(pid)
        if ph is not None:
            # Keep birthdate under a stable key name; also include the rest verbatim.
            if "birthdate" in ph and "birthday" not in info["match"]:
                info["match"]["birthday"] = ph.get("birthdate")
            info["physical"] = ph

        players_by_id[str(pid)] = info

    payload = {
        "matchId": int(match_data.id),
        "playersById": players_by_id,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    n_players = len(players_by_id)
    print(
        f"Wrote player mapping for match {match_data.id}: {n_players} players -> {args.output}",
        flush=True,
    )


if __name__ == "__main__":
    main()

