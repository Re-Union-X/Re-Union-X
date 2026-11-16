// High Score Challenge routes (Events Part 8 Task 5, server/routes-hsc.js): the score of a clear (thresholds, bracket difference
// and point milestones into the Presents), the ranking screens (own / border / top), the once-only result popup of
// /ranking/reward/check, the High Score Rewards list and startStageData.highScore; then the wiring of server.js on a fixture
// index. Synthetic fixtures only. Dates: 2026-11-03 is a Tuesday, 20:00 UTC = 12:00 PST.
//   node server/test-hsc-routes.js
'use strict';
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const routesEvents = require('./routes-events');
const routesHsc = require('./routes-hsc');

const TUE = Date.parse('2026-11-03T20:00:00Z');
const fmt = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
const S1 = 4009901, SH = 4009911, SH0 = 4009912;
const stageRow = (stageId, extra = {}) => ({ stageId, stageKind: 2, useAp: 5, stageBinId: 0, validSubmission: 1, submissionRewardType: [4, 0, 0], submissionItemId: [0, 0, 0],
  submissionItemNum: [10, 0, 0], submissionSkillId: [0, 0, 0], validClearGetItem: 0, clearGetItemType: [], clearGetItemId: [], clearGetItemNum: [], ...extra });
const quest = (stageId, extra = {}) => ({ stageId, ap: 5, served: true, status: 'served', ...extra });
// the hsc block as make-events.js writes it (Task 6): thresholds and brackets lowest bracket -> top
const hscBlock = (r) => ({ era: 'C', rankingId: 8000 + r, scoreMedalListId: 0, scoreStartReward: 9000000 + 100 * r, scoreEndReward: 9000001 + 100 * r,
  milestones: [{ score: 1000, rewards: [{ type: 2, id: 0, num: 5 }], scoreRewardId: 9000000 + 100 * r }, { score: 5000, rewards: [{ type: 4, id: 0, num: 1000 }], scoreRewardId: 9000001 + 100 * r }],
  brackets: [{ startRank: 51, endRank: 100, rewards: [{ type: 2, id: 0, num: 5 }] }, { startRank: 11, endRank: 50, rewards: [{ type: 2, id: 0, num: 20 }] },
    { startRank: 1, endRank: 10, rewards: [{ type: 2, id: 0, num: 50 }, { type: 3, id: 90011, num: 1, skillId: 7, skillLv: 2 }] }],
  thresholds: [{ startRank: 51, endRank: 100, score: 2000, label: 'interpolated' }, { startRank: 11, endRank: 50, score: 6000, label: 'scaled' },
    { startRank: 1, endRank: 10, score: 9000, label: 'original' }], scoreBonus: [26], donorRankingId: 6050 });
const INDEX = () => ({ entries: [
  { censusId: 'E-1', evStageId: 29901, name: 'Plain Event', start: '2019-04-01', end: '2019-04-14', stageIds: [S1], available: true, quests: [quest(S1)] },
  { censusId: 'H-1', evStageId: 29911, name: 'Spring Cup', type: 'HSC', start: '2019-04-08', end: '2019-04-14', stageIds: [SH], available: true, quests: [quest(SH)], hsc: hscBlock(1) },
  { censusId: 'H-0', evStageId: 29910, name: 'Winter Cup', type: 'HSC', start: '2019-03-01', end: '2019-03-07', stageIds: [SH0], available: true, quests: [quest(SH0)], hsc: hscBlock(0) },
] });
// master rows (make-events.js hscRows): ranking.startRank..endRank = the rankingReward id range, rankingReward in rank order
const rankingTables = (r) => ({
  ranking: [{ rankingId: 8000 + r, category: 6, startRank: 8000000 + 100 * r, endRank: 8000002 + 100 * r }],
  rankingReward: [{ rankingRewardId: 8000000 + 100 * r, startRank: 1, endRank: 10 }, { rankingRewardId: 8000001 + 100 * r, startRank: 11, endRank: 50 },
    { rankingRewardId: 8000002 + 100 * r, startRank: 51, endRank: 100 }],
});

