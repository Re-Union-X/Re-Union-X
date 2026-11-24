// Phone layout of the in-game web pages (plan 2026-11-24-phone-webview): node server/test-phone-css.js
'use strict';
const fs = require('fs');
const path = require('path');
const { PHONE_MQ, PHONE_CSS, withPhone } = require('./phone-css');
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };

// Task 1: the CSS block
check(PHONE_MQ === '(max-height:480px) and (max-width:900px)', `PHONE_MQ ${PHONE_MQ}`);
check(PHONE_CSS.startsWith('@media (max-height:480px) and (max-width:900px){'), 'PHONE_CSS starts with the phone media query');
check(PHONE_CSS.endsWith('}'), 'PHONE_CSS is one closed block');
check(PHONE_CSS.includes('html{zoom:.7}'), 'reduction html{zoom:.7}');
for (const c of ['#rows', '#quests', '#camps', '.cat']) {
  check(new RegExp(`${c.replace(/[#.]/g, '\\$&')}[,{]`).test(PHONE_CSS), `grid container ${c}`);
}
check(PHONE_CSS.includes('grid-template-columns:repeat(3,minmax(0,1fr))'), '3-column grid');
check(!/(^|[{};])\.ml\{/.test(PHONE_CSS) && !/,\.ml[,{]/.test(PHONE_CSS), 'no bare .ml rule (gacha.js uses .ml for medal lists)');
for (const c of ['#rows>.ml', '#quests>.ml', '#camps>.ml']) check(PHONE_CSS.includes(c), `month headers hidden in ${c}`);

// Avatar Board cards hold several 70 px board pictures (.im.bc): they wrap as small tiles, never stretched to the card
check(PHONE_CSS.includes('#rows>.row .im.bc,') && /\.im\.bc img[^{]*\{[^}]*width:50px!important/.test(PHONE_CSS), 'board tiles of the Avatar Board Catalog: 50 px');
check(/\.im\.bc\{[^}]*flex-wrap:nowrap!important[^}]*height:50px!important/.test(PHONE_CSS), 'board pictures on one row of fixed height (a «+N» badge wrapped to a second row, user 24-11)');

// Cards of a row look the same (user 24-11): equal heights, state chips and Keep / Remove buttons as wide as the card,
// the button at the bottom of the card
check(/#rows,#quests,#camps,\.cat\{[^}]*align-items:stretch/.test(PHONE_CSS), 'cards of a row stretch to the same height');
check(/\.s\{[^}]*display:block[^}]*width:100%/.test(PHONE_CSS) || /\.s\{[^}]*width:100%[^}]*display:block/.test(PHONE_CSS), 'state chips as wide as the card');
check(/\.pk\{[^}]*width:100%/.test(PHONE_CSS), 'Keep / Remove buttons as wide as the card');
check(/\.pkw[^{]*\{[^}]*margin-top:auto/.test(PHONE_CSS) && PHONE_CSS.includes('>div:has(>.pk)'), 'Keep / Remove at the bottom of the card');

// Banner Catalog: .cat .im{flex:0 0 46%} (gacha.js) is a height in a column card: reset to auto
check(/\.cat>\.b \.im\{[^}]*flex:0 0 auto!important/.test(PHONE_CSS), 'card pictures not sized by the 46 % row rule');

// kept / current cards (.b.pinned, .b.now: padding-left 10px in gacha.js) keep the same inner width as the others
check(/\.cat>\.b\{[^}]*padding:6px 6px 8px!important/.test(PHONE_CSS) && /\.info\{[^}]*margin:0!important/.test(PHONE_CSS), 'same card padding for every state');
check(/\.cat>\.b\{[^}]*flex-direction:column;align-items:stretch!important/.test(PHONE_CSS), 'card parts stretch even on kept cards (a page rule centres them)');

// notice tables (banner notices: 8 columns, table-layout:fixed in the page) let long columns take the room (user 24-11)
check(PHONE_CSS.includes('table{table-layout:auto!important}') && /\.ntb th,\.ntb td\{[^}]*font-size:13px/.test(PHONE_CSS), 'tables sized by their content on phones');

// chips line up across a row (user 24-11): titles two lines high (clamped), dates two lines high, every card the same
// left border (state colour only where the page sets one), Keep / Remove text centred in the button
check(/\.nm\{[^}]*-webkit-line-clamp:2[^}]*height:2\.7em/.test(PHONE_CSS), 'titles: two lines, fixed height');
check(/\.d,[^{]*\.cat>\.b \.n\{[^}]*-webkit-line-clamp:2[^}]*;height:2\.8em/.test(PHONE_CSS), 'dates (and banner dates .n): exactly two lines high, clamped (the phone 110 %% font made two-line dates taller than a min-height)');

check(/border-left-width:4px!important/.test(PHONE_CSS) && PHONE_CSS.includes(':where(') , 'same left border on every card, colour from the page state');
check(/\.pk\{[^}]*display:flex[^}]*align-items:center[^}]*justify-content:center/.test(PHONE_CSS), 'button text centred');

