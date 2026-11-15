"""Cards of the KEPT twin avatar boards (Events Part 7 Task 6c, user 15-11).

    python -I recon/tools/make_avatar_kept_cards.py [--tsv F] [--jp D] [--loc D] [--b16 D] [--index F] [--ids F] [--out D]
        [--write-tsv] [--montage F] [--count N]
        -> <loc>/img/sphere_incentive_kept/<twinId>.png (private, never in the repository)

A board listed in Avatar Boards only because of the Avatar Board Catalog keep is served as its KEPT twin (server/avatar-boards.js:
own sphereBoardId 5500001+, same layout and rewards). Its card, img/sphere_incentive/<twinId>.png, is the card of the original
board with the «KEPT BOARD» tab of make_special_banners.avatar_kept_tab at the top left; nothing else is drawn.

Sources: the card rows of recon/tools/originals.tsv section 56 (read as make_avatar_card_web.py reads them: the first source of a
row that has the file wins; jp = the JP 4.3.1 data, highest revision; loc = the private files of --loc), original ids
5000001-5499999 only (the level boards 2100119-2100126 are never listed through the keep: no twin). Only the boards of
server/game_data/avatar_boards.json are taken when it has an index. The twin id of a board: TWIN_BASE + event_ids.json
avatarTwins of its donor id, ONLY (fix round 1: the numbers are the master regen's, never guessed); a board without one stops
the run with an error: run the master regen (with KHUX_AVATAR_BOARDS) first, then this tool again.

Re-runnable: run it again whenever the original cards change (corner cleaning, a better source): every twin card is written
again and a twin card of an earlier run that is no longer listed is removed. --write-tsv makes the section 57 block of
originals.tsv again (one loc row per twin card written: the resources build copies them); --montage writes a review sheet of
--count boards (default 12) with the original card next to its twin.

Defaults: --jp / --b16 from private_tools.py local_path (jp_data, ref_work/bundle2016/files), --loc
D:/Progetto_Restauro_KH_UX/raid_loc (the folder of the resources build).
"""
import argparse
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402
import make_avatar_card_web as mac  # noqa: E402
import make_shop_art  # noqa: E402
import make_special_banners as msb  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
INDEX = mac.INDEX
IDS = os.path.join(REPO, 'server', 'event_ids.json')
LOC = mac.LOC
KEPT_DIR = 'img/sphere_incentive_kept'          # under --loc
ID_BASE, TWIN_BASE, ID_MAX = 5000000, 5500000, 5999999
SECTION = '# 57.'
SECTION_HEAD = (
    '# 57. KEPT twin avatar board cards (Events Part 7, Task 6c, user 15-11): img/sphere_incentive/<twinId>.png of the KEPT twin\n'
    '#     boards 5500001+ (server/avatar-boards.js; event_ids.json avatarTwins), listed instead of the original board when it is\n'
    '#     listed only by the Avatar Board Catalog keep. The card of section 56 with the «KEPT BOARD» tab at the top left\n'
    '#     (make_special_banners.avatar_kept_tab), made by recon/tools/make_avatar_kept_cards.py --write-tsv (re-run it after the\n'
    '#     section 56 cards change); private files in --loc. This block is written by that tool: do not edit it by hand.\n')
ROW = re.compile(r'^img/sphere_incentive/(\d+)\.png\tloc\t=' + re.escape(KEPT_DIR) + r'/\d+\.png')


def _read(f, default=None):
    try:
        with open(f, encoding='utf8') as h:
            return json.load(h)
    except (OSError, ValueError):
        return default


class TwinIdsMissing(ValueError):
    """a board with no event_ids.json avatarTwins number (the master regen has not run since the board was added)"""


