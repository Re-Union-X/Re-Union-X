"""Coliseum Board card pictures (Coliseum Part 2 Task 4; the 26-11 method of docs/notes/coliseum.md «Board card pictures»).

    python -I recon/tools/coliseum_board_cards.py [--ids part2|part1|<id>,<id>...] [--wiki D] [--jp D] [--loc D]
        [--sheet F] [--report F] [--out D] [--overwrite]
    python -I recon/tools/coliseum_board_cards.py --table F --months 2017-05..2021-06 [--classc-sheet F] [...]

The client draws a Coliseum board card from img/sphere_incentive/<sphereBoardId>.png (306 x 306 with transparency) over the
gold card Board_0003. No worldwide card file survives for the boards after 2200001, so each card is rebuilt from the khuxwiki
board screenshot «Coliseum Board - <board> KHUX» (the board screen, the gold card drawn at its top left):

1. the card in the screenshot: the bounding box of the bright blob around the gold pixels (card_box: the gold card with its
   light outline, square, = the 306 x 306 canvas);
2. calibration per screenshot: the canvas origin and scale relative to that box, measured once on a card of known placement,
   the 6★ Cid card 2200001 (JP 4.3.1 file = the worldwide 2016 file) fitted into its own screenshot (calibrate);
3. a candidate picture is fitted into the screenshot (fit: scale and offset, mean absolute RGB difference on the opaque
   pixels of the candidate, alpha > 250, scaled to the screenshot):
   - the JP 4.3.1 card of the same avatar set (BOARDS jp), a full 306 x 306 canvas: kept when its difference is at most FIT_MAX
     (the worst fit accepted on 26-11 for the Part 1 cards, 17.8: anything above is another picture) AND the wiki preview is a
     cut of it (twin: mean difference at most TWIN_MAX between the preview and the JP card at native size, on the preview's
     opaque pixels; 0.00 for a real twin). The screenshot difference alone is not enough: the JP Vampire (F) 2200046 scores
     12.8 although it lacks the bat wings of the worldwide card (twin 17.8). The build then copies the JP file itself
     (make-colosseum.js BOARD_ART 'jp:<file>'), nothing is written here;
   - else the khuxwiki «Preview - <board>» picture (the original card picture cut to its opaque area): pasted on a transparent
     306 x 306 canvas at the fitted place, at its native size, never resampled (user 26-11: no grainy cards); moved inside the
     canvas where the fit would cut opaque rows (the previews of 294 rows sit on the bottom edge). A fitted scale off by more
     than SCALE_TOL is reported (the preview is then not the native picture).
   The file goes to <loc>/img/sphere_incentive_coli/<id>.png (private, outside the repository; build-resources.ps1 imports it
   with --loc). An existing file is never replaced without --overwrite, and 2210191 (rebuilt by hand, approved) never.
4. a review sheet (--sheet): per board the screenshot card scaled to 306, the new card over Board_0003, id, name, source and
   difference; a JSON report (--report) with the same per-board values and the calibration.

Inputs (private, local only): --wiki = the folder with layout/ (screenshots) and preview/ (previews), default
D:/Progetto_Restauro_KH_UX/tmp/coli_boards_research/wiki; --jp = the JP 4.3.1 data (private_tools.py jp_data); --loc =
D:/Progetto_Restauro_KH_UX/raid_loc. --ids part1 rebuilds the Part 1 cards into --out (a scratch folder, default a temp
folder) and compares them with the approved files in --loc (never written): the method check, same picture and the two
places (the 26-11 cards took one canvas origin per screenshot size from the 6★ Cid screenshot, whose card sits 6 px higher
than in the other 1280 x 544 screenshots: they are 6-7 canvas px lower than the board screenshots show them).

Later seasons: --table = a private JSON {id: {name, kind, month, layout, preview, jp: [JP files]}} (the board list of the
private research; rows of BOARDS above are kept, only their month is taken) and --months A..B (or one month) = every
board of those months except 2210191. Rules on top of the above: several JP candidates (per-gender pieces of a
both-gender board) are tried in turn; a preview that does not fit the screenshot (difference above FIT_MAX: another
picture, or one larger than the canvas) gives no card (art 'none'); a board with a JP candidate but no usable wiki preview
to prove it (class C) gets no card either (art 'classC:<file>', the JP card fitted to the screenshot for review), drawn on
--classc-sheet when given. A preview fitted at a scale off by more than SCALE_TOL (the whole card resampled by the wiki
editor, e.g. 288 px) keeps its native size, centred on its fitted place (never resampled); when it is the whole card
(the gold card Board_0003 with its frame baked in) only its picture is kept (strip_card, user 26-11: no double frame).
"""
import argparse
import json
import os
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

