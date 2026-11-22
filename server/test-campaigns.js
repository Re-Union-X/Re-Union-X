// Events Part 9a Task 4: campaigns.js, the Bonus Times of the story day and their effects (pure).
//   node server/test-campaigns.js
'use strict';
const assert = require('assert');
const c = require('./campaigns');

const row = (campaignId, type, power, stageType, ids = []) => ({ campaignId, type, power, stageType, validStageId: ids.length, stageId: [...ids, 0, 0, 0, 0, 0].slice(0, 5) });
const rows = [
  row(96000, 7, 5000, 2, [4000010, 4000020]),
  row(96001, 7, 0, 2, [4000010]),
  row(96002, 10, 20000, 2, [4000010]),
  row(96003, 1, 20000, 2, [4000020]),
  row(96004, 11, 20000, 1),
  row(96005, 14, 5000, 1),
  row(96006, 10, 30000, 2, [4000010]),
];
const byId = new Map(rows.map((r) => [r.campaignId, r]));
const days = { '2017-01-02': [96000, 96001, 96002, 96003, 96004, 96005, 96006], '2017-01-03': [96002] };

// active ids of a day (Review Focus 2 and 3)
assert.deepStrictEqual(c.activeIds(null, days), [], 'no story day: none');
assert.deepStrictEqual(c.activeIds('2016-05-01', days), [], 'day without rows: none');
assert.deepStrictEqual(c.activeIds('2017-01-02', days), [96000, 96001, 96002, 96003, 96004, 96005, 96006]);
assert.deepStrictEqual(c.activeIds('2017-01-03', days), [96002], 'the next day has its own set');
assert.deepStrictEqual(c.activeIds('2017-01-02', null), [], 'no table: none');

// effects on a stage
const all = days['2017-01-02'];
const e10 = c.effectsFor(all, byId, 4000010);
assert.strictEqual(e10.apPower, 0, 'two AP kinds on one stage: the lowest, once (Review Focus 1)');
assert.strictEqual(e10.lux, 3, 'two Lux kinds: the highest, not multiplied');
assert.strictEqual(e10.drop, 1, 'drop kind of another stage does not apply');
assert.strictEqual(e10.fusionExp, 2);
assert.strictEqual(e10.fusionMunny, 0.5);
const e20 = c.effectsFor(all, byId, 4000020);
assert.strictEqual(e20.apPower, 5000);
assert.strictEqual(e20.drop, 2);
assert.strictEqual(e20.lux, 1);
const none = c.effectsFor([], byId, 4000010);
assert.deepStrictEqual(none, { apPower: null, lux: 1, drop: 1, fusionExp: 1, fusionMunny: 1 }, 'no rows: neutral');
assert.strictEqual(c.effectsFor(all, byId, 1050).apPower, null, 'a stage no row lists');

// AP of a quest under an AP campaign
assert.strictEqual(c.apWith(90, null), 90, 'no AP campaign');
assert.strictEqual(c.apWith(90, 0), 0);
assert.strictEqual(c.apWith(90, 556), 5);
assert.strictEqual(c.apWith(90, 5000), 45);
assert.strictEqual(c.apWith(3, 3500), 1);
assert.strictEqual(c.apWith(10, 5000), 5);

assert.ok(c.SERVER_APPLIES instanceof Set);
console.log('test-campaigns: OK');
