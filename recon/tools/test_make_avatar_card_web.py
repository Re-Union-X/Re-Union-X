"""Test of make_avatar_card_web.py (Events Part 7 Task 5c): python -I recon/tools/test_make_avatar_card_web.py

Synthetic pictures only (no game file): a JP-style folder with revisions, a loc folder with an exact file, a row whose source
is missing, a row not in the avatar board index, a stale card from an earlier run.
"""
import json
import os
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402
import make_avatar_card_web as mac  # noqa: E402

tmp = tempfile.mkdtemp(prefix='khux-avcard-')
try:
    jp, loc, b16, out = (os.path.join(tmp, n) for n in ('jp', 'loc', 'b16', 'out'))
    os.makedirs(os.path.join(jp, 'img', 'sphere_incentive'))
    os.makedirs(os.path.join(loc, 'img', 'sphere_incentive_av'))
    os.makedirs(out)

    def pic(path, size, colour):
        Image.new('RGBA', size, colour).save(path)

    # JP: two revisions of 2499010, the higher one wins (red); loc: an exact file (green, 306x306); a small one (40x40, blue)
    pic(os.path.join(jp, 'img', 'sphere_incentive', '2499010.20170101.png'), (306, 306), (0, 0, 255, 255))
    pic(os.path.join(jp, 'img', 'sphere_incentive', '2499010.20180101.png'), (306, 306), (255, 0, 0, 255))
    pic(os.path.join(loc, 'img', 'sphere_incentive_av', '2500016.png'), (306, 306), (0, 255, 0, 255))
    pic(os.path.join(loc, 'img', 'sphere_incentive_av', 'small.png'), (40, 40), (0, 0, 255, 255))
    tsv = os.path.join(tmp, 'originals.tsv')
    with open(tsv, 'w', encoding='utf8') as f:
        f.write('# 1. something else\nimg/wipe/wipe_2.png\tjp\n'
                '# 56. Avatar board cards\n'
                'img/sphere_incentive/5000001.png\tloc\t=img/sphere_incentive_av/2500016.png\n'
                'img/sphere_incentive/5000163.png\tjp\timg/sphere_incentive/2499010.png\n'
                'img/sphere_incentive/5000164.png\tjp\timg/sphere_incentive/2499999.png\t# missing here\n'
                'img/sphere_incentive/5000165.png\tloc\t=img/sphere_incentive_av/small.png\n'
                'img/sphere_incentive/5000999.png\tloc\t=img/sphere_incentive_av/2500016.png\t# not in the index\n'
                'img/sphere_incentive/2100119.png\tjp\timg/sphere_incentive/2499010.png\t# level board, not in the index\n')
    index = os.path.join(tmp, 'avatar_boards.json')
    with open(index, 'w', encoding='utf8') as f:
        json.dump({'index': {str(i): {} for i in (5000001, 5000163, 5000164, 5000165)}}, f)
    # a card of an earlier run that is no longer listed, and another file of the folder (kept)
    pic(os.path.join(out, '5000777.png'), (10, 10), (0, 0, 0, 255))
    with open(os.path.join(out, 'README.txt'), 'w') as f:
        f.write('x')

    roots = mac.roots(jp=jp, loc=loc, b16=b16)
    rep = mac.build(tsv, roots, out, index_file=index)
    assert rep['written'] == [5000001, 5000163, 5000165], rep
    assert rep['missing'] == [5000164], rep
    assert rep['skipped'] == [2100119, 5000999], rep
    assert rep['removed'] == [5000777], rep
    assert sorted(os.listdir(out)) == ['5000001.png', '5000163.png', '5000165.png', 'README.txt', 'cards.json'], os.listdir(out)
    with Image.open(os.path.join(out, '5000001.png')) as im:
        assert im.size == (160, 160), im.size
        assert im.convert('RGBA').getpixel((80, 80)) == (0, 255, 0, 255), 'only resized, nothing drawn'
    with Image.open(os.path.join(out, '5000163.png')) as im:
        assert im.convert('RGBA').getpixel((5, 5)) == (255, 0, 0, 255), 'the highest JP revision'
    with Image.open(os.path.join(out, '5000165.png')) as im:
        assert im.size == (40, 40), 'never enlarged'
    doc = json.load(open(os.path.join(out, 'cards.json'), encoding='utf8'))
    assert doc['ids'] == [5000001, 5000163, 5000165], doc
    assert isinstance(doc['version'], int) and doc['version'] > 0, doc
    v1 = doc['version']

    # re-runnable: the same sources give the same files and version; a changed source (corners cleaned) a new version
    rep2 = mac.build(tsv, roots, out, index_file=index)
    assert rep2['written'] == rep['written'] and rep2['removed'] == []
    assert json.load(open(os.path.join(out, 'cards.json'), encoding='utf8'))['version'] == v1, 'same cards, same version'
    pic(os.path.join(loc, 'img', 'sphere_incentive_av', '2500016.png'), (306, 306), (0, 200, 0, 255))
    mac.build(tsv, roots, out, index_file=index)
    assert json.load(open(os.path.join(out, 'cards.json'), encoding='utf8'))['version'] != v1, 'a changed card busts the cache'

    # without the index file: every section-56 style row is taken
    rep3 = mac.build(tsv, roots, out, index_file=os.path.join(tmp, 'none.json'))
    assert rep3['written'] == [2100119, 5000001, 5000163, 5000165, 5000999], rep3
    assert mac.card_id('img/sphere_incentive/5000001.png') == 5000001
    assert mac.card_id('img/sphere_incentive/*.png') is None and mac.card_id('img/wipe/wipe_2.png') is None
    print('test_make_avatar_card_web: OK')
finally:
    shutil.rmtree(tmp, ignore_errors=True)
