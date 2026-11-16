# Events, Part 8: High Score Challenges with score thresholds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** serve the worldwide High Score Challenges (HSC) as event quests whose original leaderboard rewards are paid through
per-event score thresholds, with the original point milestones beside them.

**Architecture:** a private builder turns `private/events/sources/hsc_ranking/hsc_ranking.json` and the census into HSC
records (quest, milestones, brackets, mapped rewards, calibrated thresholds with source labels); `make-events.js` serves them
as `eventCategory` 4 rows with the `ranking` / `rankingReward` / `evScoreReward` / `evMedalList` master rows; a new
mode-independent module `server/ranked-rewards.js` holds the threshold logic (bracket of a result, shown rank, highest-bracket
payment with differences, paid once per event) that later modes reuse; the HSC routes store the client's score and answer the
ranking screens from it.

**Tech Stack:** Node (server, `server/test-*.js` run as `node server/test-x.js`), Python 3 private builders (`python -I`),
PowerShell bench scripts (`tools/ldplayer/session/*.ps1`).

**Spec:** [docs/superpowers/specs/2026-11-10-ranked-rewards-design.md](../specs/2026-11-10-ranked-rewards-design.md) (approved
10-11-2026); events design [2026-11-06-events-design.md](../specs/2026-11-06-events-design.md) part 8.

**Earlier plans:** Part 7 [2026-11-15-events-part7-avatar-boards.md](2026-11-15-events-part7-avatar-boards.md) (task layout,
bench and notice tasks followed here).

**Issues:** I-245 (events). New issue numbers for the open points of Task 1, if any.

## What is known and what is not (16-11)

- **Known:** the client reports the run's score in `/stage/clear` `getPoint.score` (every logged clear sends it, 0 so far: no HSC
  row served); there is **no stageId** in the clear body (`player.currentStageId` from `/stage/start`). The server keeps no score:
  `player.stageScores[stageId]` is the best **Lux** (server.js ~2825). HSC evStage fields: `eventCategory` 4 (opens the High
  Score mode), `scoreMedalListId`, `scoreStartReward`, `scoreEndReward`, `rankingId`, `disableContinue` 1
  (docs/notes/events.md:25-48). Response fields: `/stage/start startStageData.highScore`, `/stage/clear highScoreReward[]`,
  `/stage/event highScoreRank` (mandatory), `/stage/highscore/reward/list` (action 112: `getHighscore`,
  `getHighscoreRewardIds`, no route), `/ranking/highscore{,/own,/border}` (actions 135/136/179, root keys `highscoreRanking*`,
  element `{userData{user,userDetail}, userAvatar, lux, rank}`, nested userData mandatory), `/ranking/reward/check` (142:
  `lastRankingResults`, `rankingRewardIds`, `openRankingIds` element shapes not decoded), `/mypage rankingRewards.rankingHighScore`.
  Master tables `ranking`, `rankingReward`, `evScoreReward`, `evMedalList` exist and are empty. Skip during an HSC gives 0 points
  (mappe_storia.md:849).
- **Evidence:** 71 census rows of type HSC (none served); `hsc_ranking.json` has 75 rows (69 HSC + 6 Damage Contest), 74 with
  brackets and point milestones, 22 with real scores, 74 with a donor `rankingId`; rewards are free text.
- **Not known:** whether the WW client draws the ranking screens (`Ranking_MainPanel_ver230` and 17 more `Ranking*` layouts are
  missing in WW, JP originals exist; `Rank_Title_3.png` / `Rank_Result_Deco.png` missing everywhere); the element shapes of
  `/ranking/reward/check`; the score field of a highscore ranking element (only `lux` is documented); how the client shows the
  milestone rewards (`highScoreReward` vs action 112). Task 1 answers these before anything is built.

## Global Constraints

- Reward = the player's own result, never a position; one threshold per original rank bracket of the event, paying that
  bracket's original rewards (spec 1, 4.2).
- Metric of HSC: best single-run score, best result kept (spec 4.1).
- Each threshold paid once per event id, ever, reruns and catalog-kept plays included; the best result keeps counting (spec 4.3).
- Only the highest bracket reached is paid; a later higher bracket pays the difference item by item, never negative (spec 4.9).
- Shown position = best rank of the bracket reached; below the lowest threshold the lowest bracket's upper bound; «1st» only
  above the top threshold; no fake players, no fixed «1st» (spec 3, 4.4).
