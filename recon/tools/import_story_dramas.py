"""Story dialogues and cutscenes of Quests 1-525 missing from the served resources (I-014), from the 2016 global package.

    python -I recon/tools/import_story_dramas.py <served names.tsv> <bundle2016> <stage_dec.json> <output>
        [--report r.json] [--allow id[,id...]] [--max 525]

The story rows 1-525 (thethiny stage_dec.json, the rows make-game-tables.js adds) cite before/after dramas: SEQ dialogue
scripts img/light/SEQ/<id>.l (1xxxxxx) or lwf cutscenes lwf/drama/<id>/ (2xxxxxx). A drama the resources lack crashes the
client when the quest starts (Quest 8, 1010201/1010301), so make-game-tables.js drops it; it reads the generated pack too
(KHUX_GEN_PACK, default stage_gen\\files), so what this tool writes there is served after the next master run.

SEQ script (client 4.3.1): records of 5 int32 (command, slot, a, b, c). Command 4002 loads b into a slot: 5001 music
audio/<b>.akb, 5003 background img/light/BG/<b>.png, 5004 narration img/light/NARRATION/<b>.png, 5008-5012 characters
img/light/NPC/<b>.png. Command 4004 shows line c (text/drama/<200000000 + c>.txt) said by b (name text/drama/<200000000 +
b>.txt, 0 = narration). The other commands (4000/4001 start/end, 4003 layer, 4005 effect, 4006 wait) cite no file.
lwf cutscene: the folder's files of files.tsv; the .lwf names its textures (<id>_<hex>.png), all must be there.

Each drama not served is copied with the files it cites that the served resources lack (the current revision of files.tsv,
sha1 checked: files\\ must be the current row, dup 0). A drama citing a file present nowhere is held (report "held"),
unless its id is in --allow (the original data cite it too: 1040501 asks for BG 2014, absent from the 2016 package and
JP 4.3.1 alike). Texts with Japanese are copied and reported ("japanese"). Dramas with no 2016 source: "missing".
"""
import hashlib
import json
import os
import re
import struct
import sys

SLOT_DIR = {5001: 'audio/%d.akb', 5003: 'img/light/BG/%d.png', 5004: 'img/light/NARRATION/%d.png'}
SLOT_DIR.update({s: 'img/light/NPC/%d.png' for s in range(5008, 5013)})
KNOWN = {4000, 4001, 4002, 4003, 4004, 4005, 4006}
JAPANESE = re.compile('[ぁ-ゖァ-ヺ一-鿿]')


class FormatError(Exception):
    pass


