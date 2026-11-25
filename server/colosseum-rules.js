'use strict';
// PvE Coliseum season state machine. Pure: no I/O, no require of server.js.
//
// A season is {stage: <colosseumStage row>, tiers: <colosseum rows of that season>}. Rounds form one global
// sequence n = 1, 2, 3 ... across the tiers (tier t starts after the finite rounds of tiers before it; the last
// tier is endless, rounds 0). Per season a player has {last, open, coins, cleared, tierRewards, bestAt} (its board
// progress lives in player.colosseumSphere, routes-colosseum-boards.js):
// the playable window is last+1 .. open. Clearing round r inside the window:
//   one turn   -> open = r + N (N = excellentUnlockCount of the tier of r, counted across tier boundaries)
//   more turns -> open = r + 1
// and pays r plus every round in last+1 .. r-1 (per-round coins), plus the reward of every tier fully completed
// by it; then last = r. A round outside the window changes nothing (ok:false).
//
// Persisted state is plain JSON: `cleared` is a sorted array of the global rounds played in person (not a Set),
// the save keeps seasons in save.colosseum.seasons[colosseumStageId] (save.colosseum also holds `kept`).
// Extra result field (beyond the brief): clear() returns `tierItems` [{tier, items:[{type,id,assignType,skillId,
// skillLv,num}]}], the full reward slots of the completed tiers, so the routes can grant non-coin items.
// `coins` counts type-17 slots only (round coins and tier coins).
const COIN = 17;
// reward slots of a row: the tier reward fields are int[4]; the per-round stageReward* fields are plain ints in the 4.3.1 schema
// (recon/out/master_types_ww431.json), read as one slot
const slots = (row, p, validKey) => {
  const n = row[validKey] || 0, out = [];
  const at = (f, i) => { const v = row[p + f]; return Array.isArray(v) ? v[i] : i === 0 ? v : undefined; };
  for (let i = 0; i < n; i++) {
    const num = at('Num', i);
    if (!num) continue;
    out.push({ type: at('Type', i), id: at('Id', i) || 0, assignType: at('AssignType', i) || 0,
      skillId: at('SkillId', i) || 0, skillLv: at('SkillLv', i) || 0, num });
  }
  return out;
};
const coinsOf = (list) => list.filter((s) => s.type === COIN).reduce((a, s) => a + s.num, 0);

function tiersOf(season) {
  const loop = (season.stage && season.stage.loopStageCount) || 1;
  return [...season.tiers].sort((a, b) => a.round - b.round).map((r) => ({
    tier: r.round, rounds: r.arrivalStageCount, skip: r.excellentUnlockCount, ap: r.ap, loop, colosseumId: r.colosseumId,
    roundReward: slots(r, 'stageReward', 'validStageReward'), tierReward: slots(r, 'reward', 'validReward'),
  }));
}

function seasonState(save, colosseumStageId) {
  const all = ((save.colosseum ||= {}).seasons ||= {});
  const st = all[colosseumStageId] || (all[colosseumStageId] = {});
  if (st.last === undefined) st.last = 0;
  if (st.open === undefined) st.open = 1;
  if (st.coins === undefined) st.coins = 0;
  if (!st.cleared) st.cleared = [];
  if (!st.tierRewards) st.tierRewards = [];
  if (st.bestAt === undefined) st.bestAt = null;
  return st;
}

// first global round of each tier (index = position in tiers)
function starts(tiers) {
  const out = []; let n = 1;
  for (const t of tiers) { out.push(n); n += t.rounds; }
  return out;
}
function tierIndex(tiers, tier) {
  const i = tiers.findIndex((t) => t.tier === tier);
  if (i < 0) throw new Error(`colosseum: no tier ${tier}`);
  return i;
}
const globalRound = (tiers, tier, round) => starts(tiers)[tierIndex(tiers, tier)] + round - 1;

function tierRound(tiers, n) {
  const s = starts(tiers);
  let i = tiers.length - 1;
  // finite tier i holds s[i] .. s[i]+rounds-1; the endless tier takes everything past the finite ones
  for (let k = 0; k < tiers.length; k++) {
    if (tiers[k].rounds === 0 || n < s[k] + tiers[k].rounds) { i = k; break; }
  }
  return { tier: tiers[i].tier, round: n - s[i] + 1 };
}

function playable(tiers, st) {
  const out = [];
  for (let n = st.last + 1; n <= st.open; n++) {
    const tr = tierRound(tiers, n), t = tiers[tierIndex(tiers, tr.tier)];
    out.push({ tier: tr.tier, round: tr.round, stageIndex: (tr.round - 1) % (t.loop || 1) });
  }
  return out;
}

function clear(tiers, st, { tier, round, oneTurn }, nowIso) {
  const none = { ok: false, cleared: [], coins: 0, tierRewards: [], tierItems: [], st };
  let ti;
  try { ti = tierIndex(tiers, tier); } catch (e) { return none; }
  if (!Number.isInteger(round) || !Number.isInteger(tier) || round < 1 || (tiers[ti].rounds && round > tiers[ti].rounds)) return none;
  const r = globalRound(tiers, tier, round);
  if (r <= st.last || r > st.open) return none;
  const cleared = [], tierItems = [];
  let coins = 0;
  for (let n = st.last + 1; n <= r; n++) {
    const tr = tierRound(tiers, n);
    cleared.push(tr);
    coins += coinsOf(tiers[tierIndex(tiers, tr.tier)].roundReward);
  }
  const s = starts(tiers), tierRewards = [];
  tiers.forEach((t, i) => {
    if (!t.rounds || st.tierRewards.includes(t.tier) || s[i] + t.rounds - 1 > r) return;
    tierRewards.push(t.tier);
    tierItems.push({ tier: t.tier, items: t.tierReward });
    coins += coinsOf(t.tierReward);
  });
  st.open = oneTurn ? r + Math.max(1, tiers[ti].skip) : r + 1;
  st.last = r;
  st.bestAt = nowIso;
  st.coins += coins;
  if (!st.cleared.includes(r)) st.cleared.push(r);
  st.tierRewards.push(...tierRewards);
  return { ok: true, cleared, coins, tierRewards, tierItems, st };
}

module.exports = { tiersOf, seasonState, globalRound, tierRound, playable, clear };
