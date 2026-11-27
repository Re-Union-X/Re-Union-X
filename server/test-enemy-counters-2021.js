// Story-enemy counters and counter moves from the donated 2021 WW master (enemy-counters-2021.js, I-207, user 27-11):
//   node server/test-enemy-counters-2021.js [master folder]
// The unit part always runs; the donor part (the 3 counters that differed from the wiki, a suspended move restored) and the
// master part need the private donor master (KHUX_DONOR_MASTER), otherwise they are skipped.
'use strict';
const fs = require('fs'); const path = require('path');
const c21 = require('./enemy-counters-2021');
const errors = []; const check = (ok, msg) => { if (!ok) errors.push(msg); };
const U = (e) => JSON.stringify([e.validUrgency, e.urgency, e.urgencyValue, e.urgencyFrequency, e.urgencySkillId]);

// 1. leading elements: only the first n values count, the rest (junk past the read length) becomes 0, our length is kept
check(JSON.stringify(c21.leading([2, 0, 10000, 0, 20000, 0], 1, 3)) === '[2,0,0]', `leading 1/3 ${c21.leading([2, 0, 10000, 0, 20000, 0], 1, 3)}`);
check(JSON.stringify(c21.leading([5, 2, 150000, 0, 375000, 0], 2, 3)) === '[5,2,0]', 'leading 2/3');
check(JSON.stringify(c21.leading([3, 1, 2, 9, 9, 9], 3, 0)) === '[3,1,2]', 'leading 3 on an empty array: at least n');
check(JSON.stringify(c21.leading(undefined, 0, 3)) === '[0,0,0]', 'leading 0');
check(c21.donorEntries({ validUrgency: 2, urgency: [2, 6, 1, 0, 1, 0], urgencyValue: [8, 0, 1, 0, 1, 0], urgencyFrequency: [0, 0, 1, 0, 1, 0],
  urgencySkillId: [21305, 21320, 1, 0, 1, 0] }).map((x) => x.skillId).join() === '21305,21320', 'donorEntries cuts at validUrgency');
check(c21.donorEntries({ validUrgency: 9, urgency: [] }).length === 0, 'donorEntries: corrupt validUrgency (>6) gives none');

// 2. merge on synthetic tables
const att = (id, o = {}) => ({ enemyAttackId: id, name: 'Attack', attackMotion: 1, hitEffect: 1001, attackTarget: 0, power: 10000, hitCount: 1, ...o });
const mk = (id, displayId, u = {}) => ({ enemyId: id, name: `E${id}`, displayId, validSkill: 1, skillId: [10, 0, 0, 0], validUrgency: 0,
  urgency: [0, 0, 0], urgencyValue: [0, 0, 0], urgencyFrequency: [0, 0, 0], urgencySkillId: [0, 0, 0], ...u });
