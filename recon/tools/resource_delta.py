"""Pacchetto delle differenze per una versione incrementale delle risorse (mode 2, docs/notes/server.md#resource-mode2).

Una versione N+1 incrementale e' «N invariata + un pacchetto in coda»: il gioco che ha N scarica solo il pacchetto e
l'indice di N+1. Questo script confronta la versione N (il suo indice unito misc.png e i dati della sua catena, in
ordine) con la build nuova completa (indice unito di tutti i pacchetti, come resource_merge.py lo farebbe per una
versione completa, e i dati dei pacchetti in ordine) e scrive in <uscita.png>/<uscita.mp4> un pacchetto (indice BGI v3
senza strato interno, come resource_pack.py) con i soli record che il gioco leggerebbe diversi: nomi nuovi e nomi il
cui record (header, nome offuscato e dati: i byte da cui bg::FileManager ricava il file) non e' identico. I record si
copiano byte per byte (nome offuscato e cifratura non dipendono dalla posizione, resource_compact.py); piu' nomi sullo
stesso record (alias) restano su un solo record.
Un record si confronta per contenuto: resource_pack.py cifra con un nonce casuale, quindi un file invariato del
pacchetto generato ha byte diversi a ogni build. Byte uguali = invariato; altrimenti si decifrano i due record e conta il
contenuto in chiaro (in cache: sha1 dei byte -> sha1 del contenuto, khux_bgi_cache/plain-1.pkl nella cartella temporanea; check non la usa,
cosi' la versione dopo non ridecifra i record di questa). Un record che non si decifra conta come cambiato.
Poi build-resources.ps1 -Append unisce con resource_merge.py --last-wins l'indice di N, i dati della catena e questo
pacchetto: gli offset di N non cambiano e «size» = dati di N + pacchetto.
I nomi che la build nuova non ha piu' restano nell'indice (record di N): li toglie solo una base completa nuova.
Il riempimento «zz_pad/...» non conta.

    python -I recon/tools/resource_delta.py [--no-cache] <recon/tools> <lib 4.3.1> <chiave hex> <uscita.png> <uscita.mp4>
        <indice N.png> <dati N>[,...] <indice completo.png> <dati completi>[,...]
Codice 2 (e nessun file) se non cambia niente.

    python -I recon/tools/resource_delta.py check [--cached] <recon/tools> <lib 4.3.1> <chiave hex>
        <indice N+1.png> <dati della catena>[,...] <indice completo.png> <dati completi>[,...]
Verifica: ogni nome della build completa ha in N+1 gli stessi byte. Codice 1 alla prima differenza.

Caches (15 Nov 2026, resource_cache.py): the delta remembers, per data file stamp (path, size, mtime), the length and sha1
of each record, and takes those of a new pack (with the sha1 of each plain content) from the <data>.rec sidecar that
resource_pack.py writes. The previous chain and the static packs are then not re-read (they were ~11 GB per run on the
HDD), and the new generated pack is neither re-read nor decrypted. The result is the same: same names compared, same
sha1 values. --no-cache: no record cache (the old behaviour: every record read again; the plain-content cache stays).
check: without --cached an independent reading (no cache at all, every differing record decrypted: build-resources.ps1
-Verify); with --cached the same name-by-name comparison over the cached record hashes (every run of -Append).
"""
import bisect
import hashlib
import os
import pickle
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bgad                                                  # noqa: E402
import resource_cache                                        # noqa: E402
from resource_compact import Concat, compact, index_bytes, read_bgi   # noqa: E402,F401

PAD = b'zz_pad/'


# versione nel nome: un decodificatore cambiato non riusa i risultati di prima
CACHE = os.path.join(resource_cache.ROOT, 'plain-1.pkl')


class Pack:
    """(indice, [dati]): {nome: (sha1 dei byte del record, offset)} senza il riempimento, e il contenuto in chiaro.
    cache: record hashes from resource_cache.FileRecords (remembered per data file, or from a resource_pack.py sidecar);
    sidecar_plain then holds the plain-content sha1 the sidecars give for record sha1s."""

    def __init__(self, pack, lib, skey, cache=False):
        index, self.datas = pack
        self.skey = skey
        offs, names = (resource_cache.read_bgi_cached if cache else read_bgi)(index, lib, skey)
        self.data = Concat(self.datas)
        files = [resource_cache.FileRecords(p, cache) for p in self.datas]
        # files holding data, by start offset in the concatenation (an empty file holds no record)
        parts = [(start, size, f) for (start, size, _), f in zip(self.data.parts, files) if size]
        starts = [p[0] for p in parts]
        hashes = {}
        self.read_bytes = 0
        for off in sorted({offs[r] for n, r in names if not n.startswith(PAD)}):
            start, size, f = parts[bisect.bisect_right(starts, off) - 1]
            e = f.get(off - start)
            if e is None:
                h = bgad.parse(self.data.read(off, bgad.HDR.size))
                raw = self.data.read(off, h['end'])
                self.read_bytes += len(raw)
                e = (h['end'], hashlib.sha1(raw).digest())
                if off - start + h['end'] <= size:      # a record across two files is not remembered by either
                    f.add(off - start, *e)
            hashes[off] = e[1]
        self.names = {n: (hashes[offs[r]], offs[r]) for n, r in names if not n.startswith(PAD)}
        self.sidecar_plain = {}
        for f in files:
            self.sidecar_plain.update(f.plain)
            f.save()

    def plain(self, name, cache):
        """sha1 del contenuto in chiaro del record di name (None se non si decifra)"""
        raw, off = self.names[name]
        if raw not in cache:
            h = bgad.parse(self.data.read(off, bgad.HDR.size))
            try:
                cache[raw] = hashlib.sha1(bgad.decode(self.data.read(off, h['end']), h, self.skey)).digest()
            except Exception:                               # noqa: BLE001 - cifratura sconosciuta: conta come cambiato
                return None
        return cache[raw]

    def close(self):
        self.data.close()


