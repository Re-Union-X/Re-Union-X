// Limited and returning avatar boards (Events Part 7, Task 4; plan docs/superpowers/plans/2026-11-15-events-part7-avatar-boards.md,
// client side docs/notes/bacheche.md «Limited avatar boards: client behaviour»).
// Input: the private board records (KHUX_AVATAR_BOARDS, avatar_boards.json of the Task 2 builder; never in the repo, the tests
// use a hand-made fixture): {entries: [{censusId | null, key, group, type, window: [from, to] | null, level?, price, labels,
// boards: [{donorId, name, kindId, boardId, openId, openParam, grid {spCol0..4}, cells [{idx, cost, rewardSelect, rewardId, num,
// name, ourName?, skillId?, rewardExpand?, medalCategory?}], completion}]}], held, unmapped}.
// - One entry = one original window of a group (outfit, gem, skill, medal: type 2, sold for Jewels; avatarCoin: type 1, handed
//   out; level: type 1, opened by the Lux level). A returning board is the same donor board in several entries: one id, one
//   purchase, listed in each of its windows; the price is that of the window it is listed in (the first sale often cost more).
// - Ids: event_ids.json `avatarBoards` {"<donorId>": n}, sphereBoardId = arryId = masuId = 5000000 + n, append-only (a key that
//   disappears keeps its number); the 8 level boards keep their original ids 2100119-2100126 (No. tab = last digits, titles
//   2119-2126 exist). Skills imported from the donated master: event_ids.json `avatarSkills` {"<donorSkillId>": {skillId,
//   categoryEvolve}} (label skillFromDonor).
// - Cells: matched as the Event Boards do (event-boards.js matchDonor: medals by name and rarity, items by id, Boosters through
//   game_data/boosters.json) plus HP / AP / cost cells (12 / 21 / 22, no id) and skill medals: a 6★ Scrooge with rewardExpand 3,
//   rewardExpandId = our skill id and medalCategory (the board reward grant gives the medal with that skill, cellSkill). A board
//   with any cell we cannot pay is held (nothing half-served), and so is a board chained (openId 5) behind a held one.
// - Runtime (avatarBoardRoutes): a board is listed while one of its windows overlaps the story week (storyCtx shopFrom / shopTo),
//   when it is bought (player.avatarBoardsBought, kept for good), when its entry is the kept one (Event Catalog, Task 5), a level
//   board from its level; a chained board only once the board before is complete (the client enforces neither). A type-2 board
//   not bought is never announced by a check (the client pops «Unlocked an Avatar Board!» per new entry): it reaches the client
//   only through GET /user/sphere. Its served `endDatetime` is the end of the story week in fake time, the moment the Shop
//   rotates (the «Offer ends in» countdown); its served `price` that of the window it is listed in.
// Save: player.avatarSphere {[id]: {id, unlock[], getDatetime}} (progress, kept for good), player.avatarBoardsBought [id],
// player.avatarBoardsSent [id] (the boards the client holds as far as the server knows, for closeEventSphereBoardIds).
'use strict';
const fs = require('fs');
const path = require('path');
const rb = require('./raid-boards');
const eventBoards = require('./event-boards');

const ID_BASE = 5000000, ID_MAX = 5999999;
const SALE = 2, HANDOUT = 1;
const LEVEL_IDS = [2100119, 2100126]; // the level avatar boards keep their original ids (CENSUS.md, Task 1)
const START = '2015-01-01 08:00:00';
const GRID_KEYS = ['spCol4', 'spCol3', 'spCol2', 'spCol1', 'spCol0'];
const CELLS = rb.MASU; // 23: nodes 1..22, index 22 = completion
// the skills that exist only in the donated master (Task 2 report): imported with label skillFromDonor
const DONOR_SKILLS = [1198, 1237, 1238, 1267, 1268, 1269];
const DONOR_MASTER = process.env.KHUX_DONOR_MASTER
  || path.join('D:', path.sep, 'Progetto_Restauro_KH_UX', 'Reddit Donators', 'ReLux Team', 'KHUX_pacchetto_compagno', '2_PACCHETTO_SERVER', 'pkg', 'server_master');
const IDS_FILE = path.join(__dirname, 'event_ids.json');

