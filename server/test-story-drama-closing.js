// Test of the I-333 rule (story-drama-closing.js): node server/test-story-drama-closing.js
'use strict';
const assert = require('assert');
const { closingByStage, theaterOpenings, addClosing, packDramas, moveClosingAfter, mergeAfter,
  SPLIT_2021_QUESTS, applySplit2021 } = require('./story-drama-closing');

const overlay = { quests: {
  34: { stageId: 1310, before: [[1011531, 0]], after: [[1011601, 0], [2999920, 0], [2101101, 0], [1120101, 0]] },
  35: { stageId: 2010, before: [[2011606, 0]], after: [[2019101, 0]] } } };
const cl = closingByStage(overlay);
assert.deepStrictEqual([...cl.get(1310)].sort(), [1011601, 1120101, 2101101, 2999920]);
assert.strictEqual(closingByStage('Z:\no\such\file.json').size, 0, 'missing overlay -> empty, no throw');

// Quest 34: dialogue opening missing, theater row 10030 holds the closing scene
const dramas = new Set([2101101, 2999920, 2011606]);
const theater34 = [{ stageId: 1310, dramaId: [2101101], dramaType: [0] }];
const s34 = { stageId: 1310, validAfterDrama: 2, afterDramaId: [1011601, 2999920, 0, 0, 0], afterDramaType: [0, 0, 0, 0, 0] };
const op = theaterOpenings(s34, theater34, dramas, new Set([1011601, 2999920]), cl.get(1310));
assert.strictEqual(op.rows.length, 0, 'Quest 34: no theater opening');
addClosing(s34, op.closing);
addClosing(s34, op.closing); // idempotent: served once
assert.deepStrictEqual(s34.afterDramaId.slice(0, s34.validAfterDrama), [1011601, 2999920, 2101101]);

// a quest the overlay does not list (or without closing ids) keeps the theater fallback
const t35 = [{ stageId: 2010, dramaId: [2011606], dramaType: [0] }];
const s35 = { stageId: 2010, validAfterDrama: 0, afterDramaId: [], afterDramaType: [] };
const op35 = theaterOpenings(s35, t35, dramas, new Set(), cl.get(2010));
assert.strictEqual(op35.rows.length, 1);
assert.strictEqual(op35.closing.length, 0);
assert.strictEqual(theaterOpenings(s35, t35, dramas, new Set(), undefined).rows.length, 1);

