"""Give the served Coliseum map armature a drawn hundreds digit (Coliseum point 2 26-11-2026, I-331 27-11-2026).

    python -I recon/tools/fix_colosseum_anim.py <files dir>      (stage_gen\\files: patched in place)

After a one-turn clear the client plays «ALL 1 TURN TRIUMPHS! N ROUNDS UNLOCKED» (ActMapColosseumAnim, movement
Colosseum_All1Turn) and writes N (the tier's master colosseum.excellentUnlockCount) digit by digit into the bone pairs
Round_NumL2 / Round_NumL2_Eff01, Round_NumL1 / ..._Eff01, Round_NumL0 / ..._Eff01, hundreds first. A pair is handled
only when both bones exist, and the divisor moves to the next digit only inside that branch (client analysis, private
notes); the digit glyphs come from img/colosseum/Colosseum_RoundNum.png (0-9, no blank cell), so a leading zero
must be hidden by the client itself: the JP 4.3.1 three-digit copy and the Colosseum_Start movement (round x/y, always
below 100) both animate the hundreds digit (to be confirmed on the bench with an N below 100).
The served English 2016 armature has no Round_NumL2_Eff01 bone and no Round_NumL2 / _Eff01 frames in Colosseum_All1Turn
(it was made for two digits), so:
1. the Round_NumL2_Eff01 bone is added, cloned from Round_NumL1_Eff01 (no parent, Colosseum_RoundNum00 display), on top
   of the z order; without it the hundreds pair is skipped and no digit is drawn at all;
2. Colosseum_All1Turn gets Round_NumL2 and Round_NumL2_Eff01 frames, cloned from the Round_NumL1 / _Eff01 frames and
   moved left by the distance between the tens and the units digit at the same frame (64 px when shown, 38 px while
   sliding in), so 100..199 draw as three digits (I-331: 199 and 149 were drawn as «99» / «49»). This is the layout of
   the JP 4.3.1 three-digit copy of the armature (its hundreds digit slides in from x 142 too), with the English
   tens / units positions kept: the Round_NumL1 / L0 bones and frames are not touched, so 1-2 digit numbers look
   exactly as before.
Nothing else changes. Idempotent: each step is skipped when its bone / frames are already there.
"""
import copy
import json
import os
import sys

NAME = os.path.join('cocostudio', 'publish', 'ActMapColosseumAnim.ExportJson')
SRC, NEW = 'Round_NumL1_Eff01', 'Round_NumL2_Eff01'
MOVEMENT = 'Colosseum_All1Turn'
# hundreds bone <- (tens bone, units bone): hundreds x = tens x - (units x - tens x), frame by frame
DIGITS = (('Round_NumL2', 'Round_NumL1', 'Round_NumL0'),
          ('Round_NumL2_Eff01', 'Round_NumL1_Eff01', 'Round_NumL0_Eff01'))


def _add_bone(doc):
    """-> True when the Round_NumL2_Eff01 bone was added."""
    bones = doc['armature_data'][0]['bone_data']
    names = [b['name'] for b in bones]
    if NEW in names:
        return False
    if SRC not in names or 'Round_NumL2' not in names:
        raise SystemExit(f'fix_colosseum_anim: {SRC} / Round_NumL2 not in the armature: unexpected file')
    bone = copy.deepcopy(bones[names.index(SRC)])
    bone['name'] = NEW
    bone['z'] = max(b.get('z', 0) for b in bones) + 1
    bones.append(bone)
    return True


def hundreds_frames(tens, units):
    """Frames of the hundreds digit: the tens frames moved left by (units x - tens x) of the same frame."""
    if len(tens) != len(units) or any(t['fi'] != u['fi'] for t, u in zip(tens, units)):
        raise SystemExit('fix_colosseum_anim: tens / units frames do not line up: unexpected file')
    out = []
    for t, u in zip(tens, units):
        f = copy.deepcopy(t)
        f['x'] = t['x'] - (u['x'] - t['x'])
        out.append(f)
    return out


def _add_frames(doc):
    """-> names of the bones that got Colosseum_All1Turn frames."""
    movs = [m for m in doc['animation_data'][0]['mov_data'] if m['name'] == MOVEMENT]
    if not movs:
        raise SystemExit(f'fix_colosseum_anim: movement {MOVEMENT} not in the armature: unexpected file')
    mbd = movs[0]['mov_bone_data']
    added = []
    for hund, tens, units in DIGITS:
        have = {b['name']: b for b in mbd}
        if hund in have and have[hund].get('frame_data'):
            continue
        if tens not in have or units not in have:
            raise SystemExit(f'fix_colosseum_anim: {tens} / {units} have no {MOVEMENT} frames: unexpected file')
        bone = copy.deepcopy(have[tens])
        bone['name'] = hund
        bone['frame_data'] = hundreds_frames(have[tens]['frame_data'], have[units]['frame_data'])
        if hund in have:
            mbd[mbd.index(have[hund])] = bone
        else:
            mbd.insert(mbd.index(have[tens]), bone)      # hundreds before tens, as in the JP 4.3.1 copy
        added.append(hund)
    return added


def patch(doc):
    """-> list of the changes made (doc changed in place); empty when the file was already patched."""
    done = []
    if _add_bone(doc):
        done.append(f'bone {NEW}')
    done += [f'{MOVEMENT} frames of {b}' for b in _add_frames(doc)]
    return done


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
    done = patch(doc)
    if not done:
        print('fix_colosseum_anim: hundreds digit already there')
        return 0
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    print(f'fix_colosseum_anim: {NAME}: added ' + ', '.join(done))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
