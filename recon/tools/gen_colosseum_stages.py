"""Generated Coliseum round stages of the WW seasons with no original stage set (Coliseum Part 2 Task 2, Part 3 Task 2).

    python -I recon/tools/gen_colosseum_stages.py [--wiki F] [--cl-sets F] [--sets F] [--gap F] [--enemy113 F]
                                                  [--templates D] [--out D] [--months 2016-08,2016-09,...]

WW 2016-08 .. 2016-11 and 2017-06 .. 2017-12 have no original stage set on any disk (docs/notes/coliseum.md «Gap research»;
the 1.1.3 / ReLux rows point to JP sets WW did not play or that are absent from JP 4.3.1). Their rounds are rebuilt from the
khuxwiki lineups (--wiki: month -> round -> waves [{enemies: [[name, count]], buffs: [...]}]; one wiki row = one wave, proven
exact on 180 rounds; 10/10 rounds in every 2017 month) as the stage ids of server/make-colosseum.js GEN_STAGE_IDS(month) =
21YYMMNN (YY = 16 / 17 / 19, NN = round 01..10; the 2017 ids never those of 2016-08 .. 11): cl_stg<id>.bin + cl_stg<id>_00.bin,
room OC_0001_00_00, one part, one team per wave, every enemy level = round number (1..10; the client adds the tier levels).
The default --months is every generated month (MONTHS); the 2016 files do not depend on the 2017 months.

Enemy ids: original Coliseum variant ids only (20000 + base, 21xxx / 22xxx), never a substitute model. A wiki name resolves by,
in order (rule name in the report):
  named    NAMED (name -> id): the Coliseum variant ids of names no source below can resolve, by ruling (Coliseum Part 3:
           Ringmaster 2017-06 R10 = 20097, Enraged Elk 2017-09 R10 = 20184, rule rows from the bases 97 / 184; PART3_AUDIT §3);
  wwMonth  the variant id with that 1.1.3 name used by the stage set of the nearest original WW month (--sets: WW month ->
           JP 4.3.1 set with match >= SET_MATCH, plus SET_OVERRIDES; --cl-sets: the parsed JP 4.3.1 cl_stg files); the most
           used id of that month;
  row113   the only 1.1.3 Coliseum variant row (--enemy113) with that name;
  gap      the only Coliseum variant id of --gap (gap_enemy_ids.json, the 2026-11-05 research) with that name.
A name resolved by none stops the run (exit 1, month / round / wave / name printed, nothing written) unless it is listed in
UNRESOLVED (name -> why): then it is left out of its wave and listed in the report.

Positions: the template is a JP 4.3.1 Coliseum stage (--templates: the JP stage/ folder; one part, room OC_0001_00_00, no
0x20 teams) with as many teams as the round has waves, the best fit: least missing member positions, then least spare ones,
then the lowest stage id. Its STG header (start, facing, version) and team records are kept, with the counts and uids
renumbered (team uid, then its members, as the originals); members take the template team's positions in file order; a
wave longer than its template team gets extra positions EXTRA_DX apart along x from the team's own ones (clamped to the
template's x range; counted as extraPositions in the report).
Buffs: the enemy record (x, y, enemyId, f3, f4, level, reward, uid) carries no buff, nor does the event stage writer: every
wiki buff is listed per stage as dropped (buffsDropped).
The part is written by stage_writer.map_part (the writer of gen_story_maps.py). Every stage is read back with mapfile.py
(check_stage). Output: <out>/cl_stg*.bin (stale cl_stg files there removed) + <out>/report.json. Generated files are local
build products (never committed); import_colosseum_stages.py takes them as its third source (--gen).
"""
import argparse
import collections
import json
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import import_colosseum_stages as ics  # noqa: E402
import mapfile  # noqa: E402
from stage_writer import map_part  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
D = os.path.dirname(os.path.dirname(REPO))
SRC = os.path.join(D, 'private', 'events', 'sources', 'coliseum')
MONTHS = ['2016-08', '2016-09', '2016-10', '2016-11', '2017-06', '2017-07', '2017-08', '2017-09', '2017-10', '2017-11', '2017-12', '2019-07']
ROOM = 'OC_0001_00_00'
SET_MATCH = 0.7     # WW month -> JP set match of ww_to_jp_stage_sets.json taken as the original set (the served ones: 0.7 .. 1.0)
EXTRA_DX = 120      # x step of the extra positions of a wave longer than its template team
# wiki names with no known Coliseum variant id, allowed to be left out of their wave (name -> why). Empty: every name resolves.
UNRESOLVED = {}
# names no rule below resolves, by ruling (Coliseum Part 3, PART3_AUDIT §3: no Coliseum variant id in any source; the rows of
# these ids are the variant rule rows of the bases 97 / 184, server/make-colosseum.js); consulted before every other rule
NAMED = {'Ringmaster': 20097, 'Enraged Elk': 20184}
# 2019-07 (Coliseum Part 4 Task 3, user 27-11): no stage file exists anywhere; every enemy is a full raw ReLux row of the 2019 shape
# (ids 60000-62999, private ENEMIES_2019_07.md, 13 of 13 verified against the khuxwiki lineup and its round rules). The month
# resolves its names ONLY by this table (rule `named19`), never by another source: no name may resolve to another id.
MONTH_NAMED = {'2019-07': {'Behemoth Ω': 61024, 'Ogre': 61530, 'Heat Saber': 61525, 'Queen Bee Ω': 61026,
                           'Gear Golem': 61548, 'Volcanic Lord': 61540, 'Gummi Hound': 60266, 'Gummi Hammer': 60126,
                           'Circus Balloon': 60095, 'Mega-Shadow': 61020, 'Eliminator': 60249, 'Scourge Spider': 61032,
                           'Wyvern': 60137}}
