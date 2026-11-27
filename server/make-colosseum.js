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
//   (Part 2 Task 3, enemyRows) every id the served stages use missing from our master (Part 3 Task 3: also the month ids
//   161020xxx / 120097, from the raw ReLux table, month copies and the variant rule; see enemyRows);
// - ranking (category 4, ids 4009-4012) + rankingReward (its brackets, ids = the ranking's startRank..endRank): the client's
//   «Rewards» button crashes for a season whose rankingId has no rankingReward rows;
// - sphere / sphereArray / sphereMasu: the Coliseum boards (type 3) of the season (SEASON_BOARDS; 1.1.3 rows, from 2016-11 the
//   ReLux board extract), arryId and masuId renumbered to the sphereBoardId (the 3200001+/4200001+ ids fall in the Raid Boards'
//   range 3000000-3999999);
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
// - Tiers (Part 2): head..term cut after the first endless (999-round) tier. Replaced in Part 3 (user 26-11), see below.
//   2016-11 / 2016-12 = eleven tiers (the extra 10-round Tier 10, tier coins 900; Tier 11 999 rounds), 2016-08 .. 2016-10 ten (1.1.3).
// - Stage sets: genStages seasons (2016-08 .. 2016-11: no original WW set; the 1.1.3 sets 20160101/0201/0301 and the extract's
//   20160401 are JP sets WW did not play) serve GEN_STAGE_IDS(month) = 2116MMNN (generated files, Task 2); 2016-12 .. 2017-04
//   serve the extract's JP 4.3.1 sets 20160501 .. 20160901. Stage rows: the 1.1.3 row of the original stage when it exists
//   (1200 .. 1400 keep its id 81041 .. 81070, stageId replaced), else (no 1.1.3 row: 1500 .. 2000) the 1.1.3 row of the
//   STAGE_TEMPLATE season (1400, the last 1.1.3 season) at the same set position, with the next free id (81071+) and name strDummy.
// - Ranking (Task 5): 2016-08 .. 2016-10 = the 1.1.3 rows of rankings 4013-4015 (eight brackets 1-100 .. 250,001-500,000; every
//   bracket equal to the monthly notices 19886, 20641, 21481: test-make-colosseum.js real_part2). ReLux holds no rankingReward rows
//   for 2016-12 .. 2018-03 (its 4019 rows are the donor's invention) and the 1.1.3 row 4016 points to the 4015 rows, so every relux
//   season gets its own ranking row (RANKING_ROW: the constant fields of the 1.1.3 rows 4009-4016, rankingId of its colosseumStage
//   row) and the reward rows of RELUX_RANKING: 2016-11 = notice 22105 (the full table), 2016-12 .. 2017-04 = khuxwiki, except the 2016-12 Helm
//   (notice 23117: top 10,000, the notice wins); the monthly notices give only the featured prizes and the top 2,500 / 10,000 /
//   100,000 edges, all equal to the wiki brackets. Ids
//   REWARD_BASE + (rankingId - 4016) x REWARD_BLOCK so they stay in 30000-39999 (the original 4021 range 40000-40007 does not).
//   Thresholds: 2016-08 = the curve through that month's footage (the recorded August 2016 ranking, 110 finite rounds:
//   64 / 76 / 93 / 105 / 134 / 159 / 175 / 216); 2016-09 / 10 the same structure (110 rounds), so the same values; 2016-11 ..
//   2017-04 the curve shifted to their 120 finite rounds (+10: 74 / 86 / 103 / 115 / 144 / 169 / 185 / 226), label «interpolated».
//   The top brackets lie in the endless tier, as on the August 2016 footage (the Top 10 at Tier 10 147-184/999).
//
// Coliseum Part 3 (plan docs/superpowers/plans/2026-11-26-coliseum-part3.md, Task 1): the eleven WW seasons 2017-05 .. 2018-03 =
// ReLux rows 2100 .. 3100 (rankingId 4022 .. 4032), and every tier row inside head..term for every relux season (user 26-11):
// players reached the 999-round tiers after the first one (Top 1,000 in Tier 16 in 2017-11, private PART3_AUDIT.md §0), so
// 2017-01 .. 2017-03 serve 15 tiers, 2017-04 21, 2017-05 .. 2018-03 22 (AP 0 on every tier, tier coins to Tier 12, from Tier 13
// the medals 6★ Cid / 6★ Moogle / Magic Mirror only, ReLux medal ids = ours: checked by name); the trailing 0-round end-marker
// row stays out; the 1.1.3 seasons 2016-04 .. 2016-10 are unchanged. The 999-round tiers keep arrivalStageCount 999 as served
// (Part 2 ruling); a save past the old last tier keeps its tier / round (the starts of the tiers do not move) and goes on into
// the next tier. Thresholds shift by the rounds before the FIRST 999-round tier (rankedOf), so 2016-11 .. 2017-04 keep theirs.
// Stage sets: 2017-05 the JP set 20161001, 2017-06 .. 12 generated (GEN_STAGE_IDS 2117MMNN), 2018-01 .. 03 the JP sets of the rows.
// A relux season without its RELUX_RANKING entry stops the run (seasonRows), never served without its Rewards rows.
//
// Coliseum Part 3 Task 5: ranking prizes and thresholds of 2017-05 .. 2018-03. ReLux has no reward rows for these months, so
// RELUX_RANKING holds the khuxwiki monthly tables (private PART3_AUDIT.md §6; the monthly notices name the same skill and the same
// top 10,000 / 100,000 edges): eight brackets, the featured skill on 6★ Scrooge x3 / x2 / x1 / x1 to rank 10,000, its id looked up
// BY NAME in our skill.json (the ReLux skill ids are another numbering), the month's avatar parts to rank 100,000 (2017-05 / 06 /
// 07 / 09 / 11), 2017-09 also Defense Boost I Max on 5★ Scrooge to rank 100,000, 2017-12 the Santa Spirit parts (type 33, petParts:
// Hat 402007 to rank 2,500, Beard 411002 to 50,000, Brows 401004 to 100,000; notice 34668 calls them Spirit parts, the wiki
// «avatar»). Thresholds: one era curve ERA17 for the eleven seasons, replaced by a month curve where the month has data (below) (all with the same tiers: 570 rounds, then nine 999-round tiers,
// 9,561 rounds served), fitted on the recorded border ranks of the era (private CUTOFFS_2017.md: 23 season-end points, r/KingdomHearts
// border posts of 2017 and a community member's border-rank posts for 2017-10 / 11 / 12; global round = rounds before the tier + round): least squares
//   log10(round) = a + b x log10(rank),  a = 3.5122, b = -0.1509  (ERA17.a / .b, computed from ERA17.points)
// every fit point within x / ÷ 2.85 of the curve (ERA17.tolerance; worst 2017-11 rank 1,000: 3,222 recorded, 1,147 on the curve).
// The months differ a lot (10,000th: 313 in 2017-05, 2,158 in 2017-11: new medals and Boosters), the curve is the era's middle.
//   100 -> 1,624 | 1,000 -> 1,147 | 2,500 -> 999 | 10,000 -> 811   (label «fitted»: inside the points' ranks 99 .. 10,200)
//   50,000 -> 245   (label «interpolated»: log-linear in the rank from 10,000 / 811 to the era's player count 100,000 / 1 round)
//   100,000 / 250,000 / 500,000 -> 1 round   (label «interpolated»: ~100,000 players a month (92,115 / 103,017 / 100,723 at the
//   ends of 2017-10 / 11 / 12), so every ranked player was inside rank ~100,000)
// No value of 2018-01 .. 03 is on record beyond loose statements (CUTOFFS_2017.md context rows, all inside the tolerance).
// Per-month calibration (controller ruling 26-11, ERA17.months): a month with its own season-end points gets its own curve of the
// same form, fitted on its points only: both a and b when they span at least one decade of rank, else the era slope b with its own
// intercept (the mean of its points); the same tail (10,000 -> 1 round at 100,000). Every month point within x / ÷ 1.15 of its
// month curve (ERA17.monthTolerance; worst a 2017-10 point, x 1.11). «fitted» = an edge
// inside the ranks of the month's points, else «interpolated». Guard (re-review 26-11): outside the rank span of the month's own
// points its own fit is not extrapolated; the era slope goes on from the month curve's value at the nearest point's rank (only
// 2017-07 rank 100 changes: 1,527 -> 1,131). Thresholds 100 / 1,000 / 2,500 / 10,000 / 50,000 (then 1, 1, 1):
//   2017-05 own fit (ranks 99 .. 10,200; 6e01rg, 6f291y; a 3.3200 b -0.2059): 810 / 504 / 417 / 314 / 95
//   2017-06 era slope, own intercept (ranks 459, 1,000; 6o1ra2):                893 / 631 / 550 / 446 / 135
//   2017-07 own fit (ranks 991 .. 10,000; 6qhit7; a 3.7471 b -0.2817):         1,131 / 798 / 617 / 417 / 126 (100: guard)
//   2017-09 era slope, own intercept (rank 100; 73i23q):                         1,578 / 1,115 / 971 / 788 / 238
//   2017-10 own fit (ranks 100 .. 10,000; 7aafnf; a 3.6808 b -0.1986):         1,921 / 1,216 / 1,014 / 770 / 232
//   2017-11 own fit (ranks 100 .. 10,000; 7gtzkx; a 3.9387 b -0.1495):         4,363 / 3,092 / 2,696 / 2,192 / 661
//   2017-12 own fit (ranks 100 .. 10,000; 7p6gif; a 3.7343 b -0.1388):         2,863 / 2,079 / 1,831 / 1,511 / 456
//   2017-08, 2018-01, 2018-02, 2018-03: no season-end point, the era curve above (1,624 / 1,147 / 999 / 811 / 245).
// Note 2017-05: its 10,000 point (313) was taken two days before the end, a lower bound.
//
// Coliseum Part 3b (plan docs/superpowers/plans/2026-11-26-coliseum-part-2018.md, Task 1): the thirteen WW seasons 2018-04 .. 2019-04 =
// ReLux rows 3200 .. 4400 (rankingId 4033 .. 4045), the lump-sum era: finite T1-T15 = 1,570 rounds, then 999-round tiers (22 tiers in
// 2018-04 / 05, 23 from 2018-06); the 0-round end marker inside head..term (2018-08 .. 2019-04) is never served. Tier coins are the
// rows' own lump sums (2018-04 9,000, then 8,100); per-round coins to 2018-11, none from 2018-12 (validStageReward 0, stageReward*
// zeroed by tierRow). The ReLux medal ids of the tier rewards 90135 / 90136 are Magic Broom 300948 / Fantasia Mickey B 300913
// (RELUX_MEDAL); with the medal master known (src.masterMedalIds) any other id missing from it stops the build. T15 = Moon Gem
// (reward type 5, id 52).
//
// Coliseum Part 3b Task 5: ranking prizes and thresholds of 2018-04 .. 2019-04 (every one of the 37 seasons is in the default build now).
// Prizes: khuxwiki monthly tables (private PART3_AUDIT.md §6, PART4_AUDIT.md §5; ReLux = khuxwiki for these months, only its item types and
// counts read, every skill id looked up BY NAME in skill.json, none taken from ReLux). Each RELUX_RANKING entry now carries its own edges
// (`edges`; BRACKETS8 for 2016-06 .. 2018-11 and 2019-01 / 02, so the Part 2-3 rows are byte-identical, BRACKETS9 for 2018-12, BRACKETS12
// for 2019-03 / 04). 2018-04 .. 11: the eight brackets, the month's skill on 6★ Scrooge x3 / x2 / x1 / x1 to rank 10,000, no avatar part:
// 04 ATK Boost VI & Lux+, 05 Defense Boost V, 06 ATK B VI Max & Lux+, 07 ATK B VII Max & GA 2, 08 ATK B VII Max & Lux+, 09 Attack Boost
// VIII, 10 ATK B VIII & Lux+, 11 ATK B VIII Max & GA 2. 2018-12 (ATK B VIII Max & Lux+): nine brackets, P / S / M Gems (type 5, materials
// 48 / 49 / 50) 50 / 45 / 40 / 35 / 20 to rank 15,000, the values after the 27-12-2018 increase (notice 47137; khuxwiki and ReLux equal).
// 2019-01 Attack Boost IX / 2019-02 ATK B IX & Lux+: eight brackets, Dual Meow Wow [SAB LV 9 / 8 / 7] (ours 301684 / 301683 / 301682)
// x15 / 25 / 35 on top, then 10 / 20 / 30, 5 / 15 / 25, 15 / 20 (rank 10,000). 2019-03 ATK B IX Max & GA 2 / 2019-04 ATK B IX Max & Lux+: the
// twelve brackets, Dual Meow Wow x15 / 25 / 30 on top; the featured skill x3 and the previous month's skill of the same line x1 on top, a
// ladder of the earlier months (VIII, VII, VI, V, IV) below. khuxwiki lists only the top bracket; the other eleven are the ReLux rows
// (both sources agree where both exist; ladder: ReLux skill names ATK B VIII .. IV Max & GA 2 / Lux+, matched by name).
// Thresholds: ERA18 (same interface as ERA17), fitted on the recorded border ranks of the era (private CUTOFFS_2018.md, 34 scattered
// rows: the 2017 border-rank posters stopped after 2017-12 and nobody took over). Global round = enemy level = 1,570 + the round of the
// 999-round tier. Controller ruling: only season-end / late-month points calibrate; the six used (ERA18_POINTS, r/KingdomHearts border
// posts): 2018-04 rank 4,068 at 1,840 (T16 R~270, told after the month); 2018-06 rank 10,000 at
// 2,120 (T16 5xx, season-end upper bound, midpoint) and 2,070 (T16 midway, 06-28), rank 1,395 at 3,396 (T17 R827, reset day), rank ~230
// at 4,567 (about to start T19, 06-28); 2019-04 rank ~100 at 4,575 (T19 R5 .. 12, 04-25). Listed, NOT fitted (mid-month, day-1..10 or
// context rows, mostly one-sided): 2018-04 ranks 100 / ~385 / ~2,100 / ~2,000 (days 2-10, lower bounds: a player climbs on, the
// fitted month curve lies above them), 2018-05 ~7,000 on day 3 and T16 R670, 2018-06 the 06-16 / 06-26 / 06-25 posts and the reset jump
// (8,700 -> 15,000), 2018-07 rank ~150 on day 1 and the stuck-round posts, 2018-10 .. 2019-03 rank-only or round-only posts (rank 1,749 /
// ~10,000 / 800 / ~2,700 / 714, rounds 2,560 .. 3,920), 2019-04 rank 102 (T19 R5, day 10) and 972 (day 10), the stuck-round posts.
// So 2018-07 .. 2019-03 have no calibrating point of their own: the era curve gives them (the real 2018-07 retune lowered the rounds
// reached by the top 150 .. 1,000 to T17-T18, ~2,600-3,300, which this curve reproduces at rank 1,000-2,500: 3,138 / 2,616).
// Method as Part 3: least squares log10(round) = a + b x log10(rank), a = 4.0928, b = -0.1987 (ERA18.a / .b), every fit point within
// x / ÷ 1.30 of it (ERA18.tolerance; worst 2018-04 rank 4,068: 1,840 recorded, 2,374 on the era curve); a per-month curve of the same
// form where the month has calibrating points (ERA18.months): 2018-06 own fit (ranks 230 .. 10,000; a 4.1698, b -0.2107; every point within
// x / ÷ 1.06, ERA18.monthTolerance 1.15), 2018-04 and 2019-04 one point each, so the era slope with their own intercept (exactly through
// the point); outside a month's own rank span the era slope goes on from the nearest point (the guard: 2018-06 rank 100). Beyond rank
// 10,000 log-linear to 1 round at rank 100,000 (every ranked player inside); the 9 / 12-bracket seasons read the same curve at their own
// edges. Thresholds 100 / 1,000 / 2,500 / 10,000 / 50,000 (then 1, 1, 1; label «fitted» inside a month's rank span, else «interpolated»):
//   2018-04 own intercept (rank 4,068):    3,843 / 2,432 / 2,027 / 1,539 / 464
//   2018-06 own fit (ranks 230 .. 10,000):         5,546 / 3,448 / 2,843 / 2,123 / 640
//   2019-04 own intercept (rank 100; bhctoi):      4,575 / 2,895 / 2,413 / 1,832 / 552
//   2018-05, 2018-07 .. 2019-03: the era curve:    4,959 / 3,138 / 2,616 / 1,986 / 599 (2018-12 edge 7,000: 2,132; 15,000: 1,636;
//                                                  2019-03 / 04 edges 17,500 / 25,000 / 45,000: 1,504 / 1,196 / 689)
// The values at rank 100 are lower bounds read off 4,500 .. 5,500 (T19 starts at 4,567): the top is open-ended, and the top brackets lie in
// the endless tiers as in the earlier eras. Private sources are named by their public evidence only.
//
// Coliseum Part 4 (plan docs/superpowers/plans/2026-11-27-coliseum-part4.md, Task 1): the 26 revamp seasons 2019-05 .. 2021-06 = ReLux rows
// 4500 .. 7000 (rankingId 4046 .. 4071). Tiers: T1-T18 are served (T1 200 rounds, T2-T7 400, T8 300, T9 200, T10-T18 100 = 4,000 rounds in
// all); the ReLux T19 (1,000 rounds, AP 99) is a designer wall and is NOT served (user 27-11; the rule: from REVAMP_FIRST a tier row with
// ap > 0 is cut), so the last tier is FINITE and the season ends after round 4,000 (colosseum-rules.js total). AP 0 everywhere, per-round
// coins from Tier 5 (10) and Tier 8 (30), tier coins 100 / 300 / 500 / 700, the T10 reward a title (type 7, id 17079 + the months since
// 2019-05, title.json «<Month YYYY> Victor»). From 2020-01 a season has 9 stages (validStage 9). 2019-07 carries pending: 'enemies' (its
// stage set is generated only after every enemy is settled): seasonRows skips a pending season whole and lists it in out.pending.
// Until their ranking prizes (RELUX_RANKING) exist the default build leaves the new seasons out with a warning, as in Part 3b.
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
// the raw ReLux enemy table (the donor's server_master, private, outside the repo; Coliseum Part 3) when KHUX_COLOSSEUM_RELUX_ENEMY
// names none. The cleaned extract coliseum_enemies.json is not used any more: its 20xxx rows are the 2019 revamp (VERIFY.md §1)
const DEFAULT_RELUX_ENEMY = 'D:\\Progetto_Restauro_KH_UX\\Reddit Donators\\ReLux Team\\KHUX_pacchetto_18_11_2026\\pkg\\server_master\\enemy.json';
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
  // Coliseum Part 3: 2017-05 = the JP 4.3.1 set 20161001; 2017-06 .. 2017-12 generated (their JP sets 20161101 .. 20170501 are not on
  // disk); 2018-01 .. 2018-03 = the JP sets 20170601 / 0701 / 0801 of the ReLux rows
  { month: '2017-05', colosseumStageId: 2100, source: 'relux' },
  { month: '2017-06', colosseumStageId: 2200, source: 'relux', genStages: true },
  { month: '2017-07', colosseumStageId: 2300, source: 'relux', genStages: true },
  { month: '2017-08', colosseumStageId: 2400, source: 'relux', genStages: true },
  { month: '2017-09', colosseumStageId: 2500, source: 'relux', genStages: true },
  { month: '2017-10', colosseumStageId: 2600, source: 'relux', genStages: true },
  { month: '2017-11', colosseumStageId: 2700, source: 'relux', genStages: true },
  { month: '2017-12', colosseumStageId: 2800, source: 'relux', genStages: true },
  { month: '2018-01', colosseumStageId: 2900, source: 'relux' },
  { month: '2018-02', colosseumStageId: 3000, source: 'relux' },
  { month: '2018-03', colosseumStageId: 3100, source: 'relux' },
  // Coliseum Part 3b (ReLux rows 3200 .. 4400, rankingId 4033 .. 4045): the lump-sum era. Their stage sets are the JP 4.3.1 sets of
  // the rows; every season has its RELUX_RANKING entry (a missing one stops the run, seasonRows)
  { month: '2018-04', colosseumStageId: 3200, source: 'relux' },
  { month: '2018-05', colosseumStageId: 3300, source: 'relux' },
  { month: '2018-06', colosseumStageId: 3400, source: 'relux' },
  { month: '2018-07', colosseumStageId: 3500, source: 'relux' },
  { month: '2018-08', colosseumStageId: 3600, source: 'relux' },
  { month: '2018-09', colosseumStageId: 3700, source: 'relux' },
  { month: '2018-10', colosseumStageId: 3800, source: 'relux' },
  { month: '2018-11', colosseumStageId: 3900, source: 'relux' },
  { month: '2018-12', colosseumStageId: 4000, source: 'relux' },
  { month: '2019-01', colosseumStageId: 4100, source: 'relux' },
  { month: '2019-02', colosseumStageId: 4200, source: 'relux' },
  { month: '2019-03', colosseumStageId: 4300, source: 'relux' },
  { month: '2019-04', colosseumStageId: 4400, source: 'relux' },
  // Coliseum Part 4 (ReLux rows 4500 .. 7000, rankingId 4046 .. 4071): the revamp seasons; 2019-07 is pending until its enemies are settled
  { month: '2019-05', colosseumStageId: 4500, source: 'relux' },
  { month: '2019-06', colosseumStageId: 4600, source: 'relux' },
  { month: '2019-07', colosseumStageId: 4700, source: 'relux', pending: 'enemies' },
  { month: '2019-08', colosseumStageId: 4800, source: 'relux' },
  { month: '2019-09', colosseumStageId: 4900, source: 'relux' },
  { month: '2019-10', colosseumStageId: 5000, source: 'relux' },
  { month: '2019-11', colosseumStageId: 5100, source: 'relux' },
  { month: '2019-12', colosseumStageId: 5200, source: 'relux' },
  { month: '2020-01', colosseumStageId: 5300, source: 'relux' },
  { month: '2020-02', colosseumStageId: 5400, source: 'relux' },
  { month: '2020-03', colosseumStageId: 5500, source: 'relux' },
  { month: '2020-04', colosseumStageId: 5600, source: 'relux' },
  { month: '2020-05', colosseumStageId: 5700, source: 'relux' },
  { month: '2020-06', colosseumStageId: 5800, source: 'relux' },
  { month: '2020-07', colosseumStageId: 5900, source: 'relux' },
  { month: '2020-08', colosseumStageId: 6000, source: 'relux' },
  { month: '2020-09', colosseumStageId: 6100, source: 'relux' },
  { month: '2020-10', colosseumStageId: 6200, source: 'relux' },
  { month: '2020-11', colosseumStageId: 6300, source: 'relux' },
  { month: '2020-12', colosseumStageId: 6400, source: 'relux' },
  { month: '2021-01', colosseumStageId: 6500, source: 'relux' },
  { month: '2021-02', colosseumStageId: 6600, source: 'relux' },
  { month: '2021-03', colosseumStageId: 6700, source: 'relux' },
  { month: '2021-04', colosseumStageId: 6800, source: 'relux' },
  { month: '2021-05', colosseumStageId: 6900, source: 'relux' },
  { month: '2021-06', colosseumStageId: 7000, source: 'relux' },
];
// the first colosseumStageId of the revamp (2019-05): its stage of round n follows the global round (colosseum-rules.js)
const REVAMP_FIRST = require('./colosseum-rules').REVAMP_FIRST;
// ReLux medal ids of the tier rewards that are not ours -> ours (Part 3b, proven slot for slot RX = khuxwiki): 90135 = Magic Broom,
// 90136 = Fantasia Mickey B. Every other ReLux medal id must be in our medal master (the build stops otherwise). Both medals exist
// in the master only when it is built with KHUX_MEDALS_ALL=1 (the regen recipe).
const RELUX_MEDAL = { 90135: 300948, 90136: 300913 };
// generated stage sets (Task 2 writes cl_stg<id>.bin): 21YYMMNN, YY = 16 / 17 the year of the WW month, MM its month, NN = 01..10;
// never a JP id, and the 2017 ids never those of the served 2016 sets (2017-08 .. 11 share their months with 2016-08 .. 11)
const GEN_MONTHS = ['2016-08', '2016-09', '2016-10', '2016-11', '2017-06', '2017-07', '2017-08', '2017-09', '2017-10', '2017-11', '2017-12'];
function GEN_STAGE_IDS(month) {
  if (!GEN_MONTHS.includes(month)) throw new Error(`colosseum: ${month} has no generated stage set`);
  return Array.from({ length: 10 }, (_, i) => 21000000 + Number(month.slice(2, 4)) * 10000 + Number(month.slice(5, 7)) * 100 + i + 1);
}
const ENDLESS = 999; // rounds of the endless tier
const COIN_MAX = 10000; // a type-17 tier reward above it is the ReLux x100 artefact
// reward ids of the relux seasons (see the comment block): REWARD_BASE + (rankingId - 4016) x REWARD_BLOCK
const REWARD_BASE = 35000, REWARD_BLOCK = 50, REWARD_FIRST_RANKING = 4016;
// the 1.1.3 season whose stage rows are the template of the relux seasons' stage rows (no source has those rows)
const STAGE_TEMPLATE = 1400;
// the constant fields of the 1.1.3 Coliseum ranking rows 4009-4016 (category 4 = Coliseum)
const RANKING_ROW = { category: 4, unionStartRank: [1, 1, 1, 1, 1], unionEndRank: [1, 1, 1, 1, 1], validReward: 1 };
// Ranking rewards of the relux seasons (Task 5), one list per bracket (the entry's edges: BRACKETS8 for every month 2016-06 .. 2018-11 and
// 2019-01 / 02, BRACKETS9 2018-12, BRACKETS12 2019-03 / 04), in the order of the source. An item: «g:<materialId>x<n>» (a material, type 5:
// the P / S / M Gems 48 / 49 / 50) or «<medal>[:<skillId>][x<num>]» (MEDAL ids of our master; a skill rides on a Scrooge medal, skillType
// 3, at the skill's maxLv as in all 86 skill medals of the 1.1.3 rankingReward rows) or «p<type>:<avatarPartsId>» (types as the
// 2016-08 .. 2016-10 1.1.3 rows pay avatar parts: 19 the head parts, styles and hats, 20 the other accessories; the server pays both
// the same) or «p33:<petPartsId>» (a Spirit part, Part 3: 2017-12). Names -> ids: medal.json, skill.json, avatarParts.json,
// petParts.json (test-make-colosseum.js checks every id and level).
const MEDAL = { scrooge3: 90123, scrooge5: 90125, scrooge6: 90126, chip5: 90055, chip6: 90056, dale5: 90065, dale6: 90066, cid: 90076, mirror: 90156,
  dmw7: 301682, dmw8: 301683, dmw9: 301684 }; // Dual Meow Wow [SAB LV 7 / 8 / 9] (Part 3b: 2019-01 .. 2019-04)
