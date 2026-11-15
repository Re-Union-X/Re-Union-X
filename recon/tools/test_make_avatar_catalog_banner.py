"""Test of the Avatar Board Catalog banner (make_special_banners.py avatar_option, make_avatar_catalog_banner.py):
python -I recon/tools/test_make_avatar_catalog_banner.py

User 15-11: our own banner in the gold catalogue family (Special / Raid / Event Catalog), gold colours, built from original
pieces (board cards, the Avatar Coin). Synthetic pieces here (no game picture in the repository); with the local game data
the real pieces are checked too."""
import json
import os
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageChops, ImageStat  # noqa: E402
import make_special_banners as m  # noqa: E402
import make_avatar_catalog_banner as mac  # noqa: E402

errors = []


def check(ok, msg):
    if not ok:
        errors.append(msg)


tmp = tempfile.mkdtemp(prefix='khux-avc-')
try:
    # synthetic board cards (306x306, transparent around a figure) and Avatar Coin
    cards = os.path.join(tmp, 'cards')
    os.makedirs(cards)
    for i, did in enumerate(m.AVATAR_CARDS):
        c = Image.new('RGBA', (306, 306), (0, 0, 0, 0))
        c.paste(Image.new('RGBA', (180, 260), (60 + 60 * i, 120, 200, 255)), (100, 30))
        c.save(os.path.join(cards, '%d.png' % did))
    coin = os.path.join(tmp, 'coin.png')
    Image.new('RGBA', (96, 96), (250, 200, 60, 255)).save(coin)

    o = m.avatar_option('A', cards_dir=cards, coin=coin)
    rgb = o.convert('RGB')
    check(o.size == (640, 140), 'size %s' % (o.size,))
    tb, sb, fi = o.info.get('title_box'), o.info.get('sticker_box'), m.FRAME_INNER
    check(tb is not None and tb[0] >= 10 and tb[2] <= m.TITLE_MAX_RIGHT, 'title box %s left of the TRAINING sticker' % (tb,))
    check(sb is not None and fi[0] <= sb[0] and fi[1] <= sb[1] and sb[2] <= fi[2] and sb[3] <= fi[3], 'TRAINING sticker inside the frame')
    out_ = [b for b in o.info.get('pieces', []) if not (fi[0] <= b[0] and fi[1] <= b[1] and b[2] <= fi[2] and b[3] <= fi[3])]
    check(len(o.info.get('pieces', [])) >= len(m.AVATAR_CARDS) + 1 and not out_, 'board cards and coins inside the frame (out: %s)' % out_)
    check(rgb.getpixel((1, 70)) == m.FAMILY_GOLD[:3] and rgb.getpixel((320, 138)) == m.FAMILY_GOLD[:3], 'gold frame')
    # the gold scheme: the background right of the title is gold / amber (red > green > blue, warm and bright)
    r, g, b = ImageStat.Stat(rgb.crop((330, 112, 420, 132))).mean
    check(r > 150 and r > g > b and r - b > 60, 'gold background (mean %d,%d,%d)' % (r, g, b))
    check(m.AVATAR_CATALOG_TITLE == 'AVATAR BOARD CATALOG', 'title')
    # the title in the family lettering (gold_text), not another style
    gold = sum(1 for p in rgb.crop((20, 30, 300, 75)).getdata() if p[0] > 200 and 120 < p[1] < 250 and p[2] < 150)
    check(gold > 1200, 'gold title (%d px)' % gold)
    # different from the other three catalogue banners
    for k, st in m.CATALOG_CHOICE.items():
        other = m.CATALOG_OPTIONS[k](st).convert('RGB')
        check(ImageStat.Stat(ImageChops.difference(rgb, other)).mean[0] > 12, 'too alike the %s banner' % k)
    # a missing piece leaves it out with a WARNING; the banner is still made
    o2 = m.avatar_option('A', cards_dir=os.path.join(tmp, 'none'), coin=None)
    check(o2.size == (640, 140), 'without the pieces')

    # make_avatar_catalog_banner.py: the evStage id from event_ids.json (rows[avatarCatalogKey], written by the regen)
    config = {'evStageBase': 20000, 'avatarCatalogKey': '@avatarBoardCatalog'}
    cfg, ids = os.path.join(tmp, 'event_config.json'), os.path.join(tmp, 'event_ids.json')
    json.dump(config, open(cfg, 'w', encoding='utf-8'))
    json.dump({'rows': {'EV-1': 1}}, open(ids, 'w', encoding='utf-8'))
    try:
        mac.build(cfg, ids, os.path.join(tmp, 'img'), cards_dir=cards, coin=coin)
        errors.append('no id before the regen: must stop')
    except SystemExit as e:
        check('regen' in str(e), str(e))
    json.dump({'rows': {'EV-1': 1, '@avatarBoardCatalog': 2928}}, open(ids, 'w', encoding='utf-8'))
    path = mac.build(cfg, ids, os.path.join(tmp, 'img'), cards_dir=cards, coin=coin)
    check(path == os.path.join(tmp, 'img', '22928.png'), path)
    check(Image.open(path).size == (640, 140), 'written at 640x140')
    # the four catalogue banners side by side (the review sheet)
    sheet = mac.montage(os.path.join(tmp, 'four.png'), cards_dir=cards, coin=coin)
    check(Image.open(sheet).size[1] >= 4 * 140, 'four banners')
    # the original-banner pick is gone (user 15-11: own gold design)
    real = json.load(open(mac.CONFIG, encoding='utf-8'))
    check('avatarCatalogBanner' not in real and 'avatarCatalogBannerCandidates' not in real, 'no original-banner pick left in event_config.json')
    # with the local game data: the real board cards and Avatar Coin are found
    if os.path.isdir(m.AVATAR_CARDS_DIR):
        o3 = m.avatar_option('A')
        check(len(o3.info.get('pieces', [])) >= len(m.AVATAR_CARDS) + 1, 'real pieces: %s' % o3.info.get('pieces'))
finally:
    shutil.rmtree(tmp, ignore_errors=True)

if errors:
    print('\n'.join('FAIL: ' + e for e in errors))
    sys.exit(1)
print('test_make_avatar_catalog_banner: OK')