const isLevelId = (id) => id >= LEVEL_IDS[0] && id <= LEVEL_IDS[1];
const inRange = (id) => (id >= ID_BASE && id <= ID_MAX) || isLevelId(id);

// ---------------------------------------------------------------------------------------------------------------- build ---

function checkNumbers(map, what, max) {
  const seen = new Map();
  for (const [k, v] of Object.entries(map)) {
    if (!Number.isInteger(v) || v < 1 || v > max) throw new Error(`avatar boards: event_ids.json: ${what} ${k} has number ${v}, outside 1-${max}`);
    if (seen.has(v)) throw new Error(`avatar boards: event_ids.json: ${what} number ${v} repeats (${seen.get(v)}, ${k})`);
    seen.set(v, k);
  }
}

// event_ids.json `avatarBoards`: one number per donor board (not level), in record order; existing numbers never change
function allocate(entries, ids) {
  const boards = { ...((ids || {}).avatarBoards || {}) };
  checkNumbers(boards, 'avatar board', ID_MAX - ID_BASE);
  let next = Math.max(0, ...Object.values(boards)) + 1;
  for (const e of entries) {
    if (e.group === 'level') continue;
    for (const b of e.boards || []) { const k = String(b.donorId); if (!(k in boards)) boards[k] = next++; }
  }
  return boards;
}

// A sphere / sphereArray / sphereMasu row of the master in our ranges that is not ours stops the run (rows of a previous run are
// dropped before, patch)
function checkRanges(master) {
  for (const [t, key] of [['sphere', 'sphereBoardId'], ['sphereArray', 'arryId'], ['sphereMasu', 'masuId']]) {
    const hit = (master[t] || []).find((r) => inRange(r[key]));
    if (hit) throw new Error(`avatar boards: ${t} row ${hit[key]} is inside our ids (${ID_BASE}-${ID_MAX}, ${LEVEL_IDS.join('-')}) and is not ours`);
  }
}

// {sel, id, value, expand?, expandId?, category?} or {why}
function matchCell(ix, c) {
  const sel = c.rewardSelect;
  // HP / AP / deck cost of the player (no id; value = the amount)
  if (sel === 12 || sel === 21 || sel === 22) return { sel, id: 0, value: Number(c.num) || 1 };
  const m = eventBoards.matchDonor(ix, c);
  if (m.why) return m;
  if (sel === 3 && Number(c.rewardExpand) === 3) {
    const sk = Number(c.skillId);
    if (!ix.skill.has(sk)) return { why: `skill ${c.skillId || '?'} (donor ${c.donorSkillId || '?'}) not in the skill table` };
    return { ...m, expand: 3, expandId: sk, category: Number(c.medalCategory) || 0 };
  }
  return m;
}