def twin_ids(index_file=INDEX, ids_file=IDS):
    """{original id: twin id} of the boards of the index (all the numbered boards of event_ids.json when there is no index),
    from event_ids.json avatarTwins only; TwinIdsMissing when a board has no number there"""
    index = (_read(index_file, {}) or {}).get('index') or {}
    ids = _read(ids_file, {}) or {}
    boards = ids.get('avatarBoards') or {}
    twins = ids.get('avatarTwins') or {}
    donor_of = {ID_BASE + int(n): k for k, n in boards.items()}
    out, missing = {}, []
    for i in sorted(set(map(int, index)) | (set() if index else set(donor_of))):
        if not ID_BASE < i < TWIN_BASE:
            continue
        e = index.get(str(i)) or {}
        donor = str(e['donorId']) if 'donorId' in e else donor_of.get(i)
        if donor in twins:
            out[i] = TWIN_BASE + int(twins[donor])
        else:
            missing.append(i)
    if missing:
        raise TwinIdsMissing('%d boards have no avatarTwins number in %s (%s%s): run the master regen with KHUX_AVATAR_BOARDS '
                             'first, then this tool again' % (len(missing), ids_file, ', '.join(map(str, missing[:10])),
                                                               '...' if len(missing) > 10 else ''))
    return out


def card(src):
    """the twin card of an original card file (RGBA 306x306)"""
    with Image.open(src) as im:
        return msb.avatar_kept_tab(im.convert('RGBA'))


def build(tsv, rts, out, index_file=INDEX, ids_file=IDS):
    """writes the twin cards; -> {written [(original, twin)], missing [original], skipped [ids without a twin], removed [twin]}"""
    rows = mac.card_rows(tsv)
    twins = twin_ids(index_file, ids_file)
    written, missing, skipped, keep = [], [], [], set()
    os.makedirs(out, exist_ok=True)
    for i in sorted(rows):
        if TWIN_BASE < i <= ID_MAX:
            continue                                     # a twin row of section 57
        if i not in twins:
            skipped.append(i)
            continue
        src = mac.source_of(rows[i], rts)
        if not src:
            missing.append(i)
            continue
        t = twins[i]
        tmp = os.path.join(out, '%d.png.tmp' % t)
        card(src).save(tmp, 'PNG', optimize=True)
        os.replace(tmp, os.path.join(out, '%d.png' % t))
        written.append((i, t))
        keep.add(t)
    removed = []
    for name in sorted(os.listdir(out)):
        m = re.match(r'^(\d+)\.png$', name)
        if m and int(m.group(1)) not in keep:
            os.remove(os.path.join(out, name))
            removed.append(int(m.group(1)))
    return {'written': written, 'missing': missing, 'skipped': skipped, 'removed': removed}


def write_tsv(tsv, written):
    """makes the section 57 block of originals.tsv again (one loc row per twin card); -> rows written. The rows of the block
    (and any twin card row elsewhere) are dropped first; the block goes where it was, else at the end"""
    with open(tsv, encoding='utf8', newline='') as f:
        raw = f.read()
    eol = '\r\n' if '\r\n' in raw else '\n'                 # the file keeps its line ends (CRLF in a Windows checkout)
    lines = raw.replace('\r\n', '\n').split('\n')
    keep, at, i = [], None, 0
    while i < len(lines):
        ln = lines[i]
        if ln.startswith(SECTION):
            at = len(keep)
            i += 1
            while i < len(lines) and (lines[i].startswith('#     ') or ROW.match(lines[i]) or lines[i] == ''):
                i += 1
            continue
        if not ROW.match(ln):
            keep.append(ln)
        i += 1
    while keep and keep[-1] == '':
        keep.pop()
    if at is None or at > len(keep):
        at = len(keep)
    block = SECTION_HEAD.rstrip('\n').split('\n') + ['img/sphere_incentive/%d.png\tloc\t=%s/%d.png' % (t, KEPT_DIR, t) for _, t in written]
    before = keep[:at]
    while before and before[-1] == '':
        before.pop()
    after = keep[at:]
    text = eol.join(before + [''] + block + ([''] + after if after else [])) + eol
    with open(tsv, 'w', encoding='utf8', newline='') as f:
        f.write(text)
    return len(written)


