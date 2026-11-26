# Coliseum Part 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the eleven WW Coliseum seasons 2017-05 .. 2018-03 served on top of the Part 1-2 mechanism, with every tier of the
original master (also for the Part 2 seasons), the seven generated maps of 2017-06 .. 12, the month-copy enemy rows the era
uses, boards and cards, ranking prizes and thresholds calibrated on this era's cutoffs.

**Architecture:** no new mechanism. `make-colosseum.js` reads one more source (the raw ReLux enemy table) and accepts the
month enemy ids; `gen_colosseum_stages.py` takes 2017 months with a new id scheme; boards, cards, ranking and Catalog take
the new seasons through the existing paths. The user cut (26-11): Part 3 = 2017-05 .. 2018-03; 2018-04 .. 2019-04 is the
next part (lump-sum coins, Broom / Moon Gem rewards, 99-round skips); Part 4 = 2019-05 .. 2021-06.

**Tech Stack:** Node (`node server/test-*.js`), Python 3 tools in `recon/tools/` (`python -I`), PowerShell session scripts.

**Spec:** `docs/superpowers/specs/2026-11-25-coliseum-design.md`. Research (private, local): `private\events\sources\coliseum\`
`PART3_AUDIT.md` (the data audit this plan argues from), `MISSING17_ENEMIES.md`, `PUPPY_BOARDS.md`, `board_art_all.json` +
`CARDS_ALL_REPORT.md` (cards prepared ahead, may still be in progress), COLISEUM.md, RULES.md; ReLux extracts
`private\donations\relux_2026-11\verified\` and the raw table `Reddit Donators\ReLux Team\KHUX_pacchetto_18_11_2026\pkg\server_master\enemy.json`.
Part 2 plan and summary: `docs/superpowers/plans/2026-11-26-coliseum-part2.md`, `docs/notes/coliseum.md`.

## Global Constraints

- Seasons added (WW month = `colosseumStageId`, cleaned ReLux extract `coliseum_seasons.json`): 2017-05 = 2100, 2017-06 =
  2200, 2017-07 = 2300, 2017-08 = 2400, 2017-09 = 2500, 2017-10 = 2600, 2017-11 = 2700, 2017-12 = 2800, 2018-01 = 2900,
  2018-02 = 3000, 2018-03 = 3100; rankingId 4022 .. 4032. Original values only; arrays truncated to `valid*`.
- **Tiers (user 26-11):** every tier row inside head..term of the source row is served (22 tiers per month in this part;
  the trailing 0-round end marker outside head..term is not). The same rule replaces the Part 2 «stop at the first 999-round
  tier» for every ReLux season (1500 .. 2000); the 1.1.3 seasons (800 .. 1400) keep their rows as they are.
- AP 0 on every tier (2017-05 onwards); no AP campaign touches these months.
- `excellentUnlockCount` from the ReLux rows, also where khuxwiki differs (2017-08: ReLux's raised skips; ruling: the JP wiki
  timing supports ReLux).
- Stage sets: 2017-05 = JP 4.3.1 `cl_stg20161001..10`; 2018-01 / 02 / 03 = JP `20170601` / `0701` / `0801` (sets of the
  ReLux rows). 2017-06 .. 12: **generated** from `khuxwiki_rounds_ww.json` (10/10 rounds each), room `OC_0001_00_00`, one part,
  enemy level = round number, stage ids `2117MMNN` (MM = 06..12, NN = 01..10; never a JP id, never a 2116 id), label
  `colosseumGenMap`; wiki buffs and counters the format cannot carry are dropped and declared.
- Enemy ids: original ids only, never a substitute model. Rows not in `server/master_data/enemy.json`, in this order:
  1.1.3 row; raw ReLux row of the same id when its shape is the old (pre-2019) curve and not corrupt; **month copy** (a
  month id `YYMM0xxxxx` / `1xxxxx` takes the row of its base 20xxx with the new id and the base's `displayId`); variant
  rule (coliseum.md «Enemy variant rule») from an **original** base row (1.1.3, else raw ReLux old-shape); else the build
  stops (no estimates without the user). ReLux rows with 2019-revamp values are never used for these seasons. Labels per
  row: `colosseumEnemyRelux`, `colosseumEnemyMonthCopy`, `colosseumEnemyRule`.
- Named cases (audits): the 16 ids `161020xxx` of 2017-05: raw ReLux rows for 007, 011, 015, 022, 033, 036, 059, 092, 093,
  110, 116; month copy for 099, 126, 153, 154 (corrupt raw rows) and 137 (2019 shape). 21557 (2018-01, 2018-04 sets): rule
  from base 1557 «The Good Boy» (raw ReLux base row), name declared as inferred. 120097 Ringmaster (2018-02): month copy of
  the rule row 20097 (base 97 old shape), not the 2019 row. Generated maps: Ringmaster 2017-06 R10 = 20097, Enraged Elk
  2017-09 R10 = 20184, both rule rows from bases 97 / 184 (raw ReLux old shape), declared in the notice.
- Boards: the 44 ReLux boards 2210067 .. 2210106 (4 per month, 3 from 2017-12: both-gender 3500-coin board + Tier 10 / 11
  Bonus); Spirit-part cells (type 33) served as Spirit parts; Puppy Medium / Puppy Bob are JP-only (PUPPY_BOARDS.md: not
  served, a notice line). Card pictures as in Part 2 (JP card only when it fits the WW screenshot and contains the preview;
  else the khuxwiki preview at native size; never upscaled); cards prepared ahead in `board_art_all.json` are reused.
- Ranking: 8 brackets per month; prizes from khuxwiki and the monthly notices (featured skill by NAME, never by ReLux skill
  id); 2017-12 Santa Hat / Beard / Brows are Spirit parts (402007 / 411002 / 401004). Thresholds: a new era curve fitted on
  this era's recorded cutoffs (Task 5), each value's source in the module comment, labelled interpolated where it is.
- Every deviation in the in-game Notices; public repo rules (English, no game files, no private contents, never the private
  companion app); heavy temp files under `D:\Progetto_Restauro_KH_UX\tmp`; no tester package in this part.

## Review Focus

1. A save with Part 2 progress beyond the old last tier: after the tier change (all master tiers) a 2016-11 .. 2017-04
   season whose `last` sits in the endless tier keeps its progress and the next round is the right one (Task 1 test
   `part2 tiers extended keep progress`).
2. A month enemy id (`161020007`, `120097`) reaching the stage import and the client: the row exists, has the base model's
   `displayId`, and the import accepts the id (Task 3 test `month ids served`).
3. A generated 2017 stage id colliding with a served 2016 one: impossible by construction (Task 2 test `gen ids disjoint`).
4. A one-turn clear with the 2017-11 skips (53) crossing several tiers: every skipped tier's rewards paid once, coins of the
   skipped rounds paid (Task 1 test `skip 53 across tiers`).
5. 2017-12 rows with Spirit-part prizes and board cells on a save without the pet system: the Present / cell is granted and
   shown as a Spirit part, not dropped (Task 4 / Task 5 tests `spirit parts paid`).

---

### Task 1: Season and tier rows for 2017-05 .. 2018-03, all master tiers (`make-colosseum.js`)

**Files:** Modify `server/make-colosseum.js` (`SEASONS`, tier cut in `seasonRows`), `server/test-make-colosseum.js`,
`server/test-colosseum-rules.js` if a rules case is added.

**Interfaces:**
- Consumes: `readRelux` (Part 2), the Part 2 `SEASONS` entries.
- Produces: `SEASONS` with 24 entries (`{month, colosseumStageId, source, genStages?}`), `GEN_STAGE_IDS(month)` returning
  `2116MMNN` for 2016 months and `2117MMNN` for 2017-06..12; tier rows = every row inside head..term for ReLux seasons.

- [ ] **Step 1: Failing tests:** `real_part3` (skipped with a note when the private sources are absent): 24 seasons; 2100 ..
  3100 have 22 tier rows each, AP 0 everywhere; 2400 skips = ReLux (36,32,32,28,...); 2700 tier 1 skip 53; the tier
  rewards' medal ids all exist in our medal master (map ReLux ids by name where they differ, VERIFY.md); `part2 tiers
  extended`: 1500 .. 2000 now serve every head..term tier (count from the source rows) and 800 .. 1400 are byte-identical to
  before; `part2 tiers extended keep progress` (a save with `last` in 1600's old endless tier keeps tier/round and its next
  round); `skip 53 across tiers` (rules: a one-turn clear of 2700 T1 R1 opens 53 rounds across tiers; clearing round 50 pays
  every skipped round's coins and the completed tiers' rewards once).
- [ ] **Step 2: Run** `node server/test-make-colosseum.js` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** it and `test-colosseum-routes.js`, `test-colosseum-rules.js`, `test-colosseum-pages.js` → PASS.
- [ ] **Step 5: Commit** «Coliseum Part 3: rows for 2017-05 .. 2018-03, all master tiers».

### Task 2: Generated stage files for 2017-06 .. 2017-12 (`gen_colosseum_stages.py`)

**Files:** Modify `recon/tools/gen_colosseum_stages.py`, `recon/tools/test_gen_colosseum_stages.py`,
`tools/ldplayer/session/build-resources.ps1` (months argument), `recon/tools/import_colosseum_stages.py` if the id scheme
needs it.

**Interfaces:**
- Consumes: Task 1 `GEN_STAGE_IDS`; `khuxwiki_rounds_ww.json`; the Resolver (Part 2) extended with an explicit
  `NAMED = {'Ringmaster': 20097, 'Enraged Elk': 20184}` for these months.
- Produces: `stage_gen\colosseum_gen\cl_stg2117MMNN*.bin` (70 stages / 140 files) next to the 2016 ones; report.json per stage.

- [ ] **Step 1: Failing tests:** `gen ids disjoint` (2116 and 2117 id sets disjoint, equal to Task 1's list); a 2017 fixture
  month generates stages whose waves equal the wiki rows; `named enemies` (Ringmaster → 20097, Enraged Elk → 20184, reported
  with rule `named`); 2016 output unchanged (byte-identical files for one 2016 month).
- [ ] **Step 2: Run** `python -I recon/tools/test_gen_colosseum_stages.py` → FAIL. **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS; real run: 110 stages (40 + 70), 0 unresolved; report the dropped buffs per stage.
- [ ] **Step 5: Commit** «Coliseum: generated stage files for WW 2017-06 .. 2017-12».

### Task 3: Enemy rows of the new seasons (month ids, raw ReLux, month copies)

**Files:** Modify `server/make-colosseum.js` (enemy sources and id range), `server/test-make-colosseum.js`; env
`KHUX_COLOSSEUM_RELUX_ENEMY` = the raw ReLux enemy table (default the private path in Global Constraints).

**Interfaces:**
- Consumes: the stage lists (import report, generated report, JP parse), the raw ReLux table, 1.1.3 rows.
- Produces: enemy rows for every missing id, sources `113` / `relux` / `monthCopy` / `rule`; `enemyCheck` as in Part 2.

- [ ] **Step 1: Failing tests:** `real_part3_enemies`: every enemy id of every served stage is in the master after `patch()`;
  the named cases of Global Constraints get exactly their stated source; no row uses a 2019-shape ReLux row (shape check:
  knots and HP scale as VERIFY.md §1 describes); `month ids served` (161020007 has base 20007's `displayId`; 120097 is a
  month copy of rule row 20097); no existing master row is overwritten; an id with no source still stops the build with the
  documented message.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** «Coliseum Part 3: enemy rows of the new seasons».

### Task 4: Boards of 2017-05 .. 2018-03 and their cards

**Files:** Modify `server/make-colosseum.js` (`SEASON_BOARDS`, `BONUS_TIER`, `BOARD_ART`), `server/test-make-colosseum.js`,
`server/test-colosseum-boards.js`; run `recon/tools/coliseum_board_cards.py` only for boards without a card yet.

**Interfaces:**
- Consumes: `coliseum_boards.json` rows 2210067 .. 2210106; `board_art_all.json` (cards prepared ahead).
- Produces: `SEASON_BOARDS[2100..3100]`, `BONUS_TIER` 10/11 for the new bonus boards, `BOARD_ART` for all 44 boards.

- [ ] **Step 1: Failing tests:** each new season lists exactly its ReLux boards (2017-05..11: 4, 2017-12..2018-03: 3);
  START row 4 column 0 and empty top-left 2 x 2 on all 44; `spirit parts paid` (a 2017-12 Blue Reinstar cell of type 33
  grants the Spirit part on a save without pets); `artLines` covers all 44; no Puppy Medium / Puppy Bob board.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; cards missing from `board_art_all.json` via the tool; review sheet to
  `screenshots\coli_part3_cards_review.png` (only the new cards, if any), shown to the user by the controller.
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** «Coliseum Part 3: boards and cards of 2017-05 .. 2018-03».

### Task 5: Ranking prizes and era thresholds

**Files:** Modify `server/make-colosseum.js` (`RELUX_RANKING` → per-month prize table for 2100..3100, `rankItem` type 33,
thresholds), `server/test-make-colosseum.js`. Research output (private): `private\events\sources\coliseum\CUTOFFS_2017.md`.

**Interfaces:**
- Consumes: PART3_AUDIT.md §6 (prizes by month, featured skills by name, avatar parts, Spirit parts); reddit cutoffs.
- Produces: ranking + rankingReward rows for 4022 .. 4032; thresholds per season.

- [ ] **Step 1: Research:** fetch the r/KingdomHearts «border ranks analysis» posts for 2017-10 / 11 / 12 (u/xamaxin, linked
  from R-7v2d0d) and any 2017-05 .. 2018-03 border data; record every point (month, rank, tier/round, date, URL) in
  CUTOFFS_2017.md. Read-only public pages.
- [ ] **Step 2: Failing tests:** each season's brackets and prizes equal the audit table (skill ids looked up by name in
  skill.json; 2017-12 Spirit parts by bracket); every threshold within 1 .. the season's served rounds; thresholds
  non-decreasing; the recorded points of CUTOFFS_2017.md reproduced within the fit's stated tolerance; `spirit parts paid`
  (a 2017-12 threshold Present with a Spirit part).
- [ ] **Step 3: Run** → FAIL. **Step 4: Implement** (fit per era: one curve for 2017-05 .. 2018-03, source and method in the
  module comment). **Step 5: Run** → PASS. **Step 6: Commit** «Coliseum Part 3: ranking prizes and 2017 thresholds».

### Task 6: Notice, docs, regen, resources and bench walk

**Files:** `server/routes-info-album.js` («Coliseum» notice: 24 seasons, all master tiers, 0 AP from 2017-05, generated
maps 2017-06..12 with dropped buffs and the two named enemies, month-copy and rule enemy rows, Puppy boards JP-only,
thresholds of the new era), `node server/export-notices.js`; `docs/notes/coliseum.md` («Part 3 summary»), `docs/ISSUES.md`
(I-059), `HANDOFF.md`, README rows; the 4 session scripts (master revision +1).

- [ ] **Step 1:** `node server/test-notices.js` and the full suite → all OK.
- [ ] **Step 2:** master regen (HANDOFF recipe), diff against a backup (only Coliseum rows, new enemy rows); resources
  `build-resources.ps1 -Append -Verify`; install (`update-resources.ps1`, tap Download).
- [ ] **Step 3: Bench walk (controller):** first the **LV > 999 probe** (same enemy and deck at LV 999 and at LV 1151: damage
  per hit and hits to kill; record whether the client clamps at the last knot or keeps growing, add one notice line);
  then story clock in 2017-05 (JP set, month-copy enemies), 2017-06 (generated, Ringmaster R10), 2017-09 (Enraged Elk R10),
  2017-12 (Blue Reinstar board, Spirit parts), 2018-02 (120097): round list and levels, a generated stage plays, a one-turn
  window across tiers with 53 skips, a board purchase with its card, the Catalog rows/detail page/filters/phone frame, a
  threshold Present; a Part 2 season past its old last tier.
- [ ] **Step 4:** commit + push; no tester package.
