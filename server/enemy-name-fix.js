// Enemy names of the WW data that our master got wrong (23-11, audit of the unserved event quests, private
// tmp/events/unbuilt/remaining2): rows 11020 / 11021 are «Mega-Shadow» / «Gigas Shadow» in the WW donor enemy.json
// (displayId 1020 / 1021, Mega / Gigas stats) and the only 1xxxx target rows of those names (13/13 and 15/15 target
// placements on the JP 4.3.1 maps); ours named both «Shadow», so name lookups mixed them into the Shadow targets.
// make-game-tables.js applies it before writing enemy.json; alone, idempotent, it fixes server/master_data in place:
//   node server/enemy-name-fix.js [master folder]
'use strict';
const fs = require('fs');
const path = require('path');

const ENEMY_NAME_FIX = { 11020: 'Mega-Shadow', 11021: 'Gigas Shadow' };

// -> number of rows renamed
function applyEnemyNameFix(enemies) {
  let n = 0;
  for (const e of enemies) {
    const name = ENEMY_NAME_FIX[e.enemyId];
    if (name && e.name !== name) { e.name = name; n++; }
  }
  return n;
}

if (require.main === module) {
  const file = path.join(process.argv[2] || process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data'), 'enemy.json');
  const enemies = JSON.parse(fs.readFileSync(file, 'utf8'));
  const n = applyEnemyNameFix(enemies);
  if (n) fs.writeFileSync(file, JSON.stringify(enemies));
  console.log(`enemy-name-fix: ${n} rows renamed`);
}

module.exports = { ENEMY_NAME_FIX, applyEnemyNameFix };
