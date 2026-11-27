'use strict';
// node tools/discord/test-sync-issues.js
const assert = require('assert');
const { parseIssues, group, actions, postMessage } = require('./sync-issues.js');
const md = [
  '## Open', '### Battle', '| ID | Status | Title | Detail | Proof |', '|---|---|---|---|---|',
  '| I-9 | OPEN (partly; remains: x) | **Nine** (ctx 10-11): (1) one; (2) two; (3) three | [n](a) | - |',
  '| I-8 | DONE 10-11 (rev 1) | **Eight** text | [n](a) | x |',
  '| I-7 | ON HOLD | **Seven** text | [n](a) | - |',
  '## Closed', '| ID | Area | Title | Proof |', '|---|---|---|---|',
  '| I-2 | Shop | **Two** fixed | x |',
].join('\n');
const r = parseIssues(md);
assert.deepStrictEqual([...r.values()].map((x) => `${x.id}:${x.group}:${x.area}`), ['I-9:OPEN:Battle', 'I-8:CLOSED:Battle', 'I-7:ON HOLD:Battle', 'I-2:CLOSED:Shop']);
assert.strictEqual(group('IN PROGRESS'), 'IN PROGRESS');
assert.strictEqual(group('FIXED 25-11, benched OK by the user 25-11'), 'CLOSED');
const d = postMessage(r.get('I-9'), 'abc').embeds[0];
assert.ok(d.description.startsWith('*ctx 10-11*\n• one\n• two\n• three'));
assert.strictEqual(d.fields[0].value, 'partly; remains: x');
// first run: closed issues get no post, oldest first
assert.deepStrictEqual(actions(r, {}).map((t) => `${t.act}:${t.r.id}`), ['post:I-7', 'post:I-9']);
// status change -> tag, same text -> keep
const h7 = actions(r, {}).find((t) => t.r.id === 'I-7').h;
const have = { 'I-7': { group: 'ON HOLD', hash: h7, name: 'I-7 · Seven' }, 'I-2': { group: 'OPEN', hash: 'x', name: 'I-2 · Two' } };
assert.deepStrictEqual(actions(r, have).map((t) => `${t.act}:${t.r.id}`), ['tag:I-2', 'post:I-9']);
console.log('test-sync-issues OK');

// main() against a fake Discord (I-253): a post deleted by hand is posted again, a deleted first message is sent again
(async () => {
  const fs = require('fs'), os = require('os'), path = require('path');
  const si = require('./sync-issues.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-issues-'));
  const paths = { issues: path.join(dir, 'ISSUES.md'), state: path.join(dir, 'state.json'), config: path.join(dir, 'forum.json') };
  fs.writeFileSync(paths.issues, md);
  fs.writeFileSync(paths.config, '{"channel":"F1"}');
  // I-9 edited, its post deleted by hand; I-7 edited, its first message deleted by hand
  fs.writeFileSync(paths.state, JSON.stringify({ forum: 'F1', issues: {
    'I-9': { thread: 'T9', msg: 'T9', group: 'OPEN', hash: 'old', name: 'I-9 · Nine' },
    'I-7': { thread: 'T7', msg: 'T7', group: 'ON HOLD', hash: 'old', name: 'I-7 · Seven' } } }));
  const calls = [];
  si.io.sleep = async () => {};
  si.io.fetch = async (url, init) => {
    const route = url.replace('https://discord.com/api/v10', '');
    calls.push(`${init.method} ${route}`);
    const reply = (status, body) => ({ status, ok: status < 300, json: async () => body, text: async () => JSON.stringify(body) });
    if (route === '/channels/F1' && init.method === 'GET') return reply(200, { available_tags: [{ id: 'g1', name: 'OPEN' }] });
    if (route === '/channels/T9') return reply(404, { message: 'Unknown Channel', code: 10003 });
    if (route === '/channels/T7/messages/T7') return reply(404, { message: 'Unknown Message', code: 10008 });
    if (route === '/channels/F1/threads') return reply(201, { id: 'T10' });
    if (route === '/channels/T7/messages') return reply(200, { id: 'M70' });
    return reply(200, {});
  };
  const log = console.log; console.log = () => {};
  try {
    await si.main({ paths, argv: [], env: { DISCORD_BOT_TOKEN: 'tok', GITHUB_SHA: 'abcdef1' } });
  } finally { console.log = log; }
  assert.deepStrictEqual(calls, ['GET /channels/F1', 'PATCH /channels/T7', 'PATCH /channels/T7/messages/T7', 'POST /channels/T7/messages',
    'PATCH /channels/T9', 'POST /channels/F1/threads']);
  const st = JSON.parse(fs.readFileSync(paths.state, 'utf8')).issues;
  assert.deepStrictEqual([st['I-9'].thread, st['I-9'].msg], ['T10', 'T10']);
  assert.deepStrictEqual([st['I-7'].thread, st['I-7'].msg], ['T7', 'M70']);
  assert.ok(st['I-9'].hash !== 'old' && st['I-7'].hash !== 'old');
  fs.rmSync(dir, { recursive: true, force: true });
  console.log('main 404 recovery OK');
})().catch((e) => { console.error(e); process.exit(1); });
