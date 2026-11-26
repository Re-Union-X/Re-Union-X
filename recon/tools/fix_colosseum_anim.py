"""Add the missing hundreds-effect bone to the served Coliseum map armature (Coliseum point 2, 26-11-2026).

    python -I recon/tools/fix_colosseum_anim.py <files dir>      (stage_gen\\files: patched in place)

After a one-turn clear the client plays «ALL 1 TURN TRIUMPHS! N ROUNDS UNLOCKED» (ActMapColosseumAnim, movement
Colosseum_All1Turn) and writes N (the tier's master colosseum.excellentUnlockCount) digit by digit into the bone pairs
Round_NumL2 / Round_NumL2_Eff01, Round_NumL1 / ..._Eff01, Round_NumL0 / ..._Eff01, hundreds first. A pair is handled
only when both bones exist, and the divisor moves to the next digit only inside that branch (client analysis, private
notes). The served English 2016 armature has no Round_NumL2_Eff01 bone, so the hundreds pair is skipped, the divisor
stays at 100 and every digit of an N below 100 is drawn as the blank frame: no number on screen.
The fix adds the bone, cloned from Round_NumL1_Eff01 of the same file (no parent, the blank Colosseum_RoundNum00
display), with no frames: the hundreds digit stays hidden (N never reaches 100) and the tens / units are drawn on the
English positions. Nothing else changes. Idempotent: a file that already has the bone is left as it is.
"""
import json
import os
import sys

NAME = os.path.join('cocostudio', 'publish', 'ActMapColosseumAnim.ExportJson')
SRC, NEW = 'Round_NumL1_Eff01', 'Round_NumL2_Eff01'


def patch(doc):
    """-> True when the bone was added (doc changed in place)."""
    bones = doc['armature_data'][0]['bone_data']
    names = [b['name'] for b in bones]
    if NEW in names:
        return False
    if SRC not in names or 'Round_NumL2' not in names:
        raise SystemExit(f'fix_colosseum_anim: {SRC} / Round_NumL2 not in the armature: unexpected file')
    bone = json.loads(json.dumps(bones[names.index(SRC)]))
    bone['name'] = NEW
    bone['z'] = max(b.get('z', 0) for b in bones) + 1
    bones.append(bone)
    return True


def main(argv):
    if len(argv) != 1:
        print(__doc__)
        return 2
    path = os.path.join(argv[0], NAME)
    if not os.path.isfile(path):
        print(f'fix_colosseum_anim: {path} missing (no Coliseum armature in this build): nothing to do')
        return 0
    with open(path, encoding='utf-8-sig') as f:
        doc = json.load(f)
    if not patch(doc):
        print(f'fix_colosseum_anim: {NEW} already there')
        return 0
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    print(f'fix_colosseum_anim: {NEW} added to {NAME}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
