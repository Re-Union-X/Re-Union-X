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
check(PHONE_CSS.includes('#rows>.row .im.bc,') && /\.im\.bc img[^{]*\{[^}]*width:64px!important/.test(PHONE_CSS), 'board tiles of the Avatar Board Catalog stay 64 px');

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
