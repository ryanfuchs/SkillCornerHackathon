"""
For each phases-of-play row, run position-change range analysis and plot peak vs P90.

Colors encode ``team_in_possession_phase_type``. Circles = peak (max) frame score;
triangles = 90th percentile within the phase.

Run from repo root:
    uv run python phase_position_change_plot.py
    uv run python phase_position_change_plot.py --max-phases 40
"""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

from analysis.position_change import PositionChangeAnalyzer
from parsing.match import parse_match_bundle
from parsing.phases_of_play import PhaseOfPlay
from parsing.tracking import FrameData


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


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Plot position-change (max / P90) per phase of play."
    )
    parser.add_argument(
        "--match-json",
        type=Path,
        default=None,
        help="Path to *_match.json (default: data/2060235_match.json)",
    )
    parser.add_argument(
        "--max-phases",
        type=int,
        default=None,
        help="Only use the first K phases (timeline order). Default: all.",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="PNG path (default: plots/phase_position_change.png)",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    match_json = args.match_json or (root / "data" / "2060235_match.json")
    if not match_json.is_file():
        raise SystemExit(f"Match JSON not found: {match_json}")

    bundle = parse_match_bundle(match_json)
    if not bundle.frames or not bundle.phases:
        raise SystemExit("Bundle has no frames or no phases.")

    phases = bundle.phases
    if args.max_phases is not None:
        phases = phases[: max(0, args.max_phases)]

    idx_map = _frame_id_to_index_map(bundle.frames)
    analyzer = PositionChangeAnalyzer(bundle)

    xs: list[int] = []
    peaks: list[float] = []
    p90s: list[float] = []
    types: list[str] = []
    skipped = 0

    for phase in phases:
        bounds = _phase_to_bundle_indices(phase, idx_map)
        if bounds is None:
            skipped += 1
            continue
        lo, hi = bounds
        r = analyzer.analyze_frame_range(lo, hi)
        if not r.indicator_frames:
            skipped += 1
            continue
        xs.append(phase.index)
        peaks.append(r.score)
        p90s.append(r.score_p90)
        types.append(phase.team_in_possession_phase_type)

    if not xs:
        raise SystemExit("No phases produced a non-empty frame range (check frame ids).")

    unique_types = sorted(set(types))
    cmap = plt.get_cmap("tab10")
    type_color = {t: cmap(i % 10) for i, t in enumerate(unique_types)}

    out = args.output or (root / "plots" / "phase_position_change.png")
    out.parent.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(14, 5), layout="constrained")
    for i, x in enumerate(xs):
        t = types[i]
        c = type_color[t]
        ax.scatter(
            x,
            peaks[i],
            c=[c],
            s=42,
            marker="o",
            zorder=3,
            edgecolors="#222222",
            linewidths=0.35,
        )
        ax.scatter(
            x,
            p90s[i],
            c=[c],
            s=28,
            marker="^",
            zorder=2,
            edgecolors="#222222",
            linewidths=0.35,
            alpha=0.9,
        )

    ax.set_xlabel("Phase index (phases-of-play row order)")
    ax.set_ylabel("Position change (normalized ÷ 124.5)")
    ax.set_title(
        f"Position change by phase — match {bundle.match_data.id}\n"
        f"Team in possession phase type (color) · ○ peak frame  · △ 90th percentile"
    )
    ax.grid(True, axis="y", alpha=0.3)
    ax.set_ylim(bottom=0.0)

    type_handles = [
        Line2D(
            [0],
            [0],
            marker="o",
            color="w",
            markerfacecolor=type_color[t],
            markeredgecolor="#222222",
            markersize=9,
            linestyle="None",
            label=t,
        )
        for t in unique_types
    ]
    leg_types = ax.legend(
        handles=type_handles,
        title="Possession phase type",
        loc="upper left",
        framealpha=0.92,
    )
    ax.add_artist(leg_types)

    metric_handles = [
        Line2D(
            [0],
            [0],
            marker="o",
            color="#555555",
            linestyle="None",
            markersize=8,
            label="Peak (max)",
        ),
        Line2D(
            [0],
            [0],
            marker="^",
            color="#555555",
            linestyle="None",
            markersize=8,
            label="90th percentile",
        ),
    ]
    ax.legend(handles=metric_handles, title="Metric", loc="upper right", framealpha=0.92)

    fig.savefig(out, dpi=150)
    plt.close(fig)

    print(f"Wrote {out} ({len(xs)} phases, skipped {skipped})")


if __name__ == "__main__":
    main()
