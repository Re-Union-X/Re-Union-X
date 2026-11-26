// Game Catalog hub page (user 26-11): GET /web/catalog, the Details of the Game Catalog banner (make-game-catalog.js, the first and
// only catalogue banner of the Events tab). One card per catalogue of the game (Coliseum, Raid, Event, Avatar Board, Special; the
// Banner Catalog stays in the Shop): its banner picture, a one-line description and its facts (how many seasons / raids / events /
// boards / quests, what is kept now, the coin balance where the catalogue has one, as on its header). A card opens that catalogue
// page as before; the catalogue pages then show a BACK bar to this hub (withHubBack), and the hub's BACK is the game's own.
// Pure HTML, no player or master access: server.js passes the cards (gameCatalogCards). Same look as the catalogue pages
// (catalog-pages.js PAGE_HEAD, walletChip; special-pages.js CSS and icons), and the rows are #rows>.row cards, so the phone layout of
// phone-css.js (3-column card grid, 70 %) applies unchanged.
// card: {key, title, href, img (640x140 banner), line (description), count (text), kept (text | null), keptNone (text, nothing kept),
//   wallet ({ic, label, value, title?} | null), note (text | null: e.g. the Coliseum before Story Quest 130)}
'use strict';
const special = require('./special-pages');
const parts = require('./catalog-pages');
const { PHONE_MQ } = require('./phone-css');
const detailCards = require('./detail-cards'); // the section card of the «Kept now» list

const { CSS: SPECIAL_CSS, esc, icon } = special;
const HUB_URL = '/web/catalog';
const KEYS = ['colosseum', 'raid', 'event', 'avatar', 'special'];
// the BACK bar look of the detail pages (special-pages.js DETAIL_CSS: .bar, .back, body.hb), for the catalogue pages that lack it
const BAR_CSS = (() => {
  const d = special.DETAIL_CSS, a = d.indexOf('.bar{'), end = 'body.hb{padding-bottom:90px}', b = d.indexOf(end, a);
  return a >= 0 && b > a ? d.slice(a, b + end.length) : '';
})();

