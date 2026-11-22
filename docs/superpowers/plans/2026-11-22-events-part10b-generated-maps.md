# Events Part 10b — generated maps, drops and coin boards of 2016-2018 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the WW-only quests of 2016-11..2018-03 (401 quests held in 10a as «map to generate») on generated maps with calibrated drops, and serve the coin events of the period with their original Event Boards.

**Architecture:** The private data-hole builder (`tmp/events/part10/build_hole.py`) already writes khuxwiki enemy counts (`wikiEnemies`) for 337 of the 401 quests. It now pins one enemy id per name, writes `map.source 'generate'` (instead of `'generateLater'`) and a `genDrops` block, so `make-events.js` lists them in `event_gen_maps.json` (Part 5 path) and `gen_story_maps.py --config events` builds the maps. The coin boards come from the donor sphere tables into the Part 3 board file.

**Tech Stack:** Node.js (server, `node server/test-*.js`), Python 3 (`python -I`, private builders and `recon/tools`), PowerShell session scripts.

**Spec:** `docs/superpowers/specs/2026-11-22-events-part10-design.md` (goals 1, 6; Design «Maps», «Boards»; Decisions «Generated maps», «Drop rates»; Order of work 10b; Builder check). Previous plan: `docs/superpowers/plans/2026-11-22-events-part10a-records.md` (its ledger rulings carry over).

## Global Constraints

- Enemies are never substituted: a name with no row in our master and none importable from the donor holds its quest (`enemyMissing`); a name with several rows of different stats and no pin holds it (`enemyAmbiguous`). User rule 06-11: on a JP map the WW enemy wins (`mapEnemySwaps`).
- A generated map, a reconstructed window or a drop rate is never presented as original: labels `wikiRoom` (map) and a new `dropsCalibrated` (drops), both shown in the Event Catalog and counted in the Notices.
- Order of trust: notice > khuxwiki > donor > JP twin > reconstruction. I-251: a stage used by one run keeps the donor values (AP, level).
- Everything open for the whole event (author 22-11): no day unlocks, no tier gates.
- A reward is never paid twice (a board bought on two windows, a quest shared between two records pays once: `sharedWith`).
- Rooms with no known code hold the quest (never moved to another room).
- The KEPT tag of a card stays at the top left (user 22-11).
- Private data (donor tables, khuxwiki pages, records) stays out of the public repo; commits as «Re-Union X», English docs.
- Master regen command, map cycle (regen → import → regen → `build-resources.ps1 -Append` → revision bump in the 4 session scripts, UTF-8 BOM → `update-resources.ps1` → relogin) as in HANDOFF; current revision 356, resources 143.

## Review Focus

1. A name whose rows differ in stats picked silently (e.g. «Large Body» 7 vs 89007): must hold the quest, never take the first id.
2. A generated quest whose objective needs chests («Collect all materials», code 18): held (existing rule), not served with an impossible objective.
3. A calibrated drop on a quest whose khuxwiki page names no drop: no drop row at all (reward row 1), never an invented item.
4. A coin board set reached from two events (EV-0087 board 1 = EV-0090 board 1): one board, coins of both events in one balance, each cell bought once.
5. A quest whose khuxwiki target is not among `wikiEnemies` (target listed only in the objectives): the target is added to its own team, not dropped.

---

### Task 1: Pin one enemy id per name and switch the generatable quests to `'generate'`

**Files:**
- Modify (private): `D:/Progetto_Restauro_KH_UX/tmp/events/part10/build_hole.py` (the `generateLater` branch, ~line 290; the check at ~396 and ~584)
- Create (private): `D:/Progetto_Restauro_KH_UX/tmp/events/part10/check_hole_gen.py`
- Modify: `server/test-make-events.js` (one test)

**Interfaces:**
- Consumes: record quest fields `wikiEnemies {name: count}`, `wikiOnlyEnemies [{name, n, ourIds, donorIds}]`, `targets[0].name`, `worldId`, `wikiRooms`, `wikiRoomCodes`, `level`; our master `master_data/enemy.json`; `server/game_data/events.json` reasons.
- Produces: per quest `map.source = 'generate'`, `wikiEnemyIds {name: enemyId}`, `targets[0].id`; quests that cannot be generated keep `'generateLater'` with a `genHeld` string (reason). Consumed by `make-events.js genMapOf` (unchanged) and by Task 2.

- [ ] **Step 1: Write `check_hole_gen.py`** — reads `tmp/events/records/hole_2016_18.json` and our `master_data/enemy.json`, fails (exit 1, list) when:
  - a quest has `map.source == 'generate'` and a `wikiEnemies` name has no `wikiEnemyIds` entry;
  - a pinned id is not in our master;
  - two names of one quest pin ids whose rows differ only by event copy (an event row 1xxxxxxxx where a base row of the same stats exists — prefer the base row);
  - a pinned name whose candidate rows (`ourIds`) differ in stats (hp, attack, defense, baseLv, growth) and no rule below chose it;
  - `generate` without `worldId` or without one `wikiRoomCodes` code;
  - `generateLater` without `genHeld`.
  Prints `check_hole_gen: OK (N generate, M held: {reason: count})`.