# WW month -> JP 4.3.1 set proven by other evidence where the wiki-row match is below SET_MATCH: 2017-05 = JP 20161001..10
# (match 0.48; footage + JP wiki, coliseum COLISEUM.md 1g / PART3_AUDIT §3; ReLux row 2100 agrees)
SET_OVERRIDES = {'2017-05': '2016-10'}


def gen_stage_ids(month):
    """= server/make-colosseum.js GEN_STAGE_IDS: 21YYMMNN, NN = round 1..10"""
    if month not in MONTHS:
        raise ValueError('%s has no generated stage set' % month)
    return [21000000 + int(month[2:4]) * 10000 + int(month[5:7]) * 100 + i + 1 for i in range(10)]


def is_variant(i):
    return 20000 <= i < 23000


def norm(name):
    return ' '.join(str(name or '').lower().split())


def month_index(m):
    return int(m[:4]) * 12 + int(m[5:7]) - 1


class Resolver:
    """cl_sets {JP month: {enemyId: uses}}, ww2jp {WW month: JP month}, names113 {enemyId: name}, gap [{id, name}]"""

    def __init__(self, cl_sets, ww2jp, names113, gap):
        self.months = []
        for ww, jp in sorted(ww2jp.items()):
            ids = collections.defaultdict(collections.Counter)
            for i, n in (cl_sets.get(jp) or {}).items():
                if is_variant(int(i)) and int(i) in names113:
                    ids[norm(names113[int(i)])][int(i)] += n
            self.months.append((ww, jp, ids))
        self.row113 = collections.defaultdict(set)
        for i, n in names113.items():
            if is_variant(i):
                self.row113[norm(n)].add(i)
        self.gap = collections.defaultdict(set)
        for g in gap:
            if g.get('name') and is_variant(int(g['id'])):
                self.gap[norm(g['name'])].add(int(g['id']))

    def resolve(self, name, month):
        """-> (enemyId, rule, detail) or None"""
        k = norm(name)
        if month in MONTH_NAMED:
            table = {norm(n): i for n, i in MONTH_NAMED[month].items()}
            return (table[k], 'named19', 'ruling 27-11 (ReLux 6xxxx row)') if k in table else None
        named = {norm(n): i for n, i in NAMED.items()}
        if k in named:
            return named[k], 'named', 'ruling (PART3_AUDIT §3)'
        near = sorted((abs(month_index(ww) - month_index(month)), month_index(ww), ww, jp, ids)
                      for ww, jp, ids in self.months if ww != month)
        for _, _, ww, jp, ids in near:
            if ids.get(k):
                i = min(ids[k], key=lambda x: (-ids[k][x], x))
                return i, 'wwMonth', 'WW %s (JP set %s)' % (ww, jp)
        if len(self.row113.get(k, ())) == 1:
            return min(self.row113[k]), 'row113', '1.1.3 Coliseum row'
        if len(self.gap.get(k, ())) == 1:
            return min(self.gap[k]), 'gap', 'gap_enemy_ids'
        return None


