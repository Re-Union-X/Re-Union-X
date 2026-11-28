// Event Catalog web pages (Events Part 1, plan docs/superpowers/plans/2026-11-06-events-part1-framework.md Task 5, spec
// docs/superpowers/specs/2026-11-06-events-design.md): WebView opened from the Details button of the Event Catalog banner (evStage
// catalogEvStage of make-events.js) in the Events tab, the details page of an event and the original notice of an event (Details
// of its card). Pure HTML, no player or master access: server.js passes the index (game_data/events.json) and the context
// (routes-events.js catalogCtx plus the pages' lookups). Same style as the Raid Catalog (raid-pages.js, approved 06-11): the
// shared parts come from catalog-pages.js (Keep button and script, merged «On this server» box with «Rebuilt values» closed and
// its colour bands, «Original notice» card, notice layout).
// ctx: {shopFrom, shopTo, current (Set of census ids listed now), kept (census id), imgVersion, fromCatalog, from,
// unlockQuestOf(entry) -> N | null, stageDone(stageId) -> true when that quest has all its objectives done (crown, PROGRESS filter),
// hasNotice(censusId) -> true when its original notice text is on this server, eventBoard(boardId) -> {name, cells, finish} | null
// (Event Boards of the details page; their names and rewards also feed FIND), questRewards(stageId) -> [names of the objective
// rewards] (FIND; absent: none), boardBought(sphereBoardId) -> true when the player bought that avatar board (Part 7 Task 5)}.
// Avatar boards (Events Part 7 Task 5): an entry with boards (index joined by avatar-boards.js catalogIndex) lists them with their
// price and status. Task 5b (user 15-11: boards are not playable events): the BOARD entries (boards, no quest) are not in the Event
// Catalog; they and the boards of an event that also sold some are in the Avatar Board Catalog (boardCatalogPage, /web/avatar/
// catalog, reached from the Special Catalog), with its own keep (routes-events.js boardCatalogCtx / keepBoard, one kept entry at a
// time, independent of the kept event) and its own details page (boardDetailPage, /web/avatar/board/<evStageId>).
// States (calendar-util.js rowState): now (listed this Shop week), kept, can (past: can be kept), other (dates inside the week,
// not open now: a short-window event off its day), later, removed (no quest served yet: «Not built yet», never hidden).
'use strict';
const special = require('./special-pages');
const { rowState, informative } = require('./calendar-util');
const parts = require('./catalog-pages');
const { shownRank } = require('./ranked-rewards');

const { CSS, DETAIL_CSS, esc, niceDay, monthYear, icon, CROWN, gameYearOf, GAME_YEARS, YEAR_SPAN, MATCH_JS, PROG_OPTS, progCls, boardMark, hereMark, hereRow } = special;
const { PAGE_HEAD, pill, RULE_CSS, SRV_CSS, FOLD_CSS, NOTICE_CSS, rebuiltValues, srvFrame, noticeCard, parseNotice, noticeBlocks, backBar, packCatalog, expandCatalog, UNPACK_JS,
  FILTER_BUTTON, filterOpts, optLabel, optLabels, filterSheet } = parts;

const BASE = '/web/event';
const BOARD_BASE = '/web/avatar'; // the Avatar Board Catalog (Task 5b)
const BOARD_WHERE = 'Avatar Boards'; // the screen its kept boards are listed in (keep button and messages)
const keepButton = (id, on, extra = '', cls = '') => parts.keepButton(BASE, id, on, extra, cls);
const boardKeepButton = (id, on, extra = '', cls = '') => parts.keepButton(BOARD_BASE, id, on, extra, cls, BOARD_WHERE);
const { DETAIL_KEEP } = require('./phone-css'); // the compact Keep / Remove of the detail pages on phones
const cards = require('./detail-cards'); // section cards and colour roles of the detail pages
const KEEP_JS = parts.keepJs(BASE, 'event');
const BOARD_KEEP_JS = parts.keepJs(BOARD_BASE, 'entry', BOARD_WHERE);
// the pills the page script writes after a keep / remove: [row class, html]; the Avatar Board Catalog has its own
const PILLS = { kept: ['pinned', `${icon('pin')}Kept in the event list`], can: ['can', `${icon('pin')}Past event — can be kept`] };
const BOARD_PILLS = { kept: ['pinned', `${icon('pin')}Kept: its boards are in Avatar Boards`], can: ['can', `${icon('pin')}Past boards — can be kept`] };
const dateRange = (e) => `${niceDay(e.start)} – ${niceDay(e.end || e.start)}`;
// the catalogue's date line: one day once (Part 4: about 340 short events, catalog_size_budget)
const dateLine = (e) => (!e.end || e.end === e.start ? niceDay(e.start) : dateRange(e));
const imgOf = (ctx, id) => `${BASE}/img/v${ctx.imgVersion || 1}/${id}.png`;
// a record whose original notice had no banner has no card file (Gem Boards 20014/20017/20040, user 08-11): the broken-image
// icon is replaced by a plain box of the same size
const NO_CARD = (w, h, text = 'No card in the original') => ` onerror="this.outerHTML='<span style=&quot;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;`
  + `width:${w}px;max-width:100%;height:${h}px;border:1px solid #2f6f93;border-radius:6px;background:#06283e;color:#b9cfdc;font-size:13px&quot;>${text}</span>'"`;
// the same box on the catalogue rows, from one function (written before the rows: an image can fail while the page loads)
const NO_CARD_JS = `function kxNc(im){var s=document.createElement('span');s.className='nc';s.textContent='No card in the original';im.parentNode.replaceChild(s,im);}`;
const NO_CARD_CSS = '.nc{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;width:320px;max-width:100%;height:70px;border:1px solid #2f6f93;'
  + 'border-radius:6px;background:#06283e;color:#b9cfdc;font-size:13px}';
// Board cards (Task 5c, user 15-11): the original board cards the client shows in Avatar Boards (img/sphere_incentive/<id>.png),
// served at /web/avatar/img/v<n>/<sphereBoardId>.png from game_data/avatar_img (recon/tools/make_avatar_card_web.py, at most
// 160 px). ctx.boardImgVersion (cards.json of that folder: cache busting), ctx.boardCard(id) -> true when the folder has its card
// (absent: every served board is shown, a missing file falls back to the box). A board with the plain card (the 8 Skill
// Enhancement runs), a held board or a card that fails to load: a neutral box with no picture (.nb). These boards had cards:
// the empty-row box says «No card», never «in the original».
const boardImg = (ctx, id) => `${BOARD_BASE}/img/v${ctx.boardImgVersion || 1}/${id}.png`;
const hasCard = (ctx, id) => !!id && (!ctx.boardCard || !!ctx.boardCard(id));
const NB = '<span class="nb"></span>';
const BOARD_NC_JS = "function kxNb(im){var s=document.createElement('span');s.className='nb';im.parentNode.replaceChild(s,im);}";
const BOARD_ROW_CSS = '.im.bc{display:flex;align-items:center;gap:6px;height:70px}.im.bc img,.im.bc .nb{width:70px;height:70px;flex:0 0 70px;border-radius:6px}'
  + '.nb{display:inline-block;box-sizing:border-box;border:1px solid #2f6f93;border-radius:6px;background:#06283e}'
  + '.more{display:inline-block;padding:2px 8px;border-radius:11px;background:#06283e;border:1px solid #2f6f93;color:#ffcd4a;font-size:14px;font-weight:bold}'
  + '.o.st-bought.on{background:#b8860b;border-color:#ffe08a}.o.st-notbought.on{background:#1a6fa8;border-color:#62a7ff}'
  + '.o.pr-part.on{background:#1a6fa8;border-color:#62a7ff}.o.pr-none.on{background:#5a6470;border-color:#9aa4ae}.sheet .hint.sh{margin-top:6px}';
const BOARD_CARD_CSS = 'td.bc{width:64px;padding-right:0}td.bc img,td.bc .nb{display:block;width:64px;height:64px;border-radius:6px}';
const detailHref = (id) => `${BASE}/event/${id}?from=catalog`;
// cat: where the Avatar Board Catalog was opened from (special, event; none from its banner), carried to the entry page so its BACK
// returns to the catalogue with its own BACK bar (fix round 1)
const ORIGINS = ['special', 'event', 'catalog'];
const origin = (x) => (ORIGINS.includes(x) ? x : null);
const boardQuery = (cat) => `?from=catalog${origin(cat) ? `&cat=${origin(cat)}` : ''}`;
const boardDetailHref = (id, cat) => `${BOARD_BASE}/board/${id}${boardQuery(cat)}`;
const servedOf = (e) => (e.quests || []).filter((q) => q.served);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// A quest not served yet, in plain words (make-events.js `why` holds the builder's note: enemy ids, map keys). Part 4 Task 4: the
// reasons whose why is the player's text of event_config.json reasonText (or a fixed line here)
const PLAIN_REASONS = {
  boosterOnly: 'Every reward of this quest is a Booster: it comes back with the Boosters, in a later update.',
  rewardTypeUnknown: 'A reward of this quest is of a kind this server cannot give yet: the quest comes back when it can.',
  quizTextMissing: 'The picture board with the question of this quiz is not in the surviving game files: the quest comes back when its board is rebuilt.',
  objectiveMismatch: 'Its objectives differ between the khuxwiki page and the surviving game data: it is held back until they are confirmed.',
  // Part 5 Task 3
  objectiveUnmapped: 'An objective of this quest is known only from its text: it is held back until the surviving game data proves it, never served with a guessed one.',
  enemyAmbiguous: 'Our game data holds several versions of one of its enemies with different strength: it is held back until the right one is confirmed.',
};
function whyPlain(why, reason) {
  if (PLAIN_REASONS[reason]) return PLAIN_REASONS[reason];
  const w = String(why || '');
  if (/^enemies not in the master/.test(w)) return 'An enemy of this quest is still being searched for in the surviving game files: the quest comes back when it is found.';
  if (/raid or Special/.test(w)) return 'It is a raid or Special quest: it is served by the Raid Catalog or the Special tab instead.';
  if (/^rooms of another world/.test(w)) return 'Its original map lies in another world than the quest itself: it is held back until it is checked.';
  if (/^map key/.test(w)) return 'Its map is also the map of another quest in the surviving game data: it cannot be served on its own yet.';
  return 'Its data is not complete in the surviving game files yet.';
}

