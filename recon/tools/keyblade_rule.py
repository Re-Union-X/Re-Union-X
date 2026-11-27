"""rule/keyblade_rule.bin: posa del LWF del keyblade nei riquadri dei menu, ricentrata.

Il formato: record da 0x44 byte = int keybladeId + 4 modi x (rotazione x10000
in gradi, scala x10000, x, y). carica lwf/avatar/keyblade/keyblade_%04d_%02d
(displayId), cerca il record del keybladeId, poi quello della serie (id/1000*1000), poi 1000,
e applica setRotation(rot/10000), setScale(scala/10000), setPosition(x, y) del modo chiesto
(3 = riquadro di «Select a Keyblade»). Se il LWF manca usa
img/keyBlade/KeyBlade_%06d.png. Il file servito ha solo 1000..11000 (le serie 12000-16000
prendono la posa di Starlight senza --jp) e i LWF della 5.0.1 non sono centrati con quei valori: Treasure
Trove a destra/in alto e tagliato (banco 11 ottobre). Le stesse LWF le usa l'avatar (parti
lwf/avatar/keyblade), quindi non si toccano: si riscrive la regola.

Per ogni riga della tabella keyblade si calcola il centro dell'arte nel LWF (riquadro del
frammento di texture, trasformato dalla traslazione piu' interna e poi dalle matrici in ordine
di indice: il modello delle LWF a una bitmap, stadi 01-05; lo stadio 06 prende il centro del 05)
e, modo per modo, la posizione che lo porta dove Starlight 1000 (stadio 01) ha il suo con la
posa originale; rotazione e scala restano quelle originali della serie (o di Starlight).

    python -I recon/tools/keyblade_rule.py <keyblade.json> <keyblade_rule.bin originale> <cartella LWF estratti> <uscita>
        [--jp <JP 4.3.1 root>]

--jp (I-338): the WW rule has only the series 1000..11000; the JP 4.3.1 rule/keyblade_rule.00351791.bin also has
12000..16000, added (WW records win on the common series). Without it 12000-16000 take Starlight's pose.

<cartella LWF estratti> = res_bulk.py con lwf/avatar/keyblade/ (catalog\\keyblade_lwf);
<uscita> = stage_gen\\files (scrive rule/keyblade_rule.bin).
"""
import argparse
import json
import math
import os
import re
import struct
import sys

SECTIONS = ['stringBytes', 'animationBytes', 'translate', 'matrix', 'color', 'alphaTransform',
            'colorTransform', 'objectData', 'texture', 'textureFragment', 'bitmap']


def lwf_center(path):
    d = open(path, 'rb').read()
    sec = {}
    for i, n in enumerate(SECTIONS):
        sec[n] = struct.unpack_from('<2i', d, 32 + 8 * i)
    o, c = sec['translate']
    tr = [struct.unpack_from('<2f', d, o + 8 * i) for i in range(c)][1:]
    o, c = sec['matrix']
    mx = [struct.unpack_from('<6f', d, o + 24 * i) for i in range(c)]
    o, c = sec['textureFragment']
    if c != 1:
        return None
    w, h = struct.unpack_from('<2i', d, o + 28)
    pts = [(0, 0), (w, 0), (0, h), (w, h)]
    for tx, ty in tr:
        pts = [(x + tx, y + ty) for x, y in pts]
    for sx, sy, k0, k1, tx, ty in mx:
        pts = [(sx * x + k0 * y + tx, k1 * x + sy * y + ty) for x, y in pts]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)


def offset(center, rot, scale):
    """Spostamento sullo schermo (coordinate cocos, y in alto) del centro dell'arte: rotazione
    oraria in gradi, LWF con y in basso."""
    a = math.radians(rot / 10000)
    x, y = center
    s = scale / 10000
    dx = (x * math.cos(a) - y * math.sin(a)) * s
    dy = (x * math.sin(a) + y * math.cos(a)) * s
    return dx, -dy


