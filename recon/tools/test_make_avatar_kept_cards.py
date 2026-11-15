"""Test of make_avatar_kept_cards.py and of the avatar KEPT tab of make_special_banners.py (Events Part 7 Task 6c).

    python -I recon/tools/test_make_avatar_kept_cards.py        -> «OK: ...», exit 1 on an error

Synthetic pictures only (no game file): a JP-style folder with revisions, a loc folder, a level card, a row whose source is
missing, a stale twin card of an earlier run, an originals.tsv with a section 57 of an earlier run.
"""
import json
import os
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageChops  # noqa: E402
import make_special_banners as msb  # noqa: E402
import make_avatar_kept_cards as mk  # noqa: E402

# ---- the tab: style A of the 15-11 preview, top left of the 306x306 card, nothing else drawn ----
assert msb.KEPT_STYLES['avatar'] == ((150, 78, 18), (70, 30, 6), (30, 12, 2, 140)), msb.KEPT_STYLES.get('avatar')
assert msb.AVATAR_KEPT_TEXT == 'KEPT BOARD'
white = Image.new('RGBA', (306, 306), (255, 255, 255, 255))
tab = msb.avatar_kept_tab(white)
assert tab.size == (306, 306) and tab.mode == 'RGBA', (tab.size, tab.mode)
r, g, b, _ = tab.getpixel((3, 30))
assert r > g > b and r < 200, ('the band is brown / amber', (r, g, b))
assert tab.getpixel((3, 15))[:3] != (255, 255, 255), 'gold frame line at the top of the band'
gy = tab.getpixel((3, 15))
assert gy[0] > 200 and gy[1] > 150 and gy[2] < 140, ('the catalogue frame gold', gy)
for xy in ((3, 5), (150, 150), (300, 30), (3, 80), (300, 300)):
    assert tab.getpixel(xy) == (255, 255, 255, 255), ('nothing drawn outside the tab', xy, tab.getpixel(xy))
# a card that is not 306x306 is brought to 306x306 first
assert msb.avatar_kept_tab(Image.new('RGB', (612, 612), (0, 0, 255))).size == (306, 306)
# the banner tabs are unchanged by the geometry options (same call, same pixels)
ban = Image.new('RGB', (640, 140), (255, 255, 255))
assert msb.kept_tab(ban, style='event').size == (640, 140)