def template_pool(folder):
    """JP Coliseum stages usable as templates: one part in ROOM, client layout, coherent, teams with no 0x20 flag"""
    files = ics.iter_cl_files(folder)
    pool = []
    for sid in sorted({k[0] for k in files}):
        try:
            stg, parts = mapfile.load_stage(files, sid)
            bad, _ = mapfile.check_stage(stg, parts)
        except (mapfile.FormatError, OSError):
            continue
        if bad or len(parts) != 1 or parts[0]['room'] != ROOM or not stg['client_layout'] or not parts[0]['client_layout']:
            continue
        p = parts[0]
        if not p['teams'] or any(t['flags'] & 0x20 or t['count'] < 1 for t in p['teams']) or stg['alt_starts']:
            continue
        stg_b, part_b = open(files[(sid, None)], 'rb').read(), open(files[(sid, 0)], 'rb').read()
        base = p['offsets']['enemies'] + 8
        teams = [{'rec': part_b[base + 0x44 * k:base + 0x44 * (k + 1)],
                  'pts': [(e['x'], e['y']) for e in p['enemies'][t['first']:t['first'] + t['count']]]}
                 for k, t in enumerate(p['teams'])]
        xs = [e['x'] for e in p['enemies']]
        pool.append({'stageId': sid, 'stg': stg_b[:64], 'head': part_b[:0x34], 'teams': teams, 'xrange': (min(xs), max(xs))})
    return pool


def pick_template(pool, counts):
    def key(t):
        sizes = [len(tm['pts']) for tm in t['teams']]
        return (sum(max(0, c - s) for c, s in zip(counts, sizes)), sum(max(0, s - c) for c, s in zip(counts, sizes)),
                t['stageId'])
    cands = [t for t in pool if len(t['teams']) == len(counts)]
    if not cands:
        raise ValueError('no template stage with %d teams' % len(counts))
    return min(cands, key=key)


def positions(pts, need, lo, hi, taken):
    out = list(pts[:need])
    k = 0
    while len(out) < need:
        if k > 1000:
            raise ValueError('no free extra position near %s' % pts)
        bx, by = pts[k % len(pts)]
        step = k // len(pts) + 1
        for dx in (EXTRA_DX * step, -EXTRA_DX * step):
            p = (min(hi, max(lo, bx + dx)), by)
            if p not in taken and p not in out:
                out.append(p)
                break
        k += 1
    return out


def build_stage(tpl, waves, level):
    """waves: [[enemyId, ...] per wave] -> (STG bytes, MAP bytes, extra positions)"""
    taken = {p for tm in tpl['teams'] for p in tm['pts']}
    areas, ens, uid, extra = [], [], 1, 0
    for tm, ids in zip(tpl['teams'], waves):
        pts = positions(tm['pts'], len(ids), tpl['xrange'][0], tpl['xrange'][1], taken - set(tm['pts']))
        extra += max(0, len(ids) - len(tm['pts']))
        taken |= set(pts)
        rec = bytearray(tm['rec'])
        struct.pack_into('<2i', rec, 0, len(ens), len(ids))
        struct.pack_into('<i', rec, 0x14, uid)
        areas.append(bytes(rec))
        uid += 1
        for (x, y), eid in zip(pts, ids):
            ens.append((x, y, eid, 0, 1, level, 1, uid))
            uid += 1
    stg = bytearray(tpl['stg'])
    struct.pack_into('<2i', stg, 8 * 4, len(areas), len(ens))
    return bytes(stg), map_part(tpl['head'], ROOM, [], areas, ens, []), extra


class UnresolvedError(ValueError):
    def __init__(self, rows):
        super().__init__('%d unresolved enemy names' % len(rows))
        self.rows = rows