// Avatar boards (Events Part 7 Task 5): an entry with boards (avatar-boards.js catalogIndex, entry.boards) and a BOARD entry, one
// with boards and no quest of its own (make-events.js avatarCatalog)
const boardsOf = (e) => (Array.isArray(e.boards) ? e.boards : []);
const boardOnly = (e) => boardsOf(e).length > 0 && !(e.quests || []).length;
// the served boards of an entry, each board once (a board of several windows of the entry counts once)
const servedBoards = (e) => { const seen = new Set(); return boardsOf(e).filter((b) => b.served && b.sphereBoardId && !seen.has(b.sphereBoardId) && seen.add(b.sphereBoardId)); };
// the cards of a catalogue row (Task 5c): up to 3 served boards side by side at the row's card height, «+N» for the others;
// -> {html, ids, more} (the card ids and the «+N» number, packed apart: catalog-pages.js packCatalog fields.c / cm; the size
// of a card is in BOARD_ROW_CSS)
const ROW_CARDS = 3;
function rowCards(e, ctx) {
  const bs = servedBoards(e);
  if (!bs.length) return { html: '<span class="nc">No card</span>', ids: [], more: 0 };
  const shown = bs.slice(0, ROW_CARDS), ids = shown.filter((b) => hasCard(ctx, b.sphereBoardId)).map((b) => b.sphereBoardId);
  const more = Math.max(0, bs.length - ROW_CARDS);
  const html = shown.map((b) => (hasCard(ctx, b.sphereBoardId) ? `<img data-src="${boardImg(ctx, b.sphereBoardId)}" loading="lazy" alt="" onerror="kxNb(this)">` : NB)).join('')
    + (more ? `<span class="more">+${more}</span>` : '');
  return { html, ids, more };
}
// owned (Task 5c, user 15-11): a board on sale once bought; a board handed out once it was given to the player or a node of it
// is unlocked (avatar-boards.js owned, ctx.boardOwned(id, type)); without that lookup: ctx.boardBought
const ownedOf = (ctx, b) => (ctx.boardOwned ? !!ctx.boardOwned(b.sphereBoardId, b.type) : !!(ctx.boardBought && ctx.boardBought(b.sphereBoardId)));
// the marks of a row for SHOW Bought / Not bought and PROGRESS (on the boards' nodes, ctx.boardProgress(id) -> done | part | none):
// own (a board owned), buy (a board not owned yet), prog: done (every board complete), part (a node unlocked), none; an entry
// with no served board: none of them ('' progress)
function boardMarks(e, ctx) {
  const bs = servedBoards(e);
  if (!bs.length) return { own: 0, buy: 0, prog: '' };
  const own = bs.map((b) => ownedOf(ctx, b)), pg = bs.map((b) => (ctx.boardProgress ? ctx.boardProgress(b.sphereBoardId) || 'none' : 'none'));
  const prog = pg.every((p) => p === 'done') ? 'done' : pg.some((p) => p !== 'none') ? 'part' : 'none';
  return { own: own.some(Boolean) ? 1 : 0, buy: own.some((x) => !x) ? 1 : 0, prog };
}
// Status of an event: show (state), cls (side bar), pill (status line), button (1 Keep, 0 Remove, null none), why (details page)
function statusOf(e, ctx) {
  if (boardOnly(e)) return boardStatusOf(e, ctx);
  const st = rowState(e, ctx);
  if (st === 'removed') {
    const raidish = /raid or Special/.test(e.why || '');
    return { show: st, cls: 'off', pill: pill('off', 'removed', 'Not built yet'), button: null,
      why: raidish ? 'Its quests are raid or Special quests: they are served by the Raid Catalog or the Special tab.'
        : 'None of its quests can be served yet: the reasons are listed with the quests below. It comes back when they are recovered.' };
  }
  if (st === 'other') {
    return { show: st, cls: 'other', pill: pill('other', '', 'This week, not open now'), button: null,
      why: 'Your Story has reached its dates, but it is not open in the Events tab now (a short event opens only on its own day). It cannot be kept while its week is current.' };
  }
  if (st === 'now') return { show: st, cls: 'now', pill: pill('now', 'now', 'In Events this week'), button: null, why: 'It is in the Events tab this week, as in the original game.' };
  if (st === 'kept') {
    return { show: st, cls: 'pinned', pill: pill(PILLS.kept[0], '', PILLS.kept[1]), button: 0,
      why: 'You keep this event in the Events tab, beside the events of the week. A quest of one original day opens on that weekday.' };
  }
  if (st === 'can') {
    return { show: st, cls: 'can', pill: pill(PILLS.can[0], '', PILLS.can[1]), button: 1,
      why: 'Its dates are over: you can keep it in the Events tab, one event at a time. Its rewards are the same as in its dates, so a quest reward is never given twice.' };
  }
  return laterStatus(e, ctx);
}
function laterStatus(e, ctx) {
  const q = ctx.unlockQuestOf ? ctx.unlockQuestOf(e) : undefined;
  const text = q === undefined ? 'Reached later in the Story' : q === null ? 'Not reached in this version of the Story' : `Unlocks at Story Quest ${q}`;
  const why = q === undefined || q === null ? 'Its dates come later in the Story: it opens when your Story reaches them.' : `Its dates come later in the Story: it opens when you reach Story Quest ${q}.`;
  return { show: 'later', cls: 'off', pill: pill('off', 'later', text), button: null, why };
}
// Status of an entry in the Avatar Board Catalog (a BOARD entry, or an event that also sold boards: its boards only). ctx is the
// board catalogue's (routes-events.js boardCatalogCtx: current = a board of the entry listed this week, kept = the kept board entry)
function boardStatusOf(e, ctx = {}) {
  // an entry whose boards are all held (an event with quests is «available» through them): never keepable here (fix round 1)
  if (!boardsOf(e).some((b) => b.served)) return boardStatus(e, 'removed', ctx);
  const st = rowState(e, ctx);
  return st === 'later' ? laterStatus(e, ctx) : boardStatus(e, st, ctx);
}
// its boards are in Avatar Boards while their window is in the story week, or while it is kept
function boardStatus(e, st, ctx = {}) {
  const sale = boardsOf(e).some((b) => b.served && b.type === 2);
  if (st === 'removed') {
    return { show: st, cls: 'off', pill: pill('off', 'removed', 'Not built yet'), button: null,
      why: 'None of its boards can be served yet: the reasons are listed with the boards below. They come back when they are recovered.' };
  }
  if (st === 'now') {
    return { show: st, cls: 'now', pill: pill('now', 'now', sale ? 'On sale this week' : 'In Avatar Boards this week'), button: null,
      why: `Its boards are in Avatar Boards this week${sale ? ', at the price of these dates' : ''}, as in the original game.` };
  }
  if (st === 'kept') {
    return { show: st, cls: 'pinned', pill: pill(BOARD_PILLS.kept[0], '', BOARD_PILLS.kept[1]), button: 0,
      why: 'You keep these boards in Avatar Boards, beside the ones of the week, at their original price. A board you buy stays yours when you keep another entry. Your kept event is not changed.' };
  }
  if (st === 'other' && ctx.boardLocked && ctx.boardLocked.has(e.censusId)) {
    return { show: st, cls: 'other', pill: pill('other', '', 'Unlocks after the previous board'), button: null,
      why: 'Its boards are in your Story week, but each opens only once the board before it is complete, as in the original game. It cannot be kept while its dates are current.' };
  }
  if (st === 'other') {
    return { show: st, cls: 'other', pill: pill('other', '', 'This week, no board on sale'), button: null,
      why: 'Your Story week is inside its dates, but none of its boards served here is on sale or handed out this week (each board has its own dates). It cannot be kept while its dates are current.' };
  }
  return { show: st, cls: 'can', pill: pill(BOARD_PILLS.can[0], '', BOARD_PILLS.can[1]), button: 1,
    why: 'Its dates are over: you can keep it, one entry at a time, and its boards are listed in Avatar Boards again at their original price. Your kept event is not changed.' };
}
const keptOf = (entries, ctx) => entries.find((e) => rowState(e, ctx) === 'kept');
// «Replaces: <kept event>» over a Keep button; hidden on the kept row, which gets it back when another event is kept (kxRow)
// (catalog-pages.js replacesLine, shared with the Raid and Coliseum Catalogs)
const replacesLine = (st, kept) => parts.replacesLine(st, kept ? catName(kept) : null);
// every served quest with its objectives done (ctx.stageDone, the crown rule of the Special and Raid Catalogs)
const doneOf = (e, ctx) => !!ctx.stageDone && servedOf(e).length > 0 && servedOf(e).every((q) => ctx.stageDone(q.stageId));
// an informative notice, not a playable event (calendar-util.js informative, shared with make-events.js): not in the catalogue,
// no page (e.g. EV-0579 «New Event Coins Available in October!»: its boards are reached through the playable events of their set)
// the name of an event in the Event Catalog: catalogName (make-events.js, the original banner names the event otherwise), else its name
const catName = (e) => e.catalogName || e.name || e.censusId;
const entriesOf = (index) => ((index && index.entries) || []).filter((e) => e && e.censusId && e.evStageId && e.start && !informative(e))
  .slice().sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.evStageId - b.evStageId));
// the Event Catalog lists events only (Task 5b); the Avatar Board Catalog every entry with avatar boards
const eventEntriesOf = (index) => entriesOf(index).filter((e) => !boardOnly(e));
const boardEntriesOf = (index) => entriesOf(index).filter((e) => boardsOf(e).length > 0);
// an entry by its id or by the id of one of its original evStage rows (Part 2 Task 5: the Details of a row card)
const entryOfId = (entries, id) => entries.find((x) => x.evStageId === id) || entries.find((x) => (x.rows || []).some((r) => r.evStageId === id));

// ES5: a row opens its details page; after a keep / remove the kept row turns gold, the previous one back to «can be kept»
const ROWS_JS = `(function(){var PILL=__PILL__;
function attr(el,a){return el.getAttribute(a);}
var rows=[].slice.call(document.querySelectorAll('.row'));
function href(el){return __HREF__+attr(el,'data-eid')+__QUERY__;}
function nameOf(el){var n=el.querySelector('.nm');return n?n.textContent:'';}
window.kxK=function(b){return kxKeep(b,function(on){kxRow(b.getAttribute('data-id'),on);});};
var afterKeep=function(){if(window.kxRender)kxRender();};
kxRows(rows,PILL,{name:nameOf,after:afterKeep});
rows.forEach(function(el){el.onclick=function(e){var t=e.target;while(t&&t!==el){if(t.tagName==='A')return;t=t.parentNode;}location.href=href(el);};});
})();`;

