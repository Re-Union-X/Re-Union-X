// Coliseum master rows (Coliseum Part 1 Task 1): node server/test-make-colosseum.js
// The fixture is a trimmed copy of the 1.1.3 rows of season 800 (WW 2016-04), decoder garbage in the array tails kept on
// purpose; `real_113` reads the 1.1.3 master when it is on disk and skips otherwise.
'use strict';
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');

const G = [1834990256, -1950354296, -108]; // decoder garbage as found in the 1.1.3 array tails
const tier = (id, round, ap, rounds, skip, cn, vR, rT, rI, rN) => ({ colosseumId: id, colosseumStageId: 800, round, ap, arrivalStageCount: rounds, rankId: ' ',
  excellentUnlockCount: skip, validStageReward: cn ? 1 : 0, stageRewardType: cn ? 17 : 0, stageRewardId: 0, stageRewardAssignType: 1, stageRewardSkillId: 0,
  stageRewardSkillLv: 1, stageRewardNum: cn, validReward: vR, rewardType: rT, rewardId: rI, rewardAssignType: [1, 1, 32, 0], rewardSkillId: [0, 0, 32, 0],
  rewardSkillLv: [1, 1, 32, 0], rewardNum: rN });
const stage = (n) => ({ stageId: 20150700 + n, id: 81000 + n, name: `sSti_${20150700 + n}`, mapName: 'Coliseum', useAp: 1, chapterId: 1, worldId: 5, thumbId: 10000,
  stageKind: 3, showIcon: 0, validBeforeDrama: 0, beforeDramaId: [1768714051, 1836410227, 0, 0, 0], beforeDramaType: [1768714051, 1836410227, 0, 0, 0],
  validAfterDrama: 0, afterDramaId: [1768714051, 0, 0, 0, 0], afterDramaType: [1768714051, 0, 0, 0, 0], validClearGetItem: 0, clearGetItemType: [1148351603, 2037214581, 0],
  clearGetItemId: [1148351603, 2037214581, 0], validSubmission: 0, submissionRequire: [1148351603, 2037214581, 0], submissionName: ['strDummy', '', ''],
  raidBoss: 0, bgmField: 501000410, bgmBattle: 501000420, bgmBoss: 501000130 });