const HUB_CSS = SPECIAL_CSS + '.d{color:#d9e6ee;font-size:14px;margin:2px 0}.ct{color:#9fd4ff;font-size:14px;margin:2px 0}'
  + '.pg{color:#ffcd4a;font-size:14px;margin:2px 0}.pg.no{color:#b9cfdc}.lk{color:#ffcd4a;font-size:13px;margin:2px 0}'
  // the coin chip of a card: the header chip (catalog-pages.js walletChip) without its push to the right
  + '.row .wal{margin:4px 0 0;align-self:flex-start;max-width:100%}.row .wal small{font-size:12px;min-width:0;padding:2px 7px 2px 4px;gap:4px}.row .wal .ic{width:1.5em;height:1.5em}.row .wal b{font-size:15px;padding:1px 9px}.row .cw{margin-top:auto}'
  + '.row{cursor:pointer}'
  // a large amount (user 26-11: «if the Coliseum Coins grow, do they run out of the card?»): the chip never wider than its card, the
  // label goes on two lines (coins / season month) and the amount keeps its width
  + '#rows>.row,#rows>.row .info{min-width:0}#rows>.row .wal{max-width:100%;box-sizing:border-box}#rows>.row .wal small{min-width:0;flex:0 1 auto}'
  + '#rows>.row .wal .wt{white-space:normal;line-height:1.15}#rows>.row .wal b{flex:none}'
  // phone card grid (phone-css.js): the short catalogue names on one line, the counts as small as the other lines
  + `@media ${PHONE_MQ}{#rows>.row.row .nm{height:auto}#rows>.row .ct{font-size:12px}}`
  // «Kept now» (user 26-11): a section card of the detail pages, one compact line per kept item (its card, name, catalogue, Remove)
  + detailCards.CARD_CSS
  + '#sec-kept .csb{padding:4px 10px 6px}.kcount{background:#0d5f86;border:1px solid #39a7cf;border-radius:10px;padding:0 8px;font-size:13px;color:#fff;line-height:1.6}.kr{display:flex;align-items:center;gap:10px;padding:5px 0;border-top:1px solid #1d5878}.kr:first-child{border-top:0}'
  + '.kr .ki{flex:0 0 160px;line-height:0}.kr .ki img{width:160px;height:35px;border-radius:4px;object-fit:cover}'
  + '.kr .kt{flex:1 1 auto;min-width:0;line-height:1.3}.kr .kn{display:block;color:#fff;font-weight:bold;text-decoration:none;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
  + '.kr .kc{color:#00d4ed;font-size:13px}.kr .pk{flex:0 0 auto;margin:0 0 0 auto;display:inline-flex;align-items:center;gap:5px;min-height:28px;padding:2px 14px;font-size:13px;line-height:1.2;width:auto;box-sizing:border-box;box-shadow:0 1px 3px rgba(0,0,0,.5)}.kr .pk .ic{width:1.2em;height:1.2em;margin:0;vertical-align:0}'
  + '#sec-kept .mu{margin:4px 2px;font-size:14px}'
  + `@media ${PHONE_MQ}{.kr{gap:8px;padding:3px 0}.kr .ki{flex-basis:110px}.kr .ki img{width:110px;height:24px}.kr .kn{font-size:13px}.kr .kc{font-size:11px}`
  + '.kr .pk{font-size:12px;padding:2px 10px;min-height:26px}}'
  // one kept item per line, its Remove button on the right edge (user 26-11, phones and large screens)
  + '.kl{display:grid;grid-template-columns:1fr}'
  // large screens (user 26-11: «the hub must not need scrolling» on the 1280x720 WebView): the five catalogues side by side as cards,
  // like the phone grid, and the kept items in two columns; the phone layout keeps its own grid (phone-css.js, 3 columns)
  + `@media not all and ${PHONE_MQ}{`
  + '#rows{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;align-items:stretch;margin-top:8px}'
  + '#rows>.row{display:flex;flex-direction:column;align-items:stretch;gap:0;margin:0;padding:8px 8px 10px;background:#06283e;border:0;border-left:4px solid #2f5d78;border-radius:8px}'
  + '#rows>.row.pinned{border-left-color:#b8860b}#rows>.row .im{width:100%;max-width:none;flex:0 0 auto;line-height:0}#rows>.row .im img{width:100%;height:auto}'
  + '#rows>.row .info{display:flex;flex-direction:column;flex:1 1 auto;margin:6px 0 0;line-height:1.35}#rows>.row .nm{font-size:16px;margin:0 0 2px}'
  + '#rows>.row .d,#rows>.row .ct,#rows>.row .pg,#rows>.row .lk{font-size:13px}#rows>.row .go{display:none}'
  + '.kr{padding:4px 0}.kr .ki{flex-basis:128px}.kr .ki img{width:128px;height:28px}.kr .kn{font-size:14px}.kr .kc{font-size:12px}'
  // user 26-11: one kept item per line, its Remove button on the right edge (no empty half), a clean pill; the card texts lined up:
  // every description takes three lines, so the counts, the kept lines and the coin chips start at the same height
  + '#rows>.row .d{min-height:calc(3 * 1.35em)}'
  // the coin chip inside the card (user 26-11: «Coliseum Coins · Dec 2017» ran out of the 5-column card): a slightly smaller label
  + '#rows>.row .wal{max-width:100%}#rows>.row .wal small{font-size:11px;padding:2px 6px 2px 4px;gap:3px;letter-spacing:0}#rows>.row .wal b{padding:1px 8px}'
  + '.intro{margin-bottom:8px}#sec-kept{margin:8px 0}}';

// a card's row: the banner on the left (as the catalogue rows), the name, the description, the facts, the coins; the whole row opens
// the catalogue (ROW_JS), the name and the picture are links
function cardRow(c) {
  const href = esc(c.href);
  const kept = c.kept ? `<div class="pg">${icon('pin')}Kept: ${esc(c.kept)}</div>` : `<div class="pg no">${esc(c.keptNone || 'Nothing kept')}</div>`;
  return `<div class="row${c.kept ? ' pinned' : ''}" id="c-${esc(c.key)}" data-href="${href}">`
    + `<a class="im" href="${href}"><img width="320" height="70" src="${esc(c.img)}" alt=""></a>`
    + `<div class="info"><a class="nm" href="${href}">${esc(c.title)}</a><div class="d">${esc(c.line)}</div>`
    + `<div class="ct">${esc(c.count)}</div>${kept}${c.note ? `<div class="lk">${icon('lock')}${esc(c.note)}</div>` : ''}`
    + `${c.wallet ? `<div class="cw">${parts.walletChip(c.wallet)}</div>` : ''}</div>`
    + `<a class="go" href="${href}" aria-label="Open">›</a></div>\n`;
}

