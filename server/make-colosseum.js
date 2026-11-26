#!/usr/bin/env node
// Coliseum master rows (Coliseum Part 1 Task 1; plan docs/superpowers/plans/2026-11-25-coliseum-part1.md, spec
// docs/superpowers/specs/2026-11-25-coliseum-design.md, client facts docs/notes/coliseum.md).
// The four WW seasons 2016-04 .. 2016-07 = 1.1.3 colosseumStageId 800, 900, 1000, 1100, every value from the 1.1.3 master
// (KHUX_COLOSSEUM_SRC, default the thethiny 1.1.3 data folder, outside the repo; without it nothing is written):
// - colosseumStage (one per season) and colosseum (its tier rows head..term; the trailing 0-round end-marker row of each
//   season lies outside head..term, the client never reads it, so it is left out);
// - stage: the season's 10 round stages, stageKind 3, world 5, map "Coliseum", stageId YYYYMMNN (cl_stg<stageId>.bin),
//   id 81001+ as in 1.1.3;
// - enemy: 1.1.3 Coliseum variants (ids 20000-29999) missing from our master only (today none: the 111 rows are there);
// - ranking (category 4, ids 4009-4012) + rankingReward (its brackets, ids = the ranking's startRank..endRank): the client's
//   «Rewards» button crashes for a season whose rankingId has no rankingReward rows;
// - sphere / sphereArray / sphereMasu: the 1.1.3 Coliseum boards (type 3) of the season (SEASON_BOARDS), arryId and masuId
//   renumbered to the sphereBoardId (the 1.1.3 3200001+/4200001+ ids fall in the Raid Boards' range 3000000-3999999);
// - evStage 6000: the Coliseum Catalog banner of the Events tab (Task 6, CATALOG_EV), not a 1.1.3 row.
// Every array is cut to its valid* count, the rest zeroed (the 1.1.3 array tails hold decoder garbage), and padded to the
// 4.3.1 schema length (recon/out/master_types_ww431.json). Dates as make-raid.js writes its rows (START / END): the server
// decides which season is live (story clock or kept season), the original month stays in SEASONS.
//
// Score thresholds (the ranking rewards become thresholds on the original metric, the last round cleared as a global round
// number = rounds of all earlier tiers + round; ranked-rewards.js shape, lowest bracket first). Brackets and rewards: the
// 1.1.3 rankingReward rows of rankings 4009-4012 (2016-04: 4 brackets to rank 300,000; 2016-05: 2 brackets to 10,000,000,
// the same Moogle for everyone ranked, as the wiki says; 2016-06 and 2016-07: 8 brackets to 500,000).
// Cutoffs: no cutoff of these four months is on record. The only WW 2016 border data (private dossier COLISEUM.md,
// «Ranking (item 4)», footage of the WW 2016-08 ranking, same 10-tier structure as 2016-05..07, 110 rounds before the
// endless Tier 10): Top 10 from T10 184/999 (rank 1, global round 294) to T10 147/999 (rank 10, round 257); ranks
// 38,079-38,081 at «Tier 9 10/10» (round 110). Every value below is INTERPOLATED (spec «Left to the builder»): log-linear
// in the rank through (rank 10, round 257) and (rank 38,080, round 110), i.e.
//   round(rank) = 257 - 41.054 x (log10(rank) - 1)   (cutoffRound), at the bracket's last rank, never below 1 round;
// a season with another number of rounds before its endless tier is shifted by the difference (2016-04: 70, so -40); a
// bracket ending at rank 1,000,000 or beyond (2016-05) was open to every ranked player: 1 round (ranked = one round cleared).
//   2016-04 (800, 70 finite rounds):  50,001-300,000 -> 33 | 10,001-50,000 -> 65 | 1,001-10,000 -> 94 | 1-1,000 -> 135
//   2016-05 (900):                     5,000,001-10,000,000 -> 1 | 1-5,000,000 -> 1 (every ranked player, as originally)
//   2016-06 (1000) and 2016-07 (1100): 250,001-500,000 -> 64 | 100,001-250,000 -> 76 | 50,001-100,000 -> 93 |
//     10,001-50,000 -> 105 | 2,501-10,000 -> 134 | 1,001-2,500 -> 159 | 101-1,000 -> 175 | 1-100 -> 216
// (label «interpolated»; to be declared in the Coliseum notice).
//
// Wired in make-game-tables.js after make-events / make-campaigns, before the avatar boards. KHUX_COLOSSEUM=0 turns it off.
//   node server/make-colosseum.js [master folder]
'use strict';

