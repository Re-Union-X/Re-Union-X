// Coliseum Catalog web page (Coliseum Part 1 Task 6; spec docs/superpowers/specs/2026-11-25-coliseum-design.md «Coliseum Catalog»,
// «Kept season»): WebView opened from the Details button of the Coliseum Catalog banner (evStage 6000 of make-colosseum.js), the
// first catalog banner of the Events tab (user 25-11). Pure HTML, no player or master access: server.js passes the rows
// (routes-colosseum.js catalogRows: one per served season, oldest first, with its catalog state) and the context.
// Same look and parts as the Raid / Event Catalogs (raid-pages.js catalogPage; catalog-pages.js PAGE_HEAD, pill, Keep / Remove button
// and script; special-pages.js CSS and icons), so the phone layout of phone-css.js (#rows>.row cards, 70 %) applies unchanged.
// One row per season: its card (game_data/colosseum_img/<colosseumStageId>.png, make_special_banners.py --section colosseum), the
// month, tiers / AP / Coliseum Boards, the player's progress in that season, the cards of its Coliseum Boards (26-11, as the Avatar
// Board Catalog), ONE status line and at most ONE Keep / Remove button. Only playable rows (served seasons), the year tabs and
// Filters of the other catalogs (FJS); a tap on a row opens its detail page (detailPage, /web/colosseum/season/<id>?from=catalog).
// ctx: {unlocked (story quest 130 reached), imgVersion, boardName(sphereBoardId) -> name | null, unlockQuestOf(row) -> N | null,
// boardImgVersion + boardCard(id) -> true when game_data/colosseum_board_img has its card (cards.json; absent: no card), bonusTier(id)
// -> N | null (make-colosseum.js BONUS_TIER), itemName(type, id) -> name (detail page), fromCatalog (detail page: BACK bar)}.
'use strict';
const special = require('./special-pages');
const parts = require('./catalog-pages');
const { DETAIL_KEEP } = require('./phone-css');
const cards = require('./detail-cards'); // section cards and colour roles of the detail pages // the compact Keep / Remove of the detail pages on phones

const { CSS: SPECIAL_CSS, DETAIL_CSS, esc, monthYear, icon, MATCH_JS, gameYearOf, GAME_YEARS, YEAR_SPAN, CROWN } = special;
const { PAGE_HEAD, pill, keepJs, FILTER_BUTTON, filterOpts, optLabel, optLabels, filterSheet, backBar, srvFrame, RULE_CSS, SRV_CSS, FOLD_CSS } = parts;
const BASE = '/web/colosseum', WHERE = 'the Coliseum';
const UNLOCK_QUEST = 130; // routes-colosseum.js UNLOCK_QUEST (not required here: the page module stays free of the routes)

// the page's own lines: the progress line of a row (Coliseum gold), the intro box
// Board cards (26-11, as the Avatar Board Catalog, event-pages.js boardImg / hasCard): the pictures the game shows for the season's
// Coliseum Boards (make-colosseum.js BOARD_ART), made small for the web by recon/tools/make_avatar_card_web.py --all --strict into
// game_data/colosseum_board_img (git-ignored, at most 160 px) and served at /web/colosseum/board/v<cards.json version>/<id>.png. A
// board whose card is not in cards.json, or a picture that fails to load (kxNb): the neutral box. A «Tier N Bonus» board: its tier.
const boardImg = (ctx, id) => `${BASE}/board/v${ctx.boardImgVersion || 1}/${id}.png`;
const hasCard = (ctx, id) => !!ctx.boardCard && !!ctx.boardCard(id);
const NB = '<span class="nb"></span>';
const BOARD_NC_JS = "function kxNb(im){var s=document.createElement('span');s.className='nb';im.parentNode.replaceChild(s,im);}";
const BOARD_CSS = '.bcs{display:flex;flex-wrap:nowrap;align-items:center;gap:6px;height:44px;margin:5px 0 2px;overflow:hidden}'
  + '.bk{position:relative;flex:0 0 44px;width:44px;height:44px}.bk img,.bk .nb{display:block;width:44px;height:44px;border-radius:6px}'
  + '.nb{display:inline-block;box-sizing:border-box;border:1px solid #2f6f93;border-radius:6px;background:#06283e}'
  + '.bt{position:absolute;left:0;right:0;bottom:0;background:rgba(6,40,62,.88);color:#ffcd4a;font-size:10px;line-height:1.5;text-align:center;border-radius:0 0 6px 6px;white-space:nowrap}'
  + '.nob{color:#b9cfdc;font-size:13px}'
  // the left column of a row: the season card, its board cards under it
  + '.lc{flex:0 0 320px;max-width:100%;display:flex;flex-direction:column;gap:6px}.lc .bcs{margin:0}@media (max-width:700px) and (min-height:481px){.lc{flex:1 1 100%}}';
