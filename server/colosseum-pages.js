// Coliseum Catalog web page (Coliseum Part 1 Task 6; spec docs/superpowers/specs/2026-11-25-coliseum-design.md «Coliseum Catalog»,
// «Kept season»): WebView opened from the Details button of the Coliseum Catalog banner (evStage 6000 of make-colosseum.js), the
// first catalog banner of the Events tab (user 25-11). Pure HTML, no player or master access: server.js passes the rows
// (routes-colosseum.js catalogRows: one per served season, oldest first, with its catalog state) and the context.
// Same look and parts as the Raid / Event Catalogs (raid-pages.js catalogPage; catalog-pages.js PAGE_HEAD, pill, Keep / Remove button
// and script; special-pages.js CSS and icons), so the phone layout of phone-css.js (#rows>.row cards, 70 %) applies unchanged.
// One row per season: its card (game_data/colosseum_img/<colosseumStageId>.png, make_special_banners.py --section colosseum), the
// month, tiers / AP / Coliseum Boards, the player's progress in that season, ONE status line and at most ONE Keep / Remove button.
// Only playable rows (served seasons); no Filters (four seasons) and no details page (everything is on the row).
// ctx: {unlocked (story quest 130 reached), imgVersion, boardName(sphereBoardId) -> name | null, unlockQuestOf(row) -> N | null}.
'use strict';
const special = require('./special-pages');
const parts = require('./catalog-pages');

const { CSS: SPECIAL_CSS, esc, monthYear, icon } = special;
const { PAGE_HEAD, pill, keepJs } = parts;
const BASE = '/web/colosseum', WHERE = 'the Coliseum';
const UNLOCK_QUEST = 130; // routes-colosseum.js UNLOCK_QUEST (not required here: the page module stays free of the routes)

// the page's own lines: the progress line of a row (Coliseum gold), the intro box
const CSS = SPECIAL_CSS + '.pg{color:#ffcd4a;font-size:14px;margin-top:2px}.lk{background:#06283e;border-radius:6px;padding:8px 10px;margin:6px 0;color:#ffcd4a;font-size:15px}';

// the pills the page script writes after a keep / remove: [row class, html]; now / nowKept: the season of the Story with nothing
// kept / while another season is kept (the script rewrites it after every keep / remove)
const PILLS = { kept: ['pinned', `${icon('pin')}Kept: the Coliseum plays this season`], can: ['can', `${icon('pin')}Past season — can be kept`],
  now: ['now', `${icon('now')}Season of your Story now`], nowKept: ['now', `${icon('now')}Season of your Story (it plays again when you remove the kept season)`] };
const titleOf = (row) => `Coliseum · ${monthYear(`${row.month}-01`)}`;
const imgOf = (ctx, id) => `${BASE}/img/v${ctx.imgVersion || 1}/${id}.png`;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const apText = (r) => (r.apMin === r.apMax ? `${r.apMin} AP per round` : `${r.apMin}–${r.apMax} AP per round`);

// Status of a row: cls (side bar), pill (status line), button (1 Keep, 0 Remove, null none)
function statusOf(row, ctx, keptRow) {
  const open = ctx.unlocked !== false;
  if (row.state === 'kept') return { cls: 'pinned', pill: pill(PILLS.kept[0], '', PILLS.kept[1]), button: open ? 0 : null };
  if (row.state === 'can') return { cls: 'can', pill: pill(PILLS.can[0], '', PILLS.can[1]), button: open ? 1 : null };
  if (row.state === 'now') { const p = keptRow ? PILLS.nowKept : PILLS.now; return { cls: 'now', pill: pill(p[0], '', p[1]), button: null }; }
  if (row.state === 'other') return { cls: 'other', pill: pill('other', '', 'Its month starts this week: not the season yet'), button: null };
  const q = ctx.unlockQuestOf ? ctx.unlockQuestOf(row) : undefined;
  const text = q === undefined || q === null ? 'Reached later in the Story' : `Unlocks at Story Quest ${q}`;
  return { cls: 'off', pill: pill('off', 'later', text), button: null };
}

