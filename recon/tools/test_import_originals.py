"""Prova di import_originals.py:  python recon/tools/test_import_originals.py"""
import os
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import import_originals as io  # noqa: E402

t = tempfile.mkdtemp()
try:
    b16, jp, out = (os.path.join(t, d) for d in ('b16', 'jp', 'out'))

    def put(root, rel, data):
        p = os.path.join(root, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'w').write(data)
        io.jp_listing.cache_clear()       # listings are cached per folder during a real run (sources are read-only)
        io.plain_listing.cache_clear()

    put(b16, 'img/stage/ico_1.png', 'b1')
    put(b16, 'img/stage/ico_2.png', 'b2')
    put(jp, 'img/ui/g.00100000.png', 'old')
    put(jp, 'img/ui/g.00200000.png', 'new')
    put(jp, 'img/ui/h.png', 'plain')
    put(jp, 'lwf/mog/mog.00300000.lwf', 'L')
    put(jp, 'lwf/mog/mog_0.00300000.png', 'T')
    put(jp, 'pub/X9.00100000.png', 'x9')
    rows = io.parse(['img/stage/ico_*.png\tb16,jp  # glob', 'img/ui/g.png\tjp', 'img/ui/h.png\tb16,jp',
                     'lwf/mog/\tjp', 'img/ui/X9.png\tjp\tpub/X9.png', '', '# commento'])
    rep = io.run(rows, b16, jp, out)
    rd = lambda rel: open(os.path.join(out, rel)).read()
    assert rd('img/stage/ico_1.png') == 'b1' and rd('img/stage/ico_2.png') == 'b2', 'glob dal 2016'
    assert rd('img/ui/g.png') == 'new', 'revisione JP piu alta, suffisso tolto'
    assert rd('img/ui/h.png') == 'plain', 'ripiego sulla seconda fonte'
    assert rd('lwf/mog/mog.lwf') == 'L' and rd('lwf/mog/mog_0.png') == 'T', 'cartella intera'
    assert rd('img/ui/X9.png') == 'x9', 'sorgente diversa dalla destinazione'
    assert [r['source'] for r in rep] == ['b16', 'jp', 'jp', 'jp', 'jp'], rep
    # nomi gia' serviti dal WW: saltati nei glob, scritti se la destinazione e' esplicita
    shutil.rmtree(out)
    rep = io.run(io.parse(['img/stage/ico_*.png' + chr(9) + 'b16', 'img/ui/h.png' + chr(9) + 'jp']), b16, jp, out, {'img/stage/ico_2.png', 'img/ui/h.png'})
    assert os.path.exists(os.path.join(out, 'img/stage/ico_1.png')) and not os.path.exists(os.path.join(out, 'img/stage/ico_2.png')), 'glob: servito saltato'
    assert rd('img/ui/h.png') == 'plain' and rep[0]['servedWW'] == 1, 'destinazione esplicita scritta'
    # glob con parentesi quadre (I-196): ogni file col proprio nome, mai un file letterale con '['
    shutil.rmtree(out)
    for k in (11, 12, 3):
        put(jp, 'img/wipe/wipe_%d.00100000.png' % k, 'w%d' % k)
    io.run(io.parse(['img/wipe/wipe_1[1-4].png' + chr(9) + 'jp', 'img/wipe/wipe_[2-8].png' + chr(9) + 'jp']), b16, jp, out)
    assert rd('img/wipe/wipe_11.png') == 'w11' and rd('img/wipe/wipe_12.png') == 'w12' and rd('img/wipe/wipe_3.png') == 'w3', 'glob [..]'
    assert not [f for f in os.listdir(os.path.join(out, 'img/wipe')) if '[' in f], 'file letterale con ['
    # '=path' names an exact file: an older JP revision, or the plain name when numbered revisions exist
    shutil.rmtree(out)
    put(jp, 'img/ui/g.png', 'plain-g')
    io.run(io.parse(['img/ui/g.png' + chr(9) + 'jp' + chr(9) + '=img/ui/g.00100000.png',
                     'img/ui/g2.png' + chr(9) + 'jp' + chr(9) + '=img/ui/g.png']), b16, jp, out)
    assert rd('img/ui/g.png') == 'old', 'exact JP revision'
    assert rd('img/ui/g2.png') == 'plain-g', 'exact plain name'
    os.remove(os.path.join(jp, 'img/ui/g.png'))
    # loc: generated files outside the repo (--loc)
    loc = os.path.join(t, 'loc')
    put(loc, 'lwf/raid/demo/start_0018/start_0018.lwf', 'patched')
    io.run(io.parse(['lwf/raid/demo/start_0018/start_0018.lwf' + chr(9) + 'loc' + chr(9) + '=lwf/raid/demo/start_0018/start_0018.lwf']),
           b16, jp, out, set(), None, None, loc)
    assert rd('lwf/raid/demo/start_0018/start_0018.lwf') == 'patched', 'fonte loc'
    # IPA 4.4.0 gia' estratta
    i440 = os.path.join(t, 'i440')
    put(i440, 'img/union/Union_01.png', 'u1')
    io.run(io.parse(['img/union/Union_0*.png' + chr(9) + 'i440']), b16, jp, out, set(), i440)
    assert rd('img/union/Union_01.png') == 'u1', 'fonte i440'
    # --skip-prefix: rows still resolve (a vanished original is still an error) but the files under the prefix are not copied
    shutil.rmtree(out)
    rep = io.run(io.parse(['lwf/mog/\tjp', 'img/ui/h.png\tb16,jp']), b16, jp, out, skip_prefixes=('lwf/mog/',))
    assert not os.path.exists(os.path.join(out, 'lwf')) and rd('img/ui/h.png') == 'plain', 'skip-prefix: folder skipped, the rest copied'
    assert rep[0]['files'] == 0 and rep[0]['skippedPrefix'] == 2 and rep[1]['skippedPrefix'] == 0, rep
    try:
        io.run(io.parse(['lwf/none/\tjp']), b16, jp, out, skip_prefixes=('lwf/none/',))
        raise AssertionError('skip-prefix: a vanished original must still be an error')
    except SystemExit:
        pass
    try:
        io.run(io.parse(['img/none.png\tb16,jp']), b16, jp, out)
        raise AssertionError('riga senza originale accettata')
    except SystemExit:
        pass
    # 4 Nov 2026 speed-ups. Every row is resolved before writing: a vanished original leaves the output untouched
    shutil.rmtree(out)
    try:
        io.run(io.parse(['img/ui/h.png\tjp', 'img/none.png\tb16,jp']), b16, jp, out)
        raise AssertionError('riga senza originale accettata')
    except SystemExit:
        pass
    assert not os.path.exists(os.path.join(out, 'img/ui/h.png')), 'nothing written before every row is resolved'
    # a destination named by two rows gets the later one (as with the serial copies)
    io.run(io.parse(['img/ui/h.png\tjp', 'img/ui/h.png\tjp\timg/ui/g.png']), b16, jp, out)
    assert rd('img/ui/h.png') == 'new', 'later row wins'
    # identical destinations are not rewritten (same bytes, mtime kept); a different one of the same size is
    st = {}
    rows = io.parse(['img/stage/ico_*.png\tb16', 'lwf/mog/\tjp'])
    io.run(rows, b16, jp, out, stats=st)
    assert st == {'copied': 4, 'unchanged': 0}, st
    ico1 = os.path.join(out, 'img/stage/ico_1.png')
    os.utime(ico1, ns=(10 ** 18, 10 ** 18))
    open(os.path.join(out, 'img/stage/ico_2.png'), 'w').write('XX')          # same size, other bytes
    io.run(rows, b16, jp, out, stats=st)
    assert st == {'copied': 1, 'unchanged': 3}, st
    assert os.stat(ico1).st_mtime_ns == 10 ** 18 and rd('img/stage/ico_2.png') == 'b2', 'skip identical, rewrite different'
    open(os.path.join(out, 'lwf/mog/mog.lwf'), 'w').write('LONGER')          # other size
    io.run(rows, b16, jp, out, stats=st)
    assert st == {'copied': 1, 'unchanged': 3} and rd('lwf/mog/mog.lwf') == 'L', st
    # threads or not: same tree
    for k in range(40):
        put(b16, 'img/many/m_%02d.png' % k, 'm' * k)
    for w in (1, 8):
        o2 = os.path.join(t, 'o%d' % w)
        plan = {'img/many/m_%02d.png' % k: os.path.join(b16, 'img/many/m_%02d.png' % k) for k in range(40)}
        assert io.copy_plan(plan, o2, workers=w) == (40, 0) and io.copy_plan(plan, o2, workers=w) == (0, 40)
    assert sorted(os.listdir(os.path.join(t, 'o1', 'img/many'))) == sorted(os.listdir(os.path.join(t, 'o8', 'img/many')))
    assert all(open(os.path.join(t, 'o1', 'img/many', f)).read() == open(os.path.join(t, 'o8', 'img/many', f)).read()
               for f in os.listdir(os.path.join(t, 'o1', 'img/many')))
    # a plain leaf is a lookup, not a pattern: a name with regex-like characters but no wildcard
    put(b16, 'img/x/a+b(1).png', 'plus')
    io.run(io.parse(['img/x/a+b(1).png\tb16']), b16, jp, out)
    assert rd('img/x/a+b(1).png') == 'plus'

    # --skip-unless-changed (15 Nov 2026): the --skip-prefix destinations are skipped only while their inputs (source, size,
    # mtime, salt) are those of the last copy; otherwise copied exactly as without --skip-prefix (same files, same report)
    def tree(root):
        return {os.path.relpath(os.path.join(r, f), root): open(os.path.join(r, f)).read()
                for r, _, fs in os.walk(root) for f in fs}
    rows2 = io.parse(['lwf/mog/\tjp', 'img/ui/h.png\tb16,jp', 'lwf/mog/mog.lwf\tjp\timg/ui/h.png'])
    ref, cond = os.path.join(t, 'ref'), os.path.join(t, 'cond')
    io.jp_listing.cache_clear()
    io.plain_listing.cache_clear()
    rep_ref = io.run(rows2, b16, jp, ref)
    s1 = {}
    rep1 = io.run(rows2, b16, jp, cond, skip_prefixes=('lwf/mog/',), stats=s1, skip_stamp='')   # no earlier copy
    assert s1['prefix_skipped'] is False and rep1 == rep_ref and tree(cond) == tree(ref), (rep1, rep_ref)
    assert open(os.path.join(cond, 'lwf/mog/mog.lwf')).read() == 'plain', 'later row wins'
    shutil.rmtree(cond)
    s2 = {}
    rep2 = io.run(rows2, b16, jp, cond, skip_prefixes=('lwf/mog/',), stats=s2, skip_stamp=s1['prefix_stamp'])
    assert s2['prefix_skipped'] is True and s2['prefix_stamp'] == s1['prefix_stamp']
    assert not os.path.exists(os.path.join(cond, 'lwf')) and rep2[0]['skippedPrefix'] == 2 and rep2[2]['skippedPrefix'] == 1
    s3 = {}
    io.run(rows2, b16, jp, cond, skip_prefixes=('lwf/mog/',), stats=s3, skip_stamp=s1['prefix_stamp'], salt='btf v2')
    assert s3['prefix_skipped'] is False and tree(cond) == tree(ref), 'another salt: copied'
    os.utime(os.path.join(jp, 'lwf/mog/mog_0.00300000.png'), ns=(10 ** 18, 10 ** 18))   # a source touched
    io.jp_listing.cache_clear()
    io.plain_listing.cache_clear()
    s4 = {}
    io.run(rows2, b16, jp, cond, skip_prefixes=('lwf/mog/',), stats=s4, skip_stamp=s1['prefix_stamp'])
    assert s4['prefix_skipped'] is False and s4['prefix_stamp'] != s1['prefix_stamp'], 'changed source: copied'
    # the command line: stamp file in, stamp and decision out
    lst = os.path.join(t, 'rows.tsv')
    open(lst, 'w').write('lwf/mog/\tjp\n')
    so, sf = os.path.join(t, 'stamp.out'), os.path.join(t, 'stamp.txt')
    argv = ['import_originals.py', lst, b16, jp, cond, '--skip-prefix', 'lwf/mog/', '--skip-unless-changed', sf,
            '--prefix-stamp-out', so, '--stamp-salt', 'v']
    io.main(argv)
    first = open(so).read().split('\n')
    assert first[1] == 'copied', first
    open(sf, 'w').write(first[0] + '\nTREE\n')
    io.main(argv)
    assert open(so).read().split('\n')[:2] == [first[0], 'skipped']