function world(opts = {}) {
  const w = { now: TUE, week: { shopFrom: '2019-04-08', shopTo: '2019-04-14' }, saves: 0, presents: [], logs: [], sent: [] };
  w.player = opts.player || { name: 'Prova' };
  const t1 = rankingTables(1), t0 = rankingTables(0);
  w.tables = { stage: [stageRow(S1), stageRow(SH), stageRow(SH0)], ranking: [...t0.ranking, ...t1.ranking], rankingReward: [...t0.rankingReward, ...t1.rankingReward] };
  const common = { player: w.player, savePlayer: () => { w.saves++; }, masterRows: (t) => w.tables[t] || [], realNow: () => w.now, serverTimeAt: fmt,
    clock: { weekEnd: (ms) => ms + 7000, dayEnd: (ms) => ms + 1000 }, log: (m) => w.logs.push(m) };
  w.ev = routesEvents({ ...common, eventIndex: () => opts.index || INDEX(), storyWeek: () => w.week, webBase: 'http://x',
    stageState: () => ({ score: 0, playStatus: 0 }), grantItem() {}, grantObjective() {} });
  w.h = routesHsc({ ...common, entryOfStage: (id) => w.ev.entryOfStage(id), listed: () => w.ev.events(),
    addPresent: (type, id, num, comment, skillId, skillLv) => w.presents.push({ type, id, num, comment, ...(skillId ? { skillId, skillLv } : {}) }),
    send: (res, code, body) => { w.sent.push(body); return body; }, ret: () => ({ code: 0 }), serverTime: () => fmt(w.now),
    element: (score, rank) => ({ userData: { user: { name: w.player.name }, userDetail: {} }, userAvatar: {}, rank, userMedals: [], lux: score }) });
  w.body = (fn, ...a) => { w.sent.length = 0; fn(null, ...a); return w.sent[0]; };
  return w;
}

