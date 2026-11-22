// Events Part 9a: the Bonus Times of the player's story day (docs/superpowers/specs/2026-11-22-campaigns-design.md). Pure
// functions, plus campaignRoutes (deps injected by server.js).
// The day table (campaign_days.json, make-campaigns.js) maps an original Pacific day to the evCampaign row ids active on it;
// server.js lists them (GET /campaign, /stage/start) for the day weekDateAt(storyCtx(), now) and applies the effects of the
// types in SERVER_APPLIES (the client applies or only shows the others: docs/notes/campaigns.md «Who applies each type»).
'use strict';
const { weekDateAt } = require('./calendar-util');

const AP = 7, LUX = 10, DROP = 1, FUSION_EXP = 11, FUSION_MUNNY = 14;
const LIST = 2;
// types whose effect the server applies; the others are listed for the client only (docs/notes/campaigns.md)
const SERVER_APPLIES = new Set([AP]);
// scopes without a stage list that take every stage (fusion types have no stage)
const EVERY_STAGE = new Set([20]);

// ids of the day; [] without a day or a table
const activeIds = (dayIso, daysTable) => (dayIso && daysTable && Array.isArray(daysTable[dayIso]) ? [...daysTable[dayIso]] : []);

const takes = (r, stageId) => (r.stageType === LIST ? (r.stageId || []).slice(0, r.validStageId || 0).includes(stageId) : EVERY_STAGE.has(r.stageType));

// effects of the listed ids on a stage: lowest AP power, highest factor of each kind (never multiplied together)
function effectsFor(ids, rowsById, stageId) {
  const out = { apPower: null, lux: 1, drop: 1, fusionExp: 1, fusionMunny: 1 };
  for (const id of ids || []) {
    const r = rowsById.get(id);
    if (!r) continue;
    const f = r.power / 10000;
    if (r.type === FUSION_EXP) out.fusionExp = Math.max(out.fusionExp, f);
    else if (r.type === FUSION_MUNNY) out.fusionMunny = Math.min(out.fusionMunny, f);
    else if (!takes(r, stageId)) continue;
    else if (r.type === AP) out.apPower = out.apPower === null ? r.power : Math.min(out.apPower, r.power);
    else if (r.type === LUX) out.lux = Math.max(out.lux, f);
    else if (r.type === DROP) out.drop = Math.max(out.drop, f);
  }
  return out;
}

// AP of a quest under an AP campaign (power / 10000 of the master useAp, rounded down: 90 x 556 = 5, 3 x 3500 = 1)
const apWith = (useAp, apPower) => (apPower === null || apPower === undefined ? useAp : Math.floor((useAp * apPower) / 10000));

// Route side, used by server.js (deps injected so it can be tested with stubs):
//   masterRows(t), readDays() -> campaign_days table, storyWeek() -> {shopFrom, shopTo}, realNow(), raidIds(ms) (routes-raid.js
//   campaignIds), raidStageAp(stageId, ms) (undefined/null = not a raid stage), useAp(stageId) (master useAp), benchIds() (bench
//   switch), log(msg), serverApplies (default SERVER_APPLIES)
function campaignRoutes(deps) {
  const applies = deps.serverApplies || SERVER_APPLIES;
  let rowsSrc = null, rowsById = new Map(), warned = false;
  const byId = () => {
    const rows = deps.masterRows('evCampaign');
    if (rows !== rowsSrc && (rows.length !== (rowsSrc || []).length || rows[0] !== (rowsSrc || [])[0])) rowsById = new Map(rows.map((r) => [r.campaignId, r]));
    rowsSrc = rows;
    return rowsById;
  };
  // ids of the story day: the original day of the Shop week on today's Pacific weekday
  function dayIds(ms = deps.realNow()) {
    try {
      return activeIds(weekDateAt(deps.storyWeek() || {}, ms), deps.readDays());
    } catch (e) {
      if (!warned) { warned = true; deps.log(`[campaigns] day table unreadable: ${e.message}`); }
      return [];
    }
  }
  const ids = (ms = deps.realNow()) => [...new Set([...(deps.raidIds(ms) || []), ...dayIds(ms), ...((deps.benchIds && deps.benchIds()) || [])])];
  // effects of the day on a stage, only for the types the server applies (the client applies or only shows the others)
  function effects(stageId, ms = deps.realNow()) {
    const ids0 = dayIds(ms), rows = byId();
    const own = ids0.filter((id) => rows.has(id) && applies.has(rows.get(id).type));
    return effectsFor(own, rows, stageId);
  }
  function stageAp(stageId, ms = deps.realNow()) {
    const raid = deps.raidStageAp(stageId, ms);
    if (raid !== undefined && raid !== null) return raid;
    return apWith(Number(deps.useAp(stageId)) || 0, effects(stageId, ms).apPower);
  }
  return { ids, dayIds, effects, stageAp };
}

module.exports = { campaignRoutes, activeIds, effectsFor, apWith, SERVER_APPLIES, EVERY_STAGE, AP, LUX, DROP, FUSION_EXP, FUSION_MUNNY };
