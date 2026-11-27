"""Test of fix_colosseum_anim.py (I-331: the one-turn banner must draw the hundreds digit of 100..199).

    python -I recon/tools/test_fix_colosseum_anim.py   -> «OK: ...» or «ERRORS (n)», exit 1

Checks, on a synthetic armature (no game file) and, when present on this PC, on the local English 2016 copy and on the
served stage_gen copy (each patched in memory or in a temporary folder, never in place; skipped with a message when
missing):
- Round_NumL2_Eff01 bone present once; Colosseum_All1Turn has frames for Round_NumL2 and Round_NumL2_Eff01, one per
  tens frame, same fi / scale / colour, x = tens x - (units x - tens x);
- everything that was in the file before (Round_NumL1 / L0 and their _Eff01, every other bone and movement) is
  byte-identical once serialised: the patch only adds;
- a second run changes nothing; a file that already has the bone but no frames (the 26-11 build) gets the frames.
"""
import copy
import json
import os
import shutil
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fix_colosseum_anim as fca  # noqa: E402

D = r'D:\Progetto_Restauro_KH_UX'
errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)


def frame(fi, x, a=None):
    f = {'dI': 0, 'x': x, 'y': -14.0, 'z': 0, 'cX': 1.0, 'cY': 1.0, 'kX': 0.0, 'kY': 0.0, 'fi': fi, 'twE': 0,
         'tweenFrame': True, 'bd_src': 1, 'bd_dst': 771}
    if a is not None:
        f['color'] = {'a': a, 'r': 255, 'g': 255, 'b': 255}
    return f


def bone(name, z):
    return {'name': name, 'parent': '', 'dI': -1, 'x': 0.0, 'y': 0.0, 'z': z,
            'display_data': [{'name': 'Digit00.png', 'displayType': 0}]}


def synthetic():
    names = ['Round_NumL1_Eff01', 'Round_NumL0_Eff01', 'Round_NumL2', 'Round_NumL1', 'Round_NumL0', 'Round']
    mov = [{'name': n, 'dl': 0.0, 'frame_data': fr} for n, fr in (
        ('Round_NumL1_Eff01', [frame(120, -209.0, 0), frame(125, -209.0, 255), frame(165, -209.0, 0)]),
        ('Round_NumL0_Eff01', [frame(120, -145.0, 0), frame(125, -145.0, 255), frame(165, -145.0, 0)]),
        ('Round_NumL1', [frame(70, 180.0, 0), frame(85, -209.0), frame(170, -209.0)]),
        ('Round_NumL0', [frame(70, 218.0, 0), frame(85, -145.0), frame(170, -145.0)]),
        ('Round', [frame(85, 56.0)]))]
    return {'armature_data': [{'name': 'A', 'bone_data': [bone(n, 20 - i) for i, n in enumerate(names)]}],
            'animation_data': [{'name': 'A', 'mov_data': [
                {'name': 'Colosseum_Start', 'dr': 10, 'mov_bone_data': [{'name': 'Round_NumL2', 'dl': 0.0,
                                                                         'frame_data': [frame(45, 10.0)]}]},
                {'name': 'Colosseum_All1Turn', 'dr': 171, 'mov_bone_data': mov}]}]}


def strip_added(doc):
    """The doc without what the fix adds (to compare with the input byte for byte)."""
    doc = copy.deepcopy(doc)
    doc['armature_data'][0]['bone_data'] = [b for b in doc['armature_data'][0]['bone_data'] if b['name'] != fca.NEW]
    for m in doc['animation_data'][0]['mov_data']:
        if m['name'] == fca.MOVEMENT:
            m['mov_bone_data'] = [b for b in m['mov_bone_data'] if b['name'] not in ('Round_NumL2', fca.NEW)]
    return doc


def dumps(doc):
    return json.dumps(doc, ensure_ascii=False, indent=2)