const fs = require('fs');
const path = require('path');

// the 1.1.3 data folder when neither the command line (argv[3]) nor KHUX_COLOSSEUM_SRC names one: the local default of the other
// generators (make-raid.js DEFAULT_2016, the same folder); a missing folder only skips the Coliseum rows
const DEFAULT_2016 = 'D:\\Progetto_Restauro_KH_UX\\external\\thethiny_2026-10-13\\KHUx-Server\\data';
const START = '2015-01-01 00:00:00', END = '2030-12-31 23:59:59';
const SEASONS = [
  { month: '2016-04', colosseumStageId: 800 },
  { month: '2016-05', colosseumStageId: 900 },
  { month: '2016-06', colosseumStageId: 1000 },
  { month: '2016-07', colosseumStageId: 1100 },
];
// type-3 boards of each season: 1.1.3 sphere rows (their startDatetime month, checked), = the wiki board list (6★ Cid
// 04/16; 6★ Scrooge + Tier 10 Bonus 3390 05/16; KH Chip M/F + Tier 10 Bonus 3090 06/16; Moogle M/F + Tier 10 Bonus 07/16)
const SEASON_BOARDS = { 800: [2200001], 900: [2200002, 2200023], 1000: [2210029, 2210030, 2210031], 1100: [2210033, 2210034, 2210035] };
// the «Tier N Bonus» boards (1.1.3 boardName): unlocked on reaching Tier N of their season (client text «Unlocked a Coliseum
// Board!»; routes-colosseum-boards.js hands them out from then on). test-colosseum-boards.js checks it against the board names
const BONUS_TIER = { 2200023: 10, 2210031: 10, 2210035: 10 };
// Board card pictures img/sphere_incentive/<sphereBoardId>.png (client Select_Base layer, docs/notes/coliseum.md «Board card
// pictures»): b16 = the worldwide 2016 file of the same id (6★ Cid); every other served board = the khuxwiki «Preview - <board>»
// picture placed on the 306x306 card where the original board screenshot draws it (native size, no resampling; private files
// in --loc img/sphere_incentive_coli/). The 2016 bundle 2200002 (Scrooge alone) is not what the worldwide board showed: the
// screenshot has Scrooge with Cid, Chip and Dale, so 2200002 uses the wiki picture too. Written to game_data/colosseum_board_art.tsv
// for the served boards, imported by build-resources.ps1 like the raid / event board cards.
const BOARD_ART = { 2200001: 'b16' };
function artLines(boardIds) {
  const head = ['# Coliseum Board card pictures, written by server/make-colosseum.js (BOARD_ART).',
    '# Columns as in originals.tsv. b16 = the worldwide 2016 file of the same id; loc = the khuxwiki card picture placed as on the original board screenshot.'];
  return [...head, ...boardIds.map((id) => (BOARD_ART[id] === 'b16'
    ? `img/sphere_incentive/${id}.png\tb16`
    : `img/sphere_incentive/${id}.png\tloc\t=img/sphere_incentive_coli/${id}.png`))].join('\n') + '\n';
}
// Coliseum Catalog banner (Task 6; user 25-11: the first catalog banner of the Events tab): evStage CATALOG_EV, eventType 0,
// Details -> CATALOG_URL (colosseum-pages.js), a tap opens the Training Grounds quest CATALOG_STAGE of make-special (the stage of
// the Raid and Event Catalog banners too); the card game_data/colosseum_img/6000.png (recon/tools/make_special_banners.py
// --section colosseum). After a change of the cards bump COLOSSEUM_IMG_VERSION, then the master revision.
const CATALOG_EV = 6000, CATALOG_STAGE = 970000, CATALOG_URL = '/web/colosseum/catalog', COLOSSEUM_IMG_VERSION = 2;
const RANGES = {
  colosseumStage: ['colosseumStageId', 1, 9999], colosseum: ['colosseumId', 1, 99999],
  stage: ['id', 81001, 81999], // stageKind 3, stageId YYYYMMNN
  ranking: ['rankingId', 4000, 4099], rankingReward: ['rankingRewardId', 30000, 39999],
  sphere: ['sphereBoardId', 2200001, 2299999], sphereArray: ['arryId', 2200001, 2299999], sphereMasu: ['masuId', 2200001, 2299999],
};
const ENEMY_RANGE = [20000, 29999]; // Coliseum enemy variants (20000 + base id, later 21xxx/22xxx)
const TABLES = ['colosseumStage', 'colosseum', 'stage', 'enemy', 'ranking', 'rankingReward', 'sphere', 'sphereArray', 'sphereMasu'];

