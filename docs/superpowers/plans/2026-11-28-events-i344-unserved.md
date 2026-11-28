# I-344 Unserved Worldwide Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** serve the worldwide event quests that still have no record (I-344): 58 groups / ~645 quests of 2018-04..2021, the
census-excluded quest events the user admitted on 28-11, then the 2016-04..10 period and the wiki-only rows, the way I-248 /
I-343 served Genie Jafar and the three 2020 celebrations.

**Architecture:** no new screen and no new server mechanism in Part A. Each group becomes a private event record (records folder
`tmp\events\records`, read by the master regen through `KHUX_EVENT_SRC`) written from data that already exists: the quests
`build_challenge.py` built under a neighbouring census id (`tmp\events\challenge\work\built_all.json`), the donor evStage rows
and the census rows. Run enemy rows go into the private event enemy file. `server/event_config.json` `serve.censusIds` selects
the new records; `server/test-make-events.js` pins them. Parts B-F (below) each get their own plan once the previous part is
benched: they need the pilot builder for other census types, rulings already given, generated maps and special mechanics.

**Tech Stack:** Node (`node server/test-make-events.js`), Python 3 (`python -I`) private scripts in `tmp\events\i344\`,
PowerShell session scripts (`tools\ldplayer\session\`).

**Spec:** the inventory `D:\Progetto_Restauro_KH_UX\tmp\i344\inventory.md` (private, 28-11; groups G01-G62, §3a-§6) and the
I-344 row of `docs/ISSUES.md`. Models of the method: `tmp\events\i248\add_ev1266.py` + `add_jafar_rows.py` (one record),
`tmp\events\i343\add_i343_records.py` + `add_i343_rows.py` (several records, seasonal currency), test `ww_celebrations_i343`.

## User rulings (28-11-2026)

1. 2016-04..10 is part of I-344, as the **last** part.
2. The census-excluded quest events are served: Hades Cup event quests (6 runs), Moon Gem Cups, «[Proud] Defeat Leviathan»,
   the Daily Draw Ticket quest. **Not** the PvP «Darkgnaw Challenge» (waits for PvP, I-120).
3. Reward type 23 (avatar set ♂/♀ pair) is paid as avatar parts.
4. Reruns are entries of their own, as EV-0772.
5. Maps rebuilt from khuxwiki are accepted for events after 2018-04 too (label reconstructed, declared in the Notices).
6. The six JP 4.3.1 enemy models (displayIds 1036, 1571, 1599, 1647, 1648, 1649) are imported and shown rendered for approval.
7. Row 200565 «Map AG1» is dropped (test row); also the 91000xx template rows and the undated EV-1514..1528 rows.
8. The non-event findings (Proud+ quests, Training Stage, tutorials, 2016 keyblade quests, VIP weeks 2020-12..2021-03) go to a
   separate issue.

## Global Constraints

- Original values only: donor stage rows, donor evStage rows, JP 4.3.1 maps. An enemy that is not in any table is **found, never
  substituted** (enemy 1904111521, Hades Cup 2019-04 Round 10/15).
- Every new private script is idempotent: a record or row already present must be equal, else it stops (the add_ev1266 rule). A
  rerun of `build_challenge.py` rewrites the challenge files without these records: the rerun order after it is
  `add_ev1266.py`, `add_i343_records.py`, the I-344 scripts, `patch_surprise.py`, then `patch_seasonal.py` last.
- Records keep the file layout of the target file (EOL and final newline as read), so the diff is the new records only.
- Master regen recipe (unchanged): `KHUX_MEDALS_ALL=1 KHUX_WORLDTOUR=0 KHUX_EVENT_ENEMIES=1
  KHUX_EVENT_SRC=D:/Progetto_Restauro_KH_UX/tmp/events/records KHUX_EVENT_BOARDS=.../boards/board_sets.json
  KHUX_EVENT_DRAMAS=D:/Progetto_Restauro_KH_UX/stage_gen/event_dramas.json KHUX_AVATAR_BOARDS=.../avatar_boards/avatar_boards.json
  node server/make-game-tables.js D:/Progetto_Restauro_KH_UX/wiki/medals.json`; a dry regen on copies first, then the live one
  with a new master revision in the session scripts (`cycle.ps1`, `relogin.ps1`, `run-server.ps1`, `update-resources.ps1`).
- After any records change: `tmp\event_bgm\scripts\make_event_bgm.py` (music overlay), `import_event_stages.py --stage-dir D:/Progetto_Restauro_KH_UX/stage_gen/files/stage` (without --stage-dir the maps stay out of the resources and the client crashes on the event card) for maps not yet
  imported, `make_event_banners.py --fetch --ids <new evStage ids>` before the cards are built, then
  `build-resources.ps1 -Append` (never `-Quick` on an incremental version).
- Public wording: no «AI»; reconstructed things are «rebuilt» (Notices). No private source names or paths in public docs beyond
  what the events notes already cite.

## Review Focus

- A BOARD census id with quests (EV-1084, EV-1349, EV-1463, EV-1473) must be listed as an event card and be keepable from the Event
  Catalog: `boardOnly` (routes-events.js:196, event-pages.js:104) is false only while the entry has quests. Test it.
- A one-quest daily row (EV-1349 / EV-1463 «Daily Event: Avatar Coins») must open for the whole original window, not one weekday
  (event-calendar.js «daily event» rule): assert its quest has no `days`.
- EV-1091 is also the census id of the KHIII Pop Quiz (Part E) and of the Hades Cup 2020-04 quests (Part F): the Part A record
  holds only row 201223; later parts append rows to the same record, never a second EV-1091 record.
- The seasonal currency patch must not touch the new records unless their notice names a seasonal currency (rerun
  `patch_seasonal.py` and diff: expected 0 changes on Part A records).
- The four events already served under the same row by another census id (`rowsMoved` duplicates: row 203094 under EV-1350 /
  1352 / 1354, row 208960 under EV-1464 / 1465, row 201931 under EV-1150 / 1155 / 1158) must be served once: the stage ids of a
  new record must not already be in `events.json`.

---

## Part A: records from quests already built (this plan, detailed)

| G | New record | Built under | Donor row | Stage ids | Run rows to add | Target file |
|---|---|---|---|---|---|---|
| G45 | EV-1084 «Returning Org. XIII Avatar Parts Event» (BOARD, notice 64156) | EV-1080 | 201210 | 742140..742153 (14) | 0 | challenge_2020.json |
| G47a | EV-1091 «4th Anniversary Event & Campaign» (CELEB, 64990), Event & Trait Medals | EV-1089 | 201223 | 742240 | Ringmaster (d97) | challenge_2020.json |
| G47b | EV-1154 «Stitch Screen Debut Celebration» (CELEB, 66106), Event & Trait Medals (June 2020) | EV-1150 | 201931 | 742720 | 0 | challenge_2020.json |
| G43e | EV-1180 «Stitch Screen Debut Celebration» (CELEB, 66624) | EV-1181 | 201950 | 742840..742844 (5) | the 2 missing per quest | challenge_2020.json |
| G52a | EV-1349 «Daily Avatar Coin Event» (BOARD, 71256) | EV-1350 | 203094 | 743680 | 0 | challenge_2020.json |
| G54 | EV-1418 «Defeat the White Mushroom» (CELEB, 72710) | EV-1417 | 208974 | 743980..743984 (5) | 0 | challenge_2021.json |
| G52b | EV-1463 «Daily Avatar Coin Event» (BOARD, 73874) | EV-1464 | 208960 | 744210 | 0 | challenge_2021.json |
| G55a | EV-1473 «Get Avatar Parts» (BOARD, 73880) | EV-1474 | 208958 | 744220..744223 (4) | Colorful Copter Fleet (d257) | challenge_2021.json |

33 quests. Census names, dates and notices come from the census row; insert each record right after the record it was built under
when that record is in the file (EV-1080, EV-1089, EV-1150, EV-1350, EV-1417, EV-1464), else in census-id order.

### Task A1: run enemy rows

**Files:**
- Create: `D:\Progetto_Restauro_KH_UX\tmp\events\i344\add_i344a_rows.py` (private)
- Modify (by the script): `D:\Progetto_Restauro_KH_UX\private\events\enemies\event_enemies.json`

**Interfaces:**
- Produces: every enemy id named by the Part A quests (non-`uncounted` `enemies[].id`, `targets[].id`) present in the master or in
  the private event enemy file with `approved: true`, `model: 'served'`; `quests` labels `'<census> <quest name> (<stageId>)'`,
  `part: 'seriesRunRow'`.

- [ ] **Step 1:** write the script on the `add_jafar_rows.py` pattern (copy `clean()` / model check, attacks from the donated
  enemyAttack table, equality check on rows already present). The ids to add are computed, not listed: the enemy ids of the
  stage ids of the Part A table (read from `built_all.json`) that are neither in `server/master_data` enemy rows nor in the
  private file. Assert the computed set is non-empty for G47a, G43e, G55a and empty for the others; assert each model is drawn.
- [ ] **Step 2:** run it on a scratch copy: `python -I add_i344a_rows.py D:/Progetto_Restauro_KH_UX/tmp/i344/scratch/event_enemies.json`.
  Expected: «added» lines for Ringmaster (d97), the G43e rows, Colorful Copter Fleet (d257); a second run prints «already present,
  equal» for each.
- [ ] **Step 3:** run it on the live private file; keep the scratch diff in `tmp\i344\a1_rows.txt`.

### Task A2: the eight records

**Files:**
- Create: `D:\Progetto_Restauro_KH_UX\tmp\events\i344\add_i344a_records.py` (private)
- Modify (by the script): `tmp\events\records\challenge_2020.json`, `challenge_2021.json`

**Interfaces:**
- Consumes: Task A1 rows (the script asserts every `eventEnemyRows` id is in the private file).
- Produces: records `{censusId, name, start, end, type, notices, evStage: [donor row], quests, builtBy}` for the eight census ids.

- [ ] **Step 1:** write the script on the `add_i343_records.py` pattern with one table row per record (census id, built-under id,
  donor row, expected stage ids, target file). Per quest apply the builder's later steps as there: `drama.inResources` /
  `jpCopies` = {}, `wikiEnemies` from `wikiEnemiesHint`, WW check kept from the builder when `confirmed`/`agree`, else stop and
  print the quest (a conflict is a ruling for the user, not a guess), `rewardTypes` (`all_rewards`), `eventEnemyRows` = the run
  rows of the quest, `label` `original` when no enemy is missing. Assert the built-under record moves the row to the new id
  (`rowsMoved[].to`) when it has `rowsMoved`; assert no stage id is already served in `server/game_data/events.json`.
- [ ] **Step 2:** run on a scratch copy of the records folder: `python -I add_i344a_records.py D:/Progetto_Restauro_KH_UX/tmp/i344/scratch/records`.
  Expected: «added» for the eight ids, 33 quests; second run «already present, equal» x8.
- [ ] **Step 3:** rerun `patch_seasonal.py` on the scratch copy. Expected: 0 objectives changed on the eight records (no seasonal
  currency in their notices); if one changes, stop and report.

### Task A3: serve selection and test

**Files:**
- Modify: `server/event_config.json` (`serve.censusIds` + the `censusIdsNote` sentence for I-344 Part A)
- Test: `server/test-make-events.js` (new case `i344_part_a`)

- [ ] **Step 1: Write the failing test** `i344_part_a`, on the `ww_celebrations_i343` pattern, with synthetic records:
  - an EV-1084-like BOARD record with two quests is built (`entry.available`, every quest `served`, `label` 'original') with
    `serve: REAL_CONFIG.serve`, and another BOARD id not listed is `skipped` with reason `notSelected`;
  - an EV-1349-like daily record (one quest, row window 7 days) is built with no `days` on entry or quest;
  - an EV-1091-like record with one quest of row 201223 builds one entry whose `rows` hold only that row.
- [ ] **Step 2:** `node server/test-make-events.js` → FAIL on `i344_part_a` (ids not in `serve.censusIds`).
- [ ] **Step 3:** add EV-1084, EV-1091, EV-1154, EV-1180, EV-1349, EV-1418, EV-1463, EV-1473 to `serve.censusIds` and one sentence
  to `censusIdsNote` (rows, notices, scripts).
- [ ] **Step 4:** `node server/test-make-events.js` → all PASS.
- [ ] **Step 5:** commit `I-344 Part A: serve eight WW event records built from existing quests`.

### Task A4: dry regen, live regen, assets

- [ ] **Step 1:** dry regen on copies with the scratch records + scratch enemy file. Expected: +33 stage rows, +8 evStage rows (ids
  after the last used, 23094 at I-343), enemy rows = Task A1 count, no other row or entry changed; events.json 4,322 of 4,322
  quests served (4,289 + 33). Write the counts into `docs/notes/events.md` (new section «I-344 Part A»).
- [ ] **Step 2:** apply A1 / A2 live; `make_event_bgm.py` (expected +33 stages with music, none inferred), `import_event_stages.py`
  for the maps not yet imported (report the count), `make_event_banners.py --fetch --ids <new evStage ids>` then the cards.
- [ ] **Step 3:** live regen with master revision 408 in the four session scripts; `build-resources.ps1 -Append` (resources 204);
  `update-resources.ps1` (tap Download).
- [ ] **Step 4:** commit `I-344 Part A: master 408, resources 204` (session scripts, notes, ISSUES progress line).

### Task A5: bench

- [ ] **Step 1:** save copy of maxpower keeping EV-1473 (BOARD with quests) from the Event Catalog; relogin with `-RealNow` inside
  the run's weekday rules. Expected: KEPT EVENT card, quest 744220 «Terra Doll» starts, Colorful Copter Fleet drawn, objectives
  paid.
- [ ] **Step 2:** same for EV-1349 (daily Avatar Coins) and EV-1418 (one quest each). Screenshots `i344a_*`.
- [ ] **Step 3:** ISSUES I-344 progress line, HANDOFF block, commit and push.

---

## Parts B-F (one plan each, written when the previous part is benched)

- **Part B: pilot builder for census types outside EQ / KEY / QUIZ** (`build.py --ids` into a new private file
  `celeb_2018_21.json`, scratch first, rerun recipe after build_challenge.py). B1 plain lists (G01, G05, G06, G07, G08, G12, G13,
  G14, G18, G19, G20, G23, G24, G25, G26, G27, G28, G39, G43 rest, G53); B2 one-quest-a-day countdowns with subRows, the EV-1414
  code path (G09, G15, G33, G44); B3 day-row rotations (G34, G35, G21 cumulative); B4 the quest rows beside served HSC notices with
  sibling census ids (G40, G40c; precedent EV-0988b); B5 reruns as own entries (G48, G11; ruling 4). About 110 donor run rows in
  one `add_*_rows.py`, khuxwiki check, music, cards.
- **Part C: assets and the type 23 alias.** Import the six JP models (ruling 6) and show the assembled renders in their animations
  before serving G11, G50, G55b, G56; pay reward type 23 as the avatar parts of the pair (ruling 3; G41, G42); find the khuxwiki
  names of the `sEnm_2005` / `sEnm_2006` rows (G51).
- **Part D: maps rebuilt from khuxwiki** (Part 10b method, label reconstructed, Notices line; ruling 5): G04, G16, G17, G22, G29,
  G30, G31, G36, G37, G38, G10 2019-07.
- **Part E: special mechanics.** G46 KHIII Pop Quiz boards (`quizDramas`), G32 / G49 Damage Contest and High Score runs
  (`build_hsc.py`, calibrated thresholds, reconstructed), the EV-0042 Jungle Book short windows (`timeWindows`).
- **Part F: the census-excluded events** (ruling 2): G10 Hades Cup event quests, 6 runs (find enemy 1904111521 first), G03 Moon
  Gem Cups, G57 «[Proud] Defeat Leviathan», G58 Daily Draw Ticket; census additions; G02 Darkgnaw waits for PvP.
- **Part G: 2016-04..10 and the wiki-only rows** (ruling 1, last): the 5 exact groups first (EV-0002, 0009, 0018, 0033 / 0044),
  then the generated-map groups, EV-0178 1st Anniversary and the October 2016 events; check the BOARD rows with khuxwiki quests
  (EV-0126, 0962, 0839 / 0840, 0707, 0096, 0149) against the month's events before building.
- **Drops** (ruling 7): row 200565, the 91000xx template rows, EV-1514..1528: a `reasonText` line each in event_config.json so
  the Event Catalog does not list them as «Not built yet».
- **Separate issue** (ruling 8): open it in ISSUES with §6 of the inventory.

---

## Part B: pilot builder for census types outside EQ / KEY / QUIZ (detailed, 28-11-2026)

Draft researched on 28-11 (private evidence `tmp\i344\partb\`: scratch build, analyze1.txt, rows_per_record.txt). R5 was checked
quest by quest (private `tmp\i344
5\R5_FINDINGS.md`).

### Part B rulings (user, 28-11-2026)

- **R1:** yes. The «Find the Target» rerun row 201936 is served in EV-1161 on EV-0576's stages (`sharedWith`, as EV-0772).
- **R2 (a):** G21 shows one card per Shop week: the latest day row, listing every quest unlocked so far (Task B5).
- **R3:** three new Event Catalog chips (Task B6): MISSION «Monthly Missions», RANK «Damage Contests», CAMP-LOGIN «Campaign Quests».
- **R4:** sibling ids EV-1040b, 1068b, 1101b, 1139b, 1222b, with the names and types of the R4 list below. Never type HSC.
- **R6:** rulings A1 / A2 of 23-11 apply to the new records.
- **R5, verified:**
  - 725440 Agrabah Mission #2 (2020-06): served with the existing `mapEnemySwaps` Bag O' Coal -> Bag O' Jewels (same map file as
    the served 2018 / 2019 runs). The driver clears the builder's hold.
  - 739912 Sweet Valentine 3/7: served with the donor objective «Defeat Chocolate Gargoyle x 15». The JP map has 15; the khuxwiki
    objective is copied from 2/7. This is the I-251 one-run donor rule.
  - 732160 Incredibles 2 Challenge 6/10: served on the JP map as it is (Armored Knight x2). The khuxwiki «Armored Archer» line
    contradicts the page's own enemy list. The user OK overrules it.
  - 714790 Find the Keyblade Wielders #9 and 742104 Clarice Screen Debut 5/5 (2020): **served as the JP map** (user, 28-11, after
    the check in private `tmp\i3445\R5_VERIFY_EXTRA.md`). The extra team is in the original file: one copy, no revision, no
    reconstruction, counts agree. It is a normal team: Great Pretender 1002 (in our master) / Pretender 2003001001 (run row, Task
    B4). khuxwiki likely missed a chance squad, and no source settles it. The driver drops the builder's «(no WW enemy)» hold marker
    and keeps the map counts.
    - Objectives checked: #9 «Open all treasure chests», «Equip the %s Keyblade», «Complete without having to continue»; Clarice 5/5
      «Open 3 treasure chests», «Complete without having to continue» x2. None counts enemies, so the extra team never blocks
      them.
    - No map edit: Task B5b is dropped.
  - Enemy rows still to add (in Task B4, never substituted): Chocolate Gargoyle 190210083 (also for 6/7), and the Clarice 2020
    Pretender 2003001001 / Shadow 2003500001. All three are in the donor master.

### Task B0 result (28-11-2026)

Script: private `tmp\i344\partbudit_rows_b0.py`; output: `b0_rows2.txt`. Test: a row is served when a served events.json row
or quest names it, or a served record holds it in `evStage`. Six rows pass the old «stage served» test but fail this one:

| Row | Window | What it is | Decision |
|---|---|---|---|
| 201936 | 2020-06-06..22 | «Find the Target» rerun (EV-1161) | Part B, ruling R1 |
| 201225 | 2020-04-10..30 | «Dark-Winged Warrior - 1..12/12», FINAL FANTASY VII REMAKE Release Campaign EV-1093 (COLLAB, not served at all); rerun of EV-0565's quests | add to Part B5 (rerun = own entry, ruling 4) |
| 200817 | 2019-09-23..30 | «Swiftstrike Time Trial», EV-0933 Speedrun Ranking Event; the stage is EV-0931's | Part E (ranking) |
| 209002 | 2019-09-05..10-02 | «No Continues: Chasm of Challenges #1», second window of #1; EV-1300 holds the other rows | check in Part B (add the row to EV-1300 if its window is original) |
| 200808 | 2019-09-03..19 | The Keyblade War Pt. 1 scenario (EV-0913, «second notice»); its stages are served by EV-0929 | no gap (same event, served once) |
| 200615 | 2018-10-15..17 | «A Massive Menace / Fetching the Dwarfs», no notice, no census row | Part F (census addition, with G11's 200616) |

### Task B5b: dropped (28-11: R5 #9 and Clarice 5/5 are served as the JP map, no map edit)

**Goal:** serve the 40 Part B records (35 census ids + 5 sibling ids), 87 donor evStage rows and 329 quests of inventory §3b:
B1 plain lists, B2 one-quest-a-day countdowns, B3 day-row rotations (G21 cumulative), B4 HSC side rows (sibling ids), B5 the
G48 reruns. G11 waits for Part C.

**Architecture:** one builder, not a fork. `build_challenge.py` gets three env hooks (default behaviour unchanged, proven by a
zero-drift rerun). A private driver `tmp\events\i344\build_i344b.py` runs it by census id into a work folder, then applies the
Part B rules: a hand row table, sibling ids, rulings A1 / A2, record types, the `cumulativeRows` flag. It writes ONE new record
file `tmp\events\records\celeb_2018_21.json`. The challenge files are not touched. One make-events.js rule (`cumulativeRows`)
and one calendar rule are needed, for G21 only.

**Evidence (scratch run, 28-11, read-only):** `tmp\i344\partb\scratch_build_partb.py` is a copy of build_challenge.py with the
three changes below hard-wired, writing only to `tmp\i344\partb\scratch1`. It ran in 11 s: 40 records, 335 quests (329 without
the HSC rows), 8 board-set lines. The per-record survey is in `analyze1.txt` (script `analyze.py`) and `rows_per_record.txt`.

## Findings that change the inventory

1. **G48 has 35 quests, not 25.** Notice 66111 has four donor rows: 201935 Lady Luck (10), **201936 «Find the Target Pt. 1-9» +
   «Defeat an Iron Giant» (10)**, 201937 Agrabah / Daybreak (10) and 201938 Captain / Ferry Reaper (5). The audit counted 201936
   as served because its donor stages 723110..723200 are the stages of EV-0576 (the audit test is «a stage is served», not «the row
   is served»). The same blind spot can hide other rerun rows: see Task B0.
2. **15 «no khuxwiki page» quests have pages under other titles.** EV-1099 «Huey, Dewey & Louie Screen Debut Celebration - n/5»,
   EV-1226 «Alice Screen Debut Event - n/5», EV-1241 «Bambi Screen Debut Event - n/5». The donor names differ, so the run rules
   never matched. A page pin fixes them. A rough check gives 12 equal, 3 to confirm with the builder's parser (742333, 743121,
   743122).
3. **The census types of Part B are RANK, SPEC, COLLAB, CAMP-LOGIN, STORY, CELEB, BOARD, MISSION and HSC.** RANK, MISSION and
   CAMP-LOGIN have no Event Catalog TYPE chip (event-pages.js TYPE_OPTS shows the bare code), and SPEC shows «Daily Presents»
   (EV-0505 is Critical Quests). Ruling R3.
4. **Boosters not built:** the 30 «Get Yourself a Booster» Boosters 2004011..2004040 (EV-1101b: all 10 quests boosterOnly) and the
   Incredibles 2 Boosters 1808007..1808009 (EV-0532: 3 quests boosterLater). The donor emblem rows exist
   (`private\donations\relux_2026-11\verified\emblem_boosters.json`). `build_boosters.py` takes them in once the records exist
   (scope «records ... served or held boosterOnly»), so this needs a second regen pass.
5. **Builder holds that stay held** (as in the served records, 65 heldBack today): 732160 (EV-0532 Incredibles 2 Challenge 6/10:
   khuxwiki Armored Archer x2, JP map Armored Knight), 714790 (EV-0600 Find the Keyblade Wielders #9: Great Pretender count),
   742104 (EV-1069 Clarice 5/5: JP Pretender not in the WW sources), 725440 (EV-1161 Agrabah Mission #2: Bag O' Jewels vs Bag O'
   Coal; EV-0576 holds the same quest too), 739912 (EV-0712 Sweet Valentine 3/7: objectiveMismatch). Ruling R5.
6. **24 of the 25 G48 rerun quests** have only the khuxwiki page of another run, and it agrees with the map: ruling A1 (23-11),
   as Part A. Agrabah Mission #2 differs and stays held.
7. **No other record holds a Part B row** (scan of `evStage`, `rowsMoved` and `rowsUnclear` over every record file: none). The
   exception is `challenge/work/built_all.json`, where EV-1109 held 201230 before its round-2 rebuild. The HSC rows 262..267 are in
   hsc.json. If the builder is selected by id, it keeps them on the HSC census ids, so the driver must drop them (row table).
8. **B2 and B3 (G34 / G35) need no code.** EV-1414 already serves 24 h one-quest rows: one card per donor row (allocateRows /
   subRows), no `days` (24 h is above shortWindowHours 12), and the 06-11 daily rule lists every card of the Shop week. G21 needs
   code: the 14 day rows list the stages cumulatively (2, 4, ... 26, then 28). After dedup («one quest per stage»), each quest
   sits only on its first row. The last row (03-14..03-31) would then list just its own 2 quests, and the Shop weeks after
   03-14 would show 2 of the 28.

## Part B table (from the scratch run; HSC rows removed)

| Sub | G | Record (type now) | Donor rows | Q | Run rows | Notes |
|---|---|---|---|---|---|---|
| B1 | G01 | EV-0460 (RANK) | 200453 | 9 | 0 | |
| B1 | G05 | EV-0505 (SPEC) | 200492 | 3 | 0 | |
| B1 | G06 | EV-0517 (COLLAB) | 200575 | 5 | 0 | |
| B1 | G07 | EV-0530 (CAMP-LOGIN) | 200598 | 1 | 0 | |
| B1 | G08 | EV-0532 (COLLAB) | 200594 | 10 | 0 | 732160 held; 3 boosterLater |
| B1 | G12 | EV-0600 (STORY) | 200652 | 10 | 2 | 714790 held |
| B1 | G13 | EV-0634 (CELEB) | 200668 | 10 | 7 | |
| B1 | G14 | EV-0652 (CELEB) | 200681 | 15 | 6 | |
| B1 | G18 | EV-0695 (CELEB) | 200702 | 1 | 0 | |
| B1 | G19 | EV-0712 (CELEB) | 200706 | 7 | 4 | feeder of set 2019-02; 739912 objectiveMismatch |
| B1 | G20 | EV-0715 (CELEB) | 200708 | 7 | 0 | feeder of set 2019-02 |
| B1 | G23 | EV-0751 (BOARD) | 200735 | 5 | 0 | |
| B1 | G24 | EV-0756 / EV-0792 (MISSION) | 209963 / 209962 | 5 + 5 | 2 | two records |
| B1 | G25 | EV-0786 (BOARD) | 200759 | 1 | 2 | linked to 2019-04, no coins |
| B1 | G26 | EV-0815 (CELEB) | 200767 | 5 | 0 | |
| B1 | G27 | EV-0834 (CELEB) | 200774 | 5 | 1 | feeder of set 2019-06 |
| B1 | G28 | EV-0849 (CELEB) | 200779 | 6 | 0 | feeder of set 2019-06 |
| B1 | G39 | EV-1021 (MISSION) | 200886 | 10 | 12 | |
| B1 | G43 | EV-1069 / 1072 / 1099 / 1182 / 1226 / 1241 (CELEB) | 200918 / 200920 / 201228 / 201952 / 202645 / 202652 | 30 | 18 | EV-1085 Chip & Dale is in the G44 record; 15 page pins; EV-1182 without HSC row 266 (Part E, G49 appends it to the same record); 742104 held |
| B1 | G53 | EV-1357 (CELEB) | 203092 | 5 | 10 | type 41 x5; window 11-19..12-03 is outside every seasonal Deal: plain Draw Tickets |
| B2 | G09 | EV-0557 (CELEB) | 200620..200622 | 3 | 3 | 3 one-day rows |
| B2 | G15 | EV-0661 (CELEB) | 200674..200678 | 5 | 0 | 5 one-day rows |
| B2 | G33 | EV-0901 (CELEB) | 200799..200803 | 5 | 0 | 5 one-day rows |
| B2 | G44 + G43 | EV-1085 (CELEB) | 201212 (Chip & Dale, 12 days) + 201213..201217 (countdown) | 10 | 0 | one record, 6 cards |
| B2 | G44 | EV-1253 (CELEB) | 202660..202664 | 5 | 0 | 5 one-day rows |
| B3 | G34 | EV-0949 (CELEB) | 200821..200827 | 21 | 7 | 7 day rows x 3; linked to 2019-10, no coins |
| B3 | G35 | EV-0966 (CELEB) | 200838..200844 | 21 | 0 | raid row 10258 moved (RAID) |
| B3 | G21 | EV-0728 (BOARD) | 200713..200726 | 28 | 1 | cumulative (210 row refs -> 28 quests); type 19 = alias 20, ids in avatarParts |
| B4 | G40 | EV-1040b «Speed Gem Drop Event» | 200902 | 4 | 0 | rerun of EV-0988b / EV-1131 quests (rowShare) |
| B4 | G40 | EV-1068b «March's Big Bonus Challenge» | 200917 | 7 | 7 | Nimble Reaper |
| B4 | G40c | EV-1101b «Keyblade Wielder Appreciation Event» | 201230 | 10 | 0 | boosterOnly until the Boosters are built |
| B4 | G40 | EV-1139b «Magic Gem Drop Event! (5/22)» | 201589 | 4 | 0 | rerun of EV-1031 quests (rowShare) |
| B4 | G40 | EV-1222b «Keyblade Challenge (7/24)» | 202308 | 16 | 21 | |
| B5 | G48 | EV-1161 (CAMP-LOGIN) | 201935, 201936, 201937, 201938 | 35 | 10 | 201936 shares EV-0576's stages (sharedWith); 201937 / 201938 share its maps (rowShare); A1 x24; 725440 held |

Total: 40 records, 87 rows (evStage 23103..23189 at most; Part A ended at 23102), 329 quests, 112 run rows (dedup over records,
every model drawn or approved: MISSING.md «model drawn» 78 lines, «new model approved» 35, none missing). Expected served on the
first pass: 329 − 5 held − 10 boosterOnly − (0..3 page-pin quests that differ) = 311..314; after the Booster pass +10.

## Rulings (asked 28-11; the user answers are in «Part B rulings» above)

- **R1 (G48, finding 1):** the 2020-06 «Find the Target» rerun row 201936 is served in EV-1161 like the other two returning
  scenario rows (ruling 4). Its quests have EV-0576's own donor stages. They are served through EV-0576's stage rows
  (`sharedWith`, as EV-0772), so a quest cleared in one run shows as cleared in the other, and its objectives are paid once.
- **R2 (G21, finding 8):** how the cumulative Org. XIII dailies show in the Shop-week model. **Recommended (a):** one card per
  Shop week, the latest day row of the week, listing every quest unlocked up to that day (the original card of that day; the
  week shows its last day, as countdowns show the whole week). (b) One card per day row with its cumulative list: the same quest
  then repeats on up to 7 cards in one week. (c) No code: each card lists only its 2 new quests, and after 03-14 the week shows 2
  of 28 (not faithful).
- **R3 (finding 3):** record types. **Recommended:** keep the census type, and add three Event Catalog chips in
  event-pages.js TYPE_OPTS: MISSION «Monthly Missions», RANK «Damage Contests», CAMP-LOGIN «Campaign Quests». Alternative, data
  only: give each record the type of the served series of the same quests (MISSION -> GEM as EV-0825..0886, RANK / CAMP-LOGIN ->
  EQ, SPEC EV-0505 -> EQ).
- **R4 (B4):** sibling ids and names, on the EV-0988b precedent (`splitFrom`). The name is the notice's half for that row:
  EV-1040b «Speed Gem Drop Event» (GEM), EV-1068b «March's Big Bonus Challenge» (EQ), EV-1101b «Keyblade Wielder Appreciation
  Event» (KEY, as EV-1173 / EV-1217), EV-1139b «Magic Gem Drop Event! (5/22)» (GEM), EV-1222b «Keyblade Challenge (7/24)» (KEY,
  as EV-1086). Never type HSC (isHsc would make them High Score rows).
- **R5 (finding 5):** the 5 builder holds stay «not served yet», the way the served records hold them. Or the user rules on each
  one (725440 is also held in EV-0576 but served in the pilot EV-0772: say whether the A1-like treatment should extend to «differ
  (other run)»).
- **R6 (finding 6):** confirm that rulings A1 / A2 of 23-11 apply to new records (Part A did so for A1).

---

### Task B0: re-audit by donor row (finding 1)

**Files:** Create `tmp\i344\partb\audit_rows_b0.py` (read-only).
- [ ] **Step 1:** for every non-raid ReLux row, count it as served only when an `events.json` row has `donorEvStageId` = the row, or
  a quest has `donorRow` = the row, or the row is in a record's `rowsMoved` / `evStage`. List the rows that `audit_rows.json`
  calls served but this test does not.
  Expected: 201936, plus any other rerun row (each one goes into this Part or a later Part's table; report the list to the user
  with R1).

### Task B1: env hooks in build_challenge.py (default unchanged)

**Files:** Modify `tmp\events\challenge\build_challenge.py` (private; backup `.bak_i344b`).

**Interfaces:**
- `KHUX_CHALLENGE_IDS=<ids>`: SEL becomes `['--ids', ids]` (no `--from` / `--types` / `--skip-in`).
- `KHUX_CHALLENGE_SKIP_ALL=1`: `SKIP_IN` (other_rows, USED_BY) is every record file except `event_anchors.json` and the output
  file of the driver.
- `KHUX_CHALLENGE_OUT` (exists): with the two hooks, it is required (the hooks never write the live folders).
- [ ] **Step 1:** add the three lines (the hard-wired versions are lines 61 / 65 / 250 of `tmp\i344\partb\scratch_build_partb.py`)
  plus a header paragraph «I-344 Part B».
- [ ] **Step 2:** zero-drift check, hooks off: `KHUX_CHALLENGE_OUT=D:/Progetto_Restauro_KH_UX/tmp/i344/partb/drift python -I
  build_challenge.py`, then compare `drift/records/challenge_20xx.json` with the scratch rerun of the same file BEFORE the edit
  (run it first into `drift0`). Expected: byte-identical. The live records differ from both by the post-builder scripts
  (add_ev1266, add_i343, add_i344a, patch_surprise, patch_seasonal, round 2), which is why the comparison is with drift0, not
  with the live files.

### Task B2: page pins for the three 2020 Screen Debut series (finding 2)

**Files:** Modify `tmp\events_p1\pilot\work\build.py` (P4_PAGE_PIN, backup `.bak_i344b`).
- [ ] **Step 1:** add the loops on the 720470 / EV-0423 pattern, with the evidence (the series name and `nadesc` of each page):
  742330 + k -> «Huey, Dewey & Louie Screen Debut Celebration - (k+1)/5»; 743120 + k -> «Alice Screen Debut Event - (k+1)/5»;
  743210 + k -> «Bambi Screen Debut Event - (k+1)/5».
- [ ] **Step 2:** rerun Task B1 Step 2 (hooks off). Expected: still byte-identical (these stages are not in the EQ / KEY / QUIZ
  selection).
- [ ] **Step 3:** scratch Part B run. Expected: the 15 quests have wwCheck `agree`. A quest that differs stays held: report it.

### Task B3: driver build_i344b.py

**Files:** Create `tmp\events\i344\build_i344b.py`, `tmp\events\i344\i344b_table.py` (private). Writes
`tmp\events\records\celeb_2018_21.json`, `tmp\events\i344\partb_work\` (builder outputs), and `board_sets.json` lines (feeders).

**Interfaces:**
- `TABLE`: `(recordId, censusId, name|None, type|None, rows [donor ids], expectedStages [..], flags)`, one entry per Part B
  table line. Sibling entries carry `splitFrom` and the R4 name and type.
- Produces records `{censusId, name, start, end, type, notices, evStage, quests, builtBy, [splitFrom], [cumulativeRows],
  [rowsMoved]}`.
- [ ] **Step 1:** run build_challenge.py with `KHUX_CHALLENGE_IDS=<the 40 census ids> KHUX_CHALLENGE_SKIP_ALL=1
  KHUX_CHALLENGE_OUT=D:/Progetto_Restauro_KH_UX/tmp/events/i344/partb_work`, and read the year files of `partb_work/records`.
- [ ] **Step 2:** for each TABLE entry:
  - keep exactly the listed rows. Every other row goes to `rowsMoved` `{to, why}`: 262..267 -> the HSC record (hsc.json), 266 ->
    «EV-1182 (Part E, G49)», raid rows as the builder moved them;
  - assert the kept quests' stage ids = expectedStages;
  - assert no kept row is a `donorEvStageId` or quest `donorRow` in `server/game_data/events.json` (the row test, not the stage
    test: rerun stages are allowed, as EV-0772).
- [ ] **Step 3:** rulings per quest:
  - A1 when `enemyAgreement == 'agree (other run)'` and the marker row is present (patch_ww_ruling.patch_quest);
  - A2 when `'no khuxwiki page'` and the JP map ids are among the donor row ids;
  - anything else held stays as built;
  - EV-0728 gets `cumulativeRows` with its evidence (the 14 donor ranges 739980..739981+2k).
- [ ] **Step 4:** write `celeb_2018_21.json` (indent 1, `\n`, records in census order). Idempotent: an equal record prints «already
  present, equal», a different one stops. Apply the builder's feeder lines to `tmp\events\boards\board_sets.json` (censusRecords
  -> celeb_2018_21.json for EV-0712 / 0715 / 0834 / 0849; their censusIds are already members), idempotently.
- [ ] **Step 5:** scratch run `python -I build_i344b.py D:/Progetto_Restauro_KH_UX/tmp/i344/partb/scratch_recs`. Expected: «added»
  x40, 329 quests, 87 rows. Second run «already present, equal» x40. `analyze.py` on it: held = the 5 of R5 (+ the
  boosterOnly 10), no `noWiki` left.

### Task B4: run enemy rows

**Files:** Create `tmp\events\i344\add_i344b_rows.py` on the `add_i344a_rows.py` pattern. Modify (by the script)
`private\events\enemies\event_enemies.json`.
- [ ] **Step 1:** ids = counted enemy / target ids of the kept quests that are neither in `server/master_data/enemy.json` nor in
  the private file. Expected: 112 ids. Assert each donor row exists and each model is drawn.
- [ ] **Step 2:** scratch copy first (`tmp\i344\partb\event_enemies.json`). Expected: «added» x112; second run «already present,
  equal» x112. Then the live file (backup `tmp\i344\partb\event_enemies.before_b4.json`).
- [ ] **Step 3:** the driver (Task B3) fills `eventEnemyRows` after this. Run it live (backup `tmp\i344\partb\backup_b3`).

### Task B5: make-events.js `cumulativeRows` (G21, ruling R2 (a)) — TDD

**Files:** Modify `server/make-events.js`, `server/event-calendar.js`, `server/routes-events.js` (keptCards). Test
`server/test-make-events.js`, `server/test-event-calendar.js`, `server/test-event-routes.js`.

**Interfaces:** record `cumulativeRows: '<evidence>'` -> entry `cumulativeRows: true`. A quest is on every row that lists it
(`donorRow` or `alsoInRows`). Calendar: of the rows of such an entry that overlap the Shop week, only the last one is listed
(its quests include those of the earlier rows). Kept: only the last built row.

- [ ] **Step 1: failing tests.**
  - `cumulative_rows_list_earlier_quests` (test-make-events.js): one record with three 24 h donor rows A (stages s1, s2), B (s1..s4)
    and C (s1..s6, 10 days). Quests deduped as the builder writes them (s1 / s2 on A with `alsoInRows` [B, C], ...) and
    `cumulativeRows` set. Assert: `e.cumulativeRows === true`; `e.rows.map(r => r.stageIds.length)` = [2, 4, 6]; the stage rows are
    6 (not 12); `out.evStage` has 3 rows, C with `stageStartId` = s1's stage and `stageEndId` = s6's stage.
  - `alsoInRows_without_flag_unchanged` (test-make-events.js): the same record without the flag gives [2, 2, 2], as today (the
    challenge records with `alsoInRows` on long rows do not change).
  - `cumulative_one_card_per_week` (test-event-calendar.js): an entry with `cumulativeRows` and rows A (day 1, 2 quests), B (day 2,
    4 quests), C (days 3-12, 6 quests). Shop week = days 1-2: `currentCards(...).length === 1`, the card is B with 4 quests. Shop
    week = days 1-7: one card, C with 6 quests. Shop week = day 1 only: one card, A with 2 quests. The same entry without the flag:
    3 cards (today's rule).
  - `kept_cumulative_last_row` (test-event-routes.js): a kept `cumulativeRows` entry gives one card with all 6 quests.
- [ ] **Step 2:** `node server/test-make-events.js` and `node server/test-event-calendar.js` -> FAIL on the new tests only.
- [ ] **Step 3:** code:
  - make-events.js `inGroup`: `|| (rec.cumulativeRows && ((srcOf.get(x) || {}).alsoInRows || []).includes(m.eventStageId))`;
    `entry.cumulativeRows = true` when the record has it (line ~1634);
  - event-calendar.js `currentCards`: for `e.cumulativeRows`, push only the last overlapping row that has open quests;
  - routes-events.js `keptCards`: for `e.cumulativeRows`, `builtRows(e).slice(-1)`.
  Header comments: one line each.
- [ ] **Step 4:** the three files -> all PASS; full suite (`for f in server/test-*.js`) passes.
- [ ] **Step 5:** commit `I-344 Part B: cumulative day rows (make-events cumulativeRows, one card per week)`.

(With ruling R2 (b): only the make-events part and its two tests. With (c): no code, the driver sets no flag.)

### Task B6: Event Catalog chips (ruling R3 recommended) — TDD

**Files:** Modify `server/event-pages.js` TYPE_OPTS. Test `server/test-event-pages.js`.
- [ ] **Step 1:** failing test `type_chips_part_b`: an index with entries of types MISSION, RANK, CAMP-LOGIN renders the chips
  «Monthly Missions», «Damage Contests», «Campaign Quests» (not the bare codes).
- [ ] **Step 2:** FAIL; **Step 3:** add the three rows; **Step 4:** PASS; commit with Task B7.
(With the data-only alternative of R3, the driver's TABLE sets `type` and this task is dropped.)

### Task B7: serve selection and test

**Files:** Modify `server/event_config.json` (`serve.censusIds` + a `censusIdsNote` sentence «I-344 Part B»). Test
`server/test-make-events.js` (new case `i344_part_b`).
- [ ] **Step 1: failing test** `i344_part_b`, with synthetic records on the `i344_part_a` pattern and `serve: REAL_CONFIG.serve`:
  - a countdown record (EV-0557-like, three 24 h rows of one quest each): built, 3 rows, each row's `stageIds` = its own quest,
    no `days` on entry, rows or quests (daily rule);
  - a sibling record EV-1040b (`splitFrom: 'EV-1040'`, type GEM) built beside an HSC record EV-1040 with the same notice: both
    available, the sibling's evStage rows have `eventCategory` = config.eventCategory (not the HSC category), its entry has no
    `hsc` block;
  - a rerun record EV-1161-like whose quest has the donor stage of an earlier record's quest: entry available, quest
    `sharedWith` the earlier id, no second stage row;
  - a RANK / MISSION / CAMP-LOGIN record listed by id is built (`notSelected` otherwise).
- [ ] **Step 2:** FAIL (ids not in serve.censusIds).
- [ ] **Step 3:** add the 35 census ids and the 5 sibling ids (the GEM / EQ / KEY siblings are also selected by type;
  listing them keeps the note complete).
- [ ] **Step 4:** PASS, full suite. Commit `I-344 Part B: serve 40 WW event records (pilot builder by id)`.

### Task B8: regen, Boosters, maps, music, cards, resources

- [ ] **Step 1:** backups (`tmp\i344\partb\backup_b8`: master_data, game_data, event_ids.json, records, event_enemies,
  board_sets). Live regen 1 with the recipe of the Global Constraints. Expected:
  - +87 evStage rows at most (23103..);
  - stage rows = served quests minus the `sharedWith` ones (the 10 «Find the Target» quests share EV-0576's rows);
  - enemy rows +112;
  - no `mapKeyUsed` on EV-1040b / EV-1139b / EV-1161 201937-201938 (rowShare; if «drops differ», stop and report);
  - every other entry unchanged (diff of events.json outside the 40 ids = 0).
- [ ] **Step 2:** `python -I tmp\events\boosters\build_boosters.py`. Expected: + the 30 Boosters 2004011..2004040 and
  1808007..1808009 built, 0 held (the CROSSCHECK lists their expiry source). Then regen 2: EV-1101b's 10 quests served,
  EV-0532's boosterLater cleared.
- [ ] **Step 3:** `python -I tmp\event_bgm\scripts\make_event_bgm.py` (reads every record file). Expected: + the new stages with
  music, none inferred.
- [ ] **Step 4:** `python -I recon\tools\import_event_stages.py --stage-dir D:/Progetto_Restauro_KH_UX/stage_gen/files/stage`.
  Expected: «left out by cause: {}», the new map keys imported (most rows have `imported 0` in evidence.json).
- [ ] **Step 5:** cards: `KHUX_NOTICE_IMG_BASE=<memory value> python -I recon/tools/make_event_banners.py --fetch --banners
  D:/Progetto_Restauro_KH_UX/reference/event_banners_ww --ids 23103-23189`, then the same without `--fetch`, then
  `make_special_banners.py --section event`. Expected: 0 failed, 0 cards without a banner.
- [ ] **Step 6:** regen 3 (final) with master revision 409 in `cycle.ps1`, `relogin.ps1`, `run-server.ps1`,
  `update-resources.ps1`; `build-resources.ps1 -Append` (resources 205, never -Quick); `update-resources.ps1` (tap Download).
- [ ] **Step 7:** `docs/notes/events.md` section «Unserved WW events, Part B» (counts, the cumulativeRows rule, sibling ids, the
  row-audit finding), ISSUES I-344 progress line. Commit `I-344 Part B: master 409, resources 205`.

### Task B9: bench

- [ ] **Step 1:** maxpower save copy kept EV-0728 (`-RealNow` inside March): one card with the unlocked quests, a quest starts,
  Pink Agaricus drawn.
- [ ] **Step 2:** a countdown (EV-1085: Chip & Dale card + 5 countdown cards in the week), a day rotation (EV-0949: 7 cards x 3), a
  sibling (EV-1222b beside the HSC card of the same week), the rerun EV-1161 (4 cards; a «Find the Target» quest shows EV-0576's
  clear state). Screenshots `i344b_*`. Bench helper: SKIP every dialogue; AppAlive guard.
- [ ] **Step 3:** HANDOFF, ISSUES, commit and push.

## Rerun recipe (after any build_challenge.py rerun)

`add_ev1266.py`, `add_i343_records.py`, `add_i344a_records.py`, **`build_i344b.py`** (its own file: unaffected by the challenge
rerun, but it reruns the builder and must stay equal), `patch_surprise.py`, `patch_seasonal.py` last. patch_seasonal's FILES do
not include celeb_2018_21.json. No Part B record is inside a 2020-21 seasonal Deal window: EV-1357 ends 12-03 and the Holiday
Deal starts 12-07. If a later Part adds one, add the file to FILES.

## Risks

- **Builder edits** (B1 hooks, B2 pins) touch the tool that rebuilds 2,000+ served quests. The zero-drift check against a
  pre-edit scratch run is the guard; never compare with the live files, which carry the post-builder patches.
- **Shared maps:** rowShare needs equal drops. If the 2020 donor drops of the Agrabah / Captain or the Speed / Magic Gem stages
  differ from the served run, those quests wait (mapKeyUsed): report them, never force them.
- **Shared stages (R1):** the EV-1161 «Find the Target» quests reuse EV-0576's stage rows. The clear state and objectives are
  shared, as with EV-0772.
- **Two-pass regen** for the Boosters: forgetting `build_boosters.py` leaves EV-1101b unavailable (boosterOnly), with no error.
- **Card volume:** up to 87 new cards. The banner fetch must run first, else the cards fall back to wrong banners.
- **G21 calendar rule** is new server code on the event list path: the bench must cover a week before and a week after 03-14.
- **Census type chips** (R3) change the Event Catalog filters for everyone. The data-only alternative avoids code but hides the
  census type.
- **Audit blind spot (Task B0):** more rerun rows may surface. They go into a table (this Part or the next), not into ad-hoc
  fixes.