finally:
    shutil.rmtree(t)
# I-025 (27-11-2026): the COMPLETE ribbon of the Avatar Board cards is the painted original (JP cocostudio/publish/
# LB_Complete.png, the texture of the JP SphereBoard_Select_Icon_ver130 «Clear» widget), not our drawn Sphere_Board_Clear
here = os.path.dirname(os.path.abspath(__file__))
rows = io.parse(open(os.path.join(here, 'originals.tsv'), encoding='utf8'))
lb = [r for r in rows if r['dest'] == 'cocostudio/publish/LB_Complete.png']
assert lb and 'jp' in lb[-1]['sources'], 'originals.tsv: LB_Complete.png from the JP root'
src_layouts = open(os.path.join(here, 'make_layouts.py'), encoding='utf8').read()
src_textures = open(os.path.join(here, 'make_textures.py'), encoding='utf8').read()
assert "I('Clear', 147, 159, 326, 324, 'LB_Complete.png'" in src_layouts, 'make_layouts: Clear on LB_Complete (JP geometry)'
assert 'Sphere_Board_Clear' not in src_layouts and 'Sphere_Board_Clear' not in src_textures, 'drawn ribbon still made'
sys.path.insert(0, here)
import private_tools  # noqa: E402
jp_root = private_tools.local_path('jp_data')
if jp_root and os.path.isdir(jp_root):
    io.jp_listing.cache_clear()
    hit = io.resolve(lb[-1]['src'], (jp_root, 'jp'))
    assert [n for n, _ in hit] == ['LB_Complete.png'], 'real JP root: LB_Complete.png %r' % hit
else:
    print('(JP root absent: LB_Complete check on the real files skipped)')
print('OK: import_originals')