SIZE = 306
FIT_MAX = 17.81           # worst difference of the 26-11 fits (fit.json: 6.2 .. 17.8), all accepted by the user
TWIN_MAX = 2.0            # a preview cut from the JP card differs by 0.00 from it; a different picture by 15 and more
SCALE_TOL = 0.03          # a preview fitted at a scale off by more is not the native picture
NEVER = {2210191}         # rebuilt by hand and approved by the user (26-11)
REF_ID, REF_JP = 2200001, '2200001.png'
ROOT = 'D:/Progetto_Restauro_KH_UX'
WIKI = ROOT + '/tmp/coli_boards_research/wiki'
LOC = ROOT + '/raid_loc'
CARD_DIR = ('img', 'sphere_incentive_coli')

# id -> (name, kind, wiki board name (layout and preview), JP 4.3.1 candidate of the same avatar set or None).
# Names, months and candidates: private research BOARD_IMAGES.md (2016-04 .. 2017-04).
BOARDS = {
    2200001: ('6★ Cid', '', '6★_Cid', None),
    2200002: ('6★ Scrooge', '', '6★_Scrooge', None),
    2200023: ('Tier 10 Bonus', '', 'Tier_10_Bonus_1', None),
    2210029: ('KH Chip', 'M', 'KH_Chip_(Male)', None),
    2210030: ('KH Chip', 'F', 'KH_Chip_(Female)', None),
    2210031: ('Tier 10 Bonus', '', 'Tier_10_Bonus_2', None),
    2210033: ('Moogle', 'M', 'Moogle_(Male)', None),
    2210034: ('Moogle', 'F', 'Moogle_(Female)', None),
    2210035: ('Tier 10 Bonus', '', 'Tier_10_Bonus_2', None),
    2210037: ('Summer Mickey', 'M', 'Summer_Mickey', '2200037.png'),
    2210038: ('Summer Minnie', 'F', 'Summer_Minnie', '2200038.png'),
    2210039: ('Tier 10 Bonus', '', 'Tier_10_Bonus_2', None),
    2210040: ('Mushroom Hunt', 'M', 'Mushroom_Hunt_(Male)', '2200041.png'),
    2210041: ('Mushroom Hunt', 'F', 'Mushroom_Hunt_(Female)', '2200042.png'),
    2210042: ('Tier 10 Bonus', '', 'Tier_10_Bonus_2', None),
    2210043: ('Vampire', 'M', 'Vampire_(Male)', '2200045.png'),
    2210044: ('Vampire', 'F', 'Vampire_(Female)', '2200046.png'),
    2210045: ('Tier 10 Bonus', '', 'Tier_10_Bonus_2', None),
    2210046: ('Timothy Mouse', 'M', 'Timothy_Mouse_(Male)', None),
    2210047: ('Timothy Mouse', 'F', 'Timothy_Mouse_(Female)', None),
    2210048: ('Tier 10 Bonus', '', 'Tier_10_Bonus_3', None),
    2210049: ('Pegasus Knight', 'M', 'Pegasus_Knight_(Male)', None),
    2210050: ('Pegasus Knight', 'F', 'Pegasus_Knight_(Female)', None),
    2210051: ('Tier 10 Bonus', '', 'Tier_10_Bonus_4', None),
    2210052: ('Armored Terra', 'M', 'Armored_Terra', None),
    2210053: ('Armored Aqua', 'F', 'Armored_Aqua', None),
    2210054: ('Tier 10 Bonus', '', 'Tier_10_Bonus_4', None),
    2210055: ('Cowboy Goth', 'M', 'Cowboy_Goth', None),
    2210056: ('Cowgirl Goth', 'F', 'Cowgirl_Goth', None),
    2210057: ('Tier 10 Bonus', '', 'Tier_10_Bonus_4', None),
    2210058: ('Tier 11 Bonus', '', 'Tier_11_Bonus', None),
    2210059: ('Royal Knight', 'M', 'Royal_Knight_(Male)', None),
    2210060: ('Royal Knight', 'F', 'Royal_Knight_(Female)', None),
    2210061: ('Tier 10 Bonus', '', 'Tier_10_Bonus_4', None),
    2210062: ('Tier 11 Bonus', '', 'Tier_11_Bonus', None),
    2210063: ('Ninja', 'M', 'Ninja', '2200025.png'),
    2210064: ('Kunoichi', 'F', 'Kunoichi', '2200026.png'),
    2210065: ('Tier 10 Bonus', '', 'Tier_10_Bonus_4', None),
    2210066: ('Tier 11 Bonus', '', 'Tier_11_Bonus', None),
}
PART1 = [2200002, 2200023, 2210029, 2210030, 2210031, 2210033, 2210034, 2210035]
PART2 = [i for i in BOARDS if 2210037 <= i <= 2210066]
MONTHS = {}               # id -> 'YYYY-MM' (from --table)


