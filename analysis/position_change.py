from math import hypot

import numpy as np
from pydantic import Field
from typing_extensions import override

from analysis.indicators import (
    IndicatorAnalyzer,
    IndicatorFrameBase,
    IndicatorFrameRange,
    IndicatorType,
    PositionChangeKind,
)
from parsing.tracking import FrameData
from position_analysis import frame_to_positions

# Upper bound on total grid movement: 22 players × max Euclidean step 4√2 ≈ 124.45.
POSITION_CHANGE_MAX_TOTAL = 124.5


def _xy_dict_from_frame_data(frame: FrameData) -> dict[int, tuple[float, float]]:
    return {
        p.player_id: (float(p.x), float(p.y))
        for p in frame.player_data
        if p.is_detected
    }


def _inferred_positions(frame: FrameData) -> dict[int, tuple[int, int]]:
    xy = _xy_dict_from_frame_data(frame)
    if not xy:
        return {}
    raw: dict[int, tuple[int, ...]] = frame_to_positions(dict(xy))
    return {k: (int(v[0]), int(v[1])) for k, v in raw.items()}


def _sum_position_changes(
    prev_frame: FrameData,
    curr_frame: FrameData,
) -> float:
    try:
        prev_pos = _inferred_positions(prev_frame)
        curr_pos = _inferred_positions(curr_frame)
    except Exception:
        return 0.0
    common = prev_pos.keys() & curr_pos.keys()
    if not common:
        return 0.0
    return sum(
        hypot(
            curr_pos[pid][0] - prev_pos[pid][0],
            curr_pos[pid][1] - prev_pos[pid][1],
        )
        for pid in common
    )


class PositionChangeFrame(IndicatorFrameBase[PositionChangeKind]):
    """``total_change`` is the sum of Euclidean grid steps for players seen in both adjacent frames."""

    total_change: float = Field(ge=0)


class PositionChangeFrameRange(IndicatorFrameRange[PositionChangeKind]):
    """``score`` = peak frame (max); ``score_p90`` = 90th percentile; ``score_mean`` = mean over the phase."""

    score_p90: float = Field(ge=0, le=1)
    score_mean: float = Field(ge=0, le=1)


class PositionChangeAnalyzer(IndicatorAnalyzer[PositionChangeKind]):

    @override
    def _analyze_frame(self, frame_index: int) -> PositionChangeFrame:
        frames = self.match_bundle.frames
        curr = frames[frame_index]
        if frame_index < 1:
            total_change = 0.0
        else:
            prev = frames[frame_index - 1]
            total_change = _sum_position_changes(prev, curr)
        score = total_change / POSITION_CHANGE_MAX_TOTAL
        return PositionChangeFrame(
            frame_index=curr.frame,
            score=score,
            total_change=total_change,
            indicator_type=IndicatorType.POSITION_CHANGE,
        )

    @override
    def _analyze_frame_range(
        self, start_frame_index: int, end_frame_index: int
    ) -> PositionChangeFrameRange:
        n = len(self.match_bundle.frames)
        if n == 0:
            return PositionChangeFrameRange(
                start_frame_index=start_frame_index,
                end_frame_index=end_frame_index,
                indicator_frames=[],
                score=0.0,
                score_p90=0.0,
                score_mean=0.0,
                indicator_type=IndicatorType.POSITION_CHANGE,
            )

        lo = max(0, min(start_frame_index, end_frame_index))
        hi = min(n - 1, max(start_frame_index, end_frame_index))
        if lo > hi:
            return PositionChangeFrameRange(
                start_frame_index=lo,
                end_frame_index=hi,
                indicator_frames=[],
                score=0.0,
                score_p90=0.0,
                score_mean=0.0,
                indicator_type=IndicatorType.POSITION_CHANGE,
            )

        indicator_frames: list[IndicatorFrameBase[PositionChangeKind]] = [
            self.analyze_frame(i) for i in range(lo, hi + 1)
        ]
        scores = [f.score for f in indicator_frames]
        burst_max = float(max(scores))
        p90 = float(np.percentile(scores, 90.0))
        mean_score = float(np.mean(scores))

        return PositionChangeFrameRange(
            start_frame_index=lo,
            end_frame_index=hi,
            indicator_frames=indicator_frames,
            score=burst_max,
            score_p90=p90,
            score_mean=mean_score,
            indicator_type=IndicatorType.POSITION_CHANGE,
        )
