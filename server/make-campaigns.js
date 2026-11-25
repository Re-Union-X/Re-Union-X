#!/usr/bin/env node
// Events Part 9a (docs/superpowers/specs/2026-11-22-campaigns-design.md): the original Bonus Times. Reads the private campaign
// calendar (kinds of evCampaign rows with their original Pacific days, KHUX_CAMPAIGN_CALENDAR) and writes
//   - evCampaign rows CAMPAIGN_BASE..CAMPAIGN_MAX (one per distinct row content), in the client's 18-field format;
//   - campaign_days.json {"YYYY-MM-DD": [campaignId]}: server only (no MASTER_SCHEMA entry, never sent to the client), read
//     by campaigns.js for the story day (calendar-util.js weekDateAt).
// Rules:
// - raid kinds are dropped: type 6 (raid boss encounter), 9 (next raid level), stageType 3 (raid enemy ids) and 8 (every raid
//   boss). routes-raid.js owns the raid Bonus Time (98000-98999 rows, make-ev-campaign.js).
// - stageType 2 lists: story ids (our stage table) stay, original event stage ids go to ours through game_data/events.json
//   (quests donorStageId -> stageId); an unknown id is dropped and counted.
// - stageType 4 (every stage of the screen) and 6 (every event quest) are never served as such (they would take the Special
//   quests too): on each day they become explicit lists of the stages of the events running that day (stageType 2, 5 per row).
// - AP never on story or Proud quests (they cost 0 AP here: stageType 5/19 AP kinds and story ids of AP lists dropped);
//   co-op (20) scope is not served; Coliseum (7, the 1 AP / 0 AP Coliseum campaigns of 2016, Coliseum Part 1), fusion (1)
//   and Lux on every story quest (5) are kept.
// - each day lists its AP rows first, lowest power first (the client takes the first AP row that matches).
// Wired at the end of make-game-tables.js after make-events and make-ev-campaign. On its own (then raise the revision):
//   node server/make-campaigns.js [master folder]
'use strict';
const fs = require('fs');
const path = require('path');

const CAMPAIGN_BASE = 96000, CAMPAIGN_MAX = 97999;
const PER_ROW = 5;
const START = '2015-01-01 00:00:00', END = '2030-12-31 23:59:59';
const LIST = 2;
const RAID_TYPES = new Set([6, 9]), RAID_SCOPES = new Set([3, 8]);
// client scopes (docs/notes/campaigns.md): 4 every stage of the screen, 6 every event quest -> narrowed to the day's event stages;
// 5 every story quest (stageKind 1), 19 every Proud quest: kept for Lux, dropped for AP (story and Proud cost 0 AP here);
// 7 every Coliseum stage: served as such (routes-colosseum.js applies its AP); 20 every co-op (Union Cross) quest: not served
const EVENT_SCOPES = new Set([4, 6]);
const STORY_SCOPES = new Set([5, 19]);
const AP = 7;
const STORY_FIRST = 1010, STORY_LAST = 39159;
const CALENDAR = process.env.KHUX_CAMPAIGN_CALENDAR
  || 'D:/Progetto_Restauro_KH_UX/private/donations/relux_2026-11/verified/campaign_calendar_2021.json';

const isOwn = (r) => r.campaignId >= CAMPAIGN_BASE && r.campaignId <= CAMPAIGN_MAX;

// the row of make-ev-campaign.js row(): field order of the client's evCampaign
function row(campaignId, k, stageType, ids) {
  return {
    campaignId, type: k.type, power: k.power, displayText: k.displayText, stageType, validStageId: ids.length,
    stageId: [...ids, 0, 0, 0, 0, 0].slice(0, PER_ROW), startTime: START, endTime: END,
    weekMonday: 1, weekTuesday: 1, weekWednesday: 1, weekThursday: 1, weekFriday: 1, weekSaturday: 1, weekSunday: 1,
    groupPattern: 0, validMinute: 0,
  };
}

const chunks = (ids) => { const out = []; for (let i = 0; i < ids.length; i += PER_ROW) out.push(ids.slice(i, i + PER_ROW)); return out; };