// the player's progress in a season: the last round cleared (tier / round in tier) and the season's Coliseum Coins
function progressOf(row) {
  const coins = row.coins ? ` · ${row.coins} Coliseum Coin${row.coins === 1 ? '' : 's'}` : '';
  return row.userStageTotalCount ? `Cleared up to Tier ${row.userRank}, Round ${row.userStageCount}${coins}` : `Not played yet${coins}`;
}

// ES5: after a keep / remove the kept row gold, the previous one back to its own state (data-base, data-bcls, data-bpill: a kept
// season can sit on the story month or later, ruling 10), the «Replaces» lines (catalog-pages.js kxRows of keepJs, shared with the
// Raid and Event Catalogs), then the line of the season of the Story (whether another season is kept)
const JS = "var PILL=__PILL__,R=[].slice.call(document.querySelectorAll('#rows .row'));"
  + "kxRows(R,PILL,{after:function(){var k=false,i,s;for(i=0;i<R.length;i++)if(R[i].getAttribute('data-show')==='kept')k=true;"
  + "for(i=0;i<R.length;i++)if(R[i].getAttribute('data-show')==='now'){s=R[i].querySelector('.s');if(s)s.innerHTML=PILL[k?'nowKept':'now'][1];}}});";
// the state a row returns to when it is not kept (routes-colosseum.js catalogCard base; a row without one: «can» when kept)
const baseOf = (row) => row.base || (row.state === 'kept' ? 'can' : row.state);
const pillInner = (html) => html.slice(html.indexOf('>') + 1, html.lastIndexOf('</span>'));

function catalogPage(rows, ctx = {}) {
  const keptRow = rows.find((r) => r.state === 'kept');
  const html = rows.map((row) => {
    const st = statusOf(row, ctx, keptRow), name = esc(titleOf(row));
    const boards = (row.boardIds || []).map((id) => (ctx.boardName ? ctx.boardName(id) : null)).filter(Boolean);
    const line = `${plural(row.tiers, 'tier')} · ${apText(row)}${boards.length ? ` · Boards: ${boards.map(esc).join(' · ')}` : ''}`;
    const replaces = parts.replacesLine(st, keptRow ? titleOf(keptRow) : null);
    const button = st.button === null ? ''
      : `<div>${parts.keepButton(BASE, row.colosseumStageId, st.button, ' onclick="var b=this;return kxKeep(b,function(on){kxRow(b.getAttribute(\'data-id\'),on);})"', '', WHERE)}</div>`;
    const base = baseOf(row), bst = base === row.state ? st : statusOf({ ...row, state: base }, ctx, keptRow);
    return `<div class="row ${st.cls}" id="q${row.colosseumStageId}" data-eid="${row.colosseumStageId}" data-show="${row.state}" data-name="${name}"`
      + ` data-base="${esc(base)}" data-bcls="${esc(bst.cls)}" data-bpill="${esc(pillInner(bst.pill))}">`
      + `<div class="im"><img width="320" height="70" src="${imgOf(ctx, row.colosseumStageId)}" alt=""></div>`
      + `<div class="info"><span class="nm">${name}</span><div class="d">${line}</div><div class="pg">${esc(progressOf(row))}</div>${st.pill}${replaces}${button}</div></div>\n`;
  }).join('');
  const locked = ctx.unlocked === false
    ? `<div class="lk">${icon('lock')}The Coliseum opens at Story Quest ${UNLOCK_QUEST}: then a past season can be kept here.</div>` : '';
  const js = JS.replace('__PILL__', JSON.stringify(PILLS));
  return PAGE_HEAD('Coliseum Catalog', CSS) + '<body>'
    + '<div class="hdr"><h1>Coliseum Catalog</h1></div>'
    + '<p class="n">Every Coliseum season of this server, one per month as in the original game. The Coliseum plays the season of your Story; '
    + 'a past season can be kept here, one at a time, and the Coliseum then plays it until you remove it. Each season keeps its own progress, '
    + 'Coliseum Coins and Coliseum Boards. The Coliseum Catalog is an addition of this server.</p>'
    + locked
    + `<div id="rows">${html || '<p class="n">No Coliseum season is served yet.</p>'}</div>`
    + `<div id="pinmsg" class="pinmsg"></div><script>${keepJs(BASE, 'season', WHERE)}</script><script>${js}</script></body></html>`;
}

module.exports = { catalogPage, statusOf, progressOf, PILLS };
