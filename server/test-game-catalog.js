// Game Catalog (user 26-11): the banner row of make-game-catalog.js, the Events tab order with it (events-tab-order.js), the hub page
// and the hub BACK bar (game-catalog-pages.js), then the server.js wiring on a scratch copy of the local master_data with the banner
// row added (hard links, the real master is never written): one catalogue banner, first in Events, none in Special, the hub page
// with its cards and links, the BACK bars of the catalogue pages, the banner picture route.
//   node server/test-game-catalog.js
'use strict';
const assert = require('assert');
const fs = require('fs'); const os = require('os'); const path = require('path');
const makeGameCatalog = require('./make-game-catalog');
const { eventsTabOrder } = require('./events-tab-order');
const pages = require('./game-catalog-pages');

let failed = 0;
const run = (name, fn) => { try { fn(); console.log(`ok ${name}`); } catch (e) { failed++; console.error(`FAIL ${name}: ${e.stack}`); } };

// ---- generator ----
run('banner_row', () => {
  assert.strictEqual(makeGameCatalog.bannerRow([{ stageId: 1 }]), null, 'no row without the Training Grounds stage');
  const r = makeGameCatalog.bannerRow([{ stageId: 970000 }]);
  assert.deepStrictEqual([r.eventStageId, r.eventType, r.eventCategory, r.validStageId, r.stageId, r.detailUrl, r.bannerUrl],
    [5000, 0, 2, 1, [970000], '/web/catalog', makeGameCatalog.bannerPath()]);
  assert.strictEqual(r.endTime, '2030-12-31 23:59:59');
});
run('banner_patch', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-test-game-catalog-'));
  try {
    fs.writeFileSync(path.join(dir, 'stage.json'), JSON.stringify([{ stageId: 970000 }]));
    fs.writeFileSync(path.join(dir, 'evStage.json'), JSON.stringify([{ eventStageId: 6000 }, { eventStageId: 5000, old: 1 }]));
    const log = console.log; console.log = () => {};
    try { makeGameCatalog.patch(dir); makeGameCatalog.patch(dir); } finally { console.log = log; }
    const ev = JSON.parse(fs.readFileSync(path.join(dir, 'evStage.json'), 'utf8'));
    assert.deepStrictEqual(ev.map((r) => r.eventStageId), [6000, 5000], 'one row, the others kept, re-runnable');
    assert.ok(!ev[1].old && ev[1].detailUrl === '/web/catalog');
    // without the Training Grounds: our row dropped, nothing added
    fs.writeFileSync(path.join(dir, 'stage.json'), '[]');
    const warn = console.warn; console.warn = () => {};
    try { assert.strictEqual(makeGameCatalog.patch(dir), null); } finally { console.warn = warn; }
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'evStage.json'), 'utf8')).map((r) => r.eventStageId), [6000]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ---- Events tab order ----
const card = (id, eventType, kept = false) => ({ eventStageId: id, eventType, bannerUrl: `/x/${id}${kept ? '-kept' : ''}.png` });
run('tab_order_with_game_catalog', () => {
  const raids = [card(8000, 0), card(8101, 2, true), card(8102, 2)], evCat = [card(20000, 0)], events = [card(20101, 1, true), card(20102, 1)], coli = [card(6000, 0)];
  const ids = (l) => l.map((c) => c.eventStageId);
  assert.deepStrictEqual(ids(eventsTabOrder(raids, evCat, events, coli, [card(5000, 0)])), [5000, 8101, 20101, 8102, 20102], 'the hub banner only, first');
  assert.deepStrictEqual(ids(eventsTabOrder(raids, evCat, events, coli, [])), [6000, 8000, 20000, 8101, 20101, 8102, 20102], 'older master: the three banners');
  assert.deepStrictEqual(ids(eventsTabOrder(raids, evCat, events, coli)), [6000, 8000, 20000, 8101, 20101, 8102, 20102]);
});