// Filters (user 13-11: «filters like the Raid Catalog», raid-pages.js): FIND / SHOW / PROGRESS / TYPE in a sheet, the summary line
// with its chips, the empty-state line and «Matches:» under a row found by FIND.
// TYPE of an event: the type of its census row (index entries .type); only the kinds in the index get a chip, an unknown one by its code
const TYPE_OPTS = [['all', 'All'], ['EQ', 'Event Quests', 'camp'], ['STORY', 'Story Events', 'avatar'], ['GEM', 'Gem Quests', 'jewel'], ['COIN', 'Event Coins', 'medal'],
  ['KEY', 'Keyblade Challenges', 'skill'], ['QUIZ', 'Quizzes', 'daily'], ['CELEB', 'Celebrations', 'lux'], ['BOARD', 'Avatar Boards', 'avatar'],
  ['HSC', 'High Score Challenges', 'bonus'], ['BOOST', 'Booster Challenges', 'booster'], ['COLLAB', 'Collaborations', 'material'],
  ['SPEC', 'Daily Presents', 'camp'],
  // I-344 Part B (ruling R3, user 28-11): the census types of the monthly mission lists, the damage contests, the campaign quests
  ['MISSION', 'Monthly Missions', 'daily'], ['RANK', 'Damage Contests', 'raid'], ['CAMP-LOGIN', 'Campaign Quests', 'camp']];
const typeOf = (e) => String(e.type || 'EQ');
const SHOW_OPTS = [['all', 'All events'], ['now', 'In Events now', 'now'], ['can', 'Can be kept now', 'pin'], ['kept', 'Kept', 'pin'], ['later', 'Later in the Story', 'later'],
  ['removed', 'Not built yet', 'removed']];
// «In Events now» shows the kept event too (the Raid Catalog's rule); «other» (this week, not open now) only under All events
const SHOW_SETS = { now: ['now', 'kept'] };
// EVENT BOARDS (user 16-11, the Raid Catalog's RAID BOARDS): 'done' when every served Event Board of the event's set is complete
// (ctx.eventBoard(id).done), 'todo' when one is not, 'none' without a served board (neither). boards: the page's memo of searchOf
const EVENT_BOARD_OPTS = [['all', 'All'], ['done', 'Completed', 'bdone'], ['todo', 'Not completed', 'btodo']];
const EVENT_BOARD_CSS = '.o.bd-done.on{background:#2e9e3e;border-color:#6fd47f}.o.bd-todo.on{background:#5a6470;border-color:#9aa4ae}';
// HIGH SCORE (I-276, user 16-11): 'top' when the best run of an HSC reached its top (rank 1) threshold, i.e. every ranking reward
// was received; 'below' otherwise; null for an event that is not a High Score Challenge (ctx.hscBest(censusId): best or null)
const HSC_TOP_OPTS = [['all', 'All'], ['top', 'Rank 1 reached', 'done'], ['below', 'Not reached', 'todo']];
const HSC_TOP_CSS = '.o.hs-top.on{background:#2e9e3e;border-color:#6fd47f}.o.hs-below.on{background:#5a6470;border-color:#9aa4ae}';
function hscTopState(e, ctx) {
  const thr = e.hsc && e.hsc.thresholds;
  if (!thr || !thr.length) return null;
  const best = ctx.hscBest ? ctx.hscBest(e.censusId) : null;
  return Number.isFinite(best) && best >= thr[thr.length - 1].score ? 'top' : 'below';
}
function eventBoardsState(e, index, ctx, boards) {
  const set = e.boardSet && ((index && index.boardSets) || {})[e.boardSet];
  if (!set || !ctx.eventBoard) return 'none';
  const bs = (set.boardIds || []).map((id) => { if (!boards.has(id)) boards.set(id, ctx.eventBoard(id)); return boards.get(id); }).filter(Boolean);
  if (!bs.length) return 'none';
  return bs.every((b) => b.done) ? 'done' : 'todo';
}
// item names of an event for FIND («Matches:»): its names, quest names, type, Event Board names and rewards, the objective
// rewards of its served quests; without repeats (case aside). boards: memo of ctx.eventBoard for the page
const bareReward = (r) => String(r || '').replace(/ x\d+$/, '');
// a series of quests numbered at the end («Organization XIII No. 11 Marluxia I» … «XIII», «… Advanced #1» … «#3», «Coco
// Challenge 1/10» … «10/10») counts once, by the name without its numbers (the page stays light: about 3,500 quest names give
// about 550 names); a name of its own in its event stays whole
const seriesBase = (n) => {
  let s = String(n || '').replace(/#\d+|\b\d+\/\d*/g, ' '), o;
  do { o = s; s = s.replace(/[\s:#,./-]*(?:\d+|\b[IVXL]+)?[\s:#,./-]*$/, ''); } while (s !== o);
  return s.replace(/\(\s*\)/g, ' ').replace(/\s+/g, ' ').trim();
};
const questNames = (quests) => {
  const base = seriesBase, count = new Map();
  for (const q of quests) count.set(base(q.name), (count.get(base(q.name)) || 0) + 1);
  return quests.map((q) => (base(q.name) && count.get(base(q.name)) > 1 ? base(q.name) : q.name));
};
function searchOf(e, ctx, index, boards) {
  const set = e.boardSet && ((index && index.boardSets) || {})[e.boardSet];
  const board = (id) => { if (!boards.has(id)) boards.set(id, ctx.eventBoard(id)); return boards.get(id); };
  const bs = set && ctx.eventBoard ? (set.boardIds || []).map(board).filter(Boolean) : [];
  const type = TYPE_OPTS.find((o) => o[0] === typeOf(e));
  const parts = [catName(e), e.name, ...questNames(e.quests || []), type ? type[1] : '',
    ...bs.flatMap((b) => [b.name, ...b.cells.map((c) => c.reward), b.finish].map(bareReward)).filter((x) => !/^(Max (HP|AP|Cost) \+|Reward$)/.test(x)),
    ...(ctx.questRewards ? servedOf(e).flatMap((q) => ctx.questRewards(q.stageId)) : []), ...boardsOf(e).map((b) => b.name)];
  const seen = new Set();
  return parts.map((x) => String(x || '').replace(/\s+/g, ' ').replace(/ \| /g, ' / ').trim())
    .filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())).join(' | ');
}
// ES5, no external script (the Raid Catalog's filter script without its sections and year chips): rows read once at start; a
// game-year tab (Part 4 Task 6: the Shop's game years, data-p) and the Filters sheet only toggle a class; then the cards of the
// shown rows load (kxImgs of UNPACK_JS: lazy loading per tab). A keep / remove (kxRow of ROWS_JS) renders again. A #q<id> link
// to a row of another year opens that year.
const FILTER_JS = `(function(){/* year tabs and filters */
var PN=__PN__,LAB={type:__TYPE__,show:__SHOW__,prog:__PROG__,bd:__BD__,hs:__HS__},SHOWSET=__SHOWSET__;
__MATCH__
function $(id){return document.getElementById(id);}
function attr(el,a){return el&&el.getAttribute?el.getAttribute(a):null;}
var tabs=$('tabs');if(!tabs)return;
var kids=[].slice.call($('rows').children),rows=[],i;
for(i=0;i<kids.length;i++)if(/(^| )row( |$)/.test(kids[i].className))rows.push({el:kids[i],p:attr(kids[i],'data-p'),t:attr(kids[i],'data-type'),dn:attr(kids[i],'data-done')==='1',
own:attr(kids[i],'data-own')==='1',buy:attr(kids[i],'data-buy')==='1',pg:attr(kids[i],'data-prog'),bd:attr(kids[i],'data-boards'),hs:attr(kids[i],'data-hscore'),ns:(attr(kids[i],'data-search')||'').split(' | '),mt:kids[i].querySelector?kids[i].querySelector('.mt'):null});
function blank(p){return {p:p,type:'all',show:'all',prog:'all',bd:'all',hs:'all',q:''};}
var cur=blank(attr(tabs,'data-def')||'all'),dr=null;
function copy(s){return {p:s.p,type:s.type,show:s.show,prog:s.prog,bd:s.bd,hs:s.hs,q:s.q};}
function hits(r,qq,max){var o=[],i;for(i=0;i<r.ns.length&&o.length<max;i++)if(khuxMatch(qq,r.ns[i]))o.push(r.ns[i]);return o;}
function match(r,s,anyPeriod){
if(!anyPeriod&&s.p!=='all'&&r.p!==s.p)return false;
if(s.type!=='all'&&r.t!==s.type)return false;
if(s.show==='bought'){if(!r.own)return false;}else if(s.show==='notbought'){if(!r.buy)return false;}
else if(s.show!=='all'&&(SHOWSET[s.show]||[s.show]).indexOf(attr(r.el,'data-show'))<0)return false;
if(s.prog!=='all'&&(r.pg!==null?r.pg!==s.prog:r.dn!==(s.prog==='done')))return false;
if(s.bd!=='all'&&r.bd!==s.bd)return false;
if(s.hs!=='all'&&r.hs!==s.hs)return false;
return !s.q||hits(r,s.q,1).length>0;}
function count(s){var n=0;for(var i=0;i<rows.length;i++)if(match(rows[i],s))n++;return n;}
function nf(s){return (s.type!=='all'?1:0)+(s.show!=='all'?1:0)+(s.prog!=='all'?1:0)+(s.bd!=='all'?1:0)+(s.hs!=='all'?1:0)+(s.q?1:0);}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function plural(n,w){return n+' '+w+(n===1?'':'s');}
function tag(g,l){return '<span class="tag">'+l+'<a href="#" data-x="'+g+'" aria-label="Remove">×</a></span>';}
function hide(el,h){el.className=el.className.replace(/ hide/g,'')+(h?' hide':'');}
function render(){
var c={all:0},n=0,i,r,on,lab=null,any=false,el;
for(i=0;i<rows.length;i++){r=rows[i];if(match(r,cur,true)){c.all++;c[r.p]=(c[r.p]||0)+1;}on=match(r,cur);hide(r.el,!on);if(on)n++;}
// a month label without a shown row is hidden
for(i=0;i<kids.length;i++){el=kids[i];if(/(^| )ml( |$)/.test(el.className)){if(lab)hide(lab,!any);lab=el;any=false;}else if(/(^| )row( |$)/.test(el.className)&&!/ hide/.test(el.className))any=true;}
if(lab)hide(lab,!any);
[].forEach.call(tabs.querySelectorAll('.tab'),function(t){var p=attr(t,'data-p'),k=t.querySelector?t.querySelector('.c'):null;t.className='tab'+(p===cur.p?' on':'');if(k)k.textContent=c[p]||0;});
var f=nf(cur),h='<span class="n1">'+n+' '+(n===1?__NOUN__:__NOUNS__)+'</span>';
if(cur.p!=='all')h+=' in <b>'+esc(PN[cur.p])+'</b>';
if(!f)h+=' · no filters';
else{h+=' match your filters:';
if(cur.type!=='all')h+=' '+tag('type',LAB.type[cur.type]);
if(cur.show!=='all')h+=' '+tag('show',LAB.show[cur.show]);
if(cur.prog!=='all')h+=' '+tag('prog',LAB.prog[cur.prog]);
if(cur.bd!=='all')h+=' '+tag('bd',LAB.bd[cur.bd]);
if(cur.hs!=='all')h+=' '+tag('hs',LAB.hs[cur.hs]);
if(cur.q)h+=' '+tag('q','Find: &quot;'+esc(cur.q)+'&quot;');
h+=' <a href="#" class="clear" data-x="all">Clear all</a>';}
$('sum').innerHTML=h;if(typeof kxImgs==='function')kxImgs();$('fdot').textContent=f?f:'';
for(i=0;i<rows.length;i++){r=rows[i];if(!r.mt)continue;var w=cur.q&&r.el.className.indexOf(' hide')<0?hits(r,cur.q,3):[];r.mt.textContent=w.length?'Matches: '+w.join(', '):'';r.mt.style.display=w.length?'block':'none';}
var none=$('none'),wq=(cur.prog==='done'?'completed ':cur.prog==='todo'?'incomplete ':'')+__NOUNS__+(cur.bd==='done'?' with completed Event Boards':cur.bd==='todo'?' with Event Boards to complete':'')+(cur.hs==='top'?' with rank 1 reached':cur.hs==='below'?' without rank 1':'');none.textContent=n?'':(cur.q?'No '+wq+' match "'+cur.q+'"':'No '+wq+' match your filters');none.style.display=n?'none':'';}
window.kxRender=render;
function sync(){[].forEach.call(document.querySelectorAll('.sheet .opts'),function(box){var g=attr(box,'data-g');[].forEach.call(box.children,function(o){o.className=o.className.replace(/ on/g,'')+(attr(o,'data-v')===dr[g]?' on':'');});});
$('fok').textContent='Show '+plural(count(dr),'result');}
function openF(){dr=copy(cur);$('fq').value=dr.q;if(document.body.className.indexOf('fo')<0)document.body.className+=' fo';sync();}
function closeF(){dr=null;document.body.className=document.body.className.replace(/ ?fo/g,'');}
$('fbtn').onclick=openF;$('fx').onclick=closeF;$('dim').onclick=closeF;
$('fq').oninput=function(){dr.q=this.value.replace(/\\s+/g,' ').replace(/^ | $/g,'');sync();};
$('fq').onkeydown=function(e){if(e.keyCode===13)this.blur();};
[].forEach.call(document.querySelectorAll('.sheet .opts'),function(box){box.onclick=function(e){var t=e.target;while(t&&t!==box&&!attr(t,'data-v'))t=t.parentNode;var v=attr(t,'data-v');if(!v||!dr)return;dr[attr(box,'data-g')]=v;sync();};});
$('freset').onclick=function(e){e.preventDefault();dr.type='all';dr.show='all';dr.prog='all';dr.bd='all';dr.hs='all';dr.q='';$('fq').value='';sync();};
$('fok').onclick=function(){if(!dr)return;var s=dr;s.p=cur.p;closeF();cur=s;render();};
$('sum').onclick=function(e){var t=e.target;while(t&&t!==this&&!attr(t,'data-x'))t=t.parentNode;var x=attr(t,'data-x');if(!x)return;e.preventDefault();
if(x==='type'||x==='all')cur.type='all';if(x==='show'||x==='all')cur.show='all';if(x==='prog'||x==='all')cur.prog='all';if(x==='bd'||x==='all')cur.bd='all';if(x==='hs'||x==='all')cur.hs='all';if(x==='q'||x==='all')cur.q='';render();};
tabs.onclick=function(e){var t=e.target;while(t&&t!==tabs&&!attr(t,'data-p'))t=t.parentNode;if(!t||t===tabs)return;cur.p=attr(t,'data-p');render();};
var h=location.hash?$(location.hash.slice(1)):null;if(h&&cur.p!=='all'&&attr(h,'data-p')&&attr(h,'data-p')!==cur.p)cur.p=attr(h,'data-p');
render();if(h&&h.scrollIntoView)h.scrollIntoView();})();`;

// The two catalogues built by catalogOf: the Event Catalog (events only, Task 5b) and the Avatar Board Catalog (every entry with
// avatar boards, its own keep). A mode holds what differs: routes, words, entries, status, the count and TYPE of a row.
// TYPE of an entry in the Avatar Board Catalog: the group of its boards (the first window's), as the records name it
const BOARD_TYPE_OPTS = [['all', 'All'], ['outfit', 'Outfit Boards', 'avatar'], ['gem', 'Gem Boards', 'jewel'], ['skill', 'Skill Boards', 'skill'],
  ['medal', 'Medal Boards', 'medal'], ['avatarCoin', 'Avatar Coin Boards', 'camp'], ['avatarCoinBooster', 'Avatar Coin Booster Boards', 'camp'], ['jewelBooster', 'Jewel Booster Boards', 'jewel']];
const boardTypeOf = (e) => String(((e.avatarBoards || [])[0] || boardsOf(e)[0] || {}).group || 'BOARD');
// SHOW (Task 5c, user 15-11): Bought / Not bought (boardMarks, a partly bought entry is under both) beside the states, each of
// which a board entry can have (boardStatusOf: now, kept, can, later, removed; «other» only under All entries)
const BOARD_SHOW_OPTS = [['all', 'All entries'], ['bought', 'Bought', 'jewel'], ['notbought', 'Not bought', 'lock'], ['now', 'In Avatar Boards now', 'now'],
  ['can', 'Can be kept now', 'pin'], ['kept', 'Kept', 'pin'], ['later', 'Later in the Story', 'later'], ['removed', 'Not built yet', 'removed']];
const BOARD_SHOW_HINT = 'Bought: you own at least one of its boards. A board on sale is yours once you bought it with Jewels; a free board once it was '
  + 'handed out to you in Avatar Boards or once you unlocked one of its nodes. Not bought: at least one of its boards is not yours yet.';
// PROGRESS on the boards' nodes (not the quests' crowns): Completed = every board of the entry complete
const BOARD_PROG_OPTS = [['all', 'All'], ['done', 'Completed', 'done'], ['part', 'In progress', 'unlocked'], ['none', 'Not started', 'todo']];
const BOARD_PROG_HINT = 'Counted on the nodes of its boards: Completed when every board is complete, In progress when a node is unlocked.';
// FIND of a board entry: its names, its board group and its boards' names
const boardSearchOf = (e) => {
  const type = BOARD_TYPE_OPTS.find((o) => o[0] === boardTypeOf(e)), seen = new Set();
  return [catName(e), e.name, type ? type[1] : '', ...boardsOf(e).map((b) => b.name)].map((x) => String(x || '').replace(/\s+/g, ' ').replace(/ \| /g, ' / ').trim())
    .filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())).join(' | ');
};
const boardCount = (e) => {
  const nb = boardsOf(e).length, nbs = boardsOf(e).filter((b) => b.served).length;
  return nbs === nb ? plural(nb, 'avatar board') : `${nbs} of ${plural(nb, 'avatar board')} served`;
};
const MODES = {
  event: { base: BASE, title: 'Event Catalog', noun: 'event', entries: eventEntriesOf, status: statusOf, pills: PILLS, keepJs: KEEP_JS, href: detailHref, button: keepButton,
    typeOf, typeOpts: TYPE_OPTS, showOpts: SHOW_OPTS, placeholder: 'Event, quest or reward name', progOpts: PROG_OPTS, css: NO_CARD_CSS + EVENT_BOARD_CSS + HSC_TOP_CSS, ncJs: NO_CARD_JS,
    eventBoards: true,
    hint: 'Matches the start of words in event and quest names and in the rewards of the quests and Event Boards (e.g. Halloween, Marluxia, Dewey).',
    count: (e) => { const served = servedOf(e).length, all = (e.quests || []).length; return served === all ? plural(all, 'quest') : `${served} of ${plural(all, 'quest')} served`; },
    icon: 'camp',
    intro: () => [['weekday', `Every event of the game, ${cards.cyan('by date')}: tap an event for its ${cards.val('quests, boards and rewards')}.`],
      ['pin', `${cards.val('Keep a past event')} in the Events tab, ${cards.cyan('one at a time')}.`]],
    end: () => '' },
  board: { base: BOARD_BASE, title: 'Avatar Board Catalog', noun: 'entry', entries: boardEntriesOf, status: boardStatusOf, pills: BOARD_PILLS, keepJs: BOARD_KEEP_JS,
    href: boardDetailHref, button: boardKeepButton, typeOf: boardTypeOf, typeOpts: BOARD_TYPE_OPTS, showOpts: BOARD_SHOW_OPTS, placeholder: 'Board, character or outfit name',
    hint: 'Matches the start of words in board names and entry names (e.g. Nick Wilde, Gem, Booster).',
    progOpts: BOARD_PROG_OPTS, showHint: BOARD_SHOW_HINT, progHint: BOARD_PROG_HINT, search: boardSearchOf, cards: rowCards, marks: boardMarks,
    css: NO_CARD_CSS + BOARD_ROW_CSS, ncJs: BOARD_NC_JS,
    count: boardCount,
    icon: 'avatar',
    intro: () => [['weekday', `Every limited avatar board of the game, ${cards.cyan('by the dates')} it was on sale or handed out: tap an entry for its ${cards.val('boards and prices')}.`],
      ['now', 'Boards of the week are in Avatar Boards, as in the original game.'],
      ['pin', `${cards.val('Keep a past entry')}, ${cards.cyan('one at a time')}: its boards are listed in Avatar Boards again at their original price. Your kept event never changes.`]],
    end: (index) => heldSection(index) },
};
const plural2 = (n, w) => `${n} ${w === 'entry' ? (n === 1 ? 'entry' : 'entries') : `${w}${n === 1 ? '' : 's'}`}`;
// the page script's plural (FILTER_JS plural(n, noun), «No <noun>s match»): «entry» has its own plural
const NOUN_JS = { event: ["'event'", "'events'"], entry: ["'entry'", "'entries'"] };

