// Home banner carousel (openBanners of GET /mypage, server/home-banners.js): node server/test-home-banners.js
// 1. the pure selection (cap 7, never empty, skips ids without an absolute bannerUrl, types 1/2, limitDate format);
// 2. respondMyPage of server.js on a temporary save, at several story points: every plate against the served master.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const hb = require('./home-banners');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };
const D = '2026-11-16 08:00:00';
const W = 'http://10.0.2.2/web/x.png';

// 1. pure selection
{
  const evStageRows = [8000, 20000, ...Array.from({ length: 20 }, (_, i) => 100 + i)].map((id) => ({ eventStageId: id, bannerUrl: W }))
    .concat([{ eventStageId: 500, bannerUrl: '/web/relative.png' }, { eventStageId: 501, bannerUrl: '' }]);
  const drawMedalTypeRows = Array.from({ length: 20 }, (_, i) => ({ drawMedalTypeId: 10000 + i, bannerUrl: W }));
  const shop = (n) => Array.from({ length: n }, (_, i) => ({ drawMedalTypeId: 10000 + i, limitDate: D }));
  const ev = (ids, extra = {}) => ids.map((id) => ({ eventStageId: id, eventType: 2, endTime: D, ...extra }));
  const base = { evStageRows, drawMedalTypeRows, fallbackDate: D };
  const valid = (list, label) => {
    check(list.length >= 1 && list.length <= hb.MAX, `${label}: ${list.length} plates`);
    for (const b of list) {
      check(b.type === 1 || b.type === 2, `${label}: type ${b.type}`);
      check(hb.DATE_RE.test(b.limitDate), `${label}: limitDate ${b.limitDate}`);
      check(Object.keys(b).join() === 'type,id,limitDate', `${label}: keys ${Object.keys(b)}`);
    }
  };
  let l = hb.homeBanners({ ...base, shop: shop(20), events: ev([100, 101, 102, 103, 104, 105, 106, 107]) });
  valid(l, 'full'); check(l.length === 7, `full: ${l.length}`);
  check(l.filter((b) => b.type === 2).length === hb.SHOP_FIRST, `full: shop plates ${l.filter((b) => b.type === 2).length}`);
  check(l[0].type === 2 && l[3].type === 1 && l[3].id === 100, 'full: shop first, then events in tab order');
  l = hb.homeBanners({ ...base, shop: shop(20), events: ev([100]) });
  check(l.length === 7 && l.filter((b) => b.type === 2).length === 6 && l[6].id === 100, 'few events: more shop deals, events after');
  l = hb.homeBanners({ ...base, shop: shop(1), events: ev([8000], { eventType: 0 }).concat(ev([100])), special: [{ eventStageId: 7000, isLock: 0, endTime: D }, { eventStageId: 101, isLock: 1, endTime: D }, { eventStageId: 102, isLock: 0, endTime: D }, { eventStageId: 103, isLock: 2, endTime: D }] });
  check(l.map((b) => `${b.type}:${b.id}`).join() === '2:10000,1:100,1:102,1:103', `catalogs and locked Special out: ${l.map((b) => `${b.type}:${b.id}`)}`);
  l = hb.homeBanners({ ...base, shop: [{ drawMedalTypeId: 99999, limitDate: D }, { drawMedalTypeId: 10001, limitDate: 'soon' }], events: ev([500, 501, 999, 100, 100]) });
  check(l.map((b) => `${b.type}:${b.id}`).join() === '1:100', `unknown ids, relative/empty bannerUrl, bad date, duplicates out: ${l.map((b) => `${b.type}:${b.id}`)}`);
  l = hb.homeBanners({ ...base });
  valid(l, 'empty'); check(l[0].type === 1 && l[0].id === 8000 && l[0].limitDate === D, `evergreen: ${JSON.stringify(l)}`);
  l = hb.homeBanners({ ...base, events: ev([8000], { eventType: 0, endTime: '2026-11-23 08:00:00' }) });
  check(l[0].id === 8000 && l[0].limitDate === '2026-11-23 08:00:00', 'evergreen takes the Events tab endTime');
  l = hb.homeBanners({ ...base, evStageRows: evStageRows.filter((r) => r.eventStageId !== 8000) });
  check(l.length === 1 && l[0].id === 20000, 'evergreen falls back to the Event Catalog');
}

// 2. server: /mypage on a temporary save
const SAVE = path.join(os.tmpdir(), `khux-test-home-banners-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* new */ }
process.on('exit', () => { try { fs.unlinkSync(SAVE); } catch { /* gone */ } });
process.env.KHUX_SAVE = SAVE;
for (const k of ['KHUX_REAL_NOW', 'KHUX_SERVER_TIME', 'KHUX_VIP', 'KHUX_GACHA_SHOW']) delete process.env[k];
const at = (iso) => { const ms = Date.parse(iso); Date.now = () => ms; };
at('2026-11-17T09:00:00Z');
const log = console.log; const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };
call(t.respondUserCreate, { name: 'Test', unionId: 1 });
const p = t.player;
const stages = t.masterRows('stage');
const sid = (q) => stages.find((r) => r.stageKind === 1 && r.id === q)?.stageId;
const served = (name) => quiet(() => t.servedMasterRows(name, Date.now()));
const ev = new Map(served('evStage').map((r) => [r.eventStageId, r]));
const draw = new Map(served('drawMedalType').map((r) => [r.drawMedalTypeId, r]));
check(ev.has(hb.EVERGREEN[0]) && /^https?:\/\//.test(ev.get(hb.EVERGREEN[0]).bannerUrl), 'evergreen 8000 not in the served evStage with an absolute bannerUrl');
const seen = { 1: 0, 2: 0 };
for (const q of [0, 6, 120, 525, 925]) {
  p.stageScores = {};
  for (let i = 1; i <= q; i++) if (sid(i)) p.stageScores[sid(i)] = 1;
  const body = call(t.respondMyPage);
  const list = body.openBanners, label = `story ${q}`;
  check(Array.isArray(list) && list.length >= 1 && list.length <= 7, `${label}: ${list?.length} plates`);
  for (const b of list || []) {
    seen[b.type]++;
    check(b.type === 1 || b.type === 2, `${label}: type ${b.type}`);
    check(hb.DATE_RE.test(b.limitDate), `${label}: limitDate ${b.limitDate}`);
    const row = (b.type === 1 ? ev : draw).get(b.id);
    check(row && /^https?:\/\/\S+$/.test(row.bannerUrl), `${label}: ${b.type}:${b.id} without a served row with an absolute bannerUrl`);
  }
  check(new Set((list || []).map((b) => `${b.type}:${b.id}`)).size === (list || []).length, `${label}: duplicate plates`);
  log(`  ${label}: ${(list || []).map((b) => `${b.type}:${b.id}@${b.limitDate.slice(5, 10)}`).join(' ')}`);
}
check(seen[1] > 0 && seen[2] > 0, `server lists: type 1 ${seen[1]}, type 2 ${seen[2]}`);

if (errors.length) { log(`ERRORS (${errors.length}):\n  ${errors.join('\n  ')}`); process.exit(1); }
log('test-home-banners: OK');
