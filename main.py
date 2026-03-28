from pathlib import Path

from parsing.match import parse_match_bundle


def main() -> None:
    match_json = Path(__file__).resolve().parent / "data" / "2060235_match.json"
    bundle = parse_match_bundle(match_json)
    md = bundle.match_data
    home, away = md.home_team.short_name, md.away_team.short_name
    print(f"Match {md.id}: {home} {md.home_team_score}–{md.away_team_score} {away}")
    print(f"  Frames: {len(bundle.frames)}")
    print(f"  Physical rows: {len(bundle.physical)}")
    print(f"  Phases: {len(bundle.phases)}")
    print(f"  Dynamic events: {bundle.dynamic_events.shape[0]} rows × {bundle.dynamic_events.shape[1]} cols")


if __name__ == "__main__":
    main()
