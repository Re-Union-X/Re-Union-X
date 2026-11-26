# Coliseum (PvE) - spec summary

Research and state of the PvE Coliseum (I-054 entry screen done; I-059 gameplay: **Part 1 served**, seasons 2016-04 .. 2016-07,
see «Part 1 summary» at the end). Facts only; the detailed
per-month data and the sources stay in the private event catalogue (`private\events\sources\coliseum\COLISEUM.md`).
Tags: **proven** = read from original data/code or two agreeing primary sources; **probable** = one good source or
strong inference; **unknown** = not found yet. Current server state: `server/routes-colosseum.js` (Coliseum Part 1 Task 3)
answers 124-128 and 139/140/180 for the served seasons 2016-04 .. 2016-07; status 2 «This event is unavailable.» below story
quest 130 or in a month with no served season.

## Rules

| Rule | Value | Tag |
|---|---|---|
| Unlock | story quest 130 | proven (notices, bench) |
| Season | one per calendar month, day 1 00:00 PT to month end (UTC 07:00/08:00 with DST) | proven |
| Structure | Tiers (client `rank`) of N Rounds (`stageCount`); one round = one Coliseum stage `cl_stg<YYYYMMNN>`, room `OC_0001_00_00`, one map part, 1-4 waves (map teams) | proven |
| Stage set | 10 stages per month (9 from 2020-02), rounds cycle through them | proven (data), cycle probable |
| Enemy strength | 1.0.1 client: level rise = rounds of all previous tiers + `lvPerLoop` x floor((round-1)/`loopStageCount`) (10 / 10 in the master); stage files carry levels 1..10 ; the 4.3.1 client uses (rounds of previous tiers + round) x floor(`lvPerLoop`/`loopStageCount`) | proven (1.0.1 and 4.3.1 code) |
| Last tier | endless; the 2016 master writes 999, the 4.3.1 client shows «∞» only for `arrivalStageCount` 0 | proven |
| One-turn shortcut | clearing all waves in one turn unlocks the next rounds at once («Unlocked Round %d!», «Shortcut Unlocked!»); clearing a round locks the skipped ones again; size per tier = master `excellentUnlockCount` (= wiki "skip limit") | proven that the values match, exact rule probable |
| AP | 3-5 per round until 2017-04 (1 AP / 0 AP campaigns), 0 at every tier from 2017-05 | proven (notices + wiki) |
| Currency | Coliseum Coins (`userPoint.colosseumSpherePoint`, reward type 17) per round and per tier clear; spent on Coliseum boards | proven (type 17 in the 4.3.1 client) |
| Ranking | monthly ranking by progress (total rounds cleared), brackets with rewards | probable (metric) |
| Loss | the client sends `/colosseum/retire` by itself; progress kept or not is the server's rule | client proven, original rule unknown |

## Numbers per era (WW)

| Era | Tiers | Rounds per tier | Tier-clear coins |
|---|---|---|---|
| 2016-04 (launch) | 6 | 20, 15, 15, 10, 10, 999 | 30, 40, 50, 70, 100 |
| 2016-05 .. 2016-10 | 10 | 20, 15, 15, 10 x6, 999 | 30 .. 100, then 600 (900 in 2016-06) |
| 2016-11 .. 2017-04 | 11-12 | + one 10-round tier | + 900 |
| 2017-05 .. 2018-03 | 14-19 | ..., 50, 100, 300, 500, 999 | + 900, 1500 |
| 2018-05 .. 2018-12 | 13-19 | as above | lump sums 50 .. 3000 (sum 8100), per-round coins dropped in 2018-12 |
| 2019-05 .. 2021-06 | 11-15 | 200, 400 x6, 300, 200, then 100 | 100 .. 700; tier 10 gives the title "<Month> Victor" |

Coins per round were 1, 3, 5, 7, 10 (later 0/10/30). Tier rewards also carried support medals (Moogle, Cid, later
Magic Mirror and others). Values: 2016 seasons from the 1.1.3 master, the rest from the English wiki (probable).

## Timeline

- JP: master rows from 2015-06-29; JP wiki data from 2015-09.
- WW: Coliseum present at launch (2016-04); first monthly update 2016-05-01; +1 tier 2016-11; 0 AP from 2017-05;
  lump-sum coins 2018-05; renamed "PvE Coliseum" when the PvP Coliseum started (2018-09, WW titles from 2019-05);
  structure revamp 2019-05; last month on record 2021-06 (service end 2021-06-30).
- WW reused older JP stage sets: 2016-04..2016-11 per the master (JP 2015-07 .. 2016-03), 2016-12..2018-06 about
  7-10 months behind JP (enemy-name match), same month as JP from 2018-07.
- Side events at the Coliseum (Hercules tag team, Moon Gem Cup, Cloud battles, Keyblade Challenge) were event quests,
  not this mode.

## Data on disk

- JP 4.3.1: 546 `cl_stg` stage files (2015-07 .. 2021-06 with gaps: 2016-01..04, 2016-11..2017-05, 2019-07, 2020-01,
  2020-10 absent). Readable with `recon/tools/mapfile.py`.
- WW months whose JP set is not on disk: 2016-08..11, 2017-06..12, 2018-04/05, 2019-07..09.
- Coliseum enemy id = 20000 + base enemy id (later also 21xxx/22xxx); these variants have their own stats. 202 of
  the 305 ids used by the stages are not in `server/master_data/enemy.json`.
- Master `colosseum` (21 fields: tier row per season with `round`, `ap`, `arrivalStageCount`, `excellentUnlockCount`,
  per-round and tier-clear reward slots) and `colosseumStage` (11 fields: season dates, head/term tier ids,
  `rankingId`, `validStage`, `stageId[10]`, `loopStageCount`, `lvPerLoop`): rows exist only for 2015-06..2016-11.
