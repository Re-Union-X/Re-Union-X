// Enemy name fix (I-remaining2, 23-11): node server/test-enemy-name-fix.js
// Rows 11020 / 11021 are «Mega-Shadow» / «Gigas Shadow» in the WW data (displayId 1020 / 1021), not «Shadow»; 184 / 20184 «Enraged Elk», not the code sEnm_0157; every other row
// unchanged; idempotent.
'use strict';
const assert = require('assert');
const { applyEnemyNameFix, ENEMY_NAME_FIX } = require('./enemy-name-fix');
const rows = [{ enemyId: 11020, name: 'Shadow' }, { enemyId: 11021, name: 'Shadow' }, { enemyId: 10001, name: 'Shadow' }, { enemyId: 1020, name: 'Mega-Shadow' }];
assert.strictEqual(applyEnemyNameFix(rows), 2);
assert.deepStrictEqual(rows.map((r) => r.name), ['Mega-Shadow', 'Gigas Shadow', 'Shadow', 'Mega-Shadow']);
assert.strictEqual(applyEnemyNameFix(rows), 0, 'idempotent');
assert.deepStrictEqual(Object.keys(ENEMY_NAME_FIX).map(Number), [184, 11020, 11021, 20184]);
const elk = [{ enemyId: 184, name: 'sEnm_0157' }, { enemyId: 20184, name: 'sEnm_0157' }, { enemyId: 10184, name: 'Enraged Elk' }];
assert.strictEqual(applyEnemyNameFix(elk), 2);
assert.ok(elk.every((r) => r.name === 'Enraged Elk'), 'Enraged Elk rows');
// the served master carries the fix (make-game-tables applies it)
const fs = require('fs'), path = require('path');
const f = path.join(__dirname, 'master_data', 'enemy.json');
if (fs.existsSync(f)) {
  const m = new Map(JSON.parse(fs.readFileSync(f, 'utf8')).map((r) => [r.enemyId, r.name]));
  assert.ok(!m.has(11020) || m.get(11020) === 'Mega-Shadow', `master 11020: ${m.get(11020)}`);
  assert.ok(!m.has(11021) || m.get(11021) === 'Gigas Shadow', `master 11021: ${m.get(11021)}`);
  for (const id of [184, 20184]) assert.ok(!m.has(id) || m.get(id) === 'Enraged Elk', `master ${id}: ${m.get(id)}`);
}
console.log('test-enemy-name-fix: OK');