const tests = {
  // Review Focus 5: a score reported on a non-HSC stage (a plain event quest, a story quest) or a non-numeric one is never stored
  score_only_for_hsc_stages() {
    const w = world();
    assert.deepStrictEqual(w.h.onClear(S1, 9999), []);
    assert.deepStrictEqual(w.h.onClear(1001, 9999), []);
    assert.deepStrictEqual(w.h.onClear(SH, 'many'), []);
    assert.deepStrictEqual(w.h.onClear(SH, NaN), []);
    assert.strictEqual(w.player.hsc, undefined, 'nothing stored');
    assert.deepStrictEqual(w.presents, []);
    w.h.onClear(SH, 2500);
    assert.deepStrictEqual(Object.keys(w.player.hsc), ['H-1'], 'an HSC stage counts for its own event id');
  },
  // Review Focus 2: a run worth 0 points (Skip, Give Up, a lost run) pays nothing and changes no rank
  zero_score_pays_nothing() {
    const w = world();
    assert.deepStrictEqual(w.h.onClear(SH, 0), []);
    assert.strictEqual(w.player.hsc, undefined);
    assert.strictEqual(w.h.highScoreRank('H-1'), 100, 'unranked: the lowest bracket\'s upper bound');
    w.h.onClear(SH, 3000);
    const n = w.presents.length, before = JSON.stringify(w.player.hsc);
    assert.deepStrictEqual(w.h.onClear(SH, 0), []);
    assert.strictEqual(w.presents.length, n, 'nothing paid');
    assert.strictEqual(JSON.stringify(w.player.hsc), before, 'nothing changed');
    assert.strictEqual(w.h.highScoreRank('H-1'), 51);
  },
  // the original point milestones: newly reached ones returned in score order (highScoreReward) and paid once into the Presents
  milestone_paid_once_in_order() {
    const w = world();
    assert.deepStrictEqual(w.h.onClear(SH, 5500), [9000100, 9000101]);
    const ms = w.presents.filter((p) => /points/.test(p.comment));
    assert.deepStrictEqual(ms.map((p) => [p.type, p.num, p.comment]), [[2, 5, 'High Score Challenge: Spring Cup — 1,000 points'], [4, 1000, 'High Score Challenge: Spring Cup — 5,000 points']]);
    assert.deepStrictEqual(w.player.hsc['H-1'].milestones, [1000, 5000]);
    assert.deepStrictEqual(w.h.onClear(SH, 5800), [], 'already paid');
    assert.deepStrictEqual(w.h.onClear(SH, 1200), [], 'a lower run');
    assert.strictEqual(w.presents.filter((p) => /points/.test(p.comment)).length, 2);
    assert.strictEqual(w.player.hsc['H-1'].best, 5800);
  },
  // a new bracket pays its rewards minus what the bracket already paid gave, into the Presents with the bracket's text
  bracket_difference_to_presents() {
    const w = world();
    w.h.onClear(SH, 2500);
    const br = () => w.presents.filter((p) => !/points/.test(p.comment));
    assert.deepStrictEqual(br(), [{ type: 2, id: 0, num: 5, comment: 'High Score Challenge: Spring Cup — 51st–100th' }]);
    w.h.onClear(SH, 2600);
    assert.strictEqual(br().length, 1, 'same bracket: nothing more');
    w.h.onClear(SH, 9500);
    assert.deepStrictEqual(br().slice(1), [{ type: 2, id: 0, num: 45, comment: 'High Score Challenge: Spring Cup — 1st–10th' },
      { type: 3, id: 90011, num: 1, comment: 'High Score Challenge: Spring Cup — 1st–10th', skillId: 7, skillLv: 2 }]);
    assert.deepStrictEqual([w.player.hsc['H-1'].best, w.player.hsc['H-1'].paidIndex], [9500, 2]);
    w.h.onClear(SH, 100);
    assert.strictEqual(br().length, 3, 'a lower run pays nothing again');
  },
  // the kept (Event Catalog) play of an HSC counts for its own event id
  kept_event_counts_for_its_id() {
    const w = world();
    assert.deepStrictEqual(w.ev.keep(29910), { code: 200, body: { ok: true } });
    assert.ok(w.ev.events().some((c) => c.stages.some((s) => s.stageId === SH0)), 'the kept HSC is listed');
    w.h.onClear(SH0, 3000);
    assert.deepStrictEqual(Object.keys(w.player.hsc), ['H-0']);
    assert.strictEqual(w.player.hsc['H-0'].best, 3000);
    assert.ok(w.presents.every((p) => /Winter Cup/.test(p.comment)));
    assert.strictEqual(w.h.highScoreRank('H-1'), 100, 'the other HSC is untouched');
  },
  // own entry: the full player record (userData.user nested), rank = the shown rank, lux = the best score; window = the card's
  own_entry_rank_and_score() {
    const w = world();
    w.h.onClear(SH, 6500);
    const b = w.body(w.h.respondRanking, '/ranking/highscore/own');
    const r = b.highscoreRankingOwn;
    assert.ok(r, 'root key highscoreRankingOwn');
    assert.strictEqual(r.rankingDatas.length, 1);
    const me = r.rankingDatas[0];
    assert.ok(me.userData && me.userData.user && me.userData.userDetail, 'nested userData');
    assert.deepStrictEqual([me.rank, me.lux, r.lastRank, r.rankingStatus], [11, 6500, 11, 2]);
    const card = w.ev.events().find((c) => c.stages.some((s) => s.stageId === SH));
    assert.strictEqual(r.rankingTermEnd, card.endTime, 'the HSC card\'s end');
    assert.ok(r.rankingTermStart < r.rankingTermEnd);
    assert.strictEqual(w.h.highScoreRank('H-1'), 11);
    assert.strictEqual(w.h.listedRank(w.ev.events()), 11, '/stage/event highScoreRank of the listed HSC');
    // above the top threshold: 1st
    w.h.onClear(SH, 9001);
    assert.strictEqual(w.body(w.h.respondRanking, '/ranking/highscore/own').highscoreRankingOwn.rankingDatas[0].rank, 1);
  },
  // border view: one row per threshold, top first, rank = the bracket's best rank (the shown rank on reaching it), lux = the score
  border_rows_are_thresholds() {
    const w = world();
    const r = w.body(w.h.respondRanking, '/ranking/highscore/border').highscoreRankingBorder;
    assert.deepStrictEqual(r.rankingDatas.map((x) => [x.rank, x.lux]), [[1, 9000], [11, 6000], [51, 2000]]);
    assert.ok(r.rankingDatas.every((x) => x.userData && x.userData.user));
  },
  // top list: the player only, no fake players
  top_list_is_self_only() {
    const w = world();
    w.h.onClear(SH, 2100);
    const r = w.body(w.h.respondRanking, '/ranking/highscore').highscoreRanking;
    assert.deepStrictEqual(r.rankingDatas.map((x) => [x.rank, x.lux, x.userData.user.name]), [[51, 2100, 'Prova']]);
    // no HSC listed: empty list, as before
    const none = world({ index: { entries: INDEX().entries.filter((e) => !e.hsc) } });
    assert.deepStrictEqual(none.body(none.h.respondRanking, '/ranking/highscore').highscoreRanking.rankingDatas, []);
  },
  // /ranking/reward/check: the result popup once after a new bracket (Task 1 shapes), then empty; /stage/highscore/reward/list
  reward_check_shapes() {
    const w = world();
    const empty = { ret: { code: 0 }, lastRankingResults: [], rankingRewardIds: [], openRankingIds: [], rankingReward: [] };
    assert.deepStrictEqual(w.body(w.h.respondRewardCheck), empty);
    assert.strictEqual(w.h.pendingResult(), false);
    w.h.onClear(SH, 2500);
    w.h.onClear(SH, 6500);
    assert.strictEqual(w.h.pendingResult(), true);
    assert.deepStrictEqual(w.body(w.h.respondRewardCheck), { ret: { code: 0 }, lastRankingResults: [{ lastRankingId: 8001, lastRank: 11, lastUnionRank: 0, pvpClass: 0 }],
      rankingRewardIds: [8000101], openRankingIds: [8001], rankingReward: [] });
    assert.deepStrictEqual(w.body(w.h.respondRewardCheck), empty, 'shown once');
    assert.strictEqual(w.h.pendingResult(), false);
    w.h.onClear(SH, 6600);
    assert.deepStrictEqual(w.body(w.h.respondRewardCheck), empty, 'same bracket: no new popup');
    assert.deepStrictEqual(w.body(w.h.respondRewardList), { ret: { code: 0 }, getHighscore: 6600, getHighscoreRewardIds: [9000100, 9000101] });
  },
  start_sends_best() {
    const w = world();
    assert.strictEqual(w.h.startHighScore(SH), 0);
    w.h.onClear(SH, 4321);
    assert.strictEqual(w.h.startHighScore(SH), 4321);
    assert.strictEqual(w.h.startHighScore(S1), 0, 'not an HSC');
    assert.strictEqual(w.h.bestOfStage(SH), 4321);
    assert.strictEqual(w.h.bestOfStage(S1), null, 'not an HSC: the Lux record stays');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`ok ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.message}`); }
}

