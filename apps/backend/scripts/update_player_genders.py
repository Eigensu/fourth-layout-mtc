import asyncio
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from app.models.admin.player import Player
from app.models.admin.slot import Slot
from config.settings import get_settings


async def update_player_genders():
    """Update all players with gender field based on their slot"""
    
    # Get settings
    settings = get_settings()
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.mongodb_db_name]
    
    print(f"Connecting to: {settings.mongodb_url}")
    print(f"Database: {settings.mongodb_db_name}")
    
    # Initialize Beanie
    await init_beanie(database=db, document_models=[Player, Slot])
    
    # Get all slots
    slots = await Slot.find_all().to_list()
    slot_gender_map = {}
    
    for slot in slots:
        if slot.code == "MEN":
            slot_gender_map[str(slot.id)] = "male"
        elif slot.code == "WOMEN":
            slot_gender_map[str(slot.id)] = "female"
    
    print(f"Found {len(slot_gender_map)} slots with gender mapping:")
    for slot_id, gender in slot_gender_map.items():
        print(f"  {slot_id}: {gender}")
    
    # Get all players
    players = await Player.find_all().to_list()
    print(f"\nFound {len(players)} players")
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    for player in players:
        try:
            if player.slot and str(player.slot) in slot_gender_map:
                gender = slot_gender_map[str(player.slot)]
                
                # Update player gender
                player.gender = gender
                await player.save()
                updated_count += 1
                print(f"✓ Updated {player.name} ({player.team}) -> {gender}")
            else:
                skipped_count += 1
                print(f"⚠ Skipped {player.name} - no slot or unknown slot: {player.slot}")
        except Exception as e:
            error_count += 1
            print(f"✗ Error updating {player.name}: {e}")
    
    print(f"\n=== Summary ===")
    print(f"Updated: {updated_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Errors: {error_count}")
    print(f"Total: {len(players)}")


if __name__ == "__main__":
    asyncio.run(update_player_genders())