- JP 4.3.1 layouts cover every Colosseum layout the server is missing (`AdventureTop2_Colosseum_Button/Panel/Target`,
  `Colosseum_MainPanel`, `BattleResultColosseumScene`, ...).

## Client schema (WW 4.3.1 client, analysed 5 November 2026)

The bench runs the unmodified **WW 4.3.1** client. It **does** read the master tables `colosseum` and `colosseumStage`
(the 5.0.1 offline client dropped them together with the whole Coliseum UI; that build is not what we run). Our
`server/master_data/colosseum.json` and `colosseumStage.json` are empty, so the season and the tiers must be served
there. Every key below is required (a missing or mistyped key makes the client reject the response) unless marked.

### Master rows

| Table | Fields (all int unless noted) | What the client uses them for |
|---|---|---|
| `colosseumStage` (one per season) | `colosseumStageId`, `openDate`, `closeDate`, `rankingCloseDate` (date strings), `headColosseumId`, `termColosseumId`, `rankingId`, `validStage`, `stageId` (array of 10), `loopStageCount`, `lvPerLoop` | `closeDate` -> «Ends in %s»; head..term = the tier rows of the season; `lvPerLoop / loopStageCount` = level gain per round |
| `colosseum` (one per tier) | `colosseumId`, `colosseumStageId`, `round` (= tier number), `ap`, `arrivalStageCount` (rounds in the tier, **0 = «∞»**), `rankId` (string), `excellentUnlockCount`, `validStageReward`, `stageReward{Type,Id,AssignType,SkillId,SkillLv,Num}`, `validReward` (slots used), `reward{Type,Id,AssignType,SkillId,SkillLv,Num}` (arrays of 4) | tier labels and «Round x/y», per-round reward, tier rewards, shortcut size |
| `stage` (existing story table) | one row per round stage id (the 2016 master used `stageKind` 3, `mapName` "Coliseum", world 5) | the round list reads it for the AP display |

The client finds a tier by scanning head..term for the row whose `round` equals the response `rank`.

- **Enemy level rise** (client side): (rounds of all previous tiers + current round) x floor(`lvPerLoop` /
  `loopStageCount`), added to the levels in the stage file. With the 2016 values (10/10) every round adds +1 level.
