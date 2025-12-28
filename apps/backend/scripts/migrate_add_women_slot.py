"""
Migration: Add women's slot support
- Adds `is_women_slot` field to all slots (default: False)
- Adds `gender` field to all players (default: None)
- Updates Slot 4 to set `is_women_slot: True`

Run: python scripts/migrate_add_women_slot.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
import sys
from pathlib import Path

# Add parent directory to path to import from app
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.models.admin.slot import Slot
from app.models.admin.player import Player
from config.settings import get_settings

settings = get_settings()


async def migrate_women_slot():
    client = AsyncIOMotorClient(settings.mongodb_url)
    try:
        await client.admin.command("ping")
        print(f"✓ Connected to MongoDB at {settings.mongodb_url}")

        await init_beanie(
            database=client[settings.mongodb_db_name],
            document_models=[Slot, Player]
        )
        print(f"✓ Initialized Beanie with database: {settings.mongodb_db_name}")

        # Step 1: Add is_women_slot field to all slots
        print("\n[1/3] Adding is_women_slot field to slots...")
        slots = await Slot.find_all().to_list()
        print(f"Found {len(slots)} slots")
        
        # Sort slots by name to find Slot 4
        slots_sorted = sorted(slots, key=lambda s: s.name)
        
        updated_slots = 0
        slot_4 = None
        for idx, slot in enumerate(slots_sorted):
            # Check if this slot already has the field
            if not hasattr(slot, 'is_women_slot'):
                slot.is_women_slot = False
                await slot.save()
                updated_slots += 1
            
            # Identify Slot 4 (4th slot in sorted order, 0-indexed = 3)
            if idx == 3:
                slot_4 = slot
                print(f"  Identified Slot 4: {slot.name} (code: {slot.code})")
        
        print(f"✓ Added is_women_slot field to {updated_slots} slots")

        # Step 2: Set Slot 4 as women's slot
        if slot_4:
            print(f"\n[2/3] Setting Slot 4 as women's slot...")
            slot_4.is_women_slot = True
            await slot_4.save()
            print(f"✓ Set {slot_4.name} (code: {slot_4.code}) as women's slot")
        else:
            print("! WARNING: Could not identify Slot 4")

        # Step 3: Add gender field to all players
        print(f"\n[3/3] Adding gender field to players...")
        players = await Player.find_all().to_list()
        print(f"Found {len(players)} players")
        
        updated_players = 0
        for player in players:
            # Check if this player already has the field
            if not hasattr(player, 'gender'):
                player.gender = None
                await player.save()
                updated_players += 1
        
        print(f"✓ Added gender field to {updated_players} players")
        
        print("\n✓ Migration complete!")
        print("\nNext steps:")
        print("1. Update player genders via admin panel (set to 'male' or 'female')")
        print("2. Restart the backend server to apply model changes")

    finally:
        client.close()
        print("\n✓ Closed database connection")


if __name__ == "__main__":
    print("\n🚀 Starting migration: Add women's slot support\n")
    asyncio.run(migrate_women_slot())
    print("\n✅ Migration finished")
