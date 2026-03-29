import numpy as np
from pydantic import Field

from analysis.indicators import (
    IndicatorAnalyzer, 
    IndicatorFrameBase, 
    IndicatorFrameRange, 
    IndicatorType,
    DefensiveLineKind
)
from parsing.match import MatchBundle
from position_analysis import frame_to_positions, get_player_team

# 1. Define the Frame Metadata (Now with Home and Away!)
class DefensiveLineFrame(IndicatorFrameBase[DefensiveLineKind]):
    home_score: float = Field(ge=0, le=1)
    home_jaggedness: float = Field(ge=0, le=1)
    home_spacing: float = Field(ge=0, le=1)
    home_defenders: int
    
    away_score: float = Field(ge=0, le=1)
    away_jaggedness: float = Field(ge=0, le=1)
    away_spacing: float = Field(ge=0, le=1)
    away_defenders: int

class DefensiveLineFrameRange(IndicatorFrameRange[DefensiveLineKind]):
    pass

# 2. Create the Analyzer
class DefensiveLineAnalyzer(IndicatorAnalyzer[DefensiveLineKind]):
    def __init__(self, match_bundle: MatchBundle):
        super().__init__(match_bundle)
        self._frames_by_id = {f.frame: f for f in self.match_bundle.frames}
        
        # Map players to teams, and figure out who is Home/Away
        match_id = self.match_bundle.match_data.id
        team_df = get_player_team(match_id)
        
        self.player_to_team = dict(zip(team_df["id"], team_df["team_id"]))
        
        # Find the unique Home and Away Team IDs
        self.home_team_id = team_df[team_df["is_home"] == True]["team_id"].iloc[0]
        self.away_team_id = team_df[team_df["is_home"] == False]["team_id"].iloc[0]

    def _calculate_team_line(self, team_id: int, current_frame) -> tuple[float, float, float, int]:
        team_players = {}
        
        EXCLUDED_GK_IDS = {12546,8182}
        
        for p in current_frame.player_data:
            if self.player_to_team.get(p.player_id) == team_id:
                if p.player_id not in EXCLUDED_GK_IDS:
                    team_players[p.player_id] = (p.x, p.y)

        # Failsafe: Not enough outfield players tracked right now
        if len(team_players) < 3:
            return 0.0, 0.0, 0.0, len(team_players)

        # 2. Run the shape graph with ONLY outfield players
        try:
            tactical_grid = frame_to_positions(team_players)
        except Exception:
            return 0.0, 0.0, 0.0, len(team_players)

        # 3. Figure out which side they are defending to sort the lines
        avg_x = np.mean([coords[0] for coords in team_players.values()])
        unique_tactical_x = sorted(list(set(pos[0] for pos in tactical_grid.values())))

        if avg_x < 0:
            tactical_lines = unique_tactical_x # Defending Left
        else:
            tactical_lines = sorted(unique_tactical_x, reverse=True) # Defending Right

        # 4. Grab the back line
        target_tactical_x = tactical_lines[0]
        back_line_coords = [
            team_players[p_id] for p_id, tac_pos in tactical_grid.items() if tac_pos[-1] == target_tactical_x
        ]

        # 5. Merge with midfield if backline is broken (< 3 players)
        if len(back_line_coords) < 3 and len(tactical_lines) > 1:
            second_line_coords = [
                team_players[p_id] for p_id, tac_pos in tactical_grid.items() if tac_pos[0] == tactical_lines[0]
            ]
            back_line_coords.extend(second_line_coords)

        # If STILL broken after combining Defenders + Midfielders, max chaos!
        if len(back_line_coords) < 3:
            return 0.0, 0.0, 0.0, len(back_line_coords)

        # --- MATH ---
        x_coords = [c[0] for c in back_line_coords]
        jaggedness_meters = np.std(x_coords)
        jaggedness_score = max(0.0, min(jaggedness_meters / 9.0, 1.0))

        y_coords = sorted([c[1] for c in back_line_coords])
        gaps = [y_coords[i+1] - y_coords[i] for i in range(len(y_coords)-1)]
        spacing_std_dev = np.std(gaps) if len(gaps) > 0 else 0.0
        spacing_score = max(0.0, min(spacing_std_dev / 8.0, 1.0))

        total_score = (jaggedness_score * 0.5) + (spacing_score * 0.5)
        
        return total_score, jaggedness_score, spacing_score, len(back_line_coords)

    def _analyze_frame(self, frame_index: int) -> DefensiveLineFrame:
        current_frame = self._frames_by_id.get(frame_index)
        
        if not current_frame:
            return DefensiveLineFrame(
                frame_index=frame_index, indicator_type=IndicatorType.DEFENSIVE_LINE, score=0.0,
                home_score=0.0, home_jaggedness=0.0, home_spacing=0.0, home_defenders=0,
                away_score=0.0, away_jaggedness=0.0, away_spacing=0.0, away_defenders=0
            )

        h_score, h_jag, h_space, h_def = self._calculate_team_line(self.home_team_id, current_frame)
        a_score, a_jag, a_space, a_def = self._calculate_team_line(self.away_team_id, current_frame)


        
        phase = next((p for p in self.match_bundle.phases if p.frame_start <= frame_index <= p.frame_end), None)

        master_score = 0.0

        if phase:
            attacking_team_id = phase.team_in_possession_id


            if attacking_team_id == self.home_team_id:
                master_score = a_score 
            elif attacking_team_id == self.away_team_id:
                master_score = h_score 

        else:
            pos_team = current_frame.possession.group
            if pos_team == self.home_team_id:
                master_score = a_score 
            elif pos_team == self.away_team_id:
                master_score = h_score 
            else:
                master_score = (h_score + a_score)/2.0

        return DefensiveLineFrame(
            frame_index=frame_index,
            indicator_type=IndicatorType.DEFENSIVE_LINE,
            score=master_score,
            home_score=h_score, home_jaggedness=h_jag, home_spacing=h_space, home_defenders=h_def,
            away_score=a_score, away_jaggedness=a_jag, away_spacing=a_space, away_defenders=a_def
        )

    def _analyze_frame_range(self, start_frame_index: int, end_frame_index: int) -> DefensiveLineFrameRange:
        frames = []
        total_score = 0.0
        for i in range(start_frame_index, end_frame_index + 1):
            f = self.analyze_frame(i)
            frames.append(f)
            total_score += f.score
        
        avg_score = total_score / len(frames) if frames else 0.0
        return DefensiveLineFrameRange(
            start_frame_index=start_frame_index, end_frame_index=end_frame_index,
            indicator_frames=frames, indicator_type=IndicatorType.DEFENSIVE_LINE,
            score=avg_score
        )