// GET /web/event/catalog and /web/avatar/catalog: every entry of the mode by date, one month label per month, one minimal row per
// entry (card, name, date line, ONE status line, at most ONE Keep button, «›»). A record with nothing served yet is «Not built yet».
// ctx.from (Avatar Board Catalog): 'special' or 'event', the BACK bar to the catalogue it was opened from.
function catalogOf(index, ctx, m) {
  const entries = m.entries(index), kept = keptOf(entries, ctx);
  let lastM = '';
  const packed = [], boards = new Map();
  for (const e of entries) {
    const st = m.status(e, ctx), href = esc(m.href(e.evStageId, ctx.from)), mo = e.start.slice(0, 7);
    const label = mo !== lastM ? `<div class="ml" data-m="${mo}">${monthYear(`${mo}-01`)}</div>` : '';
    lastM = mo;
    const line = `${dateLine(e)} · ${m.count(e)}`, name = esc(catName(e)), y = e.start.slice(0, 4);
    // board mode (Task 5c): the board cards, the Bought / Not bought marks and the node progress (Completed: the crown)
    const mk = m.marks ? m.marks(e, ctx) : null, cards = m.cards ? m.cards(e, ctx) : null;
    const done = mk ? mk.prog === 'done' : doneOf(e, ctx), search = esc(m.search ? m.search(e) : searchOf(e, ctx, index, boards)), t = m.typeOf(e);
    const card = cards ? `<span class="im bc">${cards.html}</span>` : `<span class="im"><img width="320" height="70" data-src="${imgOf(ctx, e.evStageId)}" alt="" onerror="kxNc(this)"></span>`;
    // event mode: the EVENT BOARDS state of the row (packed as a mark, so the rows keep sharing their templates)
    const bd = m.eventBoards ? eventBoardsState(e, index, ctx, boards) : null, hs = m.eventBoards ? hscTopState(e, ctx) : null;
    const marks = (mk ? ` data-own="${mk.own}" data-buy="${mk.buy}" data-prog="${mk.prog}"` : '') + (bd ? ` data-boards="${bd}"` : '') + (hs ? ` data-hscore="${hs}"` : '');
    // one minimal row (Part 4 Task 4, catalog_size_budget: about 340 events): the row opens its page (ROWS_JS, from data-eid), the
    // name is the link, the missing card box and the Keep handler are functions of the page; the rows are sent packed, as the
    // Raid Catalog's (catalog-pages.js packCatalog), and the cards load from data-src once the rows are built (kxImgs). The
    // filters read data-p (game year), data-show, data-type, data-done and data-search (FIND names); «Matches:» goes in .mt
    packed.push({ label, fields: { s: search, d: line, n: name, e: String(e.evStageId), y, t, ...(cards && cards.ids.length ? { c: cards.ids } : {}), ...(cards && cards.more ? { cm: cards.more } : {}),
        ...(mk || bd || hs ? { a: [...(mk ? [['data-own', String(mk.own)], ['data-buy', String(mk.buy)], ['data-prog', mk.prog]] : []), ...(bd ? [['data-boards', bd]] : []), ...(hs ? [['data-hscore', hs]] : [])] } : {}) },
      html: `<div class="row ${st.cls}" id="q${e.evStageId}" data-eid="${e.evStageId}" data-show="${st.show}" data-y="${y}" data-p="${gameYearOf(e.start)}"`
      + ` data-type="${t}" data-done="${done ? 1 : 0}"${marks} data-search="${search}">`
      + card
      + `<div class="info"><a class="nm" href="${href}">${name}${done ? CROWN : ''}${boardMark(bd)}</a><div class="d">${line}</div>${st.pill}`
      + `${replacesLine(st, kept)}${st.button === null ? '' : `<div>${m.button(e.evStageId, st.button, ' onclick="return kxK(this)"')}</div>`}`
      + '<div class="mt"></div></div><span class="go">›</span></div>\n' });
  }
  // game-year tabs (the Raid Catalog's): All years + every game year with entries, its count; every catalog opens on «All years»
  // (user 27-11; it opened on the year of the Story week), the year of the Story week carries the «you are here» pin
  const perYear = GAME_YEARS.map((g, i) => entries.filter((e) => gameYearOf(e.start) === i).length);
  const def = 'all';
  const tab = (p, name, sub, n) => `<button type="button" class="tab${p === def ? ' on' : ''}" data-p="${p}">${hereMark(ctx, p)}<b>${esc(name)}</b><small>${esc(sub)}</small><span class="c">${n}</span></button>`;
  const tabsHtml = entries.length ? `<div class="tabs${hereRow(ctx)}" id="tabs" data-def="${def}">${tab('all', 'All years', YEAR_SPAN, entries.length)}`
    + `${GAME_YEARS.map((g, i) => (perYear[i] ? tab(String(i), g.name, g.sub, perYear[i]) : '')).join('')}</div><div class="tabline"></div>` : '';
  // the Filters sheet (the Raid Catalog's: FIND, SHOW, PROGRESS, then TYPE with the kinds of the index only)
  const kinds = new Set(entries.map(m.typeOf));
  const typeOpts = [...m.typeOpts.filter((o, i) => !i || kinds.has(o[0])), ...[...kinds].filter((k) => !m.typeOpts.some((o) => o[0] === k)).sort().map((k) => [k, k])];
  const n0 = def === 'all' ? entries.length : perYear[Number(def)];
  const js = FILTER_JS.replace('__PN__', JSON.stringify(Object.fromEntries(GAME_YEARS.map((g, i) => [i, g.name])))).replace('__TYPE__', optLabels(typeOpts))
    .replace('__SHOW__', optLabels(m.showOpts)).replace('__PROG__', optLabels(m.progOpts))
    .replace('__BD__', JSON.stringify(Object.fromEntries(EVENT_BOARD_OPTS.slice(1).map((o) => [o[0], `Event Boards: ${optLabel(o)}`]))))
    .replace('__HS__', JSON.stringify(Object.fromEntries(HSC_TOP_OPTS.slice(1).map((o) => [o[0], `High Score: ${optLabel(o)}`])))).replace('__SHOWSET__', JSON.stringify(SHOW_SETS)).replace('__MATCH__', () => MATCH_JS)
    .split('__NOUNS__').join(NOUN_JS[m.noun][1]).split('__NOUN__').join(NOUN_JS[m.noun][0]);
  const sheet = filterSheet({ placeholder: m.placeholder, n: n0, hint: m.hint,
    groups: [['SHOW', `<div class="opts" data-g="show">${filterOpts(m.showOpts, (v) => (v === 'all' ? '' : ` st-${v}`))}</div>${m.showHint ? `<div class="hint sh">${esc(m.showHint)}</div>` : ''}`],
      ['PROGRESS', `<div class="opts" data-g="prog">${filterOpts(m.progOpts, progCls)}</div>${m.progHint ? `<div class="hint sh">${esc(m.progHint)}</div>` : ''}`],
      ...(m.eventBoards ? [['EVENT BOARDS', `<div class="opts" data-g="bd">${filterOpts(EVENT_BOARD_OPTS, (v) => (v === 'all' ? '' : ` bd-${v}`))}</div>`]] : []),
      ...(m.eventBoards && entries.some((e) => hscTopState(e, ctx)) ? [['HIGH SCORE', `<div class="opts" data-g="hs">${filterOpts(HSC_TOP_OPTS, (v) => (v === 'all' ? '' : ` hs-${v}`))}</div>`]] : []),
      ['TYPE', `<div class="opts" data-g="type">${filterOpts(typeOpts)}</div>`]] });
  const backTo = { special: '/web/special/catalog', event: `${BASE}/catalog` }[ctx.from];
  const back = m === MODES.board && backTo ? backBar(backTo) : '';
  return PAGE_HEAD(m.title, CSS + m.css) + `<body${back ? ' class="hb"' : ''}><script>${m.ncJs}</script>`
    + cards.catalogHead({ title: m.title, ic: m.icon, side: `${parts.walletChip(ctx.wallet)}${packed.length ? FILTER_BUTTON : ''}`, lines: m.intro() })
    + tabsHtml
    + `<div class="sum" id="sum"><span class="n1">${plural2(n0, m.noun)}</span>${def === 'all' ? '' : ` in <b>${esc(GAME_YEARS[Number(def)].name)}</b>`} · no filters</div>`
    + '<div id="none" class="none" style="display:none"></div>'
    + `<div id="rows">${packed.length ? '' : `<p class="n">No ${plural2(2, m.noun).slice(2)}.</p>`}</div>`
    + (packed.length ? `<script id="kxrows" type="application/json">${packCatalog(packed)}</script><script>${UNPACK_JS}</script>${sheet}` : '')
    + m.end(index)
    + `<div id="pinmsg" class="pinmsg"></div><script>${m.keepJs}</script><script>${ROWS_JS.replace('__PILL__', JSON.stringify(m.pills)).replace('__HREF__', JSON.stringify(`${m.base}/${m === MODES.board ? 'board' : 'event'}/`).replace(/"/g, "'"))
      .replace('__QUERY__', `'${m === MODES.board ? boardQuery(ctx.from) : '?from=catalog'}'`)}</script>`
    + `${packed.length ? `<script>${js}</script>` : ''}${back}</body></html>`;
}
// Game Catalog hub (game-catalog-pages.js, user 26-11): the entries of the Event Catalog (board: of the Avatar Board Catalog, with
// their boards) and the kept one's name
function catalogFacts(index, ctx = {}, board = false) {
  const entries = board ? boardEntriesOf(index) : eventEntriesOf(index), kept = keptOf(entries, ctx);
  // keptBoard (Avatar Board Catalog): the first served board of the kept entry that has a card, its picture in the hub's «Kept now» (the entry has no banner of its own)
  const keptBoard = board && kept ? (servedBoards(kept).find((b) => hasCard(ctx, b.sphereBoardId)) || {}).sphereBoardId || null : null;
  return { entries: entries.length, boards: board ? entries.reduce((n, e) => n + boardsOf(e).length, 0) : 0, kept: kept ? catName(kept) : null, keptId: kept ? kept.evStageId : null, keptBoard };
}
// GET /web/event/catalog: the Event Catalog (events only)
const catalogPage = (index, ctx = {}) => catalogOf(index, ctx, MODES.event);
// GET /web/avatar/catalog: the Avatar Board Catalog (Task 5b)
const boardCatalogPage = (index, ctx = {}) => catalogOf(index, ctx, MODES.board);

