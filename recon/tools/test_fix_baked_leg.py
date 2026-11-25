"""Tests for fix_baked_leg.py: python recon/tools/test_fix_baked_leg.py

A synthetic LWF covers both forms of the baked leg; the real 5.0.1 burst motions are checked only when an
extracted copy is available (KHUX_BAKED_LEG_SRC, default D:\\Progetto_Restauro_KH_UX\\tmp\\i315b\\obb), otherwise
that test is skipped: no game file is kept in the repository.
"""
import os
import struct
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fix_baked_leg as F  # noqa: E402
from lwf_rig import SECTIONS  # noqa: E402

SRC = os.environ.get('KHUX_BAKED_LEG_SRC', r'D:\Progetto_Restauro_KH_UX\tmp\i315b\obb')
NAMES = ['left_leg', 'left_foot', 'left_foot_b', 'left_foot_c', 'left_shoes_c']
LEG, FOOT, FOOT_B, FOOT_C, SHOES = range(5)


def build(rig_frames, extra_movie=None):
    """objects: 0 bitmap, 1 leaf movie, 2 good left_foot, 3 bitmap holder, 4 baked foot, 5 rig, 6 root.
    rig_frames: per frame a list of (depth, object, instance or -1)"""
    places, controls, frames, movies = [], [], [], []

    def movie(fr):
        foff = len(frames)
        for items in fr:
            co = len(controls)
            for d, o, inst in items:
                places.append((d, o, inst, 0))
                controls.append((0, len(places) - 1))
            frames.append((co, len(items)))
        movies.append((0, 0, 0, foff, len(fr), 0, 0))
        return len(movies) - 1

    movie([[]])                                                        # 0 leaf
    movie([[(0, 1, FOOT_B), (2, 1, FOOT_C), (4, 1, SHOES)]])           # 1 good left_foot
    movie([[(0, 0, -1)]])                                              # 2 holds the boot bitmap
    movie([[(0, 3, -1), (2, 1, SHOES)]])                               # 3 baked foot
    rig = movie(rig_frames)                                            # 4 rig
    root = movie([[(0, 5, -1)]])                                       # 5 root
    if extra_movie:
        movie(extra_movie)
    objects = [(3, 0), (2, 0), (2, 1), (2, 2), (2, 3), (2, rig), (2, root)]
    strings = b''.join(n.encode() for n in NAMES)
    sdata, o = [], 0
    for n in NAMES:
        sdata.append((o, len(n)))
        o += len(n)
    data = {
        'stringBytes': (strings, 0), 'translate': (struct.pack('<2f', 0, 0), 1),
        'objectData': (b''.join(struct.pack('<2i', *x) for x in objects), len(objects)),
        'textureFragment': (struct.pack('<9i', 0, 0, 0, 0, 0, 0, 0, 38, 87), 1),
        'bitmap': (struct.pack('<2i', 0, 0), 1),
        'instanceName': (b''.join(struct.pack('<i', i) for i in range(len(NAMES))), len(NAMES)),
        'place': (b''.join(struct.pack('<4i', *x) for x in places), len(places)),
        'control': (b''.join(struct.pack('<2i', *x) for x in controls), len(controls)),
        'frame': (b''.join(struct.pack('<2i', *x) for x in frames), len(frames)),
        'movie': (b''.join(struct.pack('<7i', *x) for x in movies), len(movies)),
        'stringData': (b''.join(struct.pack('<2i', *x) for x in sdata), len(sdata)),
    }
    head = bytearray(b'LWF\0\x12\x12\x13\0' + struct.pack('<6i', 64, 64, 30, root, 0, 0))
    head += b'\0' * (0x20 - len(head))
    body, table, pos = b'', [], 0x20 + 8 * len(SECTIONS)
    for n in SECTIONS:
        raw, count = data.get(n, (b'', 0))
        table.append((pos + len(body), count))
        body += raw
    return bytes(head) + b''.join(struct.pack('<2i', *t) for t in table) + body


GOOD = [(0, 1, LEG), (2, 2, FOOT)]
FORM_A = [(0, 1, LEG), (2, 4, -1)]       # baked movie with no instance name
FORM_B = [(0, 1, LEG), (2, 4, FOOT)]     # baked movie named left_foot


class Synthetic(unittest.TestCase):
    def test_both_forms(self):
        b = build([GOOD, FORM_A, FORM_B, GOOD])
        new, stats = F.patch(b)
        self.assertEqual(stats, {2: 2})
        L = F.Lwf(new)
        for ps in L.frames(4):
            names = {L.iname(L.place[p][2]): L.movie_obj(L.place[p][1]) for p in ps}
            self.assertEqual(names, {'left_leg': 0, 'left_foot': 1})
        self.assertEqual(F.patch(new), (None, {}))          # nothing left to patch
        self.assertEqual(len(new), len(b))

    def test_blend_bits_kept(self):
        b = bytearray(build([GOOD, FORM_A]))
        L = F.Lwf(bytes(b))
        p = L.frames(4)[1][1]
        struct.pack_into('<I', b, L.sec['place'][0] + 16 * p + 4, (0x8001 << 16) | 4)   # additive blend
        new, _ = F.patch(bytes(b))
        self.assertEqual(F.Lwf(new).place[p][1] & 0xffffffff, (0x8001 << 16) | 2)

    def test_clean_file_untouched(self):
        self.assertEqual(F.patch(build([GOOD, GOOD])), (None, {}))

    def test_shared_place_refused(self):
        b = build([GOOD, FORM_A])
        L = F.Lwf(b)
        p = L.frames(4)[1][1]
        b = bytearray(b)
        # point the root's only control at the baked place record: a non-rig movie now shares it
        co = L.frame[L.movie[5][3]][0]
        struct.pack_into('<2i', b, L.sec['control'][0] + 8 * co, 0, p)
        with self.assertRaises(ValueError):
            F.patch(bytes(b))

    def test_run_writes_and_checks(self):
        with tempfile.TemporaryDirectory() as td:
            src = os.path.join(td, 'in', 'lwf', 'burst', 'motion', 'abl_1', 'abl_1.lwf')
            os.makedirs(os.path.dirname(src))
            with open(src, 'wb') as fh:
                fh.write(build([GOOD, FORM_B]))
            out = os.path.join(td, 'out')
            done = F.run(F.Files(os.path.join(td, 'in')), out, expected={'abl_1': {2: 1}})
            self.assertEqual(done, {'abl_1': {2: 1}})
            self.assertTrue(os.path.exists(os.path.join(out, 'lwf', 'burst', 'motion', 'abl_1', 'abl_1.lwf')))
            with self.assertRaises(SystemExit):
                F.run(F.Files(os.path.join(td, 'in')), out, expected={})


@unittest.skipUnless(os.path.isdir(os.path.join(SRC, 'lwf', 'burst', 'motion')),
                     'no extracted 5.0.1 burst motions in %s' % SRC)
class Real(unittest.TestCase):
    def test_expected_files(self):
        with tempfile.TemporaryDirectory() as td:
            src = F.Files(SRC)
            have = {n.rsplit('/', 1)[1][:-4] for n in src.offs if n.startswith(F.PREFIX) and n.endswith('.lwf')}
            exp = {k: v for k, v in F.EXPECTED.items() if k in have}
            self.assertEqual(F.run(src, td, expected=exp), exp)


if __name__ == '__main__':
    unittest.main()
