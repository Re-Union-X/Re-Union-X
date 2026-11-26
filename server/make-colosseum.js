#!/usr/bin/env node
// Coliseum master rows (Coliseum Part 1 Task 1; plan docs/superpowers/plans/2026-11-25-coliseum-part1.md, spec
// docs/superpowers/specs/2026-11-25-coliseum-design.md, client facts docs/notes/coliseum.md).
// The four WW seasons 2016-04 .. 2016-07 = 1.1.3 colosseumStageId 800, 900, 1000, 1100, every value from the 1.1.3 master
// (KHUX_COLOSSEUM_SRC, default the thethiny 1.1.3 data folder, outside the repo; without it nothing is written):
// - colosseumStage (one per season) and colosseum (its tier rows head..term; the trailing 0-round end-marker row of each
//   season lies outside head..term, the client never reads it, so it is left out);
// - stage: the season's 10 round stages, stageKind 3, world 5, map "Coliseum", stageId YYYYMMNN (cl_stg<stageId>.bin),
//   id 81001+ as in 1.1.3;
// - enemy: 1.1.3 Coliseum variants (ids 20000-29999) missing from our master only (today none: the 111 rows are there), and
//   (Part 2 Task 3, enemyRows) every id the served stages use missing from our master (today none: 93 ids over 130 stages);
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
// Coliseum Part 2 (plan docs/superpowers/plans/2026-11-26-coliseum-part2.md, Task 1): the nine WW seasons 2016-08 .. 2017-04.
// - 2016-08 .. 2016-10 = 1.1.3 rows 1200, 1300, 1400 (source '113'); 2016-11 .. 2017-04 = 1500 .. 2000 from the cleaned ReLux
//   season extract (source 'relux', readRelux; KHUX_COLOSSEUM_RELUX, default DEFAULT_RELUX, outside the repo; without it only the
//   1.1.3 seasons are written). The extract is already cleaned (arrays cut, tier coins /100, rankId «...» -> «»); a type-17
//   tier reward above COIN_MAX (an x100 artefact left in) stops the run; closeDate is START / END as for every season.
// - Tiers: head..term cut after the first endless (999-round) tier, term rewritten to match: the wiki shows no tier after it
//   (2017-01 .. 2017-04 hold hidden 999-round tiers 12..14/21 in the extract, unverified, not served). 2016-11 .. 2017-04 =
//   eleven tiers (the extra 10-round Tier 10, tier coins 900; Tier 11 endless), 2016-08 .. 2016-10 ten (1.1.3).
// - Stage sets: genStages seasons (2016-08 .. 2016-11: no original WW set; the 1.1.3 sets 20160101/0201/0301 and the extract's
//   20160401 are JP sets WW did not play) serve GEN_STAGE_IDS(month) = 2116MMNN (generated files, Task 2); 2016-12 .. 2017-04
//   serve the extract's JP 4.3.1 sets 20160501 .. 20160901. Stage rows: the 1.1.3 row of the original stage when it exists
//   (1200 .. 1400 keep its id 81041 .. 81070, stageId replaced), else (no 1.1.3 row: 1500 .. 2000) the previous season's row at
//   the same set position with the next free id (81071+) and name strDummy.
// - Ranking: ReLux holds no rankingReward rows for 2016-12 .. 2018-03 (its 4019 rows are the donor's invention) and the 1.1.3
//   row 4016 points to the 4015 rows: every relux season gets its own ranking row (rankingId of its colosseumStage row; the 1.1.3
//   row when there is one, else the previous season's as template) and PROVISIONAL reward rows = the previous season's
//   brackets and rewards (2016-10, the last original WW set, the same eight bracket edges the wiki lists to 2017-04),
//   renumbered to REWARD_BASE + (rankingId - 4016) x REWARD_BLOCK so the ids stay in 30000-39999 (the original 4021 range
//   40000-40007 does not). Task 5 replaces brackets, rewards and thresholds; until then the thresholds are the curve above
//   (2016-11 .. 2017-04: 120 finite rounds, so +10 over 2016-08 .. 2016-10).
//
// Wired in make-game-tables.js after make-events / make-campaigns, before the avatar boards. KHUX_COLOSSEUM=0 turns it off.
//   node server/make-colosseum.js [master folder]
'use strict';

