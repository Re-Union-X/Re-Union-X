// Events Part 9b Task 2: make-login-specials.js, the dated special login rows (blue «Welcome!» popup) of the 2021 master.
//   node server/test-make-login-specials.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSpecials, patch } = require('./make-login-specials');

const ex = { rows: [
  { loginBonusId: 312, bonusType: 4, title: 'Celebrating the new KH 2.8 trailer!', description: 'Free HD Aqua Medal!', comment: 'x', rewardType: 3, rewardId: 23175, rewardNum: 1, from: '2016-06-16', to: '2016-06-22', perDay: false },
  { loginBonusId: 313, bonusType: 4, title: 'Back to school!', description: '1,000 free Jewels!', comment: 'y', rewardType: 2, rewardId: 0, rewardNum: 1000, from: '2016-09-01', to: '2016-09-30', perDay: false },
  { loginBonusId: 404, bonusType: 4, title: 'Special Gift!', description: 'Anna Snuggly', comment: 'z', rewardType: 20, rewardId: 999999, rewardNum: 1, from: '2019-02-25', to: '2019-02-28', perDay: false },
  { loginBonusId: 311, bonusType: 3, title: 'Newcomer Campaign', description: 'Receive 50 Jewels per Day!', comment: 'n', rewardType: 2, rewardId: 0, rewardNum: 50, from: '2016-04-07', to: '2016-04-13', perDay: true },
], undated: [{ loginBonusId: 500 }] };
const ctx = { medalIds: new Set([23175]), avatarPartIds: new Set([209123]), petPartIds: new Set() };

const out = buildSpecials(ex, ctx);
assert.deepStrictEqual(out.rows.map((r) => r.loginBonusId), [311, 312, 313], 'unknown avatar part dropped, id order');
assert.deepStrictEqual(out.windows['312'], { from: '2016-06-16', to: '2016-06-22', perDay: false });
assert.strictEqual(out.windows['311'].perDay, true);
assert.strictEqual(out.windows['404'], undefined, 'no window for a dropped row');
assert.strictEqual(out.dropped.unknownReward, 1);
assert.strictEqual(out.dropped.undated, 1);
const r312 = out.rows[1];
assert.strictEqual(r312.day, 0);
assert.strictEqual(r312.startDate, '2016-04-07 00:00:00');
assert.strictEqual(r312.endDate, '2099-12-31 23:59:59');
assert.deepStrictEqual(Object.keys(r312), ['loginBonusId', 'bonusType', 'title', 'description', 'comment', 'day', 'startDate', 'endDate',
  'rewardType', 'rewardId', 'rewardAssignSkillType', 'rewardAssignSkillId', 'rewardAssignSkillLv', 'rewardNum'], 'the 14 fields of make-login-bonus.js');
assert.strictEqual(r312.rewardAssignSkillId, 0);
// a reward of an unchecked type (tickets, jewels) is kept; a window outside the service is refused
const bad = buildSpecials({ rows: [{ ...ex.rows[1], loginBonusId: 900, from: '2022-01-01', to: '2022-01-02' }] }, ctx);
assert.strictEqual(bad.rows.length, 0);
assert.strictEqual(bad.dropped.badWindow, 1);

// patch: Daily / Total rows kept, older special rows replaced, idempotent; no extract = no specials
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-ls-'));
const daily = { loginBonusId: 100, bonusType: 1, day: 1 }, total = { loginBonusId: 200, bonusType: 2, day: 1 }, stale = { loginBonusId: 330, bonusType: 4, day: 0 };
fs.writeFileSync(path.join(dir, 'loginBonus.json'), JSON.stringify([daily, total, stale]));
fs.writeFileSync(path.join(dir, 'medal.json'), JSON.stringify([{ medalId: 23175 }]));
fs.writeFileSync(path.join(dir, 'avatarParts.json'), JSON.stringify([{ avatarPartsId: 209123 }]));
fs.writeFileSync(path.join(dir, 'petParts.json'), JSON.stringify([]));
const file = path.join(dir, 'extract.json');
fs.writeFileSync(file, JSON.stringify(ex));
patch(dir, file);
patch(dir, file);
const rows = JSON.parse(fs.readFileSync(path.join(dir, 'loginBonus.json'), 'utf8'));
assert.deepStrictEqual(rows.map((r) => r.loginBonusId), [100, 200, 311, 312, 313]);
assert.deepStrictEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(dir, 'login_specials.json'), 'utf8'))), ['311', '312', '313']);
patch(dir, path.join(dir, 'absent.json'));
assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'loginBonus.json'), 'utf8')).map((r) => r.loginBonusId), [100, 200]);
assert.strictEqual(fs.readFileSync(path.join(dir, 'login_specials.json'), 'utf8'), '{}');
fs.rmSync(dir, { recursive: true, force: true });
console.log('test-make-login-specials: OK');