// -> {sphereRows, arrayRows, masuRows, art, index, ids: {avatarBoards}, report: {unmatched, held}}
// index {[sphereBoardId]: {key, group, type, window, price, windows [{key, censusId, window, price, labels}], level?, chain?,
// donorId, name}}; art [{sphereBoardId, donorId, boardId}] (card pictures: Task 6)
function buildAvatarBoards({ records, master, ids, boosters = null }) {
  const entries = (records && records.entries) || [];
  const numbers = allocate(entries, ids);
  const idx = rb.itemIndex(master);
  const ix = { idx, material: new Set((master.material || []).map((r) => r.materialId)), title: new Set((master.title || []).map((r) => r.titleId)),
    avatar: new Set((master.avatarParts || []).map((r) => r.avatarPartsId)), pet: new Set((master.petParts || []).map((r) => r.petPartsId)),
    boosters: boosters ? new Set([...boosters].map(Number)) : null, skill: new Set((master.skill || []).map((r) => r.skillId)) };
  const out = { sphereRows: [], arrayRows: [], masuRows: [], art: [], index: {}, ids: { avatarBoards: numbers }, report: { unmatched: [], held: [] } };

  // one board per donor id, with every entry (window) it belongs to
  const boards = new Map();
  for (const e of entries) {
    for (const b of e.boards || []) {
      if (!boards.has(b.donorId)) boards.set(b.donorId, { b, entries: [] });
      const x = boards.get(b.donorId);
      if (x.entries[0] && (x.entries[0].type !== e.type || (x.entries[0].group === 'level') !== (e.group === 'level'))) {
        throw new Error(`avatar boards: board ${b.donorId} is in entries of another type (${x.entries[0].key}, ${e.key})`);
      }
      x.entries.push(e);
    }
  }
  const idOf = (donorId) => {
    const x = boards.get(donorId);
    if (x && x.entries[0].group === 'level') {
      if (!isLevelId(donorId)) throw new Error(`avatar boards: level board ${donorId} outside ${LEVEL_IDS.join('-')}`);
      return donorId;
    }
    return ID_BASE + numbers[String(donorId)];
  };

  const state = new Map(); // donorId -> {cells, done, unpriced?} | {skip, keys?}
  const priced = (e) => Number(e.price) > 0;
  for (const [donorId, { b, entries: es }] of boards) {
    // a Jewel board is never sold at a guessed price: a window without one is held (priceUnknown), the whole board when no window
    // has one (Task 5 hardening: it used to stop the build)
    const unpriced = es[0].type === SALE ? es.filter((e) => !priced(e)).map((e) => e.key) : [];
    if (unpriced.length && unpriced.length === es.length) { state.set(donorId, { skip: 'priceUnknown', keys: unpriced }); continue; }
    const cells = [], miss = [];
    const nodes = new Set(GRID_KEYS.flatMap((k) => (b.grid || {})[k] || []).filter((v) => v > 0 && v < 1000));
    for (const c of b.cells || []) {
      const m = Number.isInteger(c.idx) && c.idx >= 0 && c.idx < rb.COMPLETION && nodes.has(c.idx + 1) ? matchCell(ix, c) : { why: 'bad index' };
      if (m.why) { out.report.unmatched.push({ board: donorId, idx: c.idx, rewardSelect: c.rewardSelect, rewardId: c.rewardId, name: c.name, why: m.why }); miss.push(m.why); }
      else cells.push({ ...c, item: m });
    }
    const have = new Set((b.cells || []).map((c) => c.idx + 1));
    for (const n of nodes) if (!have.has(n)) miss.push('grid node without a cell');
    const done = matchCell(ix, b.completion || {});
    if (done.why) { state.set(donorId, { skip: `completion ${(b.completion || {}).name || ''}: ${done.why}` }); continue; }
    if (!cells.length) { state.set(donorId, { skip: 'no matched cells' }); continue; }
    if (miss.length) { state.set(donorId, { skip: `unpayable cells (${[...new Set(miss)].join(', ')})` }); continue; }
    state.set(donorId, { cells, done, unpriced });
  }
  // a chained board (openId 5 after the board openParam) is only reachable through the board before it
  for (let again = true; again;) {
    again = false;
    for (const [donorId, st] of state) {
      const b = boards.get(donorId).b;
      if (st.skip || b.openId !== 5) continue;
      const prev = state.get(b.openParam);
      if (!prev) { state.set(donorId, { skip: `chained behind ${b.openParam}, which is not in the records` }); again = true; }
      else if (prev.skip) { state.set(donorId, { skip: 'chained to a held board' }); again = true; }
    }
  }

  for (const [donorId, st] of state) {
    const { b, entries: all } = boards.get(donorId);
    if (st.skip) { out.report.held.push({ donorId, name: b.name, why: st.skip, ...(st.keys ? { keys: st.keys } : {}) }); continue; }
    // a returning board keeps its priced windows; the others are reported (held in that window only)
    if (st.unpriced.length) out.report.held.push({ donorId, name: b.name, why: 'priceUnknown', keys: st.unpriced });
    const es = all.filter((e) => !st.unpriced.includes(e.key));
    const id = idOf(donorId), first = es[0], chained = b.openId === 5;
    const type = first.type === SALE ? SALE : HANDOUT;
    out.sphereRows.push({ sphereBoardId: id, boardName: String(b.name).slice(0, 128), kindId: b.kindId || 0, boardId: b.boardId || 1, arryId: id, masuId: id, type,
      openId: b.openId || 0, openParam: chained ? idOf(b.openParam) : first.group === 'level' ? Number(first.level) || 0 : 0,
      price: type === SALE ? Number(first.price) : 0, detailUrl: '', startDatetime: START, endDatetime: rb.END });
    out.arrayRows.push({ arryId: id, ...Object.fromEntries(GRID_KEYS.map((k) => [k, [...b.grid[k]]])) });
    const masu = { masuId: id, sphereBoardId: id };
    for (const key of rb.MASU_KEYS) masu[key] = Array(CELLS).fill(0);
    const put = (i, item, cost) => {
      masu.spherePoint[i] = cost;
      masu.rewardSelect[i] = item.sel;
      masu.rewardId[i] = item.id;
      masu.rewardValue[i] = item.value || 1;
      if (item.expand) { masu.rewardExpand[i] = item.expand; masu.rewardExpandId[i] = item.expandId; masu.medalCategory[i] = item.category; }
    };
    for (const c of st.cells) put(c.idx, c.item, rb.num(c.cost));
    put(rb.COMPLETION, st.done, 0);
    const empty = [...new Set(GRID_KEYS.flatMap((k) => b.grid[k]).filter((v) => v > 0 && v < 1000))].filter((n) => !masu.rewardSelect[n - 1]);
    if (empty.length) throw new Error(`avatar boards: board ${donorId}: nodes ${empty.join(', ')} without a reward`);
    out.masuRows.push(masu);
    out.art.push({ sphereBoardId: id, donorId, boardId: b.boardId || 1 });
    const windows = es.map((e) => ({ key: e.key, censusId: e.censusId || null, window: e.window || null, price: type === SALE ? Number(e.price) : 0, labels: e.labels || [] }));
    out.index[id] = { key: first.key, group: first.group, type, window: first.window || null, price: windows[0].price, windows,
      ...(first.group === 'level' ? { level: Number(first.level) } : {}), ...(chained ? { chain: idOf(b.openParam) } : {}), donorId, name: b.name };
  }
  return out;
}

