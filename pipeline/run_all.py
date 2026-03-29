#!/usr/bin/env python3
"""Regenerate all frontend JSON assets derived from SkillCorner match exports.

Runs, in order:

1. ``export_player_mapping.py`` → ``frontend/src/data/playerInfoById.json``
2. ``extract_timeline_moments.py`` → ``timelineKeyMoments.json``, ``scoreBreakpoints.json``
3. ``export_phase_breakdown.py`` → ``phaseBreakdownPhases.json``,
   ``phaseBreakdownFrames.json`` (full-bundle indicator pass; slow)

From the repository root::

    uv run python pipeline/run_all.py

Skip the heavy phase export::

    uv run python pipeline/run_all.py --skip-phases

Use a different match bundle (passed to steps 1 and 3)::

    uv run python pipeline/run_all.py --match-json data/other_match.json

Forward extra arguments only to ``export_phase_breakdown.py`` (after ``--``)::

    uv run python pipeline/run_all.py -- --max-phases 10 --start-phase 0
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
_PIPELINE_DIR = Path(__file__).resolve().parent


def _split_argv() -> tuple[list[str], list[str]]:
    argv = sys.argv[1:]
    if "--" in argv:
        i = argv.index("--")
        return argv[:i], argv[i + 1 :]
    return argv, []


def main() -> None:
    our_argv, phase_extra = _split_argv()
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--skip-phases",
        action="store_true",
        help="Skip export_phase_breakdown.py (indicator scan over bundle frames).",
    )
    parser.add_argument(
        "--match-json",
        type=Path,
        default=None,
        help="Path to *_match.json for player mapping and phase export (default: data/2060235_match.json).",
    )
    args = parser.parse_args(our_argv)

    py = sys.executable

    def run_step(script: str, extra: list[str]) -> None:
        cmd = [py, str(_PIPELINE_DIR / script), *extra]
        print(f"\n==> {' '.join(cmd)}\n", flush=True)
        subprocess.run(cmd, cwd=_REPO_ROOT, check=True)

    mj: list[str] = []
    if args.match_json is not None:
        p = args.match_json
        if not p.is_file():
            raise SystemExit(f"--match-json not found: {p}")
        mj = ["--match-json", str(p.resolve())]

    run_step("export_player_mapping.py", mj)
    run_step("extract_timeline_moments.py", [])

    if args.skip_phases:
        print("\n==> Skipped export_phase_breakdown.py (--skip-phases)\n", flush=True)
    else:
        run_step("export_phase_breakdown.py", [*mj, *phase_extra])

    print("\nDone.\n", flush=True)


if __name__ == "__main__":
    main()