const reward = (id, start, end, valid, type, ids, num) => {
  const tail = (a) => [...a, ...G, ...G, ...G, ...G].slice(0, 10);
  return { rankingRewardId: id, startRank: start, endRank: end, validReward: valid, type: tail(type), id: tail(ids), skillType: tail(type.map(() => 1)),
    skillId: tail(type.map(() => 0)), skillLv: tail(type.map(() => 1)), num: tail(num) };
};
const fixture = () => ({
  colosseumStage: [{ colosseumStageId: 800, openDate: '2016-04-01 07:00:00', closeDate: '2016-05-01 06:59:59', rankingCloseDate: '2016-05-01 06:59:59',
    headColosseumId: 801, termColosseumId: 806, rankingId: 4009, validStage: 10, stageId: Array.from({ length: 10 }, (_, i) => 20150701 + i), loopStageCount: 10, lvPerLoop: 10 },
  { colosseumStageId: 700, openDate: '2016-03-01 08:00:00', closeDate: '2016-04-01 06:59:59', rankingCloseDate: '2016-04-01 06:59:59', headColosseumId: 701,
    termColosseumId: 701, rankingId: 4008, validStage: 1, stageId: [20160301, ...G, ...G, ...G].slice(0, 10), loopStageCount: 10, lvPerLoop: 10 }],
  colosseum: [
    tier(801, 1, 3, 20, 18, 1, 2, [17, 3, 32, 0], [0, 90013, 32, 0], [30, 1, 0, 0]),
    tier(802, 2, 3, 15, 15, 3, 2, [17, 3, 32, 0], [0, 90015, 32, 0], [40, 1, 0, 0]),
    tier(803, 3, 4, 15, 9, 5, 2, [17, 3, 32, 0], [0, 90015, 32, 0], [50, 2, 0, 0]),
    tier(804, 4, 4, 10, 6, 7, 2, [17, 3, 32, 0], [0, 90016, 32, 0], [70, 1, 0, 0]),
    tier(805, 5, 5, 10, 3, 10, 2, [17, 3, 32, 0], [0, 90076, 32, 0], [100, 1, 0, 0]),
    tier(806, 6, 5, 999, 3, 0, 0, [32, 0, 0, 0], [32, 0, 0, 0], [0, 0, 0, 0]),
    tier(807, 7, 5, 0, 3, 0, 0, [32, 0, 0, 0], [32, 0, 0, 0], [0, 0, 0, 0]), // end marker outside head..term
    tier(701, 1, 3, 20, 18, 1, 1, [17, 0, 0, 0], [0, 0, 0, 0], [30, 0, 0, 0]),
  ].map((r) => (r.colosseumId === 701 ? { ...r, colosseumStageId: 700 } : r)),
  stage: [...Array.from({ length: 10 }, (_, i) => stage(i + 1)), { ...stage(0), stageId: 92000, id: 90515 }],
  ranking: [{ rankingId: 4009, category: 4, startDatetime: '2016-04-01 07:00:00', endDatetime: '2016-05-01 06:59:59', startRank: 30100, endRank: 30103,
    unionStartRank: [1, 1, 1, 1, 1], unionEndRank: [1, 1, 1, 1, 1], validReward: 1 }],
  rankingReward: [
    reward(30100, 1, 1000, 2, [3, 3], [90125, 90016], [3, 3]),
    reward(30101, 1001, 10000, 2, [3, 3], [90125, 90016], [2, 2]),
    reward(30102, 10001, 50000, 2, [3, 3], [90125, 90016], [1, 1]),
    reward(30103, 50001, 300000, 1, [3], [90016], [1]),
    reward(30800, 1, 5000000, 1, [3], [90015], [1]),
  ],
  sphere: [{ sphereBoardId: 2200001, boardName: '6★ Cid', kindId: 0, boardId: 3, arryId: 3200001, masuId: 4200001, type: 3, openId: 3, openParam: 0, price: 0,
    startDatetime: '2016-04-01 07:00:00', endDatetime: '2016-05-01 06:59:59' },
  { sphereBoardId: 2100001, boardName: 'Other', kindId: 0, boardId: 2, arryId: 3100001, masuId: 4100001, type: 2, openId: 3, openParam: 0, price: 0,
    startDatetime: '2016-04-01 07:00:00', endDatetime: '2016-05-01 06:59:59' }],
  sphereArray: [{ arryId: 3200001, spCol4: [1000, 1003, 19, 1002, 20, 0, 21, 0, 22], spCol3: [0, 2001, 1001, 0, 0, 0, 1001, 0, 1001], spCol2: [0, 1006, 10, 1002, 11, 1002, 12, 1002, 13],
    spCol1: [0, 0, 1001, 0, 0, 0, 1001, 0, 1001], spCol0: [0, 0, 2, 1002, 3, 0, 4, 0, 5] }],
  sphereMasu: [{ masuId: 4200001, sphereBoardId: 2200001, spherePoint: [0, 30, 30, 40, 40, 0, 0, 0, 0, 20, 60, 200, 40, 0, 0, 0, 0, 0, 30, 30, 40, 40, 10],
    rewardSelect: [0, 3, 3, 3, 3, 0, 0, 0, 0, 3, 3, 3, 3, 0, 0, 0, 0, 0, 3, 3, 3, 3, 7], medalCategory: Array(23).fill(0),
    rewardId: [0, 90035, 90125, 90036, 90055, 0, 0, 0, 0, 90025, 90076, 90076, 90026, 0, 0, 0, 0, 0, 90045, 90125, 90046, 90065, 17001],
    rewardExpand: [0, 1, 3, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 3, 1, 1, 0], rewardExpandId: Array(23).fill(0), rewardValue: Array(23).fill(0) }],
  enemy: [
    { enemyId: 20031, name: 'Bag O\' Coins', validGrowth: 2, baseLv: [1, 999, ...G].slice(0, 6), hp: [10, 20, ...G].slice(0, 6), validSkill: 1, skillId: [100, ...G].slice(0, 4) },
    { enemyId: 29999, name: 'New Coliseum Foe', validGrowth: 2, baseLv: [1, 999, ...G].slice(0, 6), hp: [10, 20, ...G].slice(0, 6), validSkill: 1, skillId: [100, ...G].slice(0, 4) },
    { enemyId: 1001, name: 'Story Shadow', validGrowth: 1, baseLv: [1, 0, 0, 0, 0, 0], hp: [1, 0, 0, 0, 0, 0] },
  ],
  masterEnemyIds: [20001, 20031],
});

