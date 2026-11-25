// Events Part 9a Task 3: make-campaigns.js turns the private campaign calendar into evCampaign rows 96000-97999 and the
// server-only day table (docs/superpowers/plans/2026-11-22-events-part9a-bonus-times.md).
//   node server/test-make-campaigns.js
'use strict';
const assert = require('assert');
const mc = require('./make-campaigns');
const c = require('./campaigns');

const kind = (o) => ({ type: 7, power: 0, displayText: '0 AP!', stageType: 2, stageIds: [], days: ['2017-01-02'], source: 'donor', notices: [], ...o, key: JSON.stringify(o) });
const D = '2017-01-02', E = '2017-01-03';
const ctx = {
  storyStageIds: new Set([1010, 1020]),
  eventStageOf: new Map([[63010, 4000010]]),
  eventStagesOn: (iso) => (iso === D ? [4000010, 4000020, 4000030, 4000040, 4000050, 4000060, 4000070] : iso === E ? [4000010] : []),
};
const cal = {
  kinds: [
    kind({ type: 6, power: 20000, displayText: 'Raid Boss Encounter x 2', stageIds: [1010] }),
    kind({ type: 9, power: 20000, displayText: 'Next Raid Level +2', stageType: 3, stageIds: [1] }),
    kind({ type: 10, power: 20000, displayText: 'Big Lux boost!', stageType: 3, stageIds: [2] }),
    kind({ type: 10, power: 20000, displayText: 'Lux x 2', stageType: 8 }),
    kind({ type: 1, power: 20000, displayText: 'Rare items drop rate up!', stageIds: [1010, 60110] }),
    kind({ stageIds: [63010], days: [E] }),
    kind({ stageType: 4, days: [D, E] }),
    kind({ power: 3500, displayText: '1 AP', stageType: 6, days: [E] }),
    kind({ type: 18, power: 150000, displayText: 'Rare enemy encounter rate up!', stageType: 20, days: [D] }),
    kind({ power: 5000, displayText: 'Half AP', stageType: 2, stageIds: [63010, 1020], days: [D] }),
    kind({ displayText: '0 AP! story', stageType: 5, days: [D] }),
    kind({ displayText: '0 AP! proud', stageType: 19, days: [D] }),
    kind({ power: 3500, displayText: '1 AP colo', stageType: 7, days: [D] }),
    kind({ type: 10, power: 20000, displayText: 'Lux x 2 story', stageType: 5, days: [D] }),
    kind({ type: 11, power: 20000, displayText: 'Medal Fusion: EXP x 2', stageType: 1, days: [D] }),
  ],
};

const out = mc.buildCampaigns(cal, ctx);
assert.strictEqual(out.dropped.raid, 4, 'raid kinds dropped');
assert.strictEqual(out.dropped.unknownStage, 1, 'unknown original stage counted');
const byList = (ids) => out.rows.filter((r) => r.type === 7 && r.power === 0 && JSON.stringify(r.stageId.slice(0, r.validStageId)) === JSON.stringify(ids));
assert.strictEqual(out.rows.filter((r) => r.type === 1 && r.validStageId === 1 && r.stageId[0] === 1010).length, 1, 'story id kept on a drop kind, unknown event id dropped');
assert.ok(!out.rows.some((r) => r.type === 7 && r.stageId.slice(0, r.validStageId).some((x) => x >= 1010 && x <= 39159)), 'AP kinds never list story stages (they cost 0 AP)');
assert.strictEqual(out.dropped.storyFree, 3, 'story id of the Half AP list, stageType 5 and 19 AP kinds');
assert.strictEqual(out.dropped.colosseum, undefined, 'Coliseum scope served (Coliseum Part 1)');
const colo = out.rows.filter((r) => r.stageType === 7);
assert.ok(colo.length === 1 && colo[0].type === 7 && colo[0].power === mc.COLOSSEUM_ONE_AP && colo[0].displayText === '1 AP colo' && colo[0].validStageId === 0
  && out.days[D].includes(colo[0].campaignId), 'the 1 AP Coliseum kind kept as scope 7 on its day, power 3500 -> 2000 (ruling 11)');
