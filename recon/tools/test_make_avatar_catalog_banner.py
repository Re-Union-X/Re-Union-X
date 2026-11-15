"""Test of make_avatar_catalog_banner.py: python -I recon/tools/test_make_avatar_catalog_banner.py

Synthetic pictures only (no original banner in the repository)."""
import json
import os
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402
import make_avatar_catalog_banner as mac  # noqa: E402

tmp = tempfile.mkdtemp(prefix='khux-avc-')
try:
    root = os.path.join(tmp, 'root')
    os.makedirs(os.path.join(root, 'pics'))
    # three candidates: two banners of 640x140, one larger picture (cut to the banner by the fit of make_banner_images)
    colours = {'a.png': ((200, 0, 0), (640, 140)), 'b.png': ((0, 200, 0), (640, 140)), 'c.png': ((0, 0, 200), (900, 200))}
    for name, (rgb, size) in colours.items():
        Image.new('RGB', size, rgb).save(os.path.join(root, 'pics', name))
    config = {'imgVersion': 9, 'avatarCatalogBanner': 'pics/b.png', 'avatarCatalogBannerCandidates': ['pics/a.png', 'pics/b.png', 'pics/c.png']}
    index = {'avatarCatalog': {'evStageId': 20704, 'stageIds': [970000], 'useAp': [0]}}
    cfg_file, idx_file = os.path.join(tmp, 'event_config.json'), os.path.join(tmp, 'events.json')
    json.dump(config, open(cfg_file, 'w', encoding='utf-8'))
    json.dump(index, open(idx_file, 'w', encoding='utf-8'))
    out_dir = os.path.join(tmp, 'event_img')

    # the banner: the chosen original (the one line of event_config.json), at 640x140, named after the evStage of events.json
    path = mac.build(cfg_file, idx_file, out_dir, root)
    assert path == os.path.join(out_dir, '20704.png'), path
    im = Image.open(path).convert('RGB')
    assert im.size == (640, 140), im.size
    assert im.getpixel((320, 70)) == (0, 200, 0), im.getpixel((320, 70))

    # another pick is one line; a larger picture is fitted to 640x140
    config['avatarCatalogBanner'] = 'pics/c.png'
    json.dump(config, open(cfg_file, 'w', encoding='utf-8'))
    im = Image.open(mac.build(cfg_file, idx_file, out_dir, root)).convert('RGB')
    assert im.size == (640, 140) and im.getpixel((10, 10)) == (0, 0, 200)

    # the montage of the candidates (for the user): one row per candidate at banner size, the chosen one marked
    sheet = os.path.join(tmp, 'candidates.png')
    mac.montage(cfg_file, sheet, root)
    s = Image.open(sheet)
    assert s.size[0] >= 640 and s.size[1] >= 3 * 140, s.size

    # no banner row in events.json (no board records at the regen): nothing written, a clear error
    json.dump({}, open(idx_file, 'w', encoding='utf-8'))
    try:
        mac.build(cfg_file, idx_file, out_dir, root)
        raise AssertionError('no avatarCatalog: must stop')
    except SystemExit as e:
        assert 'avatarCatalog' in str(e), e
    # a pick outside the candidates stops too (the user approves among the candidates)
    json.dump(index, open(idx_file, 'w', encoding='utf-8'))
    config['avatarCatalogBanner'] = 'pics/x.png'
    json.dump(config, open(cfg_file, 'w', encoding='utf-8'))
    try:
        mac.build(cfg_file, idx_file, out_dir, root)
        raise AssertionError('a pick outside the candidates: must stop')
    except SystemExit as e:
        assert 'candidates' in str(e), e
    print('test_make_avatar_catalog_banner: OK')
finally:
    shutil.rmtree(tmp, ignore_errors=True)
