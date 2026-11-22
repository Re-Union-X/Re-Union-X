// Login bonus (I-176, login-bonus.js e POST /login/bonus): node server/test-login-bonus.js
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const lb = require('./login-bonus');
const errors = []; const check = (ok, msg) => { if (!ok) errors.push(msg); };

// regole pure, con una tabella ridotta: Daily 100-104, Total ai giorni 1, 4 (titolo) e 7
const ROWS = [
  ...[100, 100, 200, 200, 300].map((n, i) => ({ loginBonusId: 100 + i, bonusType: 1, day: i + 1, rewardType: 2, rewardId: 0, rewardNum: n })),
  { loginBonusId: 200, bonusType: 2, day: 1, rewardType: 2, rewardId: 0, rewardNum: 300 },
  { loginBonusId: 203, bonusType: 2, day: 4, rewardType: 7, rewardId: 14001, rewardNum: 1 },
  { loginBonusId: 206, bonusType: 2, day: 7, rewardType: 2, rewardId: 0, rewardNum: 100 },
];
check([1, 2, 3, 4, 5, 6, 10, 11].map(lb.cycleDay).join() === '1,2,3,4,5,1,5,1', 'ciclo di 5');
check(lb.acquirable(undefined, 0) && lb.acquirable(lb.fresh(), 5), 'stato nuovo: riscuotibile');
let r = lb.claim(undefined, 100, ROWS);
check(r.state.total === 1 && r.state.lastDay === 100, `giorno 1: ${JSON.stringify(r.state)}`);
check(JSON.stringify(r.rewards.map((x) => [x.type, x.num, x.comment])) === JSON.stringify([[2, 100, lb.DAILY_COMMENT], [2, 300, lb.TOTAL_COMMENT]]), `premi del giorno 1: ${JSON.stringify(r.rewards)}`);
check(JSON.stringify(r.response) === JSON.stringify({ continue: { loginBonusId: 100, dayCount: 1 }, total: { loginBonusId: 200, dayCount: 1 }, specials: [] }), `risposta del giorno 1: ${JSON.stringify(r.response)}`);
check(!lb.acquirable(r.state, 100), 'stesso giorno: non riscuotibile');
// a lastDay in the future (bench save after -RealNow, phone with a wrong date): today is claimable (tester report 15-11)
check(lb.acquirable({ lastDay: 3264, total: 6 }, 3240), 'lastDay in the future: claimable');
check(lb.claim({ lastDay: 3264, total: 6 }, 3240, []).state.lastDay === 3240, 'claim with a future lastDay resets it to today');
const again = lb.claim(r.state, 100, ROWS);
check(again.rewards.length === 0 && JSON.stringify(again.response) === JSON.stringify(r.response) && again.state.total === 1, 'stesso giorno due volte: stessa risposta, niente premi');
// giorno saltato: il ciclo continua (101 -> giorno 2, poi 105 -> giorno 3)
r = lb.claim(r.state, 101, ROWS);
r = lb.claim(r.state, 105, ROWS);
check(r.state.total === 3 && r.response.continue.loginBonusId === 102 && r.response.continue.dayCount === 3, `dopo un salto: ${JSON.stringify(r.response)}`);
check(r.response.total.loginBonusId === 0 && r.rewards.length === 1, 'giorno senza traguardo: total.loginBonusId 0, solo il Daily');
r = lb.claim(r.state, 106, ROWS);
check(r.rewards.some((x) => x.type === 7 && x.id === 14001) && r.response.total.loginBonusId === 203, `titolo al giorno 4: ${JSON.stringify(r.rewards)}`);
r = lb.claim(r.state, 107, ROWS); r = lb.claim(r.state, 108, ROWS);
check(r.response.continue.loginBonusId === 100 && r.rewards[0].num === 100, 'giorno 6: il Daily riparte da 1');

