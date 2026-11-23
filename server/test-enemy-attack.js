// Attacchi originali dei nemici (enemy-attack-fix.js): node server/test-enemy-attack.js
'use strict';
const fs = require('fs'); const path = require('path');
const fix = require('./enemy-attack-fix');
const errors = []; const check = (ok, msg) => { if (!ok) errors.push(msg); };
const atts = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemyAttack.json'), 'utf8'));
// ogni attacco citato dai nemici esiste, anche i contrattacchi (urgencySkillId: 1501001 del Gold Tricholoma, I-207)
const enemies = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemy.json'), 'utf8'));
const haveAtt = new Set(atts.map((a) => a.enemyAttackId));
const dangling = [...new Set(enemies.flatMap((e) => [...(e.skillId || []), ...(e.urgencySkillId || [])]).filter((s) => s && !haveAtt.has(s)))];
check(dangling.length === 0, `attacchi citati ma assenti: ${dangling.slice(0, 5)} (${dangling.length})`);
// unita': addMissing copia il modello per posizione (1, 101, 601) e i contrattacchi da 601; idempotente
const tpl = [1, 101, 601].map((id) => ({ enemyAttackId: id, name: `t${id}`, power: id }));
const mini = JSON.parse(JSON.stringify(tpl));
const added = fix.addMissing(mini, [{ skillId: [1, 7, 8, 9], urgencySkillId: [5] }]);
check(added === 4 && mini.find((a) => a.enemyAttackId === 7)?.power === 101 && mini.find((a) => a.enemyAttackId === 5)?.power === 601,
  `addMissing: ${added} ${JSON.stringify(mini.slice(3))}`);
check(fix.addMissing(mini, [{ skillId: [1, 7, 8, 9], urgencySkillId: [5] }]) === 0, 'addMissing non idempotente');
const served = fix.servedHitEffects();
const again = fix.applyEnemyAttacks(atts, fix.readOrig(undefined, [...require('./make-event-enemies').attackRows(), ...require('./enemy-motion-fix').attackRows(require('./enemy-motion-fix').readOriginalMoves())]), served, require('./enemy-motion-fix').motionOkAttacks(enemies, require('./enemy-motion-fix').readOriginalMoves()));
check(again.patched === 0, `master non corretto o non idempotente: ${JSON.stringify(again)}`);
// stati alterati come l'originale (Poison Apple «High Chance of Poison»)
const byId = new Map(atts.map((a) => [a.enemyAttackId, a]));
check(byId.get(9301)?.poison === 10000, `9301 poison ${byId.get(9301)?.poison}`);
// the 39 are the status attacks of the story rows (thethiny): event rows (make-event-enemies.js, Events Parts 1-10) bring
// their own WW attacks, and the donor moves of enemy-motion-fix.js (I-261: Dual Durandal 271020/271030) are original
// rows outside that set; both are checked by applyEnemyAttacks above
const evIds = require('./make-event-enemies').eventIds();
const donorAtt = new Set(Object.keys(require('./enemy-motion-fix').readOriginalMoves()?.attacks || {}).map(Number));
const storyCited = new Set(enemies.filter((e) => !evIds.has(e.enemyId)).flatMap((e) => [...(e.skillId || []), ...(e.urgencySkillId || [])]));
const storyStatus = atts.filter((a) => storyCited.has(a.enemyAttackId) && !donorAtt.has(a.enemyAttackId)
  && !(a.enemyAttackId >= 992070000 && a.enemyAttackId < 992080000) && (a.poison || a.deepPoison || a.sleep || a.paralysis));
check(storyStatus.length === 39, `attacchi originali con stato ${storyStatus.length} != 39 (le righe 9920700xx delle mosse a 0, gli eventi e le mosse donate a parte)`);
// solo risorse servite: effetto di colpo servito, animazione atk1_o o atkSp
const badHit = atts.filter((a) => !served.has(a.hitEffect)).map((a) => `${a.enemyAttackId}:${a.hitEffect}`);
check(badHit.length === 0, `hitEffect non serviti: ${badHit.slice(0, 5).join(', ')} (${badHit.length})`);
// motion >= 3 only where every citing enemy has its atk<N>_o served (enemy-motion-fix.js motionOkAttacks: 1651030 atk3_o)
const motion = require('./enemy-motion-fix');
const motionOk = motion.motionOkAttacks(enemies, motion.readOriginalMoves());
const badMotion = atts.filter((a) => ![1, 2].includes(a.attackMotion) && !motionOk.has(a.enemyAttackId)).map((a) => a.enemyAttackId);
check(badMotion.length === 0, `attackMotion oltre 2 senza animazione servita: ${badMotion.slice(0, 5)}`);
if (errors.length) { console.log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: enemy attack');
