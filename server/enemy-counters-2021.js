#!/usr/bin/env node
// Story-enemy counters and counter moves from the donated 2021 WW master (I-207, user decision 27-11).
//
// The donated 2021 WW master (ReLux Team, private, outside the repo: KHUX_DONOR_MASTER, default the donor's server_master
// folder) holds the original counters (urgency entries) of every story 526-979 row we serve: they match our wiki-derived
// counters in 125 of the 128 ids of enemy-mechanics.js, and give the original move of the 84 counters suspended since 26-10
// (and of the further rows with no counter of ours: Cy-Bug, Flappy Bug, Chocolate Monster, Darkness...). User 27-11: the donor
// is the authority for story-enemy COUNTERS and MOVES only; buffs, status and skill lists stay ours.
//
// - Only the leading elements count: the donor's int arrays carry junk past the length the client reads (urgency* has 6
//   values, the first `validUrgency` are real). Each served story row (make-enemy-oltre.js sources) with a donor row gets
//   validUrgency / urgency / urgencyValue / urgencyFrequency / urgencySkillId from the donor, cut at validUrgency, padded
//   with 0 to our array length (at least 3).
// - The move rows: a cited attack missing from our table is created (template like enemy-attack-fix.js addMissing) and
//   filled with the donor row; an existing row that is not an original row (a template stub of addMissing) is replaced by
//   the donor row. Both go through enemy-attack-fix.js applyEnemyAttacks: an unserved hitEffect keeps the template one,
//   attackMotion >= 3 falls back to 1. Original rows (thethiny, event, donor moves) are never touched.
// - A counter whose move needs an animation the enemy's served model lacks (attackMotion 2 = atkSp, >= 3 = atk<N>_o) stays
//   suspended (that entry is dropped) and is listed in the report.
// - The invented copies 992070001.. (enemy-mechanics.js, 26-10) are dropped when no enemy cites them any more.
// Absorb, reflect and Upright/Reversed are not touched (the last two already equal the donor).
//
// make-game-tables.js applies it after enemy-mechanics.js and enemy-motion-fix.js; alone it corrects a built master in place
// (idempotent; then revision +1 and relogin.ps1):
//   node server/enemy-counters-2021.js [master folder]
'use strict';
const fs = require('fs');
const path = require('path');

const DONOR_DIR = process.env.KHUX_DONOR_MASTER
  || 'D:\\Progetto_Restauro_KH_UX\\Reddit Donators\\ReLux Team\\KHUX_pacchetto_18_11_2026\\pkg\\server_master';
const KEYS = ['urgency', 'urgencyValue', 'urgencyFrequency', 'urgencySkillId'];
const MAX_ENTRIES = 6; // urgency[6] in the client row
const INVENTED = [992070001, 992070099];

// the first n values of arr, padded with 0 to max(len, n)
function leading(arr, n, len) {
  const src = Array.isArray(arr) ? arr : [];
  const out = new Array(Math.max(len || 0, n)).fill(0);
  for (let i = 0; i < n; i++) out[i] = Number.isSafeInteger(src[i]) ? src[i] : 0;
  return out;
}

// the urgency entries the client reads: [{urgency, value, frequency, skillId}]
function donorEntries(r) {
  const n = r && r.validUrgency;
  if (!Number.isInteger(n) || n <= 0 || n > MAX_ENTRIES) return [];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ urgency: (r.urgency || [])[i] || 0, value: (r.urgencyValue || [])[i] || 0,
      frequency: (r.urgencyFrequency || [])[i] || 0, skillId: (r.urgencySkillId || [])[i] || 0 });
  }
  return out;
}

// {enemies: Map, attacks: Map} or null without the donor folder
function readDonor(dir = DONOR_DIR) {
  const ep = path.join(dir, 'enemy.json'), ap = path.join(dir, 'enemyAttack.json');
  if (!fs.existsSync(ep) || !fs.existsSync(ap)) return null;
  return {
    enemies: new Map(JSON.parse(fs.readFileSync(ep, 'utf8')).map((r) => [r.enemyId, r])),
    attacks: new Map(JSON.parse(fs.readFileSync(ap, 'utf8')).map((r) => [r.enemyAttackId, r])),
  };
}

