"""Test of import_colosseum_stages.py: python -I recon/tools/test_import_colosseum_stages.py

Needs the local reference data (private_tools ref_work bundle2016 + jp_data); without it the test says SKIP. Checks: the WW
2016 copy wins over the JP one (20151108: the JP copy has a corrupt enemy id), the JP copy is used when the WW one is absent,
files copied byte for byte under the client names, a stage with no STG anywhere or an enemy not in the master is left out,
stale cl_stg files in the output are removed, other files there are kept, only the first validStage ids are taken, the
generated stages of --gen are the third source (after b2016 and jp).
"""
import contextlib
import io
import json
import os
import shutil
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import import_colosseum_stages as ics  # noqa: E402

try:
    import private_tools  # noqa: E402
    JP = private_tools.local_path('jp_data', 'stage')
    B16 = private_tools.local_path('ref_work', 'bundle2016', 'files', 'stage')
except Exception:  # noqa: BLE001
    JP = B16 = None
if not JP or not os.path.isdir(JP) or not B16 or not os.path.isdir(B16):
    print('SKIP: no local JP 4.3.1 / WW 2016 stage folders')
    sys.exit(0)

fails = []


def check(cond, what):
    if not cond:
        fails.append(what)


rows = [{'colosseumStageId': 1000, 'validStage': 2, 'stageId': [20151108, 20151101, 20151102]},
        {'colosseumStageId': 9, 'validStage': 2, 'stageId': [20150101, 20151009]}]
check(ics.season_stage_ids(rows) == [(1000, 20151108), (1000, 20151101), (9, 20150101), (9, 20151009)], 'validStage cut')

t = tempfile.mkdtemp()
try:
    b16 = os.path.join(t, 'b16')
    os.makedirs(b16)
    for f in ('cl_stg20151108.bin', 'cl_stg20151108_00.bin', 'cl_stg20151009.bin', 'cl_stg20151009_00.bin'):
        shutil.copyfile(os.path.join(B16, f), os.path.join(b16, f))
    out = os.path.join(t, 'out')
    os.makedirs(out)
    open(os.path.join(out, 'cl_stg20990101.bin'), 'wb').write(b'old')
    open(os.path.join(out, 'mappoi_stg01040.bin'), 'wb').write(b'keep')
    sources = [('bundle2016', ics.iter_cl_files(b16)), ('jp431', ics.iter_cl_files(JP))]
    rep = ics.run([(1000, 20151108), (1000, 20151101), (9, 20150101), (9, 20151009)], sources, {'OC_0001_00_00'},
                  set(range(20000, 23000)) - {20076}, out)
    st = {s['stageId']: s for s in rep['stages']}
    check(st[20151108]['status'] == 'imported' and st[20151108]['source'] == 'bundle2016', 'WW copy wins')
    check(open(os.path.join(out, 'cl_stg20151108_00.bin'), 'rb').read() ==
          open(os.path.join(B16, 'cl_stg20151108_00.bin'), 'rb').read(), 'byte copy')
    check(st[20151101]['status'] == 'imported' and st[20151101]['source'] == 'jp431', 'JP fallback')
    check(st[20151101]['tried'] == {'bundle2016': 'STG absent'}, 'tried listed')
    check(st[20150101]['status'] == 'skipped', 'absent stage left out')
    enemies_09 = st[20151009].get('enemies') or []
    check(st[20151009]['status'] == ('skipped' if 20076 in enemies_09 else 'imported'), 'enemy check')
    check(not os.path.exists(os.path.join(out, 'cl_stg20990101.bin')), 'stale removed')
    check(os.path.exists(os.path.join(out, 'mappoi_stg01040.bin')), 'other files kept')
    check(sorted(f for f in os.listdir(out) if f.startswith('cl_stg')) == sorted(
        sum((s.get('files') or [] for s in rep['stages']), [])), 'only imported files')
    rep2 = ics.run([(9, 20151009)], sources, {'OC_0001_00_00'}, set(), out)
    check(rep2['stages'][0]['status'] == 'skipped' and 'enemy not in the master' in rep2['stages'][0]['why'], 'missing enemy')
    check(ics.run([(9, 20151009)], sources, set(), set(range(20000, 23000)), out)['stages'][0]['status'] == 'skipped',
          'room not served')
    # third source: the generated stages of gen_colosseum_stages.py (--gen), after b2016 and jp
    gen = os.path.join(t, 'gen')
    os.makedirs(gen)
    for sfx in ('', '_00'):
        shutil.copyfile(os.path.join(B16, 'cl_stg20151009%s.bin' % sfx), os.path.join(gen, 'cl_stg21160801%s.bin' % sfx))
        shutil.copyfile(os.path.join(B16, 'cl_stg20151009%s.bin' % sfx), os.path.join(gen, 'cl_stg20151108%s.bin' % sfx))
    master = os.path.join(t, 'master')
    os.makedirs(master)
    json.dump([{'colosseumStageId': 1200, 'validStage': 2, 'stageId': [21160801, 20151108]}],
              open(os.path.join(master, 'colosseumStage.json'), 'w'))
    json.dump([{'enemyId': i} for i in range(20000, 23000)], open(os.path.join(master, 'enemy.json'), 'w'))
    rp = os.path.join(t, 'rep.json')
    with contextlib.redirect_stdout(io.StringIO()):
        rc = ics.main(['--master', master, '--b2016', b16, '--jp', JP, '--gen', gen, '--out', out, '--report', rp])
    st = {s['stageId']: s for s in json.load(open(rp))['stages']}
    check(rc == 0 and st[21160801]['source'] == 'colosseumGen', 'generated stage from --gen: %s %s' % (rc, st.get(21160801)))
    check(st[20151108]['source'] == 'bundle2016', 'b2016 wins over --gen')
    check(open(os.path.join(out, 'cl_stg21160801_00.bin'), 'rb').read() ==
          open(os.path.join(gen, 'cl_stg21160801_00.bin'), 'rb').read(), 'generated file copied')
finally:
    shutil.rmtree(t)

print('FAIL: ' + '; '.join(fails) if fails else 'OK: import_colosseum_stages')
sys.exit(1 if fails else 0)