- **Stage files**: battle loads `stage/cl_stg<stageId 8 digits>.bin` + `_00.bin` for the `stageId` of
  `startColosseumData`. They only hold the waves and the enemies (id, level) plus the room name; the arena is the shared
  room `OC_0001_00_00` (proven in code and data, and it matches the user's memory). A missing month only needs its
  enemy lineups.

### Requests and responses

| Action | Path | Request | Response keys |
|---|---|---|---|
| 124 | GET `/colosseum` | - | `colosseumInfo{colosseumStageId, status}` (2 = «This event is unavailable.»), `colosseumStages[]{rank, stageCount, stageId, useAp}`, `colosseumRank` (uint), `userColosseum{userRank, userStageCount, userStageTotalCount}` |
| 125 | GET `/colosseum/reward/list` | - | `getRewardRankIds`: int array of tier numbers whose tier reward was obtained, **sorted ascending** (the client binary-searches it); drives the clear mark in the Tier Rewards list. No board data |
| 126 | POST `/colosseum/start` | `rank, stageCount, stageId, userKeybladeId` (the chosen element) | `userData.userPoint`, `colosseumInfo`, `userColosseum` (stages and `colosseumRank` not read here), `userTreasures[]`, `startColosseumData{rank, stageCount, stageId, userKeybladeId (uint64)}`, `campaigns[]` (int array) |
| 127 | POST `/colosseum/retire` | `burst` | `userKeyblades[]`, `userData.stageResumption{resumptionStatus, stageId, raidId, colosseumStageId}` |
| 128 | POST `/colosseum/clear` | `isSkip` (bool, = all waves cleared in one turn), `enemyDeadNumber`, `mimicDeadNumber`, `maximumDamage`, `guiltBurstMaximumDamage`, `userKeybladeId`, `burst`, `lux`, `rank`, `stageCount`, `stageId` | `userData.userPoint`, `userData.userDetail`, `clearColosseums[]{rank, stageCount}` (**never empty**), `userMaterials[]`, `userMedals[]`, `userSkills[]`, `userTitles[]`, `userKeyblades[]`, `userDecks[]`, `userAvatarParts[]`, `userKeybladeSubslots[]`, `getLux` (uint64), `userData.stageResumption` |
| 139/140/180 | GET `/ranking/colosseum`, `/own`, `/border` | - | `{rankingDatas[], rankingStatus, rankingTermStart, rankingTermEnd}`; each entry = the full player record of the High Score ranking (userData, userAvatar, rank, userMedals, userSkills, userKeyblade, petBaseSlotMedal, supportUserMedals, supportUserSkills, pet, emblemIds; bench 25-11) + `userColosseum{userRank, userStageCount, userStageTotalCount}` + `arrivalTime` (date) |

Behaviour read from the client:

- Each `colosseumStages` element is one selectable round (list row «Tier» / «Round stageCount/arrivalStageCount» /
  «AP Cost useAp», map panel, enemy preview). The in-game help says «Select a round to play. You cannot replay rounds»:
  the server decides which rounds are playable.
- **Loss**: the client sends 127 by itself when the battle is lost and reads nothing Coliseum-related back, so what
  happens to progress is entirely the server's rule (the original rule is still unknown).
- **Shortcut**: with a one-turn clear the client plays the «All 1 Turn» animation showing the tier's
  `excellentUnlockCount`, then sends 128 with `isSkip` 1. The jump itself is done by the server (the next 124 must list
  the unlocked round). The texts «Unlocked Round %d!» / «Shortcut Unlocked!» are not loaded by client code.
- **Result**: for each `clearColosseums` entry the result shows «Tier %d, Round %d Complete!» with the round reward
  (if `validStageReward`), and the tier rewards when `stageCount` = `arrivalStageCount`; the tier-up panel
  (`BattleResultRankUPScene_ver103`) shows the first and the new tier. The server must actually grant what the master
  rows say.
- **Ranking**: tier/round progress with `arrivalTime` as tie-break.
- **Reward types**: 17 = Coliseum Coins, **32 = Cross Coins** (Union Cross currency); in the 2016 master 32 only appears
  with amount 0 as an end marker.
- `Base_Colosseum_Rank` / `base_colosseum_rank` is just the Coliseum-rank widget of the profile page.

Screens and assets the client loads: served since resources 185 (Coliseum Part 1 Task 4, see «Bench probe 2026-11-25»).
`AdventureTop2_Colosseum_Button/_Panel/_Target`, `Colosseum_MainPanel`, `BattleResultColosseumScene` and
`RankingColosseumScene_ver1301` are the JP 4.3.1 originals (recon/tools/jp_coco_layouts.txt); `ActMapColosseumAnim`,
`img/colosseum/*`, `img/adventure/stage/OC_Colosseum_Panel(B).png`, `cocostudio/Colosseum_bg01.png` and
`lwf/adventure/Colosseum_Open` the WW 2016 copies (recon/tools/originals.tsv). Already present: `BattleResultRankUPScene_ver103`,
`Colosseum_FieldMenu_ver350`.

Also: `/mypage rankingRewards.rankingColosseum`, profile `userColosseumRanking`, record `colosseumRankingHighest`,
`stageAchievement.colosseumRank`, `lastPlayColosseumSphereBoardId`.

## Missing before implementation

1. ~~Bench probe~~ done 2026-11-25 (one element per playable round; 125 behind Tier Rewards; result screens: see «Bench
   probe 2026-11-25»). Still open: status 1 with an empty list.
2. Stats for the Coliseum enemy variants (rebuild as for raids).
3. Stage files for the WW months not in the JP data (regenerate from the wiki lineups, mark as a deviation).
4. Coliseum boards (rows, node costs).
5. Original loss rule (not decidable from the client).

## Gap research (5 November 2026, night)

Web and data side; details and per-id tables in the private dossier.

- **Arena.** 545 of the 546 JP stage files use room `OC_0001_00_00` with one part (the other is a test id); every enemy
  has level = round number (one exception). A missing month needs only its lineup (proven; matches the user's memory
  that the map never changed).
- **Wiki lineups are exact.** On the 18 WW months whose JP stage set is on disk, one khuxwiki enemy row = one wave:
  wave count equal in 180 of 180 rounds, enemy count per wave 177 of 180 (proven).
- **Gap months.** WW 2017-06 .. 2017-12 = JP 2016-11 .. 2017-05 (khuxwiki and the JP wiki agree round by round, 10 of 10
  in all 7 months: proven). WW 2018-04 = JP 2017-09 and WW 2018-05 = JP 2017-10, both on disk (proven). WW 2019-05, 06,
  08, 09 = the same JP month, on disk (proven). Still lineup-only (wiki, probable): WW 2016-08 .. 2016-11 and 2019-07.
- **Enemy variant rule** (1.1.3 master, 110 Coliseum rows with their base): same level knots and ATK (110 of 110), same
  DEF (103), same HP at LV 1/35/100 (90 of 95 changed rows), HP at LV 300 = 3 x base (78 of 95), HP at LV 999 =
  40/11 x own LV 300 (81 of 95), no munny or raid points (proven). Applied to the 202 missing ids: 3 derivable by
  the rule, 34 month-specific copies of a 1.1.3 row (probable), 15 weak (2019 ids), **150 unknown** (no original row
  for the model anywhere on disk; KHUX shows no enemy HP numbers, so only estimates as for raids).
- **Enemy rows of the served stages** (Part 2, `server/make-colosseum.js` `enemyRows`; the rule since 26 November 2026).
  Every enemy id of every served stage must be in the master. An id missing from it gets a row from the first source that
  has it: the 1.1.3 row, else the variant rule above against its base row (id - 20000; only with knots 1/35/100/300/999,
  no knot between LV 300 and 999), else the ReLux row. Original Coliseum variant ids (20000-29999) only. **An id with no
  1.1.3 row, no variant-rule base and no ReLux row stops the build**: its stats are then decided per enemy, as for the
  raids (deduced from comparable original rows), and added as a source labelled `colosseumEnemyEstimate`. `estimate` is a
  reserved label: nothing is ever estimated silently. The check needs the stage enemy lists (stage import report,
  generated report, JP 4.3.1 parse); without them (a clean machine before its first resource build) the run is flagged
  as unchecked, not stopped, and `make-game-tables.js` prints a banner. In 2026-11, 93 ids over 130 stages: none missing.
- **Tier rewards.** The 1.1.3 master does carry the tier medals (reward slots 1-2, Moogle and Cid medals) and matches
  the 2016-05 notice exactly (proven); 2016-12 .. 2018 from the wiki templates (probable). Reward type 32 appears only on
  the endless tier and on a trailing 0-round row of every season (an end / no-reward marker).
- **Boards.** Node lists with costs for every WW Coliseum board 2016-04 .. 2021-06 are on the English wiki (avatar boards
  19 nodes / 1100 coins in 2016-2017, 3500 in 2018, 1230 from 2018-12, 4900 + 260 from 2019-05; Tier 10 Bonus 3090
  coins, 3390 in 2016-05). Contents of one board checked against its notice: equal (proven); costs probable.
  The 1.1.3 master board tables (`sphere`/`sphereArray`/`sphereMasu`, `type` 3) hold the WW Coliseum boards 2016-04 .. 2016-10
  with exact cells, costs and grid (proven). The three «???» boards of the wiki (Cid SR+, KH Cloud/Yuffie Costume) are JP-only
  (2015-09, 2015-12): Cid SR+ = the WW 6★ Cid board (probable); KH Cloud/Yuffie ran in WW only as 3000-Jewel boards (2016-07,
  proven), their JP Coliseum cells are unknown.
- **Ranking.** Metric progress (rounds cleared), ties broken by the time the round was reached (JP 1.0.5 change,
  probable). **Loss rule still unknown** from web sources.

## Probable data check (6 November 2026)

Cross-check of the wiki-only data against the official WW notices, period reddit threads (via the Wayback Machine) and
WW gameplay videos of 2016-2017 (round-select screens, boards, ranking screens).

- **Lineups.** WW 2016-08 .. 2016-11: every round visible in the videos (10 rounds over the four months) matches the
  English wiki; the other rounds stay wiki-only. The 1.1.3 master row for 2016-11 (stage set of 2016-03 again) is not what
  WW played (refuted). WW 2019-07: a period infographic matches the wiki in all 10 rounds, waves, counters and buffs
  (proven). WW 2017-05 = JP 2016-10 stage set (proven on video).
- **Enemy level** shown in battle = rounds of all earlier tiers + current round number (9 readings, 2016-08 .. 2017-05);
  the stage is the round within the tier cycled by 10 (proven).
- **Shortcut.** A one-turn clear unlocks exactly the tier's skip value (18 / 12 / 8 in tiers 1 / 3 / 5 of 2016-11); the
  next round is the cleared round + that value, also across tiers ("Tier 1 > 3"), and the skipped rounds are reported as
  complete with their per-round coins (proven).
- **Boards.** Node costs of the 2016-2017 avatar boards (19 nodes, 1100 coins) and of the Tier 10 Bonus board (3090) are
  proven on video (August, October, November 2016). Tier 11 Bonus present in 2017-05 (proven). Totals of the boards from
  2018-12 (1230 / 1470 / 1900 / 3500 = 8100 = all tier-clear coins) and from 2019-05 (4900 + 260 + 3 x 8580 = 30900 =
  all coins up to tier 9) close exactly and agree with the JP wiki / a 2019 player report; their per-node costs and the
  2018 3500-coin boards remain wiki-only (probable).
- **Ranking.** Ordered by progress (tier, round): proven on a 2016 Top 10 screen, each entry shows the time the round was
  reached; tie-break by that time still probable. Notice brackets 2016-06 .. 2016-11 equal the wiki except the two lowest
  brackets of 2016-07 (notice: 5-star Chip/Dale x1).
- **Enemy stats.** No other enemy master exists on disk; the 2019 ids and the month-specific copies stay probable/weak.

## Bench probe 2026-11-25

Coliseum Part 1 Task 4 on the bench (WW 4.3.1 client, LDPlayer instance 0): resources **185** (incremental on 184),
master revision **392**, probe save `coli1` (kbslots cut at story quest 200: Shop week 2016-04, season 800, deck ATK ~940k).
Screenshots are local only (not in the repository).

Resources: `recon/tools/import_colosseum_stages.py` copies the 80 `cl_stg` files of the 40 Part 1 stages (seasons 800-1100,
stage sets JP 2015-07/10/11/12) from the WW 2016 bundle, all of which it holds (the JP copy of 20151108 has a corrupt enemy id
1510228138 in its first record and JP lacks the 20150708/09 STG headers, so the WW copy wins). All 40 stages: room
`OC_0001_00_00`, 2-4 waves, every enemy id in the master. Layouts and images as listed under «Client schema» above.
The Coliseum Boards button icon `World_Ico8A/8B` exists in no source (the 2016 files are copies of World_Ico2A/2B, the tornado
world icon): the Multi Board icon `World_Ico10A/B` is served under those names (declared substitute).

What the client does (all proven on the bench):

- **Entry**: Quests tile -> «Select a mode.» popup -> Coliseum -> GET `/colosseum` (124). The screen shows «Ends in 4 days»,
  Tier, «Round x/y» (`arrivalStageCount`), AP cost, the round's TARGETS with levels, the round carousel (one cell per
  `colosseumStages` element, the cursor on the last one), the ranking goal strip («Goal: 300000th», then «Current: ... Goal: ...»)
  and the side buttons Ranking / Tier Rewards / Coliseum Boards. A first visit lists only Tier 1 Round 1.
