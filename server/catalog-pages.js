// Parts shared by the catalogue pages of the Events tab (Raid Catalog raid-pages.js, Event Catalog event-pages.js; look approved
// by the author on 06-11): the page head, the status pill, the Keep / Remove button and its script, the merged «On this server»
// box (gold callout, status row, «Rebuilt values» closed with its category colour bands), the «Original notice» card and the
// layout of an original notice (every sentence unchanged, only laid out). Pure HTML / CSS, ES5-safe, no player or master access.
'use strict';
const { esc, niceDay, icon, NARROW_CSS } = require('./special-pages');
const { scrub: scrubNotice, OMIT_LINE: OMIT } = require('./make-raid-notices');
const noticeTables = require('./notice-tables');

const PAGE_HEAD = (title, css) => '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  + `<title>${esc(title)}</title><style>${css}${WALLET_CSS}${require('./detail-cards').HEAD_CSS}${NARROW_CSS}</style></head>`; // NARROW_CSS last: the phone-portrait layout (special-pages.js)
// a status pill (special-pages PILL_CSS colours): class s-<c>, an icon key or none, the text (html)
const pill = (c, k, text) => `<span class="s s-${c}">${k ? icon(k) : ''}${text}</span>`;
const backBar = (href) => `<div class="bar"><a class="back" href="${href}">BACK<span></span></a></div>`;

// Keep / Remove of a catalogue (one kept item at a time, in the Events tab). base: the route prefix (/web/raid, /web/event): POST
// <base>/keep/<id> and <base>/unkeep; noun: the item in the error line («This raid cannot be kept.»). where: the screen the kept
// item is listed in (Events; the Avatar Board Catalog, Events Part 7 Task 5b: «Avatar Boards»), in the button and the messages.
const keepLabel = (where = 'Events') => `${icon('pin')}Keep in ${where}`, removeLabel = (where = 'Events') => `Remove from ${where}`;
const KEEP_LABEL = keepLabel(), REMOVE_LABEL = removeLabel();
const keepButton = (base, id, on, extra = '', cls = '', where = 'Events') => `<a href="#" class="pk${cls}" data-id="${id}" data-on="${on}" data-pin="${on === 1 ? `${base}/keep/${id}` : `${base}/unkeep`}"${extra}>${on === 1 ? keepLabel(where) : removeLabel(where)}</a>`;

// After a keep / remove on a catalogue list (Raid, Event and Coliseum Catalogs): kxRows(rows, PILL, o) defines window.kxRow(id, on),
// which turns the kept row gold, the previous kept row back to its own state and rewrites the «Replaces: <name>» lines
// (replacesLine). The state a row returns to: its data-base (the row's state with nothing kept, server-side; the Coliseum Catalog,
// whose kept season can sit on the story month or later, ruling 10), else «can» (the Raid / Event Catalogs: a kept item is always a
// past one). PILL {kept, can, ...}: [row class, pill html]; a row's own data-bcls / data-bpill (its base class and pill html) win over
// PILL for its base state. A Keep / Remove button shows only on a kept or «can» row. rows: the row elements (data-eid, data-show; a
// « hide» class is kept); o.name(el): the name of a row (default its data-name); o.onSet(el, state): after a row changed state (a
// page's own row model); o.after(): after every keep / remove (a page's render). ES5.
const KEEP_ROWS_JS = "function kxRows(rows,PILL,o){o=o||{};"
  + "function nm(el){return o.name?o.name(el):el.getAttribute('data-name');}"
  + "function bs(el){return el.getAttribute('data-base')||'can';}"
  + "function setRow(el,st){var pc=PILL[st],bp=el.getAttribute('data-bpill');if(st!=='kept'&&bp!==null)pc=[el.getAttribute('data-bcls')||st,bp];"
  + "el.setAttribute('data-show',st);el.className='row '+pc[0]+(/ hide/.test(el.className)?' hide':'');"
  + "var s=el.querySelector('.s');if(s){s.className='s s-'+pc[0];s.innerHTML=pc[1];}"
  + "var b=el.querySelector('.pk');if(b){kxSet(b,el.getAttribute('data-eid'),st==='kept');if(b.style)b.style.display=st==='kept'||st==='can'?'':'none';}"
  + "if(o.onSet)o.onSet(el,st);}"
  + "window.kxRow=function(id,on){var name='',i,el;for(i=0;i<rows.length;i++){el=rows[i];if(el.getAttribute('data-show')==='kept')setRow(el,bs(el));"
  + "if(el.getAttribute('data-eid')===id){setRow(el,on?'kept':bs(el));if(on)name=nm(el);}}"
  + "for(i=0;i<rows.length;i++){var x=rows[i].querySelector('.rp');if(x){x.textContent=name?'Replaces\\u003a '+name:'';"
  + "x.style.display=name&&rows[i].getAttribute('data-show')==='can'?'':'none';}}if(o.after)o.after();};}";
// «Replaces: <kept item>» over a Keep button (st.button 1, Keep; 0, Remove; null, none); hidden on the kept row, which gets it back
// when another item is kept (kxRow). keptName: the name of the kept item, or null when none is kept
const replacesLine = (st, keptName) => (st.button === null ? ''
  : `<div class="rp"${st.button === 1 && keptName ? '' : ' style="display:none"'}>${st.button === 1 && keptName ? `Replaces: ${esc(keptName)}` : ''}</div>`);