// the «Kept now» list: kept = [{kind, catalog (its catalogue's name), name, img, href (its detail page), remove (the catalogue's own
// Remove endpoint), where (the screen it is kept in, the catalogue's «Remove from …» label)}]; nothing kept: one muted line
const KEPT_NONE = 'Nothing kept: pick a past item in a catalog to keep it';
function keptSection(kept = []) {
  const rows = kept.map((k) => `<div class="kr" id="k-${esc(k.kind)}"><a class="ki" href="${esc(k.href)}"><img src="${esc(k.img)}" alt=""></a>`
    + `<div class="kt"><a class="kn" href="${esc(k.href)}">${esc(k.name)}</a><span class="kc">${esc(k.catalog)}</span></div>`
    + `<a href="#" class="pk" data-on="0" data-pin="${esc(k.remove)}" data-where="${esc(k.where)}" onclick="return kxRm(this)">${icon('pin')}Remove from ${esc(k.where)}</a></div>`).join('');
  return detailCards.section('kept', 'pin', 'Kept now', rows ? `<div class="kl">${rows}</div>` : `<p class="mu">${KEPT_NONE}</p>`, kept.length ? `<span class="kcount">${kept.length}</span>` : '');
}
// Remove: the catalogue's own request (POST to its unkeep / unpin URL, the same message box as the catalogue's button), then the hub
// is loaded again so the list and the cards show the change
const KEPT_JS = 'function kxSay(box,cls,head,sub){box.className=cls;box.innerHTML="";var b=document.createElement("div"),s=document.createElement("small");'
  + 'b.textContent=head;s.textContent=sub;box.appendChild(b);box.appendChild(s);box.style.display="block";}'
  + 'function kxRm(el){var box=document.getElementById("pinmsg"),w=el.getAttribute("data-where"),x=new XMLHttpRequest();x.open("POST",el.getAttribute("data-pin"));'
  + 'x.onload=function(){if(x.status===200){kxSay(box,"pinmsg off","Removed.","Leave and re-enter "+w+".");setTimeout(function(){location.reload();},700);}'
  + 'else kxSay(box,"pinmsg err","Could not change "+w,"Try again from its catalog.");};'
  + 'x.onerror=function(){kxSay(box,"pinmsg err","Could not reach the server","Try again.");};x.send("");return false;}';

const ROW_JS = "document.getElementById('rows').addEventListener('click',function(e){if(e.target.closest('a'))return;"
  + "var r=e.target.closest('.row');if(r&&r.getAttribute('data-href'))location.href=r.getAttribute('data-href');});";

function hubPage(cards = [], kept = []) {
  const list = KEYS.map((k) => cards.find((c) => c.key === k)).filter(Boolean);
  const { catalogHead, val, cyan } = detailCards;
  return parts.PAGE_HEAD('Game Catalog', HUB_CSS) + '<body>'
    + catalogHead({ title: 'Game Catalog', ic: 'done', lines: [
      ['medal', `${val('Every catalog')} of this server in ${cyan('one place')}: pick one to see everything of the original game it holds.`],
      ['pin', `${val('Keep one past item')} in each catalog: it comes back in its own tab ${cyan('every week')}.`],
      ['jewel', `The ${val('Banner Catalog')} is in the Shop.`]] })
    + keptSection(kept)
    + `<div id="rows">${list.map(cardRow).join('') || '<p class="n">No catalogue is served yet.</p>'}</div>`
    + `<div id="pinmsg" class="pinmsg"></div><script>${ROW_JS}${KEPT_JS}</script></body></html>`;
}

// the BACK bar to the hub on a catalogue page (its own BACK bar, e.g. the Avatar Board Catalog opened from another catalogue,
// wins: the page is returned unchanged); the bar sits at the end of the body, with the body class «hb» (room for it)
function withHubBack(html) {
  if (typeof html !== 'string' || html.includes('class="back"')) return html;
  const i = html.lastIndexOf('</body>');
  if (i < 0) return html;
  let out = html.slice(0, i) + parts.backBar(HUB_URL) + html.slice(i);
  const h = out.indexOf('</head>');
  if (h >= 0) out = `${out.slice(0, h)}<style>${BAR_CSS}</style>${out.slice(h)}`;
  return out.replace(/<body(\s+class="([^"]*)")?>/, (m, a, cls) => `<body class="${cls ? `${cls} ` : ''}hb">`);
}

module.exports = { HUB_URL, KEYS, BAR_CSS, KEPT_NONE, keptSection, hubPage, withHubBack, cardRow };
