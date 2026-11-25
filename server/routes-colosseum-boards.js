// Coliseum boards (sphere type 3; Coliseum Part 1 Task 5, spec docs/superpowers/specs/2026-11-25-coliseum-design.md «Season
// save», «Kept season»). The boards of a season are make-colosseum.js SEASON_BOARDS[colosseumStageId] (the 1.1.3 rows, original
// cells and costs); only the boards of the live season (routes-colosseum.js liveSeason: the kept one, else the story clock's) are
// handed out, and they are bought with that season's Coliseum Coins (colosseum().spendCoins, userPoint.colosseumSpherePoint).
// Save (absent in older saves: empty defaults):
//   player.colosseumSphere {[colosseumStageId]: {[boardId]: {id, unlock[], getDatetime}}}  per season, kept for good: a node
//     bought in April stays bought when April comes back (kept season or story clock); made when a board is first handed out
//   player.colosseumSphereSent [boardId]   the type-3 boards the client holds as far as the server knows
// Client list handling as the Event Boards (routes-event-boards.js): GET /user/sphere replaces the list; a /user/sphere/check
// whose checkTypes has 3 closes the boards no longer handed out (closeEventSphereBoardIds); otherwise a check whose boardTypes
// has 3 (or none given) adds the boards handed out since the last answer, once each. Every cell is paid once; index 22 of
// sphereMasu (no node on the grid) is the completion reward, paid once. A medal with the medal storage full goes to the Presents
// (as the raid rewards, raid-rewards.js deliverReward).
'use strict';
const { SEASON_BOARDS } = require('./make-colosseum');
const { cellSkill } = require('./avatar-boards');

const TYPE = 3;
const CELLS = 23;
const MEDAL = 3;

