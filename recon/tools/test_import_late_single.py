"""Test of the late single-target story maps (I-335, user decision 27-11) in import_orig_stages.py and mapfile.add_chests:

    python -I recon/tools/test_import_late_single.py

1. mapfile.add_chests on a synthetic MAP/STG: chest count and records, materials/npcs moved and intact, STG [14] raised.
2. Importer (real data: JP 4.3.1 stages, 2016 package, server/master_data; skipped when absent), run into a temporary folder
   under D:\\Progetto_Restauro_KH_UX\\tmp with --rows carrying OLD objectives:
   * 9350 «Defeat Creeper Plant (36)» (idType 1) and 1210 «Defeat 13 enemies»: the late JP file is still taken (checks
     waived, listed in late_single.waived);
   * a control stage outside LATE_SINGLE with «Defeat X», X only in its 2016 map: the JP file is rejected (check kept);
   * only quests 1-525; all 19 LATE_SINGLE stages from the JP file version >= 16 with the late target in STG [6]
     (275: 10261 Fortress Crab); 5300/7170 one part; 9350 part 0 and 2170 part 1 get the 2016 chest (uid 20, reward
     901 for 9350), the other late parts keep their own chests; every written file parses and passes check_stage.
3. Enemy rows: every enemyId of the 19 late maps is a master enemy row; each target row is named as the wiki target of
   its quest; the event-enemy source (private file, when present) has a found and approved model for the non-WW ids.
"""
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mapfile  # noqa: E402

D = r'D:\Progetto_Restauro_KH_UX'
REPO = os.path.dirname(os.path.dirname(HERE))
fails = []
LATE = {1110: 14, 1210: 24, 2100: 47, 2170: 54, 2290: 66, 2390: 76, 2440: 81, 3150: 96, 3210: 102, 3390: 120,
        4100: 130, 5300: 160, 6230: 183, 6400: 200, 7170: 217, 7300: 230, 8200: 250, 9350: 275, 11250: 325}
TARGET = {1110: 10022, 1210: 10240, 2100: 10174, 2170: 10099, 2290: 11023, 2390: 10173, 2440: 1027, 3150: 10175,
          3210: 11029, 3390: 10137, 4100: 11530, 5300: 11522, 6230: 11033, 6400: 11025, 7170: 10109, 7300: 10242,
          8200: 10176, 9350: 10261, 11250: 11028}


def check(cond, msg):
    if not cond:
        fails.append(msg)
        print('FAIL', msg)


# ---- 1. add_chests on synthetic files ------------------------------------------------------------------------------
def synth_map(chests, materials, npcs):
    body = struct.pack('<i', 0)                                   # exits: none
    off = {'exits': 0}
    off['enemies'] = len(body)
    body += struct.pack('<2i', 0, 0)                              # no teams, no enemies
    off['chests'] = len(body)
    body += struct.pack('<i', len(chests)) + b''.join(struct.pack('<5i', *c) for c in chests)
    off['materials'] = len(body)
    body += struct.pack('<i', len(materials)) + b''.join(struct.pack('<4i', *m) for m in materials)
    off['npcs'] = len(body)
    body += struct.pack('<i', len(npcs)) + b''.join(struct.pack('<3i4h3i', *n) for n in npcs)
    head = b'MAP\0' + struct.pack('<2i', 16, 40) + b'AG_0002_00_00'.ljust(16, b'\0') + struct.pack('<hh', 0, 0)
    head += struct.pack('<5i', *(off[s] for s in mapfile.SECTIONS))
    return head + body


stg = bytearray(b'STG\0' + struct.pack('<15i', 16, 1, 100, 200, 0, 10261, 1, 1, 1, 0, 92, 0, 0, 1, 2))
part = synth_map([(10, 20, 900, 1, 3)], [(1, 2, 3, 4), (5, 6, 7, 8)], [(9, 9, 2000, 3, 0, 1, 0, 4093501, 0, 0)])
new_stg, new_part = mapfile.add_chests(bytes(stg), part, [{'x': 640, 'y': 480, 'reward': 901, 'kind': 2, 'uid': 20}])
p, s = mapfile.parse_map(new_part), mapfile.parse_stg(new_stg)
check([c['uid'] for c in p['chests']] == [3, 20] and p['chests'][1]['reward'] == 901 and p['chests'][1]['kind'] == 2,
      'add_chests: chests %s' % p['chests'])