const cardTag = (ctx, id, size) => (hasCard(ctx, id) ? `<img width="${size}" height="${size}" src="${boardImg(ctx, id)}" loading="lazy" alt="" onerror="kxNb(this)">` : NB);
function boardStrip(row, ctx) {
  const ids = row.boardIds || [];
  if (!ids.length) return '<div class="bcs"><span class="nob">No Coliseum Board</span></div>';
  return `<div class="bcs">${ids.map((id) => {
    const t = ctx.bonusTier ? ctx.bonusTier(id) : null, name = ctx.boardName ? ctx.boardName(id) : null;
    return `<span class="bk"${name ? ` title="${esc(name)}"` : ''}>${cardTag(ctx, id, 44)}${t ? `<b class="bt">Tier ${t}</b>` : ''}</span>`;
  }).join('')}</div>`;
}
const detailHref = (id) => `${BASE}/season/${id}?from=catalog`;

const CSS = SPECIAL_CSS + '.pg{color:#ffcd4a;font-size:14px;margin-top:2px}.lk{background:#06283e;border-radius:6px;padding:8px 10px;margin:6px 0;color:#ffcd4a;font-size:15px}'
  // the board card strip of a row (fixed height: the state pill and the button stay level across the phone card grid)
  + BOARD_CSS;

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
// the whole row opens the season page (user 26-11, as the Raid / Event Catalog rows): a tap anywhere but on a link or button
const ROW_JS = "[].forEach.call(document.querySelectorAll('#rows .row'),function(el){el.onclick=function(e){var t=e.target;while(t&&t!==el){if(t.tagName==='A'||t.tagName==='BUTTON'||t.tagName==='INPUT')return;t=t.parentNode;}var h=el.getAttribute('data-href');if(h)location.href=h;};});";
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
  + "mark();$('sum').innerHTML=h;$('fdot').textContent=f?f:'';var no=$('none');no.textContent=n?'':(cur.q?'No seasons match \"'+cur.q+'\"':'No seasons match your filters');no.style.display=n?'none':'';}"
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
  // the year tab in the address (#p<tab>, as the Raid Catalog's #ww.2017): the WebView's back key returns to it; BACK from a detail
  // page (#q<id>) scrolls to its row
  + "function mark(){if(typeof location==='undefined'||typeof history==='undefined'||!history.replaceState)return;var h=cur.p!=='all'?'#p'+cur.p:'';"
  + "if(location.hash===h||(!h&&location.hash.indexOf('#p')!==0))return;try{history.replaceState(null,'',h||location.pathname+location.search);}catch(e){}}"
  + "var hs=typeof location!=='undefined'?location.hash.slice(1):'',hm=/^p([0-9]+)$/.exec(hs);if(hm&&$('tc'+hm[1]))cur.p=hm[1];"
  + 'window.kxRender=render;window.kxFilter=function(s){cur=blank();for(var k in s)cur[k]=s[k];render();};render();'
  + "if(/^q[0-9]+$/.test(hs)){var qe=document.getElementById(hs);if(qe&&qe.scrollIntoView)qe.scrollIntoView();}})();";
