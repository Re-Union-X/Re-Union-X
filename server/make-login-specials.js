#!/usr/bin/env node
// Events Part 9b (docs/superpowers/plans/2026-11-22-events-part9b-special-logins.md): the special login bonuses (blue
// «Welcome!» popup, bonusType 3/4) of the donated 2021 master, dated by the private extract (KHUX_LOGIN_SPECIALS).
// Writes
//   - loginBonus.json: the Daily / Total rows of make-login-bonus.js plus the special rows (day 0, the dates of the donor
//     table: the client is never told the window, the server lists a row only on its days);
//   - login_specials.json {"<loginBonusId>": {from, to, perDay}}: server only, original Pacific days (inclusive), read by
//     login-bonus.js claim() for the player's story day.
// A row whose reward is missing from our master (medal, avatar part, Spirit part) is dropped: the popup draws its icon.
// Wired in make-game-tables.js after make-login-bonus. On its own (then raise the revision):
//   node server/make-login-specials.js [master folder]
'use strict';
const fs = require('fs');
const path = require('path');

const EXTRACT = process.env.KHUX_LOGIN_SPECIALS
  || 'D:/Progetto_Restauro_KH_UX/private/donations/relux_2026-11/verified/login_specials_2021.json';
const SERVICE_FROM = '2016-04-07', SERVICE_TO = '2021-05-31';
const isSpecial = (r) => r.bonusType === 3 || r.bonusType === 4;

// the 14 fields of make-login-bonus.js FIELDS, in the client's order
function row(x) {
  return {
    loginBonusId: x.loginBonusId, bonusType: x.bonusType, title: x.title, description: x.description, comment: x.comment,
    day: 0, startDate: '2016-04-07 00:00:00', endDate: '2099-12-31 23:59:59',
    rewardType: x.rewardType, rewardId: x.rewardId, rewardAssignSkillType: 0, rewardAssignSkillId: 0, rewardAssignSkillLv: 0,
    rewardNum: x.rewardNum,
  };
}

// extract {rows, undated}, ctx {medalIds, avatarPartIds, petPartIds: Set} -> {rows, windows, dropped}
function buildSpecials(extract, ctx) {
  const dropped = {};
  const drop = (why) => { dropped[why] = (dropped[why] || 0) + 1; };
  (extract.undated || []).forEach(() => drop('undated'));
  const known = { 3: ctx.medalIds, 20: ctx.avatarPartIds, 33: ctx.petPartIds };
  const rows = [], windows = {};
  for (const x of [...(extract.rows || [])].sort((a, b) => a.loginBonusId - b.loginBonusId)) {
    if (known[x.rewardType] && !known[x.rewardType].has(x.rewardId)) { drop('unknownReward'); continue; }
    if (!(x.from >= SERVICE_FROM && x.to <= SERVICE_TO && x.from <= x.to)) { drop('badWindow'); continue; }
    rows.push(row(x));
    windows[x.loginBonusId] = { from: x.from, to: x.to, perDay: !!x.perDay };
  }
  return { rows, windows, dropped };
}

function patch(masterDir, file = EXTRACT) {
  const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
  const kept = read(path.join(masterDir, 'loginBonus.json'), []).filter((r) => !isSpecial(r));
  const extract = read(file, null);
  let out = { rows: [], windows: {}, dropped: {} };
  if (extract) {
    const ids = (t, k) => new Set(read(path.join(masterDir, t), []).map((r) => r[k]));
    out = buildSpecials(extract, { medalIds: ids('medal.json', 'medalId'), avatarPartIds: ids('avatarParts.json', 'avatarPartsId'), petPartIds: ids('petParts.json', 'petPartsId') });
  }
  fs.writeFileSync(path.join(masterDir, 'loginBonus.json'), JSON.stringify([...kept, ...out.rows]));
  fs.writeFileSync(path.join(masterDir, 'login_specials.json'), JSON.stringify(out.windows));
  console.log(extract ? `login specials: ${out.rows.length} rows, dropped ${JSON.stringify(out.dropped)}` : `login specials: extract ${file} absent, no special rows`);
  return out.rows.length;
}

if (require.main === module) patch(process.argv[2] || path.join(__dirname, 'master_data'));

module.exports = { buildSpecials, patch, EXTRACT };
