// Coliseum Catalog web page (Coliseum Part 1 Task 6; spec docs/superpowers/specs/2026-11-25-coliseum-design.md «Coliseum Catalog»,
// «Kept season»): WebView opened from the Details button of the Coliseum Catalog banner (evStage 6000 of make-colosseum.js), the
// first catalog banner of the Events tab (user 25-11). Pure HTML, no player or master access: server.js passes the rows
// (routes-colosseum.js catalogRows: one per served season, oldest first, with its catalog state) and the context.
// Same look and parts as the Raid / Event Catalogs (raid-pages.js catalogPage; catalog-pages.js PAGE_HEAD, pill, Keep / Remove button
// and script; special-pages.js CSS and icons), so the phone layout of phone-css.js (#rows>.row cards, 70 %) applies unchanged.
// One row per season: its card (game_data/colosseum_img/<colosseumStageId>.png, make_special_banners.py --section colosseum), the
// month, tiers / AP / Coliseum Boards, the player's progress in that season, ONE status line and at most ONE Keep / Remove button.
// Only playable rows (served seasons), the year tabs and Filters of the other catalogs (FJS) and no details page (everything is on
// the row).
// ctx: {unlocked (story quest 130 reached), imgVersion, boardName(sphereBoardId) -> name | null, unlockQuestOf(row) -> N | null}.
'use strict';
const special = require('./special-pages');
const parts = require('./catalog-pages');

const { CSS: SPECIAL_CSS, esc, monthYear, icon, MATCH_JS, gameYearOf, GAME_YEARS, YEAR_SPAN } = special;
const { PAGE_HEAD, pill, keepJs, FILTER_BUTTON, filterOpts, optLabel, optLabels, filterSheet } = parts;
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
  + "for(i=0;i<R.length;i++)if(R[i].getAttribute('data-show')==='now'){s=R[i].querySelector('.s');if(s)s.innerHTML=PILL[k?'nowKept':'now'][1];}"
  + "if(window.kxRender)window.kxRender();}});";