// keep / remove (XHR POST, as the Special catalogue): the element carries data-pin (URL) and data-on (1 keep, 0 remove)
const keepJs = (base, noun, where = 'Events') => `var KX_KEEP=${JSON.stringify(keepLabel(where))},KX_REMOVE=${JSON.stringify(removeLabel(where))};`
  + `function kxSet(el,id,kept){el.setAttribute("data-pin",kept?"${base}/unkeep":"${base}/keep/"+id);`
  + 'el.setAttribute("data-on",kept?"0":"1");el.innerHTML=kept?KX_REMOVE:KX_KEEP;}'
  + 'function kxSay(box,cls,head,sub){box.className=cls;box.innerHTML="";var b=document.createElement("div"),s=document.createElement("small");b.textContent=head;s.textContent=sub;box.appendChild(b);box.appendChild(s);box.style.display="block";if(box.scrollIntoView)box.scrollIntoView(false);}'
  + 'function kxKeep(el,onOk){var on=el.getAttribute("data-on")==="1",box=document.getElementById("pinmsg"),x=new XMLHttpRequest();x.open("POST",el.getAttribute("data-pin"));'
  + `x.onload=function(){if(x.status===200){if(on)kxSay(box,"pinmsg","Kept!","Leave and re-enter ${where} to see it.");else kxSay(box,"pinmsg off","Removed.","Leave and re-enter ${where}.");if(onOk)onOk(on);}`
  + `else kxSay(box,"pinmsg err","Could not change ${where}","This ${noun} cannot be kept.");};`
  + 'x.onerror=function(){kxSay(box,"pinmsg err","Could not reach the server","Try again.");};x.send("");return false;}'
  + KEEP_ROWS_JS;

// The Filters of a catalogue (Raid Catalog 03-11, Event Catalog 13-11: «filters like the Raid Catalog»): the «⚙ Filters» button of
// the header, the chips of a group and the sheet (FIND with its hint, the groups, Reset / «Show N results»). Styles: special-pages
// CSS (.fbtn, .sheet, .opts .o) and NARROW_CSS. An option is [value, label, icon key]; the first one of a group is on.
const FILTER_BUTTON = '<button type="button" class="fbtn" id="fbtn">⚙ Filters<span class="dot" id="fdot"></span></button>';
// The coins the player owns, in the catalogue header next to Filters (user 26-11: no balance in the detail sections): w = {img (the
// URL of the game's own coin icon, server.js coinWallet: /web/coin/v<N>/<key>.png) or ic (an icon key of special-pages.js), label,
// value (number), title (tooltip)}; no icon without either; '' without w. Pushes Filters to the right; on phones as compact as the button.
// Two parts (user 26-11, the AP / LEVEL stat chips of the Special details, detail-cards.js .qs .st): the coin icon and its name on the
// darker label side, the amount in gold on its own side; the same chip in every catalogue header and on the Game Catalog hub cards.
const walletIcon = (w) => (w.img ? `<img class="ic" src="${esc(w.img)}" alt="">` : w.ic ? icon(w.ic) : '');
const walletChip = (w) => (w && Number.isFinite(Number(w.value)) ? `<span class="wal"${w.title ? ` title="${esc(w.title)}"` : ''}><small>${walletIcon(w)}${esc(w.label)}</small>`
  + `<b>${Number(w.value).toLocaleString('en-US')}</b></span>` : '');
const WALLET_CSS = '.wal{margin-left:auto;display:inline-flex;align-items:stretch;border:1px solid #2f6f93;border-radius:12px;overflow:hidden;white-space:nowrap;line-height:1.3}'
  + '.wal small{background:#0a4466;color:#d9e6ee;font-size:13px;padding:3px 10px 3px 5px;display:flex;align-items:center;gap:6px}'
  + '.wal .ic{width:1.6em;height:1.6em;margin:0;display:block;max-width:none}'
  + '.wal b{background:#06283e;color:#ffcd4a;font-size:16px;font-weight:bold;padding:2px 12px;display:flex;align-items:center;justify-content:center;min-width:1.6em}.hdr .wal+.fbtn{margin-left:0}'
  + '@media (max-width:700px) and (min-height:481px){.wal{-webkit-flex:1 1 100%;flex:1 1 100%;justify-content:center;min-height:40px;box-sizing:border-box}}';
const optLabel = ([, l, k]) => (k ? icon(k) : '') + esc(l);
const filterOpts = (list, cls = () => '', sa = () => '') => list.map((o, i) => `<button type="button" class="o${cls(o[0])}${i ? '' : ' on'}" data-v="${o[0]}"${sa(o[0])}>${optLabel(o)}</button>`).join('');
// the labels of the summary chips, {value: html} without «All»
const optLabels = (list) => JSON.stringify(Object.fromEntries(list.slice(1).map((o) => [o[0], optLabel(o)])));
// groups: [[title, html of the chips with their .opts box]]; n: the results before any filter
const filterSheet = ({ placeholder, hint, groups, n }) => '<div class="ov" id="dim"></div><div class="sheet" id="sheet" role="dialog" aria-label="Filters">'
  + '<div class="shd"><b>Filters</b><button type="button" class="x" id="fx" aria-label="Close">✕</button></div>'
  + `<h4>FIND</h4><div class="search"><input type="search" id="fq" placeholder="${esc(placeholder)}" autocomplete="off"></div>`
  + `<div class="hint">${esc(hint)}</div>`
  + groups.map(([title, html]) => `<h4>${title}</h4>${html}`).join('')
  + `<div class="foot"><a href="#" class="reset" id="freset">Reset filters</a><button type="button" class="ok" id="fok">Show ${n} result${n === 1 ? '' : 's'}</button></div></div>`;