// Banner Catalog cards without a price line (.n followed by the chip): the chip keeps the place of the missing line
check(PHONE_CSS.includes('.cat>.b .n+.s{margin-top:calc(14px*1.35 + 4px)}'), 'banner chip lines up when the price line is missing');

// chips and buttons: one compact size in every catalog (Avatar Board chips were 17 px with a tall line; «Remove from
// Avatar Boards» wrapped and made its button taller than «Keep in Avatar Boards», user 24-11)
check(/\.s\{[^}]*font-size:13px!important;line-height:1\.35!important/.test(PHONE_CSS), 'chips 13 px, compact line');
check(/\.pk\{[^}]*font-size:13px!important;line-height:1\.3/.test(PHONE_CSS), 'buttons 13 px');

// every card of a catalog the same size (user 24-11: a 3-line «Replaced by» chip made its row taller): equal rows in the
// card grids (not #camps: its headers are grid items), chips and «Replaces» lines at most two lines
check(PHONE_CSS.includes('#rows,#quests,.cat{grid-auto-rows:1fr}'), 'equal rows in the card grids');
check(/\.s,[^{]*\.rp\{[^}]*-webkit-line-clamp:2/.test(PHONE_CSS), 'chips and Replaces lines clamped to two lines');

// Medal Gallery (cards with a .mi picture, user 24-11): 4 columns, the Medal centred, the attribute line one line high,
// track name and Variants one line each (a long track name pushed the chips down)
check(PHONE_CSS.includes('#rows:has(>.row>.mi){grid-template-columns:repeat(4,minmax(0,1fr))}'), 'Medal Gallery in 4 columns');
check(/:has\(>\.mi\)>\.mi\{[^}]*align-self:center/.test(PHONE_CSS), 'Medal picture centred');
check(/\.tk,[^{]*\.vrt\{[^}]*white-space:nowrap[^}]*text-overflow:ellipsis/.test(PHONE_CSS), 'track and Variants on one line');

// Medal Gallery Full Art tab: each artwork header (.sec) is a full-width line above its Medals, rows not forced equal
check(PHONE_CSS.includes('#rows>.sec{grid-column:1/-1}') && PHONE_CSS.includes('#rows:has(>.sec){grid-auto-rows:auto}'), 'Full Art headers span the row');

// Medal Gallery detail (#det, user 24-11: too big, the info needed scrolling): picture on the left, the info on the right
check(/#dbody\{[^}]*display:grid[^}]*grid-template-columns:auto 1fr/.test(PHONE_CSS) && /#dbody>\.lg\{[^}]*grid-row:1\/span 20[^}]*width:150px!important/.test(PHONE_CSS) && PHONE_CSS.includes('#dbody>:not(.lg){grid-column:2'), 'Medal detail side by side');

// variants list of the Medal detail: name and chips vertically centred on one line (user 24-11)
check(/#det \.vl li\{[^}]*display:flex[^}]*align-items:center/.test(PHONE_CSS), 'variant chips centred on the name line');

// withPhone
const page = '<html><head><title>x</title></head><body>b</body></html>';
const once = withPhone(page);
check(once.includes(`${PHONE_CSS}</style></head>`), 'CSS inserted right before </head>');
check(once.split('data-phone').length === 2, 'inserted once');
check(withPhone(once) === once, 'idempotent');
check(withPhone('not found') === 'not found', 'no head: unchanged');
check(withPhone('<body>no head</body>') === '<body>no head</body>', 'body without head: unchanged');

// Task 2: every page sent as text/html goes through withPhone (404 «not found» helpers excepted)
for (const f of ['server.js', 'keyblade-evo.js']) {
  const lines = fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n');
  lines.forEach((l, i) => {
    if (!l.includes("'Content-Type': 'text/html") || l.includes("Buffer.from('not found'")) return;
    const ctx = lines.slice(Math.max(0, i - 3), i + 1).join('\n');
    check(/withPhone\(/.test(ctx), `${f}:${i + 1} sends a page without withPhone`);
  });
}

// Task 3: portrait rules (max-width) never fire on a phone in landscape
for (const f of fs.readdirSync(__dirname).filter((n) => n.endsWith('.js') && !n.startsWith('test') && n !== 'phone-css.js')) {
  const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
  for (const m of src.matchAll(/@media\s*\(max-width:\s*\d+px\)[^{\n]*\{/g)) {
    check(m[0].includes('min-height:481px'), `${f}: unguarded ${m[0]}`);
  }
}

if (errors.length) { console.log(errors.join('\n')); console.log(`${errors.length} errors`); process.exit(1); }
console.log('test-phone-css: ok');
