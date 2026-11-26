"""Offline test of coliseum_board_cards.py on synthetic board screenshots (no original pictures needed).

    python -I recon/tools/test_coliseum_board_cards.py   -> «OK: ...» or «ERRORS (n)», exit 1

Checks: the card box found in a screenshot (also when the picture covers the gold), the calibration on a card of known place
(origin 0, ratio 1), a cut picture fitted back to its place and pasted at native size (never resampled, kept inside the
canvas), a JP card kept only when it fits the screenshot AND the preview is a cut of it (a JP card of another picture is
refused even with a low screenshot difference), an existing card never replaced without --overwrite, 2210191 never rebuilt,
and the review sheet / report written.
"""
import json
import os
import sys
import tempfile

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import coliseum_board_cards as cbc  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)


S = cbc.SIZE
BG, GOLD = (20, 30, 80), (240, 200, 120)


def picture(w, h, seed):
    """an opaque picture with structure (blocks of bright colours) and a soft transparent rim"""
    rng = np.random.default_rng(seed)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for _ in range(40):
        x, y = int(rng.integers(0, w - 20)), int(rng.integers(0, h - 20))
        c = tuple(int(v) for v in rng.integers(120, 255, 3))
        d.rectangle((x, y, x + int(rng.integers(8, 40)), y + int(rng.integers(8, 40))), fill=c + (255,))
    d.rectangle((0, 0, w - 1, h - 1), outline=(255, 255, 255, 120))
    return im


def canvas_with(pic, pos):
    c = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    c.paste(pic, pos)
    return c


def screenshot(card, k, at, size=(640, 320)):
    """the board screen: dark blue board, the gold card (light outline) with the card picture, scaled by k, at `at`"""
    full = Image.new('RGBA', (S, S), (255, 245, 220, 255))
    ImageDraw.Draw(full).rectangle((3, 3, S - 4, S - 4), fill=GOLD + (255,))
    full.alpha_composite(card)
    side = round(S * k)
    shot = Image.new('RGB', size, BG)
    shot.paste(full.convert('RGB').resize((side, side), Image.LANCZOS), at)
    return shot