// The AP / Bonus Time rule of this server (I-228, raid-windows.js costRule weekdayWeekend; user 06-11): a callout on the detail page
// and at the top of every original notice page, whose AP costs, Bonus Time hours and opening times are the original game's.
// Callout (user 06-11, graphics): a gold-framed box with a title (Raid Coin icon) and a «NOT ORIGINAL» tag, two side-by-side blocks
// Monday – Friday / Saturday – Sunday with the catalogues' icons (calendar, AP medal, Lux star, Bonus Time clock), and a foot line
// with the link to the «Raid Bosses» notice (/web/notices#raid-bosses opens it, routes-info-album.js). Plain HTML / CSS, ES5-safe.
const RULE_CSS = '.rc{border:2px solid #ffcd4a;border-radius:10px;background:#06283e;padding:8px 10px 6px;margin:10px 0;line-height:1.45;font-size:15px}'
  + '.rch{color:#ffcd4a;font-weight:bold;font-size:17px;margin:0 0 6px}.rch .ic{width:1.5em;height:1.5em}'
  + '.ng{display:inline-block;background:#e8641c;background:-webkit-linear-gradient(top,#ffa13d,#e0521a);background:linear-gradient(#ffa13d,#e0521a);border:1px solid #ffc27a;color:#fff;border-radius:10px;padding:0 9px;margin-left:8px;font-size:11px;font-weight:bold;letter-spacing:.6px;vertical-align:2px;line-height:1.7;text-shadow:0 1px 1px rgba(90,25,0,.55);box-shadow:0 1px 3px rgba(0,0,0,.45)}'
  + '.rcs{display:-webkit-box;display:-webkit-flex;display:flex;-webkit-flex-wrap:wrap;flex-wrap:wrap;margin:0 -4px}'
  + '.rcd{-webkit-box-flex:1;-webkit-flex:1 1 140px;flex:1 1 140px;min-width:140px;box-sizing:border-box;margin:0 4px 6px;padding:5px 9px 6px;border-radius:8px;background:#0a4466;border-top:4px solid #39a7cf}'
  + '.rcd.we{background:#0d4a3a;border-top-color:#2e9e3e}.rcd b{display:block;color:#fff;font-size:15px;margin-bottom:3px}'
  + '.rcd span{display:block;color:#d9e6ee;font-size:14px;padding:1px 0 1px 1.7em;text-indent:-1.7em}.rcd span .ic{width:1.35em;height:1.35em}.rcd span.ni{text-indent:0}'
  + '.rcf{color:#b9cfdc;font-size:13.5px;margin:2px 2px 0}.rcf a{color:#9fd4ff}';
// The merged «On this server» box (user 06-11) and its «Rebuilt values» part: category cards with a full colour band per group
const SRV_CSS = '.sb{border:2px solid #ffcd4a;border-radius:10px;background:#06283e;padding:8px 10px 8px;margin:18px 0 10px;line-height:1.45;font-size:15px}'
  + '.sb .why{margin:2px 0 6px;padding:4px 10px;display:-webkit-box;display:-webkit-flex;display:flex;-webkit-flex-wrap:wrap;flex-wrap:wrap;-webkit-box-align:center;-webkit-align-items:center;align-items:center}'
  + '.sb .why .s{margin:2px 10px 2px 0}.sbi{color:#b9cfdc;font-size:14px;margin:4px 2px 6px}'
  + '.rgs{display:-webkit-box;display:-webkit-flex;display:flex;-webkit-flex-wrap:wrap;flex-wrap:wrap;margin:0 -4px}'
  + '.rg{-webkit-box-flex:1;-webkit-flex:1 1 260px;flex:1 1 260px;min-width:240px;box-sizing:border-box;margin:0 4px 8px;padding:0 9px 4px;border-radius:8px;background:#0a4466;overflow:hidden}'
  // the group heads (user 06-11: make clear they are categories): a full colour band, capitals, over the column
  + '.rg>b{display:block;margin:0 -9px 3px;padding:6px 10px 5px;background:#b8423a;color:#fff;font-size:16px;text-transform:uppercase;letter-spacing:.08em;text-shadow:0 1px 2px rgba(0,0,0,.5)}'
  + '.rg.rw>b{background:#a87a10}.rg.ru>b{background:#1f7ea6}.rg.ot>b{background:#5b7383}.rg>b .ic{width:1.35em;height:1.35em}.rg .ic{width:1.35em;height:1.35em}'
  + '.ri{padding:3px 0 3px 1.75em;text-indent:-1.75em;border-top:1px solid #1d5878}.ri b{color:#fff;font-size:14.5px}.ri span{display:block;text-indent:0;color:#d9e6ee;font-size:13.5px}'
  + '.rsh{color:#ffcd4a;font-weight:bold;font-size:15.5px;margin:10px 2px 5px;letter-spacing:.03em}.rsh .ic{width:1.35em;height:1.35em;margin-right:4px}'
  // «Rebuilt values» closed (user 06-11): the summary is a tappable bar in the gold-heading style, own ▸ marker (turns when open),
  // count chip and tap hint; the default marker hidden (display:block for current Chrome, ::-webkit-details-marker for old WebViews)
  + 'details.rb{margin:12px 0 6px}details.rb>summary{display:block;list-style:none;cursor:pointer;padding:7px 10px 6px;background:#0a4466;border:1px solid #2f6f93;border-bottom:2px solid #ffcd4a;border-radius:8px;outline:0}'
  + 'details.rb>summary::-webkit-details-marker{display:none}details.rb[open]>summary{border-radius:8px 8px 0 0;margin-bottom:8px}'
  + '.rbm{display:inline-block;color:#ffcd4a;font-size:19px;line-height:1;width:1em;text-align:center;-webkit-transition:-webkit-transform .15s;transition:transform .15s}details.rb[open] .rbm{-webkit-transform:rotate(90deg);transform:rotate(90deg)}'
  + '.rbh{color:#ffcd4a;font-weight:bold;font-size:17px;letter-spacing:.03em}.rbh .ic{width:1.3em;height:1.3em;margin-right:6px}'
  + '.rbn{display:inline-block;background:#ffcd4a;color:#06283e;border-radius:10px;padding:0 9px;margin-left:10px;font-size:12.5px;font-weight:bold;line-height:1.7;vertical-align:2px}'
  + '.rbt{float:right;color:#9fd4ff;font-size:13px;margin-top:3px}.rbt .c{display:none}details.rb[open] .rbt .o{display:none}details.rb[open] .rbt .c{display:inline}'
  + '.rbs{display:block;color:#b9cfdc;font-size:13.5px;margin:2px 0 0 1.1em}'
  + '.sbo{color:#ffb3a8;font-size:14px;margin:2px 2px 6px}.sbo .ic{width:1.3em;height:1.3em}.sb details.fold{border-color:#1d5878;font-size:14px}.sb details.fold li{margin:3px 0}'
  + '.sbl{margin:8px 0 2px}.sbl a{display:inline-block;background:#0d5f86;border:1px solid #39a7cf;border-radius:16px;padding:3px 14px;margin:4px 8px 0 0;color:#fff;text-decoration:none;font-size:14.5px}';