// ---- server.js on a fixture index: /stage/start highScore, /stage/clear highScoreReward, the Lux record unchanged, /stage/event ----
function wiring() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-test-hsc-routes-'));
  process.env.KHUX_SAVE = path.join(dir, 'save.json');
  process.env.KHUX_RAID_INDEX = path.join(dir, 'raids.json');
  process.env.KHUX_EVENT_INDEX = path.join(dir, 'events.json');
  delete process.env.KHUX_REAL_NOW;
  delete process.env.KHUX_SERVER_TIME;
  fs.writeFileSync(process.env.KHUX_RAID_INDEX, JSON.stringify({ entries: [], reasons: {} }));
  const hEntry = { ...INDEX().entries[1], start: '2015-01-01', end: '2099-12-31' };
  fs.writeFileSync(process.env.KHUX_EVENT_INDEX, JSON.stringify({ entries: [{ ...INDEX().entries[0], start: '2015-01-01', end: '2099-12-31' }, hEntry], reasons: {} }));
  const extra = { 'stage.json': [stageRow(S1, { stageBinId: 1010 }), stageRow(SH, { stageBinId: 1010 })], ...Object.fromEntries(Object.entries(rankingTables(1)).map(([k, v]) => [`${k}.json`, v])) };
  const readFile = fs.readFileSync;
  fs.readFileSync = (f, ...a) => {
    const out = readFile(f, ...a), b = path.basename(String(f));
    if (!extra[b] || !String(f).includes('master_data')) return out;
    return JSON.stringify(b === 'stage.json' ? [...JSON.parse(out), ...extra[b]] : extra[b]);
  };
  const realDateNow = Date.now;
  Date.now = () => TUE;
  const log = console.log, warn = console.warn;
  const quiet = (fn) => { console.log = () => {}; console.warn = () => {}; try { return fn(); } finally { console.log = log; console.warn = warn; } };
  try {
    const { _test: t } = quiet(() => require('./server'));
    const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };
    const p = t.player;
    call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
    p.ap = 200; p.apTime = TUE;
    assert.strictEqual(t.route('/stage/highscore/reward/list'), 'hscrewardlist');
    assert.strictEqual(t.route('/ranking/highscore/own'), 'hscranking');
    assert.strictEqual(call(t.respondStageStart, { stageId: SH, userKeybladeId: 0 }).startStageData.highScore, 0);
    const out = call(t.respondStageClear, { getEnemyDropItems: [], getMaterials: [], clearMissionIds: [], getPoint: { lux: 300, score: 2500 } });
    assert.deepStrictEqual(out.highScoreReward, [9000100]);
    assert.strictEqual(out.getLux, 300, 'Results Lux unchanged');
    assert.strictEqual(p.stageScores[SH], 300, 'the Lux record of the quest unchanged');
    assert.strictEqual(p.hsc['H-1'].best, 2500);
    assert.strictEqual(call(t.respondStageStart, { stageId: SH, userKeybladeId: 0 }).startStageData.highScore, 2500, 'start_sends_best (server)');
    const second = call(t.respondStageClear, { getEnemyDropItems: [], getMaterials: [], clearMissionIds: [], getPoint: { lux: 200, score: 1500 } });
    assert.deepStrictEqual([second.getLux, second.highScoreReward, p.stageScores[SH]], [200, [], 300], '2nd run: Lux shown, best Lux kept');
    // a plain event quest: its score is never stored
    call(t.respondStageStart, { stageId: S1, userKeybladeId: 0 });
    assert.deepStrictEqual(call(t.respondStageClear, { getEnemyDropItems: [], getMaterials: [], clearMissionIds: [], getPoint: { lux: 50, score: 9999 } }).highScoreReward, []);
    assert.deepStrictEqual(Object.keys(p.hsc), ['H-1']);
    const ev = call(t.respondStageEvent, { eventCategory: 2 });
    const st = (id) => ev.events.flatMap((c) => c.stages).find((s) => s.stageId === id);
    assert.deepStrictEqual([st(SH).score, st(S1).score, ev.highScoreRank], [2500, 50, 51], 'HSC best on the HSC quest, Lux elsewhere, shown rank');
    assert.strictEqual(call(t.respondMyPage).rankingRewards.rankingHighScore, 1, 'a result popup waits');
    const chk = call((res) => t.hsc().respondRewardCheck(res));
    assert.deepStrictEqual([chk.lastRankingResults, chk.rankingRewardIds, chk.openRankingIds], [[{ lastRankingId: 8001, lastRank: 51, lastUnionRank: 0, pvpClass: 0 }], [8000102], [8001]]);
    assert.strictEqual(call(t.respondMyPage).rankingRewards.rankingHighScore, 0);
    const own = call((res) => t.hsc().respondRanking(res, '/ranking/highscore/own')).highscoreRankingOwn.rankingDatas[0];
    assert.deepStrictEqual([own.rank, own.lux, typeof own.userData.user, Array.isArray(own.userMedals), 'emblemIds' in own], [51, 2500, 'object', true, true]);
    assert.ok((p.presents || []).some((x) => x.comment === 'High Score Challenge: Spring Cup — 51st–100th' && x.number === 5));
    console.log('ok wiring_hsc');
  } finally {
    fs.readFileSync = readFile;
    Date.now = realDateNow;
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* temp */ }
  }
}
try { wiring(); console.log('ok wiring'); } catch (e) { failed++; console.error(`FAIL wiring: ${e.stack}`); }

if (failed) { console.error(`test-hsc-routes: ${failed} FAIL`); process.exit(1); }
console.log('test-hsc-routes: OK');
process.exit(0);
