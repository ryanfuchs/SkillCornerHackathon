# SkillCorner Hackathon — Phase-aware tracking

Exploratory work on **SkillCorner** match tracking: a **MatchLab** web app (React) syncs pitch view, optional broadcast video, and charts to one timeline, with per-frame indicators rolled into phase windows. Python code parses match bundles, computes geometry and motion metrics, and can regenerate the JSON assets the frontend loads.

Partnership framing in the UI: **Zurich Sports Analytics Club × SkillCorner**.

## Requirements

- **[uv](https://docs.astral.sh/uv/)** for Python 3.10+ and dependencies ([install uv](https://docs.astral.sh/uv/getting-started/installation/))
- **Node.js** `^20.19.0` or `>=22.12.0` for the frontend

## Data

Match exports are **not** committed. Create a `data/` directory at the repo root and place SkillCorner bundle files there (for example `data/2060235_match.json` and related tracking files as expected by the parsers and pipeline scripts).

`data/` is listed in `.gitignore`.

## Python

```bash
uv sync                    # create .venv and install deps from pyproject.toml
uv run python main.py      # sample script: defensive-line scan + ball dynamics on a fixed frame
```

Root-level analysis lives under `analysis/`; parsing under `parsing/`. `position_analysis.py` and other scripts may be run similarly with `uv run python …`.

### Regenerate frontend JSON from a match bundle

From the repository root:

```bash
uv run python pipeline/run_all.py
```

This runs, in order:

1. `export_player_mapping.py` → `frontend/src/data/playerInfoById.json`
2. `extract_timeline_moments.py` → `timelineKeyMoments.json`, `scoreBreakpoints.json`
3. `export_phase_breakdown.py` → `phaseBreakdownPhases.json`, `phaseBreakdownFrames.json` (full indicator pass; slow)

Useful options:

```bash
uv run python pipeline/run_all.py --skip-phases              # skip the heavy phase export
uv run python pipeline/run_all.py --match-json data/other_match.json
uv run python pipeline/run_all.py -- --max-phases 10 --start-phase 0   # forwarded to phase export after --
```

## Frontend (`frontend/`)

```bash
cd frontend
npm install
npm run dev       # Vite dev server
npm run build     # production build to frontend/dist
npm run preview   # preview the build
```

**Routes:** `/` (landing), `/match-lab` (main experience), `/methodology` (concept), `/methodology/data-pipeline`, `/methodology/indicators`. `/match` redirects to `/match-lab`.

## Layout

| Path | Role |
|------|------|
| `analysis/` | Frame- and match-level metrics (e.g. ball movement, defensive line, indicators) |
| `parsing/` | Load SkillCorner `*_match.json` and related structures |
| `pipeline/` | Scripts that write derived JSON into `frontend/src/data/` |
| `frontend/` | Vite + React + TypeScript UI (MatchLab, methodology pages) |
