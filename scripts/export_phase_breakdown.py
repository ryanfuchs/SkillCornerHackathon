#!/usr/bin/env python3
"""Export match analysis for the Phase Breakdown frontend (two JSON files).

Writes:
  - Phases file: phase metadata, per-phase analysis, seriesByPhaseOrder, export options.
  - Frames file: parallel arrays per bundle index (tracking frame id + indicator scores).

Run from repo root (default: every phase in the match; full bundle frame scan):
  uv run python scripts/export_phase_breakdown.py
  uv run python scripts/export_phase_breakdown.py --precompute-phases 0,2,5 --stride 2
  uv run python scripts/export_phase_breakdown.py --max-phases 10
  uv run python scripts/export_phase_breakdown.py --start-phase 50 --max-phases 20
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from analysis.ball_chaos import BallChaosAnalyzer
from analysis.defensive_line import DefensiveLineAnalyzer
from analysis.line_to_line_acceleration import LineToLineAccelerationAnalyzer
from analysis.player_clusters import PlayerClusterAnalyzer
from analysis.position_change import PositionChangeAnalyzer
from parsing.match import parse_match_bundle
from parsing.phases_of_play import PhaseOfPlay
from parsing.tracking import FrameData

INDICATOR_IDS = [
    "player_clusters",
    "position_change",
    "ball_chaos",
    "defensive_line",
    "line_to_line_acceleration",
]

_DATA_DIR = _REPO_ROOT / "frontend" / "src" / "data"
_DEFAULT_PHASES = _DATA_DIR / "phaseBreakdownPhases.json"
_DEFAULT_FRAMES = _DATA_DIR / "phaseBreakdownFrames.json"


def _frame_id_to_index_map(frames: list[FrameData]) -> dict[int, int]:
    return {f.frame: i for i, f in enumerate(frames)}


def _phase_to_bundle_indices(
    phase: PhaseOfPlay, idx_map: dict[int, int]
) -> tuple[int, int] | None:
    lo = idx_map.get(phase.frame_start)
    hi = idx_map.get(phase.frame_end)
    if lo is None or hi is None:
        return None
    if lo > hi:
        lo, hi = hi, lo
    return lo, hi


def _parse_precompute_phases(arg: str, n_phases: int) -> set[int] | None:
    """Return phase order indices to precompute chart series for. None = all."""
    s = arg.strip().lower()
    if s == "all":
        return None
    if s == "none":
        return set()
    out: set[int] = set()
    for part in arg.split(","):
        part = part.strip()
        if not part:
            continue
        i = int(part, 10)
        if i < 0 or i >= n_phases:
            raise SystemExit(
                f"--precompute-phases: index {i} out of range (0..{n_phases - 1})"
            )
        out.add(i)
    return out


def _phase_indicator_stats(
    lo: int,
    hi: int,
    by_indicator: dict[str, list[float]],
    indicator_ids: list[str],
) -> dict | None:
    if lo > hi:
        return None
    n = hi - lo + 1
    mean: dict[str, float] = {}
    max_v: dict[str, float] = {}
    min_v: dict[str, float] = {}
    for ind in indicator_ids:
        vals = by_indicator[ind][lo : hi + 1]
        mean[ind] = float(sum(vals) / n)
        max_v[ind] = float(max(vals))
        min_v[ind] = float(min(vals))
    return {"mean": mean, "max": max_v, "min": min_v, "frameCount": n}


def _empty_series_row(
    bundle_start: int | None = None, bundle_end: int | None = None
) -> dict:
    return {
        "bundleStart": bundle_start,
        "bundleEnd": bundle_end,
        "t": [],
        **{k: [] for k in INDICATOR_IDS},
    }


def main() -> None:
    t0 = time.perf_counter()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--match-json",
        type=Path,
        default=_REPO_ROOT / "data" / "2060235_match.json",
        help="Path to *_match.json",
    )
    parser.add_argument(
        "--output-phases",
        type=Path,
        default=_DEFAULT_PHASES,
        help="Phases + series JSON path",
    )
    parser.add_argument(
        "--output-frames",
        type=Path,
        default=_DEFAULT_FRAMES,
        help="Per-bundle-frame indicator arrays JSON path",
    )
    parser.add_argument(
        "--start-phase",
        type=int,
        default=0,
        help=(
            "0-based match timeline index: skip phases before this, then apply --max-phases. "
            "Exported orderIndex 0 is match phase start_phase."
        ),
    )
    parser.add_argument(
        "--max-phases",
        type=int,
        default=None,
        help="Only export the first K phases (timeline order). Default: all.",
    )
    parser.add_argument(
        "--stride",
        type=int,
        default=1,
        help="Sample every Nth bundle frame inside precomputed phase charts (1 = every frame).",
    )
    parser.add_argument(
        "--precompute-phases",
        type=str,
        default="all",
        help=(
            "Comma-separated phase order indices for seriesByPhaseOrder, "
            "'all', or 'none'."
        ),
    )
    args = parser.parse_args()
    if args.stride < 1:
        raise SystemExit("--stride must be >= 1")

    os.chdir(_REPO_ROOT)

    match_json = args.match_json
    if not match_json.is_file():
        raise SystemExit(f"Match JSON not found: {match_json}")

    bundle = parse_match_bundle(match_json)
    frames = bundle.frames
    if not frames or not bundle.phases:
        raise SystemExit("Bundle needs frames and phases.")

    idx_map = _frame_id_to_index_map(frames)
    total_phases_in_match = len(bundle.phases)
    if args.start_phase < 0:
        raise SystemExit("--start-phase must be >= 0")
    if args.start_phase >= total_phases_in_match:
        raise SystemExit(
            f"--start-phase {args.start_phase} out of range "
            f"(match has {total_phases_in_match} phases, valid 0..{total_phases_in_match - 1})"
        )

    phase_list = list(bundle.phases)[args.start_phase :]
    if args.max_phases is not None:
        phase_list = phase_list[: max(0, args.max_phases)]

    if not phase_list:
        raise SystemExit(
            "No phases to export (--start-phase / --max-phases produced an empty list)."
        )

    n_export_phases = len(phase_list)
    if args.max_phases is not None:
        print(
            f"Phases: exporting {n_export_phases} of {total_phases_in_match} in match "
            f"(start_phase={args.start_phase}, --max-phases={args.max_phases}).",
            flush=True,
        )
    elif args.start_phase > 0:
        print(
            f"Phases: exporting {n_export_phases} phases "
            f"(match indices {args.start_phase}..{args.start_phase + n_export_phases - 1}; "
            f"--start-phase={args.start_phase}).",
            flush=True,
        )
    else:
        print(
            f"Phases: exporting all {n_export_phases} phases from the match.",
            flush=True,
        )

    precompute_set = _parse_precompute_phases(args.precompute_phases, len(phase_list))
    precompute_all = precompute_set is None
    if precompute_set is None:
        precompute_set = set(range(len(phase_list)))
    precomputed_order_indices = sorted(precompute_set)

    max_phase_hi = -1
    for ph in phase_list:
        b = _phase_to_bundle_indices(ph, idx_map)
        if b is not None:
            max_phase_hi = max(max_phase_hi, b[1])

    pc_config = PlayerClusterAnalyzer.Config(
        granularity_x=4,
        granularity_y=4,
        min_players_threshold=2,
        running_median_window_size=10,
    )
    tactical_grid_cache: dict[int, dict[int, tuple[int, int]]] = {}
    pc = PlayerClusterAnalyzer(bundle, pc_config)
    pos = PositionChangeAnalyzer(bundle, tactical_grid_cache=tactical_grid_cache)
    ball = BallChaosAnalyzer(bundle)
    dline = DefensiveLineAnalyzer(bundle)
    l2l = LineToLineAccelerationAnalyzer(
        bundle, tactical_grid_cache=tactical_grid_cache
    )

    n_frames = len(frames)
    if args.max_phases is None:
        scan_end = n_frames
    else:
        scan_end = max(max_phase_hi + 1, 0)

    if scan_end <= 0:
        print(
            "Bundle frames: nothing to analyze (no bundle-mapped phases in export list).",
            flush=True,
        )
    else:
        print(
            f"Bundle frames: analyzing indices 0..{scan_end - 1} ({scan_end} frames) "
            f"of {n_frames} in the match bundle.",
            flush=True,
        )

    by_indicator: dict[str, list[float]] = {k: [0.0] * scan_end for k in INDICATOR_IDS}
    tracking_frame_ids: list[int] = [0] * scan_end

    pc_analyzed_through = -1

    def ensure_pc_through(target: int) -> None:
        nonlocal pc_analyzed_through
        while pc_analyzed_through < target:
            pc_analyzed_through += 1
            pc.analyze_frame(pc_analyzed_through)

    last_pct_shown = -1
    for i in range(scan_end):
        fid = frames[i].frame
        tracking_frame_ids[i] = fid
        ensure_pc_through(i)
        by_indicator["player_clusters"][i] = float(pc.analyze_frame(i).score)
        by_indicator["position_change"][i] = float(pos.analyze_frame(i).score)
        by_indicator["ball_chaos"][i] = float(ball.analyze_frame(fid).score)
        by_indicator["defensive_line"][i] = float(dline.analyze_frame(fid).score)
        by_indicator["line_to_line_acceleration"][i] = float(
            l2l.analyze_frame(i).score)

        done = i + 1
        pct = (100 * done) // scan_end if scan_end else 100
        if pct != last_pct_shown or done == scan_end:
            last_pct_shown = pct
            sys.stdout.write(f"\rBundle frames: {done}/{scan_end} ({pct}%)")
            sys.stdout.flush()
    if scan_end > 0:
        sys.stdout.write("\n")
        sys.stdout.flush()

    print("Building phase records and writing JSON…", flush=True)

    phases_out: list[dict] = []
    series_by_order: dict[str, dict] = {}

    for order_idx, phase in enumerate(phase_list):
        pop = phase.model_dump(mode="json")
        bounds = _phase_to_bundle_indices(phase, idx_map)
        rec: dict = {
            "orderIndex": order_idx,
            "bundleStart": None,
            "bundleEnd": None,
            "phaseOfPlay": pop,
            "analysis": None,
        }
        if bounds is None:
            phases_out.append(rec)
            series_by_order[str(order_idx)] = _empty_series_row()
            continue

        lo, hi = bounds
        rec["bundleStart"] = lo
        rec["bundleEnd"] = hi
        if hi < len(by_indicator["player_clusters"]):
            rec["analysis"] = _phase_indicator_stats(lo, hi, by_indicator, INDICATOR_IDS)
        phases_out.append(rec)

        if order_idx not in precompute_set:
            series_by_order[str(order_idx)] = _empty_series_row(lo, hi)
            continue

        t: list[int] = []
        series_cols: dict[str, list[float]] = {k: [] for k in INDICATOR_IDS}
        for i in range(lo, hi + 1, args.stride):
            t.append(i - lo)
            for ind in INDICATOR_IDS:
                series_cols[ind].append(by_indicator[ind][i])

        series_by_order[str(order_idx)] = {
            "bundleStart": lo,
            "bundleEnd": hi,
            "t": t,
            **series_cols,
        }

    for order_idx in range(len(phase_list)):
        if str(order_idx) not in series_by_order:
            series_by_order[str(order_idx)] = _empty_series_row()

    phases_name = args.output_phases.name
    frames_name = args.output_frames.name

    phases_payload: dict = {
        "matchId": bundle.match_data.id,
        "indicatorIds": INDICATOR_IDS,
        "phaseChartStride": args.stride,
        "precomputedPhaseOrderIndices": precomputed_order_indices,
        "precomputePhasesMode": "all" if precompute_all else "subset",
        "framesFile": frames_name,
        "note": (
            "Companion file lists per-bundle-frame scores. "
            "frameIndex in playback is the bundle index (0..nFrames-1). "
            "frameSeriesLength may be < nFrames when using --max-phases or --start-phase. "
            "Match phase index = startPhase + orderIndex. "
            "IndicatorType.ACCELRATION has no analyzer yet — omitted."
        ),
        "startPhase": args.start_phase,
        "nFrames": n_frames,
        "frameSeriesLength": scan_end,
        "phases": phases_out,
        "seriesByPhaseOrder": series_by_order,
    }

    frames_payload: dict = {
        "matchId": bundle.match_data.id,
        "nFrames": n_frames,
        "frameSeriesLength": scan_end,
        "indicatorIds": INDICATOR_IDS,
        "startPhase": args.start_phase,
        "phasesFile": phases_name,
        "note": (
            "Parallel arrays: index i is the bundle index. "
            "trackingFrameIds[i] is the tracking frame id for that row."
        ),
        "trackingFrameIds": tracking_frame_ids,
        **{k: by_indicator[k] for k in INDICATOR_IDS},
    }

    out_phases = args.output_phases
    out_frames = args.output_frames
    out_phases.parent.mkdir(parents=True, exist_ok=True)
    out_frames.parent.mkdir(parents=True, exist_ok=True)
    out_phases.write_text(json.dumps(phases_payload), encoding="utf-8")
    out_frames.write_text(json.dumps(frames_payload), encoding="utf-8")
    print(
        f"Wrote {out_phases} ({len(phases_out)} phases, stride={args.stride}, "
        f"precomputed phase orders={precomputed_order_indices or '[]'})"
    )
    print(f"Wrote {out_frames} (frame_series_length={scan_end}/{n_frames})")

    elapsed = time.perf_counter() - t0
    if elapsed >= 60:
        print(f"Export time: {int(elapsed // 60)}m {elapsed % 60:.1f}s", flush=True)
    else:
        print(f"Export time: {elapsed:.2f}s", flush=True)


if __name__ == "__main__":
    main()
