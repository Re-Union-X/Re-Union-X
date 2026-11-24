"""Test of the "events" config key of gen_story_maps.py (maps of the event quests with no original map, Events Part 5 Task 3).

    python -I recon/tools/test_gen_story_maps_events.py      -> «OK: ...» or «ERRORS (n)», exit 1

Needs the local map data (maps_x, a real MAP template, server/master_data/enemy.json); skipped when missing.
events_list_built: an `events` entry (server/game_data/event_gen_maps.json shape) gives mappoi_stg<stageId>.bin + _00.bin with
the same placement as a `special` entry with the same content (STG and part byte for byte, apart from nothing: the same room,
groups, target and level), so the target is at the farthest point as test_gen_story_maps_special.py checks for the Special maps;
its report entry carries event: true and its census id; the POI is merged. roomCodes: the first code with a collision file is the
room of an event entry.
"""
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import mapfile  # noqa: E402

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

CLS = 'D:/Progetto_Restauro_KH_UX/maps_x'
TEMPLATE = 'D:/Progetto_Restauro_KH_UX/stage_gen/files/stage/mappoi_stg01040_00.bin'
ENEMIES = os.path.join(ROOT, 'server', 'master_data', 'enemy.json')
TMP = os.environ.get('KHUX_TMP', 'D:/Progetto_Restauro_KH_UX/tmp')
if not all(os.path.exists(p) for p in (CLS, TEMPLATE, ENEMIES)):
    print('SKIP: local map data missing')
    sys.exit(0)

errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)


SP, EV, EV2 = 970998, 4009998, 4009997
ROOM = 'Fountain Square'
groups = [[{'name': 'Shadow', 'enemyId': 80001, 'n': 3, 'reward': 1}], [{'name': 'Shadow', 'enemyId': 80001, 'n': 2, 'reward': 1}]]
base = {'world': 1, 'name': 'Test', 'room': ROOM, 'target': 'Shadow', 'targetId': 10001, 'level': 120, 'enemies': groups,
        'treasures': [], 'rooms': 1}