// The labels of events.json in the player's words: [group, short label, one short line, icon]; the full sentence is the reason
// of the index (event_config.json reconstructedWhy), folded under «Why these values?»
const EVENT_SHORT = {
  donorKept: ['values', 'Later game data', 'Used instead of the wiki page (the 2018 run)', 'replaced'],
  wikiLowConfidence: ['values', 'Wiki value', 'From khuxwiki, not confirmed by a second source', 'replaced'],
  noWikiPage: ['values', 'No wiki page', 'Later game data only, no second source', 'replaced'],
  otherRunWiki: ['values', 'Wiki of another run', 'Original enemies, confirmed by the khuxwiki page of another run', 'replaced'],
  prefixVersion: ['values', 'Enemy version', 'Chosen by the year and month in its id, not confirmed', 'replaced'],
  jpPeriodVersion: ['values', 'Enemy version', 'Chosen by the Japanese maps of the same period, not confirmed', 'replaced'],
  monthRowOrder: ['values', 'Enemy version', 'Chosen by the order of the event difficulty rows, not confirmed', 'replaced'],
  targetBandVersion: ['values', 'Target version', 'The row the original maps use for this target, not confirmed', 'replaced'],
  pluralityVersion: ['values', 'Enemy version', 'The version the maps of the period use most, not confirmed', 'replaced'],
  donorRowImported: ['values', 'Enemy data', 'From the worldwide game data shared by the community', 'replaced'],
  wikiAp: ['values', 'AP', 'From the khuxwiki page of this run', 'replaced'],
  mapIncomplete: ['values', 'Map', 'Incomplete in our data: the gaps are reported', 'removed'],
  eventCoins: ['rewards', 'Event Coins', 'Paid into the boards of this event; they never expire', 'camp'],
  boardsLater: ['rewards', 'Event boards', 'Not served yet: a reward of these boards cannot be paid here yet; your coins are kept', 'later'],
  noCoinSource: ['rewards', 'Event boards', 'Not handed out yet: no quest pays their Event Coins', 'later'],
  boosterLater: ['rewards', 'Boosters', 'A Booster reward comes with the Boosters (a later update); the other rewards are paid', 'later'],
  noBoardSet: ['rewards', 'Event Coins', 'No board set named for them: logged, not paid', 'removed'],
  communityBonus: ['rewards', 'Community goal', 'Clear every objective: the bonus the original event reached, once, in your Presents', 'bonus'],
  completionReward: ['rewards', 'Completion reward', 'Clear every objective: the reward every finisher got, once, in your Presents', 'camp'],
  quizBoard: ['values', 'Quiz board', 'Redrawn from the khuxwiki text of the question', 'replaced'],
  wholeDay: ['rules', 'Opening time', 'Its whole original day (was a short window)', 'bonus'],
  dramaOff: ['rules', 'Scenes', 'The original scenes are not shown yet', 'later'],
  hscThresholds: ['rewards', 'Score thresholds', 'Ranking rewards by your own best score, not by a leaderboard', 'bonus'],
  chanceSpawns: ['rules', 'Rare enemies', 'They appear at random, 1 run in 2 (our rate), as in the original', 'replaced'],
  materialSpots: ['values', 'Material spots', 'Rebuilt: the totals match the original results, not the positions', 'replaced'],
};
const EVENT_LABEL = { wikiAp: 'AP', donorKept: 'later game data', wikiLowConfidence: 'a wiki value', noWikiPage: 'no wiki page', otherRunWiki: 'wiki of another run', prefixVersion: 'enemy version', jpPeriodVersion: 'enemy version', monthRowOrder: 'enemy version', mapIncomplete: 'map', eventCoins: 'Event Coins',
  wholeDay: 'opening time', dramaOff: 'scenes', boardsLater: 'event boards', noCoinSource: 'event boards', boosterLater: 'Boosters', noBoardSet: 'Event Coins', quizBoard: 'quiz board',
  communityBonus: 'community goal', completionReward: 'completion reward', hscThresholds: 'score thresholds', chanceSpawns: 'rare enemies', materialSpots: 'material spots', targetBandVersion: 'target version', pluralityVersion: 'enemy version', donorRowImported: 'enemy data' };