check([(m['materialId'], m['quantity']) for m in p['materials']] == [(3, 4), (7, 8)], 'add_chests: materials %s' % p['materials'])
check([n['talk'] for n in p['npcs']] == [4093501], 'add_chests: npcs %s' % p['npcs'])
check(not p['gaps'] and p['tail'] == 0 and len(new_part) == len(part) + 20, 'add_chests: sections not contiguous %s' % p['gaps'])
check(s['chests_total'] == 2 and new_stg[:0x38] == bytes(stg[:0x38]) and new_stg[0x3c:] == bytes(stg[0x3c:]),
      'add_chests: STG [14] %d or other bytes changed' % s['chests_total'])
try:
    mapfile.add_chests(bytes(stg), part.replace(struct.pack('<i', 16), struct.pack('<i', 7), 1), [])
    check(False, 'add_chests: a MAP below version 13 must be refused')
except mapfile.FormatError:
    pass

# ---- 2. importer on the real data ----------------------------------------------------------------------------------
import private_tools  # noqa: E402
JP_STAGE = private_tools.local_path('jp_data', 'stage')
B16 = private_tools.local_path('ref_work', 'bundle2016', 'files', 'stage')
MASTER = os.path.join(REPO, 'server', 'master_data')
if not all(os.path.isdir(x) for x in (JP_STAGE, B16, MASTER)):
    print('SKIP importer/enemy parts: real data absent')
    sys.exit(1 if fails else print('OK (synthetic only)') or 0)

rows = {r['stageId']: r for r in json.load(open(os.path.join(MASTER, 'stage.json'), encoding='utf-8'))}
enemy = {r['enemyId']: r for r in json.load(open(os.path.join(MASTER, 'enemy.json'), encoding='utf-8'))}
jpf, b16f = mapfile.iter_stage_files(JP_STAGE), mapfile.iter_stage_files(B16)


def ids(files, sid):
    _, parts = mapfile.load_stage(files, sid)
    return {e['enemyId'] for p in parts for e in p['enemies']}, parts


# control stage: outside LATE_SINGLE, both sources readable, an enemy only in the 2016 map
control = None
for sid in sorted(rows):
    r = rows[sid]
    if r['stageKind'] != 1 or r['id'] > 525 or sid in LATE or sid < 1100 or sid in (2060, 3310, 5300, 7170, 11220, 2320):
        continue
    try:
        jp_ids, jp_parts = ids(jpf, sid)
        old_ids, old_parts = ids(b16f, sid)
    except (mapfile.FormatError, KeyError):
        continue
    only_old = sorted(e for e in old_ids - jp_ids if e in enemy)
    if only_old and all(p['client_layout'] for p in jp_parts + old_parts) and \
            [p['room'] for p in jp_parts] == [p['room'] for p in old_parts]:
        control = (sid, only_old[0])
        break
check(control is not None, 'no control stage found')


def objective(row, req, idt, eid, num):
    row = json.loads(json.dumps(row))
    row.update(validSubmission=1, submissionRequire=[req, 0, 0], submissionIdType=[idt, 0, 0], submissionId=[eid, 0, 0],
               submissionNum=[num, 0, 0])
    return row


extra_rows = [objective(rows[9350], 4, 1, 36, 1), objective(rows[1210], 3, 0, 0, 13)]
if control:
    extra_rows.append(objective(rows[control[0]], 4, 1, control[1], 1))