- **Enemy level** = the global round number (Round 1: LV 1, Round 19: LV 19, Tier 3 Round 2 = round 37: LV 37) with the stage
  files' levels 1..10: the 1.0.1 rule (`lvPerLoop` x floor((round-1)/`loopStageCount`) + file level) is what the 4.3.1 client
  shows; the open conflict with the footage is closed (they agree).
- **Battle**: the arena is a field walk (held drag) with the waves standing apart; the start / «ALL 1 TURN TRIUMPHS!
  N ROUNDS UNLOCKED» animations of `ActMapColosseumAnim` play. A one-turn clear sends 128 with `isSkip` 1.
- **One-turn clear of Round 1**: window 2..19 (`excellentUnlockCount` 18): the carousel lists every playable round 2..19.
  One-turn clear of Round 19: 18 rounds paid (2..19), window 20..37, crossing into Tier 2 and Tier 3 (the list shows
  «Tier 3, Round 2/15» as the last cell).
- **Result** (`BattleResultColosseumScene`): Lux page, then «Congratulations!» with one row per `clearColosseums` entry
  («Tier 1, Round N Complete!» + Coliseum Coin x per-round amount), animated one row at a time (18 rows ~ 40 s), the tier rewards
  at the end («Tier 1 Complete!» Coliseum Coin x30 + Moogle, «Tier 2 Complete!» x40 + Moogle) and «TIER 1 ▷ 3» when the
  clear crossed tiers. A clear that skipped two tiers (Round 37 from window 20..37) pays every skipped round and both tier
  rewards in one screen.
- **Tier Rewards** button: GET `/colosseum/reward/list` (125); tiers 1 and 2 show «CLEAR!» after the skipped-tier clear. The
  endless last tier (no tier reward) has no row; the end-marker rows of the master cause no problem.
