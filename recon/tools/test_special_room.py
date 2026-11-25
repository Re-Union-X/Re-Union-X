"""Test of special_room.named_room (I-318): python -I recon/tools/test_special_room.py -> «OK» or the failures, exit 1."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from special_room import in_world, named_room  # noqa: E402

errors = []


def eq(a, b, msg):
    if a != b:
        errors.append('%s: %r != %r' % (msg, a, b))


story = {'Warehouse': 'DB_0009_00_00', 'Flower Glade': 'DW_0000_00_00', 'Corridor of Darkness': 'DG_0200_27_00',
         'Path to the Chateau 02': 'CD_0012_00_00'}
special = {'Storehouse': 'AG_0001_15_00', 'Warehouse@4': 'AG_0001_15_00', 'Path to the Chateau': 'CD_0012_00_00'}
# the name of another world's room is not taken (the Agrabah «Warehouse» raids, I-318); a world alias wins
eq(named_room('Warehouse', 4, special, story), 'AG_0001_15_00', 'Warehouse@4 alias')
eq(named_room('Warehouse', 1, special, story), 'DB_0009_00_00', 'Daybreak Town Warehouse')
eq(named_room('Warehouse', 3, special, story), None, 'Warehouse of no Wonderland room: hash pick')
eq(named_room('Flower Glade', 3, special, story), None, 'a Dwarf Woodlands room on a world-3 quest')
eq(named_room('Flower Glade', 2, special, story), 'DW_0000_00_00', 'same world')
eq(named_room('Corridor of Darkness', 1, special, story), 'DG_0200_27_00', 'DG rooms on world 1')
eq(named_room('Path to the Chateau', 7, special, story), 'CD_0012_00_00', 'special_rooms before story_rooms')
eq(named_room('Storehouse', 4, special, None), 'AG_0001_15_00', 'no story table')
eq(named_room('Nowhere', 4, special, story), None, 'unknown name')
# a world with no prefix (11-14): no check, as before
eq(named_room('Flower Glade', 12, special, story), 'DW_0000_00_00', 'world with no prefix')
eq([in_world('AG_0001_15_00', 4), in_world('DB_0009_00_00', 4), in_world('DG_0100_02_00', 1), in_world('DG_0100_02_00', 2)],
   [True, False, True, False], 'in_world')
# the repo tables: every special_rooms.json code is of a known prefix, «name@world» keys name a world whose prefix matches
sr = json.load(open(os.path.join(HERE, 'special_rooms.json'), encoding='utf-8'))
for k, v in sr.items():
    if '@' in k:
        eq(in_world(v, int(k.rsplit('@', 1)[1])), True, 'alias %s of the world' % k)
print('OK' if not errors else 'ERRORS (%d)\n%s' % (len(errors), '\n'.join(errors)))
sys.exit(1 if errors else 0)
