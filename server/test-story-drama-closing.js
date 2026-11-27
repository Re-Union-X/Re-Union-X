// Test of the I-333 rule (story-drama-closing.js): node server/test-story-drama-closing.js
'use strict';
const assert = require('assert');
const { closingByStage, theaterOpenings, addClosing } = require('./story-drama-closing');

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
console.log('test-story-drama-closing: OK');