const fs = require('fs');
const path = require('path');

// the 1.1.3 data folder when neither the command line (argv[3]) nor KHUX_COLOSSEUM_SRC names one: the local default of the other
// generators (make-raid.js DEFAULT_2016, the same folder); a missing folder only skips the Coliseum rows
const DEFAULT_2016 = 'D:\\Progetto_Restauro_KH_UX\\external\\thethiny_2026-10-13\\KHUx-Server\\data';
// the cleaned ReLux season extract (private, outside the repo) when KHUX_COLOSSEUM_RELUX names none
const DEFAULT_RELUX = 'D:\\Progetto_Restauro_KH_UX\\private\\donations\\relux_2026-11\\verified\\coliseum_seasons.json';
// the cleaned ReLux Coliseum enemy rows (next to the season extract) when KHUX_COLOSSEUM_RELUX_ENEMIES names none
const DEFAULT_RELUX_ENEMIES = path.join(path.dirname(DEFAULT_RELUX), 'coliseum_enemies.json');
const START = '2015-01-01 00:00:00', END = '2030-12-31 23:59:59';
// source: '113' = the 1.1.3 master rows, 'relux' = the cleaned ReLux extract; genStages: the stage set is GEN_STAGE_IDS(month)
const SEASONS = [
  { month: '2016-04', colosseumStageId: 800, source: '113' },
  { month: '2016-05', colosseumStageId: 900, source: '113' },
  { month: '2016-06', colosseumStageId: 1000, source: '113' },
  { month: '2016-07', colosseumStageId: 1100, source: '113' },
  { month: '2016-08', colosseumStageId: 1200, source: '113', genStages: true },
  { month: '2016-09', colosseumStageId: 1300, source: '113', genStages: true },
  { month: '2016-10', colosseumStageId: 1400, source: '113', genStages: true },
  { month: '2016-11', colosseumStageId: 1500, source: 'relux', genStages: true },
  { month: '2016-12', colosseumStageId: 1600, source: 'relux' },
  { month: '2017-01', colosseumStageId: 1700, source: 'relux' },
  { month: '2017-02', colosseumStageId: 1800, source: 'relux' },
  { month: '2017-03', colosseumStageId: 1900, source: 'relux' },
  { month: '2017-04', colosseumStageId: 2000, source: 'relux' },
];
// generated stage sets (Task 2 writes cl_stg<id>.bin): 2116MMNN, MM = the WW month, NN = 01..10; never a JP id
const GEN_MONTHS = ['2016-08', '2016-09', '2016-10', '2016-11'];
function GEN_STAGE_IDS(month) {
  if (!GEN_MONTHS.includes(month)) throw new Error(`colosseum: ${month} has no generated stage set`);
  return Array.from({ length: 10 }, (_, i) => 21160000 + Number(month.slice(5, 7)) * 100 + i + 1);
}
const ENDLESS = 999; // rounds of the endless tier
const COIN_MAX = 10000; // a type-17 tier reward above it is the ReLux x100 artefact
// provisional reward ids of the relux seasons (see the comment block): REWARD_BASE + (rankingId - 4016) x REWARD_BLOCK
const REWARD_BASE = 35000, REWARD_BLOCK = 50, REWARD_FIRST_RANKING = 4016;
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
// sphereMasu} + masterEnemyIds (ids already in our master) + relux (readRelux, for the 'relux' seasons). -> rows per table +
// ranked {colosseumStageId: {brackets, thresholds}}.
function seasonRows(src, seasons = SEASONS) {
  const out = Object.fromEntries(TABLES.map((t) => [t, []]));
  out.ranked = {};
  const findIn = (from, label) => (table, key, id, what) => {
    const r = ((from || {})[table] || []).find((x) => x[key] === id);
    if (!r) throw new Error(`colosseum: ${what}: ${label} ${table} ${id} missing`);
    return r;
  };
  const find = findIn(src, '1.1.3');
  const clone = (r) => JSON.parse(JSON.stringify(r));
  // the next free stage id: after the 1.1.3 Coliseum stage rows (stage rows the sources lack, see the comment block)
  let nextStageId = Math.max(RANGES.stage[1] - 1, ...(src.stage || []).filter((r) => r.stageKind === 3 && r.id >= RANGES.stage[1] && r.id <= RANGES.stage[2]).map((r) => r.id)) + 1;
  let prev = null; // the previous season's {stages, ranking, rewards}: templates of the rows the sources lack
  for (const s of seasons) {
    const id = s.colosseumStageId, relux = s.source === 'relux';
    if (relux && !src.relux) throw new Error(`colosseum: ${s.month}: the ReLux season extract is not loaded`);
    const from = relux ? findIn(src.relux, 'ReLux') : find;
    const cs = from('colosseumStage', 'colosseumStageId', id, s.month);
    const all = ((relux ? src.relux : src).colosseum || []).filter((t) => t.colosseumStageId === id && t.colosseumId >= cs.headColosseumId && t.colosseumId <= cs.termColosseumId)
      .sort(byKey('colosseumId'));
    if (all.length !== cs.termColosseumId - cs.headColosseumId + 1) throw new Error(`colosseum: ${s.month}: tier rows ${cs.headColosseumId}-${cs.termColosseumId} incomplete`);
    // the wiki-visible tiers: up to the first endless one
    const endless = all.findIndex((t) => t.arrivalStageCount >= ENDLESS);
    const tiers = endless < 0 ? all : all.slice(0, endless + 1);
    for (const t of tiers) {
      for (let i = 0; i < (t.validReward || 0); i++) {
        if (t.rewardType[i] === 17 && t.rewardNum[i] > COIN_MAX) throw new Error(`colosseum: ${s.month}: tier ${t.colosseumId} pays ${t.rewardNum[i]} coins (an x100 artefact?)`);
      }
    }
    const row = schemaRow('colosseumStage', cs, { stageId: cs.validStage });
    Object.assign(row, { openDate: START, closeDate: END, rankingCloseDate: END, termColosseumId: tiers[tiers.length - 1].colosseumId });
    if (s.genStages) {
      const gen = GEN_STAGE_IDS(s.month);
      if (cs.validStage !== gen.length) throw new Error(`colosseum: ${s.month}: ${cs.validStage} stages, the generated set has ${gen.length}`);
      row.stageId = row.stageId.map((v, i) => (i < gen.length ? gen[i] : v));
    }
    out.colosseumStage.push(row);
    const tierRows = tiers.map(tierRow);
    out.colosseum.push(...tierRows);
    const stages = [];
    for (let i = 0; i < cs.validStage; i++) {
      const st = (src.stage || []).find((x) => x.stageId === cs.stageId[i]); // the 1.1.3 row of the original stage
      let r;
      if (st) {
        if (st.stageKind !== 3) throw new Error(`colosseum: ${s.month}: stage ${cs.stageId[i]} is not a Coliseum stage`);
        r = schemaRow('stage', st, validMap(st, STAGE_VALID), STAGE_DEFAULTS);
      } else if (relux && prev && prev.stages[i]) {
        r = Object.assign(clone(prev.stages[i]), { id: nextStageId++, name: 'strDummy' });
      } else throw new Error(`colosseum: ${s.month}: 1.1.3 stage ${cs.stageId[i]} missing`);
      r.stageId = row.stageId[i];
      stages.push(r);
    }
    out.stage.push(...stages);
    let rkRow, rewards;
    if (!relux) {
      const rk = find('ranking', 'rankingId', cs.rankingId, s.month);
      rkRow = Object.assign(schemaRow('ranking', rk), { startDatetime: START, endDatetime: END });
      rewards = (src.rankingReward || []).filter((r) => r.rankingRewardId >= rk.startRank && r.rankingRewardId <= rk.endRank)
        .map((r) => schemaRow('rankingReward', r, validFor(RANK_REWARD, r.validReward)));
      if (!rewards.length) throw new Error(`colosseum: ${s.month}: ranking ${rk.rankingId} has no rankingReward rows (the client's Rewards button would crash)`);
    } else {
      // PROVISIONAL (Task 5): the previous season's brackets and rewards, own ids
      if (!prev) throw new Error(`colosseum: ${s.month}: a ReLux season needs an earlier season (ranking template)`);
      const base = REWARD_BASE + (cs.rankingId - REWARD_FIRST_RANKING) * REWARD_BLOCK, n = prev.rewards.length;
      if (cs.rankingId < REWARD_FIRST_RANKING || n > REWARD_BLOCK || base + n - 1 > RANGES.rankingReward[2]) throw new Error(`colosseum: ${s.month}: no reward id block for ranking ${cs.rankingId}`);
      const tpl = (src.ranking || []).find((x) => x.rankingId === cs.rankingId);
      rkRow = Object.assign(tpl ? schemaRow('ranking', tpl) : clone(prev.ranking),
        { rankingId: cs.rankingId, startRank: base, endRank: base + n - 1, startDatetime: START, endDatetime: END });
      rewards = prev.rewards.map((r, i) => Object.assign(clone(r), { rankingRewardId: base + i }));
    }
    out.ranking.push(rkRow);
    out.rankingReward.push(...rewards);
    out.ranked[id] = rankedOf(tierRows, rewards);
    prev = { stages, ranking: rkRow, rewards };
    for (const boardId of SEASON_BOARDS[id] || []) {
      const b = find('sphere', 'sphereBoardId', boardId, s.month);
      if (b.type !== 3 || String(b.startDatetime).slice(0, 7) !== s.month) throw new Error(`colosseum: board ${boardId} (type ${b.type}, ${b.startDatetime}) is not a Coliseum board of ${s.month}`);
      const arr = find('sphereArray', 'arryId', b.arryId, `board ${boardId}`), masu = find('sphereMasu', 'masuId', b.masuId, `board ${boardId}`);
      out.sphere.push(Object.assign(schemaRow('sphere', b), { arryId: boardId, masuId: boardId, detailUrl: '', startDatetime: START, endDatetime: END }));
      out.sphereArray.push(Object.assign(schemaRow('sphereArray', arr), { arryId: boardId }));
      out.sphereMasu.push(Object.assign(schemaRow('sphereMasu', masu), { masuId: boardId, sphereBoardId: boardId }));
    }
  }
  for (const [t, keys] of [['stage', ['id', 'stageId']], ['ranking', ['rankingId']], ['rankingReward', ['rankingRewardId']]]) {
    for (const k of keys) {
      const seen = new Set();
      for (const r of out[t]) { if (seen.has(r[k])) throw new Error(`colosseum: ${t} ${k} ${r[k]} served twice`); seen.add(r[k]); }
    }
  }
  enemyRows(src, out);
  for (const [t, [key]] of Object.entries(RANGES)) out[t].sort(byKey(key));
  return out;
}

