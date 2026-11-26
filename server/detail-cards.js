// Section cards of the catalog detail pages (user 26-11: «align the nice style of the Coliseum season page to the other catalogs'
// detail pages»): Raid (raid-pages.js), Event and Avatar Board (event-pages.js), Special (special-pages.js), Banner (gacha.js) and
// Coliseum (colosseum-pages.js). One place for the markup and the CSS:
//   section(key, ic, title, body, badge)  a card with a header band (icon, gold title, optional NOT ORIGINAL badge) and its body;
//                                          the title stays a plain <h2>Title</h2> inside the band
//   cardSections(html, iconOf, badgeOf)   the top-level <h2>Title</h2> parts of a page body (each up to the next one), each made a
//                                          card; an <h2> inside a <div> / <details> (a notice card, a quest list) is left as it is
//   colour roles: val (gold: values, coins, Jewels), cyan (rounds, levels, dates), yes (green + crown: taken, reached, owned),
//   mu (muted: locked, not yet), tn (bold white: tier, board, quest names); NG the NOT ORIGINAL badge.
// Self-contained (special-pages.js loads it, and catalog-pages.js loads special-pages.js): the icon markup is the one of
// special-pages.js icon().
'use strict';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = (k) => `<img class="ic" src="/web/special/icon/${k}.png" alt="">`;
const CROWN = '<img class="ic cw" src="/web/special/icon/done.png" alt="Completed" title="Completed">';
const NG = '<span class="ng">NOT ORIGINAL</span>';

const val = (t) => `<span class="v">${t}</span>`;
const cyan = (t) => `<span class="rd">${t}</span>`;
const yes = (t) => `<span class="yes">${t}${CROWN}</span>`;
const mu = (t) => `<span class="mu">${t}</span>`;
const tn = (t) => `<span class="tn">${t}</span>`;

// the icon of a section by its title (a title not listed: the generic one)
const ICONS = [[/^(Week|Event|Entry|Season|Periods?|Campaign Period)$/, 'weekday'], [/^Original notice/, 'camp'], [/^Tiers$/, 'tleg'], [/^Avatar Boards$/, 'avatar'], [/Boards$/, 'bdone'],
  [/^(Score thresholds|High Score|Draw rates|Medals in this draw)$/, 'medal'], [/^Cards$/, 'camp'], [/^Quests$/, 'skill'], [/^Deal Details$/, 'jewel'],
  [/^Other weeks/, 'replaced'], [/^Versions?$/, 'replaced'], [/^Maps$/, 'replaced']];
const iconFor = (title) => (ICONS.find(([re]) => re.test(String(title).replace(/<[^>]*>/g, ''))) || [null, 'replaced'])[1];

// title: html (already escaped); key: the id of the card (sec-<key>)
const section = (key, ic, title, body, badge = '') => `<div class="cs"${key ? ` id="sec-${key}"` : ''}><div class="csh">${icon(ic)}<h2>${title}</h2>${badge}</div>`
  + `<div class="csb">${body}</div></div>`;

const slug = (t) => String(t).replace(/<[^>]*>/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// the depth of open <div> / <details> / <table> blocks at the end of a piece of html
function depthOf(html) {
  let d = 0;
  for (const m of html.matchAll(/<(\/?)(div|details|table)\b/gi)) d += m[1] ? -1 : 1;
  return d;
}
function cardSections(html, iconOf = iconFor, badgeOf = () => '') {
  const at = [];
  let k = html.indexOf('<h2>');
  while (k >= 0) { if (depthOf(html.slice(0, k)) === 0) at.push(k); k = html.indexOf('<h2>', k + 4); }
  if (!at.length) return html;
  let out = html.slice(0, at[0]);
  at.forEach((a, i) => {
    const part = html.slice(a, i + 1 < at.length ? at[i + 1] : undefined);
    const end = part.indexOf('</h2>'), title = part.slice(4, end);
    // a rule (<hr>) closing the previous part is the card's edge now
    const body = part.slice(end + 5).replace(/<hr>\s*$/, '');
    out += section(slug(title), iconOf(title), title, body, badgeOf(title));
  });
  return out;
}

// cards, header band, colour roles; the plain <h2> of the band loses the «■» of the detail pages (special-pages.js DETAIL_CSS)
const CARD_CSS = '.cs{border:1px solid #2f6f93;border-radius:10px;background:#06283e;margin:16px 0 12px;overflow:hidden}'
  + '.cs>.csh{display:flex;align-items:center;flex-wrap:wrap;gap:4px 8px;padding:8px 14px 7px;background:#0a4466;background:linear-gradient(#0f5a85,#0a4466);border-bottom:2px solid #39a7cf}'
  + '.csh h2{margin:0;padding:0;border:0;background:none;color:#ffcd4a;font-size:18px;letter-spacing:.03em}.csh h2:before{content:""}.csh>.ic{width:1.35em;height:1.35em;display:inline-block;margin:0;max-width:none}.yes .ic,.cs td .ic{display:inline-block;width:1.2em;height:1.2em;margin:0 0 0 4px;vertical-align:-3px}'
  + '.csh .ng{margin-left:4px}.csb{padding:6px 10px 8px}.csb>table{margin:4px 0 6px}.csb>p.n{margin:6px 2px 2px}.csb>h3:first-child{margin-top:4px}'
  + '.v{color:#ffcd4a;font-weight:bold}.rd{color:#00d4ed;font-weight:bold}.yes{color:#6fd47f;font-weight:bold}.yes .ic{margin-left:4px}.mu{color:#8fa9ba}'
  + '.tn{color:#fff;font-weight:bold}.csb td.cd{color:#6fd47f;font-weight:bold}.csb .tt tr.got td{background:#0d4a3a}'
  + '.ng{display:inline-block;background:#e0521a;border:1px solid #ffc27a;color:#fff;border-radius:10px;padding:0 8px;font-size:11px;font-weight:bold;letter-spacing:.6px;line-height:1.7;vertical-align:1px}'
  // the tap-to-open quest lists of the Special details: the same card, the summary as its band
  + 'details.vq.cs{border-top:1px solid #2f6f93}details.vq.cs>summary{display:block;padding:8px 14px 7px;background:linear-gradient(#0f5a85,#0a4466);border-bottom:2px solid #39a7cf;color:#ffcd4a;font-weight:bold;font-size:17px}'
  + 'details.vq.cs>summary::-webkit-details-marker{display:none}details.vq.cs>summary:before{content:"▸ ";color:#00d4ed}details.vq.cs[open]>summary:before{content:"▾ "}'
  + 'details.vq.cs>.csb{padding:4px 10px 8px}details.vq.cs h2{font-size:17px;color:#fff;margin:12px 0 2px}'
  // column roles of a table (the markup of the cells stays as it is): kn<i> column i a name (bold white), kc<i> cyan (rounds,
  // levels, dates), kg<i> gold (values, coins, Jewels); a cell td.r (not served / not built) stays muted
  + [1, 2, 3, 4, 5, 6].map((i) => `.csb table.kn${i} td:nth-child(${i}){color:#fff;font-weight:bold}.csb table.kc${i} td:nth-child(${i}){color:#00d4ed;font-weight:bold}`
    + `.csb table.kg${i} td:nth-child(${i}){color:#ffcd4a;font-weight:bold}`).join('')
  + '.csb .tt td.r{color:#8fa9ba!important;font-weight:normal!important}.csb table td.cd{color:#6fd47f!important}';

module.exports = { section, cardSections, CARD_CSS, NG, CROWN, val, cyan, yes, mu, tn, iconFor, esc };
