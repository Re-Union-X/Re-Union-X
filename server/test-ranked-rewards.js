// Ranked rewards (spec 2026-11-10-ranked-rewards-design.md, Events Part 8 Task 4): mode-independent threshold logic.
// Pure functions, synthetic fixtures only.
//   node server/test-ranked-rewards.js
'use strict';
const assert = require('assert');
const rr = require('./ranked-rewards');

// lowest bracket -> top
const TH = [
  { startRank: 1001, endRank: 10000, score: 100, label: 'original' },
  { startRank: 101, endRank: 1000, score: 500, label: 'scaled' },
  { startRank: 11, endRank: 100, score: 2000, label: 'interpolated' },
  { startRank: 1, endRank: 10, score: 5000, label: 'scaled', originalScore: 9000 },
];
const item = (type, id, num, extra) => Object.assign({ type, id, num }, extra || {});
const BR = [
  { startRank: 1001, endRank: 10000, rewards: [item('gem', 0, 5)] },
  { startRank: 101, endRank: 1000, rewards: [item('gem', 0, 20), item('medal', 7, 1)] },
  { startRank: 11, endRank: 100, rewards: [item('gem', 0, 50), item('medal', 7, 3)] },
  { startRank: 1, endRank: 10, rewards: [item('gem', 0, 100), item('medal', 7, 3), item('skill', 9, 1, { skillId: 4, skillLv: 2 })] },
];
const tests = {
  bracket_of_result() {
    assert.strictEqual(rr.bracketOf(TH, 99), -1);
    assert.strictEqual(rr.bracketOf(TH, 100), 0);
    assert.strictEqual(rr.bracketOf(TH, 499), 0);
    assert.strictEqual(rr.bracketOf(TH, 500), 1);
    assert.strictEqual(rr.bracketOf(TH, 2000), 2);
    assert.strictEqual(rr.bracketOf(TH, 999999), 3);
  },
  shown_rank_below_lowest_is_lowest_upper_bound() {
    assert.strictEqual(rr.shownRank(TH, 0), 10000);
    assert.strictEqual(rr.shownRank(TH, 99), 10000);
    assert.strictEqual(rr.shownRank(TH, 100), 1001);
    assert.strictEqual(rr.shownRank(TH, 500), 101);
    assert.strictEqual(rr.shownRank(TH, 2500), 11);
  },
  first_only_above_top() {
    const th = [{ startRank: 11, endRank: 100, score: 10 }, { startRank: 2, endRank: 10, score: 50 }];
    assert.strictEqual(rr.shownRank(th, 50), 2);
    assert.strictEqual(rr.shownRank(th, 51), 1);
    assert.strictEqual(rr.shownRank(TH, 6000), 1);
  },
  jump_to_top_pays_top_only() {
    assert.deepStrictEqual(rr.rewardsDue(BR, -1, 3), BR[3].rewards);
  },
  difference_never_negative() {
    const d = rr.rewardsDue(BR, 1, 2); // gem 50-20, medal 3-1
    assert.deepStrictEqual(d, [item('gem', 0, 30), item('medal', 7, 2)]);
    // an item the higher bracket has less of is never negative, and absent ones are dropped
    const br = [{ rewards: [item('gem', 0, 10), item('coin', 1, 4)] }, { rewards: [item('gem', 0, 3)] }];
    assert.deepStrictEqual(rr.rewardsDue(br, 0, 1), []);
    // skill items compare by skillId/skillLv
    const d2 = rr.rewardsDue(BR, 2, 3);
    assert.deepStrictEqual(d2, [item('gem', 0, 50), item('skill', 9, 1, { skillId: 4, skillLv: 2 })]);
    assert.deepStrictEqual(rr.rewardsDue(BR, 2, 2), []);
    assert.deepStrictEqual(rr.rewardsDue(BR, 3, 1), []);
  },
  rerun_lower_score_keeps_best() {
    const st = {};
    const a = rr.record(st, 'ev1', 600, { thresholds: TH, brackets: BR });
    assert.strictEqual(a.best, 600); assert.strictEqual(a.paidIndex, 1);
    assert.deepStrictEqual(a.due, BR[1].rewards);
    const b = rr.record(st, 'ev1', 150, { thresholds: TH, brackets: BR });
    assert.strictEqual(b.best, 600); assert.strictEqual(b.paidIndex, 1); assert.deepStrictEqual(b.due, []);
    assert.deepStrictEqual(st.ev1, { best: 600, paidIndex: 1 });
  },
  threshold_is_the_score() {
    // the top threshold is the reduced score (16-11: original borders, top reduced); originalScore is only shown
    assert.strictEqual(rr.bracketOf(TH, 4999), 2);
    assert.strictEqual(rr.bracketOf(TH, 5000), 3);
    assert.strictEqual(rr.bracketOf(TH, 1999), 1);
  },
  paid_once_per_event_id() {
    const st = {};
    rr.record(st, 'ev1', 5000, { thresholds: TH, brackets: BR });
    assert.deepStrictEqual(rr.record(st, 'ev1', 5000, { thresholds: TH, brackets: BR }).due, []);
    const other = rr.record(st, 'ev2', 100, { thresholds: TH, brackets: BR });
    assert.deepStrictEqual(other.due, BR[0].rewards);
    assert.strictEqual(st.ev1.paidIndex, 3); assert.strictEqual(st.ev2.paidIndex, 0);
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log('OK   ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); }
}
if (failed) { console.log(failed + ' failed'); process.exit(1); }
console.log('all ' + Object.keys(tests).length + ' OK');
