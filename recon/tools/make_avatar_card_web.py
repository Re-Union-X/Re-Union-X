"""Board cards of the Avatar Board Catalog web pages (Events Part 7 Task 5c, user 15-11).

    python -I recon/tools/make_avatar_card_web.py [--tsv F] [--jp D] [--loc D] [--b16 D] [--index F] [--out D] [--size N]
        [--all] [--strict]
        -> server/game_data/avatar_img/<sphereBoardId>.png (git-ignored) and cards.json {version, ids, size}

Coliseum Board cards (Coliseum Catalog, 26-11): --tsv server/game_data/colosseum_board_art.tsv (written by make-colosseum.js
BOARD_ART, the list build-resources.ps1 imports into the game) --out server/game_data/colosseum_board_img --all --strict:
--all takes every card row of the list (the avatar board index is not read), --strict exits with 2 when a card has no source
on this PC (the found ones are still written), so the resources build stops.

The Avatar Board Catalog (server/event-pages.js) shows the original board cards, the pictures the client shows in Avatar
Boards: img/sphere_incentive/<sphereBoardId>.png, 306x306. Their sources are the rows of recon/tools/originals.tsv (section 56,
read with the reader of import_originals.py: same sources and the same resolution as the resources build, the first source
of a row that has the file wins; jp = the JP 4.3.1 data with its highest revision, loc = files made outside the repository).
Only the boards of server/game_data/avatar_boards.json are taken (all of them when that file is missing). Each card is only
resized, to at most --size px (default 160: the page stays light); nothing is drawn. A row whose source is missing on this PC
is reported and left out (the page shows its neutral box).

Re-runnable: run it again after the cards change (e.g. the corner cleaning of the loc cards). Every card is written again,
a card of an earlier run that is no longer listed is removed, and cards.json gets a new version when any card changed (the
version is in the card URL, /web/avatar/img/v<version>/<id>.png: the WebView cache is busted). The server reads cards.json at
request time: no restart, no master regen, no resources build.

Defaults: --jp / --b16 from private_tools.py local_path (jp_data, ref_work/bundle2016/files), --loc
D:/Progetto_Restauro_KH_UX/raid_loc (the folder of the resources build).
"""
import argparse
import hashlib
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402
import import_originals as io_orig  # noqa: E402
import btf  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
ROOT = os.path.dirname(os.path.dirname(REPO))
TSV = os.path.join(HERE, 'originals.tsv')
INDEX = os.path.join(REPO, 'server', 'game_data', 'avatar_boards.json')
OUT = os.path.join(REPO, 'server', 'game_data', 'avatar_img')
LOC = os.path.join(ROOT, 'raid_loc')
SIZE = 160
CARD = re.compile(r'^img/sphere_incentive/(\d+)\.png$')


def card_id(dest):
    """the board id of a card destination (img/sphere_incentive/<id>.png), else None"""
    m = CARD.match(dest)
    return int(m.group(1)) if m else None


def roots(jp=None, loc=None, b16=None, i440=None, jp501=None):
    """the source roots of import_originals.run, by source name"""
    return {'b16': (b16 or '', 'b16'), 'jp': (jp or '', 'jp'), 'i440': (i440 or '', 'i440'), 'jp501': (jp501 or '', 'jp501'),
            'loc': (loc or '', 'loc')}


def card_rows(tsv):
    """{board id: row} of the card rows of the list (a later row naming the same card wins, as in the resources build)"""
    with open(tsv, encoding='utf8') as f:
        rows = io_orig.parse(f.read().split('\n'))
    out = {}
    for r in rows:
        i = card_id(r['dest'])
        if i is not None:
            out[i] = r
    return out


def source_of(row, rts):
    """the file of a row: the first of its sources that has it, else None"""
    for s in row['sources']:
        if s not in rts or not rts[s][0]:
            continue
        hits = io_orig.resolve(row['src'], rts[s])
        if hits:
            return hits[0][1]
    return None


def index_ids(index_file):
    """the board ids of game_data/avatar_boards.json, None when the file is missing or unreadable"""
    try:
        with open(index_file, encoding='utf8') as f:
            return {int(k) for k in (json.load(f).get('index') or {})}
    except (OSError, ValueError):
        return None