- Original point milestones stay, unchanged, beside the thresholds (spec 3, 4.6).
- Top threshold = min(reference solo result, original top where known); lower thresholds rescaled with the original
  proportions per era (spec 6.2, 6.3); ceiling-era ranks 1..~500 collapse into one «ceiling reached» threshold with a small
  tolerance.
- Every threshold carries a source label: original value / scaled from original / interpolated (spec 6.4); a bracket with
  unknown numbers is interpolated and labelled reconstructed.
- Every deviation is in the in-game Notices (project rule); player text never says «restored» (use «Not built yet»).
- Damage Contest, Swiftstriker, Coliseum, Lux and PvP are out of this plan; they reuse `ranked-rewards.js` later (spec 9).
- Private data (records, census, evidence, reward maps) stays outside the repository; docs and commits in English.

## Review Focus

1. A replay (rerun week or kept event) with a lower score lowers nothing and pays nothing again — `rerun_lower_score_keeps_best` (Task 4).
2. A run worth 0 points (Skip, Give Up, a lost run) pays nothing and changes no rank — `zero_score_pays_nothing` (Task 5).
3. A first run straight past the top threshold pays the top bracket once, not the sum of all brackets — `jump_to_top_pays_top_only` (Task 4).
4. A higher bracket with fewer of some item than the lower one already paid never takes items back — `difference_never_negative` (Task 4).
5. A score reported on a non-HSC stage is never stored as an HSC result, and an HSC stage played as the kept event counts for its own event id — `score_only_for_hsc_stages` (Task 5).

---

### Task 1: Client spike (user gate)

**Files:**
- Modify (test only, reverted after): `server/master_data/evStage.json`, `stage.json`, `ranking.json`, `rankingReward.json`, `evScoreReward.json`
- Create: findings in `docs/notes/events.md` section «High Score Challenge: client behaviour»

- [ ] **Step 1:** *(Main session.)* Hand-build one HSC test row from the pilot EV-0771 data (one evStage row `eventCategory` 4,
  `rankingId`, `scoreMedalListId`, `scoreStartReward..scoreEndReward` over 2 test `evScoreReward` rows, one `ranking` row with
  2 brackets and 2 `rankingReward` rows), revision +1, relogin on a copy of `avb20`.
- [ ] **Step 2:** *(Main session.)* Play it twice and record (requests, logcat, screenshots `t8s_*`): the start popup, the
  in-battle score, `getPoint.score` at the clear, what `highScoreReward` and `/stage/highscore/reward/list` make the client
  show, the quest header with `highScoreRank`, every ranking screen the client opens (own, border, top list, result popup) with
  a self entry carrying the score in `lux` and in a guessed `score` field, and `/ranking/reward/check` with one test entry.
- [ ] **Step 3:** Write the findings: which screens draw (missing layouts → JP import needed or not), the field that shows the
  score, the milestone path, the reward-check shapes, crashes. Revert the test rows (revision stays raised).
- [ ] **Step 4:** User gate: the user reads the findings and decides the reward delivery (Presents at the clear vs the
  original end-of-event result popup) and the screens to serve. Commit the findings and push.

### Task 2: HSC records (private builder, user gate)

**Files:**
- Create (private, outside the repo): `D:\Progetto_Restauro_KH_UX\tmp\events\hsc\build_hsc.py`, `reward_map.tsv`, output
  `tmp\events\records\hsc\*.json` (the `KHUX_EVENT_SRC` folder)
- Test (private): `tmp\events\hsc\test_build_hsc.py`

**Interfaces:**
- Produces: one record per HSC census row, the shape of the other event records plus
  `hsc: { era, milestones: [{score, rewards:[{type,id,num,skillId?,skillLv?}]}], brackets: [{startRank, endRank, rewards:[…]}],
  scoreBonus: [pct…], knownScores: [{rank, score, quality}], donorRankingId }`; rows that cannot be mapped get
  `reason` `hscRewardUnmapped` / `hscNoQuest` and are not served.

