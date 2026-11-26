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
    termColosseumId: 701, rankingId: 4008, validStage: 1, stageId: [20160301, ...G, ...G, ...G].slice(0, 10), loopStageCount: 10, lvPerLoop: 10 },
  // the stage template season of the relux seasons (make-colosseum.js STAGE_TEMPLATE): here on the same fixture stage rows
  { colosseumStageId: 1400, openDate: '2016-10-01 07:00:00', closeDate: '2016-11-01 06:59:59', rankingCloseDate: '2016-11-01 06:59:59', headColosseumId: 1401,
    termColosseumId: 1410, rankingId: 4015, validStage: 10, stageId: Array.from({ length: 10 }, (_, i) => 20150701 + i), loopStageCount: 10, lvPerLoop: 10 }],
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
    ['2017-04', 2000, 'relux', false],
    // Part 3 (2017-05 .. 2018-03): the ReLux rows; 2017-06 .. 2017-12 generated (no stage file of their JP sets on disk)
    ['2017-05', 2100, 'relux', false], ['2017-06', 2200, 'relux', true], ['2017-07', 2300, 'relux', true], ['2017-08', 2400, 'relux', true],
    ['2017-09', 2500, 'relux', true], ['2017-10', 2600, 'relux', true], ['2017-11', 2700, 'relux', true], ['2017-12', 2800, 'relux', true],
    ['2018-01', 2900, 'relux', false], ['2018-02', 3000, 'relux', false], ['2018-03', 3100, 'relux', false],
    // Part 3b (2018-04 .. 2019-04): the ReLux rows, the JP sets of the rows, no generated set
    ['2018-04', 3200, 'relux', false], ['2018-05', 3300, 'relux', false], ['2018-06', 3400, 'relux', false], ['2018-07', 3500, 'relux', false],
    ['2018-08', 3600, 'relux', false], ['2018-09', 3700, 'relux', false], ['2018-10', 3800, 'relux', false], ['2018-11', 3900, 'relux', false],
    ['2018-12', 4000, 'relux', false], ['2019-01', 4100, 'relux', false], ['2019-02', 4200, 'relux', false], ['2019-03', 4300, 'relux', false],
    ['2019-04', 4400, 'relux', false]]);
  assert.strictEqual(mc.SEASONS.length, 37);
  assert.deepStrictEqual(mc.SEASON_BOARDS[800], [2200001]);
  // the boards of 2018-04 .. 2019-04 come with Part 3b Task 4
  for (const s of mc.SEASONS.filter((x) => x.colosseumStageId <= 3100)) assert.ok(mc.SEASON_BOARDS[s.colosseumStageId].length >= 1, `boards of ${s.colosseumStageId}`);
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
// Coliseum Part 3 Task 4: the ReLux boards of 2017-05 .. 2018-03 (private PART3_AUDIT.md §5, by id order and per-month counts):
// 2017-05 .. 11 avatar M / F + Tier 10 / 11 Bonus, 2017-12 .. 2018-03 one both-gender board + Tier 10 / 11 Bonus
const P3_BOARDS = {
  2100: [2210067, 2210068, 2210069, 2210070], // KH Dale M / F (2017-05)
  2200: [2210071, 2210072, 2210073, 2210074], // Hydrangea Prep, Hydrangea Formal
  2300: [2210075, 2210076, 2210077, 2210078], // Mango Sweetie M / F
  2400: [2210079, 2210080, 2210081, 2210082], // Buzz Cut M / F
  2500: [2210083, 2210084, 2210085, 2210086], // Illusionist M / F
  2600: [2210087, 2210088, 2210089, 2210090], // Trick or Treat II M / F
  2700: [2210091, 2210092, 2210093, 2210094], // Natural, Long Side Tails
  2800: [2210095, 2210096, 2210097], // Blue Reinstar (Spirit parts)
  2900: [2210098, 2210099, 2210100], // Puppy Ears (Shag) & (Bob) (Puppy Medium / Puppy Bob: JP only, not served)
  3000: [2210101, 2210102, 2210103], // Heart-Shaped Balloon
  3100: [2210104, 2210105, 2210106], // Mushroom Cut & Kitty Ears (2018-03)
};
// Part 3b Task 4: the ReLux boards 2210107 .. 2210150 (3 per month to 2018-11, 4 from 2018-12)
const P3B_BOARDS = {
  3200: [2210107, 2210108, 2210109], 3300: [2210110, 2210111, 2210112], 3400: [2210113, 2210114, 2210115], 3500: [2210116, 2210117, 2210118],
  3600: [2210119, 2210120, 2210121], 3700: [2210122, 2210123, 2210124], 3800: [2210125, 2210126, 2210127], 3900: [2210128, 2210129, 2210130],
  4000: [2210131, 2210132, 2210133, 2210134], 4100: [2210135, 2210136, 2210137, 2210138], 4200: [2210139, 2210140, 2210141, 2210142],
  4300: [2210143, 2210144, 2210145, 2210146], 4400: [2210147, 2210148, 2210149, 2210150],
};
test('each new season lists exactly its wiki boards; every bonus board has its tier', () => {
  for (const [id, ids] of Object.entries(WIKI_BOARDS)) assert.deepStrictEqual(mc.SEASON_BOARDS[id], ids, `boards of ${id}`);
  const all = Object.values(mc.SEASON_BOARDS).flat();
  assert.strictEqual(new Set(all).size, all.length, 'a board in one season only');
  const bonus = {};
  for (const ids of Object.values(WIKI_BOARDS)) for (const b of ids.slice(2)) bonus[b] = TIER11.includes(b) ? 11 : 10;
  // Part 3: the last two boards of every month are the Tier 10 / Tier 11 Bonus
  for (const ids of Object.values(P3_BOARDS)) { bonus[ids[ids.length - 2]] = 10; bonus[ids[ids.length - 1]] = 11; }
  // Part 3b: 2018-04 .. 11 the last two boards are Tier 10 / 11; 2018-12 .. 2019-04 the last three are Tier 11 / 12 / 13
  for (const ids of Object.values(P3B_BOARDS)) ids.slice(1).forEach((b, i) => { bonus[b] = (ids.length === 3 ? 10 : 11) + i; });
  assert.deepStrictEqual(mc.BONUS_TIER, { 2200023: 10, 2210031: 10, 2210035: 10, ...bonus });
});

test('part3b seasons list exactly their ReLux boards, bonus tiers from the board names', () => {
  for (const [id, ids] of Object.entries(P3B_BOARDS)) assert.deepStrictEqual(mc.SEASON_BOARDS[id], ids, `boards of ${id}`);
  assert.deepStrictEqual(Object.values(P3B_BOARDS).flat(), Array.from({ length: 44 }, (_, i) => 2210107 + i), 'the contiguous ids 2210107 .. 2210150');
  assert.deepStrictEqual([2210108, 2210109, 2210132, 2210133, 2210134].map((b) => mc.BONUS_TIER[b]), [10, 11, 11, 12, 13]);
  assert.strictEqual(mc.BONUS_TIER[2210107], undefined); assert.strictEqual(mc.BONUS_TIER[2210131], undefined);
});

test('part3 seasons list exactly their ReLux boards', () => {
  for (const [id, ids] of Object.entries(P3_BOARDS)) assert.deepStrictEqual(mc.SEASON_BOARDS[id], ids, `boards of ${id}`);
  assert.deepStrictEqual(Object.values(P3_BOARDS).flat(), Array.from({ length: 40 }, (_, i) => 2210067 + i), 'the contiguous ids 2210067 .. 2210106');
});

