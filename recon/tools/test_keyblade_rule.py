"""Offline test of keyblade_rule.py (I-338, 27-11-2026): the 5 keyblade series 12000-16000 that only the JP 4.3.1 rule
(rule/keyblade_rule.00351791.bin, 16 series) has are merged into the WW rule (11 series), WW wins on the common series.

    python -I recon/tools/test_keyblade_rule.py        -> «OK: ...» or «ERRORS (n)», exit 1
"""
import os
import struct
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import keyblade_rule as m  # noqa: E402

errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)


def rec(kid, rot, sc, x, y):
    return struct.pack('<17i', kid, *([rot, sc, x, y] * 4))


with tempfile.TemporaryDirectory() as t:
    ww = os.path.join(t, 'ww.bin')
    open(ww, 'wb').write(rec(1000, 1610000, 28000, 240, 350) + rec(2000, 1610000, 27000, 224, 328))
    jpd = os.path.join(t, 'jp', 'rule')
    os.makedirs(jpd)
    open(os.path.join(jpd, 'keyblade_rule.bin'), 'wb').write(rec(1000, 1, 1, 1, 1))
    open(os.path.join(jpd, 'keyblade_rule.00000005.bin'), 'wb').write(rec(1000, 2, 2, 2, 2))
    open(os.path.join(jpd, 'keyblade_rule.00351791.bin'), 'wb').write(
        rec(1000, 9, 9, 9, 9) + rec(2000, 9, 9, 9, 9) + rec(12000, 1610000, 27000, 219, 338) + rec(16000, 1610000, 28000, 219, 338))
    r = m.load_rules(ww)
    check(sorted(r) == [1000, 2000] and r[1000][0] == [1610000, 28000, 240, 350], 'load_rules %r' % r)
    check(m.jp_rule_path(os.path.join(t, 'jp')) == os.path.join(jpd, 'keyblade_rule.00351791.bin'),
          'jp_rule_path: highest revision of the JP root')
    check(m.jp_rule_path(os.path.join(jpd, 'keyblade_rule.00000005.bin')).endswith('00000005.bin'), 'jp_rule_path: a file as is')
    check(m.jp_rule_path(os.path.join(t, 'none')) is None, 'jp_rule_path: absent')
    merged, added = m.merge_rules(r, m.load_rules(m.jp_rule_path(os.path.join(t, 'jp'))))
    check(sorted(merged) == [1000, 2000, 12000, 16000] and added == [12000, 16000], 'merge_rules: keys %r %r' % (sorted(merged), added))
    check(merged[1000] == r[1000] and merged[2000] == r[2000], 'merge_rules: WW wins on the common series')
    check(merged[12000][0] == [1610000, 27000, 219, 338], 'merge_rules: JP series 12000')
    # records: a 12000 keyblade takes its own series pose (rotation / scale), not Starlight's; position recentred
    rows = [{'keybladeId': 1000, 'displayId': 100001, 'name': 'Starlight'},
            {'keybladeId': 12001, 'displayId': 1200101, 'name': 'Series 12'},
            {'keybladeId': 13001, 'displayId': 1300101, 'name': 'Series 13'}]
    recs = m.make_records(rows, merged, lambda disp: (10.0, 20.0), log=False)
    check([k for k, _ in recs] == [1000, 12001, 13001], 'make_records: order')
    d = dict(recs)
    check(d[12001][0:2] == [1610000, 27000] and d[13001][0:2] == [1610000, 28000],
          'make_records: series 12000 from the JP rule, 13000 (in no rule) Starlight %r %r' % (d[12001][:2], d[13001][:2]))
    check(d[1000][2:4] == [240, 350], 'make_records: Starlight keeps its position %r' % d[1000][2:4])
    recs0 = m.make_records(rows, r, lambda disp: (10.0, 20.0), log=False)
    check(dict(recs0)[12001][0:2] == [1610000, 28000], 'make_records: without the JP rule 12000 falls back to Starlight')

# the real files: the WW rule has 11 series, the JP 4.3.1 one adds 12000..16000
import private_tools  # noqa: E402
jp_root = private_tools.local_path('jp_data')
ww_real = os.path.join(r'D:\Progetto_Restauro_KH_UX', 'catalog', 'keyblade_lwf', 'rule', 'keyblade_rule.bin')
if jp_root and os.path.isdir(jp_root) and os.path.exists(ww_real):
    jp_p = m.jp_rule_path(jp_root)
    check(jp_p and os.path.basename(jp_p) == 'keyblade_rule.00351791.bin', 'real JP rule %r' % jp_p)
    _, added = m.merge_rules(m.load_rules(ww_real), m.load_rules(jp_p))
    check(added == [12000, 13000, 14000, 15000, 16000], 'real merge adds %r' % added)
else:
    print('(local data absent: real-file check skipped)')

if errors:
    print('ERRORS (%d)' % len(errors))
    for e in errors:
        print(' -', e)
    sys.exit(1)
print('OK: keyblade_rule load / JP revision / merge (WW wins) / records per series, real files')
