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
  + '.row .wal{margin:4px 0 0;align-self:flex-start;font-size:13px}.row .cw{margin-top:auto}'
  + '.row{cursor:pointer}'
  // phone card grid (phone-css.js): the short catalogue names on one line, the counts as small as the other lines
  + `@media ${PHONE_MQ}{#rows>.row.row .nm{height:auto}#rows>.row .ct{font-size:12px}}`;

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

const ROW_JS = "document.getElementById('rows').addEventListener('click',function(e){if(e.target.closest('a'))return;"
  + "var r=e.target.closest('.row');if(r&&r.getAttribute('data-href'))location.href=r.getAttribute('data-href');});";

function hubPage(cards = []) {
  const list = KEYS.map((k) => cards.find((c) => c.key === k)).filter(Boolean);
  return parts.PAGE_HEAD('Game Catalog', HUB_CSS) + '<body>'
    + '<div class="hdr"><h1>Game Catalog</h1></div>'
    + '<p class="n">Every catalogue of this server in one place: pick one to see everything of the original game it holds. '
    + 'From each catalogue you can keep one past item, and it then appears in its own tab every week. The Banner Catalog is in the Shop. '
    + 'The Game Catalog is an addition of this server.</p>'
    + `<div id="rows">${list.map(cardRow).join('') || '<p class="n">No catalogue is served yet.</p>'}</div>`
    + `<script>${ROW_JS}</script></body></html>`;
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

module.exports = { HUB_URL, KEYS, BAR_CSS, hubPage, withHubBack, cardRow };
