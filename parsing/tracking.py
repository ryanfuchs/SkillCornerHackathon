from pathlib import Path

import numpy as np
import pandas as pd
from pydantic import BaseModel


class BallData(BaseModel):
    x: float | None = None
    y: float | None = None
    z: float | None = None
    is_detected: bool | None = None


class Possession(BaseModel):
    player_id: int | None = None
    group: str | None = None


class ImageCornersProjection(BaseModel):
    x_top_left: float | None = None
    y_top_left: float | None = None
    x_bottom_left: float | None = None
    y_bottom_left: float | None = None
    x_bottom_right: float | None = None
    y_bottom_right: float | None = None
    x_top_right: float | None = None
    y_top_right: float | None = None


class PlayerData(BaseModel):
    x: float
    y: float
    player_id: int
    is_detected: bool


class FrameData(BaseModel):
    frame: int
    timestamp: str | None = None
    period: int | None = None
    ball_data: BallData
    possession: Possession
    image_corners_projection: ImageCornersProjection
    player_data: list[PlayerData]

def parse_jsonl_frames(path: str | Path) -> list[FrameData]:
    """Read a JSONL file (one JSON object per line) and return a list of FrameData."""
    df = pd.read_json(Path(path), lines=True)
    df = df.replace({np.nan: None, pd.NaT: None})
    df["timestamp"] = df["timestamp"].astype(str)
    records = df.to_dict("records")
    return [FrameData.model_validate(row) for row in records]
