"""Line-to-line acceleration: in-possession team's forward tactical line vs opponent's back line."""

from __future__ import annotations

from math import hypot

import numpy as np
from pydantic import Field
from typing_extensions import override

from analysis.indicators import (
    IndicatorAnalyzer,
    IndicatorFrameBase,
    IndicatorFrameRange,
    IndicatorType,
    LineToLineAccelerationKind,
)
from parsing.match import MatchBundle, MatchData
from parsing.tracking import FrameData
from position_analysis import inferred_positions_for_frame

# Kinematics: same nominal interval as ball_chaos (10 Hz extrapolated tracking).
DT_SECONDS = 0.1

# Map (mean_off_accel - mean_def_accel) from m/s² into [0, 1] via clip((raw + bias) / scale, 0, 1).
# Tunable: raw in [-bias, scale - bias] spans the primary range before clipping.
LINE_ACCEL_BIAS = 15.0
LINE_ACCEL_SCALE = 30.0


def _xy_dict_from_frame_data(frame: FrameData) -> dict[int, tuple[float, float]]:
    return {
        p.player_id: (float(p.x), float(p.y))
        for p in frame.player_data
        if p.is_detected
    }


def _player_team_map(bundle: MatchBundle) -> dict[int, int]:
    return {p.id: p.team_id for p in bundle.match_data.players}


def _possession_team_id(
    frame: FrameData,
    team_map: dict[int, int],
    match_data: MatchData,
) -> int | None:
    pid = frame.possession.player_id
    if pid is not None:
        tid = team_map.get(pid)
        if tid is not None:
            return tid
    g = frame.possession.group
    if g is None:
        return None
    gl = g.lower().strip()
    if gl == "home team":
        return match_data.home_team.id
    if gl == "away team":
        return match_data.away_team.id
    return None


def _offensive_and_defensive_line_ids(
    inferred: dict[int, tuple[int, int]],
    team_map: dict[int, int],
    poss_team_id: int,
) -> tuple[set[int], set[int]] | None:
    poss_pids = [pid for pid in inferred if team_map.get(pid) == poss_team_id]
    opp_pids = [pid for pid in inferred if team_map.get(pid) not in (None, poss_team_id)]
    if not poss_pids or not opp_pids:
        return None

    max_gx = max(inferred[pid][0] for pid in poss_pids)
    min_gx = min(inferred[pid][0] for pid in opp_pids)
    off_ids = {pid for pid in poss_pids if inferred[pid][0] == max_gx}
    def_ids = {pid for pid in opp_pids if inferred[pid][0] == min_gx}
    if not off_ids or not def_ids:
        return None
    return off_ids, def_ids


def _accel_magnitude(
    p0: tuple[float, float],
    p1: tuple[float, float],
    p2: tuple[float, float],
    dt: float,
) -> float:
    dt2 = dt * dt
    ax = (p2[0] - 2.0 * p1[0] + p0[0]) / dt2
    ay = (p2[1] - 2.0 * p1[1] + p0[1]) / dt2
    return hypot(ax, ay)


def _mean_abs_accel_for_line(
    line_ids: set[int],
    f_m2: FrameData,
    f_m1: FrameData,
    f0: FrameData,
    dt: float,
) -> float | None:
    xy_m2 = _xy_dict_from_frame_data(f_m2)
    xy_m1 = _xy_dict_from_frame_data(f_m1)
    xy0 = _xy_dict_from_frame_data(f0)
    mags: list[float] = []
    for pid in line_ids:
        if pid not in xy_m2 or pid not in xy_m1 or pid not in xy0:
            continue
        mags.append(_accel_magnitude(xy_m2[pid], xy_m1[pid], xy0[pid], dt))
    if not mags:
        return None
    return float(np.mean(mags))


def _empty_frame_result(frame: FrameData) -> LineToLineAccelerationFrame:
    return LineToLineAccelerationFrame(
        frame_index=frame.frame,
        score=0.0,
        mean_offensive_line_accel=0.0,
        mean_defensive_line_accel=0.0,
        raw_delta=0.0,
        indicator_type=IndicatorType.LINE_TO_LINE_ACCELERATION,
    )


class LineToLineAccelerationFrame(IndicatorFrameBase[LineToLineAccelerationKind]):
    """Mean |acceleration| (m/s²) for tactical offensive vs defensive lines; ``score`` from ``raw_delta``."""

    mean_offensive_line_accel: float = Field(ge=0)
    mean_defensive_line_accel: float = Field(ge=0)
    raw_delta: float