const SKILL_LV = { 1112: 10, 1113: 15, 1114: 20, 1119: 20, 1124: 20, 1127: 20, 1180: 20, 1230: 20, // skill.json maxLv
  // Part 3: Second Chance II / III / IV, Attack Boost IV Max, ATK B IV Max & GA 2, ATK Boost IV & Lux+, Defense Boost II Max,
  // Defense Boost I Max, Attack Boost V, ATK B V & Lux+, Defense Boost III Max, ATK B V Max & Lux+
  1226: 20, 1227: 20, 1228: 20, 1136: 20, 1232: 20, 1188: 20, 1152: 20, 1151: 15, 1128: 20, 1189: 20, 1153: 20, 1198: 20,
  // Part 3b, by name: ATK Boost VI & Lux+, Defense Boost V, ATK B VI Max & Lux+, ATK B VII Max & GA 2, ATK B VII Max & Lux+, Attack Boost
  // VIII, ATK B VIII & Lux+, ATK B VIII Max & GA 2, ATK B VIII Max & Lux+, Attack Boost IX, ATK B IX & Lux+, ATK B IX Max & GA 2,
  // ATK B IX Max & Lux+; the 2019-03 / 04 ladder adds ATK B VI Max & GA 2, ATK B V Max & GA 2, ATK Boost IV Max & Lux+
  1190: 20, 1149: 20, 1200: 20, 1241: 20, 1202: 20, 1131: 20, 1192: 20, 1244: 20, 1204: 20, 1132: 20, 1193: 20, 1247: 20, 1206: 20,
  1238: 20, 1235: 20, 1196: 20 };