test('GEN_STAGE_IDS: 2116MMNN / 2117MMNN, never a JP id, the two years disjoint', () => {
  assert.deepStrictEqual(mc.GEN_STAGE_IDS('2016-08'), Array.from({ length: 10 }, (_, i) => 21160801 + i));
  assert.deepStrictEqual(mc.GEN_STAGE_IDS('2016-11'), Array.from({ length: 10 }, (_, i) => 21161101 + i));
  assert.deepStrictEqual(mc.GEN_STAGE_IDS('2017-06'), Array.from({ length: 10 }, (_, i) => 21170601 + i));
  assert.deepStrictEqual(mc.GEN_STAGE_IDS('2017-12'), Array.from({ length: 10 }, (_, i) => 21171201 + i));
  for (const m of ['2016-12', '2017-05', '2018-01', '2017-13']) assert.throws(() => mc.GEN_STAGE_IDS(m), new RegExp(m), `${m}: no generated set`);
  // every genStages season has a set; 2016 and 2017 sets never share an id (2017-08 .. 11 = the months of the served 2016-08 .. 11)
  const gen = mc.SEASONS.filter((s) => s.genStages).map((s) => s.month);
  assert.deepStrictEqual(gen, ['2016-08', '2016-09', '2016-10', '2016-11', '2017-06', '2017-07', '2017-08', '2017-09', '2017-10', '2017-11', '2017-12']);
  const ids = gen.flatMap(mc.GEN_STAGE_IDS);
  assert.strictEqual(new Set(ids).size, ids.length, 'no id twice');
  assert.ok(ids.every((id) => /^211[67](0[1-9]|1[0-2])(0[1-9]|10)$/.test(String(id))), 'YYMMNN after 21');
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
  const all = Object.values(mc.SEASON_BOARDS).flat();
  assert.strictEqual(all.length, 9 + 30 + 40 + 44);
  // a board whose card waits for the user's review (PENDING_ART: no card of its own yet) gets no line: the client keeps its
  // default card slot, the Catalog its placeholder; every other board one line, in the order of the boards
  for (const id of mc.PENDING_ART) assert.ok(all.includes(id) && id >= 2210067 && !(id in mc.BOARD_ART), `${id} pending: a Part 3 board without BOARD_ART`);
  const served = all.filter((id) => !mc.PENDING_ART.has(id));
  const rows = mc.artLines(all).split('\n').filter((l) => l && !l.startsWith('#'));
  assert.strictEqual(rows.length, served.length, 'one line per served board with a card');
  assert.deepStrictEqual(rows.map((l) => l.split('\t')[0]), served.map((id) => `img/sphere_incentive/${id}.png`), 'in the order of the boards');
  // Part 3 (cards prepared ahead, private board_art_all.json): every board of 2210067 .. 2210106 has a BOARD_ART value or is pending
  for (let id = 2210067; id <= 2210106; id++) assert.ok(id in mc.BOARD_ART !== mc.PENDING_ART.has(id), `${id}: BOARD_ART or PENDING_ART, one of them`);
  // Part 3b (user-approved, private board_art_all.json): all 44 boards of 2210107 .. 2210150 have a card, none pending; loc to 2210127, JP from 2210128
  for (let id = 2210107; id <= 2210150; id++) assert.ok(id in mc.BOARD_ART && !mc.PENDING_ART.has(id), `${id}: a card`);
  for (let id = 2210107; id <= 2210127; id++) assert.strictEqual(mc.BOARD_ART[id], 'loc', `${id} loc`);
  assert.deepStrictEqual([2210128, 2210129, 2210130, 2210131, 2210132, 2210133, 2210134, 2210135, 2210147, 2210150].map((id) => mc.BOARD_ART[id]),
    ['jp:2200168.png', 'jp:2200169.png', 'jp:2200170.png', 'jp:2200172.png', 'jp:2200169.png', 'jp:2200170.png', 'jp:2200171.png', 'jp:2200176.png', 'jp:2200188.png', 'jp:2200171.png']);
  assert.deepStrictEqual([2210067, 2210068, 2210079, 2210080].map((id) => mc.BOARD_ART[id]), ['jp:2200017.png', 'jp:2200018.png', 'jp:2200095.png', 'jp:2200096.png'],
    'KH Dale (user 26-11) and Buzz Cut: the JP twins');
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
const pages = require('./colosseum-pages');
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

test('relux seasons: extract rows, generated stage ids, every head..term tier', () => {
  const out = mc.seasonRows(p2(), [S800[0], S1500, S1700]);
  assert.deepStrictEqual(out.colosseumStage.map((r) => r.colosseumStageId), [800, 1500, 1700]);
  const cs = (id) => out.colosseumStage.find((r) => r.colosseumStageId === id);
  assert.deepStrictEqual(cs(1500).stageId, mc.GEN_STAGE_IDS('2016-11'), '1500: generated set, not the 20160401 of the extract');
  assert.deepStrictEqual(cs(1700).stageId, Array.from({ length: 10 }, (_, i) => 20160601 + i), '1700: the JP set of the extract');
  assert.strictEqual(cs(1500).closeDate, mc.END); assert.strictEqual(cs(1500).rankingId, 4016);
  const tiersOf = (id) => out.colosseum.filter((r) => r.colosseumStageId === id);
  assert.strictEqual(tiersOf(1500).length, 11, '2016-11: eleven tiers');
  assert.deepStrictEqual([tiersOf(1500)[9].rewardType[0], tiersOf(1500)[9].rewardNum[0], tiersOf(1500)[9].arrivalStageCount], [17, 900, 10], 'the extra tier: 10 rounds, 900 coins');
  // user 26-11 (Part 3): every tier row inside head..term is served, the 999-round tiers after the first one too; the 0-round
  // end marker after term is not
  assert.strictEqual(tiersOf(1700).length, 15, 'the 999-round tiers 12 .. 15 after the first one served');
  assert.deepStrictEqual(tiersOf(1700).map((r) => r.colosseumId), Array.from({ length: 15 }, (_, i) => 1701 + i), 'head..term, no end marker');
  assert.deepStrictEqual([cs(1500).termColosseumId, cs(1700).termColosseumId], [1511, 1715], 'term = the source term');
  assert.deepStrictEqual(tiersOf(1700).slice(10).map((r) => [r.arrivalStageCount, r.validReward, r.rewardNum[0]]),
    [[999, 2, 900], [999, 2, 900], [999, 2, 900], [999, 2, 900], [999, 0, 0]], 'each 999-round tier with its own rewards, as the source');
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

// ---- Coliseum Part 2 Task 5: ranking brackets and thresholds ----
// The monthly notices' ranking tables (worldwide, public): «<medalId>[:<skillId>][x<num>]» per reward, avatar parts by id.
// 19886 (2016-08), 20641 (2016-09), 21481 (2016-10): the 1.1.3 rows must equal them; 22105 (2016-11): make-colosseum.js RELUX_RANKING.
const EDGES = [[1, 100], [101, 1000], [1001, 2500], [2501, 10000], [10001, 50000], [50001, 100000], [100001, 250000], [250001, 500000]];
const CDC = (n) => [90056, 90066, 90076].map((id) => (n > 1 ? `${id}x${n}` : String(id))); // 6★ Chip / Dale / Cid
const NOTICES = {
  1200: [['90125:1107', '90125:1101x2', '101195', '101196', '102195', '102196', ...CDC(5)], ['90125:1107', '90125:1101x2', '101195', '101196', '102195', '102196', ...CDC(2)],
    ['90125:1107', '90125:1101', '101195', '101196', '102195', '102196', ...CDC(1)], ['90125:1101', '101195', '101196', '102195', '102196', ...CDC(1)],
    ['90125:1101', '101195', '101196', '102195', '102196', '90056', '90066'], ['101195', '101196', '90056', '90066'], ['90056', '90066'], ['90055x2', '90065x2']],
  1300: [['90126:1115', '101203', '101204', '90125:1101x2', ...CDC(5)], ['90126:1115', '101203', '101204', '90125:1101x2', ...CDC(2)],
    ['90126:1115', '101203', '101204', '90125:1101', ...CDC(1)], ['101203', '101204', '90125:1101', ...CDC(1)], ['101203', '101204', '90125:1101', '90056', '90066'],
    ['101203', '101204', '90056', '90066'], ['90056', '90066'], ['90055x2', '90065x2']],
  1400: [['90126:1117', '90125:1107x2', '90125:1101x3', '40051', '41051', '108209', '108210', ...CDC(5)], ['90126:1117', '90125:1107x2', '90125:1101x3', '40051', '41051', '108209', '108210', ...CDC(2)],
    ['90126:1117', '90125:1107x2', '90125:1101x3', '40051', '41051', '108209', '108210', ...CDC(1)], ['90125:1107', '90125:1101x2', '40051', '41051', '108209', '108210', ...CDC(1)],
    ['90125:1101x2', '40051', '41051', ...CDC(1)], ['90125:1101', '40051', '41051', '90055x3', '90065x3'], ['40051', '41051', '90055x2', '90065x2'], ['90055', '90065']],
  1500: [['90126:1119', '90125:1113x2', '90123:1112x3', '101215', '101216', '103215', '103216', ...CDC(5)], ['90126:1119', '90125:1113x2', '90123:1112x3', '101215', '101216', '103215', '103216', ...CDC(2)],
    ['90126:1119', '90125:1113x2', '90123:1112x3', '101215', '101216', '103215', '103216', ...CDC(1)], ['90125:1113', '90123:1112x2', '101215', '101216', '103215', '103216', ...CDC(1)],
    ['90123:1112x2', '101215', '101216', ...CDC(1)], ['90123:1112', '101215', '101216', '90055x3', '90065x3'], ['101215', '101216', '90055x2', '90065x2'], ['90055', '90065']],
};
const tokenOf = (x) => `${x.id}${x.skillId ? `:${x.skillId}` : ''}${x.num > 1 ? `x${x.num}` : ''}`;
// a season's brackets (ranked) against a notice table: edges, then the rewards as a set (the notices list them in another order)
function assertNotice(ranked, id) {
  const top = [...ranked.brackets].reverse(); // highest bracket first, as the notices
  assert.deepStrictEqual(top.map((b) => [b.startRank, b.endRank]), EDGES, `${id} bracket edges`);
  top.forEach((b, i) => assert.deepStrictEqual(b.rewards.map(tokenOf).sort(), [...NOTICES[id][i]].sort(), `${id} bracket ${EDGES[i].join('-')}`));
}
// rounds before the first endless (999-round) tier: the threshold curve's shift (the later 999-round tiers do not move it)
const finiteOf = (out, id) => {
  const t = out.colosseum.filter((r) => r.colosseumStageId === id).sort((a, b) => a.round - b.round);
  const e = t.findIndex((r) => r.arrivalStageCount >= mc.ENDLESS);
  return t.slice(0, e < 0 ? -1 : e).reduce((n, r) => n + r.arrivalStageCount, 0);
};

test('relux ranking: own rows of RELUX_RANKING, keyed off the season itself (no earlier season needed)', () => {
  const out = mc.seasonRows(p2(), [S1500]); // 2016-11 alone: nothing to copy from
  const rk = out.ranking[0];
  assert.deepStrictEqual([rk.rankingId, rk.category, rk.startRank, rk.endRank, rk.validReward, rk.unionStartRank, rk.unionEndRank],
    [4016, 4, 35000, 35007, 1, [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]], 'ranking row: the 1.1.3 constant fields, own reward block');
  assert.deepStrictEqual(out.rankingReward.map((r) => r.rankingRewardId), [35000, 35001, 35002, 35003, 35004, 35005, 35006, 35007]);
  assertNotice(out.ranked[1500], 1500);
  // the row itself: notice order, skills on Scrooge (skillType 3) at maxLv, tails zeroed, padded to the schema
  const r = out.rankingReward[0];
  assert.deepStrictEqual([r.startRank, r.endRank, r.validReward], [1, 100, 10]);
  assert.deepStrictEqual(r.type, [3, 3, 3, 19, 19, 20, 20, 3, 3, 3]);
  assert.deepStrictEqual(r.skillType, [3, 3, 3, 1, 1, 1, 1, 1, 1, 1]);
  assert.deepStrictEqual(r.skillLv, [20, 15, 10, 1, 1, 1, 1, 1, 1, 1]);
  const last = out.rankingReward[7];
  assert.deepStrictEqual([last.validReward, last.id.slice(2), last.num.slice(2)], [2, Array(8).fill(0), Array(8).fill(0)]);
  // 2017-01 (1700): the wiki table, Magic Mirror, masks to rank 100,000
  const o2 = mc.seasonRows(p2(), [S1700]);
  assert.deepStrictEqual(o2.ranking[0].startRank, 35100);
  const b = [...o2.ranked[1700].brackets].reverse();
  assert.deepStrictEqual(b[0].rewards.map(tokenOf), ['90126:1124x3', '101297', '101298', '90056x5', '90066x5', '90076x5', '90156x5']);
  assert.deepStrictEqual(b[5].rewards.map(tokenOf), ['101297', '101298', '90055x3', '90065x3']);
  assert.deepStrictEqual(b[6].rewards.map(tokenOf), ['90055x2', '90065x2'], 'no mask past rank 100,000 (notice 23796)');
  // a season with no RELUX_RANKING entry stops (never a copy of another season)
  const f = p2(); f.relux.colosseumStage[0] = { ...f.relux.colosseumStage[0], colosseumStageId: 3200 };
  f.relux.colosseum.forEach((t) => { if (t.colosseumStageId === 1500) t.colosseumStageId = 3200; });
  f.relux.colosseumStage[0].headColosseumId = 1501;
  f.relux.colosseumStage[0] = { ...f.relux.colosseumStage[0], colosseumStageId: 4500 };
  f.relux.colosseum.forEach((t) => { if (t.colosseumStageId === 3200) t.colosseumStageId = 4500; });
  assert.ok(!mc.RELUX_RANKING[4500], '4500 (2019-05, a later part) has no prizes');
  assert.throws(() => mc.seasonRows(f, [{ month: '2019-05', colosseumStageId: 4500, source: 'relux' }]), /2019-05|4500/);
});

test('RELUX_RANKING: every medal, skill level and avatar part exists in our master', () => {
  const M = (t) => JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', `${t}.json`), 'utf8'));
  const medals = new Set(M('medal').map((r) => r.medalId)), skills = new Map(M('skill').map((r) => [r.skillId, r])), parts = new Map(M('avatarParts').map((r) => [r.avatarPartsId, r]));
  const pets = new Set(M('petParts').map((r) => r.petPartsId)), mats = new Set(M('material').map((r) => r.materialId));
  for (const [k, id] of Object.entries(mc.MEDAL)) assert.ok(medals.has(id), `${k} ${id}`);
  for (const [id, lv] of Object.entries(mc.SKILL_LV)) assert.strictEqual(skills.get(Number(id)).maxLv, lv, `skill ${id} maxLv`);
  for (const [sid, spec] of Object.entries(mc.RELUX_RANKING)) {
    assert.strictEqual(spec.brackets.length, spec.edges.length, `${sid} one prize list per bracket`);
    assert.ok([8, 9, 12].includes(spec.edges.length), `${sid} 8 / 9 / 12 brackets`);
    for (const items of spec.brackets) {
      for (const it of items.map(mc.rankItem)) {
        if (it.type === 3) assert.ok(medals.has(it.id), `${sid} medal ${it.id}`);
        else if (it.type === 5) assert.ok(mats.has(it.id), `${sid} material ${it.id}`);
        else if (it.type === 33) assert.ok(pets.has(it.id), `${sid} Spirit part ${it.id}`);
        else assert.ok(parts.has(it.id), `${sid} avatar part ${it.id}`);
        if (it.skillId) assert.strictEqual([90126, 90125, 90123].includes(it.id), true, `${sid} skill ${it.skillId} rides on a Scrooge medal`);
      }
      // ♂ and ♀ of the same part together
      const avatar = items.map(mc.rankItem).filter((x) => x.type === 19 || x.type === 20).map((x) => parts.get(x.id));
      assert.strictEqual(avatar.filter((p) => p.gender === 1).length, avatar.filter((p) => p.gender === 2).length, `${sid} ♂ / ♀`);
    }
  }
  // 2016-12: Pegasus Knight: Helm to rank 10,000 only (notice 23117 «top 10,000» wins over the wiki's 250,000), Tail to 2,500
  const helm = mc.RELUX_RANKING[1600].brackets.map((b) => b.filter((x) => /^p19:10129[12]$/.test(x)).length);
  const tail = mc.RELUX_RANKING[1600].brackets.map((b) => b.filter((x) => /^p20:10729[12]$/.test(x)).length);
  assert.deepStrictEqual(helm, [2, 2, 2, 2, 0, 0, 0, 0], 'Helm: top 10,000 (notice 23117)');
  assert.deepStrictEqual(tail, [2, 2, 2, 0, 0, 0, 0, 0], 'Tail: top 2,500 (notice 23117)');
  assert.throws(() => mc.rankItem('moogle6'), /unknown/);
  assert.deepStrictEqual(mc.rankItem('cidx5'), { type: 3, id: 90076, skillType: 1, skillId: 0, skillLv: 1, num: 5 });
});

test('thresholds: >= 1, never down, at most the rounds a season can reach (finite tiers + the endless one)', () => {
  const out = mc.seasonRows(p2(), [S800[0], S1500, S1700]);
  for (const id of [800, 1500, 1700]) {
    const t = out.ranked[id], cap = finiteOf(out, id) + mc.ENDLESS;
    t.thresholds.forEach((x, i) => { assert.ok(x.score >= 1 && x.score <= cap, `${id} ${x.score} in 1..${cap}`); if (i) assert.ok(x.score >= t.thresholds[i - 1].score); });
  }
  // 2016-11 .. 2017-04: 120 rounds before the endless tier, the August 2016 curve shifted by +10
  assert.strictEqual(finiteOf(out, 1500), 120);
  assert.deepStrictEqual(out.ranked[1500].thresholds.map((x) => x.score), [74, 86, 103, 115, 144, 169, 185, 226]);
  assert.ok(out.ranked[1500].thresholds.every((x) => x.label === 'interpolated'));
  // 1700 serves its later 999-round tiers too: the curve still shifts by the 120 rounds before the first one
  assert.strictEqual(finiteOf(out, 1700), 120);
  assert.deepStrictEqual(out.ranked[1700].thresholds.map((x) => x.score), [74, 86, 103, 115, 144, 169, 185, 226]);
});

// the real sources: the 1.1.3 master and the cleaned ReLux extract (both private, outside the repo)
const P2_SEASONS = mc.SEASONS.filter((s) => s.colosseumStageId <= 2000);
test('real_part2 (the nine seasons from the 1.1.3 master and the ReLux extract)', () => {
  const src = mc.readSource(process.env.KHUX_COLOSSEUM_SRC || mc.DEFAULT_2016);
  const relux = mc.readRelux(process.env.KHUX_COLOSSEUM_RELUX || mc.DEFAULT_RELUX);
  if (!src || !relux) { results.push('skip real_part2: 1.1.3 master or ReLux extract not on disk'); return; }
  src.relux = relux;
  src.masterEnemyIds = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemy.json'), 'utf8')).map((r) => r.enemyId);
  const out = mc.seasonRows(src, P2_SEASONS);
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
  // every head..term tier of the source row (user 26-11): 1600 eleven, 1700 .. 1900 fifteen, 2000 twenty-one
  for (const id of [1500, 1600, 1700, 1800, 1900, 2000]) {
    const src0 = relux.colosseumStage.find((r) => r.colosseumStageId === id);
    assert.strictEqual(tiersOf(id).length, src0.termColosseumId - src0.headColosseumId + 1, `${id}: every head..term tier`);
    assert.strictEqual(cs(id).termColosseumId, src0.termColosseumId, `${id} term`);
  }
  assert.deepStrictEqual([1600, 1700, 1800, 1900, 2000].map((id) => tiersOf(id).length), [11, 15, 15, 15, 21]);
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
  for (const s of P2_SEASONS) {
    const rk = out.ranking.find((r) => r.rankingId === cs(s.colosseumStageId).rankingId);
    assert.ok(rk, `${s.month} ranking row`);
    const rows = out.rankingReward.filter((r) => r.rankingRewardId >= rk.startRank && r.rankingRewardId <= rk.endRank);
    assert.ok(rows.length >= 1, `${s.month} rankingReward rows`);
    for (const r of rows) assert.ok(r.rankingRewardId >= mc.RANGES.rankingReward[1] && r.rankingRewardId <= mc.RANGES.rankingReward[2], `${r.rankingRewardId}`);
    const t = out.ranked[s.colosseumStageId];
    assert.ok(t.thresholds.length >= 1 && t.thresholds.length === t.brackets.length, `${s.month} thresholds`);
    const cap = finiteOf(out, s.colosseumStageId) + mc.ENDLESS;
    t.thresholds.forEach((x, i) => { assert.ok(Number.isInteger(x.score) && x.score >= 1 && x.score <= cap, `${s.month} ${x.score} in 1..${cap}`); if (i) assert.ok(x.score >= t.thresholds[i - 1].score, `${s.month} never down`); });
  }
  // Task 5: 2016-08 thresholds = the recorded August 2016 cutoffs (curve anchored on that month, 110 finite rounds); 2016-09 / 10
  // the same structure; 2016-11 .. 2017-04 120 rounds (+10). Brackets of 2016-08 .. 2016-11 = the monthly notices
  for (const id of [1200, 1300, 1400]) assert.strictEqual(finiteOf(out, id), 110, `${id} finite rounds`);
  for (const id of [1500, 1600, 1700, 1800, 1900, 2000]) assert.strictEqual(finiteOf(out, id), 120, `${id} finite rounds`);
  assert.deepStrictEqual(out.ranked[1200].thresholds.map((x) => x.score), [64, 76, 93, 105, 134, 159, 175, 216], '2016-08 = the August 2016 cutoffs');
  for (const id of [1300, 1400]) assert.deepStrictEqual(out.ranked[id].thresholds, out.ranked[1200].thresholds, `${id} thresholds`);
  for (const id of [1600, 1700, 1800, 1900, 2000]) assert.deepStrictEqual(out.ranked[id].thresholds.map((x) => x.score), [74, 86, 103, 115, 144, 169, 185, 226], `${id} thresholds`);
  for (const id of [1200, 1300, 1400, 1500]) assertNotice(out.ranked[id], id);
  for (const id of [1600, 1700, 1800, 1900, 2000]) assert.deepStrictEqual([...out.ranked[id].brackets].reverse().map((b) => [b.startRank, b.endRank]), EDGES, `${id} wiki edges`);
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
const SOURCES = ['113', 'rule', 'relux', 'monthCopy', 'estimate'];
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

test('stage enemies: 1.1.3 row, then the ReLux row (old shape), then the variant rule; a missing source stops', () => {
  const base50 = knotRow(50, 'Base Foe', [1, 35, 100, 300, 999, 1150], [100, 200, 300, 1000, 5000, 6000], [10, 20, 30, 40, 50, 60]);
  const masterEnemies = [{ enemyId: 20001 }, { enemyId: 20031 }, base50];
  const relux60 = { ...knotRow(20060, 'ReLux Foe', [1, 35, 100, 300, 999], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]), _meta: { era: 'x' } };
  const stageEnemies = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [20150701 + i, [20001]]));
  stageEnemies[20150701] = [20031, 20050, 20060, 29999];
  const src = { ...fixture(), masterEnemyIds: undefined, masterEnemies, reluxEnemies: [relux60], stageEnemies };
  // the fixture's master row 50 stands for an original base: approved for this test only; without it the build stops
  assert.throws(() => mc.seasonRows(src, S800), /20050.*no original base/);
  mc.MASTER_BASE_APPROVED.push(50);
  const out = (() => { try { return mc.seasonRows(src, S800); } finally { mc.MASTER_BASE_APPROVED.pop(); } })();
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
  mc.MASTER_BASE_APPROVED.push(50);
  try {
  assert.throws(() => mc.seasonRows({ ...src, stageEnemies: { ...stageEnemies, 20150702: [20070] } }, S800),
    /20070.*20150702.*decided per enemy as for the raids.*docs\/notes\/coliseum\.md/);
  // a missing non-variant id stops too (original Coliseum variant ids only)
  assert.throws(() => mc.seasonRows({ ...src, stageEnemies: { ...stageEnemies, 20150702: [161020017] } }, S800), /161020017/);
  } finally { mc.MASTER_BASE_APPROVED.pop(); }
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
  // no rule row and a ReLux row of no known shape: the run stops (Part 3: a ReLux row serves only with the old shape)
  const src = { ...fixture(), masterEnemies: [{ enemyId: 20001 }, b([1, 35, 100, 300])], reluxEnemies: [knotRow(20050, 'ReLux Foe', [1, 999], [1, 2], [1, 2])],
    stageEnemies: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [20150701 + i, [20001, 20050]])) };
  assert.throws(() => mc.seasonRows(src, S800), /20050.*no source/);
  src.reluxEnemies = [knotRow(20050, 'ReLux Foe', [1, 35, 100, 300, 999], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5])];
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
    mc.MASTER_BASE_APPROVED.push(50);
    const out = (() => { try { return mc.patch(dir, { src, seasons: S800, stageEnemies }); } finally { mc.MASTER_BASE_APPROVED.pop(); } })();
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
    const out = mc.patch(dir, { src: { ...src, relux }, stageEnemies, seasons: P2_SEASONS, reluxEnemies: mc.readReluxEnemies(process.env.KHUX_COLOSSEUM_RELUX_ENEMY || mc.DEFAULT_RELUX_ENEMY) || [] });
    assert.strictEqual(out.colosseumStage.length, 13, 'the Part 2 seasons (Part 3: real_part3_enemies)');
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

// ---- Coliseum Part 3 Task 1: the seasons 2017-05 .. 2018-03, every head..term tier ----
// a 2017-05-shaped ReLux season (PART3_AUDIT.md §1): AP 0, tiers 20/15/15/10 x7/50/100/300 then nine 999-round tiers, per-round
// coins 1/3/5/7/10, tier coins to Tier 12, from Tier 13 the medals only (6★ Cid, 6★ Moogle, Magic Mirror), 0-round end marker
const P3_ROUNDS = [20, 15, 15, 10, 10, 10, 10, 10, 10, 10, 50, 100, 300, 999, 999, 999, 999, 999, 999, 999, 999, 999];
const P3_COIN = [30, 40, 50, 70, 100, 100, 100, 150, 150, 600, 900, 1500];
const P3_MEDAL = [90013, 90015, 90015, 90016, 90016, 90076];
const SK2100 = [36, 32, 24, 22, 16, 14, 12, 11, 11, 11, 9, 7, 6, 3, 3, 3, 3, 3, 3, 3, 3, 3];
const SK2700 = [53, 43, 43, 43, 43, 43, 43, 33, 33, 33, 33, 33, 33, 23, 9, 3, 3, 3, 3, 3, 3, 3];
const p3items = (n) => (n <= 6 ? [[17, 0, P3_COIN[n - 1]], [3, P3_MEDAL[n - 1], 1]] : n <= 12 ? [[17, 0, P3_COIN[n - 1]], [3, 90076, 1], [3, 90016, 1]]
  : [[3, 90076, 1], [3, 90016, 1], [3, 90156, 1]]);
const p3tier = (sid, n, rounds, skip, items) => ({ ...rtier(sid, n, rounds, skip, rounds ? [1, 3, 5, 7][n - 1] || 10 : 0, 0), ap: 0, validReward: items.length,
  rewardType: items.map((x) => x[0]), rewardId: items.map((x) => x[1]), rewardAssignType: items.map(() => 1), rewardSkillId: items.map(() => 0),
  rewardSkillLv: items.map(() => 1), rewardNum: items.map((x) => x[2]) });
const p3Season = (sid, setFirst, skips) => {
  const tiers = P3_ROUNDS.map((n, i) => p3tier(sid, i + 1, n, skips[i], p3items(i + 1)));
  tiers.push(p3tier(sid, 23, 0, 1, []));
  return { colosseumStage: { colosseumStageId: sid, openDate: '2017-05-01 07:00:00', closeDate: '2030-01-01 00:00:00', rankingCloseDate: '2030-01-01 00:00:00',
    headColosseumId: sid + 1, termColosseumId: sid + 22, rankingId: 4022 + (sid - 2100) / 100, validStage: 10, stageId: Array.from({ length: 10 }, (_, i) => setFirst + i),
    loopStageCount: 10, lvPerLoop: 10 }, colosseum: tiers };
};
const p3 = () => {
  const f = p2();
  for (const s of [p3Season(2100, 20161001, SK2100), p3Season(2200, 20161101, SK2100), p3Season(2700, 20170401, SK2700)]) {
    f.relux.colosseumStage.push(s.colosseumStage); f.relux.colosseum.push(...s.colosseum);
  }
  // the boards of those three months (Task 4): avatar M / F + Tier 10 / 11 Bonus
  for (const sid of [2100, 2200, 2700]) {
    for (const [k, id] of mc.SEASON_BOARDS[sid].entries()) {
      const b = reluxBoard(id, k < 2 ? 'Avatar' : `Tier ${8 + k} Bonus`, k < 2 ? k + 1 : 0, [1100, 1100, 3090, 3390][k]);
      f.relux.sphere.push(b.sphere); f.relux.sphereArray.push(b.sphereArray); f.relux.sphereMasu.push(b.sphereMasu);
    }
  }
  return f;
};
const S2100 = { month: '2017-05', colosseumStageId: 2100, source: 'relux' };
const S2200 = { month: '2017-06', colosseumStageId: 2200, source: 'relux', genStages: true };
const S2700 = { month: '2017-11', colosseumStageId: 2700, source: 'relux', genStages: true };
// the ranking prizes of 2017-05 .. 2018-03 come with Task 5: a stand-in entry for the tier tests only, removed afterwards
function withRanking(ids, fn) {
  const added = ids.filter((id) => !mc.RELUX_RANKING[id]);
  for (const id of added) mc.RELUX_RANKING[id] = { source: 'test stand-in', brackets: BRACKETS_STUB() };
  try { return fn(); } finally { for (const id of added) delete mc.RELUX_RANKING[id]; }
}
const BRACKETS_STUB = () => Array.from({ length: 8 }, () => ['cid']);

test('Part 3 seasons: every head..term tier, AP 0, the medal-only rewards of the source, 2117 generated sets', () => {
  const out = withRanking([2100, 2200], () => mc.seasonRows(p3(), [S800[0], S2100, S2200]));
  const tiersOf = (id) => out.colosseum.filter((r) => r.colosseumStageId === id);
  const cs = (id) => out.colosseumStage.find((r) => r.colosseumStageId === id);
  for (const id of [2100, 2200]) {
    assert.deepStrictEqual(tiersOf(id).map((r) => r.colosseumId), Array.from({ length: 22 }, (_, i) => id + 1 + i), `${id}: 22 tiers, no end marker`);
    assert.strictEqual(cs(id).termColosseumId, id + 22);
    assert.ok(tiersOf(id).every((r) => r.ap === 0), `${id} AP 0`);
    assert.deepStrictEqual(tiersOf(id).map((r) => r.arrivalStageCount), P3_ROUNDS, `${id} rounds`);
    assert.deepStrictEqual(tiersOf(id).map((r) => r.excellentUnlockCount), SK2100, `${id} skips`);
    assert.deepStrictEqual(tiersOf(id)[12].rewardType, [3, 3, 3, 0], 'Tier 13: medals in slot 0, no coin');
    assert.deepStrictEqual(tiersOf(id)[12].rewardId, [90076, 90016, 90156, 0]);
    assert.deepStrictEqual(tiersOf(id)[21].rewardId, [90076, 90016, 90156, 0], 'every 999-round tier its own rewards');
    assert.deepStrictEqual([tiersOf(id)[11].rewardType[0], tiersOf(id)[11].rewardNum[0]], [17, 1500]);
  }
  assert.deepStrictEqual(cs(2100).stageId, Array.from({ length: 10 }, (_, i) => 20161001 + i), '2017-05: the JP 4.3.1 set of the source');
  assert.deepStrictEqual(cs(2200).stageId, mc.GEN_STAGE_IDS('2017-06'), '2017-06: generated, 2117MMNN');
  assert.strictEqual(out.stage.length, 30);
  assert.strictEqual(new Set(out.stage.map((r) => r.id)).size, 30);
  assert.ok(!out.stage.some((r) => String(r.stageId).startsWith('2116')), 'never a 2016 generated id');
  // thresholds still shift by the rounds before the first 999-round tier (570 here; Task 5 fits the era's own curve)
  assert.strictEqual(finiteOf(out, 2100), 570);
});

test('skip 53 across tiers', () => {
  const out = withRanking([2700], () => mc.seasonRows(p3(), [S2700]));
  const rows = out.colosseum.filter((r) => r.colosseumStageId === 2700);
  assert.strictEqual(rows[0].excellentUnlockCount, 53);
  const tiers = R.tiersOf({ stage: out.colosseumStage[0], tiers: rows });
  const st = R.seasonState({}, 2700);
  let res = R.clear(tiers, st, { tier: 1, round: 1, oneTurn: true }, 'T1');
  assert.ok(res.ok); assert.strictEqual(res.coins, 1);
  const win = R.playable(tiers, st);
  assert.strictEqual(win.length, 53, 'rounds 2 .. 54 open');
  assert.deepStrictEqual([win[0], win.at(-1)].map((p) => `T${p.tier}R${p.round}`), ['T1R2', 'T4R4'], 'the window crosses tiers 1 .. 4');
  res = R.clear(tiers, st, { tier: 3, round: 15, oneTurn: false }, 'T2'); // global round 50
  assert.ok(res.ok);
  assert.strictEqual(res.cleared.length, 49, 'rounds 2 .. 50 paid');
  assert.deepStrictEqual(res.tierRewards, [1, 2, 3]);
  assert.strictEqual(res.coins, 19 * 1 + 15 * 3 + 15 * 5 + 30 + 40 + 50, 'every skipped round + the tier coins of tiers 1 .. 3');
  assert.deepStrictEqual(res.tierItems.map((t) => t.items.map((x) => [x.type, x.id, x.num])),
    [[[17, 0, 30], [3, 90013, 1]], [[17, 0, 40], [3, 90015, 1]], [[17, 0, 50], [3, 90015, 1]]]);
  res = R.clear(tiers, st, { tier: 4, round: 1, oneTurn: false }, 'T3');
  assert.ok(res.ok); assert.deepStrictEqual(res.tierRewards, [], 'paid once'); assert.strictEqual(res.coins, 7);
  assert.deepStrictEqual(st.tierRewards, [1, 2, 3]);
  // a one-turn clear in Tier 13 (skip 6 .. 33 in 2017-11) can reach the medal-only tier rewards: Tier 13 complete pays its medals
  st.last = R.globalRound(tiers, 13, 290); st.open = st.last + 1; st.tierRewards = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  R.clear(tiers, st, { tier: 13, round: 291, oneTurn: true }, 'T4');
  assert.deepStrictEqual(R.playable(tiers, st).at(-1), { tier: 14, round: 24, stageIndex: 3 }, 'skip 33 crosses into Tier 14');
  res = R.clear(tiers, st, { tier: 14, round: 1, oneTurn: false }, 'T5');
  assert.deepStrictEqual(res.tierRewards, [13]);
  assert.deepStrictEqual(res.tierItems[0].items.map((x) => [x.type, x.id, x.num]), [[3, 90076, 1], [3, 90016, 1], [3, 90156, 1]]);
  assert.strictEqual(res.coins, 10 * 10, 'round coins only: Tier 13 pays no coin');
});

test('part2 tiers extended keep progress', () => {
  const out = mc.seasonRows(p2(), [S1700]);
  const rows = out.colosseum.filter((r) => r.colosseumStageId === 1700);
  const now = R.tiersOf({ stage: out.colosseumStage[0], tiers: rows });
  // the Part 2 rows: up to the first 999-round tier (Tier 11), the last tier endless
  const before = R.tiersOf({ stage: out.colosseumStage[0], tiers: rows.slice(0, 11) });
  // a save in the old endless Tier 11, round 500: the same tier / round, the same next round
  const save = { colosseum: { seasons: { 1700: { last: R.globalRound(before, 11, 500), open: R.globalRound(before, 11, 500) + 1, coins: 2000, cleared: [], tierRewards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], bestAt: 'T' } } } };
  const st = R.seasonState(save, 1700);
  assert.deepStrictEqual(R.tierRound(now, st.last), R.tierRound(before, st.last));
  assert.deepStrictEqual(R.tierRound(now, st.last), { tier: 11, round: 500 });
  assert.deepStrictEqual(R.playable(now, st), R.playable(before, st));
  assert.deepStrictEqual(R.playable(now, st).map((p) => `T${p.tier}R${p.round}`), ['T11R501']);
  // Tier 11 finished (its reward paid as before): the old rows offered «Tier 11 Round 1000», which no clear accepts (round > 999);
  // now the next round is Tier 12 Round 1, and Tier 11 is not paid again
  st.last = R.globalRound(before, 11, 999); st.open = st.last + 1; st.tierRewards.push(11);
  assert.deepStrictEqual(R.playable(before, st).map((p) => `T${p.tier}R${p.round}`), ['T11R1000']);
  assert.strictEqual(R.clear(before, JSON.parse(JSON.stringify(st)), { tier: 11, round: 1000, oneTurn: false }, 'T').ok, false);
  assert.deepStrictEqual(R.playable(now, st).map((p) => `T${p.tier}R${p.round}`), ['T12R1']);
  const res = R.clear(now, st, { tier: 12, round: 1, oneTurn: false }, 'T');
  assert.ok(res.ok); assert.deepStrictEqual(res.tierRewards, []); assert.strictEqual(res.coins, 10);
});

test('patch: the Part 3 seasons enter the master with their prizes; a relux season without prizes stops the run (never left out)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-colosseum-'));
  const warn = console.warn, said = [];
  console.warn = (m) => said.push(String(m));
  try {
    const src = p3(); delete src.masterEnemyIds;
    const out = mc.patch(dir, { src, seasons: [S800[0], S1500, S2100] });
    assert.deepStrictEqual(out.colosseumStage.map((r) => r.colosseumStageId), [800, 1500, 2100]);
    assert.ok(!said.some((m) => /not built yet/.test(m)), `no «not built yet» warning: ${said.join(' | ')}`);
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'colosseumStage.json'), 'utf8')).map((r) => r.colosseumStageId), [800, 1500, 2100]);
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'rankingReward.json'), 'utf8')).filter((r) => r.rankingRewardId >= 35300 && r.rankingRewardId < 35350).length, 8,
      '2017-05 (ranking 4022): its eight reward rows');
    // a relux season whose prizes are missing stops (seasonRows and patch), never a copy of another season's prizes
    const keep = mc.RELUX_RANKING[2100];
    delete mc.RELUX_RANKING[2100];
    try {
      assert.throws(() => mc.seasonRows(p3(), [S2100]), /2100/);
      assert.throws(() => mc.patch(dir, { src: p3(), seasons: [S800[0], S2100] }), /2100/);
    } finally { mc.RELUX_RANKING[2100] = keep; }
  } finally { console.warn = warn; fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---- Coliseum Part 3 Task 5: ranking prizes and the 2017 era thresholds ----
// The audit table (private PART3_AUDIT.md §6, khuxwiki monthly pages): the featured skill BY NAME (ids from skill.json, never ReLux
// ids) on 6★ Scrooge x3 / x2 / x1 / x1 to rank 10,000; the month's avatar parts to rank 100,000; 2017-09 + Defense Boost I Max on
// 5★ Scrooge x3 / x2 / x1 / x1 / x1 / x1 to rank 100,000; 2017-12 the Santa Spirit parts by bracket (Hat to 2,500, Beard to 50,000,
// Brows to 100,000); Chip / Dale / Cid / Magic Mirror as every month since 2017-01.
const P3_PRIZES = {
  2100: { skill: 'Second Chance II', parts: [['KH Dale: Glasses', 1], ['KH Dale: Glasses', 2]] },
  2200: { skill: 'Attack Boost IV Max', parts: [['Hydrangea Prep: Hat', 1], ['Hydrangea Formal: Crown', 2]] },
  2300: { skill: 'ATK B IV Max & GA 2', parts: [['Mango Prep: Hat', 1], ['Mango Sweetie: Headband', 2]] },
  2400: { skill: 'ATK Boost IV & Lux+' },
  2500: { skill: 'Defense Boost II Max', parts: [['Illusionist: Mask', 1], ['Illusionist: Mask', 2]], five: 'Defense Boost I Max' },
  2600: { skill: 'Attack Boost V' },
  2700: { skill: 'Second Chance III', parts: [['Natural', 1], ['Long Side Tails', 2]] },
  2800: { skill: 'ATK B V & Lux+', spirit: [['Santa Hat', 3], ['Santa Beard', 5], ['Santa Brows', 6]] }, // [name, brackets from the top]
  2900: { skill: 'Defense Boost III Max' },
  3000: { skill: 'ATK B V Max & Lux+' },
  3100: { skill: 'Second Chance IV' },
};
const MD = (t) => JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', `${t}.json`), 'utf8'));
// the expected tokens of each bracket (top first), built from names
function p3Expected(sid, prizes = P3_PRIZES) {
  const p = prizes[sid], one = (rows, what) => { assert.strictEqual(rows.length, 1, what); return rows[0]; };
  const skill = (n) => one(MD('skill').filter((r) => r.name === n), `skill «${n}»`).skillId;
  const part = ([n, g]) => one(MD('avatarParts').filter((r) => r.name === n && r.gender === g), `avatar part «${n}» ${g}`).avatarPartsId;
  const pet = (n) => one(MD('petParts').filter((r) => r.name === n), `Spirit part «${n}»`).petPartsId;
  const x = (id, n) => (n > 1 ? `${id}x${n}` : String(id));
  const s6 = [3, 2, 1, 1, 0, 0, 0, 0], s5 = [3, 2, 1, 1, 1, 1, 0, 0], c6 = [5, 3, 2, 2, 1, 0, 0, 0], cid = [5, 3, 3, 2, 1, 0, 0, 0];
  const mir = [5, 4, 4, 3, 1, 0, 0, 0], c5 = [0, 0, 0, 0, 0, 3, 2, 1];
  return EDGES.map((_, i) => [
    ...(s6[i] ? [x(`90126:${skill(p.skill)}`, s6[i])] : []), ...(p.five && s5[i] ? [x(`90125:${skill(p.five)}`, s5[i])] : []),
    ...(p.parts && i < 6 ? p.parts.map((q) => String(part(q))) : []), ...(p.spirit || []).filter(([, n]) => i < n).map(([n]) => String(pet(n))),
    ...[90056, 90066].flatMap((id) => (c6[i] ? [x(id, c6[i])] : [])), ...(cid[i] ? [x(90076, cid[i])] : []), ...(mir[i] ? [x(90156, mir[i])] : []),
    ...[90055, 90065].flatMap((id) => (c5[i] ? [x(id, c5[i])] : [])),
  ].sort());
}
// p3() + the other eight months (tiers of 2100), boards of their own ids
const p3all = () => {
  const f = p3();
  for (const sid of [2300, 2400, 2500, 2600, 2800, 2900, 3000, 3100]) {
    const s = p3Season(sid, 40000001 + sid * 100, SK2100); // own made-up set ids (never served twice)
    f.relux.colosseumStage.push(s.colosseumStage); f.relux.colosseum.push(...s.colosseum);
    for (const [k, id] of mc.SEASON_BOARDS[sid].entries()) {
      const n = mc.SEASON_BOARDS[sid].length, bonus = k >= n - 2;
      const b = reluxBoard(id, bonus ? `Tier ${10 + k - (n - 2)} Bonus` : 'Avatar', bonus || n === 3 ? 0 : k + 1, bonus ? [3090, 3390][k - (n - 2)] : n === 3 ? 3500 : 1100);
      f.relux.sphere.push(b.sphere); f.relux.sphereArray.push(b.sphereArray); f.relux.sphereMasu.push(b.sphereMasu);
    }
  }
  return f;
};
const P3_SEASONS = mc.SEASONS.filter((s) => s.colosseumStageId >= 2100 && s.colosseumStageId <= 3100);

test('Part 3 ranking prizes: the audit table, featured skill by name, 2017-09 5★ skill, 2017-12 Spirit parts by bracket', () => {
  assert.deepStrictEqual(P3_SEASONS.map((s) => s.colosseumStageId), Object.keys(P3_PRIZES).map(Number));
  const out = mc.seasonRows(p3all(), P3_SEASONS);
  for (const s of P3_SEASONS) {
    const id = s.colosseumStageId, rk = out.ranking.find((r) => r.rankingId === 4022 + (id - 2100) / 100);
    assert.ok(rk, `${s.month}: ranking ${4022 + (id - 2100) / 100}`);
    assert.deepStrictEqual([rk.startRank, rk.endRank], [35000 + (rk.rankingId - 4016) * 50, 35000 + (rk.rankingId - 4016) * 50 + 7], `${s.month} reward block`);
    const top = [...out.ranked[id].brackets].reverse();
    assert.deepStrictEqual(top.map((b) => [b.startRank, b.endRank]), EDGES, `${s.month} brackets`);
    const want = p3Expected(id);
    top.forEach((b, i) => assert.deepStrictEqual(b.rewards.map(tokenOf).sort(), want[i], `${s.month} bracket ${EDGES[i].join('-')}`));
  }
  // skills at their maxLv on Scrooge (skillType 3): Defense Boost I Max 15, the others 20
  const rows = out.rankingReward.filter((r) => r.rankingRewardId >= 35500 && r.rankingRewardId < 35508); // 2017-09 (4026)
  assert.deepStrictEqual([rows[0].id.slice(0, 2), rows[0].skillType.slice(0, 2), rows[0].skillId.slice(0, 2), rows[0].skillLv.slice(0, 2)],
    [[90126, 90125], [3, 3], [1152, 1151], [20, 15]]);
  // 2017-12 (4029): the Spirit parts are type 33 (petParts), not avatar parts
  const dec = out.rankingReward.filter((r) => r.rankingRewardId >= 35650 && r.rankingRewardId < 35658);
  assert.deepStrictEqual(dec.map((r) => r.id.filter((v, k) => r.type[k] === 33)), [[402007, 411002, 401004], [402007, 411002, 401004], [402007, 411002, 401004],
    [411002, 401004], [411002, 401004], [401004], [], []]);
  assert.deepStrictEqual(mc.rankItem('p33:402007'), { type: 33, id: 402007, skillType: 1, skillId: 0, skillLv: 1, num: 1 });
});

// the private khuxwiki table (khuxwiki_ww_2016-2018.md, «Ranking:» lines) read independently: every bracket of 2017-05 .. 2018-03
test('real_part3_prizes (RELUX_RANKING = the khuxwiki monthly tables, names -> our ids)', () => {
  const file = 'D:\\Progetto_Restauro_KH_UX\\private\\events\\sources\\coliseum\\khuxwiki_ww_2016-2018.md';
  if (!fs.existsSync(file)) { results.push('skip real_part3_prizes: private khuxwiki_ww_2016-2018.md not on disk'); return; }
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/), M = { scrooge6: 90126, scrooge5: 90125, chip6: 90056, dale6: 90066, cid: 90076, mirror: 90156, chip5: 90055, dale5: 90065 };
  const skills = MD('skill'), parts = MD('avatarParts'), pets = MD('petParts');
  const partName = (w) => w.replace(/^H-/, '').replace(/-P$/, '').replace(/^A-/, '').replace(/-A-/, ': ');
  const out = mc.seasonRows(p3all(), P3_SEASONS);
  for (const s of P3_SEASONS) {
    const at = lines.findIndex((l) => l.startsWith(`## ${s.month} `)), rk = lines.slice(at).find((l) => l.startsWith('Ranking: '));
    assert.ok(at >= 0 && rk, `${s.month} in the wiki table`);
    const wiki = rk.slice(9).split(' || ').map((b) => {
      const m = /^\[(\d+) - (\d+)\] (.*)$/.exec(b), kv = m[3].split(', ').map((x) => /^(\S+) (.*)$/.exec(x).slice(1));
      const val = (k) => (kv.find(([key]) => key === k) || [])[1];
      const toks = [];
      for (const [k, v] of kv) {
        const x = (id, n) => (Number(n) > 1 ? `${id}x${n}` : String(id));
        if (/^scrooge[56]$/.test(k)) {
          const sk = skills.filter((r) => r.name === val(`skill${k.slice(-1)}`));
          assert.strictEqual(sk.length, 1, `${s.month} skill «${val(`skill${k.slice(-1)}`)}»`);
          toks.push(x(`${M[k]}:${sk[0].skillId}`, v));
        } else if (M[k]) toks.push(x(M[k], v));
        else if (/^avatar[mf]\d?$/.test(k)) {
          const r = parts.filter((p) => p.name === partName(v) && p.gender === (k[6] === 'm' ? 1 : 2));
          assert.strictEqual(r.length, 1, `${s.month} avatar part «${v}»`); toks.push(String(r[0].avatarPartsId));
        } else if (/^avatar\d$/.test(k)) { // 2017-12: the Santa parts are Spirit parts (notice 34668)
          const r = pets.filter((p) => p.name === partName(v));
          assert.strictEqual(r.length, 1, `${s.month} Spirit part «${v}»`); toks.push(String(r[0].petPartsId));
        } else assert.ok(/^skill[56]$/.test(k), `${s.month} wiki item ${k}`);
      }
      return { edges: [Number(m[1]), Number(m[2])], toks: toks.sort() };
    });
    const top = [...out.ranked[s.colosseumStageId].brackets].reverse();
    assert.deepStrictEqual(top.map((b) => [b.startRank, b.endRank]), wiki.map((w) => w.edges), `${s.month} edges = wiki`);
    top.forEach((b, i) => assert.deepStrictEqual(b.rewards.map(tokenOf).sort(), wiki[i].toks, `${s.month} bracket ${wiki[i].edges.join('-')} = wiki`));
  }
});

