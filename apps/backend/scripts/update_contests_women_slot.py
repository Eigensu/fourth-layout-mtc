"""
Script to add women's slot multiplier logic to contests.py
Run this to update the points calculation in contest_leaderboard function
"""

def update_contests_file():
    file_path = r"c:\Users\Aanshuvi Shah\Desktop\Eigensu\WALL-E\melangeindia\apps\backend\app\routes\contests.py"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find the line with "# 3) Build lookup: player_id(str) -> points(float)"
    insert_index = None
    for i, line in enumerate(lines):
        if "# 3) Build lookup: player_id(str)" in line:
            # Insert after the pcp_points_map line (2 lines down)
            insert_index = i + 2
            break
    
    if insert_index is None:
        print("Could not find insertion point!")
        return False
    
    # Code to insert
    new_code = """
    # 3.5) Fetch all players to check their slots for women's slot multiplier
    from app.models.admin.slot import Slot
    players_list = []
    if all_player_ids:
        players_list = await Player.find({"_id": {"$in": list(all_player_ids)}}).to_list()
    players_by_id_map: Dict[str, Player] = {str(p.id): p for p in players_list}
    
    # Fetch all slots to check for women's slot
    slots_map = {}
    all_slots = await Slot.find_all().to_list()
    for s in all_slots:
        slots_map[str(s.id)] = s

"""
    
    # Insert the new code
    lines.insert(insert_index, new_code)
    
    # Now find and update the points calculation loop
    # Find "for oid in oids:" and update the logic inside
    for i, line in enumerate(lines):
        if "for oid in oids:" in line and i > insert_index:
            # Find the base calculation line
            for j in range(i, min(i+10, len(lines))):
                if "base = float(pcp_points_map.get(pid, 0.0))" in lines[j]:
                    # Insert women's slot logic after this line
                    women_slot_code = """            
            # Apply women's slot multiplier first (2x)
            player = players_by_id_map.get(pid)
            if player and player.slot:
                slot = slots_map.get(str(player.slot))
                if slot and getattr(slot, 'is_women_slot', False):
                    base *= 2.0  # Women's slot 2x multiplier
            
"""
                    lines.insert(j+1, women_slot_code)
                    break
            break
    
    # Update the comment on the line with "# Sum using string form"
    for i, line in enumerate(lines):
        if "# Sum using string form to match map keys, with captain/vice multipliers" in line:
            lines[i] = line.replace("with captain/vice multipliers", "with women's slot + captain/vice multipliers")
            break
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print("✓ Successfully updated contests.py with women's slot multiplier logic")
    return True

if __name__ == "__main__":
    update_contests_file()