tmp = tempfile.mkdtemp(prefix='khux-avkept-')
try:
    jp, loc, out = (os.path.join(tmp, n) for n in ('jp', 'loc', 'out'))
    os.makedirs(os.path.join(jp, 'img', 'sphere_incentive'))
    os.makedirs(os.path.join(loc, 'img', 'sphere_incentive_av'))
    os.makedirs(out)

    def pic(path, size, colour):
        Image.new('RGBA', size, colour).save(path)

    pic(os.path.join(jp, 'img', 'sphere_incentive', '2499010.20170101.png'), (306, 306), (0, 0, 255, 255))
    pic(os.path.join(jp, 'img', 'sphere_incentive', '2499010.20180101.png'), (306, 306), (255, 0, 0, 255))
    pic(os.path.join(loc, 'img', 'sphere_incentive_av', '2500016.png'), (306, 306), (0, 255, 0, 255))
    pic(os.path.join(out, '5500777.png'), (10, 10), (0, 0, 0, 255))        # a twin card of an earlier run, no longer listed
    tsv = os.path.join(tmp, 'originals.tsv')
    head = ('# 1. something else\nimg/wipe/wipe_2.png\tjp\n'
            '# 56. Avatar board cards\n'
            'img/sphere_incentive/5000001.png\tloc\t=img/sphere_incentive_av/2500016.png\n'
            'img/sphere_incentive/5000163.png\tjp\timg/sphere_incentive/2499010.png\n'
            'img/sphere_incentive/5000164.png\tjp\timg/sphere_incentive/2499999.png\t# missing here\n'
            'img/sphere_incentive/2100119.png\tjp\timg/sphere_incentive/2499010.png\t# level board: no twin\n')
    with open(tsv, 'w', encoding='utf8', newline='\n') as f:
        f.write(head + '\n# 57. KEPT twin board cards (old block)\n'
                'img/sphere_incentive/5500777.png\tloc\t=img/sphere_incentive_kept/5500777.png\n')
    # the twin numbers: event_ids.json avatarTwins only (written by the master regen; fix round 1: no +500000 guess)
    index = os.path.join(tmp, 'avatar_boards.json')
    with open(index, 'w', encoding='utf8') as f:
        json.dump({'index': {'5000001': {'donorId': 9001, 'twin': 5599999}, '5000163': {'donorId': 9163},
                             '5000164': {'donorId': 9164}}}, f)
    ids = os.path.join(tmp, 'event_ids.json')
    with open(ids, 'w', encoding='utf8') as f:
        json.dump({'avatarBoards': {'9001': 1, '9163': 163, '9164': 164}, 'avatarTwins': {'9001': 1, '9163': 170, '9164': 164}}, f)
    tw = mk.twin_ids(index, ids)
    assert tw == {5000001: 5500001, 5000163: 5500170, 5000164: 5500164}, tw
    # a board with no avatarTwins number: a clear error (run the master regen first), never a guessed id
    nots = os.path.join(tmp, 'event_ids_old.json')
    with open(nots, 'w', encoding='utf8') as f:
        json.dump({'avatarBoards': {'9001': 1, '9163': 163, '9164': 164}, 'avatarTwins': {'9001': 1}}, f)
    try:
        mk.twin_ids(index, nots)
        raise AssertionError('a missing twin number must stop the run')
    except mk.TwinIdsMissing as e:
        assert '5000163' in str(e) and 'regen' in str(e), str(e)
    assert mk.main(['--ids', nots, '--index', index, '--tsv', tsv, '--loc', loc, '--out', os.path.join(tmp, 'o2')]) == 1

    roots = mk.mac.roots(jp=jp, loc=loc)
    rep = mk.build(tsv, roots, out, index_file=index, ids_file=ids)
    assert rep['written'] == [(5000001, 5500001), (5000163, 5500170)], rep
    assert rep['missing'] == [5000164], rep
    assert rep['skipped'] == [2100119], rep
    assert rep['removed'] == [5500777], rep
    assert sorted(os.listdir(out)) == ['5500001.png', '5500170.png'], os.listdir(out)
    with Image.open(os.path.join(out, '5500170.png')) as im:
        im = im.convert('RGBA')
        assert im.size == (306, 306)
        assert im.getpixel((150, 150)) == (255, 0, 0, 255), 'the highest JP revision, untouched outside the tab'
        assert im.getpixel((3, 30)) != (255, 0, 0, 255), 'the tab drawn'
        src = Image.new('RGBA', (306, 306), (255, 0, 0, 255))
        assert ImageChops.difference(im, msb.avatar_kept_tab(src)).getbbox() is None, 'the card is the original plus the tab'

    # originals.tsv: the section 57 block made again (old rows dropped), idempotent, section 56 untouched
    n = mk.write_tsv(tsv, rep['written'])
    assert n == 2, n
    with open(tsv, encoding='utf8') as f:
        text = f.read()
    assert text.startswith(head), 'the rows before stay'
    assert 'img/sphere_incentive/5500777.png' not in text and 'old block' not in text
    assert 'img/sphere_incentive/5500001.png\tloc\t=img/sphere_incentive_kept/5500001.png\n' in text
    assert 'img/sphere_incentive/5500170.png\tloc\t=img/sphere_incentive_kept/5500170.png\n' in text
    assert text.count('# 57.') == 1
    mk.write_tsv(tsv, rep['written'])
    with open(tsv, encoding='utf8') as f:
        assert f.read() == text, 'a second run changes nothing'
    # a CRLF file (Windows checkout) keeps CRLF line ends only
    crlf = os.path.join(tmp, 'crlf.tsv')
    with open(crlf, 'w', encoding='utf8', newline='') as f:
        f.write(head.replace('\n', '\r\n'))
    mk.write_tsv(crlf, rep['written'])
    with open(crlf, 'rb') as f:
        data = f.read()
    assert data.count(b'\n') == data.count(b'\r\n') and b'5500170.png' in data, 'CRLF kept'
    # the web card tool still reads section 56 alone for the originals (the twins are not index ids)
    rows = mk.mac.card_rows(tsv)
    assert 5500001 in rows and rows[5500001]['sources'] == ['loc']

    # montage: originals next to their twins
    mont = os.path.join(tmp, 'montage.png')
    size = mk.montage(tsv, roots, out, rep['written'], mont, count=12)
    with Image.open(mont) as im:
        assert im.size == size and im.size[0] > 2 * 306, im.size
finally:
    shutil.rmtree(tmp, ignore_errors=True)
print('OK: avatar KEPT twin cards')