// the game year of a season (Year tabs, user 26-11: «as in the other catalogs»): the year of its start, the rule of the Raid / Event /
// Special cards (gameYearOf(start)): April 2017 starts on April 1, so it is in the Launch year. A list, as data-p is matched by word
const yearsOf = (row) => [gameYearOf(`${row.month}-01`)];
// FIND names of a row: the month («May 2016») and its board names
const searchOf = (row, boards) => [monthYear(`${row.month}-01`), ...boards].join(' | ');
// the state a row returns to when it is not kept (routes-colosseum.js catalogCard base; a row without one: «can» when kept)
const baseOf = (row) => row.base || (row.state === 'kept' ? 'can' : row.state);
const pillInner = (html) => html.slice(html.indexOf('>') + 1, html.lastIndexOf('</span>'));

// Game Catalog hub (game-catalog-pages.js, user 26-11): the served seasons and the kept one's name
const catalogFacts = (rows) => { const k = rows.find((r) => r.state === 'kept'); return { seasons: rows.length, kept: k ? titleOf(k) : null, keptId: k ? k.colosseumStageId : null }; };
function catalogPage(rows, ctx = {}) {
  const keptRow = rows.find((r) => r.state === 'kept');
  const html = rows.map((row) => {
    const st = statusOf(row, ctx, keptRow), name = esc(titleOf(row)), href = detailHref(row.colosseumStageId);
    const boards = (row.boardIds || []).map((id) => (ctx.boardName ? ctx.boardName(id) : null)).filter(Boolean);
    const line = `${plural(row.tiers, 'tier')} · ${apText(row)}${boards.length ? ` · Boards: ${boards.map(esc).join(' · ')}` : ''}`;
    const replaces = parts.replacesLine(st, keptRow ? titleOf(keptRow) : null);
    const button = st.button === null ? ''
      : `<div>${parts.keepButton(BASE, row.colosseumStageId, st.button, ' onclick="var b=this;return kxKeep(b,function(on){kxRow(b.getAttribute(\'data-id\'),on);})"', '', WHERE)}</div>`;
    const base = baseOf(row), bst = base === row.state ? st : statusOf({ ...row, state: base }, ctx, keptRow);
    return `<div class="row ${st.cls}" id="q${row.colosseumStageId}" data-eid="${row.colosseumStageId}" data-href="${href}" data-show="${row.state}" data-name="${name}"`
      + ` data-base="${esc(base)}" data-bcls="${esc(bst.cls)}" data-bpill="${esc(pillInner(bst.pill))}"`
      + ` data-p="${yearsOf(row).join(' ')}" data-boards="${esc(row.boards || 'none')}" data-tiers="${row.tiersDone ? 'done' : 'todo'}" data-search="${esc(searchOf(row, boards))}">`
      // the left column (user 26-11): the season card with its board cards under it, so a row is no taller than its text
      + `<div class="lc"><a class="im" href="${href}"><img width="320" height="70" src="${imgOf(ctx, row.colosseumStageId)}" alt=""></a>${boardStrip(row, ctx)}</div>`
      + `<div class="info"><a class="nm" href="${href}">${name}</a><div class="d">${line}</div><div class="pg">${esc(progressOf(row))}</div>${st.pill}${replaces}${button}</div>`
      + `<a class="go" href="${href}" aria-label="Details">›</a></div>\n`;
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
    + `<div class="hdr"><h1>Coliseum Catalog</h1>${parts.walletChip(ctx.wallet)}${rows.length ? FILTER_BUTTON : ''}</div>`
    + '<p class="n">Every Coliseum season of this server, one per month as in the original game. The Coliseum plays the season of your Story; '
    + 'a past season can be kept here, one at a time, and the Coliseum then plays it until you remove it. Each season keeps its own progress, '
    + 'Coliseum Coins and Coliseum Boards. The Coliseum Catalog is an addition of this server.</p>'
    + locked
    + tabs
    + (rows.length ? `<div class="sum" id="sum"><span class="n1">${plural(rows.length, 'season')}</span> · no filters</div><div id="none" class="none" style="display:none"></div>` : '')
    + `<script>${BOARD_NC_JS}</script><div id="rows">${html || '<p class="n">No Coliseum season is served yet.</p>'}</div>`
    + sheet
    + `<div id="pinmsg" class="pinmsg"></div><script>${keepJs(BASE, 'season', WHERE)}</script><script>${js}${ROW_JS}</script>${rows.length ? `<script>${fjs}</script>` : ''}</body></html>`;
}

// ---- Season detail page (26-11, as the Raid Catalog detail page raid-pages.js detailPage): GET /web/colosseum/season/<id> ----
// rows: catalogRows of routes-colosseum.js (the season's row, the kept one for «Replaces»); det: routes-colosseum.js seasonDetail
// {boards, tiers, best, ranked, maps}. The «On this server» box with the status and the Keep / Remove button of the row, then the
// season, its Coliseum Boards (card, nodes unlocked / total, coins still needed; a bonus board with its tier), its Tiers (rounds, the
// endless last tier as the game counts it, AP, coins, Tier Rewards and the ones taken), the score thresholds (ranked-rewards.js:
// rounds needed, prizes, reached) and where its maps come from (the wording of the «Coliseum» notice, routes-info-album.js). BACK
// (ctx.fromCatalog) returns to the row of the catalogue (#q<id>, the catalogue scrolls to it). null for a season not in rows.
const NOTICE_LINK = '/web/notices#coliseum';
const WHY = { pinned: 'The Coliseum plays this season until you remove it, whatever your Story week.',
  can: 'A past season of your Story: keep it and the Coliseum plays it again, with its own progress and coins.',
  now: 'The Coliseum plays this season now: it is the month of your Story week.',
  nowKept: 'The month of your Story week: the Coliseum plays it again when you remove the kept season.',
  other: 'Your Story week reaches this month but starts in the one before: not the season yet.',
  off: 'Your Story has not reached this month yet.' };
const MAPS = {
  worldwide: 'The maps of this season are the original ones, from the 2016 worldwide game files.',
  japanese: 'This season uses the original maps of the Japanese version, which the worldwide game most likely reused (its round lists match them).',
  generated: '<span class="ng">NOT ORIGINAL</span> No map of this season survives. Its rounds are played on generated maps, built from the round lists of the community '
    + 'wiki (khuxwiki) with the original enemies of the season, in the original arena.' };
const COIN = 17;
const num = (n) => Number(n || 0).toLocaleString('en-US');
const ord = (n) => { const k = n % 100, s = k >= 11 && k <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'); return `${num(n)}${s}`; };
const FALLBACK = { 3: 'Medal', 17: 'Coliseum Coins', 19: 'Avatar part', 20: 'Avatar part', 23: 'Avatar part' };
// the colours of the detail page (user 26-11: «colours in the text like the other detail pages and the notices»): .v a value (gold),
// .cc Coliseum Coins (gold), .rd rounds (cyan), .yes taken / reached (green), .mu not yet / locked (muted), .tn a tier or board name
function itemText(x, ctx) {
  if (x.type === COIN) return `<span class="cc">${num(x.num)} Coliseum Coin${x.num === 1 ? '' : 's'}</span>`;
  const name = (ctx.itemName && ctx.itemName(x.type, x.id)) || FALLBACK[x.type] || 'Reward';
  const skill = x.skillId && ctx.skillName ? ctx.skillName(x.skillId) : '';
  return `<span class="it">${esc(name)}${x.num > 1 ? ` <b class="v">x${num(x.num)}</b>` : ''}</span>${skill ? ` <span class="sk">(${esc(skill)})</span>` : ''}`;
}
const rounds = (n) => `<span class="rd">${num(n)} round${n === 1 ? '' : 's'}</span>`;
const OK = (t) => `<span class="yes">${t}${CROWN}</span>`, MU = (t) => `<span class="mu">${t}</span>`;
// the section cards and colour roles: detail-cards.js (shared with the other catalog detail pages)
const section = (key, ic, title, body, badge = '') => cards.section(key, ic, esc(title), body, badge);
const { NG } = cards;
const COLI_DETAIL_CSS = cards.CARD_CSS + '.mp>.ng:first-child{margin:0 6px 0 0}'
  + '.tt{table-layout:auto}.tt small{display:block;color:#b9cfdc;font-size:13px}.tt td.nw{white-space:nowrap}'
  + 'td.bc{width:64px;padding-right:0}td.bc img,td.bc .nb{display:block;width:64px;height:64px;border-radius:6px}'
  + '.cc{color:#ffcd4a;font-weight:bold}.it{color:#fff}.sk{color:#b9cfdc;font-size:13px}.bns{color:#ffcd4a;font-size:13px}'
  + '.kv td b{color:#ffcd4a}.mp{line-height:1.5;margin:2px}.mp b{color:#ffcd4a}.mp a{color:#9fd4ff}'
  // the Keep / Remove button of the box: compact, as in the other detail pages (phone-css.js sizes .pkd on phones)
  + '.sb .pk.pkd{margin:6px 0 2px}';

function detailPage(rows, id, det, ctx = {}) {
  const row = rows.find((r) => r.colosseumStageId === Number(id));
  if (!row || !det) return null;
  const keptRow = rows.find((r) => r.state === 'kept'), title = titleOf(row);
  const st0 = statusOf(row, ctx, keptRow);
  const whyKey = row.state === 'now' && keptRow ? 'nowKept' : st0.cls;
  const q = row.state === 'later' && ctx.unlockQuestOf ? ctx.unlockQuestOf(row) : null;
  const st = { ...st0, why: q ? `Your Story has not reached this month yet: it unlocks at Story Quest ${q}.` : WHY[whyKey] || '' };
  const button = st.button === null ? ''
    : `<div>${parts.keepButton(BASE, row.colosseumStageId, st.button, ' onclick="var b=this;return kxKeep(b,function(){b.style.display=\'none\';})"', DETAIL_KEEP, WHERE)}</div>`;
  const box = srvFrame(st, { after: `<div id="pinmsg" class="pinmsg"></div>${parts.replacesLine(st, keptRow && keptRow !== row ? titleOf(keptRow) : null)}${button}`,
    intro: `This server follows your Story, not the calendar: this season of the original game (${esc(monthYear(`${row.month}-01`))}) plays when your Story week reaches its month, or when you keep it here.`,
    links: [[NOTICE_LINK, '«Coliseum» notice ›'], [`${BASE}/catalog`, 'Coliseum Catalog ›']] }, 'pin');
  const aps = row.apMin === row.apMax ? `<b>${row.apMin} AP</b>` : `<b>${row.apMin}–${row.apMax} AP</b>`;
  const progress = row.userStageTotalCount
    ? `Cleared up to <span class="tn">Tier ${row.userRank}</span>, <span class="rd">Round ${num(row.userStageCount)}</span>` : MU('Not played yet');
  const kv = [['Month', `<b>${esc(monthYear(`${row.month}-01`))}</b>`], ['Game year', esc(GAME_YEARS[gameYearOf(`${row.month}-01`)].name)],
    // no coin balance here (user 26-11: it is on the Coliseum Catalog header)
    ['Tiers', `<b>${row.tiers}</b> tier${row.tiers === 1 ? '' : 's'} · ${aps} per round`], ['Your progress', progress]]
    .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
  // Coliseum Boards: the boards table shared with the other catalog detail pages (detail-cards.js boardTable)
  const boardRows = det.boards.map((b) => ({ id: b.id, name: esc(b.name || (ctx.boardName && ctx.boardName(b.id)) || `Board ${b.id}`),
    sub: b.bonusTier ? `<small class="bns">Unlocks at Tier ${b.bonusTier}</small>` : '', img: b.served && hasCard(ctx, b.id) ? boardImg(ctx, b.id) : null,
    served: b.served, nodes: b.nodes, unlocked: b.unlocked, coinsLeft: b.coinsLeft, coinsTotal: b.coinsTotal }));
  const boards = det.boards.length
    ? cards.boardTable(boardRows, { currency: 'Coliseum Coins', cls: 'cb' })
      + '<p class="n">The nodes of a board are bought with the Coliseum Coins of this season, in the Coliseum Boards of the Coliseum while the season plays. A Tier Bonus board appears when you reach its tier.</p>'
    : `<p class="n">${MU('No Coliseum Board this season.')}</p>`;
  // Tiers
  const tierRows = det.tiers.map((t) => {
    const rewards = [...(t.coins ? [itemText({ type: COIN, num: t.coins }, ctx)] : []), ...t.items.map((x) => itemText(x, ctx))];
    const has = rewards.length > 0;
    return `<tr${has && t.taken ? ' class="got"' : ''}><td class="nw"><span class="tn">Tier ${t.tier}</span></td>`
      + `<td class="nw"><span class="rd">${num(t.rounds)}</span>${t.endless ? '<small>endless</small>' : ''}</td><td><b class="v">${t.ap}</b></td>`
      + `<td>${t.roundCoins ? `<span class="cc">${t.roundCoins}</span>` : MU('—')}</td><td>${has ? rewards.join(', ') : MU('—')}</td>`
      + `<td>${!has ? MU('—') : t.taken ? OK('Taken') : MU('Not taken yet')}</td></tr>`;
  }).join('');
  const last = det.tiers[det.tiers.length - 1];
  const tiers = `<table class="tt"><tr><th>Tier</th><th>Rounds</th><th>AP</th><th>Coins per round</th><th>Tier Reward</th><th>Status</th></tr>${tierRows}</table>`
    + (last && last.endless ? `<p class="n">Tier ${last.tier} is the endless one: the game counts its rounds up to ${num(last.rounds)}, as in the original.</p>` : '');
  // Score thresholds (the original rank brackets as thresholds on the furthest round cleared)
  const rk = det.ranked.map((b) => `<tr${b.reached ? ' class="got"' : ''}><td class="nw"><span class="tn">${ord(b.startRank)} – ${ord(b.endRank)}</span></td><td class="nw">${rounds(b.rounds)}</td>`
    + `<td>${b.rewards.map((x) => itemText(x, ctx)).join(', ') || MU('—')}</td><td>${b.reached ? OK('Reached') : MU('Not reached')}</td></tr>`).join('');
  const ranked = det.ranked.length
    ? `<p class="n">Your best: ${rounds(det.best || 0)} cleared.</p><p class="n">Each original ranking bracket is a score threshold on this server. Clear that many rounds and its prizes go to your Present Box, once.</p>`
      + `<table class="tt"><tr><th>Original rank</th><th>Rounds needed</th><th>Prizes</th><th>Status</th></tr>${rk}</table>`
    : `<p class="n">${MU('No ranking rewards are known for this season.')}</p>`;
  const maps = `<p class="mp">${MAPS[det.maps] || MAPS.worldwide} The ten maps of a season repeat in every tier. See the <a href="${NOTICE_LINK}">«Coliseum» notice ›</a></p>`;
  const back = ctx.fromCatalog ? backBar(`${BASE}/catalog#q${row.colosseumStageId}`) : '';
  return PAGE_HEAD(title, CSS + DETAIL_CSS + RULE_CSS + SRV_CSS + FOLD_CSS + COLI_DETAIL_CSS) + `<body${back ? ' class="hb"' : ''}>`
    + `<script>${BOARD_NC_JS}</script><h1>${esc(title)}</h1><img class="banner" width="640" height="140" src="${imgOf(ctx, row.colosseumStageId)}" alt="">${box}`
    + section('season', 'weekday', 'Season', `<table class="kv">${kv}</table>`)
    + section('boards', 'bdone', 'Coliseum Boards', boards) + section('tiers', 'tleg', 'Tiers', tiers)
    + section('ranked', 'medal', 'Score thresholds', ranked, det.ranked.length ? NG : '') + section('maps', 'replaced', 'Maps', maps)
    + `<p class="n">The Coliseum Catalog is an addition of this server: in the original game a season was played only in its own month.</p>${back}<script>${keepJs(BASE, 'season', WHERE)}</script></body></html>`;
}

module.exports = { catalogPage, catalogFacts, detailPage, statusOf, progressOf, PILLS };
