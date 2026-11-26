"""Coliseum Board card pictures (Coliseum Part 2 Task 4; the 26-11 method of docs/notes/coliseum.md «Board card pictures»).

    python -I recon/tools/coliseum_board_cards.py [--ids part2|part1|<id>,<id>...] [--wiki D] [--jp D] [--loc D]
        [--sheet F] [--report F] [--out D] [--overwrite]

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
    """the card of one board: {id, name, kind, source ('jp' | 'loc'), art (BOARD_ART value), diff, preview: {...}, jp: {...},
    image (PIL, loc only), pos, shot}"""
    name, kind, stem, cand = BOARDS[bid]
    shot_img = Image.open(layout_file(wiki, stem)).convert('RGB')
    shot = np.asarray(shot_img, dtype=np.float32)
    res = {'id': bid, 'name': name, 'kind': kind, 'wiki': stem, 'jp': None}
    pic = rgba(preview_file(wiki, stem))
    pv = fit(shot, pic, cal)
    res['preview'] = {'file': 'Preview_-_%s.png' % stem, 'size': list(pic.size), **pv,
                      'scaleOk': pv['scale'] is not None and abs(pv['scale'] - 1) <= SCALE_TOL, 'fitOk': pv['diff'] <= FIT_MAX}
    if cand:
        f = jp_file(jp, cand)
        if f:
            j = fit(shot, rgba(f), cal, full=True)
            tw, at = twin(pic, rgba(f), pv['u'], pv['v']) if pv['u'] is not None else (float('inf'), None)
            res['jp'] = {'file': cand, **j, 'twin': tw, 'twinAt': list(at) if at else None, 'match': j['diff'] <= FIT_MAX and tw <= TWIN_MAX}
        else:
            res['jp'] = {'file': cand, 'missing': True, 'match': False}
    if res['jp'] and res['jp']['match']:
        res.update(source='jp', art='jp:' + cand, diff=res['jp']['diff'], image=rgba(jp_file(jp, cand)), pos=None)
    else:
        img, pos = place(pic, pv['u'], pv['v'])
        res.update(source='loc', art='loc', diff=pv['diff'], image=img, pos=list(pos))
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
        src = r['art'] if r['source'] == 'jp' else 'wiki preview %s at %s' % ('x'.join(map(str, r['preview']['size'])), tuple(r['pos']))
        d.text((x, y), '%d  %s%s' % (r['id'], r['name'], ' (%s)' % r['kind'] if r['kind'] else ''), fill=(255, 255, 255))
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
    keep = ('id', 'name', 'kind', 'wiki', 'source', 'art', 'diff', 'pos', 'jp', 'preview')
    return {**{k: r[k] for k in keep}, 'file': status}


def main(argv):
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--ids', default='part2')
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
        flags = [f for f, c in (('fit above %.2f' % FIT_MAX, r['diff'] > FIT_MAX), ('preview scale %.3f' % (r['preview']['scale'] or 0), r['source'] == 'loc' and not r['preview']['scaleOk'])) if c]
        jp = (' | JP %s %.2f twin %.2f %s' % (r['jp']['file'], r['jp'].get('diff', float('nan')), r['jp'].get('twin', float('nan')),
                                               'kept' if r['jp']['match'] else 'refused')) if r['jp'] else ''
        print('%d\t%s%s\t%s\tdiff %.2f\tpreview %.2f scale %.3f at %s%s\t%s%s' % (
            i, r['name'], ' (%s)' % r['kind'] if r['kind'] else '', r['art'], r['diff'], r['preview']['diff'], r['preview']['scale'] or 0,
            r['pos'], jp, status, ('\t' + ', '.join(flags)) if flags else ''))
        results.append(r)
        rows.append(report_row(r, status))
    if a.sheet:
        sheet(results, os.path.join(a.jp, 'img', 'sphere_board', 'Board_0003.png'), a.sheet)
        print('sheet -> %s' % a.sheet)
    if a.report:
        with open(a.report, 'w', encoding='utf-8') as f:
            json.dump({'calibration': cal, 'fitMax': FIT_MAX, 'twinMax': TWIN_MAX, 'boards': rows}, f, ensure_ascii=False, indent=1)
    print('BOARD_ART: {%s}' % ', '.join("%d: '%s'" % (r['id'], r['art']) for r in results))
    if bad:
        raise SystemExit('%d Part 1 cards hold another picture than the approved ones' % bad)


if __name__ == '__main__':
    main(sys.argv[1:])
