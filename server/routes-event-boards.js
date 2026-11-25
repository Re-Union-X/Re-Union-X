// Event Coins and Event Boards (sphere type 4; Events Part 3, plan docs/superpowers/plans/2026-11-08-events-part3-coins.md
// Task 5; client side docs/notes/events.md «Event Boards spike»). game_data/events.json boardSets {[setKey]: {boardIds,
// chains {boardId: prevBoardId}, censusIds}} (make-events.js): the event quests of a set's feeder events pay Event Coins
// (reward type 15) into that set's balance, spent on that set's boards.
// Save (all absent in older saves: empty defaults; a read writes only the state of a board it hands out for the first time,
// active() below, and may trim eventSphereSent):
//   player.eventCoins {[setKey]: n}            coin balance per set; never expires
//   player.eventSphere {[boardId]: {id, unlock[], getDatetime}}   board progress, kept for good (as player.raidSphere)
//   player.eventSphereSent [boardId]           the type-4 boards the client holds as far as the server knows
//   player.eventCoinFocus setKey | null        the set of the last event quest started
// Rules (controller rulings of 08-11):
// - a set is available while one of its feeder events is in the current story week or is the kept event (Event Catalog);
// - focus = the set of the last event quest started when available, else the newest set of the week, else the kept event's;
//   userPoint.stageSpherePoint (the one Event Coins field of the client) shows the focus balance;
// - only the focus set's boards are handed out; a chained board (chains, openId 5) only once the board before is complete:
//   the client enforces neither the chain nor the window (bench 08-11), so update() refuses anything not handed out;
// - a board id goes in a /user/sphere/check answer once per hand-out (the client pops «Unlocked an Event Board!» per entry):
//   a check whose checkTypes has 3 closes the boards no longer handed out (closeEventSphereBoardIds), GET /user/sphere
//   drops the closed ones from the list (a new board is still sent by the next check). Coins and progress stay; a cell is paid once, the completion reward (index 22) once.
'use strict';
const core = require('./sphere-board-core');

const TYPE = 4;