// ----------------------------------------------------------------------------------------------------- donor skills ---

// The skills of the avatar boards that only the donated master has (DONOR_SKILLS): copied with a number of ours (the donor
// numbering differs from ours, Task 2 report), frozen in event_ids.json avatarSkills {"<donorId>": {skillId, categoryEvolve}}.
// -> {rows (to append), ids, missing [donorId]}. A frozen skillId that another row of ours uses stops the run.
function importDonorSkills(skills, donorRows, ids, wanted = DONOR_SKILLS) {
  const frozen = { ...((ids || {}).avatarSkills || {}) };
  const ours = new Map((skills || []).map((r) => [r.skillId, r]));
  const donor = new Map((donorRows || []).map((r) => [r.skillId, r]));
  const used = (k) => Object.values(frozen).map((v) => v[k]);
  let nextId = Math.max(0, ...(skills || []).map((r) => r.skillId), ...used('skillId')) + 1;
  let nextCat = Math.max(0, ...(skills || []).map((r) => r.categoryEvolve || 0), ...used('categoryEvolve')) + 1;
  const rows = [], missing = [];
  for (const d of wanted) {
    const src = donor.get(d);
    if (!src) { missing.push(d); continue; }
    const f = frozen[String(d)] || (frozen[String(d)] = { skillId: nextId++, categoryEvolve: nextCat++ });
    const clash = ours.get(f.skillId);
    if (clash && clash.name !== src.name) throw new Error(`avatar boards: skill ${f.skillId} (donor ${d}) is another skill of ours`);
    if (clash) continue; // already in the table (a run on a master that has it)
    rows.push({ ...src, skillId: f.skillId, sortId: f.skillId, categoryEvolve: f.categoryEvolve });
  }
  return { rows, ids: frozen, missing };
}

// -------------------------------------------------------------------------------------------------------- runtime ---

// day overlap of a window [from, to] (ISO dates) with the story week {shopFrom, shopTo}; exported as windowInWeek: the Event Catalog
// (routes-events.js) says «On sale this week» with the same test the listing uses
const weekTo = (ctx) => (ctx.shopTo && ctx.shopTo >= ctx.shopFrom ? ctx.shopTo : ctx.shopFrom);
const inWeek = (w, ctx) => !!(w && ctx && ctx.shopFrom && w[0] <= weekTo(ctx) && w[1] >= ctx.shopFrom);
const isKept = (w, kept) => !!kept && (w.censusId === kept || w.key === kept);

// the end of the story week in fake time: the Monday the Shop rotates (same clock as the Moogle Shop endDate)
const weekEndFake = (clock, realMs) => clock.fakeString(clock.weekStartOf(clock.weekIndex(realMs) + 1), clock.twinOffset(realMs));

