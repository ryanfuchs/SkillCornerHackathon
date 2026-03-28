
from enum import Enum
from typing import Generic, TypeVar

from pydantic import BaseModel, Field, model_validator

from parsing.tracking import FrameData


class IndicatorType(Enum):
    PLAYER_CLUSTERS = "player_clusters"
    POSITION_CHANGE = "position_change"
    ACCELRATION = "acceleration"


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
    An indicator analyzer is a class that analyzes a frame or a range of frames for an indicator.
    """
    def analyze_frame(self, frame: FrameData) -> IndicatorFrameBase[TIndicator]:
        raise NotImplementedError

    def analyze_frame_range(self, start_frame_index: int, end_frame_index: int) -> IndicatorFrameRange[TIndicator]:
        raise NotImplementedError