function eventBoardRoutes({ player, events, master, grantSphereReward, now, nextUserSphereId, log = (...m) => console.log(...m) }) {
  const sets = () => ((events.index() || {}).boardSets) || {};
  const boardRow = (id) => master('sphere').find((r) => r.sphereBoardId === Number(id) && r.type === TYPE);
  // defensive guard (user decision 08-11, event-boards.js): every node of a served board pays a reward; a node with rewardSelect 0
  // crashed the client when its cursor landed on it (bench 08-11, Task 7b), so a board with one is never handed out
  const emptyNodes = (board) => {
    const masu = master('sphereMasu').find((r) => r.masuId === board.masuId);
    return masu ? nodesOf(board).filter((n) => !masu.rewardSelect[n - 1]) : nodesOf(board);
  };
  const warned = new Set();
  const servable = (id) => {
    const b = boardRow(id);
    if (!b) return false;
    const empty = emptyNodes(b);
    if (empty.length && !warned.has(id)) { warned.add(id); log(`[event boards] board ${id} not handed out: nodes ${empty.join(', ')} without a reward`); }
    return !empty.length;
  };
  // the boards of a set the master serves, in set order (a board in a save but no longer in the master is simply not listed)
  const boardsOf = (setKey) => ((sets()[setKey] || {}).boardIds || []).filter(servable);
  const setOfBoard = (id) => Object.keys(sets()).find((k) => (sets()[k].boardIds || []).includes(Number(id))) || null;
  const prevOf = (id) => { const s = sets()[setOfBoard(id)]; const p = s && (s.chains || {})[id]; return p ? Number(p) : null; };
  const setOfCensus = (cid) => Object.keys(sets()).find((k) => (sets()[k].censusIds || []).includes(cid)) || null;
  const state = (id) => (player.eventSphere || {})[id];

  const nodesOf = (board) => core.nodesOf(master, board);
  const complete = (id) => { const b = boardRow(id), s = state(id); return !!(b && s && nodesOf(b).every((n) => s.unlock.includes(n))); };

  // {week: [setKey] (a feeder event listed in the current story week), kept: setKey | null (the kept event's)}
  function windows() {
    const current = new Set(events.currentCensusIds() || []), keptId = events.keptCensusId() || null;
    const week = Object.keys(sets()).filter((k) => boardsOf(k).length && (sets()[k].censusIds || []).some((c) => current.has(c)));
    const kept = keptId && setOfCensus(keptId);
    return { week, kept: kept && boardsOf(kept).length ? kept : null };
  }
  const newest = (keys) => [...keys].sort().pop() || null;
  function focusSet() {
    const w = windows(), avail = new Set([...w.week, ...(w.kept ? [w.kept] : [])]);
    const f = player.eventCoinFocus;
    if (f && avail.has(f)) return f;
    return newest(w.week) || w.kept;
  }
  const stagePoint = () => { const f = focusSet(); return (f && (player.eventCoins || {})[f]) || 0; };

  // a set whose boards are held (not in boardSets, e.g. Booster cells until Part 6) but which has member entries (boardSetKey):
  // its Event Coins are still paid into its balance (one balance per set, never expiring; coordinator 08-11); it is never handed out
  const heldSet = (k) => ((events.index() || {}).entries || []).some((e) => e && e.boardSetKey === k);
  // Event Coins into a set's balance (an event quest of that set: objective, first-clear item, drop); false = not paid
  function addCoins(setKey, n) {
    n = Number(n) || 0;
    if (!n) return false;
    if (!setKey || !(sets()[setKey] || heldSet(setKey))) { log(`[event boards] Event Coin x${n} not paid: no board set (${setKey || '-'})`); return false; }
    player.eventCoins ||= {};
    player.eventCoins[setKey] = (player.eventCoins[setKey] || 0) + n;
    return true;
  }

  // /stage/start of an event quest (its index entry): the focus moves to the entry's set
  function onStageStart(entry) {
    const k = entry && entry.boardSet;
    if (!k || !sets()[k]) return false;
    if (player.eventCoinFocus !== k) log(`[event boards] focus ${player.eventCoinFocus || '-'} -> ${k}`);
    player.eventCoinFocus = k;
    return true;
  }

  // the boards handed out now: the focus set's, a chained one only behind a complete board. Their state is made here (kept for good)
  function active() {
    const f = focusSet();
    if (!f) return [];
    const out = [];
    for (const id of boardsOf(f)) {
      const prev = prevOf(id);
      if (prev && !complete(prev)) continue;
      player.eventSphere ||= {};
      if (!player.eventSphere[id]) player.eventSphere[id] = { id: nextUserSphereId(), unlock: [], getDatetime: now() };
      out.push(id);
    }
    return out;
  }
  // every type-4 board the client may hold: those ever handed out (a state) or sent. Not every board of every set, unlike the
  // raids: the client can hold only what it was sent, and a fresh save closes nothing (test-raid-boards.js close_event_boards)
  const known = () => [...new Set([...(player.eventSphereSent || []).map(Number), ...Object.keys(player.eventSphere || {}).map(Number)])].sort((a, b) => a - b);

  // POST /user/sphere/check {add, close} and GET /user/sphere (list) over player.eventSphereSent: sphere-board-core.js
  // sentListProtocol (a board handed out first by the list is still sent once by the next check: «Unlocked an Event Board!»)
  const { check, list } = core.sentListProtocol({ player, sentKey: 'eventSphereSent', type: TYPE, active, known });

  // POST /user/sphere/update on a type-4 board: {ok, why?, nodes, cost}. Refused (nothing changes) when the board is not handed
  // out (window, focus, chain), the node is not on the board or already open, or the set's balance is short
  function update(boardId, releaseMasuId, allOpen = false) {
    const id = Number(boardId), board = boardRow(id);
    if (!board) return { ok: false, why: 'not an event board', nodes: [], cost: 0 };
    if (!servable(id)) return { ok: false, why: 'node without a reward', nodes: [], cost: 0 };
    const prev = prevOf(id);
    if (prev && !complete(prev)) return { ok: false, why: `chained behind ${prev}`, nodes: [], cost: 0 };
    if (!active().includes(id)) return { ok: false, why: 'not handed out', nodes: [], cost: 0 };
    const s = state(id), setKey = setOfBoard(id);
    const masu = master('sphereMasu').find((r) => r.masuId === board.masuId);
    const nodes = nodesOf(board);
    const todo = core.nodesToOpen(nodes, s.unlock, releaseMasuId, allOpen);
    const cost = core.costOf(masu, todo);
    if (!masu || !todo.length) return { ok: false, why: 'node', nodes: todo, cost };
    const balance = (player.eventCoins || {})[setKey] || 0;
    if (cost > balance) return { ok: false, why: `coins ${balance} < ${cost}`, nodes: todo, cost };
    player.eventCoins ||= {};
    player.eventCoins[setKey] = balance - cost;
    core.openNodes({ nodes, state: s, todo, pay: (i) => grantSphereReward(masu, i) });
    return { ok: true, nodes: todo, cost, setKey };
  }

  return { focusSet, stagePoint, addCoins, check, update, onStageStart, list, active, known, setOfBoard, emptyNodes, isEventBoard: (id) => !!boardRow(id) };
}

module.exports = eventBoardRoutes;
module.exports.TYPE = TYPE;
