from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from beanie import PydanticObjectId
from app.models.player import Player
from app.models.contest import Contest
from app.schemas.player import PlayerOut

router = APIRouter(prefix="/api/players", tags=["players"])

def serialize_player(player: Player) -> PlayerOut:
    """Convert Player model to PlayerOut schema"""
    return PlayerOut(
        id=str(player.id),
        name=player.name,
        team=player.team,
        price=player.price,
        slot=player.slot,
        points=player.points,
        is_available=player.is_available,
        stats=player.stats,
        form=player.form,
        injury_status=player.injury_status,
        image_url=player.image_url,
        gender=player.gender,  # Include gender field
        created_at=player.created_at,
    )

@router.get("", response_model=List[PlayerOut])
async def list_players(
    slot: Optional[str] = Query(None, description="Filter players by Slot ObjectId string"),
    gender: Optional[str] = Query(None, description="Filter by gender: 'male' or 'female'"),
    contest_id: Optional[str] = Query(None, description="If provided, filter by allowed teams for daily contest"),
    limit: int = Query(200, ge=1, le=1000),
    skip: int = Query(0, ge=0),
):
    """Get list of players with optional filtering by slot (ObjectId string) and gender."""
    # Build filters list
    filters = []
    
    if slot is not None:
        filters.append({"slot": str(slot)})
    
    if gender is not None:
        filters.append({"gender": gender})
    
    # If contest_id provided and contest is daily with restrictions, apply allowed team filter
    if contest_id:
        try:
            contest = await Contest.get(PydanticObjectId(contest_id))
        except Exception:
            contest = None
        if contest and contest.contest_type == "daily" and contest.allowed_teams:
            filters.append({"team": {"$in": contest.allowed_teams}})

    # Construct final query
    if len(filters) > 1:
        query = {"$and": filters}
    elif len(filters) == 1:
        query = filters[0]
    else:
        query = {}

    # Sort by team first (for grouping), then by name alphabetically
    players = await Player.find(query).sort("+team", "+name").skip(skip).limit(limit).to_list()
    return [serialize_player(player) for player in players]

@router.get("/{id}", response_model=PlayerOut)
async def get_player(id: str):
    try:
        player = await Player.get(PydanticObjectId(id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid player ID")
    
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    return serialize_player(player)
