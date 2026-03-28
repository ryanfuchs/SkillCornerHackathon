"""
We want to analyze player positions by grouping them into buckets.
Buckets are essentially cells in a grid laid out on the field.

Can be used for various analytics, e.g. identifying standards
"""

from pydantic import BaseModel, Field
from parsing.tracking import BallData, FrameData, PlayerData

FIELD_X_MIN: float = -52.5
FIELD_X_MAX: float = 52.5
FIELD_Y_MIN: float = -34
FIELD_Y_MAX: float = 34


class Bucket(BaseModel):
    x: tuple[float, float]  # min, max
    y: tuple[float, float]  # min, max
    players: list[PlayerData] = Field(default_factory=list) # players in the bucket
    ball: BallData | None = Field(default=None) # ball in the bucket, none if ball not in the bucket


class BucketConfig(BaseModel):
    granularity_x: int
    granularity_y: int

    def __hash__(self):
        return hash((self.granularity_x, self.granularity_y))


def _create_buckets(config: BucketConfig) -> list[Bucket]:
    x_step = (FIELD_X_MAX - FIELD_X_MIN) / config.granularity_x
    y_step = (FIELD_Y_MAX - FIELD_Y_MIN) / config.granularity_y

    buckets = [
        Bucket( # Bucket for players not in a bucket
            x=(float('nan'), float('nan')),
            y=(float('nan'), float('nan')),
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
            ):
                bucket.players.append(player)
    if (
        frame_data.ball_data.is_detected
        and frame_data.ball_data.x is not None
        and frame_data.ball_data.y is not None
    ):
        for bucket in buckets:
            if ( #TODO: instead of iterating, use index by division of coordinates by step
                bucket.x[0] <= frame_data.ball_data.x <= bucket.x[1]
                and bucket.y[0] <= frame_data.ball_data.y <= bucket.y[1]
            ):
                bucket.ball = frame_data.ball_data
                break

    return buckets