def load_table(path):
    """adds the boards of a private table (see the docstring) to BOARDS / MONTHS; a row already in BOARDS is kept"""
    with open(path, encoding='utf-8') as f:
        rows = json.load(f)
    for k, r in rows.items():
        i = int(k)
        MONTHS[i] = r['month']
        if i not in BOARDS:
            BOARDS[i] = (r['name'], r.get('kind', ''), (r['layout'], r['preview']), list(r.get('jp') or []) or None)


def month_ids(spec):
    """the ids of the months 'A..B' (or one month 'A'), in id order, without the protected cards"""
    lo, _, hi = spec.partition('..')
    hi = hi or lo
    return sorted(i for i, m in MONTHS.items() if lo <= m <= hi and i not in NEVER)


def stems(stem):
    """(layout stem, preview stem): one name for both or a pair"""
    return (stem, stem) if isinstance(stem, str) else tuple(stem)


def cands(cand):
    return [] if not cand else [cand] if isinstance(cand, str) else list(cand)


def rgba(path):
    return Image.open(path).convert('RGBA')


def card_box(shot):
    """(x0, y0, side) of the card in a board screenshot (H x W x 3 float array): the bright blob around the gold card pixels.
    The gold pixels alone break where the picture covers the card; the blob (every pixel neither dark nor blue) holds the
    card, its picture and its light outline, cut from the dark blue board around it."""
    from scipy import ndimage
    r, g, b = shot[..., 0], shot[..., 1], shot[..., 2]
    gold = (r > 190) & (g > 150) & (b < 200) & (r - b > 50)
    lab, n = ndimage.label(gold)
    if not n:
        raise ValueError('no gold card in the screenshot')
    k = int(np.argmax(ndimage.sum(gold, lab, range(1, n + 1)))) + 1
    ys, xs = np.nonzero(lab == k)
    fg = ~(((r + g + b) < 240) | ((b > r + 25) & (b > g)))
    fg = ndimage.binary_opening(fg, iterations=1)
    lab2, _ = ndimage.label(fg)
    ids, cnt = np.unique(lab2[ys, xs], return_counts=True)
    cnt[ids == 0] = 0
    blob = lab2 == ids[int(np.argmax(cnt))]
    by, bx = np.nonzero(blob)
    x0, y0 = int(bx.min()), int(by.min())
    return x0, y0, max(int(bx.max()) + 1 - x0, int(by.max()) + 1 - y0)


