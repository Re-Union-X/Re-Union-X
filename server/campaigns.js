// Events Part 9a: the Bonus Times of the player's story day (docs/superpowers/specs/2026-11-22-campaigns-design.md). Pure
// functions, plus campaignRoutes (deps injected by server.js).
// The day table (campaign_days.json, make-campaigns.js) maps an original Pacific day to the evCampaign row ids active on it;
// server.js lists them (GET /campaign, /stage/start) for the day weekDateAt(storyCtx(), now) and applies the effects of the
// types in SERVER_APPLIES (the client applies or only shows the others: docs/notes/campaigns.md «Who applies each type»).
'use strict';
const { weekDateAt } = require('./calendar-util');

const AP = 7, LUX = 10, DROP = 1, FUSION_EXP = 11, FUSION_MUNNY = 14, SP_ATK = 17;
const LIST = 2;
// types whose effect the server applies; the others are listed for the client only (docs/notes/campaigns.md). The client
// also shows AP (7) and the fusion EXP / munny / Sp. Atk range (11, 14, 17): the server applies the same numbers. Lux (10)
// and drops (1) only show a balloon: the server multiplies the Lux of /stage/clear (bench 22-11: luxMagnifications.campaign
// of /stage/start leaves the reported Lux unchanged) and the drop odds.
const SERVER_APPLIES = new Set([DROP, AP, LUX, FUSION_EXP, FUSION_MUNNY, SP_ATK]);

// ids of the day; [] without a day or a table
const activeIds = (dayIso, daysTable) => (dayIso && daysTable && Array.isArray(daysTable[dayIso]) ? [...daysTable[dayIso]] : []);

// served scopes (make-campaigns.js narrows the others): 2 explicit list, 5 every story quest (Lux only), 7 every Coliseum stage
const STORY_FIRST = 1010, STORY_LAST = 39159, EVERY_STORY = 5;
// 7 every Coliseum stage: AP only, applied by routes-colosseum.js through colosseumAp (Coliseum Part 1)
const EVERY_COLOSSEUM = 7;
const takes = (r, stageId) => (r.stageType === LIST ? (r.stageId || []).slice(0, r.validStageId || 0).includes(stageId)
  : r.stageType === EVERY_STORY && stageId >= STORY_FIRST && stageId <= STORY_LAST);

// effects of the listed ids on a stage, as the client reads them: the FIRST listed AP row that takes the stage (the day table
// lists the lowest power first), the LAST row of each fusion type (the fusion screen); Lux and drops: the highest factor.
function effectsFor(ids, rowsById, stageId) {
  const out = { apPower: null, lux: 1, drop: 1, fusionExp: 1, fusionMunny: 1, spAtk: null };
  for (const id of ids || []) {
    const r = rowsById.get(id);
    if (!r) continue;
    const f = r.power / 10000;
    if (r.type === FUSION_EXP) out.fusionExp = f;
    else if (r.type === FUSION_MUNNY) out.fusionMunny = f;
    else if (r.type === SP_ATK) out.spAtk = r.power;
    else if (!takes(r, stageId)) continue;
    else if (r.type === AP) { if (out.apPower === null) out.apPower = r.power; }
    else if (r.type === LUX) out.lux = Math.max(out.lux, f);
    else if (r.type === DROP) out.drop = Math.max(out.drop, f);
  }
  return out;
}

// AP of a quest under an AP campaign, as the client shows it: power 0 = 0, else useAp x power / 10000 rounded UP and never
// below 1 (90 x 556 = 6, 3 x 3500 = 2); a free quest stays free
function apWith(useAp, apPower) {
  if (apPower === null || apPower === undefined) return useAp;
  if (!apPower || !useAp) return 0;
  return Math.max(1, Math.ceil((useAp * apPower) / 10000));
}

// Route side, used by server.js (deps injected so it can be tested with stubs):
//   masterRows(t), readDays() -> campaign_days table, storyWeek() -> {shopFrom, shopTo}, realNow(), raidIds(ms) (routes-raid.js
//   campaignIds), raidStageAp(stageId, ms) (undefined/null = not a raid stage), useAp(stageId) (master useAp), benchIds() (bench
//   switch), log(msg), serverApplies (default SERVER_APPLIES)
function campaignRoutes(deps) {
  const applies = deps.serverApplies || SERVER_APPLIES;
  let rowsSrc = null, rowsById = new Map(), warned = false;
  // day ids memo per real minute: rollDropTypes asks for every roll of a quest, and storyWeek() (storyCtx) is not cheap
  let memo = { minute: null, ids: [] };
  const byId = () => {
    const rows = deps.masterRows('evCampaign');
    if (rows !== rowsSrc && (rows.length !== (rowsSrc || []).length || rows[0] !== (rowsSrc || [])[0])) rowsById = new Map(rows.map((r) => [r.campaignId, r]));
    rowsSrc = rows;
    return rowsById;
  };
  // ids of the story day: the original day of the Shop week on today's Pacific weekday
  function dayIds(ms = deps.realNow()) {
    const minute = Math.floor(ms / 60000);
    if (memo.minute === minute) return memo.ids;
    memo = { minute, ids: dayIdsAt(ms) };
    return memo.ids;
  }
  function dayIdsAt(ms) {
    try {
      return [...activeIds(weekDateAt(deps.storyWeek() || {}, ms), deps.readDays()), ...((deps.benchIds && deps.benchIds()) || [])];
    } catch (e) {
      if (!warned) { warned = true; deps.log(`[campaigns] day table unreadable: ${e.message}`); }
      return [];
    }
  }
  // the bench ids (KHUX_CAMPAIGN_FORCE) count as ids of the day: listed and applied
  const ids = (ms = deps.realNow()) => [...new Set([...(deps.raidIds(ms) || []), ...dayIds(ms)])];
  // effects of the day on a stage, only for the types the server applies (the client applies or only shows the others)
  function effects(stageId, ms = deps.realNow()) {
    const ids0 = dayIds(ms), rows = byId();
    const own = ids0.filter((id) => rows.has(id) && applies.has(rows.get(id).type));
    return effectsFor(own, rows, stageId);
  }
  // AP of a Coliseum round (scope 7, every Coliseum stage) under the day's AP campaign: the first listed AP row of scope 7
  // (the day table lists the lowest power first), as for the stages of the other screens
  function colosseumAp(useAp, ms = deps.realNow()) {
    const rows = byId();
    const r = dayIds(ms).map((id) => rows.get(id)).find((x) => x && x.type === AP && x.stageType === EVERY_COLOSSEUM);
    return apWith(Number(useAp) || 0, r ? r.power : null);
  }
  function stageAp(stageId, ms = deps.realNow()) {
    const raid = deps.raidStageAp(stageId, ms);
    if (raid !== undefined && raid !== null) return raid;
    return apWith(Number(deps.useAp(stageId)) || 0, effects(stageId, ms).apPower);
  }
  return { ids, dayIds, effects, stageAp, colosseumAp };
}

module.exports = { campaignRoutes, activeIds, effectsFor, apWith, SERVER_APPLIES, AP, LUX, DROP, FUSION_EXP, FUSION_MUNNY, SP_ATK };
