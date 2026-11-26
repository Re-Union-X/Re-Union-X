// Coliseum Catalog page (Coliseum Part 1 Task 6, server/colosseum-pages.js): one row per served season with the Raid / Event
// Catalog states (now / can / kept / other / later), the Keep / Remove button of the shared catalog parts, the shared CSS
// (catalog-pages.js PAGE_HEAD, so the phone layout of phone-css.js applies to #rows>.row).
//   node server/test-colosseum-pages.js
'use strict';
const assert = require('assert');
const pages = require('./colosseum-pages');
const { withPhone } = require('./phone-css');

const row = (id, month, state, extra = {}) => ({ colosseumStageId: id, month, state, tiers: 10, apMin: 3, apMax: 5, boardIds: [], coins: 0,
  userRank: 1, userStageCount: 0, userStageTotalCount: 0, tierRewards: [], ...extra });
const ROWS = [row(800, '2016-04', 'kept', { tiers: 6, boardIds: [2200001], coins: 77, userRank: 2, userStageCount: 1, userStageTotalCount: 21 }),
  row(900, '2016-05', 'can', { boardIds: [2200002, 2200023] }), row(1000, '2016-06', 'now'), row(1100, '2016-07', 'later')];
const BOARDS = { 2200001: '6★ Cid', 2200002: '6★ Scrooge', 2200023: 'Tier 10 Bonus' };
const CTX = { unlocked: true, imgVersion: 3, boardName: (id) => BOARDS[id] || null, unlockQuestOf: (r) => (r.month === '2016-07' ? 250 : null) };

// the HTML of one row (from its id="q<id>" to the next row)
const rowHtml = (html, id) => {
  const k = html.indexOf(`id="q${id}"`); assert.ok(k > 0, `row ${id}`);
  const i = html.lastIndexOf('<div class="row', k), j = html.indexOf('<div class="row', k);
  return html.slice(i, j < 0 ? undefined : j);
};

// The keep script of the page (catalog-pages.js keepJs + kxRows) on a minimal DOM of its rows (ES5 in vm, as in the WebView): each row
// with its pill (.s), «Replaces» line (.rp) and Keep / Remove button (.pk). kx(id, on) = a keep (1) / remove (0) answered 200.
function fakeRows(html) {
  const dec = (v) => v.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], dec(m[2])]));
  const mk = (tag) => {
    const e = { attrs: attrsOf(tag), innerHTML: '', textContent: '', style: {}, q: {} };
    e.className = e.attrs.class || '';
    e.getAttribute = (k) => (k in e.attrs ? e.attrs[k] : null);
    e.setAttribute = (k, v) => { e.attrs[k] = String(v); };
    e.querySelector = (sel) => e.q[sel] || null;
    return e;
  };
  const rows = [...html.matchAll(/<div class="row [^"]*"[^>]*>/g)].map((m) => {
    const el = mk(m[0]), h = rowHtml(html, el.attrs['data-eid']);
    const s = /<span class="s ([^"]*)">([\s\S]*?)<\/span>(?=<div class="rp"|<div>|<\/div>)/.exec(h);
    el.q['.s'] = mk(`<span class="s ${s[1]}">`); el.q['.s'].innerHTML = s[2];
    const rp = /<div class="rp"([^>]*)>([^<]*)<\/div>/.exec(h);
    if (rp) { el.q['.rp'] = mk(`<div class="rp"${rp[1]}>`); el.q['.rp'].textContent = rp[2]; el.q['.rp'].style.display = /display:none/.test(rp[1]) ? 'none' : ''; }
    const pk = /<a href="#" class="pk[^"]*"[^>]*>/.exec(h);
    if (pk) el.q['.pk'] = mk(pk[0]);
    return el;
  });
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  const win = {};
  require('vm').runInNewContext(scripts, { window: win, document: { querySelectorAll: (sel) => (sel === '#rows .row' ? rows : []), getElementById: () => null } });
  const row = (id) => rows.find((r) => r.attrs['data-eid'] === String(id));
  const view = (id) => { const r = row(id), b = r.q['.pk'];
    return { show: r.attrs['data-show'], cls: r.className, pill: r.q['.s'].innerHTML, button: b && b.style.display !== 'none' ? b.attrs['data-pin'] : null }; };
  return { rows, row, view, kx: (id, on) => win.kxRow(String(id), on) };
}

