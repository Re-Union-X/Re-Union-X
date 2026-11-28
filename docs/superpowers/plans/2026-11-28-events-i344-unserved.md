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
