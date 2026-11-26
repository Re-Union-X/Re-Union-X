// Coliseum boards (sphere type 3; Coliseum Part 1 Task 5): routes-colosseum-boards.js on synthetic boards riding on the real
// season ids (make-colosseum.js SEASON_BOARDS), then server.js on the local master_data (the 1.1.3 boards of make-colosseum.js):
// GET /user/sphere, /user/sphere/check, /user/sphere/update, userPoint.colosseumSpherePoint.
//   node server/test-colosseum-boards.js
'use strict';
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const colosseumBoardRoutes = require('./routes-colosseum-boards');
const { SEASON_BOARDS, BONUS_TIER } = require('./make-colosseum');
const rb = require('./raid-boards');

const HOME = { checkTypes: [1, 2], boardTypes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
const CLOSE = { checkTypes: [3], boardTypes: [1] };

const masu = (id, cells, done) => {
  const m = { masuId: id, sphereBoardId: id };
  for (const k of ['spherePoint', 'rewardSelect', 'medalCategory', 'rewardId', 'rewardExpand', 'rewardExpandId', 'rewardValue', 'burstUpperNumber']) m[k] = Array(23).fill(0);
  cells.forEach(([cost, sel, rid, val], i) => { m.spherePoint[i] = cost; m.rewardSelect[i] = sel; m.rewardId[i] = rid; m.rewardValue[i] = val; });
  [m.rewardSelect[22], m.rewardId[22], m.rewardValue[22]] = done;
  return m;
};
const sphereRow = (id, name) => ({ sphereBoardId: id, boardName: name, kindId: 0, boardId: 3, arryId: id, masuId: id, type: 3, openId: 3, openParam: 0,
  price: 0, detailUrl: '', startDatetime: '2015-01-01 00:00:00', endDatetime: '2030-12-31 23:59:59' });

// April 2016 (800): one board of 2 cells (medal 30 coins, jewels 50 coins; completion title); May 2016 (900): two boards
const APR = SEASON_BOARDS[800][0], MAY1 = SEASON_BOARDS[900][0], MAY2 = SEASON_BOARDS[900][1];
const TABLES = () => ({
  sphere: [sphereRow(APR, '6★ Cid'), sphereRow(MAY1, '6★ Scrooge'), sphereRow(MAY2, 'Tier 10 Bonus'), { ...sphereRow(4999001, 'Event'), type: 4 },
    ...[...SEASON_BOARDS[1600], ...SEASON_BOARDS[1800], ...SEASON_BOARDS[4000]].map((id) => sphereRow(id, BONUS_TIER[id] ? `Tier ${BONUS_TIER[id]} Bonus` : 'Avatar'))],
  sphereArray: [rb.gridRow(APR, 2), rb.gridRow(MAY1, 1), rb.gridRow(MAY2, 1), rb.gridRow(4999001, 1), ...[...SEASON_BOARDS[1600], ...SEASON_BOARDS[1800], ...SEASON_BOARDS[4000]].map((id) => rb.gridRow(id, 1))],
  sphereMasu: [masu(APR, [[30, 3, 90035, 0], [50, 2, 0, 5]], [7, 17001, 0]), masu(MAY1, [[70, 3, 90125, 0]], [7, 17002, 0]), masu(MAY2, [[300, 3, 90016, 0]], [3, 90016, 0]),
    masu(4999001, [[1, 2, 0, 1]], [2, 0, 1]),
    // Coliseum Part 2: the 2016-12 (1600) and 2017-02 (1800: Tier 10 and Tier 11 Bonus) boards
    ...[...SEASON_BOARDS[1600], ...SEASON_BOARDS[1800], ...SEASON_BOARDS[4000]].map((id) => masu(id, [[50, 3, 90076, 0]], [3, 90076, 0]))],
});

function world(opts = {}) {
  // reached: the highest tier reached per season (colosseum().tierReached of the live season); default Tier 10 everywhere
  const w = { live: opts.live === undefined ? 800 : opts.live, reached: opts.reached || { 800: 10, 900: 10 }, coins: {}, grants: [], presents: [], logs: [], nextId: 100, medals: opts.medals || 0, cap: opts.cap || 300 };
  // w.kept (a kept season) wins over w.live (the season of the story clock), as routes-colosseum.js liveSeason
  w.kept = opts.kept || null;
  const liveOf = () => w.kept || w.live;
  w.player = opts.player || {};
  w.tables = TABLES();
  // the colosseum() factory as far as the boards use it: the live season and its coins
  const col = {
    liveSeason: () => (liveOf() ? { id: liveOf(), month: { 800: '2016-04', 900: '2016-05', 1600: '2016-12', 1800: '2017-02' }[liveOf()] || '2016-06', kept: !!w.kept } : null),
    coinsOf: () => (liveOf() ? w.coins[liveOf()] || 0 : 0),
    tierReached: (t) => !!liveOf() && (w.reached[liveOf()] || 1) >= t,
    spendCoins: (n) => { const l = liveOf(); if (!l || (w.coins[l] || 0) < n) return false; w.coins[l] -= n; return true; },
  };
  w.cb = colosseumBoardRoutes({
    player: w.player, master: (t) => w.tables[t] || [], now: () => 1234, colosseum: () => col,
    grantSphereReward: (m, i) => { w.grants.push([m.masuId, i]); if (m.rewardSelect[i] === 3) w.medals++; },
    medalCount: () => w.medals, medalCap: () => w.cap, addPresent: (it, text) => w.presents.push({ ...it, text }),
    nextUserSphereId: () => ++w.nextId, log: (m) => w.logs.push(m),
  });
  return w;
}

const tests = {
  // the live season's boards are listed (state made for good), another season's are not
  lists_live_season_only() {
    const w = world({ live: 900 });
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [MAY1, MAY2]);
    assert.deepStrictEqual(Object.keys(w.player.colosseumSphere), ['900'], 'stored per season');
    assert.deepStrictEqual(Object.keys(w.player.colosseumSphere[900]).map(Number), [MAY1, MAY2]);
    assert.strictEqual(w.player.colosseumSphere[900][MAY1].id, 101);
    assert.ok(!w.cb.list().includes(APR), 'April is not listed in May');
    assert.strictEqual(w.cb.isColosseumBoard(APR), true);
    assert.strictEqual(w.cb.isColosseumBoard(4999001), false, 'a type-4 board is not a Coliseum board');
    w.live = null;
    assert.deepStrictEqual(w.cb.list(), [], 'no live season: no board');
  },
  // buying a node spends the live season's coins and grants the cell reward; completion pays index 22 once
  buy_spends_season_coins() {
    const w = world();
    w.coins = { 800: 100, 900: 999 };
    w.cb.list();
    let r = w.cb.update(APR, 1);
    assert.deepStrictEqual([r.ok, r.nodes, r.cost], [true, [1], 30]);
    assert.deepStrictEqual(w.coins, { 800: 70, 900: 999 }, 'only April coins spent');
    assert.deepStrictEqual(w.grants, [[APR, 0]]);
    assert.deepStrictEqual(w.player.colosseumSphere[800][APR].unlock, [1]);
    r = w.cb.update(APR, 1);
    assert.strictEqual(r.ok, false, 'a node already open is refused');
    assert.strictEqual(w.coins[800], 70);
    r = w.cb.update(APR, 2);
    assert.deepStrictEqual([r.ok, r.cost], [true, 50]);
    assert.deepStrictEqual(w.grants, [[APR, 0], [APR, 1], [APR, 22]], 'cell 2 and the completion reward');
    assert.strictEqual(w.coins[800], 20);
  },
  all_open() {
    const w = world();
    w.coins = { 800: 80 };
    const r = w.cb.update(APR, 0, true);
    assert.deepStrictEqual([r.ok, r.nodes, r.cost], [true, [1, 2], 80]);
    assert.strictEqual(w.coins[800], 0);
    assert.deepStrictEqual(w.grants.map((g) => g[1]), [0, 1, 22]);
  },
  // not enough coins: refused, nothing spent, nothing granted
  short_of_coins_refused() {
    const w = world();
    w.coins = { 800: 29 };
    const r = w.cb.update(APR, 1);
    assert.deepStrictEqual([r.ok, r.cost], [false, 30]);
    assert.match(r.why, /coins 29 < 30/);
    assert.strictEqual(w.coins[800], 29);
    assert.deepStrictEqual(w.grants, []);
    assert.deepStrictEqual(w.player.colosseumSphere[800][APR].unlock, []);
    assert.strictEqual(w.cb.update(APR, 0, true).ok, false, 'all open: 80 > 29');
    assert.strictEqual(w.coins[800], 29);
  },
  // another season's board: refused, even with the coins (and nothing stored for it)
  other_season_refused() {
    const w = world({ live: 900 });
    w.coins = { 800: 500, 900: 500 };
    const r = w.cb.update(APR, 1);
    assert.deepStrictEqual([r.ok, r.why], [false, 'not handed out']);
    assert.deepStrictEqual(w.coins, { 800: 500, 900: 500 });
    assert.strictEqual((w.player.colosseumSphere || {})[800], undefined);
    assert.deepStrictEqual([w.cb.update(4999001, 1).ok, w.cb.update(4999001, 1).why], [false, 'not a Coliseum board']);
  },
  // a node bought in April stays bought when April comes back (kept season or the story clock)
  april_comes_back() {
    const w = world();
    w.coins = { 800: 100 };
    w.cb.update(APR, 1);
    const id = w.player.colosseumSphere[800][APR].id;
    w.live = 900;
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [MAY1, MAY2]);
    w.live = 800;
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [APR]);
    assert.deepStrictEqual(w.player.colosseumSphere[800][APR], { id, unlock: [1], getDatetime: 1234 }, 'same state, same userSphereBoardId');
    assert.strictEqual(w.cb.stateOf(APR).unlock[0], 1);
    assert.strictEqual(w.cb.update(APR, 1).ok, false, 'still bought');
  },
  // check: the live boards are added once; a season change closes the old ones (checkTypes 3); progress stays
  check_add_once_and_close() {
    const w = world();
    assert.deepStrictEqual(w.cb.check(HOME), { add: [APR], close: [] });
    assert.deepStrictEqual(w.cb.check(HOME), { add: [], close: [] }, 'once');
    assert.deepStrictEqual(w.cb.check({ checkTypes: [1, 2], boardTypes: [4] }), { add: [], close: [] }, 'a check without type 3 adds nothing');
    w.live = 900;
    assert.deepStrictEqual(w.cb.check(CLOSE), { add: [], close: [APR] }, 'April closed');
    assert.deepStrictEqual(w.cb.check(HOME), { add: [MAY1, MAY2], close: [] });
    assert.deepStrictEqual(w.player.colosseumSphereSent, [MAY1, MAY2]);
    assert.ok(w.player.colosseumSphere[800][APR], 'April progress kept');
  },
  // a «Tier N Bonus» board (make-colosseum.js BONUS_TIER) is handed out only once Tier N of its season is reached (Tier N-1
  // complete): before, it is not listed nor bought; then the next check announces it; it stays when the season comes back
  bonus_board_after_tier() {
    assert.strictEqual(BONUS_TIER[MAY2], 10, 'the second May board is the Tier 10 Bonus');
    const w = world({ live: 900, reached: { 800: 1, 900: 9 } });
    w.coins = { 900: 1000 };
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [MAY1], 'Tier 9: not listed');
    assert.deepStrictEqual(w.cb.check(HOME), { add: [MAY1], close: [] });
    const r = w.cb.update(MAY2, 1);
    assert.deepStrictEqual([r.ok, r.why], [false, 'not handed out']);
    assert.strictEqual(w.coins[900], 1000, 'nothing spent');
    assert.strictEqual((w.player.colosseumSphere[900] || {})[MAY2], undefined, 'no state yet');
    w.reached[900] = 10;
    assert.deepStrictEqual(w.cb.check(HOME), { add: [MAY2], close: [] }, 'announced by the next check');
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [MAY1, MAY2]);
    assert.strictEqual(w.cb.update(MAY2, 1).ok, true);
    w.live = 800;
    assert.deepStrictEqual(w.cb.check(CLOSE).close, [MAY1, MAY2]);
    w.live = 900;
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [MAY1, MAY2], 'still listed when May comes back');
    assert.deepStrictEqual(w.player.colosseumSphere[900][MAY2].unlock, [1]);
  },
  // Coliseum Part 2: a kept 2016-05 season lists only its own boards while the story is in 2016-12; removing the keep brings
  // the 2016-12 boards (its Tier 10 Bonus only once Tier 10 is reached); May's progress stays apart
  kept_season_boards_stay_apart() {
    const w = world({ live: 1600, kept: 900, reached: { 900: 10, 1600: 1 } });
    w.coins = { 900: 500, 1600: 500 };
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [MAY1, MAY2], 'kept May: May boards only');
    for (const id of SEASON_BOARDS[1600]) assert.deepStrictEqual([w.cb.update(id, 1).ok, w.cb.update(id, 1).why], [false, 'not handed out'], `${id} not while May is kept`);
    assert.strictEqual(w.cb.update(MAY1, 1).ok, true);
    assert.deepStrictEqual(w.coins, { 900: 430, 1600: 500 }, 'May coins only (cell 1: 70)');
    w.kept = null;
    const [M, F, BONUS] = SEASON_BOARDS[1600];
    assert.deepStrictEqual(w.cb.check(CLOSE).close, [MAY1, MAY2], 'May closed');
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [M, F], 'the story season, its bonus board hidden before Tier 10');
    w.reached[1600] = 10;
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [M, F, BONUS]);
    assert.deepStrictEqual(Object.keys(w.player.colosseumSphere).sort(), ['1600', '900'], 'stored per season');
    assert.deepStrictEqual(w.player.colosseumSphere[900][MAY1].unlock, [1], 'May progress kept apart');
  },
  // a season with a Tier 10 and a Tier 11 Bonus (2017-02 .. 2017-04): each appears with its own tier
  tier11_bonus_after_tier11() {
    const [M, F, T10, T11] = SEASON_BOARDS[1800];
    assert.deepStrictEqual([BONUS_TIER[T10], BONUS_TIER[T11], BONUS_TIER[M], BONUS_TIER[F]], [10, 11, undefined, undefined]);
    const w = world({ live: 1800, reached: { 1800: 9 } });
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [M, F]);
    w.reached[1800] = 10;
    assert.deepStrictEqual(w.cb.check(HOME), { add: [M, F, T10], close: [] });
    w.reached[1800] = 11;
    assert.deepStrictEqual(w.cb.check(HOME), { add: [T11], close: [] }, 'the Tier 11 Bonus announced at Tier 11');
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [M, F, T10, T11]);
  },
  // Coliseum Part 3b: a season with Tier 11 / 12 / 13 Bonus boards (2018-12 .. 2019-04): each appears on reaching its own tier
  tier12_13_bonus_after_tier() {
    const [BOARD, T11, T12, T13] = SEASON_BOARDS[4000];
    assert.deepStrictEqual([BONUS_TIER[BOARD], BONUS_TIER[T11], BONUS_TIER[T12], BONUS_TIER[T13]], [undefined, 11, 12, 13]);
    const w = world({ live: 4000, reached: { 4000: 10 } });
    w.coins = { 4000: 5000 };
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [BOARD], 'Tier 10: the plain board only');
    for (const [id, tier] of [[T11, 11], [T12, 12], [T13, 13]]) {
      assert.deepStrictEqual([w.cb.update(id, 1).ok, w.cb.update(id, 1).why], [false, 'not handed out'], `${id} not before Tier ${tier}`);
    }
    w.reached[4000] = 11;
    assert.deepStrictEqual(w.cb.check(HOME), { add: [BOARD, T11], close: [] });
    w.reached[4000] = 12;
    assert.deepStrictEqual(w.cb.check(HOME), { add: [T12], close: [] }, 'the Tier 12 Bonus announced at Tier 12');
    assert.strictEqual(w.cb.update(T13, 1).ok, false, 'Tier 13 Bonus not yet at Tier 12');
    w.reached[4000] = 13;
    assert.deepStrictEqual(w.cb.check(HOME), { add: [T13], close: [] }, 'the Tier 13 Bonus announced at Tier 13');
    assert.deepStrictEqual(w.cb.list({ setSent: true }), [BOARD, T11, T12, T13]);
    assert.strictEqual(w.cb.update(T13, 1).ok, true);
  },
  // a medal cell with the medal storage full goes to the Presents (as the raid rewards), the coins are still spent
  medal_over_cap_to_presents() {
    const w = world({ medals: 300, cap: 300 });
    w.coins = { 800: 100 };
    const r = w.cb.update(APR, 1);
    assert.strictEqual(r.ok, true);
    assert.deepStrictEqual(w.grants, [], 'not granted into the full storage');
    assert.deepStrictEqual(w.presents.map((p) => [p.type, p.id, p.num]), [[3, 90035, 1]]);
    assert.match(w.presents[0].text, /Coliseum/);
    assert.strictEqual(w.coins[800], 70);
    w.cb.update(APR, 2);
    assert.deepStrictEqual(w.grants, [[APR, 1], [APR, 22]], 'non-medal cells granted as usual');
    // a skill medal (rewardExpand 3, rewardExpandId = the skill, as the 1.1.3 boards' 6★ cells) keeps its skill in the Present
    const v = world({ live: 900, medals: 300, cap: 300 });
    v.coins = { 900: 100 };
    const m = v.tables.sphereMasu.find((x) => x.masuId === MAY1);
    m.rewardExpand[0] = 3; m.rewardExpandId[0] = 1105;
    assert.strictEqual(v.cb.update(MAY1, 1).ok, true);
    assert.deepStrictEqual(v.presents.map((p) => [p.type, p.id, p.num, p.skillId]), [[3, 90125, 1, 1105]]);
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`ok ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.stack}`); }
}