- [ ] **Step 1:** Write the failing tests: `maps_reward_text` (e.g. «6★ Magic Mirror x1» → medal type/id/num), `era_of_row`
  (A #1-#11, B #12-#45, Mini #13/#17, C #46-#69, from `ww_number`/date), `unmapped_reward_holds_row`, `quest_from_census_or_donor`.
- [ ] **Step 2:** Run `python -I tmp\events\hsc\test_build_hsc.py`. Expected: FAIL.
- [ ] **Step 3:** Implement `build_hsc.py`: quest rows from the donor master / census like the Part 4 records, milestones and
  brackets from `hsc_ranking.json`, reward text through `reward_map.tsv`, eras from the HSC_RANKING.md §3 table.
- [ ] **Step 4:** Run the tests. Expected: all OK. Write `tmp\events\hsc\REVIEW.md`: per event, mapped / held, rewards per
  bracket and milestone. User gate on the held rows and doubtful mappings.

### Task 3: Threshold calibration (bench + tool, user gate)

**Files:**
- Create (private): `tmp\events\hsc\calibrate.py`, `tmp\events\hsc\samples.tsv`, `tmp\events\hsc\test_calibrate.py`
- Modify (private): the HSC records get `hsc.thresholds: [{startRank, endRank, score, label}]`

**Interfaces:**
- Consumes: Task 2 records; Task 1 (how a run is played and scored).
- Produces: `thresholds` ordered from the lowest bracket to the top, `label` in `original | scaled | interpolated`, the top
  bracket of a ceiling era marked `ceiling: true` with its tolerance.

- [ ] **Step 1:** *(Main session.)* Reference deck per era (spec 5: best non-paying deck at that story week, from the saves of
  the matching weeks): play 1-2 sample events per era on the bench with Task 1's test rows, note the scores in `samples.tsv`.
- [ ] **Step 2:** Write the failing tests: `top_is_min_of_reference_and_original`, `open_era_ratios` (top-5,000 ≈ milestone,
  top-1,000 1.2-1.5x, top-100 ≈ 2x, rank 1 ≈ 2.2x, rescaled from the new top), `ceiling_era_collapses_top_brackets`,
  `unknown_bracket_interpolated_and_labelled`, `thresholds_strictly_increase`.
- [ ] **Step 3:** Run `python -I tmp\events\hsc\test_calibrate.py`. Expected: FAIL. Implement `calibrate.py` (spec 6.1-6.4:
  samples scaled to the other events of the era by stage enemies and bonus medals). Run again. Expected: all OK.
- [ ] **Step 4:** Write the threshold table per event (`tmp\events\hsc\THRESHOLDS.md`). User gate: the user approves the table
  and may check a top threshold by playing.

### Task 4: `server/ranked-rewards.js` (mode-independent)

**Files:**
- Create: `server/ranked-rewards.js`, `server/test-ranked-rewards.js`

**Interfaces:**
- Produces:
  - `bracketOf(thresholds, result) -> index | -1` (highest threshold with `result >= score`; a `ceiling` threshold counts within its tolerance)
  - `shownRank(thresholds, result) -> int` (spec 4.4)
  - `rewardsDue(brackets, paidIndex, newIndex) -> [{type, id, num, skillId, skillLv}]` (differences, never negative, `[]` when `newIndex <= paidIndex`)
  - `record(state, eventId, result) -> { best, paidIndex, due }` updating `state[eventId] = { best, paidIndex }` (pure: the caller saves and pays)

- [ ] **Step 1:** Write the failing tests: `bracket_of_result`, `shown_rank_below_lowest_is_lowest_upper_bound`,
  `first_only_above_top`, `jump_to_top_pays_top_only`, `difference_never_negative`, `rerun_lower_score_keeps_best`,
  `ceiling_tolerance`, `paid_once_per_event_id`.
- [ ] **Step 2:** Run `node server/test-ranked-rewards.js`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement the four functions. Items compared by `type:id:skillId:skillLv`.
- [ ] **Step 4:** Run `node server/test-ranked-rewards.js`. Expected: all OK. Commit and push.

### Task 5: HSC score and ranking routes

**Files:**
- Create: `server/routes-hsc.js`, `server/test-hsc-routes.js`
- Modify: `server/server.js` (`/stage/clear` ~2722-2836, `/stage/start` ~2257-2292, `/stage/event` ~4677-4688, `rankingrewardcheck` ~5665, `respondMyPage` ~2397, route table ~269), `server/routes-party-ranking.js` (highscore keys out of `EMPTY_KEYS`)

**Interfaces:**
- Consumes: Task 4 module; `entryOfStage(stageId)` of routes-events.js; `addPresent(type, id, num, comment)`; the HSC entry
  of `game_data/events.json` (`hsc.thresholds`, `hsc.brackets`, `hsc.milestones`, `rankingId`).
- Produces: `player.hsc = { [censusId]: { best, paidIndex, milestones: [paid scores] } }`; `routesHsc(deps)` with
  `onClear(stageId, score, now)`, `startHighScore(stageId)`, `highScoreRank(censusId)`, `respondRanking(res, path)`,
  `respondRewardCheck(res)`, `respondRewardList(res)`.

- [ ] **Step 1:** Write the failing tests: `score_only_for_hsc_stages`, `zero_score_pays_nothing`,
  `milestone_paid_once_in_order`, `bracket_difference_to_presents` (text «High Score Challenge: <event> — <bracket>»),
  `kept_event_counts_for_its_id`, `own_entry_rank_and_score` (nested `userData`), `border_rows_are_thresholds`,
  `top_list_is_self_only`, `reward_check_shapes` (Task 1 shapes), `start_sends_best`.
- [ ] **Step 2:** Run `node server/test-hsc-routes.js`. Expected: FAIL.
- [ ] **Step 3:** Implement `routes-hsc.js` and wire it in `server.js`; delivery as decided at Task 1 Step 4; the field that
  carries the score in the ranking element as found at Task 1.
- [ ] **Step 4:** Run `node server/test-hsc-routes.js`, `test-event-routes.js`, `test-raid-routes.js` (its known failure stays
  the same). Expected: new tests OK. Commit and push.

### Task 6: Serve HSC events and their pages

**Files:**
- Modify: `server/make-events.js` (HSC type: evStage `eventCategory` 4 rows, `ranking`, `rankingReward`, `evScoreReward`,
  `evMedalList` rows from the records, `hsc` block into `events.json`), `server/event_config.json` (`serve.types` + `HSC`),
  `server/event-pages.js` (HSC details: milestones, thresholds with their labels and shown rank, TYPE chip «High Score
  Challenges»), tests `server/test-make-events.js`, `server/test-event-pages.js`

- [ ] **Step 1:** Write the failing tests: `hsc_rows_category_4`, `ranking_tables_from_record`, `held_hsc_not_served`
  (in test-make-events.js); `hsc_details_thresholds_and_labels`, `hsc_type_chip` (in test-event-pages.js).
- [ ] **Step 2:** Run both files. Expected: FAIL.
- [ ] **Step 3:** Implement. Run both files and `test-event-routes.js`. Expected: new tests OK. Commit and push.

### Task 7: Serve, resources, bench (user)

- [ ] **Step 1:** *(Main session.)* Regen with the HANDOFF regen line (incl. `KHUX_AVATAR_BOARDS`) + the HSC records; revision +1
  in the 4 session scripts; any JP `Ranking*` layouts Task 1 needs via `originals.tsv` + `build-resources.ps1 -Append`;
  `update-resources.ps1`; relogin.
- [ ] **Step 2:** *(Main session.)* Bench on named saves (`hsc1` open era, `hsc2` ceiling era): a run below the lowest
  threshold, one in the middle, one past the top; milestones; replay lower; kept event; ranking screens. Table in
  docs/notes/events.md «High Score Challenges served». User plays one top threshold.
- [ ] **Step 3:** Commit and push.

### Task 8: Notice, docs, next part

- [ ] **Step 1:** «Events» notice section «High Score Challenges» (thresholds instead of leaderboards, paid once, highest bracket
  only, shown position, labels, held events) in `server/routes-info-album.js`, tests in `server/test-notices.js`; run
  `node server/test-notices.js` and `node server/export-notices.js --check`.
- [ ] **Step 2:** README.md / README.it.md phase D row, ISSUES I-245, HANDOFF, events.md «Part 8 summary»; next plan (Part 9
  campaigns) with the user. Commit and push; run the «discord-notices» Action.

## Builder's calls

- Damage Contests (6 rows in `hsc_ranking.json`) stay out: the spec puts them with the challenge events they belong to.
- `ranked-rewards.js` is pure (no save, no I/O) so the later modes reuse it unchanged.
- Thresholds live in the private records and reach the server only through `events.json` (built), never hand-written.