// Events Part 9b: special logins of the story day (blue «Welcome!» popup), each paid once
const SP = [...ROWS,
  { loginBonusId: 311, bonusType: 3, day: 0, comment: 'Receive 50 Jewels per Day!', rewardType: 2, rewardId: 0, rewardNum: 50 },
  { loginBonusId: 312, bonusType: 4, day: 0, comment: 'Free KH 2.8 Trailer Celebration Medal', rewardType: 3, rewardId: 23175, rewardNum: 1 },
  { loginBonusId: 313, bonusType: 4, day: 0, comment: 'Back-to-School Event', rewardType: 2, rewardId: 0, rewardNum: 1000 }];
const WIN = { 311: { from: '2016-04-07', to: '2016-04-13', perDay: true }, 312: { from: '2016-06-16', to: '2016-06-22', perDay: false },
  313: { from: '2016-09-01', to: '2016-09-30', perDay: false }, 999: { from: '2016-06-16', to: '2016-06-22', perDay: false } };
const spOf = (res) => res.rewards.filter((x) => x.special);
let s = lb.claim(undefined, 200, SP, { storyDay: '2016-06-18', windows: WIN });
check(JSON.stringify(s.response.specials) === '[312]', `special of the day: ${JSON.stringify(s.response.specials)}`);
check(JSON.stringify(spOf(s).map((x) => [x.type, x.id, x.num, x.comment, x.special])) === JSON.stringify([[3, 23175, 1, 'Free KH 2.8 Trailer Celebration Medal', 312]]), `special reward: ${JSON.stringify(spOf(s))}`);
check(s.state.specials && s.state.specials['312'] === '2016-06-18', `special recorded: ${JSON.stringify(s.state.specials)}`);
check(s.rewards.length === 3, 'Daily + Total + special');
const same = lb.claim(s.state, 200, SP, { storyDay: '2016-06-18', windows: WIN });
check(same.rewards.length === 0 && JSON.stringify(same.response.specials) === '[312]', `same login day again: same answer, nothing paid (${JSON.stringify(same.response)})`);
const replay = lb.claim(s.state, 201, SP, { storyDay: '2016-06-18', windows: WIN });
check(spOf(replay).length === 0 && JSON.stringify(replay.response.specials) === '[]', 'replayed story week: the special is not paid twice');
check(JSON.stringify(lb.claim(s.state, 202, SP, { storyDay: '2016-06-23', windows: WIN }).response.specials) === '[]', 'after the window');
const noWeek = lb.claim(undefined, 200, SP, { storyDay: null, windows: WIN });
check(JSON.stringify(noWeek.response.specials) === '[]' && noWeek.rewards.length === 2, 'no story day: Daily and Total only');
const old = lb.claim({ lastDay: 150, total: 3 }, 200, SP, { storyDay: '2016-06-18', windows: WIN });
check(JSON.stringify(old.response.specials) === '[312]' && old.state.total === 4, 'pre-9b save: today\'s special paid once');
let n1 = lb.claim(undefined, 300, SP, { storyDay: '2016-04-07', windows: WIN });
const n2 = lb.claim(n1.state, 301, SP, { storyDay: '2016-04-08', windows: WIN });
const n3 = lb.claim(n2.state, 302, SP, { storyDay: '2016-04-08', windows: WIN });
check(spOf(n1).length === 1 && spOf(n2).length === 1 && spOf(n2)[0].num === 50 && spOf(n3).length === 0, 'Newcomer (perDay): once per story day');
check(n2.state.specials['311@2016-04-08'] === '2016-04-08', `perDay key: ${JSON.stringify(n2.state.specials)}`);
const forced = lb.claim(undefined, 400, SP, { storyDay: null, windows: WIN, force: [313, 999] });
check(JSON.stringify(forced.response.specials) === '[313]', `bench switch: listed ids that exist only (${JSON.stringify(forced.response.specials)})`);
check(JSON.stringify(lb.claim(forced.state, 401, SP, { storyDay: null, windows: WIN, force: [313] }).response.specials) === '[]', 'bench switch: once too');
check(JSON.stringify(lb.claim(undefined, 200, SP, { storyDay: '2016-06-18', windows: WIN }).response.specials) === '[312]' && !lb.claim(undefined, 200, SP, { storyDay: '2016-06-18', windows: WIN }).response.specials.includes(999), 'a window without a master row is never listed');
check(JSON.stringify(lb.claim(undefined, 200, SP).response.specials) === '[]', 'no options: no specials (old callers)');
// catch-up (user 22-11): specials of the story days passed since the last claim are paid once at the next login bonus;
// at most MAX_POPUPS listed (blue popups), the others only in the Presents; perDay (Newcomer) never caught up
{
  const rows = [...ROWS, ...[1, 2, 3, 4, 5, 6, 7].map((k) => ({ loginBonusId: 500 + k, bonusType: 4, day: 0, comment: `c${k}`, rewardType: 2, rewardId: 0, rewardNum: 100 * k })),
    { loginBonusId: 311, bonusType: 3, day: 0, comment: 'n', rewardType: 2, rewardId: 0, rewardNum: 50 }];
  const win = { 311: { from: '2016-04-07', to: '2016-04-13', perDay: true } };
  ['2016-04-08', '2016-05-01', '2016-06-10', '2016-07-04', '2016-08-01', '2016-09-01', '2016-10-31'].forEach((d, i) => { win[501 + i] = { from: d, to: d, perDay: false }; });
  check(lb.MAX_POPUPS === 5, 'MAX_POPUPS 5');
  const first = lb.claim(undefined, 300, rows, { storyDay: '2016-04-07', windows: win });
  check(JSON.stringify(first.response.specials) === '[311]' && first.state.specialsSeen === '2016-04-07', `first claim: today only (${JSON.stringify(first.response.specials)}, seen ${first.state.specialsSeen})`);
  const jump = lb.claim(first.state, 301, rows, { storyDay: '2016-11-15', windows: win });
  const paid = jump.rewards.filter((x) => x.special).map((x) => x.special);
  check(JSON.stringify(paid) === '[501,502,503,504,505,506,507]', `catch-up pays every passed special once: ${JSON.stringify(paid)}`);
  check(JSON.stringify(jump.response.specials) === '[501,502,503,504,505]', `at most 5 popups, oldest first: ${JSON.stringify(jump.response.specials)}`);
  check(jump.state.specialsSeen === '2016-11-15', 'last story day seen');
  check(!paid.includes(311), 'Newcomer not caught up');
  const again2 = lb.claim(jump.state, 302, rows, { storyDay: '2016-11-16', windows: win });
  check(again2.rewards.filter((x) => x.special).length === 0, 'nothing paid twice');
  const back = lb.claim(jump.state, 303, rows, { storyDay: '2016-06-10', windows: win });
  check(back.rewards.filter((x) => x.special).length === 0 && back.state.specialsSeen === '2016-11-15', 'a story day earlier than the last seen: only that day (already paid), seen kept');
  const preSave = lb.claim({ lastDay: 10, total: 3, specials: {} }, 304, rows, { storyDay: '2016-10-31', windows: win });
  check(JSON.stringify(preSave.response.specials) === '[507]', `save without specialsSeen: today only, no back pay of history (${JSON.stringify(preSave.response.specials)})`);
}