// HP of a Coliseum variant at LV 300 = 3 x its base, at LV 999 = 40/11 x its own LV 300 (the variant rule, see enemyRows)
const RULE_HP300 = 3, RULE_HP999 = 40 / 11;
// the variant row of `id` from its base row (id - 20000) by the variant rule, null when the base has no LV 300 and LV 999 knots or
// a knot between them (the rule is proven on knots 1/35/100/300/999 only)
function ruleRow(id, base) {
  const n = base.validGrowth || 0, keep = [];
  for (let i = 0; i < n; i++) if (base.baseLv[i] <= 999) keep.push(i);
  const lv = keep.map((i) => base.baseLv[i]);
  if (!lv.includes(300) || !lv.includes(999) || lv.some((l) => l > 300 && l < 999)) return null;
  const pick = (f) => keep.map((i) => (Array.isArray(base[f]) ? base[f][i] : 0));
  const hp = pick('hp').map((v, k) => (lv[k] === 300 ? v * RULE_HP300 : v));
  hp[lv.indexOf(999)] = Math.round(hp[lv.indexOf(300)] * RULE_HP999);
  const r = { ...base, enemyId: id, validGrowth: keep.length, baseLv: lv, hp, attack: pick('attack'), defense: pick('defense'), exp: pick('exp'),
    money: keep.map(() => 0), raidPoint: keep.map(() => 0), lux: pick('lux'), score: pick('score') };
  return schemaRow('enemy', r, validMap(r, ENEMY_VALID));
}

