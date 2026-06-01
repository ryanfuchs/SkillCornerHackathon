#!/usr/bin/env python3
"""
Looping GIF: same top-down pitch as pitch-players-drifting, plus a calm “analysis” sweep.
Minimal — no charts. Run: python3 scripts/generate_data_analysis_gif.py
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

# Match generate_pitch_players_gif.py (105×68 m pitch, 10 px/m)
P_ALONG = 105.0
P_ACROSS = 68.0
PITCH_GREEN = "#2a6b3c"
LINE = "#f0f4f0"
SCAN = "#d4ead9"  # soft mint on green — readable, not loud

OUT_PATH = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data-analyzed.gif"
W, H = 1050, 680
SCALE_X = W / P_ALONG
SCALE_Y = H / P_ACROSS

N_FRAMES = 64
DURATION_MS = 100

# Static sample positions (metres) — centre third, same team colours as pitch gif
STATIC_PLAYERS: list[tuple[float, float, str]] = [
    (44.0, 28.0, "#2563eb"),
    (52.0, 32.0, "#2563eb"),
    (48.0, 36.0, "#2563eb"),
    (58.0, 30.0, "#dc2626"),
    (54.0, 38.0, "#dc2626"),
    (50.0, 42.0, "#dc2626"),
]


def m_to_px(ax: float, ay: float) -> tuple[float, float]:
    return ax * SCALE_X, ay * SCALE_Y


def draw_pitch(draw: ImageDraw.ImageDraw) -> None:
    mid_x = P_ALONG / 2
    mid_y = P_ACROSS / 2
    draw.rectangle((0, 0, W - 1, H - 1), fill=PITCH_GREEN, outline=LINE, width=2)
    x0, _ = m_to_px(mid_x, 0)
    x1, _ = m_to_px(mid_x, P_ACROSS)
    draw.line([(x0, 0), (x1, H)], fill=LINE, width=2)
    cx, cy = m_to_px(mid_x, mid_y)
    r = 9.15 * SCALE_Y
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=LINE, width=2)
    spot_r = max(3, int(0.45 * SCALE_Y))
    draw.ellipse([cx - spot_r, cy - spot_r, cx + spot_r, cy + spot_r], fill=LINE)
    pa_w = 16.5 * SCALE_X
    pa_h = 40.3 * SCALE_Y
    draw.rectangle([0, cy - pa_h / 2, pa_w, cy + pa_h / 2], outline=LINE, width=2)
    draw.rectangle([W - pa_w, cy - pa_h / 2, W, cy + pa_h / 2], outline=LINE, width=2)


def smooth_u(frame_i: int, n_frames: int) -> float:
    if n_frames <= 1:
        return 0.0
    return frame_i / (n_frames - 1)


def scan_x_px(u: float) -> float:
    """One left→right pass per loop; u=0 and u=1 both at left → seamless."""
    t = 0.5 - 0.5 * math.cos(math.tau * u)
    return t * (W - 1)


def main() -> None:
    dot_r = max(9, int(1.1 * min(SCALE_X, SCALE_Y)))
    frames: list[Image.Image] = []

    for frame_i in range(N_FRAMES):
        u = smooth_u(frame_i, N_FRAMES)
        im = Image.new("RGB", (W, H), PITCH_GREEN)
        draw = ImageDraw.Draw(im)
        draw_pitch(draw)

        # Single vertical analysis sweep (only extra motion)
        sx = scan_x_px(u)
        draw.line([(sx, 0), (sx, H)], fill=SCAN, width=3)

        # Static players — same look as pitch gif
        for ax_m, ay_m, col in STATIC_PLAYERS:
            px, py = m_to_px(ax_m, ay_m)
            draw.ellipse(
                [px - dot_r - 1, py - dot_r - 1, px + dot_r + 1, py + dot_r + 1],
                outline="#ffffff",
                width=1,
            )
            draw.ellipse(
                [px - dot_r, py - dot_r, px + dot_r, py + dot_r],
                fill=col,
            )

        frames.append(im)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        OUT_PATH,
        save_all=True,
        append_images=frames[1:],
        duration=DURATION_MS,
        loop=0,
        optimize=True,
    )
    print(f"Wrote {OUT_PATH} ({N_FRAMES} frames)")


if __name__ == "__main__":
    main()
