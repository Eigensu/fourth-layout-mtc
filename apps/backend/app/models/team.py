from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional


class Team(Document):
    """Team model for fantasy cricket teams"""
    
    user_id: str  # Reference to User._id
    team_name: str
    total_points: float = 0.0
    rank: Optional[int] = None
    rank_change: Optional[int] = None  # positive = moved up, negative = moved down
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Settings:
        name = "teams"
        indexes = [
            "user_id",
            [("total_points", -1)],  # Descending order for leaderboard
        ]