// threshold curve (see the comment block above)
const TOP_RANK = 10, TOP_ROUND = 257, BORDER_RANK = 38080, BORDER_ROUND = 110, CURVE_FINITE = 110;
const SLOPE = (TOP_ROUND - BORDER_ROUND) / (Math.log10(BORDER_RANK) - Math.log10(TOP_RANK));
const cutoffRound = (rank, finiteRounds) =>
  Math.max(1, Math.round(TOP_ROUND - SLOPE * (Math.log10(rank) - Math.log10(TOP_RANK)) - (CURVE_FINITE - finiteRounds)));

let schemaCache = null;
const schema = () => schemaCache || (schemaCache = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'recon', 'out', 'master_types_ww431.json'), 'utf8')));

// a row of the 4.3.1 schema from a 1.1.3 row: arrays cut at their valid count (valid: {field: n}) and padded to the
// schema length with 0 / '', fields missing from the 1.1.3 row from dflt or 0 / ''
function schemaRow(table, r, valid = {}, dflt = {}) {
  const out = {};
  for (const [f, t] of schema()[table]) {
    const arr = /\[(\d+)\]$/.exec(t), str = t.startsWith('string'), zero = str ? '' : 0;
    if (arr) {
      const n = +arr[1], keep = valid[f] === undefined ? n : valid[f], src = Array.isArray(r[f]) ? r[f] : [];
      out[f] = Array.from({ length: n }, (_, i) => (i < keep && i < src.length ? src[i] : zero));
    } else out[f] = r[f] !== undefined ? r[f] : dflt[f] !== undefined ? dflt[f] : zero;
  }
  return out;
}
const validFor = (fields, n) => Object.fromEntries(fields.map((f) => [f, n || 0]));

const REWARD4 = ['rewardType', 'rewardId', 'rewardAssignType', 'rewardSkillId', 'rewardSkillLv', 'rewardNum'];
const STAGE_REWARD = ['stageRewardType', 'stageRewardId', 'stageRewardAssignType', 'stageRewardSkillId', 'stageRewardSkillLv', 'stageRewardNum'];
const RANK_REWARD = ['type', 'id', 'skillType', 'skillId', 'skillLv', 'burstUpperNumber', 'num'];
const STAGE_VALID = [
  ['validBeforeDrama', ['beforeDramaId', 'beforeDramaType']], ['validAfterDrama', ['afterDramaId', 'afterDramaType']],
  ['validClearGetItem', ['clearGetItemType', 'clearGetItemId', 'clearGetAssignSkillType', 'clearGetAssignSkillId', 'clearGetAssignSkillLv', 'clearGetItemNum']],
  ['validSubmission', ['submissionRequire', 'submissionName', 'submissionDataType', 'submissionIdType', 'submissionId', 'submissionNum', 'submissionRewardType',
    'submissionItemId', 'submissionSkillType', 'submissionSkillId', 'submissionSkillLv', 'submissionItemNum']],
];
const ENEMY_VALID = [
  ['validGrowth', ['baseLv', 'hp', 'attack', 'defense', 'exp', 'money', 'raidPoint', 'lux', 'score']],
  ['validUrgency', ['urgency', 'urgencyValue', 'urgencyFrequency', 'urgencySkillId']],
  ['validSkill', ['skillId', 'skillRequire', 'skillRequireArg', 'skillOdds']],
];
const validMap = (r, spec) => Object.assign({}, ...spec.map(([k, fields]) => validFor(fields, r[k])));
// fields the 1.1.3 stage rows lack, as our other stage rows have them
const STAGE_DEFAULTS = { hardmodeName: 'strDummy', hardmodeComparison: 1 };

