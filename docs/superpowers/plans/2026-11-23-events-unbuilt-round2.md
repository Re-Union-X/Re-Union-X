# Events: unbuilt quests, round 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the event quests that the research pass of 23-11-2026 found recoverable (about 107 of the 118 «not fixable»,
the Hidden Menace / month-prefix / EV-0941 rulings), and re-run the held groups on their right khuxwiki pages.

**Architecture:** Every fix lives where the quest's record is built, never by hand in served data: page pins in the private
builders (`tmp\events_p1\pilot\work\build.py` P10_PAGE_PIN, used by `tmp\events\part10\build_hole.py`) or record patches in
`tmp\events\challenge\` for the 2018-2021 records (their builder must not be rerun: it drifts), then the usual live order:
master regen -> `recon/tools/import_event_stages.py` -> `build-resources.ps1 -Append` (generated maps + package) -> master regen.
Repo code changes only where a new rule is needed (make-events.js, import_event_stages.py), each with its test.

**Tech Stack:** Node.js server generators and tests, private Python builders, PowerShell bench scripts.

**Spec:** user rulings of 23-11-2026 (memory `khux-unbuilt-quest-rulings`), census `D:\Progetto_Restauro_KH_UX\tmp\events\unbuilt\census.json`,
research `...\unbuilt\research2\report.txt`, `findings.json`, `objmatch.json`, `pin_audit.txt`, `idprefix.json`, `hidden_menace_jp.json`.

## Global Constraints

- Every missing enemy is found, never substituted; a version chosen by a rule is declared (label + Notices).
- A page pin needs the quest's ordinal (title number / date / round) AND its objectives to agree with the page: an objective
  match alone is not a pin (several pages of a series share objectives).
- Month-prefix rule only for events from mid-2018 (JP map keys >= 730000) and only when exactly one donor WW row of the name
  carries the event's YYMM; otherwise the quest stays held.
- Hidden Menace: only the empty corridor parts come from the Legendary map of the same world; enemies, the Gold Tricholoma
  part and the room stay original; label mapPartRebuilt.
- Private data never enters the repo; patches are idempotent and back up what they change.
- Before each regen: back up master_data, events.json, raids.json, special.json, event_maps.json to `tmp\master_bak_rN`; after a
  regen that changes master_data, raise the revision in the four session scripts.

## Review Focus

- A pin that moves a served quest to another page (a regression on a quest that worked): the diff of served quests before/after
  each regen must only add quests, never change or drop one (checked in each task's verification step).
- A month-prefix row that is a boss/variant of a different strength than the khuxwiki level: the row level must equal the
  page level, else the quest stays held.
- A filled Hidden Menace map whose exits do not chain (a softlock): import_event_stages.py must report the map imported with the
  part count of the Legendary sibling; bench one tier map.
- Materials placed on a generated map with no chest slot: «Collect all materials» quests stay held unless the generator places
  every material.
- Records patched and then rebuilt by someone later lose the patch: each patch script is listed in docs/notes/events.md.

---

### Task 0: Close round 1 (A1/A2/C1/medals/enemies)

- [ ] Wait for `build-resources.ps1 -Append` (imported maps), master regen, revision 366, update-resources (tap Download), relogin.
- [ ] Served-quest diff vs revision 365: only additions. Record the count.
- [ ] Bench: one A2 quest of EV-0921 (Cloud), one EV-0742 quest (Copter Fleets); user plays.
- [ ] Commit revision bump; docs/notes/events.md «Unbuilt quests round 1» section.

### Task 1: Pins for the 2016-18 hole records (build.py P10_PAGE_PIN)

**Files:** `tmp\events_p1\pilot\work\build.py` (P10_PAGE_PIN), `tmp\events\part10\build_hole.py` run.
- [ ] From objmatch.json + findings.json build the pin list for EV-0098 (30), EV-0078 (7), EV-0074 (1), EV-0373 (3) and the hole
  quests of H / G / B2 whose day page differs (EV-0112, 0117, 0123, 0130, 0204, EV-0154): one page per quest, chosen by ordinal
  (round number / date) and confirmed by objectives; a quest with no single page is listed, not pinned.
- [ ] KHUX_HOLE_OUT dry run; diff with the live records: only the pinned quests change.
- [ ] Real run; their maps go to generation (Part 10b path) or stay held with the new reason.

### Task 2: Pins and donor-name rows for the 2018-2021 records (record patch)

**Files:** create `tmp\events\challenge\patch_pins_r2.py` (idempotent, backups in challenge\work\).
- [ ] EV-0683 (5), EV-0875 (7), EV-1086 (5), EV-1052 (1), EV-0742 page fix, EV-1115/1203/1271/1352 page fix: set `wiki` to the pinned
  page and recompute the fields the builder derives from it (wikiEnemies / wikiEnemiesHint, enemyAgreement, wwCheck) with the
  builder's own functions (import them, do not re-implement).
- [ ] Swiftstriker EV-0568/0615/0918/1109 and Hidden Menace EV-0429 (records built from wiki only): replace the quest stub with the
  donor WW stage row found by name (stage id, objectives, map key) through the builder's record functions; add the event enemy
  rows they need (170911501 Gold Tricholoma, Swiftstriker rows) with `tmp\events\part10\add_census_rows.py`.
- [ ] Dry check: the patch lists what it changes; real run; regen; import; served diff.

### Task 3: Hidden Menace part fill (21 quests)

**Files:** `recon/tools/import_event_stages.py` (+ test_import_event_stages.py): a map-level `fillFrom` (Legendary sibling key)
that copies only the missing empty parts; record field set by Task 2's patch.
- [ ] Failing test: a map missing part N gets part N of `fillFrom` when that part has no enemy, never when it has one; STG header
  from the sibling only when absent (711680 / 711700 / 711780). Label mapPartRebuilt.
- [ ] Implement, test green, import, regen, bench one tier map (exits chain, Gold Tricholoma reachable).

### Task 4: Month-prefix enemy rows (D3, ~39 quests)

**Files:** `server/make-events.js` genMapOf name resolution (+ test), private `idprefix.json` as input (KHUX env path).
- [ ] Failing test: an ambiguous name resolves to the one donor row with the event's YYMM prefix for an event >= mid-2018, the
  row level equals the page level; two prefixed rows or an earlier event -> still enemyAmbiguous. Label `prefixVersion`
  (reconstructedWhy text, Notices line).
- [ ] Add those donor rows to the private event enemy file (add_census_rows.py), regen, served diff.

### Task 5: EV-0941 on its JP twin; medal 21646; EV-0417 / EV-0108 leads

- [ ] EV-0941: record map source jpTwin 740926 (record patch), regen.
- [ ] Medal 21646: check that FFRK Warrior of Light is now resolved (round 1 fix); if the quest still asks 21646, add the row the
  medal tool way (docs/notes/medaglie.md), never by hand.
- [ ] EV-0108 / EV-0417: online search (YouTube titles, JP wikiwiki, archive.org); record the result, no build without a source.

### Task 6: Closing

- [ ] Full suite green; revision bump; update-resources; relogin; bench one quest per task (user plays).
- [ ] docs/notes/events.md «Unbuilt quests round 2»; Notices lines for the new labels; HANDOFF; commit + push.
