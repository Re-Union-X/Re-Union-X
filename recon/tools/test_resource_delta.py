"""Prova di resource_delta.py (risorse incrementali, mode 2) su pacchetti finti:
    python -I recon/tools/test_resource_delta.py
Con la libreria 4.3.1 in recon/ext/ww431 prova anche il giro completo con resource_merge.py (versione precedente +
pacchetto delle differenze = stessi byte per ogni nome della versione completa)."""
import hashlib
import os
import subprocess
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
# caches of resource_cache.py in a folder of this test (read when the module is imported)
CACHE_DIR = tempfile.mkdtemp(prefix='khux_test_cache_')
os.environ['KHUX_BGI_CACHE'] = CACHE_DIR
import resource_cache  # noqa: E402
import resource_compact as rc  # noqa: E402
import resource_delta as rd  # noqa: E402
from resource_index import record  # noqa: E402


def age(*paths):
    """mtime one hour ago: the caches only remember files not written in the last few seconds"""
    t = time.time() - 3600
    for p in paths:
        os.utime(p, (t, t))

KEY = bytes(range(32))


def write_pack(td, label, recs, names, split=None):
    """come test_resource_compact.py: recs = contenuti dei record, names = [(nome, indice del record)], split = record
    da cui comincia il secondo file dati"""
    # nome interno dal contenuto, non dalla posizione (come un file ripacchettato da una build all'altra)
    blobs = [record(b'r' + hashlib.md5(plain).hexdigest()[:8].encode(), plain, KEY) for plain in recs]
    offs, pos = [], 0
    for b in blobs:
        offs.append(pos)
        pos += len(b)
    cut = [0, split, len(blobs)] if split else [0, len(blobs)]
    datas = []
    for j in range(len(cut) - 1):
        p = os.path.join(td, '%s.d%d' % (label, j))
        with open(p, 'wb') as fh:
            fh.write(b''.join(blobs[cut[j]:cut[j + 1]]))
        datas.append(p)
    idx = os.path.join(td, label + '.png')
    with open(idx, 'wb') as fh:
        fh.write(rc.index_bytes(offs, names))
    return idx, datas


def served(packs):
    """{nome: contenuto in chiaro} come li risolve resource_merge.py --last-wins (primo vince, l'ultimo sostituisce)"""
    out = {}
    for k, (idx, datas) in enumerate(packs):
        offs, names = rc.read_bgi(idx, None, KEY)
        data = rc.Concat(datas)
        for name, r in names:
            if name in out and k != len(packs) - 1:
                continue
            h = rc.bgad.parse(data.read(offs[r], rc.bgad.HDR.size))
            out[name] = rc.bgad.decode(data.read(offs[r], h['end']), h, KEY)     # il contenuto, come lo legge il gioco
        data.close()
    return out

