// I-131: the ranking period (rankingTermStart/End, nextUpdateTime) follows the 08:00 UTC week and month resets of the
// Weeklies (clock.weekStartOf/weekEnd/monthEndOf), not Monday / day 1 00:00 of the fake date. node server/test-party-term.js
'use strict';
const assert = require('assert');
const clock = require('./clock');
const { respondPartyRanking } = require('./routes-party-ranking');

const at = (realMs, path) => {
  const off = clock.twinOffset(realMs);
  const serverTimeAt = (ms) => clock.fakeString(ms, off);
  let out = null;
  const deps = { send: (res, code, body) => { out = body; }, ret: () => ({}), realNow: () => realMs, serverTime: () => serverTimeAt(realMs),
    serverTimeAt, clock, player: {}, userObject: () => ({}), userDetailData: () => ({}), userAvatarData: () => ({}) };
  respondPartyRanking(deps, {}, 'rankinglist', path, {});
  return Object.values(out).find((v) => v && v.rankingTermStart);
};
const dow = (s) => new Date(s.replace(' ', 'T') + 'Z').getUTCDay();

for (const r of [Date.UTC(2026, 10, 27, 12), Date.UTC(2026, 10, 30, 7), Date.UTC(2027, 4, 20, 9), Date.UTC(2028, 3, 15, 23)]) {
  const w = at(r, '/ranking/weekly/user');
  assert.ok(w.rankingTermStart.endsWith(' 08:00:00') && dow(w.rankingTermStart) === 1, `weekly start Monday 08:00: ${w.rankingTermStart}`);
  assert.ok(w.rankingTermEnd.endsWith(' 07:59:59') && dow(w.rankingTermEnd) === 1, `weekly end Monday 07:59:59: ${w.rankingTermEnd}`);
  assert.strictEqual(w.rankingTermEnd, clock.fakeString(clock.weekEnd(r) - 1000, clock.twinOffset(r)));
  assert.strictEqual(w.nextUpdateTime, w.rankingTermEnd);
  const m = at(r, '/ranking/monthly/user');
  assert.ok(/-01 08:00:00$/.test(m.rankingTermStart), `monthly start day 1 08:00: ${m.rankingTermStart}`);
  assert.ok(/-01 07:59:59$/.test(m.rankingTermEnd), `monthly end day 1 07:59:59: ${m.rankingTermEnd}`);
  assert.strictEqual(m.rankingTermEnd, clock.fakeString(clock.monthEnd(r) - 1000, clock.twinOffset(r)));
}
// Monday 30/11/2026 07:00 UTC is still the week of 23/11 (reset at 08:00)
const w = at(Date.UTC(2026, 10, 30, 7), '/ranking/weekly/user');
const s = at(Date.UTC(2026, 10, 27, 12), '/ranking/weekly/user');
assert.strictEqual(w.rankingTermStart, s.rankingTermStart, 'Monday before 08:00: previous week');
console.log('test-party-term: OK');