def load_rules(path):
    """{keybladeId: [[rot, scale, x, y] x 4 modes]} of a keyblade_rule.bin."""
    d = open(path, 'rb').read()
    rules = {}
    for i in range(len(d) // 0x44):
        r = struct.unpack_from('<17i', d, 0x44 * i)
        rules[r[0]] = [list(r[1 + 4 * m:5 + 4 * m]) for m in range(4)]
    return rules


REV = re.compile(r'^keyblade_rule(?:\.(\d{8}))?\.bin$')


def jp_rule_path(path):
    """The JP rule file: `path` itself if it is a file, else the highest revision of <path>/rule/keyblade_rule[.<8 digits>].bin
    (JP 4.3.1: keyblade_rule.00351791.bin, 16 series); None if absent."""
    if os.path.isfile(path):
        return path
    folder = os.path.join(path, 'rule')
    if not os.path.isdir(folder):
        return None
    best = None
    for f in os.listdir(folder):
        mm = REV.match(f)
        if mm:
            r = int(mm.group(1) or -1)
            if best is None or r > best[0]:
                best = (r, os.path.join(folder, f))
    return best[1] if best else None


def merge_rules(ww, jp):
    """I-338 (27-11-2026): the WW rule has the series 1000..11000, the JP 4.3.1 one also 12000..16000 (without them those
    keyblades take Starlight's pose). The WW records win (the JP revision moves only mode 3, for the JP layouts); the
    records only the JP has are added. -> (merged, [added ids])"""
    added = sorted(k for k in jp if k not in ww)
    merged = dict(ww)
    merged.update({k: jp[k] for k in added})
    return merged, added


def make_records(rows, rules, center, log=True):
    """[(keybladeId, 16 values)] sorted by id: rotation / scale of the keyblade's record, else its series, else Starlight
    1000; per mode the position that puts the art centre (center(displayId), LWF coordinates; None = position as is)
    where Starlight 1000 has it with the original pose."""
    ref_c = center(next(r['displayId'] for r in rows if r['keybladeId'] == 1000))
    targets = []
    for rot, sc, x, y in rules[1000]:
        dx, dy = offset(ref_c, rot, sc)
        targets.append((x + dx, y + dy))
    out = []
    for r in sorted(rows, key=lambda r: r['keybladeId']):
        kid = r['keybladeId']
        base = rules.get(kid) or rules.get(kid // 1000 * 1000) or rules[1000]
        c = center(r['displayId'])
        modes = []
        for m, (rot, sc, x, y) in enumerate(base):
            if c is None:
                modes += [rot, sc, x, y]
                continue
            dx, dy = offset(c, rot, sc)
            nx, ny = round(targets[m][0] - dx), round(targets[m][1] - dy)
            modes += [rot, sc, nx, ny]
            if m == 3 and log:
                print('%5d %-24s modo 3: %4d,%4d -> %4d,%4d' % (kid, r['name'], x, y, nx, ny))
        out.append((kid, modes))
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('master')
    ap.add_argument('rule_in')
    ap.add_argument('lwf_dir')
    ap.add_argument('out')
    ap.add_argument('--jp', default=None, help='JP 4.3.1 root (or rule file): adds the series the WW rule lacks (I-338)')
    a = ap.parse_args(argv)
    master, lwf_dir, out = a.master, a.lwf_dir, a.out
    rules = load_rules(a.rule_in)
    if a.jp:
        jp_p = jp_rule_path(a.jp)
        if not jp_p:
            raise SystemExit('keyblade_rule: JP rule absent under %s' % a.jp)
        rules, added = merge_rules(rules, load_rules(jp_p))
        print('serie dal JP (%s): %s' % (os.path.basename(jp_p), ' '.join(map(str, added)) or '-'))

    def center(disp):
        for stage in (disp % 100, 5):
            p = os.path.join(lwf_dir, 'keyblade_%04d_%02d' % (disp // 100, stage),
                             'keyblade_%04d_%02d.lwf' % (disp // 100, stage))
            if os.path.exists(p):
                c = lwf_center(p)
                if c:
                    return c
        return None

    rows = json.load(open(master, encoding='utf-8'))
    outrec = [struct.pack('<17i', kid, *modes) for kid, modes in make_records(rows, rules, center)]
    os.makedirs(os.path.join(out, 'rule'), exist_ok=True)
    open(os.path.join(out, 'rule', 'keyblade_rule.bin'), 'wb').write(b''.join(outrec))
    print('righe:', len(outrec))


if __name__ == '__main__':
    main()