// one season of each kind for the filters: kept + boards done + tier rewards taken; can + both to do; now + boards to do, tier rewards
// taken; later + no boards (neither completed nor not), tier rewards to do
const FILTER_ROWS = [row(800, '2016-04', 'kept', { base: 'can', boardIds: [2200001], boards: 'done', tiersDone: true }),
  row(900, '2016-05', 'can', { base: 'can', boardIds: [2200002, 2200023], boards: 'todo', tiersDone: false }),
  row(1000, '2016-06', 'now', { base: 'now', boardIds: [2210029], boards: 'todo', tiersDone: true }),
  row(1100, '2016-07', 'later', { base: 'later', boardIds: [2210043], boards: 'none', tiersDone: false })];
Object.assign(BOARDS, { 2210029: 'KH Chip (M)', 2210043: 'Vampire (M)' });

// The whole page script on a stub DOM (vm, ES5 as in the WebView): rows with attributes and class, every id an element, the sheet
// chips none (the test drives the filters through window.kxFilter, the same render the chips call)
function fakePage(html) {
  const dec = (v) => v.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], dec(m[2])]));
  const mk = (attrs = {}) => { const e = { attrs, innerHTML: '', textContent: '', value: '', style: {}, q: {}, className: attrs.class || '' };
    e.getAttribute = (k) => (k in e.attrs ? e.attrs[k] : null); e.setAttribute = (k, v) => { e.attrs[k] = String(v); }; e.querySelector = (sel) => e.q[sel] || null; return e; };
  const rows = [...html.matchAll(/<div class="row [^"]*"[^>]*>/g)].map((m) => { const e = mk(attrsOf(m[0])); e.q['.s'] = mk(); return e; });
  const ids = {};
  const el = (id) => (ids[id] ||= mk({ id }));
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  const win = {};
  require('vm').runInNewContext(scripts, { window: win, document: { body: { className: '' }, getElementById: el,
    querySelectorAll: (sel) => (sel === '#rows .row' ? rows : []) } });
  return { rows, el, win };
}

// the 13 seasons 2016-04 .. 2017-04 (Part 2): April - November 2016 can be kept, December now, 2017 later
const MONTHS13 = ['2016-04', '2016-05', '2016-06', '2016-07', '2016-08', '2016-09', '2016-10', '2016-11', '2016-12', '2017-01', '2017-02', '2017-03', '2017-04'];
const SEASONS13 = MONTHS13.map((m, i) => row(800 + i * 100, m, i < 8 ? 'can' : i === 8 ? 'now' : 'later', { base: i < 8 ? 'can' : i === 8 ? 'now' : 'later', boards: 'todo' }));

