"""Offline test of import_story_dramas.py with a fake 2016 package and fake story rows.

    python -I recon/tools/test_import_story_dramas.py        -> «OK: ...» or «ERRORS (n)», exit 1
"""
import hashlib
import json
import os
import struct
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import import_story_dramas as m  # noqa: E402

errors = []


def check(cond, msg):
    if not cond:
        errors.append(str(msg))


def seq(*recs):
    return b''.join(struct.pack('<5i', *r) for r in recs)


# script 1010201 (Quest 8 opening): music, BG, narration, NPC, speaker + two lines
S1 = seq((4000, 5005, 0, 0, 0), (4002, 5001, 0, 501000110, 0), (4002, 5003, 0, 20006, 0), (4002, 5004, 0, 99999, 0),
         (4002, 5008, 0, 30121, 2), (4003, 5008, 0, 1, 0), (4002, 5010, 0, 39994, 1),
         (4004, 5005, -1, 30121, 1010201), (4006, 5007, -1, 0, 500), (4004, 5005, -1, 0, 1010202), (4001, 5005, 0, 0, 0))
# script 1040501 (Quest 130 closing): cites BG 2014, absent everywhere (original typo, JP 4.3.1 alike)
S2 = seq((4000, 5005, 0, 0, 0), (4002, 5003, 0, 2014, 0), (4004, 5005, -1, 0, 1040501), (4001, 5005, 0, 0, 0))
# script 1060601: an unknown picture slot -> format error
S3 = seq((4000, 5005, 0, 0, 0), (4002, 5006, 0, 30121, 0), (4001, 5005, 0, 0, 0))

FILES = {
    'img/light/SEQ/1010201.l': S1,
    'img/light/SEQ/1010301.l': seq((4000, 5005, 0, 0, 0), (4004, 5005, -1, 30121, 1010301), (4001, 5005, 0, 0, 0)),
    'img/light/SEQ/1040501.l': S2,
    'img/light/BG/20006.png': b'\x89BTF bg',
    'img/light/NPC/30121.png': b'\x89BTF npc',
    'img/light/NPC/39994.png': b'\x89BTF board',
    'text/drama/201010201.txt': b'Jiminy Crickets!',
    'text/drama/201010202.txt': b'Second line.\x0cPage two.',
    'text/drama/201010301.txt': 'まだ日本語'.encode('utf-8'),
    'text/drama/201040501.txt': b'Closing line.',
    'text/drama/200030121.txt': b'Jiminy',
    'lwf/drama/2999951/2999951.lwf': b'LWF..2999951_aa.png..2999951_bb.png..',
    'lwf/drama/2999951/2999951_aa.png': b'\x89BTF a',
    'lwf/drama/2999951/2999951_bb.png': b'\x89BTF b',
    'lwf/drama/2999952/2999952.lwf': b'LWF..2999952_ff.png..',   # its texture is missing: held
}
# story rows (thethiny stage_dec.json shape): before/after arrays longer than the valid counts
ROWS = [
    {'stageBinId': 3, 'stageId': 1016, 'validBeforeDrama': 0, 'beforeDramaId': [0] * 5, 'validAfterDrama': 3,
     'afterDramaId': [2001001, 1, 2999951, 0, 0]},
    {'stageBinId': 8, 'stageId': 1050, 'validBeforeDrama': 1, 'beforeDramaId': [1010201, 1010301, 0, 0, 0],
     'validAfterDrama': 1, 'afterDramaId': [1010301, 0, 0, 0, 0]},
    {'stageBinId': 130, 'stageId': 4100, 'validBeforeDrama': 0, 'beforeDramaId': [0] * 5, 'validAfterDrama': 2,
     'afterDramaId': [1040501, 2999952, 0, 0, 0]},
    {'stageBinId': 200, 'stageId': 6400, 'validBeforeDrama': 1, 'beforeDramaId': [1060601, 0, 0, 0, 0],
     'validAfterDrama': 0, 'afterDramaId': [0] * 5},
    {'stageBinId': 526, 'stageId': 18010, 'validBeforeDrama': 1, 'beforeDramaId': [1180101, 0, 0, 0, 0],
     'validAfterDrama': 0, 'afterDramaId': [0] * 5},                  # beyond --max: ignored
    {'stageBinId': 9, 'stageId': 150000, 'validBeforeDrama': 1, 'beforeDramaId': [1190101, 0, 0, 0, 0],
     'validAfterDrama': 0, 'afterDramaId': [0] * 5},                  # event stage: ignored
]
SERVED = ['img/light/SEQ/1010151.l', 'lwf/drama/2001001/2001001.lwf', 'audio/501000110.akb', 'img/light/NARRATION/99999.png',
          'img/light/NPC/39994.png']