def generate(wiki, months, resolver, pool, out):
    """-> report; UnresolvedError (nothing written) when a wiki name resolves to no Coliseum variant id and is not in
    UNRESOLVED"""
    plan, stop, listed = [], [], []
    for month in months:
        ids = gen_stage_ids(month)
        for rnd in sorted(wiki[month], key=int):
            r = int(rnd)
            waves, wave_ids, dropped = [], [], []
            for w_i, w in enumerate(wiki[month][rnd], 1):
                row, members = [], []
                for name, n in w['enemies']:
                    got = resolver.resolve(name, month)
                    miss = {'month': month, 'round': r, 'wave': w_i, 'name': name, 'count': n}
                    if got:
                        row.append([name, n, got[0], got[1], got[2]])
                        members += [got[0]] * n
                    elif name in UNRESOLVED:
                        listed.append(dict(miss, why=UNRESOLVED[name]))
                    else:
                        stop.append(miss)
                if w.get('buffs'):
                    dropped.append({'wave': w_i, 'buffs': w['buffs']})
                if members:
                    waves.append({'wave': w_i, 'enemies': row})
                    wave_ids.append(members)
            plan.append((month, r, ids[r - 1], waves, wave_ids, dropped))
    if stop:
        raise UnresolvedError(stop)
    os.makedirs(out, exist_ok=True)
    stages, keep = [], set()
    for month, r, sid, waves, wave_ids, dropped in plan:
        if not wave_ids:
            raise ValueError('%s round %d: no wave left' % (month, r))
        tpl = pick_template(pool, [len(w) for w in wave_ids])
        stg_b, part_b, extra = build_stage(tpl, wave_ids, r)
        stg, parts = mapfile.load_stage({(sid, None): stg_b, (sid, 0): part_b}, sid)
        bad, warn = mapfile.check_stage(stg, parts)
        if bad or warn:
            raise ValueError('stage %d does not read back: %s' % (sid, bad + warn))
        names = ics.client_names(sid, 1)
        for name, data in zip(names, (stg_b, part_b)):
            with open(os.path.join(out, name), 'wb') as f:
                f.write(data)
            keep.add(name)
        stages.append({'stageId': sid, 'month': month, 'round': r, 'level': r, 'template': tpl['stageId'],
                       'extraPositions': extra, 'waves': waves, 'enemyIds': sorted({i for w in wave_ids for i in w}),
                       'buffsDropped': dropped, 'files': names})
    removed = []
    for f in os.listdir(out):
        if ics.CL_RE.match(f) and f not in keep:
            os.remove(os.path.join(out, f))
            removed.append(f)
    by_month, rules = collections.defaultdict(set), collections.defaultdict(set)
    for st in stages:
        by_month[st['month']] |= set(st['enemyIds'])
        for w in st['waves']:
            for name, _, eid, rule, _ in w['enemies']:
                rules[rule].add('%s = %d' % (name, eid))
    return {'summary': {'stages': len(stages), 'files': len(keep), 'removed': removed,
                        'enemyIds': {m: sorted(v) for m, v in by_month.items()},
                        'allEnemyIds': sorted(set().union(*by_month.values())) if by_month else [],
                        'rules': {k: sorted(v) for k, v in sorted(rules.items())},
                        'buffsDropped': sum(len(w['buffs']) for st in stages for w in st['buffsDropped']),
                        'extraPositions': {str(st['stageId']): st['extraPositions'] for st in stages if st['extraPositions']},
                        'unresolved': listed},
            'stages': stages}


def cl_sets_of(cl):
    """cl_stages_jp431.json -> {JP month: {enemyId: uses}}"""
    out = collections.defaultdict(collections.Counter)
    for sid, v in cl.items():
        if len(sid) != 8:
            continue
        for p in (v.get('parts') or {}).values():
            for e in p.get('enemies') or []:
                out['%s-%s' % (sid[:4], sid[4:6])][e['enemyId']] += 1
    return out


def ww2jp_of(sets):
    out = {ww: v['best'][0][1] for ww, v in sets.items() if v.get('best') and v['best'][0][0] >= SET_MATCH}
    out.update(SET_OVERRIDES)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument('--wiki', default=os.path.join(SRC, 'khuxwiki_rounds_ww.json'))
    ap.add_argument('--cl-sets', default=os.path.join(SRC, 'cl_stages_jp431.json'))
    ap.add_argument('--sets', default=os.path.join(SRC, 'ww_to_jp_stage_sets.json'))
    ap.add_argument('--gap', default=os.path.join(SRC, 'gap_enemy_ids.json'))
    ap.add_argument('--enemy113', default=os.path.join(D, 'external', 'thethiny_2026-10-13', 'KHUx-Server', 'data', 'enemy.json'))
    ap.add_argument('--templates', help='JP 4.3.1 stage/ folder (default: private_tools jp_data/stage)')
    ap.add_argument('--out', default=os.path.join(D, 'stage_gen', 'colosseum_gen'))
    ap.add_argument('--months', default=','.join(MONTHS))
    a = ap.parse_args(argv)
    if not a.templates:
        import private_tools
        a.templates = private_tools.local_path('jp_data', 'stage')
    rd = lambda p: json.load(open(p, encoding='utf-8'))  # noqa: E731
    resolver = Resolver(cl_sets_of(rd(a.cl_sets)), ww2jp_of(rd(a.sets)), {r['enemyId']: r['name'] for r in rd(a.enemy113)},
                        rd(a.gap))
    months = [m for m in a.months.split(',') if m]
    try:
        rep = generate(rd(a.wiki), months, resolver, template_pool(a.templates), a.out)
    except UnresolvedError as e:
        for m in e.rows:
            print('unresolved: %s round %d wave %d: %s x%d (no Coliseum variant id; list it in UNRESOLVED or find its id)' % (
                m['month'], m['round'], m['wave'], m['name'], m['count']))
        return 1
    with open(os.path.join(a.out, 'report.json'), 'w', encoding='utf-8') as f:
        json.dump(rep, f, indent=1, ensure_ascii=False)
    s = rep['summary']
    print('colosseum generated stages: %d (%d files) -> %s; rules %s; buffs dropped %d; extra positions %s; unresolved %d; '
          'removed %d old' % (s['stages'], s['files'], a.out, {k: len(v) for k, v in s['rules'].items()}, s['buffsDropped'],
                              s['extraPositions'] or 0, len(s['unresolved']), len(s['removed'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