const BRACKETS8 = [[1, 100], [101, 1000], [1001, 2500], [2501, 10000], [10001, 50000], [50001, 100000], [100001, 250000], [250001, 500000]];
// 2018-12: nine brackets (2,501-7,000 / 7,001-15,000 instead of 2,501-10,000); 2019-03 / 04: twelve (Part 3b)
const BRACKETS9 = [[1, 100], [101, 1000], [1001, 2500], [2501, 7000], [7001, 15000], [15001, 50000], [50001, 100000], [100001, 250000], [250001, 500000]];
const BRACKETS12 = [[1, 100], [101, 500], [501, 1000], [1001, 2000], [2001, 3000], [3001, 5000], [5001, 7500], [7501, 10000], [10001, 17500], [17501, 25000], [25001, 45000], [45001, 100000]];
// 2017-01 .. 2017-04 (khuxwiki): one featured skill on 6★ Scrooge (x3 / x2 / x1 to rank 10,000), the month's avatar part ♂ / ♀ to
// rank 100,000, Chip / Dale / Cid / Magic Mirror
const wiki2017 = (skill, m, f) => [
  [`scrooge6:${skill}x3`, m, f, 'chip6x5', 'dale6x5', 'cidx5', 'mirrorx5'],
  [`scrooge6:${skill}x2`, m, f, 'chip6x3', 'dale6x3', 'cidx3', 'mirrorx4'],
  [`scrooge6:${skill}`, m, f, 'chip6x2', 'dale6x2', 'cidx3', 'mirrorx4'],
  [`scrooge6:${skill}`, m, f, 'chip6x2', 'dale6x2', 'cidx2', 'mirrorx3'],
  [m, f, 'chip6', 'dale6', 'cid', 'mirror'],
  [m, f, 'chip5x3', 'dale5x3'],
  ['chip5x2', 'dale5x2'],
  ['chip5', 'dale5'],
];
// 2017-05 .. 2018-03 (Part 3): the same table, the avatar parts only in the months that have them
const wikiP3 = (skill, m, f) => wiki2017(skill, m, f).map((b) => b.filter(Boolean));
// 2018-12: P / S / M Gems (materials 48 / 49 / 50)
const gems = (n) => [48, 49, 50].map((m) => `g:${m}x${n}`);
// 2019-01 / 02: Dual Meow Wow SAB LV 9 / 8 / 7 on top (RX counts: 15 / 25 / 35, 10 / 20 / 30, 5 / 15 / 25, then 15 / 20 to rank 10,000)
const dmw8 = (skill) => [
  ['dmw9x15', 'dmw8x25', 'dmw7x35', `scrooge6:${skill}x3`, 'chip6x5', 'dale6x5', 'cidx5', 'mirrorx5'],
  ['dmw9x10', 'dmw8x20', 'dmw7x30', `scrooge6:${skill}x2`, 'chip6x3', 'dale6x3', 'cidx3', 'mirrorx4'],
  ['dmw9x5', 'dmw8x15', 'dmw7x25', `scrooge6:${skill}`, 'chip6x2', 'dale6x2', 'cidx3', 'mirrorx4'],
  ['dmw8x15', 'dmw7x20', `scrooge6:${skill}`, 'chip6x2', 'dale6x2', 'cidx2', 'mirrorx3'],
  ['chip6', 'dale6', 'cid', 'mirror'], ['chip5x3', 'dale5x3'], ['chip5x2', 'dale5x2'], ['chip5', 'dale5']];