const donor = {
  enemies: new Map([
    [1, { enemyId: 1, validUrgency: 1, urgency: [2, 0, 10000, 0, 20000, 0], urgencyValue: [3, 0, 10000, 0, 20000, 0], urgencyFrequency: [1, 0, 10000, 0, 20000, 0], urgencySkillId: [500, 0, 10000, 0, 20000, 0] }],
    [2, { enemyId: 2, validUrgency: 2, urgency: [5, 2, 150000, 0, 0, 0], urgencyValue: [0, 1, 150000, 0, 0, 0], urgencyFrequency: [0, 0, 150000, 0, 0, 0], urgencySkillId: [501, 502, 150000, 0, 0, 0] }],
    [3, { enemyId: 3, validUrgency: 1, urgency: [3, 0, 7, 7, 7, 7], urgencyValue: [20, 0, 7, 7, 7, 7], urgencyFrequency: [0, 0, 7, 7, 7, 7], urgencySkillId: [503, 0, 7, 7, 7, 7] }],
    [4, { enemyId: 4, validUrgency: 1, urgency: [2, 0, 0, 0, 0, 0], urgencyValue: [4, 0, 0, 0, 0, 0], urgencyFrequency: [0, 0, 0, 0, 0, 0], urgencySkillId: [500, 0, 0, 0, 0, 0] }],
    [9, { enemyId: 9, validUrgency: 1, urgency: [2, 0, 0, 0, 0, 0], urgencyValue: [9, 0, 0, 0, 0, 0], urgencyFrequency: [0, 0, 0, 0, 0, 0], urgencySkillId: [500, 0, 0, 0, 0, 0] }],
  ]),
  attacks: new Map([
    [500, att(500, { attackMotion: 2, attackTarget: 3, power: 0, heal: 3000, hitEffect: 2014 })],
    [501, att(501, { attackMotion: 2, attackTarget: 4, power: 0, hitEffect: 2099 })],
    [502, att(502, { attackTarget: 0, power: 2500, poison: 10000 })],
    [503, att(503, { attackMotion: 2, power: 12500 })],
  ]),
};
const rows = [
  // 1: counter differs from ours (wiki 2/2, frequency 0) -> donor 2/3, frequency 1, own move 500
  mk(1, 100, { validUrgency: 1, urgency: [2, 0, 0], urgencyValue: [2, 0, 0], urgencySkillId: [992070010, 0, 0] }),
  // 2: suspended (validUrgency 0) -> two entries, 501 and 502 (502 missing from our attacks: imported from the donor)
  mk(2, 200),
  // 3: its move needs atkSp, which model 300 lacks -> stays suspended and listed
  mk(3, 300),
  // 4: our array has length 0 -> at least 3 long
  { ...mk(4, 100), urgency: [], urgencyValue: [], urgencyFrequency: [], urgencySkillId: [] },
  // 9: not a story row -> untouched
  mk(9, 100),
];
const atts = [att(10), att(601, { name: 'Powerful Attack', power: 17500, display: 1, hitEffect: 1004 }),
  // 500 is a template stub of ours (not an original row): replaced by the donor row
  att(500, { name: 'Powerful Attack', power: 17500, display: 1, hitEffect: 1004 }),
  att(992070010, { attackTarget: 3, heal: 3000 }), att(992070009, { heal: 1 })];
const opts = { storyIds: new Set([1, 2, 3, 4]), origIds: new Set([10, 601]), servedHits: new Set([1001, 2014]),
  anims: new Set(['100/atkSp', '200/atkSp']) };
const rep = c21.applyDonorCounters(rows, atts, donor, opts);
const byId = new Map(rows.map((e) => [e.enemyId, e]));
const aById = () => new Map(atts.map((a) => [a.enemyAttackId, a]));
check(U(byId.get(1)) === '[1,[2,0,0],[3,0,0],[1,0,0],[500,0,0]]', `row 1 (differing counter) ${U(byId.get(1))}`);
check(U(byId.get(2)) === '[2,[5,2,0],[0,1,0],[0,0,0],[501,502,0]]', `row 2 (suspended restored) ${U(byId.get(2))}`);
check(U(byId.get(3)) === '[0,[0,0,0],[0,0,0],[0,0,0],[0,0,0]]', `row 3 (no atkSp: stays suspended) ${U(byId.get(3))}`);
check(byId.get(4).urgency.length === 3 && byId.get(4).validUrgency === 1, `row 4 length ${U(byId.get(4))}`);
check(U(byId.get(9)) === '[0,[0,0,0],[0,0,0],[0,0,0],[0,0,0]]', 'row 9 (not story) untouched');
const A = aById();
check(A.get(500).heal === 3000 && A.get(500).attackTarget === 3 && A.get(500).power === 0 && A.get(500).attackMotion === 2
  && A.get(500).hitEffect === 2014, `stub 500 replaced by the donor row ${JSON.stringify(A.get(500))}`);
check(A.get(502) && A.get(502).poison === 10000 && A.get(502).power === 2500, 'missing move 502 imported from the donor');
check(A.get(501) && A.get(501).hitEffect === 1004, `501: unserved hit effect keeps the template one ${A.get(501) && A.get(501).hitEffect}`);
check(!A.has(992070010) && !A.has(992070009), 'unreferenced invented copies 99207xxxx dropped');
check(!A.has(503), 'the move of a suspended entry is not imported');
check(A.get(10).power === 10000 && A.get(601).power === 17500, 'original rows untouched');
check(rep.rows === 4 && rep.suspendedAnim.length === 1 && rep.suspendedAnim[0].enemyId === 3 && rep.suspendedAnim[0].need === '300/atkSp',
  `report ${JSON.stringify(rep)}`);
