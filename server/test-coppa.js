// I-322: GET /system/coppa (action 26) feeds the local Birthdate Registration dialog before any master is downloaded.
// misc 900-907 must carry the master values (905/906 = 1910/2016, the year range of the picker: with 0 the Year list was
// empty); 116 stays the server's own value (KHUX_COPPA_116, default 1). node server/test-coppa.js [master folder]
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MASTER = path.resolve(process.argv[2] || path.join(__dirname, 'master_data'));
process.env.KHUX_MASTER_DIR = MASTER;
process.env.KHUX_SAVE = path.join(os.tmpdir(), `khux-test-coppa-${process.pid}.json`);
delete process.env.KHUX_COPPA_116;
const log = console.log;
const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));

const misc = new Map(JSON.parse(fs.readFileSync(path.join(MASTER, 'misc.json'), 'utf8')).map((r) => [String(r.miscId), r.value]));
let body = null;
t.respondCoppa({ writeHead() {}, end(b) { body = JSON.parse(b.toString('utf8')); } });
for (let k = 900; k <= 907; k++) assert.strictEqual(body.misc[k], misc.get(String(k)), `misc ${k}: master value`);
assert.strictEqual(body.misc['905'], 1910, 'birth year from 1910');
assert.strictEqual(body.misc['906'], 2016, 'birth year to 2016');
assert.strictEqual(body.misc['116'], 1, 'misc 116 is the server value, not the master one');
assert.ok('804' in body.misc, 'misc 804 still sent');
try { fs.unlinkSync(process.env.KHUX_SAVE); } catch { /* not written */ }
console.log('test-coppa: OK');
