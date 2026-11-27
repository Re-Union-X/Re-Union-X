// I-130: the Union Cross row must be open on every fake date. In real months whose twin is before 2020 (2028-04 -> 2019-06,
// 2028-09, 2029-02 ...) a multi row starting on 2020-01-01 gave an empty multiEvents and the Quest screen crashed
// (multiEvents[0] read without a check). Checks the served master_data/multi.json: node server/test-multi-clock.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const clock = require('./clock');
const { makeMulti } = require('./multi');

const rows = JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', 'multi.json'), 'utf8'));
let out = null, now = '';
const m = makeMulti({
  masterRows: (t) => (t === 'multi' ? rows : []), player: {}, savePlayer: () => {}, ret: () => ({ code: 0 }),
  send: (res, code, body) => { out = body; }, serverTime: () => now, userPointData: () => ({}),
  userKeybladesData: () => [], publicHost: () => '127.0.0.1', schemaResponse: () => ({}),
});
const at = (realMs) => { now = clock.fakeString(realMs, clock.twinOffset(realMs)); m.respond('multistatus', {}, {}); return out; };

assert.strictEqual(at(Date.UTC(2028, 3, 15, 12)).multiEvents.length, 1, '2028-04 (twin before 2020): one Union Cross event');
// every month 2026-2040, days 1 (after the 08:00 reset), 15 and 28
for (let y = 2026; y <= 2040; y++) {
  for (let mo = 0; mo < 12; mo++) {
    for (const d of [1, 15, 28]) {
      const r = Date.UTC(y, mo, d, 9);
      assert.ok(at(r).multiEvents.length >= 1, `${y}-${mo + 1}-${d} (fake ${now}): no Union Cross event`);
    }
  }
}
console.log('test-multi-clock: OK');
