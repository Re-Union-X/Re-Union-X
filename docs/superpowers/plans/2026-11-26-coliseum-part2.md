# Coliseum Part 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the nine WW Coliseum seasons 2016-08 .. 2017-04 served on top of the Part 1 mechanism: season and tier rows,
stage files (original JP sets where WW reused them, generated from the wiki lineups where no original exists), enemy
rows, boards with their card pictures, ranking brackets and thresholds, Catalog rows, notice.

**Architecture:** no new mechanism. `make-colosseum.js` grows from «the 1.1.3 master» to «1.1.3 master + the cleaned
ReLux season extract»; a new generator writes the four missing WW stage sets from the wiki lineups; the existing stage
import, board, card and ranking paths take the new seasons. Everything Part 1 built (rules, routes, Catalog, keep, boards
routes) must work unchanged for nine more seasons.

**Tech Stack:** Node (server, `node server/test-*.js`), Python 3 tools in `recon/tools/` (`python -I`), PowerShell session
scripts in `tools/ldplayer/session/`.

**Spec:** `docs/superpowers/specs/2026-11-25-coliseum-design.md` (Part 2 = «2016-08 .. 2017-04»). Research:
`docs/notes/coliseum.md`; private `private\events\sources\coliseum\` (COLISEUM.md, RULES.md, RELUX_COLISEUM.md,
BOARD_IMAGES.md, `khuxwiki_rounds_ww.json`, `ww_to_jp_stage_sets.json`, `gap_enemy_ids.json`); cleaned donor extracts
`private\donations\relux_2026-11\verified\coliseum_seasons.json`, `coliseum_boards.json`, `coliseum_ranking.json`,
`coliseum_enemies.json` (verdicts in VERIFY.md §1, §3). Part 1 plan: `docs/superpowers/plans/2026-11-25-coliseum-part1.md`.

## Global Constraints

- Seasons added (WW month = `colosseumStageId`): 2016-08 = 1200, 2016-09 = 1300, 2016-10 = 1400 (1.1.3 master rows,
  `external\thethiny_2026-10-13\KHUx-Server\data\`); 2016-11 = 1500, 2016-12 = 1600, 2017-01 = 1700, 2017-02 = 1800,
  2017-03 = 1900, 2017-04 = 2000 (cleaned ReLux extract `coliseum_seasons.json`). Original values only; arrays truncated
  to their `valid*` count; the donor artefacts stay stripped (tier coins x100, type-32 marker 3026478, rankId «...»,
  closeDate 2030).
- Stage sets: 2016-12 .. 2017-04 = JP 4.3.1 sets 2016-05 .. 2016-09 (the stage ids of the ReLux rows; matches
  `ww_to_jp_stage_sets.json`, 0.7 .. 1.0). 2016-08, 09, 10, 11: no original WW set exists (the 1.1.3 rows of 1200-1400
  point to JP 2015 sets that WW did not play, refuted on video; row 1500 points to 20160401, on no disk): **generated**
  from `khuxwiki_rounds_ww.json` (one wiki row = one wave, proven exact on 180 rounds), room `OC_0001_00_00`, one part,
  enemy level = round number. Generated stage ids: `2116MMNN` (MM = 08..11, NN = 01..10), never a JP id (JP 20160801..10
  is the WW 2017-03 set). Label `colosseumGenMap`, declared in the notice.
- Enemy ids: original Coliseum variant ids (20000 + base, 21xxx/22xxx) only, never a substitute model. Rows not in
  `server/master_data/enemy.json`: 1.1.3 row if present, else the proven variant rule (coliseum.md «Enemy variant rule»),
  else the ReLux row, else an estimate as for raids; label per row (`colosseumEnemyRule` / `colosseumEnemyEstimate`).
- Tiers as served by the source rows: 2016-08..10 ten tiers, 2016-11 .. 2017-04 eleven or twelve (+ one 10-round tier,
  tier coins + 900); Tier 11 Bonus boards exist from 2017-02 (wiki, proven on 2017-05 video).
- AP per round 3-5 (all nine seasons are before the 0-AP era 2017-05); the served «0 AP!» campaign 2016-11-01..03 now
  reaches the 2016-11 season.
- Ranking: every season has `ranking` + `rankingReward` rows (client «Rewards» crashes otherwise); ids stay in 4000-4099
  / 30000-39999; brackets from the 1.1.3 rows (1200-1400), else notices/wiki (COLISEUM.md «Ranking»: ReLux has no reward
  rows for 2016-12 .. 2018-03); thresholds: 2016-08 = the recorded August 2016 cutoffs, the rest interpolated per spec,
  each value's source in the module's comment block.
- Board cell layouts: the original `sphereArray` rows only (START bottom left, top-left 2 x 2 corner empty, as all 1214
  originals: I-323). Card pictures: JP 4.3.1 card where it matches the WW board screenshot, else the khuxwiki «Preview»
  at native size placed as on the screenshot (the 26-11 method, coliseum.md «Board card pictures»); never upscaled,
  never a donor card.
- Every deviation in the in-game Notices; public repo rules (English, no game files, no private contents copied in);
  heavy temp files under `D:\Progetto_Restauro_KH_UX\tmp`.
- No tester package in this part (user 26-11: one package when the whole Coliseum plan is done).

## Review Focus

1. A save whose story clock is in 2016-08 .. 2017-04 but which played only Part 1 seasons: the new season starts at Tier 1
   Round 1 with 0 coins; April-July progress untouched (Task 1 test `new seasons start fresh`).
2. A generated stage whose wiki row names an enemy with no known Coliseum variant id: the build stops with the name and
   month (never a substitute), unless declared in the generator's `unresolved` list (Task 2 test `unknown enemy stops`).
3. 2016-11 with its extra tier: shortcut windows crossing into tier 11, tier-11 rewards paid once, endless last tier still
   «∞» (Task 1 test `extra tier 2016-11`).
4. A kept Part 1 season while the story clock is in Part 2: the kept season still plays; its boards and coins are not
   mixed with the new season's (Task 4 test `kept season boards stay apart`).
5. A generated stage id `2116MMNN` reaching the client: the file is served and loads (Task 6 bench step; Task 2 test
   asserts the file names and the stage rows agree).

---

### Task 1: Season, tier, stage and ranking rows for the nine seasons (`make-colosseum.js`)

**Files:**
- Modify: `server/make-colosseum.js` (`SEASONS`, `SEASON_BOARDS`, `BONUS_TIER`, `seasonRows`, `readSource`, `rankedOf`)
- Test: `server/test-make-colosseum.js`

**Interfaces:**
- Consumes: the 1.1.3 tables (as Part 1); new `readRelux(file)` -> `{colosseumStage[], colosseum[]}` from
  `coliseum_seasons.json` (path: env `KHUX_COLOSSEUM_RELUX`, default the verified extract).
- Produces: `SEASONS` with 13 entries (`{month, colosseumStageId, source: '113'|'relux', genStages?: true}`);
  `GEN_STAGE_IDS(month) -> number[10]` (`2116MMNN`); `seasonRows(src, seasons)` emitting the new rows; ranking ids per
  season (`rankingId` of the source row); `rankedOf(...)` thresholds for all 13 seasons.

- [ ] **Step 1: Failing tests** in `test-make-colosseum.js`: `real_part2` (reads the real sources, skipped with a note when
  absent): 13 seasons; 1200/1300/1400 rows equal the 1.1.3 rows except `stageId` = `GEN_STAGE_IDS` for 1200-1400 and
  1500; 1600..2000 `stageId` = their ReLux sets (first entries 20160501, 20160601, 20160701, 20160801, 20160901); no
  tier row with coins > 10000 (x100 stripped); tier count of 1500 = 11 and the extra tier's clear coins 900; every season
  has a ranking row and ≥ 1 rankingReward row; thresholds non-decreasing per season; `new seasons start fresh`
  (rules: a player with only 800-1100 state gets Tier 1 Round 1, 0 coins in 1200); `extra tier 2016-11` (a one-turn
  window from tier 10 into tier 11; tier 11 rewards paid once; last tier `arrivalStageCount` 0).
- [ ] **Step 2: Run** `node server/test-make-colosseum.js` → FAIL.
- [ ] **Step 3: Implement.** Keep the Part 1 path for 800-1100 byte-identical (the existing tests stay green).
- [ ] **Step 4: Run** the test and `node server/test-colosseum-routes.js`, `node server/test-colosseum-rules.js` → PASS.
- [ ] **Step 5: Commit** «Coliseum Part 2: rows for the 2016-08 .. 2017-04 seasons».

### Task 2: Generated stage files for 2016-08 .. 2016-11 (`gen_colosseum_stages.py`)

**Files:**
- Create: `recon/tools/gen_colosseum_stages.py`, `recon/tools/test_gen_colosseum_stages.py`
- Modify: `recon/tools/import_colosseum_stages.py` (take the generated files from `--gen D` as a third source, after b16
  and jp), `tools/ldplayer/session/build-resources.ps1` (run the generator before the import)

**Interfaces:**
- Consumes: `khuxwiki_rounds_ww.json` (month -> round -> waves `[{enemies: [[name, count]], buffs: [...]}]`), a JP 4.3.1
  Coliseum stage as the template (room `OC_0001_00_00`, one part), the stage writer used by
  `recon/tools/gen_story_maps.py` for generated event maps, `mapfile.py` `parse_stg` / `parse_map` / `check_stage` to read
  back.
- Produces: `stage_gen\colosseum_gen\cl_stg2116MMNN.bin` + `_00.bin` (40 stages), report
  `stage_gen\colosseum_gen\report.json` (per stage: waves, enemy ids, names resolved by which rule, buffs kept/dropped).

- [ ] **Step 1: Failing tests:** a fixture month of 2 rounds -> 2 stages whose waves and per-wave counts equal the wiki
  rows; every enemy level = round number (round 1..10 of the set); file names equal the ids of Task 1's
  `GEN_STAGE_IDS`; reading back with `check_stage` passes; `unknown enemy stops`: a wiki name with no Coliseum variant id
  exits 1 naming month, round and name unless it is in `UNRESOLVED` (empty at start).
- [ ] **Step 2: Run** `python -I recon/tools/test_gen_colosseum_stages.py` → FAIL.
- [ ] **Step 3: Implement.** Name -> Coliseum variant id: the ids WW used in the neighbouring original months
  (`cl_stages_jp431.json` + 1.1.3 rows), then `gap_enemy_ids.json`; wave positions from the template's team layout;
  wiki buffs written where the stage format carries them (as the event generator does), else listed as dropped in the
  report and the notice.
- [ ] **Step 4: Run** the tests → PASS; run the generator on the real data: 40 stages, 0 unresolved.
- [ ] **Step 5: Commit** «Coliseum: generated stage files for WW 2016-08 .. 2016-11».

### Task 3: Enemy rows for every id the nine seasons use

**Files:**
- Modify: `server/make-colosseum.js` (enemy rows), `server/test-make-colosseum.js`

**Interfaces:**
- Consumes: the stage ids of Task 1, the generated report of Task 2, the JP stage parse for 2016-05..09 sets,
  `coliseum_enemies.json`, the 1.1.3 enemy table, `server/master_data/enemy.json`.
- Produces: `enemy` rows only for ids missing from the master, each with a label; `colosseumEnemies` report in the patch
  output (id, source: `113` / `rule` / `relux` / `estimate`).

- [ ] **Step 1: Failing test** `real_part2_enemies`: every enemy id of every served stage (original and generated) is in
  the master after `patch()`; no row overwrites an existing master id; every new row's source is one of the four
  labels; a `rule` row satisfies the variant rule against its base (same ATK and level knots, HP x3 at LV 300).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** «Coliseum Part 2: enemy rows of the new seasons».

### Task 4: Boards of the nine seasons and their card pictures

**Files:**
- Modify: `server/make-colosseum.js` (`SEASON_BOARDS`, `BONUS_TIER`, `BOARD_ART`, board rows from 1.1.3 for 1200-1400
  and from `coliseum_boards.json` for 1500-2000), `server/test-make-colosseum.js`, `server/test-colosseum-boards.js`
- Create: `recon/tools/coliseum_board_cards.py` (the 26-11 card method as a tool: fit a candidate picture into the khuxwiki
  board screenshot, calibrated per screenshot size on a card of known placement; writes the private cards to
  `D:\Progetto_Restauro_KH_UX\raid_loc\img\sphere_incentive_coli\<id>.png` and a review sheet to `screenshots\`)

**Interfaces:**
- Consumes: board month mapping = BOARD_IMAGES.md month column (ids 2210037 .. the last 2017-04 id), board names
  «Tier 10 Bonus» -> 10, «Tier 11 Bonus» -> 11.
- Produces: `SEASON_BOARDS[1200..2000]`, `BONUS_TIER` for every bonus board, `BOARD_ART[id]` = `'b16'` | `'jp:<file>'` |
  `'loc'` (`artLines` extended for `jp`: `img/sphere_incentive/<id>.png\tjp\timg/sphere_incentive/<jpfile>`).

- [ ] **Step 1: Failing tests:** each new season lists exactly its wiki boards; avatar boards 19 nodes / 1100 coins,
  Tier 10 Bonus 3090 (proven on video); bonus boards hidden before their tier; every board's `sphereArray` row has START
  at row 4 column 0 and nothing in the top-left 2 x 2 corner; `kept season boards stay apart` (a kept 2016-05 season
  lists only its boards while the story is in 2016-12); `artLines` emits one line per served board, `jp` lines point to an
  existing JP file name.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** the rows, then run `coliseum_board_cards.py` for every new board:
  JP candidate kept only when it matches the WW screenshot (mean abs diff on opaque pixels below the threshold of the
  26-11 fit, reported), else the wiki preview at native size. Downloads: only khuxwiki «Preview - …» and «Coliseum Board -
  … KHUX» files (user go 26-11), into `D:\Progetto_Restauro_KH_UX\tmp\coli_boards_research\wiki\`.
- [ ] **Step 4: Run** the tests → PASS; show the review sheet to the user and wait for the OK on the cards.
- [ ] **Step 5: Commit** «Coliseum Part 2: boards and card pictures of the new seasons».

### Task 5: Ranking brackets, thresholds and Catalog rows

**Files:**
- Modify: `server/make-colosseum.js` (`rankedOf` thresholds and brackets for 1200..2000), `server/colosseum-pages.js`
  (the Catalog lists 13 seasons; no change expected beyond data), tests `server/test-make-colosseum.js`,
  `server/test-colosseum-pages.js`

**Interfaces:**
- Consumes: Task 1 rows; COLISEUM.md «Ranking» (notice brackets 2016-06 .. 2016-11, wiki for later months), the August
  2016 recorded cutoffs.
- Produces: `rankingReward` rows and `ranked[id] = {brackets, thresholds}` for every new season.

- [ ] **Step 1: Failing tests:** 2016-08 thresholds equal the recorded cutoffs (values in the module comment);
  brackets of 2016-08 .. 2016-11 equal the notices; every threshold ≥ 1 and ≤ the season's total rounds before the endless
  tier; the Catalog shows 13 rows in month order with the right state for a story clock in 2016-12 (now = 2016-12,
  can keep = 2016-04 .. 2016-11, later = 2017-01 .. 2017-04).
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** «Coliseum Part 2: ranking thresholds and Catalog rows».

### Task 6: Notice, docs, regen, resources and bench walk

**Files:**
- Modify: `server/routes-info-album.js` (the «Coliseum» notice: nine more seasons, generated maps of 2016-08..11 with
  the dropped buffs if any, estimated enemy stats, the extra tier of 2016-11, the 0 AP! campaign now reaching its season,
  the cards from the wiki), `node server/export-notices.js`; `docs/notes/coliseum.md` («Part 2 summary»), `docs/ISSUES.md`
  (I-059), `HANDOFF.md`; the 4 session scripts (master revision +1)

- [ ] **Step 1:** `node server/test-notices.js` and the full suite (`for f in server/test-*.js; do node $f; done`) → all OK
  except the known list in HANDOFF.
- [ ] **Step 2:** master regen (HANDOFF command), diff against a backup: only Coliseum rows, the Catalog banner and the
  new enemy rows change; resources `build-resources.ps1 -Append -Verify` (stage files, cards); install
  (`update-resources.ps1`, tap Download, relogin twice if the first one crashes).
- [ ] **Step 3: Bench walk** (story clock in each era: 2016-08 generated set, 2016-11 extra tier, 2017-03 JP set): round
  list and levels, a generated stage loads and plays (Review Focus 5), one-turn window across a tier, a board purchase
  with its card, Catalog keep of a Part 2 season, a threshold Present.
- [ ] **Step 4:** commit + push; no tester package (one package at the end of the Coliseum plan).
