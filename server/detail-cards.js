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
// a map pin (user 26-11: «Where» needs a location icon; the icon set of the pages has none), drawn inline at the size of an icon
const LOCATION_ICON = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="#ff7a5c" stroke="#fff" stroke-width="1.2" '
  + 'd="M12 2.5a6.8 6.8 0 0 0-6.8 6.8c0 4.9 6.8 12.2 6.8 12.2s6.8-7.3 6.8-12.2A6.8 6.8 0 0 0 12 2.5z"/><circle cx="12" cy="9.3" r="2.6" fill="#fff"/></svg>';

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
// a section card is a <details> open by default (user 26-11: «every category collapsible»): its header band is the <summary>, a tap
// closes / opens it, the chevron turns (the Special quest lists work the same); the state is not kept, as those lists
const CHEV = '<span class="chev">▸</span>';
const section = (key, ic, title, body, badge = '') => `<details class="cs"${key ? ` id="sec-${key}"` : ''} open><summary class="csh">${icon(ic)}<h2>${title}</h2>${badge}${CHEV}</summary>`
  + `<div class="csb">${body}</div></details>`;

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
  // the header band is the tap target (the phone tap floor: 30 px), the default marker hidden, the chevron on the right turns when open
  + 'details.cs>summary.csh{cursor:pointer;list-style:none;min-height:30px;outline:0}details.cs>summary.csh::-webkit-details-marker{display:none}'
  + '.csh .chev{margin-left:auto;color:#00d4ed;font-size:18px;line-height:1;transition:transform .15s}details.cs[open]>summary .chev{transform:rotate(90deg)}details.cs:not([open])>summary.csh{border-bottom:0}'
  + '.cs>.csh{display:flex;align-items:center;flex-wrap:wrap;gap:4px 8px;padding:8px 14px 7px;background:#0a4466;background:linear-gradient(#0f5a85,#0a4466);border-bottom:2px solid #39a7cf}'
  + '.csh h2{margin:0;padding:0;border:0;background:none;color:#ffcd4a;font-size:18px;letter-spacing:.03em}.csh h2:before{content:""}.csh>.ic{width:1.35em;height:1.35em;display:inline-block;margin:0;max-width:none}.yes .ic,.cs td .ic{display:inline-block;width:1.2em;height:1.2em;margin:0 0 0 4px;vertical-align:-3px}'
  + '.csh .ng{margin-left:4px}.csb{padding:6px 10px 8px}.csb>table{margin:4px 0 6px}.csb>p.n{margin:6px 2px 2px}.csb>h3:first-child{margin-top:4px}'
  + '.v{color:#ffcd4a;font-weight:bold}.rd{color:#00d4ed;font-weight:bold}.yes{color:#6fd47f;font-weight:bold}.yes .ic{margin-left:4px}.mu{color:#8fa9ba}'
  + '.tn{color:#fff;font-weight:bold}.csb td.cd{color:#6fd47f;font-weight:bold}.csb .tt tr.got td{background:#0d4a3a}'
  + '.ng{display:inline-block;background:#e0521a;border:1px solid #ffc27a;color:#fff;border-radius:10px;padding:0 8px;font-size:11px;font-weight:bold;letter-spacing:.6px;line-height:1.7;vertical-align:1px}'
  // the tap-to-open quest lists of the Special details: the same card, the summary as its band
  + 'details.vq.cs>summary .cst{color:#ffcd4a;font-weight:bold;font-size:17px}details.vq.cs>.csb{padding:4px 10px 8px}'
  // column roles of a table (the markup of the cells stays as it is): kn<i> column i a name (bold white), kc<i> cyan (rounds,
  // levels, dates), kg<i> gold (values, coins, Jewels); a cell td.r (not served / not built) stays muted
  + [1, 2, 3, 4, 5, 6].map((i) => `.csb table.kn${i} td:nth-child(${i}){color:#fff;font-weight:bold}.csb table.kc${i} td:nth-child(${i}){color:#00d4ed;font-weight:bold}`
    + `.csb table.kg${i} td:nth-child(${i}){color:#ffcd4a;font-weight:bold}`).join('')
  + '.csb .tt td.r{color:#8fa9ba!important;font-weight:normal!important}.csb table td.cd{color:#6fd47f!important}'
  + '.cc{color:#ffcd4a;font-weight:bold}'
  // the boards table (boardTable): card 64 px, numbers on one line, the small lines under a cell
  + 'table.bdt th{color:#fff;font-size:15px;font-weight:bold}table.bdt td{font-size:15px}table.bdt{table-layout:auto}table.bdt td.bc{width:64px;padding-right:0}table.bdt td.bc img,table.bdt td.bc .nb{display:block;width:64px;height:64px;border-radius:6px}'
  + '.nb{display:inline-block;box-sizing:border-box;border:1px solid #2f6f93;border-radius:6px;background:#06283e}'
  + 'table.bdt td.nw{white-space:nowrap}table.bdt small{display:block;color:#b9cfdc;font-size:13px;font-weight:normal}table.bdt small.bns{color:#ffcd4a}'
  // a quest block of the Special details (questBlock): name band, stat chips, objectives and drops tables whose first column has
  // the same width, so their columns line up
  + '.qb{border:1px solid #1d5878;border-radius:8px;background:#05223a;margin:10px 0;overflow:hidden}.qb>h3.qh{margin:0;padding:6px 12px;background:#0a3a5a;color:#fff;font-size:16px}'
  // the stat chips (user 26-11: «label and value run together»): a muted uppercase label and the value in its colour role, apart;
  // Target / Where on their own lines with an icon
  + '.qs{display:flex;flex-wrap:wrap;gap:8px;padding:8px 10px 2px}.qs .st{display:inline-flex;align-items:stretch;border:1px solid #2f6f93;border-radius:12px;overflow:hidden;font-size:14px}'
  + '.qs .st small{background:#0a4466;color:#9fb7c6;font-size:11px;letter-spacing:.08em;text-transform:uppercase;padding:2px 8px;display:flex;align-items:center}'
  + '.qs .st b{background:#06283e;padding:1px 10px;display:flex;align-items:center}.ql{padding:4px 10px 0}.ql div{display:flex;align-items:center;gap:8px;margin:3px 0;font-size:14px;color:#fff}'
  + '.ql small{color:#9fb7c6;font-size:11px;letter-spacing:.08em;text-transform:uppercase;width:5.6em;flex:none}.ql .ic{width:1.2em;height:1.2em;margin:0;flex:none;vertical-align:middle}'
  + '.qb>.qt{padding:4px 10px 8px}.qb h4{margin:8px 0 4px;color:#ffcd4a;font-size:15px;display:flex;align-items:center;gap:6px}.qb h4 .ic{width:1.2em;height:1.2em}'
  + '.qb table.qtt{table-layout:fixed;width:100%;margin:2px 0 6px}.qb table.qtt td:first-child,.qb table.qtt th:first-child{width:62%}.qb table.qtt.dt td:nth-child(2),.qb table.qtt.dt th:nth-child(2){width:14%}'
  + '.qb td .ic{width:1.3em;height:1.3em;margin:0 6px 0 0;vertical-align:-4px}.qb p.n{margin:2px 0 6px}';

