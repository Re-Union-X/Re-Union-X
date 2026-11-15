// Limited and returning avatar boards (Events Part 7, Task 4): avatar-boards.js on hand-made records and master rows (synthetic
// names, no record of the private builder), then server.js with two fixture boards riding on the local master_data sphere tables
// (GET /user/sphere, /user/sphere/check, POST /user/sphere/buy and /update, the served sphere rows, the skill medal grant). The
// server part needs server/master_data (skipped without it).
//   node server/test-avatar-boards.js
'use strict';
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const ab = require('./avatar-boards');
const rb = require('./raid-boards');
const clock = require('./clock');

// ---- fixture: master and records ----
const MASTER = () => ({
  sphere: [{ sphereBoardId: 2100118, boardName: 'Standard', type: 1 }], sphereArray: [], sphereMasu: [],
  medal: [{ medalId: 900001, name: 'Test Hero', rare: 6, groupId: 0 }, { medalId: 900002, name: 'Test Uncle', rare: 6, groupId: 0 }],
  material: [{ materialId: 51 }], title: [{ titleId: 8001 }, { titleId: 2119 }], avatarParts: [{ avatarPartsId: 7001 }, { avatarPartsId: 7002 }], petParts: [],
  skill: [{ skillId: 1100, name: 'Skill One', categoryEvolve: 1 }],
});
const grid = (n) => { const g = rb.gridRow(0, n); delete g.arryId; return g; };
// n nodes: node 1 an avatar part, node 2 a medal, node 3 a skill medal, the others medals; cost per node
const cellsOf = (n, cost) => Array.from({ length: n }, (_, i) => (i === 0 ? { idx: 0, cost, rewardSelect: 23, rewardId: 7001, num: 1, name: 'Avatar part «Test»' }
  : i === 2 ? { idx: 2, cost, rewardSelect: 3, rewardId: 1, num: 1, name: '6★ Test Uncle', skillId: 1100, donorSkillId: 1100, rewardExpand: 3, medalCategory: 10 }
    : { idx: i, cost, rewardSelect: 3, rewardId: 1, num: 1, name: '6★ Test Hero' }));
const board = (donorId, name, n = 4, extra = {}) => ({ donorId, name, kindId: 1, boardId: 2, openId: 3, openParam: 0, detailUrl: '', grid: grid(n),
  cells: cellsOf(n, extra.cost || 0), completion: { rewardSelect: 7, rewardId: 8001, num: 1, name: 'Title «Test»' }, how: 'fixture', ...extra });
const A = 9001, G1 = 9101, G2 = 9102, C = 9201, L = 2100119, W = 9301, H = 9401, HB = 9402, HC = 9403;
const RECORDS = () => ({ entries: [
  { censusId: 'EV-1', key: 'EV-1/outfit', group: 'outfit', type: 2, window: ['2017-04-03', '2017-04-16'], price: 3000, labels: [], boards: [board(A, 'Test Outfit')] },
  { censusId: 'EV-2', key: 'EV-2/gem', group: 'gem', type: 2, window: ['2017-04-03', '2017-04-09'], price: 500, labels: [],
    boards: [board(G1, 'Gem 1'), board(G2, 'Gem 2', 4, { openId: 5, openParam: G1 })] },
  { censusId: 'EV-3', key: 'EV-3/avatarCoin', group: 'avatarCoin', type: 1, window: ['2017-04-10', '2017-04-16'], price: null, labels: [],
    boards: [board(C, 'Coin Board', 3, { boardId: 12, cost: 10 })] },
  { censusId: null, key: 'level/285', group: 'level', type: 1, window: null, level: 285, price: null, labels: [], boards: [board(L, 'Level Board', 3, { boardId: 1, openId: 2, openParam: 285, cost: 20 })] },
  { censusId: 'EV-4', key: 'EV-4/outfit', group: 'outfit', type: 2, window: ['2018-03-19', '2018-03-25'], price: 1500, labels: [], boards: [board(A, 'Test Outfit')] },
  { censusId: null, key: 'khuxwiki@2017-05-01/outfit', group: 'outfit', type: 2, window: ['2017-05-01', '2017-05-07'], price: 2000, labels: ['priceFromKhuxwiki', 'windowFromWiki'],
    boards: [board(W, 'Wiki Outfit')] },
  { censusId: 'EV-5', key: 'EV-5/outfit', group: 'outfit', type: 2, window: ['2017-06-05', '2017-06-11'], price: 1000, labels: [],
    boards: [{ ...board(H, 'Held Outfit'), cells: [...cellsOf(4, 0).slice(0, 3), { idx: 3, cost: 0, rewardSelect: 3, rewardId: 1, num: 1, name: '6★ Nobody Here' }] },
      { ...board(HB, 'Booster Board'), cells: [...cellsOf(4, 0).slice(0, 3), { idx: 3, cost: 0, rewardSelect: 34, rewardId: 1905201, num: 1, name: 'P Booster +30%' }] },
      board(HC, 'Behind Held', 4, { openId: 5, openParam: H })] },
], held: [], unmapped: [] });
const build = (ids = {}, extra = {}) => ab.buildAvatarBoards({ records: RECORDS(), master: MASTER(), ids, boosters: [], ...extra });

