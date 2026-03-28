from typing_extensions import override

from analysis.indicators import (
    IndicatorAnalyzer,
    IndicatorFrameBase,
    IndicatorFrameRange,
    PlayerClustersKind,
)
from parsing.tracking import FrameData


class PlayerClusterFrame(IndicatorFrameBase[PlayerClustersKind]):
    pass


class PlayerClusterFrameRange(IndicatorFrameRange[PlayerClustersKind]):
    pass


class PlayerClusterAnalyzer(IndicatorAnalyzer[PlayerClustersKind]):
    @override
    def analyze_frame(self, frame: FrameData) -> PlayerClusterFrame:
        raise NotImplementedError

    @override
    def analyze_frame_range(self, start_frame_index: int, end_frame_index: int) -> PlayerClusterFrameRange:
        raise NotImplementedError