// the skill of a skill-medal cell (rewardExpand 3), 0 for any other cell
const cellSkill = (masu, i) => (masu && masu.rewardSelect[i] === 3 && (masu.rewardExpand || [])[i] === 3 ? Number((masu.rewardExpandId || [])[i]) || 0 : 0);

// index: game_data/avatar_boards.json index; master(table) rows; ctx of every call: {shopFrom, shopTo, level, weekEnd?}; kept: the
// kept census id / entry key (Event Catalog) or null
function avatarBoardRoutes({ index, master, grantSphereReward = () => {}, now = Date.now, nextUserSphereId, log = () => {} }) {
  const ix = () => (typeof index === 'function' ? index() : index) || {};
  const info = (id) => ix()[Number(id)];
  const bought = (player) => new Set((player.avatarBoardsBought || []).map(Number));
  const rowOf = (t, key, id) => master(t).find((r) => r[key] === Number(id));
  function nodesOf(id) {
    const board = rowOf('sphere', 'sphereBoardId', id), arr = board && rowOf('sphereArray', 'arryId', board.arryId);
    const nodes = new Set();
    for (const k of GRID_KEYS) for (const v of (arr && arr[k]) || []) if (v >= 1 && v <= CELLS) nodes.add(v);
    return [...nodes].sort((a, b) => a - b);
  }
  const complete = (player, id) => { const s = (player.avatarSphere || {})[id], n = nodesOf(id); return !!(s && n.length && n.every((x) => s.unlock.includes(x))); };

  // the window an id is listed in now: the story week's, else the kept one's; null when neither
  function windowNow(id, ctx, kept) {
    const e = info(id);
    if (!e) return null;
    return (e.windows || []).find((w) => inWeek(w.window, ctx)) || (e.windows || []).find((w) => isKept(w, kept)) || null;
  }
  // in the master (a served row) and listed for this player now
  function listed(player, id, ctx = {}, kept = null) {
    const e = info(id);
    if (!e || !rowOf('sphere', 'sphereBoardId', id)) return false;
    if (e.type === SALE && bought(player).has(Number(id))) return true;
    if (e.chain && !complete(player, e.chain)) return false;
    if (e.group === 'level') return Number(ctx.level) >= e.level;
    return !!windowNow(id, ctx, kept);
  }
  function listedIds(player, ctx = {}, kept = null) {
    return Object.keys(ix()).map(Number).filter((id) => listed(player, id, ctx, kept)).sort((a, b) => a - b);
  }
  // the board's progress, made the first time it is listed and kept for good
  function stateOf(player, id) {
    player.avatarSphere ||= {};
    if (!player.avatarSphere[id]) player.avatarSphere[id] = { id: nextUserSphereId(), unlock: [], getDatetime: now() };
    return player.avatarSphere[id];
  }
  const isBuy = (player, id) => (info(id) && info(id).type === SALE && !bought(player).has(Number(id)) ? 0 : 1);
  const onSale = (player, id) => isBuy(player, id) === 0;

  // the price served and charged: the window it is listed in (a returning board was often cheaper), else the row's
  function priceNow(id, ctx, kept) { const w = windowNow(id, ctx, kept), e = info(id); return w ? w.price : e ? e.price : 0; }

  // the master row as served: a type-2 row counts down to the end of the story week and shows the price of its window now
  function servedRow(row, ctx = {}, kept = null) {
    const e = info(row.sphereBoardId);
    if (!e || e.type !== SALE) return row;
    return { ...row, ...(ctx.weekEnd ? { endDatetime: ctx.weekEnd } : {}), price: priceNow(row.sphereBoardId, ctx, kept) || row.price };
  }
  const servedEndDatetime = (row, ctx = {}) => servedRow(row, ctx).endDatetime;

  // GET /user/sphere: the boards listed now (state made). setSent true: avatarBoardsSent keeps only the listed ones and takes the
  // boards on sale (sent by this list, never by a check); 'merge' (the merged list of 190, as the raid path): the boards sent
  // before stay and the boards on sale join. A board handed out (type 1) or bought is not marked, so the next check still
  // announces it once
  function list(player, ctx = {}, kept = null, { setSent = false } = {}) {
    const ids = listedIds(player, ctx, kept);
    for (const id of ids) stateOf(player, id);
    if (setSent === true || setSent === 'merge') {
      const keep = (player.avatarBoardsSent || []).map(Number).filter((id) => setSent === 'merge' || ids.includes(id));
      player.avatarBoardsSent = [...new Set([...keep, ...ids.filter((id) => onSale(player, id))])].sort((a, b) => a - b);
    }
    return ids;
  }

  // POST /user/sphere/check: {add, close}. checkTypes with 3 closes the boards sent that are no longer listed; otherwise the boards
  // handed out or bought that the client does not hold yet, once each, when boardTypes (if given) has their type. A board on sale
  // is never added: every new entry pops «Unlocked an Avatar Board!»
  function check(player, body = {}, ctx = {}, kept = null) {
    const types = (body.checkTypes || []).map(Number), boards = Array.isArray(body.boardTypes) ? body.boardTypes.map(Number) : null;
    const ids = listedIds(player, ctx, kept), sent = new Set((player.avatarBoardsSent || []).map(Number));
    if (types.includes(3)) {
      const close = [...sent].filter((id) => !ids.includes(id)).sort((a, b) => a - b);
      player.avatarBoardsSent = [...sent].filter((id) => ids.includes(id));
      return { add: [], close };
    }
    const add = ids.filter((id) => !sent.has(id) && !onSale(player, id) && (!boards || boards.includes(info(id).type)));
    for (const id of add) stateOf(player, id);
    player.avatarBoardsSent = [...sent, ...add];
    return { add, close: [] };
  }

  // POST /user/sphere/buy {sphereBoardId}: {ok, price} | {ok: false, why: 'unknown' | 'bought' | 'window' | 'jewels'}. Jewels are
  // the free ones (player.freeStone, the Shop's wallet); nothing changes on a refusal
  function buy(player, sphereBoardId, ctx = {}, kept = null) {
    const id = Number(sphereBoardId), e = info(id);
    if (!e || e.type !== SALE || !rowOf('sphere', 'sphereBoardId', id)) return { ok: false, why: 'unknown' };
    if (bought(player).has(id)) return { ok: false, why: 'bought' };
    if (!listed(player, id, ctx, kept)) return { ok: false, why: 'window' };
    const price = priceNow(id, ctx, kept);
    if (!(price > 0)) return { ok: false, why: 'unknown' };
    if ((player.freeStone || 0) < price) return { ok: false, why: 'jewels', price };
    player.freeStone -= price;
    player.avatarBoardsBought = [...bought(player), id].sort((a, b) => a - b);
    stateOf(player, id);
    // the client merges the board from this answer: it holds it now, so a later check must not announce it
    player.avatarBoardsSent = [...new Set([...(player.avatarBoardsSent || []).map(Number), id])];
    log(`[avatar boards] ${id} bought for ${price} Jewels`);
    return { ok: true, price };
  }

  // POST /user/sphere/update on one of these boards: {ok, why?, nodes, cost}. Refused when not listed, on sale (not bought), the
  // node is not on the board or already open, or the Avatar Coins are short. The completion reward (index 22) once
  function update(player, boardId, releaseMasuId, allOpen = false, ctx = {}, kept = null) {
    const id = Number(boardId);
    if (!info(id)) return { ok: false, why: 'not an avatar board', nodes: [], cost: 0 };
    if (!listed(player, id, ctx, kept)) return { ok: false, why: 'not listed', nodes: [], cost: 0 };
    if (onSale(player, id)) return { ok: false, why: 'not bought', nodes: [], cost: 0 };
    const s = stateOf(player, id), masu = rowOf('sphereMasu', 'masuId', id), nodes = nodesOf(id);
    const todo = allOpen ? nodes.filter((n) => !s.unlock.includes(n)) : [Number(releaseMasuId)].filter((n) => nodes.includes(n) && !s.unlock.includes(n));
    const cost = todo.reduce((t, n) => t + ((masu && masu.spherePoint[n - 1]) || 0), 0);
    if (!masu || !todo.length) return { ok: false, why: 'node', nodes: todo, cost };
    if (cost > (player.spherePoint || 0)) return { ok: false, why: `Avatar Coins ${player.spherePoint || 0} < ${cost}`, nodes: todo, cost };
    player.spherePoint = (player.spherePoint || 0) - cost;
    const was = complete(player, id);
    for (const n of todo) { s.unlock.push(n); grantSphereReward(masu, n - 1); }
    if (!was && complete(player, id)) grantSphereReward(masu, CELLS - 1);
    return { ok: true, nodes: todo, cost };
  }

  const isAvatarBoard = (id) => !!info(id);
  return { listedIds, listed, list, check, buy, update, servedRow, servedEndDatetime, priceNow, isBuy, isAvatarBoard, stateOf, complete };
}

