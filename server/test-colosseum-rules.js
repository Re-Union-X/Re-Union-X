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
// the season state: board progress lives in player.colosseumSphere, never here (final review M5: no dead boardIds field)
assert.deepStrictEqual(Object.keys(fresh()).sort(), ['bestAt', 'cleared', 'coins', 'last', 'open', 'tierRewards']);

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

// seasons live under save.colosseum.seasons; kept next to it is never a season
const sv = { colosseum: { kept: { 7: true } } };
const k = R.seasonState(sv, 7);
assert.strictEqual(k.last, 0); assert.deepStrictEqual(sv.colosseum.kept, { 7: true });
assert.strictEqual(sv.colosseum.seasons[7], k); assert.deepStrictEqual(Object.keys(sv.colosseum).sort(), ['kept', 'seasons']);

// non-integer tier/round rejected, nothing changes
st = fresh(); const s0 = JSON.stringify(st);
for (const bad of [{ tier: 1, round: 1.5 }, { tier: 1.2, round: 1 }, { tier: 1, round: '1' }, { tier: 1, round: NaN }]) {
  assert.strictEqual(R.clear(tiers, st, bad, 'T8').ok, false);
}
assert.strictEqual(JSON.stringify(st), s0);

// one-turn jump crossing two tiers pays both tier rewards
const big = R.tiersOf({ stage: { loopStageCount: 4 }, tiers: [row(1, 2, 5, 1, 30), row(2, 2, 2, 3, 40), row(3, 0, 2, 5, 0)] });
st = fresh();
R.clear(big, st, { tier: 1, round: 1, oneTurn: true }, 'T9'); // open = 6
res = R.clear(big, st, { tier: 3, round: 2, oneTurn: false }, 'T9'); // global 6, pays 2..6
assert(res.ok); assert.deepStrictEqual(res.tierRewards, [1, 2]); assert.strictEqual(res.coins, 1 + 3 + 3 + 5 + 5 + 30 + 40);
assert.deepStrictEqual(st.tierRewards, [1, 2]);

// skip 0 one-turn opens exactly one round
const z = R.tiersOf({ stage: { loopStageCount: 4 }, tiers: [row(1, 5, 0, 1, 0)] });
st = fresh();
R.clear(z, st, { tier: 1, round: 1, oneTurn: true }, 'T10');
assert.deepStrictEqual(R.playable(z, st).map((p) => p.round), [2]);

// the served master's per-round reward fields are plain ints (4.3.1 schema), the tier reward fields int[4]
const scalar = { ...row(1, 3, 1, 7, 30), stageRewardType: 17, stageRewardId: 0, stageRewardAssignType: 1, stageRewardSkillId: 0, stageRewardSkillLv: 1, stageRewardNum: 7 };
const sc = R.tiersOf({ stage: { loopStageCount: 4 }, tiers: [scalar] });
assert.deepStrictEqual(sc[0].roundReward, [{ type: 17, id: 0, assignType: 1, skillId: 0, skillLv: 1, num: 7 }]);
st = fresh();
assert.strictEqual(R.clear(sc, st, { tier: 1, round: 1, oneTurn: false }, 'T11').coins, 7);

// Coliseum Part 3b: the lump-sum era (2018-12 on: validStageReward 0, skip 99). Tier 1..8 = 20 / 15 / 15 / 10 x 5 rounds (round 100 ends T8)
const lump = (round, count, skip, tierCoin) => ({ ...row(round, count, skip, 0, tierCoin), ap: 0, validStageReward: 0, stageRewardType: 0, stageRewardId: 0,
  stageRewardAssignType: 0, stageRewardSkillId: 0, stageRewardSkillLv: 0, stageRewardNum: 0, validReward: 1, rewardType: [17, 0, 0, 0], rewardId: [0, 0, 0, 0], rewardNum: [tierCoin, 0, 0, 0] });
const COUNTS = [20, 15, 15, 10, 10, 10, 10, 10, 10, 10], LUMPS = [50, 85, 125, 140, 200, 200, 200, 250, 250, 700];
const L = R.tiersOf({ stage: { loopStageCount: 10 }, tiers: COUNTS.map((c, i) => lump(i + 1, c, 99, LUMPS[i])).concat([lump(11, 0, 3, 0)]) });
// skip 99 lump sums: a one-turn clear of T1 R1 opens rounds 2 .. 100; clearing round 100 (the end of T8) pays 1,250 once, no round coin
st = R.seasonState({}, 4000);
res = R.clear(L, st, { tier: 1, round: 1, oneTurn: true }, 'T20');
assert(res.ok); assert.strictEqual(res.coins, 0, 'no round coin');
assert.strictEqual(st.last, 1); assert.strictEqual(st.open, 100);
assert.deepStrictEqual(R.tierRound(L, 100), T(8, 10));
res = R.clear(L, st, { tier: 8, round: 10, oneTurn: false }, 'T21');
assert(res.ok); assert.strictEqual(res.cleared.length, 99);
assert.deepStrictEqual(res.tierRewards, [1, 2, 3, 4, 5, 6, 7, 8]);
assert.strictEqual(res.coins, 50 + 85 + 125 + 140 + 200 + 200 + 200 + 250); assert.strictEqual(res.coins, 1250);
assert.strictEqual(st.coins, 1250);
assert.strictEqual(R.clear(L, st, { tier: 8, round: 10, oneTurn: false }, 'T22').ok, false, 'paid once');
// no round coins: every round of a season with validStageReward 0 clears with 0 coins; only the tier completion pays
st = R.seasonState({}, 4001);
for (let n = 1; n <= 19; n++) { const r = R.tierRound(L, n); assert.strictEqual(R.clear(L, st, { tier: r.tier, round: r.round, oneTurn: false }, 'T23').coins, 0, `round ${n}`); }
assert.strictEqual(st.coins, 0);
const last = R.clear(L, st, { tier: 1, round: 20, oneTurn: false }, 'T24');
assert.deepStrictEqual([last.coins, last.tierRewards], [50, [1]]);
// a stageReward slot left filled while validStageReward is 0 pays nothing
const dirty = R.tiersOf({ stage: { loopStageCount: 4 }, tiers: [{ ...lump(1, 5, 1, 0), stageRewardType: 17, stageRewardNum: 9 }] });
assert.deepStrictEqual(dirty[0].roundReward, []);
console.log('colosseum-rules: ok');
