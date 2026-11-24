// Phone layout of the in-game web pages (spec docs/superpowers/specs/2026-11-24-phone-webview-design.md).
// The game is always landscape: on a phone the WebView frame is about 640 x 320 CSS px (Galaxy A54), and our pages,
// sized for PC / tablet, filled it (one catalog event per screen). On a short and narrow frame every page becomes the
// tablet layout reduced to 70 % (CSS zoom), with the title and Filters on one line, a tap floor for the controls and
// the catalogs (Event / Raid / Avatar Board: #rows, Special: #quests + #camps, Banner: .cat) as a 3-column grid of
// cards. PC, tablet and the LDPlayer bench (taller or wider frames) never match the query.
'use strict';

const PHONE_MQ = '(max-height:480px) and (max-width:900px)';

const GRIDS = ['#rows', '#quests', '#camps', '.cat'];
const CARDS = ['#rows>.row', '#quests>.row', '#camps>.row', '.cat>.b'];
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
  // catalogs: a 3-column grid of cards; headers, intro and year chips of the Special campaigns span the row
  + `${GRIDS.join(',')}{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:stretch}`
  + '#camps>h2,#camps>p,#camps>.yrs{grid-column:1/-1}'
  + '#rows>.ml,#quests>.ml,#camps>.ml{display:none!important}'
  + `${CARDS.map((c) => `${c}.hide`).join(',')}{display:none!important}`
  + `${CARDS.join(',')}{display:flex;flex-direction:column;align-items:stretch!important;padding:6px 6px 8px!important;margin:0;border-bottom:0;background:#06283e;border-radius:8px}`
  + `${inCards('.im')},${inCards('.im img')}{width:100%!important;height:auto!important}`
  // Banner Catalog: .cat .im{flex:0 0 46%} (gacha.js) would be a height in the column card
  + `${inCards('.im')}{flex:0 0 auto!important;max-width:none!important}`
  // Avatar Board Catalog: several 70 px board pictures per entry (event-pages.js BOARD_ROW_CSS): small tiles that wrap
  + `${inCards('.im.bc')}{display:flex!important;flex-wrap:wrap;gap:4px;height:auto!important}`
  + `${inCards('.im.bc img')},${inCards('.im.bc .nb')}{width:64px!important;height:64px!important;flex:0 0 64px}`
  // every card of a row looks the same (user 24-11): the text part fills the card, state chips and the Keep / Remove
  // buttons are as wide as the card (their text wraps), the button sits at the bottom so buttons of a row line up
  + `${inCards('.info')}{font-size:14px;line-height:1.35;flex:1 1 auto;display:flex;flex-direction:column;min-width:0;margin:0!important;padding:0!important}`
  + `${inCards('.s')}{display:block!important;width:100%;box-sizing:border-box;white-space:normal;margin:4px 0 0;font-size:13px!important;line-height:1.35!important;padding:3px 10px!important}`
  + `${inCards('.pkw')},${inCards('.info>div:has(>.pk)')}{margin-top:auto;padding-top:6px}`
  + `${inCards('.pk')}{display:flex!important;align-items:center;justify-content:center;gap:6px;width:100%;box-sizing:border-box;text-align:center;white-space:normal;min-height:34px;margin:0;font-size:13px!important;line-height:1.3;padding:4px 8px!important}`
  + `${inCards('.d')},${inCards('.rp')},${inCards('.n')}{font-size:12px}`
  // chips line up across a row (user 24-11): titles always two lines high (longer ones end in «…», the full name is on
  // the details page), dates of Event / Raid / Avatar Board cards two lines high, the same left border on every card
  // (:where = no specificity: the page's state colours .now / .pinned / .can ... still win)
  + `${inCards('.nm')}{display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.35;height:2.7em;flex:0 0 auto}`
  // dates: exactly two lines (clamped): with the phone's 110 % system font a two-line date was taller than a min-height
  + `${inCards('.d')},${inCards('.n')}{display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.35;height:2.8em;flex:0 0 auto}`
  + `${CARDS.join(',')}{border-left-style:solid!important;border-left-width:4px!important}`
  + `:where(${CARDS.join(',')}){border-left-color:#2f5d78}`
  // Banner Catalog: a card with no price line (.pay, 14 px, line-height 1.35: «Original details missing» banners) keeps its
  // place, so its chip lines up with the others of the row
  + '.cat>.b .n+.s{margin-top:calc(14px*1.35 + 4px)}'
  + `${inCards('.go')}{display:none}`
  + '}';

const MARK = '<style data-phone>';

// The phone CSS as the last <style> of the head, so it wins over the page's own rules; pages without a head
// (404 texts, fragments) and pages that already have it are returned unchanged.
function withPhone(html) {
  if (typeof html !== 'string' || html.includes(MARK)) return html;
  const i = html.indexOf('</head>');
  if (i < 0) return html;
  return html.slice(0, i) + MARK + PHONE_CSS + '</style>' + html.slice(i);
}

module.exports = { PHONE_MQ, PHONE_CSS, withPhone };
