# Events Part 10c — special mechanics, Damage Contests, Booster Challenges, CELEB leftovers of 2016-2018 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the 2016-11..2018-03 events that need more than a quest record: the six Booster Challenges, the three Damage Contests, the WOFF and 2nd Anniversary quests, the raid summons of EV-0117 / EV-0121, the Classic Goofy / Classic Donald time windows, and the held 10b leftovers that a rule can unlock.

**Architecture:** Records keep coming from the private data-hole builder (`tmp/events/part10/build_hole.py`, input `hole_input.py`). Booster Challenges reuse Part 6 (emblem rows + `boosterRewards`), Damage Contests reuse the Part 8 High Score code (score quest, thresholds), raid summons reuse the Part 4 raid spawn of a quest, and the time windows are a new record field read by `make-events.js` and the event routes. Generated maps keep the 10b page method.

**Tech Stack:** Node.js (`node server/test-*.js`), Python 3 (`python -I`), PowerShell session scripts.

**Spec:** `docs/superpowers/specs/2026-11-22-events-part10-design.md` (goals 4, 5; «Decisions taken»: special mechanics, WOFF; «Builder check»: raid summons). Previous plans: 10a, 10b (their ledgers' rulings carry over).

## Global Constraints

- Enemies never substituted; a missing model is found, rendered and approved by the user before it is served (Large Fireworks precedent, 22-11).
- Raid summons: only a served raid row of the same boss whose HP is original for that period; without one the quest is served without the summon and the Notices say so.
- Reconstructed times (Classic Donald windows, Goofy bonus hours) and generated maps are declared **not original** in the Event Catalog and the Notices.
- Everything open for the whole event (author 22-11); KEPT tag at the left; a reward is never paid twice.
- Booster expiry = the end date the notice gives; Boosters only from donor emblem rows (Part 6 rule).
- Master regen / map cycle / revision bump as in HANDOFF (revision 359, resources 145).

## Review Focus

1. A Booster Challenge objective paying a Booster whose emblem row is not imported: the quest is held (`rewardTypeUnknown` / boosterLater), never paid with another Booster.
2. A Damage Contest score posted twice in one run: the best score counts once per threshold (HSC rule).
3. A Classic Donald window crossing midnight Pacific: open from start to end on both days, never closed early.
4. A raid summon whose raid row is not served this week (raid rotation): the quest still plays, no summon, no crash.
5. WOFF «chance» egg entries: never placed as fixed enemies unless the footage shows them every run.

---

### Task 1: Booster Challenges (EV-0319, 0332, 0350, 0369, 0392, 0411)

**Files:** private `tmp/events/part10/hole_input.py` (6 rows: donor blocks by stage name «Booster … Challenge» in id order, windows from the notices), `build_hole.py`; private emblem import (Part 6 `make-emblems` input: donor rows 1710xx P/S/M, 1712004-006 Donald, 1801xxx Master Xehanort, 1802xxx Final Form Sora, 1803001-003 Pooh); `server/test-make-events.js` (one test).

- [ ] **Step 1: Failing test `booster_challenge_served`** — a record with 5 quests whose objectives 1/3/5 pay Boosters (type 34) present in `boosters`: served, `boosterRewards` on those quests, label `boosterEffect`; the same record with one Booster missing: that quest held `rewardTypeUnknown`/`boosterOnly`, the others served.
- [ ] **Step 2: Run** `node server/test-make-events.js` — expect PASS if Part 6 covers it (then ledger «no code change»), else implement in `make-events.js remapItems` and rerun.
- [ ] **Step 3: Data** — add the 6 census rows to `hole_input.py` (`check_hole_input.py` OK), import the emblem rows (expiry from the notice), rebuild, regen; expect 35 quests listed (EV-0411 10), served where their map is JP or generated.
- [ ] **Step 4: Commit** test + config; ledger counts.

### Task 2: Damage Contests (EV-0238 Chernabog, EV-0309 FMB / Brooms, EV-0352 Holiday)

**Files:** private HSC records (`tmp/events/hsc/build_hsc.py` input or a `hole_hsc` addition), `server/event_config.json` (`hsc` thresholds), `server/test-make-events.js` / `test-ranked-rewards` (one test).

- [ ] **Step 1: Failing test `damage_contest_thresholds`** — an HSC record of census type RANK with rank brackets from the notice: rank rewards become score thresholds with the «open-ended 2016-2018» proportions (ranked-rewards spec), milestones as original.
- [ ] **Step 2: Implement** the RANK type in the HSC selection (config `serve` types) if missing; run tests.
- [ ] **Step 3: Data** — score quest stage rows from the donor (Damage Contest stages), maps JP or generated; regen; bench one contest (score screen, threshold reward).
- [ ] **Step 4: Commit.**

### Task 3: WOFF (EV-0121) and 2nd Anniversary Countdown (EV-0423)

**Files:** private `build_hole.py` (hand-made `genAreas` from `tmp/events/part10/woff/WOFF.md`: Beginner 8 fixed, Intermediate 12, Advanced 6 + their «chance» eggs only if WOFF.md shows them every run; Gummi Hammer → Morning Star by the 06-11 rule); EV-0423 from the donor 2021 evStage / stage rows + its one map (import), the other days generated.

- [ ] **Step 1:** WOFF genAreas from WOFF.md (cite the video timestamps in `genAreas.source`); keyblade objectives re-checked on donor ids.
- [ ] **Step 2:** EV-0423: use the donor evStage rows (dates) and the map file; generated maps for the days without one.
- [ ] **Step 3:** Rebuild, regen, maps (resources), bench WOFF Beginner.
- [ ] **Step 4: Commit** (private data; repo: resources / revision / notes).

### Task 4: Raid summons (EV-0117 Eggcognito, EV-0121 Adventurer)

**Files:** `server/make-events.js` (record field `raidSummon {bossName, raidRowId}`), `server/routes-events.js` / raid spawn code of Part 4 (locate: `grep -n "spawn" server/*raid*.js`), tests.

- [ ] **Step 1: Failing test `quest_raid_summon`** — a quest with `raidSummon` naming a served raid row: clearing it has the summon chance of the Part 4 rule; a row not served: no summon, quest served, label `raidSummonLater`.
- [ ] **Step 2: Implement**, run tests.
- [ ] **Step 3: Data** — pick the served raid rows (Eggcognito, Adventurer) with original HP for Jan 2017 (raids census); regen; bench EV-0117 day 1.
- [ ] **Step 4: Commit.**

### Task 5: Classic Goofy bonus hours and Classic Donald 12-hour windows

**Files:** `server/make-events.js` (record `timeWindows [{from: 'HH:MM', to: 'HH:MM', tz: 'America/Los_Angeles', effect: 'dropBoost'|'open'}]`), `server/routes-events.js` (open check / drop boost), tests; private records EV-0109 / EV-0116.

- [ ] **Step 1: Failing tests** — `time_window_open`: a quest with an «open» window is listed only inside it (Pacific time, a window across midnight stays open on both sides); `time_window_drop_boost`: inside a Goofy bonus hour (12:00-12:59 and 20:00-20:59 PT, notice 24216) the quest's drop odds are multiplied by the notice factor (if the notice gives none: ×2, declared).
- [ ] **Step 2: Implement**, run tests.
- [ ] **Step 3: Data** — Goofy hours from the notice; Donald windows reconstructed (two 12-hour windows a day, declared), in the records; regen; bench.
- [ ] **Step 4: Commit.**

### Task 6: 10b leftovers a rule can unlock

**Files:** private `build_hole.py`; `server/make-events.js` only if a rule needs code.

- [ ] **Step 1:** «genAreas: X 0 in the areas, 1 on the page» (14): the page lists an enemy in the target's row text only; count it in the target group (test in `test-make-events.js` `gen_areas_target_row_member`).
- [ ] **Step 2:** 37 enemyAmbiguous: list each name with its candidate rows and stats in `gen_held.md`; pin only with evidence (same-run JP map, footage); the rest stays held.
- [ ] **Step 3:** «Collect all materials» (10): chests from the khuxwiki «Treasures» rows when the page has them (genAreas chests), else held.
- [ ] **Step 4:** Regen, maps, bench one; commit.

### Task 7: Notices and wrap-up

- [ ] **Step 1: Failing test** in `test-notices.js`: the 2016-2018 section names Booster Challenges, Damage Contests (score thresholds, not original), the reconstructed Classic Donald / Goofy times and the raid summons (served or not).
- [ ] **Step 2:** Implement in `eventHoleLines`; export notices.
- [ ] **Step 3:** Full suite, final review (fresh reviewer), HANDOFF, notes «Part 10c summary», I-296; commit and push.
