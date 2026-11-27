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

# ---- Part 3b: 2018-07 revision pin, rebuilt STG headers (header absent in the JP folder) ----
import struct  # noqa: E402
import mapfile  # noqa: E402

JPF = ics.iter_cl_files(JP, plain=ics.PLAIN_REVISION_STAGES)
JPH = ics.iter_cl_files(JP)
M07 = [20180700 + k for k in range(1, 11)]
t = tempfile.mkdtemp()
try:
    class AllIds(object):
        def __contains__(self, i):
            return True
    rep = ics.run([(3500, s) for s in M07], [('jp431', JPF)], {'OC_0001_00_00'}, AllIds(), os.path.join(t, 'o07'))
    ids07 = {e for st in rep['stages'] for e in st.get('enemies', [])}
    check(all(st['status'] == 'imported' for st in rep['stages']) and ids07, 'revision pin 2018-07: imported')
    check(not [i for i in ids07 if i >= 60000], 'revision pin 2018-07: no enemy id >= 60000: %s' % sorted(i for i in ids07 if i >= 60000))
    # the highest revision of the same stages DOES carry such ids (so the pin is what removes them)
    rep_hi = ics.run([(3500, s) for s in M07], [('jp431', JPH)], {'OC_0001_00_00'}, AllIds(), os.path.join(t, 'o07hi'))
    check([e for st in rep_hi['stages'] for e in st.get('enemies', []) if e >= 60000], 'revision pin 2018-07: pin is needed')
    # every other stage still takes its highest revision (20190506 has revisions .00000060 / .00000037)
    check(JPF[(20190506, None)].endswith('cl_stg20190506.00000060.bin') and JPF[(20190506, 0)].endswith('_00.00000037.bin'),
          'other stages take the highest revision')
    check(JPF[(20180701, None)].endswith('cl_stg20180701.bin') and JPF[(20180701, 0)].endswith('cl_stg20180701_00.bin'),
          'pinned stages take the plain files')

    # header rebuilt
    SIB = {20181001: 20181002, 20181005: 20181002, 20181102: 20181101, 20190203: 20190201, 20190205: 20190201}
    o = os.path.join(t, 'ohdr')
    stages = [(4000, s) for s in SIB] + [(4000, 20181002)]
    rep = ics.run(stages, [('jp431', JPF)], {'OC_0001_00_00'}, AllIds(), o)
    st = {s['stageId']: s for s in rep['stages']}
    for sid, sib in SIB.items():
        check(st[sid]['status'] == 'imported' and st[sid].get('headerRebuilt') is True, 'header rebuilt flag %s' % sid)
        stg_b = open(os.path.join(o, 'cl_stg%08d.bin' % sid), 'rb').read()
        stg, parts = mapfile.load_stage({(sid, None): stg_b, (sid, 0): os.path.join(o, 'cl_stg%08d_00.bin' % sid)}, sid)
        bad, _ = mapfile.check_stage(stg, parts)
        check(not bad, 'header rebuilt %s passes check_stage: %s' % (sid, bad))
        sg = mapfile.parse_stg(open(JPH[(sib, None)], 'rb').read())
        check(len(stg_b) == 64 and stg['parts'] == 1 and stg['teams_total'] == len(parts[0]['teams']) and
              stg['enemies_total'] == len(parts[0]['enemies']), 'header rebuilt %s counts equal the part' % sid)
        check((stg['start'], stg['start_facing'], stg['version'], stg['start_part']) ==
              (sg['start'], sg['start_facing'], sg['version'], sg['start_part']), 'header rebuilt %s start from %s' % (sid, sib))
        check(st[sid].get('headerSibling') == sib, 'header sibling %s' % sid)
    # a stage that HAS its header is copied byte for byte and not flagged
    check(not st[20181002].get('headerRebuilt') and open(os.path.join(o, 'cl_stg20181002.bin'), 'rb').read() ==
          open(JPH[(20181002, None)], 'rb').read(), 'header present: byte copy, no flag')
    # a stage with no part file stays rejected (also through main -> exit 1)
    only = os.path.join(t, 'only')
    os.makedirs(only)
    shutil.copyfile(JPH[(20181002, None)], os.path.join(only, 'cl_stg20181002.bin'))   # STG, no part
    rep = ics.run([(4000, 20181002), (4000, 20181001)], [('jp431', ics.iter_cl_files(only))], {'OC_0001_00_00'}, AllIds(),
                  os.path.join(t, 'o_nopart'))
    check([s['status'] for s in rep['stages']] == ['skipped', 'skipped'], 'no part file: rejected')
    # a sibling whose header the rebuild refuses is skipped: the next sibling of the month is tried
    bad_sib = os.path.join(t, 'badsib')
    os.makedirs(bad_sib)
    open(os.path.join(bad_sib, 'cl_stg20181000.bin'), 'wb').write(b'not an stg')   # lowest id of the month, unusable
    for k in (None, 0):
        shutil.copyfile(JPH[(20181002, k)], os.path.join(bad_sib, 'cl_stg20181002%s.bin' % ('' if k is None else '_00')))
    shutil.copyfile(JPH[(20181001, 0)], os.path.join(bad_sib, 'cl_stg20181001_00.bin'))
    got = ics.rebuild_from_sibling(20181001, 'jp431', ics.iter_cl_files(bad_sib))
    check(got is not None and got[0] == 20181002, 'rebuild: a failing sibling is skipped, the next one used: %s' % (got and got[0]))
    master = os.path.join(t, 'm')
    os.makedirs(master)
    json.dump([{'colosseumStageId': 4000, 'validStage': 1, 'stageId': [20181002]}], open(os.path.join(master, 'colosseumStage.json'), 'w'))
    json.dump([{'enemyId': 1}], open(os.path.join(master, 'enemy.json'), 'w'))
    with contextlib.redirect_stdout(io.StringIO()):
        rc = ics.main(['--master', master, '--b2016', only, '--jp', only, '--gen', only, '--out', os.path.join(t, 'o_rc'),
                       '--report', os.path.join(t, 'rc.json')])
    check(rc == 1, 'no part file: exit 1')
