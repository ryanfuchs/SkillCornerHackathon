from pathlib import Path
from analysis.ball_chaos import BallChaosAnalyzer
from analysis.defensive_line import DefensiveLineAnalyzer
from parsing.match import parse_match_bundle


def main() -> None:
    match_json = Path(__file__).resolve().parent / "data" / "2060235_match.json"
    bundle = parse_match_bundle(match_json)
    md = bundle.match_data
    home, away = md.home_team.short_name, md.away_team.short_name

    target_frame = 9876

    
    ball_analyzer = BallChaosAnalyzer(bundle)
    def_line_analyzer = DefensiveLineAnalyzer(bundle)
    
    k = 0
    for i in range(42000,44000):
        def_chaos = def_line_analyzer.analyze_frame(i)
        if(def_chaos.score > 1e-6 and def_chaos.score < 1.0):
            k+=1
            print(f"\n--- DEFENSIVE LINE CHAOS FOR FRAME {i} ---"+f"Master Def Line Score: {def_chaos.score:.3f}")

    print(f"----------------------------------------")
    print(f"the number of frames actually counted{k}")

    #print(f"Defenders in Line: {def_chaos.defenders_in_line}")
    #print(f"Spacing Score: {def_chaos.spacing_score:.3f}")
    #print(f"Jaggedness Score: {def_chaos.jaggedness_score:.3f}")

    chaos_result = ball_analyzer.analyze_frame(target_frame)
    print(f"--- BALL CHAOS FOR FRAME {target_frame} ---")
    print(f"Master Chaos Score: {chaos_result.score:.3f}")


    


    print(f"Match {md.id}: {home} {md.home_team_score}–{md.away_team_score} {away}")
    print(f"  Frames: {len(bundle.frames)}")
    print(f"  Physical rows: {len(bundle.physical)}")
    print(f"  Phases: {len(bundle.phases)}")
    print(f"  Dynamic events: {bundle.dynamic_events.shape[0]} rows × {bundle.dynamic_events.shape[1]} cols")


if __name__ == "__main__":
    main()