const byKey = (key) => (a, b) => a[key] - b[key];

function tierRow(r) {
  const row = schemaRow('colosseum', r, validFor(REWARD4, r.validReward));
  if (!row.validStageReward) for (const f of STAGE_REWARD) row[f] = 0;
  return row;
}

// brackets lowest first (ranked-rewards.js order), rewards cut at validReward
function bracketsOf(rewardRows) {
  return [...rewardRows].sort((a, b) => b.startRank - a.startRank).map((r) => ({
    startRank: r.startRank, endRank: r.endRank,
    rewards: Array.from({ length: r.validReward }, (_, i) => ({ type: r.type[i], id: r.id[i], num: r.num[i], skillType: r.skillType[i], skillId: r.skillId[i], skillLv: r.skillLv[i] })),
  }));
}
// thresholds of a season (finiteRounds = rounds before its endless last tier), one per bracket, lowest first
// a bracket reaching EVERYONE (2016-05: ranks to 5,000,000 and 10,000,000) was open to every ranked player: one round
const EVERYONE = 1000000;
const thresholdsOf = (brackets, finiteRounds) => brackets.map((b) => ({ startRank: b.startRank, endRank: b.endRank,
  score: b.endRank >= EVERYONE ? 1 : cutoffRound(b.endRank, finiteRounds), label: 'interpolated' }));
// {brackets, thresholds} of a season from its tier rows and the rankingReward rows of its ranking (master or 1.1.3)
function rankedOf(tierRows, rewardRows) {
  const tiers = [...tierRows].sort(byKey('round'));
  const finite = tiers.slice(0, -1).reduce((n, t) => n + t.arrivalStageCount, 0);
  const brackets = bracketsOf(rewardRows);
  return { brackets, thresholds: thresholdsOf(brackets, finite) };
}

