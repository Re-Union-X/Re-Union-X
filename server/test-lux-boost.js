// Events Part 9c: the Home Lux Boost (lux-boost.js; route GET/PUT /party/lux_up_time, action 105).
//   node server/test-lux-boost.js
'use strict';
const assert = require('assert');
const lb = require('./lux-boost');

const T = Date.parse('2026-11-23T18:00:00Z'); // Monday 10:00 a.m. PST
const H = 3600000;
const party = { name: 'P', createDate: Date.parse('2026-11-01T18:00:00Z') };

assert.strictEqual(lb.MAGNIFICATION, 500);
assert.strictEqual(lb.DURATION_MS, H);
// fresh state (old save) in a party: available
assert.deepStrictEqual(lb.status(undefined, T, party), { magnification: 0, available: true, restrictionKind: 0 });
// activation: +5% for 60 minutes, no second use the same Pacific day
const a = lb.activate(undefined, T, party);
assert.strictEqual(a.ok, true);
assert.deepStrictEqual(lb.status(a.state, T + 1000, party), { magnification: 500, available: false, restrictionKind: 0 });
assert.strictEqual(lb.factor(a.state, T + 59 * 60000), 1.05);
assert.strictEqual(lb.factor(a.state, T + H), 1, 'the hour is over');
assert.strictEqual(lb.factor(undefined, T), 1);
const again = lb.activate(a.state, T + 10 * 60000, party);
assert.strictEqual(again.ok, false, 'pressed twice: refused');
assert.strictEqual(again.state.at, T, 'the window is not extended');
// 11:30 p.m. PT: runs past midnight; the button is back after midnight, a new press restarts the hour
const late = Date.parse('2026-11-24T07:30:00Z'); // Monday 11:30 p.m. PST
const l = lb.activate({ day: '2026-11-22', at: 0 }, late, party);
const after = late + 40 * 60000; // Tuesday 12:10 a.m.
assert.deepStrictEqual(lb.status(l.state, after, party), { magnification: 500, available: true, restrictionKind: 0 }, 'new day: available, the boost still running');
const l2 = lb.activate(l.state, after, party);
assert.strictEqual(l2.ok, true);
assert.strictEqual(l2.state.at, after);
assert.strictEqual(lb.factor(l2.state, after + 50 * 60000), 1.05, 'a new press restarts the hour');
// no party: hidden, refused
assert.deepStrictEqual(lb.status(undefined, T, null), { magnification: 0, available: false, restrictionKind: 0 });
assert.strictEqual(lb.activate(undefined, T, null).ok, false);
// party created today (Pacific): not usable, the button explains (restrictionKind 1); created yesterday: usable
const today = { createDate: Date.parse('2026-11-23T09:00:00Z') }; // Monday 1:00 a.m. PST
assert.deepStrictEqual(lb.status(undefined, T, today), { magnification: 0, available: false, restrictionKind: 1 });
assert.strictEqual(lb.activate(undefined, T, today).ok, false);
const yesterday = { createDate: Date.parse('2026-11-23T07:00:00Z') }; // Sunday 11:00 p.m. PST
assert.strictEqual(lb.status(undefined, T, yesterday).available, true);
assert.strictEqual(lb.pacificDay(Date.parse('2026-11-23T07:59:00Z')), '2026-11-22');
console.log('test-lux-boost: OK');