const EVENT_GROUPS = [['values', 'Quest data', 'tleg', ''], ['rewards', 'Rewards', 'camp', ' rw'], ['rules', 'Rules', 'weekday', ' ru'], ['other', 'Other', 'replaced', ' ot']];
// every label in use: the event's and its quests' (served or not), in the order of EVENT_SHORT, unknown ones last
const codesOf = (e) => {
  const all = new Set([...(e.labels || []), ...(e.quests || []).flatMap((q) => q.labels || [])]);
  return [...Object.keys(EVENT_SHORT).filter((c) => all.has(c)), ...[...all].filter((c) => !EVENT_SHORT[c]).sort()];
};
function rebuilt(e, reasons = {}) {
  const codes = codesOf(e);
  const fold = `<ul class="pl">${codes.map((c) => `<li><b>${esc((EVENT_SHORT[c] || [])[1] || EVENT_LABEL[c] || c)}</b>: ${esc(reasons[c] || 'rebuilt from the surviving sources.')}</li>`).join('')}</ul>`;
  return rebuiltValues(codes, { groups: EVENT_GROUPS, short: EVENT_SHORT, label: (c) => EVENT_LABEL[c] || c, fold });
}
// the quests not served yet, under the rebuilt values
const notServedLine = (e) => {
  const n = (e.quests || []).filter((q) => !q.served).length;
  return n ? `<p class="sbo">${icon('lock')}Not served yet: ${n} of ${plural((e.quests || []).length, 'quest')} (the reasons are with the quests below).</p>` : '';
};
function srvBox(e, st, index, o) {
  return srvFrame(st, { ...o, body: rebuilt(e, (index && index.reasons) || {}) + notServedLine(e) }, 'camp');
}
const EVENT_DETAIL_CSS = '.tt{table-layout:auto}.tt td:nth-child(2),.tt td:nth-child(3){white-space:nowrap}.tt td.r{color:#ffcd4a}.tt small{display:block;color:#b9cfdc;font-size:13px}'
  + '.tt.bt td:nth-child(2){white-space:normal}.bt td.cd{color:#8fe3a0}.bt td.r{white-space:normal}.ecoin{margin:6px 0 12px;font-size:15px}.ecoin b{color:#ffcd4a;font-size:18px}'
  // the Avatar Boards table (class ab, Task 5c fix round 1): card | Board | Dates | Price | Status; Board and Dates wrap, Price on one line
  + '.tt.ab td:nth-child(3){white-space:normal}.tt.ab td:nth-child(4){white-space:nowrap}' + BOARD_CARD_CSS
  // High Score tables on a phone (user 16-11: the 5-column thresholds table broke on mobile): one card per row, each cell on its
  // own line with its column name (data-l), the header row hidden
  + '@media (max-width:700px) and (min-height:481px){table.tt.hs,table.tt.hs>tbody,table.tt.hs tr,table.tt.hs td{display:block!important;width:auto!important;box-sizing:border-box}'
  + 'table.tt.hs{overflow:visible!important;padding:0!important}table.tt.hs tr.hh{display:none!important}'
  + 'table.tt.hs tr{border:1px solid #2f5d78;border-radius:8px;margin:0 0 8px;padding:6px 8px}'
  + 'table.tt.hs td{border:0!important;padding:2px 0!important;white-space:normal!important;text-align:left}'
  + 'table.tt.hs td[data-l]::before{content:attr(data-l) ": ";color:#b9cfdc}table.tt.hs small{display:inline;margin-left:6px}}';
// Event Boards of an entry's set (Part 3 Task 6, as the Raid Catalog lists the boards of a raid, with the cells): the coin line (one
// balance per set, never expires), then each board of the set in order with its cells. ctx.eventBoard(boardId) -> {name, cells:
// [{n, cost, reward, done}], finish, done} | null; ctx.eventCoins(setKey) -> n. '' without a set or without a board served.
function boardsSection(index, e, ctx) {
  const key = e.boardSet;
  const set = key && ((index && index.boardSets) || {})[key];
  if (!set || !ctx.eventBoard) return '';
  const boards = (set.boardIds || []).map((id) => ctx.eventBoard(id)).filter(Boolean);
  if (!boards.length) return '';
  // only the events listed in the catalogue count (Task 8: an informative notice of the set, e.g. EV-0579, is not an event)
  const listed = new Set(entriesOf(index).map((x) => x.censusId));
  const num = (n) => Number(n).toLocaleString('en-US'), shared = (set.censusIds || []).filter((id) => listed.has(id)).length;
  // a generic description (user 26-11: no balance in the detail sections, it is on the Event Catalog header)
  const coins = `<p class="ecoin">The Event Boards of this event: unlock their nodes with Event Coins, earned in its quests. `
    + `One balance per board set${shared > 1 ? `, shared by ${plural(shared, 'event')}` : ''}; Event Coins never expire.</p>`;
  const cell = (c) => `<tr><td>${c.n}</td><td>${c.reward ? esc(c.reward) : '—'}</td><td>${num(c.cost)}</td>`
    + (c.done ? `<td class="cd">Unlocked${CROWN}</td>` : '<td>Not unlocked</td>') + '</tr>';
  const board = (b) => `<h3>${esc(b.name)}${b.done ? CROWN : ''}</h3><table class="tt bt"><tr><th>Cell</th><th>Reward</th><th>Cost</th><th>Status</th></tr>`
    + b.cells.map(cell).join('') + `<tr><td colspan="2">Board complete${b.finish ? `: ${esc(b.finish)}` : ''}</td><td></td><td${b.done ? ' class="cd">Done' : '>—'}</td></tr></table>`;
  // the boards table of every catalog detail page first (detail-cards.js boardTable, user 26-11): card, name, nodes unlocked, Event
  // Coins still needed; then each board's cells
  const sum = (list) => list.reduce((t, c) => t + (Number(c.cost) || 0), 0);
  const table = cards.boardTable(boards.map((b) => ({ id: b.id, name: esc(b.name), img: ctx.eventBoardCard ? ctx.eventBoardCard(b.id) : null, served: true,
    nodes: b.cells.length, unlocked: b.cells.filter((c) => c.done).length, coinsLeft: sum(b.cells.filter((c) => !c.done)), coinsTotal: sum(b.cells) })),
  { currency: 'Event Coins', cls: 'ebt' });
  return `<h2>Event Boards</h2>${coins}${table}${boards.map(board).join('')}`
    + '<p class="n">A board opens in the Events tab while one of the events of its set is in your week or kept.</p>';
}
const daysText = (days) => days.map(niceDay).join(', ');
// a served quest with a Booster reward (make-events.js boosters, label boosterLater): the Booster comes with the Boosters (Part 6)
const boosterLine = (q) => ((q.boosters || []).length ? `<small>${(q.boosters || []).map((b) => `${esc(b.emblemName)} (${b.objective ? `objective ${b.objective}` : 'first clear'})`).join(', ')}: comes with the Boosters</small>` : '');

