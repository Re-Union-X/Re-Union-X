// Prize boxes with medals (I-283, tester 16-11: «all prize boxes contain Special Attack gauge prizes rather than their intended
// prizes, usually free 1-3 star medals»). The original reward rows of the story chests (2021 live master, ReLux extract, e.g. 120: 1★ medal
// 90011 always, 90021 at 64.75%, Moogle 3★ at 15%; the 1.1.3 master had a Mythril Stone there) are served with their medals and odds (make-game-tables.js); /stage/start
// rolls the positions like the enemy drops and /stage/clear pays the medals of the chests the client reports in getTreasures.
//   node server/test-chest-medals.js
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const SAVE = path.join(os.tmpdir(), `khux-test-chest-medals-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* new */ }
process.env.KHUX_SAVE = SAVE;
const log = console.log; const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const errors = []; const check = (ok, msg) => { if (!ok) errors.push(msg); };
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };

// 1. master: the original chest rows with medals keep them, with the original odds
const reward = new Map(t.masterRows('reward').map((r) => [r.rewardId, r]));
const r120 = reward.get(120);
check(r120 && JSON.stringify(r120.type.slice(0, 3)) === '[3,3,3]' && JSON.stringify(r120.id.slice(0, 3)) === '[90011,90021,90013]'
  && JSON.stringify(r120.odds.slice(0, 3)) === '[10000,6475,1500]', `reward 120: ${JSON.stringify(r120 && [r120.type, r120.id, r120.odds])}`);
const poi = require('./game_data/stage_poi.json');
const chestIds = new Set(Object.values(poi).flatMap((p) => (p.chests || []).map((c) => c.reward)));
const withMedals = [...chestIds].filter((id) => (reward.get(id)?.type || []).includes(3));
check(withMedals.length >= 150, `chest rows with medals: ${withMedals.length}`);

// 1b. enemies (user 22-11): the original drop rows of the story enemies with their medals, odds and display (10110: four medals)
const r10110 = reward.get(10110);
check(r10110 && JSON.stringify(r10110.type.slice(0, 4)) === '[3,3,3,3]' && JSON.stringify(r10110.id.slice(0, 4)) === '[12022,13021,11031,12031]'
  && JSON.stringify(r10110.odds.slice(0, 4)) === '[150,320,310,300]', `reward 10110: ${JSON.stringify(r10110 && [r10110.type, r10110.id, r10110.odds])}`);
const enemyIds = new Set(Object.values(poi).flatMap((p) => (p.enemies || []).map((e) => e.reward)));
const origEnemy = [...enemyIds].filter((id) => (reward.get(id)?.type || []).includes(3));
check(origEnemy.length >= 400, `enemy rows with medals: ${origEnemy.length}`);
// the 2021 live master (ReLux extract) replaced the Mythril prizes of the story with Moogle/Louie medals: none is left
const mythril = [...enemyIds, ...chestIds].filter((id) => { const r = reward.get(id); return r && r.type.some((ty, i) => ty === 5 && [3, 5, 7].includes(r.id[i])); });
check(mythril.length === 0, `Mythril still dropped by rows `);

// 2. /stage/start: the chest of stage 1050 (uid 3, row 120) lists the medal positions, rolled (position 1 always, 2 by its odds)
call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
const p = t.player;
const before = () => t.userMedalList().filter((m) => m.medalId === 90011 || m.medalId === 90021).length;
const start = (rng) => { p.currentStageId = 1050; return t.stageTreasures(1050, rng); };
const lucky = start(() => 0);
const box = lucky.find((x) => x.uniqueTreasureId === 3);
check(box && JSON.stringify(box.dropItemTypeIds) === '[3,3,3]', `stage 1050 chest 3, every roll won: ${JSON.stringify(box)}`);
const unlucky = start(() => 0.99).find((x) => x.uniqueTreasureId === 3);
check(unlucky && JSON.stringify(unlucky.dropItemTypeIds) === '[3]', `stage 1050 chest 3, rolls lost: ${JSON.stringify(unlucky)}`);

// 3. /stage/clear pays the medals of the opened chests (getTreasures), as rolled at /stage/start; nothing for an unopened chest
const clear = (treasures) => call(t.respondStageClear, { getPoint: { exp: 0, money: 0, lux: 0 }, getTreasures: treasures, getEnemyDropItems: [], clearMissionIds: [], burst: 0 });
p.currentStageId = 1050; p.stageInProgress = true; quiet(() => t.startTreasures({ stageId: 1050 }, () => 0));
let n0 = before(); clear([3]);
check(before() === n0 + 2, `opened chest (both rolls won): medals ${n0} -> ${before()}`);
p.currentStageId = 1050; p.stageInProgress = true; quiet(() => t.startTreasures({ stageId: 1050 }, () => 0.99));
n0 = before(); clear([3]);
check(before() === n0 + 1, `opened chest (second roll lost): medals ${n0} -> ${before()}`);
p.currentStageId = 1050; p.stageInProgress = true; quiet(() => t.startTreasures({ stageId: 1050 }, () => 0));
n0 = before(); clear([]);
check(before() === n0, `unopened chest paid: ${n0} -> ${before()}`);
// a clear with no /stage/start of this stage (rolls gone) pays no chest
n0 = before(); clear([3]);
check(before() === n0, `chest paid twice: ${n0} -> ${before()}`);

try { fs.unlinkSync(SAVE); } catch { /* gone */ }
if (errors.length) { console.error(`test-chest-medals: ${errors.length} errors\n  ${errors.join('\n  ')}`); process.exit(1); }
console.log('test-chest-medals: OK');