// Enemy rows (Coliseum Part 2 Task 3). Every Coliseum variant of the 1.1.3 master missing from ours (as in Part 1), then every id
// the served stages use (src.stageEnemies {stageId: [enemyId]}, readStageEnemies) missing from our master, from the first source
// that has it: the 1.1.3 row ('113'), else the variant rule against its base row id - 20000 of our master ('rule', docs/notes/
// coliseum.md «Enemy variant rule»: same level knots up to LV 999, same ATK / DEF / EXP / lux / score, same HP below LV 300, HP x3
// at LV 300, 40/11 x that at LV 999, no munny or raid points; the rest of the row as the base, though the originals also differ in
// score / CP / skills, which no rule gives), else the ReLux row (src.reluxEnemies, 'relux'). Original Coliseum variant ids
// (ENEMY_RANGE) only. No source at all stops the build (the rule, docs/notes/coliseum.md «Enemy rows of the served stages»): the
// stats of such an enemy are decided per enemy as for the raids and added as a source here; 'estimate' is a reserved label for
// those rows, never a silent path. Rows of our master are never written again. out.colosseumEnemies = [{enemyId, source, label,
// stages}], label colosseumEnemy<source> (the notice labels colosseumEnemyRule / colosseumEnemyEstimate for the non-original
// values). out.enemyCheck = {checked, reason, unchecked: [stageId]}: checked false when the stage enemy lists are missing or do not
// cover every served stage (a clean machine before its first resource build: make-game-tables runs before gen_colosseum_stages /
// import_colosseum_stages, so a hard stop there would break the build; the stage import still refuses a missing enemy).
const ENEMY_LABEL = { 113: 'colosseumEnemy113', rule: 'colosseumEnemyRule', relux: 'colosseumEnemyRelux', estimate: 'colosseumEnemyEstimate' };
function enemyRows(src, out) {
  const masterRows = src.masterEnemies || [];
  const have = new Set([...(src.masterEnemyIds || []), ...masterRows.map((r) => r.enemyId)]);
  const added = new Map(); // enemyId -> report entry
  const add = (id, row, source, stages) => {
    have.add(id);
    out.enemy.push(row);
    added.set(id, { enemyId: id, source, label: ENEMY_LABEL[source], stages });
  };
  const variant = (id) => id >= ENEMY_RANGE[0] && id <= ENEMY_RANGE[1];
  const row113 = new Map((src.enemy || []).map((e) => [e.enemyId, e]));
  for (const e of [...(src.enemy || [])].sort(byKey('enemyId'))) {
    if (!variant(e.enemyId) || have.has(e.enemyId)) continue;
    add(e.enemyId, schemaRow('enemy', e, validMap(e, ENEMY_VALID)), '113', []);
  }
  const served = out.colosseumStage.flatMap((cs) => cs.stageId.slice(0, cs.validStage));
  out.enemyCheck = { checked: false, reason: 'no stage enemy lists', unchecked: served };
  if (src.stageEnemies) {
    const need = new Map(); // enemyId -> [stageId]
    const unchecked = [];
    for (const cs of out.colosseumStage) {
      for (const sid of cs.stageId.slice(0, cs.validStage)) {
        const ids = src.stageEnemies[sid];
        if (!ids || !ids.length) { unchecked.push(sid); continue; }
        for (const id of ids) { if (!need.has(id)) need.set(id, []); if (!need.get(id).includes(sid)) need.get(id).push(sid); }
      }
    }
    const base = new Map(masterRows.map((r) => [r.enemyId, r]));
    const relux = new Map((src.reluxEnemies || []).map((r) => [r.enemyId, r]));
    for (const [id, stages] of [...need].sort((a, b) => a[0] - b[0])) {
      if (added.has(id)) { added.get(id).stages = stages; continue; }
      if (have.has(id)) continue;
      const where = `enemy ${id} of stage ${stages.join(', ')}`;
      if (!variant(id)) throw new Error(`colosseum: ${where} is missing from the master and is not a Coliseum variant id`);
      const e113 = row113.get(id), b = base.get(id - 20000), rule = b && ruleRow(id, b), rx = relux.get(id);
      if (e113) add(id, schemaRow('enemy', e113, validMap(e113, ENEMY_VALID)), '113', stages);
      else if (rule) add(id, rule, 'rule', stages);
      else if (rx) add(id, schemaRow('enemy', rx, validMap(rx, ENEMY_VALID)), 'relux', stages);
      else throw new Error(`colosseum: ${where} has no source (no 1.1.3 row, no base ${id - 20000} for the variant rule, no ReLux row): `
        + 'its stats are decided per enemy as for the raids (label colosseumEnemyEstimate), see docs/notes/coliseum.md «Enemy rows of the served stages»');
    }
    out.enemyCheck = unchecked.length ? { checked: false, reason: `${unchecked.length} served stages without an enemy list`, unchecked } : { checked: true, reason: '', unchecked: [] };
  }
  out.enemy.sort(byKey('enemyId'));
  out.colosseumEnemies = out.enemy.map((r) => added.get(r.enemyId));
}

