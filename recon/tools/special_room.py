"""Room of a Special / raid / event map by its room name (gen_story_maps.py, the "special" and "events" lists; I-318).

    named_room(name, world, special_rooms, rooms) -> room code or None (None: gen_story_maps.py picks a room of the world
    by the name's hash, as before)

The name tables (recon/tools/special_rooms.json, the "rooms" table story_rooms.json) map names to codes with no world, and
two worlds can share a name: the Agrabah «Warehouse» (the game's Storehouse, AG_0001_15_00; khuxwiki area name) took the
Daybreak Town Warehouse DB_0009_00_00 of story_rooms.json (I-318, 5 raids). So:
1. "<name>@<worldId>" in special_rooms (an alias for one world) wins;
2. then special_rooms[name], then rooms[name], each only when the code is of the quest's world (prefix WORLD[world]; DG_ for
   world 1, the Corridor of Darkness rooms of the world-1 story rows). A world with no prefix in WORLD: no check (as before).
"""

WORLD = {1: 'DB', 2: 'DW', 3: 'WL', 4: 'AG', 5: 'OC', 6: 'BC', 7: 'CD', 8: 'ED'}
EXTRA = {1: ('DG',)}


def in_world(code, world):
    pre = WORLD.get(world)
    if pre is None:
        return True
    return str(code)[:2] in (pre,) + EXTRA.get(world, ())


def named_room(name, world, special_rooms, rooms):
    alias = (special_rooms or {}).get('%s@%s' % (name, world))
    if alias:
        return alias
    for table in (special_rooms or {}, rooms or {}):
        code = table.get(name)
        if code and in_world(code, world):
            return code
    return None
