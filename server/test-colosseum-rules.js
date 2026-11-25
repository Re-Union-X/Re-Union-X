'use strict';
const assert = require('assert');
const R = require('./colosseum-rules');

const row = (round, count, skip, coin, tierCoin) => ({
  colosseumId: 100 + round, colosseumStageId: 7, round, ap: 5, arrivalStageCount: count, excellentUnlockCount: skip,
  validStageReward: 1, stageRewardType: [17, 0, 0, 0], stageRewardId: [0, 0, 0, 0], stageRewardAssignType: [0, 0, 0, 0],
  stageRewardSkillId: [0, 0, 0, 0], stageRewardSkillLv: [0, 0, 0, 0], stageRewardNum: [coin, 0, 0, 0],
  validReward: tierCoin ? 2 : 0, rewardType: [17, 1, 0, 0], rewardId: [0, 5, 0, 0], rewardAssignType: [0, 0, 0, 0],
  rewardSkillId: [0, 0, 0, 0], rewardSkillLv: [0, 0, 0, 0], rewardNum: [tierCoin, 2, 0, 0],
});
const tiers = R.tiersOf({ stage: { loopStageCount: 4 }, tiers: [row(3, 0, 2, 5, 0), row(1, 5, 3, 1, 30), row(2, 5, 2, 3, 40)] });
const T = (tier, round) => ({ tier, round });
const view = (st) => R.playable(tiers, st).map((p) => `T${p.tier}R${p.round}`);
const fresh = () => R.seasonState({}, 7);

assert.deepStrictEqual(tiers.map((t) => t.tier), [1, 2, 3], 'tiersOf sorts by round');
assert.strictEqual(R.globalRound(tiers, 2, 2), 7);
assert.deepStrictEqual(R.tierRound(tiers, 7), T(2, 2));
assert.deepStrictEqual(R.tierRound(tiers, 11), T(3, 1));
assert.deepStrictEqual(R.tierRound(tiers, 1000), T(3, 990));

// fresh season
let st = fresh();
assert.deepStrictEqual(view(st), ['T1R1']);
assert.strictEqual(st.last, 0); assert.strictEqual(st.open, 1);

// multi-turn clear
let res = R.clear(tiers, st, { tier: 1, round: 1, oneTurn: false }, 'T0');
assert(res.ok); assert.deepStrictEqual(res.cleared, [T(1, 1)]); assert.strictEqual(res.coins, 1);
assert.deepStrictEqual(view(st), ['T1R2']); assert.strictEqual(st.bestAt, 'T0');

// one-turn window
st = fresh();
R.clear(tiers, st, { tier: 1, round: 1, oneTurn: true }, 'T0');
assert.deepStrictEqual(view(st), ['T1R2', 'T1R3', 'T1R4']);

// clear outside window is a no-op
const snap = JSON.stringify(st);
res = R.clear(tiers, st, { tier: 1, round: 1, oneTurn: true }, 'T1');
assert.strictEqual(res.ok, false); assert.strictEqual(JSON.stringify(st), snap);
res = R.clear(tiers, st, { tier: 1, round: 5, oneTurn: true }, 'T1');
assert.strictEqual(res.ok, false); assert.strictEqual(JSON.stringify(st), snap);

// skip pays skipped rounds
res = R.clear(tiers, st, { tier: 1, round: 4, oneTurn: true }, 'T2');
assert(res.ok); assert.deepStrictEqual(res.cleared, [T(1, 2), T(1, 3), T(1, 4)]); assert.strictEqual(res.coins, 3);
assert.strictEqual(st.coins, 4); assert.strictEqual(st.bestAt, 'T2');
assert.deepStrictEqual(view(st), ['T1R5', 'T2R1', 'T2R2']);

// jump across tiers
res = R.clear(tiers, st, { tier: 2, round: 2, oneTurn: true }, 'T3');
assert(res.ok); assert.deepStrictEqual(res.cleared, [T(1, 5), T(2, 1), T(2, 2)]);
assert.strictEqual(res.coins, 1 + 3 + 3 + 30); assert.deepStrictEqual(res.tierRewards, [1]);
assert.deepStrictEqual(res.tierItems, [{ tier: 1, items: [
  { type: 17, id: 0, assignType: 0, skillId: 0, skillLv: 0, num: 30 }, { type: 1, id: 5, assignType: 0, skillId: 0, skillLv: 0, num: 2 }] }]);
assert.deepStrictEqual(st.tierRewards, [1]);
assert.deepStrictEqual(view(st), ['T2R3', 'T2R4']);

// tier 2 completes once, tier reward not paid twice
R.clear(tiers, st, { tier: 2, round: 4, oneTurn: true }, 'T4');
assert.deepStrictEqual(view(st), ['T2R5', 'T3R1']);
res = R.clear(tiers, st, { tier: 3, round: 1, oneTurn: false }, 'T4');
assert(res.ok); assert.deepStrictEqual(res.tierRewards, [2]); assert.deepStrictEqual(st.tierRewards, [1, 2]);
assert.strictEqual(res.coins, 3 + 5 + 40);

// endless tier
st = fresh(); st.last = 10; st.open = 11; st.tierRewards = [1, 2];
res = R.clear(tiers, st, { tier: 3, round: 1, oneTurn: false }, 'T5');
assert(res.ok); assert.deepStrictEqual(res.tierRewards, []); assert.strictEqual(res.coins, 5);
assert.deepStrictEqual(view(st), ['T3R2']);
st.last = 1008; st.open = 1009; // round 999 of tier 3 done, 1000 next
assert.deepStrictEqual(R.playable(tiers, st), [{ tier: 3, round: 999, stageIndex: 2 }]);
st.last = 1009; st.open = 1010;
assert.deepStrictEqual(R.playable(tiers, st), [{ tier: 3, round: 1000, stageIndex: 3 }]);
assert(R.clear(tiers, st, { tier: 3, round: 1000, oneTurn: false }, 'T6').tierRewards.length === 0);

// season flips keep progress
const save = {};
const a = R.seasonState(save, 1), b = R.seasonState(save, 2);
R.clear(tiers, a, { tier: 1, round: 1, oneTurn: false }, 'T7');
assert.strictEqual(R.seasonState(save, 1).last, 1); assert.strictEqual(R.seasonState(save, 1).coins, 1);
assert.strictEqual(b.last, 0); assert.strictEqual(b.coins, 0);
assert.strictEqual(R.seasonState(save, 2), b);
assert.doesNotThrow(() => JSON.parse(JSON.stringify(save)));
console.log('colosseum-rules: ok');