// calendar {kinds}, ctx {storyStageIds: Set, eventStageOf: Map(orig -> ours), eventStagesOn: (iso) => number[]}
// -> { rows, days: {iso: [id]}, dropped: {reason: n} }
function buildCampaigns(calendar, ctx) {
  const dropped = {};
  const drop = (why) => { dropped[why] = (dropped[why] || 0) + 1; };
  const content = new Map(); // row content key -> { k, stageType, ids, days: Set }
  const add = (k, stageType, ids, days) => {
    const key = JSON.stringify([k.type, k.power, k.displayText, stageType, ids]);
    const x = content.get(key) || content.set(key, { k, stageType, ids, days: new Set() }).get(key);
    days.forEach((d) => x.days.add(d));
  };
  for (const k of [...(calendar.kinds || [])].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))) {
    if (RAID_TYPES.has(k.type) || RAID_SCOPES.has(k.stageType)) { drop('raid'); continue; }
    if (k.stageType === 20) { drop('multi'); continue; }
    if (STORY_SCOPES.has(k.stageType) && k.type === AP) { drop('storyFree'); continue; }
    if (k.stageType === LIST) {
      const ids = [];
      for (const id of k.stageIds || []) {
        const story = id >= STORY_FIRST && id <= STORY_LAST;
        if (story && k.type === AP) { drop('storyFree'); continue; } // the client could show 1 AP on a free quest
        const ours = story && ctx.storyStageIds.has(id) ? id : ctx.eventStageOf.get(id);
        if (ours) ids.push(ours); else drop('unknownStage');
      }
      const uniq = [...new Set(ids)].sort((a, b) => a - b);
      if (!uniq.length) { drop('noStage'); continue; }
      for (const c of chunks(uniq)) add(k, LIST, c, k.days);
    } else if (EVENT_SCOPES.has(k.stageType)) {
      let any = false;
      for (const d of k.days) {
        const ids = [...new Set(ctx.eventStagesOn(d) || [])].sort((a, b) => a - b);
        for (const c of chunks(ids)) { add(k, LIST, c, [d]); any = true; }
      }
      if (!any) drop('noEventThatDay');
    } else {
      add(k, k.stageType, [], k.days);
    }
  }
  const entries = [...content.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  if (CAMPAIGN_BASE + entries.length - 1 > CAMPAIGN_MAX) throw new Error(`make-campaigns: ${entries.length} rows overflow ${CAMPAIGN_BASE}-${CAMPAIGN_MAX}`);
  const rows = [], days = {};
  entries.forEach(([, x], i) => {
    const id = CAMPAIGN_BASE + i;
    rows.push(row(id, x.k, x.stageType, x.ids));
    for (const d of x.days) (days[d] = days[d] || []).push(id);
  });
  // AP rows first, lowest power first: the client takes the first listed AP row that matches a stage
  const rank = (id) => { const r = rows[id - CAMPAIGN_BASE]; return r.type === AP ? r.power : Infinity; };
  const order = (a, b) => rank(a) - rank(b) || a - b;
  const sortedDays = Object.fromEntries(Object.keys(days).sort().map((d) => [d, days[d].sort(order)]));
  return { rows, days: sortedDays, dropped };
}

// ctx from the served tables: our story stages, game_data/events.json (quests and rows of every entry)
function contextOf(stages, events) {
  const storyStageIds = new Set((stages || []).map((s) => s.stageId).filter((id) => id >= STORY_FIRST && id <= STORY_LAST));
  const eventStageOf = new Map();
  const runs = [];
  for (const e of (events && events.entries) || []) {
    for (const q of e.quests || []) if (q.served && q.donorStageId && q.stageId && !eventStageOf.has(q.donorStageId)) eventStageOf.set(q.donorStageId, q.stageId);
    for (const r of e.rows || []) if (r.available && (r.stageIds || []).length) runs.push(r);
  }
  const eventStagesOn = (iso) => runs.filter((r) => r.start <= iso && iso <= r.end && (!r.days || r.days.includes(iso))).flatMap((r) => r.stageIds);
  return { storyStageIds, eventStageOf, eventStagesOn };
}

function patch(masterDir, calendarFile = CALENDAR) {
  const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
  const calendar = read(calendarFile, null);
  const kept = read(path.join(masterDir, 'evCampaign.json'), []).filter((r) => !isOwn(r));
  if (!calendar) {
    console.log(`campaigns: calendar ${calendarFile} absent, no Bonus Time rows (${kept.length} other evCampaign rows kept)`);
    fs.writeFileSync(path.join(masterDir, 'evCampaign.json'), JSON.stringify(kept));
    fs.writeFileSync(path.join(masterDir, 'campaign_days.json'), '{}');
    return 0;
  }
  const events = read(path.join(__dirname, 'game_data', 'events.json'), { entries: [] }) // written by make-events.js;
  const out = buildCampaigns(calendar, contextOf(read(path.join(masterDir, 'stage.json'), []), events));
  fs.writeFileSync(path.join(masterDir, 'evCampaign.json'), JSON.stringify([...kept, ...out.rows]));
  fs.writeFileSync(path.join(masterDir, 'campaign_days.json'), JSON.stringify(out.days));
  console.log(`campaigns: ${out.rows.length} Bonus Time rows (${CAMPAIGN_BASE}+) on ${Object.keys(out.days).length} days, dropped ${JSON.stringify(out.dropped)}, ${kept.length} other rows kept`);
  return out.rows.length;
}

if (require.main === module) patch(process.argv[2] || path.join(__dirname, 'master_data'));

module.exports = { buildCampaigns, contextOf, patch, CAMPAIGN_BASE, CAMPAIGN_MAX };
