// /stage/clear sends the owned avatar parts (user 28-11: «Terra Doll» of EV-1473 earned by an objective, not in the Accessories
// list until the next login). The client merges userAvatarParts by userAvatarPartsId, which is the position in the full list
// (userAvatarPartsData): a new part shifts the ids after it, so the full list is sent, as 44 / 190 / 49 do.
//   node server/test-stage-clear-avatar.js
'use strict';
const fs = require('fs'); const os = require('os'); const path = require('path');
const SAVE = path.join(os.tmpdir(), `khux-test-stage-clear-avatar-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* new */ }
process.env.KHUX_SAVE = SAVE;
const log = console.log; const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const errors = []; const check = (ok, msg) => { if (!ok) errors.push(msg); };
const call = (fn, ...a) => { let b = null; quiet(() => fn({ writeHead() {}, end(x) { b = JSON.parse(x.toString('utf8')); } }, ...a)); return b; };

call(t.respondUserCreate, { name: 'Prova', unionId: 1 });
const p = t.player;
const clear = () => call(t.respondStageClear, { getPoint: { exp: 0, money: 0, lux: 0 }, getTreasures: [], getEnemyDropItems: [], clearMissionIds: [], burst: 0 });

// a part earned in this battle (granted like an objective reward, type 20) is in the clear response, with the full list
p.currentStageId = 1050; p.stageInProgress = true;
quiet(() => t.grantItem(20, 206061, 1));
const b = clear();
const ids = (b?.userAvatarParts || []).map((x) => x.avatarPartsId);
check(ids.includes(206061), `clear response without the earned part 206061: ${JSON.stringify(ids.slice(0, 40))}`);
check(JSON.stringify(b?.userAvatarParts) === JSON.stringify(t.userAvatarPartsData().map((x) => ({ ...x, getDatetime: b.userAvatarParts.find((y) => y.avatarPartsId === x.avatarPartsId)?.getDatetime }))),
  'clear response is not the full owned list (userAvatarPartsData)');

try { fs.unlinkSync(SAVE); } catch { /* gone */ }
if (errors.length) { for (const e of errors) console.log('FAIL', e); process.exit(1); }
console.log('test-stage-clear-avatar: OK');