def seq_deps(data):
    """sorted resource paths a SEQ script cites; FormatError on a bad length, command or picture slot"""
    if not data or len(data) % 20:
        raise FormatError('length %d is not a multiple of 20' % len(data))
    out = set()
    for k in range(0, len(data), 20):
        c, s, _a, b, t = struct.unpack('<5i', data[k:k + 20])
        if c not in KNOWN:
            raise FormatError('record %d: unknown command %d' % (k // 20, c))
        if c == 4002:
            if s not in SLOT_DIR:
                raise FormatError('record %d: unknown picture slot %d' % (k // 20, s))
            out.add(SLOT_DIR[s] % b)
        elif c == 4004:
            out.add('text/drama/%d.txt' % (200000000 + t))
            if b:
                out.add('text/drama/%d.txt' % (200000000 + b))
    return sorted(out)


def wanted(rows, max_quest=525):
    """{drama id: [(quest, 'before'|'after')]} of the story rows 1..max_quest (stageId < 100000)"""
    want = {}
    for r in rows:
        q = r.get('stageBinId', 0)
        if not (1 <= q <= max_quest) or r.get('stageId', 0) >= 100000:
            continue
        for side in ('before', 'after'):
            valid = r.get('valid%sDrama' % side.capitalize(), 0)
            for i in (r.get('%sDramaId' % side) or [])[:valid]:
                if i:
                    want.setdefault(i, []).append((q, side))
    return want


def run(served_tsv, b16, stage_dec, out, allow=(), max_quest=525):
    names = set()
    with open(served_tsv, encoding='utf-8', errors='replace') as fh:
        for line in fh:
            names.add(line.split('\t', 1)[0])
    served = set()
    for n in names:
        mm = re.match(r'^(?:img/light/SEQ/(\d+)\.l|lwf/drama/(\d+)/)', n)
        if mm:
            served.add(int(mm.group(1) or mm.group(2)))
    current = {}
    with open(os.path.join(b16, 'files.tsv'), encoding='utf-8') as fh:
        for line in fh:
            c = line.rstrip('\n').split('\t')
            if len(c) >= 7 and c[-1] == '0':
                current[c[0]] = c[5]
    with open(stage_dec, encoding='utf-8') as fh:
        want = wanted(json.load(fh), max_quest)
    src = lambda name: os.path.join(b16, 'files', *name.split('/'))  # noqa: E731

    res = {'already_served': [], 'seq': [], 'lwf': [], 'held': [], 'allowed_missing': [], 'missing': [],
           'japanese': [], 'copied': 0}
    copied = set()

    def copy(name):
        if name in copied:
            return
        with open(src(name), 'rb') as fh:
            data = fh.read()
        if current.get(name) != hashlib.sha1(data).hexdigest():
            raise SystemExit('%s: files\\ is not the current revision of files.tsv' % name)
        if name.startswith('text/') and JAPANESE.search(data.decode('utf-8', 'replace')):
            res['japanese'].append(name)
        dst = os.path.join(out, *name.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'wb') as fh:
            fh.write(data)
        copied.add(name)

    for i in sorted(want):
        quests = want[i]
        if i in served:
            res['already_served'].append(i)
            continue
        script = 'img/light/SEQ/%d.l' % i
        folder = 'lwf/drama/%d/' % i
        if os.path.isfile(src(script)):
            with open(src(script), 'rb') as fh:
                try:
                    deps = seq_deps(fh.read())
                except FormatError as e:
                    raise SystemExit('%s: %s' % (script, e))
            files = [script] + [d for d in deps if d not in names]
            kind = 'seq'
        elif any(n.startswith(folder) for n in current):
            files = sorted(n for n in current if n.startswith(folder))
            lwf = folder + '%d.lwf' % i
            deps = [lwf]
            if os.path.isfile(src(lwf)):
                with open(src(lwf), 'rb') as fh:
                    deps += [folder + t.decode('ascii') for t in sorted(set(re.findall(rb'%d_[0-9a-f]+\.png' % i, fh.read())))]
            files = sorted(set(files) | set(deps))
            kind = 'lwf'
        else:
            res['missing'].append({'id': i, 'quests': quests})
            continue
        absent = [f for f in files if f not in current or not os.path.isfile(src(f))]
        if absent and i not in allow:
            res['held'].append({'id': i, 'quests': quests, 'missing': absent})
            continue
        if absent:
            res['allowed_missing'].append({'id': i, 'missing': absent})
        for f in files:
            if f not in absent:
                copy(f)
        res[kind].append(i)
    res['copied'] = len(copied)
    return res


def main(argv):
    args = list(argv)
    opts = {}
    for k in ('--report', '--allow', '--max'):
        if k in args:
            i = args.index(k)
            opts[k] = args[i + 1]
            del args[i:i + 2]
    if len(args) != 4:
        raise SystemExit(__doc__)
    allow = {int(x) for x in (opts.get('--allow') or '').split(',') if x}
    res = run(*args, allow=allow, max_quest=int(opts.get('--max', 525)))
    print('story dramas 1-%s: %d cited, %d already served, %d SEQ dialogues + %d lwf cutscenes imported (%d files), '
          '%d held, %d with no source, %d Japanese texts'
          % (opts.get('--max', 525), sum(len(res[k]) for k in ('already_served', 'seq', 'lwf', 'held', 'missing')),
             len(res['already_served']), len(res['seq']), len(res['lwf']), res['copied'], len(res['held']),
             len(res['missing']), len(res['japanese'])))
    for r in res['held']:
        print('  held: %d (quests %s): %s' % (r['id'], r['quests'], ', '.join(r['missing'])))
    for r in res['allowed_missing']:
        print('  allowed without: %d: %s' % (r['id'], ', '.join(r['missing'])))
    for r in res['missing']:
        print('  no source: %d (quests %s)' % (r['id'], r['quests']))
    for n in res['japanese']:
        print('  Japanese: %s' % n)
    if '--report' in opts:
        report = opts['--report']
        os.makedirs(os.path.dirname(os.path.abspath(report)), exist_ok=True)
        with open(report, 'w', encoding='utf-8') as fh:
            json.dump(res, fh, indent=1)


if __name__ == '__main__':
    main(sys.argv[1:])
