# 📦 Source Code (src)

This directory contains reusable Python modules for loading, processing, and visualizing SkillCorner data.

## 🏗️ Structure

- **`data/`**: Scripts for data ingestion and loading.
  - `basic_loading.py`: Functions to load match metadata and tracking data.
- **`features/`**: Feature engineering and aggregation logic.
  - `DynamicEventsAggregator.py`: Logic for summarizing dynamic event categories.
  - `PhasesOfPlayAggregator.py`: Framework for aggregating data by game phases.
  - `ChaosIndex.py`: Frame-level chaos scoring from tracking (player movement, ball movement, team shape).
- **`visualization/`**: Reusable plotting and reporting functions.
  - `head2head_viz.py`: High-fidelity visualization for team comparisons.

## 🛠️ Usage

These modules are designed to be imported into tutorials or custom scripts:

```python
from src.features.PhasesOfPlayAggregator import PhasesOfPlayAggregator
from src.features.ChaosIndex import ChaosIndexCalculator
# ... initialize and use ...
```

For the chaos timeline:

```python
chaos_calc = ChaosIndexCalculator(fps=10.0)
chaos_df = chaos_calc.calculate(tracking_df=tracking_data, match_metadata=match_data)
top_moments = chaos_calc.top_chaotic_moments(chaos_df, top_n=8)
overlay_segments = chaos_calc.overlay_segments(chaos_df)
```