finally:
    shutil.rmtree(t)

# ---- Part 4: the 28 rebuilt headers, whole copies ----
H28 = {201909: (4,), 201910: (3, 5), 201911: (1,), 201912: (4, 7), 202002: (6,), 202003: (3,), 202004: (2, 4), 202006: (6,),
       202007: (2,), 202008: (1, 2), 202011: (2, 8), 202012: (1,), 202102: (3,), 202103: (3,), 202104: (1, 3, 5, 7),
       202105: (5, 8), 202106: (2, 3, 7)}
P4 = sorted(m * 100 + n for m, ns in H28.items() for n in ns)
t = tempfile.mkdtemp()
try:
    class AllIds4(object):
        def __contains__(self, i):
            return True
    check(len(P4) == 28, 'the PART4_AUDIT table lists 28 headerless stages')
    # exactly these stages lack their header in the JP folder (months 2019-05 .. 2021-06 on disk)
    months = [m for m in range(201905, 201913) if m != 201907] + [m for m in range(202002, 202010)] + \
             [m for m in range(202011, 202013)] + [m for m in range(202101, 202107)]
    nohdr = sorted(m * 100 + n for m in months for n in range(1, 11) if (m * 100 + n, 0) in JPH and (m * 100 + n, None) not in JPH)
    check(nohdr == P4, 'headerless JP stages = the 28 of PART4_AUDIT §2: %s' % sorted(set(nohdr) ^ set(P4)))
    o4 = os.path.join(t, 'o4')
    rep4 = ics.run([(4500, s) for s in P4], [('jp431', JPF)], {'OC_0001_00_00'}, AllIds4(), o4)
    st4 = {s['stageId']: s for s in rep4['stages']}
    for sid in P4:
        s = st4[sid]
        check(s['status'] == 'imported' and s.get('headerRebuilt') is True and s.get('headerSibling', 0) // 100 == sid // 100,
              'header rebuilt part4 %s: %s' % (sid, s.get('status')))
        if s['status'] != 'imported':
            continue
        stg_b = open(os.path.join(o4, 'cl_stg%08d.bin' % sid), 'rb').read()
        stg, parts = mapfile.load_stage({(sid, None): stg_b, (sid, 0): os.path.join(o4, 'cl_stg%08d_00.bin' % sid)}, sid)
        bad, _ = mapfile.check_stage(stg, parts)
        check(not bad and len(stg_b) == 64 and stg['parts'] == 1 and stg['teams_total'] == len(parts[0]['teams']) and
              stg['enemies_total'] == len(parts[0]['enemies']), 'header rebuilt part4 %s: check_stage + counts equal the part: %s' % (sid, bad))

    # first sibling broken (a FormatError while rebuilding): the next same-month sibling is used, a later one too
    bs = os.path.join(t, 'bs')
    os.makedirs(bs)
    open(os.path.join(bs, 'cl_stg20190900.bin'), 'wb').write(b'x' * 64)
    open(os.path.join(bs, 'cl_stg20190901.bin'), 'wb').write(b'')
    for sfx in ('', '_00'):
        shutil.copyfile(JPH[(20190902, None if not sfx else 0)], os.path.join(bs, 'cl_stg20190902%s.bin' % sfx))
    shutil.copyfile(JPH[(20190904, 0)], os.path.join(bs, 'cl_stg20190904_00.bin'))
    got = ics.rebuild_from_sibling(20190904, 'jp431', ics.iter_cl_files(bs))
    check(got is not None and got[0] == 20190902, 'first sibling broken: rebuilt from the second: %s' % (got and got[0]))
    # a source that is not a REBUILD_SOURCE, or a month with no usable sibling, rebuilds nothing
    check(ics.rebuild_from_sibling(20190904, 'bundle2016', ics.iter_cl_files(bs)) is None, 'no rebuild outside REBUILD_SOURCES')
    os.remove(os.path.join(bs, 'cl_stg20190902.bin'))
    check(ics.rebuild_from_sibling(20190904, 'jp431', ics.iter_cl_files(bs)) is None, 'every sibling broken: None')

    # whole copy: 21200101 = the bytes of 20200501 (header and part) under the new id's names; the report says copiedFrom
    oc = os.path.join(t, 'oc')
    pairs = {21200101: 20200501, 21201002: 20210102, 21201007: 20200507}
    repc = ics.run([(5300, 21200101), (6200, 21201002), (6200, 21201007), (6200, 20200501)], [('jp431', JPF)], {'OC_0001_00_00'},
                   AllIds4(), oc, pairs)
    sc = {s['stageId']: s for s in repc['stages']}
    for new, jp in pairs.items():
        check(sc[new]['status'] == 'imported' and sc[new]['copiedFrom'] == jp, 'whole copy %s: copiedFrom %s' % (new, sc[new]))
        check(sc[new]['files'] == ['cl_stg%08d.bin' % new, 'cl_stg%08d_00.bin' % new], 'whole copy %s: the new id\'s file names' % new)
        check(open(os.path.join(oc, 'cl_stg%08d.bin' % new), 'rb').read() == open(JPF[(jp, None)], 'rb').read() and
              open(os.path.join(oc, 'cl_stg%08d_00.bin' % new), 'rb').read() == open(JPF[(jp, 0)], 'rb').read(), 'whole copy %s: bytes of %s' % (new, jp))
    check('copiedFrom' not in sc[20200501] and sc[20200501]['status'] == 'imported', 'a plain stage is not flagged copiedFrom')
    # a copy of a JP id that is not on disk: skipped, and main exits 1
    repm = ics.run([(5300, 21200101)], [('jp431', JPF)], {'OC_0001_00_00'}, AllIds4(), os.path.join(t, 'om'), {21200101: 29990101})
    check(repm['stages'][0]['status'] == 'skipped' and not os.path.exists(os.path.join(t, 'om', 'cl_stg21200101.bin')), 'copy of a missing JP id skipped')
    master = os.path.join(t, 'm4')
    os.makedirs(master)
    json.dump([{'colosseumStageId': 5300, 'validStage': 1, 'stageId': [21200101]}], open(os.path.join(master, 'colosseumStage.json'), 'w'))
    json.dump([{'enemyId': i} for i in range(1, 70000)], open(os.path.join(master, 'enemy.json'), 'w'))
    def cli(*extra):
        with contextlib.redirect_stdout(io.StringIO()):
            return ics.main(['--master', master, '--b2016', os.path.join(t, 'none'), '--jp', JP, '--gen', os.path.join(t, 'none'),
                             '--out', os.path.join(t, 'o_cli'), '--report', os.path.join(t, 'cli.json')] + list(extra))
    check(cli('--copy', '21200101=29990101') == 1, 'copy of a JP id not on disk: exit 1')
    check(cli('--copy', '21200101=20200501') == 0 and os.path.exists(os.path.join(t, 'o_cli', 'cl_stg21200101_00.bin')), 'copy via --copy: exit 0')
    check(json.load(open(os.path.join(t, 'cli.json')))['stages'][0].get('copiedFrom') == 20200501, 'report copiedFrom via --copy')
