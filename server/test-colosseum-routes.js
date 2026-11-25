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
    apNow: () => w.ap, changeAp: (d) => { w.ap += d; }, campaignIds: () => [7],
    battlePoints: (gp, burst) => { const l = Number(gp?.lux) || 0; w.lux += l; w.burst = burst; return l; }, beginBattle: (k) => { w.keyblade = k; },
    grantItem: (it) => w.grants.push(it), addPresent: (it, text) => w.presents.push({ ...it, text }),
    element: (now, rank, uc, arrival) => ({ userData: { user: { userId: 1 } }, rank, userColosseum: uc, arrivalTime: arrival }),
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
    w.ap = 2;
    assert.deepStrictEqual(keys(w.start(1, 1)), ['ret', 'userData']);
    assert.strictEqual(w.ap, 2);
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
  clear_wrong_round() {
    const w = world();
    w.start(1, 1);
    const b = w.clear(2, 1);
    assert.deepStrictEqual(b.clearColosseums, [{ rank: 2, stageCount: 1 }]);
    assert.strictEqual(w.player.colosseum.seasons[800].last, 0);
    assert.strictEqual(b.getLux, 0);
  },
  reward_list_sorted() {
    const w = world();
    w.player.colosseum = { seasons: { 800: { last: 5, open: 6, coins: 0, cleared: [], tierRewards: [2, 1], bestAt: null, boardIds: [] } } };
    const b = w.call('rewardList');
    assert.deepStrictEqual(keys(b), ['ret', 'getRewardRankIds']);
    assert.deepStrictEqual(b.getRewardRankIds, [1, 2]);
  },
  ranking_own_entry() {
    const w = world();
    const own = () => { w.sent = null; w.c.ranking({}, '/ranking/colosseum/own'); return w.sent; };
    const e = own();
    assert.deepStrictEqual(keys(e), ['ret', 'colosseumRankingOwn']);
    const r0 = e.colosseumRankingOwn;
    for (const k of ['rankingDatas', 'rankingStatus', 'rankingTermStart', 'rankingTermEnd']) assert.ok(k in r0, k);
    assert.deepStrictEqual(r0.rankingDatas[0].userColosseum, { userRank: 1, userStageCount: 0, userStageTotalCount: 0 });
    assert.ok('arrivalTime' in r0.rankingDatas[0]);
    assert.strictEqual(w.presents.length, 0, 'nothing reached');
    w.now += 60000;
    w.start(1, 1); w.clear(1, 1);
    assert.deepStrictEqual(w.presents.map((p) => [p.type, p.id, p.num]), [[3, 90016, 1]], 'the open bracket paid at the clear');
    assert.ok(/^Coliseum April 2016: /.test(w.presents[0].text), w.presents[0].text);
    w.now += 60000;
    const top = (w.sent = null, w.c.ranking({}, '/ranking/colosseum'), w.sent).colosseumRanking;
    assert.deepStrictEqual(top.rankingDatas.map((x) => [x.rank, x.userColosseum.userStageTotalCount, x.arrivalTime]), [[1001, 1, fmt(NOW + 60000)]]);
    assert.strictEqual(top.lastRank, 1001);
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
    // served master: the live season's closeDate is the fake-time season end, the others keep the master date
    const served = t.servedMasterRows('colosseumStage', Date.now());
    const live = served.find((r) => r.colosseumStageId === 800), other = served.find((r) => r.colosseumStageId === 900);
    assert.strictEqual(live.closeDate, quiet(() => t.colosseum().closeDate()).date);
    assert.notStrictEqual(live.closeDate, '2030-12-31 23:59:59');
    assert.strictEqual(live.rankingCloseDate, live.closeDate);
    assert.strictEqual(other.closeDate, '2030-12-31 23:59:59');
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
  fs.rmSync(dir, { recursive: true, force: true });
}
wiring();

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log('colosseum routes: ok');