special = dict(base, stageId=SP)
event = dict(base, stageId=EV, roomCodes=[], censusId='EV-TEST')
# roomCodes: a code without a collision file is skipped, the next one is the room
coded_room = sorted(d for d in os.listdir(os.path.join(CLS, 'map')) if d.startswith('BC_'))[0]
event2 = dict(base, stageId=EV2, room='Somewhere Unknown', roomCodes=['XX_9999_99_99', coded_room], censusId='EV-TEST')
os.makedirs(TMP, exist_ok=True)
tmp = tempfile.mkdtemp(prefix='khux_event_maps_', dir=TMP)
try:
    out = os.path.join(tmp, 'stage')
    poi = os.path.join(tmp, 'stage_poi.json')
    json.dump({'1010': {'chests': [], 'enemies': [{'uid': 2, 'enemyId': 1, 'reward': 80001, 'map': 0}]}}, open(poi, 'w'))
    json.dump([special], open(os.path.join(tmp, 'special.json'), 'w'))
    json.dump([event, event2], open(os.path.join(tmp, 'events.json'), 'w'))
    report = os.path.join(tmp, 'report.json')
    cfg = {'rooms': os.path.join(HERE, 'story_rooms.json'), 'template': TEMPLATE, 'cls_dir': CLS, 'enemies': ENEMIES,
           'out': out, 'report': report, 'poi': poi, 'special': os.path.join(tmp, 'special.json'),
           'events': os.path.join(tmp, 'events.json')}
    json.dump(cfg, open(os.path.join(tmp, 'cfg.json'), 'w'))
    r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'gen_story_maps.py'), os.path.join(tmp, 'cfg.json')],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    check(r.returncode == 0, 'generator exit %d: %s' % (r.returncode, r.stderr[-800:]))
    f = lambda sid, part='': os.path.join(out, 'mappoi_stg%d%s.bin' % (sid, part))  # noqa: E731
    for sid in (SP, EV, EV2):
        check(os.path.exists(f(sid)) and os.path.exists(f(sid, '_00')), 'STG and part _00 of %d written' % sid)
        check(not os.path.exists(f(sid, '_01')), 'one part only (%d)' % sid)
    if all(os.path.exists(f(s, p)) for s in (SP, EV) for p in ('', '_00')):
        check(open(f(SP), 'rb').read() == open(f(EV), 'rb').read(), 'STG of the events entry = STG of the special entry')
        msp, mev = (mapfile.parse_map(open(f(s, '_00'), 'rb').read()) for s in (SP, EV))
        strip = lambda m: {**m, 'teams': [{k: v for k, v in t.items() if k != 'polygon'} for t in m['teams']]}  # noqa: E731
        check(strip(msp) == strip(mev), 'part of the events entry = part of the special entry, but the target arena')
        bev = [t for t in mev['teams'] if t['boss']]
        check(bev and bev[0]['polygon'] == [(0, 0)] * 4 and any(q != (0, 0) for q in [t for t in msp['teams'] if t['boss']][0]['polygon']),
              'events entry: target team without arena polygon (Special maps keep theirs): %s' % (bev and bev[0]['polygon']))
        h = struct.unpack('<16i', open(f(EV), 'rb').read()[:64])
        check(h[6] == 10001 and h[11] == 120, 'STG target 10001, level 120 (got %d, %d)' % (h[6], h[11]))
        m = mapfile.parse_map(open(f(EV, '_00'), 'rb').read())
        check(len(m['enemies']) == 6 and all(e['level'] == 120 for e in m['enemies']), '5 Shadows + the target at level 120')
        check(m['room'] == 'DB_0000_00_00' or m['room'].startswith('DB_'), 'room of world 1 (%s)' % m['room'])
    if os.path.exists(f(EV2, '_00')):
        check(mapfile.parse_map(open(f(EV2, '_00'), 'rb').read())['room'] == coded_room, 'roomCodes: the first code with a collision file')
    rep = {x['stageId']: x for x in json.load(open(report, encoding='utf-8'))}
    check(rep.get(EV, {}).get('event') is True and rep[EV].get('censusId') == 'EV-TEST' and 'special' not in rep[EV], 'report: event entry')
    check(rep.get(SP, {}).get('special') is True and 'event' not in rep[SP], 'report: special entry unchanged')
    check(rep.get(EV2, {}).get('folder') == coded_room and rep[EV2].get('exact_room') is True, 'report: coded room')
    p = json.load(open(poi, encoding='utf-8'))
    check('1010' in p and str(EV) in p and len(p[str(EV)]['enemies']) == 6, 'POI merged (old entries kept)')
    v = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'validate_maps.py'), out, CLS, '--json', os.path.join(tmp, 'v.json')],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    vr = json.load(open(os.path.join(tmp, 'v.json'), encoding='utf-8')) if os.path.exists(os.path.join(tmp, 'v.json')) else {}
    for sid in (EV, EV2):
        check(vr.get(str(sid), {}).get('errors') == [], 'validate_maps %d: no errors (%s)' % (sid, vr.get(str(sid)) or v.stderr[-400:]))
    # layout + targetWith (Task 4 follow-up 2): start and target team at fixed points (here: EV's target spot as the start, EV's
    # start and its first enemy as the target team), one Shadow fighting in the target's team; a layout of another room: error
    if os.path.exists(f(EV, '_00')):
        stg0 = mapfile.parse_stg(open(f(EV), 'rb').read())
        m0 = mapfile.parse_map(open(f(EV, '_00'), 'rb').read())
        tgt = m0['enemies'][-1]
        lay = {'room': m0['room'], 'start': [tgt['x'], tgt['y']], 'groups': [None],
               'target': [list(stg0['start']), [m0['enemies'][0]['x'], m0['enemies'][0]['y']]], 'source': 'test'}
        EV3, EV4 = 4009996, 4009995
        ev3 = dict(base, stageId=EV3, roomCodes=[m0['room']], censusId='EV-TEST', layout=lay,
                   targetWith=[{'name': 'Shadow', 'enemyId': 80001, 'n': 1, 'reward': 1}])
        out3 = os.path.join(tmp, 'stage3')
        json.dump([ev3], open(os.path.join(tmp, 'events3.json'), 'w'))
        cfg3 = dict(cfg, out=out3, report=os.path.join(tmp, 'report3.json'), events=os.path.join(tmp, 'events3.json'))
        cfg3.pop('special')
        json.dump(cfg3, open(os.path.join(tmp, 'cfg3.json'), 'w'))
        r3 = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'gen_story_maps.py'), os.path.join(tmp, 'cfg3.json')],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
        check(r3.returncode == 0, 'layout run exit %d: %s' % (r3.returncode, r3.stderr[-800:]))
        f3 = lambda part='': os.path.join(out3, 'mappoi_stg%d%s.bin' % (EV3, part))  # noqa: E731
        if os.path.exists(f3('_00')):
            s3 = mapfile.parse_stg(open(f3(), 'rb').read())
            m3 = mapfile.parse_map(open(f3('_00'), 'rb').read())
            check(tuple(s3['start']) == tuple(lay['start']), 'layout start in the STG (%s)' % (s3['start'],))
            check(s3['target_enemy'] == 10001, 'STG target = the target, not its escort (%s)' % s3['target_enemy'])
            last = [e for e in m3['enemies'] if e.get('team') == len(m3['teams']) - 1]
            check([(e['enemyId'], e['x'], e['y']) for e in last] == [(10001, *lay['target'][0]), (80001, *lay['target'][1])],
                  'target team at the layout points, target first then its escort (%s)' % last)
            check(len(m3['enemies']) == 7, '5 Shadows of the groups + 1 escort + the target: %d' % len(m3['enemies']))
            rep3 = json.load(open(os.path.join(tmp, 'report3.json'), encoding='utf-8'))
            check(rep3[0].get('layout') == 'test', 'report: layout source')
            v3 = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'validate_maps.py'), out3, CLS, '--json', os.path.join(tmp, 'v3.json')],
                                capture_output=True, text=True, encoding='utf-8', errors='replace')
            vr3 = json.load(open(os.path.join(tmp, 'v3.json'), encoding='utf-8')) if os.path.exists(os.path.join(tmp, 'v3.json')) else {}
            check(vr3.get(str(EV3), {}).get('errors') == [], 'validate_maps layout map: no errors (%s)' % (vr3.get(str(EV3)) or v3.stderr[-400:]))
        ev4 = dict(ev3, stageId=EV4, layout=dict(lay, room='XX_0000_00_00'))
        json.dump([ev4], open(os.path.join(tmp, 'events3.json'), 'w'))
        r4 = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'gen_story_maps.py'), os.path.join(tmp, 'cfg3.json')],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
        check(r4.returncode != 0 and 'layout read on room XX_0000_00_00' in r4.stderr, 'layout of another room: error (%s)' % r4.stderr[-300:])
    # multi-area entry (make-events.js genAreasOf): one MAP part per area, chained by forward exits; per-area layout (start of area 0,
    # arrival of the next areas, forward exit, group centres, target team, chests) as in the original maps of the same room
    # (JP 706830: DG_0200_27_00 x3, one enemy per part); an exit of the original layout with an enemy of the layout on it stays where
    # it is: the enemy guards the exit (JP 706830, you must fight it to go on; validate_maps: a warning); only an exit the generator
    # chose itself is moved away from the enemies; backExits adds the way back (two rooms, no layout: the generator's rules)
    R27 = 'DG_0200_27_00'
    if os.path.exists(os.path.join(CLS, 'map', R27, R27 + '_cls.bin')):
        B = lambda n: {'name': 'Shadow', 'enemyId': 80001, 'n': n, 'reward': 1}  # noqa: E731
        EVA, EVB = 4009994, 4009993
        eva = dict(base, stageId=EVA, room='Corridor (1)', roomCodes=[R27], censusId='EV-TEST', rooms=3, targetArea=2, backExits=False,
                   layoutSource='test 706830', enemies=[[B(1)], [B(2)]], targetWith=[B(1)], areas=[
                       {'room': 'Corridor (1)', 'roomCodes': [R27], 'enemies': [[B(1)]], 'chests': 1,
                        'layout': {'start': [432, 988], 'exit': [1308, 952], 'groups': [[1296, 1014]], 'chests': [[668, 902]], 'kinds': [2], 'polys': [[[1471, 840], [1470, 1189], [1121, 1188], [1122, 839]]]}},
                       {'room': 'Corridor (2)', 'roomCodes': [R27], 'enemies': [[dict(B(2), level=300)]], 'chests': 0,
                        'layout': {'arrive': [475, 978], 'exit': [1500, 980]}},
                       {'room': 'Corridor (3)', 'roomCodes': [R27], 'enemies': [], 'chests': 0,
                        'layout': {'arrive': [445, 988], 'target': [[1270, 1070], [1200, 1100]]}}])
        two = sorted(d for d in os.listdir(os.path.join(CLS, 'map')) if d.startswith('DB_') and d.endswith('_00_00'))[0]
        evb = dict(base, stageId=EVB, room='Room A', roomCodes=[two], censusId='EV-TEST', rooms=2, targetArea=1, backExits=True,
                   layoutSource=None, enemies=[[B(2)], [B(1)]], targetWith=[], areas=[
                       {'room': 'Room A', 'roomCodes': [two], 'enemies': [[B(2)]], 'chests': 3, 'chestCodes': ['h1', 'a3', 'i2']},
                       {'room': 'Room B', 'roomCodes': [R27], 'enemies': [[B(1)]], 'chests': 0}])
        outa = os.path.join(tmp, 'stagea')
        # branched map (HSC pages with one path per attribute, 16-11-2026; JP 300370 / 300390 / 300400): a start part whose exits
        # lead to three paths, each path's last part leads to the common target part (`next` of each area)
        EVC = 4009992
        evc = dict(base, stageId=EVC, room='Hub', roomCodes=[R27], censusId='EV-TEST', rooms=5, targetArea=4, backExits=False,
                   layoutSource=None, enemies=[[B(1)], [B(1)], [B(1)]], targetWith=[], areas=[
                       {'room': 'Hub', 'roomCodes': [R27], 'enemies': [], 'chests': 0, 'next': [1, 2, 3]},
                       {'room': 'P1', 'roomCodes': [R27], 'enemies': [[B(1)]], 'chests': 0, 'next': [4]},
                       {'room': 'P2', 'roomCodes': [R27], 'enemies': [[B(1)]], 'chests': 0, 'next': [4]},
                       {'room': 'P3', 'roomCodes': [R27], 'enemies': [[B(1)]], 'chests': 1, 'next': [4]},
                       {'room': 'End', 'roomCodes': [R27], 'enemies': [], 'chests': 0}])
        json.dump([eva, evb, evc], open(os.path.join(tmp, 'eventsa.json'), 'w'))
        cfga = dict(cfg, out=outa, report=os.path.join(tmp, 'reporta.json'), events=os.path.join(tmp, 'eventsa.json'))
        cfga.pop('special')
        json.dump(cfga, open(os.path.join(tmp, 'cfga.json'), 'w'))
        ra = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'gen_story_maps.py'), os.path.join(tmp, 'cfga.json')],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
        check(ra.returncode == 0, 'areas run exit %d: %s' % (ra.returncode, ra.stderr[-800:]))
        fa = lambda sid, part='': os.path.join(outa, 'mappoi_stg%d%s.bin' % (sid, part))  # noqa: E731
        if all(os.path.exists(fa(EVA, p)) for p in ('', '_00', '_01', '_02')):
            s = mapfile.parse_stg(open(fa(EVA), 'rb').read())
            ps = [mapfile.parse_map(open(fa(EVA, '_%02d' % k), 'rb').read(), k) for k in range(3)]
            check((s['parts'], s['start_part'], tuple(s['start']), s['target_enemy'], s['card_level_bonus'], s['field12']) == (3, 0, (432, 988), 10001, 120, 2),
                  'STG: 3 parts, start of area 0 from the layout, target 10001, level 120, target part 2 (%s)' % s)
            check((s['enemies_total'], s['chests_total'], s['teams_total']) == (5, 1, 3), 'STG totals: 5 enemies, 1 chest, 3 teams (%s)' % s)
            check([p['room'] for p in ps] == [R27] * 3, 'one part per area, room of each area')
            check([[(e['dest_part'], e['field4']) for e in p['exits']] for p in ps] == [[(1, 2)], [(2, 1)], []],
                  'forward exits only, field4 = parts left to the target + 1 (as JP 706830): %s' % [p['exits'] for p in ps])
            check((ps[0]['exits'][0]['arrive_x'], ps[0]['exits'][0]['arrive_y']) == (475, 978) and (ps[1]['exits'][0]['arrive_x'], ps[1]['exits'][0]['arrive_y']) == (445, 988),
                  'arrival = the next area\'s layout arrive')
            e0 = ps[0]['enemies'][0]
            check((e0['x'], e0['y']) == (1296, 1014), 'group at the layout centre (%s)' % e0)
            ex = ps[0]['exits'][0]
            check((ex['x'], ex['y']) == (1308, 952), 'exit of the original layout kept, guarded by its enemy (%s)' % ex)
            check([(c['x'], c['y']) for c in ps[0]['chests']] == [(668, 902)], 'chest at the layout point')
            # a member's own level (HSC khuxwiki «LV n» per group, 16-11-2026): written on its records; the others keep the quest level
            check([e['level'] for e in ps[1]['enemies']] == [300, 300] and [e['level'] for e in ps[0]['enemies']] == [120],
                  'member level 300 in area 1, quest level elsewhere (%s)' % [e['level'] for p in ps for e in p['enemies']])
            last = ps[2]['enemies']
            check([(e['enemyId'], e['x'], e['y'], e['level']) for e in last] == [(10001, 1270, 1070, 120), (80001, 1200, 1100, 120)], 'target team at the layout points (%s)' % last)
            check(ps[2]['teams'][0]['boss'] and not ps[1]['teams'][0]['boss'], 'only the target team is the boss team')
            # team kind (+0x18): layout kinds [2] = CAUTION (JP 706830: both guard teams 2), the default stays 1
            # Corridor of Darkness (DG_0200_27_00): purple portal 5528 on the exit (+5, -10), white 5529 left of the arrival (-163, -10)
            check([(x['id'], x['x'], x['y'], x['type']) for x in ps[0]['npcs']] == [(5528, 1313, 942, 4)]
                  and [(x['id'], x['x'], x['y']) for x in ps[1]['npcs'] if x['id'] == 5529] == [(5529, 312, 968)], 'portals (%s, %s)' % (ps[0]['npcs'], ps[1]['npcs']))
            check(ps[0]['teams'][0]['polygon'] == [(1471, 840), (1470, 1189), (1121, 1188), (1122, 839)] and ps[1]['teams'][0]['polygon'] == [(0, 0)] * 4,
                  'group polygon from layout polys, zeros otherwise (%s)' % ps[0]['teams'][0]['polygon'])
            check(ps[0]['teams'][0]['f6'] == 2 and ps[2]['teams'][0]['f6'] == 1, 'team kinds: caution guard 2, target 1 (%s, %s)' % (ps[0]['teams'][0]['f6'], ps[2]['teams'][0]['f6']))
            # no arena polygon (all zeros), as the originals JP 706830 / 69720 / 720430 / 300510: the target battle starts on
            # contact; a small box made the battle start only inside it, and a target walking towards the player left it (bench)
            check(ps[2]['teams'][0]['polygon'] == [(0, 0)] * 4, 'target team without arena polygon (%s)' % ps[2]['teams'][0]['polygon'])
            uids = [x['uid'] for p in ps for x in p['enemies'] + p['chests']] + [t['uid'] for p in ps for t in p['teams']]
            check(len(uids) == len(set(uids)), 'uids unique over the parts')
        if all(os.path.exists(fa(EVB, p)) for p in ('', '_00', '_01')):
            pb = [mapfile.parse_map(open(fa(EVB, '_%02d' % k), 'rb').read(), k) for k in range(2)]
            check([[e['dest_part'] for e in p['exits']] for p in pb] == [[1], [0]], 'backExits: the way back from area 1 (%s)' % [p['exits'] for p in pb])
            check([p['room'] for p in pb] == [two, R27], 'rooms of the two areas')
            # I-297 bench 25-11: chest kind and reward from the khuxwiki code (a1-a3 orange, h1-h3 green, as 844 original story maps),
            # an unknown code keeps a2; chests spread at least 2 grid steps apart, not clustered
            cb = pb[0]['chests']
            check([(c['reward'], c['kind']) for c in cb] == [(90, 7), (82, 17), (81, 15)], 'chest codes h1 / a3 / unknown (%s)' % cb)
            check(all(((u['x'] - v['x']) ** 2 + (u['y'] - v['y']) ** 2) ** 0.5 >= 80 for i, u in enumerate(cb) for v in cb[i + 1:]),
                  'chests at least 80 apart (%s)' % [(c['x'], c['y']) for c in cb])
        repa = {x['stageId']: x for x in json.load(open(os.path.join(tmp, 'reporta.json'), encoding='utf-8'))}
        check(repa.get(EVA, {}).get('parts') == 3 and repa[EVA].get('folders') == [R27] * 3 and repa[EVA].get('event') is True
              and repa[EVA].get('layout') == 'test 706830' and not any('exit moved' in d for d in repa[EVA].get('doubts', []))
              and any('guards the exit' in d for d in repa[EVA].get('doubts', [])), 'report: parts, folders, layout, guarded exit (%s)' % repa.get(EVA))
        pa = json.load(open(poi, encoding='utf-8'))
        check(sorted({x['map'] for x in pa.get(str(EVA), {}).get('enemies', [])}) == [0, 1, 2], 'POI per part')
        va = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'validate_maps.py'), outa, CLS, '--json', os.path.join(tmp, 'va.json')],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
        vra = json.load(open(os.path.join(tmp, 'va.json'), encoding='utf-8')) if os.path.exists(os.path.join(tmp, 'va.json')) else {}
        for sid in (EVA, EVB, EVC):
            check(vra.get(str(sid), {}).get('errors') == [], 'validate_maps areas map %d: no errors (%s)' % (sid, vra.get(str(sid)) or va.stderr[-400:]))
        if all(os.path.exists(fa(EVC, p)) for p in ('', '_00', '_01', '_02', '_03', '_04')):
            sc = mapfile.parse_stg(open(fa(EVC), 'rb').read())
            pc_ = [mapfile.parse_map(open(fa(EVC, '_%02d' % k), 'rb').read(), k) for k in range(5)]
            check((sc['parts'], sc['field12'], sc['enemies_total'], sc['chests_total']) == (5, 4, 4, 1), 'branched STG (%s)' % sc)
            check([sorted(e['dest_part'] for e in p['exits']) for p in pc_] == [[1, 2, 3], [4], [4], [4], []],
                  'branched exits: hub -> 1, 2, 3; each path -> 4 (%s)' % [[e['dest_part'] for e in p['exits']] for p in pc_])
            check([sorted(e['field4'] for e in p['exits']) for p in pc_][:2] == [[2, 2, 2], [1]], 'field4 = parts left to the target + 1')
            hx = [(e['x'], e['y']) for e in pc_[0]['exits']]
            gaps = [((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5 for i, a in enumerate(hx) for b in hx[i + 1:]]
            check(min(gaps, default=0) >= 200, 'hub exits apart (%s)' % hx)
        else:
            check(False, 'branched map %d not written' % EVC)
        # a door of an original map at the room's edge (outside the walkable component): snapped to the nearest walkable pixel of the
        # entry's component, noted; facings 0 of the originals -> 1 / 2 (validate_maps)
        edge = dict(eva, stageId=EVB, areas=[dict(eva['areas'][0], layout=dict(eva['areas'][0]['layout'], exit=[1790, 980]))] + [
            dict(eva['areas'][1], layout=dict(eva['areas'][1]['layout'], arriveFacing=0))] + eva['areas'][2:])
        json.dump([edge], open(os.path.join(tmp, 'eventsa.json'), 'w'))
        re_ = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'gen_story_maps.py'), os.path.join(tmp, 'cfga.json')],
                             capture_output=True, text=True, encoding='utf-8', errors='replace')
        check(re_.returncode == 0, 'edge door run exit %d: %s' % (re_.returncode, re_.stderr[-600:]))
        if os.path.exists(fa(EVB, '_00')):
            ee = mapfile.parse_map(open(fa(EVB, '_00'), 'rb').read())['exits'][0]
            check(ee['x'] < 1790 and ee['arrive_facing'] in (1, 2), 'door snapped inside, arrival facing 1/2 (%s)' % ee)
            rep_e = {x['stageId']: x for x in json.load(open(os.path.join(tmp, 'reporta.json'), encoding='utf-8'))}
            check(any('snapped' in d for d in rep_e.get(EVB, {}).get('doubts', [])), 'report: door snapped (%s)' % rep_e.get(EVB))
        # a layout point not reachable from the area's entry: error
        bad = dict(eva, areas=[dict(eva['areas'][0], layout=dict(eva['areas'][0]['layout'], groups=[[5, 5]]))] + eva['areas'][1:])
        json.dump([bad], open(os.path.join(tmp, 'eventsa.json'), 'w'))
        rb = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'gen_story_maps.py'), os.path.join(tmp, 'cfga.json')],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
        check(rb.returncode != 0 and 'not reachable' in rb.stderr, 'unreachable layout point: error (%s)' % rb.stderr[-300:])
        # chance squads and material spots (plan 2026-11-23-chance-spawns-materials, Task 2): `chance` = indexes of the chance groups
        # of an area (or of the one-area entry), listed by their squad uid in POI «random» (the server removes each with p 1/2);
        # `materials` [{materialId, n}] -> ceil(n/2) spots per material, units split evenly (larger first), STG [15] = spot count
        E = lambda n: {'name': 'Eggcognito', 'enemyId': 80001, 'n': n, 'reward': 1}  # noqa: E731
        EVM, EVS = 4009991, 4009990
        evm = dict(base, stageId=EVM, room='Corridor (1)', roomCodes=[R27], censusId='EV-TEST', rooms=2, targetArea=1, backExits=False,
                   layoutSource=None, enemies=[[B(1)], [E(1)], [E(1)]], targetWith=[], chanceRate=0.9, areas=[
                       {'room': 'Corridor (1)', 'roomCodes': [R27], 'enemies': [[B(1)], [E(1)]], 'chance': [1], 'chests': 0,
                        'materials': [{'materialId': 101, 'n': 5}, {'materialId': 102, 'n': 2}]},
                       {'room': 'Corridor (2)', 'roomCodes': [R27], 'enemies': [[E(1)]], 'chance': [0], 'chests': 0}])
        evs = dict(base, stageId=EVS, roomCodes=[R27], censusId='EV-TEST', chance=[1], materials=[{'materialId': 103, 'n': 4}])
        outm = os.path.join(tmp, 'stagem')
        poim = os.path.join(tmp, 'poim.json')
        json.dump({}, open(poim, 'w'))
        json.dump([evm, evs], open(os.path.join(tmp, 'eventsm.json'), 'w'))
        cfgm = dict(cfg, out=outm, report=os.path.join(tmp, 'reportm.json'), events=os.path.join(tmp, 'eventsm.json'), poi=poim)
        cfgm.pop('special')
        json.dump(cfgm, open(os.path.join(tmp, 'cfgm.json'), 'w'))
        rm = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'gen_story_maps.py'), os.path.join(tmp, 'cfgm.json')],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
        check(rm.returncode == 0, 'chance/materials run exit %d: %s' % (rm.returncode, rm.stderr[-800:]))
        fm = lambda sid, part='': os.path.join(outm, 'mappoi_stg%d%s.bin' % (sid, part))  # noqa: E731
        pm = json.load(open(poim, encoding='utf-8')) if os.path.exists(poim) else {}
        if all(os.path.exists(fm(EVM, p)) for p in ('', '_00', '_01')):
            s = mapfile.parse_stg(open(fm(EVM), 'rb').read())
            ps = [mapfile.parse_map(open(fm(EVM, '_%02d' % k), 'rb').read(), k) for k in range(2)]
            # chance_group_listed_in_poi + chance_only_area_kept
            want = [ps[0]['teams'][1]['uid'], ps[1]['teams'][0]['uid']]
            tgt = [t['uid'] for p in ps for t in p['teams'] if t['boss']]
            check(pm.get(str(EVM), {}).get('random') == want, 'POI random = the chance squads\' uids %s (%s)' % (want, pm.get(str(EVM))))
            check(pm.get(str(EVM), {}).get('target') == tgt[0] and tgt[0] not in want, 'POI target = the boss squad uid, not random')
            check(s['teams_total'] == 4, 'STG [8] counts the chance squads (%s)' % s['teams_total'])
            check(pm.get(str(EVM), {}).get('randomRate') == 0.9 and 'randomRate' not in pm.get(str(EVS), {}), 'POI randomRate from the entry chanceRate only (%s)' % pm.get(str(EVM)))
            check(len(ps[1]['teams']) == 2, 'an area whose only group is a chance group keeps it (%s)' % ps[1]['teams'])
            # material_spots_split
            mats = [(m['materialId'], m['quantity']) for p in ps for m in p['materials']]
            check(sorted(mats) == [(101, 1), (101, 2), (101, 2), (102, 2)], 'material spots 101 [2,2,1], 102 [2] (%s)' % mats)
            check(s['materials_total'] == 4, 'STG [15] = 4 spots (%s)' % s['materials_total'])
            check(sorted((m['materialId'], m['number']) for m in pm[str(EVM)].get('materials', [])) == [(101, 1), (101, 2), (101, 2), (102, 2)],
                  'POI materials (%s)' % pm[str(EVM)].get('materials'))
            for k, p in enumerate(ps):
                for m in p['materials']:
                    check(all((m['x'] - e['x']) ** 2 + (m['y'] - e['y']) ** 2 >= 96 ** 2 for e in p['exits']), 'spot %s far from the exits' % m)
        else:
            check(False, 'chance/materials map %d written' % EVM)
        if os.path.exists(fm(EVS, '_00')):
            # material_spots_one_area (+ chance on the one-area entry: group 1 of [[3 Shadows], [2 Shadows]])
            s = mapfile.parse_stg(open(fm(EVS), 'rb').read())
            p0 = mapfile.parse_map(open(fm(EVS, '_00'), 'rb').read())
            check(sorted((m['materialId'], m['quantity']) for m in p0['materials']) == [(103, 2), (103, 2)] and s['materials_total'] == 2,
                  'one area: 103 [2,2], STG [15] 2 (%s, %s)' % (p0['materials'], s['materials_total']))
            check(pm.get(str(EVS), {}).get('random') == [p0['teams'][1]['uid']], 'one area: POI random = group 1 (%s)' % pm.get(str(EVS)))
        else:
            check(False, 'one-area chance/materials map %d written' % EVS)
        vm = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'validate_maps.py'), outm, CLS, '--json', os.path.join(tmp, 'vm.json')],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
        vmr = json.load(open(os.path.join(tmp, 'vm.json'), encoding='utf-8')) if os.path.exists(os.path.join(tmp, 'vm.json')) else {}
        for sid in (EVM, EVS):
            check(vmr.get(str(sid), {}).get('errors') == [], 'validate_maps %d: no errors (%s)' % (sid, vmr.get(str(sid)) or vm.stderr[-400:]))
    # a room code whose collision file has no walkable area (generated room DB_0023_00_00 of rooms_gen, 23-11: the build stopped
    # on EV-0139 +60) is skipped like a code without a collision file: the next code is the room
    EXTRA = 'D:/Progetto_Restauro_KH_UX/rooms_gen/files'
    if os.path.exists(os.path.join(EXTRA, 'map', 'DB_0023_00_00', 'DB_0023_00_00_cls.bin')):
        EVW = 4009989
        evw = dict(base, stageId=EVW, roomCodes=['DB_0023_00_00', coded_room], censusId='EV-TEST')
        outw = os.path.join(tmp, 'stagew')
        json.dump([evw], open(os.path.join(tmp, 'eventsw.json'), 'w'))
        cfgw = dict(cfg, out=outw, report=os.path.join(tmp, 'reportw.json'), events=os.path.join(tmp, 'eventsw.json'), extra_cls_dir=EXTRA)
        cfgw.pop('special', None)
        json.dump(cfgw, open(os.path.join(tmp, 'cfgw.json'), 'w'))
        rw = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'gen_story_maps.py'), os.path.join(tmp, 'cfgw.json')],
                            capture_output=True, text=True, encoding='utf-8', errors='replace')
        check(rw.returncode == 0, 'unwalkable room code: exit %d: %s' % (rw.returncode, rw.stderr[-500:]))
        fw = os.path.join(outw, 'mappoi_stg%d_00.bin' % EVW)
        check(os.path.exists(fw) and mapfile.parse_map(open(fw, 'rb').read())['room'] == coded_room, 'unwalkable room code skipped, next code used')
finally:
    shutil.rmtree(tmp, ignore_errors=True)

if errors:
    print('ERRORS (%d)' % len(errors))
    for e in errors:
        print(' -', e)
    sys.exit(1)
print('OK: events_list_built (events entry = special entry byte for byte, target 10001 Lv 120, roomCodes, report event flag, POI merge, validate_maps)')
