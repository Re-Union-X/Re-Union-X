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

// 3. I-287 (user 22-11, option B): the client reads the bonus marks from ONE open HSC row (the highest eventStageId on the bench), so
// with two or more HSC listed (story week + kept) a phantom category-4 row, open, last and above every HSC id, carries a merged list
// (every listed HSC's bonus medals, the highest rate of a medal, display 0); the real rows keep their own lists (deck, battle)
{
  const PH = t.HSC_PHANTOM;
  // a story progress whose Shop week already lists an HSC (the listed events follow the story week, storyCtx)
  const REAL = t.sessionRealMs();
  const listedAt = (ms) => new Set(quiet(() => t.eventRoutes().events(ms)).map((c) => c.eventStageId));
  const story = t.masterRows('stage').filter((r) => r.stageKind === 1 && r.id >= 1 && r.id <= 979).sort((a, b) => a.id - b.id);
  let found = null;
  for (let n = 979; n >= 1 && found === null; n -= 3) {
    p.stageScores = {}; for (const r of story) if (r.id <= n) p.stageScores[r.stageId] = 1;
    if (p.gacha) delete p.gacha.rot;
    if (hscMaster.some((r) => listedAt(REAL).has(r.eventStageId))) found = n;
  }
  check(found !== null, 'no story progress lists an HSC');
  const listed = () => listedAt(REAL);
  const servedNow = () => quiet(() => t.servedMasterRows('evStage', REAL));
  const ids0 = listed(); let keptId = null;
  for (const r of hscMaster) {
    if (ids0.has(r.eventStageId)) continue;
    const k = quiet(() => t.eventRoutes().keep(r.eventStageId));
    if (k && k.code === 200) { keptId = r.eventStageId; break; }
  }
  const ids = listed();
  const listedHsc = hscMaster.filter((r) => ids.has(r.eventStageId));
  check(listedHsc.length >= 2, `only ${listedHsc.length} HSC listed after the keep of ${keptId}`);
  const served = servedNow();
  const ph = served.filter((r) => r.eventStageId === PH.eventStageId);
  check(ph.length === 1, `phantom rows ${ph.length}`);
  const row = ph[0] || {};
  const cat4 = served.filter((r) => r.eventCategory === 4);
  check(row.eventCategory === 4 && served[served.length - 1] === row && cat4.every((r) => r.eventStageId <= row.eventStageId),
    'phantom: category 4, last row, highest HSC id');
  check(row.endTime === '2030-12-31 23:59:59' && row.scoreMedalListId === PH.listId, `phantom window/list ${row.endTime} ${row.scoreMedalListId}`);
  check(!hscMaster.some((r) => r.eventStageId === PH.eventStageId) && !master.some((r) => r.eventStageId === PH.eventStageId), 'phantom id used by a master row');
  const lists = t.masterRows('evMedalList');
  const want = new Map();
  for (const h of listedHsc) for (const m of lists.filter((x) => x.listId === h.scoreMedalListId)) want.set(m.medalId, Math.max(want.get(m.medalId) || 0, m.rate));
  const sl = quiet(() => t.servedMasterRows('evMedalList', REAL));
  const mine = sl.filter((x) => x.listId === PH.listId);
  check(want.size > 0 && mine.length === want.size && mine.every((x) => want.get(x.medalId) === x.rate && x.display === 0 && x.isDeleted === 0),
    `merged list ${mine.length} rows, expected ${want.size}`);
  check(new Set(sl.map((x) => x.evMedalListId)).size === sl.length, 'evMedalListId repeated');
  check(sl.length === lists.length + mine.length, 'the real lists changed');
  // the real listed rows keep their own list (deck panel, battle multiplier)
  for (const h of listedHsc) check(served.find((r) => r.eventStageId === h.eventStageId)?.scoreMedalListId === h.scoreMedalListId, `HSC ${h.eventStageId} list changed`);
  const withKeep = JSON.stringify(sl);
  quiet(() => t.eventRoutes().unkeep());
  const ids1 = listed();
  const one = hscMaster.filter((r) => ids1.has(r.eventStageId)).length;
  check(one === 1 && !servedNow().some((r) => r.eventStageId === PH.eventStageId), `phantom served with ${one} HSC listed`);
  const sl1 = quiet(() => t.servedMasterRows('evMedalList', REAL));
  check(JSON.stringify(sl1) !== withKeep && !sl1.some((x) => x.listId === PH.listId), 'merged list served with one HSC listed');
}

// 4. the client downloads the master only when the global revision changes (respondMaster): a login whose listed HSC set differs
// from the previous login raises the revision (player.hscListRev), the same set keeps it (bench 22-11: a keep left the old master)
{
  quiet(() => t.startSession()); const r0 = t.player.sessionRevision;
  quiet(() => t.startSession()); check(t.player.sessionRevision === r0, `same HSC set: revision ${r0} -> ${t.player.sessionRevision}`);
  const ids = new Set(quiet(() => t.eventRoutes().events(t.sessionRealMs())).map((c) => c.eventStageId));
  const other = hscMaster.find((r) => !ids.has(r.eventStageId) && quiet(() => t.eventRoutes().keep(r.eventStageId))?.code === 200);
  check(other, 'no HSC to keep for the revision check');
  quiet(() => t.startSession()); const r1 = t.player.sessionRevision;
  check(r1 > r0, `keep of an HSC: revision ${r0} -> ${r1}`);
  quiet(() => t.startSession()); check(t.player.sessionRevision === r1, 'revision moved again without a change');
  quiet(() => t.eventRoutes().unkeep());
  quiet(() => t.startSession()); check(t.player.sessionRevision > r1, `unkeep: revision ${r1} -> ${t.player.sessionRevision} (never lower)`);
}

try { fs.unlinkSync(SAVE); } catch { /* gone */ }
if (errors.length) { console.error(`test-hsc-served-evstage: ${errors.length} errors\n  ${errors.slice(0, 15).join('\n  ')}`); process.exit(1); }
console.log('test-hsc-served-evstage: OK');