// High Score Challenge (Events Part 8 Task 6): the point milestones (original) and the score thresholds that stand for the original
// rank brackets (make-events.js entry.hsc, lowest bracket -> top), each with the rank it shows (ranked-rewards.js shownRank) and its
// source label; ctx.hscBest(censusId) -> the player's best score or null (routes-hsc.js). '' without an hsc block (not built yet).
const HSC_SOURCE = { original: 'Original value', scaled: 'Scaled from original', interpolated: 'Interpolated' };
const ordinal = (n) => { const t = n % 100, u = n % 10; return `${num(n)}${t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'}`; };
const hscReward = (r, ctx) => {
  if (r.type === 2) return `${num(r.num)} Jewels`;
  if (r.type === 4) return `${num(r.num)} Munny`;
  const name = r.name || (ctx.itemName && ctx.itemName(r)) || `Reward (type ${r.type}, id ${r.id})`;
  return `${name} x${num(r.num)}`;
};
const hscRewards = (rs, ctx) => (rs || []).map((r) => hscReward(r, ctx)).join(', ') || '—';
function hscSection(e, ctx) {
  const h = e.hsc;
  if (!h || !(h.thresholds || []).length) return '';
  const thr = h.thresholds, top = thr[thr.length - 1];
  const best = ctx.hscBest ? ctx.hscBest(e.censusId) : null, hasBest = Number.isFinite(best);
  const mine = hasBest ? `<p class="ecoin">${icon('bonus')}Your best score: <b>${num(best)}</b> · shown rank: <b>${ordinal(shownRank(thr, best))}</b>.</p>` : '';
  const needed = (t) => t.score;
  const rewardsOf = (t) => ((h.brackets || []).find((b) => b.startRank === t.startRank && b.endRank === t.endRank) || {}).rewards;
  const ranks = (t) => (t.startRank === t.endRank ? `Rank ${num(t.startRank)}` : `Ranks ${num(t.startRank)}–${num(t.endRank)}`);
  const thRows = [...thr].reverse().map((t) => `<tr class="th"><td>${esc(ranks(t))}</td><td data-l="Score">${num(t.score)}${Number.isFinite(t.originalScore) && t.originalScore !== t.score ? `<small>Original: ${num(t.originalScore)}</small>` : ''}</td>`
    + `<td data-l="Rank shown">${ordinal(shownRank(thr, needed(t)))}</td><td data-l="Source">${esc(HSC_SOURCE[t.label] || t.label)}</td><td data-l="Rewards">${esc(hscRewards(rewardsOf(t), ctx))}</td></tr>`).join('');
  const msRows = (h.milestones || []).map((m) => `<tr><td>${num(m.score)}</td><td data-l="Rewards">${esc(hscRewards(m.rewards, ctx))}</td>`
    + (hasBest ? (best >= m.score ? `<td class="cd">Reached${CROWN}</td>` : '<td>Not reached</td>') : '') + '</tr>').join('');
  const pct = (h.scoreBonus || []).filter((x) => Number.isFinite(x));
  // the score-bonus medals (make-events.js bonusMedals): deck slots 1..3 first, then the «Medals» list (display 0); +N% = rate / 100
  const medals = [...(h.bonusMedals || [])].sort((a, b) => (a.display || 4) - (b.display || 4));
  const medalName = (m) => m.name || (ctx.itemName && ctx.itemName({ type: 3, id: m.medalId, num: 1 })) || `Medal ${m.medalId}`;
  const bonus = medals.length
    ? '<h3>Score bonus medals</h3><p class="n">A medal of this list in your deck raises the score of every run by its bonus (the original list of the event).</p>'
      + `<table class="tt hs kn1 kg2"><tr class="hh"><th>Medal</th><th>Bonus</th><th>Shown in</th></tr>${medals.map((m) => `<tr class="bm"><td>${esc(medalName(m))}</td><td data-l="Bonus">+${m.rate / 100}%</td>`
      + `<td data-l="Shown in">${m.display ? `Deck slot ${m.display}` : 'Medals list'}</td></tr>`).join('')}</table>`
    : pct.length ? `<p class="n">Score-bonus medals of the original event (${pct.map((x) => `+${x}%`).join(', ')}): not built yet.</p>` : '';
  return `<h2>High Score</h2>${mine}<h3>Score thresholds</h3>`
    + '<p class="n">In the original game these rewards went by leaderboard position. On this server each original rank bracket is a score threshold: '
    + "when your best run reaches it you receive that bracket's original rewards, once (only the highest bracket reached; a better run later pays the difference). "
    + `The rank shown is the best rank of the bracket you reached. Below ${num(thr[0].score)} points your rank shows as ${ordinal(shownRank(thr, -Infinity))}; `
    + `1st from ${num(top.score)} points.</p>`
    + `<table class="tt hs kn1 kg2 kc3"><tr class="hh"><th>Original ranks</th><th>Score</th><th>Rank shown</th><th>Source</th><th>Rewards</th></tr>${thRows}</table>`
    + (msRows ? `<h3>Point milestones</h3><p class="n">The original milestones: each pays once when your score reaches it.</p><table class="tt hs kg1"><tr class="hh"><th>Score</th><th>Rewards</th>${hasBest ? '<th>Status</th>' : ''}</tr>${msRows}</table>` : '')
    + bonus;
}

// A board not served, in plain words (the builder's note and the build reason of avatar-boards.js stay out of the page)
const BOARD_WHY = [
  [/^priceUnknown/, 'Its original price is not known: it is never sold at a guessed price.'],
  [/^(rewardMissing|unpayable cells|completion|no matched cells)/, 'A reward of this board does not exist on this server yet: the board is held until it is found, never with a replacement.'],
  [/^(windowUnknown|no dated source|no source)/, 'No surviving notice dates this board: it is held until its dates are found.'],
  [/^chained/, 'It opens after another board that is not served yet.'],
];
function boardWhyPlain(why) {
  if (!why) return 'Not on this server yet: it comes with a later update.';
  const hit = BOARD_WHY.find(([re]) => re.test(String(why)));
  return hit ? hit[1] : 'Its data is not complete in the surviving game files yet.';
}
// the record labels of a board window (private builder), one short line each
const BOARD_LABEL_TEXT = {
  priceFromKhuxwiki: 'Price from khuxwiki: no surviving notice states it',
  priceFromDonor: 'Price from later game data: no surviving notice states it',
  windowFromWiki: 'Dates from khuxwiki: no surviving notice dates them',
  windowFromNotice: 'Dates from the original notice of the sale',
  windowFromOtherCensusRow: 'Dates from another notice of the same sale',
  windowFixedFromNotice: 'Dates read from the notice text',
  windowToServiceEnd: 'On sale until the end of the service',
  weeklyRotation: 'One week of a longer sale, as its notice listed it',
  instanceByDonorOrder: 'Several identical boards in the game data: matched to the dates in order',
  pairBySkills: 'Matched to its dates by the skills it gives',
  skillByEffect: 'A skill matched by its effect',
  medalVariantLetter: 'A medal variant matched by its letter',
};
const num = (n) => Number(n).toLocaleString('en-US');
const boardPrice = (b) => (b.type === 1 ? 'Handed out' : Number(b.price) > 0 ? `${num(b.price)} Jewels` : '—');
// «Avatar Boards» of the details page: every board of the entry with its dates, price and status (bought, served, or not served
// with the reason), the labels of its windows, the keep of past boards declared (not original). ctx.boardBought(sphereBoardId).
// On the Event Catalog page of an event that also sold boards (Task 5b): the link to its Avatar Board Catalog page, where they are kept
function avatarBoardsSection(e, ctx, onEventPage = false) {
  const boardLink = `${BOARD_BASE}/board/${e.evStageId}?from=event${ctx.fromCatalog ? '&cat=catalog' : ''}`;
  const boards = boardsOf(e);
  if (!boards.length) return '';
  const status = (b) => {
    if (!b.served) return `<td class="r">Not served yet<small>${esc(boardWhyPlain(b.why))}</small></td>`;
    if (!ownedOf(ctx, b)) return `<td>${b.type === 1 ? 'Served' : 'Served, for sale'}</td>`;
    return `<td class="cd">${b.type === 1 ? 'Handed out to you' : 'Bought'}${CROWN}</td>`;
  };
  // the boards table of every catalog detail page (detail-cards.js boardTable, user 26-11): its card (Task 5c: the picture of a
  // served board with a card, else the neutral box), name, dates, price, status, nodes unlocked and Avatar Coins still needed
  const rows = boards.map((b) => {
    const pr = b.served && ctx.boardNodes ? ctx.boardNodes(b.sphereBoardId) : null;
    return { id: b.sphereBoardId, name: esc(b.name), img: b.served && hasCard(ctx, b.sphereBoardId) ? boardImg(ctx, b.sphereBoardId) : null, served: true,
      ...(pr || {}), extra: [b.window ? esc(`${niceDay(b.window[0])} – ${niceDay(b.window[1])}`) : '—', esc(boardPrice(b)), status(b)] };
  });
  const codes = [...new Set((e.avatarBoards || []).flatMap((w) => w.labels || []))];
  const notes = codes.length ? `<ul class="pl">${codes.map((c) => `<li>${esc(BOARD_LABEL_TEXT[c] || c)}</li>`).join('')}</ul>` : '';
  return `<script>${BOARD_NC_JS}</script><h2>Avatar Boards</h2>${cards.boardTable(rows, { currency: 'Avatar Coins', extraHeads: ['Dates', 'Price', 'Status'], cls: 'bt ab kc3 kg4' })}${notes}`
    + '<p class="n">A board on sale is bought once with Jewels and stays yours; its nodes are opened with Avatar Coins. In the original game these boards were sold '
    + `only in their dates: on this server a past entry can be kept in the ${onEventPage ? `<a href="${esc(boardLink)}">Avatar Board Catalog ›</a>` : 'Avatar Board Catalog'}, `
    + 'and its boards are listed in Avatar Boards again at their original price (an addition of this server, not original). Keeping it never changes your kept event.</p>';
}
// the end of the catalogue: the avatar boards no dated window places (index.avatarHeld, make-events.js), with the reason
function heldSection(index) {
  const held = (index && index.avatarHeld) || [];
  if (!held.length) return '';
  // one line per reason, each name once with its count (about 100 boards: the catalogue stays light)
  const byWhy = new Map();
  for (const h of held) {
    const w = boardWhyPlain(h.why);
    if (!byWhy.has(w)) byWhy.set(w, new Map());
    byWhy.get(w).set(String(h.name), (byWhy.get(w).get(String(h.name)) || 0) + 1);
  }
  const names = (m) => [...m].map(([n, k]) => (k > 1 ? `${n} (${k})` : n)).join(', ');
  return `<details class="ah"><summary>Avatar boards with no dates on this server (${held.length})</summary><ul class="pl">`
    + [...byWhy].map(([w, m]) => `<li>${esc(w)} <b>${esc(names(m))}</b></li>`).join('') + '</ul></details>';
}