test('spirit parts paid (a 2017-12 threshold Present with a Spirit part)', () => {
  const ranked = require('./ranked-rewards');
  const out = mc.seasonRows(p3all(), P3_SEASONS.filter((s) => s.colosseumStageId === 2800));
  const r = out.ranked[2800], box = {};
  const thr = (end) => r.thresholds.find((t) => t.endRank === end).score;
  let res = ranked.record(box, 2800, thr(100000), r); // 50,001-100,000: the Brows
  assert.deepStrictEqual(res.due.filter((x) => x.type === 33).map((x) => [x.id, x.num]), [[401004, 1]]);
  res = ranked.record(box, 2800, thr(10000), r); // 2,501-10,000: + the Beard, the Brows not again
  assert.deepStrictEqual(res.due.filter((x) => x.type === 33).map((x) => [x.id, x.num]), [[411002, 1]]);
  res = ranked.record(box, 2800, thr(2500), r); // 1,001-2,500: + the Hat
  assert.deepStrictEqual(res.due.filter((x) => x.type === 33).map((x) => [x.id, x.num]), [[402007, 1]]);
  assert.ok(res.due.every((x) => x.type !== 33 || (x.skillId === 0 && x.skillType === 1)), 'a plain item Present');
});

// per-month calibration (lowest bracket first; f = fitted, i = interpolated): months with season-end points their own curve,
// the others the era curve
const I = 'interpolated', F = 'fitted';
const ERA_T = [[1, 1, 1, 245, 811, 999, 1147, 1624], [I, I, I, I, F, F, F, F]];
const MONTH_T = {
  '2017-05': [[1, 1, 1, 95, 314, 417, 504, 810], [I, I, I, I, F, F, F, F]],
  '2017-06': [[1, 1, 1, 135, 446, 550, 631, 893], [I, I, I, I, I, I, F, I]],
  '2017-07': [[1, 1, 1, 126, 417, 617, 798, 1131], [I, I, I, I, F, F, F, I]],
  '2017-08': ERA_T,
  '2017-09': [[1, 1, 1, 238, 788, 971, 1115, 1578], [I, I, I, I, I, I, I, F]],
  '2017-10': [[1, 1, 1, 232, 770, 1014, 1216, 1921], [I, I, I, I, F, F, F, F]],
  '2017-11': [[1, 1, 1, 661, 2192, 2696, 3092, 4363], [I, I, I, I, F, F, F, F]],
  '2017-12': [[1, 1, 1, 456, 1511, 1831, 2079, 2863], [I, I, I, I, F, F, F, F]],
  '2018-01': ERA_T, '2018-02': ERA_T, '2018-03': ERA_T,
};
test('era17 thresholds: a month curve where the month has season-end points, else the era curve; <= served rounds, never down', () => {
  const out = mc.seasonRows(p3all(), [S800[0], S1500, ...P3_SEASONS]);
  for (const s of P3_SEASONS) {
    const t = out.ranked[s.colosseumStageId].thresholds, served = out.colosseum.filter((x) => x.colosseumStageId === s.colosseumStageId).reduce((n, x) => n + x.arrivalStageCount, 0);
    assert.strictEqual(served, 570 + 9 * 999, `${s.month} served rounds`);
    assert.deepStrictEqual(t.map((x) => x.score), MONTH_T[s.month][0], `${s.month} thresholds (lowest bracket first)`);
    assert.deepStrictEqual(t.map((x) => x.label), MONTH_T[s.month][1], `${s.month} labels`);
    assert.strictEqual(!!mc.ERA17.months[s.month], MONTH_T[s.month] !== ERA_T, `${s.month}: own curve only with its own points`);
    t.forEach((x, i) => { assert.ok(Number.isInteger(x.score) && x.score >= 1 && x.score <= served, `${s.month} ${x.score} in 1..${served}`); if (i) assert.ok(x.score >= t[i - 1].score, `${s.month} never down`); });
  }
  assert.deepStrictEqual(out.ranked[800].thresholds.map((x) => x.score), [33, 65, 94, 135], '2016-04 unchanged');
  assert.deepStrictEqual(out.ranked[1500].thresholds.map((x) => x.score), [74, 86, 103, 115, 144, 169, 185, 226], '2016-11 unchanged');
  // rankedOf picks the era from the tier rows themselves (the routes pass the served master rows)
  const rows2100 = out.colosseum.filter((x) => x.colosseumStageId === 2100);
  const rew2100 = out.rankingReward.filter((x) => x.rankingRewardId >= 35300 && x.rankingRewardId < 35308);
  assert.deepStrictEqual(mc.rankedOf(rows2100, rew2100).thresholds.map((x) => x.score), MONTH_T['2017-05'][0]);
});

