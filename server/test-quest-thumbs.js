// Tests of the quest-list thumbnail picker (I-317, server/quest-thumbs.js): node server/test-quest-thumbs.js
// Fake icon lists and folders only (no game data).
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const qt = require('./quest-thumbs');

const tests = {
  exact_icon_of_the_row_world() {
    const pick = qt.picker(new Set(['1_100100', '3_90000']));
    assert.deepStrictEqual([pick('DB_0010_01_00', 1), pick('WL_0009_00_00', 3)], [100100, 90000]);
    assert.strictEqual(pick.copies.size, 0);
  },
  // the old rule took stage_select_ico_<row world>_<thumb> whatever the room's world: 2_0 (Flower Glade) on a DB_0000_00_00 map
  same_number_of_another_world_is_not_the_room() {
    const pick = qt.picker(new Set(['1_0', '2_0']));
    assert.strictEqual(pick('DB_0000_00_00', 2), 10000000);
    assert.deepStrictEqual([...pick.copies], [['2_10000000', '1_0']]);
  },
  room_of_another_world_copied() {
    const pick = qt.picker(new Set(['7_120000', '7_140000', '1_1000200', '13_100']));
    assert.deepStrictEqual([pick('CD_0012_00_00', 1), pick('CD_0014_00_00', 1), pick('DG_0100_02_00', 4), pick('KG_0000_01_00', 13)],
      [70120000, 70140000, 11000200, 100]);
    assert.deepStrictEqual([...pick.copies].sort(), [['1_70120000', '7_120000'], ['1_70140000', '7_140000'], ['4_11000200', '1_1000200']]);
  },
  closest_variant_of_the_same_room() {
    const pick = qt.picker(new Set(['1_220000', '1_80000', '1_80100', '4_160100', '4_100000', '1_230100']));
    // sub-variant -> its _00; a variant with no icon -> _00_00; no _00_00 -> the lowest served variant of the room
    assert.deepStrictEqual([pick('DB_0022_00_01', 1), pick('DB_0008_03_00', 1), pick('AG_0016_00_00', 4), pick('AG_0010_00_01', 4),
      pick('DB_0023_01_01', 1)], [220000, 80000, 160100, 100000, 230100]);
    // a variant of another world's room: copied
    assert.strictEqual(pick('AG_0016_00_00', 2), 40160100);
  },
  nothing_better_is_null() {
    const pick = qt.picker(new Set(['1_0']));
    assert.deepStrictEqual([pick('DB_0005_00_00', 1), pick(null, 1), pick('nonsense', 1), qt.picker(null)('DB_0000_00_00', 1), pick('DB_0000_00_00', undefined)],
      [null, null, null, null, null]);
    // a room prefix not known here is taken as of the row's world (as before I-317)
    assert.strictEqual(qt.picker(new Set(['5_300']))('ZZ_0000_03_00', 5), 300);
  },
  copy_lines_for_import_originals() {
    const text = qt.copyLines(new Map([['4_10090000', '1_90000']]), 'raid quest');
    const rows = text.split('\n').filter((l) => l && !l.startsWith('#'));
    assert.deepStrictEqual(rows, ['img/adventure/stage/stage_select_ico_4_10090000.png\tb16,jp\timg/adventure/stage/stage_select_ico_1_90000.png']);
    assert.ok(qt.copyLines(undefined, 'x').split('\n').filter((l) => l && !l.startsWith('#')).length === 0);
  },
  served_icons_include_the_2016_bundle() {
    const d = fs.mkdtempSync(path.join(process.env.KHUX_TMP || os.tmpdir(), 'qthumbs-'));
    try {
      const names = path.join(d, 'names.tsv');
      fs.writeFileSync(names, 'img/adventure/stage/stage_select_ico_1_0.png\tx\n');
      const jp = path.join(d, 'jp', 'img', 'adventure', 'stage'), b16 = path.join(d, 'b16', 'img', 'adventure', 'stage');
      fs.mkdirSync(jp, { recursive: true });
      fs.mkdirSync(b16, { recursive: true });
      fs.writeFileSync(path.join(jp, 'stage_select_ico_7_120000.12345678.png'), '');
      fs.writeFileSync(path.join(b16, 'stage_select_ico_3_90000.png'), '');
      fs.writeFileSync(path.join(b16, 'stage_select_ico_Blank.png'), '');
      assert.deepStrictEqual([...qt.readServed(names, path.join(d, 'jp'), path.join(d, 'b16'))].sort(), ['1_0', '3_90000', '7_120000']);
      assert.deepStrictEqual([...qt.readServed(null, null, path.join(d, 'b16'))], ['3_90000']);
      assert.strictEqual(qt.readServed(null, null, path.join(d, 'none')), null);
    } finally { fs.rmSync(d, { recursive: true, force: true }); }
  },
};

let failed = 0;
for (const [name, f] of Object.entries(tests)) {
  try { f(); console.log('ok', name); } catch (e) { failed++; console.log('FAIL', name, e.message); }
}
console.log(failed ? `${failed} of ${Object.keys(tests).length} failed` : `all ${Object.keys(tests).length} passed`);
process.exit(failed ? 1 : 0);
