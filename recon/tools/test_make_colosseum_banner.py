"""Coliseum Catalog cards of make_special_banners.py (Coliseum Part 1, Task 6): the catalogue banner 6000.png in the catalogue
family (gold title, subtitle, TRAINING sticker, gold frame) on its own blue, and one card per season of server/make-colosseum.js.

    python -I recon/tools/test_make_colosseum_banner.py
"""
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image, ImageChops, ImageDraw, ImageStat

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_special_banners as m  # noqa: E402

errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)


def mean(im):
    return sum(ImageStat.Stat(im).mean) / 3


def pixels(im):
    return [im.getpixel((x, y)) for y in range(im.height) for x in range(im.width)]


def inside(b, fi=m.FRAME_INNER):
    return fi[0] <= b[0] and fi[1] <= b[1] and b[2] <= fi[2] and b[3] <= fi[3]


tmp = tempfile.mkdtemp(prefix='khux-col-banner-')
try:
    # fixture pieces (the local game files are not needed): a panel, a coin, a crown
    pieces = {}
    for k, size, col in (('panel', (145, 132), (200, 160, 60, 255)), ('coin', (86, 86), (240, 190, 40, 255)), ('crown', (114, 79), (250, 210, 0, 255))):
        im = Image.new('RGBA', size, (0, 0, 0, 0))
        ImageDraw.Draw(im).ellipse((2, 2, size[0] - 3, size[1] - 3), fill=col)
        pieces[k] = os.path.join(tmp, '%s.png' % k)
        im.save(pieces[k])

    # SEASONS of make-colosseum.js: one per WW month from 2016-04 (800), ids +100 a month (24 seasons to 2018-03 since Part 3)
    seasons = m.colosseum_seasons()
    want = [('%d-%02d' % (2016 + (3 + i) // 12, (3 + i) % 12 + 1), 800 + 100 * i) for i in range(len(seasons))]
    check(len(seasons) >= 24 and seasons == want, 'the seasons of make-colosseum.js SEASONS %s' % (seasons,))
    check(m.COLOSSEUM_CATALOG_EV == 6000, 'banner evStage 6000')

    cat = m.colosseum_option('A', pieces)
    rgb = cat.convert('RGB')
    check(cat.size == (640, 140), 'banner 640x140')
    check(rgb.getpixel((1, 70)) == m.FAMILY_GOLD[:3] and rgb.getpixel((320, 138)) == m.FAMILY_GOLD[:3], 'gold frame of the catalogue family')
    tb, sb = cat.info.get('title_box'), cat.info.get('sticker_box')
    check(tb is not None and tb[0] >= 10 and tb[2] <= m.COLOSSEUM_TITLE_RIGHT, 'title %s left of the art (%d)' % (tb, m.COLOSSEUM_TITLE_RIGHT))
    check(sb is not None and inside(sb) and tb[2] < sb[0], 'TRAINING sticker %s inside the frame, clear of the title' % (sb,))
    pc = cat.info.get('pieces') or []
    check(len(pc) == 3 and all(inside(b) for b in pc), 'panel, coin and crown inside the frame %s' % (pc,))
    check(all(b[0] >= m.COLOSSEUM_TITLE_RIGHT for b in pc), 'the art keeps clear of the title %s' % (pc,))
    gold = lambda p: p[0] > 200 and p[1] > 120 and p[2] < 120  # noqa: E731
    check(sum(gold(p) for p in pixels(rgb.crop((20, 30, 300, 75)))) > 1200, 'gold title lettering')
    bg = ImageStat.Stat(rgb.crop((300, 110, 420, 134))).mean
    check(bg[2] > bg[0] + 30, 'blue Olympus background %s' % (bg,))
    for k, opt in (('special', m.special_option('B')), ('raid', m.raid_option('B1')), ('event', m.event_option('A'))):
        check(mean(ImageChops.difference(rgb, opt.convert('RGB'))) > 12, 'apart from the %s catalogue card' % k)
    # missing pieces: still a card (WARNING), without the art
    bare = m.colosseum_option('A', {'panel': None, 'coin': None, 'crown': None})
    check(bare.size == (640, 140) and mean(ImageChops.difference(rgb, bare.convert('RGB'))) > 2, 'the pieces change the card')
    try:
        m.colosseum_option('B', pieces)
        errors.append('unknown style accepted')
    except ValueError:
        pass

    # a season card: the month as title, no TRAINING sticker, the same frame
    sc = m.colosseum_season_card('2016-04', pieces)
    src = sc.convert('RGB')
    check(sc.size == (640, 140) and src.getpixel((1, 70)) == m.FAMILY_GOLD[:3], 'season card 640x140 with the gold frame')
    check(mean(ImageChops.difference(src.crop(sb), rgb.crop(sb))) > 20, 'no TRAINING sticker on a season card')
    check(mean(ImageChops.difference(src, m.colosseum_season_card('2016-05', pieces).convert('RGB'))) > 1, 'the month changes the card')
    check(all(inside(b) for b in sc.info.get('pieces') or [(0, 0, 999, 999)]), 'season card pieces inside the frame')

    # build: 6000.png and one card per season, full colour, identical on a rebuild
    out = os.path.join(tmp, 'colosseum_img')
    n = m.build_colosseum(out, [('2016-04', 800), ('2016-05', 900)], pieces)
    check(n == {'catalog': 1, 'seasons': 2}, 'counts %s' % (n,))
    check(sorted(os.listdir(out)) == ['6000.png', '800.png', '900.png'], 'files %s' % (sorted(os.listdir(out)),))
    b1 = open(os.path.join(out, '6000.png'), 'rb').read()
    m.build_colosseum(out, [('2016-04', 800), ('2016-05', 900)], pieces)
    check(open(os.path.join(out, '6000.png'), 'rb').read() == b1, 'identical on a rebuild')
    check(Image.open(os.path.join(out, '6000.png')).mode == 'RGB', 'saved in full colour')

    # command line: --section colosseum writes into --colosseum-img (with whatever local pieces there are)
    cli = os.path.join(tmp, 'cli')
    r = subprocess.run([sys.executable, '-I', os.path.join(m.HERE, 'make_special_banners.py'), '--section', 'colosseum', '--colosseum-img', cli],
                       capture_output=True, text=True, encoding='utf-8')
    check(r.returncode == 0, 'CLI exit %s: %s' % (r.returncode, r.stderr[-400:]))
    check(os.path.isdir(cli) and sorted(os.listdir(cli)) == sorted(['6000.png'] + ['%d.png' % sid for _, sid in seasons]),
          'CLI files %s' % (sorted(os.listdir(cli)) if os.path.isdir(cli) else None,))
finally:
    shutil.rmtree(tmp, ignore_errors=True)

if errors:
    print('ERRORS (%d)' % len(errors))
    for e in errors:
        print(' -', e)
    sys.exit(1)
print('OK: Coliseum Catalog cards (6000 + seasons)')