def montage(tsv, rts, out, written, dest, count=12):
    """review sheet: count boards spread over the list, the original card next to its twin card; -> its size"""
    rows = mac.card_rows(tsv)
    pick = written if len(written) <= count else [written[round(k * (len(written) - 1) / (count - 1))] for k in range(count)]
    cell, pad, lab, cols = 306, 12, 22, 2
    per = cols * 2
    nrows = (len(pick) + cols - 1) // cols
    W = pad + per * (cell + pad) + (cols - 1) * pad
    H = 34 + nrows * (cell + lab + pad)
    sheet = Image.new('RGBA', (W, H), (24, 28, 44, 255))
    d = ImageDraw.Draw(sheet)
    f = make_shop_art.font(15)
    d.text((pad, 8), 'KEPT twin avatar board cards: original | twin (KEPT BOARD tab)', font=f, fill=(220, 220, 220))
    for k, (i, t) in enumerate(pick):
        r, c = divmod(k, cols)
        x = pad + c * (2 * (cell + pad) + pad)
        y = 34 + r * (cell + lab + pad)
        src = mac.source_of(rows[i], rts)
        with Image.open(src) as im:
            sheet.alpha_composite(im.convert('RGBA').resize((cell, cell), Image.LANCZOS), (x, y + lab))
        with Image.open(os.path.join(out, '%d.png' % t)) as im:
            sheet.alpha_composite(im.convert('RGBA'), (x + cell + pad, y + lab))
        d.text((x, y + 2), str(i), font=f, fill=(255, 220, 120))
        d.text((x + cell + pad, y + 2), str(t), font=f, fill=(255, 220, 120))
    sheet.convert('RGB').save(dest)
    return sheet.size


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--tsv', default=mac.TSV)
    ap.add_argument('--jp', default=None)
    ap.add_argument('--loc', default=LOC)
    ap.add_argument('--b16', default=None)
    ap.add_argument('--index', default=INDEX)
    ap.add_argument('--ids', default=IDS)
    ap.add_argument('--out', default=None, help='default <loc>/%s' % KEPT_DIR)
    ap.add_argument('--write-tsv', action='store_true')
    ap.add_argument('--montage', default=None)
    ap.add_argument('--count', type=int, default=12)
    a = ap.parse_args(argv)
    jp = a.jp or mac._local('jp_data')
    b16 = a.b16 or mac._local('ref_work', 'bundle2016', 'files')
    if not jp:
        print('WARNING: no JP 4.3.1 data folder (--jp, KHUX_JP_DATA): the twins of the jp cards are missing')
    if not os.path.isdir(a.loc or ''):
        print('ERROR: no loc folder %s (--loc): the twin cards are private files there' % a.loc)
        return 1
    out = a.out or os.path.join(a.loc, *KEPT_DIR.split('/'))
    rts = mac.roots(jp=jp, loc=a.loc, b16=b16)
    try:
        rep = build(a.tsv, rts, out, a.index, a.ids)
    except TwinIdsMissing as e:
        print('ERROR: %s' % e)
        return 1
    print('KEPT twin cards: %d written to %s, %d removed, %d without a twin (level boards / not in the index)'
          % (len(rep['written']), out, len(rep['removed']), len(rep['skipped'])))
    if rep['missing']:
        print('WARNING: %d original cards with no source on this PC (no twin card): %s'
              % (len(rep['missing']), ', '.join(map(str, rep['missing']))))
    if a.write_tsv:
        print('originals.tsv: section 57 with %d rows' % write_tsv(a.tsv, rep['written']))
    if a.montage:
        print('montage %s: %dx%d' % ((a.montage,) + montage(a.tsv, rts, out, rep['written'], a.montage, a.count)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
