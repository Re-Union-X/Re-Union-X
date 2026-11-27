// I-325: every level-up pays the Avatar Coins of the master `player` row of each level reached (luxMedal: lv 2: 5 ...
// lv 301+: 55), from a battle (addBattleLux) or a Lux item (grantItem type 11), several levels at once included. Saves of
// before the fix get the coins of the levels already reached once, in the Presents (flag player.levelCoinsPaid); a new
// player gets nothing back. node server/test-level-coins.js [master folder]
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const MASTER = path.resolve(process.argv[2] || path.join(__dirname, 'master_data'));
const mode = process.argv[3] || 'old';
const SAVE = path.join(os.tmpdir(), `khux-test-levelcoins-${mode}-${process.pid}.json`);
const rows = JSON.parse(fs.readFileSync(path.join(MASTER, 'player.json'), 'utf8'));
const lvRow = (lv) => rows.find((r) => r.lv === lv);
const coins = (a, b) => rows.filter((r) => r.lv > a && r.lv <= b).reduce((t, r) => t + (r.luxMedal || 0), 0);
// a save of before the fix at level 20, 7 Avatar Coins already owned
if (mode === 'old') {
  fs.writeFileSync(SAVE, JSON.stringify({ name: 'Test', created: true, tutorialPhase: 995, lux: lvRow(20).needExp, spherePoint: 7,
    presents: [] }));
} else try { fs.unlinkSync(SAVE); } catch { /* new player */ }
process.env.KHUX_MASTER_DIR = MASTER;
process.env.KHUX_SAVE = SAVE;
const log = console.log;
const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const p = t.player;
const back = (p.presents || []).filter((x) => x.resourceType === 14);

if (mode === 'new') {
  assert.strictEqual(back.length, 0, 'new player: no back-pay');
  assert.strictEqual(p.levelCoinsPaid, 1, 'new player: flag set');
  console.log('new player: OK');
} else {
  assert.strictEqual(back.length, 1, 'old save: one Present');
  assert.strictEqual(back[0].number, coins(1, 20), `old save: coins of lv 2..20 (${coins(1, 20)})`);
  assert.match(back[0].comment, /past level-ups/i);
  assert.strictEqual(p.spherePoint, 7, 'back-pay goes to the Presents, not straight to the balance');
  assert.strictEqual(p.levelCoinsPaid, 1);

  // battle crossing several levels: 20 -> 25
  p.spherePoint = 0;
  quiet(() => t.addBattleLux(lvRow(25).needExp - p.lux));
  assert.strictEqual(t.luxRankFor(p.lux), 25);
  assert.strictEqual(p.spherePoint, coins(20, 25), 'battle level-ups 21..25');
  // battle without a level-up: nothing
  quiet(() => t.addBattleLux(1));
  assert.strictEqual(p.spherePoint, coins(20, 25), 'no level-up, no coins');
  // Lux item (type 11): 25 -> 300 (the 50-coin levels) and 300 -> 303 (55 from 301)
  quiet(() => t.grantItem(11, 0, lvRow(300).needExp - p.lux));
  assert.strictEqual(p.spherePoint, coins(20, 300), 'Lux item level-ups 26..300');
  quiet(() => t.grantItem(11, 0, lvRow(303).needExp - p.lux));
  assert.strictEqual(p.spherePoint - coins(20, 300), 3 * 55, 'lv 301-303: 55 each');
  // a new player in a fresh process
  log(execFileSync(process.execPath, [__filename, MASTER, 'new'], { encoding: 'utf8' }).trim().split('\n').pop());
}
try { fs.unlinkSync(SAVE); } catch { /* not written */ }
console.log(`test-level-coins (${mode}): OK`);
