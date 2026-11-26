// Section cards of the catalog detail pages (server/detail-cards.js, user 26-11):   node server/test-detail-cards.js
'use strict';
const assert = require('assert');
const cards = require('./detail-cards');

// top-level <h2> parts become cards (icon by title, id by title), an <h2> inside a <div> / <details> stays where it is
const html = '<p>intro</p><h2>Week</h2><table class="kv"><tr><td>x</td></tr></table><h2>Raid Boards</h2><div class="ns"><h2>Inner</h2></div><p>b</p><hr>'
  + '<h2>Draw rates</h2><details><summary>s</summary><h2>Quest</h2></details>';
const out = cards.cardSections(html);
assert.ok(out.startsWith('<p>intro</p><div class="cs" id="sec-week"><div class="csh"><img class="ic" src="/web/special/icon/weekday.png" alt=""><h2>Week</h2></div><div class="csb"><table'));
assert.ok(out.includes('<div class="cs" id="sec-raid-boards"><div class="csh"><img class="ic" src="/web/special/icon/bdone.png" alt=""><h2>Raid Boards</h2></div><div class="csb"><div class="ns"><h2>Inner</h2></div><p>b</p></div></div>'),
  'a nested <h2> stays inside its card; the closing <hr> is dropped');
assert.ok(out.includes('<div class="cs" id="sec-draw-rates">') && out.includes('<details><summary>s</summary><h2>Quest</h2></details></div></div>'));
assert.strictEqual((out.match(/class="cs"/g) || []).length, 3);
assert.strictEqual(cards.cardSections('<p>no sections</p>'), '<p>no sections</p>');
// a badge in the header band, after the title (no colon after it)
assert.ok(cards.cardSections('<h2>Score thresholds</h2><p>x</p>', undefined, (t) => (t === 'Score thresholds' ? cards.NG : ''))
  .includes('<h2>Score thresholds</h2><span class="ng">NOT ORIGINAL</span></div>'));
// colour roles
assert.strictEqual(cards.yes('Taken'), `<span class="yes">Taken${cards.CROWN}</span>`);
assert.strictEqual(cards.mu('Not yet'), '<span class="mu">Not yet</span>');
for (const c of ['.v{color:#ffcd4a', '.rd{color:#00d4ed', '.yes{color:#6fd47f', '.mu{color:#8fa9ba', '.tn{color:#fff', '.csb table.kg4 td:nth-child(4){color:#ffcd4a']) assert.ok(cards.CARD_CSS.includes(c), c);
console.log('test-detail-cards: ok');