// the «Why these values?» fold outside the notice pages (NOTICE_CSS has its own)
const FOLD_CSS = 'details.fold{margin:6px 0;border:1px solid #1d5878;border-radius:6px;padding:2px 10px;font-size:14px}details.fold>summary{cursor:pointer;color:#00d4ed;padding:4px 0}details.fold li{margin:3px 0}';
// The «Rebuilt values» part of the box, closed (user 06-11): the summary bar (count of the cards' lines), then one card per
// group with its colour band, then the full sentences folded. codes: the labels shown; groups: [[key, name, icon, class]];
// short: {code: [group, short label, one short line, icon]} (a code without one: group 'other', label(code), a generic line);
// fold: the html of «Why these values?».
function rebuiltValues(codes, { groups, short, label = (c) => c, fold = '' }) {
  if (!codes.length) return '';
  let count = 0;
  const cards = groups.map(([g, name, ic, cls]) => {
    const rows = [], seen = new Set();
    for (const c of codes.filter((x) => (short[x] ? short[x][0] : 'other') === g)) {
      const [, l, line, k] = short[c] || [g, label(c), 'Rebuilt from the surviving sources', ic];
      if (seen.has(`${l}|${line}`)) continue;
      seen.add(`${l}|${line}`);
      rows.push(`<div class="ri">${icon(k)}<b>${esc(l)}</b><span>${esc(line)}</span></div>`);
    }
    count += rows.length;
    return rows.length ? `<div class="rg${cls}"><b>${icon(ic)}${esc(name)}</b>${rows.join('')}</div>` : '';
  }).join('');
  return `<details class="rb"><summary><span class="rbm">▸</span><span class="rbh">${icon('replaced')}Rebuilt values</span>`
    + `<span class="rbn">${count} value${count === 1 ? '' : 's'}</span><span class="rbt"><span class="o">tap to open</span><span class="c">tap to close</span></span>`
    + '<span class="rbs">These values are lost in the original game data: this server rebuilt them from the surviving sources.</span></summary>'
    + `<div class="rgs">${cards}</div><details class="fold"><summary>Why these values?</summary>${fold}</details></details>`;
}
// The «On this server» box at the top of the notice and detail pages (user 06-11): title + NOT ORIGINAL once, the status row
// (st: {cls, pill, why}), o.after (html under the status row: the Keep button and its messages), the intro line, o.body (the
// parts of the catalogue: rule, rebuilt values, what is not restored), the pill links ([[href, text]]). ic: the title icon.
const srvFrame = (st, o, ic) => '<div class="sb">'
  + `<div class="rch">${icon(ic)}On this server<span class="ng">NOT ORIGINAL</span></div>`
  + `<div class="why ${st.cls}">${st.pill}<span>${st.why}</span></div>${o.after || ''}<p class="sbi">${o.intro}</p>`
  + (o.body || '')
  + `<p class="sbl">${o.links.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('')}</p></div>`;