// 2019-03 / 04: twelve brackets; ladder[0] = the featured skill, ladder[k] the skill of k months before on the same line
const twelve = (ladder) => {
  const sk = (k, n) => `scrooge6:${ladder[k]}${n > 1 ? `x${n}` : ''}`;
  return [
    ['dmw9x15', 'dmw8x25', 'dmw7x30', sk(0, 3), sk(1, 1)], ['dmw9x13', 'dmw8x23', 'dmw7x25', sk(0, 2), sk(1, 1)], ['dmw9x10', 'dmw8x20', 'dmw7x23', sk(0, 1), sk(1, 2)],
    ['dmw9x8', 'dmw8x18', 'dmw7x20', sk(0, 1), sk(1, 1), sk(2, 1)], ['dmw9x3', 'dmw8x15', 'dmw7x18', sk(0, 1), sk(2, 2)], ['dmw9x2', 'dmw8x13', 'dmw7x15', sk(0, 1), sk(2, 1), sk(3, 1)],
    ['dmw9x1', 'dmw8x10', 'dmw7x13', sk(0, 1), sk(3, 2)], ['dmw8x8', 'dmw7x10', sk(0, 1), sk(3, 1)], ['dmw7x8', sk(3, 2)], [sk(3, 1), sk(4, 1)], [sk(4, 1), sk(5, 1)], [sk(5, 1)]];
};
const RELUX_RANKING = {
  // 2016-11, notice 22105 «November Coliseum Update!» (the wiki table is the same): Defense Boost III / II / I on 6★ / 5★ / 3★
  // Scrooge, Timothy Mouse: Hat ♂ / ♀ (101215 / 101216) to rank 250,000, Timothy Mouse: Earrings ♂ / ♀ (103215 / 103216) to 10,000
  1500: { source: 'notice 22105', brackets: [
    ['scrooge6:1119', 'scrooge5:1113x2', 'scrooge3:1112x3', 'p19:101215', 'p19:101216', 'p20:103215', 'p20:103216', 'chip6x5', 'dale6x5', 'cidx5'],
    ['scrooge6:1119', 'scrooge5:1113x2', 'scrooge3:1112x3', 'p19:101215', 'p19:101216', 'p20:103215', 'p20:103216', 'chip6x2', 'dale6x2', 'cidx2'],
    ['scrooge6:1119', 'scrooge5:1113x2', 'scrooge3:1112x3', 'p19:101215', 'p19:101216', 'p20:103215', 'p20:103216', 'chip6', 'dale6', 'cid'],
    ['scrooge5:1113', 'scrooge3:1112x2', 'p19:101215', 'p19:101216', 'p20:103215', 'p20:103216', 'chip6', 'dale6', 'cid'],
    ['scrooge3:1112x2', 'p19:101215', 'p19:101216', 'chip6', 'dale6', 'cid'],
    ['scrooge3:1112', 'p19:101215', 'p19:101216', 'chip5x3', 'dale5x3'],
    ['p19:101215', 'p19:101216', 'chip5x2', 'dale5x2'],
    ['chip5', 'dale5']] },
  // 2016-12, khuxwiki: ATK Boost II & Lux Plus (1114) on 6★ Scrooge; Pegasus Knight: Tail ♂ / ♀ (107291 / 107292) to rank 2,500 (notice
  // 23117: top 2,500); Pegasus Knight: Helm ♂ / ♀ (101291 / 101292) to rank 10,000 as notice 23117 says («Rank in the top 10,000 and
  // get the Pegasus Knight: Helm»): the worldwide notice wins over the wiki, which lists the Helm down to rank 250,000
  1600: { source: 'khuxwiki', brackets: [
    ['scrooge6:1114x3', 'p20:107291', 'p19:101291', 'p20:107292', 'p19:101292', 'chip6x5', 'dale6x5', 'cidx5', 'mirrorx5'],
    ['scrooge6:1114x2', 'p20:107291', 'p19:101291', 'p20:107292', 'p19:101292', 'chip6x3', 'dale6x3', 'cidx3', 'mirrorx4'],
    ['scrooge6:1114', 'p20:107291', 'p19:101291', 'p20:107292', 'p19:101292', 'chip6x2', 'dale6x2', 'cidx2', 'mirrorx3'],
    ['scrooge6:1114', 'p19:101291', 'p19:101292', 'chip6x2', 'dale6x2', 'cidx2', 'mirrorx3'],
    ['chip6', 'dale6', 'cid', 'mirror'],
    ['chip5x3', 'dale5x3'],
    ['chip5x2', 'dale5x2'],
    ['chip5', 'dale5']] },
  // 2017-01 SP Attack Gauge I (1124), Armored Terra: Mask / Armored Aqua: Mask (notice 23796: top 100,000)
  1700: { source: 'khuxwiki', brackets: wiki2017(1124, 'p19:101297', 'p19:101298') },
  // 2017-02 ATK Boost III & ATK Prize+ (1180), Cowboy Goth: Hat / Cowgirl Goth: Hat
  1800: { source: 'khuxwiki', brackets: wiki2017(1180, 'p19:101303', 'p19:101304') },
  // 2017-03 Attack Boost IV (1127), Royal Knight: Cape ♂ / ♀
  1900: { source: 'khuxwiki', brackets: wiki2017(1127, 'p20:108309', 'p20:108310') },
  // 2017-04 ATK B III Max & SP GA 2 (1230), Ninja / Kunoichi: Toy Katana
  2000: { source: 'khuxwiki', brackets: wiki2017(1230, 'p20:108171', 'p20:108172') },
  // Part 3 Task 5 (khuxwiki monthly tables, private PART3_AUDIT.md §6; skill ids by name in skill.json, part types as the 1.1.3 rows:
  // glasses / masks 20, hats / headbands / hairstyles 19)
  2100: { source: 'khuxwiki', brackets: wikiP3(1226, 'p20:102087', 'p20:102088') }, // 2017-05 Second Chance II, KH Dale: Glasses ♂ / ♀
  2200: { source: 'khuxwiki', brackets: wikiP3(1136, 'p19:101183', 'p19:101184') }, // 2017-06 Attack Boost IV Max, Hydrangea Prep: Hat / Formal: Crown
  2300: { source: 'khuxwiki', brackets: wikiP3(1232, 'p19:101231', 'p19:101232') }, // 2017-07 ATK B IV Max & GA 2, Mango Prep: Hat / Sweetie: Headband
  2400: { source: 'khuxwiki', brackets: wikiP3(1188) }, // 2017-08 ATK Boost IV & Lux+, no avatar part
  // 2017-09 Defense Boost II Max, Illusionist: Mask ♂ / ♀, + Defense Boost I Max (1151) on 5★ Scrooge x3 / x2 / x1 to rank 100,000
  2500: { source: 'khuxwiki', brackets: wikiP3(1152, 'p20:102227', 'p20:102228').map((b, i) => {
    const n = [3, 2, 1, 1, 1, 1, 0, 0][i], tok = `scrooge5:1151${n > 1 ? `x${n}` : ''}`;
    return !n ? b : i < 4 ? [b[0], tok, ...b.slice(1)] : [tok, ...b];
  }) },
  2600: { source: 'khuxwiki', brackets: wikiP3(1128) }, // 2017-10 Attack Boost V
  2700: { source: 'khuxwiki', brackets: wikiP3(1227, 'p19:40069', 'p19:41069') }, // 2017-11 Second Chance III, Natural / Long Side Tails
  // 2017-12 ATK B V & Lux+; Santa Hat / Beard / Brows = Spirit parts (notice 34668), by bracket: Hat to 2,500, Beard to 50,000, Brows to 100,000
  2800: { source: 'khuxwiki + notice 34668', brackets: wikiP3(1189).map((b, i) =>
    [...['p33:402007', 'p33:411002', 'p33:401004'].filter((_, k) => i < [3, 5, 6][k]), ...b]) },
  2900: { source: 'khuxwiki', brackets: wikiP3(1153) }, // 2018-01 Defense Boost III Max
  3000: { source: 'khuxwiki', brackets: wikiP3(1198) }, // 2018-02 ATK B V Max & Lux+
  3100: { source: 'khuxwiki', brackets: wikiP3(1228) }, // 2018-03 Second Chance IV
  // Part 3b (PART3_AUDIT §6, PART4_AUDIT §5; RX = khuxwiki for these months, only the item types and counts read from RX, every skill
  // by NAME in skill.json). 2018-04 .. 11: the eight brackets, the featured skill on 6★ Scrooge x3 / x2 / x1 / x1, no avatar part
  3200: { source: 'khuxwiki', brackets: wikiP3(1190) }, // 2018-04 ATK Boost VI & Lux+
  3300: { source: 'khuxwiki', brackets: wikiP3(1149) }, // 2018-05 Defense Boost V
  3400: { source: 'khuxwiki', brackets: wikiP3(1200) }, // 2018-06 ATK B VI Max & Lux+
  3500: { source: 'khuxwiki', brackets: wikiP3(1241) }, // 2018-07 ATK B VII Max & GA 2
  3600: { source: 'khuxwiki', brackets: wikiP3(1202) }, // 2018-08 ATK B VII Max & Lux+
  3700: { source: 'khuxwiki', brackets: wikiP3(1131) }, // 2018-09 Attack Boost VIII
  3800: { source: 'khuxwiki', brackets: wikiP3(1192) }, // 2018-10 ATK B VIII & Lux+
  3900: { source: 'khuxwiki', brackets: wikiP3(1244) }, // 2018-11 ATK B VIII Max & GA 2
  // 2018-12 ATK B VIII Max & Lux+: nine brackets, P / S / M Gems (materials 48 / 49 / 50) 50 / 45 / 40 / 35 / 20 to rank 15,000 (the
  // values after the 27-12-2018 increase, notice 47137)
  4000: { source: 'khuxwiki', edges: BRACKETS9, brackets: [
    [...gems(50), 'scrooge6:1204x3', 'chip6x5', 'dale6x5', 'cidx5', 'mirrorx5'],
    [...gems(45), 'scrooge6:1204x2', 'chip6x3', 'dale6x3', 'cidx3', 'mirrorx4'],
    [...gems(40), 'scrooge6:1204', 'chip6x2', 'dale6x2', 'cidx3', 'mirrorx4'],
    [...gems(35), 'scrooge6:1204', 'chip6x2', 'dale6x2', 'cidx2', 'mirrorx3'],
    [...gems(20), 'scrooge6:1204', 'chip6', 'dale6', 'cid', 'mirrorx2'],
    ['chip6', 'dale6', 'cid', 'mirror'], ['chip5x3', 'dale5x3'], ['chip5x2', 'dale5x2'], ['chip5', 'dale5']] },
  // 2019-01 Attack Boost IX / 2019-02 ATK B IX & Lux+: Dual Meow Wow [SAB LV 9 / 8 / 7] x15 / 25 / 35 on top, eight brackets
  4100: { source: 'khuxwiki + relux', brackets: dmw8(1132) },
  4200: { source: 'khuxwiki + relux', brackets: dmw8(1193) },
  // 2019-03 ATK B IX Max & GA 2 (the previous GA 2 skills VIII .. IV Max below it) / 2019-04 ATK B IX Max & Lux+ (VIII .. IV Max Lux+): twelve
  // brackets. khuxwiki lists the top bracket (featured x3 + the previous skill x1); the lower brackets are the ReLux rows (types / counts)
  4300: { source: 'khuxwiki + relux', edges: BRACKETS12, brackets: twelve([1247, 1244, 1241, 1238, 1235, 1232]) },
  4400: { source: 'khuxwiki + relux', edges: BRACKETS12, brackets: twelve([1206, 1204, 1202, 1200, 1198, 1196]) },
};
for (const spec of Object.values(RELUX_RANKING)) spec.edges = spec.edges || BRACKETS8; // Part 2-3: the eight brackets
// one item of RELUX_RANKING -> {type, id, skillType, skillId, skillLv, num}
function rankItem(tok) {
  // «g:<materialId>x<n>»: a material (type 5; 48 / 49 / 50 = Power / Speed / Magic Gem as in our master)
  const g = /^g:(\d+)(?:x(\d+))?$/.exec(tok);
  if (g) {
    if (![48, 49, 50].includes(Number(g[1]))) throw new Error(`colosseum: ranking reward item «${tok}» unknown (materials 48 / 49 / 50)`);
    return { type: 5, id: Number(g[1]), skillType: 1, skillId: 0, skillLv: 1, num: g[2] ? Number(g[2]) : 1 };
  }
  const p = /^p(19|20|33):(\d+)$/.exec(tok);
  if (p) return { type: Number(p[1]), id: Number(p[2]), skillType: 1, skillId: 0, skillLv: 1, num: 1 };
  const m = /^([a-z]+?\d?)(?::(\d+))?(?:x(\d+))?$/.exec(tok);
  if (!m || !MEDAL[m[1]]) throw new Error(`colosseum: ranking reward item «${tok}» unknown`);
  const skill = m[2] ? Number(m[2]) : 0;
  if (skill && !SKILL_LV[skill]) throw new Error(`colosseum: ranking reward item «${tok}»: no level for skill ${skill}`);
  return { type: 3, id: MEDAL[m[1]], skillType: skill ? 3 : 1, skillId: skill, skillLv: skill ? SKILL_LV[skill] : 1, num: m[3] ? Number(m[3]) : 1 };
}
// the rankingReward rows of a relux season (RELUX_RANKING), ids from base
function reluxRewardRows(colosseumStageId, base) {
  const spec = RELUX_RANKING[colosseumStageId];
  if (!spec || spec.brackets.length !== spec.edges.length) throw new Error(`colosseum: season ${colosseumStageId} has no ranking rewards (RELUX_RANKING)`);
  return spec.brackets.map((items, i) => {
    if (!items.length || items.length > 10) throw new Error(`colosseum: season ${colosseumStageId} bracket ${i + 1}: ${items.length} rewards (1-10)`);
    const it = items.map(rankItem), col = (k) => it.map((x) => x[k]);
    return schemaRow('rankingReward', { rankingRewardId: base + i, startRank: spec.edges[i][0], endRank: spec.edges[i][1], validReward: it.length,
      type: col('type'), id: col('id'), skillType: col('skillType'), skillId: col('skillId'), skillLv: col('skillLv'), burstUpperNumber: it.map(() => 0), num: col('num') });
  });
}
// type-3 boards of each season, = the wiki board list of the month (6★ Cid 04/16; 6★ Scrooge + Tier 10 Bonus 3390 05/16;
// KH Chip M/F + Tier 10 Bonus 3090 06/16; Moogle M/F + Tier 10 Bonus 07/16; Part 2 Task 4: avatar M/F (19 nodes, 1100 coins) +
// Tier 10 Bonus (3090, proven on video) every month 08/16 .. 04/17, + Tier 11 Bonus (3390) from 02/17). Rows: the 1.1.3 sphere rows
// for the '113' seasons (their startDatetime month, checked), the cleaned ReLux board extract (readRelux, coliseum_boards.json,
// no dates: the month of each id is the private research BOARD_IMAGES.md month column, by id order and board counts per month
// checked against the khuxwiki months) for the 'relux' seasons. Every grid has START at row 4 column 0 and nothing in the
// top-left 2 x 2 (the board picture covers it, raid-boards.js IMAGE_CORNER): checked, a row that breaks it stops the run.
const SEASON_BOARDS = {
  800: [2200001], 900: [2200002, 2200023], 1000: [2210029, 2210030, 2210031], 1100: [2210033, 2210034, 2210035],
  1200: [2210037, 2210038, 2210039], // Summer Mickey, Summer Minnie, Tier 10 Bonus (2016-08)
  1300: [2210040, 2210041, 2210042], // Mushroom Hunt M / F, Tier 10 Bonus
  1400: [2210043, 2210044, 2210045], // Vampire M / F, Tier 10 Bonus
  1500: [2210046, 2210047, 2210048], // Timothy Mouse M / F, Tier 10 Bonus
  1600: [2210049, 2210050, 2210051], // Pegasus Knight M / F, Tier 10 Bonus
  1700: [2210052, 2210053, 2210054], // Armored Terra, Armored Aqua, Tier 10 Bonus
  1800: [2210055, 2210056, 2210057, 2210058], // Cowboy Goth, Cowgirl Goth, Tier 10 Bonus, Tier 11 Bonus
  1900: [2210059, 2210060, 2210061, 2210062], // Royal Knight M / F, Tier 10 Bonus, Tier 11 Bonus
  2000: [2210063, 2210064, 2210065, 2210066], // Ninja, Kunoichi, Tier 10 Bonus, Tier 11 Bonus (2017-04)
  // Part 3 Task 4: the ReLux boards 2210067 .. 2210106 (month by id order and per-month counts, private PART3_AUDIT.md §5):
  // avatar M / F (19 nodes, 1100) + Tier 10 Bonus (3090) + Tier 11 Bonus (3390) to 2017-11; from 2017-12 one both-gender board
  // (kindId 0, 19 nodes, 3500) + the two Bonus boards. 2018-01: the khuxwiki «Puppy Medium» / «Puppy Bob» boards were JP only
  // (no ReLux row, khuxwiki marks them JP: private PUPPY_BOARDS.md), not served.
  2100: [2210067, 2210068, 2210069, 2210070], // KH Dale M / F, Tier 10 Bonus, Tier 11 Bonus (2017-05)
  2200: [2210071, 2210072, 2210073, 2210074], // Hydrangea Prep (M), Hydrangea Formal (F), Tier 10 / 11 Bonus
  2300: [2210075, 2210076, 2210077, 2210078], // Mango Sweetie M / F, Tier 10 / 11 Bonus
  2400: [2210079, 2210080, 2210081, 2210082], // Buzz Cut M / F, Tier 10 / 11 Bonus
  2500: [2210083, 2210084, 2210085, 2210086], // Illusionist M / F, Tier 10 / 11 Bonus
  2600: [2210087, 2210088, 2210089, 2210090], // Trick or Treat II M / F, Tier 10 / 11 Bonus
  2700: [2210091, 2210092, 2210093, 2210094], // Natural (M), Long Side Tails (F), Tier 10 / 11 Bonus
  2800: [2210095, 2210096, 2210097], // Blue Reinstar (Spirit parts, cells of type 33), Tier 10 / 11 Bonus
  2900: [2210098, 2210099, 2210100], // Puppy Ears (Shag) & (Bob), Tier 10 / 11 Bonus
  3000: [2210101, 2210102, 2210103], // Heart-Shaped Balloon, Tier 10 / 11 Bonus
  3100: [2210104, 2210105, 2210106], // Mushroom Cut & Kitty Ears, Tier 10 / 11 Bonus (2018-03)
  // Part 3b Task 4: the ReLux boards 2210107 .. 2210150, in id order (private research; the board names and counts per month
  // checked against khuxwiki): 2018-04 .. 11 one both-gender 3500-coin board + Tier 10 / 11 Bonus; 2018-12 .. 2019-04 a Coliseum
  // Board (1230) + Tier 11 / 12 / 13 Bonus (1470 / 1900 / 3500), 8,100 coins = the tier coins
  3200: [2210107, 2210108, 2210109], 3300: [2210110, 2210111, 2210112], 3400: [2210113, 2210114, 2210115], 3500: [2210116, 2210117, 2210118],
  3600: [2210119, 2210120, 2210121], 3700: [2210122, 2210123, 2210124], 3800: [2210125, 2210126, 2210127], 3900: [2210128, 2210129, 2210130],
  4000: [2210131, 2210132, 2210133, 2210134], 4100: [2210135, 2210136, 2210137, 2210138], 4200: [2210139, 2210140, 2210141, 2210142],
  4300: [2210143, 2210144, 2210145, 2210146], 4400: [2210147, 2210148, 2210149, 2210150],
};
// the «Tier N Bonus» boards (boardName): unlocked on reaching Tier N of their season (client text «Unlocked a Coliseum Board!»;
// routes-colosseum-boards.js hands them out from then on). test-colosseum-boards.js checks it against the board names
const BONUS_TIER = {
  2200023: 10, 2210031: 10, 2210035: 10, 2210039: 10, 2210042: 10, 2210045: 10, 2210048: 10, 2210051: 10, 2210054: 10,
  2210057: 10, 2210058: 11, 2210061: 10, 2210062: 11, 2210065: 10, 2210066: 11,
  // Part 3: the last two boards of every month 2017-05 .. 2018-03
  ...Object.fromEntries([2100, 2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900].flatMap((sid) => SEASON_BOARDS[sid].slice(-2).map((id, i) => [id, 10 + i]))),
  // Part 3b: 2018-12 .. 2019-04 the last three boards are the Tier 11 / 12 / 13 Bonus
  ...Object.fromEntries([4000, 4100, 4200, 4300, 4400].flatMap((sid) => SEASON_BOARDS[sid].slice(-3).map((id, i) => [id, 11 + i]))),
};
const CORNER_FREE = (a) => [a.spCol0[0], a.spCol0[1], a.spCol1[0], a.spCol1[1]].every((v) => !v);
// Board card pictures img/sphere_incentive/<sphereBoardId>.png (client Select_Base layer, docs/notes/coliseum.md «Board card
// pictures»): b16 = the worldwide 2016 file of the same id (6★ Cid); every other served board = the khuxwiki «Preview - <board>»
// picture placed on the 306x306 card where the original board screenshot draws it (native size, no resampling; private files
// in --loc img/sphere_incentive_coli/). The 2016 bundle 2200002 (Scrooge alone) is not what the worldwide board showed: the
// screenshot has Scrooge with Cid, Chip and Dale, so 2200002 uses the wiki picture too. Written to game_data/colosseum_board_art.tsv
// for the served boards, imported by build-resources.ps1 like the raid / event board cards.
// Part 2 (Task 4, recon/tools/coliseum_board_cards.py, the method as a tool): jp:<file> = the JP 4.3.1 card of the same avatar set
// when it fits the worldwide board screenshot AND the wiki preview is a cut of it (difference 0.00: the same picture); the four
// JP twins are Summer Mickey / Minnie and Mushroom Hunt M / F. Vampire M / F (JP 2200045 / 2200046: no bat wings on the JP
// cards), Ninja and Kunoichi (JP 2200025 / 2200026: other pictures) and every board without a JP candidate: loc (the wiki
// preview at native size, placed as the screenshot shows it). A board missing here is loc.
// Part 3 Task 4: the cards prepared ahead with the same method (private board_art_all.json): JP twins KH Dale M / F (accepted by the
// user 26-11), Buzz Cut, Trick or Treat II, Natural / Long Side Tails, Blue Reinstar; every other Part 3 board loc. PENDING_ART =
// boards whose card waits for the user's review (no fitting picture yet): no line in the art list, so the client keeps the default
// card slot and the Catalog its placeholder; give the board a BOARD_ART value and drop it from PENDING_ART once approved.
const BOARD_ART = { 2200001: 'b16', 2210037: 'jp:2200037.png', 2210038: 'jp:2200038.png', 2210040: 'jp:2200041.png', 2210041: 'jp:2200042.png',
  2210067: 'jp:2200017.png', 2210068: 'jp:2200018.png', 2210079: 'jp:2200095.png', 2210080: 'jp:2200096.png', 2210087: 'jp:2200105.png',
  2210088: 'jp:2200106.png', 2210091: 'jp:2200110.png', 2210092: 'jp:2200111.png', 2210095: 'jp:2200115.png',
  ...Object.fromEntries([2210069, 2210070, 2210071, 2210072, 2210073, 2210074, 2210075, 2210076, 2210077, 2210078, 2210081, 2210082, 2210083, 2210084, 2210085, 2210086, 2210089,
    2210090, 2210093, 2210094, 2210096, 2210097, 2210098, 2210099, 2210100, 2210101, 2210102, 2210103, 2210104, 2210105, 2210106].map((id) => [id, 'loc'])),
  // Part 3b Task 4 (user-approved cards, private board_art_all.json): 2210107 .. 127 loc (the wiki preview placed as on the board
  // screenshot), 2210128 .. 150 the JP cards of the same pictures; Tier 11 / 12 / 13 Bonus = JP 2200169 / 170 / 171
  ...Object.fromEntries(Array.from({ length: 21 }, (_, i) => [2210107 + i, 'loc'])),
  2210128: 'jp:2200168.png', 2210129: 'jp:2200169.png', 2210130: 'jp:2200170.png', 2210131: 'jp:2200172.png', 2210135: 'jp:2200176.png',
  2210139: 'jp:2200180.png', 2210143: 'jp:2200184.png', 2210147: 'jp:2200188.png',
  ...Object.fromEntries([2210132, 2210136, 2210140, 2210144, 2210148].flatMap((b) => [[b, 'jp:2200169.png'], [b + 1, 'jp:2200170.png'], [b + 2, 'jp:2200171.png']])) };
