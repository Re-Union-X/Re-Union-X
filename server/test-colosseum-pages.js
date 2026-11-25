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
