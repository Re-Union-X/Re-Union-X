# Coliseum Part 4 (2019-05 .. 2021-06, the revamp) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the 26 WW Coliseum seasons 2019-05 .. 2021-06 served on top of Parts 1-3b: the revamp tiers (200 / 400-round tiers,
T1-T18, the Tier 10 «<Month> Victor» title), the 2019 enemy curve and the `6xxxx` ids, 9-stage months from 2020-01, three months
without JP files (2019-07 generated, 2020-01 / 2020-10 rebuilt from original JP stages), five boards a month (avatar, Huey Dewey
Louie, Chip, Dale, Scrooge-skill), 12 / 16 / 2-bracket rankings as thresholds. This closes the Coliseum plan; then one tester package.

**Architecture:** no new screen. `make-colosseum.js` gets 26 more ReLux seasons, an era registry (`ERAS`) for thresholds and
enemy shapes, a finite last tier, ranking items of types 5 / 14 and per-season bracket lists; `import_colosseum_stages.py`
imports 23 JP months (28 rebuilt STG headers) and a new whole-stage copy mode; `gen_colosseum_stages.py` generates 2019-07 once
its enemies are settled; `colosseum-rules.js` stops at the last round of a finite last tier.

**Tech Stack:** Node (`node server/test-*.js`), Python 3 tools in `recon/tools/` (`python -I`), PowerShell session scripts.