for (const ap of [3, 4, 5]) assert.strictEqual(c.apWith(ap, colo[0].power), 1, `Coliseum 1 AP campaign: ${ap} AP round costs 1`);
assert.strictEqual(c.apWith(4, 3500), 2, 'the original power would cost 2 (why the generator changes it)');
// «0 AP!» Coliseum kind unchanged
const zero = mc.buildCampaigns({ kinds: [kind({ power: 0, displayText: '0 AP!', stageType: 7, days: [D] })] }, ctx).rows;
assert.ok(zero.length === 1 && zero[0].power === 0 && zero[0].stageType === 7, 'the 0 AP! Coliseum kind keeps power 0');
// only the original «1 AP» rows (power 3500) are served at 2000 (ruling 11, final review M3): any other scope-7 AP rate is untouched
for (const power of [5000, 2500, 3000]) {
  const other = mc.buildCampaigns({ kinds: [kind({ power, displayText: 'other colo', stageType: 7, days: [D] })] }, ctx).rows;
  assert.ok(other.length === 1 && other[0].power === power && other[0].stageType === 7, `a scope-7 AP row of power ${power} is not rewritten`);
}
const dropRate = mc.buildCampaigns({ kinds: [kind({ type: 1, power: 3500, displayText: 'drop colo', stageType: 7, days: [D] })] }, ctx).rows;
assert.ok(dropRate.length === 1 && dropRate[0].power === 3500, 'a scope-7 row of another type keeps power 3500');
assert.strictEqual(out.dropped.multi, 1, 'co-op scope (Union Cross) not served');
const luxStory = out.rows.filter((r) => r.type === 10 && r.stageType === 5);
assert.strictEqual(luxStory.length, 1, 'Lux on every story quest kept as stageType 5');
// the day lists AP rows first, lowest power first (the client takes the first AP row that matches)
const dayD = out.days[D].map((id) => out.rows[id - mc.CAMPAIGN_BASE]);
const apPowers = dayD.filter((r) => r.type === 7).map((r) => r.power);
assert.deepStrictEqual(apPowers, [...apPowers].sort((a, b) => a - b), 'AP rows by power');
assert.strictEqual(dayD.findIndex((r) => r.type !== 7), apPowers.length, 'AP rows first');
assert.strictEqual(byList([4000010]).length, 1, 'event id mapped; the stageType 4 kind on day E gives the same row content: one shared row');
assert.ok(out.days[E].includes(byList([4000010])[0].campaignId), 'shared row listed on E');
// stageType 4 on D: 7 event stages -> 5 + 2, explicit lists (stageType 2)
const four = out.rows.filter((r) => r.validStageId && r.stageId[0] === 4000010 && r.validStageId === 5 || (r.stageId[0] === 4000060 && r.validStageId === 2));
assert.strictEqual(four.length, 2, 'stageType 4 split 5 + 2');
assert.ok(four.every((r) => r.stageType === 2), 'stageType 4 never served');
assert.ok(four.every((r) => out.days[D].includes(r.campaignId)), 'both rows listed on D');
assert.ok(!out.rows.some((r) => r.stageType === 4), 'no stageType 4 row');
const oneAp = out.rows.filter((r) => r.power === 3500 && r.stageType !== 7);
assert.ok(oneAp.length === 1 && oneAp[0].stageType === 2 && oneAp[0].stageId[0] === 4000010, 'every-event-quest scope (6) narrowed to the event stages of the day');
// ids, formats, determinism
out.rows.forEach((r, i) => assert.strictEqual(r.campaignId, mc.CAMPAIGN_BASE + i, 'ids in order'));
const r0 = out.rows[0];
assert.deepStrictEqual(Object.keys(r0), ['campaignId', 'type', 'power', 'displayText', 'stageType', 'validStageId', 'stageId', 'startTime', 'endTime',
  'weekMonday', 'weekTuesday', 'weekWednesday', 'weekThursday', 'weekFriday', 'weekSaturday', 'weekSunday', 'groupPattern', 'validMinute']);
assert.strictEqual(r0.startTime, '2015-01-01 00:00:00');
assert.strictEqual(r0.endTime, '2030-12-31 23:59:59');
assert.strictEqual(r0.stageId.length, 5);
assert.ok(out.rows.every((r) => r.stageId.slice(r.validStageId).every((x) => x === 0)), 'unused slots 0');
assert.deepStrictEqual(mc.buildCampaigns(cal, ctx), out, 'deterministic');
// every day in the table lists only existing rows, and a day without rows is absent
const ids = new Set(out.rows.map((r) => r.campaignId));
assert.ok(Object.values(out.days).every((l) => l.length && l.every((x) => ids.has(x))));
// overflow
const many = { kinds: Array.from({ length: 2001 }, (_, i) => kind({ type: 1, stageIds: [1010], displayText: `x${i}` })) };
assert.throws(() => mc.buildCampaigns(many, ctx), /overflow/);
console.log(`test-make-campaigns: OK (${out.rows.length} rows)`);