- [ ] **Step 2: Run it on the 10a record** — `python -I tmp/events/part10/check_hole_gen.py`. Expected: OK with `0 generate, 401 held` failing on «generateLater without genHeld» (401 lines).
- [ ] **Step 3: Pin ids in `build_hole.py`** with this rule order (first that gives one row wins; record which in `wikiEnemyIdWhy[name]`):
  1. the id the 10a WW enemy check used for the same name in another quest of the same event (`WW_SAME`);
  2. the target: the 1xxxx row of the name when it exists (Part 5 `hscBaseRows` rule); normal enemies: the base row (< 100000);
  3. `ourIds ∩ donorIds` reduced to rows with identical stats → the lowest id;
  4. otherwise: no pin, `genHeld = 'enemyAmbiguous: <name> <ids>'`.
  Then `map.source = 'generate'` when every name is pinned, `worldId` is set and one room code is known; else `genHeld` with the reason (`noWikiPage`, `noRoomCode: <room>`, `enemyAmbiguous…`, `enemyMissing: <name>`).
- [ ] **Step 4: Run builder and check** — `python -I tmp/events/part10/build_hole.py` then `check_hole_gen.py`. Expected: `OK (≈330 generate, ≈70 held: {...})`; write the held list to `tmp/events/part10/gen_held.md`.
- [ ] **Step 5: Test in the repo** — `server/test-make-events.js`, test `hole_generate_listed`: a record with one `'generate'` quest (wikiEnemies {Shadow: 3, Soldier: 1}, wikiEnemyIds pinned, target Soldier id 10002, worldId 1, roomCodes ['DB_0007_00_00']) and one `'generateLater'` quest; assert the first is in `out.genMaps` with `censusId`, reason `mapUnusable` «generated map not built yet» before the report, served after a gen report lists its stageId; the second keeps «map to generate (Events Part 10b)». Run `node server/test-make-events.js` — expect PASS (genMapOf unchanged; the test pins the path for the hole records).
- [ ] **Step 6: Commit** the test (`test(events): hole quests go to the generated-map path (Part 10b)`); ledger line with the generate / held counts.

### Task 2: Calibrated drops on generated maps

**Files:**
- Modify (private): `tmp/events/part10/build_hole.py` (new `gen_drops(q, kh3d)`), private input `tmp/events/part10/kh3d_drops.json` (written by the builder from the 10a KH 3D records EV-0125 / EV-0134 drop rows)
- Modify: `server/make-events.js` (genMapOf: member `reward` from `q.genDrops`; label `dropsCalibrated`; `GENERATED_LABELS`, label phrase)
- Test: `server/test-make-events.js`

**Interfaces:**
- Consumes: Task 1 `wikiEnemyIds`; record `drops` of the KH 3D quests (served in 10a, JP maps); khuxwiki drop lines stored in the record (`wikiDrops [{item, from}]` — add to the record in this task if the page parser has them, else none).
- Produces: record field `genDrops {enemyName: [{type, id, num, rate}]}` (rate in the reward-row unit of the 10a drops); `genMapOf` entry members carry `reward: <reward row id>`; reward rows written with the existing drop-row writer used for `q.drops`; index quest label `dropsCalibrated`.

- [ ] **Step 1: Failing test `gen_drops_calibrated`** — a `'generate'` quest with `genDrops {'Bag O\' Coins': [{type: 2, id: 300913, num: 1, rate: 300}]}`: assert the genMaps entry member of «Bag O' Coins» has `reward > 1`, the reward row it names pays item 300913 at rate 300, the quest has label `dropsCalibrated`; a quest without `genDrops` keeps `reward: 1` and no label.
- [ ] **Step 2: Run** `node server/test-make-events.js` — expect FAIL (no reward from genDrops).
- [ ] **Step 3: Implement** in `make-events.js`: in `genMapOf` (or right after it, before `put(out.genMaps…)`), map each member name to a reward row built from `q.genDrops[name]` with the same writer as JP-map drops; add `dropsCalibrated` to `GENERATED_LABELS` with phrase «drop rates calibrated on the original KH 3D event quests (not original)».
- [ ] **Step 4: Run** — expect PASS, whole file `all N passed`.
- [ ] **Step 5: Builder rule `gen_drops`** — only when the khuxwiki page names a drop for that enemy (`wikiDrops`) or the quest title names the medal («Medal Quest: X» → the event medal X, from the target only): rate = the KH 3D row rate for the same role (target / normal) and rarity; anything else: no `genDrops` (Review Focus 3). Write the calibration table to `kh3d_drops.json` with its source rows.
- [ ] **Step 6: Commit** `feat(events): calibrated drops on generated event maps (Part 10b)`; ledger: rates used, count of quests with drops.