**Spec:** `docs/superpowers/specs/2026-11-25-coliseum-design.md` (Part 4 row; the spec's «9 stages from 2020-02» is corrected to
2020-01 by the audit). Research (private, local) in `private\events\sources\coliseum\`: **`PART4_AUDIT.md`** §1b-§1c (rows),
§2 (stage sets, missing headers, 2020-01 / 2020-10 rebuild lists), §3 (enemy ids per month), §4b (boards and cards), §5 (ranking,
featured skills), §6 (UI); `ENEMIES_2019_07.md` (the 2019-07 enemy search, written before Task 3); `CUTOFFS_2019.md` (border ranks
2019-05 .. 2021-06, written before Task 6); `board_art_all.json`, `BOARD_IMAGES_online_2019-2021.md`, `BOARD_2210191.md`; RULES.md,
COLISEUM.md; ReLux extracts `private\donations\relux_2026-11\verified\` and the raw tables of `DEFAULT_RELUX_ENEMY`. Part 3b plan,
ledger, final review (items 5, 6, 8-11 are carried here): `docs/superpowers/plans/2026-11-26-coliseum-part-2018.md`,
`.superpowers/sdd/2026-11-26-coliseum-part-2018/`.

## Global Constraints

- Seasons added (`colosseumStageId` = 800 + 100 x months since 2016-04): 2019-05 = 4500 .. 2021-06 = 7000 (26 seasons, step 100),
  rankingId 4046 .. 4071. Original values only; arrays cut at `valid*`.
- **Tiers (user 27-11):** T1-T18 served; **T19 (1000 rounds, AP 99, skip 1) is not served** (a designer wall, declared in the
  notice). Rows: T1 200 rounds sk 199, coins 100; T2-T3 400 sk 199, 300; T4 400 sk 149, 300; T5-T7 400 sk 99, 500, 10 coins a
  round; T8 300 sk 99, 700, 30 a round; T9 200 sk 99, 700, 30 a round; T10 100 sk 49, title type 7 id 17079 + months since 2019-05
  (2019-05 = 17079 .. 2021-06 = 17104, `title.json` «<Mon. YYYY> Victor»); T11-T18 100 sk 49, no reward. 4,000 rounds in all, no
  endless tier: after round 4,000 the season is complete (no round playable, the page says so). AP 0 everywhere. Rule for the cut:
  a ReLux tier row with `ap` > 0 is not served (only T19 has one); the Part 1-3b seasons are unchanged.
- Levels: `lvPerLoop` / `loopStageCount` 10 / 10 to 2019-12, 9 / 9 from **2020-01** (`validStage` 9): enemy level = global round
  in both cases; the stage of round n = ((n - 1) mod validStage) + 1.
- Stage sets = the same JP month: 2019-05, 06, 08 .. 12, 2020-02 .. 09, 2020-11 .. 2021-06 imported from JP 4.3.1, highest
  revision; **28 stages without an STG header** (PART4_AUDIT §2 table) rebuilt with `rebuild_from_sibling` (never another stage's
  enemies). **2020-01** = the JP 2020-05 stages 20200501 .. 09 copied whole under the 2020-01 ids; **2020-10** = per-round whole
  copies: R1 20200501, R2 20210102, R3 20200703, R4 20200504, R5 20210105, R6 20200506, R7 20200507 (Iron Giant alone; the same stage is 20200307 / 0707 / 20210107 / 0507),
  R8 20200405, R9 20200409 (user 27-11, Q9; the copy keeps its positions and enemies; KW buffs dropped as in every month).
  **2019-07** = generated from the khuxwiki lineup **only after `ENEMIES_2019_07.md` settles every enemy** (user 27-11: verify
  massively; never a substitute); until then 2019-07 is listed «Not built yet» and the build skips it, not stops.
- Stage ids of copied / generated sets: `21YYMMNN` (2019-07 = 21190701 .. 10, 2020-01 = 21200101 .. 09, 2020-10 = 21201001 .. 09),
  never a JP id. Stage rows stay in `RANGES.stage` 81001-81999.
- Enemies: original ids only. Order of sources, Parts 1-3b plus one branch: 1.1.3 row; raw ReLux row of the **shape accepted by
  the era** (old shape for seasons <= 4400; **the 2019 shape for an id needed only by seasons >= 4500**; an id needed by both eras
  takes the old rule); month copy (`monthBase`, also `1` + id: 121565 / 121566); variant rule; else the build stops. `6xxxx` ids
  (60000-62999) are Coliseum ids of the revamp (`ENEMY_RANGE` becomes a list of ranges). **Ids already in our master keep their
  row (user 27-11, Q4):** the 14 ids with 1.1.3 rows (20007, 20011, 20012, 20015, 20016, 20017, 20035, 20059, 20071, 20110, 20131,
  20136, 20137, 20144) and every id Parts 3 / 3b added fight at LV 1,000-4,000 on their pre-revamp row; benched (LV > 999 probe)
  and declared in the notice.
- Boards (130, ReLux `coliseum_boards.json`): five a month, avatar (18 cells / 4,900 coins) = sphere id N, HDL N+1, Chip N+2,
  Dale N+3, Scrooge-skill «Coliseum Board» (9 / 260) N+4; N = 2210151 + 5 x (months since 2019-05) to 2021-02 (2210256), then
  2021-03 .. 06 = 2310163 / 168 / 173 / 178. **No board is tier-gated (user 27-11, Q6):** no `BONUS_TIER` entry. `RANGES.sphere` /
  `sphereArray` / `sphereMasu` upper bound 2399999. Cell rewards: medals via `RELUX_MEDAL`, types 5 (gems 51 / 52), 7 (titles),
  19 / 20 (avatar parts), 33 (Spirit parts 401016, 401018, 407048). Cards: `jp:` twins of PART4_AUDIT §4b; 2210161 (2019-07) and
  2210236 (2020-10) the wiki preview (`loc`); 2210191 the approved hand-made card; 2021-03 .. 06 the JP 2200302 / 307 / 312 / 317
  after a `coliseum_board_cards.py` fit into the layout screenshots 30 / 31 (user 27-11, Q9); fixed boards: Skill = JP 2200196, Chip
  = 2200194, Dale = 2200195, HDL = the same-month JP block file (2200193 in 2019, 2200248 from 2020-04; the neighbour block for
  2019-07, 2020-01, 2020-10).
- Ranking (prizes by NAME; RX = khuxwiki = notices): 2019-05 .. 09 `BRACKETS12`; **2019-10 .. 2020-10 the RX edges (user 27-11,
  Q7)**: the first eight of `BRACKETS12`, then 10001-15000, 15001-20000, 20001-35000, 35001-80000; 2020-11 .. 2021-04 sixteen (1-100,
  101-250, 251-500, 501-750, 751-1000, 1001-2000, 2001-3000, 3001-4000, 4001-5000, 5001-6500, 6501-8000, 8001-10000, 10001-15000,
  15001-20000, 20001-30000, 30001-80000); 2021-05 / 06 two (1-40000 Moogle 3★ 90013, 40001-80000 Moogle 1★ 90011). Featured skills:
  PART4_AUDIT §5. Item types: medals, 5 (gems: P / S / M, Sun 51, Moon 52, Rainbow / Brilliant), 14 (Avatar Coins x100), SP Chip &
  Dale 90346. RX skill / medal ids are another id space: map by name. «ATK B XV Max & GA 2» (2021-02 top prize) is missing from our
  `skill.json`: Task 6 decides it (see there).
- Thresholds: the Part 3 method on a new era `ERA19` fitted on `CUTOFFS_2019.md` (user 27-11, Q8: research first, else the era
  curve, declared); per-month curves where a month has points; low end 1 round at the season's last edge (80,000 from 2019-10;
  100,000 for 2019-05 .. 09); every threshold within 1 .. 4,000.
- Carried from the Part 3b final review: #5 `rebuild_from_sibling` tries every sibling and the docstring matches; #6 a warning when
  ReLux seasons are served without a medal master; #8 `ERAS` registry; #9 `makeEra` parameters (`fitRank`, `players`, `monthSpan`);
  #10 per-era `reluxShape` + `6xxxx` branch; #11 threshold labels («fitted» only inside the rank span of a month's own points).
- Every deviation in the in-game Notices; public repo rules (English, no game files, no private contents, no donor names in new
  code, never the private companion app); heavy temp files under `D:\Progetto_Restauro_KH_UX\tmp`; tester package only after Task 7.

## Review Focus

1. A player reaching round 4,000 of a revamp season: no round 4,001 is offered, the clear of 4,000 pays T18 once, a one-turn clear
   near the end never opens past 4,000, and the detail page shows no «∞» (Task 1 test `finite last tier`).
2. A 9-stage month (2020-01 .. 2021-06): round 10 plays stage 1 at LV 10, round 3,100 stage 4 at LV 3,100 (Task 1 test
   `nine-stage loop`).
3. An id used by both a 2018 month and a 2020 month (e.g. 21530): its existing old-shape row stays byte-identical; an id used only
   after 2019-05 takes its 2019-shape row; a 2019-shape row is still refused for a pre-revamp-only id (Task 4 test `era shapes`).
4. A 16-bracket season in the Rewards dialog and the thresholds: 16 rankingReward rows inside the season's id block, thresholds
   non-decreasing and inside 1 .. 4,000, Avatar Coins and gems named on the detail page (Task 6 test `sixteen brackets`).
5. The Tier 10 clear: the title is granted once, shows in the clear answer (`userTitles`) and on the detail page as «May 2019
   Victor» (Task 1 test `tier 10 title`).

---

### Task 1: Season and tier rows 2019-05 .. 2021-06, finite last tier, Tier 10 title

**Files:** Modify `server/make-colosseum.js` (`SEASONS`, tier cut, medal-master warning), `server/colosseum-rules.js` (finite last
tier), `server/routes-colosseum.js` (`endless` only for a 999-round last tier, «Season complete»), `server/colosseum-pages.js` (title
and coin labels); tests `server/test-make-colosseum.js`, `test-colosseum-rules.js`, `test-colosseum-routes.js`, `test-colosseum-pages.js`.

**Interfaces:**
- Consumes: `readRelux`, `seasonRows`, `tierRow`, `reluxMedals` (Parts 2-3b).
- Produces: `SEASONS` with 63 entries (2019-07 carries `pending: 'enemies'` until Task 3 clears it: `seasonRows` skips a pending
  season and lists it in `out.pending`); `REVAMP_FIRST = 4500` (exported); `colosseum-rules` `total(tiers)` = the rounds of all
  tiers when the last is finite, `Infinity` otherwise; `clear` / `playable` cap `open` at `total`.

- [ ] **Step 1: Failing tests:** `real_part4` (skipped with a note without the private sources): 63 seasons, 62 served + 2019-07
  pending; 4500 .. 7000 have 18 tiers, no `ap` > 0, rounds 200, 400 x 6, 300, 200, 100 x 9 = 4,000; coins / per-round coins / skips
  as Global Constraints; T10 reward type 7 = 17079 + n; `validStage` 10 to 5200, 9 from 5300; the Part 1-3b rows byte-identical.
  Rules: `finite last tier` (a season of tiers [3, 2]: clearing round 5 one-turn leaves `open` 5 and `playable` empty; round 6
  refused), `nine-stage loop`, `tier 10 title` (routes: clearing round 3,200 grants title 17079 once, a second clear of the season
  grants nothing; pages name «May 2019 Victor»). A build without `medal.json` prints `colosseum: no medal master, ReLux medal ids
  unchecked`.
- [ ] **Step 2: Run** `node server/test-make-colosseum.js` and the three colosseum tests → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** them → PASS.
- [ ] **Step 5: Commit** «Coliseum Part 4: rows for 2019-05 .. 2021-06, finite last tier, Tier 10 title».

### Task 2: JP stage import of 23 months, 28 rebuilt headers, whole-stage copies of 2020-01 / 2020-10

**Files:** Modify `recon/tools/import_colosseum_stages.py`, `recon/tools/test_import_colosseum_stages.py`, `server/make-colosseum.js`
(`COPY_STAGES`).

**Interfaces:**
- Consumes: Task 1 season rows; the JP 4.3.1 stage folder.
- Produces: `rebuild_from_sibling(sid, name, files)` that tries every same-month sibling (review #5); `COPY_STAGES` in
  make-colosseum.js `{month: [jpStageId, ...]}` (2020-01: 20200501 .. 09; 2020-10: the 9 Global Constraints ids), written to the
  season rows as `21YYMMNN` ids and to the import as `--copy <served id>=<jp id>`; report entries `copiedFrom: <jp id>`.

- [ ] **Step 1: Failing tests:** `header rebuilt part4` (the 28 stages: `check_stage` passes, counts equal the part); `first sibling
  broken` (a fixture whose first sibling raises `FormatError` still rebuilds from the second); `whole copy` (21200101 has the bytes
  of 20200501, header and part, under the new id's file names; the report says `copiedFrom`); a copy of a JP id that is not on
  disk exits 1.
- [ ] **Step 2: Run** `python -I recon/tools/test_import_colosseum_stages.py` → FAIL. **Step 3: Implement.**
- [ ] **Step 4: Run** → PASS; real run after a Task 1 regen: 370 + 214 imported (7 months x 10 + 16 x 9) + 18 copied, 28 `headerRebuilt`
  (PART4_AUDIT §2 table from 2019-05 on), 18 `copiedFrom`, 0 rejected (missing enemy ids reported only, Task 4 fills them).
- [ ] **Step 5: Commit** «Coliseum Part 4: JP stage sets 2019-05 .. 2021-06, rebuilt headers, 2020-01 / 2020-10 copies».

### Task 3: 2019-07 (gated on `ENEMIES_2019_07.md`)

**Files:** Modify `recon/tools/gen_colosseum_stages.py` (`MONTHS` + 2019-07, id scheme `21YYMMNN` for every year, `is_variant` over
the `ENEMY_RANGES` list, a name resolver over the RX names), `recon/tools/test_gen_colosseum_stages.py`, `server/make-colosseum.js`
(`GEN_MONTHS`, `pending` removed).

**Interfaces:**
- Consumes: `ENEMIES_2019_07.md` (the binding id → row source for the 13 enemies); the user's ruling on any enemy it leaves unfound.
- Produces: `generated` 21190701 .. 10 with the report entries of Parts 2-3.

- [ ] **Step 0 (controller):** read `ENEMIES_2019_07.md`, show the user the result per enemy and record the ruling in the ledger. If
  any of the three monsters stays unfound, stop the task here: 2019-07 stays pending («Not built yet» in the Catalog and the notice).
- [ ] **Step 1: Failing tests:** 2019-07 lineup = the KW rows (R6 three waves); ids exactly the ledger's list; level = round; the
  2016 / 2017 generated sets byte-identical (old ids 2116MMNN / 2117MMNN unchanged).
- [ ] **Step 2: Run** `python -I recon/tools/test_gen_colosseum_stages.py` → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** «Coliseum Part 4: generated 2019-07».

### Task 4: Enemy rows of the revamp sets (era shapes, `6xxxx`)

**Files:** Modify `server/make-colosseum.js` (`ENEMY_RANGES`, `reluxShape` acceptance per era, `resolve` with the needing seasons,
`PART4_ENEMY_IDS`), `server/test-make-colosseum.js`.

**Interfaces:**
- Consumes: Tasks 2-3 stage lists; PART4_AUDIT §3 (169 ids: 38 in our master, 131 RX).
- Produces: `ENEMY_RANGES = [[20000, 29999], [60000, 62999]]`; `acceptedShape(seasonIds) -> 'old' | '2019'` ('2019' only when every
  needing season is >= `REVAMP_FIRST`); `PART4_ENEMY_IDS` (exported, the explicit list as Parts 3 / 3b); `out.colosseumEnemies` entries
  `reluxShape: '2019'` for the new rows; `out.sharedOldRows` = the ids needed by revamp seasons that keep a pre-revamp row (for the
  notice count).

- [ ] **Step 1: Failing tests:** `era shapes` (Review Focus 3, fixtures); `real_part4_enemies`: every enemy of every served stage is in
  the master after `patch()`; the RX-only ids not yet in the master (PART4_AUDIT §3: 94) get their RX 2019 row, label `colosseumEnemyRelux`; 121565 / 121566 = month copies of
  21565 / 21566; no existing master row changes; `sharedOldRows` contains the 14 ids of Global Constraints.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** «Coliseum Part 4: enemy rows of the revamp sets».

### Task 5: Boards of 2019-05 .. 2021-06 and their cards

**Files:** Modify `server/make-colosseum.js` (`SEASON_BOARDS`, `BOARD_ART`, `RANGES`), `recon/tools/coliseum_board_cards.py` (`--ids`
for the 2021 fit check only), `server/test-make-colosseum.js`, `server/test-colosseum-boards.js`.

**Interfaces:**
- Consumes: `coliseum_boards.json` (130 boards); `board_art_all.json`; `RELUX_MEDAL`.
- Produces: `SEASON_BOARDS[4500 .. 7000]` (five each; a pending season serves none of its boards, they stay in `SEASON_BOARDS`);
  `BOARD_ART` entries for all 130.

- [ ] **Step 1: Failing tests:** five boards per season in the order avatar, HDL, Chip, Dale, Skill; START row 4 column 0 and the empty
  top-left 2 x 2; totals 4,900 + 260 + 3 x 8,580 = 30,900 per month; no board in `BONUS_TIER`; ids 2310163 .. 2310182 accepted;
  every type-33 cell id in `petParts.json`, every type-7 cell in `title.json`; `artLines` covers all 130, `PENDING_ART` empty.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement**; run the fit of JP 2200302 / 2200307 on layouts 30 / 31 and put the score in the
  ledger (a fit worse than the 2019-2020 twins goes to the user before serving).
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** «Coliseum Part 4: boards and cards of 2019-05 .. 2021-06».

### Task 6: Era registry, ranking prizes 12 / 16 / 2 brackets, ERA19 thresholds

**Files:** Modify `server/make-colosseum.js` (`ERAS`, `makeEra(points, lo, hi, opts)`, `thresholdsOf`, `RELUX_RANKING` 4500 .. 7000,
`rankItem` types 5 / 14, `MEDAL.spcd`, `SKILL_LV`, labels), `server/test-make-colosseum.js`; `server/master_data` only through the
regen if the skill row is added.

**Interfaces:**
- Consumes: `CUTOFFS_2019.md`; PART4_AUDIT §5.
- Produces: `makeEra(points, lo, hi, {tolerance, monthTolerance, fitRank, players, monthSpan})` (ERA17 / ERA18 called with their
  current values: rows byte-identical); `ERAS = [ERA17, ERA18, ERA19]`, `eraOf(id) = ERAS.map((e) => e.of(id)).find(Boolean)`;
  `BRACKETS12RX`, `BRACKETS16`, `BRACKETS2`; rankItem tokens `g:<materialId>x<n>`, `ac:<n>` (type 14).

- [ ] **Step 1: Failing tests:** each season's edges and prizes equal PART4_AUDIT §5 (skills by name in `skill.json`, every `SKILL_LV`
  present); `sixteen brackets` (Review Focus 4); 2021-05 / 06 two rows; Part 2-3b rankingReward rows and thresholds byte-identical
  (hash test); ERA19 reproduces `CUTOFFS_2019.md` points within the stated tolerance; the label is «fitted» only inside a month's own
  point span (review #11, ERA17 / 18 labels re-pinned).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** «ATK B XV Max & GA 2»: if the donor `skill.json` row has the same effect layout as our «ATK B XIV Max &
  GA 2» with the next ladder values, add it under the first free id of our skill table (label in the module comment, declared);
  otherwise stop and ask the user (the prize waits).
- [ ] **Step 4: Run** → PASS. **Step 5: Commit** «Coliseum Part 4: era registry, 12 / 16 / 2 brackets, ERA19 thresholds».

### Task 7: Notice, docs, regen, resources and bench walk

**Files:** `server/routes-info-album.js` («Coliseum» notice: 62 / 63 seasons, the revamp tiers, T19 not served, no endless tier,
Tier 10 title, 9-stage months, 2020-01 / 2020-10 rebuilt from other months' JP stages, 2019-07 generated or pending, dropped buffs,
enemy sources per era and the shared pre-revamp rows, the board set and its cards, 12 / 16 / 2 brackets and the thresholds),
`node server/export-notices.js`; `docs/notes/coliseum.md` («Part 4 summary», stale status lines of review #4), `docs/ISSUES.md`
(I-059), `HANDOFF.md`, README rows (`README.md`, `README.it.md` phase D); the 4 session scripts (revision +1); season cards
(`python -I recon/tools/make_special_banners.py --section colosseum`).

- [ ] **Step 1:** `node server/test-notices.js` and the full suite → all OK.
- [ ] **Step 2:** master regen (HANDOFF recipe) **twice**, diff against a backup (only Coliseum rows, the new enemy rows, the skill row
  if added); `build-resources.ps1 -Append -Verify`; `update-resources.ps1`, tap Download.
- [ ] **Step 3: Bench walk (controller):** LV > 999 probe on a shared pre-revamp row (e.g. 20137 at LV ~3,100 with a weak deck: hits
  to kill, damage taken; record clamp or growth in the notice line), 2019-05 (R1 plays, `6xxxx` enemy, 4-digit level display), a
  one-turn window of 199, «Round 400/400», the T10 clear and its title, 2020-01 (copied stage plays, round 10 = stage 1), 2020-10,
  round 4,000 and «Season complete», a 16-bracket Rewards dialog (2020-12), a 2-bracket one (2021-05), a board purchase with a 2021
  card, a Spirit-part cell, Catalog rows / detail page / year tabs / phone frame.
- [ ] **Step 4:** commit + push; final whole-branch review and fix wave; then the tester package of the whole Coliseum plan (user
  27-11 rule: one package at the end).
