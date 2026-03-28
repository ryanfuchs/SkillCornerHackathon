import math
from pydantic import Field

from analysis.indicators import (
    IndicatorAnalyzer, 
    IndicatorFrameBase, 
    IndicatorFrameRange, 
    IndicatorType,
    BallChaosKind
)
from parsing.match import MatchBundle

# 1. Define the Frame Metadata 
class BallChaosFrame(IndicatorFrameBase[BallChaosKind]):
    speed_score: float = Field(ge=0, le=1)
    height_score: float = Field(ge=0, le=1)
    proximity_score: float = Field(ge=0, le=1)
    direction_score: float = Field(ge=0, le=1)
    ball_x: float | None
    ball_y: float | None
    ball_z: float | None

# 2. Define the Range Metadata
class BallChaosFrameRange(IndicatorFrameRange[BallChaosKind]):
    pass

# 3. Create the Analyzer
class BallChaosAnalyzer(IndicatorAnalyzer[BallChaosKind]):
    def __init__(self, match_bundle: MatchBundle):
        super().__init__(match_bundle)
        # Create a dictionary for ultra-fast frame lookups
        self._frames_by_id = {f.frame: f for f in self.match_bundle.frames}

    def _analyze_frame(self, frame_index: int) -> BallChaosFrame:
        current_frame = self._frames_by_id.get(frame_index)
        
        # If the frame is missing or the ball isn't detected, chaos is 0
        if not current_frame or current_frame.ball_data.x is None:
            return BallChaosFrame(
                frame_index=frame_index,
                indicator_type=IndicatorType.BALL_CHAOS,
                score=0.0,
                speed_score=0.0, height_score=0.0, proximity_score=0.0, direction_score=0.0,
                ball_x=None, ball_y=None, ball_z=None
            )

        ball = current_frame.ball_data

        # --- 1. Height Score ---
        z = ball.z if ball.z is not None else 0.0
        height_score = max(0.0, min(z / 3.0, 1.0)) # Capped at 3 meters

        # --- 2. Proximity Score ---
        dist_right = math.sqrt((52.5 - ball.x)**2 + (0 - ball.y)**2)
        dist_left = math.sqrt((-52.5 - ball.x)**2 + (0 - ball.y)**2)
        dist_nearest_goal = min(dist_right, dist_left)
        proximity_score = max(0.0, min(1.0 - (dist_nearest_goal / 35.0), 1.0))

        # --- 3. Speed & Direction ---
        speed_score = 0.0
        direction_score = 0.0
        
        # We need the previous frame to calculate speed and direction
        prev_frame = self._frames_by_id.get(frame_index - 1)
        
        if prev_frame and prev_frame.ball_data.x is not None:
            prev_ball = prev_frame.ball_data
            dx = ball.x - prev_ball.x
            dy = ball.y - prev_ball.y
            dz = z - (prev_ball.z or 0.0)

            # Speed
            speed_mps = math.sqrt(dx**2 + dy**2 + dz**2) / 0.1 # 0.1s per frame
            speed_kmh = speed_mps * 3.6
            speed_score = max(0.0, min(speed_kmh / 80.0, 1.0)) # Capped at 80 km/h

            # Direction (Cosine Similarity)
            goal_vx = 52.5 - ball.x if dist_right < dist_left else -52.5 - ball.x
            goal_vy = 0.0 - ball.y

            dot_product = (dx * goal_vx) + (dy * goal_vy)
            mag_ball = math.sqrt(dx**2 + dy**2)
            mag_goal = math.sqrt(goal_vx**2 + goal_vy**2)

            if mag_ball > 0 and mag_goal > 0:
                cos_sim = dot_product / (mag_ball * mag_goal)
                direction_score = max(0.0, min(cos_sim, 1.0)) # Only reward moving towards goal

        # --- MASTER SCORE ---
        weights = {'speed': 0.30, 'height': 0.15, 'proximity': 0.35, 'direction': 0.20}
        total_score = (
            (speed_score * weights['speed']) +
            (height_score * weights['height']) +
            (proximity_score * weights['proximity']) +
            (direction_score * weights['direction'])
        )

        return BallChaosFrame(
            frame_index=frame_index,
            indicator_type=IndicatorType.BALL_CHAOS,
            score=total_score,
            speed_score=speed_score,
            height_score=height_score,
            proximity_score=proximity_score,
            direction_score=direction_score,
            ball_x=ball.x,
            ball_y=ball.y,
            ball_z=ball.z
        )

    def _analyze_frame_range(self, start_frame_index: int, end_frame_index: int) -> BallChaosFrameRange:
        frames = []
        total_score = 0.0
        
        # Loop through using the memoized analyze_frame method from the base class
        for i in range(start_frame_index, end_frame_index + 1):
            f = self.analyze_frame(i)
            frames.append(f)
            total_score += f.score
            
        avg_score = total_score / len(frames) if frames else 0.0
        
        return BallChaosFrameRange(
            start_frame_index=start_frame_index,
            end_frame_index=end_frame_index,
            indicator_frames=frames,
            indicator_type=IndicatorType.BALL_CHAOS,
            score=avg_score
        )