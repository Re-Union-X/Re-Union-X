// Shared core of the boards handed out by the server (Event Boards type 4, routes-event-boards.js; Coliseum boards type 3,
// routes-colosseum-boards.js): the board's nodes, the client list protocol (GET /user/sphere and /user/sphere/check) and the
// unlock / pay / completion step of /user/sphere/update. Client facts: docs/notes/bacheche.md, docs/notes/events.md.
'use strict';

const CELLS = 23; // sphereMasu entries; index 22 (no node on the grid) is the completion reward

// node numbers 1..23 of a board: the values of its sphereArray grid
function nodesOf(master, board) {
  const arr = master('sphereArray').find((r) => r.arryId === board.arryId);
  const nodes = new Set();
  for (const k of ['spCol0', 'spCol1', 'spCol2', 'spCol3', 'spCol4']) for (const v of arr?.[k] || []) if (v >= 1 && v <= CELLS) nodes.add(v);
  return [...nodes].sort((a, b) => a - b);
}

// The client list protocol of one board type. player[sentKey] = the board ids of that type the client holds as far as the server
// knows; active () -> the ids handed out now; known () -> every id the client may hold (handed out once, or sent).
// - check(body) -> {add, close}: checkTypes with 3 closes the boards no longer handed out (closeEventSphereBoardIds); otherwise a
//   check whose boardTypes has `type` (or none given) adds the boards handed out since the last answer, once each (the client
//   pops its «Unlocked ...» popup per entry);
// - list({setSent}) -> ids (GET /user/sphere): setSent true drops from the sent list the boards no longer handed out; a board
//   handed out for the first time by the list is NOT marked as sent, so the next check still sends it once (bench 08-11, Task 7b:
//   the login GET came before the home check and the popup never showed). 'merge' leaves the sent list as it is
function sentListProtocol({ player, sentKey, type, active, known }) {
  function check(body = {}) {
    const types = (body.checkTypes || []).map(Number), boards = Array.isArray(body.boardTypes) ? body.boardTypes.map(Number) : null;
    const act = active(), sent = new Set((player[sentKey] || []).map(Number));
    if (types.includes(3)) {
      const close = known().filter((id) => !act.includes(id));
      player[sentKey] = [...sent].filter((id) => act.includes(id));
      return { add: [], close };
    }
    if (boards && !boards.includes(type)) return { add: [], close: [] };
    const add = act.filter((id) => !sent.has(id));
    player[sentKey] = [...sent, ...add];
    return { add, close: [] };
  }
  function list({ setSent = false } = {}) {
    const act = active();
    if (setSent === true) player[sentKey] = (player[sentKey] || []).map(Number).filter((id) => act.includes(id));
    return act;
  }
  return { check, list };
}

// the nodes an update asks for: every node not open (allOpen), else the one node when it is on the board and not open
const nodesToOpen = (nodes, unlock, releaseMasuId, allOpen) => (allOpen ? nodes.filter((n) => !unlock.includes(n))
  : [Number(releaseMasuId)].filter((n) => nodes.includes(n) && !unlock.includes(n)));
const costOf = (masu, todo) => todo.reduce((t, n) => t + ((masu && masu.spherePoint[n - 1]) || 0), 0);
// opens `todo` on the board state, paying each cell (pay(index)), then the completion reward once when the board becomes complete
function openNodes({ nodes, state, todo, pay }) {
  const done = () => nodes.every((n) => state.unlock.includes(n));
  const wasComplete = done();
  for (const n of todo) { state.unlock.push(n); pay(n - 1); }
  if (!wasComplete && done()) pay(CELLS - 1);
}

module.exports = { CELLS, nodesOf, sentListProtocol, nodesToOpen, costOf, openNodes };
