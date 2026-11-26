// Event Catalog pages (Events Part 1, plan docs/superpowers/plans/2026-11-06-events-part1-framework.md Task 5): the catalogue by
// month with the states of calendar-util.js rowState, the details page with its «On this server» box, the original notice page
// (text read at request time from git-ignored data) and the kept event. Synthetic fixtures only (no notice text of the game).
//   node server/test-event-pages.js
'use strict';
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const pages = require('./event-pages');
const routesEvents = require('./routes-events');
const avatarBoards = require('./avatar-boards');
const { rowState } = require('./calendar-util');
// the catalogue with its rows written out (sent packed since Events Part 4 Task 4, as the Raid Catalog: catalog-pages.js packCatalog)
const catalog = (...a) => pages.expandCatalog(pages.catalogPage(...a));
// the Avatar Board Catalog (Task 5b), packed the same way
const boardCatalog = (...a) => pages.expandCatalog(pages.boardCatalogPage(...a));

const REASONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'event_config.json'), 'utf8')).reconstructedWhy;
const REASON_TEXT = JSON.parse(fs.readFileSync(path.join(__dirname, 'event_config.json'), 'utf8')).reasonText;
const quest = (stageId, extra = {}) => ({ key: `k${stageId}`, stageId, name: `Quest ${stageId}`, ap: 5, level: 10, served: true, status: 'served', why: null, labels: [], ...extra });
const NOT_SERVED = (stageId, why) => quest(stageId, { served: false, status: 'not served yet', why });
// the player's Shop week: 2019-04-08 .. 04-14. E-0 past (can), E-1 now, E-3 later, E-9 no served quest (removed)
const INDEX = () => ({ reasons: REASONS, catalog: { evStageId: 20000, stageIds: [970000], useAp: [0] }, entries: [
  { censusId: 'E-0', evStageId: 29900, name: 'March Fun', start: '2019-03-01', end: '2019-03-07', stageIds: [4009904], available: true, labels: ['dramaOff', 'eventCoins'], noticeIds: [9001],
    quests: [quest(4009904, { labels: ['donorKept'] }), NOT_SERVED(4009905, 'enemies not in the master: 2001234, 2001235')] },
  { censusId: 'E-1', evStageId: 29901, name: 'April Fun', start: '2019-04-01', end: '2019-04-14', stageIds: [4009901], available: true, labels: [], noticeIds: [9002], quests: [quest(4009901)] },
  { censusId: 'E-3', evStageId: 29903, name: 'May Fun', start: '2019-05-01', end: '2019-05-07', stageIds: [4009903], available: true, labels: ['wholeDay'], days: ['2019-05-02'], noticeIds: [],
    quests: [quest(4009903)] },
  { censusId: 'E-9', evStageId: 29909, name: 'Lost Fun', start: '2019-03-10', end: '2019-03-12', stageIds: [], available: false, labels: [], noticeIds: [],
    quests: [NOT_SERVED(4009910, 'enemies not in the master: 2009999')] },
] });
// BOARD entries (Events Part 7 Task 5) as make-events.js writes them, joined with a fixture game_data/avatar_boards.json: B-0 past
// (Red Coat served at 3000, Blue Coat held priceUnknown in that window, Lost Coat held by the builder), B-1 in the story week, a
// khuxwiki-dated entry (its key is its id), B-9 with no served board
const boardEntry = (cid, evStageId, start, end, boards, extra = {}) => ({ censusId: cid, evStageId, name: `Avatar Boards: ${boards.map((b) => b.name).join(', ')}`, type: 'BOARD', start, end,
  stageIds: [], quests: [], useAp: null, label: 'original', labels: [], noticeIds: [], available: false, reason: 'avatarBoards', noQuests: 'avatarBoards', boardSet: null,
  avatarBoards: [{ key: extra.key || `${cid}/outfit`, group: 'outfit', type: 2, window: [start, end], price: extra.price || 3000, labels: extra.labels || [], boards }], ...(extra.held ? { held: extra.held } : {}) });
const AVATAR_DOC = () => ({ index: {
  5000001: { key: 'B-0/outfit', group: 'outfit', type: 2, donorId: 9001, name: 'Red Coat', price: 3000, windows: [{ key: 'B-0/outfit', censusId: 'B-0', window: ['2019-03-04', '2019-03-17'], price: 3000, labels: [] }] },
  5000003: { key: 'B-1/gem', group: 'gem', type: 2, donorId: 9003, name: 'Gem Board', price: 2000, windows: [{ key: 'B-1/gem', censusId: 'B-1', window: ['2019-04-08', '2019-04-21'], price: 2000, labels: [] }] },
  5000005: { key: 'khuxwiki@2019-02-01/outfit', group: 'outfit', type: 2, donorId: 9005, name: 'Wiki Coat', price: 2000,
    windows: [{ key: 'khuxwiki@2019-02-01/outfit', censusId: null, window: ['2019-02-01', '2019-02-10'], price: 2000, labels: ['windowFromWiki'] }] },
}, report: { held: [{ donorId: 9002, name: 'Blue Coat', why: 'priceUnknown', keys: ['B-0/outfit'] }, { donorId: 9004, name: 'Grey Coat', why: 'unpayable cells (medal 1 not found)' }],
  records: { held: [], unmapped: [] } } });
const BOARD_INDEX = () => {
  const ix = INDEX();
  ix.entries.push(boardEntry('B-0', 29920, '2019-03-04', '2019-03-17', [{ donorId: 9001, name: 'Red Coat' }, { donorId: 9002, name: 'Blue Coat' }],
    { labels: ['priceFromKhuxwiki'], held: [{ donorId: 9009, name: 'Lost Coat', why: 'rewardMissing: cell 2: medal «X» not in our medal table (windows: 2019-03-04..2019-03-17)' }] }));
  ix.entries.push({ ...boardEntry('B-1', 29921, '2019-04-08', '2019-04-21', [{ donorId: 9003, name: 'Gem Board' }]), name: 'Gem Boards',
    avatarBoards: [{ key: 'B-1/gem', group: 'gem', type: 2, window: ['2019-04-08', '2019-04-21'], price: 2000, labels: ['windowFromNotice'], boards: [{ donorId: 9003, name: 'Gem Board' }] }] });
  ix.entries.push(boardEntry('khuxwiki@2019-02-01/outfit', 29922, '2019-02-01', '2019-02-10', [{ donorId: 9005, name: 'Wiki Coat' }],
    { key: 'khuxwiki@2019-02-01/outfit', price: 2000, labels: ['windowFromWiki'] }));
  ix.entries.push(boardEntry('B-9', 29929, '2019-03-11', '2019-03-17', [{ donorId: 9004, name: 'Grey Coat' }]));
  ix.avatarHeld = [{ donorId: 9100, name: 'Draw Ticket Board 1', why: 'windowUnknown: no dated notice' }];
  return avatarBoards.catalogIndex(ix, AVATAR_DOC());
};
// a High Score Challenge entry as make-events.js writes it (Part 8 Task 6): brackets and thresholds lowest bracket -> top
const hscEntry = () => ({ censusId: 'H-1', evStageId: 29930, name: 'High Score Fun', type: 'HSC', start: '2019-03-15', end: '2019-03-21', stageIds: [4009930], available: true,
  labels: ['hscThresholds'], noticeIds: [], quests: [quest(4009930)],
  hsc: { era: 'B', rankingId: 8001, scoreMedalListId: 0, scoreStartReward: 800100, scoreEndReward: 800101, donorRankingId: 6049, scoreBonus: [26],
    milestones: [{ score: 1000, rewards: [{ type: 2, id: 0, num: 5, name: '5 Jewels' }], scoreRewardId: 800100 }, { score: 5000, rewards: [{ type: 3, id: 90011, num: 1, name: '6★ Quest Medal' }], scoreRewardId: 800101 }],
    brackets: [{ startRank: 51, endRank: 100, rewards: [{ type: 2, id: 0, num: 5 }] }, { startRank: 11, endRank: 50, rewards: [{ type: 2, id: 0, num: 20 }] },
      { startRank: 1, endRank: 10, rewards: [{ type: 2, id: 0, num: 50 }, { type: 3, id: 90011, num: 1, name: '6★ Quest Medal' }] }],
    thresholds: [{ startRank: 51, endRank: 100, score: 2000, label: 'interpolated' }, { startRank: 11, endRank: 50, score: 6000, label: 'scaled' },
      { startRank: 1, endRank: 10, score: 9000, label: 'original' }] } });