class LineToLineAccelerationFrameRange(IndicatorFrameRange[LineToLineAccelerationKind]):
    """``score`` = peak frame (max); ``score_p90`` = 90th percentile; ``score_mean`` = mean over the range."""

    score_p90: float = Field(ge=0, le=1)
    score_mean: float = Field(ge=0, le=1)


class LineToLineAccelerationAnalyzer(IndicatorAnalyzer[LineToLineAccelerationKind]):

    def __init__(
        self,
        match_bundle: MatchBundle,
        *,
        tactical_grid_cache: dict[int, dict[int, tuple[int, int]]] | None = None,
    ) -> None:
        super().__init__(match_bundle)
        self._team_map = _player_team_map(match_bundle)
        self._tactical_grid_cache = tactical_grid_cache

    @override
    def _analyze_frame(self, frame_index: int) -> LineToLineAccelerationFrame:
        frames = self.match_bundle.frames
        if not frames:
            return LineToLineAccelerationFrame(
                frame_index=frame_index,
                score=0.0,
                mean_offensive_line_accel=0.0,
                mean_defensive_line_accel=0.0,
                raw_delta=0.0,
                indicator_type=IndicatorType.LINE_TO_LINE_ACCELERATION,
            )

        curr = frames[frame_index]
        if frame_index < 2:
            return _empty_frame_result(curr)

        poss_team = _possession_team_id(
            curr, self._team_map, self.match_bundle.match_data
        )
        if poss_team is None:
            return _empty_frame_result(curr)

        try:
            inferred = inferred_positions_for_frame(
                curr, self._tactical_grid_cache
            )
        except Exception:
            return _empty_frame_result(curr)

        if not inferred:
            return _empty_frame_result(curr)

        lines = _offensive_and_defensive_line_ids(inferred, self._team_map, poss_team)
        if lines is None:
            return _empty_frame_result(curr)

        off_ids, def_ids = lines
        f_m2, f_m1, f0 = frames[frame_index - 2], frames[frame_index - 1], curr

        mean_off = _mean_abs_accel_for_line(off_ids, f_m2, f_m1, f0, DT_SECONDS)
        mean_def = _mean_abs_accel_for_line(def_ids, f_m2, f_m1, f0, DT_SECONDS)
        if mean_off is None or mean_def is None:
            return _empty_frame_result(curr)

        raw = mean_off - mean_def
        score = max(
            0.0,
            min(1.0, (raw + LINE_ACCEL_BIAS) / LINE_ACCEL_SCALE),
        )

        return LineToLineAccelerationFrame(
            frame_index=curr.frame,
            score=score,
            mean_offensive_line_accel=mean_off,
            mean_defensive_line_accel=mean_def,
            raw_delta=raw,
            indicator_type=IndicatorType.LINE_TO_LINE_ACCELERATION,
        )

    @override
    def _analyze_frame_range(
        self, start_frame_index: int, end_frame_index: int
    ) -> LineToLineAccelerationFrameRange:
        n = len(self.match_bundle.frames)
        if n == 0:
            return LineToLineAccelerationFrameRange(
                start_frame_index=start_frame_index,
                end_frame_index=end_frame_index,
                indicator_frames=[],
                score=0.0,
                score_p90=0.0,
                score_mean=0.0,
                indicator_type=IndicatorType.LINE_TO_LINE_ACCELERATION,
            )

        lo = max(0, min(start_frame_index, end_frame_index))
        hi = min(n - 1, max(start_frame_index, end_frame_index))
        if lo > hi:
            return LineToLineAccelerationFrameRange(
                start_frame_index=lo,
                end_frame_index=hi,
                indicator_frames=[],
                score=0.0,
                score_p90=0.0,
                score_mean=0.0,
                indicator_type=IndicatorType.LINE_TO_LINE_ACCELERATION,
            )

        indicator_frames: list[IndicatorFrameBase[LineToLineAccelerationKind]] = [
            self.analyze_frame(i) for i in range(lo, hi + 1)
        ]
        scores = [f.score for f in indicator_frames]
        burst_max = float(max(scores))
        p90 = float(np.percentile(scores, 90.0))
        mean_score = float(np.mean(scores))

        return LineToLineAccelerationFrameRange(
            start_frame_index=lo,
            end_frame_index=hi,
            indicator_frames=indicator_frames,
            score=burst_max,
            score_p90=p90,
            score_mean=mean_score,
            indicator_type=IndicatorType.LINE_TO_LINE_ACCELERATION,
        )
