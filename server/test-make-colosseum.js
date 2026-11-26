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
  assert.deepStrictEqual(mc.SEASONS.map((s) => [s.month, s.colosseumStageId, s.source, !!s.genStages]), [
    ['2016-04', 800, '113', false], ['2016-05', 900, '113', false], ['2016-06', 1000, '113', false], ['2016-07', 1100, '113', false],
    ['2016-08', 1200, '113', true], ['2016-09', 1300, '113', true], ['2016-10', 1400, '113', true], ['2016-11', 1500, 'relux', true],
    ['2016-12', 1600, 'relux', false], ['2017-01', 1700, 'relux', false], ['2017-02', 1800, 'relux', false], ['2017-03', 1900, 'relux', false],
    ['2017-04', 2000, 'relux', false]]);
  assert.deepStrictEqual(mc.SEASON_BOARDS[800], [2200001]);
  for (const s of mc.SEASONS) assert.ok(mc.SEASON_BOARDS[s.colosseumStageId].length >= 1, `boards of ${s.colosseumStageId}`);
  for (const [t, [, lo, hi]] of Object.entries(mc.RANGES)) assert.ok(lo <= hi, t);
});

// Coliseum Part 2 Task 4: the boards of the nine seasons = the khuxwiki board list of each month (private BOARD_IMAGES.md, month
// column: avatar M/F + Tier 10 Bonus; from 2017-02 also the Tier 11 Bonus)
const WIKI_BOARDS = {
  1200: [2210037, 2210038, 2210039], // Summer Mickey, Summer Minnie, Tier 10 Bonus (2016-08)
  1300: [2210040, 2210041, 2210042], // Mushroom Hunt M/F, Tier 10 Bonus
  1400: [2210043, 2210044, 2210045], // Vampire M/F, Tier 10 Bonus
  1500: [2210046, 2210047, 2210048], // Timothy Mouse M/F, Tier 10 Bonus
  1600: [2210049, 2210050, 2210051], // Pegasus Knight M/F, Tier 10 Bonus
  1700: [2210052, 2210053, 2210054], // Armored Terra, Armored Aqua, Tier 10 Bonus
  1800: [2210055, 2210056, 2210057, 2210058], // Cowboy Goth, Cowgirl Goth, Tier 10 Bonus, Tier 11 Bonus
  1900: [2210059, 2210060, 2210061, 2210062], // Royal Knight M/F, Tier 10 Bonus, Tier 11 Bonus
  2000: [2210063, 2210064, 2210065, 2210066], // Ninja, Kunoichi, Tier 10 Bonus, Tier 11 Bonus (2017-04)
};
const TIER11 = [2210058, 2210062, 2210066];
test('each new season lists exactly its wiki boards; every bonus board has its tier', () => {
  for (const [id, ids] of Object.entries(WIKI_BOARDS)) assert.deepStrictEqual(mc.SEASON_BOARDS[id], ids, `boards of ${id}`);
  const all = Object.values(mc.SEASON_BOARDS).flat();
  assert.strictEqual(new Set(all).size, all.length, 'a board in one season only');
  const bonus = {};
  for (const ids of Object.values(WIKI_BOARDS)) for (const b of ids.slice(2)) bonus[b] = TIER11.includes(b) ? 11 : 10;
  assert.deepStrictEqual(mc.BONUS_TIER, { 2200023: 10, 2210031: 10, 2210035: 10, ...bonus });
});