test('era17 per-month fit: each data month reproduces its own points within x / ÷ 1.15; method by the points\' rank span', () => {
  const E = mc.ERA17;
  assert.ok(E.monthTolerance > 1 && E.monthTolerance < E.tolerance && E.monthTolerance <= 1.15, `month tolerance ${E.monthTolerance}`);
  assert.deepStrictEqual(Object.keys(E.months), ['2017-05', '2017-06', '2017-07', '2017-09', '2017-10', '2017-11', '2017-12'], 'the months with season-end points');
  for (const [m, c] of Object.entries(E.months)) {
    assert.deepStrictEqual(c.points, E.points.filter((p) => p[0] === m), `${m}: its own points only`);
    const ranks = c.points.map((p) => p[1]), span = Math.log10(Math.max(...ranks) / Math.min(...ranks));
    assert.strictEqual(c.method, span >= 1 ? 'own fit' : 'era slope, own intercept', `${m} method`);
    if (span < 1) assert.strictEqual(c.b, E.b, `${m}: the era slope`);
    assert.ok(c.b < 0, `${m}: rounds go down with the rank`);
    for (const [, rank, round, src] of c.points) {
      const f = c.curve(rank), k = Math.max(round / f, f / round);
      assert.ok(k <= E.monthTolerance, `${m} rank ${rank}: recorded ${round}, month curve ${f.toFixed(0)} (x ${k.toFixed(2)}) ${src}`);
    }
    // guard: outside its points' ranks the month curve follows the era slope from its value at the nearest point
    const lo = Math.min(...ranks), hi = Math.max(...ranks);
    for (const r of [10, 100, 1000, 2500, 10000]) {
      if (r >= lo && r <= hi) continue;
      const edge = r < lo ? lo : hi, want = c.curve(edge) * (r / edge) ** E.b;
      assert.ok(Math.abs(c.curve(r) - want) < 1e-6 * want, `${m} rank ${r}: era slope from rank ${edge}`);
    }
  }
});

test('era17 guard: 2017-07 rank 100 = the era slope from its rank-991 point (not its own steep fit extrapolated)', () => {
  const E = mc.ERA17, c = E.months['2017-07'], want = 10 ** (c.a + c.b * Math.log10(991)) * (100 / 991) ** E.b;
  assert.ok(Math.abs(want - 1127) < 10, `era slope from 991: ${want.toFixed(0)}`);
  assert.strictEqual(c.round(100), Math.round(want));
  assert.ok(c.round(100) < 1527 * 0.8, 'no longer the extrapolated own fit');
});

test('era17 fit: every recorded season-end point within the stated tolerance; the points = CUTOFFS_2017.md (when on disk)', () => {
  const E = mc.ERA17;
  assert.ok(E.points.length >= 20, `${E.points.length} fit points`);
  assert.ok(E.tolerance > 1 && E.tolerance <= 3, `tolerance x/÷ ${E.tolerance}`);
  for (const [month, rank, round, src] of E.points) {
    const f = E.curve(rank), k = Math.max(round / f, f / round);
    assert.ok(k <= E.tolerance, `${month} rank ${rank}: recorded ${round}, curve ${f.toFixed(0)} (x ${k.toFixed(2)} > ${E.tolerance}) ${src}`);
    assert.ok(month >= '2017-05' && month <= '2018-03', `${month} inside the era`);
  }
  // the fit itself: least squares of log10(round) on log10(rank) over the points
  const xs = E.points.map((p) => Math.log10(p[1])), ys = E.points.map((p) => Math.log10(p[2])), n = xs.length;
  const mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  const b = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  assert.ok(Math.abs(E.b - b) < 1e-9 && Math.abs(E.a - (my - b * mx)) < 1e-9, 'a / b = the least-squares fit');
  assert.deepStrictEqual([E.a.toFixed(4), E.b.toFixed(4)], ['3.5122', '-0.1509'], 'the values stated in the module comment');
  const file = 'D:\\Progetto_Restauro_KH_UX\\private\\events\\sources\\coliseum\\CUTOFFS_2017.md';
  if (!fs.existsSync(file)) { results.push('skip era17 CUTOFFS_2017.md: private file not on disk'); return; }
  const fit = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.split('|').map((c) => c.trim())).filter((c) => c[7] === 'fit')
    .map((c) => [c[2], Number(c[3].replace(/[~,]/g, '')), Number(c[5].replace(/,/g, ''))]);
  assert.deepStrictEqual(fit, E.points.map((p) => p.slice(0, 3)), 'the module points = the fit rows of CUTOFFS_2017.md');
});

// the real sources: the ReLux extract (private) and our medal master; 800 .. 1600 compared with the served master when it is on disk
test('real_part3 (2017-05 .. 2018-03 from the ReLux extract, every head..term tier)', () => {
  const src = mc.readSource(process.env.KHUX_COLOSSEUM_SRC || mc.DEFAULT_2016);
  const relux = mc.readRelux(process.env.KHUX_COLOSSEUM_RELUX || mc.DEFAULT_RELUX);
  if (!src || !relux) { results.push('skip real_part3: 1.1.3 master or ReLux extract not on disk'); return; }
  src.relux = relux;
  src.masterEnemyIds = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemy.json'), 'utf8')).map((r) => r.enemyId);
  const P3 = mc.SEASONS.filter((s) => s.colosseumStageId >= 2100 && s.colosseumStageId <= 3100).map((s) => s.colosseumStageId);
  assert.deepStrictEqual(P3, [2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100]);
  const out = withRanking(P3, () => mc.seasonRows(src, mc.SEASONS.filter((s) => s.colosseumStageId <= 3100)));
  assert.strictEqual(out.colosseumStage.length, 24);
  const cs = (id) => out.colosseumStage.find((r) => r.colosseumStageId === id);
  const tiersOf = (id) => out.colosseum.filter((r) => r.colosseumStageId === id);
  P3.forEach((id, i) => {
    assert.strictEqual(tiersOf(id).length, 22, `${id}: 22 tiers`);
    assert.strictEqual(cs(id).rankingId, 4022 + i, `${id} rankingId`);
    assert.ok(tiersOf(id).every((r) => r.ap === 0), `${id}: AP 0`);
    const s = relux.colosseumStage.find((r) => r.colosseumStageId === id);
    assert.strictEqual(cs(id).termColosseumId, s.termColosseumId, `${id} term`);
    const o = relux.colosseum.filter((r) => r.colosseumStageId === id && r.colosseumId >= s.headColosseumId && r.colosseumId <= s.termColosseumId);
    assert.deepStrictEqual(tiersOf(id).map((r) => [r.arrivalStageCount, r.excellentUnlockCount, r.stageRewardNum, r.validReward, r.rewardType.slice(0, r.validReward), r.rewardId.slice(0, r.validReward), r.rewardNum.slice(0, r.validReward)]),
      o.map((r) => [r.arrivalStageCount, r.excellentUnlockCount, r.stageRewardNum, r.validReward, r.rewardType.slice(0, r.validReward), r.rewardId.slice(0, r.validReward), r.rewardNum.slice(0, r.validReward)]), `${id} tiers = ReLux`);
    const gen = mc.SEASONS.find((x) => x.colosseumStageId === id).genStages;
    assert.deepStrictEqual(cs(id).stageId, gen ? mc.GEN_STAGE_IDS(mc.SEASONS.find((x) => x.colosseumStageId === id).month) : s.stageId, `${id} stage set`);
  });
  assert.deepStrictEqual([2100, 2900, 3000, 3100].map((id) => cs(id).stageId[0]), [20161001, 20170601, 20170701, 20170801], 'the JP sets');
  // Task 4: the boards of each month = its ReLux rows, renumbered; avatar M / F 19 nodes / 1100 coins to 2017-11, one both-gender
  // board 19 / 3500 from 2017-12, Tier 10 Bonus 3090, Tier 11 Bonus 3390; START at row 4 column 0, the top-left 2 x 2 empty
  const donor = new Map(relux.sphere.map((r) => [r.sphereBoardId, r]));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  for (const sid of P3) {
    const ids = mc.SEASON_BOARDS[sid];
    assert.strictEqual(ids.length, sid <= 2700 ? 4 : 3, `${sid} board count`);
    assert.deepStrictEqual(out.sphere.filter((r) => ids.includes(r.sphereBoardId)).map((r) => r.sphereBoardId), ids, `${sid} boards served`);
    for (const id of ids) {
      const s = out.sphere.find((r) => r.sphereBoardId === id), m = out.sphereMasu.find((r) => r.masuId === id), a = out.sphereArray.find((r) => r.arryId === id);
      const nodes = m.spherePoint.slice(0, 22).filter((p) => p > 0).length, coins = sum(m.spherePoint.slice(0, 22)), bonus = mc.BONUS_TIER[id];
      assert.deepStrictEqual([s.boardName, s.kindId], [donor.get(id).boardName, donor.get(id).kindId], `${id} from its ReLux row`);
      if (bonus) assert.strictEqual(s.boardName, `Tier ${bonus} Bonus`, `${id} bonus name`);
      else assert.ok(sid <= 2700 ? [1, 2].includes(s.kindId) : s.kindId === 0, `${id}: M / F to 2017-11, both genders from 2017-12`);
      assert.deepStrictEqual([nodes, coins], [19, bonus === 11 ? 3390 : bonus === 10 ? 3090 : sid <= 2700 ? 1100 : 3500], `${id} nodes / coins`);
      assert.strictEqual(a.spCol4[0], 1000, `${id} START`);
      assert.deepStrictEqual([a.spCol0[0], a.spCol0[1], a.spCol1[0], a.spCol1[1]], [0, 0, 0, 0], `${id} corner`);
      assert.deepStrictEqual([s.arryId, s.masuId, m.sphereBoardId, s.type], [id, id, id, 3], `${id} renumbered`);
    }
  }
  // Puppy Medium / Puppy Bob (2018-01) were JP only (private PUPPY_BOARDS.md): no such board
  assert.ok(!out.sphere.some((r) => /Puppy (Medium|Bob)$/.test(r.boardName)), 'no Puppy Medium / Puppy Bob board');
  // 2017-12 Blue Reinstar: Spirit-part cells (type 33), each part in our petParts master
  const parts = new Set(JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'petParts.json'), 'utf8')).map((r) => r.petPartsId));
  const blue = out.sphereMasu.find((r) => r.masuId === 2210095);
  const spirit = blue.rewardSelect.map((t, i) => (t === 33 ? blue.rewardId[i] : 0)).filter(Boolean);
  assert.deepStrictEqual(spirit, [304014, 303014, 308014, 306014, 309014], 'the five Blue Reinstar parts');
  for (const id of spirit) assert.ok(parts.has(id), `Spirit part ${id} in petParts`);
  assert.deepStrictEqual(tiersOf(2400).map((r) => r.excellentUnlockCount), [36, 32, 32, 28, 28, 28, 28, 24, 24, 24, 18, 16, 9, 4, 3, 3, 3, 3, 3, 3, 3, 3], '2017-08: the ReLux skips');
  assert.strictEqual(tiersOf(2700)[0].excellentUnlockCount, 53, '2017-11 Tier 1 skip 53');
  // every tier medal of the served rows (Part 2 and 3) in our medal master, by name: Moogle 3/5/6★, Cid 6★, Magic Mirror
  const medals = new Map(JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'medal.json'), 'utf8')).map((r) => [r.medalId, r]));
  const names = { 90013: 'Moogle', 90015: 'Moogle', 90016: 'Moogle', 90076: 'Cid', 90156: 'Magic Mirror' };
  const used = new Set();
  for (const r of out.colosseum) {
    for (let i = 0; i < r.validReward; i++) {
      assert.ok([3, 17].includes(r.rewardType[i]), `${r.colosseumId} reward type ${r.rewardType[i]}`);
      if (r.rewardType[i] === 3) { used.add(r.rewardId[i]); assert.ok(medals.has(r.rewardId[i]), `${r.colosseumId} medal ${r.rewardId[i]} in our master`); }
      if (r.rewardType[i] === 17) assert.ok(r.rewardNum[i] <= 3000, `${r.colosseumId} coins ${r.rewardNum[i]}`);
    }
  }
  for (const id of used) assert.strictEqual(medals.get(id).name, names[id], `medal ${id} = ${names[id]} (ReLux id = ours)`);
  // stages: unique ids, the 2017 generated ids disjoint from the 2016 ones
  const ids = out.colosseumStage.flatMap((r) => r.stageId.slice(0, r.validStage));
  assert.strictEqual(ids.length, 240); assert.strictEqual(new Set(ids).size, 240);
  assert.strictEqual(new Set(out.stage.map((r) => r.id)).size, 240);
  // the Part 2 seasons: every head..term tier (1600 eleven, 1700 .. 1900 fifteen, 2000 twenty-one); thresholds unchanged
  assert.deepStrictEqual([1500, 1600, 1700, 1800, 1900, 2000].map((id) => tiersOf(id).length), [11, 11, 15, 15, 15, 21]);
  for (const id of [1600, 1700, 1800, 1900, 2000]) assert.deepStrictEqual(out.ranked[id].thresholds.map((x) => x.score), [74, 86, 103, 115, 144, 169, 185, 226], `${id} thresholds`);
  // a one-turn clear of 2017-11 Tier 1 Round 1 opens 53 rounds across tiers 1 .. 4
  const t2700 = R.tiersOf({ stage: cs(2700), tiers: tiersOf(2700) }), st = R.seasonState({}, 2700);
  R.clear(t2700, st, { tier: 1, round: 1, oneTurn: true }, 'T');
  assert.deepStrictEqual(R.playable(t2700, st).map((p) => p.tier).filter((t, i, a) => a.indexOf(t) === i), [1, 2, 3, 4]);
  // 800 .. 1600 identical to the served master (written before the tier change), when it holds them
  let master = null;
  try { master = { colosseum: JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'colosseum.json'), 'utf8')), colosseumStage: JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'colosseumStage.json'), 'utf8')) }; } catch { /* none */ }
  const OLD = [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600];
  if (master && OLD.every((id) => master.colosseumStage.some((r) => r.colosseumStageId === id))) {
    for (const id of OLD) {
      assert.strictEqual(JSON.stringify(tiersOf(id)), JSON.stringify(master.colosseum.filter((r) => r.colosseumStageId === id)), `${id} tier rows byte-identical`);
      assert.strictEqual(JSON.stringify(cs(id)), JSON.stringify(master.colosseumStage.find((r) => r.colosseumStageId === id)), `${id} season row byte-identical`);
    }
  } else results.push('skip real_part3 byte check: no served master with 800 .. 1600');
});

