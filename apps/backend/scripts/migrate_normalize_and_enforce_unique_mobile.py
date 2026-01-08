"""
One-time migration script to:
- Normalize all User.mobile values to digits-only
- Detect and report duplicates by normalized digits
- Optionally fix duplicates (deactivate dupes and mark mobile as '<digits>-DUP-<suffix>')
- Create a unique index on 'mobile'

Usage:
  python -m scripts.migrate_normalize_and_enforce_unique_mobile [--fix]

Notes:
- '--fix' will mutate data. Without it, the script only reports and does not write any changes.
- If duplicates exist and you do not use '--fix', index creation will be skipped.
"""

import asyncio
import sys
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime
import os

from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Ensure repo root is importable if needed (not strictly required here)
sys.path.append(str(Path(__file__).resolve().parent.parent))
 
# Read Mongo configuration directly from environment to avoid full Settings validation
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "world-tower")

def normalize_mobile(value):
    if value is None:
        return None
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    return digits or None

def validate_mobile_length(digits: str, min_len: int = 10, max_len: int = 15) -> bool:
    return digits is not None and min_len <= len(digits) <= max_len


async def normalize_all_users(coll, fix: bool = False) -> Tuple[int, int]:
    """Normalize all users' mobile to digits-only.
    Returns (scanned, changed_count). When fix=False (dry-run), no writes occur
    and changed_count reflects how many records would change.
    """
    scanned = 0
    changed = 0
    cursor = coll.find({}, {"_id": 1, "mobile": 1, "updated_at": 1})
    async for doc in cursor:
        scanned += 1
        normalized = normalize_mobile(doc.get("mobile"))
        if not normalized:
            # Leave as-is (will be handled by duplicate/index step)
            continue
        if not validate_mobile_length(normalized):
            print(f"[WARN] User {doc['_id']} has invalid mobile length after normalization: {doc.get('mobile')} -> {normalized}")
        if doc.get("mobile") != normalized:
            changed += 1
            if fix:
                await coll.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"mobile": normalized, "updated_at": datetime.utcnow()}}
                )
    return scanned, changed


async def find_duplicates(coll) -> Dict[str, List[dict]]:
    """Group users by normalized mobile and return only groups with count > 1.
    Returns mapping digits -> list of user docs.
    """
    groups: Dict[str, List[dict]] = {}
    cursor = coll.find({"mobile": {"$ne": None}}, {"_id": 1, "mobile": 1, "created_at": 1})
    async for doc in cursor:
        normalized = normalize_mobile(doc.get("mobile"))
        if not normalized:
            continue
        groups.setdefault(normalized, []).append(doc)
    dupes = {k: v for k, v in groups.items() if len(v) > 1}
    return dupes


def _sort_users_for_keep(users: List[dict]) -> List[dict]:
    # Keep the earliest by created_at, fallback to ObjectId time
    def sort_key(u: dict):
        created = u.get("created_at")
        oid_time = None
        try:
            oid_time = ObjectId(str(u["_id"]).strip()).generation_time
        except Exception:
            pass
        return (created or datetime.max, oid_time or datetime.max)

    return sorted(users, key=sort_key)


async def fix_duplicates(coll, dupes: Dict[str, List[dict]]) -> Tuple[int, int]:
    """Deactivate and relabel duplicate users' mobile.
    Returns (groups_fixed, users_modified).
    """
    groups_fixed = 0
    users_modified = 0
    for digits, users in dupes.items():
        ordered = _sort_users_for_keep(users)
        keep = ordered[0]
        rest = ordered[1:]
        print(f"[FIX] Keeping user {keep['_id']} for mobile {digits}; modifying {len(rest)} duplicates")
        for idx, u in enumerate(rest, start=1):
            # Deactivate and mark mobile string as unique placeholder
            placeholder = f"{digits}-DUP-{str(u['_id'])[-6:]}"
            await coll.update_one(
                {"_id": u["_id"]},
                {"$set": {"is_active": False, "mobile": placeholder, "updated_at": datetime.utcnow()}}
            )
            users_modified += 1
        groups_fixed += 1
    return groups_fixed, users_modified


async def ensure_unique_index(db) -> None:
    """Create a unique index on mobile. Drops any existing non-unique index with same key."""
    coll = db["users"]
    # Drop non-unique mobile index if exists
    indexes = await coll.index_information()
    for name, info in indexes.items():
        keys = info.get("key", [])
        if keys == [("mobile", 1)]:
            print(f"[IDX] Dropping existing index {name} on mobile")
            await coll.drop_index(name)
    # Create partial unique index ignoring null/missing values (only documents where mobile is a string)
    print("[IDX] Creating PARTIAL unique index on 'mobile' where mobile is a string")
    await coll.create_index(
        [("mobile", 1)],
        unique=True,
        partialFilterExpression={"mobile": {"$type": "string"}}
    )
    print("[IDX] Unique index on 'mobile' ensured")


async def main(fix: bool = False):
    client = AsyncIOMotorClient(MONGODB_URL)
    try:
        await client.admin.command("ping")
        db = client[MONGODB_DB_NAME]

        users_coll = db["users"]
        print("[STEP] Normalizing all user mobile values (dry-run=" + str(not fix) + ") ...")
        scanned, changed = await normalize_all_users(users_coll, fix=fix)
        verb = "Updated" if fix else "Would update"
        print(f"[OK] Scanned: {scanned}, {verb}: {changed}")

        print("[STEP] Checking duplicates by normalized digits...")
        dupes = await find_duplicates(users_coll)
        if not dupes:
            print("[OK] No duplicates found")
        else:
            total_dupe_users = sum(len(v) for v in dupes.values())
            print(f"[WARN] Found {len(dupes)} duplicate groups, {total_dupe_users} users involved:")
            for digits, users in dupes.items():
                ids = ", ".join(str(u["_id"]) for u in users)
                print(f"  - {digits}: {len(users)} users -> [{ids}]")

            if fix:
                print("[STEP] Fixing duplicates (deactivate and relabel)...")
                groups_fixed, users_modified = await fix_duplicates(users_coll, dupes)
                print(f"[OK] Groups fixed: {groups_fixed}, Users modified: {users_modified}")
            else:
                print("[NOTE] Run with --fix to resolve duplicates automatically.")

        # Re-check duplicates after optional fix
        dupes_after = await find_duplicates(users_coll)
        if dupes_after:
            print("[SKIP] Duplicates still exist; skipping unique index creation. Resolve and re-run with --fix.")
            return

        print("[STEP] Ensuring unique index on 'mobile'...")
        await ensure_unique_index(db)
        print("[DONE] Migration complete.")

    finally:
        client.close()


if __name__ == "__main__":
    fix_flag = "--fix" in sys.argv
    asyncio.run(main(fix=fix_flag))