const tests = {
  lists_every_season() {
    const html = pages.catalogPage(ROWS, CTX);
    assert.ok(html.startsWith('<!doctype html>'));
    assert.ok(html.includes('<title>Coliseum Catalog</title>'));
    assert.ok(html.includes('<h1>Coliseum Catalog</h1>'));
    assert.deepStrictEqual([...html.matchAll(/<div class="row [^"]*" id="q(\d+)"/g)].map((m) => Number(m[1])), [800, 900, 1000, 1100], 'one row per season, oldest first');
    assert.ok(html.includes('<img width="320" height="70" src="/web/colosseum/img/v3/800.png" alt="">'), 'the season card');
    assert.ok(rowHtml(html, 900).includes('Coliseum · May 2016'), 'season name');
    assert.ok(rowHtml(html, 900).includes('10 tiers · 3–5 AP per round'), 'tiers and AP');
    assert.ok(rowHtml(html, 900).includes('Boards: 6★ Scrooge · Tier 10 Bonus'), 'board names');
  },
  states_and_buttons() {
    const html = pages.catalogPage(ROWS, CTX);
    const kept = rowHtml(html, 800), can = rowHtml(html, 900), now = rowHtml(html, 1000), later = rowHtml(html, 1100);
    assert.ok(/class="row pinned"/.test(kept) && kept.includes('data-show="kept"'));
    assert.ok(kept.includes('data-pin="/web/colosseum/unkeep"') && kept.includes('Remove from the Coliseum'), 'Remove button on the kept season');
    assert.ok(kept.includes('Kept: the Coliseum plays this season'));
    assert.ok(/class="row can"/.test(can) && can.includes('data-pin="/web/colosseum/keep/900"') && can.includes('Keep in the Coliseum'), 'Keep on a past season');
    assert.ok(can.includes('Replaces: Coliseum · April 2016'), 'what a keep replaces');
    assert.ok(/class="row now"/.test(now) && !now.includes('data-pin='), 'no button on the season of the Story');
    assert.ok(now.includes('Season of your Story'));
    assert.ok(/class="row off"/.test(later) && !later.includes('data-pin=') && later.includes('Unlocks at Story Quest 250'));
    const other = pages.catalogPage([row(1100, '2016-07', 'other')], CTX);
    assert.ok(!other.includes('data-pin=') && rowHtml(other, 1100).includes('Its month starts this week'), 'other: reached, not the season, no keep');
    // the shared keep script (catalog-pages.js keepJs): POSTs under /web/colosseum
    assert.ok(html.includes('function kxKeep(') && html.includes('"/web/colosseum/unkeep"'));
    assert.ok(html.includes('id="pinmsg"'));
  },
  // after a Remove or a keep of another season, the old kept row returns to its own state (data-base: now / later ...), not to
  // «can be kept» (final review M2, ruling 10: a kept season can sit on the story month or later)
  keep_script_restores_base() {
    const rows = [row(800, '2016-04', 'can', { base: 'can' }), row(900, '2016-05', 'kept', { base: 'now' }), row(1000, '2016-06', 'other', { base: 'other' }),
      row(1100, '2016-07', 'later', { base: 'later' })];
    const html = pages.catalogPage(rows, CTX);
    assert.ok(rowHtml(html, 900).includes('data-base="now"') && rowHtml(html, 800).includes('data-base="can"'));
    const p = fakeRows(html);
    assert.strictEqual(p.view(900).button, '/web/colosseum/unkeep');
    // keep April: May goes back to the season of the Story, no button, «plays again when you remove»
    p.kx(800, 1);
    assert.deepStrictEqual([p.view(800).show, p.view(800).button], ['kept', '/web/colosseum/unkeep']);
    assert.deepStrictEqual([p.view(900).show, p.view(900).cls, p.view(900).button], ['now', 'row now', null]);
    assert.ok(p.view(900).pill.includes('Season of your Story (it plays again when you remove the kept season)'), p.view(900).pill);
    assert.ok(!p.view(900).pill.includes('can be kept'));
    // remove April: April can be kept again, May is the season of the Story now
    p.kx(800, 0);
    assert.deepStrictEqual([p.view(800).show, p.view(800).button], ['can', '/web/colosseum/keep/800']);
    assert.ok(p.view(800).pill.includes('Past season — can be kept'));
    assert.deepStrictEqual([p.view(900).show, p.view(900).button], ['now', null]);
    assert.ok(p.view(900).pill.includes('Season of your Story now'), p.view(900).pill);
    assert.deepStrictEqual([p.view(1000).show, p.view(1100).show], ['other', 'later'], 'rows never kept are untouched');
    // a kept season later than the Story (the rotation looped back): Remove restores its own «later» line
    const q = fakeRows(pages.catalogPage([row(800, '2016-04', 'now', { base: 'now' }), row(1100, '2016-07', 'kept', { base: 'later' })], CTX));
    assert.ok(q.view(800).pill.includes('it plays again when you remove'));
    q.kx(1100, 0);
    assert.deepStrictEqual([q.view(1100).show, q.view(1100).cls, q.view(1100).button], ['later', 'row off', null]);
    assert.ok(q.view(1100).pill.includes('Unlocks at Story Quest 250'), q.view(1100).pill);
    assert.ok(q.view(800).pill.includes('Season of your Story now'));
    // a row without data-base (older rows) falls back to «can be kept», as the Raid / Event Catalogs
    const r = fakeRows(pages.catalogPage([row(800, '2016-04', 'kept'), row(900, '2016-05', 'can')], CTX));
    r.kx(900, 1);
    assert.deepStrictEqual([r.view(800).show, r.view(800).button], ['can', '/web/colosseum/keep/800']);
  },
  progress_line() {
    const html = pages.catalogPage(ROWS, CTX);
    assert.ok(rowHtml(html, 800).includes('Cleared up to Tier 2, Round 1 · 77 Coliseum Coins'));
    assert.ok(rowHtml(html, 900).includes('Not played yet'));
  },
  locked() {
    const html = pages.catalogPage(ROWS.map((r) => ({ ...r, state: r.state === 'kept' ? 'can' : r.state })), { ...CTX, unlocked: false });
    assert.ok(!html.includes('data-pin='), 'no Keep before the Coliseum opens');
    assert.ok(html.includes('The Coliseum opens at Story Quest 130'));
  },
  shared_layout() {
    const html = withPhone(pages.catalogPage(ROWS, CTX));
    assert.ok(html.includes('@media (max-width:700px)'), 'NARROW_CSS of the catalogs (PAGE_HEAD)');
    assert.ok(html.includes('<style data-phone>'), 'the phone 70 % + grid layout');
    assert.ok(/<div id="rows">\s*<div class="row /.test(html), 'rows are direct children of #rows (phone grid #rows>.row)');
    assert.ok(html.includes('class="im"') && html.includes('class="info"') && html.includes('class="nm"'), 'the catalog row parts');
    assert.ok(!html.includes('class="go"'), 'no details page: no «›»');
  },
  // Catalog filters (I-328, user 26-11): the FILTER sheet of catalog-pages.js as the Raid / Event Catalogs; SHOW (state), COLISEUM
  // BOARDS (every node of the season's boards unlocked) and TIER REWARDS (the last rewarded tier cleared), each hiding the right rows
  filters_sheet() {
    const html = pages.catalogPage(FILTER_ROWS, CTX);
    assert.ok(html.includes('<div class="hdr"><h1>Coliseum Catalog</h1><button type="button" class="fbtn" id="fbtn">'), 'the ⚙ Filters button in the header');
    assert.ok(html.includes('id="sheet"') && html.includes('<h4>FIND</h4>') && html.includes('id="fok"') && html.includes('Show 4 results'), 'the shared sheet');
    for (const [g, title, vals] of [['show', 'SHOW', ['all', 'now', 'can', 'kept', 'later']], ['bd', 'COLISEUM BOARDS', ['all', 'done', 'todo']], ['tr', 'TIER REWARDS', ['all', 'done', 'todo']]]) {
      const i = html.indexOf(`<h4>${title}</h4><div class="opts" data-g="${g}">`);
      assert.ok(i > 0, `group ${title}`);
      const box = html.slice(i, html.indexOf('</div>', i));
      assert.deepStrictEqual([...box.matchAll(/data-v="(\w+)"/g)].map((m) => m[1]), vals, `${title} options`);
    }
    assert.ok(html.includes('Completed') && html.includes('Not completed') && html.includes('All taken') && html.includes('Not all taken'));
    assert.ok(rowHtml(html, 800).includes('data-boards="done"') && rowHtml(html, 800).includes('data-tiers="done"'));
    assert.ok(rowHtml(html, 900).includes('data-boards="todo"') && rowHtml(html, 900).includes('data-tiers="todo"'));
    assert.ok(rowHtml(html, 900).includes('data-search="May 2016 | 6★ Scrooge | Tier 10 Bonus"'), 'FIND: month and board names');
    assert.ok(html.includes('<div class="sum" id="sum">') && html.includes('id="none"'));
  },
  filters_hide_rows() {
    const p = fakePage(pages.catalogPage(FILTER_ROWS, CTX));
    const shown = () => p.rows.filter((r) => !/ hide/.test(r.className)).map((r) => Number(r.attrs['data-eid']));
    assert.deepStrictEqual(shown(), [800, 900, 1000, 1100], 'no filter: every season');
    assert.ok(p.el('sum').innerHTML.includes('4 seasons') && p.el('sum').innerHTML.includes('no filters'));
    const f = (s) => { p.win.kxFilter(s); return shown(); };
    assert.deepStrictEqual(f({ bd: 'done' }), [800], 'Coliseum Boards: completed');
    assert.deepStrictEqual(f({ bd: 'todo' }), [900, 1000], 'Coliseum Boards: not completed (a season without boards is neither)');
    assert.deepStrictEqual(f({ tr: 'done' }), [800, 1000], 'Tier rewards: all taken');
    assert.deepStrictEqual(f({ tr: 'todo' }), [900, 1100], 'Tier rewards: not all taken');
    assert.deepStrictEqual(f({ show: 'kept' }), [800]);
    assert.deepStrictEqual(f({ show: 'can' }), [900]);
    assert.deepStrictEqual(f({ show: 'later' }), [1100]);
    assert.deepStrictEqual(f({ show: 'now' }), [1000]);
    assert.deepStrictEqual(f({ show: 'can', bd: 'done' }), [], 'filters combine');
    assert.ok(p.el('none').textContent.includes('No seasons match your filters'));
    assert.ok(p.el('sum').innerHTML.includes('Coliseum Boards: ') && p.el('sum').innerHTML.includes('Clear all'), p.el('sum').innerHTML);
    assert.deepStrictEqual(f({ q: 'vampire' }), [1100], 'FIND: a board name');
    assert.deepStrictEqual(f({ q: 'june' }), [1000], 'FIND: the month');
    assert.deepStrictEqual(f({}), [800, 900, 1000, 1100]);
    // a keep re-applies the filters with the new state: May kept, «Kept» now shows May
    p.win.kxFilter({ show: 'kept' });
    p.win.kxRow('900', 1);
    assert.deepStrictEqual(shown(), [900]);
  },
  filters_phone_layout() {
    const html = withPhone(pages.catalogPage(FILTER_ROWS, CTX));
    // every chip class of the sheet has its «on» colour (special-pages.js CSS, the same chips as the Raid / Event Catalogs), on desktop
    // and in the phone page (phone-css.js keeps the colours, only sizes change)
    const chips = [...new Set([...html.matchAll(/class="o ((?:st|bd|pr)-\w+)/g)].map((m) => m[1]))].sort();
    assert.deepStrictEqual(chips, ['bd-done', 'bd-todo', 'pr-done', 'pr-todo', 'st-can', 'st-kept', 'st-later', 'st-now']);
    for (const c of chips) assert.ok(html.includes(`.o.${c}.on{background:`), `chip ${c} styled`);
    assert.ok(html.includes('.o.pr-done.on{background:#b8860b') && html.includes('.o.pr-todo.on{background:#5a6470'), 'tier chips as the PROGRESS chips of the catalogs');
    assert.ok(/<div id="rows">\s*<div class="row /.test(html), 'rows stay direct children of #rows (phone cards #rows>.row)');
    assert.ok(html.includes('#rows>.row.hide') || html.includes('#rows>.row.hide,'), 'phone CSS hides filtered cards');
    assert.ok(html.includes('.fbtn{flex:0 0 auto!important'), 'the phone header keeps the Filters button on the title line');
  },
  // Year tabs (user 26-11, I-328): the game years of the other catalogs (gacha.js GAME_YEARS, April 7 to April 7), «All years» first,
  // a tab only for a year with seasons; a season is in the game year of its start, as the Raid / Event / Special cards (April 2017
  // starts on April 1: Launch year)
  year_tabs() {
    const tabsOf = (html) => [...html.matchAll(/<button type="button" class="tab[^"]*" data-p="(\w+)"><b>([^<]+)<\/b><small>[^<]*<\/small><span class="c" id="tc\w+">(\d+)<\/span>/g)].map((m) => [m[1], m[2], Number(m[3])]);
    const html = pages.catalogPage(SEASONS13, CTX);
    assert.deepStrictEqual(tabsOf(html), [['all', 'All years', 13], ['0', 'Launch year', 13]], 'the 13 seasons: Launch year only');
    assert.ok(/<div class="tabs" id="tabs">[\s\S]*?<\/div><div class="tabline"><\/div>/.test(html), 'tabs + tab line as the other catalogs');
    assert.ok(rowHtml(html, 2000).includes('data-p="0"') && rowHtml(html, 1500).includes('data-p="0"'), 'April 2017: the year of its start');
    // a later season (2017-05, Year 2) gets its own tab; switching tabs hides the other year's rows
    const more = [...SEASONS13, row(2100, '2017-05', 'later', { base: 'later', boards: 'todo' })];
    const h2 = pages.catalogPage(more, CTX);
    assert.deepStrictEqual(tabsOf(h2), [['all', 'All years', 14], ['0', 'Launch year', 13], ['1', 'Year 2', 1]]);
    const p = fakePage(h2);
    const shown = () => p.rows.filter((r) => !/ hide/.test(r.className)).map((r) => Number(r.attrs['data-eid']));
    assert.strictEqual(shown().length, 14, 'All years');
    p.win.kxFilter({ p: '1' });
    assert.deepStrictEqual(shown(), [2100], 'Year 2');
    assert.ok(p.el('sum').innerHTML.includes('1 season') && p.el('sum').innerHTML.includes('in <b>Year 2</b>'), p.el('sum').innerHTML);
    p.win.kxFilter({ p: '0' });
    assert.strictEqual(shown().length, 13, 'Launch year (April 2017 included, May 2017 not)');
    assert.ok(!shown().includes(2100));
    // tabs and filters together: tab counts follow the filters, the tab stays
    p.win.kxFilter({ p: '1', show: 'later' });
    assert.deepStrictEqual(shown(), [2100]);
    assert.deepStrictEqual([p.el('tcall').textContent, p.el('tc0').textContent, p.el('tc1').textContent].map(String), ['5', '4', '1'], 'counts of the filtered seasons per tab');
    p.win.kxFilter({ p: '1', show: 'can' });
    assert.deepStrictEqual(shown(), []);
    assert.ok(p.el('none').textContent.includes('No seasons match'));
  },
  year_tabs_phone() {
    const html = withPhone(pages.catalogPage(SEASONS13, CTX));
    assert.ok(html.includes('<style data-phone>') && html.includes('.fbtn,.tab,.yc,.pk,.o,button{min-height:30px}'), 'phone tap floor of the tabs');
    assert.ok(/<div class="tabline"><\/div>(<div class="sum"|[\s\S]*?)<div id="rows">\s*<div class="row /.test(html), 'the tabs sit outside #rows: the card grid is unchanged');
  },
  empty() {
    const html = pages.catalogPage([], CTX);
    assert.ok(html.includes('No Coliseum season is served yet.'));
  },
  escapes() {
    const html = pages.catalogPage([row(800, '2016-04', 'can', { boardIds: [1] })], { ...CTX, boardName: () => '<b>x</b>' });
    assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;') && !html.includes('<b>x</b>'));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`ok ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.stack}`); }
}
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log('test-colosseum-pages: ok');