// ------------------------------------------------------------------------------------------------- Event Catalog ---

// Task 5: the entries of game_data/events.json with avatarBoards (make-events.js avatarCatalog: BOARD entries, or an event that
// also sold boards) joined with doc = game_data/avatar_boards.json: entry.boards [{key, group, type, window, donorId, name,
// sphereBoardId | null, price, served, why}], every board of every window in record order, then the builder's held boards
// (entry.held); a board not served carries the why of report.held (build) or report.records.held (builder), null when neither
// names it (no index yet). available: an event quest served or a board served. Pure: the index is not changed.
function catalogIndex(index, doc) {
  if (!index || !Array.isArray(index.entries)) return index;
  const served = new Map(Object.entries((doc && doc.index) || {}).map(([id, e]) => [e.donorId, { id: Number(id), e }]));
  const report = (doc && doc.report) || {};
  const held = [...(report.held || []), ...((report.records || {}).held || [])];
  const heldWhy = (donorId, key) => (held.find((h) => h.donorId === donorId && (!h.keys || h.keys.includes(key))) || {}).why || null;
  const entries = index.entries.map((x) => {
    if (!x || !Array.isArray(x.avatarBoards)) return x;
    const boards = [];
    for (const w of x.avatarBoards) {
      for (const b of w.boards || []) {
        const s = served.get(b.donorId), win = s && (s.e.windows || []).find((v) => v.key === w.key);
        const base = { key: w.key, group: w.group, type: w.type, window: w.window, donorId: b.donorId, name: b.name };
        boards.push(win ? { ...base, sphereBoardId: s.id, price: Number(win.price) || 0, served: true, why: null }
          : { ...base, sphereBoardId: null, price: w.price, served: false, why: heldWhy(b.donorId, w.key) });
      }
    }
    for (const h of x.held || []) {
      boards.push({ key: null, group: null, type: null, window: null, donorId: h.donorId, name: h.name, sphereBoardId: null, price: null, served: false, why: h.why || null });
    }
    return { ...x, boards, available: !!x.available || boards.some((b) => b.served) };
  });
  return { ...index, entries };
}

