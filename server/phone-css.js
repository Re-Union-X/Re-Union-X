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
  // tap floor (30 CSS px of the reduced page)
  + '.fbtn,.tab,.yc,.pk,.o,button{min-height:30px}'
  // catalogs: a 3-column grid of cards; headers, intro and year chips of the Special campaigns span the row
  + `${GRIDS.join(',')}{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:start}`
  + '#camps>h2,#camps>p,#camps>.yrs{grid-column:1/-1}'
  + '#rows>.ml,#quests>.ml,#camps>.ml{display:none!important}'
  + `${CARDS.map((c) => `${c}.hide`).join(',')}{display:none!important}`
  + `${CARDS.join(',')}{display:flex;flex-direction:column;align-items:stretch;padding:6px 6px 8px;margin:0;border-bottom:0;background:#06283e;border-radius:8px}`
  + `${inCards('.im')},${inCards('.im img')}{width:100%!important;height:auto!important}`
  // Avatar Board Catalog: several 70 px board pictures per entry (event-pages.js BOARD_ROW_CSS): small tiles that wrap
  + `${inCards('.im.bc')}{display:flex!important;flex-wrap:wrap;gap:4px;height:auto!important}`
  + `${inCards('.im.bc img')},${inCards('.im.bc .nb')}{width:64px!important;height:64px!important;flex:0 0 64px}`
  + `${inCards('.info')}{font-size:14px;line-height:1.35}`
  + `${inCards('.d')},${inCards('.rp')},${inCards('.n')}{font-size:12px}`
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
