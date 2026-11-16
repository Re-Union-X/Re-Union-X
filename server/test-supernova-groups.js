// Supernova families (medal-boost.js supernovaRoots, server.js servedMasterRows 'medal', medal-guilt.js groups): the Supernova forms
// of a 7* medal and their copies are served with groupId = the 7* root (original master), star evolutions and Prime forms keep
// their groupId, master_data is untouched. Fixture first, then the local master (server/master_data/medal.json).
//   node server/test-supernova-groups.js
'use strict';
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const mb = require('./medal-boost');
const mg = require('./medal-guilt');
let failed = 0;
const log = console.log;
const test = (name, fn) => { try { fn(); log(`ok   ${name}`); } catch (e) { failed++; log(`FAIL ${name}\n     ${e.message}`); } };
const row = (medalId, name, rare, extra = {}) => ({ medalId, name, rare, groupId: 0, validEvolve: 0, evolveId: 0, ...extra });
// 6* -> 7* root -> Supernova -> SN+ -> SN++, a boosted copy of each SN form, a star chain 1*..6*, a Prime 7* -> Prime chain
const FIX = [
  row(41016, 'Key Art', 6, { validEvolve: 1, evolveId: 300513 }),
  row(300513, 'Key Art', 7, { validEvolve: 1, evolveId: 301797 }),
  row(301797, 'Supernova - Key Art', 7, { validEvolve: 1, evolveId: 301798 }),
  row(301798, 'Supernova+ - Key Art', 7, { validEvolve: 1, evolveId: 302088 }),
  row(302088, 'SN++ - Key Art', 7),
  row(2300513, 'Key Art', 7, { groupId: 300513 }),
  row(2302088, 'SN++ - Key Art', 7, { groupId: 302088 }),
  row(2301798, 'Supernova+ - Key Art', 7, { groupId: 301798 }),
  row(12011, 'Tidus', 1, { validEvolve: 1, evolveId: 12012 }),
  row(12012, 'Tidus', 2, { validEvolve: 1, evolveId: 12013 }),
  row(12013, 'Tidus', 3),
  row(400100, 'Prime - Hero', 6, { validEvolve: 1, evolveId: 400101 }),
  row(400101, 'Prime - Hero', 7),
  // a Prime 7* root evolving into an SN++ (original 42407 -> 342407): grouped
  row(301528, 'Prime - Riku & Mickey', 7, { validEvolve: 1, evolveId: 302096 }),
  row(302096, 'SN++ - Riku & Mickey', 7),
];
test('fixture: the SN forms and their copies get the 7* root', () => {
  const g = mb.supernovaRoots(FIX);
  for (const id of [301797, 301798, 302088, 2302088, 2301798]) assert.strictEqual(g.get(id), 300513, `${id} -> 300513`);
  assert.strictEqual(g.get(302096), 301528, 'Prime 7* root -> its SN++');
});
test('fixture: roots, star evolutions, Prime forms and copies of the root keep theirs', () => {
  const g = mb.supernovaRoots(FIX);
  for (const id of [41016, 300513, 2300513, 12011, 12012, 12013, 400100, 400101, 301528]) assert.ok(!g.has(id), `${id} not regrouped`);
});
test('fixture: dot material follows the served family', () => {
  const g = mb.supernovaRoots(FIX), by = new Map(FIX.map((r) => [r.medalId, r]));
  assert.ok(mg.isDotMaterial(by.get(302088), by.get(300513), g), 'root feeds its SN++');
  assert.ok(mg.isDotMaterial(by.get(300513), by.get(2302088), g), 'a copy of the SN++ feeds the root');
  assert.ok(!mg.isDotMaterial(by.get(302088), by.get(300513)), 'without groups: as before');
  assert.ok(!mg.isDotMaterial(by.get(12013), by.get(12012), g), 'star chain: unchanged');
});
// local master through server.js (temporary save)
const SAVE = path.join(os.tmpdir(), `khux-test-supernova-groups-${process.pid}.json`);
process.env.KHUX_SAVE = SAVE;
const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
try {
  const { _test: t } = quiet(() => require('./server'));
  const master = t.masterRows('medal'), byId = new Map(master.map((r) => [r.medalId, r]));
  const served = new Map(t.servedMasterRows('medal', Date.now()).map((r) => [r.medalId, r]));
  const g = mb.supernovaRoots(master);
  test('master: 142 Supernova families (as the original master)', () => {
    assert.strictEqual(new Set(g.values()).size, 142, `${new Set(g.values()).size} roots`);
  });
  test('master: an evolved SN++ row is served with the root groupId (Key Art #20)', () => {
    if (!byId.has(302088)) return;
    assert.strictEqual(byId.get(302088).groupId, 0, 'master_data unchanged');
    assert.strictEqual(served.get(302088).groupId, 301797, 'SN++ - Key Art #20 -> Supernova - Key Art #20 (original 553247 -> 53247)');
    assert.strictEqual(served.get(301798).groupId, 301797, 'Supernova+ -> root');
    assert.strictEqual(served.get(301797).groupId, 0, 'the root keeps 0');
  });
  test('master: a copy of an SN++ is served with the root (2302088)', () => {
    if (!byId.has(2302088)) return;
    assert.strictEqual(served.get(2302088).groupId, served.get(302088).groupId);
  });
  test('master: star evolutions keep groupId 0, copies of normals keep their normal', () => {
    for (const r of master) {
      if (g.has(r.medalId)) continue;
      assert.strictEqual(served.get(r.medalId).groupId, r.groupId, `${r.medalId} ${r.name}`);
    }
    if (byId.has(12012)) assert.strictEqual(served.get(12012).groupId, 0);
  });
  test('master: every row still served, only groupId changes', () => {
    assert.strictEqual(served.size, master.length);
    for (const r of master) { const s = { ...served.get(r.medalId), groupId: r.groupId }; assert.deepStrictEqual(s, r, `${r.medalId}`); }
  });
} finally { try { fs.unlinkSync(SAVE); } catch { /* none */ } }
log(failed ? `${failed} FAILED` : 'all ok');
process.exit(failed ? 1 : 0);