// Mango Sweetie M / F 2210075 / 076 and Illusionist M / F 2210083 / 084: loc cards rebuilt from the small (144 px) wiki picture,
// approved by the user 26-11; no board waits for its card now
const PENDING_ART = new Set();
function artLines(boardIds) {
  const head = ['# Coliseum Board card pictures, written by server/make-colosseum.js (BOARD_ART).',
    '# Columns as in originals.tsv. b16 = the worldwide 2016 file of the same id; jp = the JP 4.3.1 card of the same picture (another id);'
    + ' loc = the khuxwiki card picture placed as on the original board screenshot.'];
  const line = (id) => {
    const art = BOARD_ART[id] || 'loc';
    if (art === 'b16') return `img/sphere_incentive/${id}.png\tb16`;
    if (art.startsWith('jp:')) return `img/sphere_incentive/${id}.png\tjp\timg/sphere_incentive/${art.slice(3)}`;
    return `img/sphere_incentive/${id}.png\tloc\t=img/sphere_incentive_coli/${id}.png`;
  };
  return [...head, ...boardIds.filter((id) => !PENDING_ART.has(id)).map(line)].join('\n') + '\n';
}
// Coliseum Catalog banner (Task 6; user 25-11: the first catalog banner of the Events tab): evStage CATALOG_EV, eventType 0,
// Details -> CATALOG_URL (colosseum-pages.js), a tap opens the Training Grounds quest CATALOG_STAGE of make-special (the stage of
// the Raid and Event Catalog banners too); the card game_data/colosseum_img/6000.png (recon/tools/make_special_banners.py
// --section colosseum). After a change of the cards bump COLOSSEUM_IMG_VERSION, then the master revision.
const CATALOG_EV = 6000, CATALOG_STAGE = 970000, CATALOG_URL = '/web/colosseum/catalog', COLOSSEUM_IMG_VERSION = 3;
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
// the 2017 era curve (Part 3 Task 5, see the comment block): the season-end points of private CUTOFFS_2017.md (its «fit» rows, same
// order), [month, rank, global round, reddit id]; a least-squares fit of log10(round) on log10(rank)
const ERA17_POINTS = [
  ['2017-05', 10200, 313, '6e01rg'], ['2017-05', 99, 788, '6f291y'], ['2017-05', 101, 842, '6f291y'], ['2017-05', 196, 695, '6f291y'],
  ['2017-06', 1000, 655, '6o1ra2'], ['2017-06', 459, 684, '6o1ra2'],
  ['2017-07', 991, 796, '6qhit7'], ['2017-07', 10000, 410, '6qhit7'], ['2017-07', 5500, 503, '6qhit7'], ['2017-07', 8200, 443, '6qhit7'],
  ['2017-09', 100, 1578, '73i23q'],
  ['2017-10', 100, 1814, '7aafnf'], ['2017-10', 1000, 1351, '7aafnf'], ['2017-10', 2500, 1031, '7aafnf'], ['2017-10', 10000, 722, '7aafnf'],
  ['2017-11', 100, 4283, '7gtzkx'], ['2017-11', 1000, 3222, '7gtzkx'], ['2017-11', 2500, 2677, '7gtzkx'], ['2017-11', 10000, 2158, '7gtzkx'],
  ['2017-12', 100, 2716, '7p6gif'], ['2017-12', 1000, 2222, '7p6gif'], ['2017-12', 2500, 1953, '7p6gif'], ['2017-12', 10000, 1397, '7p6gif'],
];
// least squares of log10(round) on log10(rank) over points; slope b fixed when given (then only the intercept: the mean)
function logFit(points, fixedB) {
  const xs = points.map((p) => Math.log10(p[1])), ys = points.map((p) => Math.log10(p[2])), n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n, my = ys.reduce((s, v) => s + v, 0) / n;
  const b = fixedB !== undefined ? fixedB : xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return { a: my - b * mx, b };
}
// a threshold curve: round(rank) on the fit to FIT_RANK, log-linear from there to 1 round at PLAYERS (every ranked player inside);
// label «fitted» for a rank inside [lo, hi] (the ranks of the points behind it), else «interpolated»
// FIT_RANK = the last bracket edge of the fitted range (the era points reach 10,200); PLAYERS = ranked players a month
const ERA17_FIT_RANK = 10000, ERA17_PLAYERS = 100000;
// guardB (a month curve: the era slope): outside [lo, hi] the month's own fit is not extrapolated; the curve goes on with the era
// slope from the fitted value at the nearest edge (re-review 26-11: 2017-07's own slope -0.28 from ranks 991 .. 10,000 gave 1,527
// at rank 100, the guard gives ~1,130); inside [lo, hi] the own fit is unchanged
function eraCurve(a, b, lo, hi, guardB) {
  const fit = (rank) => 10 ** (a + b * Math.log10(rank));
  const curve = guardB === undefined ? fit : (rank) => (rank < lo ? fit(lo) * (rank / lo) ** guardB : rank > hi ? fit(hi) * (rank / hi) ** guardB : fit(rank));
  const top = Math.round(curve(ERA17_FIT_RANK));
  const round = (rank) => (rank >= ERA17_PLAYERS ? 1 : rank <= ERA17_FIT_RANK ? Math.round(curve(rank))
    : Math.max(1, Math.round(top - (top - 1) * Math.log10(rank / ERA17_FIT_RANK) / Math.log10(ERA17_PLAYERS / ERA17_FIT_RANK))));
  return { a, b, curve, round, label: (rank) => (rank >= lo && rank <= hi ? 'fitted' : 'interpolated') };
}
// per-month calibration (controller ruling 26-11): a month with its own season-end points gets its own curve; both parameters when
// its points span at least one decade of rank (MONTH_SPAN), else the era slope and its own intercept; the other months the era curve
const ERA17_MONTH_SPAN = 1;
// the era object of a points table: the era curve (least squares over all points) and a month curve for every month that has points;
// `of(colosseumStageId)` = the month's curve, else the era curve, null outside the era's seasons [lo, hi]
function makeEra(points, lo, hi, tolerance, monthTolerance) {
  const { a, b } = logFit(points);
  const era = eraCurve(a, b, Math.min(...points.map((p) => p[1])), ERA17_FIT_RANK);
  const months = {};
  for (const m of [...new Set(points.map((p) => p[0]))]) {
    const pts = points.filter((p) => p[0] === m), ranks = pts.map((p) => p[1]);
    const both = Math.log10(Math.max(...ranks) / Math.min(...ranks)) >= ERA17_MONTH_SPAN;
    const f = logFit(pts, both ? undefined : b);
    months[m] = { ...eraCurve(f.a, f.b, Math.min(...ranks), Math.max(...ranks), b), method: both ? 'own fit' : 'era slope, own intercept', points: pts };
  }
  const seasons = new Map(SEASONS.filter((s) => s.colosseumStageId >= lo && s.colosseumStageId <= hi).map((s) => [s.colosseumStageId, s.month]));
  return { seasons, points, a, b, curve: era.curve, round: era.round, label: era.label, tolerance, months, monthTolerance,
    of: (colosseumStageId) => (seasons.has(colosseumStageId) ? months[seasons.get(colosseumStageId)] || era : null) };
}
const ERA17 = makeEra(ERA17_POINTS, 2100, 3100, 2.85, 1.15);
// the 2018-04 .. 2019-04 era (Part 3b Task 5, private CUTOFFS_2018.md): [month, rank, global round, reddit id]; only the season-end /
// late-month points (the module comment lists which of the 34 recorded rows are fitted and why); global round = 1,570 + the round of
// the 999-round tier stated (the rounds before T16)
const ERA18_POINTS = [
  ['2018-04', 4068, 1840, '8g8ebk'],
  ['2018-06', 10000, 2120, '8vj3yy'], ['2018-06', 10000, 2070, '8un0ma'], ['2018-06', 1395, 3396, '8uyc6n'], ['2018-06', 230, 4567, '8un0ma'],
  ['2019-04', 100, 4575, 'bhctoi'],
];
const ERA18 = makeEra(ERA18_POINTS, 3200, 4400, 1.3, 1.15);

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