### Task 3: Build the maps and serve

**Files:** generated data only (`server/game_data/event_gen_maps.json`, `D:/Progetto_Restauro_KH_UX/stage_gen` output, master_data), `tools/ldplayer/session/*.ps1` (revision), `docs/notes/events.md`.

**Interfaces:**
- Consumes: Tasks 1-2 record; `recon/tools/gen_story_maps.py` config key `events` (reads `event_gen_maps.json`, writes `mappoi_stg<stageId>.bin` + `_00.bin`, POI and `gen_report.json` with `event: true` entries).
- Produces: served generated-map quests (index `served`), resources 144, revision 357.

- [ ] **Step 1: Regen 1** (master command of HANDOFF) — expect `event_gen_maps.json` to grow by the Task 1 `generate` count.
- [ ] **Step 2: Generate maps** — `python -I recon/tools/gen_story_maps.py` with the events config used in Part 5 (see docs/notes/events.md «Part 5», command recorded there); expect a report entry per quest, failures listed (room without collision file → quest held, never another room).
- [ ] **Step 3: Regen 2, resources, revision** — regen; `build-resources.ps1 -Append` (log in `tmp/events/part10/build144.log`); revision 357 in the 4 session scripts; commit.
- [ ] **Step 4: Bench** — save `p10b`, keep (POST `/web/event/keep/<evStageId>`) and play: one Daily Challenge (EV-0078 day 1), one Gauntlet tier (EV-0135), Corridor of Darkness (EV-0098), Wonderland maze (EV-0131 room with 7 Possessors labelled), Medal Quest Meow Wow (EV-0080: Bag O' Coins drop). Check: map loads, enemies and target as khuxwiki, drop seen when calibrated, Event Catalog shows «map generated» and «drop rates calibrated».
- [ ] **Step 5: Notes** — events.md «Part 10b» section (counts, held list by reason, rates); ISSUES row I-295.

### Task 4: Coin events and their Event Boards

**Files:**
- Modify (private): `D:/Progetto_Restauro_KH_UX/tmp/events/boards/board_sets.json` (Part 3 format) via a new private `tmp/events/part10/add_hole_boards.py`
- Modify: `server/event_config.json` (board set keys of the records, if Part 3 needs them there), `server/test-event-boards.js` (one test)

**Interfaces:**
- Consumes: donor `sphere.json` / `sphereArray.json` / `sphereMasu.json` rows of boards 2310030-037 and the period's sets (EV-0074, 0087 = 0090 board 1, 0090, 0099, 0121, 0125, 0153, 0240, 0256, 0289, Gauntlet Power / Speed / Magic Gem boards); records' `boardSetKey`; Part 3 `server/event-boards.js` (unchanged).
- Produces: board sets served with the coin events; quests paying Event Coins label `eventCoins` instead of `noBoardSet`.

- [ ] **Step 1: Failing test `hole_board_shared_set`** in `test-event-boards.js`: two entries (EV-0087, EV-0090) with the same `boardSetKey`; coins from both go to one balance; buying a cell on one window marks it bought on the other (Review Focus 4).
- [ ] **Step 2: Run** `node server/test-event-boards.js` — expect FAIL only if the shared-set rule is missing; if it passes, the Part 3 code already covers it: keep the test, ledger the ruling.
- [ ] **Step 3: `add_hole_boards.py`** — copy the donor board rows into `board_sets.json` with `source: 'donor sphere tables'`, one-day boards in id order (declared, design «Boards»); refuse a cell whose reward id is not ours (Boosters → Part 6 rule: board held until payable).
- [ ] **Step 4: Regen, test, bench** — regen; `node server/test-event-boards.js`; bench EV-0090 board 2 (Moana) with coins from a served quest.
- [ ] **Step 5: Commit** `feat(events): Event Boards of the 2016-2018 coin events (Part 10b)`; notes «Part 10b» boards paragraph.

### Task 5: Notices and wrap-up

**Files:** `server/routes-info-album.js` (`eventHoleLines`), `server/test-notices.js`, `docs/NOTICES.md` (export), `HANDOFF.md`, README phase row if 10 completes later (not here).

- [ ] **Step 1: Failing test** — `eventHoleLines({hole: {events, served, quests, later: 0, generated: 300, calibrated: 40, boards: 9}})` names «300 quests on generated maps (not original)», «drop rates calibrated» and «9 Event Boards»; with `generated: 0` no generated-map sentence.
- [ ] **Step 2: Implement** `eventHoleFacts` counts: `generated` = served quests with label `wikiRoom`, `calibrated` = label `dropsCalibrated`, `boards` = board sets of the period served; lines in `eventHoleLines`.
- [ ] **Step 3: Run** `node server/test-notices.js` → OK; `node server/export-notices.js`.
- [ ] **Step 4: Full suite** (runner `tmp/events/part10/suite.sh`), compare with the 11 failures of 10a; final review (fresh reviewer, opus); HANDOFF; commit and push.