// «Original notice» card of the raid notice page (user 06-11, style only: every line of the notice stays as it is): a header
// strip (title, date chip), the event sections without their own frames, gold event bands, underlined ■ heads, cyan ▼ heads,
// gold bullets, the tables in the original notices' colours (#365e76 head, #043654 rows) with zebra rows and rounded corners,
// a quieter [Edited …] chip. Scoped to .onc: the Shop notice page (same NOTICE_CSS) is unchanged. Flex-free, old WebView safe.
const ONC_CSS = '.onc{border:1px solid #2f6f93;border-radius:10px;background:#06283e;margin:16px 0 12px;overflow:hidden}'
  + '.onc>h2.och{margin:0;padding:8px 14px 7px;color:#fff;font-size:18px;letter-spacing:.03em;background:#0a4466;background:-webkit-linear-gradient(top,#0f5a85,#0a4466);background:linear-gradient(#0f5a85,#0a4466);border-bottom:2px solid #39a7cf}'
  + '.onc>h2.och:before{content:""}.och .ic{width:1.35em;height:1.35em;margin-right:6px}.och .ocd{display:inline-block;margin-left:10px;padding:0 10px;border:1px solid #ffcd4a;border-radius:12px;color:#ffcd4a;font-size:13px;font-weight:normal;line-height:1.7;vertical-align:2px;letter-spacing:0}'
  + '.onc .ns{border:0;border-radius:0;background:transparent;margin:0;padding:10px 16px 12px;font-size:16px;line-height:1.65;word-wrap:break-word;overflow-wrap:break-word}.onc .ns+.ns{border-top:1px solid #1d5878}'
  + '.onc .ns h2{display:block;margin:2px 0 10px;padding:6px 12px;font-size:18px;line-height:1.4;color:#ffcd4a;background:#0d3c5a;border-left:4px solid #ffcd4a;border-radius:0 6px 6px 0}.onc .ns h2:before{content:""}'
  + '.onc .ns h3{color:#ffcd4a;font-size:16.5px;margin:18px 0 6px;padding-bottom:3px;border-bottom:1px solid #6b5a2a}'
  + '.onc .ns h4{color:#00d4ed;font-size:15.5px;margin:12px 0 4px;padding-left:8px;border-left:3px solid #00d4ed}'
  + '.onc .ns p{margin:4px 0 9px;max-width:66em}.onc .ns .tg{font-size:17px;margin:2px 0 10px}'
  + '.onc .ns .upd{background:transparent;border:1px solid #b8860b;color:#e8c46a;font-size:12.5px;padding:0 9px;margin:2px 0 6px}'
  + '.onc .ns .nb{padding-left:1em;text-indent:-1em;max-width:70em}.onc .ns a{color:#9fd4ff;text-decoration:underline}'
  + '.onc ul.nl{list-style:none;margin:4px 0 10px;padding-left:6px}.onc ul.nl li{margin:3px 0;padding-left:1.2em;text-indent:-1.2em}'
  + '.onc ul.nl li:before{content:"\\2022";display:inline-block;width:1.2em;text-indent:0;color:#ffcd4a;font-weight:bold}'
  + '.onc .ns table{width:100%;margin:6px 0 14px;border-collapse:separate;border-spacing:0;border:1px solid #5f8aa5;border-radius:8px;font-size:15px}'
  + '.onc .ns th,.onc .ns td{border:0;border-top:1px solid #2f5d78;padding:6px 10px;text-align:left}.onc .ns tr:first-child>*{border-top:0}'
  + '.onc .ns th{background:#365e76;color:#fff;font-weight:bold}.onc .ns td{background:#043654}.onc .ns tr:nth-child(even) td{background:#0a4466}'
  + '.onc .ns td+td,.onc .ns th+td,.onc .ns th+th{border-left:1px solid #2f5d78}'
  + '.onc .ns tr:first-child>:first-child{border-top-left-radius:7px}.onc .ns tr:first-child>:last-child{border-top-right-radius:7px}'
  + '.onc .ns tr:last-child>:first-child{border-bottom-left-radius:7px}.onc .ns tr:last-child>:last-child{border-bottom-right-radius:7px}'
  + '.onc .ns .rw td.q{color:#ffcd4a;font-weight:bold}.onc .ns .rw th:last-child{width:28%}.onc .ns .rw td.q{width:auto}'
  + '.onc details.fold{background:#0a3a58;border-color:#2f6f93;padding:2px 12px}.onc details.fold>summary{font-weight:bold}';