// GET /web/event/event/<evStageId>: header (name, card), the «On this server» box first (status, Keep button, the Story line,
// Rebuilt values closed, quests not served yet, links), then the event and its quests (each served or «Not served yet» with the
// reason in plain words). null = unknown id (404).
function detailPage(index, evStageId, ctx = {}) {
  const entries = eventEntriesOf(index), e = entryOfId(entries, Number(evStageId));
  if (!e) return null;
  const st = statusOf(e, ctx), kept = keptOf(entries, ctx), title = catName(e);
  const button = st.button === null ? '' : `<div>${keepButton(e.evStageId, st.button, ' onclick="var b=this;return kxKeep(b,function(){b.style.display=\'none\';})"', DETAIL_KEEP)}</div>`;
  const quests = e.quests || [];
  const nb = boardsOf(e).length, nbs = boardsOf(e).filter((b) => b.served).length;
  const kv = [['Dates', dateRange(e)], ['Game year', GAME_YEARS[gameYearOf(e.start)].name],
    ...(boardOnly(e) ? [] : [['Quests', quests.length === servedOf(e).length ? String(quests.length) : `${servedOf(e).length} of ${quests.length} served`]]),
    ...(nb ? [['Avatar boards', nbs === nb ? String(nb) : `${nbs} of ${nb} served`]] : []),
    ...(Array.isArray(e.days) && e.days.length ? [['Open', `Only on ${daysText(e.days)} (its whole day)`]] : [])]
    // colour roles (detail-cards.js): the dates cyan
    .map(([k, v]) => `<tr><th>${k}</th><td>${k === 'Dates' ? cards.cyan(esc(v)) : esc(v)}</td></tr>`).join('');
  const qRows = quests.map((q) => {
    const done = q.served && ctx.stageDone && ctx.stageDone(q.stageId);
    const day = Array.isArray(q.days) && q.days.length ? `<small>Open on ${esc(daysText(q.days))}</small>` : '';
    return `<tr><td>${esc(q.name || '')}${done ? CROWN : ''}${day}</td><td>${q.level ?? ''}</td><td>${q.ap ?? ''}</td>`
      + (q.served ? `<td>Served${boosterLine(q)}</td>` : `<td class="r">Not served yet<small>${esc(whyPlain(q.why, q.reason))}</small></td>`) + '</tr>';
  }).join('');
  // the original evStage rows of the event (Part 2 Task 5): one card each in the Events tab, with its own dates and quests
  const rows = Array.isArray(e.rows) && e.rows.length > 1 ? e.rows : [];
  const cardsHtml = rows.length ? `<h2>Cards</h2><p class="n">In the original game this event showed ${rows.length} cards in the Events tab, each with its own dates and quests.</p>`
    + `<table class="tt"><tr><th>Card</th><th>Dates</th><th>Quests</th></tr>${rows.map((r) => `<tr><td>${r.available && r.evStageId ? `<img width="160" height="35" src="${imgOf(ctx, r.evStageId)}" alt=""${NO_CARD(160, 35)}>` : ''}</td>`
      + `<td>${esc(`${niceDay(r.start)}${r.end && r.end !== r.start ? ` – ${niceDay(r.end)}` : ''}`)}${Array.isArray(r.days) && r.days.length ? '<small>its whole day</small>' : ''}</td>`
      + (r.available ? `<td>${esc(plural((r.stageIds || []).length, 'quest'))}</td>` : `<td class="r">Not served yet<small>${esc(plural(r.quests || 0, 'quest'))}</small></td>`) + '</tr>').join('')}</table>` : '';
  const back = ctx.fromCatalog ? backBar(`${BASE}/catalog#q${e.evStageId}`) : '';
  const notice = ctx.hasNotice && ctx.hasNotice(e.censusId) ? 'Original notice of this event ›' : '';
  const box = srvBox(e, st, index, { after: `<div id="pinmsg" class="pinmsg"></div>${replacesLine(st, kept)}${button}`,
    intro: `This server follows your Story, not the calendar: this event of the original game (${esc(dateRange(e))}) opens when your Story reaches it.`,
    links: [...(notice ? [[`${BASE}/notice/${e.evStageId}?from=event`, notice]] : []), [`${BASE}/catalog`, 'Event Catalog ›']] });
  return PAGE_HEAD(title, CSS + DETAIL_CSS + EVENT_DETAIL_CSS + RULE_CSS + SRV_CSS + FOLD_CSS + cards.CARD_CSS) + `<body${back ? ' class="hb"' : ''}>`
    + `<h1>${esc(title)}</h1><img class="banner" width="640" height="140" src="${imgOf(ctx, e.evStageId)}" alt=""${NO_CARD(640, 140)}>${box}`
    // the sections as cards (detail-cards.js cardSections, user 26-11); quest columns: name bold, LV cyan, AP gold
    + cards.cardSections(`<h2>Event</h2><table class="kv">${kv}</table>`
    + cardsHtml + hscSection(e, ctx) + boardsSection(index, e, ctx) + avatarBoardsSection(e, ctx, true)
    + (boardOnly(e) ? '' : `<h2>Quests</h2><table class="tt kn1 kc2 kg3"><tr><th>Quest</th><th>LV</th><th>AP</th><th>Status</th></tr>${qRows}</table>`))
    + `<p class="n">The Event Catalog is an addition of this server: in the original game an event was played only in its own dates.</p>${back}<script>${KEEP_JS}</script></body></html>`;
}

// GET /web/event/notice/<evStageId> (Details of an event card, as in the original game): the event's original notice(s). doc =
// game_data/event_notices.json (make-event-notices.js, git-ignored SQUARE ENIX text, read at request time by server.js):
// {rows: {censusId: {noticeIds}}, notices: {id: {title, date, time, category, body: [lines]}}}. Laid out as the raid notices
// (catalog-pages.js noticeBlocks: every sentence unchanged), one «Original notice» card per notice; a notice of several events
// shows the sections that name this event when some do, else all of it. ctx.from === 'event': BACK to the details page. No
// notice (no file, unknown id, no text): a friendly page, never an error.
const compact = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function noticeSections(body, name) {
  const { sections } = parseNotice(body);
  const named = sections.filter((s) => s.head), n = compact(name);
  const mine = n ? named.filter((s) => compact(s.head).includes(n) || n.includes(compact(s.head))) : [];
  return (named.length > 1 && mine.length ? mine : sections).map((s) => `<div class="ns">${s.head ? `<h2>${esc(s.head)}</h2>` : ''}${noticeBlocks(s.lines)}</div>`).join('');
}
function noticeMissing(e, ctx) {
  const back = e && ctx.from === 'event' ? backBar(`${BASE}/event/${e.evStageId}?from=catalog`) : '';
  return PAGE_HEAD('Notice not available', CSS + DETAIL_CSS + NOTICE_CSS) + `<body${back ? ' class="hb"' : ''}><h1>Notice not available</h1>`
    + '<p class="na">The original notice of this event is not available on this server.'
    + (e ? ` <a href="${BASE}/event/${e.evStageId}">See this event in the Event Catalog ›</a>` : '') + `</p>${back}</body></html>`;
}
function noticePage(index, evStageId, doc, ctx = {}) {
  let e = null;
  try {
    e = entryOfId(entriesOf(index), Number(evStageId)) || null;
    const hit = e && doc && doc.rows ? doc.rows[e.censusId] : null;
    const notices = (hit && doc.notices ? hit.noticeIds || [] : []).map((id) => doc.notices[id]).filter((n) => n && Array.isArray(n.body));
    if (!notices.length) return noticeMissing(e, ctx);
    const n = notices[0], st = statusOf(e, ctx);
    const back = ctx.from === 'event' ? backBar(`${BASE}/event/${e.evStageId}?from=catalog`) : '';
    return PAGE_HEAD(n.title, CSS + DETAIL_CSS + NOTICE_CSS) + `<body${back ? ' class="hb"' : ''}>`
      + `<img class="banner" width="640" height="140" src="${imgOf(ctx, e.evStageId)}" alt=""${NO_CARD(640, 140)}>`
      + `<h1>${esc(n.title)}</h1><p class="dt">${n.category ? `<span class="chip">${esc(n.category)}</span>` : ''}<span class="chip d">${esc(niceDay(n.date))}${n.time ? ` · ${esc(n.time)} UTC` : ''}</span></p>`
      + srvBox(e, st, index, { intro: 'Below: the original notice of this event, unchanged (top-player lists left out). '
        + `Its dates are the original game's (${esc(dateRange(e))}): here the event opens when your Story reaches them.`,
        links: [[`${BASE}/event/${e.evStageId}`, 'This event in the Event Catalog ›'], [`${BASE}/catalog`, 'Event Catalog ›']] })
      + notices.map((x) => noticeCard('camp', x.date, noticeSections(x.body, e.name))).join('')
      + `${back}</body></html>`;
  } catch (err) {
    return noticeMissing(e, ctx);
  }
}

// GET /web/avatar/board/<evStageId> (Task 5b): an entry of the Avatar Board Catalog, its boards with dates, prices and status, the
// «On this server» box with its own Keep button. null = no such entry with boards (404). ctx: boardCatalogCtx plus the page lookups.
function boardDetailPage(index, evStageId, ctx = {}) {
  const entries = boardEntriesOf(index), e = entryOfId(entries, Number(evStageId));
  if (!e) return null;
  const st = boardStatusOf(e, ctx), kept = keptOf(entries, ctx), title = catName(e);
  const button = st.button === null ? '' : `<div>${boardKeepButton(e.evStageId, st.button, ' onclick="var b=this;return kxKeep(b,function(){b.style.display=\'none\';})"', DETAIL_KEEP)}</div>`;
  const kv = [['Dates', dateRange(e)], ['Game year', GAME_YEARS[gameYearOf(e.start)].name], ['Avatar boards', boardCount(e)]]
    .map(([k, v]) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`).join('');
  const cat = origin(ctx.cat);
  const back = ctx.fromCatalog ? backBar(`${BOARD_BASE}/catalog${cat && cat !== 'catalog' ? `?from=${cat}` : ''}#q${e.evStageId}`)
    : ctx.from === 'event' ? backBar(`${BASE}/event/${e.evStageId}${cat === 'catalog' ? '?from=catalog' : ''}`) : '';
  const links = [...((e.quests || []).length ? [[`${BASE}/event/${e.evStageId}`, 'This event in the Event Catalog ›']] : []), [`${BOARD_BASE}/catalog`, 'Avatar Board Catalog ›']];
  const box = srvFrame(st, { after: `<div id="pinmsg" class="pinmsg"></div>${replacesLine(st, kept)}${button}`,
    intro: `This server follows your Story, not the calendar: these boards of the original game (${esc(dateRange(e))}) are listed in Avatar Boards when your Story reaches their dates.`,
    links }, 'avatar');
  return PAGE_HEAD(title, CSS + DETAIL_CSS + EVENT_DETAIL_CSS + RULE_CSS + SRV_CSS + FOLD_CSS + cards.CARD_CSS) + `<body${back ? ' class="hb"' : ''}>`
    // an event that also sold boards keeps its event card; a BOARD entry has none (its boards' cards are in the table, Task 5c)
    + `<h1>${esc(title)}</h1>${boardOnly(e) ? '' : `<img class="banner" width="640" height="140" src="${imgOf(ctx, e.evStageId)}" alt=""${NO_CARD(640, 140, 'No card')}>`}${box}`
    + cards.cardSections(`<h2>Entry</h2><table class="kv">${kv}</table>${avatarBoardsSection(e, ctx)}`)
    + `<p class="n">The Avatar Board Catalog is an addition of this server: in the original game a board was sold only in its own dates.</p>${back}<script>${BOARD_KEEP_JS}</script></body></html>`;
}

module.exports = { catalogPage, catalogFacts, TYPE_OPTS, detailPage, noticePage, statusOf, boardCatalogPage, boardDetailPage, boardStatusOf, whyPlain, boardWhyPlain, entriesOf, eventEntriesOf, boardEntriesOf,
  boardOnly, expandCatalog, informative };