def open_card(src):
    """a card as an RGBA picture: a real PNG, or the game's BTF texture (the 2016 worldwide files: recon/tools/btf.py)"""
    with open(src, 'rb') as f:
        data = f.read()
    if data[:4] == b'BTF'.rjust(4, bytes([0x89])):
        return btf.decode(data)
    with Image.open(io.BytesIO(data)) as im:
        return im.convert('RGBA')


def web_card(src, size=SIZE):
    """the PNG bytes of a card at most size px on its longer side (never enlarged)"""
    im = open_card(src)
    if max(im.size) > size:
        im.thumbnail((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


def build(tsv, rts, out, index_file=INDEX, size=SIZE, take_all=False):
    """writes the cards and cards.json; -> {written, missing, skipped, removed} (board ids, sorted); take_all: every card row"""
    wanted = None if take_all else index_ids(index_file)
    rows = card_rows(tsv)
    written, missing, skipped, data = [], [], [], {}
    for i in sorted(rows):
        if wanted is not None and i not in wanted:
            skipped.append(i)
            continue
        src = source_of(rows[i], rts)
        if not src:
            missing.append(i)
            continue
        data[i] = web_card(src, size)
        written.append(i)
    os.makedirs(out, exist_ok=True)
    for i, b in data.items():
        tmp = os.path.join(out, '%d.png.tmp' % i)
        with open(tmp, 'wb') as f:
            f.write(b)
        os.replace(tmp, os.path.join(out, '%d.png' % i))
    removed = []
    for name in sorted(os.listdir(out)):
        m = re.match(r'^(\d+)\.png$', name)
        if m and int(m.group(1)) not in data:
            os.remove(os.path.join(out, name))
            removed.append(int(m.group(1)))
    h = hashlib.sha1(('avatar-card-web|%d\n' % size).encode())
    for i in written:
        h.update(b'%d|' % i)
        h.update(data[i])
    version = int(h.hexdigest()[:7], 16) or 1
    with open(os.path.join(out, 'cards.json'), 'w', encoding='utf8') as f:
        json.dump({'version': version, 'size': size, 'ids': written}, f)
    return {'written': written, 'missing': missing, 'skipped': skipped, 'removed': sorted(removed), 'version': version}


def _local(key, *parts):
    try:
        import private_tools
        p = private_tools.local_path(key, *parts)
        return p if p and os.path.isdir(p) else None
    except Exception:  # noqa: BLE001 - a PC without the local settings: that source is not used
        return None


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--tsv', default=TSV)
    ap.add_argument('--jp', default=None)
    ap.add_argument('--loc', default=LOC)
    ap.add_argument('--b16', default=None)
    ap.add_argument('--index', default=INDEX)
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--size', type=int, default=SIZE)
    ap.add_argument('--all', action='store_true', help='every card row of --tsv (no avatar board index)')
    ap.add_argument('--strict', action='store_true', help='exit 2 when a card has no source')
    a = ap.parse_args(argv)
    jp = a.jp or _local('jp_data')
    b16 = a.b16 or _local('ref_work', 'bundle2016', 'files')
    if not jp:
        print('WARNING: no JP 4.3.1 data folder (--jp, KHUX_JP_DATA): the jp cards are missing')
    if not os.path.isdir(a.loc or ''):
        print('WARNING: no loc folder %s (--loc): the loc cards are missing' % a.loc)
    rep = build(a.tsv, roots(jp=jp, loc=a.loc, b16=b16), a.out, a.index, a.size, a.all)
    print('board cards: %d written to %s (version %d), %d removed, %d not in the avatar board index'
          % (len(rep['written']), a.out, rep['version'], len(rep['removed']), len(rep['skipped'])))
    if rep['missing']:
        print('%s: %d cards with no source on this PC (neutral box on the page): %s'
              % ('ERROR' if a.strict else 'WARNING', len(rep['missing']), ', '.join(map(str, rep['missing']))))
        if a.strict:
            return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