// the row's own after list still excludes (16-11 rule)
assert.strictEqual(theaterOpenings(s35, t35, dramas, new Set([2011606]), undefined).rows.length, 0);
// I-014: the generated pack (stage_gen\files) serves the SEQ dialogues / lwf cutscenes imported from the 2016 package
const fs = require('fs');
const os = require('os');
const path = require('path');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'i014-'));
try {
  fs.mkdirSync(path.join(tmp, 'img', 'light', 'SEQ'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'lwf', 'drama', '2999951'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'lwf', 'drama', '2999952'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'img', 'light', 'SEQ', '1010201.l'), 'x');
  fs.writeFileSync(path.join(tmp, 'img', 'light', 'SEQ', 'notes.txt'), 'x');
  fs.writeFileSync(path.join(tmp, 'lwf', 'drama', '2999951', '2999951.lwf'), 'x');
  fs.writeFileSync(path.join(tmp, 'lwf', 'drama', '2999952', '2999952_aa.png'), 'x'); // no .lwf: not a cutscene
  assert.deepStrictEqual([...packDramas(tmp)].sort(), [1010201, 2999951]);
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
assert.strictEqual(packDramas('Z:\\no\\such\\pack').size, 0, 'missing pack -> empty, no throw');

// I-333 on the restored dialogues: an opening the overlay lists as the quest's closing moves after the clear, once
const s36 = { stageId: 1310, validBeforeDrama: 2, beforeDramaId: [1011601, 1011531, 0], beforeDramaType: [0, 0, 0],
  validAfterDrama: 1, afterDramaId: [2999920, 0], afterDramaType: [0, 0] };
moveClosingAfter(s36, cl.get(1310));
assert.deepStrictEqual(s36.beforeDramaId, [1011531]);
assert.strictEqual(s36.validBeforeDrama, 1);
assert.deepStrictEqual(s36.afterDramaId.slice(0, s36.validAfterDrama), [2999920, 1011601]);
const s37 = { stageId: 2010, validBeforeDrama: 1, beforeDramaId: [2011606], beforeDramaType: [0], validAfterDrama: 0,
  afterDramaId: [], afterDramaType: [] };
moveClosingAfter(s37, cl.get(2010));
moveClosingAfter(s37, undefined);
assert.deepStrictEqual([s37.validBeforeDrama, s37.beforeDramaId], [1, [2011606]], 'openings untouched');

// the 2021 story fields (stage_story_2021.json) add their closing ids to ours, never drop a served one (Quest 34: the
// restored 1011601 stays first, 2101101 of the 2021 row follows)
const s38 = { validAfterDrama: 2, afterDramaId: [1011601, 2999920, 0], afterDramaType: [0, 0, 0] };
mergeAfter(s38, { validAfterDrama: 2, afterDramaId: [2999920, 2101101], afterDramaType: [0, 0] });
assert.deepStrictEqual([s38.validAfterDrama, s38.afterDramaId, s38.afterDramaType], [3, [1011601, 2999920, 2101101], [0, 0, 0]]);
// Quest 200: the 2021 order of its own ids wins (2999910 before 2101101), the restored 1120101 of our row follows
const s40 = { validAfterDrama: 3, afterDramaId: [2061101, 2101101, 1120101], afterDramaType: [0, 0, 0] };
mergeAfter(s40, { validAfterDrama: 3, afterDramaId: [2061101, 2999910, 2101101], afterDramaType: [0, 1, 0] });
assert.deepStrictEqual([s40.validAfterDrama, s40.afterDramaId, s40.afterDramaType],
  [4, [2061101, 2999910, 2101101, 1120101], [0, 1, 0, 0]]);
const s39 = { validAfterDrama: 5, afterDramaId: [1, 2, 3, 4, 5], afterDramaType: [0, 0, 0, 0, 0] };
mergeAfter(s39, { validAfterDrama: 1, afterDramaId: [6], afterDramaType: [0] });
assert.strictEqual(s39.validAfterDrama, 5, 'max 5 per side');

// user 27-11: Quests 34, 200, 201 take the 2021 split of the overlay (2016 rows were an older version)
assert.deepStrictEqual(SPLIT_2021_QUESTS, [34, 200, 201]);
const ov2021 = { quests: {
  34: { stageId: 1310, before: [[1011531, 0]], after: [[1011601, 0], [2999920, 0], [2101101, 0], [1120101, 0]] },
  200: { stageId: 6400, before: [], after: [[2061101, 0], [1061146, 0], [2999910, 0]] },
  201: { stageId: 7010, before: [[1070101, 0]], after: [] } } };
const served = new Set([1011531, 1011601, 2999920, 2101101, 1120101, 2061101, 1061146, 2999910, 1070101]);
const q200 = { id: 200, stageId: 6400, validBeforeDrama: 0, beforeDramaId: [], beforeDramaType: [], validAfterDrama: 4,
  afterDramaId: [2061101, 2999910, 2101101, 1120101], afterDramaType: [0, 0, 0, 0] };
assert.strictEqual(applySplit2021(q200, ov2021, served), true);
assert.deepStrictEqual([q200.validBeforeDrama, q200.validAfterDrama, q200.afterDramaId, q200.afterDramaType],
  [0, 3, [2061101, 1061146, 2999910], [0, 0, 0]]);
const q201 = { id: 201, stageId: 7010, validBeforeDrama: 3, beforeDramaId: [1061146, 2999910, 1070101], beforeDramaType: [0, 0, 0],
  validAfterDrama: 0, afterDramaId: [], afterDramaType: [] };
applySplit2021(q201, ov2021, served);
assert.deepStrictEqual([q201.validBeforeDrama, q201.beforeDramaId], [1, [1070101]]);
const q34 = { id: 34, stageId: 1310, validBeforeDrama: 1, beforeDramaId: [1011531], beforeDramaType: [0], validAfterDrama: 3,
  afterDramaId: [1011601, 2999920, 2101101], afterDramaType: [0, 0, 0] };
applySplit2021(q34, ov2021, served);
assert.deepStrictEqual([q34.beforeDramaId, q34.afterDramaId], [[1011531], [1011601, 2999920, 2101101, 1120101]]);
// one overlay id not served -> the row stays as it is (a missing drama crashes the client); other quests untouched
const q34b = { id: 34, stageId: 1310, validBeforeDrama: 1, beforeDramaId: [1011531], beforeDramaType: [0], validAfterDrama: 1,
  afterDramaId: [2999920], afterDramaType: [0] };
assert.strictEqual(applySplit2021(q34b, ov2021, new Set([1011531, 2999920])), false);
assert.deepStrictEqual(q34b.afterDramaId, [2999920]);
assert.strictEqual(applySplit2021({ id: 35, stageId: 2010 }, ov2021, served), false);
assert.strictEqual(applySplit2021({ id: 200, stageId: 9999 }, ov2021, served), false, 'stageId must match the overlay');
console.log('test-story-drama-closing: OK');
