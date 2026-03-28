"""Parse SkillCorner dynamic-events CSV (wide tabular event stream)."""

from pathlib import Path

import numpy as np
import pandas as pd


def parse_dynamic_events_csv(path: str | Path) -> pd.DataFrame:
    """Read a dynamic-events CSV and return a DataFrame with NaN normalized to None."""
    df = pd.read_csv(Path(path), low_memory=False)
    df = df.replace({np.nan: None, pd.NaT: None})
    return df