// the animation folder a move needs on model displayId ('' = none beyond the standard atk1_o)
const needAnim = (displayId, a) => (!a ? '' : a.attackMotion === 2 ? `${displayId}/atkSp`
  : a.attackMotion >= 3 ? `${displayId}/atk${a.attackMotion}_o` : '');
const animOk = (displayId, a, anims) => { const n = needAnim(displayId, a); return !n || anims.has(n); };

// enemies, atts: master tables (in place); donor: readDonor(); opts: {storyIds: Set, origIds: Set of original attack ids,
// servedHits: Set of served hit effects, motionOk: Set, anims: Set of "<displayId>/<anim>"}
function applyDonorCounters(enemies, atts, donor, opts) {
  const fix = require('./enemy-attack-fix');
  const { storyIds, origIds = new Set(), origRows = [], servedHits = fix.servedHitEffects(), motionOk = new Set(), anims = new Set() } = opts;
  const rep = { rows: 0, changed: 0, filled: 0, entries: 0, attacksAdded: [], attacksReplaced: [], suspendedAnim: [], noMove: [], inventedDropped: [] };
  if (!donor) return rep;
  const origById = new Map(origRows.map((r) => [r.enemyAttackId, r]));
  const rows = enemies.filter((e) => storyIds.has(e.enemyId) && donor.enemies.has(e.enemyId));
  const plan = rows.map((e) => ({ e, entries: donorEntries(donor.enemies.get(e.enemyId)) }));
  // the row a move will be served with: ours when it is there and original (or the donor has none); when it is missing, the
  // original row if one exists (an id can be original yet absent from our table: e.g. 285021 Shadow, an event original row
  // no served event enemy cites, 27-11 regen), else the donor's. Motion >= 3 falls back to 1, as applyEnemyAttacks
  const source = (id) => {
    const a = atts.find((r) => r.enemyAttackId === id);
    const d = donor.attacks.get(id);
    if (a) return origIds.has(id) || !d ? null : d; // null = keep ours
    return origById.get(id) || d || null;
  };
  const served = (id) => {
    const a = atts.find((r) => r.enemyAttackId === id);
    const r = source(id) || a;
    if (!r) return null;
    return r.attackMotion >= 3 && !motionOk.has(id) ? { ...r, attackMotion: 1 } : r;
  };

  // 1. move rows: missing ones created (original row, else donor row), template stubs replaced by the donor row; original
  // rows already in our table kept
  const have = new Set(atts.map((a) => a.enemyAttackId));
  const tpl = atts.find((a) => a.enemyAttackId === 601) || atts[0];
  const want = new Map();
  for (const { e, entries } of plan) {
    for (const x of entries) {
      if (!x.skillId || want.has(x.skillId)) continue;
      const src = source(x.skillId);
      if (!src) continue;
      if (!animOk(e.displayId, served(x.skillId), anims)) continue; // stays suspended (step 2): no row to import for it
      if (!have.has(x.skillId)) {
        atts.push(Object.assign(JSON.parse(JSON.stringify(tpl)), { enemyAttackId: x.skillId }));
        have.add(x.skillId);
        rep.attacksAdded.push(x.skillId);
      }
      want.set(x.skillId, src);
    }
  }
  const before = new Map(atts.filter((a) => want.has(a.enemyAttackId)).map((a) => [a.enemyAttackId, JSON.stringify(a)]));
  fix.applyEnemyAttacks(atts, [...want.values()], servedHits, motionOk);
  for (const a of atts) {
    if (before.has(a.enemyAttackId) && before.get(a.enemyAttackId) !== JSON.stringify(a)
      && !rep.attacksAdded.includes(a.enemyAttackId)) rep.attacksReplaced.push(a.enemyAttackId);
  }
  const attById = new Map(atts.map((a) => [a.enemyAttackId, a]));

  // 2. counters: leading elements, entries whose move animation is not served stay suspended
  for (const { e, entries } of plan) {
    rep.rows++;
    const keep = entries.filter((x) => {
      const a = attById.get(x.skillId) || served(x.skillId);
      if (!a) { rep.noMove.push({ enemyId: e.enemyId, skillId: x.skillId }); return false; }
      if (!animOk(e.displayId, a, anims)) {
        rep.suspendedAnim.push({ enemyId: e.enemyId, name: e.name, urgency: x.urgency, value: x.value, skillId: x.skillId,
          attackMotion: a.attackMotion, need: needAnim(e.displayId, a) });
        return false;
      }
      if (!attById.has(x.skillId)) { rep.noMove.push({ enemyId: e.enemyId, skillId: x.skillId }); return false; }
      return true;
    });
    const was = JSON.stringify([e.validUrgency, ...KEYS.map((k) => e[k])]);
    const wasOn = e.validUrgency > 0;
    if (!keep.length && !wasOn) continue; // no counter in either: the row stays as it is
    e.validUrgency = keep.length;
    const cols = { urgency: 'urgency', urgencyValue: 'value', urgencyFrequency: 'frequency', urgencySkillId: 'skillId' };
    for (const k of KEYS) e[k] = leading(keep.map((x) => x[cols[k]]), keep.length, Math.max(3, Array.isArray(e[k]) ? e[k].length : 0));
    rep.entries += keep.length;
    if (JSON.stringify([e.validUrgency, ...KEYS.map((k) => e[k])]) !== was) { rep.changed++; if (!wasOn && keep.length) rep.filled++; }
  }

  // 3. invented copies nobody cites any more
  const cited = new Set(enemies.flatMap((e) => [...(e.skillId || []), ...(e.urgencySkillId || [])]));
  for (let i = atts.length - 1; i >= 0; i--) {
    const id = atts[i].enemyAttackId;
    if (id >= INVENTED[0] && id <= INVENTED[1] && !cited.has(id)) { atts.splice(i, 1); rep.inventedDropped.push(id); }
  }
  rep.inventedDropped.sort((a, b) => a - b);
  return rep;
}

