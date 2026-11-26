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
    assert.ok(html.includes('class="go"'), 'a details page per season: «›» (hidden on phones)');
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
  // Board cards on the rows (26-11, as the Avatar Board Catalog): every board of the season, its web card at a versioned URL
  // (lazy, kxNb placeholder on error), the neutral box when the card is not in cards.json, bonus boards with their tier
  board_cards_on_rows() {
    const ctx = { ...CTX, boardImgVersion: 77, boardCard: (id) => id !== 2200023, bonusTier: (id) => (id === 2200023 ? 10 : null) };
    const html = pages.catalogPage(ROWS, ctx);
    const may = rowHtml(html, 900);
    assert.ok(may.includes('<div class="bcs">'), 'the card strip');
    assert.ok(/<div class="lc"><a class="im" href="[^"]*"><img [^>]*><\/a><div class="bcs">/.test(may), 'v2: the board cards under the season card (left column)');
    assert.ok(!/<div class="info">[\s\S]*class="bcs"/.test(may), 'not in the text column');
    assert.ok(html.includes('.lc{flex:0 0 320px;'), 'left column as wide as the card');
    assert.ok(may.includes('<img width="44" height="44" src="/web/colosseum/board/v77/2200002.png" loading="lazy" alt="" onerror="kxNb(this)">'), 'versioned, lazy, placeholder on error');
    assert.ok(!may.includes('/2200023.png') && may.includes('<span class="nb"></span>'), 'no card: the neutral box');
    assert.ok(may.includes('<b class="bt">Tier 10</b>'), 'the bonus board marked with its tier');
    assert.strictEqual((may.match(/class="bk"/g) || []).length, 2, 'one tile per board');
    assert.ok(rowHtml(html, 800).includes('/web/colosseum/board/v77/2200001.png') && !rowHtml(html, 800).includes('class="bt"'));
    assert.ok(rowHtml(html, 1000).includes('<div class="bcs"><span class="nob">No Coliseum Board</span></div>'), 'a season without boards keeps the strip height');
    assert.ok(html.indexOf('function kxNb(') < html.indexOf('<div id="rows">'), 'kxNb defined before the rows (an image can fail while loading)');
    // a row opens its detail page (the card, the name and «›»)
    assert.ok(may.includes('<a class="im" href="/web/colosseum/season/900?from=catalog">') && may.includes('<a class="nm" href="/web/colosseum/season/900?from=catalog">')
      && may.includes('<a class="go" href="/web/colosseum/season/900?from=catalog"'));
    // without the card lookup (no cards.json): no picture at all
    assert.ok(!pages.catalogPage(ROWS, CTX).includes('/web/colosseum/board/'), 'no cards.json: neutral boxes only');
  },
  // Phone 640x320 (user 26-11): the state pill and the button line up across a row of cards whatever the length of the progress
  // line: .pg is two lines high (clamped) as the dates of the other catalogs, the board strip has a fixed height
  phone_cards_aligned() {
    const html = withPhone(pages.catalogPage(ROWS, CTX));
    assert.ok(/#rows>\.row \.pg[,{][^}]*-webkit-line-clamp:2[^}]*height:2\.8em/.test(html), 'progress line: two lines, fixed height');
    assert.ok(/#rows>\.row \.bcs\{[^}]*height:44px/.test(html) || /\.bcs\{[^}]*height:44px/.test(html), 'board strip: fixed height');
  },
  // the hash of the catalog: #p<tab> selects that year tab (written on every render, so the WebView back key returns to it)
  hash_tab() {
    const more = [...SEASONS13, row(2100, '2017-05', 'later', { base: 'later', boards: 'todo' })];
    const html = pages.catalogPage(more, CTX);
    const rows = [...html.matchAll(/<div class="row [^"]*"[^>]*>/g)].map((m) => { const a = Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]])); return { attrs: a, className: a.class, getAttribute: (k) => (k in a ? a[k] : null), q: {}, querySelector() { return null; } }; });
    const ids = {}, el = (id) => (ids[id] ||= { id, innerHTML: '', textContent: '', style: {}, value: '', getAttribute: () => null });
    let replaced = null;
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
    const win = {}, loc = { hash: '#p1', pathname: '/web/colosseum/catalog', search: '' };
    require('vm').runInNewContext(scripts, { window: win, location: loc, history: { replaceState: (a, b, h) => { replaced = h; } },
      document: { body: { className: '' }, getElementById: el, querySelectorAll: (sel) => (sel === '#rows .row' ? rows : []) } });
    assert.deepStrictEqual(rows.filter((r) => !/ hide/.test(r.className)).map((r) => Number(r.attrs['data-eid'])), [2100], '#p1: Year 2');
    assert.strictEqual(replaced, null, 'the address already holds the tab');
    win.kxFilter({ p: '0' });
    assert.strictEqual(replaced, '#p0', 'a tab change is written into the address');
    loc.hash = '#p0';
    win.kxFilter({});
    assert.strictEqual(replaced, '/web/colosseum/catalog', 'All years: the tab leaves the address');
  },
  // Season detail page (26-11, as the Raid Catalog detail page)
  detail_page() {
    const rows = [row(800, '2016-04', 'kept', { base: 'can' }), row(900, '2016-05', 'can', { base: 'can', boardIds: [2200002, 2200023], coins: 123, userRank: 2, userStageCount: 5, userStageTotalCount: 25 })];
    const det = { boards: [{ id: 2200002, name: '6★ Scrooge', served: true, nodes: 22, unlocked: 5, coinsLeft: 900, coinsTotal: 1000, bonusTier: null },
      { id: 2200023, name: 'Tier 10 Bonus', served: true, nodes: 10, unlocked: 10, coinsLeft: 0, coinsTotal: 300, bonusTier: 10 }],
    tiers: [{ tier: 1, rounds: 20, endless: false, ap: 3, roundCoins: 1, coins: 30, items: [{ type: 3, id: 90013, num: 1 }], taken: true },
      { tier: 2, rounds: 15, endless: false, ap: 3, roundCoins: 2, coins: 40, items: [{ type: 3, id: 90015, num: 2 }], taken: false },
      { tier: 3, rounds: 999, endless: true, ap: 5, roundCoins: 3, coins: 0, items: [], taken: false }],
    best: 25, ranked: [{ startRank: 1, endRank: 100, rounds: 200, reached: false, rewards: [{ type: 3, id: 90125, num: 3, skillId: 1101 }] },
      { startRank: 101, endRank: 1000, rounds: 20, reached: true, rewards: [{ type: 3, id: 90016, num: 1 }] }], maps: 'worldwide' };
    const NAMES = { 90013: 'Goofy', 90015: 'Donald', 90125: 'Scrooge', 90016: 'Chip' };
    const ctx = { ...CTX, boardImgVersion: 5, boardCard: (id) => id === 2200002, itemName: (type, id) => NAMES[id] || '', skillName: (id) => (id === 1101 ? 'Attack Boost' : ''), fromCatalog: true };
    const html = pages.detailPage(rows, 900, det, ctx);
    assert.ok(html.startsWith('<!doctype html>') && html.includes('<h1>Coliseum · May 2016</h1>'));
    assert.ok(html.includes('src="/web/colosseum/img/v3/900.png"'), 'the season card');
    // boards: card, name, nodes, coins still needed; bonus with its tier; a completed board
    const boards = html.slice(html.indexOf('id="sec-boards"'), html.indexOf('id="sec-tiers"'));
    assert.ok(boards.includes('src="/web/colosseum/board/v5/2200002.png"') && boards.includes('<span class="nb"></span>'), 'card, or the box without one');
    assert.ok(boards.includes('6★ Scrooge') && boards.includes('5</b> / 22') && boards.includes('900 Coliseum Coins'), boards);
    assert.ok(boards.includes('Unlocks at Tier 10') && boards.includes('Completed'), 'bonus board, completed');
    // tiers: rounds (the endless one as the game shows it), AP, rewards and the taken ones
    const tiers = html.slice(html.indexOf('id="sec-tiers"'), html.indexOf('id="sec-ranked"'));
    assert.ok(tiers.includes('30 Coliseum Coins') && tiers.includes('Goofy') && tiers.includes('Donald <b class="v">x2</b>'), tiers);
    assert.ok(/<tr class="got">[\s\S]*?Taken/.test(tiers) && tiers.includes('Not taken yet'));
    assert.ok(tiers.includes('999') && tiers.includes('endless'), 'endless tier');
    // thresholds: brackets top first, the rounds needed, prizes, reached ones marked
    const sc = html.slice(html.indexOf('id="sec-ranked"'), html.indexOf('id="sec-maps"'));
    assert.ok(sc.indexOf('1st – 100th') < sc.indexOf('101st – 1,000th'), 'top first');
    assert.ok(sc.includes('200 rounds') && sc.includes('Scrooge <b class="v">x3</b></span> <span class="sk">(Attack Boost)</span>') && /<tr class="got">[\s\S]*?Reached/.test(sc) && sc.includes('Your best: <span class="rd">25 rounds</span>') && !sc.includes('</span>: clear') && html.includes('Score thresholds</h2><span class="ng">NOT ORIGINAL</span>'), sc);
    // maps: the wording of the «Coliseum» notice and a link to it
    const maps = html.slice(html.indexOf('id="sec-maps"'));
    assert.ok(maps.includes('original') && maps.includes('2016 worldwide game files') && maps.includes('href="/web/notices#coliseum"'));
    assert.ok(pages.detailPage(rows, 900, { ...det, maps: 'japanese' }, ctx).includes('Japanese version'));
    assert.ok(pages.detailPage(rows, 900, { ...det, maps: 'generated' }, ctx).includes('generated maps'));
    // Keep / Remove: the same button as the row; BACK to the row of the catalog
    assert.ok(html.includes('data-pin="/web/colosseum/keep/900"') && html.includes('Replaces: Coliseum · April 2016'));
    assert.ok(pages.detailPage(rows, 800, det, ctx).includes('data-pin="/web/colosseum/unkeep"'));
    assert.ok(html.includes('<a class="back" href="/web/colosseum/catalog#q900">BACK'), 'BACK bar');
    assert.ok(!pages.detailPage(rows, 900, det, { ...ctx, fromCatalog: false }).includes('class="back"'));
    assert.ok(html.includes('function kxKeep('), 'the keep script');
    assert.strictEqual(pages.detailPage(rows, 31, det, ctx), null, 'unknown season');
    // v2 (user 26-11): section cards with a header band and an icon, colours for values (gold), rounds (cyan), taken / reached (green),
    // not yet (muted), tier and board names emphasized
    for (const k of ['season', 'boards', 'tiers', 'ranked', 'maps']) assert.ok(new RegExp(`<div class="cs" id="sec-${k}"><div class="csh"><img class="ic"`).test(html), `section ${k}`);
    assert.ok(tiers.includes('<span class="yes">Taken') && tiers.includes('<span class="mu">Not taken yet</span>') && tiers.includes('<span class="tn">Tier 1</span>'));
    assert.ok(sc.includes('<span class="yes">Reached') && sc.includes('<span class="mu">Not reached</span>') && boards.includes('<span class="tn">6★ Scrooge</span>'));
    assert.ok(boards.includes('<span class="cc">900 Coliseum Coins</span>') && tiers.includes('<span class="cc">30 Coliseum Coins</span>'));
    assert.ok(/\.yes\{color:#6fd47f/.test(html) && /\.mu\{color:#8fa9ba/.test(html) && /\.csh h2\{[^}]*color:#ffcd4a/.test(html), 'the colours');
    // the Keep / Remove button of the box: class pkd, compact on phones
    assert.ok(html.includes('class="pk pkd" data-id="900"'));
    // phone: the 70 % layout of the other detail pages
    const ph = withPhone(html);
    assert.ok(ph.includes('<style data-phone>') && ph.includes('html{zoom:.7}') && ph.includes('table{table-layout:auto!important}'));
    assert.ok(/[;}']\.pkd\{[^}]*width:auto!important[^}]*min-height:26px[^}]*font-size:13px!important/.test(ph), 'compact Keep / Remove on phones');
  },
  // the whole row opens the season page (user 26-11, as the Raid / Event Catalog rows): a tap on the row, its card strip or the
  // empty space navigates; a tap on a link (name, card, Keep / Remove) or a button keeps its own action
  row_link() {
    const html = pages.catalogPage(ROWS, CTX);
    assert.ok(rowHtml(html, 900).includes('data-href="/web/colosseum/season/900?from=catalog"'));
    const rows = [...html.matchAll(/<div class="row [^"]*"[^>]*>/g)].map((m) => { const a = Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
      return { attrs: a, className: a.class, getAttribute: (k) => (k in a ? a[k] : null), setAttribute() {}, q: {}, querySelector() { return null; }, tagName: 'DIV' }; });
    const ids = {}, el = (id) => (ids[id] ||= { id, innerHTML: '', textContent: '', style: {}, value: '', getAttribute: () => null });
    const loc = { hash: '', href: '' };
    const sel = (q) => (q === '#rows .row' ? rows : []);
    require('vm').runInNewContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join(String.fromCharCode(10)),
      { window: {}, location: loc, history: {}, document: { body: { className: '' }, getElementById: el, querySelectorAll: sel, createElement: () => ({}) } });
    const may = rows.find((r) => r.attrs['data-eid'] === '900');
    const strip = { tagName: 'SPAN', parentNode: { tagName: 'DIV', parentNode: may } };
    may.onclick({ target: strip });
    assert.strictEqual(loc.href, '/web/colosseum/season/900?from=catalog', 'a tap on the board strip opens the season');
    loc.href = '';
    may.onclick({ target: { tagName: 'A', parentNode: { tagName: 'DIV', parentNode: may } } });
    assert.strictEqual(loc.href, '', 'the Keep / Remove link keeps its own action');
    may.onclick({ target: may });
    assert.strictEqual(loc.href, '/web/colosseum/season/900?from=catalog', 'the empty space of the row');
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
