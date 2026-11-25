# Coliseum Part 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the PvE Coliseum playable on the original 4.3.1 client with the four WW seasons 2016-04 .. 2016-07 (all
original data): rounds, tiers, shortcut, coins, tier rewards, Coliseum boards, score thresholds, Coliseum Catalog.

**Architecture:** a master patch module (`make-colosseum.js`) writes the season, tier, stage, enemy, ranking and board
rows; a pure rules module (`colosseum-rules.js`) holds the per-season state machine; a route factory
(`routes-colosseum.js`, modelled on routes-raid.js) answers actions 124-128 and 139/140/180 and owns keep/catalog; the
resources get the original `cl_stg` files, layouts and images from the JP 4.3.1 data.

**Tech Stack:** Node (server, `node server/test-*.js` tests), Python 3 tools in `recon/tools/` (`python -I`), PowerShell
session scripts in `tools/ldplayer/session/`.

**Spec:** `docs/superpowers/specs/2026-11-25-coliseum-design.md` (read it first). Research: `docs/notes/coliseum.md`;
private `private\events\sources\coliseum\` (RULES.md, COLISEUM.md, RELUX_COLISEUM.md).

## Global Constraints

- Seasons served in Part 1: WW 2016-04, 2016-05, 2016-06, 2016-07 = 1.1.3 `colosseumStageId` 800, 900, 1000, 1100
  (source `D:\Progetto_Restauro_KH_UX\external\thethiny_2026-10-13\KHUx-Server\data\`). Original values only; truncate
  every reward array to its `valid*` count (array tails hold decoder garbage).
- Season of the story clock = `storyCtx().shopFrom.slice(0, 7)` (month the shown Shop week starts in); it follows the
  week also when the rotation loops back. One live season: the kept one if any, else the story one.
- Each season keeps its own progress and coins in `player.colosseum.seasons[<colosseumStageId>]`; a first visit starts
  at Tier 1 Round 1 with 0 coins.
- Unlock at story quest 130 (`storyCtx().storyQuest >= 130`, same test the tile popup uses today).
- A loss/retire changes no progress and refunds no AP. A cleared round is never playable again.
- Shortcut (RULES.md Q3): one-turn clear of round r sets `open = r + N` (N = that tier's `excellentUnlockCount`, counted
  across tiers); a multi-turn clear sets `open = r + 1`; clearing r pays r and every skipped round in `last+1 .. r-1`
  (per-round coins) and the tier rewards of every tier completed; `clearColosseums` is never empty.
- Coliseum Coins = reward type 17, stored per season, shown as `userPoint.colosseumSpherePoint`.
- Every served season has `ranking` (category 4) + `rankingReward` rows (the client's «Rewards» button crashes
  otherwise). Ids: `ranking` 4000-4099, `rankingReward` 30000-39999 (free in our master).
- New id ranges (declare in `RANGES`): `colosseumStage` 800-1100 used, range 1-9999; `colosseum` 1-99999 (1.1.3 tier
  ids); `stage` kind 3 ids 81001-81999 with `stageId` YYYYMMNN; `sphere` type 3 2200001-2299999; enemy rows only for ids
  not already in `master_data/enemy.json` (111 ids 20001-22073 exist).
- Coliseum Catalog banner: evStage **6000** (free), **first** catalog banner of the Events tab, before the Raid Catalog
  (user 25-11).
- Every deviation is declared in the in-game Notices (`RAW_NOTICES`, server/routes-info-album.js).
- Public repo rules: English, commits as «Re-Union X», no game files, no private paths' contents copied in.

## Review Focus

1. Shop rotation looping April/May/April (quests 201-250): the live season flips and each keeps its own progress and coins (Task 2 test `season flips keep progress`).
2. Story clock in a month with no served season (e.g. 2016-08 in Part 1): `/colosseum` answers status 2 «This event is unavailable.», no crash, 126/128 refused (Task 3 test `unserved month`).
3. A 128 for a round outside the window (double tap, stale screen, retried request): no double payment, answer the current state (Task 2 test `clear outside window is a no-op`).
4. Story below quest 130: Coliseum stays locked (Task 3 test `locked before 130`).
5. The endless last tier (`arrivalStageCount` 0): rounds keep cycling stages by `loopStageCount`, no tier-reward payout, no crash past round 999 (Task 2 test `endless tier`).

---

### Task 1: Master rows for the four seasons (`make-colosseum.js`)

**Files:**
- Create: `server/make-colosseum.js`, `server/test-make-colosseum.js`
- Modify: `server/make-game-tables.js` (call `require('./make-colosseum').patch(OUT)` after `make-raid` / `make-events`, before `make-avatar-boards`)

**Interfaces:**
- Produces: `patch(outDir)`; `SEASONS` = `[{month:'2016-04', colosseumStageId:800}, ... 1100]`;
  `seasonRows(src) -> {colosseumStage[], colosseum[], stage[], enemy[], ranking[], rankingReward[], sphere[], sphereArray[], sphereMasu[]}`
  (pure, `src` = the 1.1.3 tables); `RANGES` like make-raid.js:46.

- [ ] **Step 1: Write the failing test** `server/test-make-colosseum.js`, using a small fixture copied from the 1.1.3 rows
  of season 800: asserts `colosseumStage` row 800 has `stageId` length 10 and `headColosseumId..termColosseumId` covering
  the tier rows; every `colosseum` row has `stageReward*`/`reward*` arrays of length 4 with entries past `validStageReward`
  / `validReward` zeroed; `stage` rows have `stageKind` 3, `worldId` 5, `mapName` "Coliseum" and one row per `stageId` of
  the set; no enemy id already present in the given master enemy list is emitted; one `ranking` row (category 4) per
  season with at least one `rankingReward` row; `sphere` rows are type 3; `patch()` twice gives the same files (idempotent).
- [ ] **Step 2: Run** `node server/test-make-colosseum.js` → FAIL (module missing).
- [ ] **Step 3: Implement** `seasonRows` and `patch`. Dates: write `openDate`/`closeDate`/`rankingCloseDate` the way
  make-raid.js writes raid rows (read it first); the client reads `closeDate` only for «Ends in %s». Thresholds:
  `rankingReward` brackets from the 1.1.3 rows of ranking 4009-4012 (truncate arrays); the threshold value per bracket
  (last round cleared, as a global round number) from the cutoffs in COLISEUM.md section «Ranking», interpolated per spec
  where missing; record each value's source in a comment block at the top of the module. Boards: the 1.1.3 type-3 boards
  of these months (`sphere*`), mapped to seasons by the wiki board list (boards_khuxwiki.json in the private dossier).
- [ ] **Step 4: Run** the test → PASS; run the master regen command of HANDOFF (10-11 env) and check
  `server/master_data/colosseum*.json` are non-empty; `node server/test-master-clock.js` still OK.
- [ ] **Step 5: Commit** `git add server/make-colosseum.js server/test-make-colosseum.js server/make-game-tables.js` and the
  regenerated master files; message «Coliseum Part 1: master rows for the 2016-04..07 seasons».

### Task 2: Season state machine (`colosseum-rules.js`)

**Files:**
- Create: `server/colosseum-rules.js`, `server/test-colosseum-rules.js`

**Interfaces:**
- Produces (pure, no I/O):
  - `tiersOf(season) -> [{tier, rounds /*0 = endless*/, skip, ap, roundReward, tierReward}]` from master rows.
  - `seasonState(save, colosseumStageId) -> {last, open, coins, cleared:Set, tierRewards:number[], bestAt, boardIds}` (creates `{last:0, open:1, coins:0, ...}`).
  - `globalRound(tiers, tier, round) -> n` and `tierRound(tiers, n) -> {tier, round}`.
  - `playable(tiers, st) -> [{tier, round, stageIndex}]` = rounds `last+1 .. open` (stageIndex = (round-1) % loopStageCount).
  - `clear(tiers, st, {tier, round, oneTurn}, nowIso) -> {ok, cleared:[{tier, round}], coins, tierRewards:[tier], st}`; ok false (nothing changed) when the round is not in `playable`.

- [ ] **Step 1: Write the failing tests** `server/test-colosseum-rules.js` with a 3-tier fixture (rounds 5, 5, 0; skip 3, 2, 2;
  round coins 1, 3, 5; tier coins 30, 40):
  - `fresh season`: `playable` = [T1R1].
  - `multi-turn clear`: clear T1R1 → cleared [T1R1], coins 1, playable [T1R2].
  - `one-turn window`: clear T1R1 one-turn → playable [T1R2, T1R3, T1R4].
  - `skip pays skipped rounds`: then clear T1R4 → cleared [T1R2, T1R3, T1R4], coins 1+1+1.
  - `jump across tiers`: from last = T1R4 one-turn → window to T2R2; clearing T2R2 pays T1R5 (1), T2R1, T2R2 (3+3) and tier 1 reward (30), `tierRewards` [1].
  - `clear outside window is a no-op`: clear T1R1 again → ok false, state unchanged.
  - `endless tier`: in tier 3 rounds never close the tier, no tier reward, round 1000 → stageIndex cycles.
  - `season flips keep progress`: two season ids in one save keep independent `last`/`coins`.
- [ ] **Step 2: Run** `node server/test-colosseum-rules.js` → FAIL.
- [ ] **Step 3: Implement** the functions above (`bestAt` = nowIso when `last` grows).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** «Coliseum: season state machine (window, shortcut, payouts)».

### Task 3: Routes 124-128 and ranking (`routes-colosseum.js`) + wiring

**Files:**
- Create: `server/routes-colosseum.js`, `server/test-colosseum-routes.js`
- Modify: `server/server.js` (router `route()` ~:263: kinds `colosseum`, `colosseumstart`, `colosseumclear`,
  `colosseumretire`, `colosseumrewardlist`, `colosseumranking` for `/ranking/colosseum*` routed before
  `routePartyRanking` :276; dispatcher ~:5930; `userPointData` :2389 `colosseumSpherePoint` from the live season with a
  try/catch like `eventCoinPoint()` :5212; `stageResumptionData` :2803 `colosseumStageId`; memo `colosseum()` like `raid()`
  :5216; `_test` exports), `server/routes-party-ranking.js` (drop the colosseum keys from `EMPTY_KEYS` :46-50),
  `server/test-event-board-routes.js` (:249/:300 expect the live value, not 0)

**Interfaces:**
- Consumes: Task 2 functions; master rows via `masterRows`; `storyCtx`, `grantItem`, `addPresent`, `changeAp`, campaign AP
  (`campaigns().stageAp`), the 128 helpers listed in the map (`addBattleLux`/`raidBattlePoints`, `userDetailData`,
  `inventoryBlocks`, `userKeybladesData`, `stageResumptionData`), `ranked-rewards.js`.
- Produces: `routesColosseum(deps) -> {list, rewardList, start, retire, clear, ranking, liveSeason(realMs), coinsOf(), keep, unkeep, catalogCtx, catalogCard}`;
  `grantItem` type 17 → `colosseum().addCoins(num)` (live season).

- [ ] **Step 1: Write the failing tests** `server/test-colosseum-routes.js` (stub deps as in test-raid-routes.js `world()`):
  - `locked before 130`: story 120 → `/colosseum` status 2.
  - `unserved month`: shopFrom 2016-08-04 → status 2, `start` refused with `{ret}` error, no AP spent.
  - `list`: shopFrom 2016-04-07 → `colosseumInfo.colosseumStageId` 800, status 1, `colosseumStages` = the window
    (`rank`, `stageCount`, `stageId`, `useAp`), `userColosseum{userRank, userStageCount, userStageTotalCount}`.
  - `start spends AP`: tier AP taken, `startColosseumData` echoes the request, `userKeybladeId` uint64.
  - `retire keeps progress`: state and AP unchanged after 127.
  - `clear pays`: 128 for the window round → `clearColosseums` non-empty, coins in `userData.userPoint.colosseumSpherePoint`,
    tier reward items granted, `getLux` number.
  - `rewardList sorted`: `getRewardRankIds` ascending.
  - `ranking own entry`: 139/140 contain the player's `userColosseum` and `arrivalTime`; reaching a threshold adds a Present once.
  - `kept season wins`: with `player.colosseum.kept` = 900 and shopFrom in April → live season 900.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the factory and the wiring (response keys exactly as docs/notes/coliseum.md «Requests and
  responses»; the 128 response blocks in the order of `respondStageClear` :2890).
- [ ] **Step 4: Run** the new test, `test-event-board-routes.js`, `test-raid-routes.js`, `test-master-clock.js` → PASS.
- [ ] **Step 5: Commit** «Coliseum: routes 124-128, ranking thresholds, live season».

### Task 4: Resources (stage files, layouts, images) and the bench probe

**Files:**
- Create: `recon/tools/import_colosseum_stages.py` (model `import_event_stages.py`: copy `cl_stg<set>.bin` + `_00.bin`
  of the Part 1 stage sets at their highest revision from the JP 4.3.1 `stage/` into `stage_gen\files\stage\`)
- Modify: `recon/tools/jp_coco_layouts.txt` (activate `AdventureTop2_Colosseum_Button`/`_Panel` :146-147, add
  `AdventureTop2_Colosseum_Target`, `Colosseum_MainPanel`, `BattleResultColosseumScene`, using `need=`/`patch=` where a
  widget is missing), `recon/tools/originals.tsv` (`ActMapColosseumAnim.*`, `img/colosseum/*`,
  `img/adventure/stage/OC_Colosseum_PanelB.png` as `jp` rows), `recon/tools/make_layouts.py` (remove the generated
  substitutes :858-866 once the originals are imported), `tools/ldplayer/session/build-resources.ps1` (call the import
  script)

- [ ] **Step 1:** run the import + `build-resources.ps1 -Append` (full path); verify the new version lists the `cl_stg` files
  and layouts; install with `update-resources.ps1`, bump the master revision in the 4 session scripts, relogin.
- [ ] **Step 2: Bench probe** (user present; save with story ≥ 130 and shopFrom in 2016-04): tile → Coliseum screen shows
  Tier/Round list; record with screenshots: the window list after a one-turn clear, the result screen of an `isSkip`
  clear and of a skipped-tier clear, the «Rewards» and ranking screens. Fix any key the client rejects.
- [ ] **Step 3:** write the probe results into docs/notes/coliseum.md («Bench probe 2026-11-xx»), update the spec's
  «Decided behaviour» only where the client forces a change, and commit «Coliseum: resources + bench probe».

### Task 5: Coliseum boards (sphere type 3)

**Files:**
- Create: `server/routes-colosseum-boards.js`, `server/test-colosseum-boards.js` (model `routes-event-boards.js`)
- Modify: `server/server.js` (`userSphereAll` :3164, `respondSphereCheck` :3186, `respondSphereUpdate` :3240,
  `sphereState` :3149: branch for type 3 → the new module; save `player.colosseumSphere` per season; ids from
  `nextUserSphereId` :3132)

**Interfaces:**
- Consumes: `colosseum().coinsOf()` / `spendCoins(n)` (add `spendCoins` to Task 3's factory), the live season's board ids
  (`boardIds` from Task 1 rows).
- [ ] **Step 1: Failing tests:** the live season's boards are listed; buying a node spends that season's coins and grants
  the cell reward; not enough coins → refused, nothing spent; another season's boards are not listed; a node bought in
  April stays bought when April comes back.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run + `test-event-board-routes.js` → PASS.
- [ ] **Step 5: Commit** «Coliseum: season boards (type 3)».

### Task 6: Coliseum Catalog

**Files:**
- Create: `server/colosseum-pages.js` (model `raid-pages.js` `catalogPage`, shared parts from `catalog-pages.js`)
- Modify: `server/server.js` (route prefix `/web/colosseum/` → `colosseumweb`, GET pages + POST `/web/colosseum/keep/<colosseumStageId>`
  and `/web/colosseum/unkeep`, like `respondRaidWeb` :5334 / `respondRaidPost` :5499), `server/events-tab-order.js`
  (new first slot: Coliseum Catalog banner, then Raid Catalog, Event Catalog, kept raid, kept event, rest; update its 4
  callers and `test-events-tab-order.js`), `server/make-colosseum.js` (evStage 6000 catalog row with `eventType` 0 and
  `detailUrl` the catalog page, like make-raid.js:1346), `recon/tools/make_special_banners.py` (section `colosseum`:
  `game_data/colosseum_img/6000.png`, own design following the Raid/Event Catalog style)
- [ ] **Step 1: Failing tests:** tab order puts evStage 6000 first; the catalog lists the 4 seasons with states (now /
  can keep / kept) via `rowState`; keep of a past season sets `player.colosseum.kept` and the live season; keep of the
  current season → 409 «now»; unkeep returns to the story season.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement. **Step 4:** run → PASS (+ `test-events-tab-order.js`).
- [ ] **Step 5: Commit** «Coliseum Catalog: first catalog of the Events tab, keep a past season».

### Task 7: Notice, campaigns, docs; final bench and tester package

**Files:**
- Modify: `server/routes-info-album.js` (`RAW_NOTICES`: a «Coliseum» notice declaring: season follows the story clock,
  Coliseum Catalog + keep, coins and progress kept per season, ranking as score thresholds), then `node server/export-notices.js`;
  `server/legal-pages.js:73` (FAQ: Coliseum available, PvP not yet); `server/make-campaigns.js:65` (restore the Coliseum
  scope `stageType 7` for the 2016-05-19..31 1 AP campaign); `docs/notes/coliseum.md`, `docs/ISSUES.md` (I-059 Part 1 status),
  `HANDOFF.md`
- [ ] **Step 1:** `node server/test-notices.js` and the full suite (`for f in server/test-*.js; do node $f; done`) → all OK
  except the known list in HANDOFF.
- [ ] **Step 2: Bench with the user:** full season 2016-04 run of a few tiers (normal clear, one-turn window, skip across
  a tier, loss + retry, board purchase, kept 2016-05 from the Catalog, ranking threshold Present).
- [ ] **Step 3:** commit + push; tester package after the user's OK (make-pkg / publish flow of HANDOFF).
