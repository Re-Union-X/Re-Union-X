"""Test of gen_colosseum_stages.py (Coliseum Part 2, Task 2): python -I recon/tools/test_gen_colosseum_stages.py

Self-contained (fixture templates written with stage_writer.map_part, fixture wiki month, fixture id sources): a month of 2
rounds -> 2 stages whose waves and per-wave counts equal the wiki rows, every enemy level = round number, file names = the
ids of server/make-colosseum.js GEN_STAGE_IDS (node), read back with mapfile.check_stage, room OC_0001_00_00, one part;
name -> Coliseum variant id by the nearest original WW month, then a 1.1.3 Coliseum row, then gap_enemy_ids (never a
non-variant id); a wave longer than every template team gets extra positions; buffs listed as dropped; «unknown enemy
stops»: a wiki name with no Coliseum variant id exits 1 naming month, round and name unless it is in UNRESOLVED.
Part 3 (Task 2): «gen ids disjoint» (2116MMNN / 2117MMNN = make-colosseum.js for every generated month), a 2017 fixture month
whose waves equal the wiki rows, «named enemies» (Ringmaster 20097, Enraged Elk 20184, rule `named`), SET_OVERRIDES (2017-05 =
JP 2016-10) and «2016 output unchanged» (fixture 2016-08 files = sha256 of the Part 2 generator, also next to a 2017 month).
"""
import contextlib
import hashlib
import io
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import gen_colosseum_stages as gcs  # noqa: E402
import mapfile  # noqa: E402
import stage_writer  # noqa: E402

fails = []
GOLDEN_2016 = {'cl_stg21160801.bin': '64bf2060ef46fec5', 'cl_stg21160801_00.bin': '48cb22e9cf476907',
               'cl_stg21160802.bin': '1ab02ab3186d99ac', 'cl_stg21160802_00.bin': 'ecca064b7fa7ed46'}


def check(cond, what):
    if not cond:
        fails.append(what)


def team_rec(facing=1):
    r = [0] * 17
    r[2], r[6], r[7], r[8] = 128, 1, 1, facing
    return struct.pack('<17i', *r)


def write_template(folder, sid, teams, start=(990, 812)):
    """a JP-like Coliseum stage: STG v17 + one MAP part (room OC_0001_00_00), teams = [[(x, y), ...] per team]"""
    head = bytearray(0x34)
    head[0:4] = b'MAP\0'
    struct.pack_into('<2i', head, 4, 17, 40)
    areas, ens, uid = [], [], 1
    for pts in teams:
        rec = bytearray(team_rec())
        struct.pack_into('<2i', rec, 0, len(ens), len(pts))
        struct.pack_into('<i', rec, 0x14, uid)
        areas.append(bytes(rec))
        uid += 1
        for x, y in pts:
            ens.append((x, y, 20001, 0, 1, 1, 1, uid))
            uid += 1
    part = stage_writer.map_part(bytes(head), 'OC_0001_00_00', [], areas, ens, [])
    stg = struct.pack('<16i', 4674643, 17, 1, start[0], start[1], 2, 0, 13, len(areas), len(ens), 0, 0, 0, 0, 0, 0)
    open(os.path.join(folder, 'cl_stg%08d.bin' % sid), 'wb').write(stg)
    open(os.path.join(folder, 'cl_stg%08d_00.bin' % sid), 'wb').write(part)


def load(folder, sid):
    files = {(sid, None): os.path.join(folder, 'cl_stg%08d.bin' % sid), (sid, 0): os.path.join(folder, 'cl_stg%08d_00.bin' % sid)}
    return mapfile.load_stage(files, sid)


# ---- gen ids disjoint: the ids of server/make-colosseum.js GEN_STAGE_IDS (node) = the Python ones for every generated month;
# 2016 = 2116MMNN, 2017 = 2117MMNN, the two sets disjoint (2017-08 .. 11 share their month numbers with 2016-08 .. 11)
check(gcs.MONTHS == ['2016-08', '2016-09', '2016-10', '2016-11', '2017-06', '2017-07', '2017-08', '2017-09', '2017-10',
                     '2017-11', '2017-12'], 'MONTHS %s' % gcs.MONTHS)
