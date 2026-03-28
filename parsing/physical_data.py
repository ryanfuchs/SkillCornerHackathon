"""Parse SkillCorner per-player physical summary CSV (semicolon-separated, decimal comma)."""

from pathlib import Path

import numpy as np
import pandas as pd
from pydantic import BaseModel, ConfigDict, Field


class PhysicalPlayerRow(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    player: str = Field(alias="Player")
    short_name: str = Field(alias="Short Name")
    player_id: int = Field(alias="Player ID")
    birthdate: str = Field(alias="Birthdate")
    minutes: float = Field(alias="Minutes")
    count_performances_physical_check_passed: int = Field(
        alias="Count Performances (Physical Check passed)"
    )
    count_performances_physical_check_failed: int = Field(
        alias="Count Performances (Physical Check failed)"
    )
    distance: float = Field(alias="Distance")
    m_per_min: float = Field(alias="M/min")
    running_distance: float = Field(alias="Running Distance")
    hsr_distance: float = Field(alias="HSR Distance")
    hsr_count: float = Field(alias="HSR Count")
    sprint_distance: float = Field(alias="Sprint Distance")
    sprint_count: float = Field(alias="Sprint Count")
    hi_distance: float = Field(alias="HI Distance")
    hi_count: float = Field(alias="HI Count")
    psv_99: float = Field(alias="PSV-99")
    top_5_psv_99: float = Field(alias="TOP 5 PSV-99")
    medium_acceleration_count: float = Field(alias="Medium Acceleration Count")
    high_acceleration_count: float = Field(alias="High Acceleration Count")
    medium_deceleration_count: float = Field(alias="Medium Deceleration Count")
    high_deceleration_count: float = Field(alias="High Deceleration Count")
    explosive_acceleration_to_hsr_count: float = Field(
        alias="Explosive Acceleration to HSR Count"
    )
    top_3_time_to_hsr: float | None = Field(alias="TOP 3 Time to HSR")
    top_3_time_to_hsr_post_cod: float | None = Field(
        alias="TOP 3 Time to HSR post-COD"
    )
    explosive_acceleration_to_sprint_count: float = Field(
        alias="Explosive Acceleration to Sprint Count"
    )
    top_3_time_to_sprint: float | None = Field(alias="TOP 3 Time to Sprint")
    top_3_time_to_sprint_post_cod: float | None = Field(
        alias="TOP 3 Time to Sprint post-COD"
    )
    change_of_direction_count: float = Field(alias="Change of Direction Count")
    top_3_time_to_505_around_90: float | None = Field(
        alias="TOP 3 Time to 505 around 90"
    )
    top_3_time_to_505_around_180: float | None = Field(
        alias="TOP 3 Time to 505 around 180"
    )


def parse_physical_data_csv(path: str | Path) -> list[PhysicalPlayerRow]:
    """Read a physical-data CSV and return one PhysicalPlayerRow per row."""
    df = pd.read_csv(
        Path(path),
        sep=";",
        decimal=",",
        quotechar='"',
        na_values=["null", ""],
    )
    df = df.replace({np.nan: None, pd.NaT: None})
    return [PhysicalPlayerRow.model_validate(row) for row in df.to_dict("records")]
