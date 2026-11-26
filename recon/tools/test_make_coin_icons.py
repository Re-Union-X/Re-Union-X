"""make_coin_icons.py: the coin icons of the catalogue chips are the game's own reward icons (IncentiveIcon_14..17), first found in
the worldwide 2016 bundle, then the JP img/incentive, then the JP cocostudio/publish; saved as they are; --strict on a missing one.

    python -I recon/tools/test_make_coin_icons.py
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_coin_icons as m  # noqa: E402

errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)


def png(path, colour, size=(86, 86)):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.new('RGBA', size, colour).save(path)


tmp = tempfile.mkdtemp(prefix='khux-coin-icons-')
try:
    check(m.COINS == {'avatar': 14, 'event': 15, 'raid': 16, 'coliseum': 17}, 'coin -> reward type')
    b16, jp, out = os.path.join(tmp, 'b16'), os.path.join(tmp, 'jp'), os.path.join(tmp, 'out')
    png(os.path.join(b16, 'img', 'incentive', 'IncentiveIcon_17.png'), (250, 200, 40, 255))        # worldwide first
    png(os.path.join(jp, 'img', 'incentive', 'IncentiveIcon_17.png'), (1, 2, 3, 255))
    png(os.path.join(jp, 'img', 'incentive', 'IncentiveIcon_16.png'), (160, 80, 200, 255), (90, 90))
    png(os.path.join(jp, 'cocostudio', 'publish', 'IncentiveIcon_14.png'), (120, 150, 220, 255))   # JP: Avatar Coin only here
    r = m.build(out, b16, jp)
    check(sorted(r['written']) == ['avatar', 'coliseum', 'raid'] and r['missing'] == ['event'], 'found / missing %s' % (r,))
    check(r['written']['coliseum'].startswith(b16) and r['written']['avatar'].endswith(os.path.join('publish', 'IncentiveIcon_14.png')), 'source order')
    check(Image.open(os.path.join(out, 'coliseum.png')).convert('RGBA').getpixel((40, 40)) == (250, 200, 40, 255), 'the picture as it is')
    check(Image.open(os.path.join(out, 'raid.png')).size == (90, 90), 'its own size')
    doc = json.load(open(os.path.join(out, 'icons.json'), encoding='utf-8'))
    check(doc['keys'] == ['avatar', 'coliseum', 'raid'] and doc['version'] == r['version'] > 0, 'icons.json %s' % (doc,))
    # the same pictures: the same version; a changed one: a new version; a coin no longer found: its file removed
    check(m.build(out, b16, jp)['version'] == r['version'], 'stable version')
    png(os.path.join(b16, 'img', 'incentive', 'IncentiveIcon_17.png'), (240, 190, 30, 255))
    os.remove(os.path.join(jp, 'img', 'incentive', 'IncentiveIcon_16.png'))
    r2 = m.build(out, b16, jp)
    check(r2['version'] != r['version'] and not os.path.exists(os.path.join(out, 'raid.png')), 'new version, stale file removed')
    # --strict: exit 2 with a coin missing
    cli = [sys.executable, '-I', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'make_coin_icons.py'), '--b16', b16, '--jp', jp, '--out', out]
    check(subprocess.run(cli + ['--strict'], capture_output=True).returncode == 2, '--strict exits 2')
    check(subprocess.run(cli, capture_output=True).returncode == 0, 'without --strict: 0')
finally:
    shutil.rmtree(tmp, ignore_errors=True)

if errors:
    print('FAIL\n' + '\n'.join(errors))
    sys.exit(1)
print('ok: coin icons')