// generatore: 5 righe Daily con i jewel dalla v2.3.1, Total intatte
const gen = require('./make-login-bonus');
const src = [...[50, 50, 100, 100, 200].map((n, i) => ({ loginBonusId: 100 + i, bonusType: 1, day: i + 1, rewardType: 2, rewardNum: n, _end: 1 })),
  { loginBonusId: 200, bonusType: 2, day: 1, rewardType: 2, rewardNum: 300 }, { loginBonusId: 311, bonusType: 3, day: 0, rewardType: 2, rewardNum: 50 }];
const out = gen.rows(src);
check(out.length === 6 && out.slice(0, 5).map((x) => x.rewardNum).join() === '100,100,200,200,300', `generatore: ${JSON.stringify(out.map((x) => x.rewardNum))}`);
check(!out.some((x) => x.bonusType === 3) && !('_end' in out[0]), 'generatore: niente speciali ne\' campi del decodificatore');

// server: /khux/login e /login/bonus col master vero
const SAVE = path.join(os.tmpdir(), `khux-test-lb-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* nuovo */ }
process.env.KHUX_SAVE = SAVE; delete process.env.KHUX_SERVER_TIME; delete process.env.KHUX_LOGIN_BONUS;
process.env.KHUX_LOGIN_SPECIAL_FORCE = '312'; // bench switch: the 2016 KH 2.8 trailer special (Part 9b)
const realNowFn = Date.now; const at = (iso) => { const ms = Date.parse(iso); Date.now = () => ms; };
at('2026-10-20T09:00:00Z');
const log = console.log; const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };
call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
const dailyTotal = t.masterRows('loginBonus').filter((r) => r.bonusType === 1 || r.bonusType === 2).length;
if (dailyTotal !== 98) errors.push(`master loginBonus: ${dailyTotal} Daily/Total rows (run node server/make-login-bonus.js)`);
t.player.tutorialPhase = 0;
check(call(t.respondKhuxLogin).gameLogin.acquirableLoginBonus === false, 'tutorial non finito: niente login bonus');
t.player.tutorialPhase = 995;
check(call(t.respondKhuxLogin).gameLogin.acquirableLoginBonus === true, 'primo login: login bonus');
const n0 = (t.player.presents || []).length;
const b1 = call(t.respondLoginBonus);
check(b1.loginBonus.continue.loginBonusId === 100 && b1.loginBonus.total.dayCount === 1 && b1.loginBonus.total.loginBonusId === 200, `risposta: ${JSON.stringify(b1.loginBonus)}`);
const got = (t.player.presents || []).slice(n0);
check(got.length >= 3 && got[0].comment === 'Daily Login Bonus Reward' && got[0].number === 100 && got[1].number === 300, `Presents: ${JSON.stringify(got)}`);
// Part 9b: the forced special (bench switch) is listed and paid with its row's comment (needs the regen with the extract)
// a new player's story week is April 2016: the Newcomer Campaign (311, 50 Jewels a day) is due too
check(b1.loginBonus.specials.includes(312) && b1.loginBonus.specials.every((id) => [311, 312].includes(id)), `specials: ${JSON.stringify(b1.loginBonus.specials)}`);
const sp312 = got.find((p) => p.resourceType === 3 && p.resourceId === 23175);
check(sp312 && sp312.comment === 'Free KH 2.8 Trailer Celebration Medal', `special present: ${JSON.stringify(sp312)}`);
const nAfter = t.player.presents.length;
check(t.player.loginBonus.specials && '312' in t.player.loginBonus.specials, 'special recorded in the save');
check(t.loginSpecialStoryDay() === null || /^\d{4}-\d\d-\d\d$/.test(t.loginSpecialStoryDay()), `story day: ${t.loginSpecialStoryDay()}`);
check(call(t.respondKhuxLogin).gameLogin.acquirableLoginBonus === false, 'secondo login dello stesso giorno');
call(t.respondLoginBonus);
check((t.player.presents || []).length === nAfter, 'riscossione doppia');
// cambio di giorno alle 08:00 UTC
at('2026-10-21T07:59:00Z');
check(call(t.respondKhuxLogin).gameLogin.acquirableLoginBonus === false, 'alle 07:59 e\' ancora lo stesso giorno');
at('2026-10-21T08:00:00Z');
check(call(t.respondKhuxLogin).gameLogin.acquirableLoginBonus === true, 'alle 08:00 nuovo giorno');
check(call(t.respondLoginBonus).loginBonus.continue.dayCount === 2, 'giorno 2');

Date.now = realNowFn;
try { fs.unlinkSync(SAVE); } catch { /* tolto */ }
if (errors.length) { log(`ERRORI (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
log('OK: login bonus');
