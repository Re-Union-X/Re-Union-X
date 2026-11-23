// Chance spawns (plan 2026-11-23-chance-spawns-materials, Task 1): node server/test-random-enemies.js
// /stage/start sends userRandomEnemies [{uniqueSymbolEnemyId}] = the squads the client REMOVES (client RE 23-11): each uid of
// the stage POI «random» list is removed with probability 1/2, the target squad never; no list -> [].
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const SAVE = path.join(os.tmpdir(), `khux-test-random-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* new */ }
process.env.KHUX_SAVE = SAVE;
delete process.env.KHUX_REAL_NOW; delete process.env.KHUX_SERVER_TIME;
const log = console.log;
const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };
const P = t.STAGE_POI;

check(typeof t.stageRandomEnemies === 'function', 'stageRandomEnemies is not a function');
if (typeof t.stageRandomEnemies === 'function') {
  P[990001] = { chests: [], enemies: [], random: [3, 7], target: 9 };
  let r = t.stageRandomEnemies(990001, seq(0.2, 0.8));
  check(JSON.stringify(r) === '[{"uniqueSymbolEnemyId":3}]', `random_rolls_half: ${JSON.stringify(r)}`);
  P[990002] = { chests: [], enemies: [], random: [9], target: 9 };
  r = t.stageRandomEnemies(990002, () => 0);
  check(JSON.stringify(r) === '[]', `random_never_target: ${JSON.stringify(r)}`);
  P[990003] = { chests: [], enemies: [] };
  check(JSON.stringify(t.stageRandomEnemies(990003, () => 0)) === '[]', 'random_absent_empty: POI without random');
  check(JSON.stringify(t.stageRandomEnemies(990004, () => 0)) === '[]', 'random_absent_empty: no POI');
  // Review Focus 2: a POI with random but no enemies list
  P[990005] = { random: [4] };
  check(JSON.stringify(t.stageRandomEnemies(990005, () => 0.9)) === '[]', 'random without enemies list');
}

// stage_start_sends_list
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };
call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
P[1010] = Object.assign({}, P[1010], { random: [5] });
const mr = Math.random;
Math.random = () => 0;
let r;
try { r = call(t.respondStageStart, { stageId: 1010, supportUserId: 0, userKeybladeId: 1 }); } finally { Math.random = mr; }
check(JSON.stringify(r.userRandomEnemies) === '[{"uniqueSymbolEnemyId":5}]', `stage_start_sends_list: ${JSON.stringify(r.userRandomEnemies)}`);
delete P[1010].random;
r = call(t.respondStageStart, { stageId: 1010, supportUserId: 0, userKeybladeId: 1 });
check(JSON.stringify(r.userRandomEnemies) === '[]', 'a stage without random sends []');

try { fs.unlinkSync(SAVE); } catch { /* gone */ }
if (errors.length) { console.log(`FAIL ${errors.length}\n- ${errors.join('\n- ')}`); process.exit(1); }
console.log('OK test-random-enemies');
