"""Banner of the Avatar Board Catalog in the Special tab (Events Part 7 Task 5b, user 15-11): an ORIGINAL picture, never drawn.

    python -I recon/tools/make_avatar_catalog_banner.py [--config F] [--index F] [--out D] [--root D]
        -> server/game_data/event_img/<evStageId>.png (git-ignored; evStageId = events.json avatarCatalog, make-events.js)
    python -I recon/tools/make_avatar_catalog_banner.py --montage [F]
        -> D:/Progetto_Restauro_KH_UX/screenshots/avb_catalog_banner_candidates.png (the candidates at banner size, for the user)

The picture is server/event_config.json avatarCatalogBanner, one of avatarCatalogBannerCandidates (paths under --root,
D:/Progetto_Restauro_KH_UX: original WW notice banners of reference/event_banners_ww, local only, never in the repository).
The choice is that one line. The file is fitted to 640x140 by make_banner_images.fit (centre crop when the ratio differs) and
nothing is added to it. Run after make-events.js (the banner's evStage id); after a change bump imgVersion in event_config.json,
then the master revision.
"""
import argparse
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402
import make_banner_images as mbi  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
ROOT = os.path.dirname(os.path.dirname(REPO))
CONFIG = os.path.join(REPO, 'server', 'event_config.json')
INDEX = os.path.join(REPO, 'server', 'game_data', 'events.json')
OUT = os.path.join(REPO, 'server', 'game_data', 'event_img')
MONTAGE = os.path.join(ROOT, 'screenshots', 'avb_catalog_banner_candidates.png')


def _json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def chosen(config):
    pick, cands = config.get('avatarCatalogBanner'), config.get('avatarCatalogBannerCandidates') or []
    if not pick or pick not in cands:
        sys.exit(f'avatarCatalogBanner {pick!r} is not one of avatarCatalogBannerCandidates (the user picks among the candidates)')
    return pick


def build(config_file=CONFIG, index_file=INDEX, out_dir=OUT, root=ROOT):
    """writes <out_dir>/<evStageId>.png from the chosen original; -> its path"""
    config, index = _json(config_file), _json(index_file)
    ev = (index.get('avatarCatalog') or {}).get('evStageId')
    if not ev:
        sys.exit(f'{index_file}: no avatarCatalog (make-events.js writes it with KHUX_AVATAR_BOARDS and the Training Grounds row)')
    src = os.path.join(root, chosen(config))
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f'{ev}.png')
    mbi.fit(Image.open(src)).save(path)
    return path


def montage(config_file=CONFIG, out=MONTAGE, root=ROOT):
    """the candidates one under the other at 640x140, each with its file name; the chosen one framed in gold"""
    config = _json(config_file)
    cands, pick = config.get('avatarCatalogBannerCandidates') or [], config.get('avatarCatalogBanner')
    head, gap = 22, 8
    sheet = Image.new('RGB', (640 + 2 * gap, len(cands) * (mbi.H + head + gap) + gap), (12, 24, 36))
    draw = ImageDraw.Draw(sheet)
    for i, rel in enumerate(cands):
        y = gap + i * (mbi.H + head + gap)
        mark = '  <- default pick' if rel == pick else ''
        draw.text((gap, y + 4), f'{chr(65 + i)}. {os.path.basename(rel)}{mark}', fill=(255, 205, 74) if mark else (220, 230, 240))
        sheet.paste(mbi.fit(Image.open(os.path.join(root, rel))).convert('RGB'), (gap, y + head))
        if mark:
            draw.rectangle((gap - 3, y + head - 3, gap + 640 + 2, y + head + mbi.H + 2), outline=(255, 205, 74), width=3)
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    sheet.save(out)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--config', default=CONFIG)
    ap.add_argument('--index', default=INDEX)
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--root', default=ROOT)
    ap.add_argument('--montage', nargs='?', const=MONTAGE, default=None)
    a = ap.parse_args()
    if a.montage:
        print(montage(a.config, a.montage, a.root))
    else:
        print(build(a.config, a.index, a.out, a.root))


if __name__ == '__main__':
    main()
