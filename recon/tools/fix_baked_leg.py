"""Restore the client-filled lower left leg in the 5.0.1 Supernova burst motions (I-315).

    python -I recon/tools/fix_baked_leg.py <names_v4.tsv> <resource_data\\N\\data> <out> [name ...]
    python -I recon/tools/fix_baked_leg.py --files <in dir> <out> [name ...]   (loose LWFs, tests)

Several 5.0.1 lwf/burst/motion/abl_50xxx files (the generic Supernova motions included) bake the lower left
leg from some frame on: in place of the "left_foot" movie (children left_foot_b / left_foot_c, which the client
fills with the worn outfit, plus left_shoes_c) the rig places a movie holding a fixed 38x87 bitmap (a black boot)
plus left_shoes_c. Two forms:
  A: the baked movie is placed with no instance name;
  B: the baked movie is placed with the instance name "left_foot" (abl_50041/50051/50061).
No 4.3.1 copy of these files exists (addnl or JP), so the LWF is patched: every place record of a rig movie
(a movie with a "left_leg" child) that puts a baked movie is pointed at the good left_foot movie of the same file
(object index; the blend bits are kept) and, for form A, given the "left_foot" instance name. The placement matrix
is untouched: baked and good movie are the same Flash symbol (left_shoes_c at the same offset in both).
Nothing else changes: the tool checks that only those place records differ, that frame counts are the same and
that no rig frame places a baked movie any more, then writes <out>/<name> (stage_gen\\files: the generated pack
is served last and replaces the OBB copy; the textures stay the OBB ones).
Without names it scans every lwf/burst/motion/*.lwf of the index; EXPECTED is a check of the result.
Encrypted records (cipher 3) need BGAD_KEY, as in res_bulk.py; LWFs normally are not.
"""
import bisect
import os
import struct
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lwf_rig import SECTIONS  # noqa: E402

PREFIX = 'lwf/burst/motion/'
# expected patches (survey of the 5.0.1 OBB, 25-11): name -> {depth: number of rig frames that placed a baked movie}
EXPECTED = {
    'abl_50041': {74: 26}, 'abl_50051': {74: 26}, 'abl_50061': {74: 26},
    'abl_50071': {64: 23}, 'abl_50151': {58: 21, 56: 21}, 'abl_50231': {58: 38}, 'abl_50241': {58: 38},
    'abl_50211': {58: 38}, 'abl_50271': {58: 19}, 'abl_50331': {448: 23, 443: 15}, 'abl_50351': {58: 30, 158: 30},
    'abl_50471': {58: 50}, 'abl_50501': {58: 25},
}


