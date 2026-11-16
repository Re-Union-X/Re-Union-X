// Ranked rewards (spec docs/superpowers/specs/2026-11-10-ranked-rewards-design.md, Events Part 8 Task 4).
// Mode-independent threshold logic: leaderboard brackets become per-event score thresholds. Pure functions: no I/O, no save;
// the caller saves the state and pays `due`. Thresholds and brackets are ordered lowest bracket -> top, same length.
//   threshold: { startRank, endRank, score, label, ceiling?, tolerance? }   (tolerance: absolute score amount)
//   bracket:   { startRank, endRank, rewards: [{ type, id, num, skillId?, skillLv? }] }
'use strict';

const needed = t => (t.ceiling ? t.score - (t.tolerance || 0) : t.score);

// index of the highest threshold reached, -1 when none
function bracketOf(thresholds, result) {
  for (let i = thresholds.length - 1; i >= 0; i--) if (result >= needed(thresholds[i])) return i;
  return -1;
}

// spec 4.4: bracket reached -> its best rank; below the lowest -> its upper bound; 1 only above the top threshold
function shownRank(thresholds, result) {
  const top = thresholds[thresholds.length - 1];
  if (top && result > top.score) return 1;
  const i = bracketOf(thresholds, result);
  return i < 0 ? thresholds[0].endRank : thresholds[i].startRank;
}

const keyOf = r => `${r.type}:${r.id}:${r.skillId == null ? '' : r.skillId}:${r.skillLv == null ? '' : r.skillLv}`;

// rewards of bracket newIndex minus those already paid with bracket paidIndex, item by item, never negative
function rewardsDue(brackets, paidIndex, newIndex) {
  if (newIndex <= paidIndex || newIndex < 0) return [];
  const paid = new Map();
  if (paidIndex >= 0) for (const r of brackets[paidIndex].rewards) paid.set(keyOf(r), (paid.get(keyOf(r)) || 0) + r.num);
  const out = [];
  for (const r of brackets[newIndex].rewards) {
    const num = r.num - (paid.get(keyOf(r)) || 0);
    if (num > 0) out.push(Object.assign({}, r, { num }));
  }
  return out;
}

// updates state[eventId] = { best, paidIndex }; paidIndex only moves up. Needs { thresholds, brackets } (4th parameter) to find the bracket.
function record(state, eventId, result, { thresholds, brackets }) {
  const cur = state[eventId] || { best: -Infinity, paidIndex: -1 };
  const best = Math.max(cur.best, result);
  const idx = bracketOf(thresholds, best);
  const due = rewardsDue(brackets, cur.paidIndex, idx);
  const paidIndex = Math.max(cur.paidIndex, idx);
  state[eventId] = { best, paidIndex };
  return { best, paidIndex, due };
}

module.exports = { bracketOf, shownRank, rewardsDue, record };
