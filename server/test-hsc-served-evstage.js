// High Score Challenge rows of the served evStage (docs/notes/events.md «High Score Challenge: client behaviour», Deck): the client
// marks the score-bonus medals from the FIRST open eventCategory 4 row, so the rows not listed now are served closed (an end in
// 2015), the listed ones keep the master window, other categories are untouched, and the masterBody cache follows a keep.
//   node server/test-hsc-served-evstage.js
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const SAVE = path.join(os.tmpdir(), `khux-test-hsc-served-evstage-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* new */ }
process.env.KHUX_SAVE = SAVE;
delete process.env.KHUX_REAL_NOW;
delete process.env.KHUX_SERVER_TIME;
const log = console.log; const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const server = quiet(() => require('./server'));
const { _test: t } = server;
const errors = []; const check = (ok, msg) => { if (!ok) errors.push(msg); };
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };
call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
// story 1-525 cleared, so a story week lists event cards (the Shop window is read again: no cached rotation)
const p = t.player; p.stageScores = p.stageScores || {};
for (const r of t.masterRows('stage')) if (r.stageKind === 1 && r.id >= 1 && r.id <= 525) p.stageScores[r.stageId] = 1;
if (p.gacha) delete p.gacha.rot;
const CLOSED = '2015-01-01 00:00:01';

const master = t.masterRows('evStage');
const hscMaster = master.filter((r) => r.eventCategory === 4);
check(hscMaster.length > 1, `master: ${hscMaster.length} HSC rows`);
const servedNow = () => quiet(() => t.servedMasterRows('evStage', t.sessionRealMs()));
const listed = () => new Set(quiet(() => t.eventRoutes().events(t.sessionRealMs())).map((c) => c.eventStageId));

// 1. unlisted HSC rows closed, listed ones with the master window, other categories unchanged
{
  const ids = listed(); const served = new Map(servedNow().map((r) => [r.eventStageId, r]));
  for (const m of master) {
    const s = served.get(m.eventStageId);
    if (!s) { errors.push(`row ${m.eventStageId} not served`); continue; }
    if (m.eventCategory === 4 && !ids.has(m.eventStageId)) {
      check(s.endTime === CLOSED && s.endDispTime === CLOSED && s.boardEndTime === CLOSED, `unlisted HSC ${m.eventStageId} not closed: ${s.endTime}`);
    } else {
      check(s.endTime === m.endTime && s.endDispTime === m.endDispTime && s.boardEndTime === m.boardEndTime, `row ${m.eventStageId} window changed: ${s.endTime}`);
    }
  }
}

// 2. keeping an unlisted HSC opens it (masterBody changes) and unkeep gives back the same body
{
  const before = quiet(() => t.masterBody('evStage')).toString('utf8');
  const ids = listed(); let keptId = null;
  for (const r of hscMaster) {
    if (ids.has(r.eventStageId)) continue;
    const k = quiet(() => t.eventRoutes().keep(r.eventStageId));
    if (k && k.code === 200) { keptId = r.eventStageId; break; }
  }
  check(keptId !== null, 'no unlisted HSC could be kept');
  if (keptId !== null) {
    const after = quiet(() => t.masterBody('evStage')).toString('utf8');
    check(after !== before, `masterBody unchanged after keeping ${keptId}`);
    const nowListed = listed();
    const opened = servedNow().filter((r) => r.eventCategory === 4 && nowListed.has(r.eventStageId));
    check(opened.length > 0 && opened.every((r) => r.endTime !== CLOSED), 'kept HSC still served closed');
    quiet(() => t.eventRoutes().unkeep());
    const back = quiet(() => t.masterBody('evStage')).toString('utf8');
    check(back === before, 'masterBody differs after unkeep');
  }
}

try { fs.unlinkSync(SAVE); } catch { /* gone */ }
if (errors.length) { console.error(`test-hsc-served-evstage: ${errors.length} errors\n  ${errors.slice(0, 15).join('\n  ')}`); process.exit(1); }
console.log('test-hsc-served-evstage: OK');