// a ReLux tier row with its type-3 reward ids mapped to ours (RELUX_MEDAL); with masterMedalIds (our medal master) an id that is
// neither mapped nor in it stops the build
// the same mapping for a board's cells (sphereMasu: rewardSelect 3 = medal, rewardId the medal): 90135 -> Magic Broom 300948
function reluxCellMedals(m, masterMedalIds, boardId) {
  const r = { ...m, rewardId: [...m.rewardId] };
  m.rewardSelect.forEach((sel, i) => {
    if (sel !== 3) return;
    if (!RELUX_MEDAL[m.rewardId[i]]) {
      if (masterMedalIds && !masterMedalIds.has(m.rewardId[i])) throw new Error(`colosseum: board ${boardId} cell ${i} pays medal ${m.rewardId[i]}, not in our medal master and not mapped (RELUX_MEDAL)`);
      return;
    }
    r.rewardId[i] = RELUX_MEDAL[m.rewardId[i]];
    if (masterMedalIds && !masterMedalIds.has(r.rewardId[i])) throw new Error(`colosseum: board ${boardId} cell ${i} pays medal ${r.rewardId[i]} (mapped), not in our medal master (build it with KHUX_MEDALS_ALL=1)`);
  });
  return r;
}
function reluxMedals(t, masterMedalIds, month) {
  if (!(t.validReward > 0)) return t;
  const r = { ...t, rewardId: [...t.rewardId] };
  for (let i = 0; i < t.validReward; i++) {
    if (t.rewardType[i] !== 3) continue;
    const id = t.rewardId[i];
    if (RELUX_MEDAL[id]) r.rewardId[i] = RELUX_MEDAL[id];
    else if (masterMedalIds && !masterMedalIds.has(id)) throw new Error(`colosseum: ${month}: tier ${t.colosseumId} pays medal ${id}, not in our medal master and not mapped (RELUX_MEDAL)`);
  }
  if (masterMedalIds) for (let i = 0; i < t.validReward; i++) {
    if (r.rewardType[i] === 3 && !masterMedalIds.has(r.rewardId[i])) throw new Error(`colosseum: ${month}: tier ${t.colosseumId} pays medal ${r.rewardId[i]} (mapped), not in our medal master (build it with KHUX_MEDALS_ALL=1)`);
  }
  return r;
}

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
// thresholds of a season (finiteRounds = rounds before its first endless tier), one per bracket, lowest first
// a bracket reaching EVERYONE (2016-05: ranks to 5,000,000 and 10,000,000) was open to every ranked player: one round
const EVERYONE = 1000000;
// colosseumStageId of an ERA17 / ERA18 season: its own curve (Part 3 Task 5, Part 3b Task 5), the finite-round shift does not apply
const thresholdsOf = (brackets, finiteRounds, colosseumStageId, c = ERA17.of(colosseumStageId) || ERA18.of(colosseumStageId)) => brackets.map((b) => (c
  ? { startRank: b.startRank, endRank: b.endRank, score: c.round(b.endRank), label: c.label(b.endRank) }
  : { startRank: b.startRank, endRank: b.endRank, score: b.endRank >= EVERYONE ? 1 : cutoffRound(b.endRank, finiteRounds), label: 'interpolated' }));
// {brackets, thresholds} of a season from its tier rows and the rankingReward rows of its ranking (master or 1.1.3); the era from
// the tier rows' colosseumStageId
function rankedOf(tierRows, rewardRows) {
  const tiers = [...tierRows].sort(byKey('round'));
  // the rounds before the first endless (999-round) tier (Part 3: the later 999-round tiers served too do not move the curve)
  const endless = tiers.findIndex((t) => t.arrivalStageCount >= ENDLESS);
  const finite = tiers.slice(0, endless < 0 ? tiers.length : endless).reduce((n, t) => n + t.arrivalStageCount, 0);
  const brackets = bracketsOf(rewardRows);
  return { brackets, thresholds: thresholdsOf(brackets, finite, tiers.length ? tiers[0].colosseumStageId : 0) };
}

