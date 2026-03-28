from pydantic import BaseModel, Field
from typing_extensions import override

from analysis.indicators import (
    IndicatorAnalyzer,
    IndicatorFrameBase,
    IndicatorFrameRange,
    IndicatorType,
    PlayerClustersKind,
)
from parsing.match import MatchBundle
from parsing.tracking import BallData, FrameData, PlayerData
import numpy as np

FIELD_X_MIN: float = -52.5
FIELD_X_MAX: float = 52.5
FIELD_Y_MIN: float = -34
FIELD_Y_MAX: float = 34

# Pairwise distance contribution: 1 / (1 + d / sigma_m). Small d -> ~1, large d -> ~0.
DISTANCE_SCORE_SIGMA_M: float = 1


class Bucket(BaseModel):
    x: tuple[float, float]  # min, max
    y: tuple[float, float]  # min, max
    players: list[PlayerData] = Field(default_factory=list)  # players in the bucket
    ball: BallData | None = Field(
        default=None
    )  # ball in the bucket, none if ball not in the bucket


class BucketConfig(BaseModel):
    granularity_x: int
    granularity_y: int

    def __hash__(self):
        return hash((self.granularity_x, self.granularity_y))


def _create_buckets(config: BucketConfig) -> list[Bucket]:
    x_step = (FIELD_X_MAX - FIELD_X_MIN) / config.granularity_x
    y_step = (FIELD_Y_MAX - FIELD_Y_MIN) / config.granularity_y

    buckets = [
        Bucket(  # Bucket for players not in a bucket
            x=(float("nan"), float("nan")),
            y=(float("nan"), float("nan")),
        )
    ]
    for x in range(config.granularity_x):
        for y in range(config.granularity_y):
            buckets.append(
                Bucket(
                    x=(FIELD_X_MIN + (x * x_step), FIELD_X_MIN + ((x + 1) * x_step)),
                    y=(FIELD_Y_MIN + (y * y_step), FIELD_Y_MIN + ((y + 1) * y_step)),
                )
            )
    return buckets


def analyze_frame_buckets(frame_data: FrameData, config: BucketConfig) -> list[Bucket]:
    buckets = _create_buckets(config)
    for player in frame_data.player_data:
        for bucket in buckets:
            if (
                bucket.x[0] <= player.x <= bucket.x[1]
                and bucket.y[0] <= player.y <= bucket.y[1]
                and player.is_detected
            ):
                bucket.players.append(player)
    if (
        frame_data.ball_data.is_detected
        and frame_data.ball_data.x is not None
        and frame_data.ball_data.y is not None
    ):
        for bucket in buckets:
            if (  # TODO: instead of iterating, use index by division of coordinates by step
                bucket.x[0] <= frame_data.ball_data.x <= bucket.x[1]
                and bucket.y[0] <= frame_data.ball_data.y <= bucket.y[1]
            ):
                bucket.ball = frame_data.ball_data
                break

    return buckets


class PlayerClusterIndicatorFrame(IndicatorFrameBase[PlayerClustersKind]):
    score_raw: float  # score without running median


class PlayerClusterIndicatorFrameRange(IndicatorFrameRange[PlayerClustersKind]):
    pass


class PlayerGraph:

    def __init__(self, player_data: list[PlayerData]):
        self.players: list[PlayerData] = player_data
        self._distance_matrix: np.ndarray | None = None
        self._build_distance_matrix()

    def _build_distance_matrix(self) -> None:
        n = len(self.players)
        distance_matrix = np.zeros((n, n))
        for i in range(n):
            for j in range(i + 1, n):
                if not self.players[i].is_detected or not self.players[j].is_detected:
                    distance_matrix[i, j] = float("inf")
                    continue
                distance_matrix[i, j] = np.linalg.norm(
                    [
                        self.players[i].x - self.players[j].x,
                        self.players[i].y - self.players[j].y,
                    ]
                )
        self._distance_matrix = distance_matrix

    def score_distance_matrix(self) -> float:
        """Mean pairwise score in (0, 1], inverse to distance: 1/(1 + d/sigma)."""
        if self._distance_matrix is None or len(self.players) < 2:
            return 0.0
        n = len(self.players)
        dm = self._distance_matrix
        sigma = DISTANCE_SCORE_SIGMA_M
        ds = []
        for i in range(n):
            for j in range(i + 1, n):
                d = float(dm[i, j])
                if d > 10.0:
                    continue
                ds.append(1.0 / (1.0 + d / sigma))
        if len(ds) // 2 == 0:
            return 0.0
        return float(np.median(sorted(ds)[len(ds) // 2 :])) / (len(ds) // 2)


class PlayerClusterAnalyzer(IndicatorAnalyzer[PlayerClustersKind]):

    class Config(BaseModel):
        granularity_x: int
        granularity_y: int
        min_players_threshold: int  # if a bucket has less than this number of players, it is not considered a cluster
        running_median_window_size: int = (
            100  # if > 0, use a running median of the last N frames to smooth the score
        )

    def __init__(self, match_bundle: MatchBundle, config: Config):
        self.config = config
        super().__init__(match_bundle=match_bundle)

    def _score_frame(self, frame_index: int) -> float:
        frame = self.match_bundle.frames[frame_index]
        player_graph = PlayerGraph(frame.player_data)
        return player_graph.score_distance_matrix()

    @override
    def _analyze_frame(self, frame_index: int) -> PlayerClusterIndicatorFrame:
        score_sum = 0.0
        score_count = 0
        for frame_index_ in range(
            max(0, frame_index - self.config.running_median_window_size + 1),
            frame_index,
        ):
            score_sum += self.analyzed_frames[frame_index_].score_raw
            score_count += 1
        score_raw = self._score_frame(frame_index)
        score_sum += score_raw
        score_count += 1
        score = score_sum / score_count
        cluster_frame = PlayerClusterIndicatorFrame(
            frame_index=frame_index,
            score=score,
            score_raw=score_raw,
            indicator_type=IndicatorType.PLAYER_CLUSTERS,
        )
        return cluster_frame

    @override
    def _analyze_frame_range(
        self, start_frame_index: int, end_frame_index: int
    ) -> PlayerClusterIndicatorFrameRange:
        indicator_frames = []
        for frame_index in range(start_frame_index, end_frame_index):
            indicator_frames.append(self.analyze_frame(frame_index))
        return PlayerClusterIndicatorFrameRange(
            start_frame_index=start_frame_index,
            end_frame_index=end_frame_index,
            indicator_frames=indicator_frames,
            score=(
                0.0
                if len(indicator_frames) == 0
                else sum(frame.score for frame in indicator_frames)
                / len(indicator_frames)
            ),
            indicator_type=IndicatorType.PLAYER_CLUSTERS,
        )

    def _compute_frame_score(self, buckets: list[Bucket]) -> float:
        score = 0.0
        for bucket in buckets:
            if len(bucket.players) > self.config.min_players_threshold:
                score += len(bucket.players) / 22
        return score / len(buckets)