def build(t, files, rows):
    b16 = os.path.join(t, 'b16')
    tsv = ['name\trec\toffset\tstub_of\tsize\tsha1\tdup']
    for name, data in files.items():
        p = os.path.join(b16, 'files', *name.split('/'))
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(data)
        tsv.append('%s\t1\t2\t\t%d\t%s\t0' % (name, len(data), hashlib.sha1(data).hexdigest()))
    tsv.append('text/drama/201010201.txt\t1\t2\t\t3\t%s\t1' % ('0' * 40))   # older revision (dup 1): ignored
    open(os.path.join(b16, 'files.tsv'), 'w', encoding='utf-8').write('\n'.join(tsv) + '\n')
    served = os.path.join(t, 'names.tsv')
    open(served, 'w', encoding='utf-8').write('name\toffset\n' + ''.join('%s\t5\n' % n for n in SERVED))
    stages = os.path.join(t, 'stage_dec.json')
    json.dump(rows, open(stages, 'w'))
    return served, b16, stages


# --- the script parser
deps = m.seq_deps(S1)
check(deps == ['audio/501000110.akb', 'img/light/BG/20006.png', 'img/light/NARRATION/99999.png', 'img/light/NPC/30121.png',
               'img/light/NPC/39994.png', 'text/drama/200030121.txt', 'text/drama/201010201.txt',
               'text/drama/201010202.txt'], deps)
for bad in (S1[:-3], S3):
    try:
        m.seq_deps(bad)
        check(False, 'no FormatError on %r' % bad[:8])
    except m.FormatError:
        pass

# --- the wanted ids
want = m.wanted(ROWS, 525)
check(sorted(want) == [1, 1010201, 1010301, 1040501, 1060601, 2001001, 2999951, 2999952], sorted(want))
check(want[1010301] == [(8, 'after')], want[1010301])

with tempfile.TemporaryDirectory() as t:
    files = dict(FILES)
    served, b16, stages = build(t, files, ROWS)
    out = os.path.join(t, 'out')
    res = m.run(served, b16, stages, out)
    check(res['already_served'] == [2001001], res['already_served'])
    check(res['seq'] == [1010201, 1010301], res['seq'])
    check(res['lwf'] == [2999951], res['lwf'])
    check([h['id'] for h in res['held']] == [1040501, 2999952], res['held'])
    check(res['held'][0]['missing'] == ['img/light/BG/2014.png'], res['held'][0])
    check(res['held'][1]['missing'] == ['lwf/drama/2999952/2999952_ff.png'], res['held'][1])
    check([x['id'] for x in res['missing']] == [1, 1060601], res['missing'])
    check(res['japanese'] == ['text/drama/201010301.txt'], res['japanese'])
    have = sorted(os.path.relpath(os.path.join(d, f), out).replace('\\', '/') for d, _, fs in os.walk(out) for f in fs)
    check(have == ['img/light/BG/20006.png', 'img/light/NPC/30121.png', 'img/light/SEQ/1010201.l', 'img/light/SEQ/1010301.l',
                   'lwf/drama/2999951/2999951.lwf', 'lwf/drama/2999951/2999951_aa.png', 'lwf/drama/2999951/2999951_bb.png',
                   'text/drama/200030121.txt', 'text/drama/201010201.txt', 'text/drama/201010202.txt',
                   'text/drama/201010301.txt'], have)
    check(open(os.path.join(out, 'img', 'light', 'SEQ', '1010201.l'), 'rb').read() == S1, 'script bytes changed')
    # --allow: a held script is imported anyway (its missing pictures listed)
    out2 = os.path.join(t, 'out2')
    res = m.run(served, b16, stages, out2, allow={1040501})
    check(res['seq'] == [1010201, 1010301, 1040501], res['seq'])
    check(res['allowed_missing'] == [{'id': 1040501, 'missing': ['img/light/BG/2014.png']}], res['allowed_missing'])
    check(os.path.isfile(os.path.join(out2, 'text', 'drama', '201040501.txt')), 'allowed script text not copied')

with tempfile.TemporaryDirectory() as t:
    # files\ not the current revision of files.tsv -> stop
    served, b16, stages = build(t, dict(FILES), ROWS)
    open(os.path.join(b16, 'files', 'img', 'light', 'BG', '20006.png'), 'wb').write(b'changed')
    try:
        m.run(served, b16, stages, os.path.join(t, 'out'))
        check(False, 'no stop on a stale file')
    except SystemExit as e:
        check('20006' in str(e), e)

if errors:
    print('ERRORS (%d)' % len(errors))
    for e in errors:
        print('  ' + e)
    sys.exit(1)
print('OK: import_story_dramas (script deps, wanted ids, 2016 copy, lwf folder, held/allowed, Japanese flagged, stale stop)')