// a runtime over the built rows (the master of the server: the fixture rows only)
function world(opts = {}) {
  const out = build();
  const tables = { sphere: out.sphereRows, sphereArray: out.arrayRows, sphereMasu: out.masuRows };
  const w = { out, player: opts.player || { freeStone: 0, spherePoint: 0 }, grants: [], next: 100 };
  w.r = ab.avatarBoardRoutes({ index: out.index, master: (t) => tables[t] || [], now: () => 1234, nextUserSphereId: () => ++w.next,
    grantSphereReward: (m, i) => w.grants.push([m.masuId, i]) });
  return w;
}
const idOf = (out, donorId) => Number(Object.keys(out.index).find((k) => out.index[k].donorId === donorId));
const WEEK1 = { shopFrom: '2017-04-03', shopTo: '2017-04-09', level: 1 };
const WEEK2 = { shopFrom: '2017-04-10', shopTo: '2017-04-16', level: 300 };
const WEEK_RET = { shopFrom: '2018-03-19', shopTo: '2018-03-25', level: 1 };
const WEEK_LATE = { shopFrom: '2019-01-07', shopTo: '2019-01-13', level: 1 };
const HOME = { checkTypes: [1, 2], boardTypes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
const LIST_CLOSE = { checkTypes: [3], boardTypes: [1] };

const tests = {
  rows_have_23_entries() {
    const out = build();
    const schema = ['sphereBoardId', 'boardName', 'kindId', 'boardId', 'arryId', 'masuId', 'type', 'openId', 'openParam', 'price', 'detailUrl', 'startDatetime', 'endDatetime'];
    for (const r of out.sphereRows) assert.deepStrictEqual(Object.keys(r), schema, `sphere row ${r.sphereBoardId}`);
    for (const m of out.masuRows) for (const k of rb.MASU_KEYS) assert.strictEqual(m[k].length, 23, `${m.masuId} ${k}`);
    for (const a of out.arrayRows) for (const k of ['spCol0', 'spCol1', 'spCol2', 'spCol3', 'spCol4']) assert.strictEqual(a[k].length, 9);
    assert.deepStrictEqual(out.sphereRows.map((r) => r.sphereBoardId), out.masuRows.map((r) => r.masuId));
    for (const m of out.masuRows) assert.deepStrictEqual([m.rewardSelect[22], m.rewardId[22]], [7, 8001], 'completion at index 22');
    const a = out.sphereRows.find((r) => r.sphereBoardId === idOf(out, A));
    assert.deepStrictEqual([a.type, a.price, a.boardId, a.detailUrl], [2, 3000, 2, '']);
    assert.strictEqual(out.sphereRows.find((r) => r.sphereBoardId === idOf(out, C)).price, 0, 'type 1: no price');
  },
  ids_append_only() {
    const ids = { avatarBoards: { 99999: 1, [A]: 5 } };
    const out = build(ids);
    const n = out.ids.avatarBoards;
    assert.strictEqual(n[A], 5, 'a number never changes');
    assert.strictEqual(n[99999], 1, 'a key that disappears keeps its number');
    assert.deepStrictEqual([n[G1], n[G2], n[C]], [6, 7, 8], 'new boards after the highest number, in record order');
    assert.strictEqual(idOf(out, A), 5000005);
    assert.ok(!(L in n), 'the level board takes no number');
    assert.deepStrictEqual(build(out.ids).ids, out.ids, 'a second run changes nothing');
    assert.throws(() => build({ avatarBoards: { 1: 3, 2: 3 } }), /repeats/);
    assert.throws(() => build({ avatarBoards: { 1: 0 } }), /outside/);
  },
  level_boards_keep_original_ids() {
    const out = build();
    const l = out.sphereRows.find((r) => r.sphereBoardId === L);
    assert.ok(l, 'the level board keeps 2100119');
    assert.deepStrictEqual([l.type, l.openId, l.openParam, l.price, l.boardId], [1, 2, 285, 0, 1]);
    assert.strictEqual(out.index[L].level, 285);
    // ranges: the 118 standard boards (2100001-2100118) are not ours; a row in 2100119-2100126 or 5000000+ that is not ours stops the run
    ab.checkRanges({ sphere: [{ sphereBoardId: 2100118 }], sphereArray: [{ arryId: 2100001 }], sphereMasu: [{ masuId: 3000001 }] });
    assert.throws(() => ab.checkRanges({ sphere: [{ sphereBoardId: 2100120 }] }), /not ours/);
    assert.throws(() => ab.checkRanges({ sphereMasu: [{ masuId: 5000003 }] }), /not ours/);
    // listed from its level, no purchase
    const w = world();
    assert.ok(!w.r.listedIds(w.player, { ...WEEK1, level: 284 }).includes(L));
    assert.ok(w.r.listedIds(w.player, { ...WEEK_LATE, level: 285 }).includes(L));
    assert.strictEqual(w.r.buy(w.player, L, { ...WEEK1, level: 300 }).why, 'unknown', 'never sold');
    assert.strictEqual(w.r.isBuy(w.player, L), 1);
  },
  listed_in_window_only() {
    const w = world(), o = w.out;
    assert.deepStrictEqual(w.r.listedIds(w.player, WEEK1), [idOf(o, A), idOf(o, G1)].sort((a, b) => a - b), 'week 1: the outfit and Gem 1 (Gem 2 is chained)');
    assert.deepStrictEqual(w.r.listedIds(w.player, WEEK2).filter((id) => id !== L), [idOf(o, A), idOf(o, C)], 'week 2: the outfit and the coin board');
    assert.deepStrictEqual(w.r.listedIds(w.player, WEEK_LATE), [], 'after every window');
    assert.deepStrictEqual(w.r.listedIds(w.player, { shopFrom: '2016-01-04', shopTo: '2016-01-10', level: 1 }), [], 'before');
    assert.deepStrictEqual(w.r.listedIds(w.player, {}), [], 'no story week');
    assert.strictEqual(w.r.isBuy(w.player, idOf(o, A)), 0, 'on sale');
    assert.strictEqual(w.r.isBuy(w.player, idOf(o, C)), 1, 'type 1: open');
  },
  bought_survives_window() {
    const w = world(), a = idOf(w.out, A);
    w.player.freeStone = 5000; w.player.spherePoint = 100;
    assert.strictEqual(w.r.buy(w.player, a, WEEK1).ok, true);
    assert.strictEqual(w.r.update(w.player, a, 1, false, WEEK1).ok, true);
    assert.ok(w.r.listedIds(w.player, WEEK_LATE).includes(a), 'listed in every later week');
    assert.deepStrictEqual(w.player.avatarSphere[a].unlock, [1], 'progress kept');
    assert.strictEqual(w.r.update(w.player, a, 2, false, WEEK_LATE).ok, true, 'still played outside its window');
    assert.strictEqual(w.r.buy(w.player, a, WEEK_RET).why, 'bought', 'its returning window does not sell it again');
    assert.strictEqual(w.player.freeStone, 2000);
    assert.strictEqual(w.r.isBuy(w.player, a), 1);
  },
  // Task 5c (Avatar Board Catalog filters): owned = a type-2 board bought; a type-1 board sent / handed out or with a node
  // unlocked. progress on the nodes: 'none', 'part' (some node unlocked), 'done' (every node)
  owned_and_progress() {
    const w = world(), a = idOf(w.out, A), c = idOf(w.out, C);
    w.player.freeStone = 5000; w.player.spherePoint = 100000;
    assert.deepStrictEqual([w.r.owned(w.player, a), w.r.owned(w.player, c), w.r.progress(w.player, a)], [false, false, 'none']);
    w.player.avatarBoardsSent = [a];
    assert.strictEqual(w.r.owned(w.player, a), false, 'a board on sale sent to the client is not bought');
    assert.strictEqual(w.r.buy(w.player, a, WEEK1).ok, true);
    assert.strictEqual(w.r.owned(w.player, a), true, 'bought');
    assert.strictEqual(w.r.progress(w.player, a), 'none', 'bought, no node yet');
    assert.strictEqual(w.r.update(w.player, a, 1, false, WEEK1).ok, true);
    assert.strictEqual(w.r.progress(w.player, a), 'part');
    assert.strictEqual(w.r.update(w.player, a, 0, true, WEEK1).ok, true);
    assert.strictEqual(w.r.progress(w.player, a), 'done');
    w.player.avatarBoardsSent = [c];
    assert.strictEqual(w.r.owned(w.player, c), true, 'type 1: handed out (sent)');
    w.player.avatarBoardsSent = [];
    w.player.avatarSphere[c] = { id: 1, unlock: [], getDatetime: 0 };
    assert.strictEqual(w.r.owned(w.player, c), false, 'type 1: listed once, no node');
    w.player.avatarSphere[c].unlock = [1];
    assert.strictEqual(w.r.owned(w.player, c), true, 'type 1: a node unlocked');
    assert.deepStrictEqual([w.r.owned(w.player, 1), w.r.progress(w.player, 1)], [false, 'none'], 'unknown id');
  },
  buy_charges_once() {
    const w = world(), a = idOf(w.out, A);
    w.player.freeStone = 5000;
    const r = w.r.buy(w.player, a, WEEK1);
    assert.deepStrictEqual([r.ok, r.price, w.player.freeStone], [true, 3000, 2000]);
    assert.deepStrictEqual(w.player.avatarBoardsBought, [a]);
    assert.deepStrictEqual(w.r.buy(w.player, a, WEEK1), { ok: false, why: 'bought' });
    assert.strictEqual(w.player.freeStone, 2000, 'never charged twice');
  },
  buy_insufficient_jewels() {
    const w = world(), a = idOf(w.out, A);
    w.player.freeStone = 2999;
    const r = w.r.buy(w.player, a, WEEK1);
    assert.deepStrictEqual([r.ok, r.why], [false, 'jewels']);
    assert.strictEqual(w.player.freeStone, 2999, 'nothing charged');
    assert.ok(!(w.player.avatarBoardsBought || []).length && w.r.isBuy(w.player, a) === 0, 'not bought');
  },
  buy_outside_window_refused() {
    const w = world(), a = idOf(w.out, A);
    w.player.freeStone = 99999;
    assert.strictEqual(w.r.buy(w.player, a, WEEK_LATE).why, 'window', 'a crafted buy outside its windows');
    assert.strictEqual(w.r.buy(w.player, idOf(w.out, G2), WEEK1).why, 'window', 'chained: not before Gem 1 is complete');
    assert.strictEqual(w.r.buy(w.player, idOf(w.out, C), WEEK2).why, 'unknown', 'a hand-out board is not sold');
    assert.strictEqual(w.r.buy(w.player, 5999999, WEEK1).why, 'unknown');
    assert.strictEqual(w.player.freeStone, 99999);
    // the kept event (Event Catalog): sold outside its window at its original price
    const k = w.r.buy(w.player, a, WEEK_LATE, 'EV-1');
    assert.deepStrictEqual([k.ok, k.price, w.player.freeStone], [true, 3000, 96999]);
  },
  returning_board_one_id() {
    const w = world(), out = w.out, a = idOf(out, A);
    assert.strictEqual(out.sphereRows.filter((r) => r.boardName === 'Test Outfit').length, 1, 'one row');
    assert.deepStrictEqual(out.index[a].windows.map((x) => [x.key, x.price]), [['EV-1/outfit', 3000], ['EV-4/outfit', 1500]]);
    assert.ok(w.r.listedIds(w.player, WEEK1).includes(a) && w.r.listedIds(w.player, WEEK_RET).includes(a), 'listed in both windows');
    const row = out.sphereRows.find((r) => r.sphereBoardId === a);
    assert.strictEqual(w.r.servedRow(row, WEEK_RET).price, 1500, 'the returning window shows its own price');
    assert.strictEqual(w.r.servedRow(row, WEEK1).price, 3000);
    w.player.freeStone = 2000;
    assert.deepStrictEqual(w.r.buy(w.player, a, WEEK_RET), { ok: true, price: 1500 });
    assert.strictEqual(w.r.buy(w.player, a, WEEK1).why, 'bought', 'one purchase for both windows');
    assert.strictEqual(w.player.freeStone, 500);
  },
  check_never_announces_on_sale() {
    const w = world(), o = w.out, a = idOf(o, A), c = idOf(o, C);
    // login GET then the home check: the coin and level boards are announced once, the outfit on sale never
    const listed = w.r.list(w.player, WEEK2, null, { setSent: true });
    assert.deepStrictEqual(listed, [L, a, c]);
    assert.deepStrictEqual(w.player.avatarBoardsSent, [a], 'the board on sale reached the client through the list');
    assert.deepStrictEqual(w.r.check(w.player, HOME, WEEK2), { add: [L, c], close: [] });
    assert.deepStrictEqual(w.r.check(w.player, HOME, WEEK2), { add: [], close: [] }, 'once');
    // a board on sale that the list has not sent yet is still never announced
    const v = world();
    assert.deepStrictEqual(v.r.check(v.player, HOME, WEEK1), { add: [], close: [] });
    assert.deepStrictEqual(v.r.check(v.player, { checkTypes: [1, 2], boardTypes: [2] }, WEEK1), { add: [], close: [] });
    // bought: the buy answer merged it, no check announces it
    w.player.freeStone = 3000;
    assert.ok(w.r.buy(w.player, a, WEEK2).ok);
    assert.deepStrictEqual(w.r.check(w.player, HOME, WEEK2), { add: [], close: [] });
    // the week moves on: the list's close check drops the coin board; the bought outfit and the level board stay
    assert.deepStrictEqual(w.r.check(w.player, LIST_CLOSE, { ...WEEK_LATE, level: 300 }), { add: [], close: [c] });
    assert.deepStrictEqual(w.r.list(w.player, { ...WEEK_LATE, level: 300 }, null, { setSent: true }), [L, a]);
  },
  end_datetime_is_story_week_end() {
    const w = world(), a = idOf(w.out, A), c = idOf(w.out, C);
    // the clock of the Moogle Shop endDate: the Monday the Shop rotates, in fake time
    const ms = Date.UTC(2026, 10, 15, 12);
    const end = ab.weekEndFake(clock, ms);
    assert.strictEqual(end, clock.fakeString(clock.weekStartOf(clock.weekIndex(ms) + 1), clock.twinOffset(ms)));
    assert.ok(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(end));
    const ctx = { ...WEEK1, weekEnd: end };
    const row = (id) => w.out.sphereRows.find((r) => r.sphereBoardId === id);
    assert.strictEqual(w.r.servedEndDatetime(row(a), ctx), end, 'type 2 counts down to the end of the story week');
    assert.strictEqual(w.r.servedRow(row(c), ctx), row(c), 'type 1: unchanged');
    assert.strictEqual(w.r.servedRow({ sphereBoardId: 2100001, type: 1, endDatetime: rb.END }, ctx).endDatetime, rb.END, 'standard boards: unchanged');
  },
  // Start-Up Boost Board (Task 6b): a permanent type-2 board (khuxwiki «permanently available from version 2.3.1», date unknown):
  // listed in every story week, keyblade cost cells (rewardSelect 22, value 5) and no weekly countdown (the row's far end stays)
  permanent_board_no_countdown() {
    const P = 9501;
    const cells = [{ idx: 0, cost: 0, rewardSelect: 22, rewardId: 0, num: 5 }, { idx: 1, cost: 0, rewardSelect: 3, rewardId: 1, num: 1, name: '6★ Test Hero' },
      { idx: 2, cost: 0, rewardSelect: 22, rewardId: 0, num: 5 }];
    const rec = { entries: [{ censusId: null, key: 'startUpBoost/medal', group: 'medal', type: 2, window: ['2016-04-07', '2021-06-29'], price: 100,
      permanent: true, labels: ['permanentFromWiki'], boards: [{ ...board(P, 'Boost Board', 3), cells, completion: { rewardSelect: 3, rewardId: 1, num: 1, name: '6★ Test Hero' } }] }], held: [], unmapped: [] };
    const out = ab.buildAvatarBoards({ records: rec, master: MASTER(), ids: {}, boosters: [] });
    const id = idOf(out, P);
    assert.strictEqual(out.index[id].permanent, true, 'the index says the board is permanent');
    const masu = out.masuRows[0];
    assert.deepStrictEqual([masu.rewardSelect[0], masu.rewardValue[0], masu.rewardSelect[2], masu.rewardValue[2]], [22, 5, 22, 5], 'keyblade cost +5 cells');
    const tables = { sphere: out.sphereRows, sphereArray: out.arrayRows, sphereMasu: out.masuRows };
    const r = ab.avatarBoardRoutes({ index: out.index, master: (t) => tables[t] || [], now: () => 1, nextUserSphereId: () => 1 });
    const row = out.sphereRows[0];
    const ctx = { ...WEEK_LATE, weekEnd: '2019-01-14 08:00:00' };
    assert.strictEqual(r.servedEndDatetime(row, ctx), rb.END, 'permanent: no weekly countdown, the far end of the row');
    assert.strictEqual(r.servedRow(row, ctx).price, 100);
    for (const wk of [WEEK1, WEEK2, WEEK_LATE, { shopFrom: '2016-04-07', shopTo: '2016-04-13' }, { shopFrom: '2021-06-03', shopTo: '2021-06-09' }]) {
      assert.deepStrictEqual(r.listedIds({}, wk), [id], `listed in the week ${wk.shopFrom}`);
    }
    // a non-permanent board still counts down
    const w = world();
    assert.strictEqual(w.out.index[idOf(w.out, A)].permanent, undefined, 'only a permanent entry carries the flag');
  },
  // user 15-11 (Task 6b): a board listed only through the kept catalogue entry has no weekly countdown (the keep does not end
  // with the week); a board in this week's window keeps the week end, also when its entry is kept
  kept_board_no_countdown() {
    const w = world(), a = idOf(w.out, A);
    const row = w.out.sphereRows.find((r) => r.sphereBoardId === a);
    const end = '2019-01-14 08:00:00';
    // A: windows EV-1 (2017-04-03..16) and EV-4 (2018-03-19..25)
    assert.strictEqual(w.r.servedEndDatetime(row, { ...WEEK1, weekEnd: end }), end, 'week board: the end of the story week');
    assert.strictEqual(w.r.servedRow(row, { ...WEEK_LATE, weekEnd: end }, 'EV-1').endDatetime, rb.END, 'kept only: the far end of the row');
    assert.strictEqual(w.r.servedRow(row, { ...WEEK_LATE, weekEnd: end }, 'EV-1').price, 3000, 'kept only: the price of the kept window');
    assert.strictEqual(w.r.servedRow(row, { ...WEEK1, weekEnd: end }, 'EV-1').endDatetime, end, 'in the week and kept: the week end');
    assert.strictEqual(w.r.servedRow(row, { ...WEEK_RET, weekEnd: end }, 'EV-1').endDatetime, end, 'in the week (another window) and kept: the week end');
  },
  // Task 6b bench: the client asks GET /user/sphere only at login, so a board kept in the Avatar Board Catalog reaches it through
  // the check of the Avatar Boards list (boardTypes [1,2,6,8,10,11]) when the player re-enters the list; the home check (all
  // types) never announces it (no popup flood), once each. USER DECISION 15-11: a kept board is announced («Unlocked an Avatar
  // Board!») even when it is on sale (type 2, not bought): the only exception to «a board on sale is never announced», and only
  // for a board whose listState is 'kept'
  kept_boards_announced_by_list_check_even_on_sale_user_15_11() {
    const HOME_CHECK = { checkTypes: [1, 2], boardTypes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
    const LIST_CHECK = { checkTypes: [1, 2], boardTypes: [1, 2, 6, 8, 10, 11] };
    for (const [kept, donor] of [['EV-1', A], ['EV-3', C]]) {
      const w = world(), id = idOf(w.out, donor);
      w.player.avatarBoardsSent = [];
      assert.deepStrictEqual(w.r.markKept(w.player, WEEK_LATE, kept), [id], `${kept}: the kept board`);
      assert.ok(!w.r.check(w.player, HOME_CHECK, WEEK_LATE, kept).add.includes(id), `${kept}: the home check does not announce it`);
      assert.ok(w.r.check(w.player, LIST_CHECK, WEEK_LATE, kept).add.includes(id), `${kept}: the list check delivers it`);
      assert.ok(!w.r.check(w.player, LIST_CHECK, WEEK_LATE, kept).add.includes(id), `${kept}: once`);
      assert.ok(w.player.avatarBoardsSent.includes(id), `${kept}: the client holds it`);
      // unkept: the close check of the list removes it
      assert.ok(w.r.check(w.player, LIST_CLOSE, WEEK_LATE, null).close.includes(id), `${kept}: closed after the unkeep`);
      // a login (GET /user/sphere) before the list check delivers it: the list check does not send it again
      const w2 = world(), id2 = idOf(w2.out, donor);
      w2.player.avatarBoardsSent = [];
      w2.r.markKept(w2.player, WEEK_LATE, kept);
      assert.ok(w2.r.list(w2.player, WEEK_LATE, kept, { setSent: true }).includes(id2));
      assert.ok(w2.player.avatarBoardsSent.includes(id2) && !w2.player.avatarBoardsKeptPending, `${kept}: the login list delivered it`);
      assert.ok(!w2.r.check(w2.player, LIST_CHECK, WEEK_LATE, kept).add.includes(id2), `${kept}: not again`);
    }
  },
  // Task 6b fix round 1: a pending kept board is delivered only while its listState is 'kept'; unkeep and keep-change drop it, so a
  // board later on sale in its own week is never announced through a stale pending id
  kept_pending_never_stale() {
    const HOME_CHECK = { checkTypes: [1, 2], boardTypes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] };
    const LIST_CHECK = { checkTypes: [1, 2], boardTypes: [1, 2, 6, 8, 10, 11] };
    // unkeep (routes-events unkeepBoard -> markKept with no keep), then the board on sale in its week (EV-1, WEEK1)
    let w = world(), a = idOf(w.out, A);
    w.player.avatarBoardsSent = [];
    w.r.markKept(w.player, WEEK_LATE, 'EV-1');
    w.r.markKept(w.player, WEEK_LATE, null);
    assert.ok(!w.player.avatarBoardsKeptPending, 'the unkeep drops the pending boards');
    for (const body of [HOME_CHECK, LIST_CHECK]) assert.ok(!w.r.check(w.player, body, WEEK1, null).add.includes(a), 'on sale in its week: not announced');
    // a stale pending id (the keep removed without markKept) is still never delivered once the board is listed for its week
    w = world(); a = idOf(w.out, A);
    w.player.avatarBoardsSent = [];
    w.r.markKept(w.player, WEEK_LATE, 'EV-1');
    for (const body of [HOME_CHECK, LIST_CHECK]) assert.ok(!w.r.check(w.player, body, WEEK1, null).add.includes(a), 'stale pending: not announced in its week');
    // keep A, then keep B: A's leftovers are not delivered, not even when A is on sale in a later week
    w = world(); a = idOf(w.out, A);
    const b = idOf(w.out, W), keyB = 'khuxwiki@2017-05-01/outfit';
    w.player.avatarBoardsSent = [];
    w.r.markKept(w.player, WEEK_LATE, 'EV-1');
    assert.deepStrictEqual(w.r.markKept(w.player, WEEK_LATE, keyB), [b]);
    assert.deepStrictEqual(w.player.avatarBoardsKeptPending, [b], 'the keep change replaces the pending boards');
    const add = w.r.check(w.player, LIST_CHECK, WEEK_RET, keyB).add;
    assert.ok(!add.includes(a), 'A on sale in its return week: not announced');
    assert.ok(add.includes(b), 'B (kept) delivered');
  },
  type2_node_unlock_accepted() {
    const w = world(), a = idOf(w.out, A), c = idOf(w.out, C);
    w.player.spherePoint = 100;
    assert.strictEqual(w.r.update(w.player, a, 1, false, WEEK1).why, 'not bought');
    assert.deepStrictEqual(w.grants, []);
    w.player.freeStone = 3000;
    w.r.buy(w.player, a, WEEK1);
    assert.strictEqual(w.r.update(w.player, a, 1, false, WEEK1).ok, true, 'type 2 bought: accepted');
    assert.strictEqual(w.r.update(w.player, a, 1, false, WEEK1).why, 'node', 'a node already open');
    const all = w.r.update(w.player, a, 0, true, WEEK1);
    assert.deepStrictEqual(all.nodes, [2, 3, 4]);
    assert.deepStrictEqual(w.grants.map((g) => g[1]), [0, 1, 2, 3, 22], 'each cell once, the completion (index 22) once');
    assert.strictEqual(w.r.complete(w.player, a), true);
    // a hand-out board pays its nodes in Avatar Coins, only while listed
    assert.strictEqual(w.r.update(w.player, c, 1, false, WEEK1).why, 'not listed');
    assert.strictEqual(w.r.update(w.player, c, 1, false, WEEK2).ok, true);
    assert.strictEqual(w.player.spherePoint, 90);
    w.player.spherePoint = 5;
    assert.ok(/Avatar Coins/.test(w.r.update(w.player, c, 2, false, WEEK2).why));
    assert.strictEqual(w.player.spherePoint, 5);
  },
  skill_cell_grants_medal_with_skill() {
    const out = build(), m = out.masuRows.find((r) => r.masuId === idOf(out, A));
    assert.deepStrictEqual([m.rewardSelect[2], m.rewardId[2], m.rewardExpand[2], m.rewardExpandId[2], m.medalCategory[2]], [3, 900002, 3, 1100, 10]);
    assert.deepStrictEqual([m.rewardExpand[1], m.rewardExpandId[1], m.medalCategory[1]], [0, 0, 0], 'a plain medal cell');
    assert.strictEqual(ab.cellSkill(m, 2), 1100);
    assert.strictEqual(ab.cellSkill(m, 1), 0);
    assert.strictEqual(ab.cellSkill(m, 0), 0, 'an avatar part');
    // a skill our table lacks: the board is held, never half-served
    const master = MASTER();
    master.skill = [];
    const held = ab.buildAvatarBoards({ records: RECORDS(), master, ids: {}, boosters: [] });
    assert.ok(!held.sphereRows.some((r) => r.boardName === 'Test Outfit'));
    assert.ok(held.report.held.some((h) => h.donorId === A && /skill 1100/.test(h.why)));
  },
  donor_skills_imported() {
    const donor = ab.DONOR_SKILLS.map((d, i) => ({ skillId: d, name: `Donor Skill ${i}`, description: '', categoryEvolve: d, sortId: d, rank: 3, maxLv: 20, expType: 3 }));
    const ours = [{ skillId: 1100, name: 'Skill One', categoryEvolve: 1 }, { skillId: 1264, name: 'Skill Last', categoryEvolve: 168 }];
    const r = ab.importDonorSkills(ours, donor, {});
    assert.deepStrictEqual(r.rows.map((x) => [x.skillId, x.sortId, x.categoryEvolve, x.name]),
      ab.DONOR_SKILLS.map((d, i) => [1265 + i, 1265 + i, 169 + i, `Donor Skill ${i}`]), 'our numbers after the last skill, new evolve categories');
    assert.deepStrictEqual(r.ids['1198'], { skillId: 1265, categoryEvolve: 169 });
    // frozen: a later table with more skills of its own keeps the numbers
    const again = ab.importDonorSkills([...ours, { skillId: 1300, name: 'Later', categoryEvolve: 200 }], donor, { avatarSkills: r.ids });
    assert.deepStrictEqual(again.ids, r.ids);
    assert.throws(() => ab.importDonorSkills([...ours, { skillId: 1265, name: 'Another' }], donor, { avatarSkills: r.ids }), /another skill of ours/);
    assert.deepStrictEqual(ab.importDonorSkills(ours, donor.slice(1), {}).missing, [1198]);
    // the patch end to end on a temporary master: skills, rows, index, ids; a second run gives the same tables
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-test-avatar-patch-'));
    try {
      const m = MASTER();
      for (const t of ['sphere', 'sphereArray', 'sphereMasu', 'medal', 'material', 'title', 'avatarParts', 'petParts']) fs.writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(m[t]));
      fs.writeFileSync(path.join(dir, 'skill.json'), JSON.stringify([...m.skill, ...ours.slice(1)]));
      const idsFile = path.join(dir, 'ids.json'), gameDataDir = path.join(dir, 'gd');
      fs.writeFileSync(idsFile, JSON.stringify({ note: 'x', rows: { 'EV-0753': 1 } }));
      const opts = { records: RECORDS(), donorSkills: donor, idsFile, gameDataDir, boosters: [] };
      const log = console.log; console.log = () => {};
      try { ab.patch(dir, opts); } finally { console.log = log; }
      const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
      const first = ['sphere', 'sphereArray', 'sphereMasu', 'skill'].map((t) => fs.readFileSync(path.join(dir, `${t}.json`), 'utf8'));
      const skills = read(path.join(dir, 'skill.json'));
      assert.deepStrictEqual(skills.map((s) => s.skillId), [1100, 1264, 1265, 1266, 1267, 1268, 1269, 1270]);
      const ids = read(idsFile);
      assert.deepStrictEqual(ids.rows, { 'EV-0753': 1 }, 'the other keys of event_ids.json stay');
      assert.deepStrictEqual(Object.keys(ids.avatarSkills), ab.DONOR_SKILLS.map(String));
      const gd = read(path.join(gameDataDir, 'avatar_boards.json'));
      assert.strictEqual(gd.report.skillsFromDonor['1198'].label, 'skillFromDonor');
      assert.ok(gd.index[L] && read(path.join(dir, 'sphere.json')).some((r) => r.sphereBoardId === L));
      console.log = () => {};
      try { ab.patch(dir, opts); } finally { console.log = log; }
      assert.deepStrictEqual(['sphere', 'sphereArray', 'sphereMasu', 'skill'].map((t) => fs.readFileSync(path.join(dir, `${t}.json`), 'utf8')), first, 'idempotent');
      // fix round 1: the log counts the boards held whole and the ones held in some windows only (priceUnknown) apart
      const recs = RECORDS();
      recs.entries.push({ censusId: 'EV-7', key: 'EV-7/outfit', group: 'outfit', type: 2, window: ['2019-02-04', '2019-02-10'], price: null, labels: [], boards: [board(A, 'Test Outfit')] });
      const lines = [];
      console.log = (l) => lines.push(String(l));
      try { ab.patch(dir, { ...opts, records: recs }); } finally { console.log = log; }
      assert.ok(lines.some((l) => /, 3 held, 1 held in some windows only, /.test(l)), lines.join('\n'));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  },
  chained_open_param_remapped() {
    const w = world(), o = w.out, g1 = idOf(o, G1), g2 = idOf(o, G2);
    const row = o.sphereRows.find((r) => r.sphereBoardId === g2);
    assert.deepStrictEqual([row.openId, row.openParam], [5, g1], 'openParam = our id of the board before');
    assert.strictEqual(o.index[g2].chain, g1);
    w.player.freeStone = 1000;
    assert.ok(w.r.buy(w.player, g1, WEEK1).ok);
    assert.ok(!w.r.listedIds(w.player, WEEK1).includes(g2), 'not before Gem 1 is complete');
    w.r.update(w.player, g1, 0, true, WEEK1);
    assert.ok(w.r.listedIds(w.player, WEEK1).includes(g2), 'listed once Gem 1 is complete');
    assert.deepStrictEqual(w.r.buy(w.player, g2, WEEK1), { ok: true, price: 500 });
  },
  null_census_window_from_wiki() {
    const w = world(), id = idOf(w.out, W), e = w.out.index[id];
    assert.deepStrictEqual([e.windows[0].censusId, e.key, e.price], [null, 'khuxwiki@2017-05-01/outfit', 2000]);
    assert.ok(e.windows[0].labels.includes('windowFromWiki'));
    assert.ok(w.r.listedIds(w.player, { shopFrom: '2017-05-01', shopTo: '2017-05-07' }).includes(id));
    assert.ok(w.r.listedIds(w.player, WEEK_LATE, 'khuxwiki@2017-05-01/outfit').includes(id), 'kept by its entry key');
    assert.ok(!w.r.listedIds(w.player, WEEK_LATE, null).includes(id));
  },
  held_board_not_built() {
    const out = build();
    const names = out.sphereRows.map((r) => r.boardName);
    for (const n of ['Held Outfit', 'Booster Board', 'Behind Held']) assert.ok(!names.includes(n), n);
    const why = Object.fromEntries(out.report.held.map((h) => [h.donorId, h.why]));
    assert.ok(/unpayable/.test(why[H]), why[H]);
    assert.ok(/unpayable/.test(why[HB]) && out.report.unmatched.some((u) => u.board === HB && /Booster/.test(u.why)), 'a Booster not built');
    assert.strictEqual(why[HC], 'chained to a held board');
    // the Booster built (game_data/boosters.json byId): the board is served
    const withBooster = build({}, { boosters: [1905201] });
    const hb = withBooster.masuRows.find((m) => m.masuId === idOf(withBooster, HB));
    assert.ok(hb && hb.rewardSelect[3] === 34 && hb.rewardId[3] === 1905201);
    assert.ok(!Object.values(out.index).some((e) => [H, HB, HC].includes(e.donorId)), 'never in the index');
  },
  // Task 5 hardening: a Jewel board whose window has no price is held (priceUnknown), never sold at a guessed price, and never
  // stops the build; a returning board keeps its priced windows
  price_unknown_held() {
    const recs = RECORDS();
    recs.entries.push({ censusId: 'EV-6', key: 'EV-6/outfit', group: 'outfit', type: 2, window: ['2017-07-03', '2017-07-09'], price: null, labels: [], boards: [board(9501, 'No Price')] });
    recs.entries.push({ censusId: 'EV-7', key: 'EV-7/outfit', group: 'outfit', type: 2, window: ['2019-02-04', '2019-02-10'], price: 0, labels: [], boards: [board(A, 'Test Outfit')] });
    const out = ab.buildAvatarBoards({ records: recs, master: MASTER(), ids: {}, boosters: [] });
    const held = out.report.held.filter((h) => h.why === 'priceUnknown');
    assert.deepStrictEqual(held.map((h) => [h.donorId, h.keys]), [[A, ['EV-7/outfit']], [9501, ['EV-6/outfit']]]);
    assert.ok(!out.sphereRows.some((r) => r.sphereBoardId === idOf(out, 9501)) && !idOf(out, 9501), 'no row, no index entry');
    const a = out.index[idOf(out, A)];
    assert.deepStrictEqual(a.windows.map((w) => [w.key, w.price]), [['EV-1/outfit', 3000], ['EV-4/outfit', 1500]], 'the priced windows stay');
  },
  // Task 5 hardening: the merged list of 190 (setSent 'merge') records the boards on sale it sends and keeps the ones sent before
  merge_records_sent() {
    const w = world(), a = idOf(w.out, A), g1 = idOf(w.out, G1);
    w.player.avatarBoardsSent = [4242];
    w.r.list(w.player, WEEK1, null, { setSent: 'merge' });
    assert.deepStrictEqual(w.player.avatarBoardsSent, [4242, a, g1].sort((x, y) => x - y), 'merge: the earlier ones stay, the boards on sale join');
    w.r.list(w.player, WEEK1, null, { setSent: true });
    assert.deepStrictEqual(w.player.avatarBoardsSent, [a, g1].sort((x, y) => x - y), 'GET: only the listed ones');
    w.r.list(w.player, WEEK1, null);
    assert.deepStrictEqual(w.player.avatarBoardsSent, [a, g1].sort((x, y) => x - y), 'no setSent: unchanged');
  },
};

// ---- server.js: two fixture boards on the local master (an outfit on sale with a skill medal, a coin board) ----
const MASTER_DIR = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
const haveMaster = fs.existsSync(path.join(MASTER_DIR, 'sphere.json')) && fs.existsSync(path.join(MASTER_DIR, 'medal.json')) && fs.existsSync(path.join(MASTER_DIR, 'skill.json'));
const serverTests = {};
let cleanup = () => {};
if (haveMaster) {
  const SA = 5999901, SC = 5999902;
  const readFile = fs.readFileSync;
  const medal = JSON.parse(readFile(path.join(MASTER_DIR, 'medal.json'), 'utf8'))[0];
  const skill = JSON.parse(readFile(path.join(MASTER_DIR, 'skill.json'), 'utf8'))[0];
  const masu = (id, cells, done) => {
    const m = { masuId: id, sphereBoardId: id };
    for (const k of rb.MASU_KEYS) m[k] = Array(23).fill(0);
    cells.forEach(([cost, sel, rid, val, sk], i) => {
      m.spherePoint[i] = cost; m.rewardSelect[i] = sel; m.rewardId[i] = rid; m.rewardValue[i] = val;
      if (sk) { m.rewardExpand[i] = 3; m.rewardExpandId[i] = sk; m.medalCategory[i] = 10; }
    });
    [m.rewardSelect[22], m.rewardId[22], m.rewardValue[22]] = done;
    return m;
  };
  const row = (id, name, type, price) => ({ sphereBoardId: id, boardName: name, kindId: 1, boardId: type === 2 ? 2 : 12, arryId: id, masuId: id, type, openId: 3, openParam: 0,
    price, detailUrl: '', startDatetime: '2015-01-01 08:00:00', endDatetime: rb.END });
  const EXTRA = {
    'sphere.json': [row(SA, 'Fixture Outfit', 2, 3000), row(SC, 'Fixture Coins', 1, 0)],
    'sphereArray.json': [rb.gridRow(SA, 2), rb.gridRow(SC, 1)],
    'sphereMasu.json': [masu(SA, [[5, 3, medal.medalId, 1, skill.skillId], [5, 2, 0, 10]], [2, 0, 50]), masu(SC, [[3, 2, 0, 1]], [2, 0, 5])],
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-test-avatar-boards-'));
  process.env.KHUX_SAVE = path.join(dir, 'save.json');
  process.env.KHUX_AVATAR_INDEX = path.join(dir, 'avatar_boards.json');
  delete process.env.KHUX_REAL_NOW;
  delete process.env.KHUX_SERVER_TIME;
  fs.readFileSync = (f, ...a) => {
    const name = path.basename(String(f));
    if (EXTRA[name] && path.resolve(path.dirname(String(f))) === path.resolve(MASTER_DIR)) return JSON.stringify([...JSON.parse(readFile(f, 'utf8')), ...EXTRA[name]]);
    return readFile(f, ...a);
  };
  const log = console.log, warn = console.warn;
  const quiet = (fn) => { console.log = () => {}; console.warn = () => {}; try { return fn(); } finally { console.log = log; console.warn = warn; } };
  const { _test: t } = quiet(() => require('./server'));
  const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };
  const p = t.player;
  call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
  // the fixture index: both boards in the story week of now
  const ctx = quiet(() => t.avatarCtx());
  const win = [ctx.shopFrom, ctx.shopTo];
  fs.writeFileSync(process.env.KHUX_AVATAR_INDEX, JSON.stringify({ index: {
    [SA]: { key: 'EV-9/outfit', group: 'outfit', type: 2, window: win, price: 3000, windows: [{ key: 'EV-9/outfit', censusId: 'EV-9', window: win, price: 3000, labels: [] }] },
    [SC]: { key: 'EV-8/avatarCoin', group: 'avatarCoin', type: 1, window: win, price: 0, windows: [{ key: 'EV-8/avatarCoin', censusId: 'EV-8', window: win, price: 0, labels: [] }] } } }));
  const list = () => quiet(() => t.userSphereAll({ setSent: true })).userSphereDatas;
  const byId = (datas, id) => datas.find((d) => d.sphereBoardId === id);
  cleanup = () => { fs.readFileSync = readFile; try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* temp */ } };

  Object.assign(serverTests, {
    server_route_and_list() {
      assert.strictEqual(t.route('/user/sphere/buy?m=1&i=1'), 'spherebuy');
      const datas = list();
      assert.deepStrictEqual([byId(datas, SA).isBuy, byId(datas, SC).isBuy], [0, 1], 'on sale: isBuy 0');
      assert.ok(!(SC in (p.sphere || {})), 'a type-1 avatar board is not opened by the Lux level path');
      const ids = datas.map((d) => d.userSphereBoardId);
      assert.strictEqual(new Set(ids).size, ids.length, 'one userSphereBoardId sequence');
    },
    server_check_never_announces_on_sale() {
      const c = call(t.respondSphereCheck, HOME);
      const got = c.userSphere.userSphereDatas.map((d) => d.sphereBoardId);
      assert.ok(!got.includes(SA), 'the board on sale is not announced');
      assert.ok(got.includes(SC), 'the hand-out board is announced once');
      assert.ok(!call(t.respondSphereCheck, HOME).userSphere.userSphereDatas.some((d) => d.sphereBoardId === SC));
    },
    server_buy_and_unlock() {
      p.freeStone = 100;
      const refused = call(t.respondSphereBuy, { sphereBoardId: SA });
      assert.deepStrictEqual(Object.keys(refused), ['ret'], 'refusal: {ret} only, as the Shop');
      assert.strictEqual(p.freeStone, 100);
      p.spherePoint = 50;
      assert.deepStrictEqual(call(t.respondSphereUpdate, { sphereBoardId: SA, releaseMasuId: 1 }).userSphere.userSphereDatas.map((d) => d.unlockMasuIds), [[]],
        'not bought: no node');
      assert.strictEqual(p.spherePoint, 50);
      p.freeStone = 3500;
      const r = call(t.respondSphereBuy, { sphereBoardId: SA });
      assert.ok(r.userSphere && !Array.isArray(r.userSphere) && !r.userSphere.userSphereDatas, 'userSphere is ONE UserSphereData');
      assert.deepStrictEqual([r.userSphere.sphereBoardId, r.userSphere.isBuy, r.userSphere.status], [SA, 1, 1]);
      assert.strictEqual(p.freeStone, 500);
      assert.deepStrictEqual(Object.keys(call(t.respondSphereBuy, { sphereBoardId: SA })), ['ret'], 'never twice');
      assert.strictEqual(p.freeStone, 500);
      // type 2 bought: the node is accepted, paid in Avatar Coins; the skill medal comes with its skill
      const before = (p.medals || []).length;
      const u = call(t.respondSphereUpdate, { sphereBoardId: SA, releaseMasuId: 1 });
      for (const k of ['userData', 'userSphere', 'userMaterials', 'userMedals', 'userSkills', 'userKeyblades', 'userDecks', 'userAvatarParts', 'userTitles', 'pet', 'emblemIds']) assert.ok(k in u, `44: ${k}`);
      assert.deepStrictEqual(u.userSphere.userSphereDatas.map((d) => d.unlockMasuIds), [[1]]);
      assert.strictEqual(p.spherePoint, 45);
      const got = p.medals.slice(before);
      assert.strictEqual(got.length, 1);
      assert.strictEqual((p.medalSkills || {})[got[0].userMedalId].skillId, skill.skillId, 'the medal carries its skill');
      // the last node completes the board: the completion reward (index 22) once
      const stone = p.freeStone;
      const last = call(t.respondSphereUpdate, { sphereBoardId: SA, releaseMasuId: 2 });
      assert.strictEqual(last.userSphere.userSphereDatas[0].status, 3);
      assert.strictEqual(p.freeStone, stone + 10 + 50);
      assert.ok(!call(t.respondSphereCheck, HOME).userSphere.userSphereDatas.some((d) => d.sphereBoardId === SA), 'bought: no popup');
    },
    server_served_rows() {
      const realMs = t.realNow();
      const rows = quiet(() => t.servedMasterRows('sphere', realMs));
      const a = rows.find((r) => r.sphereBoardId === SA), c = rows.find((r) => r.sphereBoardId === SC), std = rows.find((r) => r.sphereBoardId === 2100001);
      assert.strictEqual(a.endDatetime, ab.weekEndFake(clock, realMs), 'type 2: the end of the story week, fake time');
      assert.strictEqual(a.price, 3000);
      assert.strictEqual(c.endDatetime, rb.END);
      if (std) assert.strictEqual(std.endDatetime, JSON.parse(readFile(path.join(MASTER_DIR, 'sphere.json'), 'utf8')).find((r) => r.sphereBoardId === 2100001).endDatetime);
    },
    // Task 5 hardening: the cached sphere body follows the kept event (a keep in the Event Catalog changes the shown price mid-session)
    server_sphere_body_follows_keep() {
      // the outfit as a returning board of two past windows: 3000 Jewels first, 1500 when it came back (EV-7)
      const doc = JSON.parse(readFile(process.env.KHUX_AVATAR_INDEX, 'utf8'));
      doc.index[SA].windows = [{ key: 'EV-6/outfit', censusId: 'EV-6', window: ['2015-01-05', '2015-01-11'], price: 3000, labels: [] },
        { key: 'EV-7/outfit', censusId: 'EV-7', window: ['2015-02-02', '2015-02-08'], price: 1500, labels: [] }];
      fs.writeFileSync(process.env.KHUX_AVATAR_INDEX, JSON.stringify(doc));
      fs.utimesSync(process.env.KHUX_AVATAR_INDEX, new Date(), new Date(Date.now() + 5000));
      // Task 5b: the board keep is player.avatarBoards.kept (Avatar Board Catalog), apart from the kept event
      const ev = p.events, avb = p.avatarBoards;
      try {
        const body = () => t.masterBody('sphere').toString('utf8');
        const shown = () => quiet(() => t.servedMasterRows('sphere', t.realNow())).find((r) => r.sphereBoardId === SA).price;
        p.events = { kept: null, cleared: {} };
        p.avatarBoards = { kept: null };
        const before = quiet(body);
        assert.strictEqual(shown(), 3000);
        assert.strictEqual(quiet(body), before, 'same state: the cached body');
        p.events = { kept: 'EV-7', cleared: {} };
        assert.strictEqual(shown(), 3000, 'the kept event does not keep boards');
        assert.strictEqual(quiet(body), before, 'the event keep is not in the key');
        p.events = { kept: null, cleared: {} };
        p.avatarBoards = { kept: 'EV-7' };
        assert.strictEqual(shown(), 1500, 'kept: the price of the kept window');
        assert.notStrictEqual(quiet(body), before, 'board keep changed: the body is made again');
      } finally { p.events = ev; p.avatarBoards = avb; }
    },
  });
} else console.log('test-avatar-boards: server part skipped (no master_data)');

let failed = 0, total = 0;
for (const [name, fn] of Object.entries({ ...tests, ...serverTests })) {
  total++;
  try { fn(); console.log(`ok ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.stack}`); }
}
cleanup();
console.log(failed ? `${failed} of ${total} failed` : `all ${total} passed`);
process.exit(failed ? 1 : 0);
