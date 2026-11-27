// PvE Coliseum routes (Coliseum Part 1 Task 3) against a stub server (response keys: docs/notes/coliseum.md «Requests and
// responses»), then the wiring of server.js on the local master_data.
//   node server/test-colosseum-routes.js
'use strict';
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const routesColosseum = require('./routes-colosseum');

const NOW = Date.parse('2026-11-25T10:00:00Z');
const fmt = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
const WEEK = 7 * 86400000, DAY0 = Date.UTC(2018, 0, 1, 8);
const clock = { weekIndex: (r) => Math.floor((r - DAY0) / WEEK), weekEnd: (r) => DAY0 + (Math.floor((r - DAY0) / WEEK) + 1) * WEEK, weekStartOf: (w) => DAY0 + w * WEEK };

// season fixture: tier 1 = 3 rounds (skip 2, 1 coin each, tier reward 30 coins + medal 90013), tier 2 = 2 rounds (skip 1, 3 coins,
// tier reward 40 coins + medal 90015 x2), tier 3 endless (999)
const z4 = [0, 0, 0, 0];
const tierRow = (sid, n, ap, rounds, skip, coin, reward) => ({ colosseumId: sid + n, colosseumStageId: sid, round: n, ap, arrivalStageCount: rounds, rankId: ' ',
  excellentUnlockCount: skip, validStageReward: coin ? 1 : 0, stageRewardType: coin ? 17 : 0, stageRewardId: 0, stageRewardAssignType: 1, stageRewardSkillId: 0, stageRewardSkillLv: 1,
  stageRewardNum: coin, validReward: reward ? 2 : 0, rewardType: reward ? [17, 3, 0, 0] : z4, rewardId: reward ? [0, reward[1], 0, 0] : z4,
  rewardAssignType: reward ? [1, 1, 0, 0] : z4, rewardSkillId: z4, rewardSkillLv: reward ? [1, 1, 0, 0] : z4, rewardNum: reward ? [reward[0], reward[2] || 1, 0, 0] : z4 });
const seasonRows = (sid, rankingId, firstStage) => ({
  stage: { colosseumStageId: sid, openDate: '2015-01-01 00:00:00', closeDate: '2030-12-31 23:59:59', rankingCloseDate: '2030-12-31 23:59:59', headColosseumId: sid + 1,
    termColosseumId: sid + 3, rankingId, validStage: 10, stageId: Array.from({ length: 10 }, (_, i) => firstStage + i), loopStageCount: 10, lvPerLoop: 10 },
  tiers: [tierRow(sid, 1, 3, 3, 2, 1, [30, 90013]), tierRow(sid, 2, 4, 2, 1, 3, [40, 90015, 2]), tierRow(sid, 3, 5, 999, 3, 0, null)],
});
const S800 = seasonRows(800, 4009, 20150701), S900 = seasonRows(900, 4010, 20150801), S1000 = seasonRows(1000, 4011, 20150901), S1100 = seasonRows(1100, 4012, 20151001);
// one bracket open to everyone (endRank >= 1,000,000: threshold 1 round, make-colosseum.js thresholdsOf) + a top one
const rewardRow = (id, startRank, endRank, items) => ({ rankingRewardId: id, startRank, endRank, validReward: items.length,
  type: items.map((x) => x[0]), id: items.map((x) => x[1]), skillType: items.map(() => 1), skillId: items.map((x) => x[3] || 0), skillLv: items.map((x) => x[4] || 1),
  burstUpperNumber: items.map(() => 0), num: items.map((x) => x[2]) });

function world(opts = {}) {
  const w = { now: NOW, week: { storyQuest: 200, shopFrom: '2016-04-07' }, saves: 0, sent: null, logs: [], grants: [], presents: [], ap: 100, lux: 0 };
  w.player = opts.player || { name: 'Prova', titles: [] };
  w.tables = {
    colosseumStage: [S800.stage, S900.stage, S1000.stage, S1100.stage], colosseum: [...S800.tiers, ...S900.tiers, ...S1000.tiers, ...S1100.tiers],
    ranking: [{ rankingId: 4009, category: 4, startRank: 30100, endRank: 30101 }, { rankingId: 4010, category: 4, startRank: 30800, endRank: 30800 }],
    rankingReward: [rewardRow(30100, 1, 1000, [[3, 90125, 3, 1101, 15]]), rewardRow(30101, 1001, 5000000, [[3, 90016, 1]]), rewardRow(30800, 1, 10000000, [[3, 90016, 1]])],
  };
  w.weeksAhead = null; // (week) -> shopFrom, null = the same shopFrom every week
  w.stageStates = {};
  w.c = routesColosseum({
    player: w.player, savePlayer: () => { w.saves++; }, masterRows: (t) => (w.tables[t] || []).slice(), storyWeek: () => w.week,
    shopFromAtWeek: (wk) => (w.weeksAhead ? w.weeksAhead(wk) : w.week.shopFrom),
    realNow: () => w.now, serverTime: () => fmt(w.now), serverTimeAt: fmt, clock,
    userPointData: (now) => ({ now, ap: w.ap, lux: w.lux, colosseumSpherePoint: w.c.coinsOf() }), userDetailData: () => ({ detail: 1 }),
    stageResumptionData: () => ({ resumptionStatus: 0, stageId: 0, raidId: 0, colosseumStageId: 0 }),
    // inventory snapshot model: the owned medal 9 + one medal row per granted medal; with a snapshot only the rows added since
    inventorySnapshot: () => ({ grants: w.grants.length }),
    inventoryBlocks: (now, snap) => ({ userMaterials: [], userSkills: [],
      userMedals: [{ userMedalId: 9 }, ...w.grants.filter((g) => g.type === 3).map((g, i) => ({ userMedalId: 100 + i, medalId: g.id }))]
        .filter((m) => !snap || (m.userMedalId >= 100 + w.grants.slice(0, snap.grants).filter((g) => g.type === 3).length)), userTitles: (w.player.titles || []).map((titleId, i) => ({ userTitleId: i + 1, titleId })),
      userKeyblades: [{ userKeybladeId: 1 }], userDecks: [{ deckId: 1 }], userAvatarParts: [{ p: 1 }], subslotMaxNum: 3, userKeybladeSubslots: [] }),
    userKeybladesData: () => [{ userKeybladeId: 1 }], send: (res, code, body) => { w.sent = body; }, ret: () => ({ ok: 1 }),
    apNow: () => w.ap, changeAp: (d) => { w.ap += d; }, campaignIds: () => [7], campaignAp: opts.campaignAp,
    battlePoints: (gp, burst) => { const l = Number(gp?.lux) || 0; w.lux += l; w.burst = burst; return l; }, beginBattle: (k) => { w.keyblade = k; },
    grantItem: (it) => { w.grants.push(it); if (it.type === 7) w.player.titles = [...new Set([...(w.player.titles || []), it.id])]; }, addPresent: (it, text) => w.presents.push({ ...it, text }),
    medalCount: opts.medalCount, medalCap: opts.medalCap,
    element: (now, rank, uc, arrival) => ({ userData: { user: { userId: 1 } }, rank, userColosseum: uc, arrivalTime: arrival }),
    stageState: (id) => w.stageStates[id] || { score: 0, playStatus: 0, clearMissionIds: [] }, webBase: 'http://web.test',
    log: (m) => w.logs.push(m),
  });
  w.call = (fn, ...a) => { w.sent = null; w.c[fn]({}, ...a); return w.sent; };
  w.start = (rank, stageCount, stageId = 20150701 + ((stageCount - 1) % 10)) => w.call('start', { rank, stageCount, stageId, userKeybladeId: 3 });
  w.clear = (rank, stageCount, isSkip = false, extra = {}) => w.call('clear', { isSkip, enemyDeadNumber: 3, mimicDeadNumber: 0, maximumDamage: 1, guiltBurstMaximumDamage: 0,
    userKeybladeId: 3, burst: 9, lux: 50, rank, stageCount, stageId: 20150701, ...extra });
  return w;
}
const keys = (o) => Object.keys(o);
const LIST_KEYS = ['ret', 'colosseumInfo', 'colosseumStages', 'colosseumRank', 'userColosseum'];
const UC = ['userRank', 'userStageCount', 'userStageTotalCount'];
const CLEAR_KEYS = ['ret', 'userData', 'clearColosseums', 'userMaterials', 'userMedals', 'userSkills', 'userTitles', 'userKeyblades', 'userDecks', 'userAvatarParts',
  'subslotMaxNum', 'userKeybladeSubslots', 'getLux'];