test('GEN_STAGE_IDS: 2116MMNN, never a JP id', () => {
  assert.deepStrictEqual(mc.GEN_STAGE_IDS('2016-08'), Array.from({ length: 10 }, (_, i) => 21160801 + i));
  assert.deepStrictEqual(mc.GEN_STAGE_IDS('2016-11'), Array.from({ length: 10 }, (_, i) => 21161101 + i));
  assert.throws(() => mc.GEN_STAGE_IDS('2016-12'), /2016-12/, 'only the four generated months');
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

test('the 1.1.3 folder comes from opts.dir / the command line before KHUX_COLOSSEUM_SRC and the default', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-colosseum-')), saved = process.env.KHUX_COLOSSEUM_SRC;
  const warn = console.warn, said = [];
  console.warn = (m) => said.push(m);
  try {
    process.env.KHUX_COLOSSEUM_SRC = path.join(dir, 'not-this-one');
    assert.strictEqual(mc.patch(dir, { dir: path.join(dir, 'empty') }), null, 'an unreadable folder writes nothing');
    assert.ok(said.some((m) => m.includes(path.join(dir, 'empty'))), 'the folder of opts.dir is the one read');
    assert.ok(!fs.existsSync(path.join(dir, 'colosseum.json')));
  } finally {
    console.warn = warn;
    if (saved === undefined) delete process.env.KHUX_COLOSSEUM_SRC; else process.env.KHUX_COLOSSEUM_SRC = saved;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('real_113 (the four seasons from the 1.1.3 master)', () => {
  const src = mc.readSource(process.env.KHUX_COLOSSEUM_SRC || mc.DEFAULT_2016, null);
  if (!src) { results.push('skip real_113: 1.1.3 master not on disk'); return; }
  src.masterEnemyIds = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemy.json'), 'utf8')).map((r) => r.enemyId);
  const out = mc.seasonRows(src, mc.SEASONS.slice(0, 4));
  assert.deepStrictEqual(out.colosseumStage.map((r) => r.colosseumStageId), [800, 900, 1000, 1100]);
  assert.deepStrictEqual(out.colosseum.length, 6 + 10 + 10 + 10);
  assert.strictEqual(out.stage.length, 40);
  assert.strictEqual(new Set(out.stage.map((r) => r.id)).size, 40);
  assert.deepStrictEqual(out.ranking.map((r) => r.rankingId), [4009, 4010, 4011, 4012]);
  assert.deepStrictEqual(out.rankingReward.length, 4 + 2 + 8 + 8);
  assert.deepStrictEqual(out.sphere.map((r) => r.sphereBoardId), [800, 900, 1000, 1100].flatMap((id) => mc.SEASON_BOARDS[id]).sort((a, b) => a - b));
  assert.strictEqual(out.enemy.length, 0, 'the 111 Coliseum enemy rows are already in our master');
  for (const s of mc.SEASONS.slice(0, 4)) {
    const t = out.ranked[s.colosseumStageId];
    assert.ok(t.thresholds.length >= 1 && t.thresholds.length === t.brackets.length);
    t.thresholds.forEach((x, i) => { if (i) assert.ok(x.score >= t.thresholds[i - 1].score); });
  }
  assert.deepStrictEqual(out.ranked[1000].thresholds.map((x) => x.score), [64, 76, 93, 105, 134, 159, 175, 216]);
  assert.deepStrictEqual(out.ranked[900].thresholds.map((x) => x.score), [1, 1]);
});

test('board card pictures: 6★ Cid from the 2016 bundle, every other served board from --loc', () => {
  const served = Object.values(mc.SEASON_BOARDS).flat();
  const rows = mc.artLines(served).split('\n').filter((l) => l && !l.startsWith('#'));
  assert.strictEqual(rows.length, served.length, 'one line per served board');
  assert.strictEqual(served.length, 9 + 30);
  assert.deepStrictEqual(rows.map((l) => l.split('\t')[0]), served.map((id) => `img/sphere_incentive/${id}.png`), 'in the order of the boards');
  assert.strictEqual(rows[0], 'img/sphere_incentive/2200001.png\tb16');
  assert.strictEqual(rows[1], 'img/sphere_incentive/2200002.png\tloc\t=img/sphere_incentive_coli/2200002.png');
  // every value: b16 | loc | jp:<file>; a jp line copies that JP 4.3.1 file (import_originals.py source jp, highest revision)
  for (const [id, v] of Object.entries(mc.BOARD_ART)) assert.match(v, /^(b16|loc|jp:\d{7}\.png)$/, `${id} ${v}`);
  assert.strictEqual(mc.artLines([2210037]).split('\n').filter((l) => l && !l.startsWith('#'))[0],
    `img/sphere_incentive/2210037.png\tjp\timg/sphere_incentive/${mc.BOARD_ART[2210037].slice(3)}`);
  const jpLines = rows.filter((l) => l.split('\t')[1] === 'jp');
  assert.ok(jpLines.length >= 1, 'the JP twins are served as JP files');
  for (const l of jpLines) assert.match(l, /^img\/sphere_incentive\/\d{7}\.png\tjp\timg\/sphere_incentive\/\d{7}\.png$/, l);
  // the JP file names exist in the local JP 4.3.1 data (private, skipped without it)
  let jp = null;
  try { jp = require('child_process').execFileSync('python', ['-I', path.join(__dirname, '..', 'recon', 'tools', 'private_tools.py'), 'path', 'jp_data'], { encoding: 'utf8' }).trim(); } catch { /* none */ }
  if (jp && fs.existsSync(path.join(jp, 'img', 'sphere_incentive'))) {
    const names = new Set(fs.readdirSync(path.join(jp, 'img', 'sphere_incentive')).map((f) => f.replace(/\.\d{8}(\.png)$/, '$1')));
    for (const l of jpLines) assert.ok(names.has(path.basename(l.split('\t')[2])), `JP file of ${l}`);
  } else results.push('skip art jp files: JP 4.3.1 data not on disk');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcart-'));
  try {
    const art = path.join(dir, 'art.tsv');
    mc.patch(dir, { src: fixture(), seasons: S800, artFile: art });
    assert.deepStrictEqual(fs.readFileSync(art, 'utf8').split('\n').filter((l) => l && !l.startsWith('#')), ['img/sphere_incentive/2200001.png\tb16']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---- Coliseum Part 2 Task 1: the nine seasons 2016-08 .. 2017-04 ----
// relux = the cleaned ReLux season extract (readRelux shape): arrays already cut to their valid counts, coins /100,
// a trailing 0-round marker after term, and (from 2017-01) hidden 999-round tiers after the wiki-visible endless tier
const R = require('./colosseum-rules');
const rtier = (sid, n, rounds, skip, cn, coin, extra = []) => ({ colosseumId: sid + n, colosseumStageId: sid, round: n, ap: n < 3 ? 3 : n < 5 ? 4 : 5,
  arrivalStageCount: rounds, rankId: '', excellentUnlockCount: skip, validStageReward: cn ? 1 : 0, stageRewardType: 17, stageRewardId: 0, stageRewardAssignType: 1,
  stageRewardSkillId: 0, stageRewardSkillLv: 1, stageRewardNum: cn, validReward: coin ? 1 + extra.length : 0,
  rewardType: coin ? [17, ...extra.map(() => 3)] : [], rewardId: coin ? [0, ...extra] : [], rewardAssignType: coin ? [1, ...extra.map(() => 1)] : [],
  rewardSkillId: coin ? [0, ...extra.map(() => 0)] : [], rewardSkillLv: coin ? [1, ...extra.map(() => 1)] : [], rewardNum: coin ? [coin, ...extra.map(() => 1)] : [] });
const ROUNDS = [20, 15, 15, 10, 10, 10, 10, 10, 10, 10], SKIPS = [18, 16, 12, 10, 8, 6, 5, 4, 3, 3], CN = [1, 3, 5, 7, 10, 10, 10, 10, 10, 10];
const TCOIN = [30, 40, 50, 70, 100, 100, 100, 100, 600, 900];
// sid 1500: 10 finite tiers + the endless 11th (term), marker 12; sid 1700: + hidden 999-round tiers 12..15 (term 1715), marker 16
const reluxSeason = (sid, month, setFirst, hidden) => {
  const tiers = ROUNDS.map((n, i) => rtier(sid, i + 1, n, SKIPS[i], CN[i], TCOIN[i], [90076]));
  tiers.push(rtier(sid, 11, 999, 3, 10, hidden ? 900 : 0, hidden ? [90076] : []));
  for (let n = 12; n < 12 + hidden; n++) tiers.push(rtier(sid, n, 999, 3, 10, n < 11 + hidden ? 900 : 0, n < 11 + hidden ? [90076] : []));
  const term = sid + tiers.length;
  tiers.push(rtier(sid, tiers.length + 1, 0, 3, 0, 0));
  return { colosseumStage: { colosseumStageId: sid, openDate: `${month}-01 07:00:00`, closeDate: '2030-01-01 00:00:00', rankingCloseDate: '2030-01-01 00:00:00',
    headColosseumId: sid + 1, termColosseumId: term, rankingId: 4016 + (sid - 1500) / 100, validStage: 10, stageId: Array.from({ length: 10 }, (_, i) => setFirst + i),
    loopStageCount: 10, lvPerLoop: 10, _closeDate_derived: true }, colosseum: tiers };
};
// a donor board (coliseum_boards.json shape: own arryId 3210xxx / masuId 4210xxx, no dates): 19 nodes, START at row 4 column 0
const reluxBoard = (id, name, kindId, coins) => {
  const pts = Array(23).fill(0);
  for (let i = 0; i < 19; i++) pts[i] = i < 18 ? 50 : coins - 18 * 50;
  const row = (r) => Array.from({ length: 9 }, (_, c) => (r === 4 && c === 0 ? 1000 : r >= 2 || c >= 2 ? 1002 : 0));
  return { sphere: { sphereBoardId: id, boardName: name, kindId, boardId: 3, arryId: id + 1000000, masuId: id + 2000000, type: 3, openId: 3, openParam: 0, price: 0, detailUrl: null },
    sphereArray: { arryId: id + 1000000, spCol4: row(4), spCol3: row(3), spCol2: row(2), spCol1: row(1), spCol0: row(0) },
    sphereMasu: { masuId: id + 2000000, sphereBoardId: id, spherePoint: pts, rewardSelect: pts.map((p) => (p ? 3 : 0)), medalCategory: Array(23).fill(0),
      rewardId: pts.map((p) => (p ? 90076 : 0)), rewardExpand: Array(23).fill(0), rewardExpandId: Array(23).fill(0), rewardValue: Array(23).fill(0), burstUpperNumber: Array(23).fill(0) } };
};
const RELUX_BOARDS = [[2210046, 'Timothy Mouse', 1, 1100], [2210047, 'Timothy Mouse', 2, 1100], [2210048, 'Tier 10 Bonus', 0, 3090],
  [2210052, 'Armored Terra', 1, 1100], [2210053, 'Armored Aqua', 2, 1100], [2210054, 'Tier 10 Bonus', 0, 3090]].map((b) => reluxBoard(...b));
const reluxFixture = () => {
  const seasons = [reluxSeason(1500, '2016-11', 20160401, 0), reluxSeason(1700, '2017-01', 20160601, 4)];
  const boards = JSON.parse(JSON.stringify(RELUX_BOARDS));
  return { colosseumStage: seasons.map((s) => s.colosseumStage), colosseum: seasons.flatMap((s) => s.colosseum),
    sphere: boards.map((b) => b.sphere), sphereArray: boards.map((b) => b.sphereArray), sphereMasu: boards.map((b) => b.sphereMasu) };
};
const S1500 = { month: '2016-11', colosseumStageId: 1500, source: 'relux', genStages: true };
const S1700 = { month: '2017-01', colosseumStageId: 1700, source: 'relux' };
const p2 = () => ({ ...fixture(), relux: reluxFixture() });

test('readRelux: the extract flattened, null when not readable', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-colosseum-'));
  try {
    const f = path.join(dir, 'coliseum_seasons.json'), rf = reluxFixture();
    fs.writeFileSync(f, JSON.stringify({ _provenance: {}, seasons: [1500, 1700].map((sid) => ({
      colosseumStage: rf.colosseumStage.find((r) => r.colosseumStageId === sid), colosseum: rf.colosseum.filter((r) => r.colosseumStageId === sid) })) }));
    assert.strictEqual(mc.readRelux(f), null, 'no board extract next to it: not readable');
    fs.writeFileSync(path.join(dir, 'coliseum_boards.json'), JSON.stringify({ _provenance: {}, boards: RELUX_BOARDS.map((b) => ({ ...b, _meta: {} })) }));
    assert.deepStrictEqual(mc.readRelux(f), rf, 'seasons and the boards next to them (coliseum_boards.json)');
    assert.strictEqual(mc.readRelux(path.join(dir, 'none.json')), null);
    const other = path.join(dir, 'b.json');
    fs.copyFileSync(path.join(dir, 'coliseum_boards.json'), other);
    fs.rmSync(path.join(dir, 'coliseum_boards.json'));
    assert.deepStrictEqual(mc.readRelux(f, other), rf, 'a board extract named by the caller');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('relux boards: the donor rows of the season, renumbered to the board id; a missing one stops', () => {
  const out = mc.seasonRows(p2(), [S800[0], S1500, S1700]);
  assert.deepStrictEqual(out.sphere.map((r) => r.sphereBoardId), [2200001, ...WIKI_BOARDS[1500], ...WIKI_BOARDS[1700]]);
  for (const b of RELUX_BOARDS) {
    const id = b.sphere.sphereBoardId, s = out.sphere.find((r) => r.sphereBoardId === id);
    assert.deepStrictEqual([s.boardName, s.kindId, s.type, s.boardId, s.arryId, s.masuId, s.detailUrl, s.startDatetime, s.endDatetime],
      [b.sphere.boardName, b.sphere.kindId, 3, 3, id, id, '', mc.START, mc.END], `${id} sphere`);
    const a = out.sphereArray.find((r) => r.arryId === id);
    assert.deepStrictEqual(a.spCol4, b.sphereArray.spCol4, `${id} grid`);
    const m = out.sphereMasu.find((r) => r.masuId === id);
    assert.deepStrictEqual([m.sphereBoardId, m.spherePoint], [id, b.sphereMasu.spherePoint], `${id} cells`);
  }
  const f = p2();
  f.relux.sphere = f.relux.sphere.filter((r) => r.sphereBoardId !== 2210047);
  assert.throws(() => mc.seasonRows(f, [S800[0], S1500]), /2210047/);
  const g = p2();
  g.relux.sphere.find((r) => r.sphereBoardId === 2210046).type = 4;
  assert.throws(() => mc.seasonRows(g, [S800[0], S1500]), /2210046/, 'not a Coliseum board');
});

test('board grid: START at row 4 column 0 and nothing in the top-left 2 x 2 (the board picture), else the run stops', () => {
  const out = mc.seasonRows(p2(), [S800[0], S1500, S1700]);
  for (const a of out.sphereArray) {
    assert.strictEqual(a.spCol4[0], 1000, `${a.arryId} START`);
    assert.deepStrictEqual([a.spCol0[0], a.spCol0[1], a.spCol1[0], a.spCol1[1]], [0, 0, 0, 0], `${a.arryId} corner`);
  }
  const f = p2();
  f.relux.sphereArray.find((r) => r.arryId === 3210046).spCol1[1] = 1002;
  assert.throws(() => mc.seasonRows(f, [S800[0], S1500]), /2210046.*corner/);
  const g = p2();
  g.relux.sphereArray.find((r) => r.arryId === 3210047).spCol4[0] = 1002;
  assert.throws(() => mc.seasonRows(g, [S800[0], S1500]), /2210047.*START/);
});

test('relux seasons: extract rows, generated stage ids, wiki-visible tiers', () => {
  const out = mc.seasonRows(p2(), [S800[0], S1500, S1700]);
  assert.deepStrictEqual(out.colosseumStage.map((r) => r.colosseumStageId), [800, 1500, 1700]);
  const cs = (id) => out.colosseumStage.find((r) => r.colosseumStageId === id);
  assert.deepStrictEqual(cs(1500).stageId, mc.GEN_STAGE_IDS('2016-11'), '1500: generated set, not the 20160401 of the extract');
  assert.deepStrictEqual(cs(1700).stageId, Array.from({ length: 10 }, (_, i) => 20160601 + i), '1700: the JP set of the extract');
  assert.strictEqual(cs(1500).closeDate, mc.END); assert.strictEqual(cs(1500).rankingId, 4016);
  const tiersOf = (id) => out.colosseum.filter((r) => r.colosseumStageId === id);
  assert.strictEqual(tiersOf(1500).length, 11, '2016-11: eleven tiers');
  assert.deepStrictEqual([tiersOf(1500)[9].rewardType[0], tiersOf(1500)[9].rewardNum[0], tiersOf(1500)[9].arrivalStageCount], [17, 900, 10], 'the extra tier: 10 rounds, 900 coins');
  assert.strictEqual(tiersOf(1700).length, 11, 'hidden 999-round tiers after the first endless one left out');
  assert.deepStrictEqual([cs(1500).termColosseumId, cs(1700).termColosseumId], [1511, 1711], 'term = the last served tier');
  for (const r of tiersOf(1500)) assert.strictEqual(r.rewardType.length, 4, 'padded to the schema');
  // stage rows: one per stage id, ids in our range and unique, Coliseum stages
  const ids = out.colosseumStage.flatMap((r) => r.stageId.slice(0, r.validStage));
  assert.deepStrictEqual(out.stage.map((r) => r.stageId).sort((a, b) => a - b), [...ids].sort((a, b) => a - b));
  assert.strictEqual(new Set(out.stage.map((r) => r.id)).size, 30);
  for (const r of out.stage) {
    assert.ok(r.id >= mc.RANGES.stage[1] && r.id <= mc.RANGES.stage[2], `id ${r.id}`);
    assert.deepStrictEqual([r.stageKind, r.worldId, r.mapName], [3, 5, 'Coliseum']);
  }
  // ranking: own row and reward rows per season, inside our ranges, thresholds never going down
  assert.deepStrictEqual(out.ranking.map((r) => r.rankingId), [4009, 4016, 4018]);
  assert.strictEqual(new Set(out.rankingReward.map((r) => r.rankingRewardId)).size, out.rankingReward.length, 'no shared reward ids');
  for (const rk of out.ranking) {
    const rows = out.rankingReward.filter((r) => r.rankingRewardId >= rk.startRank && r.rankingRewardId <= rk.endRank);
    assert.ok(rows.length >= 1 && rows.length === rk.endRank - rk.startRank + 1, `rewards of ${rk.rankingId}`);
    for (const r of rows) assert.ok(r.rankingRewardId >= mc.RANGES.rankingReward[1] && r.rankingRewardId <= mc.RANGES.rankingReward[2]);
  }
  for (const id of [1500, 1700]) {
    const t = out.ranked[id];
    assert.ok(t.thresholds.length >= 1 && t.thresholds.length === t.brackets.length, `${id} thresholds`);
    t.thresholds.forEach((x, i) => { assert.ok(x.score >= 1); if (i) assert.ok(x.score >= t.thresholds[i - 1].score, `${id} never down`); });
  }
  // the Part 1 rows of 800 are the same with or without the new seasons
  const solo = mc.seasonRows(fixture(), S800);
  assert.deepStrictEqual(out.colosseum.filter((r) => r.colosseumStageId === 800), solo.colosseum);
  assert.deepStrictEqual(out.stage.filter((r) => r.stageId < 20160000), solo.stage);
  assert.deepStrictEqual(out.ranked[800], solo.ranked[800]);
});

test('relux: a season missing from the extract or an x100 coin artefact stops the run', () => {
  assert.throws(() => mc.seasonRows(fixture(), [S800[0], S1500]), /2016-11/);
  const f = p2();
  f.relux.colosseum.find((r) => r.colosseumId === 1510).rewardNum[0] = 90000;
  assert.throws(() => mc.seasonRows(f, [S800[0], S1500]), /x100|90000/);
});

test('new seasons start fresh', () => {
  const out = mc.seasonRows(p2(), [S800[0], S1500]);
  const tiers = R.tiersOf({ stage: out.colosseumStage[1], tiers: out.colosseum.filter((r) => r.colosseumStageId === 1500) });
  const save = { colosseum: { seasons: { 800: { last: 40, open: 43, coins: 321, cleared: [40], tierRewards: [1, 2], bestAt: 'T' } } } };
  const before = JSON.stringify(save.colosseum.seasons[800]);
  const st = R.seasonState(save, 1500);
  assert.deepStrictEqual([st.last, st.open, st.coins, st.tierRewards], [0, 1, 0, []]);
  assert.deepStrictEqual(R.playable(tiers, st).map((p) => [p.tier, p.round]), [[1, 1]], 'Tier 1 Round 1');
  assert.strictEqual(JSON.stringify(save.colosseum.seasons[800]), before, 'April untouched');
});

test('extra tier 2016-11', () => {
  const out = mc.seasonRows(p2(), [S800[0], S1500]);
  const rows = out.colosseum.filter((r) => r.colosseumStageId === 1500);
  const tiers = R.tiersOf({ stage: out.colosseumStage[1], tiers: rows });
  const st = R.seasonState({}, 1500);
  st.last = R.globalRound(tiers, 10, 7); st.open = st.last + 1; st.tierRewards = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  R.clear(tiers, st, { tier: 10, round: 8, oneTurn: true }, 'T1');
  assert.deepStrictEqual(R.playable(tiers, st).map((p) => `T${p.tier}R${p.round}`), ['T10R9', 'T10R10', 'T11R1'], 'one-turn window from tier 10 into tier 11');
  let res = R.clear(tiers, st, { tier: 11, round: 1, oneTurn: false }, 'T2');
  assert.ok(res.ok); assert.deepStrictEqual(res.tierRewards, [10]);
  assert.strictEqual(res.coins, 10 + 10 + 10 + 900, 'skipped rounds + tier 10 rewards (900 coins)');
  assert.deepStrictEqual(res.tierItems[0].items.map((x) => [x.type, x.id, x.num]), [[17, 0, 900], [3, 90076, 1]]);
  res = R.clear(tiers, st, { tier: 11, round: 2, oneTurn: false }, 'T3');
  assert.ok(res.ok); assert.deepStrictEqual(res.tierRewards, [], 'paid once');
  // the endless last tier: the source value (999, as Part 1 serves it) and playable past it
  assert.strictEqual(rows[rows.length - 1].arrivalStageCount, 999);
  assert.deepStrictEqual(R.tierRound(tiers, R.globalRound(tiers, 11, 1) + 1500), { tier: 11, round: 1501 });
});

// the real sources: the 1.1.3 master and the cleaned ReLux extract (both private, outside the repo)
test('real_part2 (the nine seasons from the 1.1.3 master and the ReLux extract)', () => {
  const src = mc.readSource(process.env.KHUX_COLOSSEUM_SRC || mc.DEFAULT_2016);
  const relux = mc.readRelux(process.env.KHUX_COLOSSEUM_RELUX || mc.DEFAULT_RELUX);
  if (!src || !relux) { results.push('skip real_part2: 1.1.3 master or ReLux extract not on disk'); return; }
  src.relux = relux;
  src.masterEnemyIds = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemy.json'), 'utf8')).map((r) => r.enemyId);
  const out = mc.seasonRows(src);
  assert.deepStrictEqual(out.colosseumStage.map((r) => r.colosseumStageId), [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000]);
  const cs = (id) => out.colosseumStage.find((r) => r.colosseumStageId === id);
  const tiersOf = (id) => out.colosseum.filter((r) => r.colosseumStageId === id);
  for (const [id, month] of [[1200, '2016-08'], [1300, '2016-09'], [1400, '2016-10']]) {
    const orig = src.colosseumStage.find((r) => r.colosseumStageId === id);
    for (const k of ['headColosseumId', 'termColosseumId', 'rankingId', 'validStage', 'loopStageCount', 'lvPerLoop']) assert.strictEqual(cs(id)[k], orig[k], `${id} ${k}`);
    assert.deepStrictEqual(cs(id).stageId, mc.GEN_STAGE_IDS(month), `${id} generated set`);
    const o = src.colosseum.filter((r) => r.colosseumStageId === id && r.colosseumId <= orig.termColosseumId);
    assert.deepStrictEqual(tiersOf(id).map((r) => [r.arrivalStageCount, r.ap, r.excellentUnlockCount, r.stageRewardNum, r.validReward, r.rewardNum.slice(0, r.validReward)]),
      o.map((r) => [r.arrivalStageCount, r.ap, r.excellentUnlockCount, r.stageRewardNum, r.validReward, r.rewardNum.slice(0, r.validReward)]), `${id} tiers = 1.1.3`);
    assert.strictEqual(tiersOf(id).length, 10);
  }
  assert.deepStrictEqual(cs(1500).stageId, mc.GEN_STAGE_IDS('2016-11'));
  assert.deepStrictEqual([1600, 1700, 1800, 1900, 2000].map((id) => cs(id).stageId[0]), [20160501, 20160601, 20160701, 20160801, 20160901]);
  for (const id of [1600, 1700, 1800, 1900, 2000]) {
    assert.deepStrictEqual(cs(id).stageId, relux.colosseumStage.find((r) => r.colosseumStageId === id).stageId, `${id} ReLux set`);
  }
  for (const r of out.colosseum) {
    for (let i = 0; i < r.validReward; i++) if (r.rewardType[i] === 17) assert.ok(r.rewardNum[i] <= 10000, `${r.colosseumId} coins ${r.rewardNum[i]}`);
  }
  assert.strictEqual(tiersOf(1500).length, 11);
  assert.deepStrictEqual([tiersOf(1500)[9].rewardType[0], tiersOf(1500)[9].rewardNum[0], tiersOf(1500)[9].arrivalStageCount], [17, 900, 10]);
  for (const id of [1600, 1700, 1800, 1900, 2000]) assert.strictEqual(tiersOf(id).length, 11, `${id}: the wiki-visible tiers`);
  for (const id of [1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000]) assert.strictEqual(tiersOf(id).at(-1).arrivalStageCount, 999, `${id} endless last tier`);
  // stages: one row per stage id of every season, unique ids inside our range
  const ids = out.colosseumStage.flatMap((r) => r.stageId.slice(0, r.validStage));
  assert.strictEqual(ids.length, 130); assert.strictEqual(new Set(ids).size, 130);
  assert.deepStrictEqual(out.stage.map((r) => r.stageId).sort((a, b) => a - b), [...ids].sort((a, b) => a - b));
  assert.strictEqual(new Set(out.stage.map((r) => r.id)).size, 130);
  for (const r of out.stage) assert.ok(r.id >= mc.RANGES.stage[1] && r.id <= mc.RANGES.stage[2] && r.stageKind === 3, `stage ${r.stageId} id ${r.id}`);
  // ranking: every season its own ranking row and >= 1 reward row; thresholds never going down
  assert.deepStrictEqual(out.ranking.map((r) => r.rankingId), [4009, 4010, 4011, 4012, 4013, 4014, 4015, 4016, 4017, 4018, 4019, 4020, 4021]);
  assert.strictEqual(new Set(out.rankingReward.map((r) => r.rankingRewardId)).size, out.rankingReward.length);
  for (const s of mc.SEASONS) {
    const rk = out.ranking.find((r) => r.rankingId === cs(s.colosseumStageId).rankingId);
    assert.ok(rk, `${s.month} ranking row`);
    const rows = out.rankingReward.filter((r) => r.rankingRewardId >= rk.startRank && r.rankingRewardId <= rk.endRank);
    assert.ok(rows.length >= 1, `${s.month} rankingReward rows`);
    for (const r of rows) assert.ok(r.rankingRewardId >= mc.RANGES.rankingReward[1] && r.rankingRewardId <= mc.RANGES.rankingReward[2], `${r.rankingRewardId}`);
    const t = out.ranked[s.colosseumStageId];
    assert.ok(t.thresholds.length >= 1 && t.thresholds.length === t.brackets.length, `${s.month} thresholds`);
    t.thresholds.forEach((x, i) => { assert.ok(Number.isInteger(x.score) && x.score >= 1); if (i) assert.ok(x.score >= t.thresholds[i - 1].score, `${s.month} never down`); });
  }
  // Part 1 rows unchanged by the new seasons
  const part1 = mc.seasonRows({ ...src }, mc.SEASONS.slice(0, 4));
  const p1 = (rows, key, ids) => rows.filter((r) => ids.includes(r[key]));
  assert.deepStrictEqual(p1(out.colosseumStage, 'colosseumStageId', [800, 900, 1000, 1100]), part1.colosseumStage);
  assert.deepStrictEqual(p1(out.colosseum, 'colosseumStageId', [800, 900, 1000, 1100]), part1.colosseum);
  assert.deepStrictEqual(p1(out.stage, 'stageId', part1.stage.map((r) => r.stageId)), part1.stage);
  assert.deepStrictEqual(p1(out.rankingReward, 'rankingRewardId', part1.rankingReward.map((r) => r.rankingRewardId)), part1.rankingReward);
  assert.deepStrictEqual(out.enemy, part1.enemy);
  for (const t of ['sphere', 'sphereArray', 'sphereMasu']) {
    const key = mc.RANGES[t][0], ids = part1[t].map((r) => r[key]);
    assert.deepStrictEqual(out[t].filter((r) => ids.includes(r[key])), part1[t], `Part 1 ${t} rows unchanged`);
  }
  // boards: each season its wiki boards; avatar boards 19 nodes / 1100 coins, Tier 10 Bonus 3090 (proven on video), Tier 11
  // Bonus 3390; START at row 4 column 0, nothing in the top-left 2 x 2; 1200-1400 = the 1.1.3 rows, 1500-2000 = the donor rows
  const donor = new Map(relux.sphere.map((r) => [r.sphereBoardId, r]));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  for (const [sid, ids] of Object.entries(WIKI_BOARDS)) {
    assert.deepStrictEqual(out.sphere.filter((r) => ids.includes(r.sphereBoardId)).map((r) => r.sphereBoardId), ids, `${sid} boards served`);
    for (const id of ids) {
      const s = out.sphere.find((r) => r.sphereBoardId === id), m = out.sphereMasu.find((r) => r.masuId === id), a = out.sphereArray.find((r) => r.arryId === id);
      const nodes = m.spherePoint.slice(0, 22).filter((p) => p > 0).length, coins = sum(m.spherePoint.slice(0, 22));
      const bonus = mc.BONUS_TIER[id];
      assert.strictEqual(s.boardName, bonus ? `Tier ${bonus} Bonus` : s.boardName, `${id} name`);
      assert.deepStrictEqual([nodes, coins], bonus === 11 ? [19, 3390] : bonus === 10 ? [19, 3090] : [19, 1100], `${id} nodes / coins`);
      if (!bonus) assert.ok([1, 2].includes(s.kindId), `${id} avatar board: male / female`);
      assert.strictEqual(a.spCol4[0], 1000, `${id} START`);
      assert.deepStrictEqual([a.spCol0[0], a.spCol0[1], a.spCol1[0], a.spCol1[1]], [0, 0, 0, 0], `${id} corner`);
      assert.deepStrictEqual([s.arryId, s.masuId, m.sphereBoardId, s.type], [id, id, id, 3], `${id} renumbered`);
      const orig = Number(sid) <= 1400 ? src.sphere.find((r) => r.sphereBoardId === id) : donor.get(id);
      assert.ok(orig, `${id} source row`);
      assert.deepStrictEqual([s.boardName, s.kindId], [orig.boardName, orig.kindId], `${id} from its source`);
      if (Number(sid) <= 1400) assert.strictEqual(String(orig.startDatetime).slice(0, 7), mc.SEASONS.find((x) => x.colosseumStageId === Number(sid)).month, `${id} 1.1.3 month`);
    }
  }
  // new seasons start fresh: a save with only the Part 1 seasons plays 2016-08 from Tier 1 Round 1 with 0 coins
  const save = { colosseum: { seasons: { 800: { last: 70, open: 71, coins: 50, cleared: [70], tierRewards: [1, 2, 3, 4, 5], bestAt: 'T' }, 1100: { last: 3, open: 4, coins: 4, cleared: [3], tierRewards: [], bestAt: 'T' } } } };
  const st = R.seasonState(save, 1200);
  const t1200 = R.tiersOf({ stage: cs(1200), tiers: tiersOf(1200) });
  assert.deepStrictEqual([st.last, st.coins, R.playable(t1200, st).map((p) => [p.tier, p.round])], [0, 0, [[1, 1]]]);
  assert.deepStrictEqual([save.colosseum.seasons[800].coins, save.colosseum.seasons[1100].last], [50, 3]);
});

// ---- Coliseum Part 2 Task 3: an enemy row for every id the served stages use ----
const SOURCES = ['113', 'rule', 'relux', 'estimate'];
const knotRow = (id, name, knots, hp, atk, extra = {}) => ({ enemyId: id, name, validGrowth: knots.length, baseLv: knots, hp, attack: atk, defense: knots.map(() => 900),
  exp: knots.map(() => 1), money: knots.map(() => 13), raidPoint: knots.map(() => 108), lux: knots.map(() => 1), score: knots.map(() => 500), validSkill: 1, skillId: [100], ...extra });
// the variant rule (docs/notes/coliseum.md): same level knots up to LV 999, same ATK and DEF, same HP below LV 300, HP x3 at LV 300,
// HP at LV 999 = 40/11 x its own LV 300, no munny or raid points
function assertRule(row, base) {
  const n = row.validGrowth, cut = (r, k) => r[k].slice(0, n);
  assert.deepStrictEqual(cut(row, 'baseLv'), base.baseLv.slice(0, base.validGrowth).filter((lv) => lv <= 999), `${row.enemyId} knots`);
  assert.deepStrictEqual(cut(row, 'attack'), cut(base, 'attack'), `${row.enemyId} ATK`);
  assert.deepStrictEqual(cut(row, 'defense'), cut(base, 'defense'), `${row.enemyId} DEF`);
  const at = (r, lv) => r.hp[r.baseLv.indexOf(lv)];
  assert.strictEqual(at(row, 300), 3 * at(base, 300), `${row.enemyId} HP x3 at LV 300`);
  assert.strictEqual(at(row, 999), Math.round(at(row, 300) * 40 / 11), `${row.enemyId} HP at LV 999`);
  row.baseLv.slice(0, n).forEach((lv, i) => { if (lv < 300) assert.strictEqual(row.hp[i], base.hp[i], `${row.enemyId} HP at LV ${lv}`); });
  assert.ok(row.money.every((v) => v === 0) && row.raidPoint.every((v) => v === 0), `${row.enemyId} no munny / raid points`);
}

test('stage enemies: 1.1.3 row, then the variant rule, then the ReLux row; a missing source stops', () => {
  const base50 = knotRow(50, 'Base Foe', [1, 35, 100, 300, 999, 1150], [100, 200, 300, 1000, 5000, 6000], [10, 20, 30, 40, 50, 60]);
  const masterEnemies = [{ enemyId: 20001 }, { enemyId: 20031 }, base50];
  const relux60 = { ...knotRow(20060, 'ReLux Foe', [1, 35, 100, 300, 999], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]), _meta: { era: 'x' } };
  const stageEnemies = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [20150701 + i, [20001]]));
  stageEnemies[20150701] = [20031, 20050, 20060, 29999];
  const src = { ...fixture(), masterEnemyIds: undefined, masterEnemies, reluxEnemies: [relux60], stageEnemies };
  const out = mc.seasonRows(src, S800);
  assert.deepStrictEqual(out.enemy.map((r) => r.enemyId), [20050, 20060, 29999]);
  assert.deepStrictEqual(out.colosseumEnemies.map((e) => [e.enemyId, e.source]), [[20050, 'rule'], [20060, 'relux'], [29999, '113']]);
  for (const e of out.colosseumEnemies) assert.ok(SOURCES.includes(e.source) && e.label, `${e.enemyId} source / label`);
  assert.strictEqual(out.colosseumEnemies.find((e) => e.enemyId === 20050).label, 'colosseumEnemyRule');
  assert.deepStrictEqual(out.colosseumEnemies.find((e) => e.enemyId === 20050).stages, [20150701]);
  const rule = out.enemy.find((r) => r.enemyId === 20050);
  assertRule(rule, base50);
  assert.deepStrictEqual(rule.hp.slice(0, 5), [100, 200, 300, 3000, 10909]);
  assert.strictEqual(rule.name, 'Base Foe'); assert.deepStrictEqual(rule.skillId.slice(0, 1), [100]);
  assert.ok(!('_meta' in out.enemy.find((r) => r.enemyId === 20060)), 'schema fields only');
  // ids of the master are never written again
  assert.ok(!out.enemy.some((r) => masterEnemies.some((m) => m.enemyId === r.enemyId)));
  // no source at all (no 1.1.3 row, no base row for the rule, no ReLux row): stops, never a substitute
  assert.throws(() => mc.seasonRows({ ...src, stageEnemies: { ...stageEnemies, 20150702: [20070] } }, S800),
    /20070.*20150702.*decided per enemy as for the raids.*docs\/notes\/coliseum\.md/);
  // a missing non-variant id stops too (original Coliseum variant ids only)
  assert.throws(() => mc.seasonRows({ ...src, stageEnemies: { ...stageEnemies, 20150702: [161020017] } }, S800), /161020017/);
  assert.deepStrictEqual(out.enemyCheck, { checked: true, reason: '', unchecked: [] });
});

test('enemyCheck: unchecked when the stage enemy lists are missing or incomplete (a flag, not a stop)', () => {
  const none = mc.seasonRows({ ...fixture() }, S800);
  assert.strictEqual(none.enemyCheck.checked, false);
  assert.match(none.enemyCheck.reason, /no stage enemy lists/);
  assert.strictEqual(none.enemyCheck.unchecked.length, 10);
  const lists = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [20150701 + i, [20001]]));
  const part = mc.seasonRows({ ...fixture(), stageEnemies: lists }, S800);
  assert.deepStrictEqual(part.enemyCheck, { checked: false, reason: '1 served stages without an enemy list', unchecked: [20150710] });
  // patch returns the flag (make-game-tables prints the banner)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-colosseum-'));
  try {
    const src = fixture(); delete src.masterEnemyIds;
    fs.writeFileSync(path.join(dir, 'enemy.json'), JSON.stringify([{ enemyId: 20001 }]));
    assert.strictEqual(mc.patch(dir, { src, seasons: S800 }).enemyCheck.checked, false);
    assert.strictEqual(mc.patch(dir, { src, seasons: S800, stageEnemies: { ...lists, 20150710: [20001] } }).enemyCheck.checked, true);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('ruleRow: null without the LV 300 / LV 999 knots or with a knot between them', () => {
  const b = (knots) => knotRow(50, 'Base Foe', knots, knots.map((l) => l * 10), knots.map((l) => l));
  assert.ok(mc.ruleRow(20050, b([1, 35, 100, 300, 999])));
  assert.strictEqual(mc.ruleRow(20050, b([1, 35, 100, 300])), null, 'no LV 999');
  assert.strictEqual(mc.ruleRow(20050, b([1, 35, 100, 999])), null, 'no LV 300');
  assert.strictEqual(mc.ruleRow(20050, b([1, 35, 100, 300, 500, 999])), null, 'a knot between LV 300 and LV 999');
  // no rule row: the id falls through to the ReLux row
  const src = { ...fixture(), masterEnemies: [{ enemyId: 20001 }, b([1, 35, 100, 300])], reluxEnemies: [knotRow(20050, 'ReLux Foe', [1, 999], [1, 2], [1, 2])],
    stageEnemies: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [20150701 + i, [20001, 20050]])) };
  assert.strictEqual(mc.seasonRows(src, S800).colosseumEnemies.find((e) => e.enemyId === 20050).source, 'relux');
});

test('readStageEnemies: the import report, then the generated report, then the JP parse', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-colosseum-'));
  try {
    const f = (n, j) => { const p = path.join(dir, n); fs.writeFileSync(p, JSON.stringify(j)); return p; };
    const imp = f('imp.json', { stages: [{ stageId: 20151108, status: 'imported', enemies: [20001, 20092] }, { stageId: 20151109, status: 'skipped', enemies: [1] }] });
    const gen = f('gen.json', { stages: [{ stageId: 21160801, enemyIds: [20001, 20007] }] });
    const jp = f('jp.json', { 20151108: { parts: { '00': { enemies: [{ enemyId: 1510228138 }, { enemyId: 20001 }] } } },
      20151109: { parts: { '00': { enemies: [{ enemyId: 20003 }] }, '01': { enemies: [{ enemyId: 20004 }] } } } });
    assert.deepStrictEqual(mc.readStageEnemies([imp, gen, jp, path.join(dir, 'none.json')]),
      { 20151108: [20001, 20092], 20151109: [20003, 20004], 21160801: [20001, 20007] });
    assert.strictEqual(mc.readStageEnemies([path.join(dir, 'none.json')]), null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('patch: colosseumEnemies report, rows appended once, master rows kept', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-colosseum-'));
  try {
    const base50 = knotRow(50, 'Base Foe', [1, 35, 100, 300, 999], [100, 200, 300, 1000, 5000], [10, 20, 30, 40, 50]);
    fs.writeFileSync(path.join(dir, 'enemy.json'), JSON.stringify([{ enemyId: 20001 }, { enemyId: 20031 }, base50]));
    const stageEnemies = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [20150701 + i, [20001, 20050]]));
    const src = fixture(); delete src.masterEnemyIds;
    const out = mc.patch(dir, { src, seasons: S800, stageEnemies });
    assert.deepStrictEqual(out.colosseumEnemies.map((e) => [e.enemyId, e.source]), [[20050, 'rule'], [29999, '113']]);
    const ids = JSON.parse(fs.readFileSync(path.join(dir, 'enemy.json'), 'utf8')).map((r) => r.enemyId);
    assert.deepStrictEqual(ids, [20001, 20031, 50, 20050, 29999]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// the real sources: every enemy id of every served stage (original and generated) is in the master after patch()
test('real_part2_enemies (every enemy id of the served stages)', () => {
  const src = mc.readSource(process.env.KHUX_COLOSSEUM_SRC || mc.DEFAULT_2016);
  const relux = mc.readRelux(process.env.KHUX_COLOSSEUM_RELUX || mc.DEFAULT_RELUX);
  const stageEnemies = mc.readStageEnemies(mc.stageEnemyFiles());
  if (!src || !relux || !stageEnemies) { results.push('skip real_part2_enemies: 1.1.3 master, ReLux extract or stage enemy lists not on disk'); return; }
  const masterRows = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemy.json'), 'utf8'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-colosseum-'));
  try {
    fs.writeFileSync(path.join(dir, 'enemy.json'), JSON.stringify(masterRows));
    const out = mc.patch(dir, { src: { ...src, relux }, stageEnemies, reluxEnemies: mc.readReluxEnemies(process.env.KHUX_COLOSSEUM_RELUX_ENEMIES || mc.DEFAULT_RELUX_ENEMIES) });
    assert.strictEqual(out.colosseumStage.length, 13);
    assert.deepStrictEqual(out.enemyCheck, { checked: true, reason: '', unchecked: [] }, 'every served stage checked');
    const after = new Map(JSON.parse(fs.readFileSync(path.join(dir, 'enemy.json'), 'utf8')).map((r) => [r.enemyId, r]));
    const before = new Set(masterRows.map((r) => r.enemyId));
    const served = out.colosseumStage.flatMap((r) => r.stageId.slice(0, r.validStage));
    assert.strictEqual(served.length, 130);
    for (const sid of served) {
      assert.ok(stageEnemies[sid] && stageEnemies[sid].length, `stage ${sid}: enemy list`);
      for (const id of stageEnemies[sid]) assert.ok(after.has(id), `stage ${sid}: enemy ${id} in the master`);
    }
    for (const r of masterRows) assert.deepStrictEqual(after.get(r.enemyId), r, `master row ${r.enemyId} kept as it was`);
    assert.strictEqual(after.size, before.size + out.enemy.length, 'new rows only for missing ids');
    assert.deepStrictEqual(out.colosseumEnemies.map((e) => e.enemyId), out.enemy.map((r) => r.enemyId));
    for (const e of out.colosseumEnemies) {
      assert.ok(!before.has(e.enemyId) && SOURCES.includes(e.source), `${e.enemyId} ${e.source}`);
      if (e.source === 'rule') assertRule(after.get(e.enemyId), after.get(e.enemyId - 20000));
    }
    results.push(`info real_part2_enemies: ${new Set(served.flatMap((s) => stageEnemies[s])).size} ids over ${served.length} stages, new rows ${JSON.stringify(out.colosseumEnemies.map((e) => [e.enemyId, e.source]))}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

console.log(results.join('\n'));
if (process.exitCode) console.log('test-make-colosseum: FAIL'); else console.log('test-make-colosseum: OK');
