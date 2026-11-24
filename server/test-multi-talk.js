// I-299 (tester 22-11): Union Cross «Chat Phrases» showed no phrase and the screen could not be left (the client wants at least
// one). GET /multi/talk (159) answers the player's 8 phrases: the first 8 of the multiTalk table until a list is saved; a body
// with multiTalkIds saves the known ids (at most 8, order kept).
'use strict';
const assert = require('assert');
const { makeMulti } = require('./multi');

const rows = Array.from({ length: 12 }, (_, i) => ({ talkId: 12 - i, category: 1, talk: `t${12 - i}`, imageId: 0, motionId: 0 }));
const player = {};
let saves = 0, out = null;
const m = makeMulti({
  masterRows: (t) => (t === 'multiTalk' ? rows : []), player, savePlayer: () => { saves++; }, ret: () => ({ code: 0 }),
  send: (res, code, body) => { out = body; }, serverTime: () => '2026-11-25 00:00:00', userPointData: () => ({}),
  userKeybladesData: () => [], publicHost: '127.0.0.1', schemaResponse: () => ({}),
});
const talk = (body) => { m.respond('multitalk', {}, body); return out.multiTalkIds; };

assert.deepStrictEqual(talk(undefined), [1, 2, 3, 4, 5, 6, 7, 8], 'default: the first 8 phrases');
assert.deepStrictEqual(talk({ multiTalkIds: [9, 3, 999, 12] }), [9, 3, 12], 'saved: known ids only, order kept');
assert.strictEqual(saves, 1);
assert.deepStrictEqual(talk({}), [9, 3, 12], 'read back');
assert.deepStrictEqual(talk({ multiTalkIds: [999] }), [9, 3, 12], 'nothing known: the saved list stays');
assert.deepStrictEqual(talk({ multiTalkIds: Array.from({ length: 10 }, (_, i) => i + 1) }), [1, 2, 3, 4, 5, 6, 7, 8], 'at most 8');
console.log('test-multi-talk: OK');