// Filters (I-328, user 26-11: as the Raid / Event Catalogs, catalog-pages.js FILTER_BUTTON / filterSheet): FIND (month and board
// names), SHOW (the row's state, read live: a keep changes it), COLISEUM BOARDS (row data-boards: done / todo / none, routes-colosseum.js
// boardsOf) and TIER REWARDS (data-tiers: done / todo). A filtered row only gets « hide» (phone-css.js #rows>.row.hide, special-pages
// .hide), so the phone card grid is the same as the other catalogs.
const SHOW_OPTS = [['all', 'All seasons'], ['now', 'Season of your Story', 'now'], ['can', 'Can be kept now', 'pin'], ['kept', 'Kept', 'pin'], ['later', 'Later in the Story', 'later']];
const SHOW_SETS = { later: ['later', 'other'] }; // «its month starts this week» is not reached as a season yet
const BOARD_OPTS = [['all', 'All'], ['done', 'Completed', 'bdone'], ['todo', 'Not completed', 'btodo']];
const TIER_OPTS = [['all', 'All'], ['done', 'All taken', 'done'], ['todo', 'Not all taken', 'todo']];
// chip colours: st-* (SHOW) and pr-* (TIER REWARDS, the PROGRESS chips of the Raid / Event Catalogs) come with special-pages.js CSS;
// bd-* (COLISEUM BOARDS) as the Raid / Event Board chips (raid-pages.js, event-pages.js). phone-css.js changes only their size
const FILTER_CSS = '.o.bd-done.on{background:#2e9e3e;border-color:#6fd47f}.o.bd-todo.on{background:#5a6470;border-color:#9aa4ae}';
const FJS = '(function(){var LAB=__LAB__,SETS=__SETS__,PN=__PN__;' + MATCH_JS
  + 'function $(i){return document.getElementById(i);}function at(e,a){return e&&e.getAttribute?e.getAttribute(a):null;}'
  + "if(!$('sum'))return;"
  + "var R=[].slice.call(document.querySelectorAll('#rows .row')),cur=blank(),dr=null;"
  + "function blank(){return {p:'all',show:'all',bd:'all',tr:'all',q:''};}function copy(s){return {p:s.p,show:s.show,bd:s.bd,tr:s.tr,q:s.q};}"
  + "function ok(el,s,anyP){var st=at(el,'data-show');if(!anyP&&s.p!=='all'&&(' '+at(el,'data-p')+' ').indexOf(' '+s.p+' ')<0)return false;if(s.show!=='all'&&(SETS[s.show]||[s.show]).indexOf(st)<0)return false;"
  + "if(s.bd!=='all'&&at(el,'data-boards')!==s.bd)return false;if(s.tr!=='all'&&at(el,'data-tiers')!==s.tr)return false;"
  + "return !s.q||khuxMatch(s.q,at(el,'data-search')||'');}"
  + 'function count(s){var n=0,i;for(i=0;i<R.length;i++)if(ok(R[i],s))n++;return n;}'
  + "function nf(s){return (s.show!=='all'?1:0)+(s.bd!=='all'?1:0)+(s.tr!=='all'?1:0)+(s.q?1:0);}"
  + "function pl(n,w){return n+' '+w+(n===1?'':'s');}"
  + "function esc(t){return String(t).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c];});}"
  + 'function tag(g,l){return \'<span class="tag">\'+l+\'<a href="#" data-x="\'+g+\'" aria-label="Remove">×</a></span>\';}'
  + "function render(){var n=0,i,j,on,ys,c={all:0};for(i=0;i<R.length;i++){on=ok(R[i],cur);R[i].className=R[i].className.replace(/ hide/g,'')+(on?'':' hide');if(on)n++;"
  + "if(ok(R[i],cur,true)){c.all++;ys=(at(R[i],'data-p')||'').split(' ');for(j=0;j<ys.length;j++)c[ys[j]]=(c[ys[j]]||0)+1;}}"
  + "[].forEach.call(document.querySelectorAll('#tabs .tab'),function(t){t.className='tab'+(at(t,'data-p')===cur.p?' on':'');});"
  + "for(var k in PN)if($('tc'+k))$('tc'+k).textContent=c[k]||0;if($('tcall'))$('tcall').textContent=c.all;"
  + "var f=nf(cur),h='<span class=\"n1\">'+pl(n,'season')+'</span>';if(cur.p!=='all')h+=' in <b>'+esc(PN[cur.p])+'</b>';if(!f)h+=' · no filters';else{h+=' match your filters:';"
  + "if(cur.show!=='all')h+=' '+tag('show',LAB.show[cur.show]);if(cur.bd!=='all')h+=' '+tag('bd',LAB.bd[cur.bd]);if(cur.tr!=='all')h+=' '+tag('tr',LAB.tr[cur.tr]);"
  + "if(cur.q)h+=' '+tag('q','Find: &quot;'+esc(cur.q)+'&quot;');h+=' <a href=\"#\" class=\"clear\" data-x=\"all\">Clear all</a>';}"
  + "$('sum').innerHTML=h;$('fdot').textContent=f?f:'';var no=$('none');no.textContent=n?'':(cur.q?'No seasons match \"'+cur.q+'\"':'No seasons match your filters');no.style.display=n?'none':'';}"
  + "function sync(){[].forEach.call(document.querySelectorAll('.sheet .opts'),function(box){var g=at(box,'data-g');[].forEach.call(box.children,function(o){o.className=o.className.replace(/ on/g,'')+(at(o,'data-v')===dr[g]?' on':'');});});"
  + "$('fok').textContent='Show '+pl(count(dr),'result');}"
  + "function openF(){dr=copy(cur);$('fq').value=dr.q;if(document.body.className.indexOf('fo')<0)document.body.className+=' fo';sync();}"
  + "function closeF(){dr=null;document.body.className=document.body.className.replace(/ ?fo/g,'');}"
  + "$('fbtn').onclick=openF;$('fx').onclick=closeF;$('dim').onclick=closeF;"
  + "$('fq').oninput=function(){dr.q=this.value.replace(/\\s+/g,' ').replace(/^ | $/g,'');sync();};"
  + "$('fq').onkeydown=function(e){if(e.keyCode===13)this.blur();};"
  + "[].forEach.call(document.querySelectorAll('.sheet .opts'),function(box){box.onclick=function(e){var t=e.target;while(t&&t!==box&&!at(t,'data-v'))t=t.parentNode;var v=at(t,'data-v');if(!v||!dr)return;dr[at(box,'data-g')]=v;sync();};});"
  + "$('freset').onclick=function(e){e.preventDefault();var p=dr.p;dr=blank();dr.p=p;$('fq').value='';sync();};"
  + "$('fok').onclick=function(){if(!dr)return;var s=dr;s.p=cur.p;closeF();cur=s;render();};"
  + "if($('tabs'))$('tabs').onclick=function(e){var t=e.target;while(t&&t!==this&&!at(t,'data-p'))t=t.parentNode;var p=at(t,'data-p');if(!p)return;cur.p=p;render();};"
  + "$('sum').onclick=function(e){var t=e.target;while(t&&t!==this&&!at(t,'data-x'))t=t.parentNode;var x=at(t,'data-x');if(!x)return;e.preventDefault();"
  + "if(x==='show'||x==='all')cur.show='all';if(x==='bd'||x==='all')cur.bd='all';if(x==='tr'||x==='all')cur.tr='all';if(x==='q'||x==='all')cur.q='';render();};"
  + 'window.kxRender=render;window.kxFilter=function(s){cur=blank();for(var k in s)cur[k]=s[k];render();};render();})();';
