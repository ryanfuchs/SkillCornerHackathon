#!/usr/bin/env python3
"""
Generate a top-down football pitch GIF with player dots drifting.
Motion is periodic with frame index so the first frame matches the last (smooth GIF loop).
Uses Pillow only. Run from repo root: python3 scripts/generate_pitch_players_gif.py
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw

# Pitch in metres (horizontal: along goal-to-goal = width, across = height)
P_ALONG = 105.0
P_ACROSS = 68.0
MARGIN = 2.5
# Spawn / drift mostly inside this band around pitch centre (metres from centre)
CENTER_HALF_ALONG = 30.0
CENTER_HALF_ACROSS = 20.0

PITCH_GREEN = "#2a6b3c"

# Output
OUT_PATH = Path(__file__).resolve().parent.parent / "frontend" / "public" / "pitch-players-drifting.gif"
W, H = 1050, 680  # 10 px per metre
SCALE_X = W / P_ALONG
SCALE_Y = H / P_ACROSS


def m_to_px(ax: float, ay: float) -> tuple[float, float]:
    """Metres: along (x), across (y) -> pixel coords (origin top-left)."""
    return ax * SCALE_X, ay * SCALE_Y


def draw_pitch(draw: ImageDraw.ImageDraw) -> None:
    line = "#f0f4f0"
    mid_x = P_ALONG / 2
    mid_y = P_ACROSS / 2

    # Turf (full rectangle — no rounded corners, so frame corners match canvas)
    draw.rectangle((0, 0, W - 1, H - 1), fill=PITCH_GREEN, outline=line, width=2)
    # Halfway line
    x0, _ = m_to_px(mid_x, 0)
    x1, _ = m_to_px(mid_x, P_ACROSS)
    draw.line([(x0, 0), (x1, H)], fill=line, width=2)
    # Center circle
    cx, cy = m_to_px(mid_x, mid_y)
    r = 9.15 * SCALE_Y
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=line, width=2)
    spot_r = max(3, int(0.45 * SCALE_Y))
    draw.ellipse([cx - spot_r, cy - spot_r, cx + spot_r, cy + spot_r], fill=line)
    # Penalty areas (simplified boxes)
    pa_w = 16.5 * SCALE_X
    pa_h = 40.3 * SCALE_Y
    # Left penalty
    draw.rectangle([0, cy - pa_h / 2, pa_w, cy + pa_h / 2], outline=line, width=2)
    # Right penalty
    draw.rectangle([W - pa_w, cy - pa_h / 2, W, cy + pa_h / 2], outline=line, width=2)


@dataclass
class Player:
    x0: float
    y0: float
    ax: float
    ay: float
    """Full sin/cos cycles over one GIF loop (integers → start frame = end frame)."""
    cycles_x: int
    cycles_y: int
    phase_x: float
    phase_y: float
    color: str


def make_players(n: int, seed: int = 42) -> list[Player]:
    rng = random.Random(seed)
    # Blue vs red — solid, readable on green
    color_blue = "#2563eb"
    color_red = "#dc2626"
    cx = P_ALONG / 2
    cy = P_ACROSS / 2
    players: list[Player] = []
    for i in range(n):
        x0 = rng.uniform(cx - CENTER_HALF_ALONG, cx + CENTER_HALF_ALONG)
        y0 = rng.uniform(cy - CENTER_HALF_ACROSS, cy + CENTER_HALF_ACROSS)
        x0 = max(MARGIN, min(P_ALONG - MARGIN, x0))
        y0 = max(MARGIN, min(P_ACROSS - MARGIN, y0))
        ax = rng.uniform(0.9, 2.2)
        ay = rng.uniform(0.9, 2.2)
        cycles_x = rng.randint(1, 2)
        cycles_y = rng.randint(1, 2)
        phase_x = rng.uniform(0, math.tau)
        phase_y = rng.uniform(0, math.tau)
        c = color_blue if i < n // 2 else color_red
        players.append(Player(x0, y0, ax, ay, cycles_x, cycles_y, phase_x, phase_y, c))
    return players


def position(p: Player, frame_i: int, n_frames: int) -> tuple[float, float]:
    # Phase runs i ∈ [0, n_frames-1] with i/(n_frames-1) so first and last frames match (seamless loop).
    if n_frames <= 1:
        return p.x0, p.y0
    u = frame_i / (n_frames - 1)
    x = p.x0 + p.ax * math.sin(math.tau * p.cycles_x * u + p.phase_x)
    y = p.y0 + p.ay * math.cos(math.tau * p.cycles_y * u + p.phase_y)
    return x, y


def main() -> None:
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    n_players = 10
    players = make_players(n_players)
    n_frames = 72
    frames: list[Image.Image] = []
    # ~1.1 m radius on pitch → clearly larger dots
    dot_r = max(9, int(1.1 * min(SCALE_X, SCALE_Y)))

    for i in range(n_frames):
        im = Image.new("RGB", (W, H), PITCH_GREEN)
        draw = ImageDraw.Draw(im)
        draw_pitch(draw)
        for p in players:
            along_m, across_m = position(p, i, n_frames)
            px, py = m_to_px(along_m, across_m)
            # Highlight ring
            draw.ellipse(
                [px - dot_r - 1, py - dot_r - 1, px + dot_r + 1, py + dot_r + 1],
                outline="#ffffff",
                width=1,
            )
            draw.ellipse(
                [px - dot_r, py - dot_r, px + dot_r, py + dot_r],
                fill=p.color,
            )
        frames.append(im)

    duration_ms = 90
    frames[0].save(
        OUT_PATH,
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        optimize=True,
    )
    print(f"Wrote {OUT_PATH} ({n_frames} frames, {n_players} players)")


if __name__ == "__main__":
    main()