def check_patched(tag, before, after):
    bones = [b['name'] for b in after['armature_data'][0]['bone_data']]
    check(bones.count(fca.NEW) == 1, f'{tag}: {fca.NEW} bone {bones.count(fca.NEW)} times')
    mbd = {b['name']: b for m in after['animation_data'][0]['mov_data'] if m['name'] == fca.MOVEMENT
           for b in m['mov_bone_data']}
    for hund, tens, units in fca.DIGITS:
        fr = mbd.get(hund, {}).get('frame_data') or []
        tf, uf = mbd[tens]['frame_data'], mbd[units]['frame_data']
        check(len(fr) == len(tf) > 0, f'{tag}: {hund} has {len(fr)} frames, {tens} {len(tf)}')
        for h, t, u in zip(fr, tf, uf):
            check(h['x'] == t['x'] - (u['x'] - t['x']), f'{tag}: {hund} fi {h["fi"]} x {h["x"]}')
            check({k: v for k, v in h.items() if k != 'x'} == {k: v for k, v in t.items() if k != 'x'},
                  f'{tag}: {hund} fi {h["fi"]} differs from {tens} beyond x')
    # everything already there is unchanged (the L1 / L0 digits included), only the hundreds data is new
    base = strip_added(before)
    check(dumps(strip_added(after)) == dumps(base), f'{tag}: data other than the hundreds digit changed')
    for name in ('Round_NumL1', 'Round_NumL0', 'Round_NumL1_Eff01', 'Round_NumL0_Eff01'):
        b0 = [b for m in before['animation_data'][0]['mov_data'] if m['name'] == fca.MOVEMENT
              for b in m['mov_bone_data'] if b['name'] == name]
        check(b0 and dumps(b0[0]) == dumps(mbd[name]), f'{tag}: {name} frames changed')


def run_doc(tag, doc):
    before = copy.deepcopy(doc)
    done = fca.patch(doc)
    check(len(done) >= 2, f'{tag}: patch did {done}')
    check_patched(tag, before, doc)
    again = copy.deepcopy(doc)
    check(fca.patch(again) == [] and dumps(again) == dumps(doc), f'{tag}: second run changed the file')
    return doc


# synthetic: fresh 2016-like file, and the 26-11 state (bone already added, no frames)
syn = run_doc('synthetic', synthetic())
check([b['name'] for m in syn['animation_data'][0]['mov_data'] if m['name'] == fca.MOVEMENT
       for b in m['mov_bone_data']][:4] == ['Round_NumL2_Eff01', 'Round_NumL1_Eff01', 'Round_NumL0_Eff01', 'Round_NumL2'],
      'synthetic: hundreds data not before the tens')
hx = {b['name']: [f['x'] for f in b['frame_data']] for m in syn['animation_data'][0]['mov_data']
      if m['name'] == fca.MOVEMENT for b in m['mov_bone_data']}
check(hx['Round_NumL2'] == [142.0, -273.0, -273.0], f'synthetic: Round_NumL2 x {hx["Round_NumL2"]}')
check(hx['Round_NumL2_Eff01'] == [-273.0] * 3, f'synthetic: Round_NumL2_Eff01 x {hx["Round_NumL2_Eff01"]}')
half = synthetic()
fca._add_bone(half)
done = fca.patch(half)
check(done == [f'{fca.MOVEMENT} frames of Round_NumL2', f'{fca.MOVEMENT} frames of Round_NumL2_Eff01'],
      f'synthetic 26-11 state: {done}')

# local files (not in the repo): the English 2016 source and the served copy
local = []
try:
    import private_tools
    local.append(('2016', os.path.join(private_tools.local_path('ref_work'), 'bundle2016', 'files')))
except Exception as e:  # noqa: BLE001
    print(f'skip 2016 copy: {e}')
local.append(('stage_gen', os.path.join(D, 'stage_gen', 'files')))
for tag, files in local:
    path = os.path.join(files, fca.NAME)
    if not os.path.isfile(path):
        print(f'skip {tag}: {path} missing on this PC')
        continue
    raw = open(path, 'rb').read()
    doc = json.loads(raw.decode('utf-8-sig'))
    if tag == 'stage_gen':
        before = strip_added(doc)
        fca.patch(doc)
        check_patched(tag + ' (in memory)', before, doc)
    else:
        run_doc(tag, doc)
    # the command line on a temporary copy: file rewritten, second run a no-op
    with tempfile.TemporaryDirectory() as tmp:
        dst = os.path.join(tmp, fca.NAME)
        os.makedirs(os.path.dirname(dst))
        shutil.copyfile(path, dst)
        cmd = [sys.executable, '-I', os.path.join(HERE, 'fix_colosseum_anim.py'), tmp]
        r1 = subprocess.run(cmd, capture_output=True, text=True)
        out = open(dst, encoding='utf-8').read()
        r2 = subprocess.run(cmd, capture_output=True, text=True)
        check(r1.returncode == 0 and r2.returncode == 0, f'{tag}: exit {r1.returncode} / {r2.returncode} {r1.stderr}')
        check('already there' in r2.stdout and open(dst, encoding='utf-8').read() == out,
              f'{tag}: second command-line run changed the file ({r2.stdout.strip()})')
        check_patched(tag + ' (command line)', strip_added(json.loads(raw.decode('utf-8-sig'))), json.loads(out))

if errors:
    print(f'ERRORS ({len(errors)})')
    for e in errors:
        print(' -', e)
    sys.exit(1)
print('OK: hundreds digit frames added (x = tens - (units - tens)), tens / units data byte-identical, idempotent')
