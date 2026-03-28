"""
Plot line-to-line acceleration (peak vs P90) per phase of play.

Colors encode ``team_in_possession_phase_type``. Circles = peak (max) frame score;
triangles = 90th percentile within the phase.

Run from repo root:
    uv run python plot/phase_line_to_line_acceleration_plot.py
    uv run python plot/phase_line_to_line_acceleration_plot.py --max-phases 25
    uv run python plot/phase_line_to_line_acceleration_plot.py --phase-from 9 --phase-to 15
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

from analysis.line_to_line_acceleration import LineToLineAccelerationAnalyzer
from parsing.match import MatchBundle, parse_match_bundle
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


def _phase_playtime_label(phase: PhaseOfPlay) -> str:
    """Match clock at phase start (period + minute:second)."""
    return f"P{phase.period} {phase.minute_start}:{phase.second_start:02d}"


def _title_suffix_for_index_filter(
    phase_index_min: int | None, phase_index_max: int | None
) -> str:
    if phase_index_min is None and phase_index_max is None:
        return ""
    lo = str(phase_index_min) if phase_index_min is not None else "…"
    hi = str(phase_index_max) if phase_index_max is not None else "…"
    return f" — phase indices {lo}–{hi}"


def plot_phase_line_to_line_acceleration(
    bundle: MatchBundle,
    *,
    phases: list[PhaseOfPlay] | None = None,
    max_phases: int | None = 10,
    phase_index_min: int | None = None,
    phase_index_max: int | None = None,
    output_path: Path | None = None,
    show: bool = False,
) -> tuple[Path, int, int]:
    """
    Plot line-to-line acceleration scores for each phase (peak and 90th percentile).

    Parameters
    ----------
    bundle
        Parsed match bundle (frames + phases required).
    phases
        Subset of phases to plot; if ``None``, uses ``bundle.phases`` (optionally trimmed
        by ``max_phases`` or filtered by index range).
    max_phases
        If set, only the first ``max_phases`` phases (timeline order) are used.
        Ignored when ``phases`` is passed explicitly, or when ``phase_index_min`` /
        ``phase_index_max`` is set. Use ``None`` to plot all phases.
    phase_index_min, phase_index_max
        If either is set, keep only phases with ``index`` in ``[min, max]`` (inclusive).
        Unbounded side uses an open bound (all phases on that side).
    output_path
        PNG path; default ``<plot_dir>/plots/phase_line_to_line_acceleration.png``.
    show
        If True, call ``plt.show()`` before closing the figure.

    Returns
    -------
    tuple[Path, int, int]
        ``(png_path, n_phases_plotted, n_skipped)``.
    """
    if not bundle.frames or not bundle.phases:
        raise ValueError("Bundle must contain frames and phases.")

    phase_list = list(bundle.phases) if phases is None else list(phases)
    index_filter = phase_index_min is not None or phase_index_max is not None
    if index_filter:
        p_lo = phase_index_min if phase_index_min is not None else -(10**9)
        p_hi = phase_index_max if phase_index_max is not None else 10**9
        phase_list = [p for p in phase_list if p_lo <= p.index <= p_hi]
    elif max_phases is not None and phases is None:
        phase_list = phase_list[: max(0, max_phases)]

    out = output_path or (
        _REPO_ROOT / "plots" / "phase_line_to_line_acceleration.png"
    )
    out.parent.mkdir(parents=True, exist_ok=True)

    idx_map = _frame_id_to_index_map(bundle.frames)
    analyzer = LineToLineAccelerationAnalyzer(bundle)

    xs: list[int] = []
    peaks: list[float] = []
    p90s: list[float] = []
    types: list[str] = []
    plotted_phases: list[PhaseOfPlay] = []
    skipped = 0

    for phase in phase_list:
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
        plotted_phases.append(phase)

    if not xs:
        raise ValueError("No phases produced a non-empty frame range (check frame ids).")

    unique_types = sorted(set(types))
    cmap = plt.get_cmap("tab10")
    type_color = {t: cmap(i % 10) for i, t in enumerate(unique_types)}

    fig, ax = plt.subplots(figsize=(14, 5.5), layout="constrained")
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

    ax.set_xticks(xs)
    ax.set_xticklabels(
        [
            f"{_phase_playtime_label(p)}\n(#{p.index})"
            for p in plotted_phases
        ],
        rotation=38,
        ha="right",
        fontsize=8,
    )
    ax.set_xlabel("Match time at phase start (period min:sec) and phase index")
    ax.set_ylabel("Line-to-line acceleration score (0–1)")
    idx_note = _title_suffix_for_index_filter(phase_index_min, phase_index_max)
    ax.set_title(
        f"Line-to-line acceleration by phase — match {bundle.match_data.id}{idx_note}\n"
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
    if show:
        plt.show()
    plt.close(fig)

    return out, len(xs), skipped


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Plot line-to-line acceleration (max / P90) per phase of play."
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
        default=10,
        help="Only use the first K phases (timeline order). Default: 10. Ignored if "
        "--phase-from / --phase-to are set.",
    )
    parser.add_argument(
        "--phase-from",
        type=int,
        default=None,
        metavar="N",
        help="Minimum phases-of-play index (inclusive). Use with --phase-to for a slice.",
    )
    parser.add_argument(
        "--phase-to",
        type=int,
        default=None,
        metavar="N",
        help="Maximum phases-of-play index (inclusive).",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="PNG path (default: plots/phase_line_to_line_acceleration.png, or "
        "plots/phase_line_to_line_acceleration_{from}_{to}.png when index range is set)",
    )
    args = parser.parse_args()

    match_json = args.match_json or (_REPO_ROOT / "data" / "2060235_match.json")
    if not match_json.is_file():
        raise SystemExit(f"Match JSON not found: {match_json}")

    bundle = parse_match_bundle(match_json)
    index_filter = args.phase_from is not None or args.phase_to is not None
    default_out: Path | None = None
    if args.output is None and index_filter and args.phase_from is not None and args.phase_to is not None:
        default_out = (
            _REPO_ROOT
            / "plots"
            / f"phase_line_to_line_acceleration_{args.phase_from}_{args.phase_to}.png"
        )

    out, n_ok, skipped = plot_phase_line_to_line_acceleration(
        bundle,
        max_phases=None if index_filter else args.max_phases,
        phase_index_min=args.phase_from,
        phase_index_max=args.phase_to,
        output_path=args.output or default_out,
    )
    print(f"Wrote {out} ({n_ok} phases plotted, {skipped} skipped)")


if __name__ == "__main__":
    main()