class Lwf:
    def __init__(self, b):
        if b[:4] != b'LWF\0':
            raise ValueError('not an LWF')
        self.b = b
        self.sec = {n: struct.unpack_from('<2i', b, 0x20 + 8 * i) for i, n in enumerate(SECTIONS)}
        self.root = struct.unpack_from('<6i', b, 8)[3]
        so = self.sec['stringBytes'][0]
        self.S = [b[so + o: so + o + n].decode('utf-8', 'replace') for o, n in self.arr('stringData', '<2i')]
        self.inames = [s for (s,) in self.arr('instanceName', '<i')]
        self.objects = self.arr('objectData', '<2i')
        self.place = self.arr('place', '<4i')
        self.movem = self.arr('controlMoveM', '<2i')
        self.movec = self.arr('controlMoveC', '<2i')
        self.movemc = self.arr('controlMoveMC', '<3i')
        self.control = self.arr('control', '<2i')
        self.frame = self.arr('frame', '<2i')
        self.movie = self.arr('movie', '<7i')

    def arr(self, name, fmt):
        o, c = self.sec[name]
        sz = struct.calcsize(fmt)
        return [struct.unpack_from(fmt, self.b, o + i * sz) for i in range(c)]

    def iname(self, inst):
        return self.S[self.inames[inst]] if 0 <= inst < len(self.inames) else ''

    def place_of(self, t, cid):
        if t == 0: return cid
        if t == 1: return self.movem[cid][0]
        if t == 2: return self.movec[cid][0]
        if t == 3: return self.movemc[cid][0]
        return None

    def frames(self, mid):
        """per frame the place ids of the movie's controls"""
        _, _, _, foff, fn, _, _ = self.movie[mid]
        out = []
        for fi in range(fn):
            co, cn = self.frame[foff + fi]
            out.append([p for p in (self.place_of(t, c) for t, c in self.control[co: co + cn]) if p is not None])
        return out

    def movie_obj(self, o):
        t, oid = self.objects[o & 0xffff]
        return oid if t == 2 else None

    def kids(self, mid):
        """(instance name, object) of everything the movie ever places"""
        return {(self.iname(self.place[p][2]), self.place[p][1] & 0xffff) for ps in self.frames(mid) for p in ps}

    def has_bitmap(self, mid, seen=()):
        for n, o in self.kids(mid):
            t, oid = self.objects[o]
            if t in (3, 4):
                return True
            if t == 2 and not n and oid not in seen and self.has_bitmap(oid, seen + (mid,)):
                return True
        return False

    def is_good(self, mid):
        names = {n for n, _ in self.kids(mid)}
        return {'left_foot_b', 'left_foot_c'} <= names

    def is_baked(self, mid):
        kids = self.kids(mid)
        names = {n for n, _ in kids}
        if 'left_shoes_c' not in names or names & {'left_foot_b', 'left_foot_c'}:
            return False
        return any(not n and self.objects[o][0] == 2 and self.has_bitmap(self.objects[o][1]) for n, o in kids)

    def rigs(self):
        return [m for m in range(len(self.movie)) if 'left_leg' in {n for n, _ in self.kids(m)}]


def baked_placements(L):
    """{rig: {depth: [frames]}} and the place ids placing a baked movie in rig movies"""
    found, places = {}, set()
    for rig in L.rigs():
        for fi, ps in enumerate(L.frames(rig)):
            for p in ps:
                dv, o, inst, _ = L.place[p]
                mid = L.movie_obj(o)
                if mid is not None and L.is_baked(mid):
                    found.setdefault(rig, {}).setdefault(dv & 0xffff, []).append(fi)
                    places.add(p)
    return found, places


def patch(b):
    """-> (patched bytes or None if nothing baked, {depth: frames count})"""
    L = Lwf(b)
    found, places = baked_placements(L)
    if not places:
        return None, {}
    good = sorted({L.place[p][1] & 0xffff for rig in L.rigs() for ps in L.frames(rig) for p in ps
                   if L.iname(L.place[p][2]) == 'left_foot' and L.movie_obj(L.place[p][1]) is not None
                   and L.is_good(L.movie_obj(L.place[p][1]))})
    if len(good) != 1:
        raise ValueError('good left_foot object not unique: %r' % good)
    lf = [i for i, s in enumerate(L.inames) if L.S[s] == 'left_foot']
    if len(lf) != 1:
        raise ValueError('instance name left_foot not unique: %r' % lf)
    # a place record shared with a movie that is not a rig would change that movie too
    rigs = set(L.rigs())
    for m in range(len(L.movie)):
        if m not in rigs and places & {p for ps in L.frames(m) for p in ps}:
            raise ValueError('baked place record shared with movie %d' % m)
    out = bytearray(b)
    po = L.sec['place'][0]
    for p in sorted(places):
        dv, o, inst, mat = L.place[p]
        struct.pack_into('<4i', out, po + 16 * p, dv, (o & ~0xffff) | good[0], lf[0], mat)
    out = bytes(out)
    verify(b, out, places)
    stats = {}
    for depths in found.values():
        for d, fs in depths.items():
            stats[d] = stats.get(d, 0) + len(fs)
    return out, stats