// --------------------------------------------------------------------------------------------------------- patch ---

const readJson = (f, dflt) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return dflt; } };

// make-game-tables.js, after the Raid and Event Boards: the donor skills into skill.json, then the board rows (KHUX_AVATAR_BOARDS
// = the private records; without it no board, a warning) appended to sphere / sphereArray / sphereMasu; the rows of the previous
// run (game_data/avatar_boards.json own) are dropped first. Writes game_data/avatar_boards.json {index, report, own} and the
// numbers into event_ids.json (avatarBoards, avatarSkills). opts (tests): records, donorSkills, idsFile, gameDataDir, boosters
function patch(masterDir, opts = {}) {
  if (process.env.KHUX_AVATAR_BOARDS_OFF === '1') { console.log('avatar boards: off (KHUX_AVATAR_BOARDS_OFF=1)'); return null; }
  const gameData = opts.gameDataDir || path.join(__dirname, 'game_data');
  const idsFile = opts.idsFile || IDS_FILE;
  const outFile = path.join(gameData, 'avatar_boards.json');
  const prev = readJson(outFile, {}).own || {};
  const file = (t) => path.join(masterDir, `${t}.json`);
  const mine = (t, key) => { const own = new Set(prev[t] || []); return readJson(file(t), []).filter((r) => !own.has(r[key])); };
  const ids = readJson(idsFile, {});

  // donor skills (label skillFromDonor)
  let skills = mine('skill', 'skillId');
  const donorRows = opts.donorSkills || readJson(path.join(DONOR_MASTER, 'skill.json'), null);
  let imported = { rows: [], ids: ids.avatarSkills || {}, missing: DONOR_SKILLS };
  if (donorRows) imported = importDonorSkills(skills, donorRows, ids);
  else console.warn(`avatar boards: no donated skill table (${DONOR_MASTER}, KHUX_DONOR_MASTER): skills ${DONOR_SKILLS.join(', ')} not imported`);
  if (imported.missing.length && donorRows) console.warn(`avatar boards: skills ${imported.missing.join(', ')} not in the donated table`);
  skills = [...skills, ...imported.rows];
  fs.writeFileSync(file('skill'), JSON.stringify(skills));

  const master = { sphere: mine('sphere', 'sphereBoardId'), sphereArray: mine('sphereArray', 'arryId'), sphereMasu: mine('sphereMasu', 'masuId'), skill: skills,
    ...Object.fromEntries(['medal', 'material', 'title', 'avatarParts', 'petParts'].map((t) => [t, readJson(file(t), [])])) };
  checkRanges(master);
  let records = opts.records || null;
  if (!records && process.env.KHUX_AVATAR_BOARDS) records = readJson(process.env.KHUX_AVATAR_BOARDS, null);
  if (!records) console.warn('avatar boards: KHUX_AVATAR_BOARDS not set or not readable (the private board records): no avatar board');
  const boosters = opts.boosters || Object.keys(readJson(path.join(gameData, 'boosters.json'), { byId: {} }).byId || {}).map(Number);
  const out = records ? buildAvatarBoards({ records, master, ids, boosters })
    : { sphereRows: [], arrayRows: [], masuRows: [], art: [], index: {}, ids: { avatarBoards: ids.avatarBoards || {} }, report: { unmatched: [], held: [] } };
  fs.writeFileSync(file('sphere'), JSON.stringify([...master.sphere, ...out.sphereRows]));
  fs.writeFileSync(file('sphereArray'), JSON.stringify([...master.sphereArray, ...out.arrayRows]));
  fs.writeFileSync(file('sphereMasu'), JSON.stringify([...master.sphereMasu, ...out.masuRows]));
  fs.mkdirSync(gameData, { recursive: true });
  const own = { sphere: out.sphereRows.map((r) => r.sphereBoardId), sphereArray: out.arrayRows.map((r) => r.arryId), sphereMasu: out.masuRows.map((r) => r.masuId),
    skill: imported.rows.map((r) => r.skillId) };
  fs.writeFileSync(outFile, JSON.stringify({ index: out.index, art: out.art, report: { ...out.report, records: records ? { held: records.held || [], unmapped: records.unmapped || [] } : null,
    skillsFromDonor: Object.fromEntries(Object.entries(imported.ids).map(([d, v]) => [d, { ...v, label: 'skillFromDonor' }])) }, own }, null, 1));
  // the numbers, append-only, into the shared ids file (make-events.js keeps the keys it does not know)
  const next = { ...readJson(idsFile, {}), avatarBoards: out.ids.avatarBoards, avatarSkills: imported.ids };
  const text = JSON.stringify(next, null, 1) + '\n';
  let old = null;
  try { old = fs.readFileSync(idsFile, 'utf8').replace(/\r\n/g, '\n'); } catch { /* first run */ }
  if (old !== text) fs.writeFileSync(idsFile, text);
  const byType = out.sphereRows.reduce((m, r) => ((m[r.type] = (m[r.type] || 0) + 1), m), {});
  // a board held in some windows only (priceUnknown, its priced windows served) is in the index too
  const servedDonors = new Set(Object.values(out.index).map((e) => e.donorId));
  const partly = out.report.held.filter((h) => servedDonors.has(h.donorId)).length, whole = out.report.held.length - partly;
  console.log(`avatar boards: +${out.sphereRows.length} boards (type 2: ${byType[2] || 0}, type 1: ${byType[1] || 0}), ${whole} held, ${partly} held in some windows only, `
    + `${out.report.unmatched.length} cells unmatched; +${imported.rows.length} skills from the donated master`);
  return out;
}

if (require.main === module) patch(process.argv[2] || path.join(__dirname, 'master_data'));

module.exports = { buildAvatarBoards, importDonorSkills, avatarBoardRoutes, catalogIndex, windowInWeek: inWeek, allocate, checkRanges, matchCell, cellSkill, weekEndFake, patch,
  ID_BASE, ID_MAX, LEVEL_IDS, DONOR_SKILLS, SALE, HANDOUT };
