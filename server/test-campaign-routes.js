// Events Part 9a Task 5: the route side of campaigns.js (campaignRoutes) against stubs: ids listed by GET /campaign and
// /stage/start, AP charged, effects applied by the server. Dates: 2017-01-02 is a Monday; 2026-11-23 18:00 UTC is a Monday too
// (10:00 PST), so weekDateAt of the Shop week 2017-01-02..08 picks 2017-01-02.
//   node server/test-campaign-routes.js
'use strict';
const assert = require('assert');
const { campaignRoutes } = require('./campaigns');

const MON = Date.parse('2026-11-23T18:00:00Z');
const RAID_STAGE = 980001, EVENT = 4000010, OTHER = 4000020;
const row = (campaignId, type, power, stageType, ids = []) => ({ campaignId, type, power, stageType, validStageId: ids.length, stageId: [...ids, 0, 0, 0, 0, 0].slice(0, 5) });

function world(o = {}) {
  const w = {
    week: o.week === undefined ? { shopFrom: '2017-01-02', shopTo: '2017-01-08' } : o.week,
    evCampaign: [row(98000, 7, 0, 2, [RAID_STAGE]), row(96000, 7, 0, 2, [EVENT, RAID_STAGE]), row(96001, 10, 20000, 2, [EVENT]), row(96002, 1, 20000, 2, [EVENT]),
      row(96003, 11, 20000, 1), row(96004, 14, 5000, 1)],
    days: o.days || { '2017-01-02': [96000, 96001, 96002, 96003, 96004] },
    raidIds: o.raidIds || [98000],
    logs: [],
  };
  w.routes = campaignRoutes({
    masterRows: (t) => (t === 'evCampaign' ? w.evCampaign : []),
    readDays: () => { if (w.days instanceof Error) throw w.days; return w.days; },
    storyWeek: () => w.week,
    realNow: () => MON,
    raidIds: () => w.raidIds,
    raidStageAp: (id) => (id === RAID_STAGE ? 90 : undefined),
    useAp: (id) => ({ [EVENT]: 10, [OTHER]: 10 })[id] || 0,
    benchIds: () => o.bench || [],
    log: (m) => w.logs.push(m),
    serverApplies: o.serverApplies,
  });
  return w;
}

// GET /campaign and /stage/start list the raid ids and the day ids, once each
assert.deepStrictEqual(world().routes.ids(MON), [98000, 96000, 96001, 96002, 96003, 96004]);
assert.deepStrictEqual(world({ raidIds: [96000] }).routes.ids(MON), [96000, 96001, 96002, 96003, 96004], 'no repeats');
assert.deepStrictEqual(world({ bench: [95990] }).routes.ids(MON), [98000, 96000, 96001, 96002, 96003, 96004, 95990], 'bench ids last');
// no Shop week (new player): only the raid ids (Review Focus 3)
assert.deepStrictEqual(world({ week: null }).routes.ids(MON), [98000]);
// an unreadable day table: only the raid ids, logged once
const broken = world({ days: new Error('bad json') });
assert.deepStrictEqual(broken.routes.ids(MON), [98000]);
broken.routes.ids(MON);
assert.strictEqual(broken.logs.length, 1, 'logged once');

// AP charged at /stage/start
const w = world();
assert.strictEqual(w.routes.stageAp(EVENT, MON), 0, 'AP 0 Bonus Time on the event stage');
assert.strictEqual(w.routes.stageAp(OTHER, MON), 10, 'another stage: master useAp');
assert.strictEqual(w.routes.stageAp(RAID_STAGE, MON), 90, 'a raid stage keeps the raid rule (Review Focus 4)');
assert.strictEqual(world({ days: {} }).routes.stageAp(EVENT, MON), 10, 'no Bonus Time that day');
assert.strictEqual(world({ days: {}, bench: [96000] }).routes.stageAp(EVENT, MON), 0, 'bench ids are applied too');

// effects: the types the server applies (Lux at /stage/clear, drops, fusion; AP above)
assert.deepStrictEqual(w.routes.effects(EVENT, MON), { apPower: 0, lux: 2, drop: 2, fusionExp: 2, fusionMunny: 0.5, spAtk: null }, 'server-side types apply once');
assert.strictEqual(w.routes.effects(OTHER, MON).lux, 1, 'no Lux campaign on that stage');
assert.deepStrictEqual(world({ serverApplies: new Set([7]) }).routes.effects(EVENT, MON), { apPower: 0, lux: 1, drop: 1, fusionExp: 1, fusionMunny: 1, spAtk: null }, 'types outside serverApplies stay neutral');
console.log('test-campaign-routes: OK');