const NOTICE_CSS = RULE_CSS + '.ntw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:6px 0 14px}.ntw table.ntb{margin:0;min-width:100%}.ntb th,.ntb td{vertical-align:middle}.ntb th{white-space:normal;text-align:center}' + '.dt{margin:2px 0 10px}.chip{display:inline-block;background:#0d5f86;border:1px solid #39a7cf;border-radius:12px;padding:0 10px;margin:0 6px 4px 0;font-size:13px;line-height:1.7;color:#fff}'
  + '.chip.d{background:#06283e;border-color:#ffcd4a;color:#ffcd4a}'
  + '.ns{border-left:5px solid #5d8aa6;background:#06283e;border-radius:0 8px 8px 0;padding:6px 12px 8px;margin:10px 0;font-size:16px;line-height:1.55;overflow-wrap:break-word}'
  + '.ns.raid{border-left-color:#ffcd4a}.ns h2{margin:4px 0 4px}.ns.raid h2{color:#ffcd4a}.ns h3{font-size:16px;margin:12px 0 2px}.ns h4{color:#00d4ed;font-size:15px;margin:10px 0 2px}'
  + '.ns p{margin:3px 0 6px}.ns .tg{color:#fff;font-weight:bold;margin:2px 0 6px}.ns .upd{display:inline-block;background:#b8860b;border-radius:10px;padding:0 10px;font-size:13px;line-height:1.7;margin:4px 0}'
  + '.ns .nb{color:#b9cfdc;font-size:14px;margin:2px 0 4px}.ns .om{color:#b9cfdc;font-style:italic;font-size:14px;border:1px dashed #5d8aa6;border-radius:6px;padding:4px 10px}'
  + 'ul.nl{margin:2px 0 8px;padding-left:22px}ul.nl li{margin:2px 0}.ns table{margin:4px 0 10px}.rw td.q{width:28%;color:#ffcd4a;white-space:nowrap}.pd th{width:30%}.bt th{width:50%}'
  + 'details.fold{margin:6px 0;border:1px solid #2f5d78;border-radius:6px;padding:2px 10px}details.fold>summary{cursor:pointer;color:#00d4ed;padding:4px 0}'
  + 'details.oth{margin:10px 0}details.oth>summary{cursor:pointer;color:#b9cfdc;font-size:15px;padding:6px 10px;background:#0a4466;border-radius:6px}details.oth[open]>summary{color:#fff}'
  + SRV_CSS + ONC_CSS + 'h2.on{margin-top:20px}.srv{border:2px solid #ffcd4a;border-radius:8px;background:#0a4466;padding:4px 12px 10px;margin:18px 0}.srv h2{color:#ffcd4a;margin-top:6px}.srv h2:before{content:""}'
  + '.srv a,.na a{color:#9fd4ff}.srv li{margin:4px 0}';
// «Original notice» card: header strip (icon, date chip) over the notice sections (html)
const noticeCard = (ic, date, html) => `<div class="onc"><h2 class="och">${icon(ic)}Original notice${date ? `<span class="ocd">${esc(niceDay(date))}</span>` : ''}</h2>${html}</div>`;

// notice body (lines) -> {sections: [{head (null: the lines before the first heading), lines, raid}]}; bosses: of the week
// ● / ◆ open an event, except an hour line «● 2:00 p.m. - …» (a list line) and «● Raid Boss Bonus Time» (17890: a sub-heading)
const EVENT_HEAD = /^[●◆](?!\s*\d)(?!.*Bonus Time\s*$)\s*/, STAR = /^★\s*/, BRACKET = /^【[^】]*】$/;
function parseNotice(body, bosses = []) {
  const lines = scrubNotice((body || []).map((l) => String(l ?? ''))).body;
  const top = lines.some((l) => EVENT_HEAD.test(l) || BRACKET.test(l));
  const sections = [{ head: null, lines: [] }];
  let seenEvent = false;
  for (const l of lines) {
    const ev = EVENT_HEAD.test(l) || BRACKET.test(l);
    // ★ opens an event when the notice has no ● at all, or before its first ● (61221: the ★ events before the ● ones)
    if (ev || (STAR.test(l) && (!top || !seenEvent) && !(sections[sections.length - 1].head && !sections[sections.length - 1].lines.length))) {
      if (ev) seenEvent = true;
      sections.push({ head: l.replace(EVENT_HEAD, '').replace(STAR, '').replace(/^【([^】]*)】$/, '$1').trim(), star: !ev, lines: [] });
    } else sections[sections.length - 1].lines.push(l);
  }
  if (!sections[0].lines.length) sections.shift();
  const names = bosses.filter(Boolean).map((b) => b.toLowerCase());
  // «Radiant Rewards» is a raid section only when it is not the Union Cross one («New Year Union Cross Radiant Rewards», 2021)
  for (const s of sections) s.raid = !!s.head && (/\braid/i.test(s.head) || (/radiant/i.test(s.head) && !/union\s*cross|\bcross\b/i.test(s.head))
    || names.some((b) => s.head.toLowerCase().includes(b)));
  // no heading names the raid (65407 «May Special Campaign!», the end-of-service notice): the event that speaks of raids most
  if (!sections.some((s) => s.raid)) {
    const n = (s) => (s.head ? s.lines.filter((l) => /\braid/i.test(l)).length : 0);
    const best = sections.reduce((a, s) => (n(s) > n(a) ? s : a), sections[0]);
    if (best && n(best) >= 2) best.raid = true;
  }
  return { sections };
}