node = subprocess.run(['node', '-e', 'const c = require(process.argv[1]); console.log(JSON.stringify(JSON.parse(process.argv[2])'
                       '.map(c.GEN_STAGE_IDS)))', os.path.join(REPO, 'server', 'make-colosseum.js'), json.dumps(gcs.MONTHS)],
                      capture_output=True, text=True)
check(node.returncode == 0 and json.loads(node.stdout) == [gcs.gen_stage_ids(m) for m in gcs.MONTHS],
      'GEN_STAGE_IDS of make-colosseum.js: %s %s' % (node.stdout.strip()[:80], node.stderr.strip()[:200]))
ids16 = {i for m in gcs.MONTHS if m < '2017' for i in gcs.gen_stage_ids(m)}
ids17 = {i for m in gcs.MONTHS if m > '2017' for i in gcs.gen_stage_ids(m)}
check(len(ids16) == 40 and len(ids17) == 70 and not ids16 & ids17, 'gen ids disjoint: %d / %d / %s' % (len(ids16), len(ids17), ids16 & ids17))
check(all(i // 10000 == 2116 for i in ids16) and all(i // 10000 == 2117 for i in ids17), 'gen ids 2116MMNN / 2117MMNN')
check(gcs.gen_stage_ids('2017-08')[:2] == [21170801, 21170802], '2017-08 ids %s' % gcs.gen_stage_ids('2017-08')[:2])
try:
    gcs.gen_stage_ids('2017-05')
    check(False, '2017-05 (an original JP set) has no generated ids')
except ValueError:
    pass

# ---- resolver: nearest original WW month (variant ids named by 1.1.3 rows), then 1.1.3 Coliseum row, then gap ids
names113 = {1: 'Shadow', 20001: 'Shadow', 20012: 'Possessor', 20009: 'Bandit', 20999: 'Shadow', 21020: 'Mega-Shadow',
            20033: 'Neoshadow'}
cl_sets = {'2015-07': {20001: 3, 1: 9, 20012: 1}, '2016-07': {20999: 5}, '2016-05': {20033: 2}}
ww2jp = {'2016-04': '2015-07', '2017-02': '2016-07', '2016-12': '2016-05'}
gap = [{'id': 21581, 'name': 'Gap Knight'}, {'id': 161020017, 'name': 'Far Knight'}, {'id': 20285, 'name': 'Two Knight'},
       {'id': 20286, 'name': 'Two Knight'}]
res = gcs.Resolver(cl_sets, ww2jp, names113, gap)
check(res.resolve('Shadow', '2016-08')[:2] == (20001, 'wwMonth'), 'nearest WW month (2016-04, 4 months) %r' % (res.resolve('Shadow', '2016-08'),))
check(res.resolve('Shadow', '2016-12')[:2] == (20999, 'wwMonth'), 'nearest WW month (2017-02) %r' % (res.resolve('Shadow', '2016-12'),))
check(res.resolve('Bandit', '2016-08')[:2] == (20009, 'row113'), '1.1.3 Coliseum row %r' % (res.resolve('Bandit', '2016-08'),))
check(res.resolve('gap knight', '2016-08')[:2] == (21581, 'gap'), 'gap_enemy_ids %r' % (res.resolve('gap knight', '2016-08'),))
check(res.resolve('Far Knight', '2016-08') is None, 'non-variant gap id refused')
check(res.resolve('Two Knight', '2016-08') is None, 'ambiguous gap name refused')
check(res.resolve('Nobody', '2016-08') is None, 'unknown name')

# ---- named enemies (controller ruling, PART3_AUDIT §3): consulted before every other rule, reported as `named`
check(gcs.NAMED == {'Ringmaster': 20097, 'Enraged Elk': 20184}, 'NAMED %s' % gcs.NAMED)
check(res.resolve('Ringmaster', '2017-06')[:2] == (20097, 'named'), 'named Ringmaster %r' % (res.resolve('Ringmaster', '2017-06'),))
check(res.resolve('enraged  elk', '2017-09')[:2] == (20184, 'named'), 'named Enraged Elk %r' % (res.resolve('enraged  elk', '2017-09'),))
res_n = gcs.Resolver({'2015-07': {20555: 1}}, {'2016-04': '2015-07'}, {20555: 'Ringmaster'}, [])
check(res_n.resolve('Ringmaster', '2016-08')[:2] == (20097, 'named'), 'named before wwMonth %r' % (res_n.resolve('Ringmaster', '2016-08'),))
# the proven original WW set of 2017-05 (JP 2016-10, wiki-row match below SET_MATCH) is a set of the resolver
check(gcs.ww2jp_of({'2017-05': {'best': [[0.47, '2016-10']]}, '2016-04': {'best': [[0.98, '2015-07']]},
                    '2016-08': {'best': [[0.12, '2016-07']]}}) == {'2017-05': '2016-10', '2016-04': '2015-07'}, 'SET_OVERRIDES')

wiki = {'2016-08': {
    '1': [{'enemies': [['Shadow', 3]], 'buffs': []},
          {'enemies': [['Possessor', 1], ['Shadow', 1]], 'buffs': [['def', '', '2']]}],
    '2': [{'enemies': [['Shadow', 5]], 'buffs': []},
          {'enemies': [['Possessor', 1]], 'buffs': []},
          {'enemies': [['Bandit', 2]], 'buffs': [['Str', '', '1']]},
          {'enemies': [['Mega-Shadow', 1]], 'buffs': []}]}}

t = tempfile.mkdtemp()
try:
    tpl = os.path.join(t, 'tpl')
    os.makedirs(tpl)
    write_template(tpl, 20150701, [[(2740, 874), (2600, 870), (2500, 860)], [(1928, 894), (1660, 876)], [(1460, 878)]])
    write_template(tpl, 20150702, [[(2430, 874), (2586, 870), (2756, 890)], [(1792, 884), (2118, 872)]])
    write_template(tpl, 20150703, [[(2000, 800), (2100, 810)], [(1500, 820)], [(1300, 830), (1200, 840)], [(900, 850)]])
    pool = gcs.template_pool(tpl)
    check(sorted(p['stageId'] for p in pool) == [20150701, 20150702, 20150703], 'template pool %s' % [p['stageId'] for p in pool])
    res2 = gcs.Resolver({'2015-07': {20001: 1, 20012: 1}, '2016-05': {21020: 1}}, {'2016-04': '2015-07', '2016-12': '2016-05'},
                        names113, [])
    out = os.path.join(t, 'out')
    os.makedirs(out)
    open(os.path.join(out, 'cl_stg21160899.bin'), 'wb').write(b'stale')
    rep = gcs.generate(wiki, ['2016-08'], res2, pool, out)
    ids = gcs.gen_stage_ids('2016-08')[:2]
    names = sorted(f for f in os.listdir(out) if f.startswith('cl_stg'))
    check(names == sorted(['cl_stg%08d.bin' % i for i in ids] + ['cl_stg%08d_00.bin' % i for i in ids]),
          'file names = GEN_STAGE_IDS, stale removed: %s' % names)
    check(rep['summary']['stages'] == 2 and not rep['summary']['unresolved'], 'summary %s' % rep['summary'])
    st = {s['stageId']: s for s in rep['stages']}
    for rnd, sid in ((1, ids[0]), (2, ids[1])):
        stg, parts = load(out, sid)
        bad, _ = mapfile.check_stage(stg, parts)
        check(not bad, 'check_stage %s: %s' % (sid, bad))
        check(len(parts) == 1 and parts[0]['room'] == 'OC_0001_00_00', 'one part in OC_0001_00_00 (%s)' % sid)
        p = parts[0]
        rows = wiki['2016-08'][str(rnd)]
        check(len(p['teams']) == len(rows) == stg['teams_total'], 'waves %s: %d / wiki %d' % (sid, len(p['teams']), len(rows)))
        got = [[e['enemyId'] for e in p['enemies'][tm['first']:tm['first'] + tm['count']]] for tm in p['teams']]
        want = [sum(([res2.resolve(n, '2016-08')[0]] * c for n, c in w['enemies']), []) for w in rows]
        check(got == want, 'wave members %s: %s / %s' % (sid, got, want))
        check({e['level'] for e in p['enemies']} == {rnd}, 'level = round %d: %s' % (rnd, {e['level'] for e in p['enemies']}))
        check(all(e['reward'] == 1 and e['f4'] == 1 for e in p['enemies']), 'reward 1 (%s)' % sid)
        uids = [x for tm in p['teams'] for x in [tm['uid']] + [e['uid'] for e in p['enemies'][tm['first']:tm['first'] + tm['count']]]]
        check(uids == list(range(1, len(uids) + 1)), 'uids team then members %s: %s' % (sid, uids))
        check(len({(e['x'], e['y']) for e in p['enemies']}) == len(p['enemies']), 'distinct positions %s' % sid)
        check(stg['start'] == (990, 812) and stg['parts'] == 1, 'STG start of the template (%s)' % sid)
    check(st[ids[0]]['template'] == 20150702 and st[ids[0]]['extraPositions'] == 0,
          'best-fit template (2 waves [3, 2]: the only 2-team one): %s' % st[ids[0]]['template'])
    check(st[ids[1]]['template'] == 20150703 and st[ids[1]]['extraPositions'] == 3,
          'short template: extra positions %s %s' % (st[ids[1]]['template'], st[ids[1]].get('extraPositions')))
    check(st[ids[0]]['buffsDropped'] == [{'wave': 2, 'buffs': [['def', '', '2']]}], 'buffs dropped %s' % st[ids[0]]['buffsDropped'])
    check(st[ids[1]]['waves'][2]['enemies'][0][:4] == ['Bandit', 2, 20009, 'row113'], 'rule in the report %s' % st[ids[1]]['waves'][2])
    check(rep['summary']['enemyIds'] == {'2016-08': [20001, 20009, 20012, 21020]}, 'ids per month %s' % rep['summary']['enemyIds'])

    # ---- 2016 output unchanged (Part 3): the fixture 2016-08 files are byte-identical to the Part 2 generator's (sha256 taken
    # with the Part 2 code), also when 2017 months are generated in the same run
    got16 = {f: hashlib.sha256(open(os.path.join(out, f), 'rb').read()).hexdigest()[:16] for f in names}
    check(got16 == GOLDEN_2016, '2016 output unchanged: %s' % got16)

    # ---- a 2017 month (2117MMNN) generated in the same run as 2016-08: waves = the wiki rows, named enemies, 2016 unchanged
    wiki17 = dict(wiki)
    wiki17['2017-06'] = {
        '1': [{'enemies': [['Shadow', 2], ['Possessor', 1]], 'buffs': [['atk', '', '1']]},
              {'enemies': [['Enraged Elk', 1]], 'buffs': []}],
        '10': [{'enemies': [['Shadow', 3]], 'buffs': []}, {'enemies': [['Ringmaster', 1]], 'buffs': []}]}
    out3 = os.path.join(t, 'out3')
    rep17 = gcs.generate(wiki17, ['2016-08', '2017-06'], res2, pool, out3)
    got16b = {f: hashlib.sha256(open(os.path.join(out3, f), 'rb').read()).hexdigest()[:16] for f in names}
    check(got16b == GOLDEN_2016, '2016 output unchanged next to 2017: %s' % got16b)
    ids17 = gcs.gen_stage_ids('2017-06')
    names17 = sorted(f for f in os.listdir(out3) if f.startswith('cl_stg21170'))
    check(names17 == sorted('cl_stg%08d%s.bin' % (i, x) for i in (ids17[0], ids17[9]) for x in ('', '_00')),
          '2017 file names = 2117MMNN: %s' % names17)
    for rnd, sid in ((1, ids17[0]), (10, ids17[9])):
        stg, parts = load(out3, sid)
        bad, _ = mapfile.check_stage(stg, parts)
        check(not bad and len(parts) == 1 and parts[0]['room'] == 'OC_0001_00_00', '2017 stage %s: %s' % (sid, bad))
        p = parts[0]
        got = [[e['enemyId'] for e in p['enemies'][tm['first']:tm['first'] + tm['count']]] for tm in p['teams']]
        want = [sum(([res2.resolve(n, '2017-06')[0]] * c for n, c in w['enemies']), []) for w in wiki17['2017-06'][str(rnd)]]
        check(got == want, '2017 wave members %s: %s / %s' % (sid, got, want))
        check({e['level'] for e in p['enemies']} == {rnd}, '2017 level = round %d' % rnd)
    st17 = {s['stageId']: s for s in rep17['stages']}
    check(st17[ids17[0]]['waves'][1]['enemies'][0][:4] == ['Enraged Elk', 1, 20184, 'named'], 'named in the report %s' % st17[ids17[0]]['waves'])
    check(st17[ids17[9]]['waves'][1]['enemies'][0][:4] == ['Ringmaster', 1, 20097, 'named'], 'named in the report %s' % st17[ids17[9]]['waves'])
    check(rep17['summary']['rules'].get('named') == ['Enraged Elk = 20184', 'Ringmaster = 20097'], 'named rule %s' % rep17['summary']['rules'])
    check(st17[ids17[0]]['buffsDropped'] == [{'wave': 1, 'buffs': [['atk', '', '1']]}], '2017 buffs dropped')
    check(rep17['summary']['stages'] == 4 and sorted(rep17['summary']['enemyIds']) == ['2016-08', '2017-06'], 'summary 2016 + 2017')

    # ---- unknown enemy stops (main, exit 1, month + round + name), unless listed in UNRESOLVED
    wiki_bad = json.loads(json.dumps(wiki))
    wiki_bad['2016-08']['2'][1]['enemies'].append(['Nobody Knows', 2])
    paths = {}
    for k, v in (('wiki', wiki_bad), ('cl', {}), ('sets', {}), ('gap', []), ('e113', [{'enemyId': i, 'name': n} for i, n in names113.items() if i != 20999])):
        paths[k] = os.path.join(t, k + '.json')
        json.dump(v, open(paths[k], 'w', encoding='utf-8'))
    args = ['--wiki', paths['wiki'], '--cl-sets', paths['cl'], '--sets', paths['sets'], '--gap', paths['gap'],
            '--enemy113', paths['e113'], '--templates', tpl, '--out', os.path.join(t, 'out2'), '--months', '2016-08']
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        rc = gcs.main(args)
    check(rc == 1 and '2016-08' in buf.getvalue() and 'round 2' in buf.getvalue() and 'Nobody Knows' in buf.getvalue(),
          'unknown enemy stops: rc %s, %r' % (rc, buf.getvalue()[-300:]))
    check(not [f for f in os.listdir(os.path.join(t, 'out2')) if f.startswith('cl_stg')] if os.path.isdir(os.path.join(t, 'out2')) else True,
          'nothing written when a name is unresolved')
    saved = dict(gcs.UNRESOLVED)
    gcs.UNRESOLVED['Nobody Knows'] = 'test: no Coliseum variant id known'
    try:
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            rc = gcs.main(args)
        check(rc == 0, 'UNRESOLVED name lets the run go on: rc %s %r' % (rc, buf.getvalue()[-300:]))
        rep3 = json.load(open(os.path.join(t, 'out2', 'report.json'), encoding='utf-8'))
        check(rep3['summary']['unresolved'] == [{'month': '2016-08', 'round': 2, 'wave': 2, 'name': 'Nobody Knows', 'count': 2,
                                                 'why': 'test: no Coliseum variant id known'}],
              'unresolved listed %s' % rep3['summary']['unresolved'])
        stg, parts = load(os.path.join(t, 'out2'), gcs.gen_stage_ids('2016-08')[1])
        check(stg['enemies_total'] == 9, 'listed name left out of its wave (%d)' % stg['enemies_total'])
    finally:
        gcs.UNRESOLVED.clear()
        gcs.UNRESOLVED.update(saved)
    check(gcs.UNRESOLVED == {}, 'UNRESOLVED starts empty')
finally:
    shutil.rmtree(t)

print('FAIL: ' + '; '.join(fails) if fails else 'OK: gen_colosseum_stages')
sys.exit(1 if fails else 0)
