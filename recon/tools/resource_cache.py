"""Caches of the resource build tools, keyed by a file's path, size and modification time (15 Nov 2026, -Append speed).

build-resources.ps1 -Append re-read the whole data of the previous version (~5.4 GB, the chain pieces) and of the new full
build (~5.8 GB, OBB, addnl, static packs, generated pack) twice per run on the D: spinning disk: once for the delta and once
for the check, plus a third time for the md5 of the new index. Almost all of those files never change after they are
written (resource_pack.py and resource_compact.py write a pack to a temporary file and rename it; version pieces are hard
links or copies made once). What is remembered here, by file stamp (absolute path, size, mtime in ns):

- read_bgi_cached(): the decoded index of a .png (the same cache files resource_merge.py always used);
- FileRecords: per data file, the length and sha1 of every record that starts and ends inside it, as resource_delta.py
  hashes them; resource_pack.py writes the same table next to a new pack (<data>.rec) with the sha1 of the plain content
  of each record, so a new generated pack is neither re-read nor decrypted by resource_delta.py;
- md5_files(): the md5 of a list of files in order, resumable: the MD5 state after each file is kept (OpenSSL MD5_CTX, the
  libcrypto Python ships), so the md5 of «previous chain + new piece» hashes only the new piece.

A file modified less than RACY seconds ago is read but not remembered (its mtime could repeat after another write within
the clock tick, as in git's «racy» index entries). KHUX_BGI_CACHE moves the cache folder (tests).
"""
import ctypes
import glob
import hashlib
import os
import pickle
import tempfile
import time

ROOT = os.environ.get('KHUX_BGI_CACHE') or os.path.join(tempfile.gettempdir(), 'khux_bgi_cache')
RACY = 3.0
REC_VERSION = 1


def _norm(path):
    return os.path.normcase(os.path.abspath(path))


def stable(st):
    """the file's stamp can be trusted to change with its content (not written in the last RACY seconds)"""
    return time.time() - st.st_mtime > RACY


def _load(path):
    try:
        with open(path, 'rb') as fh:
            return pickle.load(fh)
    except (OSError, EOFError, pickle.UnpicklingError, ValueError):
        return None


def _dump(path, value):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.%d.tmp' % os.getpid()
    with open(tmp, 'wb') as fh:
        pickle.dump(value, fh, protocol=pickle.HIGHEST_PROTOCOL)
    os.replace(tmp, path)


def read_bgi_cached(path, lib, skey):
    """resource_compact.read_bgi with the on-disk cache of resource_merge.py (same file names: the two tools share it)"""
    import resource_compact
    st = os.stat(path)
    tag = hashlib.sha1(('%s|%d|%d' % (os.path.abspath(path), st.st_size, st.st_mtime_ns)).encode()).hexdigest()
    cache = os.path.join(ROOT, tag + '.pkl')
    got = _load(cache)
    if got is not None:
        return got
    result = resource_compact.read_bgi(path, lib, skey)
    if stable(st):
        _dump(cache, result)
    return result


def sidecar_path(data_path):
    return data_path + '.rec'


def write_sidecar(data_path, recs, plain):
    """next to a pack just written by resource_pack.py: {local offset: (record length, sha1 of the record bytes)} and
    {sha1 of the record bytes: sha1 of the plain content}; valid while the data file keeps its size and mtime"""
    st = os.stat(data_path)
    _dump(sidecar_path(data_path), {'version': REC_VERSION, 'size': st.st_size, 'mtime_ns': st.st_mtime_ns,
                                    'recs': recs, 'plain': plain})


class FileRecords:
    """Record hashes of one data file. recs: {local offset: (length, sha1 digest of the record bytes)}; plain: the sha1 of
    the plain content of records whose bytes have that sha1 (from the resource_pack.py sidecar). use_cache False: nothing
    is loaded or saved (resource_delta.py check without --cached, an independent reading)."""

    def __init__(self, path, use_cache=True):
        st = os.stat(path)
        self.path, self.size = path, st.st_size
        self.recs, self.plain, self.dirty = {}, {}, False
        self.keep = use_cache and stable(st)
        self.file = os.path.join(ROOT, 'rec-%d' % REC_VERSION, hashlib.sha1(
            ('%s|%d|%d' % (_norm(path), st.st_size, st.st_mtime_ns)).encode()).hexdigest() + '.pkl')
        if not use_cache:
            return
        got = _load(self.file)
        if got is None:
            side = _load(sidecar_path(path))
            if (isinstance(side, dict) and side.get('version') == REC_VERSION and side.get('size') == st.st_size
                    and side.get('mtime_ns') == st.st_mtime_ns):
                got = {'recs': side['recs'], 'plain': side['plain']}
                self.dirty = True                     # copied into the cache folder (the sidecar may go with the pack)
        if got is not None:
            self.recs, self.plain = got['recs'], got.get('plain', {})

    def get(self, local_off):
        return self.recs.get(local_off)

    def add(self, local_off, length, digest):
        self.recs[local_off] = (length, digest)
        self.dirty = True

    def save(self):
        if self.keep and self.dirty:
            _dump(self.file, {'recs': self.recs, 'plain': self.plain})
            self.dirty = False