def verify(old, new, places):
    if len(old) != len(new):
        raise AssertionError('size changed')
    po = Lwf(old).sec['place'][0]
    allowed = set()
    for p in places:
        allowed.update(range(po + 16 * p + 4, po + 16 * p + 12))   # object and instance fields only
    diff = [i for i in range(len(old)) if old[i] != new[i]]
    if any(i not in allowed for i in diff):
        raise AssertionError('bytes outside the patched place records changed')
    A, B = Lwf(old), Lwf(new)
    if [m[4] for m in A.movie] != [m[4] for m in B.movie]:
        raise AssertionError('frame counts changed')
    if baked_placements(B)[1]:
        raise AssertionError('a rig frame still places a baked movie')
    for rig in B.rigs():
        for ps in B.frames(rig):
            n = sum(1 for p in ps if B.iname(B.place[p][2]) == 'left_foot')
            m = sum(1 for p in ps if B.iname(B.place[p][2]) == 'left_leg')
            if n != m:
                raise AssertionError('rig %d: %d left_foot for %d left_leg' % (rig, n, m))


class Pack:
    """records of resource_data\\N\\data by offset on the concatenated pieces (as res_bulk.py)"""
    def __init__(self, tsv, datadir):
        import bgad
        self.bgad = bgad
        self.key = bytes.fromhex(os.environ['BGAD_KEY']) if os.environ.get('BGAD_KEY') else None
        self.pieces = [os.path.join(datadir, f) for f in sorted(os.listdir(datadir))]
        self.starts, total = [], 0
        for p in self.pieces:
            self.starts.append(total)
            total += os.path.getsize(p)
        self.offs = {}
        with open(tsv, encoding='utf-8') as fh:
            next(fh)
            for line in fh:
                n, o = line.rstrip('\n').split('\t')
                self.offs[n] = int(o)

    def read_at(self, off, size):
        out = b''
        i = bisect.bisect_right(self.starts, off) - 1
        while size > 0 and i < len(self.pieces):
            with open(self.pieces[i], 'rb') as fh:
                fh.seek(off - self.starts[i])
                chunk = fh.read(size)
            out += chunk
            off += len(chunk)
            size -= len(chunk)
            i += 1
        return out

    def get(self, name):
        off = self.offs[name]
        h = self.bgad.parse(self.read_at(off, self.bgad.HDR.size))
        buf = self.read_at(off, h['hsize'] + h['nlen'] + h['size'])
        h = self.bgad.parse(buf)
        if h['enc'] == 3 and not self.key:
            raise ValueError('BGAD_KEY needed')
        return self.bgad.decode(buf, h, self.key)


class Files:
    def __init__(self, root):
        self.root = root
        self.offs = {}
        for r, _, fs in os.walk(root):
            for f in fs:
                p = os.path.join(r, f)
                self.offs[os.path.relpath(p, root).replace(os.sep, '/')] = p

    def get(self, name):
        with open(self.offs[name], 'rb') as fh:
            return fh.read()


def run(src, out, names=None, expected=EXPECTED):
    """-> {name: {depth: frames}} of the files written; raises if the result differs from expected"""
    if names:
        want = ['%s%s/%s.lwf' % (PREFIX, n, n) if '/' not in n else n for n in names]
    else:
        want = sorted(n for n in src.offs if n.startswith(PREFIX) and n.endswith('.lwf'))
    done = {}
    for n in want:
        try:
            data = src.get(n)
        except Exception as e:               # unreadable record: reported, not fatal
            print('skipped (unreadable)', n, e)
            continue
        new, stats = patch(data)
        if new is None:
            continue
        dst = os.path.join(out, *n.split('/'))
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, 'wb') as fh:
            fh.write(new)
        key = n.rsplit('/', 1)[1][:-4]
        done[key] = stats
        print(n, ' '.join('d%d:%d frames' % kv for kv in sorted(stats.items())))
    if expected is not None:
        exp = {k: v for k, v in expected.items() if not names or k in {x.rsplit('/', 1)[-1].replace('.lwf', '') for x in want}}
        if done != exp:
            raise SystemExit('unexpected result:\n  got      %r\n  expected %r' % (done, exp))
    return done


def main():
    a = sys.argv[1:]
    if a and a[0] == '--files':
        src, out, names = Files(a[1]), a[2], a[3:]
    else:
        src, out, names = Pack(a[0], a[1]), a[2], a[3:]
    done = run(src, out, names)
    print('patched %d files' % len(done))


if __name__ == '__main__':
    main()
