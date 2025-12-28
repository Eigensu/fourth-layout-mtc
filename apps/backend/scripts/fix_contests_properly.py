"""
Properly fix contests.py with women's slot multiplier logic
This script carefully inserts the code without breaking syntax
"""

def fix_contests_py():
    file_path = r"c:\Users\Aanshuvi Shah\Desktop\Eigensu\WALL-E\melangeindia\apps\backend\app\routes\contests.py"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # First, add the imports and slot fetching logic after pcp_points_map
    old_section_1 = """    # 3) Build lookup: player_id(str) -> points(float)
    pcp_points_map: Dict[str, float] = {str(doc.player_id): float(doc.points or 0.0) for doc in pcp_docs}

    # 4) Sum per team and build computed list (apply C/VC multipliers)"""
    
    new_section_1 = """    # 3) Build lookup: player_id(str) -> points(float)
    pcp_points_map: Dict[str, float] = {str(doc.player_id): float(doc.points or 0.0) for doc in pcp_docs}

    # 3.5) Fetch all players and slots for women's slot multiplier
    from app.models.admin.slot import Slot
    players_list = []
    if all_player_ids:
        players_list = await Player.find({"_id": {"$in": list(all_player_ids)}}).to_list()
    players_by_id_map: Dict[str, Player] = {str(p.id): p for p in players_list}
    
    slots_map = {}
    all_slots = await Slot.find_all().to_list()
    for s in all_slots:
        slots_map[str(s.id)] = s

    # 4) Sum per team and build computed list (apply women's slot + C/VC multipliers)"""
    
    content = content.replace(old_section_1, new_section_1)
    
    # Second, update the points calculation loop
    old_section_2 = """        for oid in oids:
            pid = str(oid)
            base = float(pcp_points_map.get(pid, 0.0))
            if captain_id and pid == captain_id:
                base *= 2.0
            elif vice_id and pid == vice_id:
                base *= 1.5
            total += base"""
    
    new_section_2 = """        for oid in oids:
            pid = str(oid)
            base = float(pcp_points_map.get(pid, 0.0))
            
            # Apply women's slot multiplier first (2x)
            player = players_by_id_map.get(pid)
            if player and player.slot:
                slot = slots_map.get(str(player.slot))
                if slot and getattr(slot, 'is_women_slot', False):
                    base *= 2.0
            
            # Then apply captain/vice-captain multiplier (stacks)
            if captain_id and pid == captain_id:
                base *= 2.0
            elif vice_id and pid == vice_id:
                base *= 1.5
            total += base"""
    
    content = content.replace(old_section_2, new_section_2)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓ Fixed contest_leaderboard in contests.py")
    return True

def fix_get_team_in_contest():
    """Fix the get_team_in_contest function"""
    file_path = r"c:\Users\Aanshuvi Shah\Desktop\Eigensu\WALL-E\melangeindia\apps\backend\app\routes\contests.py"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find and update get_team_in_contest
    old_section = """    pcp_points_map: Dict[str, float] = {str(doc.player_id): float(doc.points or 0.0) for doc in pcp_docs}

    player_items: List[ContestTeamPlayerSchema] = []"""
    
    new_section = """    pcp_points_map: Dict[str, float] = {str(doc.player_id): float(doc.points or 0.0) for doc in pcp_docs}

    # Fetch slots for women's slot multiplier
    from app.models.admin.slot import Slot
    slots_map = {}
    all_slots = await Slot.find_all().to_list()
    for s in all_slots:
        slots_map[str(s.id)] = s

    player_items: List[ContestTeamPlayerSchema] = []"""
    
    content = content.replace(old_section, new_section)
    
    # Update the points calculation in get_team_in_contest
    old_calc = """        # Apply multipliers for this player's contest points if C/VC
        contest_pts = float(pcp_points_map.get(pid, 0.0))
        if captain_id and pid == captain_id:
            contest_pts *= 2.0
        elif vice_id and pid == vice_id:
            contest_pts *= 1.5"""
    
    new_calc = """        # Apply multipliers for this player's contest points
        contest_pts = float(pcp_points_map.get(pid, 0.0))
        
        # Apply women's slot multiplier first (2x)
        if p.slot:
            slot = slots_map.get(str(p.slot))
            if slot and getattr(slot, 'is_women_slot', False):
                contest_pts *= 2.0
        
        # Then apply captain/vice-captain multiplier (stacks)
        if captain_id and pid == captain_id:
            contest_pts *= 2.0
        elif vice_id and pid == vice_id:
            contest_pts *= 1.5"""
    
    content = content.replace(old_calc, new_calc)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✓ Fixed get_team_in_contest in contests.py")

if __name__ == "__main__":
    print("Fixing contests.py...")
    fix_contests_py()
    fix_get_team_in_contest()
    print("\n✅ contests.py fixed successfully!")
