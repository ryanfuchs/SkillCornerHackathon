"""Parse SkillCorner match metadata JSON (single object per file) and full match bundles."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from pydantic import BaseModel, ConfigDict, Field

from .dynamic_events import parse_dynamic_events_csv
from .phases_of_play import PhaseOfPlay, parse_phases_of_play_csv
from .physical_data import PhysicalPlayerRow, parse_physical_data_csv
from .tracking import FrameData, parse_jsonl_frames


class Stadium(BaseModel):
    id: int
    name: str
    city: str | None = None
    capacity: int | None = None


class Team(BaseModel):
    id: int
    name: str
    short_name: str
    acronym: str


class Season(BaseModel):
    id: int
    start_year: int
    end_year: int
    name: str


class Competition(BaseModel):
    id: int
    area: str
    name: str
    gender: str
    age_group: str


class TeamKit(BaseModel):
    id: int
    team_id: int
    season: Season
    name: str
    jersey_color: str
    number_color: str


class TeamPlayingTimeSummary(BaseModel):
    minutes_tip: float
    minutes_otip: float


class CompetitionEdition(BaseModel):
    id: int
    competition: Competition
    season: Season
    name: str


class MatchPeriod(BaseModel):
    period: int
    name: str
    start_frame: int
    end_frame: int
    duration_frames: int
    duration_minutes: float


class CompetitionRound(BaseModel):
    id: int
    name: str
    round_number: int
    potential_overtime: bool


class PlayerRole(BaseModel):
    id: int
    position_group: str
    name: str
    acronym: str


class PlayingTimePeriodStats(BaseModel):
    name: str
    minutes_tip: float
    minutes_otip: float
    start_frame: int
    end_frame: int
    minutes_played: float


class PlayingTimeTotal(BaseModel):
    minutes_tip: float
    minutes_otip: float
    start_frame: int
    end_frame: int
    minutes_played: float
    minutes_played_regular_time: float


class PlayingTime(BaseModel):
    total: PlayingTimeTotal
    by_period: list[PlayingTimePeriodStats]


class MatchPlayer(BaseModel):
    player_role: PlayerRole
    start_time: str | None = None
    end_time: str | None = None
    number: int
    yellow_card: int
    red_card: int
    injured: bool
    goal: int
    own_goal: int
    playing_time: PlayingTime
    team_player_id: int
    team_id: int
    id: int
    first_name: str
    last_name: str
    short_name: str
    birthday: str | None = None
    trackable_object: int | None = None
    gender: str | None = None


class BallInfo(BaseModel):
    trackable_object: int | None = None


class MatchData(BaseModel):
    id: int
    home_team_score: int
    away_team_score: int
    date_time: str
    stadium: Stadium
    home_team: Team
    home_team_kit: TeamKit
    away_team: Team
    away_team_kit: TeamKit
    home_team_coach: dict | list | str | None = None
    away_team_coach: dict | list | str | None = None
    home_team_playing_time: TeamPlayingTimeSummary
    away_team_playing_time: TeamPlayingTimeSummary
    competition_edition: CompetitionEdition
    match_periods: list[MatchPeriod]
    competition_round: CompetitionRound
    referees: list[dict] = Field(default_factory=list)
    players: list[MatchPlayer]
    status: str
    ball: BallInfo | None = None
    home_team_side: list[str] | None = None
    pitch_length: float | None = None
    pitch_width: float | None = None


class MatchBundle(BaseModel):
    """All parsed artifacts for one match: metadata, tracking frames, physical, phases, events."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    match_data: MatchData
    frames: list[FrameData]
    physical: list[PhysicalPlayerRow]
    phases: list[PhaseOfPlay]
    dynamic_events: pd.DataFrame


def parse_match_json(path: str | Path) -> MatchData:
    """Read a match JSON file (single top-level object) and return MatchData."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    return MatchData.model_validate(raw)


def match_players_dataframe(match: MatchData) -> pd.DataFrame:
    """Flatten match players into a DataFrame (optional convenience)."""
    records = [p.model_dump() for p in match.players]
    df = pd.DataFrame(records)
    return df.replace({np.nan: None, pd.NaT: None})


def parse_match_bundle(match_json_path: str | Path) -> MatchBundle:
    """Load sibling files next to ``*_match.json`` (same folder, same id prefix)."""
    path = Path(match_json_path)
    if path.suffix.lower() != ".json" or not path.stem.endswith("_match"):
        raise ValueError(f"expected path ending with *_match.json, got {path}")
    root = path.parent
    prefix = path.stem.removesuffix("_match")
    match_data = parse_match_json(path)
    return MatchBundle(
        match_data=match_data,
        frames=parse_jsonl_frames(root / f"{prefix}_tracking_extrapolated.jsonl"),
        physical=parse_physical_data_csv(root / f"{prefix}_physical_data.csv"),
        phases=parse_phases_of_play_csv(root / f"{prefix}_phases_of_play.csv"),
        dynamic_events=parse_dynamic_events_csv(root / f"{prefix}_dynamic_events.csv"),
    )