// Coliseum Part 3b Task 1: the lump-sum era 2018-04 .. 2019-04 (ReLux rows 3200 .. 4400): tiers, the lump sums, the mapped medals
test('real_part3b (2018-04 .. 2019-04 from the ReLux extract: tiers, lump sums, Broom / Mickey B / Moon Gem)', () => {
  const src = mc.readSource(process.env.KHUX_COLOSSEUM_SRC || mc.DEFAULT_2016);
  const relux = mc.readRelux(process.env.KHUX_COLOSSEUM_RELUX || mc.DEFAULT_RELUX);
  if (!src || !relux) { results.push('skip real_part3b: 1.1.3 master or ReLux extract not on disk (private sources)'); return; }
  src.relux = relux;
  src.masterEnemyIds = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemy.json'), 'utf8')).map((r) => r.enemyId);
  const medalRows = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'medal.json'), 'utf8'));
  const medals = new Map(medalRows.map((r) => [r.medalId, r]));
  const P3B = [3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900, 4000, 4100, 4200, 4300, 4400];
  assert.deepStrictEqual(mc.SEASONS.filter((s) => s.colosseumStageId > 3100).map((s) => s.colosseumStageId), P3B);
  assert.strictEqual(mc.SEASONS.length, 37);
  assert.deepStrictEqual(mc.RELUX_MEDAL, { 90135: 300948, 90136: 300913 });
  const before = mc.SEASONS.filter((s) => s.colosseumStageId <= 3100);
  const outOld = withRanking(before.map((s) => s.colosseumStageId), () => mc.seasonRows(src, before));
  const out = withRanking(mc.SEASONS.map((s) => s.colosseumStageId), () => mc.seasonRows(src, mc.SEASONS));
  assert.strictEqual(out.colosseumStage.length, 37);
  const cs = (id) => out.colosseumStage.find((r) => r.colosseumStageId === id);
  const tiersOf = (id) => out.colosseum.filter((r) => r.colosseumStageId === id);
  const FIN = [20, 15, 15, 10, 10, 10, 10, 10, 10, 10, 50, 100, 300, 500, 500];
  const COIN9000 = [50, 85, 125, 140, 200, 200, 200, 250, 250, 1000, 1500, 2000, 3000], COIN8100 = [50, 85, 125, 140, 200, 200, 200, 250, 250, 700, 1400, 1500, 3000];
  const coinOf = (r) => { const i = r.rewardType.slice(0, r.validReward).indexOf(17); return i < 0 ? 0 : r.rewardNum[i]; };
  assert.strictEqual(FIN.reduce((a, b) => a + b, 0), 1570);
  P3B.forEach((id, i) => {
    const t = tiersOf(id);
    assert.strictEqual(t.length, id <= 3300 ? 22 : 23, `${id} tier count`);
    assert.strictEqual(cs(id).rankingId, 4033 + i, `${id} rankingId`);
    assert.ok(t.every((r) => r.arrivalStageCount > 0), `${id}: no 0-round tier`);
    assert.strictEqual(cs(id).termColosseumId, t[t.length - 1].colosseumId, `${id} term = the last tier served`);
    assert.deepStrictEqual(t.slice(0, 15).map((r) => r.arrivalStageCount), FIN, `${id} finite rounds (1,570)`);
    assert.ok(t.slice(15).every((r) => r.arrivalStageCount === 999), `${id}: 999-round tiers after T15`);
    assert.ok(t.every((r) => r.ap === 0), `${id} AP 0`);
    assert.deepStrictEqual(t.slice(0, 13).map(coinOf), id === 3200 ? COIN9000 : COIN8100, `${id} tier coins`);
    assert.strictEqual(t.slice(0, 13).map(coinOf).reduce((a, b) => a + b, 0), id === 3200 ? 9000 : 8100);
    assert.deepStrictEqual([t[14].rewardType[0], t[14].rewardId[0], t[14].rewardNum[0], t[14].validReward], [5, 52, 1, 1], `${id} T15 = Moon Gem`);
    if (id <= 3900) {
      assert.deepStrictEqual(t.slice(0, 5).map((r) => [r.validStageReward, r.stageRewardNum]), [[1, 1], [1, 3], [1, 5], [1, 7], [1, 10]], `${id}: per-round coins 1 / 3 / 5 / 7 / 10`);
      assert.ok(t.slice(4).every((r) => r.validStageReward === 1 && r.stageRewardNum === 10), `${id} 10 per round from Tier 5`);
    } else {
      for (const r of t) {
        assert.strictEqual(r.validStageReward, 0, `${id} T${r.round}: no round coins (validStageReward 0)`);
        assert.ok([r.stageRewardType, r.stageRewardId, r.stageRewardAssignType, r.stageRewardSkillId, r.stageRewardSkillLv, r.stageRewardNum].every((v) => v === 0), `${id} T${r.round}: stageReward* zeroed`);
      }
    }
  });
  assert.deepStrictEqual(tiersOf(3500).map((r) => r.excellentUnlockCount).slice(14, 18), [99, 99, 50, 10], '2018-07: T17 = 50 as ReLux');
  // every type-3 reward is one of our medals: no ReLux-only 90135 / 90136 left; Broom / Mickey B by name
  const have = medals.has(300948) && medals.has(300913);
  const used = new Set();
  for (const id of P3B) for (const r of tiersOf(id)) for (let i = 0; i < r.validReward; i++) if (r.rewardType[i] === 3) used.add(r.rewardId[i]);
  assert.ok(!used.has(90135) && !used.has(90136), 'no ReLux-only medal id left');
  assert.ok(used.has(300948) && used.has(300913), 'Magic Broom and Fantasia Mickey B paid');
  const reluxT13 = relux.colosseum.find((r) => r.colosseumStageId === 3200 && r.round === 13);
  assert.strictEqual(reluxT13.rewardId[1], 90135, 'the source row pays the ReLux id');
  assert.deepStrictEqual([tiersOf(3200)[12].rewardId[1], tiersOf(3200)[13].rewardId[0], tiersOf(4000)[10].rewardId[1], tiersOf(4000)[12].rewardId[1], tiersOf(4000)[13].rewardId[0]],
    [300948, 300948, 300948, 300913, 300913], 'Broom on 3200 T13 / T14 and 4000 T11, Mickey B on 4000 T13 / T14');
  if (have) {
    for (const id of used) assert.ok(medals.has(id), `medal ${id} in our medal master`);
    assert.deepStrictEqual([medals.get(300948).name, medals.get(300913).name], ['Magic Broom', 'Fantasia Mickey B']);
  } else results.push('skip real_part3b medal master check: 300948 / 300913 only exist in a master built with KHUX_MEDALS_ALL=1');
  // the build stops on a ReLux medal id that is neither mapped nor in our medal master, and on a mapped one our master lacks
  const ids = new Set(medalRows.map((r) => r.medalId)); ids.add(300948); ids.add(300913);
  const only3200 = mc.SEASONS.filter((s) => s.colosseumStageId === 3200);
  const bogus = { ...relux, colosseum: relux.colosseum.map((r) => (r.colosseumStageId === 3200 && r.round === 1 ? { ...r, rewardId: [r.rewardId[0], 99999999, ...r.rewardId.slice(2)] } : r)) };
  assert.throws(() => withRanking([3200], () => mc.seasonRows({ ...src, relux: bogus, masterMedalIds: ids }, only3200)), /99999999.*not in our medal master/);
  assert.ok(withRanking([3200], () => mc.seasonRows({ ...src, masterMedalIds: ids }, only3200)), 'with the mapped medals in the master it builds');
  assert.throws(() => withRanking([3200], () => mc.seasonRows({ ...src, masterMedalIds: new Set([...ids].filter((m) => m !== 300948)) }, only3200)), /300948.*KHUX_MEDALS_ALL/);
  // Task 4: the boards of the 13 seasons = their ReLux rows; START at row 4 column 0, the top-left 2 x 2 empty; cells without 90135
  const donor = new Map(relux.sphere.map((r) => [r.sphereBoardId, r]));
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const P3B_TOTAL = { 3200: [3500, 3090, 3390], 3900: [3500, 3090, 3390], 4000: [1230, 1470, 1900, 3500], 4400: [1230, 1470, 1900, 3500] };
  for (const sid of P3B) {
    const ids = mc.SEASON_BOARDS[sid];
    assert.strictEqual(ids.length, sid <= 3900 ? 3 : 4, `${sid} board count`);
    assert.deepStrictEqual(out.sphere.filter((r) => ids.includes(r.sphereBoardId)).map((r) => r.sphereBoardId), ids, `${sid} boards served`);
    const tot = ids.map((id) => sum(out.sphereMasu.find((r) => r.masuId === id).spherePoint.slice(0, 22)));
    if (P3B_TOTAL[sid]) assert.deepStrictEqual(tot, P3B_TOTAL[sid], `${sid} board totals`);
    if (sid >= 4000) assert.strictEqual(sum(tot), 8100, `${sid}: the board totals = the tier coins`);
    for (const id of ids) {
      const s = out.sphere.find((r) => r.sphereBoardId === id), m = out.sphereMasu.find((r) => r.masuId === id), a = out.sphereArray.find((r) => r.arryId === id);
      assert.deepStrictEqual([s.boardName, s.kindId, s.type], [donor.get(id).boardName, 0, 3], `${id} from its ReLux row`);
      const bonus = mc.BONUS_TIER[id];
      if (bonus) assert.strictEqual(s.boardName, `Tier ${bonus} Bonus`, `${id} bonus name`);
      assert.strictEqual(a.spCol4[0], 1000, `${id} START`);
      assert.deepStrictEqual([a.spCol0[0], a.spCol0[1], a.spCol1[0], a.spCol1[1]], [0, 0, 0, 0], `${id} corner`);
      assert.deepStrictEqual([s.arryId, s.masuId, m.sphereBoardId], [id, id, id], `${id} renumbered`);
      const medalCells = m.rewardSelect.map((t, i) => (t === 3 ? m.rewardId[i] : 0)).filter(Boolean);
      assert.ok(!medalCells.includes(90135) && !medalCells.includes(90136), `${id}: no ReLux-only medal in a cell`);
    }
  }
  // the 90135 cells of the Tier 11 / 12 / 13 Bonus boards pay Magic Broom (the source rows pay the ReLux id)
  const srcMasu = (id) => relux.sphereMasu.find((r) => r.sphereBoardId === id);
  assert.strictEqual(srcMasu(2210132).rewardId[10], 90135, 'the source cell pays the ReLux id');
  assert.strictEqual(out.sphereMasu.find((r) => r.masuId === 2210132).rewardId[10], 300948, 'cell 10 of 2210132 = Magic Broom');
  assert.strictEqual(out.sphereMasu.find((r) => r.masuId === 2210134).rewardId[7], 300948, 'cell 7 of 2210134 = Magic Broom');
  // the cell medals are checked like the tier medals: a mapped one our medal master lacks stops the build
  const only4000 = mc.SEASONS.filter((s) => s.colosseumStageId === 4000);
  assert.throws(() => withRanking([4000], () => mc.seasonRows({ ...src, masterMedalIds: new Set([...ids].filter((m) => m !== 300948)) }, only4000)), /300948/);
  // an unmapped cell medal our master lacks stops the build too; with the medals in the master every cell medal of the 44 boards is ours
  const bogusCell = { ...relux, sphereMasu: relux.sphereMasu.map((r) => (r.sphereBoardId === 2210131 ? { ...r, rewardId: r.rewardId.map((v, i) => (i === 1 ? 99999998 : v)) } : r)) };
  assert.throws(() => withRanking([4000], () => mc.seasonRows({ ...src, relux: bogusCell, masterMedalIds: ids }, only4000)), /board 2210131 cell 1 pays medal 99999998/);
  if (have) {
    for (const r of out.sphereMasu.filter((x) => x.masuId >= 2210107 && x.masuId <= 2210150)) {
      r.rewardSelect.forEach((t, i) => { if (t === 3) assert.ok(medals.has(r.rewardId[i]), `board ${r.masuId} cell ${i} medal ${r.rewardId[i]} in our medal master`); });
    }
  } else results.push('skip real_part3b cell medal master check: 300948 / 300913 only exist in a master built with KHUX_MEDALS_ALL=1');
  // the Part 1-3 seasons: the same rows with or without the new seasons, and the same as the served master
  for (const t of ['colosseumStage', 'colosseum']) {
    assert.strictEqual(JSON.stringify(out[t].filter((r) => r.colosseumStageId <= 3100)), JSON.stringify(outOld[t]), `${t}: Part 1-3 rows unchanged`);
  }
  for (const t of ['stage', 'ranking', 'rankingReward', 'sphere', 'sphereArray', 'sphereMasu']) {
    const now = new Set(out[t].map((r) => JSON.stringify(r)));
    assert.ok(outOld[t].every((r) => now.has(JSON.stringify(r))), `${t}: Part 1-3 rows unchanged`);
  }
  let master = null;
  try { master = { colosseum: JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'colosseum.json'), 'utf8')), colosseumStage: JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'colosseumStage.json'), 'utf8')) }; } catch { /* none */ }
  const OLD = before.map((s) => s.colosseumStageId);
  if (master && OLD.every((id) => master.colosseumStage.some((r) => r.colosseumStageId === id))) {
    for (const id of OLD) {
      assert.strictEqual(JSON.stringify(tiersOf(id)), JSON.stringify(master.colosseum.filter((r) => r.colosseumStageId === id)), `${id} tier rows byte-identical to the served master`);
      assert.strictEqual(JSON.stringify(cs(id)), JSON.stringify(master.colosseumStage.find((r) => r.colosseumStageId === id)), `${id} season row byte-identical to the served master`);
    }
  } else results.push('skip real_part3b byte check: no served master with the 24 seasons');
  // skip 99 lump sums, on the real rows of 2018-12: a one-turn clear of T1 R1 opens rounds 2 .. 100; clearing round 100 (the end of T8)
  // pays the lump sums of T1 .. T8 (50 + 85 + 125 + 140 + 200 + 200 + 200 + 250 = 1,250) once and no round coin
  const t4000 = R.tiersOf({ stage: cs(4000), tiers: tiersOf(4000) }), st = R.seasonState({}, 4000);
  assert.strictEqual(R.clear(t4000, st, { tier: 1, round: 1, oneTurn: true }, 'T').coins, 0, 'T1 R1: no round coin on 4000');
  assert.deepStrictEqual([st.last, st.open], [1, 100]);
  assert.deepStrictEqual(R.tierRound(t4000, 100), { tier: 8, round: 10 });
  const res = R.clear(t4000, st, { tier: 8, round: 10, oneTurn: false }, 'T');
  assert.ok(res.ok); assert.strictEqual(res.cleared.length, 99);
  assert.deepStrictEqual(res.tierRewards, [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.strictEqual(res.coins, 50 + 85 + 125 + 140 + 200 + 200 + 200 + 250, 'the T1-T8 lump sums, no round coin');
  assert.strictEqual(res.coins, 1250);
  assert.strictEqual(R.clear(t4000, st, { tier: 8, round: 10, oneTurn: false }, 'T').ok, false, 'paid once');
  // no round coins 2018-12 .. 2019-04: a clear lists the round, the coins change only on a tier completion (T1 ends at round 20)
  for (const id of [4000, 4100, 4400]) {
    const tt = R.tiersOf({ stage: cs(id), tiers: tiersOf(id) }), s2 = R.seasonState({}, id);
    for (let n = 1; n <= 20; n++) {
      const r = R.tierRound(tt, n), c = R.clear(tt, s2, { tier: r.tier, round: r.round, oneTurn: false }, 'T');
      assert.ok(c.ok && c.cleared.length === 1, `${id} round ${n}`);
      assert.strictEqual(c.coins, n === 20 ? 50 : 0, `${id} round ${n}: coins only when T1 completes`);
    }
    assert.strictEqual(s2.coins, 50);
  }
  // 2018-11 still pays per round (1 coin in T1)
  const t3900 = R.tiersOf({ stage: cs(3900), tiers: tiersOf(3900) });
  assert.strictEqual(R.clear(t3900, R.seasonState({}, 3900), { tier: 1, round: 1, oneTurn: false }, 'T').coins, 1);
  // tier rewards mapped: the detail page of 2018-12 names Magic Broom, Fantasia Mickey B and Moon Gem (names as server.js boardRewardName)
  const materials = new Map(JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'material.json'), 'utf8')).map((r) => [r.materialId, r]));
  assert.strictEqual(materials.get(52).name, 'Moon Gem');
  const nameOf = (type, id) => (type === 3 ? (medals.get(id) || {}).name : type === 5 ? (materials.get(id) || {}).name : '') || '';
  const dTiers = t4000.map((t) => ({ tier: t.tier, rounds: t.rounds, endless: t.rounds >= 999, ap: 0, roundCoins: 0,
    coins: t.tierReward.filter((x) => x.type === 17).reduce((a, x) => a + x.num, 0), items: t.tierReward.filter((x) => x.type !== 17), taken: false }));
  const det = { boards: [], tiers: dTiers, best: 0, ranked: [], maps: 'japanese' };
  const html = pages.detailPage([{ colosseumStageId: 4000, month: '2018-12', state: 'can', tiers: 23, apMin: 0, apMax: 0, boardIds: [], coins: 0, userRank: 1, userStageCount: 0, userStageTotalCount: 0, tierRewards: [] }], 4000, det,
    { unlocked: true, imgVersion: 3, boardName: () => null, unlockQuestOf: () => null, itemName: nameOf });
  assert.ok(html, 'the detail page of 4000 renders');
  const tiersHtml = html.slice(html.indexOf('id="sec-tiers"'), html.indexOf('id="sec-ranked"'));
  assert.ok(tiersHtml.includes('Moon Gem'), 'T15: Moon Gem');
  if (have) assert.ok(tiersHtml.includes('Magic Broom') && tiersHtml.includes('Fantasia Mickey B'), 'Broom / Mickey B named');
  else results.push('skip real_part3b detail names of the medals: 300948 / 300913 not in this medal master');
});