const ctx = (extra = {}) => ({ shopFrom: '2019-04-08', shopTo: '2019-04-14', current: new Set(['E-1']), kept: null, imgVersion: 1, unlockQuestOf: () => 612, ...extra });
// one catalogue row (its opening div to the next one)
function rowOf(html, id) {
  const i = html.indexOf(`id="q${id}"`);
  assert(i >= 0, `row q${id} present`);
  const start = html.lastIndexOf('<div class="row', i), end = html.indexOf('<div class="row', i);
  return html.slice(start, end < 0 ? html.length : end);
}
// A minimal DOM of the catalogue page for its year-tab and filter script (run in vm, ES5 as in the WebView): the rows and month
// labels of #rows, the tabs with their counts, the chips of the Filters sheet, the ids the script reads. apply(f) drives the
// sheet as a player does (Filters, Reset, a chip per group, FIND, «Show N results»); shown() = the evStageIds of the rows shown.
function fakePage(raw, hash = '') {
  const html = pages.expandCatalog(raw);
  const attrsOf = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const mk = (tag = '<x>') => {
    const e = { attrs: attrsOf(tag), textContent: '', innerHTML: '', value: '', style: {}, children: [], parentNode: null, q: {}, qa: {} };
    e.className = e.attrs.class || '';
    e.getAttribute = (k) => (k in e.attrs ? e.attrs[k] : null);
    e.setAttribute = (k, v) => { e.attrs[k] = String(v); };
    e.querySelector = (sel) => e.q[sel] || null;
    e.querySelectorAll = (sel) => e.qa[sel] || [];
    return e;
  };
  const rowsHtml = html.slice(html.indexOf('<div id="rows">'), html.indexOf('<div id="pinmsg"'));
  const kids = [...rowsHtml.matchAll(/<div class="(?:row [^"]*|ml)"[^>]*>/g)].map((m) => { const e = mk(m[0]); e.q['.mt'] = mk('<div class="mt">'); return e; });
  const byId = {};
  for (const id of ['sum', 'fdot', 'none', 'fbtn', 'fx', 'dim', 'fq', 'freset', 'fok']) byId[id] = mk(`<x id="${id}">`);
  byId.rows = mk('<div id="rows">');
  byId.rows.children = kids;
  for (const k of kids) if (k.attrs.id) byId[k.attrs.id] = k;
  byId.tabs = mk(/<div class="tabs"[^>]*>/.exec(html)[0]);
  byId.tabs.qa['.tab'] = [...html.matchAll(/<button type="button" class="tab[^"]*" data-p="\w+">/g)].map((m) => { const t = mk(m[0]); t.q['.c'] = mk(); t.parentNode = byId.tabs; return t; });
  const boxes = [...html.matchAll(/<div class="opts" data-g="(\w+)">([\s\S]*?)<\/div>/g)].map((m) => {
    const box = mk(`<div class="opts" data-g="${m[1]}">`);
    box.children = [...m[2].matchAll(/<button type="button" class="o[^"]*" data-v="[^"]*"[^>]*>/g)].map((c) => { const o = mk(c[0]); o.parentNode = box; return o; });
    return box;
  });
  let loads = 0;
  const doc = { body: { className: '' }, getElementById: (id) => byId[id] || null, querySelectorAll: (sel) => (sel === '.sheet .opts' ? boxes : []) };
  const win = {};
  const src = /<script>(\(function\(\)\{\/\* year tabs and filters \*\/[\s\S]*?)<\/script>/.exec(raw);
  assert.ok(src, 'filter script');
  require('vm').runInNewContext(src[1], { document: doc, location: { hash }, window: win, kxImgs: () => { loads++; } });
  const box = (g) => boxes.find((b) => b.attrs['data-g'] === g);
  const chip = (g, v) => box(g).children.find((o) => o.attrs['data-v'] === v);
  const apply = (f) => {
    byId.fbtn.onclick();
    byId.freset.onclick({ preventDefault() {} });
    for (const g of ['show', 'prog', 'bd', 'hs', 'type']) if (f[g]) box(g).onclick({ target: chip(g, f[g]) });
    if (f.q) { byId.fq.value = f.q; byId.fq.oninput.call(byId.fq); }
    const fok = byId.fok.textContent;
    byId.fok.onclick();
    return fok;
  };
  const shown = () => kids.filter((k) => /(^| )row /.test(k.className) && !/ hide/.test(k.className)).map((k) => Number(k.attrs['data-eid']));
  const tab = (p) => byId.tabs.onclick({ target: byId.tabs.qa['.tab'].find((t) => t.attrs['data-p'] === p) });
  return { html, kids, byId, boxes, chip, apply, shown, tab, win, loads: () => loads };
}
const NOTICE_LINE = 'Fixture line of an event notice, never in the repository.';
const DOC = () => ({ rows: { 'E-0': { noticeIds: [9001] } }, notices: { 9001: { title: 'March Fun notice', date: '2019-02-28', time: '07:00', category: 'EVENT',
  body: ['● March Fun', NOTICE_LINE, '・ a list line', 'Potion x 3'] } } });

const tests = {
  // rows by month (month labels in date order), each with the state of rowState: now / can / kept / later / removed
  catalog_by_period() {
    const html = catalog(INDEX(), ctx());
    const months = [...html.matchAll(/<div class="ml" data-m="([\d-]+)">([^<]+)<\/div>/g)].map((m) => [m[1], m[2]]);
    assert.deepStrictEqual(months, [['2019-03', 'March 2019'], ['2019-04', 'April 2019'], ['2019-05', 'May 2019']]);
    const show = (id) => (/data-show="(\w+)"/.exec(rowOf(html, id)) || [])[1];
    for (const e of INDEX().entries) assert.strictEqual(show(e.evStageId), rowState(e, ctx()), e.censusId);
    assert.deepStrictEqual([29900, 29901, 29903, 29909].map(show), ['can', 'now', 'later', 'removed']);
    assert.ok(rowOf(html, 29903).includes('Unlocks at Story Quest 612'));
    assert.ok(rowOf(html, 29909).includes('Not built yet'), 'a record with no served quest is listed, never hidden');
    const kept = catalog(INDEX(), ctx({ kept: 'E-0' }));
    assert.strictEqual((/data-show="(\w+)"/.exec(rowOf(kept, 29900)) || [])[1], 'kept');
    assert.ok(rowOf(kept, 29900).includes('Remove from Events'));
    assert.ok(html.includes('Event Catalog') && html.includes('/web/event/event/29900?from=catalog'));
  },
  // only a past event can be kept: the page offers Keep only there, and the route refuses the others
  keep_past_only() {
    const html = catalog(INDEX(), ctx());
    assert.ok(rowOf(html, 29900).includes('data-pin="/web/event/keep/29900"'), 'past: Keep');
    for (const id of [29901, 29903, 29909]) assert.ok(!rowOf(html, id).includes('class="pk'), `no Keep on ${id}`);
    const player = {};
    const ev = routesEvents({ player, savePlayer() {}, masterRows: () => [], eventIndex: INDEX, storyWeek: () => ({ shopFrom: '2019-04-08', shopTo: '2019-04-14' }),
      realNow: () => Date.parse('2026-11-03T20:00:00Z'), serverTimeAt: String, clock: { weekEnd: (x) => x, dayEnd: (x) => x }, stageState: () => ({}), grantItem() {}, grantObjective() {},
      webBase: '', log() {} });
    assert.deepStrictEqual(ev.keep(29901).body, { ok: false, why: 'now' }, 'current');
    assert.deepStrictEqual(ev.keep(29903).body, { ok: false, why: 'later' }, 'future');
    assert.deepStrictEqual(ev.keep(29909).body, { ok: false, why: 'removed' }, 'nothing served');
    assert.deepStrictEqual(ev.keep(29900).body, { ok: true });
    assert.strictEqual(player.events.kept, 'E-0');
  },
  // a kept census id the index no longer has (a record dropped): inert in the lists, cleared when the catalogue opens
  kept_unknown_cleared() {
    const player = { events: { kept: 'E-GONE', cleared: {} } };
    let saves = 0;
    const ev = routesEvents({ player, savePlayer() { saves++; }, masterRows: () => [], eventIndex: INDEX, storyWeek: () => ({ shopFrom: '2019-04-08', shopTo: '2019-04-14' }),
      realNow: () => Date.parse('2026-11-03T20:00:00Z'), serverTimeAt: String, clock: { weekEnd: (x) => x, dayEnd: (x) => x }, stageState: () => ({}), grantItem() {}, grantObjective() {},
      webBase: '', log() {} });
    assert.strictEqual(ev.catalogCtx().kept, null, 'unknown: not kept');
    assert.deepStrictEqual(ev.events().map((e) => e.eventStageId), [29901], 'no kept card');
    assert.strictEqual(player.events.kept, 'E-GONE', 'listing never writes the save');
    ev.pruneKept();
    assert.strictEqual(player.events.kept, null);
    assert.strictEqual(saves, 1);
    ev.pruneKept();
    assert.strictEqual(saves, 1, 'nothing to clear: no save');
    // a known kept event stays
    player.events.kept = 'E-0';
    ev.pruneKept();
    assert.strictEqual(player.events.kept, 'E-0');
  },
  // the original notice: from the doc handed in (git-ignored data read at request time), laid out in the Original notice card;
  // without the doc or the notice a friendly page; the text is never in the repository
  notice_page_private() {
    const html = pages.noticePage(INDEX(), 29900, DOC(), { ...ctx(), from: 'event' });
    assert.ok(html.includes(NOTICE_LINE) && html.includes('<div class="onc">') && html.includes('Original notice'));
    assert.ok(html.includes('<table class="rw">') && html.includes('<ul class="nl">'), 'laid out as the raid notices');
    assert.ok(html.includes('href="/web/event/event/29900?from=catalog"'), 'BACK to the details page');
    assert.ok(html.includes('On this server'));
    const none = pages.noticePage(INDEX(), 29900, null, ctx());
    assert.ok(/not available/i.test(none) && !none.includes(NOTICE_LINE));
    assert.ok(/not available/i.test(pages.noticePage(INDEX(), 29901, DOC(), ctx())), 'no notice for that event');
    assert.ok(/not available/i.test(pages.noticePage(INDEX(), 1, DOC(), ctx())), 'unknown id: a page, not an error');
    for (const f of ['event-pages.js', 'catalog-pages.js', 'server.js', 'make-event-notices.js']) {
      assert.ok(!fs.readFileSync(path.join(__dirname, f), 'utf8').includes('SQUARE ENIX BRIDGE |'), f);
    }
  },
  // the details page: the merged «On this server» box at the top, every label in use (event and quests) with its reason,
  // Rebuilt values closed; quests not served yet shown with the reason in plain words
  on_this_server_box() {
    const html = pages.detailPage(INDEX(), 29900, { ...ctx(), fromCatalog: true, hasNotice: (id) => id === 'E-0' });
    const box = html.slice(html.indexOf('<div class="sb">'), html.indexOf('<h2>'));
    assert.ok(box.includes('On this server') && box.includes('NOT ORIGINAL'));
    // the Keep / Remove button of a detail page: the shared compact phone class (phone-css.js DETAIL_KEEP)
    assert.ok(box.includes('class="pk pkd" data-id="29900"'), 'Event detail: the shared compact keep button');
    // section cards and colour roles (detail-cards.js, user 26-11)
    for (const k of ['event', 'quests']) assert.ok(html.includes('<div class="cs" id="sec-%s"><div class="csh"><img class="ic"'.replace('%s', k)), `card ${k}`);
    assert.ok(html.includes('<table class="tt kn1 kc2 kg3">') && /<td><span class="rd">[^<]+<\/span><\/td>/.test(html), 'colour roles: quest columns, dates cyan');
    assert.ok(/<details class="rb">/.test(box) && !/<details class="rb" open/.test(box), 'Rebuilt values closed');
    for (const l of ['dramaOff', 'eventCoins', 'donorKept']) assert.ok(box.includes(REASONS[l].replace(/'/g, '&#39;')) || box.includes(REASONS[l]), `reason of ${l}`);
    assert.ok(box.includes('Past event'), 'status');
    assert.ok(box.includes('data-pin="/web/event/keep/29900"'), 'Keep button in the box');
    assert.ok(box.includes('/web/event/notice/29900?from=event'), 'link to the original notice');
    assert.ok(box.includes('/web/event/catalog'), 'link to the catalogue');
    assert.ok(html.indexOf('<div class="sb">') < html.indexOf('<h2>'), 'box first');
    assert.ok(html.includes('Not served yet') && /being searched/.test(html), 'not served quest in plain words');
    assert.ok(!html.includes('2001234'), 'no enemy id for the player');
    assert.ok(html.includes('href="/web/event/catalog#q29900"'), 'BACK');
    assert.strictEqual(pages.detailPage(INDEX(), 12345, ctx()), null, 'unknown id');
    // a record with nothing served: listed with its quests and why
    const lost = pages.detailPage(INDEX(), 29909, ctx());
    assert.ok(lost.includes('Not built yet') && lost.includes('Not served yet'));
  },
  // the shared parts are one module: the raid pages use it (no copy of the box, bands or notice card CSS)
  // one card per original evStage row (Part 2 Task 5): the catalogue keeps one entry per record, its details page lists the rows
  // (card, dates, quests) and the Details of a row card (its own id) open the record's notice and details
  rows_listed() {
    const ix = INDEX();
    ix.entries[0].rows = [{ evStageId: 29900, start: '2019-03-01', end: '2019-03-07', stageIds: [4009904], quests: 1, available: true },
      { evStageId: 29930, start: '2019-03-02', end: '2019-03-02', days: ['2019-03-02'], stageIds: [], quests: 1, available: false }];
    const cat = catalog(ix, ctx());
    assert.strictEqual((cat.match(/class="row /g) || []).length, 4, 'one catalogue row per record');
    assert.ok(!cat.includes('id="q29930"'));
    const d = pages.detailPage(ix, 29900, ctx());
    assert.ok(d.includes('<h2>Cards</h2>') && d.includes('Mar 2, 2019'), 'the rows with dates');
    assert.ok(!d.includes('/img/v1/29930.png'), 'no card image for a row not built (its card is never written)');
    assert.ok(/Not served yet/.test(d.slice(d.indexOf('<h2>Cards</h2>'))), 'a row without a served quest says so');
    assert.ok(pages.detailPage(ix, 29930, ctx()).includes('<h1>March Fun</h1>'), 'a row id opens the record');
    assert.ok(pages.noticePage(ix, 29930, DOC(), ctx()).includes(NOTICE_LINE), 'Details of a row card: the record notice');
  },
  // Part 3 Task 6: an entry with a board set lists its boards and their cells; the unlocked cells are marked done (every cell of a
  // served board has a cost and a reward since 08-11: no «not restored yet» cell)
  event_board_items() {
    const ix = INDEX();
    ix.entries[0].boardSet = 'S1';
    ix.boardSets = { S1: { boardIds: [7001, 7002], chains: { 7002: 7001 }, censusIds: ['E-0', 'E-1'] } };
    const boards = {
      7001: { id: 7001, name: 'Board #1: Fixture', done: false, finish: 'Fixture Medal', cells: [{ n: 1, cost: 100, reward: 'Fixture Gem', done: true }, { n: 2, cost: 200, reward: 'Jewels x50', done: false },
        { n: 3, cost: 900, reward: 'Fixture Medal x2', done: true }, { n: 5, cost: 1000, reward: 'Jewels x500', done: false }] },
      7002: { id: 7002, name: 'Board #2: Fixture', done: true, finish: '', cells: [{ n: 3, cost: 50, reward: 'Max HP +3', done: true }] },
    };
    const c = ctx({ eventBoard: (id) => boards[id] || null, eventCoins: () => 1234 });
    const d = pages.detailPage(ix, 29900, c);
    const sec = d.slice(d.indexOf('<h2>Event Boards</h2>'));
    assert.ok(sec.length < d.length, 'an Event Boards section');
    assert.ok(sec.includes('Board #1: Fixture') && sec.includes('Board #2: Fixture'), 'both boards, in set order');
    assert.ok(sec.indexOf('Board #1') < sec.indexOf('Board #2'));
    const b1 = sec.slice(sec.indexOf('Board #1'), sec.indexOf('Board #2'));
    assert.ok(b1.includes('Fixture Medal x2') && b1.includes('Jewels x500') && b1.includes('900') && b1.includes('1,000'), 'rewards and costs');
    assert.strictEqual((b1.match(/class="cd"/g) || []).length, 2, 'two unlocked cells carry the done mark (1 and 3)');
    assert.ok(!/Not restored yet/.test(sec), 'no pass-through cell any more');
    assert.strictEqual((b1.match(/<td>Not unlocked<\/td>/g) || []).length, 2);
    assert.ok(b1.includes('Board complete') && b1.includes('Fixture Medal'), 'the reward of the finished board');
    assert.ok(sec.includes('Max HP +3'));
    // an entry without a set, or a master without that board: no section, no error
    assert.ok(!pages.detailPage(ix, 29901, c).includes('Event Boards</h2>'), 'no set: no section');
    assert.ok(!pages.detailPage(ix, 29900, ctx()).includes('<h2>Event Boards</h2>'), 'no lookups: no section');
    assert.ok(!pages.detailPage(ix, 29900, ctx({ eventBoard: () => null, eventCoins: () => 0 })).includes('<h2>Event Boards</h2>'), 'no board served: no section');
  },
  // user 08-11: an informative notice with no original banner and no quest (noQuests 'board', e.g. EV-0579 «New Event Coins
  // Available in October!») is not an event: not in the catalogue, no page. A playable event with a banner whose quests are not
  // served yet stays listed with its reason (E-9), and so does a coin event with its card (noQuests 'coin', EV-0242)
  informative_notice_not_listed() {
    const ix = INDEX();
    ix.entries.push({ censusId: 'E-579', evStageId: 29979, name: 'New Coins Notice', start: '2019-03-20', end: '2019-04-20', stageIds: [], available: false, labels: [], noticeIds: [9003],
      quests: [], noQuests: 'board', boardSetKey: 'S1', reason: 'board', why: 'no quests of its own' },
    { censusId: 'E-242', evStageId: 29942, name: 'Coin Challenge', start: '2019-03-21', end: '2019-03-28', stageIds: [], available: false, labels: [], noticeIds: [], quests: [], noQuests: 'coin', reason: 'coin' });
    ix.boardSets = { S1: { boardIds: [7001], chains: {}, censusIds: ['E-0', 'E-579'] } };
    const html = catalog(ix, ctx());
    assert.ok(!html.includes('id="q29979"') && !html.includes('New Coins Notice'), 'the informative notice is not listed');
    assert.ok(rowOf(html, 29909).includes('Not built yet'), 'an unserved playable event stays');
    assert.ok(rowOf(html, 29942), 'a coin event with its card stays');
    assert.ok(/data-p="all"><b>All years<\/b><small>[^<]*<\/small><span class="c">5<\/span>/.test(html), 'not counted');
    assert.strictEqual(pages.detailPage(ix, 29979, ctx({ eventBoard: () => ({ id: 7001, name: 'B', done: false, finish: '', cells: [] }) })), null, 'no page');
    // the boards stay reachable through the playable event of the set
    ix.entries[0].boardSet = 'S1';
    const d = pages.detailPage(ix, 29900, ctx({ eventBoard: (id) => ({ id, name: 'Board #1: Fixture', done: false, finish: '', cells: [] }), eventCoins: () => 7 }));
    assert.ok(d.includes('<h2>Event Boards</h2>') && d.includes('Board #1: Fixture'));
  },
  // Part 3 Task 8: «shared by N events» counts only the events listed in the catalogue (an informative notice of the set, like
  // EV-0579 on the 2018-10 pages, is not counted: 9 censusIds, 8 listed events)
  shared_count_listed_only() {
    const ix = INDEX();
    ix.entries.push({ censusId: 'E-579', evStageId: 29979, name: 'New Coins Notice', start: '2019-03-20', end: '2019-04-20', stageIds: [], available: false, labels: [], noticeIds: [9003],
      quests: [], noQuests: 'board', boardSetKey: 'S1', reason: 'board', why: 'no quests of its own' });
    ix.entries[0].boardSet = 'S1'; ix.entries[1].boardSet = 'S1';
    ix.boardSets = { S1: { boardIds: [7001], chains: {}, censusIds: ['E-0', 'E-1', 'E-579'] } };
    const c = ctx({ eventBoard: () => ({ id: 7001, name: 'Board #1', done: false, finish: '', cells: [] }), eventCoins: () => 0 });
    const line = (/<p class="ecoin">(.*?)<\/p>/.exec(pages.detailPage(ix, 29900, c)) || [])[1] || '';
    assert.ok(line.includes('shared by 2 events'), line);
    // only one listed event left in the set: no «shared by» at all
    ix.boardSets.S1.censusIds = ['E-0', 'E-579'];
    const one = (/<p class="ecoin">(.*?)<\/p>/.exec(pages.detailPage(ix, 29900, c)) || [])[1] || '';
    assert.ok(!/shared by/.test(one), one);
  },
  // the coin line: the balance of the set and the note that coins never expire (one balance per set, shared by its events)
  event_coins_label() {
    const ix = INDEX();
    ix.entries[0].boardSet = 'S1';
    ix.boardSets = { S1: { boardIds: [7001], chains: {}, censusIds: ['E-0', 'E-1'] } };
    const c = ctx({ eventBoard: () => ({ id: 7001, name: 'Board #1', done: false, finish: '', cells: [] }), eventCoins: (k) => (k === 'S1' ? 1234 : 0) });
    const d = pages.detailPage(ix, 29900, c);
    const line = (/<p class="ecoin">(.*?)<\/p>/.exec(d) || [])[1] || '';
    assert.ok(line.includes('1,234'), line);
    assert.ok(/never expire/i.test(line) && /one balance/i.test(line), line);
    assert.ok(line.includes('2 events'), 'the set is shared by its events');
    // texts: paid now, and the two reasons a set is not handed out
    const e = ix.entries[0];
    e.labels = ['eventCoins', 'boardsLater'];
    e.quests[0].labels = ['noCoinSource'];
    const r = pages.detailPage(ix, 29900, ctx());
    assert.ok(!/not paid yet|come with the event boards/i.test(r), 'no stale text');
    assert.ok(/Boosters/.test(r) && /no quest pays/i.test(r), 'short texts of boardsLater and noCoinSource');
  },
  shared_parts_not_copied() {
    const src = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
    for (const f of ['raid-pages.js', 'event-pages.js']) {
      assert.ok(src(f).includes("require('./catalog-pages')"), f);
      assert.ok(!src(f).includes('.rg>b{display:block'), `${f}: no copy of the band CSS`);
      assert.ok(!src(f).includes('.onc{border:1px solid'), `${f}: no copy of the notice card CSS`);
    }
  },
  // Events Part 4 Task 4: about 340 events in place of 110; a fixture of 400 entries with 6 quests each stays under the budget
  // (the Raid Catalog's: about 100 KB, 150 KB at most), with one row per event and the year tabs usable
  catalog_size_budget() {
    const entries = [];
    for (let i = 0; i < 400; i++) {
      const y = 2018 + Math.floor(i / 100), m = String(1 + (Math.floor(i / 9) % 12)).padStart(2, '0'), d = String(1 + (i % 27)).padStart(2, '0');
      entries.push({ censusId: `EV-${1000 + i}`, evStageId: 21000 + i, name: `Challenge Event Number ${i}: The Long Name`, start: `${y}-${m}-${d}`, end: `${y}-${m}-${d}`,
        stageIds: [4001000 + i * 6], available: i % 3 !== 0, labels: ['wholeDay', 'dramaOff'], noticeIds: [1],
        quests: Array.from({ length: 6 }, (_, k) => (k < 2 ? quest(4001000 + i * 6 + k, { labels: ['donorKept'] }) : NOT_SERVED(4001000 + i * 6 + k, 'enemies not in the master: 2001234'))) });
    }
    const raw = pages.catalogPage({ reasons: REASONS, entries }, ctx({ current: new Set() })), html = pages.expandCatalog(raw);
    const kb = Buffer.byteLength(raw, 'utf8') / 1024;
    assert.ok(kb < 150, `catalogue ${kb.toFixed(1)} KB`);
    assert.strictEqual((html.match(/<div class="row /g) || []).length, 400, 'one row per event');
    assert.deepStrictEqual([...new Set([...html.matchAll(/data-y="(\d+)"/g)].map((x) => x[1]))], ['2018', '2019', '2020', '2021'], 'year of every row (the year tabs)');
  },
  // Part 4 Task 6 (review minor M6): game-year tabs as the Raid Catalog's (All years + one tab per game year with events, count),
  // every row and month label carries its game year; the tab of the player's Story week is open first and only its rows load
  // their cards (lazy loading per tab: kxImgs after the tab filter, never right after the rows are built)
  catalog_year_tabs() {
    const ix = INDEX();
    ix.entries.push({ censusId: 'E-7', evStageId: 29907, name: 'Old Fun', start: '2018-06-01', end: '2018-06-07', stageIds: [4009907], available: true, labels: [], noticeIds: [], quests: [quest(4009907)] },
      { censusId: 'E-8', evStageId: 29908, name: 'Early April', start: '2019-04-02', end: '2019-04-05', stageIds: [4009908], available: true, labels: [], noticeIds: [], quests: [quest(4009908)] });
    const raw = pages.catalogPage(ix, ctx()), html = pages.expandCatalog(raw);
    const tabs = [...raw.matchAll(/<button type="button" class="tab( on)?" data-p="(\w+)"><b>([^<]*)<\/b><small>[^<]*<\/small><span class="c">(\d+)<\/span>/g)].map((m) => [m[2], m[3], Number(m[4]), !!m[1]]);
    // shopFrom 2019-04-08 is game year 3 (Apr 7, 2019 -> Apr 6, 2020): open first; 2019-03 and 2019-04-02 are game year 2
    assert.deepStrictEqual(tabs, [['all', 'All years', 6, false], ['2', 'Year 3', 5, false], ['3', 'Year 4', 1, true]]);
    assert.ok(/<div class="tabs" id="tabs" data-def="3">/.test(raw), 'default tab = game year of the Story week');
    assert.strictEqual(rowOf(html, 29907).match(/data-p="(\d)"/)[1], '2');
    assert.strictEqual(rowOf(html, 29908).match(/data-p="(\d)"/)[1], '2', 'April 2-5 is still the year before the anniversary');
    assert.strictEqual(rowOf(html, 29903).match(/data-p="(\d)"/)[1], '3');
    // the page script: rows built first, then the tab filter, then the cards of the shown rows only
    assert.ok(!/kxImgs\(\);<\/script>/.test(raw.split('id="kxrows"')[1].split('</script>')[1] + '</script>'), 'no card load before the tab filter');
    // run the tab and filter script on the page: only the rows of the open tab are shown, the month label of a hidden month is hidden
    const fp = fakePage(raw), labels = () => fp.kids.filter((k) => k.className.startsWith('ml')).map((k) => [k.attrs['data-m'], !/ hide/.test(k.className)]);
    assert.deepStrictEqual(fp.shown(), [29903]);
    assert.deepStrictEqual(labels(), [['2018-06', false], ['2019-03', false], ['2019-04', false], ['2019-05', true]]);
    assert.ok(fp.loads() >= 1, 'cards of the open tab requested after the filter');
    assert.deepStrictEqual(fp.byId.tabs.qa['.tab'].map((t) => / on/.test(t.className)), [false, false, true]);
    fp.tab('all');
    assert.strictEqual(fp.shown().length, 6, 'All years shows every row');
    fp.tab('2');
    assert.deepStrictEqual(fp.shown(), [29907, 29900, 29909, 29901, 29908]);
    assert.ok(/^<span class="n1">5 events<\/span> in <b>Year 3<\/b> · no filters$/.test(fp.byId.sum.innerHTML), fp.byId.sum.innerHTML);
    // a keep / remove keeps a hidden row hidden (ROWS_JS setRow)
    assert.ok(/el\.className='row '\+pc\[0\]\+\(\/ hide\/\.test\(el\.className\)\?' hide':''\)/.test(raw), 'setRow keeps the tab filter');
  },
  // Filters (user 13-11: «filters like the Raid Catalog»): the «⚙ Filters» button and the sheet with FIND, SHOW, PROGRESS, TYPE in
  // the Raid Catalog's order; TYPE lists only the kinds of the index; every row carries data-type / data-done / data-search
  catalog_filter_sheet() {
    const ix = INDEX();
    ix.entries[1].type = 'GEM';
    ix.entries[2].type = 'QUIZ';
    const raw = pages.catalogPage(ix, ctx()), html = pages.expandCatalog(raw);
    assert.ok(raw.includes('<div class="hdr"><h1>Event Catalog</h1><button type="button" class="fbtn" id="fbtn">⚙ Filters<span class="dot" id="fdot"></span></button></div>'));
    const sheet = html.slice(html.indexOf('<div class="sheet" id="sheet"'), html.indexOf('<div id="pinmsg"'));
    assert.deepStrictEqual([...sheet.matchAll(/<h4>([^<]+)<\/h4>/g)].map((m) => m[1]), ['FIND', 'SHOW', 'PROGRESS', 'EVENT BOARDS', 'TYPE']);
    assert.ok(sheet.includes('placeholder="Event, quest or reward name"') && /<div class="hint">Matches the start of words/.test(sheet));
    const group = (g) => [...((new RegExp(`<div class="opts" data-g="${g}">([\\s\\S]*?)</div>`).exec(sheet) || [])[1] || '').matchAll(/data-v="([^"]+)"[^>]*>(?:<img[^>]*>)?([^<]+)</g)].map((m) => [m[1], m[2]]);
    assert.deepStrictEqual(group('show'), [['all', 'All events'], ['now', 'In Events now'], ['can', 'Can be kept now'], ['kept', 'Kept'], ['later', 'Later in the Story'], ['removed', 'Not built yet']]);
    assert.deepStrictEqual(group('prog'), [['all', 'All'], ['done', 'Completed'], ['todo', 'Incomplete']]);
    // only the kinds in the index (E-0 and E-9 have no type: Event Quests), in the order of the list
    assert.deepStrictEqual(group('type'), [['all', 'All'], ['EQ', 'Event Quests'], ['GEM', 'Gem Quests'], ['QUIZ', 'Quizzes']]);
    assert.ok(/<div class="foot"><a href="#" class="reset" id="freset">Reset filters<\/a><button type="button" class="ok" id="fok">Show 1 result<\/button><\/div>/.test(sheet), 'results of the open tab');
    assert.ok(raw.includes('<div class="sum" id="sum">') && raw.includes('<div id="none" class="none" style="display:none"></div>'));
    for (const e of ix.entries) {
      const r = rowOf(html, e.evStageId);
      assert.ok(new RegExp(`data-type="${e.type || 'EQ'}" data-done="[01]" data-boards="(done|todo|none)" data-search="[^"]+">`).test(r), `data attributes of ${e.censusId}`);
      assert.ok(r.includes('<div class="mt"></div>'), 'the «Matches:» line');
    }
    // the narrow layout of the shared catalogues applies (NARROW_CSS: full-width button, one chip per row)
    assert.ok(raw.includes('@media (max-width:700px) and (min-height:481px){') && raw.includes('.fbtn{-webkit-flex:1 1 100%'));
    for (const m of raw.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(m[1]); // eslint-disable-line no-new-func
  },
  // FIND: event and quest names (served or not), the type, the Event Board names and rewards (without amounts and stat cells) and
  // the objective rewards of the served quests (ctx.questRewards), each once; PROGRESS: every served quest with all its objectives
  // done (the crown), an event with no served quest is never completed (the Raid Catalog's rule: incomplete)
  catalog_filter_data() {
    const ix = INDEX();
    ix.entries[0].boardSet = 'S1';
    ix.boardSets = { S1: { boardIds: [7001, 7002], chains: {}, censusIds: ['E-0'] } };
    const boards = { 7001: { id: 7001, name: 'Spooky Board', done: false, finish: 'Pumpkin Hat', cells: [{ n: 1, cost: 5, reward: 'Mythril Shard x3', done: false }, { n: 2, cost: 5, reward: 'Max HP +5', done: false }] } };
    let calls = 0;
    const c = ctx({ eventBoard: (id) => { calls++; return boards[id] || null; }, questRewards: (id) => (id === 4009904 ? ['Dewey', 'Jewels', 'Mythril Shard'] : id === 4009905 ? ['Hidden Reward'] : []),
      stageDone: (id) => id === 4009904 || id === 4009910 });
    const html = catalog(ix, c), search = (id) => (/data-search="([^"]*)"/.exec(rowOf(html, id)) || [])[1].split(' | ');
    // a numbered series (Quest 4009904, Quest 4009905) counts once by its name without the number
    assert.deepStrictEqual(search(29900), ['March Fun', 'Quest', 'Event Quests', 'Spooky Board', 'Mythril Shard', 'Pumpkin Hat', 'Dewey', 'Jewels']);
    assert.ok(!search(29900).includes('Hidden Reward'), 'only the rewards of the served quests');
    assert.strictEqual(calls, 2, 'each board asked once');
    assert.deepStrictEqual(search(29909), ['Lost Fun', 'Quest 4009910', 'Event Quests']);
    const ix3 = INDEX();
    ix3.entries[1].quests = ['Organization XIII No. 11 Marluxia I', 'Organization XIII No. 11 Marluxia XIII', 'Coco Challenge 1/10', 'Coco Challenge 10/10', 'The Hidden Menace: Advanced #2',
      'The Hidden Menace: Advanced #3', 'Mickey 90th Anniversary Quiz'].map((name, k) => quest(4009930 + k, { name }));
    assert.deepStrictEqual(catalog(ix3, ctx()).match(/id="q29901"[^>]*data-search="([^"]*)"/)[1].split(' | '),
      ['April Fun', 'Organization XIII No. 11 Marluxia', 'Coco Challenge', 'The Hidden Menace: Advanced', 'Mickey 90th Anniversary Quiz', 'Event Quests']);
    const done = (id) => (/data-done="(\d)"/.exec(rowOf(html, id)) || [])[1];
    // E-0: its one served quest done (the unserved one does not count); E-9: no served quest -> not completed even if its stage is
    assert.deepStrictEqual([29900, 29901, 29903, 29909].map(done), ['1', '0', '0', '0']);
    assert.ok(rowOf(html, 29900).includes('class="ic cw"') && !rowOf(html, 29909).includes('class="ic cw"'), 'the crown of a completed event');
    // the catalogue name and the census name are both found
    const ix2 = INDEX();
    ix2.entries[1].catalogName = 'Spring Party';
    assert.deepStrictEqual(catalog(ix2, ctx()).match(/id="q29901"[^>]*data-search="([^"]*)"/)[1].split(' | ').slice(0, 2), ['Spring Party', 'April Fun']);
  },
  // the filters at work in the page script: SHOW (now + kept), PROGRESS, TYPE, FIND with «Matches:», the summary chips, the
  // counts of the tabs and of «Show N results», the empty-state line, Clear all; a keep re-renders (kxRender)
  catalog_filter_script() {
    const ix = INDEX();
    ix.entries[2].type = 'QUIZ';
    ix.entries.push({ censusId: 'E-7', evStageId: 29907, name: 'Old Fun', start: '2018-06-01', end: '2018-06-07', stageIds: [4009907], available: true, labels: [], noticeIds: [], quests: [quest(4009907)] });
    const raw = pages.catalogPage(ix, ctx({ kept: 'E-7', stageDone: (id) => id === 4009904, questRewards: (id) => (id === 4009901 ? ['Dewey'] : []) }));
    const fp = fakePage(raw), sum = () => fp.byId.sum.innerHTML;
    fp.tab('all');
    assert.deepStrictEqual(fp.shown(), [29907, 29900, 29909, 29901, 29903]);
    assert.strictEqual(fp.apply({ show: 'now' }), 'Show 2 results');
    assert.deepStrictEqual(fp.shown(), [29907, 29901], 'In Events now: the event of the week and the kept one');
    assert.ok(sum().startsWith('<span class="n1">2 events</span> match your filters: <span class="tag">') && sum().includes('In Events now') && sum().includes('Clear all'));
    assert.strictEqual(fp.byId.fdot.textContent, 1);
    assert.deepStrictEqual(fp.byId.tabs.qa['.tab'].map((t) => [t.attrs['data-p'], t.q['.c'].textContent]), [['all', 2], ['2', 2], ['3', 0]]);
    fp.apply({ show: 'kept' });
    assert.deepStrictEqual(fp.shown(), [29907]);
    fp.apply({ show: 'removed' });
    assert.deepStrictEqual(fp.shown(), [29909]);
    fp.apply({ prog: 'done' });
    assert.deepStrictEqual(fp.shown(), [29900]);
    assert.ok(sum().includes('Completed'));
    fp.apply({ prog: 'todo' });
    assert.deepStrictEqual(fp.shown(), [29907, 29909, 29901, 29903], 'an event with no served quest is incomplete');
    fp.apply({ type: 'QUIZ' });
    assert.deepStrictEqual(fp.shown(), [29903]);
    fp.apply({ q: 'dew' });
    assert.deepStrictEqual(fp.shown(), [29901], 'a quest reward');
    const mt = fp.byId.q29901.q['.mt'];
    assert.deepStrictEqual([mt.textContent, mt.style.display], ['Matches: Dewey', 'block'], 'shown over the .mt{display:none} of the CSS');
    assert.ok(sum().includes('Find: &quot;dew&quot;'));
    fp.apply({ q: 'quest 4009903' });
    assert.deepStrictEqual(fp.shown(), [29903], 'a quest name');
    fp.apply({ type: 'QUIZ', prog: 'done' });
    assert.deepStrictEqual(fp.shown(), []);
    assert.deepStrictEqual([fp.byId.none.textContent, fp.byId.none.style.display], ['No completed events match your filters', '']);
    assert.ok(fp.kids.filter((k) => k.className.startsWith('ml')).every((k) => / hide/.test(k.className)), 'no month label without rows');
    fp.byId.sum.onclick.call(fp.byId.sum, { target: { getAttribute: (a) => (a === 'data-x' ? 'all' : null) }, preventDefault() {} });
    assert.strictEqual(fp.shown().length, 5, 'Clear all');
    assert.ok(sum().endsWith(' · no filters'));
    // a keep (ROWS_JS kxRow) changes data-show, then renders the filters again
    fp.apply({ show: 'kept' });
    fp.byId.q29907.attrs['data-show'] = 'can';
    fp.byId.q29900.attrs['data-show'] = 'kept';
    fp.win.kxRender();
    assert.deepStrictEqual(fp.shown(), [29900]);
    assert.ok(/if\(window\.kxRender\)kxRender\(\);\};/.test(raw), 'kxRow renders the filters');
    // BACK from a details page: #q<id> opens the year of that row
    const back = fakePage(raw, '#q29900');
    assert.ok(back.shown().includes(29900));
  },
  // EVENT BOARDS (user 16-11, the Raid Catalog's RAID BOARDS): Completed = every served Event Board of the event's set complete,
  // Not completed = one of them is not, an event without a served board is under neither
  catalog_event_boards_filter() {
    const ix = INDEX();
    ix.entries[0].boardSet = 'S1';
    ix.entries[1].boardSet = 'S2';
    ix.entries[2].boardSet = 'S3'; // its boards are not served (eventBoard -> null)
    ix.entries[2].type = 'QUIZ';
    ix.boardSets = { S1: { boardIds: [7001, 7002], chains: {}, censusIds: ['E-0'] }, S2: { boardIds: [7003], chains: {}, censusIds: ['E-1'] },
      S3: { boardIds: [7009], chains: {}, censusIds: ['E-3'] } };
    const b = (id, done) => ({ id, name: `Board ${id}`, done, finish: '', cells: [] });
    const boards = { 7001: b(7001, true), 7002: b(7002, true), 7003: b(7003, false) };
    const raw = pages.catalogPage(ix, ctx({ eventBoard: (id) => boards[id] || null }));
    const html = pages.expandCatalog(raw), bd = (id) => (/data-boards="(\w+)"/.exec(rowOf(html, id)) || [])[1];
    assert.deepStrictEqual([29900, 29901, 29903, 29909].map(bd), ['done', 'todo', 'none', 'none']);
    assert.ok(/<h4>EVENT BOARDS<\/h4><div class="opts" data-g="bd">/.test(raw), 'the EVENT BOARDS group of the sheet');
    const fp = fakePage(raw);
    fp.tab('all');
    fp.apply({ bd: 'done' });
    assert.deepStrictEqual(fp.shown(), [29900]);
    assert.ok(/Event Boards: <img class="ic" src="[^"]*bdone\.png" alt="">Completed/.test(fp.byId.sum.innerHTML), 'the summary chip');
    fp.apply({ bd: 'todo' });
    assert.deepStrictEqual(fp.shown(), [29901]);
    fp.apply({ bd: 'done', type: 'QUIZ' });
    assert.deepStrictEqual([fp.byId.none.textContent], ['No events with completed Event Boards match your filters']);
    fp.byId.sum.onclick.call(fp.byId.sum, { target: { getAttribute: (a) => (a === 'data-x' ? 'bd' : null) }, preventDefault() {} });
    assert.ok(fp.shown().length > 0, 'the chip × clears EVENT BOARDS');
    // the Avatar Board Catalog has no EVENT BOARDS group
    assert.ok(!pages.boardCatalogPage(ix, ctx()).includes('EVENT BOARDS'));
  },
  // HIGH SCORE (I-276, user 16-11): an HSC whose best run reached the top (rank 1) threshold has received every ranking reward;
  // «Rank 1 reached» / «Not reached», a row that is not an HSC is under neither; no group without an HSC in the index
  catalog_high_score_filter() {
    const ix = INDEX();
    const h1 = hscEntry(), h2 = { ...hscEntry(), censusId: 'H-2', evStageId: 29931, name: 'High Score Two', stageIds: [4009931], quests: [quest(4009931)] };
    ix.entries.push(h1, h2);
    const best = { 'H-1': 9000, 'H-2': 8999 };
    const raw = pages.catalogPage(ix, ctx({ hscBest: (cid) => (cid in best ? best[cid] : null) }));
    const html = pages.expandCatalog(raw), hs = (id) => (/data-hscore="(\w+)"/.exec(rowOf(html, id)) || [])[1];
    assert.deepStrictEqual([29930, 29931, 29900].map(hs), ['top', 'below', undefined]);
    assert.ok(/<h4>HIGH SCORE<\/h4><div class="opts" data-g="hs">/.test(raw), 'the HIGH SCORE group of the sheet');
    const fp = fakePage(raw);
    fp.tab('all');
    fp.apply({ hs: 'top' });
    assert.deepStrictEqual(fp.shown(), [29930]);
    assert.ok(/High Score: .*Rank 1 reached/.test(fp.byId.sum.innerHTML), 'the summary chip');
    fp.apply({ hs: 'below' });
    assert.deepStrictEqual(fp.shown(), [29931]);
    // no best run yet: below; no HSC in the index: no group
    const raw2 = pages.catalogPage(ix, ctx({ hscBest: () => null }));
    assert.strictEqual((/data-hscore="(\w+)"/.exec(rowOf(pages.expandCatalog(raw2), 29930)) || [])[1], 'below');
    assert.ok(!pages.catalogPage(INDEX(), ctx()).includes('HIGH SCORE'), 'no HSC: no group');
  },
  // Booster rewards (boosterLater): a served quest with a Booster says it comes with the Boosters; the new reasons in plain words
  booster_and_new_reasons() {
    const ix = INDEX();
    ix.entries[1].quests[0].boosters = [{ objective: 1, emblemName: 'P Booster +25%' }];
    ix.entries[1].quests[0].labels = ['boosterLater'];
    ix.entries[1].quests.push(quest(4009920, { served: false, status: 'not served yet', reason: 'quizTextMissing', why: REASON_TEXT.quizTextMissing }),
      quest(4009921, { served: false, status: 'not served yet', reason: 'boosterOnly', why: REASON_TEXT.boosterOnly }));
    const d = pages.detailPage(ix, 29901, ctx());
    assert.ok(/P Booster \+25%.{0,80}comes with the Boosters/.test(d), 'the Booster line of the quest');
    assert.ok(d.includes('Boosters'), 'the rebuilt values name it');
    assert.ok(d.includes(pages.whyPlain(REASON_TEXT.quizTextMissing, 'quizTextMissing')) && /question/i.test(pages.whyPlain(REASON_TEXT.quizTextMissing, 'quizTextMissing')));
    assert.ok(/Booster/.test(pages.whyPlain(REASON_TEXT.boosterOnly, 'boosterOnly')));
    assert.ok(/reward/i.test(pages.whyPlain('', 'rewardTypeUnknown')));
    // Part 5 Task 3: an objective known only as text (objectiveUnmapped), in plain words without the builder's note
    assert.ok(/objective/i.test(pages.whyPlain('x («Clear within 75 seconds»)', 'objectiveUnmapped')) && !/75/.test(pages.whyPlain('x («Clear within 75 seconds»)', 'objectiveUnmapped')));
  },
  // Events Part 7 Task 5, moved to the Avatar Board Catalog by Task 5b (user 15-11): a BOARD entry (make-events.js, avatar board
  // records) joined at run time with game_data/avatar_boards.json (avatar-boards.js catalogIndex): its boards with their price, a
  // held board with its reason in plain words; a board-only entry with no served board is «Not built yet»; the held boards no
  // window places are listed at the end of the Avatar Board Catalog
  board_entry_listed() {
    const ix = BOARD_INDEX();
    const html = boardCatalog(ix, ctx({ current: new Set(['B-1']) }));
    const show = (id) => (/data-show="(\w+)"/.exec(rowOf(html, id)) || [])[1];
    assert.deepStrictEqual([29920, 29921, 29922, 29929].map(show), ['can', 'now', 'can', 'removed']);
    assert.ok(rowOf(html, 29920).includes('1 of 3 avatar boards served'));
    assert.ok(rowOf(html, 29920).includes('data-pin="/web/avatar/keep/29920"'), 'a past BOARD entry can be kept, in its own catalogue');
    assert.ok(rowOf(html, 29920).includes('data-eid="29920"') && /data-type="outfit"/.test(rowOf(html, 29920)), 'TYPE by board group');
    assert.ok(/data-search="[^"]*Red Coat/.test(rowOf(html, 29920)), 'FIND knows its boards');
    assert.ok(rowOf(html, 29921).includes('On sale this week'));
    assert.ok(rowOf(html, 29929).includes('Not built yet') && !rowOf(html, 29929).includes('class="pk'));
    // the held boards with no window in the records: listed with the reason
    assert.ok(html.includes('Draw Ticket Board 1') && html.includes(pages.boardWhyPlain('windowUnknown: no dated notice')));
    const d = pages.boardDetailPage(ix, 29920, ctx());
    assert.ok(d.includes('<h2>Avatar Boards</h2>') && d.includes('Red Coat') && d.includes('3,000 Jewels'));
    assert.ok(d.includes('class="pk pkd" data-id="29920"'), 'Avatar Board detail: the shared compact keep button (phone-css.js DETAIL_KEEP)');
    for (const k of ['entry', 'avatar-boards']) assert.ok(d.includes('<div class="cs" id="sec-%s"><div class="csh"><img class="ic"'.replace('%s', k)), `card ${k}`);
    assert.ok(d.includes('<table class="tt bt ab kn2 kc3 kg4">'), 'board names bold, dates cyan, prices gold');
    assert.ok(/Blue Coat.{0,200}price/i.test(d), 'priceUnknown: never sold at a guessed price');
    assert.ok(/Lost Coat.{0,300}reward/i.test(d) && !d.includes('cell 2: medal'), 'a held board: its reason in plain words, not the builder note');
    assert.ok(!d.includes('<h2>Quests</h2>'), 'no quest table for a board-only entry');
    assert.ok(/original price/.test(d) && /not original|addition of this server/.test(d), 'the keep of past boards is declared');
    assert.ok(/khuxwiki/i.test(d), 'its labels in plain words');
    assert.ok(d.includes('data-pin="/web/avatar/keep/29920"') && d.includes('/web/avatar/catalog'), 'kept from its own catalogue');
    const k = pages.boardDetailPage(ix, 29920, ctx({ kept: 'B-0', boardBought: (id) => id === 5000001 }));
    assert.ok(/Red Coat.{0,200}Bought/.test(k), 'a bought board says so');
    assert.ok(k.includes('Remove from Avatar Boards'), 'the kept entry offers Remove');
    assert.strictEqual(pages.boardDetailPage(ix, 29900, ctx()), null, 'an event without boards has no Avatar Board page');
    // I-311 (24-11): a window dated by an original notice that has no census row (Enhancement Set+ June-Sept 2019, Draw Tickets)
    assert.ok(/original notice/i.test(pages.boardDetailPage(ix, 29921, ctx())), 'label windowFromNotice in plain words');
  },
  // Task 5b: the Event Catalog lists events only; every BOARD entry is in the Avatar Board Catalog, with an event that also sold
  // boards (its boards only there); the BOARD entries have no Event Catalog page and the event keep refuses them
  board_catalog_separate() {
    const ix = BOARD_INDEX();
    // E-0 also sold a board (EV-0741 in the real data): avatarBoards on its own entry
    ix.entries[0].boards = [{ key: 'E-0/outfit', group: 'outfit', type: 2, window: ['2019-03-01', '2019-03-07'], donorId: 9012, name: 'Event Coat', sphereBoardId: 5000012, price: 1000, served: true, why: null }];
    const ev = catalog(ix, ctx({ current: new Set(['E-1', 'B-1']) }));
    for (const id of [29920, 29921, 29922, 29929]) assert.ok(!ev.includes(`id="q${id}"`), `BOARD entry ${id} not in the Event Catalog`);
    for (const id of [29900, 29901, 29903, 29909]) assert.ok(ev.includes(`id="q${id}"`), `event ${id} in the Event Catalog`);
    assert.ok(!ev.includes('data-b="1"') && !/data-type="BOARD"/.test(ev), 'no BOARD row');
    assert.ok(!ev.includes('Draw Ticket Board 1'), 'the undated boards are in the Avatar Board Catalog');
    // user 23-11: no reference to the Avatar Board Catalog at the top of the Event Catalog (reached from its own banner)
    assert.ok(!/Avatar Board Catalog/.test(ev) && !ev.includes('/web/avatar/catalog'), 'no Avatar Board Catalog reference in the Event Catalog');
    assert.strictEqual(pages.detailPage(ix, 29920, ctx()), null, 'no Event Catalog page for a BOARD entry');
    const bc = boardCatalog(ix, ctx({ current: new Set(['B-1']) }));
    for (const id of [29900, 29920, 29921, 29922, 29929]) assert.ok(bc.includes(`id="q${id}"`), `entry ${id} in the Avatar Board Catalog`);
    for (const id of [29901, 29903, 29909]) assert.ok(!bc.includes(`id="q${id}"`), `event ${id} without boards not in the Avatar Board Catalog`);
    // the event with boards: its Event Catalog page lists its boards and sends the keep of past boards to the Avatar Board Catalog
    const d = pages.detailPage(ix, 29900, ctx());
    assert.ok(d.includes('Event Coat') && d.includes('/web/avatar/board/29900'), 'its boards, kept from the Avatar Board Catalog');
    // the event keep: a BOARD entry is refused (kept from the Avatar Board Catalog)
    const player = {};
    const r = routesEvents({ player, savePlayer() {}, masterRows: () => [], eventIndex: () => ix, storyWeek: () => ({ shopFrom: '2019-04-08', shopTo: '2019-04-14' }),
      realNow: () => Date.parse('2026-11-03T20:00:00Z'), serverTimeAt: String, clock: { weekEnd: (x) => x, dayEnd: (x) => x }, stageState: () => ({}), grantItem() {}, grantObjective() {},
      webBase: '', log() {} });
    assert.strictEqual(r.keep(29920).body.ok, false, 'a BOARD entry is not kept as an event');
    assert.ok(!r.catalogCtx().current.has('B-1'), 'a BOARD entry is never «now» in the Event Catalog');
    assert.ok(r.boardCatalogCtx().current.has('B-1'), 'it is «now» in the Avatar Board Catalog');
  },
  // Task 5b: the Avatar Board Catalog has its own keep (player.avatarBoards.kept), independent of the kept event, both orders;
  // the boards listed follow the board keep only
  board_keep_independent() {
    const ix = BOARD_INDEX();
    const week = { shopFrom: '2019-04-08', shopTo: '2019-04-14' };
    const av = avatarBoards.avatarBoardRoutes({ index: AVATAR_DOC().index, master: (t) => (t === 'sphere' ? [5000001, 5000003, 5000005].map((id) => ({ sphereBoardId: id, type: 2 })) : []),
      nextUserSphereId: () => 1 });
    const make = (player) => routesEvents({ player, savePlayer() {}, masterRows: () => [], eventIndex: () => ix, storyWeek: () => week,
      realNow: () => Date.parse('2026-11-03T20:00:00Z'), serverTimeAt: String, clock: { weekEnd: (x) => x, dayEnd: (x) => x }, stageState: () => ({}), grantItem() {}, grantObjective() {},
      webBase: '', log() {}, markBoardsSent: (kept) => av.markKept(player, week, kept) });
    for (const order of [['event', 'board'], ['board', 'event']]) {
      const player = {}, ev = make(player);
      for (const what of order) assert.deepStrictEqual(what === 'event' ? ev.keep(29900).body : ev.keepBoard(29920).body, { ok: true }, `${order}: ${what}`);
      assert.strictEqual(player.events.kept, 'E-0', `${order}: the event stays kept`);
      assert.strictEqual(player.avatarBoards.kept, 'B-0', `${order}: the board entry stays kept`);
      assert.strictEqual(ev.boardKept(), 'B-0');
      assert.strictEqual(ev.catalogCtx().kept, 'E-0');
      assert.strictEqual(ev.boardCatalogCtx().kept, 'B-0');
      assert.deepStrictEqual(ev.events().map((e) => e.eventStageId), [29900, 29901], `${order}: the kept event card`);
      // the kept boards are on sale at their window's price
      assert.deepStrictEqual(av.listedIds(player, week, ev.boardKept()), [5000001, 5000003]);
      assert.strictEqual(av.priceNow(5000001, week, ev.boardKept()), 3000, 'the original price of the kept window');
      assert.strictEqual(av.isBuy(player, 5000001), 0, 'for sale, not given');
    }
    const player = {}, ev = make(player);
    assert.deepStrictEqual(ev.keepBoard(29921).body, { ok: false, why: 'now' });
    assert.deepStrictEqual(ev.keepBoard(29929).body, { ok: false, why: 'removed' });
    assert.deepStrictEqual(ev.keepBoard(29901).body.ok, false, 'an event without boards is not kept here');
    assert.strictEqual(ev.keepBoard(29922).body.ok, true);
    assert.strictEqual(player.avatarBoards.kept, 'khuxwiki@2019-02-01/outfit', 'a khuxwiki-dated entry is kept by its key');
    assert.deepStrictEqual(av.listedIds(player, week, ev.boardKept()), [5000003, 5000005]);
    assert.strictEqual(av.priceNow(5000005, week, ev.boardKept()), 2000);
    assert.strictEqual(ev.keepBoard(29920).body.ok, true, 'one kept board entry at a time');
    assert.strictEqual(player.avatarBoards.kept, 'B-0');
    assert.ok(!(player.events || {}).kept, 'no event kept by the board keep');
    assert.deepStrictEqual(ev.unkeepBoard().body, { ok: true });
    assert.strictEqual(ev.boardKept(), null);
    assert.deepStrictEqual(av.listedIds(player, week, ev.boardKept()), [5000003], 'not kept: only the week');
  },
  // Task 5b: an old save whose events.kept holds a BOARD entry key (Task 5 shared keep) ends with that entry kept in the Avatar
  // Board Catalog and no event kept; read before the migration writes, the board keep already sees it
  board_keep_migrates() {
    const ix = BOARD_INDEX();
    const make = (player, saves) => routesEvents({ player, savePlayer() { saves.n++; }, masterRows: () => [], eventIndex: () => ix,
      storyWeek: () => ({ shopFrom: '2019-04-08', shopTo: '2019-04-14' }), realNow: () => Date.parse('2026-11-03T20:00:00Z'), serverTimeAt: String,
      clock: { weekEnd: (x) => x, dayEnd: (x) => x }, stageState: () => ({}), grantItem() {}, grantObjective() {}, webBase: '', log() {} });
    for (const kept of ['B-0', 'khuxwiki@2019-02-01/outfit']) {
      const player = { events: { kept, cleared: {} } }, saves = { n: 0 }, ev = make(player, saves);
      assert.strictEqual(ev.boardKept(), kept, 'read: the old shared keep is the board keep');
      assert.strictEqual(ev.catalogCtx().kept, null, 'read: no event kept');
      assert.strictEqual(saves.n, 0, 'reading never writes the save');
      assert.strictEqual(ev.migrateKept(), true);
      assert.strictEqual(player.avatarBoards.kept, kept);
      assert.strictEqual(player.events.kept, null);
      assert.strictEqual(saves.n, 1);
      assert.strictEqual(ev.migrateKept(), false, 'once');
    }
    // an event kept stays an event keep
    const p2 = { events: { kept: 'E-0', cleared: {} } }, ev2 = make(p2, { n: 0 });
    assert.strictEqual(ev2.migrateKept(), false);
    assert.strictEqual(p2.events.kept, 'E-0');
    assert.strictEqual(ev2.boardKept(), null);
    // keeping an event before the migration ran: the old board keep is moved first, not lost
    const p3 = { events: { kept: 'B-0', cleared: {} } }, ev3 = make(p3, { n: 0 });
    assert.strictEqual(ev3.keep(29900).body.ok, true);
    assert.deepStrictEqual([p3.events.kept, p3.avatarBoards.kept], ['E-0', 'B-0']);
    // review 5: an old save that kept an EVENT with served boards (EV-0741 kind, Task 5 listed its boards): the event stays kept and
    // its key is copied to the board keep, once; a board keep the player removes later is not copied back
    ix.entries[0].boards = [{ key: 'E-0/outfit', group: 'outfit', type: 2, window: ['2019-03-01', '2019-03-07'], donorId: 9012, name: 'Event Coat', sphereBoardId: 5000012, price: 1000, served: true, why: null }];
    const p4 = { events: { kept: 'E-0', cleared: {} } }, s4 = { n: 0 }, ev4 = make(p4, s4);
    assert.strictEqual(ev4.boardKept(), 'E-0', 'read: its boards are kept before the migration writes');
    assert.strictEqual(ev4.migrateKept(), true);
    assert.deepStrictEqual([p4.events.kept, p4.avatarBoards.kept], ['E-0', 'E-0']);
    assert.strictEqual(ev4.migrateKept(), false, 'once');
    ev4.unkeepBoard();
    assert.strictEqual(ev4.migrateKept(), false);
    assert.deepStrictEqual([p4.events.kept, p4.avatarBoards.kept, ev4.boardKept()], ['E-0', null, null], 'a removed board keep stays removed');
    // a board keep already there is never replaced
    const p5 = { events: { kept: 'E-0', cleared: {} }, avatarBoards: { kept: 'B-0' } }, ev5 = make(p5, { n: 0 });
    ev5.migrateKept();
    assert.deepStrictEqual([p5.events.kept, p5.avatarBoards.kept], ['E-0', 'B-0']);
    // a new save that keeps the event now (no older keep): the event keep does not keep its boards
    const p6 = {}, ev6 = make(p6, { n: 0 });
    assert.strictEqual(ev6.keep(29900).body.ok, true);
    ev6.migrateKept();
    assert.deepStrictEqual([p6.events.kept, ev6.boardKept()], ['E-0', null]);
  },
  // Task 6 bench: keeping a BOARD entry popped «Unlocked an Avatar Board!» once per board (21 in a row). The kept boards join
  // avatarBoardsSent silently when the keep is stored: the next check announces none of them, GET /user/sphere still lists them
  board_keep_no_popup_flood() {
    const ix = BOARD_INDEX();
    const week = { shopFrom: '2019-04-08', shopTo: '2019-04-14' };
    const doc = AVATAR_DOC();
    const coins = [5000041, 5000042, 5000043];
    coins.forEach((id, i) => { doc.index[id] = { key: 'B-H/avatarCoin', group: 'avatarCoin', type: 1, donorId: 9041 + i, name: `Coin Board ${i + 1}`, price: 0,
      windows: [{ key: 'B-H/avatarCoin', censusId: 'B-H', window: ['2019-03-04', '2019-03-10'], price: 0, labels: [] }] }; });
    ix.entries.push({ ...boardEntry('B-H', 29940, '2019-03-04', '2019-03-10', coins.map((id, i) => ({ donorId: 9041 + i, name: `Coin Board ${i + 1}` }))),
      boards: coins.map((id, i) => ({ key: 'B-H/avatarCoin', group: 'avatarCoin', type: 1, window: ['2019-03-04', '2019-03-10'], donorId: 9041 + i, name: `Coin Board ${i + 1}`,
        sphereBoardId: id, price: 0, served: true, why: null })), available: true });
    const player = { avatarBoardsSent: [5000003] };
    const av = avatarBoards.avatarBoardRoutes({ index: doc.index, master: (t) => (t === 'sphere' ? [5000001, 5000003, 5000005, ...coins].map((id) => ({ sphereBoardId: id, type: 2 })) : []),
      nextUserSphereId: (() => { let n = 0; return () => ++n; })() });
    const ev = routesEvents({ player, savePlayer() {}, masterRows: () => [], eventIndex: () => ix, storyWeek: () => week,
      realNow: () => Date.parse('2026-11-03T20:00:00Z'), serverTimeAt: String, clock: { weekEnd: (x) => x, dayEnd: (x) => x }, stageState: () => ({}), grantItem() {}, grantObjective() {},
      webBase: '', log() {}, markBoardsSent: (kept) => av.markKept(player, week, kept) });
    assert.deepStrictEqual(ev.keepBoard(29940).body, { ok: true });
    const add = av.check(player, { checkTypes: [1, 2], boardTypes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }, week, ev.boardKept()).add;
    assert.deepStrictEqual(add.filter((id) => coins.includes(id)), [], 'no kept board announced');
    assert.deepStrictEqual(av.list(player, week, ev.boardKept()).filter((id) => coins.includes(id)), coins, 'listed in Avatar Boards');
    for (const id of coins) assert.ok(player.avatarSphere[id], 'their progress exists');
    assert.ok(player.avatarBoardsSent.includes(5000003), 'the boards sent before stay');
  },
  // Task 5b: the keep messages name Avatar Boards (Task 6 bench: «Leave and re-enter Events» on a board), the page has no «restored»
  board_catalog_wording() {
    const ix = BOARD_INDEX();
    const raw = pages.boardCatalogPage(ix, ctx({ current: new Set(['B-1']) }));
    assert.ok(/Leave and re-enter Avatar Boards/.test(raw) && !/re-enter Events/.test(raw), 'the post-keep message names Avatar Boards');
    assert.ok(raw.includes('Keep in Avatar Boards') && !raw.includes('Keep in Events'));
    assert.ok(/<h1>Avatar Board Catalog<\/h1>/.test(raw));
    assert.ok(/addition of this server/.test(raw), 'the keep of past boards is declared');
    const text = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '');
    assert.ok(!/restored/i.test(text(pages.expandCatalog(raw))) && !/restored/i.test(raw), 'no «restored»');
    for (const id of [29920, 29929]) assert.ok(!/restored/i.test(pages.boardDetailPage(ix, id, ctx())));
    const d = pages.boardDetailPage(ix, 29920, ctx());
    assert.ok(/Leave and re-enter Avatar Boards/.test(d) && !/re-enter Events/.test(d));
    // the Event Catalog keeps its own words
    assert.ok(/Leave and re-enter Events/.test(pages.catalogPage(ix, ctx())));
    // user 23-11: no Avatar Board Catalog block at the top of the Special Catalog either (reached from its own banner)
    const sp = require('./special-pages').catalogPage({ entries: [] }, { avatarBoardCatalog: true });
    assert.ok(!sp.includes('/web/avatar/catalog') && !/Avatar Board Catalog/.test(sp), 'no Avatar Board Catalog block in the Special Catalog');
  },
  // the SHOW filter of the Avatar Board Catalog still selects the «Not built yet» rows; the page script writes the board pills
  // after a keep (Task 5 fix round 1)
  no_restored_wording() {
    const ix = BOARD_INDEX();
    const raw = pages.catalogPage(ix, ctx({ current: new Set(['E-1']) })), html = pages.expandCatalog(raw);
    const text = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '');
    assert.ok(!/restored/i.test(text(html)), 'no «restored» in the page text');
    assert.ok(rowOf(html, 29909).includes('Not built yet'));
    const braw = pages.boardCatalogPage(ix, ctx({ current: new Set(['B-1']) }));
    const shown = fakePage(braw);
    shown.tab('all');
    shown.apply({ show: 'removed' });
    assert.deepStrictEqual(shown.shown().sort(), [29929], `SHOW «Not built yet» keeps working: ${shown.shown()}`);
    const pill = JSON.parse(braw.slice(braw.indexOf('var PILL=') + 9, braw.indexOf(';\nfunction attr(el,a)')));
    assert.ok(/Avatar Boards/.test(pill.kept[1]) && /boards/.test(pill.can[1]), 'board pills after a keep');
    assert.ok(braw.includes("'/web/avatar/board/'"), 'a row opens its Avatar Board page');
  },
  // Events Part 8 Task 6: the details page of a High Score Challenge lists its point milestones and its score thresholds (each with
  // its source label and the rank it shows, spec 4.4 / 6.4) and, with ctx.hscBest, the player's best score and shown rank
  hsc_details_thresholds_and_labels() {
    const ix = INDEX();
    ix.entries.push(hscEntry());
    const html = pages.detailPage(ix, 29930, ctx());
    const text = html.replace(/<script[\s\S]*?<\/script>/g, '');
    assert.ok(!/restored/i.test(text), 'no «restored» in the page text');
    const sec = text.slice(text.indexOf('<h2>High Score</h2>'));
    assert.ok(sec.length > 20, 'High Score section');
    // point milestones: score and rewards
    assert.ok(/<td>1,000<\/td><td data-l="Rewards">5 Jewels<\/td>/.test(sec) && /<td>5,000<\/td><td data-l="Rewards">6★ Quest Medal x1<\/td>/.test(sec), 'milestones');
    // phone: one card per row, column names from data-l, header row hidden (user 16-11)
    assert.ok(/<tr class="hh"><th>Original ranks/.test(sec) && /data-l="Rank shown"/.test(sec), 'phone card cells');
    // thresholds, top first: the original ranks, the score needed, the rank shown, the source label in words
    const rows = [...sec.matchAll(/<tr class="th">([\s\S]*?)<\/tr>/g)].map((m) => m[1].replace(/<[^>]+>/g, '|').replace(/\|+/g, '|'));
    assert.deepStrictEqual(rows, ['|Ranks 1–10|9,000|1st|Original value|50 Jewels, 6★ Quest Medal x1|', '|Ranks 11–50|6,000|11th|Scaled from original|20 Jewels|',
      '|Ranks 51–100|2,000|51st|Interpolated|5 Jewels|']);
    assert.ok(/Below 2,000 points your rank shows as 100th/.test(sec), 'below the lowest threshold');
    assert.ok(/1st from 9,000 points/.test(sec), '1st from the top threshold (as the table)');
    assert.ok(!/Your best score/.test(sec), 'no best score without ctx.hscBest');
    // with the player's best: the score and the shown rank (ranked-rewards.js shownRank)
    const mine = pages.detailPage(ix, 29930, ctx({ hscBest: (cid) => (cid === 'H-1' ? 6500 : null) }));
    assert.ok(/Your best score: <b>6,500<\/b>/.test(mine) && /shown rank: <b>11th<\/b>/.test(mine), 'best score and shown rank');
    // a reduced threshold shows the original border
    const ix2 = INDEX(); const ce = hscEntry(); ce.hsc.thresholds[2] = { ...ce.hsc.thresholds[2], label: 'scaled', originalScore: 148058247 }; ix2.entries.push(ce);
    assert.ok(/Original: 148,058,247/.test(pages.detailPage(ix2, 29930, ctx())), 'original border shown');
    // an HSC not built yet (no thresholds): «Not built yet» with its reason, no section
    const ix3 = INDEX(); const held = { ...hscEntry(), available: false, stageIds: [], reason: 'hscNoThresholds', why: REASON_TEXT.hscNoThresholds }; delete held.hsc; ix3.entries.push(held);
    assert.ok(!pages.detailPage(ix3, 29930, ctx()).includes('<h2>High Score</h2>'));
    assert.ok(rowOf(catalog(ix3, ctx()), 29930).includes('Not built yet'));
  },
  // the score-bonus medals of an HSC (entry.hsc.bonusMedals): the deck slots first, then the «Medals» list, «+N%» = rate / 100
  hsc_bonus_medals() {
    const ix = INDEX(), e = hscEntry();
    e.hsc.scoreMedalListId = 8001;
    e.hsc.bonusMedals = [{ medalId: 3, rate: 1500, display: 0, name: '6★ Yuffie' }, { medalId: 1, rate: 2600, display: 1, name: '6★ Cloud' }, { medalId: 2, rate: 2350, display: 2 }];
    ix.entries.push(e);
    const text = pages.detailPage(ix, 29930, ctx({ itemName: (r) => (r.type === 3 && r.id === 2 ? '6★ Sephiroth' : null) })).replace(/<script[\s\S]*?<\/script>/g, '');
    const sec = text.slice(text.indexOf('<h3>Score bonus medals</h3>'));
    assert.ok(sec.length > 30, 'bonus medal section');
    const rows = [...sec.matchAll(/<tr class="bm">([\s\S]*?)<\/tr>/g)].map((m) => m[1].replace(/<[^>]+>/g, '|').replace(/\|+/g, '|'));
    assert.deepStrictEqual(rows, ['|6★ Cloud|+26%|Deck slot 1|', '|6★ Sephiroth|+23.5%|Deck slot 2|', '|6★ Yuffie|+15%|Medals list|']);
    assert.ok(!/not built yet/.test(sec), 'no «not built yet» line with a medal list');
  },
  hsc_type_chip() {
    const ix = INDEX();
    ix.entries.push(hscEntry());
    const html = catalog(ix, ctx());
    const sheet = html.slice(html.indexOf('<div class="sheet" id="sheet"'), html.indexOf('<div id="pinmsg"'));
    const types = [...((/<div class="opts" data-g="type">([\s\S]*?)<\/div>/.exec(sheet) || [])[1] || '').matchAll(/data-v="([^"]+)"[^>]*>(?:<img[^>]*>)?([^<]+)</g)].map((m) => [m[1], m[2]]);
    assert.deepStrictEqual(types, [['all', 'All'], ['EQ', 'Event Quests'], ['HSC', 'High Score Challenges']]);
    assert.ok(/data-type="HSC"/.test(rowOf(html, 29930)));
    assert.ok(/data-search="[^"]*High Score Challenges/.test(rowOf(html, 29930)), 'the type name is found by FIND');
  },
  // Task 5b fix round 1 (review 1): the board catalogue's page script counts «entries», never «entrys»; the Event Catalog «events»
  board_noun_entries() {
    const ix = BOARD_INDEX();
    const fp = fakePage(pages.boardCatalogPage(ix, ctx({ current: new Set(['B-1']) })));
    fp.tab('all');
    assert.ok(/>\d+ entries</.test(fp.byId.sum.innerHTML) && !/entrys/.test(fp.byId.sum.innerHTML), fp.byId.sum.innerHTML);
    fp.apply({ type: 'gem', show: 'kept' });
    assert.ok(/No entries match your filters/.test(fp.byId.none.textContent), fp.byId.none.textContent);
    fp.apply({ show: 'removed' });
    assert.ok(/>1 entry</.test(fp.byId.sum.innerHTML), fp.byId.sum.innerHTML);
    const ev = fakePage(pages.catalogPage(ix, ctx()));
    ev.tab('all');
    assert.ok(/>\d+ events</.test(ev.byId.sum.innerHTML), ev.byId.sum.innerHTML);
  },
  // review 3: BACK always returns where the player came from: Special Catalog › Avatar Board Catalog › entry and back; Event
  // Catalog › event page › its Avatar Board page and back
  board_back_chain() {
    const ix = BOARD_INDEX();
    ix.entries[0].boards = [{ key: 'E-0/outfit', group: 'outfit', type: 2, window: ['2019-03-01', '2019-03-07'], donorId: 9012, name: 'Event Coat', sphereBoardId: 5000012, price: 1000, served: true, why: null }];
    const back = (h) => (/<a class="back" href="([^"]*)"/.exec(h) || [])[1] || null;
    for (const from of ['special', 'event']) {
      const raw = pages.boardCatalogPage(ix, ctx({ from }));
      assert.strictEqual(back(raw), from === 'special' ? '/web/special/catalog' : '/web/event/catalog');
      const row = rowOf(pages.expandCatalog(raw), 29920);
      assert.ok(row.includes(`href="/web/avatar/board/29920?from=catalog&amp;cat=${from}"`), `the row keeps the origin: ${row.slice(0, 600)}`);
      assert.ok(raw.includes(`'?from=catalog&cat=${from}'`), 'the row script too');
      const d = pages.boardDetailPage(ix, 29920, ctx({ fromCatalog: true, cat: from }));
      assert.strictEqual(back(d), `/web/avatar/catalog?from=${from}#q29920`);
    }
    assert.strictEqual(back(pages.boardCatalogPage(ix, ctx())), null, 'opened from its banner: no BACK bar');
    assert.strictEqual(back(pages.boardDetailPage(ix, 29920, ctx({ fromCatalog: true }))), '/web/avatar/catalog#q29920');
    // the event page links to its Avatar Board page with its own origin, and that page leads back to it
    const ep = pages.detailPage(ix, 29900, ctx({ fromCatalog: true }));
    assert.ok(ep.includes('href="/web/avatar/board/29900?from=event&amp;cat=catalog"'), 'the event page passes its origin');
    assert.strictEqual(back(pages.boardDetailPage(ix, 29900, ctx({ from: 'event', cat: 'catalog' }))), '/web/event/event/29900?from=catalog');
    assert.strictEqual(back(pages.boardDetailPage(ix, 29900, ctx({ from: 'event' }))), '/web/event/event/29900');
    assert.ok(pages.detailPage(ix, 29900, ctx()).includes('href="/web/avatar/board/29900?from=event"'));
  },
  // review 4: an event whose boards are all held is not «Past boards — can be kept» (keepBoard would answer 409): «Not built yet»
  board_all_held_not_keepable() {
    const ix = BOARD_INDEX();
    ix.entries[0].boards = [{ key: 'E-0/outfit', group: 'outfit', type: 2, window: ['2019-03-01', '2019-03-07'], donorId: 9013, name: 'Held Coat', sphereBoardId: null, price: 1000, served: false, why: 'priceUnknown' }];
    const st = pages.boardStatusOf(ix.entries[0], ctx());
    assert.strictEqual(st.show, 'removed');
    assert.strictEqual(st.button, null);
    assert.ok(/Not built yet/.test(st.pill));
    assert.ok(!rowOf(boardCatalog(ix, ctx()), 29900).includes('class="pk'), 'no Keep button');
  },
  // Task 5c (user 15-11): the Avatar Board Catalog rows show the original board cards (/web/avatar/img/v<n>/<sphereBoardId>.png),
  // up to 3 side by side, «+N» for more; a plain-card board a neutral box; an entry with no served board the «No card» box
  board_row_cards() {
    const ix = BOARD_INDEX();
    const five = [11, 12, 13, 14, 15].map((k) => ({ key: 'B-5/outfit', group: 'outfit', type: 2, window: ['2019-03-04', '2019-03-10'], donorId: 9100 + k,
      name: `Coat ${k}`, sphereBoardId: 5000000 + k, price: 1000, served: true, why: null }));
    ix.entries.push({ ...ix.entries.find((e) => e.censusId === 'B-0'), censusId: 'B-5', evStageId: 29925, start: '2019-03-04', end: '2019-03-10', boards: five });
    const c = ctx({ boardImgVersion: 7, boardCard: (id) => id !== 5000003 });
    const raw = pages.boardCatalogPage(ix, c), html = pages.expandCatalog(raw);
    const imgs = (row) => [...row.matchAll(/<img [^>]*data-src="([^"]*)"/g)].map((m) => m[1]);
    assert.deepStrictEqual(imgs(rowOf(html, 29925)), [11, 12, 13].map((k) => `/web/avatar/img/v7/50000${k}.png`), 'the first 3 cards');
    assert.ok(/<span class="more">\+2<\/span>/.test(rowOf(html, 29925)), '«+N» for the other boards');
    assert.deepStrictEqual(imgs(rowOf(html, 29920)), ['/web/avatar/img/v7/5000001.png'], 'only the served boards');
    assert.ok(!/\+\d/.test(rowOf(html, 29920).replace(/data-search="[^"]*"/, '')), 'no badge with up to 3 boards');
    assert.ok(/loading="lazy"/.test(rowOf(html, 29925)));
    // the plain card (a Skill Enhancement run): a neutral box, no picture
    assert.deepStrictEqual(imgs(rowOf(html, 29921)), []);
    assert.ok(/<span class="nb"><\/span>/.test(rowOf(html, 29921)), 'the plain card: a neutral box');
    // no served board: the «No card» box, never «in the original» (these boards had cards)
    assert.ok(/>No card</.test(rowOf(html, 29929)) && imgs(rowOf(html, 29929)).length === 0);
    assert.ok(!/No card in the original/.test(raw), 'no «in the original» on the Avatar Board Catalog');
    assert.ok(!raw.includes('/web/event/img/'), 'no event card on the board rows');
    // the rows still share their templates (the card ids are packed values): the page stays light
    const d = JSON.parse(/<script id="kxrows" type="application\/json">([\s\S]*?)<\/script>/.exec(raw)[1].replace(/<\\\//g, '</'));
    assert.ok(d.t.every((t) => !/50000\d\d/.test(t)), 'no card id inside a template');
    // the page script loads every card of a shown row
    assert.ok(/querySelectorAll\("img\[data-src\]"\)/.test(raw));
  },
  // Task 5c fix round 1: the column rules of the Avatar Boards table follow its header (card column first): Board and Dates wrap,
  // Price stays on one line; on the Avatar Board page and on the event page of an event that sold boards
  board_table_columns() {
    const ix = BOARD_INDEX();
    ix.entries[0].boards = [{ key: 'E-0/outfit', group: 'outfit', type: 2, window: ['2019-03-01', '2019-03-07'], donorId: 9012, name: 'Event Coat', sphereBoardId: 5000012, price: 1000, served: true, why: null }];
    for (const page of [pages.boardDetailPage(ix, 29920, ctx()), pages.detailPage(ix, 29900, ctx())]) {
      const head = /<table class="tt bt ab(?: kn2 kc3 kg4)?"><tr>((?:<th>[^<]*<\/th>)+)<\/tr>/.exec(page);
      assert.ok(head, 'the Avatar Boards table has its own class');
      const cols = [...head[1].matchAll(/<th>([^<]*)<\/th>/g)].map((m) => m[1]);
      const n = (name) => cols.indexOf(name) + 1;
      assert.deepStrictEqual(cols, ['', 'Board', 'Dates', 'Price', 'Status']);
      const css = page.slice(0, page.indexOf('</style>'));
      for (const c of ['Board', 'Dates']) assert.ok(css.includes(`.tt.ab td:nth-child(${n(c)}){white-space:normal}`) || (c === 'Board' && css.includes(`.tt.bt td:nth-child(${n(c)}){white-space:normal}`)), `${c} wraps`);
      assert.ok(css.includes(`.tt.ab td:nth-child(${n('Price')}){white-space:nowrap}`), 'Price on one line');
    }
  },
  // Task 5c fix round 1: a page-size budget for the Avatar Board Catalog (packed): 120 KB on the real index when present, else on
  // a fixture of 270 entries with several boards each
  board_catalog_size_budget() {
    let ix = null;
    try { ix = avatarBoards.catalogIndex(require('./game_data/events.json'), require('./game_data/avatar_boards.json')); } catch { ix = null; }
    if (!ix) {
      ix = BOARD_INDEX();
      const base = ix.entries.find((e) => e.censusId === 'B-0');
      for (let i = 0; i < 270; i++) {
        const nb = 1 + (i % 7);
        ix.entries.push({ ...base, censusId: `B-F${i}`, evStageId: 30000 + i, name: `Avatar Boards: Fixture ${i}`, start: `2017-${String(1 + (i % 12)).padStart(2, '0')}-05`, end: `2017-${String(1 + (i % 12)).padStart(2, '0')}-11`,
          boards: Array.from({ length: nb }, (_, k) => ({ key: `B-F${i}/outfit`, group: 'outfit', type: 2, window: ['2017-01-05', '2017-01-11'], donorId: 20000 + i * 10 + k,
            name: `Fixture Coat ${i}-${k}`, sphereBoardId: 5100000 + i * 10 + k, price: 2000, served: true, why: null })) });
      }
    }
    const raw = pages.boardCatalogPage(ix, ctx({ boardImgVersion: 159770767, boardOwned: (id) => id % 3 === 0, boardProgress: (id) => ['none', 'part', 'done'][id % 3] }));
    const kb = Buffer.byteLength(raw, 'utf8') / 1024;
    assert.ok(kb < 120, `Avatar Board Catalog ${kb.toFixed(1)} KB packed (budget 120 KB)`);
  },
  // each board line of the Avatar Board page carries its card (a held board or a plain card: the neutral box)
  board_page_cards() {
    const ix = BOARD_INDEX();
    const d = pages.boardDetailPage(ix, 29920, ctx({ boardImgVersion: 3 }));
    assert.ok(/<tr><td class="bc"><img [^>]*src="\/web\/avatar\/img\/v3\/5000001\.png"[^>]*loading="lazy"[^>]*><\/td><td>Red Coat/.test(d), 'Red Coat with its card');
    assert.ok(/<tr><td class="bc"><span class="nb"><\/span><\/td><td>Blue Coat/.test(d), 'a held board: the neutral box');
    assert.ok(/<th><\/th><th>Board<\/th>/.test(d));
    assert.ok(!/No card in the original/.test(d) && !d.includes('/web/event/img/'), 'a BOARD entry has no event card');
    const plain = pages.boardDetailPage(ix, 29921, ctx({ boardCard: () => false }));
    assert.ok(/<td class="bc"><span class="nb"><\/span><\/td><td>Gem Board/.test(plain), 'the plain card: no picture');
    // an event that also sold boards keeps its event card on top, with the «No card» fallback
    ix.entries[0].boards = [{ key: 'E-0/outfit', group: 'outfit', type: 2, window: ['2019-03-01', '2019-03-07'], donorId: 9012, name: 'Event Coat', sphereBoardId: 5000012, price: 1000, served: true, why: null }];
    const ev = pages.boardDetailPage(ix, 29900, ctx());
    assert.ok(ev.includes('/web/event/img/v1/29900.png') && !/No card in the original/.test(ev));
    assert.ok(/src="\/web\/avatar\/img\/v1\/5000012\.png"/.test(ev));
  },
  // Task 5c filters: SHOW Bought / Not bought (ctx.boardOwned), PROGRESS on the boards' nodes (ctx.boardProgress), TYPE by board
  // group, FIND without event wording
  board_filters() {
    const ix = BOARD_INDEX();
    const owned = new Set([5000001]), prog = { 5000001: 'done', 5000003: 'part' };
    const raw = pages.boardCatalogPage(ix, ctx({ current: new Set(['B-1']), boardOwned: (id) => owned.has(id), boardProgress: (id) => prog[id] || 'none' }));
    const fp = fakePage(raw);
    fp.tab('all');
    const sel = (f) => { fp.apply(f); return fp.shown().sort(); };
    assert.deepStrictEqual(sel({ show: 'bought' }), [29920]);
    assert.deepStrictEqual(sel({ show: 'notbought' }), [29921, 29922]);
    assert.deepStrictEqual(sel({ prog: 'done' }), [29920]);
    assert.deepStrictEqual(sel({ prog: 'part' }), [29921]);
    assert.deepStrictEqual(sel({ prog: 'none' }), [29922]);
    assert.deepStrictEqual(sel({ type: 'gem' }), [29921]);
    assert.deepStrictEqual(sel({ show: 'removed' }), [29929]);
    assert.deepStrictEqual(sel({ show: 'can' }), [29920, 29922]);
    assert.deepStrictEqual(sel({ show: 'now' }), [29921]);
    assert.deepStrictEqual(sel({ q: 'Wiki' }), [29922]);
    // a partly bought entry is under both (it still has a board to buy)
    const two = [5000001, 5000002].map((id) => ({ key: 'B-7/outfit', group: 'outfit', type: 2, window: ['2019-03-04', '2019-03-10'], donorId: id, name: `C${id}`, sphereBoardId: id, price: 1000, served: true, why: null }));
    const ix2 = BOARD_INDEX();
    ix2.entries.push({ ...ix2.entries.find((e) => e.censusId === 'B-0'), censusId: 'B-7', evStageId: 29927, start: '2019-03-04', end: '2019-03-10', boards: two });
    const fp2 = fakePage(pages.boardCatalogPage(ix2, ctx({ boardOwned: (id) => owned.has(id), boardProgress: () => 'none' })));
    fp2.tab('all');
    fp2.apply({ show: 'bought' });
    assert.ok(fp2.shown().includes(29927));
    fp2.apply({ show: 'notbought' });
    assert.ok(fp2.shown().includes(29927));
    const sheet = raw.slice(raw.indexOf('<div class="sheet"'));
    assert.ok(/data-v="bought"[^>]*>.*Bought</.test(sheet) && /data-v="notbought"[^>]*>.*Not bought</.test(sheet));
    assert.ok(/Completed/.test(sheet) && /In progress/.test(sheet) && /Not started/.test(sheet) && !/Incomplete/.test(sheet), 'PROGRESS on the nodes');
    assert.ok(/handed out/i.test(sheet) && /node/i.test(sheet), 'the Bought rule in plain words');
    assert.ok(sheet.includes('placeholder="Board, character or outfit name"'));
    const panel = sheet.slice(0, sheet.indexOf('<h4>TYPE</h4>')).replace(/<script[\s\S]*$/, '');
    assert.ok(!/\bevents?\b/i.test(panel), `no event wording in the panel: ${panel.slice(0, 400)}`);
    // completed entry: its crown
    const crown = require('./special-pages').CROWN;
    assert.ok(rowOf(pages.expandCatalog(raw), 29920).includes(crown) && !rowOf(pages.expandCatalog(raw), 29921).includes(crown));
    // the Event Catalog keeps its own filters
    const ev = pages.catalogPage(ix, ctx());
    assert.ok(!/data-v="bought"/.test(ev) && /Incomplete/.test(ev));
  },
  // Fix round 1: a BOARD entry whose dates span the story week while none of its served boards is on sale in it («other»): board
  // wording, never the short-event text
  board_entry_other_and_pills() {
    const ix = BOARD_INDEX();
    // B-2: its span covers the week, its only served board is on sale from 04-22
    ix.entries.push({ ...ix.entries.find((e) => e.censusId === 'B-0'), censusId: 'B-2', evStageId: 29923, start: '2019-04-01', end: '2019-04-30',
      boards: [{ key: 'B-2/outfit', group: 'outfit', type: 2, window: ['2019-04-22', '2019-04-30'], donorId: 9011, name: 'Late Coat', sphereBoardId: 5000011, price: 1500, served: true, why: null }] });
    const st = pages.boardStatusOf(ix.entries.find((e) => e.censusId === 'B-2'), ctx());
    assert.strictEqual(st.show, 'other');
    assert.ok(/board/i.test(st.why) && !/short event/i.test(st.why) && /board/i.test(st.pill), st.pill);
  },
  // fix round 2: the catalogue status comes from the listing's own decision (avatar-boards.js listState): a chained board whose
  // previous board is not complete is not listed, so its entry is not «On sale this week» but «Unlocks after the previous board»;
  // once the previous board is complete it is
  board_chain_status() {
    const rb = require('./raid-boards');
    const week = { shopFrom: '2019-04-08', shopTo: '2019-04-14' }, win = ['2019-04-08', '2019-04-21'];
    const doc = { index: {
      5000031: { key: 'B-6/gem', group: 'gem', type: 2, donorId: 9031, name: 'Set 1', price: 3500, windows: [{ key: 'B-6/gem', censusId: 'B-6', window: win, price: 3500, labels: [] }] },
      5000032: { key: 'B-7/gem', group: 'gem', type: 2, donorId: 9032, name: 'Set 2', price: 3500, chain: 5000031,
        windows: [{ key: 'B-7/gem', censusId: 'B-7', window: win, price: 3500, labels: [] }] } }, report: { held: [] } };
    const raw = INDEX();
    raw.entries.push({ ...boardEntry('B-7', 29932, win[0], win[1], [{ donorId: 9032, name: 'Set 2' }]), avatarBoards: [{ key: 'B-7/gem', group: 'gem', type: 2, window: win, price: 3500, labels: [],
      boards: [{ donorId: 9032, name: 'Set 2' }] }] });
    const ix = avatarBoards.catalogIndex(raw, doc);
    const tables = { sphere: [5000031, 5000032].map((id) => ({ sphereBoardId: id, arryId: id, type: 2 })), sphereArray: [rb.gridRow(5000031, 2), rb.gridRow(5000032, 2)] };
    const player = { avatarBoardsBought: [5000032] };
    const av = avatarBoards.avatarBoardRoutes({ index: doc.index, master: (t) => tables[t] || [], nextUserSphereId: () => 1 });
    assert.strictEqual(av.listState(player, 5000032, week, null), 'week', 'a bought board stays listed even behind its chain (Task 4 rule)');
    player.avatarBoardsBought = [];
    assert.strictEqual(av.listState(player, 5000032, week, null), 'chain');
    assert.strictEqual(av.listed(player, 5000032, week, null), false, 'not listed while Set 1 is incomplete');
    const ev = routesEvents({ player, savePlayer() {}, masterRows: () => [], eventIndex: () => ix, storyWeek: () => week,
      realNow: () => Date.parse('2026-11-03T20:00:00Z'), serverTimeAt: String, clock: { weekEnd: (x) => x, dayEnd: (x) => x }, stageState: () => ({}), grantItem() {}, grantObjective() {},
      webBase: '', log() {}, avatarBoardState: (id) => av.listState(player, id, week, null) });
    const c1 = ev.boardCatalogCtx();
    assert.ok(!c1.current.has('B-7'), 'not «now»: the listing does not list it');
    const st1 = pages.boardStatusOf(ix.entries.find((e) => e.censusId === 'B-7'), c1);
    assert.strictEqual(st1.show, 'other');
    assert.ok(/Unlocks after the previous board/.test(st1.pill) && !/On sale/.test(st1.pill), st1.pill);
    assert.ok(rowOf(boardCatalog(ix, c1), 29932).includes('Unlocks after the previous board'));
    // Set 1 complete: the listing lists Set 2, and the catalogue says so
    player.avatarSphere = { 5000031: { id: 1, unlock: [1, 2], getDatetime: 0 } };
    assert.strictEqual(av.listState(player, 5000032, week, null), 'week');
    const c2 = ev.boardCatalogCtx();
    assert.ok(c2.current.has('B-7'));
    assert.ok(/On sale this week/.test(pages.boardStatusOf(ix.entries.find((e) => e.censusId === 'B-7'), c2).pill));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try { fn(); console.log(`ok ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.message}`); }
}

// ---- make-event-notices.js: the notices of the events, from the private notice texts (synthetic here) ----
try {
  const mk = require('./make-event-notices');
  const text = ['3rd Fun | KINGDOM HEARTS Union χ | SQUARE ENIX BRIDGE', 'March Fun notice', '02/28/2019 07:00 (UTC)', 'EVENT', 'KINGDOM HEARTS Union χ', NOTICE_LINE, 'Top of Page'].join('\n');
  const doc = mk.build({ entries: INDEX().entries, noticeText: { 9001: text } });
  assert.deepStrictEqual(doc.rows['E-0'], { noticeIds: [9001] });
  assert.strictEqual(doc.notices[9001].title, 'March Fun notice');
  assert.deepStrictEqual(doc.notices[9001].body, [NOTICE_LINE]);
  assert.deepStrictEqual(doc.missing, [{ censusId: 'E-1', noticeId: 9002 }]);
  assert.ok(/git-ignored/.test(doc.note));
  assert.ok(mk.OUT.replace(/\\/g, '/').endsWith('game_data/event_notices.json'), 'written under the git-ignored game_data');
  console.log('ok notice_generator');
} catch (e) { failed++; console.error(`FAIL notice_generator: ${e.message}`); }

// ---- server.js: the routes on fixture files; the notice file read at request time ----
function wiring() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-test-event-pages-'));
  process.env.KHUX_SAVE = path.join(dir, 'save.json');
  process.env.KHUX_RAID_INDEX = path.join(dir, 'raids.json');
  process.env.KHUX_EVENT_INDEX = path.join(dir, 'events.json');
  process.env.KHUX_EVENT_NOTICES = path.join(dir, 'event_notices.json');
  process.env.KHUX_EVENT_IMG = path.join(dir, 'event_img');
  process.env.KHUX_AVATAR_IMG = path.join(dir, 'avatar_img');
  fs.writeFileSync(process.env.KHUX_RAID_INDEX, JSON.stringify({ entries: [], reasons: {} }));
  // dates far from the Story of a new save: E-0 past (2015), E-3 later (2099)
  const ix = INDEX();
  Object.assign(ix.entries[0], { start: '2015-01-01', end: '2015-01-07' });
  Object.assign(ix.entries[2], { start: '2099-01-01', end: '2099-01-07' });
  // a BOARD entry of 2015 joined at run time with game_data/avatar_boards.json (KHUX_AVATAR_INDEX)
  ix.entries.push(boardEntry('B-W', 29930, '2015-02-02', '2015-02-08', [{ donorId: 9001, name: 'Red Coat' }]));
  process.env.KHUX_AVATAR_INDEX = path.join(dir, 'avatar_boards.json');
  fs.writeFileSync(process.env.KHUX_AVATAR_INDEX, JSON.stringify({ index: { 5000001: { ...AVATAR_DOC().index[5000001],
    windows: [{ key: 'B-W/outfit', censusId: 'B-W', window: ['2015-02-02', '2015-02-08'], price: 3000, labels: [] }] } }, report: { held: [] } }));
  ix.avatarCatalog = { evStageId: 20704, stageIds: [970000], useAp: [0] }; // the Avatar Board Catalog banner (Task 5b fix round 1)
  fs.writeFileSync(process.env.KHUX_EVENT_INDEX, JSON.stringify(ix));
  const log = console.log, warn = console.warn;
  const quiet = (fn) => { console.log = () => {}; console.warn = () => {}; try { return fn(); } finally { console.log = log; console.warn = warn; } };
  try {
    const { _test: t } = quiet(() => require('./server'));
    const web = (fn, url) => { const r = { code: 0, body: '' }; quiet(() => fn({ writeHead(c) { r.code = c; }, end(x) { r.body = x ? x.toString('utf8') : ''; } }, url)); return r; };
    quiet(() => t.respondUserCreate({ writeHead() {}, end() {} }, { name: 'Prova', unionId: 1 }));
    assert.strictEqual(t.route('/web/event/catalog'), 'eventweb');
    const cat = web(t.respondEventWeb, '/web/event/catalog');
    assert.strictEqual(cat.code, 200);
    assert.ok(cat.body.includes('Event Catalog') && pages.expandCatalog(cat.body).includes('id="q29900"'));
    assert.strictEqual(web(t.respondEventWeb, '/web/event/event/29900?from=catalog').code, 200);
    assert.strictEqual(web(t.respondEventWeb, '/web/event/event/1').code, 404);
    // no notice file yet: a page that says so; written now: seen at the next request, no restart
    assert.ok(/not available/i.test(web(t.respondEventWeb, '/web/event/notice/29900').body));
    fs.writeFileSync(process.env.KHUX_EVENT_NOTICES, JSON.stringify(DOC()));
    assert.ok(web(t.respondEventWeb, '/web/event/notice/29900?from=event').body.includes(NOTICE_LINE));
    // card pictures: the card, else 0.png, else 404
    assert.strictEqual(web(t.respondEventWeb, '/web/event/img/v1/29900.png').code, 404);
    fs.mkdirSync(process.env.KHUX_EVENT_IMG);
    fs.writeFileSync(path.join(process.env.KHUX_EVENT_IMG, '0.png'), 'png');
    assert.strictEqual(web(t.respondEventWeb, '/web/event/img/v1/29900-kept.png').code, 200);
    // keep / unkeep (POST)
    const k = web(t.respondEventPost, '/web/event/keep/29900');
    assert.deepStrictEqual([k.code, JSON.parse(k.body)], [200, { ok: true }]);
    assert.strictEqual(web(t.respondEventPost, '/web/event/keep/29903').code, 409);
    assert.deepStrictEqual(JSON.parse(web(t.respondEventPost, '/web/event/unkeep').body), { ok: true });
    // the BOARD entry (Part 7 Task 5, Task 5b): not in the Event Catalog; in the Avatar Board Catalog, kept by its census id with
    // its own keep, beside the kept event
    const evRows = pages.expandCatalog(web(t.respondEventWeb, '/web/event/catalog').body);
    assert.ok(!evRows.includes('id="q29930"'), 'the BOARD entry is not in the Event Catalog');
    assert.strictEqual(web(t.respondEventWeb, '/web/event/event/29930').code, 404);
    assert.strictEqual(t.route('/web/avatar/catalog'), 'avatarweb');
    const bc = web(t.respondAvatarWeb, '/web/avatar/catalog?from=special');
    assert.strictEqual(bc.code, 200);
    const boardRow = pages.expandCatalog(bc.body);
    assert.ok(boardRow.includes('id="q29930"') && boardRow.includes('data-pin="/web/avatar/keep/29930"'), 'the BOARD entry is in the Avatar Board Catalog, keepable');
    assert.ok(bc.body.includes('/web/special/catalog'), 'BACK to the Special Catalog');
    assert.ok(web(t.respondAvatarWeb, '/web/avatar/board/29930?from=catalog').body.includes('Red Coat'));
    assert.ok(web(t.respondAvatarWeb, '/web/avatar/board/29930?from=catalog&cat=special').body.includes('href="/web/avatar/catalog?from=special#q29930"'), 'BACK keeps the origin');
    assert.strictEqual(web(t.respondAvatarWeb, '/web/avatar/board/29900').code, 404, 'an event without boards');
    // board_card_route (Task 5c): /web/avatar/img/v<n>/<sphereBoardId>.png from game_data/avatar_img (make_avatar_card_web.py);
    // numeric ids only, no path out of the folder; the version and the cards present from its cards.json
    assert.strictEqual(web(t.respondAvatarWeb, '/web/avatar/img/v1/5000001.png').code, 404, 'no folder yet');
    fs.mkdirSync(process.env.KHUX_AVATAR_IMG);
    fs.writeFileSync(path.join(process.env.KHUX_AVATAR_IMG, '5000001.png'), 'png1');
    fs.writeFileSync(path.join(dir, 'secret.png'), 'nope');
    fs.writeFileSync(path.join(process.env.KHUX_AVATAR_IMG, 'cards.json'), JSON.stringify({ version: 4242, ids: [5000001] }));
    const card = web(t.respondAvatarWeb, '/web/avatar/img/v4242/5000001.png');
    assert.deepStrictEqual([card.code, card.body], [200, 'png1']);
    // fix round 1: cached as the other image routes (the URL carries the version)
    let hdr = null;
    quiet(() => t.respondAvatarWeb({ writeHead(c, h) { hdr = h; }, end() {} }, '/web/avatar/img/v4242/5000001.png'));
    assert.strictEqual(hdr['Cache-Control'], 'public, max-age=3600');
    assert.strictEqual(hdr['Content-Type'], 'image/png');
    assert.strictEqual(web(t.respondAvatarWeb, '/web/avatar/img/v1/5000001.png').code, 200, 'any version');
    assert.strictEqual(web(t.respondAvatarWeb, '/web/avatar/img/v1/5009999.png').code, 404, 'unknown id');
    for (const bad of ['/web/avatar/img/v1/../secret.png', '/web/avatar/img/v1/..%2Fsecret.png', '/web/avatar/img/v1/secret.png', '/web/avatar/img/v1/5000001.png.png',
      '/web/avatar/img/v1/-1.png', '/web/avatar/img/../../secret.png', '/web/avatar/img/v1/cards.json']) assert.strictEqual(web(t.respondAvatarWeb, bad).code, 404, bad);
    const withCards = pages.expandCatalog(web(t.respondAvatarWeb, '/web/avatar/catalog').body);
    assert.ok(rowOf(withCards, 29930).includes('data-src="/web/avatar/img/v4242/5000001.png"'), 'the version of cards.json');
    fs.writeFileSync(path.join(process.env.KHUX_AVATAR_IMG, 'cards.json'), JSON.stringify({ version: 4243, ids: [] }));
    fs.utimesSync(path.join(process.env.KHUX_AVATAR_IMG, 'cards.json'), new Date(), new Date(Date.now() + 5000));
    const plainRow = rowOf(pages.expandCatalog(web(t.respondAvatarWeb, '/web/avatar/catalog').body), 29930);
    assert.ok(!plainRow.includes('data-src="/web/avatar/img/') && plainRow.includes('class="nb"'), 'a board without a card file: the neutral box, seen without a restart');
    assert.deepStrictEqual(JSON.parse(web(t.respondEventPost, '/web/event/keep/29900').body), { ok: true });
    assert.strictEqual(web(t.respondEventPost, '/web/event/keep/29930').code, 409, 'not through the event keep');
    assert.deepStrictEqual(JSON.parse(web(t.respondAvatarPost, '/web/avatar/keep/29930').body), { ok: true });
    assert.deepStrictEqual([t.player.events.kept, t.player.avatarBoards.kept], ['E-0', 'B-W'], 'both kept');
    // the Avatar Board Catalog banner in the Special tab, after the Special Catalog banner; its picture from /web/event/img
    const sp = t.eventRoutes().withAvatarCatalog([{ eventStageId: 7000 }, { eventStageId: 7101 }]);
    assert.deepStrictEqual(sp.map((e) => e.eventStageId), [7000, 20704, 7101]);
    assert.ok(sp[1].bannerUrl.endsWith('/web/event/img/v' + routesEvents.EVENT_IMG_VERSION + '/20704.png'), sp[1].bannerUrl);
    // the Special Catalog page carries the entry block
    assert.ok(!web(t.respondSpecialWeb, '/web/special/catalog').body.includes('/web/avatar/catalog'), 'no Avatar Board Catalog block (user 23-11)');
    assert.deepStrictEqual(JSON.parse(web(t.respondAvatarPost, '/web/avatar/unkeep').body), { ok: true });
    assert.deepStrictEqual([t.player.events.kept, t.player.avatarBoards.kept], ['E-0', null]);
    // an old save with the BOARD entry in the shared keep: moved at login (migrateKept), the event keep cleared
    t.player.events.kept = 'B-W';
    quiet(() => t.migrateAvatarKeep());
    assert.deepStrictEqual([t.player.events.kept, t.player.avatarBoards.kept], [null, 'B-W']);
    console.log('ok wiring_pages');
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* temp */ }
  }
}
try { wiring(); } catch (e) { failed++; console.error(`FAIL wiring: ${e.stack}`); }

// user 24-11: the TYPE chips BOOST / COLLAB / SPEC showed their bare code without an icon. Every event type of the census has a
// label and an icon key that the icon route serves; with the live index here, every type in it too
try {
  const { SPECIAL_ICON_KEYS } = require('./special-pages');
  const opts = pages.TYPE_OPTS;
  const live = (() => { try { return require('./game_data/events.json').entries.map((e) => String(e.type || 'EQ')); } catch (e) { return []; } })();
  for (const t of new Set(['EQ', 'STORY', 'GEM', 'COIN', 'KEY', 'QUIZ', 'CELEB', 'BOARD', 'HSC', 'BOOST', 'COLLAB', 'SPEC', ...live])) {
    const o = opts.find((x) => x[0] === t);
    assert.ok(o && o[1] && o[1] !== t, `type ${t}: a label`);
    assert.ok(o[2] && SPECIAL_ICON_KEYS.includes(o[2]), `type ${t}: an icon key served (${o && o[2]})`);
  }
  assert.deepStrictEqual(['BOOST', 'COLLAB', 'SPEC'].map((t) => opts.find((x) => x[0] === t).slice(1)),
    [['Booster Challenges', 'booster'], ['Collaborations', 'material'], ['Daily Presents', 'camp']]);
} catch (e) { failed++; console.error(`FAIL type chips: ${e.stack}`); }

if (failed) { console.error(`test-event-pages: ${failed} FAIL`); process.exit(1); }
console.log('test-event-pages: OK');
process.exit(0);
