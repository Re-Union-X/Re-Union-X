// Phone layout of the in-game web pages (spec docs/superpowers/specs/2026-11-24-phone-webview-design.md).
// The game is always landscape: on a phone the WebView frame is about 640 x 320 CSS px (Galaxy A54), and our pages,
// sized for PC / tablet, filled it (one catalog event per screen). On a short and narrow frame every page becomes the
// tablet layout reduced to 70 % (CSS zoom), with the title and Filters on one line, a tap floor for the controls and
// the catalogs (Event / Raid / Avatar Board: #rows, Special: #quests, Banner: .cat) as a 3-column grid of
// cards. PC, tablet and the LDPlayer bench (taller or wider frames) never match the query.
'use strict';

const PHONE_MQ = '(max-height:480px) and (max-width:900px)';

const GRIDS = ['#rows', '#quests', '.cat'];
const CARDS = ['#rows>.row', '#quests>.row', '.cat>.b'];
const inCards = (sel) => CARDS.map((c) => `${c} ${sel}`).join(',');

const PHONE_CSS = `@media ${PHONE_MQ}{`
  + 'html{zoom:.7}'
  // header: title and Filters on one line, a shorter intro
  + '.hdr{display:flex!important;flex-wrap:nowrap!important;align-items:center;gap:12px}.hdr h1{flex:0 0 auto!important;margin:4px 0}'
  + '.fbtn{flex:0 0 auto!important;width:auto!important}p.n{font-size:13px;margin:2px 0 6px}'
  // tables: columns sized by their content (banner notices have 8 columns and table-layout:fixed: the Special Attack
  // text got 1/8 of the width, user 24-11)
  + 'table{table-layout:auto!important}.ntb th,.ntb td{font-size:13px}'
  // tap floor (30 CSS px of the reduced page)
  + '.fbtn,.tab,.yc,.pk,.o,button{min-height:30px}'
  // the «Your Story progress is here» tag of the year tab stays inside the tab width (4 tabs in one row): 10 px text, tighter padding
  + '.tab .here .hc{font-size:10px;padding:0 7px 0 4px}.tab .here .ic{width:11px;height:11px}'
  // catalogs: a 3-column grid of cards; an empty-list message spans the row
  + `${GRIDS.join(',')}{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:stretch}`
  + '#rows>p,#quests>p{grid-column:1/-1}'
  // every card of a catalog the same size (user 24-11): equal rows in the card grids; the tallest card sets the row, chips and «Replaces» lines stop at two lines
  + '#rows,#quests,.cat{grid-auto-rows:1fr}'
  + '#rows>.ml,#quests>.ml{display:none!important}'
  + `${CARDS.map((c) => `${c}.hide`).join(',')}{display:none!important}`
  + `${CARDS.join(',')}{display:flex;flex-direction:column;align-items:stretch!important;padding:6px 6px 8px!important;margin:0;border-bottom:0;background:#06283e;border-radius:8px}`
  + `${inCards('.im')},${inCards('.im img')}{width:100%!important;height:auto!important}`
  // Banner Catalog: .cat .im{flex:0 0 46%} (gacha.js) would be a height in the column card
  + `${inCards('.im')}{flex:0 0 auto!important;max-width:none!important}`
  // Avatar Board Catalog: several 70 px board pictures per entry (event-pages.js BOARD_ROW_CSS): small tiles that wrap
  // one row of fixed height (up to 3 pictures + the «+N» badge, event-pages.js ROW_CARDS = 3): a badge on a second row
  // pushed the title down (user 24-11)
  + `${inCards('.im.bc')}{display:flex!important;flex-wrap:nowrap!important;align-items:center;gap:4px;overflow:hidden;height:50px!important}`
  + `${inCards('.im.bc img')},${inCards('.im.bc .nb')}{width:50px!important;height:50px!important;flex:0 0 50px}`
  + `${inCards('.im.bc .more')}{flex:0 0 auto}`
  // every card of a row looks the same (user 24-11): the text part fills the card, state chips and the Keep / Remove
  // buttons are as wide as the card (their text wraps), the button sits at the bottom so buttons of a row line up
  + `${inCards('.info')}{font-size:14px;line-height:1.35;flex:1 1 auto;display:flex;flex-direction:column;min-width:0;margin:0!important;padding:0!important}`
  + `${inCards('.s')}{display:block!important;width:100%;box-sizing:border-box;white-space:normal;margin:4px 0 0;font-size:13px!important;line-height:1.35!important;padding:3px 10px!important}`
  + `${inCards('.s')}{display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;flex:0 0 auto}`
  // .rp without !important: the page hides it with an inline display:none (event-pages.js / raid-pages.js kxRow)
  + `${inCards('.rp')}{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;flex:0 0 auto}`
  + `${inCards('.pkw')},${inCards('.info>div:has(>.pk)')}{margin-top:auto;padding-top:6px}`
  + `${inCards('.pk')}{display:flex!important;align-items:center;justify-content:center;gap:6px;width:100%;box-sizing:border-box;text-align:center;white-space:normal;min-height:34px;margin:0;font-size:13px!important;line-height:1.3;padding:4px 8px!important}`
  + `${inCards('.d')},${inCards('.rp')},${inCards('.n')},${inCards('.pg')}{font-size:12px}`
  // chips line up across a row (user 24-11): titles always two lines high (longer ones end in «…», the full name is on
  // the details page), dates of Event / Raid / Avatar Board cards two lines high, the same left border on every card
  // (:where = no specificity: the page's state colours .now / .pinned / .can ... still win)
  + `${inCards('.nm')}{display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.35;height:2.7em;flex:0 0 auto}`
  // dates: exactly two lines (clamped): with the phone's 110 % system font a two-line date was taller than a min-height
  // Coliseum Catalog: the progress line (.pg) as the dates (user 26-11: a two-line progress line pushed its state pill below the
  // neighbours'), and its board card strip at a fixed height (colosseum-pages.js BOARD_CSS)
  // the Keep / Remove button of every catalog detail page (DETAIL_KEEP: Raid, Event, Avatar Board, Special, Banner and Coliseum
  // details; user 26-11: «far too big» on the phone): one compact button, never the full-width button of the narrow portrait layout
  + '.pkd{display:inline-flex!important;align-items:center;gap:6px;width:auto!important;min-height:26px;padding:2px 12px!important;font-size:13px!important;line-height:1.4!important;margin:6px 0 2px!important}'
  + `${inCards('.lc')}{display:flex;flex-direction:column;gap:4px;width:100%;flex:0 0 auto;max-width:none}`
  + `${inCards('.bcs')}{flex:0 0 auto;height:44px!important}${inCards('.bt')}{font-size:11px}`
  + `${inCards('.d')},${inCards('.pg')},${inCards('.n')}{display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.35;height:2.8em;flex:0 0 auto}`
  + `${CARDS.join(',')}{border-left-style:solid!important;border-left-width:4px!important}`
  + `:where(${CARDS.join(',')}){border-left-color:#2f5d78}`
  // Banner Catalog: a card with no price line (.pay, 14 px, line-height 1.35: «Original details missing» banners) keeps its
  // place, so its chip lines up with the others of the row
  + '.cat>.b .n+.s{margin-top:calc(14px*1.35 + 4px)}'
  + `${inCards('.go')}{display:none}`
  // Medal Gallery (medal-gallery.js: cards with a .mi picture, user 24-11): 4 columns of square Medals, the picture centred,
  // the attribute line one line high, track name and «Variants» one line each with «…» (the full text is in the detail)
  + '#rows:has(>.row>.mi){grid-template-columns:repeat(4,minmax(0,1fr))}'
  // Full Art tab (user 24-11: «the Medals must be part of the artwork card»): each artwork group (.grp, medal-gallery.js:
  // its header .sec + its Medal cards) is one gold card, two per row (four or more Medals: the whole row); the artwork on the
  // left with its name, its Medals on the right as small tiles (picture, name, Owned) that open the detail as before
  + '#rows>.grp{display:grid!important;grid-column:span 2;grid-template-columns:104px repeat(3,minmax(0,1fr));gap:6px;align-items:stretch;padding:8px;background:#0b3a58;border:2px solid #ffcd4a;border-radius:8px;min-width:0;box-sizing:border-box}'
  // every artwork card is half a row (a full-row card for 4+ Medals left holes in the grid and empty columns, user
  // 24-11): its tiles wrap 3 per line (at most 5 Medals per artwork: two lines, the artwork spans both)
  + '#rows:has(>.grp:not(:has(>.sec.hide))){grid-auto-rows:auto}'
  + '#rows>.grp:has(>.sec.hide){display:none!important}#rows>.grp>.row.hide{display:none!important}'
  + '#rows>.grp>.sec{grid-row:1/span 2;display:flex!important;flex-direction:column;align-items:center;gap:3px;padding:0!important;margin:0!important;border:0!important;text-align:center;min-width:0}'
  + '#rows>.grp>.sec .av{flex:0 0 auto!important;width:96px!important;height:144px!important}#rows>.grp>.sec .av img{width:96px!important;height:144px!important}'
  + '#rows>.grp>.sec b{font-size:12px;line-height:1.3;display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}'
  + '#rows>.grp>.sec .d{font-size:10px;line-height:1.3;margin:0}#rows>.grp>.sec>div{min-width:0;width:100%}'
  + '#rows>.grp>.row{display:flex!important;flex-direction:column;align-items:center;gap:2px;padding:3px 2px!important;margin:0!important;border:0!important;background:#06283e;border-radius:6px;min-width:0}'
  + '#rows>.grp>.row .mi{flex:0 0 auto!important;width:56px!important;height:56px!important;margin:0!important}#rows>.grp>.row .mi img{width:56px!important;height:56px!important}'
  + '#rows>.grp>.row .info{width:100%;text-align:center;margin:0!important;padding:0!important}'
  + '#rows>.grp>.row .nm{font-size:11px!important;line-height:1.25;height:2.5em;margin:0;display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}'
  + '#rows>.grp>.row .d,#rows>.grp>.row .tk,#rows>.grp>.row .vrt,#rows>.grp>.row .go,#rows>.grp>.row .st{display:none!important}'
  + '#rows>.grp>.row .cps{display:flex;flex-direction:column;align-items:center;gap:2px;margin:2px 0 0}#rows>.grp>.row .s{font-size:8px!important;padding:1px 2px!important;letter-spacing:0!important;margin:0!important;line-height:1.4;display:block!important;width:100%;max-width:100%;box-sizing:border-box;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
  // tiles of a card share one height (a «Reconstructed» chip no longer makes one taller), pinned to the top of the card
  + '#rows>.grp>.row{align-self:start}#rows>.grp>.row .cps{width:100%;min-height:calc(8px*1.4*2 + 8px)}'
  // a Medal with no music (Full Art tab) keeps the place of the track line (12 px, line 1.5em, margin 2px): chips line up
  + '#rows>.row:has(>.mi) .info:not(:has(>.tk))>.d{margin-bottom:calc(12px*1.5 + 2px)}'
  // Medal detail (#det, user 24-11: the info needed scrolling): the Medal on the left, name, chips, track, music and
  // variants on the right
  + '#dbody{display:grid;grid-template-columns:auto 1fr;column-gap:18px;align-items:start;text-align:left}'
  + '#dbody>.lg{grid-row:1/span 20;width:150px!important;height:150px!important;max-width:none!important;max-height:none!important;margin:4px 0 0!important}'
  + '#dbody>:not(.lg){grid-column:2;margin-left:0!important;margin-right:0!important}#dbody>h2{margin:4px 30px 2px 0!important}'
  + '#dbody .cps{justify-content:flex-start}#dbody>.vl{max-width:none}'
  + '#det .vl li{display:flex;align-items:center;flex-wrap:wrap;gap:6px}#det .vl li>*{margin:0!important;vertical-align:middle}'
  + '#rows>.row:has(>.mi)>.mi{align-self:center;flex:0 0 auto!important;width:84px!important;height:84px!important;margin:0 auto 4px}'
  + '#rows>.row:has(>.mi)>.mi img{width:84px!important;height:84px!important}'
  + '#rows>.row:has(>.mi) .d{height:1.4em!important;-webkit-line-clamp:1}'
  + '#rows>.row:has(>.mi) .tk,#rows>.row:has(>.mi) .vrt{display:block!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;height:1.5em;line-height:1.5em;font-size:12px;margin:2px 0 0;flex:0 0 auto}'
  + '#rows>.row:has(>.mi) .cps{margin-top:4px}'
  + '}';

// the class every catalog detail page gives its Keep / Remove button (the compact phone rule above)
const DETAIL_KEEP = ' pkd';

const MARK = '<style data-phone>';

// The phone CSS as the last <style> of the head, so it wins over the page's own rules; pages without a head
// (404 texts, fragments) and pages that already have it are returned unchanged.
function withPhone(html) {
  if (typeof html !== 'string' || html.includes(MARK)) return html;
  const i = html.indexOf('</head>');
  if (i < 0) return html;
  return html.slice(0, i) + MARK + PHONE_CSS + '</style>' + html.slice(i);
}

module.exports = { PHONE_MQ, PHONE_CSS, withPhone, DETAIL_KEEP };