// Pure: src = the 1.1.3 tables {colosseumStage, colosseum, stage, enemy, ranking, rankingReward, sphere, sphereArray,
// sphereMasu} + masterEnemyIds (ids already in our master). -> rows per table + ranked {colosseumStageId: {brackets, thresholds}}.
function seasonRows(src, seasons = SEASONS) {
  const out = Object.fromEntries(TABLES.map((t) => [t, []]));
  out.ranked = {};
  const find = (table, key, id, what) => {
    const r = (src[table] || []).find((x) => x[key] === id);
    if (!r) throw new Error(`colosseum: ${what}: 1.1.3 ${table} ${id} missing`);
    return r;
  };
  for (const s of seasons) {
    const id = s.colosseumStageId;
    const cs = find('colosseumStage', 'colosseumStageId', id, s.month);
    const row = schemaRow('colosseumStage', cs, { stageId: cs.validStage });
    Object.assign(row, { openDate: START, closeDate: END, rankingCloseDate: END });
    out.colosseumStage.push(row);
    const tiers = (src.colosseum || []).filter((t) => t.colosseumStageId === id && t.colosseumId >= cs.headColosseumId && t.colosseumId <= cs.termColosseumId)
      .sort(byKey('colosseumId'));
    if (tiers.length !== cs.termColosseumId - cs.headColosseumId + 1) throw new Error(`colosseum: ${s.month}: tier rows ${cs.headColosseumId}-${cs.termColosseumId} incomplete`);
    const tierRows = tiers.map(tierRow);
    out.colosseum.push(...tierRows);
    for (const stageId of row.stageId.slice(0, cs.validStage)) {
      const st = find('stage', 'stageId', stageId, s.month);
      if (st.stageKind !== 3) throw new Error(`colosseum: ${s.month}: stage ${stageId} is not a Coliseum stage`);
      out.stage.push(schemaRow('stage', st, validMap(st, STAGE_VALID), STAGE_DEFAULTS));
    }
    const rk = find('ranking', 'rankingId', cs.rankingId, s.month);
    out.ranking.push(Object.assign(schemaRow('ranking', rk), { startDatetime: START, endDatetime: END }));
    const rewards = (src.rankingReward || []).filter((r) => r.rankingRewardId >= rk.startRank && r.rankingRewardId <= rk.endRank)
      .map((r) => schemaRow('rankingReward', r, validFor(RANK_REWARD, r.validReward)));
    if (!rewards.length) throw new Error(`colosseum: ${s.month}: ranking ${rk.rankingId} has no rankingReward rows (the client's Rewards button would crash)`);
    out.rankingReward.push(...rewards);
    out.ranked[id] = rankedOf(tierRows, rewards);
    for (const boardId of SEASON_BOARDS[id] || []) {
      const b = find('sphere', 'sphereBoardId', boardId, s.month);
      if (b.type !== 3 || String(b.startDatetime).slice(0, 7) !== s.month) throw new Error(`colosseum: board ${boardId} (type ${b.type}, ${b.startDatetime}) is not a Coliseum board of ${s.month}`);
      const arr = find('sphereArray', 'arryId', b.arryId, `board ${boardId}`), masu = find('sphereMasu', 'masuId', b.masuId, `board ${boardId}`);
      out.sphere.push(Object.assign(schemaRow('sphere', b), { arryId: boardId, masuId: boardId, detailUrl: '', startDatetime: START, endDatetime: END }));
      out.sphereArray.push(Object.assign(schemaRow('sphereArray', arr), { arryId: boardId }));
      out.sphereMasu.push(Object.assign(schemaRow('sphereMasu', masu), { masuId: boardId, sphereBoardId: boardId }));
    }
  }
  const have = new Set(src.masterEnemyIds || []);
  for (const e of [...(src.enemy || [])].sort(byKey('enemyId'))) {
    if (e.enemyId < ENEMY_RANGE[0] || e.enemyId > ENEMY_RANGE[1] || have.has(e.enemyId)) continue;
    have.add(e.enemyId);
    out.enemy.push(schemaRow('enemy', e, validMap(e, ENEMY_VALID)));
  }
  for (const [t, [key]] of Object.entries(RANGES)) out[t].sort(byKey(key));
  return out;
}

const rowsOf = (text) => { const r = JSON.parse(text); return Array.isArray(r) ? r : Object.values(r)[0]; };
// the 1.1.3 tables of a folder, null when one is not readable
function readSource(dir) {
  try { return Object.fromEntries(TABLES.map((t) => [t, rowsOf(fs.readFileSync(path.join(dir, `${t}.json`), 'utf8'))])); } catch { return null; }
}
// a missing master table is empty; a corrupt one stops the run (it would be rewritten with our rows only)
function readMaster(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  try { return JSON.parse(text); } catch (e) { throw new Error(`colosseum: ${file} is corrupt: ${e.message}`); }
}

// the Coliseum Catalog banner row of evStage (make-raid.js evStageRow, as the Raid / Event Catalog banners), null without the
// Training Grounds stage in the master
function catalogEvStage(masterStage) {
  if (!(masterStage || []).some((r) => r.stageId === CATALOG_STAGE)) return null;
  const { evStageRow } = require('./make-raid');
  const row = evStageRow(CATALOG_EV, [CATALOG_STAGE], { eventType: 0, detailUrl: CATALOG_URL });
  row.bannerUrl = `/web/colosseum/img/v${COLOSSEUM_IMG_VERSION}/${CATALOG_EV}.png`;
  return row;
}