// ---- server.js on the local master_data (the 1.1.3 boards of make-colosseum.js) ----
function wiring() {
  const MASTER = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
  let rows = [];
  try { rows = JSON.parse(fs.readFileSync(path.join(MASTER, 'sphere.json'), 'utf8')); } catch { /* none */ }
  if (!rows.some((r) => r.sphereBoardId === SEASON_BOARDS[800][0] && r.type === 3)) { console.log('wiring: skipped (no Coliseum boards in master_data)'); return; }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-test-colosseum-boards-'));
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
  const ids = (list) => list.map((d) => d.sphereBoardId).filter((id) => id >= 2200001 && id <= 2299999);
  const [CID] = SEASON_BOARDS[800];

  // BONUS_TIER = the served type-3 boards named «Tier N Bonus», with that N
  run('wiring_bonus_tier_map', () => {
    const named = {};
    for (const r of t.masterRows('sphere')) {
      const m = r.type === 3 && /^Tier (\d+) Bonus$/.exec(r.boardName);
      if (m) named[r.sphereBoardId] = Number(m[1]);
    }
    // the boards served by this master (Part 1 only until the regen of the nine new seasons)
    const served = new Set(t.masterRows('sphere').filter((r) => r.type === 3).map((r) => r.sphereBoardId));
    assert.deepStrictEqual(named, Object.fromEntries(Object.entries(BONUS_TIER).filter(([id]) => served.has(Number(id)))));
    assert.ok(Object.keys(named).length >= 3);
  });
  run('wiring_no_live_season', () => {
    assert.deepStrictEqual(ids(quiet(() => t.userSphereAll({ setSent: true })).userSphereDatas), [], 'story below 130: no Coliseum board');
  });
  run('wiring_list_check_update', () => {
    const q = t.masterRows('stage').find((r) => r.stageKind === 1 && r.id === 140);
    p.stageScores = { ...(p.stageScores || {}), [q.stageId]: 1 };
    p.colosseum = { kept: 800 };
    assert.deepStrictEqual(ids(quiet(() => t.userSphereAll({ setSent: true })).userSphereDatas), [CID], 'the April board only');
    let b = call(t.respondSphereCheck, HOME);
    assert.deepStrictEqual(ids(b.userSphere.userSphereDatas), [CID], 'added once by the check');
    assert.deepStrictEqual(ids(call(t.respondSphereCheck, HOME).userSphere.userSphereDatas), []);
    // userSphereBoardId: one sequence with the other boards
    const all = quiet(() => t.userSphereAll()).userSphereDatas;
    const uid = all.find((d) => d.sphereBoardId === CID).userSphereBoardId;
    assert.strictEqual(all.filter((d) => d.userSphereBoardId === uid).length, 1, 'unique userSphereBoardId');
    // node 2 (medal 90035, 30 coins): refused with 0 coins, bought with 40
    b = call(t.respondSphereUpdate, { sphereBoardId: CID, releaseMasuId: 2 });
    assert.deepStrictEqual(p.colosseumSphere[800][CID].unlock, [], 'no coins: refused');
    quiet(() => t.grantItem(17, 0, 40));
    quiet(() => t.grantItem(3, 90016, 2)); // medals owned before: not in the answer
    const medals = (p.medals || []).length;
    b = call(t.respondSphereUpdate, { sphereBoardId: CID, releaseMasuId: 2 });
    assert.strictEqual(b.userData.userPoint.colosseumSpherePoint, 10, '40 - 30');
    assert.strictEqual(p.colosseum.seasons[800].coins, 10);
    assert.deepStrictEqual(b.userSphere.userSphereDatas.map((d) => [d.sphereBoardId, d.unlockMasuIds, d.status]), [[CID, [2], 1]]);
    assert.strictEqual(p.medals.length, medals + 1, 'the cell medal');
    assert.deepStrictEqual(b.userMedals.map((m) => m.medalId), [90035], 'only the changed rows');
    // May: April's board closed and not listed, its progress kept
    p.colosseum.kept = 900;
    assert.ok(call(t.respondSphereCheck, CLOSE).closeEventSphereBoardIds.includes(CID), 'April closed');
    const [SCROOGE, BONUS] = SEASON_BOARDS[900];
    assert.deepStrictEqual(ids(quiet(() => t.userSphereAll({ setSent: true })).userSphereDatas), [SCROOGE], 'Tier 10 Bonus waits for Tier 10');
    b = call(t.respondSphereUpdate, { sphereBoardId: BONUS, releaseMasuId: 2 });
    assert.deepStrictEqual(b.userSphere.userSphereDatas, [], 'not bought before Tier 10');
    assert.deepStrictEqual(ids(call(t.respondSphereCheck, HOME).userSphere.userSphereDatas), [SCROOGE], 'the home check: Scrooge only');
    // Tier 9 complete (season 900: rounds 1-119 = Tiers 1-9): Tier 10 Round 1 playable
    const st = p.colosseum.seasons[900] || (p.colosseum.seasons[900] = {});
    Object.assign(st, { last: 119, open: 120, coins: 0, cleared: [], tierRewards: [], bestAt: null });
    assert.deepStrictEqual(ids(call(t.respondSphereCheck, HOME).userSphere.userSphereDatas), [BONUS], 'announced by the next check');
    assert.deepStrictEqual(ids(quiet(() => t.userSphereAll({ setSent: true })).userSphereDatas), [SCROOGE, BONUS]);
    p.colosseum.kept = 800;
    const back = quiet(() => t.userSphereAll({ setSent: true })).userSphereDatas.find((d) => d.sphereBoardId === CID);
    assert.deepStrictEqual([back.unlockMasuIds, back.userSphereBoardId], [[2], uid], 'April comes back as it was');
  });
  // Coliseum Part 2: a kept 2016-05 season lists only its boards while the story is in 2016-12; without the keep the 2016-12
  // boards (skipped on a master without them: the full regen comes with the resources build)
  const DEC = SEASON_BOARDS[1600];
  if (!t.masterRows('sphere').some((r) => r.sphereBoardId === DEC[0])) console.log('wiring_kept_season_apart: skipped (no 2016-12 boards in master_data)');
  else run('wiring_kept_season_apart', () => {
    // the story in 2016-12: the first story quest whose shop week falls in December 2016
    const story = t.masterRows('stage').filter((r) => r.stageKind === 1 && r.id >= 140 && r.id <= 979).sort((a, b) => a.id - b.id);
    const monthAt = (r) => { p.stageScores = { [r.stageId]: 1 }; return String(quiet(() => t.storyCtx()).shopFrom).slice(0, 7); };
    const q = story.find((r) => monthAt(r) >= '2016-12');
    assert.ok(q && monthAt(q) === '2016-12', `a story quest in 2016-12 (${q && q.id})`);
    p.colosseum.kept = 900;
    const [SCROOGE, BONUS] = SEASON_BOARDS[900];
    assert.deepStrictEqual(ids(quiet(() => t.userSphereAll({ setSent: true })).userSphereDatas), [SCROOGE, BONUS], 'kept May: May boards only');
    delete p.colosseum.kept;
    assert.deepStrictEqual(ids(quiet(() => t.userSphereAll({ setSent: true })).userSphereDatas), DEC.slice(0, 2), 'the story season, its Tier 10 Bonus later');
  });
  // Coliseum Part 3: the 2017-12 Blue Reinstar board pays Spirit parts (cells of type 33), also on a save without the pet system
  // (pet off here: KHUX_PET unset; no player.pet): the part is recorded and shows once the pet is on. The board row from the served
  // master, else from the ReLux board extract (private; skipped without both)
  let blue = t.masterRows('sphereMasu').find((r) => r.masuId === 2210095);
  if (!blue) { const rx = require('./make-colosseum').readRelux(process.env.KHUX_COLOSSEUM_RELUX || require('./make-colosseum').DEFAULT_RELUX); blue = rx && rx.sphereMasu.find((r) => r.sphereBoardId === 2210095); }
  if (!blue) console.log('spirit parts paid: skipped (no 2210095 board on disk)');
  else run('spirit parts paid', () => {
    delete p.pet;
    const i = blue.rewardSelect.indexOf(33), part = blue.rewardId[i];
    assert.ok(i >= 0 && part, 'a Spirit-part cell');
    quiet(() => t.grantSphereReward(blue, i));
    assert.ok(p.pet && p.pet.parts && p.pet.parts[part], `Spirit part ${part} recorded`);
  });
  fs.rmSync(dir, { recursive: true, force: true });
}
try { wiring(); } catch (e) { failed++; console.error(`FAIL wiring: ${e.stack}`); }

if (failed) { console.error(`test-colosseum-boards: ${failed} FAIL`); process.exit(1); }
console.log('test-colosseum-boards: all passed');
process.exit(0);