- **Rewards** button (ranking brackets): «50001st - 300000th» + Moogle x1, from the `ranking`/`rankingReward` rows.
- **Ranking** button: 139, 140 and 180 in sequence. The element needs the **full player record** (the High Score parser) +
  `userColosseum` + `arrivalTime`: with the short Lux record the client showed «A server error has occurred. (200 ERROR :139)»
  (fixed in server.js, test-colosseum-routes.js `wiring_start_clear`). The «Me» row shows Tier / round x/y / «N minutes ago».
  With rank 0 (no bracket reached) the row draws the third-place crown; from the first bracket on it shows «50001st».
- **Give Up** (Options -> Give Up -> OK) and a **loss** (HP 0, also Bag O' Coins escaping) both send `/colosseum/retire` (127)
  straight away (no Continue popup) and return to the list, unchanged; the AP is spent.
- `userColosseum` fields display sensibly (Tier 3, 3/15 in the ranking row after clearing round 38).
- Not probed: a multi-turn clear (the probe deck one-shots every wave; the rule is covered by colosseum-rules tests), the
  Coliseum Boards button (Task 5), the season end, and the number shown by «ALL 1 TURN TRIUMPHS! N ROUNDS UNLOCKED» (only
  caught fading; expected `excellentUnlockCount`, unconfirmed).
- 128 now sends only the inventory rows its rewards touched (snapshot before the rewards, as the other reward routes); at
  first it sent the whole inventory (~1 MB on this save) and the client stayed on a black screen ~30 s before the result.

## Part 1 summary (25 November 2026)

Plan `docs/superpowers/plans/2026-11-25-coliseum-part1.md`, spec `docs/superpowers/specs/2026-11-25-coliseum-design.md`.
Served: master revision **394** (393 before the «1 AP» power fix), resources **185** (no resource change after Task 4: the Coliseum Catalog banner and season cards
are server images, `game_data/colosseum_img`, like the raid catalog cards).

- **Seasons** 2016-04 (800), 2016-05 (900), 2016-06 (1000), 2016-07 (1100): `server/make-colosseum.js` (1.1.3 master rows, wired
  in make-game-tables.js), stage files from the WW 2016 bundle (`recon/tools/import_colosseum_stages.py`).
- **Rules** `server/colosseum-rules.js`, **routes** `server/routes-colosseum.js` (124-128, 139/140/180): live season = the kept season
  when one is kept (it plays until removed, also when the Story week loops back), else the month of the Story week; per-season
  progress, coins and boards in the save; ranking brackets as score thresholds interpolated from the 2016-08 cutoffs, paid into
  the Presents once.
- **Boards** `server/routes-colosseum-boards.js` (sphere type 3, shared core `server/sphere-board-core.js`): the live season's boards,
  bought with its coins; «Tier 10 Bonus» boards wait for Tier 10.
- **Coliseum Catalog** (`server/colosseum-pages.js`, evStage 6000, first banner of the Events tab from story quest 130): every
  served season, keep one past season.
- **AP campaigns**: the Coliseum scope (stageType 7) of the campaign calendar is served (`make-campaigns.js`): «1 AP» on
  2016-05-19..31 and 2016-06-16..22, «0 AP!» on 2016-11-01..03; `/colosseum/start` charges `campaigns.js colosseumAp`.
  The original «1 AP» row has power 3500, which the 4.3.1 client rounds up to 2 AP on a 3-5 AP round: the generator serves it
  with power **2000** (ceil gives 1 AP on 3, 4 and 5 AP; controller ruling 11, declared {rebuilt} in the notice). The «0 AP!» row
  only reaches a kept season (no November 2016 season is served yet).
- **Notice** «Coliseum» (11/25, IMPORTANT) declares the deviations; FAQ of the help page updated.

Bench smoke 25-11 (master 393, save `coli1`):
the Coliseum notice is listed first; the Events tab shows the Coliseum Catalog banner first, then the Raid Catalog and the Event
Catalog; the Coliseum Catalog page lists the four seasons (April «Season of your Story now» with its progress and coins, May-July
locked at story quests 251 / 301 / 376); the Raid and Event Catalog pages open, and on a copy of an advanced save their Keep and
Remove buttons swap the row in place (shared row script of Task 6). At the first home after the update the client showed
«Unlocked a Coliseum Board!» for the April board (6★ Cid) with an **empty card picture**: the type-3 board popup exists, but the
board card image is not served yet.

Still to bench with the user: a full season run (normal clear, one-turn window, skip across a tier, loss + retry, board purchase,
kept season from the Catalog, threshold Present).

Fix round 1 (master revision 394): with the «1 AP» row forced (`relogin.ps1 -Campaigns <its id>`), the Coliseum screen of Tier 4
(4 AP) shows «AP 1» and the «1 AP» balloon under Begin; Start charged 1 AP (170 -> 169, server log `tier 4 round 5 started
(-1 AP)`), Give Up left the progress unchanged.

## Bench walk 2026-11-25

Walk of Part 1 on the bench (WW 4.3.1 client, master revision 394, resources 185) on scratch copies of the probe save:
the April 2016 season (800) from Tier 3 Round 12, then a copy of the advanced save cut at story quest 320 (Story week June 2016,
season 1000) for the Catalog keep. Screenshots are local only.

Verified (as designed):

- **Loss + retry**: a weak deck lost Tier 3 Round 12; `/colosseum/retire` sent by the client, list unchanged (window 47..55), AP spent.
- **Multi-turn clear** (first time on the bench): Tier 3 Round 12 won in several turns inside an open one-turn window 47..55 ->
  server `window 48..48`, the list shows only Round 13 (Ruling 9: the window shrinks to the next round). Result «Tier 3, Round 12
  Complete!» Coin x5.
- **One-turn clear**: Round 13 -> window 49..57 (Tier 3 `excellentUnlockCount` 9, across into Tier 4 Round 7). The client plays
  «1 TURN TRIUMPH!» per wave and «ALL 1 TURN TRIUMPHS! ROUNDS UNLOCKED» at the end, but **draws no number** before «ROUNDS»
  (the `Round_NumL*` bones show the blank `Colosseum_RoundNum00` frame; the digits must come from client code, not found yet).
- **Skip across a tier**: Tier 4 Round 6 from the 49..57 window -> 8 rounds paid (49..56), «TIER 3 ▷ 4», the rows of every skipped
  round and «Tier 3 Complete!» Coin x50 + Moogle x2 (+102 coins in all); Tier Rewards shows Tier 3 «CLEAR!»; new window 57..62.
- **Coliseum Boards**: list with the season's board (6★ Cid, 302 coins); nodes bought for 20, 60, 30 and 30 coins (Huey medal and
  others granted, coins 302 -> 162); the 200-coin node with 162 coins: the client greys out Unlock and sends nothing. The May season
  shows only 6★ Scrooge before Tier 10 (the Tier 10 Bonus board is hidden). Not reached: Tier 10 (its board appearing).