def diff(shot, pic, k, x, y):
    """mean absolute RGB difference between the screenshot and the picture scaled by k at (x, y) (screenshot pixels), on the
    opaque pixels of the scaled picture; inf when it falls outside or has almost no opaque pixel"""
    w, h = max(1, round(pic.width * k)), max(1, round(pic.height * k))
    if x < 0 or y < 0 or x + w > shot.shape[1] or y + h > shot.shape[0]:
        return float('inf')
    p = np.asarray(pic.resize((w, h), Image.LANCZOS), dtype=np.float32)
    a = p[..., 3] > 250
    if a.sum() < 50:
        return float('inf')
    return float(np.abs(shot[y:y + h, x:x + w, :3] - p[..., :3])[a].mean())


def search(shot, pic, scales, xs, ys):
    best = (float('inf'), None, None, None)
    for k in scales:
        w, h = max(1, round(pic.width * k)), max(1, round(pic.height * k))
        p = np.asarray(pic.resize((w, h), Image.LANCZOS), dtype=np.float32)
        a = p[..., 3] > 250
        if a.sum() < 50:
            continue
        pa = p[..., :3][a]
        for y in ys:
            for x in xs:
                if x < 0 or y < 0 or x + w > shot.shape[1] or y + h > shot.shape[0]:
                    continue
                v = float(np.abs(shot[y:y + h, x:x + w, :3][a] - pa).mean())
                if v < best[0]:
                    best = (v, float(k), int(x), int(y))
    return best


def calibrate(shot, ref):
    """the canvas of the 306 x 306 reference card in its screenshot relative to the card box: {ratio (canvas scale / (side /
    306)), ox, oy (canvas origin - box origin, in box sides), diff}"""
    x0, y0, side = card_box(shot)
    k0 = side / SIZE
    v, k, x, y = search(shot, ref, k0 * np.arange(0.96, 1.041, 0.01), range(x0 - 8, x0 + 9, 2), range(y0 - 8, y0 + 9, 2))
    v, k, x, y = search(shot, ref, k * np.arange(0.99, 1.0101, 0.0025), range(x - 2, x + 3), range(y - 2, y + 3))
    return {'ratio': k / k0, 'ox': (x - x0) / side, 'oy': (y - y0) / side, 'diff': v}


def canvas(shot, cal):
    """(cx, cy, k): the 306 x 306 canvas in the screenshot (origin, screenshot pixels per canvas pixel)"""
    x0, y0, side = card_box(shot)
    return x0 + cal['ox'] * side, y0 + cal['oy'] * side, cal['ratio'] * side / SIZE


def fit(shot, pic, cal, full=False):
    """{diff, scale, u, v}: the picture fitted into the screenshot, scale and offset in canvas pixels. full = a 306 x 306 card
    (placed near the canvas origin), else a cut picture anywhere on the canvas."""
    cx, cy, k = canvas(shot, cal)
    if full:
        xs = range(round(cx - 6), round(cx + 7), 2)
        ys = range(round(cy - 6), round(cy + 7), 2)
    else:
        xs = range(round(cx - 10 * k), round(cx + (SIZE - pic.width + 10) * k) + 1, 2)
        ys = range(round(cy - 10 * k), round(cy + (SIZE - pic.height + 10) * k) + 1, 2)
    v, kk, x, y = search(shot, pic, k * np.arange(0.94, 1.061, 0.02), xs, ys)
    if kk is None:
        return {'diff': float('inf'), 'scale': None, 'u': None, 'v': None}
    v, kk, x, y = search(shot, pic, kk * np.arange(0.985, 1.0151, 0.005), range(x - 2, x + 3), range(y - 2, y + 3))
    return {'diff': v, 'scale': kk / k, 'u': (x - cx) / k, 'v': (y - cy) / k}


def place(pic, u, v):
    """the picture on a transparent 306 x 306 canvas at its native size, at the fitted place, kept inside the canvas"""
    x = min(max(round(u), 0), SIZE - pic.width)
    y = min(max(round(v), 0), SIZE - pic.height)
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(pic, (x, y))
    return out, (x, y)