// an hour range «2:00 a.m. - 2:59 a.m.» / «9:00 to 10:00», or two of them around «→» (the daylight-saving change of 2017)
const RANGE = '\\d{1,2}:\\d\\d(\\s*[ap]\\.?m\\.?)?\\s*(-|–|~|to)\\s*\\d{1,2}:\\d\\d(\\s*[ap]\\.?m\\.?)?';
const PT_LINE = /^(.*\S)\s*\(PT\)$/, UTC_LINE = /^(.*\S)\s*\(UTC\)$/, HOURS = new RegExp(`^${RANGE}(\\s*→\\s*${RANGE})?$`, 'i');
// «Name x N» (one item: not «A x 1, B x 1»)
const REWARD = /^[・•]?\s*((?:(?![xX×]\s*\d).)+?)(?:\s+[xX]|\s*×)\s*(\d{1,3}(?:,\d{3})+|\d+)$/;
const LIST = /^(?:[・•]|[●◆](?=\s*\d))\s*/, NOTE = /^[*＊※]/, OPEN = /^▽\s*(.*?)\s*▽$/, CLOSE = /^[△▲]\s*CLOSE\s*[△▲]$/i;
// the Shop notices fold with filled triangles: «▼ Show Tier 9 Medals ▼» … «▲ CLOSE ▲» (closed on the original page; 14-11, user:
// the CLOSE lines showed as text). A «▼ … ▼» line is a fold only when a CLOSE follows before the next one.
const SHOW = /^▼\s*(?:Show\s+)?(.*?)\s*▼$/;
const foldEnd = (lines, i) => { for (let j = i + 1; j < lines.length; j++) { if (CLOSE.test(lines[j])) return j; if (SHOW.test(lines[j]) || OPEN.test(lines[j])) return -1; } return -1; };
// the lines of one section -> html (every line escaped; the markers are layout and are dropped, * notes keep theirs)
// a table of the original notice (notice-tables.js line): header cells, spans and line breaks as on the original page
function noticeTable(t) {
  const cell = (c) => { const tag = c.h ? 'th' : 'td'; return `<${tag}${c.cs > 1 ? ` colspan="${Number(c.cs)}"` : ''}${c.rs > 1 ? ` rowspan="${Number(c.rs)}"` : ''}>${(c.t || []).map(esc).join('<br>')}</${tag}>`; };
  return `<div class="ntw"><table class="ntb">${t.map((r) => `<tr>${r.map(cell).join('')}</tr>`).join('')}</table></div>`;
}
function noticeBlocks(lines) {
  let h = '';
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    let m;
    if (noticeTables.isTable(l)) {
      const t = noticeTables.tableOf(l);
      if (t) h += noticeTable(t);
    } else if ((m = OPEN.exec(l))) {
      let j = i + 1;
      while (j < lines.length && !CLOSE.test(lines[j])) j++;
      h += `<details class="fold"><summary>${esc(m[1])}</summary>${noticeBlocks(lines.slice(i + 1, j))}</details>`;
      i = j;
    } else if ((m = SHOW.exec(l)) && foldEnd(lines, i) > 0) {
      const j = foldEnd(lines, i);
      h += `<details class="fold"><summary>${esc(m[1])}</summary>${noticeBlocks(lines.slice(i + 1, j))}</details>`;
      i = j;
    } else if (CLOSE.test(l) || /^▲\s*Return to TOP$/i.test(l)) {
      // a stray close marker, a link back to the top of the web page: layout only
    } else if (l === OMIT) {
      h += `<p class="om">${esc(l)}</p>`;
    } else if (/^[■●◆](?!\s*\d)/.test(l)) {
      h += `<h3>${esc(l.replace(/^[■●◆]\s*/, ''))}</h3>`;
    } else if (/^[▼◇]\s*/.test(l)) {
      h += `<h4>${esc(l.replace(/^[▼◇]\s*/, ''))}</h4>`;
    } else if (STAR.test(l)) {
      h += `<p class="tg">${esc(l.replace(STAR, ''))}</p>`;
    } else if (/^\[?(Updated|Edited)\b/i.test(l)) {
      h += `<p><span class="upd">${esc(l)}</span></p>`;
    } else if (PT_LINE.test(l) && UTC_LINE.test(lines[i + 1] || '')) {
      h += `<table class="kv pd"><tr><th>Pacific Time</th><td>${esc(PT_LINE.exec(l)[1])}</td></tr><tr><th>UTC</th><td>${esc(UTC_LINE.exec(lines[i + 1])[1])}</td></tr></table>`;
      i++;
    } else if (/^Pacific Time$/i.test(l) && /^UTC$/i.test(lines[i + 1] || '')) {
      // optional caption line «(…)» under the header, then the PT column and the UTC column
      const cap = /^\(.*\)$/.test(lines[i + 2] || '') ? 1 : 0;
      let j = i + 2 + cap;
      while (j < lines.length && HOURS.test(lines[j].replace(/　/g, ' '))) j++;
      const hrs = lines.slice(i + 2 + cap, j), n = hrs.length / 2;
      if (n >= 1 && Number.isInteger(n)) {
        h += (cap ? `<p class="nb">${esc(lines[i + 2])}</p>` : '')
          + `<table class="bt"><tr><th>Pacific Time</th><th>UTC</th></tr>${hrs.slice(0, n).map((x, k) => `<tr><td>${esc(x)}</td><td>${esc(hrs[n + k])}</td></tr>`).join('')}</table>`;
        i = j - 1;
      } else h += `<p>${esc(l)}</p>`;
    } else if (REWARD.test(l)) {
      let j = i;
      while (j < lines.length && REWARD.test(lines[j])) j++;
      h += `<table class="rw"><tr><th>Item</th><th>Quantity</th></tr>${lines.slice(i, j).map((x) => { const [, a, b] = REWARD.exec(x); return `<tr><td>${esc(a)}</td><td class="q">× ${esc(b)}</td></tr>`; }).join('')}</table>`;
      i = j - 1;
    } else if (LIST.test(l)) {
      let j = i;
      while (j < lines.length && LIST.test(lines[j]) && !REWARD.test(lines[j])) j++;
      h += `<ul class="nl">${lines.slice(i, j).map((x) => `<li>${esc(x.replace(LIST, ''))}</li>`).join('')}</ul>`;
      i = j - 1;
    } else if (NOTE.test(l)) {
      h += `<p class="nb">${esc(l)}</p>`;
    } else h += `<p>${esc(l)}</p>`;
  }
  return h;
}

