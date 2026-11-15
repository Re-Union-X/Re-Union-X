"""Banner of the Avatar Board Catalog in the Special tab (Events Part 7 Task 5b; user 15-11: our own banner in the gold catalogue
family, in GOLD, composed of original pieces as the Special / Raid / Event Catalog banners; make_special_banners.avatar_option).

    python -I recon/tools/make_avatar_catalog_banner.py [--config F] [--ids F] [--out D]
        -> server/game_data/event_img/<evStageId>.png (git-ignored)
    python -I recon/tools/make_avatar_catalog_banner.py --montage [F]
        -> D:/Progetto_Restauro_KH_UX/screenshots/avb_catalog_banner_gold.png (the four catalogue banners, for the user)

evStageId = event_config.json evStageBase + server/event_ids.json rows[avatarCatalogKey]: the number make-events.js gives the
banner at the master regen (with KHUX_AVATAR_BOARDS). Run after that regen; before it the id does not exist and the run stops.
Pieces (local only, never in the repository): the original board cards of raid_loc/img/sphere_incentive_av and the Avatar
Coin of the local JP 4.3.1 data; a missing piece is left out with a WARNING. After a change of the picture bump imgVersion in
event_config.json, then the master revision.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402
import make_special_banners as msb  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
ROOT = os.path.dirname(os.path.dirname(REPO))
CONFIG = os.path.join(REPO, 'server', 'event_config.json')
IDS = os.path.join(REPO, 'server', 'event_ids.json')
OUT = os.path.join(REPO, 'server', 'game_data', 'event_img')
MONTAGE = os.path.join(ROOT, 'screenshots', 'avb_catalog_banner_gold.png')
# the three catalogue banners already served (game_data, git-ignored), beside the new one in the montage
SERVED = [('Special Catalog', os.path.join(REPO, 'server', 'game_data', 'special_img', '7000.png')),
          ('Raid Catalog', os.path.join(REPO, 'server', 'game_data', 'raid_img', '8000.png')),
          ('Event Catalog', os.path.join(REPO, 'server', 'game_data', 'event_img', '20000.png'))]


def _json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def evstage_id(config_file=CONFIG, ids_file=IDS):
    config, ids = _json(config_file), _json(ids_file)
    n = (ids.get('rows') or {}).get(config.get('avatarCatalogKey'))
    if not n:
        sys.exit('%s has no rows[%r] yet: run the master regen with KHUX_AVATAR_BOARDS first (make-events.js numbers the banner)'
                 % (ids_file, config.get('avatarCatalogKey')))
    return int(config['evStageBase']) + int(n)


def build(config_file=CONFIG, ids_file=IDS, out_dir=OUT, cards_dir=None, coin=None):
    """writes <out_dir>/<evStageId>.png; -> its path"""
    return msb.build_avatar(evstage_id(config_file, ids_file), out_dir, cards_dir, coin)


def montage(out=MONTAGE, cards_dir=None, coin=None):
    """the Special, Raid and Event Catalog banners as served and the new Avatar Board Catalog banner, one under the other at
    640x140 with their names"""
    rows = [(name, Image.open(p).convert('RGB') if os.path.exists(p) else None) for name, p in SERVED]
    rows.append(('Avatar Board Catalog (new, gold)', msb.avatar_option('A', cards_dir, coin).convert('RGB')))
    head, gap = 20, 8
    sheet = Image.new('RGB', (640 + 2 * gap, len(rows) * (140 + head + gap) + gap), (22, 30, 58))
    d = ImageDraw.Draw(sheet)
    for i, (name, im) in enumerate(rows):
        y = gap + i * (140 + head + gap)
        d.text((gap, y + 4), name if im is not None else name + ' (not built here)', fill=(255, 255, 255))
        if im is not None:
            sheet.paste(im, (gap, y + head))
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    sheet.save(out)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', default=CONFIG)
    ap.add_argument('--ids', default=IDS)
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--montage', nargs='?', const=MONTAGE, default=None)
    a = ap.parse_args()
    print(montage(a.montage) if a.montage else build(a.config, a.ids, a.out))


if __name__ == '__main__':
    main()