def strip_card(pic, board, lo=16, hi=60, band=10, speck=40, gate=30):
    """the picture of a preview that is the whole card (the client gold card Board_0003 with the picture, shrunk by the wiki
    editor, e.g. to 288 px) without the preview's own gold background and frame, at the preview's native size (user 26-11:
    no double frame inside the gold, no upscaling). The gold card is shrunk to the preview size and compared pixel by pixel:
    alpha = 0 below `lo` (mean RGB sum difference), 1 above `hi`, linear between (soft edges, the colour unmixed from the
    gold behind it); the frame band (`band` px from the card edge, rounded corners included) is cleared, specks smaller
    than `speck` px dropped, holes inside the picture (gold medal parts like the card) filled with the preview pixels.
    None when the preview is not a whole card (median difference in its frame band above `gate`; 14-18 for the 2018
    previews, 100 and more for a picture on transparency)."""
    from scipy import ndimage
    Bi = np.asarray(board.convert('RGBA').resize(pic.size, Image.LANCZOS), dtype=np.float32)
    P = np.asarray(pic.convert('RGBA'), dtype=np.float32)
    d = np.abs(P[..., :3] - Bi[..., :3]).sum(-1)
    dist = ndimage.distance_transform_edt(np.pad(Bi[..., 3] >= 250, 1))[1:-1, 1:-1]
    ring = (dist >= 1) & (dist < band)
    if not ring.any() or np.median(d[ring]) > gate:
        return None
    a = np.clip((d - lo) / (hi - lo), 0, 1)
    a[dist < band] = 0
    lab, n = ndimage.label(a > 0)
    if n:
        sz = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
        a[np.isin(lab, np.nonzero(sz < speck)[0] + 1)] = 0
    a[ndimage.binary_fill_holes(a >= 1)] = 1
    F = P[..., :3].copy()
    m = (a > 0) & (a < 1)
    F[m] = (P[..., :3][m] - (1 - a[m])[:, None] * Bi[..., :3][m]) / a[m][:, None]
    F[a == 0] = 0
    return Image.fromarray(np.dstack([np.clip(np.round(F), 0, 255), np.round(a * 255)]).astype(np.uint8), 'RGBA')


def board_card(jp):
    """the client gold card Board_0003 (JP 4.3.1 img/sphere_board), None when missing"""
    p = os.path.join(jp, 'img', 'sphere_board', 'Board_0003.png')
    return rgba(p) if os.path.exists(p) else None


def layout_file(wiki, stem):
    for name in ('Coliseum_Board_-_%s_KHUX.png' % stem, 'Coliseum_Board_-_%s.png' % stem):
        p = os.path.join(wiki, 'layout', name)
        if os.path.exists(p):
            return p
    raise FileNotFoundError('no khuxwiki board screenshot for %s in %s' % (stem, os.path.join(wiki, 'layout')))


def preview_file(wiki, stem):
    p = os.path.join(wiki, 'preview', 'Preview_-_%s.png' % stem)
    if not os.path.exists(p):
        raise FileNotFoundError('no khuxwiki preview %s' % p)
    return p


def jp_file(jp, name):
    """the JP 4.3.1 card <name> (img/sphere_incentive/, highest revision <stem>.<8 digits>.png), None when missing"""
    d = os.path.join(jp, 'img', 'sphere_incentive')
    stem = name[:-4]
    try:
        hits = sorted(f for f in os.listdir(d) if f == name or (f.startswith(stem + '.') and f[len(stem) + 1:-4].isdigit()))
    except OSError:
        return None
    if not hits:
        return None
    revs = [f for f in hits if f != name]
    return os.path.join(d, revs[-1] if revs else name)


def twin(pic, jp_card, u, v, reach=4):
    """(difference, (x, y)): the preview against the JP card at native size, best place within reach px of the fitted one,
    on the preview's opaque pixels"""
    J = np.asarray(jp_card, dtype=np.float32)
    P = np.asarray(pic, dtype=np.float32)
    a = P[..., 3] > 250
    best = (float('inf'), None)
    for dy in range(-reach, reach + 1):
        for dx in range(-reach, reach + 1):
            x, y = round(u) + dx, round(v) + dy
            if x < 0 or y < 0 or x + pic.width > SIZE or y + pic.height > SIZE:
                continue
            d = float(np.abs(J[y:y + pic.height, x:x + pic.width, :3][a] - P[..., :3][a]).mean())
            if d < best[0]:
                best = (d, (x, y))
    return best