const rowsOf = (text) => { const r = JSON.parse(text); return Array.isArray(r) ? r : Object.values(r)[0]; };
// the 1.1.3 tables of a folder, null when one is not readable
function readSource(dir) {
  try { return Object.fromEntries(TABLES.map((t) => [t, rowsOf(fs.readFileSync(path.join(dir, `${t}.json`), 'utf8'))])); } catch { return null; }
}
// the cleaned ReLux season extract ({seasons: [{colosseumStage, colosseum[]}]}) as {colosseumStage[], colosseum[]}, null when
// not readable
function readRelux(file) {
  let j;
  try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
  const seasons = Array.isArray(j && j.seasons) ? j.seasons : [];
  return { colosseumStage: seasons.map((s) => s.colosseumStage), colosseum: seasons.flatMap((s) => s.colosseum || []) };
}
// the cleaned ReLux Coliseum enemy rows ({rows: [...]}, arrays already cut), null when not readable
function readReluxEnemies(file) {
  try { const j = JSON.parse(fs.readFileSync(file, 'utf8')); return Array.isArray(j && j.rows) ? j.rows : null; } catch { return null; }
}
// The enemy lists of the stages, local files outside the repo (env names them, else the local defaults), the first one holding a
// stage wins: the stage import report (import_colosseum_stages.py: the files actually served, status «imported»), the generated
// stages report (gen_colosseum_stages.py), the JP 4.3.1 stage parse (cl_stages_jp431.json).
const ROOT = 'D:\\Progetto_Restauro_KH_UX';
const stageEnemyFiles = () => [
  process.env.KHUX_COLOSSEUM_STAGE_REPORT || path.join(ROOT, 'stage_gen', 'colosseum_stages.json'),
  process.env.KHUX_COLOSSEUM_GEN_REPORT || path.join(ROOT, 'stage_gen', 'colosseum_gen', 'report.json'),
  process.env.KHUX_COLOSSEUM_CL_PARSE || path.join(ROOT, 'private', 'events', 'sources', 'coliseum', 'cl_stages_jp431.json'),
];
// {stageId: [enemyId, sorted, unique]} from those files (unreadable ones skipped), null when none is readable
function readStageEnemies(files) {
  const out = {};
  let any = false;
  const put = (sid, ids) => { if (!(sid in out)) out[sid] = [...new Set(ids)].sort((a, b) => a - b); };
  for (const f of files) {
    let j;
    try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
    any = true;
    if (Array.isArray(j && j.stages)) {
      for (const s of j.stages) {
        if (Array.isArray(s.enemyIds)) put(s.stageId, s.enemyIds); // generated report
        else if (s.status === 'imported' && Array.isArray(s.enemies)) put(s.stageId, s.enemies); // import report
      }
    } else {
      for (const [sid, st] of Object.entries(j || {})) {
        if (st && st.parts) put(Number(sid), Object.values(st.parts).flatMap((p) => (p.enemies || []).map((e) => e.enemyId)));
      }
    }
  }
  return any ? out : null;
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
  // the ReLux seasons need the extract (opts.relux, src.relux, else KHUX_COLOSSEUM_RELUX / DEFAULT_RELUX); without it they are left out
  let seasons = opts.seasons || SEASONS;
  let relux = opts.relux || src.relux || null;
  if (!relux && seasons.some((s) => s.source === 'relux')) {
    const file = process.env.KHUX_COLOSSEUM_RELUX || DEFAULT_RELUX;
    relux = readRelux(file);
    if (!relux) {
      console.warn(`colosseum: the ReLux season extract ${file} is not readable: ${seasons.filter((s) => s.source === 'relux').map((s) => s.month).join(', ')} left out`);
      seasons = seasons.filter((s) => s.source !== 'relux');
    }
  }
  // the enemy lists of the served stages (opts.stageEnemies, else readStageEnemies) and the ReLux enemy rows (opts.reluxEnemies, else
  // KHUX_COLOSSEUM_RELUX_ENEMIES / DEFAULT_RELUX_ENEMIES); without the lists only the 1.1.3 variants are checked (the stage import
  // still refuses a stage with an enemy missing from the master). With opts.src (tests) the local files are never read.
  const stageEnemies = opts.stageEnemies || (opts.src ? null : readStageEnemies(stageEnemyFiles()));
  const reluxEnemies = opts.reluxEnemies || (opts.src ? [] : readReluxEnemies(process.env.KHUX_COLOSSEUM_RELUX_ENEMIES || DEFAULT_RELUX_ENEMIES) || []);
  const out = seasonRows({ ...src, relux, masterEnemyIds: master.enemy.map((r) => r.enemyId), masterEnemies: master.enemy, stageEnemies, reluxEnemies }, seasons);
  // the flag of an unchecked run (out.enemyCheck); make-game-tables prints it as a banner. Not a stop: on a clean machine the
  // stage files come after this run (build-resources.ps1), the stage import then refuses a missing enemy
  if (!out.enemyCheck.checked && !opts.src) {
    console.warn(`colosseum: WARNING stage enemies NOT checked: ${out.enemyCheck.reason} (${stageEnemyFiles().join(', ')}); run build-resources, then rebuild the master`);
  }
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
  console.log(`colosseum: ${out.colosseumStage.length} seasons (${seasons.map((s) => s.month).join(', ')}): +${out.colosseum.length} tiers, +${out.stage.length} stages, `
    + `+${out.enemy.length} enemies (${['113', 'rule', 'relux'].map((k) => `${k} ${out.colosseumEnemies.filter((e) => e.source === k).length}`).join(', ')}), +${out.ranking.length} rankings / ${out.rankingReward.length} brackets, +${out.sphere.length} boards`);
  return out;
}

// node make-colosseum.js [master_dir] [1.1.3 data folder]
if (require.main === module) patch(process.argv[2] || path.join(__dirname, 'master_data'), { dir: process.argv[3] || undefined });

module.exports = { SEASONS, GEN_STAGE_IDS, DEFAULT_RELUX, readRelux, DEFAULT_RELUX_ENEMIES, readReluxEnemies, stageEnemyFiles, readStageEnemies, ruleRow, SEASON_BOARDS, BONUS_TIER, BOARD_ART, artLines, CATALOG_EV, CATALOG_STAGE, CATALOG_URL, COLOSSEUM_IMG_VERSION, catalogEvStage, RANGES, DEFAULT_2016, START, END, seasonRows, patch, readSource, cutoffRound, bracketsOf, thresholdsOf, rankedOf };
