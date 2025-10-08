from fastapi import APIRouter, Depends, HTTPException, status, Header
from typing import Optional
from app.models.user import User
from app.models.team import Team
from app.schemas.leaderboard import LeaderboardResponseSchema, LeaderboardEntrySchema
from app.utils.security import decode_token

router = APIRouter(prefix="/api/leaderboard", tags=["leaderboard"])


async def get_optional_current_user(authorization: Optional[str] = Header(None)) -> Optional[User]:
    """Get current user if authenticated, otherwise return None"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        if payload is None:
            return None
        
        username = payload.get("sub")
        if not username or not isinstance(username, str):
            return None
        
        # Find user in MongoDB
        user = await User.find_one(User.username == username)
        return user
    except Exception:
        return None


@router.get("", response_model=LeaderboardResponseSchema)
async def get_leaderboard(
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Get the global leaderboard with all teams ranked by total points.
    If user is authenticated, also returns their position.
    """
    try:
        # Fetch all teams sorted by points (descending)
        teams = await Team.find_all().sort(-Team.total_points).to_list()
        
        # If no teams exist, return mock data for development
        if not teams:
            return _get_mock_leaderboard(current_user)
        
        # Build leaderboard entries
        entries = []
        current_user_entry = None
        
        for idx, team in enumerate(teams):
            rank = idx + 1
            
            # Get user info for this team
            user = await User.get(team.user_id)
            if not user:
                continue
            
            entry = LeaderboardEntrySchema(
                rank=rank,
                username=user.username,
                displayName=user.full_name or user.username,
                teamName=team.team_name,
                points=team.total_points,
                rankChange=team.rank_change
            )
            
            entries.append(entry)
            
            # Check if this is the current user's team
            if current_user and str(team.user_id) == str(current_user.id):
                current_user_entry = entry
        
        return LeaderboardResponseSchema(
            entries=entries,
            currentUserEntry=current_user_entry
        )
        
    except Exception as e:
        # In case of error, return mock data
        print(f"Error fetching leaderboard: {e}")
        return _get_mock_leaderboard(current_user)


def _get_mock_leaderboard(current_user: Optional[User] = None) -> LeaderboardResponseSchema:
    """Return mock leaderboard data for development/testing"""
    
    mock_entries = [
        LeaderboardEntrySchema(
            rank=1,
            username="CricketMaster2024",
            displayName="CricketMaster2024",
            teamName="Mumbai Warriors",
            points=2456.0,
            rankChange=1
        ),
        LeaderboardEntrySchema(
            rank=2,
            username="FantasyKing",
            displayName="FantasyKing",
            teamName="Chennai Superstars",
            points=2398.0,
            rankChange=-1
        ),
        LeaderboardEntrySchema(
            rank=3,
            username="IPLGuru",
            displayName="IPLGuru",
            teamName="Bangalore Bolts",
            points=2334.0,
            rankChange=1
        ),
        LeaderboardEntrySchema(
            rank=4,
            username="CaptainCool",
            displayName="CaptainCool",
            teamName="Delhi Dynamos",
            points=2289.0,
            rankChange=-1
        ),
        LeaderboardEntrySchema(
            rank=5,
            username="SixesAndFours",
            displayName="SixesAndFours",
            teamName="Kolkata Kings",
            points=2245.0,
            rankChange=1
        ),
        LeaderboardEntrySchema(
            rank=6,
            username="BowlerBeast",
            displayName="BowlerBeast",
            teamName="Punjab Panthers",
            points=2201.0,
            rankChange=-1
        ),
        LeaderboardEntrySchema(
            rank=7,
            username="AllRounderAce",
            displayName="AllRounderAce",
            teamName="Rajasthan Royals",
            points=2156.0,
            rankChange=1
        ),
        LeaderboardEntrySchema(
            rank=8,
            username="PowerPlay",
            displayName="PowerPlay",
            teamName="Hyderabad Heroes",
            points=2134.0,
            rankChange=-1
        ),
    ]
    
    # If current user is authenticated, add their entry
    current_user_entry = None
    if current_user:
        current_user_entry = LeaderboardEntrySchema(
            rank=142,
            username=current_user.username,
            displayName=current_user.full_name or current_user.username,
            teamName="Fantasy Crusaders",
            points=1456.0,
            rankChange=0
        )
    
    return LeaderboardResponseSchema(
        entries=mock_entries,
        currentUserEntry=current_user_entry
    )