const results = [];
function test(name, fn) {
  try { fn(); results.push(`ok   ${name}`); } catch (e) { results.push(`FAIL ${name}: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); process.exitCode = 1; }
}

let mc;
test('module loads', () => { mc = require('./make-colosseum'); });
if (!mc) { console.log(results.join('\n')); process.exit(1); }
const S800 = [mc.SEASONS[0]];

test('SEASONS and SEASON_BOARDS', () => {
  assert.deepStrictEqual(mc.SEASONS.map((s) => [s.month, s.colosseumStageId]), [['2016-04', 800], ['2016-05', 900], ['2016-06', 1000], ['2016-07', 1100]]);
  assert.deepStrictEqual(mc.SEASON_BOARDS[800], [2200001]);
  for (const s of mc.SEASONS) assert.ok(mc.SEASON_BOARDS[s.colosseumStageId].length >= 1, `boards of ${s.colosseumStageId}`);
  for (const [t, [, lo, hi]] of Object.entries(mc.RANGES)) assert.ok(lo <= hi, t);
});

test('colosseumStage row 800', () => {
  const out = mc.seasonRows(fixture(), S800);
  assert.strictEqual(out.colosseumStage.length, 1);
  const cs = out.colosseumStage[0];
  assert.strictEqual(cs.colosseumStageId, 800);
  assert.strictEqual(cs.stageId.length, 10);
  assert.deepStrictEqual(cs.stageId, Array.from({ length: 10 }, (_, i) => 20150701 + i));
  assert.strictEqual(cs.rankingId, 4009);
  assert.strictEqual(cs.loopStageCount, 10); assert.strictEqual(cs.lvPerLoop, 10);
  for (const k of ['openDate', 'closeDate', 'rankingCloseDate']) assert.match(cs[k], /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/, k);
  assert.ok(cs.closeDate > '2026', 'closeDate after the served clock');
  const ids = out.colosseum.map((r) => r.colosseumId);
  assert.deepStrictEqual(ids, [801, 802, 803, 804, 805, 806], 'tier rows = head..term (the end marker 807 left out)');
  assert.ok(ids.every((id) => id >= cs.headColosseumId && id <= cs.termColosseumId));
  assert.deepStrictEqual(out.colosseum.map((r) => r.round), [1, 2, 3, 4, 5, 6]);
});

test('tier reward arrays truncated to the valid counts', () => {
  const out = mc.seasonRows(fixture(), S800);
  for (const r of out.colosseum) {
    for (const k of ['rewardType', 'rewardId', 'rewardAssignType', 'rewardSkillId', 'rewardSkillLv', 'rewardNum']) {
      assert.strictEqual(r[k].length, 4, `${r.colosseumId} ${k} length`);
      assert.ok(r[k].slice(r.validReward).every((v) => v === 0), `${r.colosseumId} ${k} tail ${r[k]}`);
    }
    if (!r.validStageReward) for (const k of ['stageRewardType', 'stageRewardId', 'stageRewardAssignType', 'stageRewardSkillId', 'stageRewardSkillLv', 'stageRewardNum']) assert.strictEqual(r[k], 0, `${r.colosseumId} ${k}`);
  }
  const t1 = out.colosseum[0];
  assert.deepStrictEqual([t1.rewardType, t1.rewardId, t1.rewardNum], [[17, 3, 0, 0], [0, 90013, 0, 0], [30, 1, 0, 0]]);
  assert.deepStrictEqual([t1.stageRewardType, t1.stageRewardNum, t1.excellentUnlockCount, t1.ap, t1.arrivalStageCount], [17, 1, 18, 3, 20]);
  assert.deepStrictEqual(out.colosseum[5].rewardType, [0, 0, 0, 0], 'endless tier: no tier reward');
});

test('stage rows', () => {
  const out = mc.seasonRows(fixture(), S800);
  assert.strictEqual(out.stage.length, 10);
  assert.deepStrictEqual(out.stage.map((r) => r.stageId), Array.from({ length: 10 }, (_, i) => 20150701 + i));
  for (const r of out.stage) {
    assert.strictEqual(r.stageKind, 3); assert.strictEqual(r.worldId, 5); assert.strictEqual(r.mapName, 'Coliseum');
    assert.ok(r.id >= mc.RANGES.stage[1] && r.id <= mc.RANGES.stage[2], `id ${r.id}`);
    assert.ok(r.beforeDramaId.every((v) => v === 0) && r.clearGetItemType.every((v) => v === 0) && r.submissionRequire.every((v) => v === 0), 'garbage tails zeroed');
    assert.deepStrictEqual(r.submissionName, ['', '', '']);
  }
});

test('enemy rows never duplicate the master', () => {
  const out = mc.seasonRows(fixture(), S800);
  assert.deepStrictEqual(out.enemy.map((r) => r.enemyId), [29999], 'only the Coliseum id missing from the master');
  const e = out.enemy[0];
  assert.deepStrictEqual(e.baseLv.slice(0, 2), [1, 999]);
  assert.ok(e.baseLv.slice(2).every((v) => v === 0) && e.hp.slice(2).every((v) => v === 0) && e.skillId.slice(1).every((v) => v === 0), 'tails zeroed');
  const none = mc.seasonRows({ ...fixture(), masterEnemyIds: [20001, 20031, 29999] }, S800);
  assert.strictEqual(none.enemy.length, 0);
});

test('ranking and rankingReward', () => {
  const out = mc.seasonRows(fixture(), S800);
  assert.strictEqual(out.ranking.length, 1);
  const rk = out.ranking[0];
  assert.deepStrictEqual([rk.rankingId, rk.category, rk.startRank, rk.endRank], [4009, 4, 30100, 30103]);
  assert.deepStrictEqual(out.rankingReward.map((r) => r.rankingRewardId), [30100, 30101, 30102, 30103]);
  for (const r of out.rankingReward) {
    for (const k of ['type', 'id', 'skillType', 'skillId', 'skillLv', 'burstUpperNumber', 'num']) {
      assert.strictEqual(r[k].length, 10, k);
      assert.ok(r[k].slice(r.validReward).every((v) => v === 0), `${r.rankingRewardId} ${k} tail`);
    }
  }
  const t = out.ranked[800];
  assert.strictEqual(t.thresholds.length, t.brackets.length);
  assert.deepStrictEqual(t.brackets.map((b) => b.startRank), [50001, 10001, 1001, 1], 'lowest bracket first');
  t.thresholds.forEach((x, i) => {
    assert.strictEqual(x.startRank, t.brackets[i].startRank); assert.strictEqual(x.label, 'interpolated');
    assert.ok(Number.isInteger(x.score) && x.score >= 1, `score ${x.score}`);
    if (i) assert.ok(x.score >= t.thresholds[i - 1].score, 'thresholds never go down');
  });
  assert.deepStrictEqual(t.brackets[3].rewards, [{ type: 3, id: 90125, num: 3, skillType: 1, skillId: 0, skillLv: 1 }, { type: 3, id: 90016, num: 3, skillType: 1, skillId: 0, skillLv: 1 }]);
});

test('threshold curve', () => {
  // anchors of the curve: rank 10 = global round 257, rank 38,080 = 110 in a 110-round season (WW 2016-08 footage)
  assert.strictEqual(mc.cutoffRound(10, 110), 257);
  assert.strictEqual(mc.cutoffRound(38080, 110), 110);
  assert.strictEqual(mc.cutoffRound(1000, 110), 175);
  assert.strictEqual(mc.cutoffRound(1000, 70), 135, 'shifted by the finite rounds of the season');
  assert.strictEqual(mc.cutoffRound(1e9, 110), 1, 'never below one cleared round');
  assert.deepStrictEqual(mc.thresholdsOf([{ startRank: 5000001, endRank: 10000000 }, { startRank: 1, endRank: 5000000 }], 110).map((x) => x.score), [1, 1],
    'a bracket open to every ranked player needs one cleared round');
  assert.deepStrictEqual(mc.seasonRows(fixture(), S800).ranked[800].thresholds.map((x) => x.score), [33, 65, 94, 135]);
});

test('boards type 3, ids renumbered into our range', () => {
  const out = mc.seasonRows(fixture(), S800);
  assert.deepStrictEqual(out.sphere.map((r) => r.sphereBoardId), [2200001]);
  const s = out.sphere[0];
  assert.strictEqual(s.type, 3); assert.strictEqual(s.boardName, '6★ Cid');
  assert.strictEqual(s.arryId, 2200001); assert.strictEqual(s.masuId, 2200001);
  assert.strictEqual(s.detailUrl, '');
  assert.deepStrictEqual(out.sphereArray.map((r) => r.arryId), [2200001]);
  assert.deepStrictEqual(out.sphereArray[0].spCol4, [1000, 1003, 19, 1002, 20, 0, 21, 0, 22]);
  const m = out.sphereMasu[0];
  assert.deepStrictEqual([m.masuId, m.sphereBoardId], [2200001, 2200001]);
  assert.strictEqual(m.spherePoint.reduce((a, b) => a + b, 0), 610);
  assert.deepStrictEqual(m.burstUpperNumber, Array(23).fill(0));
});

test('a board of another month stops the run', () => {
  const f = fixture();
  f.sphere[0].startDatetime = '2016-05-01 07:00:00';
  assert.throws(() => mc.seasonRows(f, S800), /2200001/);
});

test('patch is idempotent and keeps foreign rows', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-colosseum-'));
  try {
    const w = (t, rows) => fs.writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(rows));
    w('colosseum', []); w('colosseumStage', []);
    w('stage', [{ stageId: 1010, id: 1, stageKind: 1, worldId: 1, mapName: 'Fountain Square' }]);
    w('enemy', [{ enemyId: 20001 }, { enemyId: 20031 }]);
    w('ranking', [{ rankingId: 10930, category: 6 }]);
    w('rankingReward', [{ rankingRewardId: 8293000 }]);
    w('sphere', [{ sphereBoardId: 3000001, type: 5 }]); w('sphereArray', [{ arryId: 3000001 }]); w('sphereMasu', [{ masuId: 3000001 }]);
    const src = fixture(); delete src.masterEnemyIds;
    mc.patch(dir, { src, seasons: S800 });
    const read = () => Object.fromEntries(fs.readdirSync(dir).map((f) => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
    const first = read();
    mc.patch(dir, { src, seasons: S800 });
    assert.deepStrictEqual(read(), first, 'second run writes the same files');
    const J = (t) => JSON.parse(first[`${t}.json`]);
    assert.strictEqual(J('colosseumStage').length, 1); assert.strictEqual(J('colosseum').length, 6);
    assert.deepStrictEqual(J('stage').map((r) => r.stageId).slice(0, 2), [1010, 20150701]);
    assert.deepStrictEqual(J('enemy').map((r) => r.enemyId), [20001, 20031, 29999]);
    assert.deepStrictEqual(J('ranking').map((r) => r.rankingId), [10930, 4009]);
    assert.deepStrictEqual(J('sphere').map((r) => r.sphereBoardId), [3000001, 2200001]);
    assert.deepStrictEqual(J('sphereMasu').map((r) => r.masuId), [3000001, 2200001]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// Coliseum Catalog banner (Task 6): evStage 6000, eventType 0, Details -> /web/colosseum/catalog, a tap opens the Training Grounds
// (stage 970000 of make-special, as the Raid and Event Catalog banners); none without that stage
test('Coliseum Catalog banner row (evStage 6000)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-colosseum-'));
  try {
    const w = (t, rows) => fs.writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(rows));
    const J = (t) => JSON.parse(fs.readFileSync(path.join(dir, `${t}.json`), 'utf8'));
    w('stage', [{ stageId: 1010, id: 1, stageKind: 1 }]);
    w('evStage', [{ eventStageId: 6000, stale: true }, { eventStageId: 8000, eventType: 0 }]);
    const src = fixture(); delete src.masterEnemyIds;
    mc.patch(dir, { src, seasons: S800 });
    assert.deepStrictEqual(J('evStage').map((r) => r.eventStageId), [8000], 'no Training Grounds stage: no banner, the old row dropped');
    w('stage', [{ stageId: 970000, id: 9001, stageKind: 1, useAp: 0 }]);
    mc.patch(dir, { src, seasons: S800 });
    const first = fs.readFileSync(path.join(dir, 'evStage.json'), 'utf8');
    mc.patch(dir, { src, seasons: S800 });
    assert.strictEqual(fs.readFileSync(path.join(dir, 'evStage.json'), 'utf8'), first, 'idempotent');
    const ev = J('evStage');
    assert.deepStrictEqual(ev.map((r) => r.eventStageId), [8000, mc.CATALOG_EV]);
    assert.strictEqual(mc.CATALOG_EV, 6000);
    const r = ev[1];
    assert.strictEqual(r.eventType, 0);
    assert.strictEqual(r.eventCategory, 2);
    assert.strictEqual(r.detailUrl, '/web/colosseum/catalog');
    assert.deepStrictEqual([r.validStageId, r.stageId, r.stageStartId, r.stageEndId], [1, [970000], 970000, 970000]);
    assert.strictEqual(r.bannerUrl, `/web/colosseum/img/v${require('./routes-colosseum').COLOSSEUM_IMG_VERSION}/6000.png`);
    assert.strictEqual(r.endTime, mc.END);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a foreign row inside our ranges stops the run', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-colosseum-'));
  try {
    fs.writeFileSync(path.join(dir, 'stage.json'), JSON.stringify([{ stageId: 99, id: 81005, stageKind: 1 }]));
    assert.throws(() => mc.patch(dir, { src: fixture(), seasons: S800 }), /81005/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('real_113 (the four seasons from the 1.1.3 master)', () => {
  const src = mc.readSource(mc.DEFAULT_2016, null);
  if (!src) { results.push('skip real_113: 1.1.3 master not on disk'); return; }
  src.masterEnemyIds = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemy.json'), 'utf8')).map((r) => r.enemyId);
  const out = mc.seasonRows(src);
  assert.deepStrictEqual(out.colosseumStage.map((r) => r.colosseumStageId), [800, 900, 1000, 1100]);
  assert.deepStrictEqual(out.colosseum.length, 6 + 10 + 10 + 10);
  assert.strictEqual(out.stage.length, 40);
  assert.strictEqual(new Set(out.stage.map((r) => r.id)).size, 40);
  assert.deepStrictEqual(out.ranking.map((r) => r.rankingId), [4009, 4010, 4011, 4012]);
  assert.deepStrictEqual(out.rankingReward.length, 4 + 2 + 8 + 8);
  assert.deepStrictEqual(out.sphere.map((r) => r.sphereBoardId), Object.values(mc.SEASON_BOARDS).flat().sort((a, b) => a - b));
  assert.strictEqual(out.enemy.length, 0, 'the 111 Coliseum enemy rows are already in our master');
  for (const s of mc.SEASONS) {
    const t = out.ranked[s.colosseumStageId];
    assert.ok(t.thresholds.length >= 1 && t.thresholds.length === t.brackets.length);
    t.thresholds.forEach((x, i) => { if (i) assert.ok(x.score >= t.thresholds[i - 1].score); });
  }
  assert.deepStrictEqual(out.ranked[1000].thresholds.map((x) => x.score), [64, 76, 93, 105, 134, 159, 175, 216]);
  assert.deepStrictEqual(out.ranked[900].thresholds.map((x) => x.score), [1, 1]);
});

console.log(results.join('\n'));
if (process.exitCode) console.log('test-make-colosseum: FAIL'); else console.log('test-make-colosseum: OK');