// deps: player, master (table) -> rows, colosseum () -> {liveSeason, spendCoins}, grantSphereReward (masu, index), medalCount (),
// medalCap (), addPresent ({type, id, num, skillId}, text), now () -> ms, nextUserSphereId (), seasonBoards (default SEASON_BOARDS), log
function colosseumBoardRoutes({ player, master, colosseum, grantSphereReward, medalCount = () => 0, medalCap = () => Infinity, addPresent = () => {},
  now, nextUserSphereId, seasonBoards = SEASON_BOARDS, log = (...m) => console.log(...m) }) {
  const boardRow = (id) => master('sphere').find((r) => r.sphereBoardId === Number(id) && r.type === TYPE);
  const seasonOf = (id) => { const k = Object.keys(seasonBoards).find((s) => seasonBoards[s].includes(Number(id))); return k ? Number(k) : null; };
  const masuOf = (board) => master('sphereMasu').find((r) => r.masuId === board.masuId);
  function nodesOf(board) {
    const arr = master('sphereArray').find((r) => r.arryId === board.arryId);
    const nodes = new Set();
    for (const k of ['spCol0', 'spCol1', 'spCol2', 'spCol3', 'spCol4']) for (const v of arr?.[k] || []) if (v >= 1 && v <= CELLS) nodes.add(v);
    return [...nodes].sort((a, b) => a - b);
  }
  // a board served by the master with its three rows and a reward on every node (as routes-event-boards.js servable)
  const warned = new Set();
  function servable(id) {
    const b = boardRow(id), m = b && masuOf(b);
    if (!b || !m || !master('sphereArray').some((r) => r.arryId === b.arryId)) return false;
    const empty = nodesOf(b).filter((n) => !m.rewardSelect[n - 1]);
    if (empty.length && !warned.has(id)) { warned.add(id); log(`[colosseum boards] board ${id} not handed out: nodes ${empty.join(', ')} without a reward`); }
    return !empty.length;
  }
  const stateOf = (id) => { const s = seasonOf(id); return s === null ? undefined : ((player.colosseumSphere || {})[s] || {})[Number(id)]; };
  const liveId = () => { const s = colosseum().liveSeason(); return s ? s.id : null; };

  // the boards handed out now: the live season's, in SEASON_BOARDS order. Their state is made here (kept for good)
  function active() {
    const s = liveId();
    if (s === null) return [];
    const out = [];
    for (const id of seasonBoards[s] || []) {
      if (!servable(id)) continue;
      const box = ((player.colosseumSphere ||= {})[s] ||= {});
      if (!box[id]) box[id] = { id: nextUserSphereId(), unlock: [], getDatetime: now() };
      out.push(id);
    }
    return out;
  }
  // every type-3 board the client may hold: those ever handed out (a state) or sent
  const known = () => [...new Set([...(player.colosseumSphereSent || []).map(Number),
    ...Object.values(player.colosseumSphere || {}).flatMap((box) => Object.keys(box).map(Number))])].sort((a, b) => a - b);

  // POST /user/sphere/check: {add, close} (see the header)
  function check(body = {}) {
    const types = (body.checkTypes || []).map(Number), boards = Array.isArray(body.boardTypes) ? body.boardTypes.map(Number) : null;
    const act = active(), sent = new Set((player.colosseumSphereSent || []).map(Number));
    if (types.includes(3)) {
      const close = known().filter((id) => !act.includes(id));
      player.colosseumSphereSent = [...sent].filter((id) => act.includes(id));
      return { add: [], close };
    }
    if (boards && !boards.includes(TYPE)) return { add: [], close: [] };
    const add = act.filter((id) => !sent.has(id));
    player.colosseumSphereSent = [...sent, ...add];
    return { add, close: [] };
  }
  // GET /user/sphere: the boards handed out now. setSent true drops from colosseumSphereSent the boards no longer handed out (a
  // board handed out for the first time here is not marked as sent, so the next check still announces it); 'merge' leaves it
  function list({ setSent = false } = {}) {
    const act = active();
    if (setSent === true) player.colosseumSphereSent = (player.colosseumSphereSent || []).map(Number).filter((id) => act.includes(id));
    return act;
  }

  // one cell's reward: a medal that does not fit the medal storage goes to the Presents
  function pay(board, masu, i) {
    const val = masu.rewardValue[i] || 1;
    if (masu.rewardSelect[i] === MEDAL && masu.rewardId[i] && medalCount() + val > medalCap()) {
      const skillId = cellSkill(masu, i); // a skill medal (rewardExpand 3) keeps its skill, as grantSphereReward gives it
      addPresent({ type: MEDAL, id: masu.rewardId[i], num: val, ...(skillId ? { skillId } : {}) }, `Coliseum board «${board.boardName}»: medal storage full`);
      log(`[colosseum boards] board ${board.sphereBoardId} cell ${i + 1}: medal ${masu.rewardId[i]} to the Presents (storage full)`);
    } else grantSphereReward(masu, i);
  }

  // POST /user/sphere/update on a type-3 board: {ok, why?, nodes, cost, season}. Refused (nothing changes) when the board is not
  // handed out (another season, none live), the node is not on the board or already open, or the season's coins are short
  function update(boardId, releaseMasuId, allOpen = false) {
    const id = Number(boardId), board = boardRow(id);
    if (!board || seasonOf(id) === null) return { ok: false, why: 'not a Coliseum board', nodes: [], cost: 0 };
    if (!active().includes(id)) return { ok: false, why: 'not handed out', nodes: [], cost: 0 };
    const s = stateOf(id), masu = masuOf(board), nodes = nodesOf(board);
    const todo = allOpen ? nodes.filter((n) => !s.unlock.includes(n)) : [Number(releaseMasuId)].filter((n) => nodes.includes(n) && !s.unlock.includes(n));
    const cost = todo.reduce((t, n) => t + (masu.spherePoint[n - 1] || 0), 0);
    if (!todo.length) return { ok: false, why: 'node', nodes: todo, cost };
    const season = seasonOf(id);
    if (!colosseum().spendCoins(cost)) return { ok: false, why: `coins ${colosseum().coinsOf()} < ${cost}`, nodes: todo, cost };
    const wasComplete = nodes.every((n) => s.unlock.includes(n));
    for (const n of todo) { s.unlock.push(n); pay(board, masu, n - 1); }
    if (!wasComplete && nodes.every((n) => s.unlock.includes(n))) pay(board, masu, CELLS - 1);
    return { ok: true, nodes: todo, cost, season };
  }

  return { active, list, check, update, known, stateOf, isColosseumBoard: (id) => !!boardRow(id) && seasonOf(id) !== null };
}

module.exports = colosseumBoardRoutes;
module.exports.TYPE = TYPE;