- **Board card picture** (empty in the «Unlocked a Coliseum Board!» popup and in the board list / board screen): the client draws
  `img/sphere_incentive/<sphereBoardId>.png` (as for the avatar boards, originals.tsv sections 56/57), and no Coliseum card is served.
  The WW 2016 files hold `2200001.png` .. `2200020.png` (April 6★ Cid = 2200001, May 6★ Scrooge = 2200002 among them); 2200023 (May Tier 10 Bonus)
  and 2210029-2210035 (June / July KH Chip, Moogle and Tier 10 Bonus) exist in no source on disk. Fix = an originals.tsv line plus a resource build (not done in
  the walk).
- **Ranking threshold**: clearing round 65 reached the 10,001st-50,000th threshold (score 65): the difference (Scrooge x1) went to
  the Presents once and «Current: 10001st Goal: 10000th» updated. Ranking «Me» / Top 10 / Border Rank lists (border rows at progress
  135 / 94 / 65 / 33 shown as Tier 6 65/999, Tier 6 24/999, Tier 5 5/10, Tier 2 13/15), Rewards popup with the goal and current
  brackets. The Present text showed «10,001st50,000th»: the game font of the Present Box drops the en dash. **Fixed**: the bracket
  text uses « - » as the client's own Rewards popup (`routes-hsc.js bracketText`, shared with the High Score Challenge; tests in
  test-colosseum-routes.js and test-hsc-routes.js); the next paid bracket showed «1st - 5,000,000th» in the server log.
- **Coliseum Catalog** (story quest 320, June season played to Tier 1 Round 1, 1 coin): Keep May 2016 -> the row turns into
  «Kept: the Coliseum plays this season» + Remove, April gets «Replaces: Coliseum · May 2016», June «it plays again when you remove
  the kept season», all in place; the Coliseum then plays May (Tier 1 Round 1, 0 coins); one round played (window 2..19, 1 coin);
  Remove -> rows back in place, the Coliseum plays June again with its window 2..19 and coin; Keep again -> May with its progress.
- **Raid Catalog and Event Catalog** Keep / Remove swap the row in place (Queen Bee on the quest-320 copy, «Try the High Score
  Challenge!» on a copy of the advanced save).
- **«Coliseum» notice** opens and reads well (summary, sections).

Open (not changed in the walk):

