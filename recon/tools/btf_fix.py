"""Porta le texture generate al formato delle originali: BTF con alpha premoltiplicata.

    python recon/tools/btf_fix.py [--state <file>] <cartella> [...]
    python recon/tools/btf_fix.py --version

- PNG veri (immagini scaricate o disegnate, es. stage_gen\\boards\\files) -> BTF (btf.encode);
- BTF scritti prima della correzione di btf.encode (colore > alpha in qualche pixel: non
  premoltiplicati, bordi semitrasparenti schiariti) -> riletti senza conversione e riscritti.
I BTF gia' premoltiplicati (originali o nuovi) restano com'erano. Pillow e numpy: senza -I.

--state <file> (build-resources.ps1 -Append, 15 Nov 2026): every .png left as it is or written by a run is remembered in
<file> with its size and mtime; a later run does not open it again while both are unchanged (fix() of the same bytes
gives 0: nothing to do). The build read and inspected ~60k textures at every run (~40% of them the raid models) on the
HDD. The state is tied to --version (this script, btf.py, Pillow, numpy, zlib, Python): a change discards it. A file
written in the last few seconds is not remembered (its mtime could come back after another write).
--version: prints that version (build-resources.ps1 puts it in the stamp of the raid models, import_originals.py).
"""
import hashlib
import json
import os
import sys
import time
import zlib
from multiprocessing import Pool

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import btf  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
RACY = 3.0


def version():
    h = hashlib.sha1(b'btf_fix-1')
    for f in ('btf_fix.py', 'btf.py'):
        with open(os.path.join(HERE, f), 'rb') as fh:
            h.update(f.encode() + b'\0' + fh.read() + b'\0')
    import PIL
    h.update(repr((sys.version, zlib.ZLIB_RUNTIME_VERSION, PIL.__version__, np.__version__)).encode())
    return h.hexdigest()


def fix(p):
    d = open(p, 'rb').read()
    if d[:8] == b'\x89PNG\r\n\x1a\n':
        im = Image.open(p).convert('RGBA')
    elif d[:4] == b'\x89BTF':
        i = btf.info(d)
        if i is None or i['type'] != 8:
            return 0
        w, h = i['size']
        raw = zlib.decompressobj().decompress(d[0x26:])[:w * h * 4]
        px = np.frombuffer(raw, np.uint8).reshape(h, w, 4)
        if not (px[..., :3].max(axis=2) > px[..., 3]).any():
            return 0
        im = Image.new('RGBA', i['canvas'] if all(i['canvas']) else (w, h))
        im.paste(Image.fromarray(px.copy(), 'RGBA'), i['offset'])
    else:
        return 0
    open(p, 'wb').write(btf.encode(im))
    return 1


def textures(tops):
    """[(path, (size, mtime_ns))] of the .png files under tops, stats from the directory listing (no stat per file)"""
    from stamp_cache import scan_tree
    out = []
    for top in tops:
        for _, (p, st) in scan_tree(top).items():
            if p.lower().endswith('.png'):
                out.append((p, (st.st_size, st.st_mtime_ns)))
    return out


def load_state(path, ver):
    try:
        with open(path, encoding='utf-8') as fh:
            s = json.load(fh)
        if s.get('version') == ver:
            return {k: tuple(v) for k, v in s['files'].items()}
    except (OSError, ValueError, KeyError):
        pass
    return {}


def save_state(path, ver, files):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as fh:
        json.dump({'version': ver, 'files': files}, fh, separators=(',', ':'))
    os.replace(tmp, path)


def run(tops, state_path=None, workers=None):
    """fixes the textures under tops; returns (rewritten, inspected, total)"""
    if state_path is None:
        files = [os.path.join(r, f) for top in tops for r, _, fs in os.walk(top) for f in fs if f.lower().endswith('.png')]
        todo, total = files, len(files)
    else:
        ver = version()
        known = load_state(state_path, ver)
        listed = textures(tops)
        total = len(listed)
        todo = [p for p, stamp in listed if known.get(os.path.normcase(p)) != stamp]
    # at most 4 workers (BTF_WORKERS): each holds a whole texture decoded (up to ~64 MB) plus copies; Pool() used every core
    workers = workers or max(1, min(int(os.environ.get('BTF_WORKERS', '4')), (os.cpu_count() or 2) - 1))
    if todo:
        with Pool(workers) as pool:
            n = sum(pool.map(fix, todo, chunksize=16))
    else:
        n = 0
    if state_path is not None:
        # every texture as it is now (left alone or just rewritten), but not one written in the last seconds
        now = time.time()
        files = {}
        for p, (size, mtime_ns) in textures(tops):
            if now - mtime_ns / 1e9 > RACY:
                files[os.path.normcase(p)] = [size, mtime_ns]
        save_state(state_path, ver, files)
    return n, len(todo), total


if __name__ == '__main__':
    args = sys.argv[1:]
    if args == ['--version']:
        print(version())
        sys.exit(0)
    state = None
    if args[:1] == ['--state']:
        state, args = args[1], args[2:]
    n, seen, total = run(args, state)
    if state is None:
        print('texture riscritte: %d su %d' % (n, total))
    else:
        print('texture riscritte: %d su %d (%d opened, the others unchanged since the last run: %s)' % (n, total, seen, state))