// Drops our previous rows (everything inside RANGES; a stage row there must be a Coliseum one), appends the season rows.
// opts: dir (the 1.1.3 data folder; else KHUX_COLOSSEUM_SRC, else DEFAULT_2016), src (the 1.1.3 tables, tests), seasons. Returns the
// seasonRows output, null when off or without the 1.1.3 data.
function patch(masterDir, opts = {}) {
  if (process.env.KHUX_COLOSSEUM === '0') { console.log('colosseum: off (KHUX_COLOSSEUM=0)'); return null; }
  const dir = opts.dir || process.env.KHUX_COLOSSEUM_SRC || DEFAULT_2016;
  const src = opts.src || readSource(dir);
  if (!src) { console.warn(`colosseum: skipped, the 1.1.3 master under ${dir} is not readable: no Coliseum rows`); return null; }
  const master = Object.fromEntries(TABLES.map((t) => [t, readMaster(path.join(masterDir, `${t}.json`))]));
  for (const [t, [key, lo, hi]] of Object.entries(RANGES)) {
    master[t] = master[t].filter((r) => {
      const mine = r[key] >= lo && r[key] <= hi;
      if (mine && t === 'stage' && r.stageKind !== 3) throw new Error(`colosseum: stage row id ${r[key]} (stageKind ${r.stageKind}) is inside our id range ${lo}-${hi} and is not ours`);
      return !mine;
    });
  }
  const out = seasonRows({ ...src, masterEnemyIds: master.enemy.map((r) => r.enemyId) }, opts.seasons || SEASONS);
  const stageIds = new Set(out.stage.map((r) => r.stageId));
  const clash = master.stage.find((r) => stageIds.has(r.stageId));
  if (clash) throw new Error(`colosseum: stageId ${clash.stageId} already in the master (id ${clash.id})`);
  for (const t of TABLES) fs.writeFileSync(path.join(masterDir, `${t}.json`), JSON.stringify([...master[t], ...out[t]]));
  // evStage: our banner row replaced (none without the Training Grounds stage), the other rows kept
  const ev = readMaster(path.join(masterDir, 'evStage.json')).filter((r) => r.eventStageId !== CATALOG_EV);
  const banner = catalogEvStage(master.stage);
  fs.writeFileSync(path.join(masterDir, 'evStage.json'), JSON.stringify(banner ? [...ev, banner] : ev));
  if (opts.artFile) fs.writeFileSync(opts.artFile, artLines(out.sphere.map((r) => r.sphereBoardId)));
  if (!banner) console.warn(`colosseum: no Coliseum Catalog banner: the Training Grounds stage ${CATALOG_STAGE} is not in the master (make-special first)`);
  console.log(`colosseum: ${out.colosseumStage.length} seasons (${(opts.seasons || SEASONS).map((s) => s.month).join(', ')}): +${out.colosseum.length} tiers, +${out.stage.length} stages, `
    + `+${out.enemy.length} enemies, +${out.ranking.length} rankings / ${out.rankingReward.length} brackets, +${out.sphere.length} boards`);
  return out;
}

// node make-colosseum.js [master_dir] [1.1.3 data folder]
if (require.main === module) patch(process.argv[2] || path.join(__dirname, 'master_data'), { dir: process.argv[3] || undefined });

module.exports = { SEASONS, SEASON_BOARDS, BONUS_TIER, BOARD_ART, artLines, CATALOG_EV, CATALOG_STAGE, CATALOG_URL, COLOSSEUM_IMG_VERSION, catalogEvStage, RANGES, DEFAULT_2016, START, END, seasonRows, patch, readSource, cutoffRound, bracketsOf, thresholdsOf, rankedOf };
