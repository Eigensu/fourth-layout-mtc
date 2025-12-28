"""
Script to add women's slot multiplier logic to get_team_in_contest function in contests.py
and to _compute_team_points function in leaderboard.py
"""

def update_get_team_in_contest():
    """Update get_team_in_contest function in contests.py"""
    file_path = r"c:\Users\Aanshuvi Shah\Desktop\Eigensu\WALL-E\melangeindia\apps\backend\app\routes\contests.py"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Find pcp_points_map in get_team_in_contest function (second occurrence)
    pcp_map_count = 0
    insert_index = None
    for i, line in enumerate(lines):
        if "pcp_points_map: Dict[str, float] = {str(doc.player_id):" in line:
            pcp_map_count += 1
            if pcp_map_count == 2:  # Second occurrence is in get_team_in_contest
                insert_index = i + 1
                break
    
    if insert_index:
        # Insert slot fetching logic
        new_code = """
    # Fetch all slots to check for women's slot
    from app.models.admin.slot import Slot
    slots_map = {}
    all_slots = await Slot.find_all().to_list()
    for s in all_slots:
        slots_map[str(s.id)] = s

"""
        lines.insert(insert_index, new_code)
        
        # Find the points calculation loop in get_team_in_contest
        for i in range(insert_index, len(lines)):
            if "# Apply multipliers for this player's contest points if C/VC" in lines[i]:
                # Find the contest_pts line
                for j in range(i, min(i+5, len(lines))):
                    if "contest_pts = float(pcp_points_map.get(pid, 0.0))" in lines[j]:
                        women_slot_code = """            
            # Apply women's slot multiplier first (2x)
            if p.slot:
                slot = slots_map.get(str(p.slot))
                if slot and getattr(slot, 'is_women_slot', False):
                    contest_pts *= 2.0  # Women's slot 2x multiplier
            
"""
                        lines.insert(j+1, women_slot_code)
                        break
                break
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    
    print("✓ Updated get_team_in_contest function in contests.py")


def update_leaderboard():
    """Update _compute_team_points function in leaderboard.py"""
    file_path = r"c:\Users\Aanshuvi Shah\Desktop\Eigensu\WALL-E\melangeindia\apps\backend\app\routes\leaderboard.py"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace the entire _compute_team_points function
    old_function = '''async def _compute_team_points(team: Team) -> float:
    """Sum current points of all players in a team."""
    player_object_ids = []
    for pid in team.player_ids:
        try:
            player_object_ids.append(PydanticObjectId(pid))
        except Exception:
            continue
    if not player_object_ids:
        return 0.0
    players = await PublicPlayer.find({"_id": {"$in": player_object_ids}}).to_list()
    return float(sum(float(p.points or 0.0) for p in players))'''
    
    new_function = '''async def _compute_team_points(team: Team) -> float:
    """Sum current points of all players in a team with women's slot and captain/VC multipliers."""
    player_object_ids = []
    for pid in team.player_ids:
        try:
            player_object_ids.append(PydanticObjectId(pid))
        except Exception:
            continue
    if not player_object_ids:
        return 0.0
    
    players = await PublicPlayer.find({"_id": {"$in": player_object_ids}}).to_list()
    
    # Fetch all slots to check for women's slot
    from app.models.admin.slot import Slot
    slots_map = {}
    all_slots = await Slot.find_all().to_list()
    for s in all_slots:
        slots_map[str(s.id)] = s
    
    total = 0.0
    captain_id = str(team.captain_id) if team.captain_id else None
    vice_id = str(team.vice_captain_id) if team.vice_captain_id else None
    
    for p in players:
        points = float(p.points or 0.0)
        
        # Apply women's slot multiplier first (2x)
        if p.slot:
            slot = slots_map.get(str(p.slot))
            if slot and getattr(slot, 'is_women_slot', False):
                points *= 2.0  # Women's slot 2x multiplier
        
        # Then apply captain/vice-captain multiplier (stacks with women's slot)
        pid = str(p.id)
        if captain_id and pid == captain_id:
            points *= 2.0
        elif vice_id and pid == vice_id:
            points *= 1.5
        
        total += points
    
    return float(total)'''
    
    content = content.replace(old_function, new_function)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓ Updated _compute_team_points function in leaderboard.py")


if __name__ == "__main__":
    print("Updating remaining points calculation functions...")
    update_get_team_in_contest()
    update_leaderboard()
    print("\n✅ All points calculation functions updated successfully!")