// the game year of a season (Year tabs, user 26-11: «as in the other catalogs»): the year of its start, the rule of the Raid / Event /
// Special cards (gameYearOf(start)): April 2017 starts on April 1, so it is in the Launch year. A list, as data-p is matched by word
const yearsOf = (row) => [gameYearOf(`${row.month}-01`)];
// FIND names of a row: the month («May 2016») and its board names
const searchOf = (row, boards) => [monthYear(`${row.month}-01`), ...boards].join(' | ');
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
      + ` data-base="${esc(base)}" data-bcls="${esc(bst.cls)}" data-bpill="${esc(pillInner(bst.pill))}"`
      + ` data-p="${yearsOf(row).join(' ')}" data-boards="${esc(row.boards || 'none')}" data-tiers="${row.tiersDone ? 'done' : 'todo'}" data-search="${esc(searchOf(row, boards))}">`
      + `<div class="im"><img width="320" height="70" src="${imgOf(ctx, row.colosseumStageId)}" alt=""></div>`
      + `<div class="info"><span class="nm">${name}</span><div class="d">${line}</div><div class="pg">${esc(progressOf(row))}</div>${st.pill}${replaces}${button}</div></div>\n`;
  }).join('');
  const locked = ctx.unlocked === false
    ? `<div class="lk">${icon('lock')}The Coliseum opens at Story Quest ${UNLOCK_QUEST}: then a past season can be kept here.</div>` : '';
  const js = JS.replace('__PILL__', JSON.stringify(PILLS));
  const prefixed = (list, p) => Object.fromEntries(list.slice(1).map((o) => [o[0], `${p}${optLabel(o)}`]));
  const fjs = FJS.replace('__LAB__', () => JSON.stringify({ show: JSON.parse(optLabels(SHOW_OPTS)), bd: prefixed(BOARD_OPTS, 'Coliseum Boards: '), tr: prefixed(TIER_OPTS, 'Tier rewards: ') }))
    .replace('__SETS__', () => JSON.stringify(SHOW_SETS)).replace('__PN__', () => JSON.stringify(Object.fromEntries(GAME_YEARS.map((g, i) => [i, g.name]))));
  // the year tabs (raid-pages.js / special-pages.js markup): «All years», then one tab per game year with a season
  const perYear = GAME_YEARS.map((g, i) => rows.filter((r) => yearsOf(r).includes(i)).length);
  const tab = (p, name, sub, n) => `<button type="button" class="tab${p === 'all' ? ' on' : ''}" data-p="${p}"><b>${esc(name)}</b><small>${esc(sub)}</small><span class="c" id="tc${p}">${n}</span></button>`;
  const tabs = rows.length ? `<div class="tabs" id="tabs">${tab('all', 'All years', YEAR_SPAN, rows.length)}${GAME_YEARS.map((g, i) => (perYear[i] ? tab(i, g.name, g.sub, perYear[i]) : '')).join('')}</div><div class="tabline"></div>` : '';
  const cls = (p) => (v) => (v === 'all' ? '' : ` ${p}-${v}`);
  const sheet = rows.length ? filterSheet({ placeholder: 'Month or board name', hint: 'Matches the start of words in the month and in the Coliseum Board names (e.g. June, Vampire, Bonus).', n: rows.length,
    groups: [['SHOW', `<div class="opts" data-g="show">${filterOpts(SHOW_OPTS, cls('st'))}</div>`], ['COLISEUM BOARDS', `<div class="opts" data-g="bd">${filterOpts(BOARD_OPTS, cls('bd'))}</div>`],
      ['TIER REWARDS', `<div class="opts" data-g="tr">${filterOpts(TIER_OPTS, cls('pr'))}</div>`]] }) : '';
  return PAGE_HEAD('Coliseum Catalog', CSS + FILTER_CSS) + '<body>'
    + `<div class="hdr"><h1>Coliseum Catalog</h1>${rows.length ? FILTER_BUTTON : ''}</div>`
    + '<p class="n">Every Coliseum season of this server, one per month as in the original game. The Coliseum plays the season of your Story; '
    + 'a past season can be kept here, one at a time, and the Coliseum then plays it until you remove it. Each season keeps its own progress, '
    + 'Coliseum Coins and Coliseum Boards. The Coliseum Catalog is an addition of this server.</p>'
    + locked
    + tabs
    + (rows.length ? `<div class="sum" id="sum"><span class="n1">${plural(rows.length, 'season')}</span> · no filters</div><div id="none" class="none" style="display:none"></div>` : '')
    + `<div id="rows">${html || '<p class="n">No Coliseum season is served yet.</p>'}</div>`
    + sheet
    + `<div id="pinmsg" class="pinmsg"></div><script>${keepJs(BASE, 'season', WHERE)}</script><script>${js}</script>${rows.length ? `<script>${fjs}</script>` : ''}</body></html>`;
}

module.exports = { catalogPage, statusOf, progressOf, PILLS };
