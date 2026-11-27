// I-129: Booster expiries of 29-32 days must not be cut by the fake-clock upper clamp (28/6/2021). In a month whose twin is
// May 2021 (real 2027-05 -> 2021-05) a 32-day Booster obtained on the 25th showed «Expires 28 days» or less. The served
// emblem endTime uses clock.fakeUntilString (lower clamp only). node server/test-booster-expiry.js [master folder]
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MASTER = path.resolve(process.argv[2] || path.join(__dirname, 'master_data'));
const SAVE = path.join(os.tmpdir(), `khux-test-boosterexp-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* new */ }
process.env.KHUX_MASTER_DIR = MASTER;
process.env.KHUX_SAVE = SAVE;
delete process.env.KHUX_REAL_NOW; delete process.env.KHUX_SERVER_TIME;
const now = Date.UTC(2027, 4, 25, 12); // fake 2021-05-25 12:00
Date.now = () => now;
const log = console.log;
const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const DAY = 86400000;
assert.strictEqual(t.serverTime(), '2021-05-25 12:00:00');

const OWNED = 1810007, NOT_OWNED = 1810008; // P Booster +25% / +10%, spanDays 32
t.player.boosters = [{ emblemId: OWNED, from: 'test', at: now, until: now + 32 * DAY }];
const rows = quiet(() => t.servedMasterRows('emblem', now));
const endOf = (id) => rows.find((r) => r.emblemId === id).endTime;
assert.strictEqual(endOf(OWNED), '2021-06-26 12:00:00', `owned: 32 days after fake now (${endOf(OWNED)})`);
// a Booster ending after 28/6/2021: still its own date, not the clamp
t.player.boosters = [{ emblemId: OWNED, from: 'test', at: now + 5 * DAY, until: now + 37 * DAY }];
const late = quiet(() => t.servedMasterRows('emblem', now)).find((r) => r.emblemId === OWNED).endTime;
assert.strictEqual(late, '2021-07-01 12:00:00', `owned past SAFE_TO: ${late}`);
assert.strictEqual(endOf(NOT_OWNED), '2021-06-26 12:00:00', `not owned: session start + 32 days (${endOf(NOT_OWNED)})`);
try { fs.unlinkSync(SAVE); } catch { /* not written */ }
console.log('test-booster-expiry: OK');