// The boards of a detail page, as the Coliseum Boards of the Coliseum season page (user 26-11: «the same table in every catalog»):
// card | Board | (extra columns) | Nodes unlocked | <currency> still needed. rows: [{id, name, sub (html, a small line under the
// name), img (the card URL, null: the neutral box), served, why (not served: the reason), nodes, unlocked, coinsLeft, coinsTotal,
// extra: [html per extra column]}]; o: {currency (e.g. 'Coliseum Coins'), extraHeads: [header], cls (more table classes)}.
// A completed board: green with the crown; nothing unlocked: muted; a board not served: muted with its reason.
const NB = '<span class="nb"></span>';
const NB_JS = "<script>function kxNb(im){var s=document.createElement('span');s.className='nb';im.parentNode.replaceChild(s,im);}</script>";
const num = (n) => Number(n || 0).toLocaleString('en-US');
function boardTable(rows, o = {}) {
  const cur = o.currency || 'Coins', heads = o.extraHeads || [];
  const body = rows.map((b) => {
    const card = b.img ? `<img width="64" height="64" src="${b.img}" loading="lazy" alt="" onerror="kxNb(this)">` : NB;
    // an extra cell is html, or a whole cell when it starts with <td
    const name = `<span class="tn">${b.name}</span>${b.sub || ''}`, extra = (b.extra || []).map((x) => (String(x).startsWith('<td') ? x : `<td>${x}</td>`)).join('');
    if (!b.served) return `<tr><td class="bc">${card}</td><td>${name}</td>${extra}<td>—</td><td class="r">Not served yet${b.why ? `<small>${b.why}</small>` : ''}</td></tr>`;
    // no node data (no progress lookup): dashes
    if (b.nodes == null) return `<tr><td class="bc">${card}</td><td>${name}</td>${extra}<td>—</td><td>—</td></tr>`;
    const done = b.nodes > 0 && b.unlocked >= b.nodes;
    return `<tr${done ? ' class="got"' : ''}><td class="bc">${card}</td><td>${name}</td>${extra}`
      + `<td class="nw"><b class="${b.unlocked ? 'v' : 'mu'}">${b.unlocked}</b> / ${b.nodes}</td>`
      + `<td>${done ? yes('Completed') : `<span class="cc">${num(b.coinsLeft)} ${esc(cur)}</span><small>of ${num(b.coinsTotal)}</small>`}</td></tr>`;
  }).join('');
  return `${NB_JS}<table class="tt bdt${o.cls ? ` ${o.cls}` : ''}"><tr><th></th><th>Board</th>${heads.map((h) => `<th>${h}</th>`).join('')}<th>Nodes unlocked</th>`
    + `<th>${esc(cur)} still needed</th></tr>${body}</table>`;
}
// a quest block (Special details): name, stat chips [[label, html]], then the parts [[icon, title, html, badge]] (objectives, drops)
const questBlock = (name, stats, parts) => `<div class="qb"><h3 class="qh">${name}</h3>`
  // [label, html] a chip; [label, html, icon] a line of its own with that icon
  + (stats.some((x) => !x[2]) ? `<div class="qs">${stats.filter((x) => !x[2]).map(([k, v]) => `<span class="st"><small>${k}</small><b>${v}</b></span>`).join('')}</div>` : '')
  + (stats.some((x) => x[2]) ? `<div class="ql">${stats.filter((x) => x[2]).map(([k, v, ic]) => `<div>${String(ic).startsWith('<') ? ic : icon(ic)}<small>${k}</small><span>${v}</span></div>`).join('')}</div>` : '')
  + `<div class="qt">${parts.map(([ic, t, h, badge]) => `<h4>${icon(ic)}${t}${badge || ''}</h4>${h}`).join('')}</div></div>`;

// The Keep / Remove button of the catalogs (special-pages.js .pk: gold, red to remove, the pin icon) for the pages that do not load
// the catalog CSS (the Banner Catalog, gacha.js, user 26-11: «the same button as the other catalogs»)
const KEEP_LABEL_ICON = icon('pin');
const KEEP_BTN_CSS = '.pk{display:inline-block;margin-top:6px;border:2px solid #ffe08a;border-radius:10px;color:#fff;font:bold 14px sans-serif;padding:3px 14px;'
  + 'background:linear-gradient(#e0a020,#a8700a);cursor:pointer;text-decoration:none;line-height:1.5}.pk[data-on="0"]{border-color:#ffb0b0;background:linear-gradient(#ff5a5a,#d81e2e 55%,#9c1020)}'
  + '.pk .ic{display:inline-block;width:1.3em;height:1.3em;margin:0 6px 0 0;vertical-align:-4px;max-width:none}';

module.exports = { LOCATION_ICON, CHEV, KEEP_BTN_CSS, KEEP_LABEL_ICON, section, cardSections, CARD_CSS, NG, CROWN, val, cyan, yes, mu, tn, iconFor, esc, boardTable, questBlock, NB };
