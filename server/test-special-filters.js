// Filter matrix of the Special catalogue (round 16): every game-year tab, TYPE, REWARDS and SHOW chip, a few FIND queries
// and combinations, run by the page script itself in headless Edge. For each case what is really DISPLAYED (computed
// style) must match the filters, every matching card must be displayed, summary / tab counts / «Show N results» must
// agree, and the empty-state message must show exactly when nothing is displayed. Since 24-11 (9fde7c52) the catalogue
// is one grid by date (one card per version or campaign, in the one game year it started): no VIP Campaigns section,
// year chips or month labels any more.
// Fixture page and, when present, the real local index. Skipped without Edge (KHUX_EDGE overrides its path).
//   node server/test-special-filters.js
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const pages = require('./special-pages'), special = require('./special');
const EDGE = process.env.KHUX_EDGE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const errors = [];
if (!fs.existsSync(EDGE)) { console.log('test-special-filters: skipped (headless Edge not found)'); process.exit(0); }
// Filter matrix probe (round 16; one grid by date since 24-11, commit 9fde7c52): loaded into the catalogue page in headless
// Edge. Applies every chip of every filter group through the page's own controls, plus combinations and searches, and
// checks what is really DISPLAYED (computed style) against an independent reading of the cards' data attributes.
function probe() { try {
  var $ = function (id) { return document.getElementById(id); };
  var A = function (el, a) { return el.getAttribute(a); };
  var SETS = { now: ['now', 'kept'], unl: ['can', 'replaced', 'other'] };
  function words(t) { return String(t).toLowerCase().split(/[^a-z0-9À-ɏ]+/).filter(Boolean); }
  function prefix(q, name) { var ws = words(name); return words(q).every(function (w) { return ws.some(function (x) { return x.indexOf(w) === 0; }); }); }
  function shown(el) { while (el && el.nodeType === 1) { if (getComputedStyle(el).display === 'none') return false; el = el.parentNode; } return true; }
  var rows = [].slice.call(document.querySelectorAll('.row'));
  function info(r) {
    return { el: r, camp: / cr( |$)/.test(r.className), ps: A(r, 'data-periods').split(' '), t: A(r, 'data-type').split(' '), ss: A(r, 'data-show').split(' '),
      rw: (A(r, 'data-reward') || '').split(' '), dn: A(r, 'data-done'), ns: (A(r, 'data-search') || '').split(' | ') };
  }
  var R = rows.map(info);
  function matches(r, f, anyPeriod) {
    if (!anyPeriod && f.p !== 'all' && r.ps.indexOf(f.p) < 0) return false;
    if (f.type !== 'all' && r.t.indexOf(f.type) < 0) return false;
    if (f.show !== 'all' && !r.ss.some(function (s) { return (SETS[f.show] || [f.show]).indexOf(s) >= 0; })) return false;
    if (f.reward !== 'all' && r.rw.indexOf(f.reward) < 0) return false;
    if (f.prog !== 'all' && (r.dn === '1') !== (f.prog === 'done')) return false;
    if (f.q && !r.ns.some(function (n) { return prefix(f.q, n); })) return false;
    return true;
  }
  function chip(g, v) { return document.querySelector('.opts[data-g="' + g + '"] [data-v="' + v + '"]'); }
  function apply(f) {
    $('fbtn').click(); $('freset').click();
    chip('type', f.type).click(); chip('show', f.show).click(); chip('reward', f.reward).click(); chip('prog', f.prog).click();
    $('fq').value = f.q; $('fq').oninput();
    $('fok').click();
    var t = document.querySelector('.tab[data-p="' + f.p + '"]'); if (!t) throw new Error('no tab ' + f.p); t.click();
  }
  var results = [], pass = 0, fail = 0;
  function check(name, f) {
    apply(f);
    var err = [], visQ = 0, visC = 0;
    R.forEach(function (r) {
      var m = matches(r, f), vis = shown(r.el);
      if (vis && !m) err.push('visible but not matching: ' + A(r.el, 'data-name'));
      if (!vis && m) err.push('matching but hidden: ' + A(r.el, 'data-name'));
      if (vis) { if (r.camp) visC++; else visQ++; }
    });
    var sum = $('sum').textContent, ms = /^(\d+) quests? · (\d+) campaigns?/.exec(sum);
    if (!ms || +ms[1] !== visQ || +ms[2] !== visC) err.push('summary «' + sum.slice(0, 40) + '» vs visible ' + visQ + '/' + visC);
    // tab counts: matching cards of that game year (period aside), All = every matching card
    [].forEach.call(document.querySelectorAll('.tab'), function (t) {
      var p = A(t, 'data-p'), want = R.filter(function (r) { var g = {}; for (var k in f) g[k] = f[k]; g.p = p; return matches(r, g); }).length;
      if (+$('tc' + p).textContent !== want) err.push('tab ' + p + ' says ' + $('tc' + p).textContent + ', expected ' + want);
    });
    // the sheet's «Show N results» for the same draft
    $('fbtn').click(); var fok = $('fok').textContent, nres = R.filter(function (r) { return matches(r, f); }).length; $('fx').click();
    if (fok !== 'Show ' + nres + ' result' + (nres === 1 ? '' : 's')) err.push('button «' + fok + '» vs ' + nres);
    var none = shown($('none')) && $('none').textContent;
    if (!visQ && !visC && !none) err.push('no empty-state message');
    if ((visQ || visC) && none) err.push('empty-state message with visible rows');
    if (none && f.prog !== 'all' && none.indexOf(f.prog === 'done' ? 'No completed quests' : 'No incomplete quests') !== 0) err.push('empty-state message without the progress: ' + none);
    if (f.prog !== 'all' && $('sum').textContent.indexOf(f.prog === 'done' ? 'Completed' : 'Incomplete') < 0) err.push('summary without the progress tag');
    if (err.length) fail++; else pass++;
    results.push({ name: name, ok: !err.length, err: err.slice(0, 4), n: err.length });
  }
  // one grid by date: every card belongs to the one game year it started in
  var multi = R.filter(function (r) { return r.ps.length !== 1 || r.ps[0] === ''; });
  if (multi.length) { fail++; results.push({ name: 'one game year per card', ok: false, err: multi.slice(0, 4).map(function (r) { return A(r.el, 'data-name') + ': ' + r.ps.join(' '); }), n: multi.length }); }
  var base = { p: 'all', type: 'all', show: 'all', reward: 'all', prog: 'all', q: '' };
  function w(o) { var f = {}; for (var k in base) f[k] = base[k]; for (var j in o) f[j] = o[j]; return f; }
  var cases = [['no filters', w({})]], tabs = [];
  [].forEach.call(document.querySelectorAll('.tab'), function (t) { if (A(t, 'data-p') !== 'all') { tabs.push(A(t, 'data-p')); cases.push(['tab ' + A(t, 'data-p'), w({ p: A(t, 'data-p') })]); } });
  ['type', 'reward', 'show', 'prog'].forEach(function (g) { [].forEach.call(document.querySelectorAll('.opts[data-g="' + g + '"] .o'), function (o) { var v = A(o, 'data-v'); if (v !== 'all') { var x = {}; x[g] = v; cases.push([g + ' ' + v, w(x)]); } }); });
  ['key', 'key art', 'cid', 'mickey', 'zzzz'].forEach(function (q) { cases.push(['find «' + q + '»', w({ q: q })]); });
  var t0 = tabs[0], tl = tabs[tabs.length - 1];
  cases.push(['show can + type vip', w({ show: 'can', type: 'vip' })]);
  cases.push(['reward medal + tab ' + t0, w({ reward: 'medal', p: t0 })]);
  cases.push(['show now + tab ' + tl, w({ show: 'now', p: tl })]);
  cases.push(['type camp + show unl', w({ type: 'camp', show: 'unl' })]);
  cases.push(['find «key art» + show unl', w({ q: 'key art', show: 'unl' })]);
  cases.push(['prog done + show now', w({ prog: 'done', show: 'now' })]);
  cases.push(['prog todo + type camp + tab ' + t0, w({ prog: 'todo', type: 'camp', p: t0 })]);
  cases.push(['prog done + find «key»', w({ prog: 'done', q: 'key' })]);
  cases.push(['prog done + find «zzzz»', w({ prog: 'done', q: 'zzzz' })]);
  cases.push(['prog todo + show removed', w({ prog: 'todo', show: 'removed' })]);
  cases.forEach(function (c) { try { check(c[0], c[1]); } catch (e) { fail++; results.push({ name: c[0], ok: false, err: ['exception: ' + e.message], n: 1 }); } });
  var pre = document.createElement('pre'); pre.id = 'probe'; pre.textContent = JSON.stringify({ pass: pass, fail: fail, failed: results.filter(function (r) { return !r.ok; }) }); document.body.appendChild(pre);
} catch (e) { var pe = document.createElement('pre'); pe.id = 'probe'; pe.textContent = JSON.stringify({ pass: 0, fail: 1, failed: [{ name: 'probe', err: [String(e && e.stack || e)], n: 1 }] }); document.body.appendChild(pe); } }
const PROBE = `window.addEventListener('load', ${probe.toString()});`;
function run(index, ctx, label) {
  const file = path.join(os.tmpdir(), `khux-filters-${process.pid}-${label.replace(/\W+/g, '_')}.html`);
  fs.writeFileSync(file, pages.catalogPage(index, ctx).replace('</body>', `<script>${PROBE}</script></body>`));
  let r = null;
  try {
    const out = cp.execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--dump-dom', 'file:///' + file.replace(/\\/g, '/')],
      { encoding: 'utf8', timeout: 240000, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    const m = /<pre id="probe">([^<]*)<\/pre>/.exec(out);
    r = m && JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  } catch (e) { errors.push(`${label}: Edge failed (${e.message.split('\n')[0]})`); }
  try { fs.unlinkSync(file); } catch { /* gone */ }
  if (!r) { if (!errors.length) errors.push(`${label}: no result`); return; }
  for (const f of r.failed) errors.push(`${label}: ${f.name}: ${f.err.join(' | ')}`);
  console.log(`  ${label}: ${r.pass} passed, ${r.fail} failed`);
}
const PERIODS = [1, 2, 3, 4, 5].map((n) => ({ n, name: `Period ${n}`, from: `20${15 + n}-01-01`, to: `20${15 + n}-12-31` }));
const e = (key, evStageId, o) => ({ key, evStageId, name: `N-${key}`, family: key, periods: [1], days: 'all', vip: false,
  replacedBy: null, removed: '', campaign: null, stageIds: [evStageId * 10], useAp: [5], ...o });
const fx = { catalog: { evStageId: 7000 }, entries: [
  e('tue', 7801, { name: 'Tue Quest', periods: [4], days: ['Tue'] }), e('kept', 7802, { name: 'Kept Quest', periods: [3], family: 'SQ22', vip: true }),
  e('old', 7803, { name: 'Old Key Quest', periods: [2], stages: [{ quest: 'Key Art #1', dropRewardIds: [1] }] }), e('later', 7804, { name: 'Later Quest', periods: [5] }),
  e('cid-mon', 7805, { name: 'Cid Challenge (Monday)', periods: [3, 4], days: ['Mon'], family: 'SQ12', resetGroup: 'cid', banner: 'cid.png' }),
  e('cid-tue', 7806, { name: 'Cid Challenge (Tuesday)', periods: [3, 4], days: ['Tue'], family: 'SQ12', resetGroup: 'cid', banner: 'cid.png' }),
  e('gone', 7807, { name: 'Gone Quest', periods: [1], removed: 'no-use' }), e('skill', 7808, { name: 'Skill Quest', periods: [2, 3], family: 'SQ11' }),
  e('cnow', 7811, { name: 'Year End Campaign', periods: [4], vip: true, campaign: { start: '2019-12-30', end: '2020-01-05' }, banner: 'y.png' }),
  e('cold', 7812, { name: 'Key Art #9 VIP Quests!', periods: [2], vip: true, campaign: { start: '2017-08-07', end: '2017-08-13' }, banner: 'o.png' }),
  e('cold2', 7813, { name: 'Mickey Campaign', periods: [2], vip: true, campaign: { start: '2017-09-04', end: '2017-09-10' }, banner: 'p.png' }),
  e('cnext', 7814, { name: 'Next Year Campaign', periods: [4], vip: true, campaign: { start: '2020-02-03', end: '2020-02-09' }, banner: 'n.png' }),
  // round 17 fix 1: a recurring VIP set with week versions (weekOf): one quest row, this week's version listed, a past one keepable
  e('vset', 7821, { name: 'VIP! Medal Quest', periods: [3, 4], vip: true, family: 'SQ22', from: '2019-03-04', banner: 'm.png' }),
  e('vset@2019-06-03', 7822, { name: 'VIP! Medal Quest', periods: [3], vip: true, family: 'SQ22', weekOf: 'vset', weekTitle: 'Get Sora & Stitch Medal!', campaign: { start: '2019-06-03', end: '2019-06-30' }, banner: 'm.png', stages: [{ quest: 'VIP! Medal Quest', dropRewardIds: [1] }] }),
  e('vset@2019-12-30', 7823, { name: 'VIP! Medal Quest', periods: [4], vip: true, family: 'SQ22', weekOf: 'vset', weekTitle: 'SN++ - Peter Pan', campaign: { start: '2019-12-30', end: '2020-01-05' }, banner: 'm.png' }),
] };
const names = { drop: (rid) => (rid === 1 ? ['Huey', 'Mythril'] : []), objective: () => [], dropTypes: (rid) => (rid === 1 ? [3, 5] : []), objectiveTypes: () => [] };
{
  // one card per version (24-11): the set's permanent version is its own card; its week versions of one game year
  // (2019-06-03 and 2019-12-30) are one quest card (not a campaign card), and this week's version makes that card «now»
  const h = pages.catalogPage(fx, { period: 4, pinnedKey: 'kept', periods: PERIODS, names, shopFrom: '2020-01-02', shopTo: '2020-01-08', weekday: 'Tue', vip: true });
  const card = (id) => (h.split('<div class="row').find((x) => x.includes(`id="q${id}"`)) || '');
  const b = card(7821), r = card(7822);
  if (!(b.startsWith(' ') && !b.startsWith(' cr') && b.includes('data-eid="7821"') && !/data-show="[^"]*now/.test(b))) errors.push(`fixture: set base card ${b.slice(0, 220)}`);
  if (!(r.startsWith(' ') && !r.startsWith(' cr') && r.includes('data-eid="7822 7823"') && /data-show="[^"]*now/.test(r) && !/data-type="[^"]*camp/.test(r) && r.includes('2 weeks · '))) errors.push(`fixture: week versions card ${r.slice(0, 220)}`);
}
// PROGRESS (user 03-11): Tue, Old Key, the year-end campaign and one week of the VIP set done
const fxDone = new Set([78010, 78030, 78110, 78220]);
for (const vip of [false, true]) run(fx, { period: 4, pinnedKey: 'kept', periods: PERIODS, names, shopFrom: '2020-01-02', shopTo: '2020-01-08', weekday: 'Tue', vip, stageDone: (sid) => fxDone.has(sid) }, `fixture vip=${vip}`);
// every stage done: «Incomplete» finds only the rows with nothing playable (Gone Quest), «Completed» everything else
run(fx, { period: 4, pinnedKey: 'kept', periods: PERIODS, names, shopFrom: '2020-01-02', shopTo: '2020-01-08', weekday: 'Tue', vip: false, stageDone: () => true }, 'fixture all done');
let real = null; try { real = JSON.parse(fs.readFileSync(path.join(__dirname, 'game_data', 'special.json'), 'utf8')); } catch { /* no local index */ }
if (real) {
  const rows = (n) => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'master_data', n + '.json'), 'utf8')); } catch { return []; } };
  const pin = real.entries.find((en) => en.periods && special.pinnable(en, 4).ok && !en.campaign);
  for (const vip of [false, true]) {
    run(real, { period: 4, pinnedKey: pin.key, vip, periods: special.PERIODS, names: pages.buildNames(rows), shopFrom: '2020-06-02', shopTo: '2020-06-08', weekday: 'Tue', unlockQuestOf: () => 946, stageDone: (sid) => sid % 4 !== 1 }, `real vip=${vip}`);
  }
}
if (errors.length) { console.log('test-special-filters: FAIL\n' + errors.slice(0, 40).join('\n')); process.exit(1); }
console.log('test-special-filters: OK');