def card(bid, wiki, jp, cal):
    """the card of one board: {id, name, kind, month, source ('jp' | 'loc' | 'classC' | 'none'), art (BOARD_ART value), diff,
    preview: {...} or None, jp: {...} (the kept or best candidate), jpAll, image (PIL), pos, shot}"""
    name, kind, stem, cand = BOARDS[bid]
    lstem, pstem = stems(stem)
    shot_img = Image.open(layout_file(wiki, lstem)).convert('RGB')
    shot = np.asarray(shot_img, dtype=np.float32)
    res = {'id': bid, 'name': name, 'kind': kind, 'month': MONTHS.get(bid, ''), 'wiki': lstem if lstem == pstem else [lstem, pstem],
           'jp': None, 'jpAll': [], 'preview': None}
    try:
        pic = rgba(preview_file(wiki, pstem))
    except FileNotFoundError:
        pic = None
    if pic is not None:
        pv = fit(shot, pic, cal)
        res['preview'] = {'file': 'Preview_-_%s.png' % pstem, 'size': list(pic.size), **pv,
                          'scaleOk': pv['scale'] is not None and abs(pv['scale'] - 1) <= SCALE_TOL, 'fitOk': pv['diff'] <= FIT_MAX}
    for c in cands(cand):
        f = jp_file(jp, c)
        if not f:
            res['jpAll'].append({'file': c, 'missing': True, 'match': False})
            continue
        j = fit(shot, rgba(f), cal, full=True)
        tw, at = twin(pic, rgba(f), pv['u'], pv['v']) if pic is not None and pv['u'] is not None else (float('inf'), None)
        res['jpAll'].append({'file': c, **j, 'twin': tw, 'twinAt': list(at) if at else None, 'match': j['diff'] <= FIT_MAX and tw <= TWIN_MAX})
    found = [j for j in res['jpAll'] if not j.get('missing')]
    if found:
        res['jp'] = next((j for j in found if j['match']), min(found, key=lambda j: (j['twin'], j['diff'])))
    elif res['jpAll']:
        res['jp'] = res['jpAll'][0]
    if res['jp'] and res['jp']['match']:
        c = res['jp']['file']
        res.update(source='jp', art='jp:' + c, diff=res['jp']['diff'], image=rgba(jp_file(jp, c)), pos=None)
    else:
        usable = pic is not None and pv['u'] is not None and pv['diff'] <= FIT_MAX and pic.width <= SIZE and pic.height <= SIZE
        if usable:
            u, v = pv['u'], pv['v']
            if not res['preview']['scaleOk']:
                # a resampled preview (the whole card at another size): its native pixels centred on the fitted place
                u, v = u + pic.width * (pv['scale'] - 1) / 2, v + pic.height * (pv['scale'] - 1) / 2
                gold = board_card(jp)
                cut = strip_card(pic, gold) if gold is not None else None
                if cut is not None:
                    # the whole card shrunk: only its picture, without the preview's own gold background and frame
                    pic = cut
                    res['preview']['stripped'] = True
            img, pos = place(pic, u, v)
            res.update(source='loc', art='loc', diff=pv['diff'], image=img, pos=list(pos))
        elif found:
            # class C: a JP candidate and no preview that proves or replaces it (none, another or a resampled picture)
            j = min(found, key=lambda j: j['diff'])
            res.update(source='classC', art='classC:' + j['file'], diff=j['diff'], image=rgba(jp_file(jp, j['file'])), pos=None)
        else:
            res.update(source='none', art='none', diff=pv['diff'] if pic is not None else float('inf'),
                       image=Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0)), pos=None)
    cx, cy, k = canvas(shot, cal)
    res['shot'] = shot_img.crop((round(cx), round(cy), round(cx + SIZE * k), round(cy + SIZE * k))).resize((SIZE, SIZE), Image.LANCZOS)
    return res


