from position_analysis import frame_to_positions, get_player_team 

import numpy as np
from pydantic import Field
from parsing.match import MatchBundle

from analysis.indicators import (
    IndicatorAnalyzer, 
    IndicatorFrameBase, 
    IndicatorFrameRange, 
    IndicatorType,
    DefensiveLineKind
)


# 1. Define the Frame Metadata
class DefensiveLineFrame(IndicatorFrameBase[DefensiveLineKind]):
    jaggedness_score: float = Field(ge=0, le=1)
    spacing_score: float = Field(ge=0, le=1)
    defenders_in_line: int
    defending_team_id: int | None

class DefensiveLineFrameRange(IndicatorFrameRange[DefensiveLineKind]):
    pass


class DefensiveLineAnalyzer(IndicatorAnalyzer[DefensiveLineKind]):
    def __init__(self, match_bundle: MatchBundle):
        super().__init__(match_bundle)
        self._frames_by_id = {f.frame: f for f in self.match_bundle.frames}
        
        
        match_id = self.match_bundle.match_data.id
        team_df = get_player_team(match_id)
        self.player_to_team = dict(zip(team_df["id"], team_df["team_id"]))

    def _analyze_frame(self, frame_index: int) -> DefensiveLineFrame:
        current_frame = self._frames_by_id.get(frame_index)
        
        # Default empty frame if data is missing or ball is out of play
        empty_frame = DefensiveLineFrame(
            frame_index=frame_index, indicator_type=IndicatorType.DEFENSIVE_LINE,
            score=0.0, jaggedness_score=0.0, spacing_score=0.0,
            defenders_in_line=0, defending_team_id=None
        )

        if not current_frame or not current_frame.possession.player_id:
            return empty_frame

        # 1. Figure out who is defending
        pos_team = current_frame.possession.group
        
        if not pos_team:
            return empty_frame

        # Extract only the defending team's outfield players (assuming GK is usually the deepest)
        defending_players = {}
        for p in current_frame.player_data:
            team_id = self.player_to_team.get(p.player_id)
            # Only grab defending players who are actually detected
            if team_id is not None and team_id != pos_team:
                defending_players[p.player_id] = (p.x, p.y)

        # We need at least a few players to form a shape graph
        if len(defending_players) < 3:
            return empty_frame

        # 2. Use Ryan's Shape Graph to get tactical positions
        try:
            # Returns {player_id: (tactical_x, tactical_y)}
            tactical_grid = frame_to_positions(defending_players)
        except Exception:
            print(" frame_to_positions failed for the frame")
            return empty_frame # Catch any Delaunay Triangulation errors

        avg_x = np.mean([coords[0] for coords in defending_players.values()])
        
        # Get all the unique tactical "lines" (X-coordinates in Ryan's grid)
        unique_tactical_x = sorted(list(set(pos[0] for pos in tactical_grid.values())))

        # Sort the lines from closest-to-goal to furthest-from-goal
        if avg_x < 0:
            # Defending left goal: Lowest tactical X is closest to goal
            tactical_lines = unique_tactical_x
        else:
            # Defending right goal: Highest tactical X is closest to goal
            tactical_lines = sorted(unique_tactical_x, reverse=True)

        # Grab the players in the very last line
        target_tactical_x = tactical_lines[0]
        back_line_coords = [
            defending_players[p_id] 
            for p_id, tac_pos in tactical_grid.items() 
            if tac_pos[0] == target_tactical_x
        ]

        # --- THE NEW ADDITION: MERGE THE SECOND LINE ---
        # If the back line has < 3 players, grab the deepest midfielders too!
        if len(back_line_coords) < 3 and len(tactical_lines) > 1:
            second_line_x = tactical_lines[1]
            second_line_coords = [
                defending_players[p_id] 
                for p_id, tac_pos in tactical_grid.items() 
                if tac_pos[0] == second_line_x
            ]
            # Add the midfielders into the back line array
            back_line_coords.extend(second_line_coords)

        # If it is STILL less than 3 even after combining them (very rare), max chaos
        if len(back_line_coords) < 3:
            return DefensiveLineFrame(
                frame_index=frame_index, indicator_type=IndicatorType.DEFENSIVE_LINE,
                score=1.0, jaggedness_score=1.0, spacing_score=1.0,
                defenders_in_line=len(back_line_coords), defending_team_id=None
            )
        # --- MATH 1: JAGGEDNESS SCORE ---
        # Standard deviation of their X coordinates. 
        # A perfectly flat line = 0m std dev. A broken line = 3m+ std dev.
        x_coords = [c[0] for c in back_line_coords]
        jaggedness_meters = np.std(x_coords)
        jaggedness_score = max(0.0, min(jaggedness_meters / 3.0, 1.0)) # Cap at 3 meters

        # --- MATH 2: SPACING SCORE ---
        # Sort defenders by Y coordinate to find the gaps between them
        y_coords = sorted([c[1] for c in back_line_coords])
        gaps = [y_coords[i+1] - y_coords[i] for i in range(len(y_coords)-1)]
        
        # Standard deviation of the gaps. 
        # If all gaps are exactly 10m, std dev is 0. If gaps are 5m, 2m, and 15m, std dev is high.
        spacing_std_dev = np.std(gaps)
        spacing_score = max(0.0, min(spacing_std_dev / 4.0, 1.0)) # Cap at 4 meters variation

        # --- MASTER SCORE ---
        total_score = (jaggedness_score * 0.5) + (spacing_score * 0.5)

        return DefensiveLineFrame(
            frame_index=frame_index,
            indicator_type=IndicatorType.DEFENSIVE_LINE,
            score=total_score,
            jaggedness_score=jaggedness_score,
            spacing_score=spacing_score,
            defenders_in_line=len(back_line_coords),
            defending_team_id=None
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