with tempfile.TemporaryDirectory() as td:
    # versione precedente: a, b (due nomi sullo stesso record: b e b2), c, x; zz_pad e' il riempimento (mai cercato)
    prev = write_pack(td, 'prev', [b'A' * 50, b'B' * 70, b'C' * 33, b'X' * 11, b'\0' * 9],
                      [(b'a', 0), (b'b', 1), (b'b2', 1), (b'c', 2), (b'x', 3), (b'zz_pad/xxxx', 4)], split=2)
    # build nuova completa: a uguale (in un altro punto dei dati), b cambiato (e il suo alias b2), c uguale,
    # e nuovo, x tolto
    full = write_pack(td, 'full', [b'C' * 33, b'A' * 50, b'B2' * 30, b'E' * 7],
                      [(b'a', 1), (b'b', 2), (b'b2', 2), (b'c', 0), (b'e', 3)])

    png, mp4 = os.path.join(td, 'delta.png'), os.path.join(td, 'delta.mp4')
    st = rd.delta(prev, full, None, KEY, png, mp4)
    assert st == {'changed': 2, 'new': 1, 'removed': 1, 'records': 2}, st
    offs, names = rc.read_bgi(png, None, KEY)
    assert sorted(n for n, _ in names) == [b'b', b'b2', b'e'], names
    assert len(offs) == 2                                    # b e b2: un solo record copiato
    assert os.path.getsize(mp4) < sum(os.path.getsize(p) for p in full[1])

    # versione precedente + differenze (l'ultimo vince, come resource_merge.py --last-wins) = build completa
    got = served([prev, (png, [mp4])])
    want = served([full])
    assert all(got[n] == want[n] for n in want), 'record diversi'
    assert got[b'x'] == served([prev])[b'x']                # il nome tolto resta (lo toglie una base completa nuova)
    assert rd.check((png, [mp4]), full, None, KEY) != []    # le sole differenze non bastano: mancano a e c
    assert rd.check(full, full, None, KEY) == []

    # niente di cambiato: nessun pacchetto
    same = write_pack(td, 'same', [b'A' * 50, b'B' * 70, b'C' * 33, b'X' * 11],
                      [(b'a', 0), (b'b', 1), (b'b2', 1), (b'c', 2), (b'x', 3)])
    os.remove(png)
    assert rd.delta(prev, same, None, KEY, png, mp4)['records'] == 0
    assert not os.path.exists(png)

    # --- caches (resource_cache.py, 15 Nov 2026): the same results with and without them ---------------------------------
    def blob(p):
        return open(p, 'rb').read()
    age(prev[0], full[0], *prev[1], *full[1])
    pa, ma, pb, mb = (os.path.join(td, x) for x in ('da.png', 'da.mp4', 'db.png', 'db.mp4'))
    want_st = rd.delta(prev, full, None, KEY, pa, ma, use_cache=False)
    assert rd.delta(prev, full, None, KEY, pb, mb) == want_st              # first cached run fills the record cache
    assert blob(ma) == blob(mb) and blob(pa) == blob(pb)
    p0, p1 = rd.Pack(prev, None, KEY), rd.Pack(prev, None, KEY, cache=True)
    assert p1.read_bytes == 0 and p0.read_bytes > 0, 'record cache not used'
    assert p1.names == p0.names
    p0.close(), p1.close()
    os.remove(pb)
    assert rd.delta(prev, full, None, KEY, pb, mb) == want_st              # second cached run, all from the cache
    assert blob(ma) == blob(mb) and blob(pa) == blob(pb)
    assert rd.check(full, full, None, KEY, cached=True) == []
    assert rd.check((pa, [ma]), full, None, KEY, cached=True) == rd.check((pa, [ma]), full, None, KEY) != []

    # a record across two data files is read every time (no file holds it whole), the others come from the cache
    raw_full = blob(full[1][0])
    cut = [os.path.join(td, 'cut0'), os.path.join(td, 'cut1')]
    open(cut[0], 'wb').write(raw_full[:10])
    open(cut[1], 'wb').write(raw_full[10:])
    age(*cut)
    p0 = rd.Pack((full[0], cut), None, KEY)
    p1 = rd.Pack((full[0], cut), None, KEY, cache=True)
    p2 = rd.Pack((full[0], cut), None, KEY, cache=True)
    first = rc.bgad.parse(raw_full[:rc.bgad.HDR.size])['end']
    assert p0.names == p1.names == p2.names and p2.read_bytes == first, (p2.read_bytes, first)
    for p in (p0, p1, p2):
        p.close()

    # a data file changed in place (same size, another mtime) is not answered from the cache of its old stamp
    bad = bytearray(raw_full)
    bad[-1] ^= 1
    changed = os.path.join(td, 'changed.d0')
    open(changed, 'wb').write(raw_full)
    age(changed)
    rd.Pack((full[0], [changed]), None, KEY, cache=True).close()
    open(changed, 'wb').write(bytes(bad))
    t = time.time() - 7200
    os.utime(changed, (t, t))
    assert rd.Pack((full[0], [changed]), None, KEY, cache=True).names != rd.Pack(full, None, KEY).names
    # a file written in the last seconds is read but not remembered (its mtime could come back after another write)
    fresh = os.path.join(td, 'fresh.d0')
    open(fresh, 'wb').write(raw_full)
    rd.Pack((full[0], [fresh]), None, KEY, cache=True).close()
    assert rd.Pack((full[0], [fresh]), None, KEY, cache=True).read_bytes == len(raw_full)

    # resource_pack.py sidecar: a new pack is neither read again nor decrypted, and gives the same delta
    import resource_pack
    src_dir = os.path.join(td, 'packsrc')
    os.makedirs(os.path.join(src_dir, 'sub'))
    for name, plain in (('a', b'A' * 50), ('c', b'C' * 33), ('sub/e', b'E' * 7), ('b', b'B3' * 40)):
        open(os.path.join(src_dir, *name.split('/')), 'wb').write(plain)
    gm, gp = os.path.join(td, 'gen.mp4'), os.path.join(td, 'gen.png')
    argv0 = sys.argv
    sys.argv = ['resource_pack.py', src_dir, KEY.hex(), gm, gp]
    try:
        resource_pack.main()
    finally:
        sys.argv = argv0
    assert os.path.exists(resource_cache.sidecar_path(gm))
    gen = (gp, [gm])
    pk = rd.Pack(gen, None, KEY, cache=True)
    assert pk.read_bytes == 0 and len(pk.sidecar_plain) == 4
    for raw, off in pk.names.values():            # the sidecar's plain sha1 is the sha1 of the decrypted record
        h = rc.bgad.parse(pk.data.read(off, rc.bgad.HDR.size))
        assert pk.sidecar_plain[raw] == hashlib.sha1(rc.bgad.decode(pk.data.read(off, h['end']), h, KEY)).digest()
    assert pk.names == rd.Pack(gen, None, KEY).names
    pk.close()
    os.remove(pa)
    os.remove(pb)
    st0 = rd.delta(prev, gen, None, KEY, pa, ma, use_cache=False)
    st1 = rd.delta(prev, gen, None, KEY, pb, mb)
    assert st0 == st1 == {'changed': 1, 'new': 1, 'removed': 2, 'records': 2}, (st0, st1)  # b changed, sub/e new
    assert blob(ma) == blob(mb) and blob(pa) == blob(pb)
    # a pack changed after its sidecar was written (e.g. padded by build-resources.ps1): the sidecar is ignored
    with open(gm, 'ab') as fh:
        fh.write(b'\0' * 16)
    assert rd.Pack(gen, None, KEY, cache=True).read_bytes > 0

    # resumable md5 of a list of files: the same value, and a longer list resumes after the stored prefix
    parts = []
    for i in range(3):
        parts.append(os.path.join(td, 'm%d' % i))
        open(parts[-1], 'wb').write(os.urandom(100000 + 7 * i))
    age(*parts)

    def md5_of(ps):
        return hashlib.md5(b''.join(blob(p) for p in ps)).hexdigest()
    logs = []
    assert resource_cache.md5_files(parts[:2], log=logs.append) == md5_of(parts[:2])
    assert resource_cache.md5_files(parts, log=logs.append) == md5_of(parts)
    assert resource_cache.md5_files(parts, use_cache=False) == md5_of(parts)
    if resource_cache._libcrypto() is not None:
        assert logs == ['md5: 0 of 2 files resumed from the cache', 'md5: 2 of 3 files resumed from the cache'], logs
        b1 = bytearray(blob(parts[1]))
        b1[5] ^= 0xff
        open(parts[1], 'wb').write(bytes(b1))
        os.utime(parts[1], (t - 50, t - 50))
        assert resource_cache.md5_files(parts, log=logs.append) == md5_of(parts)
        assert logs[-1] == 'md5: 1 of 3 files resumed from the cache', logs
    else:
        print('resource_cache: no libcrypto with MD5_*: md5 always from hashlib')

    lib = os.path.join(HERE, '..', 'ext', 'ww431', 'libcocos2dcpp.so')
    if os.path.exists(lib):
        def run(*args, ok=True):
            r = subprocess.run([sys.executable, '-I'] + [str(x) for x in args], capture_output=True, text=True)
            assert (r.returncode == 0) == ok, r.stdout + r.stderr
            return r.stdout
        m, d = os.path.join(HERE, 'resource_merge.py'), os.path.join(HERE, 'resource_delta.py')
        # versione N completa (indice unito, con riempimento) e build nuova completa, come build-resources.ps1
        v1 = os.path.join(td, 'v1.png')
        run(m, '--last-wins', '--filler', 64, HERE, lib, KEY.hex(), v1, prev[0], ','.join(prev[1]))
        fullx = os.path.join(td, 'fullx.png')
        run(m, '--last-wins', HERE, lib, KEY.hex(), fullx, full[0], ','.join(full[1]))
        out = run(d, HERE, lib, KEY.hex(), png, mp4, v1, ','.join(prev[1]), fullx, ','.join(full[1]))
        assert 'cambiati 2, nuovi 1, tolti 1' in out, out
        # versione N+1: indice di N + differenze in coda; offset di N invariati, size = dati di N + differenze
        v2 = os.path.join(td, 'v2.png')
        run(m, '--last-wins', HERE, lib, KEY.hex(), v2, v1, ','.join(prev[1]), png, mp4)
        chain = ','.join(prev[1] + [mp4])
        assert 'identici' in run(d, 'check', HERE, lib, KEY.hex(), v2, chain, fullx, ','.join(full[1]))
        assert 'identici' in run(d, 'check', '--cached', HERE, lib, KEY.hex(), v2, chain, fullx, ','.join(full[1]))
        # --md5-cache: the same index content (md5 and size records), the md5 resumed after the stored prefix
        age(*prev[1], mp4)
        v2c = os.path.join(td, 'v2c.png')
        out1 = run(m, '--last-wins', '--md5-cache', HERE, lib, KEY.hex(), v2c, v1, ','.join(prev[1]), png, mp4)
        out2 = run(m, '--last-wins', '--md5-cache', HERE, lib, KEY.hex(), v2c, v1, ','.join(prev[1]), png, mp4)
        out0 = run(m, '--last-wins', HERE, lib, KEY.hex(), v2, v1, ','.join(prev[1]), png, mp4)
        assert out0.splitlines()[-1].split('md5 ')[1] == out1.splitlines()[-1].split('md5 ')[1] == \
            out2.splitlines()[-1].split('md5 ')[1], (out0, out1, out2)
        if resource_cache._libcrypto() is not None:
            assert 'md5: 3 of 3 files resumed' in out2, out2
        # un byte cambiato nel pacchetto delle differenze si vede (also with --cached: a changed file has a new stamp)
        raw = bytearray(open(mp4, 'rb').read())
        raw[-1] ^= 1
        open(mp4, 'wb').write(bytes(raw))
        assert 'record diverso' in run(d, 'check', HERE, lib, KEY.hex(), v2, chain, fullx, ','.join(full[1]), ok=False)
        assert 'record diverso' in run(d, 'check', '--cached', HERE, lib, KEY.hex(), v2, chain, fullx, ','.join(full[1]),
                                       ok=False)
        # niente di cambiato: codice 2, nessun file
        os.remove(png)
        run(d, HERE, lib, KEY.hex(), png, mp4, v1, ','.join(prev[1]), v1, ','.join(prev[1]), ok=False)
        assert not os.path.exists(png)
        print('resource_delta: ok (con resource_merge.py)')
    else:
        print('resource_delta: ok (senza la libreria: niente giro con resource_merge.py)')

import shutil  # noqa: E402
shutil.rmtree(CACHE_DIR, ignore_errors=True)
