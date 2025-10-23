from enum import Enum

class ContestStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ContestVisibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class PointsScope(str, Enum):
    TIME_WINDOW = "time_window"
    SNAPSHOT = "snapshot"