const tests = {
  locked_before_130() {
    const w = world();
    w.week.storyQuest = 120;
    const b = w.call('list');
    assert.deepStrictEqual(keys(b), LIST_KEYS);
    assert.strictEqual(b.colosseumInfo.status, 2);
    assert.deepStrictEqual(b.colosseumStages, []);
    assert.strictEqual(w.c.liveSeason(), null);
    w.week.storyQuest = 130;
    assert.strictEqual(w.call('list').colosseumInfo.status, 1, 'open from quest 130');
  },
  unserved_month() {
    const w = world();
    w.week.shopFrom = '2016-08-04';
    const b = w.call('list');
    assert.deepStrictEqual(b.colosseumInfo, { colosseumStageId: 0, status: 2 });
    assert.deepStrictEqual(keys(b.userColosseum), UC);
    const s = w.start(1, 1);
    assert.deepStrictEqual(keys(s), ['ret', 'userData'], 'refused: no startColosseumData');
    assert.strictEqual(w.ap, 100, 'no AP spent');
    assert.strictEqual(w.call('clear', { rank: 1, stageCount: 1 }).clearColosseums.length, 1, 'clearColosseums never empty');
    assert.strictEqual(w.player.colosseum.seasons, undefined, 'nothing stored');
    assert.deepStrictEqual(w.call('rewardList'), { ret: { ok: 1 }, getRewardRankIds: [] });
  },
  list() {
    const w = world();
    const b = w.call('list');
    assert.deepStrictEqual(keys(b), LIST_KEYS);
    assert.deepStrictEqual(b.colosseumInfo, { colosseumStageId: 800, status: 1 });
    assert.deepStrictEqual(b.colosseumStages, [{ rank: 1, stageCount: 1, stageId: 20150701, useAp: 3 }]);
    assert.deepStrictEqual(keys(b.colosseumStages[0]), ['rank', 'stageCount', 'stageId', 'useAp']);
    assert.strictEqual(b.colosseumRank, 0, 'nothing cleared: «---»');
    assert.deepStrictEqual(b.userColosseum, { userRank: 1, userStageCount: 0, userStageTotalCount: 0 });
    // after a one-turn clear of round 1 the window is rounds 2..3 (skip 2)
    w.start(1, 1); w.clear(1, 1, true);
    const c = w.call('list');
    assert.deepStrictEqual(c.colosseumStages.map((x) => [x.rank, x.stageCount, x.stageId, x.useAp]), [[1, 2, 20150702, 3], [1, 3, 20150703, 3]]);
    assert.deepStrictEqual(c.userColosseum, { userRank: 1, userStageCount: 1, userStageTotalCount: 1 });
    assert.ok(c.colosseumRank > 0, 'a ranked player has a rank');
  },
  start_spends_ap() {
    const w = world();
    const b = w.start(1, 1);
    assert.deepStrictEqual(keys(b), ['ret', 'userData', 'colosseumInfo', 'userColosseum', 'userTreasures', 'startColosseumData', 'campaigns']);
    assert.strictEqual(w.ap, 97, 'tier 1 costs 3 AP');
    assert.deepStrictEqual(b.startColosseumData, { rank: 1, stageCount: 1, stageId: 20150701, userKeybladeId: 3 });
    assert.ok(Number.isInteger(b.startColosseumData.userKeybladeId));
    assert.deepStrictEqual(b.campaigns, [7]);
    assert.deepStrictEqual(b.userTreasures, []);
    assert.strictEqual(w.keyblade, 3);
    // a round outside the window, or too little AP: refused, nothing spent
    assert.deepStrictEqual(keys(w.start(1, 2)), ['ret', 'userData']);
    w.call('retire', {}); // a repeated start of the running round is answered (start_repeated_charges_once): drop it first
    w.ap = 2;
    assert.deepStrictEqual(keys(w.start(1, 1)), ['ret', 'userData']);
    assert.strictEqual(w.ap, 2);
  },
  start_campaign_ap() {
    // the day's Coliseum AP campaign (campaigns.js colosseumAp): the served «1 AP» row of 2016-05-19 (power 2000, ruling 11)
    const { apWith } = require('./campaigns'), { COLOSSEUM_ONE_AP } = require('./make-campaigns');
    for (const [tier, round] of [[1, 1], [2, 1], [3, 1]]) {
      const w = world({ campaignAp: (ap) => apWith(ap, COLOSSEUM_ONE_AP) });
      const tierAp = w.tables.colosseum.find((x) => x.colosseumId === 801 + tier - 1)?.ap;
      if (tier > 1) { w.player.colosseum = { seasons: { 800: { last: tier === 2 ? 3 : 5, open: tier === 2 ? 4 : 6 } } }; }
      w.ap = 1;
      const b = w.start(tier, round);
      assert.deepStrictEqual(keys(b), ['ret', 'userData', 'colosseumInfo', 'userColosseum', 'userTreasures', 'startColosseumData', 'campaigns'], `tier ${tier} (${tierAp} AP): 1 AP is enough`);
      assert.strictEqual(w.ap, 0, `tier ${tier}: 1 AP charged`);
    }
    const z = world({ campaignAp: () => 0 });
    z.start(1, 1);
    assert.strictEqual(z.ap, 100, '0 AP campaign: nothing charged');
  },
  retire_keeps_progress() {
    const w = world();
    w.start(1, 1); w.clear(1, 1);
    w.start(1, 2);
    const before = JSON.stringify(w.player.colosseum.seasons), ap = w.ap;
    const b = w.call('retire', { burst: 0 });
    assert.deepStrictEqual(keys(b), ['ret', 'userKeyblades', 'userData']);
    assert.deepStrictEqual(keys(b.userData), ['stageResumption']);
    assert.strictEqual(JSON.stringify(w.player.colosseum.seasons), before, 'progress unchanged');
    assert.strictEqual(w.ap, ap, 'no AP refund');
    assert.strictEqual(w.player.colosseum.fight, null);
    // the round is still playable; a clear after the retire pays nothing
    assert.deepStrictEqual(w.call('list').colosseumStages.map((x) => x.stageCount), [2]);
    const c = w.clear(1, 2);
    assert.strictEqual(w.player.colosseum.seasons[800].last, 1, 'no fight running: nothing paid');
    assert.deepStrictEqual(c.clearColosseums, [{ rank: 1, stageCount: 2 }]);
    assert.strictEqual(c.getLux, 0);
  },
  clear_pays() {
    const w = world();
    w.start(1, 1);
    const b = w.clear(1, 1, true);
    assert.deepStrictEqual(keys(b), CLEAR_KEYS);
    assert.deepStrictEqual(keys(b.userData), ['userPoint', 'userDetail', 'stageResumption']);
    assert.deepStrictEqual(b.clearColosseums, [{ rank: 1, stageCount: 1 }]);
    assert.strictEqual(b.userData.userPoint.colosseumSpherePoint, 1, 'round coin');
    assert.strictEqual(b.getLux, 50);
    assert.strictEqual(typeof b.getLux, 'number');
    assert.strictEqual(w.burst, 9);
    assert.deepStrictEqual(b.userAvatarParts, [], 'no avatar part paid');
    // one-turn jump to round 3 = last of tier 1: pays round 2 (skipped) and 3 and the tier 1 reward (30 coins + medal)
    w.start(1, 3);
    const c = w.clear(1, 3);
    assert.deepStrictEqual(c.clearColosseums, [{ rank: 1, stageCount: 2 }, { rank: 1, stageCount: 3 }]);
    assert.strictEqual(c.userData.userPoint.colosseumSpherePoint, 1 + 2 + 30);
    assert.deepStrictEqual(w.grants.map((g) => [g.type, g.id, g.num]), [[3, 90013, 1]], 'tier medal granted, coins not granted twice');
    // only the rows changed by this clear (snapshot before the rewards): the tier medal, not the untouched medal 9
    assert.deepStrictEqual(c.userMedals.map((m) => m.medalId), [90013], 'delta medal rows only');
    assert.deepStrictEqual(b.userMedals, [], 'a round with no medal reward sends no medal rows');
    // a retried 128 for the same round: nothing more
    const d = w.clear(1, 3);
    assert.strictEqual(d.userData.userPoint.colosseumSpherePoint, 33);
    assert.deepStrictEqual(d.clearColosseums, [{ rank: 1, stageCount: 3 }]);
    assert.strictEqual(w.grants.length, 1);
    // tier 2: multi-turn clears
    w.start(2, 1); w.clear(2, 1); w.start(2, 2); w.clear(2, 2);
    assert.strictEqual(w.c.coinsOf(), 33 + 3 + 3 + 40);
    assert.deepStrictEqual(w.grants.map((g) => [g.type, g.id, g.num]), [[3, 90013, 1], [3, 90015, 2]]);
    assert.deepStrictEqual(w.call('list').colosseumStages, [{ rank: 3, stageCount: 1, stageId: 20150701, useAp: 5 }]);
  },
  start_repeated_charges_once() {
    // a 126 resent for the round already started (same season, tier, round): the same answer, no second AP charge (final review M1)
    const w = world();
    const a = w.start(1, 1);
    assert.strictEqual(w.ap, 97);
    const b = w.start(1, 1);
    assert.strictEqual(w.ap, 97, 'a repeated start is not charged again');
    assert.deepStrictEqual(keys(b), keys(a));
    assert.deepStrictEqual(b.startColosseumData, a.startColosseumData);
    // even with less AP left than the round costs, the repeated start of the running round is answered
    w.ap = 1;
    assert.deepStrictEqual(b.startColosseumData, w.start(1, 1).startColosseumData);
    assert.strictEqual(w.ap, 1);
    // the round then clears once; a new start after the clear is charged again
    w.ap = 100;
    w.clear(1, 1);
    w.start(1, 2);
    assert.strictEqual(w.ap, 97, 'the next round costs its AP');
  },
  clear_medal_storage_full() {
    // the tier reward medal with the medal storage full goes to the Presents (as raid-rewards.js deliverReward, final review M4)
    const full = (x) => x.presents.filter((p) => p.text.includes('medal storage full')).map((p) => [p.id, p.num]);
    const w = world({ medalCount: () => 500, medalCap: () => 500 });
    w.start(1, 1); w.clear(1, 1, true); w.start(1, 3); w.clear(1, 3);
    assert.deepStrictEqual(w.grants, [], 'nothing granted into a full box');
    assert.deepStrictEqual(full(w), [[90013, 1]], 'tier medal to the Presents');
    assert.strictEqual(w.presents.find((x) => x.text.includes('storage full')).text, 'Coliseum April 2016: medal storage full');
    assert.strictEqual(w.c.coinsOf(), 33, 'coins still paid');
    // one free slot, tier 1 and tier 2 rewards paid by one clear: medal 90013 fills the slot, medal 90015 x2 overflows
    const v = world({ medalCount: () => 499, medalCap: () => 500 });
    v.player.colosseum = { seasons: { 800: { last: 3, open: 4 } } };
    v.start(2, 1); v.clear(2, 1); v.start(2, 2); v.clear(2, 2);
    assert.deepStrictEqual(v.grants.map((g) => [g.type, g.id, g.num]), [[3, 90013, 1]], 'the medal that fits is granted');
    assert.deepStrictEqual(full(v), [[90015, 2]], 'the storage counted as filled by it');
  },
  clear_wrong_round() {
    const w = world();
    w.start(1, 1);
    const b = w.clear(2, 1);
    assert.deepStrictEqual(b.clearColosseums, [{ rank: 2, stageCount: 1 }]);
    assert.strictEqual(w.player.colosseum.seasons[800].last, 0);
    assert.strictEqual(b.getLux, 0);
  },
  // Coliseum Part 4: a revamp season (2019-05, colosseumStageId 4500) is finite: its last tier is not endless, the season is complete after its
  // last round, and the Tier 10 reward is a title (type 7, id 17079) granted once and listed in the clear answer (userTitles)
  tier_10_title() {
    const w = world();
    w.week = { storyQuest: 800, shopFrom: '2019-05-02' };
    const title = tierRow(4500, 2, 0, 2, 1, 0, [0, 0, 1]);
    Object.assign(title, { validReward: 1, rewardType: [7, 0, 0, 0], rewardId: [17079, 0, 0, 0], rewardNum: [1, 0, 0, 0] });
    const S4500 = { stage: { ...seasonRows(4500, 4046, 21190501).stage, termColosseumId: 4503 }, tiers: [tierRow(4500, 1, 0, 3, 2, 0, null), title, tierRow(4500, 3, 0, 1, 0, 0, null)] };
    w.tables.colosseumStage = [S4500.stage]; w.tables.colosseum = [...S4500.tiers];
    // the rounds 1 .. 3 (Tier 1), 4 .. 5 (Tier 2 = the title), 6 (Tier 3, the last)
    w.start(1, 1); w.clear(1, 1, true); // opens 2 .. 3
    w.start(1, 3); w.clear(1, 3, true); // opens 4 .. 5
    assert.deepStrictEqual(w.call('list').colosseumStages.map((x) => [x.rank, x.stageCount]), [[2, 1], [2, 2]]);
    w.start(2, 2); const b = w.clear(2, 2, true); // global round 5: Tier 2 complete, one-turn skip 1 opens round 6
    assert.deepStrictEqual(b.userTitles.map((x) => x.titleId), [17079], 'the title is in the clear answer');
    assert.deepStrictEqual(w.grants.filter((g) => g.type === 7).map((g) => g.id), [17079]);
    assert.deepStrictEqual(w.player.titles, [17079]);
    assert.deepStrictEqual(w.call('list').colosseumStages.map((x) => [x.rank, x.stageCount]), [[3, 1]]);
    // the last round: the season is complete, nothing is offered after it
    w.start(3, 1); const e = w.clear(3, 1, true);
    assert.deepStrictEqual(e.userTitles, [], 'no second title');
    const done = w.call('list');
    assert.deepStrictEqual(done.colosseumStages, [], 'no round 7 is offered');
    assert.deepStrictEqual(done.userColosseum, { userRank: 3, userStageCount: 1, userStageTotalCount: 6 });
    assert.deepStrictEqual(keys(w.start(3, 1)), ['ret', 'userData'], 'a round already cleared is refused');
    assert.deepStrictEqual(keys(w.start(3, 2)), ['ret', 'userData'], 'a round past the end is refused');
    const again = w.clear(3, 1);
    assert.deepStrictEqual(again.userTitles, []); assert.strictEqual(w.grants.filter((g) => g.type === 7).length, 1, 'the title is granted once');
    const d = w.c.seasonDetail(4500);
    assert.deepStrictEqual(d.tiers.map((t) => [t.tier, t.endless, t.taken, t.items.map((x) => [x.type, x.id, x.num])]), [[1, false, true, []], [2, false, true, [[7, 17079, 1]]], [3, false, true, []]]);
    assert.strictEqual(d.complete, true, 'season complete');
    assert.strictEqual(w.c.seasonDetail(800), null, 'the other seasons are not in this master');
  },
  reward_list_sorted() {
    const w = world();
    w.player.colosseum = { seasons: { 800: { last: 5, open: 6, coins: 0, cleared: [], tierRewards: [2, 1], bestAt: null } } };
    const b = w.call('rewardList');
    assert.deepStrictEqual(keys(b), ['ret', 'getRewardRankIds']);
    assert.deepStrictEqual(b.getRewardRankIds, [1, 2]);
  },
  // Part 3 season (2017-12, colosseumStageId 2800): the thresholds come from the ERA17 curve of the season, not the 2016 one, and the lowest
  // bracket (open at round 1) pays its Spirit part (type 33, Brows 401004) into the Presents at the first clear (final review M3)
  part3_threshold_pays() {
    const mc = require('./make-colosseum');
    const S2800 = seasonRows(2800, 4030, 20150701);
    const w = world();
    w.week = { storyQuest: 800, shopFrom: '2017-12-07' };
    w.tables.colosseumStage = [S2800.stage]; w.tables.colosseum = [...S2800.tiers];
    w.tables.ranking = [{ rankingId: 4030, category: 4, startRank: 40100, endRank: 40101 }];
    w.tables.rankingReward = [rewardRow(40100, 1, 100, [[3, 90125, 1]]), rewardRow(40101, 5001, 100000, [[33, 401004, 1]])];
    const d = w.c.seasonDetail(2800);
    assert.ok(d, 'the Part 3 season is served');
    const era = mc.ERA17.of(2800);
    assert.ok(era, 'an ERA17 curve for 2800');
    assert.deepStrictEqual(d.ranked.map((b) => [b.startRank, b.endRank, b.rounds]), [[1, 100, era.round(100)], [5001, 100000, era.round(100000)]]);
    assert.notStrictEqual(era.round(100), mc.rankedOf(S800.tiers, w.tables.rankingReward.filter((r) => r.rankingRewardId === 40100)).thresholds[0].score, 'not the 2016 curve');
    assert.strictEqual(era.round(100000), 1, 'the lowest bracket opens at round 1');
    w.now += 60000;
    w.start(1, 1); w.clear(1, 1);
    assert.deepStrictEqual(w.presents.map((x) => [x.type, x.id, x.num]), [[33, 401004, 1]], 'the lowest bracket paid at round 1');
  },
  ranking_own_entry() {
    const w = world();
    const own = () => { w.sent = null; w.c.ranking({}, '/ranking/colosseum/own'); return w.sent; };
    const e = own();
    assert.deepStrictEqual(keys(e), ['ret', 'colosseumRankingOwn']);
    const r0 = e.colosseumRankingOwn;
    for (const k of ['rankingDatas', 'rankingStatus', 'rankingTermStart', 'rankingTermEnd']) assert.ok(k in r0, k);
    // not ranked yet: «You did not participate» (status 4, no row: a rank-0 row drew the third-place crown); no Top 10 row
    assert.strictEqual(r0.rankingStatus, 4);
    assert.deepStrictEqual(r0.rankingDatas, []);
    assert.deepStrictEqual((w.sent = null, w.c.ranking({}, '/ranking/colosseum'), w.sent).colosseumRanking.rankingDatas, []);
    assert.strictEqual(w.c.shownRankNow(), 0, 'Quests tile «PVE ---»');
    assert.strictEqual(w.presents.length, 0, 'nothing reached');
    w.now += 60000;
    w.start(1, 1); w.clear(1, 1);
    assert.deepStrictEqual(w.presents.map((p) => [p.type, p.id, p.num]), [[3, 90016, 1]], 'the open bracket paid at the clear');
    assert.ok(/^Coliseum April 2016: /.test(w.presents[0].text), w.presents[0].text);
    // the Present Box draws the comment with the game font, which has no en dash (bench 25-11: «10,001st50,000th»)
    assert.ok(/^[ -~]*$/.test(w.presents[0].text) && / - /.test(w.presents[0].text), w.presents[0].text);
    w.now += 60000;
    const top = (w.sent = null, w.c.ranking({}, '/ranking/colosseum'), w.sent).colosseumRanking;
    assert.deepStrictEqual(top.rankingDatas.map((x) => [x.rank, x.userColosseum.userStageTotalCount, x.arrivalTime]), [[1001, 1, fmt(NOW + 60000)]]);
    assert.strictEqual(top.lastRank, 1001);
    assert.strictEqual(w.c.shownRankNow(), 1001, 'Quests tile «PVE 1001st»');
    assert.strictEqual(w.presents.length, 1, 'once');
    own();
    assert.strictEqual(w.presents.length, 1, 'once');
    const border = (w.sent = null, w.c.ranking({}, '/ranking/colosseum/border'), w.sent).colosseumRankingBorder;
    assert.deepStrictEqual(border.rankingDatas.map((x) => x.rank), [1, 1001], 'one row per threshold, top first');
  },
  kept_season_wins() {
    const w = world();
    w.player.colosseum = { kept: 900 };
    assert.strictEqual(w.c.liveSeason().id, 900);
    assert.strictEqual(w.call('list').colosseumInfo.colosseumStageId, 900);
    w.player.colosseum.kept = 4242; // not served: the story season
    assert.strictEqual(w.c.liveSeason().id, 800);
  },
  season_progress_kept_apart() {
    const w = world();
    w.start(1, 1); w.clear(1, 1);
    w.week.shopFrom = '2016-05-05';
    assert.strictEqual(w.c.coinsOf(), 0, 'a new season starts at 0 coins');
    assert.strictEqual(w.call('list').colosseumStages[0].stageCount, 1);
    w.week.shopFrom = '2016-04-14';
    assert.strictEqual(w.c.coinsOf(), 1, 'April kept its coins');
  },
  add_coins() {
    const w = world();
    assert.strictEqual(w.c.addCoins(5), true);
    assert.strictEqual(w.c.coinsOf(), 5);
    w.week.shopFrom = '2016-08-04';
    assert.strictEqual(w.c.addCoins(5), false, 'no live season: not paid');
  },
  // tierReached (Coliseum «Tier N Bonus» boards): Tier N of the live season is reached when Tier N-1 is complete (round 1 of Tier N
  // playable); fixture: Tier 1 = rounds 1-3, Tier 2 = rounds 4-5, Tier 3 endless
  tier_reached() {
    const w = world();
    assert.strictEqual(w.c.tierReached(1), true, 'Tier 1 from the start');
    assert.strictEqual(w.c.tierReached(2), false);
    w.player.colosseum.seasons[800].last = 3; w.player.colosseum.seasons[800].open = 4;
    assert.strictEqual(w.c.tierReached(2), true, 'Tier 1 complete');
    assert.strictEqual(w.c.tierReached(3), false);
    w.player.colosseum.seasons[800].last = 5; w.player.colosseum.seasons[800].open = 6;
    assert.strictEqual(w.c.tierReached(3), true);
    assert.strictEqual(w.c.tierReached(10), false, 'no Tier 10 in this season');
    w.week.shopFrom = '2016-05-05';
    assert.strictEqual(w.c.tierReached(2), false, 'May: nothing cleared');
    w.week.shopFrom = '2016-08-04';
    assert.strictEqual(w.c.tierReached(1), false, 'no live season');
  },
  // spendCoins (Coliseum boards, Task 5): the live season's coins; short -> false, nothing spent
  spend_coins() {
    const w = world();
    w.c.addCoins(10);
    assert.strictEqual(w.c.spendCoins(11), false);
    assert.strictEqual(w.c.coinsOf(), 10, 'nothing spent');
    assert.strictEqual(w.c.spendCoins(4), true);
    assert.strictEqual(w.c.coinsOf(), 6);
    assert.strictEqual(w.player.colosseum.seasons[800].coins, 6);
    assert.strictEqual(w.c.spendCoins(0), true, 'a free node');
    assert.strictEqual(w.c.spendCoins(-1), false, 'never a refund');
    w.week.shopFrom = '2016-05-05';
    assert.strictEqual(w.c.spendCoins(1), false, 'May has no coins');
    assert.strictEqual(w.player.colosseum.seasons[800].coins, 6, 'April untouched');
    w.week.shopFrom = '2016-08-04';
    assert.strictEqual(w.c.spendCoins(0), false, 'no live season');
  },
  close_date() {
    const w = world();
    // the Shop week moves into May two real weeks from now: the season ends that Monday
    const wk = clock.weekIndex(NOW);
    w.weeksAhead = (k) => (k >= wk + 2 ? '2016-05-05' : k <= wk - 1 ? '2016-03-31' : '2016-04-21');
    assert.deepStrictEqual(w.c.closeDate(NOW), { colosseumStageId: 800, date: fmt(clock.weekStartOf(wk + 2)) });
    const b = w.c.seasonBounds(NOW);
    assert.strictEqual(b.start, clock.weekStartOf(wk));
    // the rotation never leaves April: this week's end
    w.weeksAhead = null;
    assert.strictEqual(w.c.closeDate(NOW).date, fmt(clock.weekEnd(NOW)));
    w.week.shopFrom = '2016-08-04';
    assert.strictEqual(w.c.closeDate(NOW), null);
  },
  keep_unkeep() {
    const w = world();
    w.week.shopFrom = '2016-06-02';
    assert.strictEqual(w.c.keep(1100).body.why, 'later');
    assert.strictEqual(w.c.keep(1000).body.why, 'now');
    assert.strictEqual(w.c.keep(31).code, 404);
    assert.deepStrictEqual(w.c.keep(800), { code: 200, body: { ok: true } });
    assert.strictEqual(w.c.liveSeason().id, 800);
    assert.strictEqual(w.c.catalogCard(800).state, 'kept');
    w.c.unkeep();
    assert.strictEqual(w.player.colosseum.kept, null);
  },

  // ---- Coliseum Catalog (Task 6): the Raid / Event Catalog states (calendar-util.js rowState) on the season months ----
  catalog_states() {
    const w = world();
    w.week = { storyQuest: 200, shopFrom: '2016-06-02', shopTo: '2016-06-08' };
    const st = () => Object.fromEntries(w.c.catalogRows().map((r) => [r.colosseumStageId, r.state]));
    assert.deepStrictEqual(w.c.catalogRows().map((r) => [r.colosseumStageId, r.month]), [[800, '2016-04'], [900, '2016-05'], [1000, '2016-06'], [1100, '2016-07']]);
    assert.deepStrictEqual(st(), { 800: 'can', 900: 'can', 1000: 'now', 1100: 'later' });
    assert.ok(w.c.catalogRows().every((r) => r.base === r.state), 'nothing kept: base = state');
    // a Shop week spanning two months counts for the month it starts in: July is reached but not the season (other, no keep)
    w.week = { storyQuest: 200, shopFrom: '2016-06-27', shopTo: '2016-07-03' };
    assert.deepStrictEqual(st(), { 800: 'can', 900: 'can', 1000: 'now', 1100: 'other' });
    assert.deepStrictEqual(w.c.keep(1100), { code: 409, body: { ok: false, why: 'other' } });
    // the catalog card: tiers, AP, boards and the player's progress of that season
    const r = w.c.catalogRows().find((x) => x.colosseumStageId === 800);
    assert.strictEqual(r.tiers, 3);
    assert.deepStrictEqual([r.apMin, r.apMax], [3, 5]);
    assert.deepStrictEqual(r.boardIds, [2200001]);
    assert.deepStrictEqual([r.coins, r.userRank, r.userStageCount, r.userStageTotalCount], [0, 1, 0, 0]);
  },
  catalog_keep_past_season() {
    const w = world();
    w.week = { storyQuest: 200, shopFrom: '2016-06-02', shopTo: '2016-06-08' };
    assert.strictEqual(w.c.liveSeason().id, 1000, 'the story season');
    assert.deepStrictEqual(w.c.keep(800), { code: 200, body: { ok: true } });
    assert.strictEqual(w.player.colosseum.kept, 800);
    assert.deepStrictEqual([w.c.liveSeason().id, w.c.liveSeason().kept], [800, true]);
    assert.strictEqual(w.call('list').colosseumInfo.colosseumStageId, 800, '124 plays the kept season');
    const st = Object.fromEntries(w.c.catalogRows().map((r) => [r.colosseumStageId, r.state]));
    assert.deepStrictEqual(st, { 800: 'kept', 900: 'can', 1000: 'now', 1100: 'later' });
    // keeping another past season replaces it
    assert.strictEqual(w.c.keep(900).code, 200);
    assert.strictEqual(w.c.liveSeason().id, 900);
    assert.strictEqual(w.c.catalogCard(800).state, 'can');
  },
  catalog_keep_refused() {
    const w = world();
    w.week = { storyQuest: 200, shopFrom: '2016-06-02', shopTo: '2016-06-08' };
    assert.deepStrictEqual(w.c.keep(1000), { code: 409, body: { ok: false, why: 'now' } }, 'the current season');
    assert.deepStrictEqual(w.c.keep(1100), { code: 409, body: { ok: false, why: 'later' } });
    assert.deepStrictEqual(w.c.keep(4242), { code: 404, body: { ok: false, why: 'unknown season' } });
    w.week.storyQuest = 120;
    assert.deepStrictEqual(w.c.keep(800), { code: 409, body: { ok: false, why: 'locked' } }, 'Coliseum not open yet');
    assert.strictEqual((w.player.colosseum || {}).kept || null, null, 'nothing kept');
  },
  catalog_unkeep_returns_to_story() {
    const w = world();
    w.week = { storyQuest: 200, shopFrom: '2016-06-02', shopTo: '2016-06-08' };
    w.c.keep(800);
    assert.deepStrictEqual(w.c.unkeep(), { code: 200, body: { ok: true } });
    assert.strictEqual(w.player.colosseum.kept, null);
    assert.deepStrictEqual([w.c.liveSeason().id, w.c.liveSeason().kept], [1000, false]);
    assert.strictEqual(w.c.catalogCard(800).state, 'can');
  },
  // keep / unkeep never reset nor move a season's progress, coins or boards (user 25-11, option 1)
  catalog_keep_keeps_progress() {
    const w = world();
    w.week = { storyQuest: 200, shopFrom: '2016-06-02', shopTo: '2016-06-08' };
    w.player.colosseum = { seasons: { 800: { last: 4, open: 5, coins: 77, cleared: [1, 2, 3, 4], tierRewards: [1], bestAt: '2026-11-01T00:00:00.000Z' },
      1000: { last: 1, open: 2, coins: 3, cleared: [1], tierRewards: [], bestAt: null } } };
    w.player.colosseumSphere = { 800: { 2200001: { id: 1, unlock: [1, 2] } } };
    const before = JSON.stringify([w.player.colosseum.seasons, w.player.colosseumSphere]);
    w.c.keep(800);
    assert.strictEqual(w.c.coinsOf(), 77, 'the kept season resumes with its coins');
    const card = w.c.catalogCard(800);
    assert.deepStrictEqual([card.userRank, card.userStageCount, card.coins], [2, 1, 77], 'Tier 2 Round 1 (fixture: Tier 1 = 3 rounds)');
    w.c.keep(900); w.c.unkeep();
    assert.strictEqual(w.c.coinsOf(), 3, 'back to the story season and its coins');
    const after = JSON.parse(JSON.stringify([w.player.colosseum.seasons, w.player.colosseumSphere]));
    delete after[0][900]; // the state of a season only read (seasonState fills its defaults), not changed
    delete after[0][1100];
    assert.strictEqual(JSON.stringify(after), before);
  },
  // Catalog filters (I-328): boards = every node of every served board of the season unlocked; tiersDone = the last rewarded tier paid
  catalog_filter_fields() {
    const w = world();
    w.week = { storyQuest: 200, shopFrom: '2016-06-02', shopTo: '2016-06-08' };
    // board 2200001 (SEASON_BOARDS[800]) with nodes 1, 2, 3 on its grid
    w.tables.sphere = [{ sphereBoardId: 2200001, arryId: 2200001, masuId: 2200001, type: 3, boardName: '6★ Cid' }];
    w.tables.sphereArray = [{ arryId: 2200001, spCol4: [1000, 1, 1002, 2, 0, 0, 0, 0, 0], spCol3: Array(9).fill(0), spCol2: [0, 0, 0, 0, 3, 0, 0, 0, 0], spCol1: Array(9).fill(0), spCol0: Array(9).fill(0) }];
    const card = () => w.c.catalogCard(800);
    assert.deepStrictEqual([card().boards, card().tiersDone], ['todo', false], 'nothing done (a board never handed out is not done)');
    w.player.colosseumSphere = { 800: { 2200001: { id: 1, unlock: [1, 3] } } };
    assert.strictEqual(card().boards, 'todo', 'one node short');
    w.player.colosseumSphere[800][2200001].unlock = [3, 2, 1];
    assert.strictEqual(card().boards, 'done', 'every node unlocked');
    assert.strictEqual(w.c.catalogCard(900).boards, 'none', 'a season whose boards are not served: neither');
    // fixture tiers: tier 1 and 2 pay a tier reward, tier 3 (endless) none: the last rewarded tier is 2
    w.player.colosseum = { seasons: { 800: { last: 3, open: 4, coins: 0, cleared: [1, 2, 3], tierRewards: [1], bestAt: null } } };
    assert.strictEqual(card().tiersDone, false, 'tier 2 reward not taken');
    w.player.colosseum.seasons[800].tierRewards = [2, 1];
    assert.strictEqual(card().tiersDone, true, 'tier 2 (last rewarded) taken');
  },
  // Season detail page (26-11): the boards (nodes unlocked / total, coins still needed, bonus tier), the tiers (rounds, AP, coins,
  // rewards, taken), the score thresholds (rounds needed, prizes, reached) and the maps of one season; null for an unknown id
  season_detail() {
    const w = world();
    w.week = { storyQuest: 200, shopFrom: '2016-06-02', shopTo: '2016-06-08' };
    w.tables.sphere = [{ sphereBoardId: 2200001, arryId: 2200001, masuId: 2200001, type: 3, boardName: '6★ Cid' }];
    w.tables.sphereArray = [{ arryId: 2200001, spCol4: [1000, 1, 1002, 2, 0, 0, 0, 0, 0], spCol3: Array(9).fill(0), spCol2: [0, 0, 0, 0, 3, 0, 0, 0, 0], spCol1: Array(9).fill(0), spCol0: Array(9).fill(0) }];
    w.tables.sphereMasu = [{ masuId: 2200001, spherePoint: [10, 20, 40, ...Array(20).fill(0)], rewardSelect: [3, 3, 3, ...Array(20).fill(0)], rewardId: Array(23).fill(90013), rewardValue: Array(23).fill(1) }];
    const d0 = w.c.seasonDetail(800);
    assert.deepStrictEqual(d0.boards, [{ id: 2200001, name: '6★ Cid', served: true, nodes: 3, unlocked: 0, coinsLeft: 70, coinsTotal: 70, bonusTier: null }], 'nothing unlocked');
    // Tier 2 Round 1 cleared (fixture: Tier 1 = 3 rounds), Tier 1 reward taken, node 2 unlocked
    w.player.colosseum = { seasons: { 800: { last: 4, open: 5, coins: 12, cleared: [4], tierRewards: [1], bestAt: null } } };
    w.player.colosseumSphere = { 800: { 2200001: { id: 1, unlock: [2] } } };
    const d = w.c.seasonDetail(800);
    assert.deepStrictEqual(d.boards[0], { id: 2200001, name: '6★ Cid', served: true, nodes: 3, unlocked: 1, coinsLeft: 50, coinsTotal: 70, bonusTier: null });
    assert.deepStrictEqual(d.tiers.map((t) => [t.tier, t.rounds, t.endless, t.ap, t.roundCoins, t.coins, t.items.map((x) => [x.type, x.id, x.num]), t.taken]), [
      [1, 3, false, 3, 1, 30, [[3, 90013, 1]], true], [2, 2, false, 4, 3, 40, [[3, 90015, 2]], false], [3, 999, true, 5, 0, 0, [], false]]);
    // thresholds top first: the open-to-everyone bracket (1 round) reached by 4 rounds, the top one at its interpolated round
    const want = require('./make-colosseum').rankedOf(S800.tiers, w.tables.rankingReward.filter((r) => r.rankingRewardId <= 30101)).thresholds;
    assert.strictEqual(d.best, 4);
    assert.deepStrictEqual(d.ranked.map((b) => [b.startRank, b.endRank, b.rounds, b.reached, b.rewards.map((x) => [x.type, x.id, x.num, x.skillId])]), [
      [1, 1000, want.find((t) => t.startRank === 1).score, false, [[3, 90125, 3, 1101]]], [1001, 5000000, 1, true, [[3, 90016, 1, 0]]]]);
    assert.strictEqual(d.maps, 'worldwide', 'April 2016: the 2016 worldwide maps');
    assert.strictEqual(w.c.seasonDetail(31), null, 'unknown season');
    assert.deepStrictEqual(w.c.seasonDetail(1000).boards.map((b) => [b.id, b.served, b.bonusTier]), [[2210029, false, null], [2210030, false, null], [2210031, false, 10]],
      'boards not in the master: listed, not served; a bonus board with its tier');
    assert.strictEqual(w.c.seasonDetail(900).ranked.length, 1);
    assert.deepStrictEqual(w.c.seasonDetail(1100).ranked, [], 'no ranking rows: no thresholds');
    // maps of the other kinds (make-colosseum.js SEASONS: genStages = generated, relux without them = the JP 4.3.1 sets)
    const kinds = Object.fromEntries(require('./make-colosseum').SEASONS.map((s) => [s.month, routesColosseum.mapsOf(s)]));
    assert.deepStrictEqual([kinds['2016-07'], kinds['2016-08'], kinds['2016-11'], kinds['2016-12'], kinds['2017-04']], ['worldwide', 'generated', 'generated', 'japanese', 'japanese']);
  },
  // Part 2 (Task 5): the 13 seasons 2016-04 .. 2017-04 in month order; a story clock in 2016-12: December now, April .. November can
  // be kept, January .. April 2017 later
  catalog_13_seasons() {
    const w = world();
    const more = [[1200, 4013], [1300, 4014], [1400, 4015], [1500, 4016], [1600, 4017], [1700, 4018], [1800, 4019], [1900, 4020], [2000, 4021]]
      .map(([sid, rk], i) => seasonRows(sid, rk, 21160801 + i * 100));
    w.tables.colosseumStage.push(...more.map((x) => x.stage));
    w.tables.colosseum.push(...more.flatMap((x) => x.tiers));
    w.week = { storyQuest: 400, shopFrom: '2016-12-08', shopTo: '2016-12-14' };
    const rows = w.c.catalogRows();
    assert.deepStrictEqual(rows.map((r) => r.month), ['2016-04', '2016-05', '2016-06', '2016-07', '2016-08', '2016-09', '2016-10', '2016-11', '2016-12',
      '2017-01', '2017-02', '2017-03', '2017-04'], 'month order');
    const st = Object.fromEntries(rows.map((r) => [r.month, r.state]));
    for (const m of ['2016-04', '2016-05', '2016-06', '2016-07', '2016-08', '2016-09', '2016-10', '2016-11']) assert.strictEqual(st[m], 'can', m);
    assert.strictEqual(st['2016-12'], 'now');
    for (const m of ['2017-01', '2017-02', '2017-03', '2017-04']) assert.strictEqual(st[m], 'later', m);
    const html = require('./colosseum-pages').catalogPage(rows, { unlocked: true });
    assert.strictEqual([...html.matchAll(/<div class="row /g)].length, 13);
    assert.ok(html.includes('Show 13 results') && html.includes('13 seasons'));
  },
  // ruling 10: the kept season plays whatever the story month, also when the Shop rotation loops back onto or before it; its row
  // stays 'kept' with its Remove button
  catalog_kept_through_loop_back() {
    const w = world();
    w.week = { storyQuest: 200, shopFrom: '2016-06-02', shopTo: '2016-06-08' };
    assert.strictEqual(w.c.keep(800).code, 200);
    const check = (shopFrom, shopTo, story, base800) => {
      w.week = { storyQuest: 200, shopFrom, shopTo };
      assert.deepStrictEqual([w.c.liveSeason().id, w.c.liveSeason().kept], [800, true], shopFrom);
      assert.strictEqual(w.call('list').colosseumInfo.colosseumStageId, 800, `124 ${shopFrom}`);
      const st = Object.fromEntries(w.c.catalogRows().map((r) => [r.colosseumStageId, r.state]));
      assert.deepStrictEqual(st, story, shopFrom);
      // base: the state of each row with nothing kept (the page restores it after a Remove, final review M2)
      const base = Object.fromEntries(w.c.catalogRows().map((r) => [r.colosseumStageId, r.base]));
      assert.deepStrictEqual(base, { ...story, 800: base800 }, `base ${shopFrom}`);
      // the end shown is the kept season's (the week's end), never the story season's month end
      assert.deepStrictEqual(w.c.closeDate(NOW), { colosseumStageId: 800, date: fmt(clock.weekEnd(NOW)) });
    };
    check('2016-05-05', '2016-05-11', { 800: 'kept', 900: 'now', 1000: 'later', 1100: 'later' }, 'can'); // loop back to May
    check('2016-04-07', '2016-04-13', { 800: 'kept', 900: 'later', 1000: 'later', 1100: 'later' }, 'now'); // to the kept season's own month
    check('2016-03-03', '2016-03-09', { 800: 'kept', 900: 'later', 1000: 'later', 1100: 'later' }, 'later'); // before it
    // the page offers Remove on the kept row
    const html = require('./colosseum-pages').catalogPage(w.c.catalogRows(), { unlocked: true });
    assert.ok(html.includes('data-pin="/web/colosseum/unkeep"'), 'Remove on the kept row');
    w.week = { storyQuest: 200, shopFrom: '2016-05-05', shopTo: '2016-05-11' };
    assert.deepStrictEqual(w.c.unkeep(), { code: 200, body: { ok: true } });
    assert.deepStrictEqual([w.c.liveSeason().id, w.c.liveSeason().kept], [900, false], 'the story season');
  },
  // keep of the kept season and unkeep with nothing kept change nothing: an unfinished round is not dropped
  catalog_keep_noop() {
    const w = world();
    w.week = { storyQuest: 200, shopFrom: '2016-06-02', shopTo: '2016-06-08' };
    w.start(1, 1);
    const fight = w.player.colosseum.fight;
    assert.ok(fight, 'a round started (story season 1000)');
    const saves = w.saves;
    assert.deepStrictEqual(w.c.unkeep(), { code: 200, body: { ok: true } });
    assert.strictEqual(w.player.colosseum.fight, fight, 'unkeep with nothing kept: the round stays');
    w.c.keep(800);
    w.start(1, 1);
    const f2 = w.player.colosseum.fight;
    const saves2 = w.saves;
    assert.deepStrictEqual(w.c.keep(800), { code: 200, body: { ok: true } });
    assert.strictEqual(w.player.colosseum.fight, f2, 'keeping the kept season again: the round stays');
    assert.strictEqual(w.saves, saves2, 'nothing saved');
    assert.ok(saves >= 0);
  },
  // the Coliseum Catalog banner of the Events tab (evStage 6000 of make-colosseum.js, eventType 0, a tap opens its Training
  // Grounds quest): only with its master row and once the Coliseum is open
  catalog_banner() {
    const w = world();
    assert.deepStrictEqual(w.c.catalogEvents(), [], 'no evStage row: no banner');
    w.tables.evStage = [{ eventStageId: 6000, validStageId: 1, stageId: [970000, 0, 0, 0, 0], eventType: 0, detailUrl: '/web/colosseum/catalog' }];
    w.tables.stage = [{ stageId: 970000, useAp: 0 }];
    const [b, ...rest] = w.c.catalogEvents();
    assert.deepStrictEqual(rest, []);
    assert.strictEqual(b.eventStageId, 6000);
    assert.strictEqual(b.eventType, 0);
    assert.strictEqual(b.bannerUrl, `http://web.test/web/colosseum/img/v${routesColosseum.COLOSSEUM_IMG_VERSION}/6000.png`);
    assert.deepStrictEqual(b.stages, [{ stageId: 970000, useAp: 0, score: 0, playStatus: 0, clearMissionIds: [] }]);
    assert.deepStrictEqual([b.status, b.isLock, b.newStageId, b.showIcon, b.complete], [1, 0, 0, 1, 0]);
    assert.strictEqual(b.endTime, fmt(clock.weekEnd(NOW)));
    w.stageStates[970000] = { score: 9, playStatus: 2, clearMissionIds: [1, 2, 3] };
    assert.strictEqual(w.c.catalogEvents()[0].complete, 1, 'crown: every objective of the Training Grounds done');
    w.week.storyQuest = 120;
    assert.deepStrictEqual(w.c.catalogEvents(), [], 'no banner before the Coliseum opens (story quest 130)');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`ok ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.stack}`); }
}

// ---- server.js wiring on the local master_data (Coliseum rows of make-colosseum.js) ----
function wiring() {
  const MASTER = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
  let rows = [];
  try { rows = JSON.parse(fs.readFileSync(path.join(MASTER, 'colosseumStage.json'), 'utf8')); } catch { /* none */ }
  if (!rows.some((r) => r.colosseumStageId === 800)) { console.log('wiring: skipped (no Coliseum rows in master_data)'); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-test-colosseum-routes-'));
  process.env.KHUX_SAVE = path.join(dir, 'save.json');
  process.env.KHUX_COLOSSEUM_IMG = path.join(dir, 'img'); // the Coliseum Catalog cards (game_data/colosseum_img)
  fs.mkdirSync(process.env.KHUX_COLOSSEUM_IMG);
  process.env.KHUX_COLOSSEUM_BOARD_IMG = path.join(dir, 'board_img'); // the Coliseum Board web cards (game_data/colosseum_board_img)
  fs.mkdirSync(process.env.KHUX_COLOSSEUM_BOARD_IMG);
  delete process.env.KHUX_REAL_NOW;
  delete process.env.KHUX_SERVER_TIME;
  const log = console.log, warn = console.warn;
  const quiet = (fn) => { console.log = () => {}; console.warn = () => {}; try { return fn(); } finally { console.log = log; console.warn = warn; } };
  const { _test: t } = quiet(() => require('./server'));
  const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };
  const run = (name, fn) => { try { fn(); console.log(`ok ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.stack}`); } };
  const p = t.player;
  call(t.respondUserCreate, { name: 'Prova', unionId: 1 });

  run('wiring_routes', () => {
    assert.strictEqual(t.route('/colosseum'), 'colosseum');
    assert.strictEqual(t.route('/colosseum/start'), 'colosseumstart');
    assert.strictEqual(t.route('/colosseum/clear'), 'colosseumclear');
    assert.strictEqual(t.route('/colosseum/retire'), 'colosseumretire');
    assert.strictEqual(t.route('/colosseum/reward/list?m=0&v=x'), 'colosseumrewardlist');
    for (const u of ['/ranking/colosseum', '/ranking/colosseum/own', '/ranking/colosseum/border']) assert.strictEqual(t.route(u), 'colosseumranking', u);
    assert.strictEqual(t.route('/ranking/party'), 'rankinglist', 'party rankings unchanged');
  });
  run('wiring_locked_new_player', () => {
    const b = call(t.colosseum().list);
    assert.strictEqual(b.colosseumInfo.status, 2, 'story below 130');
    assert.strictEqual(call(t.respondUser, {}).userData.userPoint.colosseumSpherePoint, 0);
  });
  run('wiring_live_season', () => {
    // story quest 140 cleared, season 800 kept: live season 800
    const q = t.masterRows('stage').find((r) => r.stageKind === 1 && r.id === 140);
    assert.ok(q, 'story quest 140 row');
    p.stageScores = { ...(p.stageScores || {}), [q.stageId]: 1 };
    p.colosseum = { kept: 800 };
    const b = call(t.colosseum().list);
    assert.deepStrictEqual(b.colosseumInfo, { colosseumStageId: 800, status: 1 });
    assert.deepStrictEqual(b.colosseumStages[0], { rank: 1, stageCount: 1, stageId: 20150701, useAp: 3 });
    quiet(() => t.grantItem(17, 0, 12));
    assert.strictEqual(call(t.respondUser, {}).userData.userPoint.colosseumSpherePoint, 12, 'type 17 into the live season');
    assert.strictEqual(p.colosseum.seasons[800].coins, 12);
    // served master: the live season's closeDate is the fake-time season end, the others end with this week (never the 2030 master date)
    const served = t.servedMasterRows('colosseumStage', Date.now());
    const live = served.find((r) => r.colosseumStageId === 800), other = served.find((r) => r.colosseumStageId === 900);
    assert.strictEqual(live.closeDate, quiet(() => t.colosseum().closeDate()).date);
    assert.notStrictEqual(live.closeDate, '2030-12-31 23:59:59');
    assert.strictEqual(live.rankingCloseDate, live.closeDate);
    assert.strictEqual(other.closeDate, quiet(() => t.colosseum().weekCloseDate()));
    assert.notStrictEqual(other.closeDate, '2030-12-31 23:59:59');
    assert.strictEqual(call(t.respondUser, {}).userData.stageResumption.colosseumStageId, 800);
  });
  run('wiring_start_clear', () => {
    const ap = p.ap;
    p.ap = 50;
    const s = call(t.colosseum().start, { rank: 1, stageCount: 1, stageId: 20150701, userKeybladeId: 1 });
    assert.ok(s.startColosseumData, JSON.stringify(s).slice(0, 200));
    assert.strictEqual(p.ap, 47);
    const c = call(t.colosseum().clear, { isSkip: 1, enemyDeadNumber: 3, mimicDeadNumber: 0, maximumDamage: 1, guiltBurstMaximumDamage: 0, userKeybladeId: 1, burst: 0, lux: 10,
      rank: 1, stageCount: 1, stageId: 20150701 });
    assert.deepStrictEqual(c.clearColosseums, [{ rank: 1, stageCount: 1 }]);
    assert.strictEqual(c.userData.userPoint.colosseumSpherePoint, 13);
    assert.strictEqual(c.getLux, 10);
    const r = call(t.colosseum().ranking, '/ranking/colosseum/own').colosseumRankingOwn;
    assert.deepStrictEqual(r.rankingDatas[0].userColosseum, { userRank: 1, userStageCount: 1, userStageTotalCount: 1 });
    // the client's full player-record parser (as High Score): without these keys «200 ERROR :139» (bench 25-11)
    // 128 sends only the rows its rewards touched (inventorySnapshot wired): a round-coin clear changes no medal
    assert.deepStrictEqual(c.userMedals, [], 'no full medal list in 128');
    assert.ok(t.inventoryBlocks(t.serverTime()).userMedals.length > 0, 'the player owns medals');
    for (const k of ['userData', 'userAvatar', 'rank', 'userMedals', 'userSkills', 'userKeyblade', 'petBaseSlotMedal', 'supportUserMedals', 'supportUserSkills',
      'pet', 'emblemIds', 'arrivalTime']) assert.ok(k in r.rankingDatas[0], k);
    assert.strictEqual(typeof r.rankingDatas[0].arrivalTime, 'string');
    p.ap = ap;
  });
  // Coliseum Catalog (Task 6): /web/colosseum/ pages, cards and the Keep / Remove POSTs, the banner first in the Events tab
  run('wiring_catalog_web', () => {
    const web = (url) => { const o = { code: 0, body: null, type: '' }; quiet(() => t.respondColosseumWeb({ writeHead(c, h) { o.code = c; o.type = (h || {})['Content-Type']; }, end(x) { o.body = x; } }, url)); return o; };
    const post = (url) => { const o = { code: 0, body: null }; quiet(() => t.respondColosseumPost({ writeHead(c) { o.code = c; }, end(x) { o.body = JSON.parse(x.toString('utf8')); } }, url)); return o; };
    assert.strictEqual(t.route('/web/colosseum/catalog'), 'colosseumweb');
    assert.strictEqual(t.route('/web/colosseum/keep/900'), 'colosseumweb');
    // story quest 300 (Shop week of May 2016): April can be kept, May is the season of the Story
    const q = t.masterRows('stage').find((r) => r.stageKind === 1 && r.id === 300);
    p.stageScores = { ...(p.stageScores || {}), [q.stageId]: 1 };
    p.colosseum = { seasons: (p.colosseum || {}).seasons };
    const page = web('/web/colosseum/catalog');
    assert.strictEqual(page.code, 200);
    const html = page.body.toString('utf8');
    assert.ok(html.includes('<h1><img class="ic" src="/web/special/icon/tleg.png" alt=""><span>Coliseum Catalog</span><span class="ng">NOT ORIGINAL</span></h1>') && html.includes('<style data-phone>'), 'the catalog page with the phone layout');
    assert.ok(html.includes('<span class="wt"><span class="wp">Coliseum Coins</span> · <span class="wp">May 2016</span></span></small><b>'), 'the coins of the live season (May 2016, the Story season) on the header');
    // every served season of the master (Part 1: 800-1100; with Part 2 the 13 seasons 800-2000), oldest first
    const served = require('./make-colosseum').SEASONS.map((s) => s.colosseumStageId)
      .filter((id) => t.masterRows('colosseumStage').some((r) => r.colosseumStageId === id));
    assert.deepStrictEqual([...html.matchAll(/<div class="row [^"]*" id="q(\d+)"/g)].map((m) => Number(m[1])), served, 'one row per served season, in month order');
    assert.ok(html.includes('id="fbtn"') && html.includes('data-g="bd"') && html.includes('data-g="tr"'), 'the Filters sheet');
    // the cards: game_data/colosseum_img/<id>.png; none: 404
    fs.writeFileSync(path.join(process.env.KHUX_COLOSSEUM_IMG, '6000.png'), 'banner');
    const img = web('/web/colosseum/img/v1/6000.png');
    assert.deepStrictEqual([img.code, img.type, img.body.toString()], [200, 'image/png', 'banner']);
    assert.strictEqual(web('/web/colosseum/img/v1/900.png').code, 404);
    assert.strictEqual(web('/web/colosseum/nothing').code, 404);
    // keep / unkeep follow the catalog states of the story week
    const rows = t.colosseum().catalogRows();
    assert.deepStrictEqual(rows.map((r) => [r.colosseumStageId, r.state]), served.map((id) => [id, id === 800 ? 'can' : id === 900 ? 'now' : 'later']));
    assert.deepStrictEqual(post('/web/colosseum/keep/900'), { code: 409, body: { ok: false, why: 'now' } });
    assert.deepStrictEqual(post('/web/colosseum/keep/800'), { code: 200, body: { ok: true } });
    assert.deepStrictEqual([p.colosseum.kept, t.colosseum().liveSeason().id], [800, 800]);
    assert.ok(web('/web/colosseum/catalog').body.toString('utf8').includes('data-pin="/web/colosseum/unkeep"'), 'the page shows the kept season');
    assert.deepStrictEqual(post('/web/colosseum/unkeep'), { code: 200, body: { ok: true } });
    assert.deepStrictEqual([p.colosseum.kept, t.colosseum().liveSeason().id], [null, 900]);
    assert.deepStrictEqual(post('/web/colosseum/keep/31'), { code: 404, body: { ok: false, why: 'unknown season' } });
    assert.strictEqual(post('/web/colosseum/other').code, 404);
  });
  // Board cards (26-11): game_data/colosseum_board_img (make_avatar_card_web.py --all --strict) at /web/colosseum/board/v<n>/<id>.png;
  // the season detail page /web/colosseum/season/<id> with its Keep / Remove button and the BACK bar from the catalog
  run('wiring_board_cards_and_detail', () => {
    const web = (url) => { const o = { code: 0, body: null, type: '' }; quiet(() => t.respondColosseumWeb({ writeHead(c, h) { o.code = c; o.type = (h || {})['Content-Type']; }, end(x) { o.body = x; } }, url)); return o; };
    const post = (url) => { const o = { code: 0, body: null }; quiet(() => t.respondColosseumPost({ writeHead(c) { o.code = c; }, end(x) { o.body = JSON.parse(x.toString('utf8')); } }, url)); return o; };
    const dir2 = process.env.KHUX_COLOSSEUM_BOARD_IMG;
    assert.strictEqual(web('/web/colosseum/catalog').body.toString('utf8').includes('/web/colosseum/board/v'), false, 'no cards.json: no card, the neutral boxes');
    fs.writeFileSync(path.join(dir2, '2200001.png'), 'cid');
    fs.writeFileSync(path.join(dir2, 'cards.json'), JSON.stringify({ version: 4242, size: 160, ids: [2200001] }));
    const cat = web('/web/colosseum/catalog').body.toString('utf8');
    assert.ok(cat.includes('src="/web/colosseum/board/v4242/2200001.png"'), 'versioned card URL on the April row');
    assert.ok(!cat.includes('/web/colosseum/board/v4242/2200002.png'), 'a card not in cards.json: the neutral box');
    assert.ok(cat.includes('href="/web/colosseum/season/800?from=catalog"'), 'a row opens its detail page');
    const img = web('/web/colosseum/board/v4242/2200001.png');
    assert.deepStrictEqual([img.code, img.type, img.body.toString()], [200, 'image/png', 'cid']);
    assert.strictEqual(web('/web/colosseum/board/v1/2200002.png').code, 404, 'missing card');
    assert.strictEqual(web('/web/colosseum/board/v1/..%2Fcards.json').code, 404, 'numeric ids only');
    // the detail page (story week of May 2016: April can be kept)
    p.colosseum = { seasons: (p.colosseum || {}).seasons };
    const det = web('/web/colosseum/season/800?from=catalog');
    assert.strictEqual(det.code, 200);
    const h = det.body.toString('utf8');
    for (const s of ['Coliseum Boards</h2>', 'Tiers</h2>', 'Score thresholds', 'Maps</h2>']) assert.ok(h.includes(s), s);
    assert.ok(h.includes('<style data-phone>'), 'phone layout');
    assert.ok(h.includes('href="/web/colosseum/catalog#q800"'), 'BACK to the catalog row');
    assert.ok(h.includes('6★ Cid') && h.includes('src="/web/colosseum/board/v4242/2200001.png"'), 'the board with its card');
    assert.ok(h.includes('data-pin="/web/colosseum/keep/800"'), 'Keep button');
    assert.ok(!web('/web/colosseum/season/800').body.toString('utf8').includes('catalog#q800'), 'no BACK bar outside the catalog');
    assert.deepStrictEqual(post('/web/colosseum/keep/800'), { code: 200, body: { ok: true } });
    assert.ok(web('/web/colosseum/season/800').body.toString('utf8').includes('data-pin="/web/colosseum/unkeep"'), 'Remove once kept');
    assert.deepStrictEqual(post('/web/colosseum/unkeep'), { code: 200, body: { ok: true } });
    assert.strictEqual(web('/web/colosseum/season/31').code, 404, 'unknown season');
    assert.strictEqual(web('/web/colosseum/season/abc').code, 404);
  });
  run('wiring_events_tab_first', () => {
    // a master with the Coliseum rows has the catalog row too (make-colosseum.js catalogEvStage, full make-game-tables run)
    assert.ok(t.masterRows('evStage').some((r) => r.eventStageId === 6000), 'evStage 6000 (Coliseum Catalog) in master_data');
    let b = null;
    quiet(() => t.respondStageEvent({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, { eventCategory: 2 }));
    // with the Game Catalog banner (user 26-11) it alone comes first; the Coliseum Catalog opens from its hub page
    if (t.gameCatalogOn()) {
      assert.deepStrictEqual([b.events[0].eventStageId, b.events[0].eventType], [5000, 0], 'the Game Catalog banner first');
      assert.ok(!b.events.some((e) => e.eventStageId === 6000 || e.eventStageId === 8000), 'no Coliseum / Raid Catalog banner');
      return;
    }
    assert.strictEqual(b.events[0].eventStageId, 6000, 'the Coliseum Catalog banner first');
    assert.strictEqual(b.events[0].eventType, 0);
    assert.ok(b.events[0].bannerUrl.endsWith(`/web/colosseum/img/v${routesColosseum.COLOSSEUM_IMG_VERSION}/6000.png`));
    const raidCat = b.events.findIndex((e) => e.eventStageId === 8000);
    assert.strictEqual(raidCat, 1, 'then the Raid Catalog');
  });
  fs.rmSync(dir, { recursive: true, force: true });
}
wiring();

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log('colosseum routes: ok');