def write_card(res, loc, overwrite=False):
    """writes a loc card; returns 'written', 'same', 'kept' (an existing file, no --overwrite) or '' (a jp card)"""
    if res['source'] != 'loc':
        return ''
    if res['id'] in NEVER:
        raise SystemExit('card %d is never rebuilt (hand-made, approved)' % res['id'])
    d = os.path.join(loc, *CARD_DIR)
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, '%d.png' % res['id'])
    if os.path.exists(p):
        if np.array_equal(np.asarray(rgba(p)), np.asarray(res['image'])):
            return 'same'
        if not overwrite:
            return 'kept'
    res['image'].save(p)
    return 'written'


def sheet(results, board_png, path):
    """review sheet: per board the screenshot card (left) and the new card over the gold card (right), labelled"""
    cols, cw, ch = 3, 2 * SIZE + 30, SIZE + 58
    rows = (len(results) + cols - 1) // cols
    out = Image.new('RGB', (cols * cw, rows * ch), (24, 28, 44))
    d = ImageDraw.Draw(out)
    gold = rgba(board_png).resize((SIZE, SIZE)) if board_png and os.path.exists(board_png) else Image.new('RGBA', (SIZE, SIZE), (236, 200, 120, 255))
    for i, r in enumerate(results):
        x, y = (i % cols) * cw + 10, (i // cols) * ch + 4
        out.paste(r['shot'], (x, y + 50))
        c = gold.copy()
        c.alpha_composite(r['image'])
        out.paste(c, (x + SIZE + 10, y + 50), c)
        src = r['art'] if r['source'] in ('jp', 'classC') or not r['pos'] else '%s: wiki preview %s at %s' % (
            r['art'], 'x'.join(map(str, r['preview']['size'])), tuple(r['pos']))
        d.text((x, y), '%d  %s%s  %s' % (r['id'], r['name'], ' (%s)' % r['kind'] if r['kind'] else '', r.get('month', '')), fill=(255, 255, 255))
        d.text((x, y + 14), 'source: %s   diff %.2f' % (src, r['diff']), fill=(255, 230, 140))
        extra = 'JP %s diff %.2f twin %.2f (%s)' % (r['jp']['file'], r['jp'].get('diff', float('nan')), r['jp'].get('twin', float('nan')),
                                                  'kept' if r['jp']['match'] else 'refused') if r['jp'] else ''
        d.text((x, y + 28), 'left: wiki screenshot   right: card   %s' % extra, fill=(190, 200, 220))
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    out.save(path)


def compare(approved, rebuilt):
    """(same picture, its place on the approved card): the opaque areas of both cards hold the same pixels; the place may
    differ (the 26-11 cards were placed from a fixed origin per screenshot size, see the report)"""
    A, B = np.array(approved), np.array(rebuilt)
    A[A[..., 3] == 0] = 0  # the colour of a fully transparent pixel is not part of the picture
    B[B[..., 3] == 0] = 0
    ba, bb = approved.getbbox(), rebuilt.getbbox()
    if not ba or not bb or (ba[2] - ba[0], ba[3] - ba[1]) != (bb[2] - bb[0], bb[3] - bb[1]):
        return False, ba[:2] if ba else None
    return bool(np.array_equal(A[ba[1]:ba[3], ba[0]:ba[2]], B[bb[1]:bb[3], bb[0]:bb[2]])), ba[:2]


def report_row(r, status):
    keep = ('id', 'name', 'kind', 'month', 'wiki', 'source', 'art', 'diff', 'pos', 'jp', 'jpAll', 'preview')
    return {**{k: r[k] for k in keep}, 'file': status}


def main(argv):
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--ids', default=None, help='part2 (default), part1 or <id>,<id>...')
    ap.add_argument('--table', default=None, help='private board table (JSON) of the later seasons')
    ap.add_argument('--months', default=None, help='A..B or A: the boards of those months (needs --table)')
    ap.add_argument('--classc-sheet', default=None, help='review sheet of the class C boards (JP card, no preview)')
    ap.add_argument('--wiki', default=WIKI)
    ap.add_argument('--jp', default=None)
    ap.add_argument('--loc', default=LOC)
    ap.add_argument('--out', default=None, help='--ids part1: scratch folder of the rebuilt cards')
    ap.add_argument('--sheet', default=None)
    ap.add_argument('--report', default=None)
    ap.add_argument('--overwrite', action='store_true')
    a = ap.parse_args(argv)
    if a.jp is None:
        import private_tools
        a.jp = private_tools.local_path('jp_data')
    if a.months and a.ids:
        raise SystemExit('--months and --ids exclude each other')
    if a.table:
        load_table(a.table)
    if a.months:
        ids = month_ids(a.months)
        if not ids:
            raise SystemExit('no board in %s (--table?)' % a.months)
    else:
        a.ids = a.ids or 'part2'
        ids = PART2 if a.ids == 'part2' else PART1 if a.ids == 'part1' else [int(x) for x in a.ids.split(',') if x]
    for i in ids:
        if i not in BOARDS:
            raise SystemExit('unknown board %d' % i)
        if i in NEVER:
            raise SystemExit('card %d is never rebuilt (hand-made, approved)' % i)
    ref = jp_file(a.jp, REF_JP)
    if not ref:
        raise SystemExit('reference card %s missing under %s' % (REF_JP, a.jp))
    cal = calibrate(np.asarray(Image.open(layout_file(a.wiki, BOARDS[REF_ID][2])).convert('RGB'), dtype=np.float32), rgba(ref))
    print('calibration on %d: ratio %.4f origin (%+.4f, %+.4f) x side, diff %.2f' % (REF_ID, cal['ratio'], cal['ox'], cal['oy'], cal['diff']))
    check = a.ids == 'part1'
    dest = a.out or (tempfile.mkdtemp(prefix='coli_cards_') if check else a.loc)
    results, rows, bad = [], [], 0
    for i in ids:
        r = card(i, a.wiki, a.jp, cal)
        status = write_card(r, dest, a.overwrite or check)
        if check and r['source'] == 'loc':
            same, at = compare(rgba(os.path.join(a.loc, *CARD_DIR, '%d.png' % i)), r['image'])
            status = ('approved card: same picture at %s, rebuilt at %s' % (at, tuple(r['pos']))) if same else 'DIFFERS from the approved card'
            bad += not same
        pv = r['preview'] or {}
        flags = [f for f, c in (('fit above %.2f' % FIT_MAX, r['diff'] > FIT_MAX),
                                ('preview scale %.3f' % (pv.get('scale') or 0), r['source'] == 'loc' and not pv.get('scaleOk')),
                                ('no preview', not pv)) if c]
        jp = (' | JP %s %.2f twin %.2f %s' % (r['jp']['file'], r['jp'].get('diff', float('nan')), r['jp'].get('twin', float('nan')),
                                               'kept' if r['jp']['match'] else 'refused')) if r['jp'] else ''
        print('%d\t%s%s\t%s\tdiff %.2f\tpreview %.2f scale %.3f at %s%s\t%s%s' % (
            i, r['name'], ' (%s)' % r['kind'] if r['kind'] else '', r['art'], r['diff'], pv.get('diff', float('nan')), pv.get('scale') or 0,
            r['pos'], jp, status, ('\t' + ', '.join(flags)) if flags else ''))
        results.append(r)
        rows.append(report_row(r, status))
    gold = os.path.join(a.jp, 'img', 'sphere_board', 'Board_0003.png')
    main_rows = [r for r in results if not (a.classc_sheet and r['source'] == 'classC')]
    if a.sheet and main_rows:
        sheet(main_rows, gold, a.sheet)
        print('sheet -> %s' % a.sheet)
    class_c = [r for r in results if r['source'] == 'classC']
    if a.classc_sheet and class_c:
        sheet(class_c, gold, a.classc_sheet)
        print('class C sheet -> %s' % a.classc_sheet)
    if a.report:
        with open(a.report, 'w', encoding='utf-8') as f:
            json.dump({'calibration': cal, 'fitMax': FIT_MAX, 'twinMax': TWIN_MAX, 'boards': rows}, f, ensure_ascii=False, indent=1)
    print('BOARD_ART: {%s}' % ', '.join("%d: '%s'" % (r['id'], r['art']) for r in results))
    if bad:
        raise SystemExit('%d Part 1 cards hold another picture than the approved ones' % bad)


if __name__ == '__main__':
    main(sys.argv[1:])