// ---- Coliseum Part 3 Task 3: month ids, the raw ReLux enemy table, month copies ----
const SOURCES3 = ['113', 'relux', 'monthCopy', 'rule'];
const OLD6 = [1, 35, 100, 300, 999, 9999], OLD17 = [1, 100, 300, 600, 9999, 99999], NEW19 = [1, 1400, 2600, 3100, 3200, 9999];
const PAD = [1768055072, 1769236844, 1948283749];
// a raw ReLux row: full-length arrays, binary padding past validGrowth as in the donor table
const rawRow = (id, name, knots, hp, atk, extra = {}) => {
  const pad = (a) => [...a, ...PAD, ...PAD].slice(0, 6);
  return { enemyId: id, name, displayId: id % 100000 % 20000 || id, validGrowth: knots.length, baseLv: pad(knots), hp: pad(hp), attack: pad(atk),
    defense: pad(knots.map(() => 900)), exp: pad(knots.map(() => 1)), money: pad(knots.map(() => 13)), raidPoint: pad(knots.map(() => 0)), lux: pad(knots.map(() => 1)),
    score: pad(knots.map(() => 500)), validSkill: 1, skillId: [100, ...PAD], ...extra };
};
test('reluxShape: old curves, the 2019 revamp, corrupt rows', () => {
  assert.strictEqual(mc.reluxShape(rawRow(97, 'Ringmaster', OLD6, [20000, 51000, 70000, 176000, 766260, 114656559], [1, 2, 3, 4, 5, 6])), 'old');
  assert.strictEqual(mc.reluxShape(rawRow(161020007, 'Large Body', OLD17, [4500, 20766, 157839, 223970, 20662560, 206625600], [1, 2, 3, 4, 5, 6])), 'old');
  assert.strictEqual(mc.reluxShape(rawRow(184, 'Enraged Elk', OLD6.slice(0, 5), [1, 2, 3, 4, 5], [1, 2, 3, 4, 5])), 'old');
  assert.strictEqual(mc.reluxShape(rawRow(20097, 'Ringmaster', NEW19, [12750, 2942545725, 11250909078, 13414547850, 14280000000, 427082287500], [1, 2, 3, 4, 5, 2100000000])), '2019');
  // the old knots with the revamp's ATK cap are not an old row either
  assert.strictEqual(mc.reluxShape(rawRow(20098, 'X', OLD6, [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 2100000000])), '2019');
  // 161020099 Morning Star: three knots, placeholder values, the rest padding
  assert.strictEqual(mc.reluxShape(rawRow(161020099, 'Morning Star', [1, 1400, 9999], [3571429, 5000000000, 35710714286], [1, 2, 3])), 'corrupt');
  assert.strictEqual(mc.reluxShape(rawRow(161020153, 'Ice Plant', [1, 200, 9999], [16000, 10000000, 9999999999], [1, 2, 3])), 'corrupt');
  assert.strictEqual(mc.reluxShape({ ...rawRow(1, 'X', OLD6, [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6]), hp: [1, 2, 8317989504018571000, 4, 5, 6] }), 'corrupt');
  assert.strictEqual(mc.reluxShape(null), 'corrupt');
});

// a fixture of the named cases (PART3_AUDIT.md §4, MISSING17_ENEMIES.md), on the S800 stage ids
function p3EnemyFixture() {
  const m = (id, name, displayId, knots = OLD6.slice(0, 5), hp = [100, 200, 300, 1000, 5000]) => ({ ...knotRow(id, name, knots, hp, knots.map((l) => l)), displayId });
  const masterEnemies = [{ enemyId: 20001 }, { enemyId: 20031 }, m(20007, 'Large Body', 7), m(20099, 'Morning Star', 90), m(20137, 'Wyvern', 137),
    m(20153, 'Ice Plant', 39), m(1500, 'Bunch O\' Balloons', 1500, OLD6.slice(0, 5), [4400, 11500, 17486, 45573, 273438])];
  const raw = [
    rawRow(161020007, 'Large Body', OLD17, [4500, 20766, 157839, 223970, 20662560, 206625600], [950, 2287, 5443, 51289, 2198291, 21982910], { displayId: 7 }),
    rawRow(161020099, 'Morning Star', [1, 1400, 9999], [3571429, 5000000000, 35710714286], [40286, 1128000, 8056338], { displayId: 90 }),
    rawRow(161020137, 'Wyvern', NEW19, [12688, 2928121482, 11195757563, 13348790263, 14210000000, 424988746875], [2973, 1, 2, 3, 4, 2100000000], { displayId: 137 }),
    rawRow(161020153, 'Ice Plant', [1, 200, 9999], [16000, 10000000, 9999999999], [1500, 15000, 99999999], { displayId: 153 }),
    rawRow(97, 'Ringmaster', OLD6, [20000, 51000, 70000, 176000, 766260, 114656559], [1650, 2160, 3120, 6300, 18434, 8531902], { displayId: 97 }),
    rawRow(20097, 'Ringmaster', NEW19, [12750, 2942545725, 11250909078, 13414547850, 14280000000, 427082287500], [2922, 1, 2, 3, 4, 2100000000], { displayId: 97 }),
    rawRow(120097, 'Ringmaster', NEW19, [12750, 2942545725, 11250909078, 13414547850, 14280000000, 427082287500], [2922, 1, 2, 3, 4, 2100000000], { displayId: 97 }),
    rawRow(1557, 'The Good Boy', OLD6, [32049, 101209, 512071, 1126557, 3321215, 378377554], [1784, 2673, 4132, 10563, 23632, 17213742], { displayId: 1557 }),
    rawRow(1500, 'Bunch O\' Balloons', OLD6, [9000, 18000, 30000, 97870, 607220, 9999999], [10, 20, 30, 40, 50, 60], { displayId: 1500 }),
    rawRow(21500, 'Bunch O\' Balloons', NEW19, [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 2100000000], { displayId: 1500 }),
  ];
  const stageEnemies = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [20150701 + i, [20001]]));
  stageEnemies[20150701] = [20001, 161020007, 161020099, 161020137, 161020153];
  stageEnemies[20150702] = [20097, 120097];
  stageEnemies[20150703] = [21557, 21500];
  return { ...fixture(), masterEnemyIds: undefined, masterEnemies, reluxEnemies: raw, stageEnemies };
}

test('Part 3 enemies: 1.1.3, raw ReLux old shape, month copy, rule from an original base; never a 2019 row', () => {
  const src = p3EnemyFixture();
  const out = mc.seasonRows(src, S800);
  const rep = new Map(out.colosseumEnemies.map((e) => [e.enemyId, e]));
  const row = (id) => out.enemy.find((r) => r.enemyId === id);
  assert.deepStrictEqual(out.colosseumEnemies.map((e) => [e.enemyId, e.source]),
    [[20097, 'rule'], [21500, 'rule'], [21557, 'rule'], [29999, '113'], [120097, 'monthCopy'], [161020007, 'relux'], [161020099, 'monthCopy'], [161020137, 'monthCopy'], [161020153, 'monthCopy']]);
  for (const e of out.colosseumEnemies) assert.ok(SOURCES3.includes(e.source), `${e.enemyId} source`);
  assert.strictEqual(rep.get(161020007).label, 'colosseumEnemyRelux');
  assert.strictEqual(rep.get(161020099).label, 'colosseumEnemyMonthCopy');
  assert.strictEqual(rep.get(20097).label, 'colosseumEnemyRule');
  // the raw row, arrays cut at validGrowth (no padding served)
  assert.deepStrictEqual(row(161020007).hp, [4500, 20766, 157839, 223970, 20662560, 206625600]);
  assert.deepStrictEqual(row(161020007).skillId, [100, 0, 0, 0]);
  // month copies: the base row with the new id and the base's displayId; why the raw row was refused is reported
  const base99 = src.masterEnemies.find((r) => r.enemyId === 20099);
  assert.deepStrictEqual({ ...row(161020099), enemyId: 20099 }, mc.schemaRowOf('enemy', base99));
  assert.strictEqual(row(161020099).displayId, 90);
  assert.strictEqual(row(161020153).displayId, 39, 'Ice Plant: the base displayId, not the raw 153');
  assert.deepStrictEqual([rep.get(161020099).base, rep.get(161020099).reluxShape], [20099, 'corrupt']);
  assert.deepStrictEqual([rep.get(161020137).base, rep.get(161020137).reluxShape], [20137, '2019']);
  // Ringmaster: 20097 = rule from the raw ReLux base 97 (old shape), not its 2019 row; 120097 = month copy of that rule row
  assert.deepStrictEqual([rep.get(20097).base, rep.get(20097).baseSource, rep.get(20097).reluxShape], [97, 'relux', '2019']);
  assertRule(row(20097), mc.schemaRowOf('enemy', src.reluxEnemies.find((r) => r.enemyId === 97), true));
  assert.deepStrictEqual({ ...row(120097), enemyId: 20097 }, row(20097));
  assert.deepStrictEqual([rep.get(120097).base, rep.get(120097).reluxShape], [20097, '2019']);
  // 21557: no row of the id anywhere, rule from the raw base 1557 «The Good Boy», the name declared as inferred
  assert.strictEqual(row(21557).name, 'The Good Boy');
  assert.deepStrictEqual([rep.get(21557).base, rep.get(21557).baseSource, rep.get(21557).nameInferred], [1557, 'relux', true]);
  assert.ok(!rep.get(20097).nameInferred, 'a refused raw row of the id still confirms the name');
  // the raw ReLux base (original) wins over our master's clone base
  assert.deepStrictEqual([rep.get(21500).baseSource, row(21500).hp[3]], ['relux', 3 * 97870]);
  // no 2019-revamp values in any row
  for (const r of out.enemy) {
    const lv = r.baseLv.slice(0, r.validGrowth);
    assert.ok(!lv.some((l) => [1400, 2600, 3100, 3200].includes(l)) && Math.max(...r.attack) < 2100000000, `${r.enemyId}: no 2019 row`);
  }
  // the master rows are never written again
  assert.ok(!out.enemy.some((r) => src.masterEnemies.some((m) => m.enemyId === r.enemyId)));
});

test('month ids: accepted only with a YYMM / 1 prefix on a Coliseum base; no source still stops', () => {
  const src = p3EnemyFixture();
  // a month id whose base has no row anywhere: the documented stop
  assert.throws(() => mc.seasonRows({ ...src, stageEnemies: { ...src.stageEnemies, 20150704: [161020017] } }, S800),
    /161020017.*20150704.*decided per enemy as for the raids.*docs\/notes\/coliseum\.md/);
  // not a month id (bad month, not a Coliseum base): refused as before
  for (const id of [161320007, 1510228138, 161000007]) {
    assert.throws(() => mc.seasonRows({ ...src, stageEnemies: { ...src.stageEnemies, 20150704: [id] } }, S800), new RegExp(`${id}.*not a Coliseum variant id`));
  }
  // a 2019-shape raw row with no base: stops (never served)
  assert.throws(() => mc.seasonRows({ ...src, reluxEnemies: [...src.reluxEnemies, rawRow(20444, 'X', NEW19, [1, 2, 3, 4, 5, 6], [1, 2, 3, 4, 5, 6])],
    stageEnemies: { ...src.stageEnemies, 20150704: [20444] } }, S800), /20444.*no source/);
  assert.deepStrictEqual(mc.monthBase(161020007), 20007);
  assert.deepStrictEqual(mc.monthBase(120097), 20097);
  assert.deepStrictEqual(mc.monthBase(171020091), 20091);
  assert.deepStrictEqual([mc.monthBase(20097), mc.monthBase(161320007), mc.monthBase(1510228138)], [null, null, null]);
});

