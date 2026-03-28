"""
Compute position-change scores for the first N tracking frames and plot score over time.

Run from repo root:
    uv run python position_change_plot.py
"""

from __future__ import annotations

import argparse
from pathlib import Path

import matplotlib.pyplot as plt

from analysis.position_change import PositionChangeAnalyzer
from parsing.match import parse_match_bundle


def main() -> None:
    parser = argparse.ArgumentParser(description="Plot position-change scores over frames.")
    parser.add_argument(
        "--match-json",
        type=Path,
        default=None,
        help="Path to *_match.json (default: data/<id>_match.json next to this file)",
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=100,
        help="Number of frames to analyze (list indices 0 .. N-1).",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="PNG output path (default: plots/position_change_first_<N>.png)",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    match_json = args.match_json or (root / "data" / "2060235_match.json")
    if not match_json.is_file():
        raise SystemExit(f"Match JSON not found: {match_json}")

    bundle = parse_match_bundle(match_json)
    n = min(max(args.frames, 0), len(bundle.frames))
    if n == 0:
        raise SystemExit("No frames to analyze.")

    analyzer = PositionChangeAnalyzer(bundle)
    frame_ids: list[int] = []
    scores: list[float] = []

    for i in range(n):
        result = analyzer.analyze_frame(i)
        frame_ids.append(result.frame_index)
        scores.append(result.score)
        if (i + 1) % 10 == 0 or i == n - 1:
            print(f"  analyzed {i + 1}/{n} (frame id {result.frame_index})")

    out = args.output or (root / "plots" / f"position_change_first_{n}.png")
    out.parent.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(10, 4), layout="constrained")
    ax.plot(frame_ids, scores, color="#1a5f7a", linewidth=1.2)
    ax.set_xlabel("Frame index (SkillCorner)")
    ax.set_ylabel("Position change score (normalized, ÷ 124.5)")
    ax.set_title(f"Position change vs frame (first {n} rows)")
    ax.grid(True, alpha=0.3)
    fig.savefig(out, dpi=150)
    plt.close(fig)

    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
