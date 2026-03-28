from enum import Enum
from typing import Generic, Literal, TypeVar, final

from pydantic import BaseModel, Field

from parsing.match import MatchBundle
from parsing.tracking import FrameData


class IndicatorType(Enum):
    PLAYER_CLUSTERS = "player_clusters"
    POSITION_CHANGE = "position_change"
    ACCELRATION = "acceleration"
    BALL_CHAOS = "ball_chaos"
    DEFENSIVE_LINE = "defensive_line"


TIndicator = TypeVar("TIndicator", bound=IndicatorType)


class IndicatorFrameBase(BaseModel, Generic[TIndicator]):
    """
    A common base for all indicator frames.
    An indicator frame is a single frame of a match analyzed for an indicator, and scored on a scale of 0 to 1.

    Create a custom IndicatorFrame by subclassing this class and extending it with your own attributes/metadata:
    ```python
    class PlayerClustersIndicatorFrame(IndicatorFrameBase[Literal[IndicatorType.PLAYER_CLUSTERS]]):
        grids: list[Bucket] = None
        ...
    ```
    """
    frame_index: int
    score: float = Field(ge=0, le=1)
    indicator_type: TIndicator


class IndicatorFrameRange(BaseModel, Generic[TIndicator]):
    """
    A common base for all indicator frame ranges.
    An indicator frame range is a range of frames analyzed for an indicator, and scored on a scale of 0 to 1.
    The IndicatorAnalyzer may implement its own logic to score the range.
    """
    start_frame_index: int
    end_frame_index: int
    indicator_frames: list[IndicatorFrameBase[TIndicator]]
    score: float = Field(ge=0, le=1)
    indicator_type: TIndicator


class IndicatorAnalyzer(Generic[TIndicator]):
    """
    A common base for all indicator analyzers.

    Use a **literal enum member** as the type argument, e.g.
    `IndicatorAnalyzer[Literal[IndicatorType.PLAYER_CLUSTERS]]`, so frame/range return types are
    tied to that single indicator. Subclasses should then use the same literal on their frame and
    range types; a frame parameterized with a different `Literal[IndicatorType....]` will not match
    under static checking.
    """
    def __init__(self, match_bundle: MatchBundle):
        self.match_bundle = match_bundle
        self.analyzed_frames = {}
        self.analyzed_frame_ranges = {}

    def _analyze_frame(self, frame_index: int) -> IndicatorFrameBase[TIndicator]:
        raise NotImplementedError

    @final
    def analyze_frame(self, frame_index: int) -> IndicatorFrameBase[TIndicator]:
        if self.analyzed_frames.get(frame_index) is not None:
            return self.analyzed_frames[frame_index]
        indicator_frame = self._analyze_frame(frame_index)
        self.analyzed_frames[frame_index] = indicator_frame
        return indicator_frame

    def _analyze_frame_range(
        self, start_frame_index: int, end_frame_index: int
    ) -> IndicatorFrameRange[TIndicator]:
        raise NotImplementedError

    @final
    def analyze_frame_range(self, start_frame_index: int, end_frame_index: int) -> IndicatorFrameRange[TIndicator]:
        if (
            self.analyzed_frame_ranges.get((start_frame_index, end_frame_index))
            is not None
        ):
            return self.analyzed_frame_ranges[(start_frame_index, end_frame_index)]
        indicator_frame_range = self._analyze_frame_range(
            start_frame_index, end_frame_index
        )
        self.analyzed_frame_ranges[(start_frame_index, end_frame_index)] = (
            indicator_frame_range
        )
        return indicator_frame_range


# Export for convenient annotations on concrete analyzers / frames.
PlayerClustersKind = Literal[IndicatorType.PLAYER_CLUSTERS]
PositionChangeKind = Literal[IndicatorType.POSITION_CHANGE]
AccelerationKind = Literal[IndicatorType.ACCELRATION]
BallChaosKind = Literal[IndicatorType.BALL_CHAOS] # Haaroon ball speed height direction and proximity to goal
DefensiveLineKind = Literal[IndicatorType.DEFENSIVE_LINE] # Haaroon variance of x and y axis