check(rep.changed === 3 && rep.filled === 2, `changed/filled ${rep.changed}/${rep.filled}`);
const snapR = JSON.stringify(rows), snapA = JSON.stringify(atts);
c21.applyDonorCounters(rows, atts, donor, opts);
check(JSON.stringify(rows) === snapR && JSON.stringify(atts) === snapA, 'not idempotent');
// a 99207xxxx copy still cited by some enemy is kept
const atts2 = [att(992070001)], rows2 = [mk(77, 100, { skillId: [992070001, 0, 0, 0] })];
c21.applyDonorCounters(rows2, atts2, donor, { ...opts, storyIds: new Set() });
check(atts2.length === 1, 'cited 99207xxxx kept');

// 3. the real donor: the 3 counters that differed from the wiki tables, and a suspended move restored
const real = c21.readDonor();
if (!real) console.log('(donor master not found: donor and master parts skipped)');
else {
  const d = (id) => c21.donorEntries(real.enemies.get(id)).map((x) => [x.urgency, x.value, x.skillId]);
  check(d(10227).length === 1 && d(10227)[0][0] === 3 && d(10227)[0][1] === 50, `Wily Bandit 10227 donor ${JSON.stringify(d(10227))}`);
  check(JSON.stringify(d(11534).map((x) => x.slice(0, 2))) === '[[5,0],[2,1]]', `Barrier Master 11534 donor ${JSON.stringify(d(11534))}`);
  check(d(1612111505)[0][0] === 3 && d(1612111505)[0][1] === 50, `Werewolf 1612111505 donor ${JSON.stringify(d(1612111505))}`);
  check(real.attacks.has(1560040) && real.attacks.has(1561030), 'donor has the suspended moves 1560040 / 1561030');

  // 4. the served master (after the regeneration): every served story row carries the donor counters (leading elements),
  // except the entries whose move animation is not served (listed by the generator)
  const dir = path.resolve(process.argv[2] || path.join(__dirname, 'master_data'));
  const master = JSON.parse(fs.readFileSync(path.join(dir, 'enemy.json'), 'utf8'));
  const mAtt = new Map(JSON.parse(fs.readFileSync(path.join(dir, 'enemyAttack.json'), 'utf8')).map((a) => [a.enemyAttackId, a]));
  const src = JSON.parse(fs.readFileSync(require('./make-enemy-oltre').SOURCES_PATH, 'utf8')).sources;
  const story = master.filter((e) => src[e.enemyId] && real.enemies.has(e.enemyId));
  const anims = require('./enemy-motion-fix').servedAnims();
  let bad = [], kept = 0;
  for (const e of story) {
    const want = c21.donorEntries(real.enemies.get(e.enemyId)).filter((x) => c21.animOk(e.displayId, mAtt.get(x.skillId) || real.attacks.get(x.skillId), anims));
    const got = c21.donorEntries(e);
    if (JSON.stringify(want) !== JSON.stringify(got)) bad.push(e.enemyId);
    kept += got.length;
    for (const x of got) if (!mAtt.has(x.skillId)) bad.push(`${e.enemyId}:move ${x.skillId} missing`);
  }
  check(bad.length === 0, `story rows not equal to the donor (regenerate the master first): ${bad.length} e.g. ${bad.slice(0, 5)}`);
  check(story.length === 312 && kept > 150, `story rows ${story.length}, counter entries ${kept}`);
  const by = new Map(master.map((e) => [e.enemyId, e]));
  const u0 = (id) => { const e = by.get(id) || {}; return [e.validUrgency, (e.urgency || [])[0], (e.urgencyValue || [])[0]].join(); };
  check(u0(10227) === '1,3,50', `Wily Bandit served ${u0(10227)}`);
  check(u0(1612111505) === '1,3,50', `Werewolf served ${u0(1612111505)}`);
  check(by.get(1502) && by.get(1502).urgencySkillId[0] === 1502020 && mAtt.get(1502020).attackTarget === 3, 'Green Requiem: own heal 1502020');
  check(![...mAtt.keys()].some((id) => id >= 992070001 && id <= 992070099 && !master.some((e) => [...(e.skillId || []), ...(e.urgencySkillId || [])].includes(id))),
    'invented 99207xxxx copies left unreferenced');
}

if (errors.length) { console.log(`ERRORS (${errors.length}):\n  ` + errors.join('\n  ')); process.exit(1); }
console.log('OK: enemy counters 2021');