def load_cache():
    try:
        with open(CACHE, 'rb') as fh:
            return pickle.load(fh)
    except (OSError, EOFError, pickle.UnpicklingError):
        return {}


def save_cache(cache):
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    with open(CACHE + '.tmp', 'wb') as fh:
        pickle.dump(cache, fh)
    os.replace(CACHE + '.tmp', CACHE)


def seeded(cache, *packs):
    """the plain-content cache plus the sha1 values the sidecars of these packs give (written when the records were made)"""
    for p in packs:
        cache.update(p.sidecar_plain)
    return cache


def differs(a, b, name, cache):
    """il gioco leggerebbe un contenuto diverso per name in a e in b"""
    if a.names[name][0] == b.names[name][0]:
        return False
    pa, pb = a.plain(name, cache), b.plain(name, cache)
    return pa is None or pb is None or pa != pb


def delta(prev, full, lib, skey, out_png, out_mp4, use_cache=True):
    """scrive il pacchetto delle differenze (se ce ne sono); torna i conteggi"""
    old, new = Pack(prev, lib, skey, use_cache), Pack(full, lib, skey, use_cache)
    cache = seeded(load_cache(), old, new)
    print('record data read: previous %.1f MB, new %.1f MB (the rest from the record cache)' % (
        old.read_bytes / 1e6, new.read_bytes / 1e6))
    try:
        changed = [n for n in new.names if n in old.names and differs(old, new, n, cache)]
        added = [n for n in new.names if n not in old.names]
        removed = [n for n in old.names if n not in new.names]
        save_cache(cache)
        names = sorted(changed + added)
        stats = {'changed': len(changed), 'new': len(added), 'removed': len(removed), 'records': 0}
        if not names:
            return stats
        # compact() vuole offset dei record e nomi con l'indice del record: un record per offset distinto
        live = sorted({new.names[n][1] for n in names})
        at = {off: i for i, off in enumerate(live)}
        new_offs, new_names = compact(live, [(n, at[new.names[n][1]]) for n in names], new.data, out_mp4 + '.tmp')
    finally:
        old.close()
        new.close()
    with open(out_png + '.tmp', 'wb') as fh:
        fh.write(index_bytes(new_offs, new_names))
    os.replace(out_mp4 + '.tmp', out_mp4)
    os.replace(out_png + '.tmp', out_png)
    stats['records'] = len(new_offs)
    return stats


def check(result, full, lib, skey, cached=False):
    """differenze fra la versione risultante e la build completa: nomi mancanti o con byte diversi"""
    # senza la cache di delta(): una verifica indipendente decifra di nuovo (cached: record hashes and plain sha1 values
    # from resource_cache and the sidecars, the same comparison of every name)
    got, want = Pack(result, lib, skey, cached), Pack(full, lib, skey, cached)
    cache = seeded(load_cache(), got, want) if cached else {}
    out = []
    try:
        for n in want.names:
            if n not in got.names:
                out.append('nome mancante: %s' % n.decode('utf-8', 'replace'))
            elif differs(got, want, n, cache):
                out.append('record diverso: %s' % n.decode('utf-8', 'replace'))
    finally:
        got.close()
        want.close()
    return out


def main(argv):
    mode = 'delta'
    if argv[0] == 'check':
        mode, argv = 'check', argv[1:]
    flags = [a for a in argv if a in ('--cached', '--no-cache')]
    argv = [a for a in argv if a not in flags]
    sys.path.insert(0, argv[0])
    lib = bgad.lib_key(argv[1])
    skey = bytes.fromhex(argv[2])
    if mode == 'check':
        cached = '--cached' in flags
        diff = check((argv[3], argv[4].split(',')), (argv[5], argv[6].split(',')), lib, skey, cached)
        for d in diff[:20]:
            print(d)
        if diff:
            print('%d differenze' % len(diff))
            sys.exit(1)
        print('identici: ogni nome della build completa ha gli stessi byte nella versione incrementale (%s)' % (
            'record hashes from the cache' if cached else 'independent reading, every record read again'))
        return
    out_png, out_mp4 = argv[3], argv[4]
    st = delta((argv[5], argv[6].split(',')), (argv[7], argv[8].split(',')), lib, skey, out_png, out_mp4,
               '--no-cache' not in flags)
    print('nomi cambiati %d, nuovi %d, tolti %d (restano nell\'indice fino a una base completa nuova)' % (
        st['changed'], st['new'], st['removed']))
    if not st['records']:
        print('niente di cambiato rispetto alla versione precedente: nessun pacchetto')
        sys.exit(2)
    print('%s: %d record, %d byte' % (out_mp4, st['records'], os.path.getsize(out_mp4)))


if __name__ == '__main__':
    main(sys.argv[1:])