const summary = (rep) => `enemy-counters-2021: ${rep.rows} story rows in the donor, ${rep.changed} changed `
  + `(${rep.filled} had none), ${rep.entries} entries; moves +${rep.attacksAdded.length} added, ${rep.attacksReplaced.length} stubs replaced; `
  + `suspended (animation not served) ${rep.suspendedAnim.length}${rep.suspendedAnim.length ? ` [${rep.suspendedAnim.map((s) => `${s.enemyId}:${s.skillId} ${s.need}`).join(', ')}]` : ''}`
  + `; no move ${rep.noMove.length}; invented copies dropped ${rep.inventedDropped.length}`;

// the default options of the generator: story ids (make-enemy-oltre.js sources), original attack ids, served animations
function defaultOptions(enemies, origRows) {
  const motion = require('./enemy-motion-fix');
  const oltre = require('./make-enemy-oltre');
  const src = fs.existsSync(oltre.SOURCES_PATH) ? JSON.parse(fs.readFileSync(oltre.SOURCES_PATH, 'utf8')).sources || {} : {};
  return { storyIds: new Set(Object.keys(src).map(Number)), origIds: new Set((origRows || []).map((r) => r.enemyAttackId)), origRows: origRows || [],
    anims: motion.servedAnims(), motionOk: new Set() };
}

module.exports = { DONOR_DIR, leading, donorEntries, readDonor, needAnim, animOk, applyDonorCounters, defaultOptions, summary };

if (require.main === module) {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, 'master_data'));
  const ep = path.join(dir, 'enemy.json'), ap = path.join(dir, 'enemyAttack.json');
  const enemies = JSON.parse(fs.readFileSync(ep, 'utf8'));
  const atts = JSON.parse(fs.readFileSync(ap, 'utf8'));
  const fix = require('./enemy-attack-fix');
  const motion = require('./enemy-motion-fix');
  const orig = fix.readOrig(undefined, [...require('./make-event-enemies').attackRows(), ...motion.attackRows(motion.readOriginalMoves()),
    ...(require('./enemy-mechanics').readTable().rows || [])]);
  const donor = readDonor();
  if (!donor) { console.log(`enemy-counters-2021: no donor master in ${DONOR_DIR}, nothing changed`); process.exit(0); }
  const e0 = JSON.stringify(enemies), a0 = JSON.stringify(atts);
  const rep = applyDonorCounters(enemies, atts, donor, defaultOptions(enemies, orig));
  if (JSON.stringify(enemies) !== e0) fs.writeFileSync(ep, JSON.stringify(enemies));
  if (JSON.stringify(atts) !== a0) fs.writeFileSync(ap, JSON.stringify(atts));
  if (process.env.KHUX_REPORT) fs.writeFileSync(process.env.KHUX_REPORT, JSON.stringify(rep, null, 1));
  console.log(summary(rep));
}
