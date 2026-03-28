from math import hypot

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
    pass


class PositionChangeFrameRange(IndicatorFrameRange[PositionChangeKind]):
    pass


class PositionChangeAnalyzer(IndicatorAnalyzer[PositionChangeKind]):

    @override
    def _analyze_frame(self, frame_index: int) -> PositionChangeFrame:
        frames = self.match_bundle.frames
        curr = frames[frame_index]
        if frame_index < 1:
            score = 0.0
        else:
            prev = frames[frame_index - 1]
            score = _sum_position_changes(prev, curr) / 22.0
        return PositionChangeFrame(
            frame_index=curr.frame,
            score=score,
            indicator_type=IndicatorType.POSITION_CHANGE,
        )

    @override
    def _analyze_frame_range(
        self, start_frame_index: int, end_frame_index: int
    ) -> PositionChangeFrameRange:
        raise NotImplementedError