// Pure: src = the 1.1.3 tables {colosseumStage, colosseum, stage, enemy, ranking, rankingReward, sphere, sphereArray,
// sphereMasu} + masterEnemyIds (ids already in our master) + relux (readRelux, for the 'relux' seasons). -> rows per table +
// ranked {colosseumStageId: {brackets, thresholds}}.
function seasonRows(src, seasons = SEASONS) {
  const out = Object.fromEntries(TABLES.map((t) => [t, []]));
  out.ranked = {};
  out.pending = []; // seasons skipped whole (SEASONS pending: the enemies are not settled yet): {month, colosseumStageId, pending}
  const findIn = (from, label) => (table, key, id, what) => {
    const r = ((from || {})[table] || []).find((x) => x[key] === id);
    if (!r) throw new Error(`colosseum: ${what}: ${label} ${table} ${id} missing`);
    return r;
  };
  const find = findIn(src, '1.1.3');
  const clone = (r) => JSON.parse(JSON.stringify(r));
  // the next free stage id: after the 1.1.3 Coliseum stage rows (stage rows the sources lack, see the comment block)
  let nextStageId = Math.max(RANGES.stage[1] - 1, ...(src.stage || []).filter((r) => r.stageKind === 3 && r.id >= RANGES.stage[1] && r.id <= RANGES.stage[2]).map((r) => r.id)) + 1;
  // the template stage row at set position i (STAGE_TEMPLATE, see the comment block)
  const templateStage = (i, what) => {
    const t = (src.colosseumStage || []).find((x) => x.colosseumStageId === STAGE_TEMPLATE);
    const st = t && i < t.validStage && (src.stage || []).find((x) => x.stageId === t.stageId[i] && x.stageKind === 3);
    if (!st) throw new Error(`colosseum: ${what}: no 1.1.3 stage row of season ${STAGE_TEMPLATE} at position ${i + 1} (stage template)`);
    return schemaRow('stage', st, validMap(st, STAGE_VALID), STAGE_DEFAULTS);
  };
  for (const s of seasons) {
    if (s.pending) { out.pending.push({ month: s.month, colosseumStageId: s.colosseumStageId, pending: s.pending }); continue; }
    const id = s.colosseumStageId, relux = s.source === 'relux';
    if (relux && !src.relux) throw new Error(`colosseum: ${s.month}: the ReLux season extract is not loaded`);
    const from = relux ? findIn(src.relux, 'ReLux') : find;
    const cs = from('colosseumStage', 'colosseumStageId', id, s.month);
    const all = ((relux ? src.relux : src).colosseum || []).filter((t) => t.colosseumStageId === id && t.colosseumId >= cs.headColosseumId && t.colosseumId <= cs.termColosseumId)
      .sort(byKey('colosseumId'));
    if (all.length !== cs.termColosseumId - cs.headColosseumId + 1) throw new Error(`colosseum: ${s.month}: tier rows ${cs.headColosseumId}-${cs.termColosseumId} incomplete`);
    // the tiers served (user 26-11, Coliseum Part 3): every row inside head..term of a relux season, the 999-round tiers after the
    // first one too (each with its own rewards, as the source); the 1.1.3 seasons keep their rows up to the first endless tier
    // (= head..term on every 1.1.3 row served)
    const endless = all.findIndex((t) => t.arrivalStageCount >= ENDLESS);
    // a 0-round row inside head..term is the end marker of the source (2018-08 .. 2019-04): never served (Part 3b)
    // the revamp (Part 4): a tier row with AP > 0 is not served (the designer wall T19), the last tier served is finite
    const tiers = relux ? all.filter((t) => t.arrivalStageCount > 0 && !(id >= REVAMP_FIRST && t.ap > 0)) : endless < 0 ? all : all.slice(0, endless + 1);
    if (!tiers.length) throw new Error(`colosseum: ${s.month}: no tier with rounds`);
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
    const tierRows = tiers.map((t) => tierRow(relux ? reluxMedals(t, src.masterMedalIds, s.month) : t));
    out.colosseum.push(...tierRows);
    const stages = [];
    for (let i = 0; i < cs.validStage; i++) {
      const st = (src.stage || []).find((x) => x.stageId === cs.stageId[i]); // the 1.1.3 row of the original stage
      let r;
      if (st) {
        if (st.stageKind !== 3) throw new Error(`colosseum: ${s.month}: stage ${cs.stageId[i]} is not a Coliseum stage`);
        r = schemaRow('stage', st, validMap(st, STAGE_VALID), STAGE_DEFAULTS);
      } else if (relux) {
        r = Object.assign(templateStage(i, s.month), { id: nextStageId++, name: 'strDummy' });
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
      // own ranking row (RANKING_ROW) and the rewards of RELUX_RANKING, ids in the season's block
      const base = REWARD_BASE + (cs.rankingId - REWARD_FIRST_RANKING) * REWARD_BLOCK, n = (RELUX_RANKING[id] || { edges: BRACKETS8 }).edges.length;
      if (cs.rankingId < REWARD_FIRST_RANKING || n > REWARD_BLOCK || base + n - 1 > RANGES.rankingReward[2]) throw new Error(`colosseum: ${s.month}: no reward id block for ranking ${cs.rankingId}`);
      rkRow = schemaRow('ranking', { ...clone(RANKING_ROW), rankingId: cs.rankingId, startRank: base, endRank: base + n - 1, startDatetime: START, endDatetime: END });
      rewards = reluxRewardRows(id, base);
    }
    out.ranking.push(rkRow);
    out.rankingReward.push(...rewards);
    out.ranked[id] = rankedOf(tierRows, rewards);
    // the boards: the 1.1.3 rows (dated: the month checked) or the ReLux board extract (undated: the month is SEASON_BOARDS)
    for (const boardId of SEASON_BOARDS[id] || []) {
      const b = from('sphere', 'sphereBoardId', boardId, s.month);
      if (b.type !== 3 || (!relux && String(b.startDatetime).slice(0, 7) !== s.month)) throw new Error(`colosseum: board ${boardId} (type ${b.type}, ${b.startDatetime}) is not a Coliseum board of ${s.month}`);
      const arr = from('sphereArray', 'arryId', b.arryId, `board ${boardId}`), masu = reluxCellMedals(from('sphereMasu', 'masuId', b.masuId, `board ${boardId}`), relux ? src.masterMedalIds : null, boardId);
      const grid = Object.assign(schemaRow('sphereArray', arr), { arryId: boardId });
      if (grid.spCol4[0] !== 1000) throw new Error(`colosseum: board ${boardId}: START is not at row 4 column 0`);
      if (!CORNER_FREE(grid)) throw new Error(`colosseum: board ${boardId}: a cell in the top-left 2 x 2 corner (under the board picture)`);
      out.sphere.push(Object.assign(schemaRow('sphere', b), { arryId: boardId, masuId: boardId, detailUrl: '', startDatetime: START, endDatetime: END }));
      out.sphereArray.push(grid);
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
// base ids whose rows of OUR master (not 1.1.3 / raw ReLux) the user approved as the base of a variant rule row; empty on purpose
const MASTER_BASE_APPROVED = [];
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

// Enemy rows (Coliseum Part 2 Task 3, Part 3 Task 3). Every Coliseum variant of the 1.1.3 master missing from ours (as in Part 1),
// then every id the served stages use (src.stageEnemies {stageId: [enemyId]}, readStageEnemies) missing from our master, from the
// first source that has it (plan 2026-11-26-coliseum-part3.md, Global Constraints):
// 1. the 1.1.3 row of the id ('113');
// 2. the raw ReLux row of the id (src.reluxEnemies, the donor's whole enemy table, 'relux') when reluxShape calls it 'old' (the
//    1.1.3 knots 1/35/100/300/999(/9999) or the 2017 month curve 1/100/300/600/9999/99999); a 2019-revamp row (knots
//    1/1400/2600/3100/3200/9999, VERIFY.md §1: the live master overwrote the 20xxx ids with the 2019 values) or a corrupt one
//    (placeholder knots, the rest binary padding: 161020099 / 126 / 153 / 154) is never used;
// 2b. MONTH_COPY_OF: an explicit month copy of a raw old-shape row of another id (21546 = 180911546), 'monthCopy', else a stop;
// 3. a month id (monthBase: YYMM + a Coliseum id, 161020007 = 2016-10 copy of 20007, or 1 + a Coliseum id, 120097) takes the row
//    of its base Coliseum id (our master's row, else the one this run derives for it) with the new id, the base's displayId kept
//    ('monthCopy');
// 4. the variant rule ('rule', docs/notes/coliseum.md «Enemy variant rule»: same level knots up to LV 999, same ATK / DEF / EXP /
//    lux / score, same HP below LV 300, HP x3 at LV 300, 40/11 x that at LV 999, no munny or raid points; the rest of the row as
//    the base, though the originals also differ in score / CP / skills, which no rule gives) against the base id - 20000: the
//    1.1.3 row of the base, else its raw ReLux row of the old shape (originals), else our master's row (baseSource 'master':
//    for the gap ids our master's row may be our own clone, reported, never silent).
// Original Coliseum ids only: 20000-29999 (ENEMY_RANGE) and the month ids of the served stage lists. No source at all stops the
// build (docs/notes/coliseum.md «Enemy rows of the served stages»): the stats of such an enemy are decided per enemy as for the
// raids and added as a source here; 'estimate' is a reserved label for those rows, never a silent path. Rows of our master are
// never written again. out.colosseumEnemies = [{enemyId, source, label, stages, base?, baseSource?, reluxShape?, nameInferred?}]:
// base = the row a monthCopy / rule row comes from, baseSource its source ('113' / 'relux' / 'master', rule rows), reluxShape why
// the id's own raw ReLux row was refused, nameInferred when no source holds a row of the id at all (21557: the name is the base
// model's, «The Good Boy»). Labels colosseumEnemy<source> (the notice labels colosseumEnemyRelux / MonthCopy / Rule / Estimate for
// the non-1.1.3 values). out.enemyCheck = {checked, reason, unchecked: [stageId]}: checked false when the stage enemy lists are
// missing or do not cover every served stage (a clean machine before its first resource build: make-game-tables runs before
// gen_colosseum_stages / import_colosseum_stages, so a hard stop there would break the build; the stage import still refuses a
// missing enemy).
// the enemy rows the Part 3 seasons add (raw ReLux old shape 12, month copies 6, variant rule 30; test-make-colosseum.js checks that
// a build on a master without them adds exactly these): original rows with their own counters and status attacks, so the
// master-wide checks of our story rows (test-enemy-attack / test-enemy-mechanics) and the event name lookups (make-events.js) treat
// them apart. The master carries no label, and a second regen adds none (the rows are already there): hence the explicit list.
const PART3_ENEMY_IDS = new Set([20057, 20097, 20114, 20161, 20240, 20251, 20255, 21500, 21502, 21503, 21504, 21505, 21506, 21508, 21509, 21510, 21515, 21517,
  21521, 21525, 21527, 21530, 21534, 22500, 22501, 22502, 22503, 22506, 22507, 22508, 22510, 120097, 161020007, 161020011, 161020015,
  161020022, 161020033, 161020036, 161020059, 161020092, 161020093, 161020099, 161020110, 161020116, 161020126, 161020137, 161020153, 161020154]);
// the enemy rows the Part 3b seasons add (2018-04 .. 2019-04: raw ReLux old shape 31 = 170920091 + the 30 1710xxxxx of 2018-05, variant
// rule 29, month copy 1 = 21546); the same reason for the explicit list as PART3_ENEMY_IDS
const PART3B_ENEMY_IDS = new Set([20020, 20095, 20096, 20129, 20199, 20227, 20249, 20271, 21026, 21031, 21520, 21522, 21523, 21524, 21529, 21531, 21535,
  21536, 21537, 21539, 21540, 21542, 21545, 21546, 21549, 21552, 21563, 21581, 22504, 22505, 170920091, 171020007, 171020011, 171020017, 171020019,
  171020021, 171020022, 171020023, 171020026, 171020033, 171020042, 171020043, 171020059, 171020067, 171020075, 171020097, 171020116, 171020172,
  171020176, 171021506, 171021521, 171021534, 171021548, 171022503, 171022506, 171022508, 171022510, 171028043, 171028172, 171029043, 171029172]);
// an explicit month copy whose source id is not the monthBase of the target (user decision 26-11): 21546 Jewel Sorceress (WW 2018-06 and
// 2019-04; its base 1546 exists nowhere and its own raw ReLux row is 2019 shape) = the JP Coliseum row 180911546 (September 2018, old
// shape) under the id 21546, label colosseumEnemyMonthCopy; the source row must be of the old shape, else the build stops
const MONTH_COPY_OF = { 21546: 180911546 };
const ENEMY_LABEL = { 113: 'colosseumEnemy113', rule: 'colosseumEnemyRule', relux: 'colosseumEnemyRelux', monthCopy: 'colosseumEnemyMonthCopy',
  estimate: 'colosseumEnemyEstimate' };
const variantId = (id) => id >= ENEMY_RANGE[0] && id <= ENEMY_RANGE[1];
// the base Coliseum id of a month id (YYMM + 20xxx, 1 + 20xxx), null for any other id
function monthBase(id) {
  if (!Number.isSafeInteger(id) || id < 100000) return null;
  const base = id % 100000, prefix = Math.floor(id / 100000);
  if (!variantId(base)) return null;
  if (prefix === 1) return base;
  const mm = prefix % 100;
  return prefix >= 1000 && prefix <= 9999 && mm >= 1 && mm <= 12 ? base : null;
}
// the shape of a raw ReLux enemy row: 'old' (the 1.1.3 knots or the 2017 month curve), '2019' (the 2019 Coliseum revamp: its
// knots, or the revamp's ATK cap 2,100,000,000), 'corrupt' (anything else: placeholder knots, values past the safe integers,
// a missing row). Only the first validGrowth values count (the rest is binary padding in every donor row).
const OLD_KNOTS = [[1, 35, 100, 300, 999, 9999], [1, 35, 100, 300, 999], [1, 100, 300, 600, 9999, 99999]].map(String);
const KNOTS_2019 = String([1, 1400, 2600, 3100, 3200, 9999]);
const ATK_CAP_2019 = 2100000000;
// the HP scale of the old Coliseum curve (Part 3b Task 3, the Part 3 follow-up): HP at LV 300 / HP at LV 100 of the genuine old rows
// = 0.80 .. 11.83 (the 125 Coliseum variants of the 1.1.3 master), 2.06 .. 10.12 (the 12 Part 3 raw rows), at most 10.71 (the Coliseum
// rows 1710xxxxx); the raw table's placeholder rows with the old knots sit at 20x, 25x, 180x. A band of 0.5 .. 12 keeps every genuine
// row and refuses those. The 2019 curve is 1.19 at its two middle knots (constant over the 473 rows), so the ratio cannot tell it
// apart: its HP at LV 300 (6.6e9 and up) is over the revamp's 2.1e9 cap, the same cap as the ATK check, and calls the row '2019'.
const HP_RATIO_BAND = [0.5, 12];
function reluxShape(r) {
  const n = r && r.validGrowth;
  if (!n || n > 6) return 'corrupt';
  const cut = (f) => (Array.isArray(r[f]) ? r[f].slice(0, n) : []);
  const lv = cut('baseLv');
  if (['baseLv', 'hp', 'attack', 'defense'].some((f) => cut(f).length !== n || cut(f).some((v) => !Number.isSafeInteger(v) || v < 0))) return 'corrupt';
  if (lv[0] !== 1 || lv.some((l, i) => i && l <= lv[i - 1])) return 'corrupt';
  if (String(lv) === KNOTS_2019 || cut('attack').some((v) => v >= ATK_CAP_2019)) return '2019';
  if (!OLD_KNOTS.includes(String(lv))) return 'corrupt';
  const hp = cut('hp'), hp100 = hp[lv.indexOf(100)], hp300 = hp[lv.indexOf(300)];
  if (hp300 >= ATK_CAP_2019) return '2019';
  return hp100 > 0 && hp300 / hp100 >= HP_RATIO_BAND[0] && hp300 / hp100 <= HP_RATIO_BAND[1] ? 'old' : 'corrupt';
}
// a row of the 4.3.1 enemy schema, arrays cut at their valid counts
const enemySchemaRow = (r) => schemaRow('enemy', r, validMap(r, ENEMY_VALID));
const schemaRowOf = (table, r) => (table === 'enemy' ? enemySchemaRow(r) : schemaRow(table, r));
function enemyRows(src, out) {
  const masterRows = src.masterEnemies || [];
  const have = new Set([...(src.masterEnemyIds || []), ...masterRows.map((r) => r.enemyId)]);
  const added = new Map(); // enemyId -> report entry
  const add = (id, row, source, stages, extra = {}) => {
    have.add(id);
    out.enemy.push(row);
    added.set(id, { enemyId: id, source, label: ENEMY_LABEL[source], stages, ...extra });
  };
  const row113 = new Map((src.enemy || []).map((e) => [e.enemyId, e]));
  for (const e of [...(src.enemy || [])].sort(byKey('enemyId'))) {
    if (!variantId(e.enemyId) || have.has(e.enemyId)) continue;
    add(e.enemyId, enemySchemaRow(e), '113', []);
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
    const master = new Map(masterRows.map((r) => [r.enemyId, r]));
    const relux = new Map((src.reluxEnemies || []).map((r) => [r.enemyId, r]));
    const rows = new Map(out.enemy.map((r) => [r.enemyId, r])); // the rows of this run, by id
    // the row of a base: our master's, else one this run derived (resolved on demand, also when no stage needs the base itself)
    const derived = new Map(); // id -> {row, source, extra} or null
    // a variant-rule row needs an ORIGINAL base (1.1.3 or an old-shape raw row); our master's row may be one of our own clones: stop
    const resolve = (id) => {
      if (derived.has(id)) return derived.get(id);
      derived.set(id, null); // a loop has no source
      const e113 = row113.get(id), rx = relux.get(id), shape = rx ? reluxShape(rx) : undefined, mb = monthBase(id);
      const refused = rx && shape !== 'old' ? { reluxShape: shape } : {};
      const named = rx || e113 ? {} : { nameInferred: true };
      let res = null;
      if (e113) res = { row: enemySchemaRow(e113), source: '113', extra: {} };
      else if (rx && shape === 'old') res = { row: enemySchemaRow(rx), source: 'relux', extra: {} };
      else if (MONTH_COPY_OF[id] !== undefined) {
        const sid = MONTH_COPY_OF[id], srx = relux.get(sid);
        if (srx && reluxShape(srx) === 'old') res = { row: { ...enemySchemaRow(srx), enemyId: id }, source: 'monthCopy', extra: { base: sid, baseSource: 'relux', ...refused, ...named } };
      } else if (mb !== null) {
        const b = baseRow(mb);
        if (b) res = { row: { ...enemySchemaRow(b), enemyId: id }, source: 'monthCopy', extra: { base: mb, ...refused, ...named } };
      } else if (variantId(id)) {
        const bid = id - 20000, b113 = row113.get(bid), brx = relux.get(bid), bm = master.get(bid);
        const [b, baseSource] = b113 ? [b113, '113'] : brx && reluxShape(brx) === 'old' ? [enemySchemaRow(brx), 'relux'] : bm && MASTER_BASE_APPROVED.includes(bid) ? [bm, 'master'] : [null, null];
        const rule = b && ruleRow(id, b);
        if (!b && bm && ruleRow(id, bm)) throw new Error(`colosseum: variant rule row ${id} has no original base (the base ${bid} exists only as a row of our master, possibly one of our own clones); `
          + 'approve it by adding the base id to MASTER_BASE_APPROVED (user decision) or find an original row');
        if (rule) res = { row: rule, source: 'rule', extra: { base: bid, baseSource, ...refused, ...named } };
      }
      derived.set(id, res);
      return res;
    };
    const baseRow = (id) => master.get(id) || rows.get(id) || (resolve(id) || {}).row || null;
    for (const [id, stages] of [...need].sort((a, b) => a[0] - b[0])) {
      if (added.has(id)) { added.get(id).stages = stages; continue; }
      if (have.has(id)) continue;
      const where = `enemy ${id} of stage ${stages.join(', ')}`;
      if (!variantId(id) && monthBase(id) === null) throw new Error(`colosseum: ${where} is missing from the master and is not a Coliseum variant id (20000-29999) nor a month id (YYMM / 1 + one)`);
      const res = resolve(id);
      if (!res) {
        const base = MONTH_COPY_OF[id] !== undefined ? `no old-shape row ${MONTH_COPY_OF[id]} to copy` : monthBase(id) !== null ? `no row for its base ${monthBase(id)}` : `no base ${id - 20000} for the variant rule`;
        throw new Error(`colosseum: ${where} has no source (no 1.1.3 row, no ReLux row of the old shape, ${base}): `
          + 'its stats are decided per enemy as for the raids (label colosseumEnemyEstimate), see docs/notes/coliseum.md «Enemy rows of the served stages»');
      }
      add(id, res.row, res.source, stages, res.extra);
      rows.set(id, res.row);
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
// the cleaned ReLux season extract ({seasons: [{colosseumStage, colosseum[]}]}) and its board extract (boardsFile, default
// coliseum_boards.json next to it: {boards: [{sphere, sphereArray, sphereMasu}]}) as {colosseumStage[], colosseum[], sphere[],
// sphereArray[], sphereMasu[]}, null when either is not readable (the ReLux seasons are then left out whole)
function readRelux(file, boardsFile = path.join(path.dirname(file), 'coliseum_boards.json')) {
  let j, b;
  try { j = JSON.parse(fs.readFileSync(file, 'utf8')); b = JSON.parse(fs.readFileSync(boardsFile, 'utf8')); } catch { return null; }
  const seasons = Array.isArray(j && j.seasons) ? j.seasons : [];
  const boards = Array.isArray(b && b.boards) ? b.boards : [];
  return { colosseumStage: seasons.map((s) => s.colosseumStage), colosseum: seasons.flatMap((s) => s.colosseum || []),
    sphere: boards.map((x) => x.sphere), sphereArray: boards.map((x) => x.sphereArray), sphereMasu: boards.map((x) => x.sphereMasu) };
}
// the ReLux enemy rows: the raw donor table (an array or {enemy: [...]}, full-length arrays with binary padding past the valid
// counts, cut by enemyRows) or a {rows: [...]} extract; null when not readable
function readReluxEnemies(file) {
  let j;
  try { j = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
  if (Array.isArray(j)) return j;
  const rows = j && (Array.isArray(j.rows) ? j.rows : Array.isArray(j.enemy) ? j.enemy : null);
  return rows || null;
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
      console.warn(`colosseum: the ReLux season extract ${file} (or coliseum_boards.json next to it) is not readable: ${seasons.filter((s) => s.source === 'relux').map((s) => s.month).join(', ')} left out`);
      seasons = seasons.filter((s) => s.source !== 'relux');
    }
  }
  // Part 4 until its ranking task: of the default SEASONS a revamp season whose ranking prizes are not written yet (RELUX_RANKING) is left
  // out whole with a warning, never served without its Rewards rows (a pending season is skipped by seasonRows itself); an explicit
  // opts.seasons list stops on it (seasonRows)
  const notBuilt = opts.seasons ? [] : seasons.filter((s) => s.source === 'relux' && s.colosseumStageId >= REVAMP_FIRST && !s.pending && !RELUX_RANKING[s.colosseumStageId]);
  if (notBuilt.length) {
    console.warn(`colosseum: WARNING ${notBuilt.map((s) => s.month).join(', ')} not built yet (no ranking prizes in RELUX_RANKING): left out`);
    seasons = seasons.filter((s) => !notBuilt.includes(s));
  }
  // the enemy lists of the served stages (opts.stageEnemies, else readStageEnemies) and the raw ReLux enemy table (opts.reluxEnemies,
  // else KHUX_COLOSSEUM_RELUX_ENEMY / DEFAULT_RELUX_ENEMY); without the lists only the 1.1.3 variants are checked (the stage import
  // still refuses a stage with an enemy missing from the master); without the table an id that needs it stops the run (enemyRows).
  // With opts.src (tests) the local files are never read.
  const stageEnemies = opts.stageEnemies || (opts.src ? null : readStageEnemies(stageEnemyFiles()));
  const reluxEnemyFile = process.env.KHUX_COLOSSEUM_RELUX_ENEMY || DEFAULT_RELUX_ENEMY;
  const reluxEnemies = opts.reluxEnemies || (opts.src ? [] : readReluxEnemies(reluxEnemyFile));
  if (!reluxEnemies) console.warn(`colosseum: the raw ReLux enemy table ${reluxEnemyFile} is not readable: the ids that need it stop the run`);
  const medals = readMaster(path.join(masterDir, 'medal.json')).map((r) => r.medalId);
  // without a medal master the medal stops of the ReLux seasons are off: say so (a warning, not a stop: test masters have no medal.json)
  if (!medals.length && seasons.some((x) => x.source === 'relux')) {
    console.warn('colosseum: no medal master, ReLux medal ids unchecked');
    console.warn(`colosseum: medal.json is missing or empty in ${masterDir}: build the master with KHUX_MEDALS_ALL=1 to check the medal stops of the ReLux seasons`);
  }
  const out = seasonRows({ ...src, relux, masterMedalIds: medals.length ? new Set(medals) : null, masterEnemyIds: master.enemy.map((r) => r.enemyId), masterEnemies: master.enemy, stageEnemies, reluxEnemies }, seasons);
  if (out.pending.length) console.warn(`colosseum: ${out.pending.map((p) => `${p.month} (${p.pending})`).join(', ')} pending: skipped, no rows`);
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
  console.log(`colosseum: ${out.colosseumStage.length} seasons (${seasons.filter((s) => !s.pending).map((s) => s.month).join(', ')}): +${out.colosseum.length} tiers, +${out.stage.length} stages, `
    + `+${out.enemy.length} enemies (${['113', 'relux', 'monthCopy', 'rule'].map((k) => `${k} ${out.colosseumEnemies.filter((e) => e.source === k).length}`).join(', ')}), +${out.ranking.length} rankings / ${out.rankingReward.length} brackets, +${out.sphere.length} boards`);
  return out;
}

// node make-colosseum.js [master_dir] [1.1.3 data folder]
if (require.main === module) patch(process.argv[2] || path.join(__dirname, 'master_data'), { dir: process.argv[3] || undefined });

module.exports = { REVAMP_FIRST, MASTER_BASE_APPROVED, RELUX_MEDAL, SEASONS, GEN_STAGE_IDS, DEFAULT_RELUX, readRelux, DEFAULT_RELUX_ENEMY, readReluxEnemies, reluxShape, monthBase, schemaRowOf, stageEnemyFiles, readStageEnemies, ruleRow, SEASON_BOARDS, BONUS_TIER, BOARD_ART, PENDING_ART, artLines, CATALOG_EV, CATALOG_STAGE, CATALOG_URL, COLOSSEUM_IMG_VERSION, catalogEvStage, RANGES, DEFAULT_2016, START, END, seasonRows, patch, readSource, cutoffRound, bracketsOf, thresholdsOf, rankedOf,
  PART3_ENEMY_IDS, PART3B_ENEMY_IDS, MONTH_COPY_OF, STAGE_TEMPLATE, MEDAL, SKILL_LV, BRACKETS8, BRACKETS9, BRACKETS12, RELUX_RANKING, rankItem, ENDLESS, ERA17, ERA18, reluxRewardRows, REWARD_BASE, REWARD_BLOCK, REWARD_FIRST_RANKING };