// Light catalogue (raid-pages.js task 3, 06-11: 366+ KB took long to show in the in-game WebView; the Event Catalog too since Events Part 4): the rows are sent packed and built by the
// page before its filter script runs, so the DOM and the filters are the same as before. Each row's markup becomes a template:
// its own values (search names, date line, name, evStageId, year) are replaced by markers \u0001<k>, so the rows share a few
// dozen templates; the search names go through one dictionary. Replacing a value and putting the same value back is
// lossless whatever else the text holds. Card pictures: data-src, loaded only for the rows shown (kxImgs after every render):
// the old WebView ignores loading="lazy" and fetched all the cards at once. The details of a raid stay on its own page.
// fields.c (Avatar Board Catalog, Events Part 7 Task 5c): the board ids of the row's card pictures (.../<id>.png), replaced by
// marker \u0002<i> so the rows with the same number of cards share a template; the ids (and fields.cm) travel in r[8].
const PACK_KEYS = ['s', 'd', 'n', 'e', 'y'];
function packCatalog(packed) {
  const tpl = [], tplIx = new Map(), dict = [], dictIx = new Map();
  const word = (w) => { if (!dictIx.has(w)) { dictIx.set(w, dict.length); dict.push(w); } return dictIx.get(w); };
  const rows = packed.map(({ label, fields, html }) => {
    let h = html;
    const cards = Array.isArray(fields.c) ? [...fields.c] : [];
    cards.forEach((id, i) => { h = h.split(`/${id}.png`).join(`/\u0002${i}.png`); });
    // fields.cm: the number of the row's «+N» badge (<span class="more">+N</span>), packed after the ids
    if (fields.cm) { h = h.split(`<span class="more">+${fields.cm}<`).join(`<span class="more">+\u0002${cards.length}<`); cards.push(fields.cm); }
    // fields.a: [[attribute, value]] of the row's own marks (Bought / Not bought, node progress), packed after them
    for (const [k, v] of fields.a || []) { h = h.split(` ${k}="${v}"`).join(` ${k}="\u0002${cards.length}"`); cards.push(v); }
    if (cards.length > 10) throw new Error('packCatalog: at most 10 packed card values per row');
    PACK_KEYS.forEach((k) => { if (fields[k]) h = h.split(fields[k]).join(`\u0001${k}`); });
    // the TYPE of the row (06-11: one per JP family) only inside its attribute, so the rows of all types share their templates
    if (fields.t) h = h.split(`data-type="${fields.t}"`).join('data-type="\u0001t"');
    if (!tplIx.has(h)) { tplIx.set(h, tpl.length); tpl.push(h); }
    const row = [tplIx.get(h), fields.s ? fields.s.split(' | ').map(word) : [], fields.d, fields.n, fields.e, fields.y, label, fields.t];
    if (cards.length) row.push(cards);
    return row;
  });
  // «</» never closes the script element: written <\/ inside the JSON
  return JSON.stringify({ t: tpl, w: dict, r: rows }).replace(/<\//g, '<\\/');
}
const unpackRow = (d, r) => r[6] + d.t[r[0]].replace(/\u0001([sdneyt])/g, (x, k) => ({ s: r[1].map((i) => d.w[i]).join(' | '), d: r[2], n: r[3], e: r[4], y: r[5], t: r[7] })[k])
  .replace(/\u0002(\d)/g, (x, k) => r[8][k]);
// the same expansion as UNPACK_JS, for the tests: the catalogue page with its rows written out
function expandCatalog(page) {
  const m = /<script id="kxrows" type="application\/json">([\s\S]*?)<\/script><script>[\s\S]*?<\/script>/.exec(page);
  if (!m) return page;
  const d = JSON.parse(m[1]);
  const html = d.r.map((r) => unpackRow(d, r)).join('');
  return page.replace(m[0], '').replace(/(<div id="rows"[^>]*>)/, (x) => x + html);
}
const UNPACK_JS = 'function kxImgs(){var a=document.querySelectorAll("#rows .row"),i,j,im;for(i=0;i<a.length;i++){if(/ hide/.test(a[i].className))continue;im=a[i].querySelectorAll("img[data-src]");'
  + 'for(j=0;j<im.length;j++)if(!im[j].getAttribute("src"))im[j].setAttribute("src",im[j].getAttribute("data-src"));}}'
  + '(function(){var d=JSON.parse(document.getElementById("kxrows").textContent),o=[],i,r;for(i=0;i<d.r.length;i++){r=d.r[i];'
  + 'o.push(r[6]+d.t[r[0]].replace(/\u0001([sdneyt])/g,function(x,k){if(k==="s"){var s=[],j;for(j=0;j<r[1].length;j++)s.push(d.w[r[1][j]]);return s.join(" | ");}return k==="d"?r[2]:k==="n"?r[3]:k==="e"?r[4]:k==="t"?r[7]:r[5];}).replace(/\u0002(\\d)/g,function(x,k){return r[8][k];}));}'
  + 'document.getElementById("rows").innerHTML=o.join("");})();';
module.exports = { walletChip, WALLET_CSS, PAGE_HEAD, pill, backBar, KEEP_LABEL, REMOVE_LABEL, keepButton, keepJs, KEEP_ROWS_JS, replacesLine, RULE_CSS, SRV_CSS, FOLD_CSS, ONC_CSS, NOTICE_CSS, rebuiltValues, srvFrame,
  noticeCard, parseNotice, noticeBlocks, packCatalog, expandCatalog, UNPACK_JS, FILTER_BUTTON, optLabel, filterOpts, optLabels, filterSheet };