test('readReluxEnemies: the raw table (array or {enemy: []}) or the {rows} extract, null when not readable', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-colosseum-'));
  try {
    const f = (n, j) => { const p = path.join(dir, n); fs.writeFileSync(p, JSON.stringify(j)); return p; };
    assert.deepStrictEqual(mc.readReluxEnemies(f('a.json', [{ enemyId: 1 }])), [{ enemyId: 1 }]);
    assert.deepStrictEqual(mc.readReluxEnemies(f('b.json', { enemy: [{ enemyId: 2 }] })), [{ enemyId: 2 }]);
    assert.deepStrictEqual(mc.readReluxEnemies(f('c.json', { rows: [{ enemyId: 3 }] })), [{ enemyId: 3 }]);
    assert.strictEqual(mc.readReluxEnemies(path.join(dir, 'none.json')), null);
    assert.ok(/server_master[\\/]enemy\.json$/.test(mc.DEFAULT_RELUX_ENEMY), mc.DEFAULT_RELUX_ENEMY);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// the real sources: every enemy id of every served stage of the 24 seasons in the master after patch(); the named cases
test('real_part3_enemies (every enemy id of the 24 seasons, the named cases)', () => {
  const src = mc.readSource(process.env.KHUX_COLOSSEUM_SRC || mc.DEFAULT_2016);
  const relux = mc.readRelux(process.env.KHUX_COLOSSEUM_RELUX || mc.DEFAULT_RELUX);
  const stageEnemies = mc.readStageEnemies(mc.stageEnemyFiles());
  const raw = mc.readReluxEnemies(process.env.KHUX_COLOSSEUM_RELUX_ENEMY || mc.DEFAULT_RELUX_ENEMY);
  if (!src || !relux || !stageEnemies || !raw) { results.push('skip real_part3_enemies: 1.1.3 master, ReLux extracts or stage enemy lists not on disk'); return; }
  // the 48 rows Part 3 adds (Task 3), left out of the served master first: the test reads the same before and after a master regen
  const P3_ADDED = [...mc.PART3_ENEMY_IDS];
  const masterRows = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemy.json'), 'utf8')).filter((r) => !P3_ADDED.includes(r.enemyId));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-colosseum-'));
  const P3 = mc.SEASONS.filter((s) => s.colosseumStageId >= 2100 && s.colosseumStageId <= 3100).map((s) => s.colosseumStageId);
  try {
    fs.writeFileSync(path.join(dir, 'enemy.json'), JSON.stringify(masterRows));
    const out = withRanking(P3, () => mc.patch(dir, { src: { ...src, relux }, stageEnemies, reluxEnemies: raw, seasons: mc.SEASONS.filter((x) => x.colosseumStageId <= 3100) })); // Part 3 alone
    assert.strictEqual(out.colosseumStage.length, 24);
    assert.deepStrictEqual(out.enemyCheck, { checked: true, reason: '', unchecked: [] }, 'every served stage checked');
    const after = new Map(JSON.parse(fs.readFileSync(path.join(dir, 'enemy.json'), 'utf8')).map((r) => [r.enemyId, r]));
    const before = new Map(masterRows.map((r) => [r.enemyId, r]));
    const served = out.colosseumStage.flatMap((r) => r.stageId.slice(0, r.validStage));
    assert.strictEqual(served.length, 240);
    let missing = 0;
    for (const sid of served) {
      assert.ok(stageEnemies[sid] && stageEnemies[sid].length, `stage ${sid}: enemy list`);
      for (const id of stageEnemies[sid]) if (!after.has(id)) missing++;
    }
    assert.strictEqual(missing, 0, 'every enemy of every served stage in the master');
    for (const r of masterRows) assert.deepStrictEqual(after.get(r.enemyId), r, `master row ${r.enemyId} kept as it was`);
    assert.strictEqual(after.size, before.size + out.enemy.length, 'new rows only for missing ids');
    assert.deepStrictEqual(out.enemy.map((r) => r.enemyId), P3_ADDED, 'exactly the Part 3 rows added');
    const rep = new Map(out.colosseumEnemies.map((e) => [e.enemyId, e]));
    const rawById = new Map(raw.map((r) => [r.enemyId, r]));
    for (const e of out.colosseumEnemies) {
      assert.ok(SOURCES3.includes(e.source), `${e.enemyId} ${e.source}`);
      const r = after.get(e.enemyId), lv = r.baseLv.slice(0, r.validGrowth);
      assert.ok(!lv.some((l) => [1400, 2600, 3100, 3200].includes(l)) && Math.max(...r.attack) < 2100000000, `${e.enemyId}: no 2019-revamp row`);
      if (e.source === 'relux') assert.strictEqual(mc.reluxShape(rawById.get(e.enemyId)), 'old', `${e.enemyId}: old-shape raw row`);
      if (e.source === 'rule') assertRule(r, e.baseSource === 'master' ? before.get(e.base) : mc.schemaRowOf('enemy', e.baseSource === '113' ? src.enemy.find((x) => x.enemyId === e.base) : rawById.get(e.base), true));
      if (e.source === 'monthCopy') assert.deepStrictEqual({ ...r, enemyId: e.base }, mc.schemaRowOf('enemy', after.get(e.base)), `${e.enemyId}: copy of ${e.base}`);
    }
    // the named cases (plan Global Constraints)
    const src2017 = (id) => (rep.get(id) || {}).source;
    for (const t of ['007', '011', '015', '022', '033', '036', '059', '092', '093', '110', '116']) assert.strictEqual(src2017(+`161020${t}`), 'relux', `161020${t}`);
    for (const t of ['099', '126', '153', '154', '137']) assert.strictEqual(src2017(+`161020${t}`), 'monthCopy', `161020${t}`);
    assert.strictEqual(after.get(161020007).displayId, after.get(20007).displayId, '161020007: the base displayId');
    assert.strictEqual(after.get(161020153).displayId, after.get(20153).displayId, '161020153: the base displayId');
    assert.deepStrictEqual([src2017(120097), rep.get(120097).base], ['monthCopy', 20097]);
    assert.deepStrictEqual([src2017(20097), rep.get(20097).base, rep.get(20097).baseSource], ['rule', 97, 'relux']);
    // Enraged Elk 20184: an existing master row (kept); added here only when missing, then by the rule from base 184
    if (rep.has(20184)) assert.deepStrictEqual([src2017(20184), rep.get(20184).base], ['rule', 184]);
    else assert.ok(before.has(20184), '20184 in the master');
    const clone = out.colosseumEnemies.filter((e) => e.baseSource === 'master').map((e) => e.enemyId);
    assert.deepStrictEqual(clone, [], 'no rule row on a master (possible clone) base');
    assert.deepStrictEqual(mc.MASTER_BASE_APPROVED, [], 'no approved master base');
    const by = (k) => out.colosseumEnemies.filter((e) => e.source === k).map((e) => e.enemyId);
    results.push(`info real_part3_enemies: ${new Set(served.flatMap((s) => stageEnemies[s])).size} ids over ${served.length} stages; new rows ${out.enemy.length}: `
      + `${SOURCES3.map((k) => `${k} ${JSON.stringify(by(k))}`).join('; ')}; rule rows on a master (clone) base: ${JSON.stringify(clone)}`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---- Coliseum Part 3b Task 3: the enemy rows of 2018-04 .. 2019-04 ----
test('reluxShape HP scale: HP at LV 300 / LV 100 inside the old Coliseum curve band; revamp-scale HP is 2019', () => {
  const row = (hp100, hp300, atk = [1, 2, 3, 4, 5, 6]) => rawRow(1, 'X', OLD6, [10, 20, hp100, hp300, 5, 6], atk);
  // inside: the 1.1.3 variants 0.80 .. 11.83, the served Part 3 rows 2.06 .. 10.12, the 1710xxxxx rows up to 10.7
  for (const ratio of [0.8, 1, 2.06, 3, 10.12, 11.83]) assert.strictEqual(mc.reluxShape(row(100000, Math.round(100000 * ratio))), 'old', `ratio ${ratio}`);
  // outside: placeholder rows of the raw table (20x, 25x, 180x) and a collapsed LV 300
  for (const ratio of [0.1, 12.5, 20, 25, 180]) assert.strictEqual(mc.reluxShape(row(100000, Math.round(100000 * ratio))), 'corrupt', `ratio ${ratio}`);
  // revamp scale: the 2019 curve at the old knots (HP at LV 300 over the 2.1e9 cap, ratio 1.19 inside the band)
  assert.strictEqual(mc.reluxShape(row(5515151509, 6575758750)), '2019');
  assert.strictEqual(mc.reluxShape(row(12000000000, 14300000000)), '2019');
  assert.strictEqual(mc.reluxShape(rawRow(2, 'Y', OLD6.slice(0, 5), [1, 2, 3, 4, 5], [1, 2, 3, 4, 5])), 'old', 'LV 100 / LV 300 = 3 / 4 (1.33)');
  assert.strictEqual(mc.reluxShape(rawRow(3, 'Z', OLD17, [100, 200, 300, 900, 8000, 9000], [1, 2, 3, 4, 5, 6])), 'old', 'the 2017 month curve has LV 100 / 300 too');
});

// a fixture of the 2018 cases: Jewel Sorceress 21546 (only a 2019-shape row of its own; its month copy comes from the JP Coliseum row)
function p3bFixture() {
  const f = p3EnemyFixture();
  const raw = [
    rawRow(180911546, 'Jewel Sorceress', OLD6, [62214, 196466, 994022, 2186848, 6447065, 1216674453], [1100, 2300, 4100, 9700, 29000, 31000000], { displayId: 1546 }),
    rawRow(21546, 'Jewel Sorceress', NEW19, [15313, 3533939719, 13512121197, 16110608938, 17150000000, 512917453125], [3000, 1, 2, 3, 4, 2100000000], { displayId: 1546 }),
    rawRow(171020007, 'Large Body', OLD6, [4500, 20766, 157839, 223970, 20662560, 206625600], [950, 2287, 5443, 51289, 2198291, 21982910], { displayId: 7 })];
  const stageEnemies = { ...f.stageEnemies, 20150704: [21546], 20150705: [171020007] };
  return { ...f, reluxEnemies: [...f.reluxEnemies, ...raw], stageEnemies };
}
test('MONTH_COPY_OF: 21546 = the JP Coliseum row 180911546 under id 21546 (monthCopy label); a 2019-shape row is never used', () => {
  assert.deepStrictEqual(mc.MONTH_COPY_OF, { 21546: 180911546 });
  assert.strictEqual(mc.monthBase(21546), null, 'not a monthBase case: hence the explicit map');
  const src = p3bFixture();
  const out = mc.seasonRows(src, S800);
  const row = (id) => out.enemy.find((r) => r.enemyId === id);
  const rep = out.colosseumEnemies.find((e) => e.enemyId === 21546);
  assert.deepStrictEqual([rep.source, rep.label, rep.base, rep.reluxShape], ['monthCopy', 'colosseumEnemyMonthCopy', 180911546, '2019']);
  assert.deepStrictEqual({ ...row(21546), enemyId: 180911546 }, mc.schemaRowOf('enemy', src.reluxEnemies.find((r) => r.enemyId === 180911546)));
  assert.strictEqual(row(21546).displayId, 1546);
  assert.deepStrictEqual(row(21546).baseLv, [1, 35, 100, 300, 999, 9999], 'old knots, none of the 2019 revamp');
  assert.ok(Math.max(...row(21546).attack) < 2100000000 && row(21546).hp[5] === 1216674453);
  // 1710xxxxx: the raw old-shape row served as it is, label Relux, the base's displayId
  assert.deepStrictEqual([out.colosseumEnemies.find((e) => e.enemyId === 171020007).source, row(171020007).displayId], ['relux', 7]);
  // the month copy source must be an old-shape row: a 2019-shape 180911546 (or none) stops the build, never a 2019 row
  const stop = /21546.*20150704.*no source.*180911546/s;
  assert.throws(() => mc.seasonRows({ ...src, reluxEnemies: src.reluxEnemies.filter((r) => r.enemyId !== 180911546) }, S800), stop);
  assert.throws(() => mc.seasonRows({ ...src, reluxEnemies: src.reluxEnemies.map((r) => (r.enemyId === 180911546 ? { ...r, baseLv: NEW19, attack: [1, 2, 3, 4, 5, 2100000000] } : r)) }, S800), stop);
  assert.throws(() => mc.seasonRows({ ...src, reluxEnemies: src.reluxEnemies.map((r) => (r.enemyId === 180911546 ? { ...r, hp: [62214, 196466, 5515151509, 6575758750, 6447065, 1216674453] } : r)) }, S800), stop);
  // a master that has 21546 keeps its row: nothing of the master is written again
  const own = { ...knotRow(21546, 'Jewel Sorceress', OLD6.slice(0, 5), [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]), displayId: 1546 };
  const out2 = mc.seasonRows({ ...src, masterEnemies: [...src.masterEnemies, own] }, S800);
  assert.ok(!out2.enemy.some((r) => r.enemyId === 21546));
});

// the ids of the 2018-04 .. 2019-04 sets missing from the master (census: 31 raw ReLux old shape, 29 variant rule, 21546)
const P3B_RELUX = [170920091, 171020007, 171020011, 171020017, 171020019, 171020021, 171020022, 171020023, 171020026, 171020033, 171020042, 171020043, 171020059,
  171020067, 171020075, 171020097, 171020116, 171020172, 171020176, 171021506, 171021521, 171021534, 171021548, 171022503, 171022506, 171022508, 171022510,
  171028043, 171028172, 171029043, 171029172];
const P3B_RULE = [20020, 20095, 20096, 20129, 20199, 20227, 20249, 20271, 21026, 21031, 21520, 21522, 21523, 21524, 21529, 21531, 21535, 21536, 21537, 21539,
  21540, 21542, 21545, 21549, 21552, 21563, 21581, 22504, 22505];
test('PART3B_ENEMY_IDS = the 61 ids of the census, next to PART3_ENEMY_IDS and disjoint from it', () => {
  assert.deepStrictEqual([...mc.PART3B_ENEMY_IDS].sort((a, b) => a - b), [...P3B_RELUX, ...P3B_RULE, 21546].sort((a, b) => a - b));
  assert.strictEqual(mc.PART3B_ENEMY_IDS.size, 61);
  assert.ok([...mc.PART3B_ENEMY_IDS].every((id) => !mc.PART3_ENEMY_IDS.has(id)));
});

// the plain-revision pin of the 2018-07 stage files: the Python import and the enemy lists read the same revision
test('2018-07 stage enemy lists: the pinned earlier revision (no 6xxxx id), the same set as the import pin', () => {
  const stageEnemies = mc.readStageEnemies(mc.stageEnemyFiles());
  const py = path.join(__dirname, '..', 'recon', 'tools', 'import_colosseum_stages.py');
  if (!stageEnemies || !fs.existsSync(py) || !(20180701 in stageEnemies)) { results.push('skip 2018-07 pin: stage enemy lists or import tool not on disk'); return; }
  const m = /PLAIN_REVISION_STAGES\s*=\s*frozenset\(range\((\d+),\s*(\d+)\)\)/.exec(fs.readFileSync(py, 'utf8'));
  assert.ok(m, 'PLAIN_REVISION_STAGES in the import tool');
  const pinned = Array.from({ length: +m[2] - +m[1] }, (_, i) => +m[1] + i);
  assert.deepStrictEqual(pinned, Array.from({ length: 10 }, (_, i) => 20180701 + i));
  for (const sid of pinned) {
    assert.ok(stageEnemies[sid] && stageEnemies[sid].length, `${sid}: enemy list`);
    assert.ok(stageEnemies[sid].every((id) => id < 60000), `${sid}: no 6xxxx (2019 revamp) id`);
  }
});

// the real sources: every enemy id of the 13 new sets in the master after patch(); each id from exactly the census source
test('real_part3b_enemies (every enemy id of 2018-04 .. 2019-04, the census sources, 21546, the HP scale)', () => {
  const src = mc.readSource(process.env.KHUX_COLOSSEUM_SRC || mc.DEFAULT_2016);
  const relux = mc.readRelux(process.env.KHUX_COLOSSEUM_RELUX || mc.DEFAULT_RELUX);
  const stageEnemies = mc.readStageEnemies(mc.stageEnemyFiles());
  const raw = mc.readReluxEnemies(process.env.KHUX_COLOSSEUM_RELUX_ENEMY || mc.DEFAULT_RELUX_ENEMY);
  const censusFile = path.join(process.env.KHUX_COLOSSEUM_CENSUS_DIR || 'D:\\Progetto_Restauro_KH_UX\\private\\events\\sources\\coliseum', 'ENEMIES_2018.md');
  if (!src || !relux || !stageEnemies || !raw || !fs.existsSync(censusFile)) { results.push('skip real_part3b_enemies: 1.1.3 master, ReLux extracts, stage enemy lists or the census not on disk'); return; }
  const P3B = [3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900, 4000, 4100, 4200, 4300, 4400];
  // the census: per month "id source" lists
  const census = new Map();
  for (const line of fs.readFileSync(censusFile, 'utf8').split('\n')) {
    if (!/^\*\*20\d\d-\d\d\*\* \(\d+\):/.test(line)) continue;
    for (const m of line.slice(line.indexOf('):') + 2).matchAll(/(\d+) (master|relux|rule|only2019|monthCopy|113)/g)) census.set(+m[1], m[2]);
  }
  assert.strictEqual(census.size, 138, 'the census lists 138 ids');
  // the master without the rows this part adds (the test reads the same before and after a master regen)
  const drop = new Set([...mc.PART3B_ENEMY_IDS]);
  const masterRows = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemy.json'), 'utf8')).filter((r) => !drop.has(r.enemyId));
  const heavy = 'D:\\Progetto_Restauro_KH_UX\\tmp';
  const dir = fs.mkdtempSync(path.join(fs.existsSync(heavy) ? heavy : os.tmpdir(), 'khux-p3b-enemy-'));
  try {
    fs.writeFileSync(path.join(dir, 'enemy.json'), JSON.stringify(masterRows));
    const out = withRanking(P3B, () => mc.patch(dir, { src: { ...src, relux }, stageEnemies, reluxEnemies: raw, seasons: mc.SEASONS }));
    assert.strictEqual(out.colosseumStage.length, 37);
    const after = new Map(JSON.parse(fs.readFileSync(path.join(dir, 'enemy.json'), 'utf8')).map((r) => [r.enemyId, r]));
    const before = new Map(masterRows.map((r) => [r.enemyId, r]));
    const sets = out.colosseumStage.filter((r) => P3B.includes(r.colosseumStageId)).flatMap((r) => r.stageId.slice(0, r.validStage));
    assert.strictEqual(sets.length, 130);
    const need = new Set(sets.flatMap((sid) => stageEnemies[sid] || []));
    for (const sid of sets) assert.ok(stageEnemies[sid] && stageEnemies[sid].length, `stage ${sid}: enemy list`);
    assert.deepStrictEqual([...need].sort((a, b) => a - b), [...census.keys()].sort((a, b) => a - b), 'the stage lists = the census ids');
    assert.deepStrictEqual(out.enemyCheck, { checked: true, reason: '', unchecked: [] });
    for (const id of need) assert.ok(after.has(id), `enemy ${id} in the master`);
    for (const r of masterRows) assert.deepStrictEqual(after.get(r.enemyId), r, `master row ${r.enemyId} kept as it was`);
    assert.strictEqual(after.size, before.size + out.enemy.length, 'new rows only for missing ids');
    // exactly the Part 3b rows (the Part 3 rows are in the master already)
    assert.deepStrictEqual(out.enemy.map((r) => r.enemyId), [...mc.PART3B_ENEMY_IDS].sort((a, b) => a - b), 'exactly the Part 3b rows added');
    const rep = new Map(out.colosseumEnemies.map((e) => [e.enemyId, e]));
    const rawById = new Map(raw.map((r) => [r.enemyId, r]));
    // each id from exactly the census source (only2019 = 21546, served as the month copy of the JP row)
    const want = { relux: 'relux', rule: 'rule', only2019: 'monthCopy' };
    for (const [id, c] of census) {
      if (c === 'master') { assert.ok(before.has(id) && !rep.has(id), `${id}: already in the master`); continue; }
      assert.strictEqual((rep.get(id) || {}).source, want[c], `${id}: census ${c}`);
    }
    for (const e of out.colosseumEnemies) {
      const r = after.get(e.enemyId), lv = r.baseLv.slice(0, r.validGrowth);
      assert.ok(!lv.some((l) => [1400, 2600, 3100, 3200].includes(l)) && Math.max(...r.attack) < 2100000000, `${e.enemyId}: no 2019-revamp row`);
      assert.strictEqual(e.label, { relux: 'colosseumEnemyRelux', rule: 'colosseumEnemyRule', monthCopy: 'colosseumEnemyMonthCopy' }[e.source]);
      if (e.source === 'relux') {
        assert.strictEqual(mc.reluxShape(rawById.get(e.enemyId)), 'old', `${e.enemyId}: old-shape raw row (knots and HP scale)`);
        const base = before.get(e.enemyId % 100000);
        if (base) assert.strictEqual(r.displayId, base.displayId, `${e.enemyId}: the base displayId`);
      }
      if (e.source === 'rule') assert.notStrictEqual(e.baseSource, 'master', `${e.enemyId}: original base`);
    }
    assert.deepStrictEqual(P3B_RELUX.filter((id) => rep.get(id).source !== 'relux'), []);
    assert.deepStrictEqual(P3B_RULE.filter((id) => rep.get(id).source !== 'rule'), []);
    // 21546: the row of 180911546 (September 2018, old shape) under the id 21546
    assert.deepStrictEqual([rep.get(21546).source, rep.get(21546).label, rep.get(21546).base, rep.get(21546).reluxShape], ['monthCopy', 'colosseumEnemyMonthCopy', 180911546, '2019']);
    assert.strictEqual(mc.reluxShape(rawById.get(180911546)), 'old');
    assert.deepStrictEqual({ ...after.get(21546), enemyId: 180911546 }, mc.schemaRowOf('enemy', rawById.get(180911546)));
    assert.strictEqual(after.get(21546).name, 'Jewel Sorceress');
    assert.deepStrictEqual(mc.MASTER_BASE_APPROVED, [], 'no approved master base');
    // the Part 3 follow-up: the raw ReLux rows served in Part 3 still pass the HP scale
    const p3rows = [...mc.PART3_ENEMY_IDS].map((id) => rawById.get(id)).filter((r) => r && mc.reluxShape(r) === 'old');
    assert.strictEqual(p3rows.length, 12, 'the 12 Part 3 raw rows still old');
    results.push(`info real_part3b_enemies: ${need.size} ids over ${sets.length} stages; new rows ${out.enemy.length}: relux ${P3B_RELUX.length}, rule ${P3B_RULE.length}, monthCopy [21546]`);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});


// Coliseum Part 3b Task 5: ranking prizes 2018-04 .. 2019-04 (audit tables read independently: RX item types / counts, khuxwiki names), 8 / 9 / 12
// brackets per season, the 2018 thresholds
const E9 = [[1, 100], [101, 1000], [1001, 2500], [2501, 7000], [7001, 15000], [15001, 50000], [50001, 100000], [100001, 250000], [250001, 500000]];
const E12 = [[1, 100], [101, 500], [501, 1000], [1001, 2000], [2001, 3000], [3001, 5000], [5001, 7500], [7501, 10000], [10001, 17500], [17501, 25000], [25001, 45000], [45001, 100000]];
const P3B_IDS = [3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900, 4000, 4100, 4200, 4300, 4400];
const skillByName = (n) => { const r = MD('skill').filter((x) => x.name === n); assert.strictEqual(r.length, 1, `skill «${n}»`); return r[0].skillId; };
// featured skill by name (khuxwiki; PART3_AUDIT §6, PART4_AUDIT §5), ladder = the previous skills of the 2019-03 / 04 brackets
const P3B_SKILL = { 3200: 'ATK Boost VI & Lux+', 3300: 'Defense Boost V', 3400: 'ATK B VI Max & Lux+', 3500: 'ATK B VII Max & GA 2', 3600: 'ATK B VII Max & Lux+', 3700: 'Attack Boost VIII',
  3800: 'ATK B VIII & Lux+', 3900: 'ATK B VIII Max & GA 2', 4000: 'ATK B VIII Max & Lux+', 4100: 'Attack Boost IX', 4200: 'ATK B IX & Lux+' };
const LADDER = { 4300: ['ATK B IX Max & GA 2', 'ATK B VIII Max & GA 2', 'ATK B VII Max & GA 2', 'ATK B VI Max & GA 2', 'ATK B V Max & GA 2', 'ATK B IV Max & GA 2'],
  4400: ['ATK B IX Max & Lux+', 'ATK B VIII Max & Lux+', 'ATK B VII Max & Lux+', 'ATK B VI Max & Lux+', 'ATK B V Max & Lux+', 'ATK Boost IV Max & Lux+'] };
const DMW = { 7: 301682, 8: 301683, 9: 301684 }; // Dual Meow Wow [SAB LV n] by name in medal.json
const tk = (id, n, skill) => `${id}${skill ? `:${skill}` : ''}${n > 1 ? `x${n}` : ''}`;
// the expected tokens of a 3b season, bracket by bracket (top first)
function p3bExpected(sid) {
  const x = (id, n) => (n ? [tk(id, n)] : []), sc = (sk, n) => (n ? [tk(90126, n, skillByName(sk))] : []);
  const c6 = [5, 3, 2, 2, 1], cid = [5, 3, 3, 2, 1], mir = [5, 4, 4, 3, 1], c5 = [0, 0, 0, 0, 0, 3, 2, 1], s6 = [3, 2, 1, 1];
  const low = (i) => [...x(90056, c6[i]), ...x(90066, c6[i]), ...x(90076, cid[i]), ...x(90156, mir[i]), ...x(90055, c5[i]), ...x(90065, c5[i])];
  if (sid <= 3900) return EDGES.map((_, i) => [...sc(P3B_SKILL[sid], s6[i] || 0), ...low(i)].sort());
  if (sid === 4000) {
    const gem = [50, 45, 40, 35, 20], s = [3, 2, 1, 1, 1], c = [5, 3, 2, 2, 1, 1], d = [5, 3, 3, 2, 1, 1], m = [5, 4, 4, 3, 2, 1], f5 = [0, 0, 0, 0, 0, 0, 3, 2, 1];
    return E9.map((_, i) => [...(gem[i] ? [48, 49, 50].map((g) => tk(g, gem[i])) : []), ...sc(P3B_SKILL[4000], s[i] || 0), ...x(90056, c[i]), ...x(90066, c[i]), ...x(90076, d[i]),
      ...x(90156, m[i]), ...x(90055, f5[i]), ...x(90065, f5[i])].sort());
  }
  if (sid <= 4200) {
    const d9 = [15, 10, 5, 0], d8 = [25, 20, 15, 15], d7 = [35, 30, 25, 20];
    return EDGES.map((_, i) => [...x(DMW[9], d9[i] || 0), ...x(DMW[8], d8[i] || 0), ...x(DMW[7], d7[i] || 0), ...sc(P3B_SKILL[sid], s6[i] || 0), ...low(i)].sort());
  }
  // 12 brackets: Dual Meow Wow 9 / 8 / 7, then [ladder index, num] pairs (0 = the featured skill, k = the skill of k months before)
  const T = [[[15, 25, 30], [[0, 3], [1, 1]]], [[13, 23, 25], [[0, 2], [1, 1]]], [[10, 20, 23], [[0, 1], [1, 2]]], [[8, 18, 20], [[0, 1], [1, 1], [2, 1]]], [[3, 15, 18], [[0, 1], [2, 2]]],
    [[2, 13, 15], [[0, 1], [2, 1], [3, 1]]], [[1, 10, 13], [[0, 1], [3, 2]]], [[0, 8, 10], [[0, 1], [3, 1]]], [[0, 0, 8], [[3, 2]]], [[0, 0, 0], [[3, 1], [4, 1]]], [[0, 0, 0], [[4, 1], [5, 1]]], [[0, 0, 0], [[5, 1]]]];
  return T.map(([[a, b, c], sk]) => [...x(DMW[9], a), ...x(DMW[8], b), ...x(DMW[7], c), ...sk.flatMap(([k, n]) => sc(LADDER[sid][k], n))].sort());
}
const rowsOf = (sid) => {
  const rk = 4033 + (sid - 3200) / 100, base = mc.REWARD_BASE + (rk - mc.REWARD_FIRST_RANKING) * mc.REWARD_BLOCK;
  return { rk, base, rows: mc.reluxRewardRows(sid, base) };
};
test('ranking 2018: edges and prizes per season = the audit tables (skills by name, every SKILL_LV present)', () => {
  const medals = new Map(MD('medal').map((r) => [r.medalId, r.name]));
  for (const [n, id] of Object.entries(DMW)) assert.strictEqual(medals.get(id), `Dual Meow Wow [SAB LV ${n}]`, `DMW ${n}`);
  assert.deepStrictEqual([mc.MEDAL.dmw7, mc.MEDAL.dmw8, mc.MEDAL.dmw9], [301682, 301683, 301684]);
  for (const sid of P3B_IDS) {
    assert.ok(mc.RELUX_RANKING[sid], `${sid} has its prizes`);
    const edges = sid === 4000 ? E9 : sid >= 4300 ? E12 : EDGES, { rows } = rowsOf(sid), want = p3bExpected(sid);
    assert.deepStrictEqual(mc.RELUX_RANKING[sid].edges, edges, `${sid} edges`);
    assert.deepStrictEqual(rows.map((r) => [r.startRank, r.endRank]), edges, `${sid} row edges`);
    rows.forEach((r, i) => {
      const got = Array.from({ length: r.validReward }, (_, k) => tk(r.id[k], r.num[k], r.skillId[k])).sort();
      assert.deepStrictEqual(got, want[i], `${sid} bracket ${edges[i].join('-')}`);
      for (let k = 0; k < r.validReward; k++) if (r.skillId[k]) assert.deepStrictEqual([r.type[k], r.id[k], r.skillType[k], r.skillLv[k]], [3, 90126, 3, mc.SKILL_LV[r.skillId[k]]], `${sid} skill on 6★ Scrooge at its maxLv`);
    });
  }
  const skills = MD('skill');
  for (const [id, lv] of Object.entries(mc.SKILL_LV)) assert.ok(skills.some((r) => r.skillId === Number(id) && r.maxLv === lv), `SKILL_LV ${id}`);
});
test('rankItem: gems / materials are type 5 (g:<materialId>x<n>), Dual Meow Wow medals; unknown stops', () => {
  assert.deepStrictEqual(mc.rankItem('g:48x50'), { type: 5, id: 48, skillType: 1, skillId: 0, skillLv: 1, num: 50 });
  assert.deepStrictEqual(mc.rankItem('g:50x20'), { type: 5, id: 50, skillType: 1, skillId: 0, skillLv: 1, num: 20 });
  assert.deepStrictEqual(mc.rankItem('dmw9x15'), { type: 3, id: 301684, skillType: 1, skillId: 0, skillLv: 1, num: 15 });
  assert.deepStrictEqual(mc.rankItem('dmw7x35'), { type: 3, id: 301682, skillType: 1, skillId: 0, skillLv: 1, num: 35 });
  assert.throws(() => mc.rankItem('g:99x5'), /unknown/);
  assert.throws(() => mc.rankItem('scrooge6:9999'), /no level/);
});
test('2018-12 nine brackets: P / S / M Gems 50 / 45 / 40 / 35 / 20 to rank 15,000 (27-12-2018 values)', () => {
  const { rows, base } = rowsOf(4000);
  assert.strictEqual(rows.length, 9);
  assert.deepStrictEqual(rows.map((r) => r.rankingRewardId), Array.from({ length: 9 }, (_, i) => base + i));
  const gems = rows.map((r) => r.id.filter((v, k) => r.type[k] === 5).concat(r.num.filter((v, k) => r.type[k] === 5)));
  assert.deepStrictEqual(gems, [[48, 49, 50, 50, 50, 50], [48, 49, 50, 45, 45, 45], [48, 49, 50, 40, 40, 40], [48, 49, 50, 35, 35, 35], [48, 49, 50, 20, 20, 20], [], [], [], []]);
  assert.deepStrictEqual(mc.RELUX_RANKING[4000].edges[4], [7001, 15000]);
});
// served tiers of a 2018 / 2019 season: 1,570 finite rounds, then 999-round tiers (22 in 2018-04 / 05, else 23)
const tiers18 = (sid) => Array.from({ length: sid <= 3300 ? 22 : 23 }, (_, i) => ({ colosseumStageId: sid, round: i + 1, arrivalStageCount: i < 15 ? [20, 15, 15, 10, 10, 10, 10, 10, 10, 10, 50, 100, 300, 500, 500][i] : 999 }));
test('twelve brackets: 4300 / 4400 have 12 rankingReward rows inside the season block; the thresholds are 1 .. served rounds and never down', () => {
  for (const sid of [4300, 4400]) {
    const { rows, base } = rowsOf(sid), tiers = tiers18(sid);
    assert.strictEqual(rows.length, 12, `${sid} rows`);
    assert.ok(rows.every((r, i) => r.rankingRewardId === base + i && r.rankingRewardId < base + mc.REWARD_BLOCK && r.validReward <= 10), `${sid} ids inside the block`);
    assert.deepStrictEqual(rows.map((r) => r.startRank), E12.map((e) => e[0]));
    const served = tiers.reduce((n, t) => n + t.arrivalStageCount, 0), th = mc.rankedOf(tiers, rows).thresholds;
    assert.strictEqual(th.length, 12);
    th.forEach((x, i) => { assert.ok(Number.isInteger(x.score) && x.score >= 1 && x.score <= served, `${sid} ${x.score} in 1..${served}`); if (i) assert.ok(x.score >= th[i - 1].score, `${sid} never down`); });
    assert.strictEqual(th[0].score, 1, 'rank 100,000 = 1 round');
  }
});
test('Part 2-3 rankingReward rows byte-identical (edges = BRACKETS8)', () => {
  const crypto = require('crypto'), h = crypto.createHash('sha256');
  for (const id of Object.keys(mc.RELUX_RANKING).map(Number).filter((n) => n <= 3100).sort((a, b) => a - b)) {
    assert.strictEqual(mc.RELUX_RANKING[id].edges, mc.BRACKETS8, `${id} edges = BRACKETS8`);
    const rk = 4016 + (id - 1500) / 100;
    h.update(JSON.stringify(mc.reluxRewardRows(id, mc.REWARD_BASE + (rk - 4016) * mc.REWARD_BLOCK)));
  }
  assert.strictEqual(h.digest('hex'), 'ff1d1f512db7d1a8b1f7179a004befdea5cf1cad559de107842e23d3f4cd3a16');
});

// the ERA18 thresholds (private CUTOFFS_2018.md: only season-end / late-month points calibrate)
const T18_SEASONS = mc.SEASONS.filter((s) => s.colosseumStageId >= 3200);
test('era18 fit: ERA18 has the ERA17 interface; every calibrating point within the stated tolerances; guard as ERA17', () => {
  const E = mc.ERA18;
  assert.deepStrictEqual(Object.keys(mc.ERA17).sort(), Object.keys(E).sort(), 'same interface as ERA17');
  assert.deepStrictEqual(Object.keys(E.months), ['2018-04', '2018-06', '2019-04'], 'the months with calibrating points');
  assert.ok(E.points.length >= 5 && E.tolerance > 1 && E.tolerance <= 3 && E.monthTolerance > 1 && E.monthTolerance <= 1.15, 'tolerances');
  assert.strictEqual(E.seasons.size, 13, 'the 13 seasons');
  for (const [month, rank, round, src] of E.points) {
    assert.ok(month >= '2018-04' && month <= '2019-04', `${month} inside the era`);
    const f = E.curve(rank), k = Math.max(round / f, f / round);
    assert.ok(k <= E.tolerance, `${month} rank ${rank}: recorded ${round}, era curve ${f.toFixed(0)} (x ${k.toFixed(2)}) ${src}`);
  }
  for (const [m, c] of Object.entries(E.months)) {
    const ranks = c.points.map((p) => p[1]), span = Math.log10(Math.max(...ranks) / Math.min(...ranks));
    assert.deepStrictEqual(c.points, E.points.filter((p) => p[0] === m), `${m} its own points only`);
    assert.strictEqual(c.method, span >= 1 ? 'own fit' : 'era slope, own intercept', `${m} method`);
    if (span < 1) assert.strictEqual(c.b, E.b, `${m}: the era slope`);
    for (const [, rank, round, src] of c.points) {
      const f = c.curve(rank), k = Math.max(round / f, f / round);
      assert.ok(k <= E.monthTolerance, `${m} rank ${rank}: recorded ${round}, month curve ${f.toFixed(0)} (x ${k.toFixed(2)}) ${src}`);
    }
    const lo = Math.min(...ranks), hi = Math.max(...ranks);
    for (const r of [10, 100, 1000, 2500, 10000]) {
      if (r >= lo && r <= hi) continue;
      const edge = r < lo ? lo : hi, want = c.curve(edge) * (r / edge) ** E.b;
      assert.ok(Math.abs(c.curve(r) - want) < 1e-6 * want, `${m} rank ${r}: era slope from rank ${edge}`);
    }
  }
  const xs = E.points.map((p) => Math.log10(p[1])), ys = E.points.map((p) => Math.log10(p[2])), n = xs.length, mx = xs.reduce((a, b) => a + b) / n, my = ys.reduce((a, b) => a + b) / n;
  const b = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  assert.ok(Math.abs(E.b - b) < 1e-9 && Math.abs(E.a - (my - b * mx)) < 1e-9, 'a / b = the least-squares fit');
  assert.deepStrictEqual([E.a.toFixed(4), E.b.toFixed(4)], ['4.0928', '-0.1987'], 'the values stated in the module comment');
  assert.strictEqual(E.of(3100), null, '2018-03 stays ERA17');
  assert.strictEqual(mc.ERA17.of(3200), null, '2018-04 is not ERA17');
});
// thresholds per season (lowest bracket first), as in the module comment
test('era18 thresholds: 1 .. served rounds, never down, 100,000+ = 1 round; the month curve where the month has points, else the era curve', () => {
  const E = mc.ERA18;
  for (const s of T18_SEASONS) {
    const sid = s.colosseumStageId, { rows } = rowsOf(sid), tiers = tiers18(sid);
    const served = tiers.reduce((n, t) => n + t.arrivalStageCount, 0), th = mc.rankedOf(tiers, rows).thresholds, c = E.of(sid);
    assert.ok(c && typeof c.round === 'function', `${s.month} has a curve`);
    assert.strictEqual(c === E.months[s.month], !!E.months[s.month], `${s.month}: own curve only with its own points`);
    assert.strictEqual(th.length, rows.length);
    th.forEach((x, i) => { assert.ok(Number.isInteger(x.score) && x.score >= 1 && x.score <= served, `${s.month} ${x.score} in 1..${served}`); if (i) assert.ok(x.score >= th[i - 1].score, `${s.month} never down`); });
    assert.ok(th.filter((x) => x.endRank >= 100000).every((x) => x.score === 1), `${s.month}: rank 100,000+ = 1 round`);
    th.forEach((x) => assert.strictEqual(x.score, c.round(x.endRank), `${s.month} edge ${x.endRank}: the same curve gives every edge`));
  }
  // the named values (module comment): rank 100 / 1,000 / 2,500 / 10,000 / 50,000
  const at = (sid) => [100, 1000, 2500, 10000, 50000].map((r) => E.of(sid).round(r));
  assert.deepStrictEqual(at(3200), [3843, 2432, 2027, 1539, 464], '2018-04');
  assert.deepStrictEqual(at(3400), [5546, 3448, 2843, 2123, 640], '2018-06 (guard at rank 100)');
  assert.deepStrictEqual(at(4400), [4575, 2895, 2413, 1832, 552], '2019-04');
  for (const sid of [3300, 3500, 3600, 3700, 3800, 3900, 4000, 4100, 4200, 4300]) assert.deepStrictEqual(at(sid), [4959, 3138, 2616, 1986, 599], `${sid}: the era curve`);
});

// the real sources: the recorded points of CUTOFFS_2018.md are reproduced; the full build includes all 37 seasons and prints no warning
test('real_part3b_ranking (all 37 seasons in the default build, no warning; the border points = CUTOFFS_2018.md)', () => {
  const file = 'D:\\Progetto_Restauro_KH_UX\\private\\events\\sources\\coliseum\\CUTOFFS_2018.md';
  if (fs.existsSync(file)) {
    const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.split('|').map((c) => c.trim())).filter((c) => /^\d+$/.test(c[1] || ''));
    assert.ok(rows.length >= 34, `${rows.length} rows read`);
    for (const [month, rank, round, src] of mc.ERA18.points) {
      const hit = rows.find((c) => c[2] === month && /season-end|late/.test(c[7]) && c[8].includes(src) && c[3].replace(/[~,]/g, '').includes(String(rank)));
      assert.ok(hit, `${month} rank ${rank} (${src}) is a season-end / late row of CUTOFFS_2018.md`);
      const nums = hit[5].replace(/,/g, '').match(/\d+/g).map(Number);
      assert.ok(round >= Math.min(...nums) && round <= Math.max(...nums), `${month} rank ${rank}: round ${round} inside the stated ${hit[5]}`);
    }
  } else results.push('skip era18 CUTOFFS_2018.md: private file not on disk');
  const src = mc.readSource(process.env.KHUX_COLOSSEUM_SRC || mc.DEFAULT_2016);
  const relux = mc.readRelux(process.env.KHUX_COLOSSEUM_RELUX || mc.DEFAULT_RELUX);
  const stageEnemies = mc.readStageEnemies(mc.stageEnemyFiles());
  const raw = mc.readReluxEnemies(process.env.KHUX_COLOSSEUM_RELUX_ENEMY || mc.DEFAULT_RELUX_ENEMY);
  if (!src || !relux || !stageEnemies || !raw) { results.push('skip real_part3b_ranking build: 1.1.3 master, ReLux extracts or stage enemy lists not on disk'); return; }
  const masterRows = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'enemy.json'), 'utf8')).filter((r) => !mc.PART3B_ENEMY_IDS.has(r.enemyId));
  const heavy = 'D:\\Progetto_Restauro_KH_UX\\tmp';
  const dir = fs.mkdtempSync(path.join(fs.existsSync(heavy) ? heavy : os.tmpdir(), 'khux-p3b-rank-'));
  const warn = console.warn, said = [];
  console.warn = (m) => said.push(String(m));
  try {
    fs.writeFileSync(path.join(dir, 'enemy.json'), JSON.stringify(masterRows));
    const out = mc.patch(dir, { src: { ...src, relux }, stageEnemies, reluxEnemies: raw }); // the default SEASONS
    assert.deepStrictEqual(out.colosseumStage.map((r) => r.colosseumStageId).filter((id) => id >= 3200), P3B_IDS, 'the default build includes 3200 .. 4400');
    assert.strictEqual(out.colosseumStage.length, 37);
    assert.ok(!said.some((m) => /not built yet|left out/.test(m)), `no warning: ${said.join(' | ')}`);
    P3B_IDS.forEach((id, i) => {
      const r = out.ranked[id], rk = out.ranking.find((x) => x.rankingId === 4033 + i);
      assert.strictEqual(r.brackets.length, rk.endRank - rk.startRank + 1, `${id} ranking row = its brackets`);
      const served = out.colosseum.filter((x) => x.colosseumStageId === id).reduce((n, x) => n + x.arrivalStageCount, 0);
      r.thresholds.forEach((x, k) => { assert.ok(x.score >= 1 && x.score <= served, `${id} ${x.score}`); if (k) assert.ok(x.score >= r.thresholds[k - 1].score); });
    });
  } finally { console.warn = warn; fs.rmSync(dir, { recursive: true, force: true }); }
});

console.log(results.join('\n'));
if (process.exitCode) console.log('test-make-colosseum: FAIL'); else console.log('test-make-colosseum: OK');
