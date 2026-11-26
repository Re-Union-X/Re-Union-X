"""Coin icons of the catalogue pages (user 26-11: «the REAL game resource icons for each coin», never drawn or substitute ones).

    python -I recon/tools/make_coin_icons.py [--b16 D] [--jp D] [--out D] [--strict]
        -> server/game_data/coin_icons/<key>.png (git-ignored) and icons.json {version, keys}

The coin chips of the Game Catalog hub and of the catalogue headers (server/catalog-pages.js walletChip) show the reward icons the
game itself draws for these coins (reward type N -> img/incentive/IncentiveIcon_N.png, the picture of a result screen or a Present):
avatar = Avatar Coin (type 14), event = Event Coin (type 15; one icon for every board set, as the Event Boards screen shows),
raid = Raid Coin (type 16), coliseum = Coliseum Coin (type 17). Sources, first found wins: the worldwide 2016 bundle
(--b16, ref_work/bundle2016/files), then the JP 4.3.1 data (--jp): img/incentive/, then cocostudio/publish/ (the JP data has the
Avatar Coin only there). Each file is only decoded (PNG or BTF) and saved as PNG at its own size; nothing is drawn. A coin with no
source on this PC is reported and left out (the chip then shows no icon); --strict exits with 2 then (build-resources.ps1).
The version in icons.json changes when a picture changes (served at /web/coin/v<version>/<key>.png: the WebView cache is busted);
the server reads icons.json at request time.
"""
import argparse
import hashlib
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_special_banners import game_image  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(REPO, 'server', 'game_data', 'coin_icons')
# key -> reward type of the coin (IncentiveIcon_<type>)
COINS = {'avatar': 14, 'event': 15, 'raid': 16, 'coliseum': 17}


def local(name):
    try:
        import private_tools
        return private_tools.local_path(name)
    except Exception:  # noqa: BLE001 - no private paths on this PC
        return None


def sources(n, b16, jp):
    """the candidate files of IncentiveIcon_<n>, in order"""
    f = 'IncentiveIcon_%d.png' % n
    out = []
    if b16:
        out.append(os.path.join(b16, 'img', 'incentive', f))
    if jp:
        out += [os.path.join(jp, 'img', 'incentive', f), os.path.join(jp, 'cocostudio', 'publish', f)]
    return out


def build(out_dir, b16, jp):
    """-> {'written': {key: source}, 'missing': [key], 'version': int}"""
    os.makedirs(out_dir, exist_ok=True)
    written, missing, digest = {}, [], hashlib.sha1()
    for key, n in sorted(COINS.items()):
        src = next((p for p in sources(n, b16, jp) if os.path.exists(p)), None)
        if not src:
            missing.append(key)
            continue
        buf = io.BytesIO()
        game_image(src).save(buf, 'PNG', optimize=True)
        data = buf.getvalue()
        with open(os.path.join(out_dir, '%s.png' % key), 'wb') as f:
            f.write(data)
        digest.update(key.encode() + data)
        written[key] = src
    for key in set(COINS) - set(written):
        p = os.path.join(out_dir, '%s.png' % key)
        if os.path.exists(p):
            os.remove(p)
    version = int(digest.hexdigest()[:7], 16) or 1
    with open(os.path.join(out_dir, 'icons.json'), 'w', encoding='utf-8') as f:
        json.dump({'version': version, 'keys': sorted(written)}, f)
    return {'written': written, 'missing': missing, 'version': version}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--b16', default=None, help='worldwide 2016 bundle files folder (default: ref_work/bundle2016/files)')
    ap.add_argument('--jp', default=None, help='JP 4.3.1 data folder (default: private_tools jp_data)')
    ap.add_argument('--out', default=OUT)
    ap.add_argument('--strict', action='store_true', help='exit 2 when a coin has no source on this PC')
    a = ap.parse_args()
    rw = local('ref_work')
    b16 = a.b16 or (os.path.join(rw, 'bundle2016', 'files') if rw else None)
    r = build(a.out, b16, a.jp or local('jp_data'))
    for k, src in sorted(r['written'].items()):
        print('%s <- %s' % (k, src))
    print('coin icons: %d written to %s (version %d)%s' % (len(r['written']), a.out, r['version'],
                                                          ', MISSING: %s' % ', '.join(r['missing']) if r['missing'] else ''))
    if r['missing'] and a.strict:
        sys.exit(2)


if __name__ == '__main__':
    main()
