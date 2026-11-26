"""Game Catalog banner of make_special_banners.py (user 26-11): the one catalogue banner of the Events tab (5000.png, evStage 5000 of
server/make-game-catalog.js) in the catalogue family (gold title, subtitle, TRAINING sticker, gold frame), with the five catalogue
emblems on the right.

    python -I recon/tools/test_make_game_catalog_banner.py
"""
import os
import re
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


def inside(b, fi=m.FRAME_INNER):
    return fi[0] <= b[0] and fi[1] <= b[1] and b[2] <= fi[2] and b[3] <= fi[3]


def overlap(a, b):
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


tmp = tempfile.mkdtemp(prefix='khux-game-banner-')
try:
    # fixture emblems (the local game files are not needed): five coloured discs
    pieces = {}
    for i, k in enumerate(('coliseum', 'raid', 'event', 'avatar', 'special')):
        im = Image.new('RGBA', (96, 96), (0, 0, 0, 0))
        ImageDraw.Draw(im).ellipse((2, 2, 93, 93), fill=(60 + 40 * i, 200 - 30 * i, 90, 255))
        pieces[k] = os.path.join(tmp, '%s.png' % k)
        im.save(pieces[k])

    # the evStage id of the generator
    with open(os.path.join(m.REPO, 'server', 'make-game-catalog.js'), encoding='utf-8') as f:
        js = f.read()
    check(re.search(r'GAME_CATALOG_EV = (\d+)', js).group(1) == str(m.GAME_CATALOG_EV) == '5000', 'banner evStage 5000 as make-game-catalog.js')

    card = m.game_option('A', pieces)
    rgb = card.convert('RGB')
    check(card.size == (640, 140), 'banner 640x140')
    check(rgb.getpixel((1, 70)) == m.FAMILY_GOLD[:3] and rgb.getpixel((320, 138)) == m.FAMILY_GOLD[:3], 'gold frame of the catalogue family')
    tb, sb = card.info.get('title_box'), card.info.get('sticker_box')
    check(tb is not None and tb[0] >= 10 and tb[2] <= m.GAME_TITLE_RIGHT, 'title %s left of the art (%d)' % (tb, m.GAME_TITLE_RIGHT))
    check(sb is not None and inside(sb) and tb[2] < sb[0], 'TRAINING sticker %s inside the frame, clear of the title' % (sb,))
    pc = card.info.get('pieces') or []
    check(len(pc) == 5 and all(inside(b) for b in pc), 'five emblems inside the frame %s' % (pc,))
    check(all(b[0] >= m.GAME_TITLE_RIGHT for b in pc), 'the emblems keep clear of the title %s' % (pc,))
    check(not any(overlap(b, sb) for b in pc), 'the emblems keep clear of the sticker %s' % (pc,))
    gold = lambda p: p[0] > 200 and p[1] > 120 and p[2] < 120  # noqa: E731
    check(sum(gold(rgb.getpixel((x, y))) for y in range(30, 75) for x in range(20, 300)) > 1200, 'gold title lettering')
    bg = ImageStat.Stat(rgb.crop((300, 116, 420, 134))).mean
    check(bg[2] > bg[0] + 20, 'blue / violet background %s' % (bg,))
    for k, opt in (('special', m.special_option('B')), ('raid', m.raid_option('B1')), ('event', m.event_option('A')), ('colosseum', m.colosseum_option('A', {}))):
        check(mean(ImageChops.difference(rgb, opt.convert('RGB'))) > 12, 'apart from the %s catalogue card' % k)
    # missing pieces: still a card (WARNING), without the art
    bare = m.game_option('A', {k: None for k in pieces})
    check(bare.size == (640, 140) and mean(ImageChops.difference(rgb, bare.convert('RGB'))) > 2, 'the emblems change the card')
    try:
        m.game_option('B', pieces)
        errors.append('unknown style accepted')
    except ValueError:
        pass

    # build_game and the --section game command line write 5000.png in the given folder
    out = os.path.join(tmp, 'out')
    path = m.build_game(out, pieces)
    check(os.path.basename(path) == '5000.png' and Image.open(path).size == (640, 140) and Image.open(path).mode == 'RGB', 'build_game writes an RGB 5000.png')
    cli = os.path.join(tmp, 'cli')
    r = subprocess.run([sys.executable, '-I', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_special_banners.py'), '--section', 'game',
                        '--catalog-img', cli], capture_output=True, text=True)
    check(r.returncode == 0 and os.path.exists(os.path.join(cli, '5000.png')), '--section game: %s %s' % (r.returncode, r.stderr[-300:]))
finally:
    shutil.rmtree(tmp, ignore_errors=True)

if errors:
    print('FAIL\n' + '\n'.join(errors))
    sys.exit(1)
print('ok: Game Catalog banner')
