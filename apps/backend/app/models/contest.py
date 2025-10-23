from beanie import Document, Indexed
from pydantic import Field
from datetime import datetime
from typing import Optional
from app.common.enums.contests import ContestStatus, ContestVisibility, PointsScope


class Contest(Document):
    """Contest document defining a competition window and metadata."""

    # immutable identifier for stable references
    code: Indexed(str, unique=True)  # type: ignore

    # human friendly name (mutable)
    name: str

    description: Optional[str] = None

    # time window
    start_at: datetime
    end_at: datetime

    # lifecycle and visibility
    status: ContestStatus = ContestStatus.DRAFT
    visibility: ContestVisibility = ContestVisibility.PUBLIC

    # points calculation mode (phase 1 uses baseline; ledger can come later)
    points_scope: PointsScope = PointsScope.TIME_WINDOW

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "contests"
        indexes = [
            "code",
            [("start_at", 1)],
            [("end_at", 1)],
            [("status", 1), ("start_at", -1)],
        ]
