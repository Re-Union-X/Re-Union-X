// Every event of the Event Catalog ends on or after its start (user 22-11: the Little Mermaid High Score Challenge EV-0124
// showed 2017-01-19 .. 2016-01-26, a year typo of its notice; corrected in event_config.json dateFixes, make-events.js).
//   node server/test-event-dates.js
'use strict';
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'game_data', 'events.json');
if (!fs.existsSync(file)) { console.log('test-event-dates: skipped, game_data/events.json absent'); process.exit(0); }
const { entries } = JSON.parse(fs.readFileSync(file, 'utf8'));
const bad = entries.filter((e) => e.start && e.end && e.start > e.end).map((e) => `${e.censusId} ${e.start}..${e.end}`);
const want = { 'EV-0124': ['2017-01-19', '2017-01-26'], 'EV-1123': ['2020-05-05', '2020-05-16'] };
for (const [id, [s, e]] of Object.entries(want)) {
  const x = entries.find((r) => r.censusId === id);
  if (x && (x.start !== s || x.end !== e)) bad.push(`${id} ${x.start}..${x.end}, expected ${s}..${e}`);
}
if (bad.length) { console.error(`test-event-dates: ${bad.length} errors\n  ${bad.join('\n  ')}`); process.exit(1); }
console.log(`test-event-dates: OK (${entries.length} entries)`);
