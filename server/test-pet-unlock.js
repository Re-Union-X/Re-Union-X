// I-329: the Spirit (pet, KHUX_PET=1) unlocks after Story Quest 14 «The Mine Pt. 2», as in the original, not for every new
// player. The client asks /pet/profile (which creates its pet) only in the startup chain when userDetail.isPet is 1, so isPet
// and the pet data of the server follow the state at the login (startSession) and change only at the next login.
// node server/test-pet-unlock.js [master folder]
'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MASTER = path.resolve(process.argv[2] || path.join(__dirname, 'master_data'));
const SAVE = path.join(os.tmpdir(), `khux-test-petunlock-${process.pid}.json`);
try { fs.unlinkSync(SAVE); } catch { /* new */ }
process.env.KHUX_MASTER_DIR = MASTER;
process.env.KHUX_SAVE = SAVE;
process.env.KHUX_PET = '1';
const log = console.log;
const quiet = (fn) => { console.log = () => {}; try { return fn(); } finally { console.log = log; } };
const { _test: t } = quiet(() => require('./server'));
const stages = JSON.parse(fs.readFileSync(path.join(MASTER, 'stage.json'), 'utf8'));
const quest = (n) => stages.find((s) => s.id === n && s.stageKind === 1).stageId;
const p = t.player;
const off = () => {
  assert.strictEqual(t.userDetailData().isPet, 0, 'isPet 0');
  assert.strictEqual(t.petSubslotNow().magnification, 0, 'petSubslot placeholder');
  assert.strictEqual(t.stealMultiplier(), 0, 'no steal');
};

// new player
quiet(() => t.startSession());
off();
// Quest 13 cleared: still locked
p.created = true; p.stageScores = { [quest(13)]: 1 };
quiet(() => t.startSession());
off();
// Quest 14 cleared in this session: the client has no pet yet, so nothing changes until the next login
p.stageScores[quest(14)] = 1;
off();
quiet(() => t.startSession());
assert.strictEqual(t.userDetailData().isPet, 1, 'next login after Quest 14: isPet 1');
// a save far past Quest 14 keeps it
p.stageScores = { [quest(200)]: 1 };
quiet(() => t.startSession());
assert.strictEqual(t.userDetailData().isPet, 1, 'save past Quest 14 keeps the pet');
try { fs.unlinkSync(SAVE); } catch { /* not written */ }
console.log('test-pet-unlock: OK');