# --- md5 of a list of files, resumable -------------------------------------------------------------------------------

MD5_CTX_SIZE = 92               # OpenSSL MD5_CTX: A, B, C, D, Nl, Nh, data[16], num (u32 each)
_crypto = []


def _libcrypto():
    """libcrypto with MD5_Init/Update/Final, checked once against hashlib (state saved and restored mid-way), or None"""
    if _crypto:
        return _crypto[0]
    lib = None
    try:
        import _hashlib
        for p in sorted(glob.glob(os.path.join(os.path.dirname(_hashlib.__file__), 'libcrypto*'))):
            try:
                c = ctypes.CDLL(p)
                c.MD5_Init, c.MD5_Update, c.MD5_Final         # noqa: B018 - attribute check
            except (OSError, AttributeError):
                continue
            c.MD5_Update.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_size_t]
            probe = bytes(range(256)) * 1031
            ctx = ctypes.create_string_buffer(128)
            c.MD5_Init(ctx)
            c.MD5_Update(ctx, probe[:70001], 70001)
            ctx2 = ctypes.create_string_buffer(ctx.raw[:MD5_CTX_SIZE], 128)
            c.MD5_Update(ctx2, probe[70001:], len(probe) - 70001)
            out = ctypes.create_string_buffer(16)
            c.MD5_Final(out, ctx2)
            if out.raw.hex() == hashlib.md5(probe).hexdigest():
                lib = c
                break
    except Exception:                                         # noqa: BLE001 - no usable libcrypto: plain hashlib
        lib = None
    _crypto.append(lib)
    return lib


def md5_files(paths, use_cache=True, log=None):
    """hex md5 of the files concatenated in order. With use_cache, the MD5 state after each file is stored under a key made
    of the stamps of the files up to it, and a later call resumes from the longest stored prefix."""
    c = _libcrypto() if use_cache else None
    if c is None:
        h = hashlib.md5()
        for p in paths:
            with open(p, 'rb') as fh:
                for chunk in iter(lambda: fh.read(1 << 24), b''):
                    h.update(chunk)
        return h.hexdigest()
    folder = os.path.join(ROOT, 'md5-1')
    keys, k, trusted = [], hashlib.sha1(b'md5-1'), []
    for p in paths:
        st = os.stat(p)
        k.update(('%s|%d|%d\n' % (_norm(p), st.st_size, st.st_mtime_ns)).encode())
        keys.append(k.hexdigest())
        trusted.append(stable(st) and (not trusted or trusted[-1]))
    ctx = ctypes.create_string_buffer(128)
    start = 0
    for i in range(len(paths) - 1, -1, -1):
        state = os.path.join(folder, keys[i] + '.bin')
        if trusted[i] and os.path.exists(state):
            raw = open(state, 'rb').read()
            if len(raw) == MD5_CTX_SIZE:
                ctypes.memmove(ctx, raw, MD5_CTX_SIZE)
                start = i + 1
                break
    if start == 0:
        c.MD5_Init(ctx)
    if log:
        log('md5: %d of %d files resumed from the cache' % (start, len(paths)))
    for i in range(start, len(paths)):
        with open(paths[i], 'rb') as fh:
            for chunk in iter(lambda: fh.read(1 << 24), b''):
                c.MD5_Update(ctx, chunk, len(chunk))
        if trusted[i]:
            os.makedirs(folder, exist_ok=True)
            state = os.path.join(folder, keys[i] + '.bin')
            with open(state + '.tmp', 'wb') as fh:
                fh.write(ctx.raw[:MD5_CTX_SIZE])
            os.replace(state + '.tmp', state)
    fin = ctypes.create_string_buffer(ctx.raw, 128)
    out = ctypes.create_string_buffer(16)
    c.MD5_Final(out, fin)
    return out.raw.hex()