- The «N» of «ALL 1 TURN TRIUMPHS! N ROUNDS UNLOCKED» is not drawn (cause in client code; the server cannot set it).
- Kept season: the Coliseum screen shows «Ends in 3688 days» (the kept season's far close date) and, in May 2016, «Goal:
  10000000th» before the first round (one bracket only). Cosmetic, both follow from the rules.
- The Quests tile shows «PVE ---» even with a ranked bracket (the tile reads a rank the server does not send yet).
- Rank 0 «Me» row: third-place crown (known); what the original showed is not in the notes.
- The ranking header bar shows «---» above «Ends in N days».

## Board card pictures (26 November 2026)

The board card is three client layers (docs/notes/bacheche.md «Card, name and coin»); the picture layer is
`img/sphere_incentive/<sphereBoardId>.png`, 306x306 with transparency. Part 1 sent none, so the 9 served boards showed an
empty gold card. Now `make-colosseum.js` `BOARD_ART` + `artLines` write `game_data/colosseum_board_art.tsv` (served boards
only), imported by `build-resources.ps1` like the raid / event board cards.

- 2200001 6★ Cid: the worldwide 2016 file (`b16`), the same picture as the khuxwiki board screenshot.
- The other 8 (6★ Scrooge, Tier 10 Bonus x3, KH Chip M/F, Moogle M/F): the khuxwiki «Preview - <board>» picture (user 26-11:
  wiki previews, never grainy). Each preview was fitted into the khuxwiki board screenshot of the same board (opaque pixels,
  scale and offset), calibrated on 2200001 (306 px card = 0.628 of the 1280x544 screenshot): every preview fits at scale
  0.994-1.000, so it is the original picture at native size, pasted on the 306x306 canvas **without resampling** at the
  fitted place (moved up 4-6 px where the fit would cut opaque rows). Private files in `--loc` `img/sphere_incentive_coli/`.
- 2200002 6★ Scrooge: the 2016 bundle file shows Scrooge alone, but the worldwide board screenshot shows Scrooge with Cid,
  Chip and Dale: the screenshot rules (as for the event boards), so it takes the wiki picture.
- The boards of later seasons (214 after Part 2, not served yet): private research `private\events\sources\coliseum\BOARD_IMAGES.md`;
  same method when their season is built (JP 4.3.1 card when it matches the board screenshot, else the wiki preview).
- Coliseum Part 2 (26-11, 30 boards 2016-08 .. 2017-04): the method is now `recon/tools/coliseum_board_cards.py` (test
  `test_coliseum_board_cards.py`). The canvas is found in each screenshot (the card blob around the gold pixels = the 306 px
  canvas; calibration on 2200001: origin offset 0, ratio 0.998), so screenshots of any size work. A JP 4.3.1 candidate is kept
  only when it fits the screenshot (difference at most 17.81, the worst 26-11 fit) **and** the wiki preview is a cut of it
  (native difference 0.00): the screenshot difference alone let the JP Vampire (F) through (12.8) although it lacks the bat
  wings of the worldwide card. JP twins served as `jp`: Summer Mickey / Minnie, Mushroom Hunt M / F; the other 26 are `loc`
  previews at native size (fits 6.1 .. 17.6, scales 0.990 .. 1.010). The previews of the JP twins sit at canvas y = 6 on the JP
  cards: the 26-11 Part 1 cards (y = 12, bottom edge) are 6-7 px lower than the screenshots show (one canvas origin per
  screenshot size taken from the 6★ Cid screenshot, whose card is 6 px higher than in the other 1280 x 544 ones). Kept as
  approved (user 26-11, after a side-by-side); `--ids part1` rebuilds them into a scratch folder and reports both places.

## Open points of 25-11 closed (26 November 2026, resources 187 / master revision 395)

- «ALL 1 TURN TRIUMPHS! N ROUNDS UNLOCKED»: N = the tier's master `excellentUnlockCount`, read by the client itself; the digits
  were blank because the served English 2016 `ActMapColosseumAnim` lacks the `Round_NumL2_Eff01` bone the 4.3.1 code needs
  (a missing hundreds pair skips the divisor step). `recon/tools/fix_colosseum_anim.py` adds it in build-resources.
  Benched: Tier 1 one-turn clear draws «18 ROUNDS UNLOCKED» (`screenshots\r187e09.png`).
- Kept season «Ends in 3688 days»: every colosseumStage row now ends with this week (a master cached before a keep kept 2030).
  Benched: «Ends in 4 days». May 2016 «Goal: 10000000th» is the original lowest bracket: kept, explained in the notice.
- Quests tile «PVE ---»: `/stage/achievements` `colosseumRank` = the live season's shown rank (benched «PVE 1st»). Ranking
  header «---» is original (text 103900052). Not ranked yet: own tab `rankingStatus` 4 («You did not participate»), no Top 10
  row (a rank-0 row drew the third-place crown: `Colosseum_Rank_Num0.png` does not exist).
- High Score Challenge Present titles «<event>: <bracket>» with ASCII dashes.
- Enemy levels re-checked on the bench (May 2016): Tier 1 Round 19 = LV 19, Tier 3 Round 1 = LV 36, Round 2 = LV 37: no reset
  between tiers.

## Part 2 summary (26 November 2026)

Plan `docs/superpowers/plans/2026-11-26-coliseum-part2.md`. Served: master revision **397** (regenerated 26-11 with the env of the
10-11 block of HANDOFF.md + `KHUX_WORLDTOUR=0` + `KHUX_AVATAR_BOARDS`), resources **188**; benched 26-11 (below).

- **Seasons** 2016-08 (1200), 2016-09 (1300), 2016-10 (1400) from the 1.1.3 master rows; 2016-11 (1500) .. 2017-04 (2000) from
  the ReLux season extract (private, read at build time, `KHUX_COLOSSEUM_RELUX`). Tiers stop at the first endless tier
  (999 rounds, as Part 1): ten tiers up to 2016-10, **eleven from 2016-11** (Tier 10 = 10 rounds, 900 coins; Tier 11 endless).
  The hidden 999-round tiers of the extract (12-14 in 2017-01..03, 12-21 in 2017-04) are not served. A tier coin reward above
  10,000 stops the build (x100 artefact guard).
- **Stage files.** 2016-08 .. 2016-11: no original set survives; `recon/tools/gen_colosseum_stages.py` writes 40 maps
  (stage ids `2116MMNN`, import label `colosseumGen`) from the khuxwiki round rows, with original Coliseum variant ids
  (59 distinct, all in the 1.1.3 master) on the best-fitting JP 4.3.1 arena layout; enemy level = round. 18 wiki enemy buffs
  cannot be carried (the stage enemy record has no buff field): list per stage in the local
  `stage_gen/colosseum_gen/report.json` (rounds 1, 2, 3, 5, 6, 10 of 2016-08; 1, 7 of 2016-09). Stage 21161108 (2016-11
  round 8, waves 5/1/7/1) has 3 positions placed by the generator. 2016-12 .. 2017-04 = the JP 4.3.1 sets 2016-05 .. 2016-09
  (the stage ids of the ReLux rows). Stage rows for 1500-2000: copies of the 1400 rows (ids 81071-81130, `strDummy`).
- **Enemies.** Every enemy id of the 130 served stages is in the master: no row added, no estimate (`enemyRows`, see «Gap
  research»; an unknown id stops the build).
- **Ranking.** Brackets 1-100 .. 250,001-500,000. Thresholds: 2016-08..10 = 64 / 76 / 93 / 105 / 134 / 159 / 175 / 216 (the
  curve through the recorded August 2016 cutoffs), 2016-11 .. 2017-04 = 74 / 86 / 103 / 115 / 144 / 169 / 185 / 226 (ten more
  rounds). Prizes: 1.1.3 rows checked against the notices (2016-08..10), notice 22105 (2016-11), khuxwiki (2016-12 .. 2017-04);
  the 2016-12 Pegasus Knight Helm goes to the top 10,000 (notice 23117 over the wiki). Reward ids 35000 + (rankingId - 4016) x 50.
- **Boards.** 30 boards (2210037-2210066); cards by `recon/tools/coliseum_board_cards.py` (see «Board card pictures»): 4 JP
  4.3.1 twins, 26 khuxwiki previews at native size.
- **Coliseum Catalog** 13 rows; Filters (I-328): FIND, state, Coliseum Boards completed / not, Tier Rewards all taken / not;
  game year tabs (962a2b17, 8c728856: a season sits in the game year of its start, as the Raid / Event / Special cards).
- **Catalog season cards** (`server/game_data/colosseum_img/<colosseumStageId>.png`, git-ignored): written by
  `python -I recon/tools/make_special_banners.py --section colosseum` from SEASONS of make-colosseum.js. **After a change of
  SEASONS** run it (build-resources.ps1 runs it next to gen_colosseum_stages.py since 26-11); make-game-tables prints a banner
  when a served season has no card. Without it the Catalog row shows an empty frame (the server answers 404).
- **AP campaigns**: the «0 AP!» days of 2016-11-01..03 now reach the November 2016 season.
- **Notice** «Coliseum» (11/26): thirteen seasons, eleven tiers, thresholds and prizes, new section «Maps» (generated maps,
  dropped buffs, generator positions), board card sources, filters. Final review wording (26-11): «maps» 1-10 (a map repeats
  every ten rounds of a tier), JP maps «most likely reused», August-October thresholds «values read from» the cutoffs.

Master regen diff (26-11, against a backup of `server/master_data`): only additions, in colosseum (+96 tiers), colosseumStage (+9),
stage (+90), ranking (+9), rankingReward (+72), sphere / sphereArray / sphereMasu (+30 each); enemy unchanged; no stage-enemy
check banner (the stage lists were on disk).

### Bench walk 26-11

Resources 188, master revision 397, saves `colip2a` (August 2016), `colip2n` (November 2016), `colip2m` / `colip2m80` (March 2017).

- August 2016 generated set plays; enemy level = the global round number (in-game rounds are numbered per tier, the map is
  ((round - 1) mod 10) + 1); a one-turn clear opened the window up to round 19.
- Board cards sharp: Summer Mickey / Minnie, Timothy Mouse, Royal Knight; board START bottom left, not covered.
- November 2016: eleven tiers. March 2017: the JP set plays, LV 81 at round 81.
- Coliseum Catalog: keep of August 2016 OK; filters («Later in the Story» = 8 seasons); year tabs All years / Launch year;
  phone render 640x320 = the same 3-column grid as the Raid Catalog.
- Threshold Present «Coliseum March 2017: 250,001st – 500,000th» (Chip + Dale) arrived.
- Found: the season cards 1200-2000 were missing until `make_special_banners.py --section colosseum` ran (now a build step).
- User decisions 26-11: the 30 Part 2 cards approved; the 8 Part 1 cards stay as they are (compared with the re-placed
  ones, not wanted).

## Coliseum Catalog: board cards and season detail page (26 November 2026)

- **Board cards on the rows** (user 26-11, as the Avatar Board Catalog): each season row shows the cards of its Coliseum
  Boards in a strip of 44 px tiles under the progress line; a «Tier N Bonus» board carries its tier on the tile. The cards
  are the pictures the game uses (`BOARD_ART` of `make-colosseum.js`, list `server/game_data/colosseum_board_art.tsv`),
  made small for the web by `recon/tools/make_avatar_card_web.py --tsv server/game_data/colosseum_board_art.tsv --out
  server/game_data/colosseum_board_img --all --strict` (same sources and resolution as `import_originals.py`: b16, the JP
  4.3.1 file with its highest revision, the private `--loc` `img/sphere_incentive_coli/` pictures; at most 160 px, nothing
  drawn). `--all` takes every row of the list (no avatar board index), `--strict` exits with 2 when a card has no source.
  `build-resources.ps1` runs it next to the other Coliseum steps and stops on an error. Output git-ignored, with
  `cards.json {version, size, ids}`; served at `/web/colosseum/board/v<version>/<sphereBoardId>.png` (numeric ids only,
  else 404; cached, the version busts the WebView cache), read at request time (`KHUX_COLOSSEUM_BOARD_IMG` overrides the
  folder). A board missing from `cards.json`, or a card that fails to load (`kxNb`): the neutral box.
- **Season detail page** `/web/colosseum/season/<colosseumStageId>[?from=catalog]` (`colosseum-pages.js detailPage`, data
  `routes-colosseum.js seasonDetail`): the «On this server» box with the row's status and Keep / Remove button; the season
  (month, game year, tiers and AP, progress); **Coliseum Boards** (card, name, nodes unlocked / total, coins still needed =
  `sphereMasu.spherePoint` of the locked nodes, bonus boards «Unlocks at Tier N»); **Tiers** (rounds, the endless last tier
  as the game counts it, 999; AP; coins per round; Tier Reward coins and items; taken); **Score thresholds** (the original
  brackets top first, the rounds needed of `rankedOf`, the prizes, reached = best round at or above the threshold); **Maps**
  (worldwide 2016 / Japanese 4.3.1 sets / generated, `mapsOf` on `SEASONS`, the wording of the «Coliseum» notice, with a
  link to `/web/notices#coliseum`). Unknown or unserved season: 404. BACK (from the catalogue) returns to
  `/web/colosseum/catalog#q<id>`, which scrolls to the row; the catalogue keeps its year tab in the address (`#p<tab>`) so
  the WebView back key returns to it (as the Raid Catalog's `#ww.2017`).
- **Phone grid alignment** (user 26-11): a progress line of two lines («Cleared up to Tier 7, Round 1 · 401 Coliseum Coins»)
  pushed the state pill of its card below the neighbours'. `phone-css.js` now gives `.pg` the fixed two-line height of the
  dates of the other catalogs and the board strip a fixed 44 px height, so pills and buttons line up across a row.
- **v2 (user 26-11)**: the board cards sit under the season card in a left column (`.lc`) on wide screens and in the phone
  cards, so rows are shorter; the detail page is a set of section cards with a header band and icon (Season, Coliseum Boards,
  Tiers, Score thresholds, Maps), values in gold, rounds in cyan, taken / reached in green, not yet in a muted grey; its
  Keep / Remove button carries `pkd`, compact on phones (`phone-css.js` `.sb .pk.pkd`, never full width).
