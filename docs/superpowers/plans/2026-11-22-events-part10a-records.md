# Events Part 10a: records of the 2016-11..2018-03 events — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Every event quest of 2016-11..2018-03 gets an event record built from the donated stage rows and dated by the notices; the quests with an original JP 4.3.1 map are served, the others are held with the reason «map to generate» for Part 10b.

**Architecture:** The «data hole» path of the Part 5 Org XIII builder (`tmp\events\orgxiii\build_orgxiii.py`): the pilot record builder (`tmp\events_p1\pilot\work\census.py`, `extract.py`, `build.py`) run with `--ids` and `--twins` (census id -> donor stage ids), JP maps by own key or by content (`jpmatch.py`, `jp_index.json`), WW enemy check, then the record file in `tmp\events\records\` that `server/make-events.js` serves (KHUX_EVENT_SRC). A new private builder `tmp\events\part10\build_hole.py` owns the selection, the block matcher output and the windows.

**Tech Stack:** Python 3 `python -I` (private builders), Node (server generators, plain assert tests), PowerShell bench scripts.

**Spec:** `docs/superpowers/specs/2026-11-22-events-part10-design.md`.

## Global Constraints

- Order of trust: official notice > khuxwiki > donated master (after cross-check) > JP twin > reconstruction; I-251: a donor stage used by one run only keeps the donor value over khuxwiki unless a contemporary notice contradicts it.
- Enemies are never substituted; a missing enemy is imported from the donor rows or the quest is held.
- Only WW content (EV-0391 is JP-only: dropped).
- Everything open for the whole event period (author 22-11): no day gates, no tier release.
- Private data stays outside the repo (records, twins, slices); the repo gets only code, tests, docs and generated master rows.
- Never rerun `build_event_enemies.py`: add enemy rows with `tmp\events\p5d136\add_run_row.py` (Part 5 lesson).
- After a master regen: revision 354 -> next in the 4 session scripts; maps need a resources build (`build-resources.ps1 -Append`) and `update-resources.ps1`.
- Docs and commit messages in English; commit and push every task (git `-c safe.directory=*`).

## Review Focus

1. A census id that two slices place in different donor blocks (the five one-week-off khuxwiki runs): the block matcher must take the corrected run, never both.
2. A quest whose JP map differs from khuxwiki by one enemy (Maleficent Pt. 9 / 11, Legendary): held `heldBack`, not served with the JP enemies.
3. A record whose window overlaps an already served event (EV-0152 Coliseum Challenge vs Daily Challenge #18 EV-0154): two separate events, no quest shared.
4. A regen without the new record file (private folder absent on a tester build): make-events must keep working with the other records.
5. Reward medal ids of the 2021 donor (90135, 90136, Boosted 123186/7, 123256/7): mapped to ours or imported; never an id the client lacks.

---

### Task 1: Census fixes and the hole input table

**Files (private):** Modify `tmp\events_p1\pilot\work\census.py` (fix tables) and/or `private\events\sources\event_census\event_census.json` the way earlier census fixes were made (check `NOTICE_FIX` and the Part 4/5 fix tables first); Create `tmp\events\part10\hole_input.py` -> `tmp\events\part10\hole_input.json`; Create `tmp\events\part10\check_hole_input.py`.

**Produces:** `hole_input.json` = `{censusId: {window: [fromIso, toIso], windowSource: 'notice <id>' | ..., twins: [donorStageId...], quests: n, verdict: 'A'|'B'|'C', jpMapStages: [ids with a JP map], notes}}` for every EQ / COIN / COLLAB / SPEC row of 2016-11..2018-03 kept by the design, plus the two Daily Challenge runs #12 (2017-01-02..08, donor 502680-502740) and #16 (2017-02-13..19, donor 503210-503270) as new census rows, plus the 7 CELEB quest events (EV-0094, 0108, 0112, 0138, 0172, 0178, 0423) and the coin events EV-0099, EV-0125 (EV-0087 folded into EV-0090).

- [ ] Step 1: write `check_hole_input.py` (assertions, run with `python -I`): EV-0391, EV-0265, EV-0075, EV-0166, EV-0283 absent; EV-0152 window 2017-03-06..03-12 and name «Coliseum Challenge for Gems»; EV-0090 window from 2016-11-25; khuxwiki runs placed as Gauntlet #6 -> EV-0196, #7 -> EV-0211, DC #23 -> EV-0218, Gauntlet #8 -> EV-0242, #9 -> EV-0258; no donor stage id in two census ids (Review Focus 1); every window inside 2016-11-01..2018-03-31 and inside its notice period; every twin id is a row of the donor `stage.json`. Run: FAIL (file missing).
- [ ] Step 2: implement `hole_input.py` from `tmp\events\part10\slice_A.json`, `slice_B.json`, `slice_C.json`, `slice_D.json` (their per-quest stage ids and verdicts) and the notice texts (windows). Apply the census fixes.
- [ ] Step 3: run both; Expected: `check_hole_input: OK` and a count line (`rows N, twins M`).
- [ ] Step 4: ledger the counts (private, nothing to commit in the repo).

### Task 2: build_hole.py, the records

**Files (private):** Create `tmp\events\part10\build_hole.py` (model: `build_orgxiii.py`, data-hole half only), outputs `tmp\events\records\hole_2016_18.json`, `tmp\events\part10\REPORT.md`, `CROSSCHECK.md`, `MISSING.md`, `missing_hole.json`, `work\*`.

**Consumes:** `hole_input.json` (Task 1). **Produces:** records in the Part 5 data-hole shape (`evStage: []`, `window`, `windowSource`, `dataHole: true`, quests with `stageId` = donor id, `map {key, status, source: 'jpOwn' | 'jpTwin' | 'generate', searched[]}`, `wwCheck`, labels).

- [ ] Step 1: `KHUX_HOLE_OUT=<scratch>` support (double-run check, as `KHUX_ORGXIII_OUT`); run twice into two scratch folders; Expected: identical files (md5).
- [ ] Step 2: run live; Expected in REPORT.md: every JP-id quest (63xxx-67xxx, 7xxxxx from 2017-11) `map.status ok`; WW-only quests `source: 'generate'` (held «map to generate», Part 10b); WW enemy check counts (`agree`, `heldBack` with Maleficent Pt. 9 / 11 and Legendary listed: Review Focus 2); objective conflicts per I-251.
- [ ] Step 3: MISSING.md lists every enemy / medal / title not in our master with its donor row (expected: 16072001, 160710140, 10129, 11035, 11574, 11575, 180311575, 1027, 18011505, 18011523, 18011541, Large Fireworks; Boosted 123186/7, 123256/7; title 12185; Booster emblem rows of EV-0387 / EV-0410).

### Task 3: imports (enemies, medals, title, Boosters)

**Files:** private enemy rows via `add_run_row.py`; repo: the generator that holds our medal / title / emblem additions (find where Part 6 added Booster emblem rows and Part 9b mapped 2021 medal ids: `docs/notes/events.md` «Boosters (Events Part 6, Tasks 2-7)», `server/make-game-tables.js`), its test file.

- [ ] Step 1: failing test in the owning generator's test: the master after regen has enemy rows of the MISSING list, title 12185 «Record Keeper», the Boosted medals (or a declared mapping to existing boosted copies), the emblem rows 1802001/1802002/1803004-006; the records' reward ids 90135 / 90136 resolve to 300948 / 300913 (Review Focus 5).
- [ ] Step 2: implement the imports (donor rows cross-checked: name, rarity, attribute; untrusted fields listed in the commit message).
- [ ] Step 3: rerun `build_hole.py`; Expected: MISSING.md empty for the JP-map quests.
- [ ] Step 4: commit the repo part.

### Task 4: serve the records

**Files:** `server/make-events.js` (only if the new file needs a config entry: `event_config.json` groups, Event Catalog labels for «map to generate»), `server/test-make-events.js`, master regen, maps (`import_event_stages.py` on the new JP maps), `build-resources.ps1 -Append`, revision bump.

- [ ] Step 1: failing tests in `test-make-events.js` on a stub record in the data-hole shape: served when `map.status ok`; held with the catalogue reason «Map to generate (Part 10b)» when `source: 'generate'`; no crash and no change to other events when the record file is absent (Review Focus 4); EV-0152 and EV-0154 two events, no shared quest (Review Focus 3).
- [ ] Step 2: implement; run `node server/test-make-events.js`; Expected: `all N passed`.
- [ ] Step 3: import the JP maps (dry run first, as Part 5: report counts, rooms not served), master regen (the HANDOFF command with `KHUX_EVENT_SRC`), resources `-Append`, revision bump; Expected: served quest count rises by the JP-map quests of the period; no previously served quest lost.
- [ ] Step 4: commit and push.

### Task 5: bench

- [ ] Story week in the period (save with a story date in 2017: copy a bench save, set the Shop week, or `-RealNow` as earlier benches), relogin, update-resources if a new version.
- [ ] Play: Maleficent's Villainous Event 15/15 (Maleficent B drop), Tag Team with Hercules (ally 16072001), Coliseum One-on-One #1, FFRK Challenge round 1, Boss Time Attack round 5; Event Catalog shows the held WW-only quests with «Map to generate».
- [ ] Record results in `docs/notes/events.md` «Part 10a».

### Task 6: notice, docs, ISSUES, HANDOFF

- [ ] Failing test in `server/test-notices.js`: the Events notice has a section for the 2016-2018 events with the served / held counts from events.json and the line on maps rebuilt later.
- [ ] Implement in `server/routes-info-album.js`, export notices, `docs/notes/events.md` «Part 10a summary», ISSUES I-294, HANDOFF START HERE -> Part 10b; full test suite (known failures listed in the HANDOFF).
