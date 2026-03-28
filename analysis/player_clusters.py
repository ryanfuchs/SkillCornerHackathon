from typing_extensions import override

from analysis.buckets import BucketConfig, analyze_frame_buckets
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

    def __init__(self, granularity_x: int, granularity_y: int):
        self.granularity_x = granularity_x
        self.granularity_y = granularity_y

    @override
    def _analyze_frame(self, frame_index: int) -> PlayerClusterFrame:
        frame = self.match_bundle.frames[frame_index]
        buckets = analyze_frame_buckets(
            frame,
            BucketConfig(
                granularity_x=self.granularity_x, granularity_y=self.granularity_y
            ),
        )
        return PlayerClusterFrame(
            frame_index=frame.frame,
            score=0.0,
            indicator_type=PlayerClustersKind.PLAYER_CLUSTERS,
        )

    @override
    def _analyze_frame_range(
        self, start_frame_index: int, end_frame_index: int
    ) -> PlayerClusterFrameRange:
        raise NotImplementedError
