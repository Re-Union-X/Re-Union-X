// Coliseum boards (sphere type 3; Coliseum Part 1 Task 5, spec docs/superpowers/specs/2026-11-25-coliseum-design.md «Season
// save», «Kept season»). The boards of a season are make-colosseum.js SEASON_BOARDS[colosseumStageId] (the 1.1.3 rows, original
// cells and costs); only the boards of the live season (routes-colosseum.js liveSeason: the kept one, else the story clock's) are
// handed out, and they are bought with that season's Coliseum Coins (colosseum().spendCoins, userPoint.colosseumSpherePoint).
// A «Tier N Bonus» board (make-colosseum.js BONUS_TIER) is handed out only once Tier N of its season is reached
// (colosseum().tierReached): the next check then announces it («Unlocked a Coliseum Board!»).
// Save (absent in older saves: empty defaults):
//   player.colosseumSphere {[colosseumStageId]: {[boardId]: {id, unlock[], getDatetime}}}  per season, kept for good: a node
//     bought in April stays bought when April comes back (kept season or story clock); made when a board is first handed out
//   player.colosseumSphereSent [boardId]   the type-3 boards the client holds as far as the server knows
// Client list protocol, node list and unlock step shared with the Event Boards (sphere-board-core.js). Every cell is paid once;
// index 22 of sphereMasu (no node on the grid) is the completion reward, paid once. A medal with the medal storage full goes to
// the Presents (as the raid rewards, raid-rewards.js deliverReward).
'use strict';
const core = require('./sphere-board-core');
const { SEASON_BOARDS, BONUS_TIER } = require('./make-colosseum');
const { cellSkill } = require('./avatar-boards');

const TYPE = 3;
const MEDAL = 3;

// deps: player, master (table) -> rows, colosseum () -> {liveSeason, coinsOf, spendCoins, tierReached}, grantSphereReward (masu,
// index), medalCount (), medalCap (), addPresent ({type, id, num, skillId}, text), now () -> ms, nextUserSphereId (), seasonBoards
// (default SEASON_BOARDS), bonusTier (default BONUS_TIER), log
function colosseumBoardRoutes({ player, master, colosseum, grantSphereReward, medalCount = () => 0, medalCap = () => Infinity, addPresent = () => {},
  now, nextUserSphereId, seasonBoards = SEASON_BOARDS, bonusTier = BONUS_TIER, log = (...m) => console.log(...m) }) {
  const boardRow = (id) => master('sphere').find((r) => r.sphereBoardId === Number(id) && r.type === TYPE);
  const seasonOf = (id) => { const k = Object.keys(seasonBoards).find((s) => seasonBoards[s].includes(Number(id))); return k ? Number(k) : null; };
  const masuOf = (board) => master('sphereMasu').find((r) => r.masuId === board.masuId);
  const nodesOf = (board) => core.nodesOf(master, board);
  // a board served by the master with its three rows and a reward on every node (as routes-event-boards.js servable)
  const warned = new Set();
  function servable(id) {
    const b = boardRow(id), m = b && masuOf(b);
    if (!b || !m || !master('sphereArray').some((r) => r.arryId === b.arryId)) return false;
    const empty = nodesOf(b).filter((n) => !m.rewardSelect[n - 1]);
    if (empty.length && !warned.has(id)) { warned.add(id); log(`[colosseum boards] board ${id} not handed out: nodes ${empty.join(', ')} without a reward`); }
    return !empty.length;
  }
  // a bonus board waits for its tier of the live season
  const unlocked = (id) => !bonusTier[id] || colosseum().tierReached(bonusTier[id]);
  const stateOf = (id) => { const s = seasonOf(id); return s === null ? undefined : ((player.colosseumSphere || {})[s] || {})[Number(id)]; };
  const liveId = () => { const s = colosseum().liveSeason(); return s ? s.id : null; };

  // the boards handed out now: the live season's, in SEASON_BOARDS order. Their state is made here (kept for good)
  function active() {
    const s = liveId();
    if (s === null) return [];
    const out = [];
    for (const id of seasonBoards[s] || []) {
      if (!servable(id) || !unlocked(id)) continue;
      const box = ((player.colosseumSphere ||= {})[s] ||= {});
      if (!box[id]) box[id] = { id: nextUserSphereId(), unlock: [], getDatetime: now() };
      out.push(id);
    }
    return out;
  }
  // every type-3 board the client may hold: those ever handed out (a state) or sent
  const known = () => [...new Set([...(player.colosseumSphereSent || []).map(Number),
    ...Object.values(player.colosseumSphere || {}).flatMap((box) => Object.keys(box).map(Number))])].sort((a, b) => a - b);
  // POST /user/sphere/check {add, close} and GET /user/sphere (list) over player.colosseumSphereSent
  const { check, list } = core.sentListProtocol({ player, sentKey: 'colosseumSphereSent', type: TYPE, active, known });

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
  // handed out (another season, none live, bonus tier not reached), the node is not on the board or already open, or the season's
  // coins are short
  function update(boardId, releaseMasuId, allOpen = false) {
    const id = Number(boardId), board = boardRow(id);
    if (!board || seasonOf(id) === null) return { ok: false, why: 'not a Coliseum board', nodes: [], cost: 0 };
    if (!active().includes(id)) return { ok: false, why: 'not handed out', nodes: [], cost: 0 };
    const s = stateOf(id), masu = masuOf(board), nodes = nodesOf(board);
    const todo = core.nodesToOpen(nodes, s.unlock, releaseMasuId, allOpen);
    const cost = core.costOf(masu, todo);
    if (!todo.length) return { ok: false, why: 'node', nodes: todo, cost };
    if (!colosseum().spendCoins(cost)) return { ok: false, why: `coins ${colosseum().coinsOf()} < ${cost}`, nodes: todo, cost };
    core.openNodes({ nodes, state: s, todo, pay: (i) => pay(board, masu, i) });
    return { ok: true, nodes: todo, cost, season: seasonOf(id) };
  }

  return { active, list, check, update, known, stateOf, isColosseumBoard: (id) => !!boardRow(id) && seasonOf(id) !== null };
}

module.exports = colosseumBoardRoutes;
module.exports.TYPE = TYPE;