with tempfile.TemporaryDirectory() as tmp:
    wiki, jp, loc = (os.path.join(tmp, d) for d in ('wiki', 'jp', 'loc'))
    for d in (os.path.join(wiki, 'layout'), os.path.join(wiki, 'preview'), os.path.join(jp, 'img', 'sphere_incentive'), os.path.join(jp, 'img', 'sphere_board')):
        os.makedirs(d)
    # the reference card (known place: the JP file is the whole canvas) and its screenshot
    ref = canvas_with(picture(200, 260, 1), (60, 30))
    ref.save(os.path.join(jp, 'img', 'sphere_incentive', '2200001.png'))
    screenshot(ref, 0.6, (40, 30)).save(os.path.join(wiki, 'layout', 'Coliseum_Board_-_Ref_KHUX.png'))
    # board A: a picture cut to 150 x 294 at (70, 6), screenshot at another size and place; its JP twin is the whole card
    a_pic = picture(150, 294, 2)
    a_card = canvas_with(a_pic, (70, 6))
    screenshot(a_card, 0.8, (90, 20), (900, 400)).save(os.path.join(wiki, 'layout', 'Coliseum_Board_-_A_KHUX.png'))
    a_pic.save(os.path.join(wiki, 'preview', 'Preview_-_A.png'))
    a_card.save(os.path.join(jp, 'img', 'sphere_incentive', '2200037.png'))
    # board B: a cut picture at the bottom (its fit would cut opaque rows: kept inside); its JP candidate is another picture
    # with the same colours in most places (low screenshot difference, not a twin)
    b_pic = picture(200, 300, 3)
    b_card = canvas_with(b_pic, (50, 6))
    screenshot(b_card, 0.6, (30, 40)).save(os.path.join(wiki, 'layout', 'Coliseum_Board_-_B.png'))  # no _KHUX suffix
    b_pic.save(os.path.join(wiki, 'preview', 'Preview_-_B.png'))
    other = b_card.copy()
    ImageDraw.Draw(other).rectangle((90, 40, 200, 150), fill=(200, 170, 120, 255))  # a detail missing (gold-like colours)
    other.save(os.path.join(jp, 'img', 'sphere_incentive', '2200046.00000002.png'))  # a revision name
    Image.new('RGBA', (S, S), GOLD + (255,)).save(os.path.join(jp, 'img', 'sphere_board', 'Board_0003.png'))

    cbc.BOARDS = {2200001: ('Ref', '', 'Ref', None), 2210037: ('Board A', 'M', 'A', '2200037.png'),
                  2210044: ('Board B', 'F', 'B', '2200046.png'), 2210191: ('Hand', '', 'A', None)}

    shot = np.asarray(Image.open(os.path.join(wiki, 'layout', 'Coliseum_Board_-_A_KHUX.png')).convert('RGB'), dtype=np.float32)
    x0, y0, side = cbc.card_box(shot)
    check(abs(x0 - 90) <= 1 and abs(y0 - 20) <= 1 and abs(side - round(S * 0.8)) <= 2, 'card box %r' % ((x0, y0, side),))

    ref_shot = np.asarray(Image.open(os.path.join(wiki, 'layout', 'Coliseum_Board_-_Ref_KHUX.png')).convert('RGB'), dtype=np.float32)
    cal = cbc.calibrate(ref_shot, ref)
    check(abs(cal['ratio'] - 1) < 0.02 and abs(cal['ox']) < 0.02 and abs(cal['oy']) < 0.02, 'calibration %r' % cal)
    check(cal['diff'] < 8, 'calibration diff %.2f' % cal['diff'])

    check(cbc.jp_file(jp, '2200046.png').endswith('2200046.00000002.png'), 'JP revision name')
    check(cbc.jp_file(jp, '2200099.png') is None, 'missing JP file')

    a = cbc.card(2210037, wiki, jp, cal)
    check(a['source'] == 'jp' and a['art'] == 'jp:2200037.png', 'A: the JP twin kept, %r' % a['art'])
    check(a['jp']['twin'] < 1 and a['jp']['diff'] <= cbc.FIT_MAX, 'A: twin %.2f diff %.2f' % (a['jp']['twin'], a['jp']['diff']))
    check(abs(a['preview']['u'] - 70) <= 2 and abs(a['preview']['v'] - 6) <= 2, 'A: preview fitted at %r' % ((a['preview']['u'], a['preview']['v']),))
    check(abs(a['preview']['scale'] - 1) <= cbc.SCALE_TOL, 'A: scale %r' % a['preview']['scale'])

    b = cbc.card(2210044, wiki, jp, cal)
    check(b['source'] == 'loc' and b['art'] == 'loc', 'B: the JP picture of another card refused, %r' % b['art'])
    check(b['jp']['twin'] > cbc.TWIN_MAX and b['jp']['diff'] <= cbc.FIT_MAX, 'B: fits the screenshot (%.2f) but no twin (%.2f)' % (b['jp']['diff'], b['jp']['twin']))
    tall = picture(120, 300, 4)
    img, pos = cbc.place(tall, 200, 20)
    check(pos == (S - 120, S - 300) and img.getbbox() == (S - 120, S - 300, S, S), 'place: kept inside the canvas %r' % (pos,))
    check(b['image'].size == (S, S) and b['pos'][1] == S - 300 and abs(b['pos'][0] - 50) <= 2, 'B: kept inside the canvas %r' % (b['pos'],))
    x, y = b['pos']
    check(np.array_equal(np.asarray(b['image'])[y:y + 300, x:x + 200], np.asarray(b_pic)), 'B: native pixels, no resampling')
    check(np.asarray(b['image'])[..., 3][:y].max() == 0, 'B: transparent outside the picture')

    # files: written once, the same card again = same, another card over it = kept without --overwrite; a JP card writes none
    check(cbc.write_card(b, loc) == 'written', 'B written')
    check(cbc.write_card(b, loc) == 'same', 'B same')
    p = os.path.join(loc, 'img', 'sphere_incentive_coli', '2210044.png')
    Image.new('RGBA', (S, S), (1, 2, 3, 255)).save(p)
    check(cbc.write_card(b, loc) == 'kept' and Image.open(p).getpixel((0, 0)) == (1, 2, 3, 255), 'an approved card is kept')
    check(cbc.write_card(b, loc, overwrite=True) == 'written', '--overwrite replaces it')
    check(cbc.write_card(a, loc) == '' and not os.path.exists(os.path.join(loc, 'img', 'sphere_incentive_coli', '2210037.png')), 'a JP card writes no file')
    hand = dict(b, id=2210191)
    try:
        cbc.write_card(hand, loc, overwrite=True)
        check(False, '2210191 must never be rebuilt')
    except SystemExit:
        pass

    # compare: the same picture at another place
    same, at = cbc.compare(canvas_with(b_pic, (50, 0)), b['image'])
    check(same and at == (50, 0), 'compare %r %r' % (same, at))
    check(not cbc.compare(other, b['image'])[0], 'compare: another picture')

    # the command line: review sheet and report, the hand-made card refused
    sheet, rep = os.path.join(tmp, 'sheet.png'), os.path.join(tmp, 'rep.json')
    cbc.REF_ID = 2200001
    cbc.main(['--ids', '2210037,2210044', '--wiki', wiki, '--jp', jp, '--loc', os.path.join(tmp, 'loc2'), '--sheet', sheet, '--report', rep])
    r = json.load(open(rep, encoding='utf-8'))
    check([(x['id'], x['art'], x['file']) for x in r['boards']] == [(2210037, 'jp:2200037.png', ''), (2210044, 'loc', 'written')], 'report %r' % r['boards'])
    check(r['fitMax'] == cbc.FIT_MAX and r['twinMax'] == cbc.TWIN_MAX, 'report thresholds')
    check(Image.open(sheet).size[0] > 2 * S, 'sheet')
    try:
        cbc.main(['--ids', '2210191', '--wiki', wiki, '--jp', jp, '--loc', loc])
        check(False, '--ids 2210191 must stop')
    except SystemExit:
        pass

if errors:
    print('ERRORS (%d)' % len(errors))
    for e in errors:
        print(' -', e)
    sys.exit(1)
print('OK: card box, calibration, fit at native size, JP twin rule, protected files, sheet and report')
