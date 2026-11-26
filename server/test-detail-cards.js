// Section cards of the catalog detail pages (server/detail-cards.js, user 26-11):   node server/test-detail-cards.js
'use strict';
const assert = require('assert');
const cards = require('./detail-cards');

// top-level <h2> parts become cards (icon by title, id by title), an <h2> inside a <div> / <details> stays where it is
const html = '<p>intro</p><h2>Week</h2><table class="kv"><tr><td>x</td></tr></table><h2>Raid Boards</h2><div class="ns"><h2>Inner</h2></div><p>b</p><hr>'
  + '<h2>Draw rates</h2><details><summary>s</summary><h2>Quest</h2></details>';
const out = cards.cardSections(html);
assert.ok(out.startsWith('<p>intro</p><details class="cs" id="sec-week" open><summary class="csh"><img class="ic" src="/web/special/icon/weekday.png" alt=""><h2>Week</h2><span class="chev">▸</span></summary><div class="csb"><table'));
assert.ok(out.includes('<details class="cs" id="sec-raid-boards" open><summary class="csh"><img class="ic" src="/web/special/icon/bdone.png" alt=""><h2>Raid Boards</h2><span class="chev">▸</span></summary><div class="csb"><div class="ns"><h2>Inner</h2></div><p>b</p></div></details>'),
  'a nested <h2> stays inside its card; the closing <hr> is dropped');
assert.ok(out.includes('<details class="cs" id="sec-draw-rates" open>') && out.includes('<details><summary>s</summary><h2>Quest</h2></details></div></details>'));
assert.strictEqual((out.match(/class="cs"/g) || []).length, 3);
assert.strictEqual(cards.cardSections('<p>no sections</p>'), '<p>no sections</p>');
// a badge in the header band, after the title (no colon after it)
assert.ok(cards.cardSections('<h2>Score thresholds</h2><p>x</p>', undefined, (t) => (t === 'Score thresholds' ? cards.NG : ''))
  .includes(`<h2>Score thresholds</h2><span class="ng">NOT ORIGINAL</span>${cards.CHEV}</summary>`));
// colour roles
assert.strictEqual(cards.yes('Taken'), `<span class="yes">Taken${cards.CROWN}</span>`);
assert.strictEqual(cards.mu('Not yet'), '<span class="mu">Not yet</span>');
for (const c of ['.v{color:#ffcd4a', '.rd{color:#00d4ed', '.yes{color:#6fd47f', '.mu{color:#8fa9ba', '.tn{color:#fff', '.csb table.kg4 td:nth-child(4){color:#ffcd4a']) assert.ok(cards.CARD_CSS.includes(c), c);
// the boards table of every detail page (boardTable, user 26-11): card or neutral box, name, extra columns, nodes, coins still needed
const bt = cards.boardTable([{ id: 1, name: 'A', img: '/x/1.png', served: true, nodes: 10, unlocked: 3, coinsLeft: 700, coinsTotal: 1000, extra: ['r1'] },
  { id: 2, name: 'B', img: null, served: true, nodes: 5, unlocked: 5, coinsLeft: 0, coinsTotal: 50, extra: ['<td class="r">x</td>'] },
  { id: 3, name: 'C', served: false, why: 'held', extra: ['r3'] }, { id: 4, name: 'D', served: true, extra: ['r4'] }], { currency: 'Raid Coins', extraHeads: ['Rewards'], cls: 'rbt' });
assert.ok(bt.includes('<table class="tt bdt rbt"><tr><th></th><th>Board</th><th>Rewards</th><th>Nodes unlocked</th><th>Raid Coins still needed</th></tr>'));
assert.ok(bt.includes('<td class="bc"><img width="64" height="64" src="/x/1.png" loading="lazy" alt="" onerror="kxNb(this)"></td><td><span class="tn">A</span></td><td>r1</td><td class="nw"><b class="v">3</b> / 10</td><td><span class="cc">700 Raid Coins</span><small>of 1,000</small></td>'));
assert.ok(bt.includes('<tr class="got"><td class="bc"><span class="nb"></span></td><td><span class="tn">B</span></td><td class="r">x</td>') && bt.includes(`<span class="yes">Completed${cards.CROWN}</span>`));
assert.ok(bt.includes('<td class="r">Not served yet<small>held</small></td>') && bt.includes('<td>r4</td><td>—</td><td>—</td>'), 'not served; no node data');
assert.ok(bt.includes('function kxNb('), 'the placeholder script');
// img and why are escaped (a future caller cannot inject)
const bx = cards.boardTable([{ id: 9, name: 'X', img: '/a"onerror="x', served: true, nodes: 1, unlocked: 0, coinsLeft: 1, coinsTotal: 1 }, { id: 8, name: 'Y', served: false, why: '<b>x</b>' }]);
assert.ok(bx.includes('src="/a&quot;onerror=&quot;x"') && !bx.includes('<b>x</b>') && bx.includes('<small>&lt;b&gt;x&lt;/b&gt;</small>'), 'escaped img / why');
// a quest block of the Special details
const qb = cards.questBlock('Q', [['AP', '<span class="v">5</span>']], [['done', 'Objectives', '<table></table>'], ['medal', 'Drops', '<p>x</p>', cards.NG]]);
assert.ok(qb.startsWith('<div class="qb"><h3 class="qh">Q</h3><div class="qs"><span class="st"><small>AP</small><b><span class="v">5</span></b></span></div><div class="qt"><h4>'));
assert.ok(qb.includes('Drops<span class="ng">NOT ORIGINAL</span></h4><p>x</p>'));
// a stat with an icon is a line of its own (Target / Where of the Special details)
assert.ok(cards.questBlock('Q', [['AP', '5'], ['Where', 'Agrabah', 'camp']], []).includes('<div class="ql"><small><img class="ic" src="/web/special/icon/camp.png" alt="">Where</small><b>Agrabah</b></div>'));
// every section card is collapsible: a <details> open by default whose header band is the <summary> with a turning chevron
assert.ok(cards.section('k', 'medal', 'T', 'b', cards.NG) === '<details class="cs" id="sec-k" open><summary class="csh"><img class="ic" src="/web/special/icon/medal.png" alt=""><h2>T</h2>' + cards.NG + cards.CHEV + '</summary><div class="csb">b</div></details>');
assert.ok(/details\.cs>summary\.csh\{[^}]*cursor:pointer[^}]*min-height:30px/.test(cards.CARD_CSS) && /details\.cs\[open\]>summary \.chev\{transform:rotate\(90deg\)\}/.test(cards.CARD_CSS), 'tap target and turning chevron');
assert.ok(cards.KEEP_BTN_CSS.startsWith('.pk{display:inline-block;margin-top:6px;border:2px solid #ffe08a') && cards.KEEP_LABEL_ICON.includes('icon/pin.png'));
console.log('test-detail-cards: ok');