// ---- hub page ----
const CARDS = pages.KEYS.map((key, i) => ({ key, title: `${key} Catalog`, href: `/web/${key}/catalog`, img: `/web/${key}/img/${i}.png`, line: `All of ${key}.`,
  count: `${i + 1} things`, kept: key === 'raid' ? 'Darkside · Tier 3' : null, keptNone: `No ${key} kept`,
  wallet: key === 'special' ? null : { ic: 'raid', label: `${key} Coins`, value: 1200 + i }, note: key === 'colosseum' ? 'The Coliseum opens at Story Quest 130' : null }));
run('hub_page_cards', () => {
  const html = pages.hubPage([...CARDS].reverse());
  assert.ok(html.includes('<title>Game Catalog</title>') && html.includes('<h1><img class="ic" src="/web/special/icon/done.png" alt=""><span>Game Catalog</span><span class="ng">NOT ORIGINAL</span></h1>'), 'title and header');
  // the header of the catalogue pages (detail-cards.js catalogHead, user 26-11): gold title with its icon, NOT ORIGINAL badge, intro lines
  assert.ok(html.includes('<div class="hdr chd"><h1><img class="ic" src="/web/special/icon/done.png" alt=""><span>Game Catalog</span><span class="ng">NOT ORIGINAL</span></h1></div>'), 'header');
  assert.ok(/<details class="cs" id="sec-about" open><summary class="csh"><img class="ic" src="\/web\/special\/icon\/mog.png" alt=""><h2>How it works<\/h2>/.test(html)
    && html.includes('<div class="ab"><img class="ic" src="/web/special/icon/done.png" alt=""><span><span class="v">Every catalog</span> of this server in <span class="rd">one place</span>')
    && html.includes('<span class="v">Keep one past item</span>') && html.includes('The <span class="v">Banner Catalog</span> is in the Shop.'), '«How it works» card, one line per point with its icon');
  assert.ok(!/addition of this server/.test(html), 'the badge in place of the sentence');
  assert.deepStrictEqual([...html.matchAll(/<div class="row[^"]*" id="c-([a-z]+)" data-href="([^"]+)">/g)].map((m) => [m[1], m[2]]),
    pages.KEYS.map((k) => [k, `/web/${k}/catalog`]), 'one card per catalogue, in the fixed order, the row opens the catalogue');
  for (const [i, k] of pages.KEYS.entries()) {
    const row = html.slice(html.indexOf(`id="c-${k}"`)).split('<a class="go"')[0];
    assert.ok(row.includes(`<a class="im" href="/web/${k}/catalog"><img width="320" height="70" src="/web/${k}/img/${i}.png"`), `${k}: banner picture link`);
    assert.ok(row.includes(`<a class="nm" href="/web/${k}/catalog">${k} Catalog</a>`) && row.includes(`<div class="d">All of ${k}.</div>`), `${k}: name and line`);
    assert.ok(row.includes(`<div class="ct">${i + 1} things</div>`), `${k}: count`);
    assert.ok(k === 'raid' ? row.includes('Kept: Darkside · Tier 3</div>') : row.includes(`<div class="pg no">No ${k} kept</div>`), `${k}: kept line`);
    assert.strictEqual(row.includes(`${k} Coins</small><b>${(1200 + i).toLocaleString('en-US')}</b>`), k !== 'special', `${k}: coin chip`);
  }
  assert.ok(html.includes('<div class="lk"><img class="ic" src="/web/special/icon/lock.png" alt="">The Coliseum opens at Story Quest 130</div>'), 'note line');
  assert.ok(html.includes('class="row pinned" id="c-raid"'), 'a kept item colours its card');
  assert.ok(!html.includes('class="back"'), 'the hub has no BACK bar of its own (the game\'s BACK closes it)');
  assert.ok(html.includes('<div id="rows">'), 'the #rows grid of the phone layout');
  assert.ok(pages.hubPage([]).includes('No catalogue is served yet.'));
});
// the coin chip with the game's own coin icon (user 26-11): img wins over an icon key, no icon without either
run('wallet_chip_coin_icon', () => {
  const { walletChip } = require('./catalog-pages');
  assert.strictEqual(walletChip({ img: '/web/coin/v7/raid.png', label: 'Raid Coins', value: 5 }),
    '<span class="wal"><small><img class="ic" src="/web/coin/v7/raid.png" alt="">Raid Coins</small><b>5</b></span>');
  assert.strictEqual(walletChip({ img: null, label: 'Raid Coins', value: 5 }), '<span class="wal"><small>Raid Coins</small><b>5</b></span>', 'no substitute icon');
  assert.ok(walletChip({ ic: 'raid', label: 'R', value: 1 }).includes('/web/special/icon/raid.png'), 'an icon key still works');
});
// «Kept now» (user 26-11): one compact line per kept item with its card, name, catalogue, detail link and the catalogue's own Remove
run('hub_kept_section', () => {
  const kept = [{ kind: 'raid', catalog: 'Raid Catalog', name: 'Darkside · Tier 3', img: '/web/raid/img/v1/8100.png', href: '/web/raid/raid/8100?from=catalog',
    remove: '/web/raid/unkeep', where: 'Events' }, { kind: 'special', catalog: 'Special Catalog', name: 'Quest <1>', img: '/web/special/img/v10/7060.png',
    href: '/web/special/quest/7060?from=catalog', remove: '/web/special/unpin', where: 'Special' }];
  const html = pages.hubPage(CARDS, kept);
  assert.ok(html.indexOf('id="sec-kept"') > 0 && html.indexOf('id="sec-kept"') < html.indexOf('<div id="rows">'), 'the section above the catalogues');
  assert.ok(html.includes('<h2>Kept now</h2><span class="kcount">2</span>'), 'its title and count');
  assert.ok(html.includes('<div class="kr" id="k-raid"><a class="ki" href="/web/raid/raid/8100?from=catalog"><img src="/web/raid/img/v1/8100.png" alt=""></a>'
    + '<div class="kt"><a class="kn" href="/web/raid/raid/8100?from=catalog">Darkside · Tier 3</a><span class="kc">Raid Catalog</span></div>'
    + '<a href="#" class="pk" data-on="0" data-pin="/web/raid/unkeep" data-where="Events" onclick="return kxRm(this)"><img class="ic" src="/web/special/icon/pin') && html.includes('.png" alt="">Remove from Events</a></div>'), 'a raid row');
  assert.ok(html.includes('>Quest &lt;1&gt;</a><span class="kc">Special Catalog</span>') && html.includes('data-pin="/web/special/unpin"') && html.includes('Remove from Special'), 'a Special row, escaped');
  assert.ok(html.includes('function kxRm(el)') && html.includes('location.reload()') && html.includes('<div id="pinmsg" class="pinmsg"></div>'), 'Remove posts, says so, reloads the hub');
  const empty = pages.hubPage(CARDS, []);
  assert.ok(empty.includes(`<p class="mu">${pages.KEPT_NONE}</p>`) && pages.KEPT_NONE === 'Nothing kept: pick a past item in a catalog to keep it' && !empty.includes('class="kcount"'), 'empty state');
});
// the shared header of the catalogue pages (detail-cards.js catalogHead, user 26-11): icon + gold title + NOT ORIGINAL badge, the side
// (coins, Filters) on the right, the intro as short lines with the colour roles; every catalogue list page uses it
run('catalog_head_helper', () => {
  const dc = require('./detail-cards');
  const h = dc.catalogHead({ title: 'X & Y', ic: 'raid', side: '<b>S</b>', lines: [['pin', `a ${dc.val('keep')} b ${dc.cyan('3 weeks')}`], 'c'] });
  assert.strictEqual(h, '<div class="hdr chd"><h1><img class="ic" src="/web/special/icon/raid.png" alt=""><span>X &amp; Y</span><span class="ng">NOT ORIGINAL</span></h1><b>S</b></div>'
    + dc.section('about', 'mog', 'How it works', '<div class="ab"><img class="ic" src="/web/special/icon/pin.png" alt=""><span>a <span class="v">keep</span> b <span class="rd">3 weeks</span></span></div>'
    + '<div class="ab"><span>c</span></div>'));
  assert.ok(dc.catalogHead({ title: 'T', ic: 'mog', lines: ['x'], about: 'later' }).includes('<img class="ic" src="/web/special/icon/later.png" alt=""><h2>How it works</h2>'), 'header icon of its own');
  assert.ok(!dc.catalogHead({ title: 'T', badge: false }).includes('NOT ORIGINAL') && !dc.catalogHead({ title: 'T' }).includes('sec-about'));
  assert.ok(/\.chd h1\{/.test(dc.HEAD_CSS) && /\.ab\{/.test(dc.HEAD_CSS) && dc.HEAD_CSS.includes('#sec-about') && dc.HEAD_CSS.includes('(max-height:480px) and (max-width:900px)'), 'its CSS, compact on phones');
  assert.ok(require('./catalog-pages').PAGE_HEAD('T', '').includes(dc.HEAD_CSS), 'loaded by the catalogue pages');
});
// large screens (user 26-11: no scrolling at 1280x720): the five catalogues as a grid of cards, the kept items one per line (Remove on the right)
run('hub_large_grid', () => {
  const html = pages.hubPage(CARDS, [{ kind: 'raid', catalog: 'Raid Catalog', name: 'R', img: '/i.png', href: '/h', remove: '/web/raid/unkeep', where: 'Events' }]);
  assert.ok(html.includes('@media not all and (max-height:480px) and (max-width:900px){#rows{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))'), 'card grid off the phone');
  assert.ok(html.includes('#rows>.row{display:flex;flex-direction:column') && html.includes('#rows>.row .go{display:none}'), 'cards, not rows');
  assert.ok(html.includes('<div class="kl"><div class="kr" id="k-raid">') && html.includes('.kl{display:grid;grid-template-columns:1fr}') && html.includes('.kr .pk{flex:0 0 auto;margin:0 0 0 auto;'), 'kept items one per line, Remove on the right');
});
run('hub_page_phone', () => {
  const html = require('./phone-css').withPhone(pages.hubPage(CARDS));
  assert.ok(html.includes('<style data-phone>') && html.includes('#rows>.row'), 'the phone card grid applies');
});
run('hub_back_bar', () => {
  const plain = '<!doctype html><html><head><style>x</style></head><body><h1>Raid Catalog</h1></body></html>';
  const out = pages.withHubBack(plain);
  assert.ok(out.includes('<body class="hb">') && out.includes('<div class="bar"><a class="back" href="/web/catalog">BACK<span></span></a></div></body>'), out);
  assert.ok(out.includes(`<style>${pages.BAR_CSS}</style></head>`) && pages.BAR_CSS.startsWith('.bar{') && pages.BAR_CSS.endsWith('body.hb{padding-bottom:90px}'), 'the bar look');
  assert.ok(pages.withHubBack('<html><head></head><body class="x"><p></p></body></html>').includes('<body class="x hb">'), 'body class kept');
  const own = '<html><head></head><body class="hb"><div class="bar"><a class="back" href="/web/special/catalog">BACK<span></span></a></div></body></html>';
  assert.strictEqual(pages.withHubBack(own), own, 'a page with its own BACK bar is unchanged');
});

// ---- server.js wiring on a scratch master with the banner row ----
function wiring() {
  const REAL = process.env.KHUX_MASTER_DIR || path.join(__dirname, 'master_data');
  let stage = [];
  try { stage = JSON.parse(fs.readFileSync(path.join(REAL, 'stage.json'), 'utf8')); } catch { /* none */ }
  if (!stage.some((r) => r.stageId === 970000) || !fs.existsSync(path.join(__dirname, 'game_data', 'special.json'))) { console.log('wiring: skipped (no Training Grounds in master_data / no game_data)'); return; }
  // the scratch master next to the real one (same volume: hard links, nothing copied), evStage.json written with the banner row
  const master = fs.mkdtempSync(path.join(path.dirname(REAL), '.khux-test-game-catalog-'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'khux-test-game-catalog-'));
  const cleanup = () => { fs.rmSync(master, { recursive: true, force: true }); fs.rmSync(tmp, { recursive: true, force: true }); };
  process.on('exit', cleanup);
  for (const f of fs.readdirSync(REAL)) {
    const src = path.join(REAL, f);
    if (!fs.statSync(src).isFile() || f === 'evStage.json') continue;
    try { fs.linkSync(src, path.join(master, f)); } catch { fs.copyFileSync(src, path.join(master, f)); }
  }
  const ev = JSON.parse(fs.readFileSync(path.join(REAL, 'evStage.json'), 'utf8')).filter((r) => r.eventStageId !== 5000);
  fs.writeFileSync(path.join(master, 'evStage.json'), JSON.stringify([...ev, makeGameCatalog.bannerRow(stage)]));
  process.env.KHUX_MASTER_DIR = master;
  process.env.KHUX_SAVE = path.join(tmp, 'save.json');
  process.env.KHUX_CATALOG_IMG = path.join(tmp, 'catalog_img');
  fs.mkdirSync(process.env.KHUX_CATALOG_IMG);
  // the coin icons of make_coin_icons.py (game_data/coin_icons): three of the four coins, version 7
  process.env.KHUX_COIN_ICONS = path.join(tmp, 'coin_icons');
  fs.mkdirSync(process.env.KHUX_COIN_ICONS);
  for (const k of ['coliseum', 'raid', 'event']) fs.writeFileSync(path.join(process.env.KHUX_COIN_ICONS, `${k}.png`), `png ${k}`);
  fs.writeFileSync(path.join(process.env.KHUX_COIN_ICONS, 'icons.json'), JSON.stringify({ version: 7, keys: ['coliseum', 'raid', 'event'] }));
  delete process.env.KHUX_REAL_NOW;
  delete process.env.KHUX_SERVER_TIME;
  const log = console.log, warn = console.warn;
  const quiet = (fn) => { console.log = () => {}; console.warn = () => {}; try { return fn(); } finally { console.log = log; console.warn = warn; } };
  const { _test: t } = quiet(() => require('./server'));
  const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };
  const web = (fn, url) => { const o = { code: 0, body: '', type: '' }; quiet(() => fn({ writeHead(c, h) { o.code = c; o.type = (h || {})['Content-Type']; }, end(x) { o.body = x; } }, url)); return o; };
  const p = t.player;
  call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
  // story quest 300 cleared: the Special tab and the Coliseum are open
  const q = t.masterRows('stage').find((r) => r.stageKind === 1 && r.id === 300);
  p.stageScores = { ...(p.stageScores || {}), [q.stageId]: 1 };
  const avatarId = (t.eventIndex() || {}).avatarCatalog?.evStageId;
  const special = t.specialIndex().catalog?.evStageId;

  run('wiring_events_tab', () => {
    assert.strictEqual(t.gameCatalogOn(), true);
    const tab = call(t.respondStageEvent, { eventCategory: 2 }).events;
    assert.strictEqual(tab[0].eventStageId, 5000, 'the Game Catalog banner first');
    assert.deepStrictEqual([tab[0].eventType, tab[0].stages.map((s) => s.stageId), tab[0].bannerUrl.endsWith(makeGameCatalog.bannerPath())], [0, [970000], true]);
    assert.deepStrictEqual(tab.filter((c) => c.eventType === 0).map((c) => c.eventStageId), [5000], 'the only catalogue banner of the Events tab');
    for (const id of [6000, 8000, 20000]) assert.ok(!tab.some((c) => c.eventStageId === id), `banner ${id} no longer listed`);
    assert.deepStrictEqual(t.eventsTabNow().map((c) => c.eventStageId), tab.map((c) => c.eventStageId), 'home banners / Progress see the same list');
  });
  run('wiring_special_tab', () => {
    const tab = call(t.respondStageEvent, { eventCategory: 1 }).events;
    assert.ok(tab.length > 0, 'the Special tab lists its quests');
    assert.ok(!tab.some((c) => c.eventStageId === special), 'no Special Catalog banner');
    if (avatarId) assert.ok(!tab.some((c) => c.eventStageId === avatarId), 'no Avatar Board Catalog banner');
    assert.ok(!tab.some((c) => c.stages.some((s) => s.stageId === 970000)), 'the Training Grounds only in the Events tab');
  });
  run('wiring_hub_page', () => {
    assert.strictEqual(t.route('/web/catalog'), 'catalogweb');
    assert.strictEqual(t.route('/web/catalog/img/v1/5000.png'), 'catalogweb');
    assert.strictEqual(t.route('/web/gacha/catalog'), 'gachaweb', 'the Banner Catalog unchanged');
    p.colosseum = { ...(p.colosseum || {}), kept: 800 };
    const o = web(t.respondGameCatalogWeb, '/web/catalog');
    assert.strictEqual(o.code, 200);
    const html = o.body.toString('utf8');
    assert.ok(html.includes('<h1><img class="ic" src="/web/special/icon/done.png" alt=""><span>Game Catalog</span><span class="ng">NOT ORIGINAL</span></h1>') && html.includes('<style data-phone>'));
    const keys = [...html.matchAll(/id="c-([a-z]+)"/g)].map((m) => m[1]);
    assert.deepStrictEqual(keys, ['colosseum', 'raid', 'event', ...(avatarId ? ['avatar'] : []), 'special']);
    assert.ok(/id="c-colosseum"[^]*?<div class="ct">\d+ seasons<\/div><div class="pg"><img[^>]*>Kept: Coliseum · April 2016<\/div>[^]*?<small>(<img[^>]*>)?<span class="wt"><span class="wp">Coliseum Coins<\/span> · <span class="wp">Apr 2016<\/span><\/span><\/small>/.test(html), 'Coliseum card: seasons, kept season, its coins');
    assert.ok(/id="c-raid"[^]*?<div class="ct">[\d,]+ raids[^<]*<\/div><div class="pg no">No raid kept<\/div>[^]*?<small>(<img[^>]*>)?Raid Coins<\/small>/.test(html), 'Raid card');
    assert.ok(/id="c-event"[^]*?<div class="ct">[\d,]+ events<\/div>[^]*?<small>(<img[^>]*>)?Event Coins<\/small>/.test(html), 'Event card');
    if (avatarId) assert.ok(/id="c-avatar"[^]*?<div class="ct">[\d,]+ entries · [\d,]+ boards<\/div>[^]*?<small>(<img[^>]*>)?Avatar Coins<\/small>/.test(html), 'Avatar Board card');
    assert.ok(/id="c-special"[^]*?<div class="ct">[\d,]+ quests · [\d,]+ campaigns<\/div><div class="pg no">No quest kept<\/div><\/div>/.test(html), 'Special card (no coins)');
    assert.ok(html.includes(`src="/web/special/img/v`) && html.includes(`/${special}.png"`), 'the Special Catalog banner picture');
    // the Special count is the catalogue's own summary line
    const sp = web(t.respondSpecialWeb, '/web/special/catalog').body.toString('utf8');
    const sum = /<span class="n1">([\d,]+ quests?)<\/span> · ([\d,]+ campaigns?)/.exec(sp);
    assert.ok(sum && html.includes(`<div class="ct">${sum[1]} · ${sum[2]}</div>`), `Special counts match the catalogue ${sum && sum.slice(1)}`);
    p.colosseum.kept = null;
  });
  run('wiring_catalog_back_bars', () => {
    const pagesOf = [[t.respondColosseumWeb, '/web/colosseum/catalog'], [t.respondRaidWeb, '/web/raid/catalog'], [t.respondEventWeb, '/web/event/catalog'],
      [t.respondSpecialWeb, '/web/special/catalog'], ...(avatarId ? [[t.respondAvatarWeb, '/web/avatar/catalog']] : [])];
    for (const [fn, url] of pagesOf) {
      const html = web(fn, url).body.toString('utf8');
      assert.ok(html.includes('<a class="back" href="/web/catalog">BACK'), `${url}: BACK to the hub`);
      assert.strictEqual(html.split('class="back"').length, 2, `${url}: one BACK bar`);
      assert.ok(/<body class="[^"]*\bhb\b/.test(html), `${url}: room for the bar`);
    }
    if (avatarId) {
      const html = web(t.respondAvatarWeb, '/web/avatar/catalog?from=special').body.toString('utf8');
      assert.ok(html.includes('<a class="back" href="/web/special/catalog">BACK') && !html.includes('href="/web/catalog"'), 'from=special keeps its own BACK');
    }
    // a detail page's BACK still goes to its catalogue (which then leads to the hub)
    const raidRow = (t.raidIndex().entries || [])[0];
    if (raidRow) assert.ok(web(t.respondRaidWeb, `/web/raid/raid/${raidRow.evStageId}?from=catalog`).body.toString('utf8').includes('href="/web/raid/catalog#q'), 'detail BACK unchanged');
  });
  run('wiring_coin_icons', () => {
    assert.strictEqual(t.route('/web/coin/v7/raid.png'), 'coinweb');
    const html = web(t.respondGameCatalogWeb, '/web/catalog').body.toString('utf8');
    for (const k of ['coliseum', 'raid', 'event']) assert.ok(html.includes(`<span class="wal"`) && html.includes(`<img class="ic" src="/web/coin/v7/${k}.png" alt="">`), `${k}: the game's coin icon on the hub`);
    if (avatarId) assert.ok(/id="c-avatar"[^]*?<span class="wal"><small>Avatar Coins<\/small>/.test(html), 'Avatar Coins without its icon file: no icon, no substitute');
    assert.ok(!/class="wal"[^>]*><small><img class="ic" src="\/web\/special\/icon/.test(html), 'no drawn / substitute icon in a coin chip');
    const raidPage = web(t.respondRaidWeb, '/web/raid/catalog').body.toString('utf8');
    assert.ok(raidPage.includes('<span class="wal"><small><img class="ic" src="/web/coin/v7/raid.png" alt="">Raid Coins</small>'), 'the Raid Catalog header chip');
    assert.ok(web(t.respondEventWeb, '/web/event/catalog').body.toString('utf8').includes('<small><img class="ic" src="/web/coin/v7/event.png" alt="">Event Coins</small>'), 'the Event Catalog header chip');
    const icon = web(t.respondCoinIcon, '/web/coin/v7/raid.png');
    assert.deepStrictEqual([icon.code, icon.type, icon.body.toString()], [200, 'image/png', 'png raid']);
    for (const u of ['/web/coin/v7/avatar.png', '/web/coin/v7/icons.png', '/web/coin/v7/..%2Fraid.png', '/web/coin/raid.png']) assert.strictEqual(web(t.respondCoinIcon, u).code, 404, u);
  });
  // «Kept now» on the real catalogues: keep one item in each (the first past one each catalogue accepts), every row with its card,
  // detail page and Remove request; a Remove through that request empties its row
  run('wiring_kept_section', () => {
    const post = (fn, url) => { const o = { code: 0 }; quiet(() => fn({ writeHead(c) { o.code = c; }, end() {} }, url)); return o.code; };
    const keepFirst = (fn, urlOf, ids) => ids.find((id) => post(fn, urlOf(id)) === 200);
    const hub = () => web(t.respondGameCatalogWeb, '/web/catalog').body.toString('utf8');
    // nothing kept: the muted line
    p.colosseum = { ...(p.colosseum || {}), kept: null };
    for (const [fn, u] of [[t.respondRaidPost, '/web/raid/unkeep'], [t.respondEventPost, '/web/event/unkeep'], [t.respondAvatarPost, '/web/avatar/unkeep'],
      [t.respondSpecialPost, '/web/special/unpin'], [t.respondGachaPost, '/web/gacha/unpin']]) post(fn, u);
    assert.ok(hub().includes(`<p class="mu">${pages.KEPT_NONE}</p>`), 'empty state');
    p.colosseum.kept = 800;
    // a Story far enough (quest 900, 2020) that past events and Special quests can be kept
    const q900 = t.masterRows('stage').find((r) => r.stageKind === 1 && r.id === 900);
    p.stageScores[q900.stageId] = 1;
    const raidId = keepFirst(t.respondRaidPost, (id) => `/web/raid/keep/${id}`, [...new Set((t.raidIndex().entries || []).map((e) => e.evStageId))].slice(0, 300));
    const evId = keepFirst(t.respondEventPost, (id) => `/web/event/keep/${id}`, [...new Set((t.eventIndex().entries || []).map((e) => e.evStageId))].slice(0, 600));
    const spId = keepFirst(t.respondSpecialPost, (id) => `/web/special/pin/${id}`, t.specialIndex().entries.map((e) => e.evStageId).slice(0, 300));
    const shopId = keepFirst(t.respondGachaPost, (id) => `/web/gacha/pin/${id}`, t.gachaCatalog().banners.map((b) => b.drawMedalTypeId).slice(0, 300));
    const html = hub();
    const row = (kind) => (new RegExp(`<div class="kr" id="k-${kind}">[^]*?</div></div>`).exec(html) || [''])[0];
    assert.ok(row('colosseum').includes('href="/web/colosseum/season/800?from=catalog"') && row('colosseum').includes('Coliseum · April 2016')
      && row('colosseum').includes('data-pin="/web/colosseum/unkeep"') && row('colosseum').includes('>Remove from the Coliseum</a>'), `Coliseum row ${row('colosseum')}`);
    if (raidId) assert.ok(row('raid').includes(`href="/web/raid/raid/${raidId}?from=catalog"`) && row('raid').includes(`/web/raid/img/v`) && row('raid').includes('data-pin="/web/raid/unkeep"'), 'raid row');
    if (evId) assert.ok(row('event').includes(`href="/web/event/event/${evId}?from=catalog"`) && row('event').includes('data-pin="/web/event/unkeep"'), 'event row');
    if (spId) assert.ok(row('special').includes(`href="/web/special/quest/${spId}?from=catalog"`) && row('special').includes('data-pin="/web/special/unpin"'), 'special row');
    // a banner kept in the Shop (Banner Catalog) is never listed: only the five hub catalogues (user 26-11)
    assert.ok(shopId && !html.includes('id="k-shop"') && !html.includes('/web/gacha/unpin') && !/<span class="kc">Banner Catalog<\/span>/.test(html), `kept Shop banner ${shopId} not in the hub section`);
    assert.ok(raidId && evId && spId && shopId, `something kept in each: raid ${raidId} event ${evId} special ${spId} shop ${shopId}`);
    const n = [...html.matchAll(/<div class="kr" id="k-/g)].length;
    assert.ok(html.includes(`<h2>Kept now</h2><span class="kcount">${n}</span>`) && n >= 4, `count ${n}`);
    // Remove: the catalogue's own request, then the hub no longer lists it
    assert.strictEqual(post(t.respondColosseumPost, '/web/colosseum/unkeep'), 200);
    assert.strictEqual(post(t.respondRaidPost, '/web/raid/unkeep'), 200);
    const after = hub();
    assert.ok(!after.includes('id="k-colosseum"') && !after.includes('id="k-raid"') && after.includes('id="k-event"'), 'removed rows gone, the others stay');
    for (const [fn, u] of [[t.respondEventPost, '/web/event/unkeep'], [t.respondSpecialPost, '/web/special/unpin'], [t.respondGachaPost, '/web/gacha/unpin']]) post(fn, u);
  });
  run('wiring_banner_image', () => {
    assert.strictEqual(web(t.respondGameCatalogWeb, '/web/catalog/img/v1/5000.png').code, 404, 'no picture yet: 404');
    fs.writeFileSync(path.join(process.env.KHUX_CATALOG_IMG, '5000.png'), 'banner');
    const o = web(t.respondGameCatalogWeb, '/web/catalog/img/v1/5000.png');
    assert.deepStrictEqual([o.code, o.type, o.body.toString()], [200, 'image/png', 'banner']);
    assert.strictEqual(web(t.respondGameCatalogWeb, '/web/catalog/img/v1/..%2Fx.png').code, 404);
    assert.strictEqual(web(t.respondGameCatalogWeb, '/web/catalog/other').code, 404);
  });
}
wiring();

if (failed) { console.error(`${failed} test(s) failed`); process.exit(1); }
console.log('all Game Catalog tests passed');