os.makedirs(os.path.join(D, 'tmp'), exist_ok=True)
t = tempfile.mkdtemp(prefix='t_i335_', dir=os.path.join(D, 'tmp'))
try:
    rows_file = os.path.join(t, 'rows.json')
    json.dump(extra_rows, open(rows_file, 'w', encoding='utf-8'))
    out = os.path.join(t, 'out')
    r = subprocess.run([sys.executable, '-I', os.path.join(HERE, 'import_orig_stages.py'), '--rows', rows_file, '--out', out],
                       capture_output=True, text=True)
    print(r.stdout[-1500:], r.stderr[-3000:])
    check(r.returncode == 0, 'import_orig_stages.py exits with %d' % r.returncode)
    rep = json.load(open(os.path.join(out, 'report.json'), encoding='utf-8'))
    by = {x['stageId']: x for x in rep['stages']}
    check(len(by) == 525 and max(rows[s]['id'] for s in by) == 525, 'stages %d (quests 1-525 expected)' % len(by))
    check(rep['summary']['late_single']['used'] == sorted(LATE) and not rep['summary']['late_single']['not_used'],
          'late_single summary %s' % rep['summary']['late_single'])
    check(any('enemyId 36' in w for w in by[9350]['late_single']['waived']), '9350 waived %s' % by[9350]['late_single'])
    check(any('13' in w for w in by[1210]['late_single']['waived']), '1210 waived %s' % by[1210]['late_single'])
    if control:
        c = by[control[0]]
        check(c['source'] == '2016' and 'jp scartata' in c['note'], 'control %s (enemy %d only in 2016): source %s, note %s'
              % (control[0], control[1], c['source'], c['note']))
    files = mapfile.iter_stage_files(os.path.join(out, 'stage'))
    for sid, q in LATE.items():
        x = by[sid]
        check(x['source'] == 'jp' and x['version'] >= 16 and x['late_single']['used'], '%d: source %s v%s' % (
            sid, x['source'], x.get('version')))
        st, parts = mapfile.load_stage(files, sid)
        bad, warn = mapfile.check_stage(st, parts)
        check(not bad and not warn, '%d: check_stage %s %s' % (sid, bad, warn))
        check(st['target_enemy'] == TARGET[sid], '%d: target %d, expected %d' % (sid, st['target_enemy'], TARGET[sid]))
        _, late_parts = mapfile.load_stage(jpf, sid)
        for k, (p, lp) in enumerate(zip(parts, late_parts)):
            check(p['enemies'] == lp['enemies'] and p['teams'] == lp['teams'], '%d part %d: enemies differ from the JP file' % (sid, k))
            if (sid, k) not in ((9350, 0), (2170, 1)):
                check(p['chests'] == lp['chests'], '%d part %d: chests differ from the JP file' % (sid, k))
    for sid in (5300, 7170):
        check(by[sid]['parts'] == 1 and (sid, 1) not in files, '%d: parts %s' % (sid, by[sid]['parts']))
    p9350 = mapfile.load_stage(files, 9350)[1][0]
    check([(c['uid'], c['reward']) for c in p9350['chests']] == [(20, 901)], '9350 chests %s' % p9350['chests'])
    _, old2170 = mapfile.load_stage(b16f, 2170)
    check(mapfile.load_stage(files, 2170)[1][1]['chests'] == old2170[1]['chests'] != [], '2170 part 1 chests')
finally:
    shutil.rmtree(t, ignore_errors=True)

# ---- 3. enemy rows -------------------------------------------------------------------------------------------------
wiki = {v.get('number'): v for v in json.load(open(os.path.join(D, 'wiki', 'quests.json'), encoding='utf-8')).values()}
priv = os.path.join(D, 'private', 'events', 'enemies', 'event_enemies.json')
ev = json.load(open(priv, encoding='utf-8'))['enemies'] if os.path.exists(priv) else None
for sid, q in LATE.items():
    for p in mapfile.load_stage(jpf, sid)[1]:
        for e in p['enemies']:
            check(e['enemyId'] in enemy, '%d: enemy %d has no master row' % (sid, e['enemyId']))
    t_id = TARGET[sid]
    check(enemy.get(t_id, {}).get('name') == wiki[str(q)]['target'], 'Q%d: target row %d %r, wiki %r' % (
        q, t_id, enemy.get(t_id, {}).get('name'), wiki[str(q)]['target']))
    if ev is not None and str(t_id) in ev:
        v = ev[str(t_id)]
        check(v.get('model') != 'missing' and v.get('approved'), 'Q%d: event row %d model %s approved %s' % (
            q, t_id, v.get('model'), v.get('approved')))

print('FAIL %d' % len(fails) if fails else 'OK')
sys.exit(1 if fails else 0)
