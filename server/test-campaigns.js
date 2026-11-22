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
const days = { '2017-01-02': [96001, 96000, 96002, 96003, 96004, 96005, 96006], '2017-01-03': [96002] };

// active ids of a day (Review Focus 2 and 3)
assert.deepStrictEqual(c.activeIds(null, days), [], 'no story day: none');
assert.deepStrictEqual(c.activeIds('2016-05-01', days), [], 'day without rows: none');
assert.deepStrictEqual(c.activeIds('2017-01-02', days), [96001, 96000, 96002, 96003, 96004, 96005, 96006], 'table order kept');
assert.deepStrictEqual(c.activeIds('2017-01-03', days), [96002], 'the next day has its own set');
assert.deepStrictEqual(c.activeIds('2017-01-02', null), [], 'no table: none');

// effects on a stage
const all = days['2017-01-02'];
const e10 = c.effectsFor(all, byId, 4000010);
assert.strictEqual(e10.apPower, 0, 'two AP kinds on one stage: the first listed wins, as on the client (the table lists the lowest first)');
assert.strictEqual(c.effectsFor([96000, 96001], byId, 4000010).apPower, 5000, 'first listed wins, not the lowest');
assert.strictEqual(e10.lux, 3, 'two Lux kinds: the highest, not multiplied');
assert.strictEqual(e10.drop, 1, 'drop kind of another stage does not apply');
assert.strictEqual(e10.fusionExp, 2);
assert.strictEqual(e10.fusionMunny, 0.5);
const e20 = c.effectsFor(all, byId, 4000020);
assert.strictEqual(e20.apPower, 5000);
assert.strictEqual(e20.drop, 2);
assert.strictEqual(e20.lux, 1);
const none = c.effectsFor([], byId, 4000010);
assert.deepStrictEqual(none, { apPower: null, lux: 1, drop: 1, fusionExp: 1, fusionMunny: 1, spAtk: null }, 'no rows: neutral');
assert.strictEqual(c.effectsFor(all, byId, 1050).apPower, null, 'a stage no row lists');

// AP of a quest under an AP campaign
assert.strictEqual(c.apWith(90, null), 90, 'no AP campaign');
assert.strictEqual(c.apWith(90, 0), 0);
assert.strictEqual(c.apWith(90, 556), 6, 'rounded up, as the client shows it');
assert.strictEqual(c.apWith(90, 5000), 45);
assert.strictEqual(c.apWith(3, 3500), 2);
assert.strictEqual(c.apWith(3, 5000), 2);
assert.strictEqual(c.apWith(1, 100), 1, 'never below 1');
assert.strictEqual(c.apWith(0, 5000), 0, 'a free quest stays free');

// Lux on every story quest (stageType 5): story stages only
const st5 = new Map([[7, row(7, 10, 20000, 5)]]);
assert.strictEqual(c.effectsFor([7], st5, 1050).lux, 2, 'story stage');
assert.strictEqual(c.effectsFor([7], st5, 4000010).lux, 1, 'not an event stage');
// fusion: the last row of each type wins (as the client's fusion screen)
const fr = new Map([[1, row(1, 11, 30000, 1)], [2, row(2, 11, 20000, 1)], [3, row(3, 17, 0, 1)]]);
const ef = c.effectsFor([1, 2, 3], fr, 0);
assert.strictEqual(ef.fusionExp, 2, 'last fusion EXP row wins');
assert.strictEqual(ef.spAtk, 0, 'type 17 power of the last row');
assert.strictEqual(c.effectsFor([], fr, 0).spAtk, null, 'no Sp. Atk campaign');
assert.ok(c.SERVER_APPLIES instanceof Set);
assert.deepStrictEqual([...c.SERVER_APPLIES].sort((a, b) => a - b), [1, 7, 10, 11, 14, 17], 'the server applies AP, Lux, drops and the fusion types (bench 22-11: luxMagnifications.campaign does not change the reported Lux)');
console.log('test-campaigns: OK');