finally:
    shutil.rmtree(t)

# the build wiring: build-resources.ps1 passes --copy-from-make, which takes the 18 pairs of make-colosseum.js copyPairs()
t = tempfile.mkdtemp()
try:
    ps1 = open(os.path.join(os.path.dirname(os.path.dirname(HERE)), 'tools', 'ldplayer', 'session', 'build-resources.ps1'), encoding='utf-8').read()
    line = [l for l in ps1.splitlines() if 'import_colosseum_stages.py' in l]
    check(len(line) == 1 and '--copy-from-make' in line[0], 'build-resources.ps1 runs the import with --copy-from-make')
    master = os.path.join(t, 'mw')
    os.makedirs(master)
    ids = [21200100 + n for n in range(1, 10)] + [21201000 + n for n in range(1, 10)]
    json.dump([{'colosseumStageId': 5300, 'validStage': 9, 'stageId': ids[:9]}, {'colosseumStageId': 6200, 'validStage': 9, 'stageId': ids[9:]}],
              open(os.path.join(master, 'colosseumStage.json'), 'w'))
    json.dump([{'enemyId': i} for i in range(1, 70000)], open(os.path.join(master, 'enemy.json'), 'w'))
    with contextlib.redirect_stdout(io.StringIO()):
        rc = ics.main(['--master', master, '--b2016', os.path.join(t, 'none'), '--jp', JP, '--gen', os.path.join(t, 'none'),
                       '--copy-from-make', '--out', os.path.join(t, 'ow'), '--report', os.path.join(t, 'w.json')])
    rw = json.load(open(os.path.join(t, 'w.json')))
    check(rc == 0 and len(rw['stages']) == 18 and all(s['status'] == 'imported' and s.get('copiedFrom') for s in rw['stages']),
          '--copy-from-make: the 18 copies of make-colosseum.js: rc %s' % rc)
finally:
    shutil.rmtree(t)

print('FAIL: ' + '; '.join(fails) if fails else 'OK: import_colosseum_stages')
sys.exit(1 if fails else 0)
