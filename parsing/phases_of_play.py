"""Parse SkillCorner phases-of-play CSV."""

from pathlib import Path

import numpy as np
import pandas as pd
from pydantic import BaseModel


class PhaseOfPlay(BaseModel):
    index: int
    match_id: int
    frame_start: int
    frame_end: int
    time_start: str
    time_end: str
    minute_start: int
    second_start: int
    duration: float
    period: int
    attacking_side_id: int
    team_in_possession_id: int
    attacking_side: str
    team_in_possession_shortname: str
    n_player_possessions_in_phase: int
    team_possession_loss_in_phase: bool
    team_possession_lead_to_goal: bool
    team_possession_lead_to_shot: bool
    team_in_possession_phase_type: str
    team_in_possession_phase_type_id: int
    team_out_of_possession_phase_type: str
    team_out_of_possession_phase_type_id: int
    x_start: float
    y_start: float
    channel_id_start: int
    channel_start: str
    third_id_start: int
    third_start: str
    penalty_area_start: bool
    x_end: float
    y_end: float
    channel_id_end: int
    channel_end: str
    third_id_end: int
    third_end: str
    penalty_area_end: bool
    team_in_possession_width_start: float
    team_in_possession_width_end: float
    team_in_possession_length_start: float
    team_in_possession_length_end: float
    team_out_of_possession_width_start: float
    team_out_of_possession_width_end: float
    team_out_of_possession_length_start: float
    team_out_of_possession_length_end: float


def parse_phases_of_play_csv(path: str | Path) -> list[PhaseOfPlay]:
    """Read a phases-of-play CSV and return one PhaseOfPlay per row."""
    df = pd.read_csv(Path(path))
    df = df.replace({np.nan: None, pd.NaT: None})
    return [PhaseOfPlay.model_validate(row) for row in df.to_dict("records")]
