"""btf_fix.py --state: the same files as without the state, and unchanged textures are not opened again.
    python recon/tools/test_btf_fix.py
"""
import os
import shutil
import sys
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import btf  # noqa: E402
import btf_fix  # noqa: E402
from PIL import Image  # noqa: E402


def age(root, seconds=3600):
    t = time.time() - seconds
    for r, _, fs in os.walk(root):
        for f in fs:
            os.utime(os.path.join(r, f), (t, t))


def tree(root):
    out = {}
    for r, _, fs in os.walk(root):
        for f in fs:
            p = os.path.join(r, f)
            out[os.path.relpath(p, root)] = open(p, 'rb').read()
    return out


def main():
    td = tempfile.mkdtemp(prefix='khux_btf_fix_')
    try:
        a = os.path.join(td, 'a')
        os.makedirs(os.path.join(a, 'img', 'sub'))
        Image.new('RGBA', (6, 4), (200, 100, 50, 128)).save(os.path.join(a, 'img', 'png_to_btf.png'))   # a true PNG
        open(os.path.join(a, 'img', 'sub', 'ok.png'), 'wb').write(btf.encode(Image.new('RGBA', (3, 3), (10, 10, 10, 255))))
        open(os.path.join(a, 'img', 'notes.txt'), 'wb').write(b'not a texture')
        open(os.path.join(a, 'img', 'other.png'), 'wb').write(b'neither PNG nor BTF')
        b = os.path.join(td, 'b')
        shutil.copytree(a, b)
        age(a)
        age(b)
        state = os.path.join(td, 'state.json')

        n0 = btf_fix.run([a], None, workers=1)
        n1 = btf_fix.run([b], state, workers=1)
        assert n0 == (1, 3, 3), n0
        assert n1 == (1, 3, 3), n1
        assert tree(a) == tree(b), 'different results with --state'
        # the texture just rewritten is not remembered (written in the last seconds): opened again once
        assert btf_fix.run([b], state, workers=1) == (0, 1, 3)
        age(b)
        assert btf_fix.run([b], state, workers=1) == (0, 3, 3)    # every mtime changed by age(): all opened once more
        assert btf_fix.run([b], state, workers=1) == (0, 0, 3)    # nothing changed: nothing opened
        # a texture replaced by a new PNG (another mtime) is converted again
        Image.new('RGBA', (5, 5), (255, 255, 255, 10)).save(os.path.join(b, 'img', 'sub', 'ok.png'))
        Image.new('RGBA', (5, 5), (255, 255, 255, 10)).save(os.path.join(a, 'img', 'sub', 'ok.png'))
        age(b, 1800)
        age(a, 1800)
        assert btf_fix.run([b], state, workers=1) == (1, 3, 3)
        assert btf_fix.run([a], None, workers=1) == (1, 3, 3)
        assert tree(a) == tree(b)
        # another code version (here: a state written by another one) discards the state
        btf_fix.save_state(state, 'other', {})
        assert btf_fix.run([b], state, workers=1)[1] == 3
        print('btf_fix: ok')
    finally:
        shutil.rmtree(td, ignore_errors=True)


if __name__ == '__main__':
    main()
