# Events Part 9a: Bonus Times (campaign calendar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** serve the original Bonus Times (AP 0 / 5 / half, Lux, rare items, Medal Fusion, rare enemies) and the census AP,
Sp. Atk and celebration campaigns on the original days of the player's story week, each bonus applied exactly once.

**Architecture:** a private extract turns the donated `evCampaign` table (plus the 1.1.3 rows and the census) into kinds with
their original Pacific days. `make-campaigns.js` maps them onto our stage ids and writes evCampaign rows 96000-97999, plus a
server-only day table. `campaigns.js` returns the row ids of the day picked by `weekDateAt(storyCtx(), now)`; the server
lists those ids and applies only the effects the client does not apply.

**Tech Stack:** Node (server, generators, `node server/test-*.js` tests), Python 3 `-I` for the private extract, LDPlayer bench.

**Spec:** `docs/superpowers/specs/2026-11-22-campaigns-design.md`

**Scope:** goals 1-2 of the spec. Later plans, after this one ships: 9b special logins + celebration rewards + monthly
missions; 9c Lux Boost (`luxMagnifications.party` of `/stage/start` is already in the response, at 0).

## Global Constraints

- Story date: the original day is `calendar-util.js weekDateAt(storyCtx(), realMs)`. Each campaign is active for that whole
  original day (Pacific), not for its original hours.
- Raids are out of scope. Kinds with type 6 (raid boss encounter), type 9 (next raid level), stageType 3 (raid enemy list) or
  stageType 8 (every raid boss) are dropped and counted. `routes-raid.js` stays the only authority on raid bonuses, and its
  98000-98999 rows are untouched.
- Kept events, kept raids and Special quests get no Bonus Time. stageType 4 («every event stage») becomes explicit lists of
  the stages of the events that ran on that original day; it is never served as stageType 4.
- Order of trust: notice > khuxwiki > donor master > reconstruction. The donor rows are served in full, labelled «donated
  master» in the Notices. Where a notice disagrees, it wins.
- Days without any row: only notice-announced campaigns. Nothing reconstructed.
- No donor or SE data in the public repo. The extract and its script stay under `D:\Progetto_Restauro_KH_UX\private` and
  `D:\Progetto_Restauro_KH_UX\tmp\relux_verify`. Generators read the extract through an env var with a default path, as
  `KHUX_STAGE_STORY_2021` does.
- Docs and commits in English, author «Re-Union X». Commit and push after every task.
- After a master regen, bump `[int]$Revision` in `tools/ldplayer/session/{cycle,relogin,run-server,update-resources}.ps1`
  (UTF-8 BOM). The current revision is 349.

## Review Focus

1. Two kinds of the same type on one day (e.g. «0 AP!» on a list and «Half AP» on all event stages): the stage gets the
   lowest AP, once. Test in Task 4.
2. A quest started on the day boundary, cleared the next real day: the AP is charged at start; Lux, drops and EXP use the
   day of the clear. No mismatch error. Test in Task 4 (pure function on a given day).
3. A story week with no Shop week (`storyCtx()` without shopFrom, a new player before the first week): no campaigns, no
   crash. Test in Task 4.
4. A raid quest while a calendar AP kind is active: `/stage/start` still charges `raid().stageAp()` and lists only the
   raid's own ids for raid stages. Test in Task 5.
5. Master regen twice: the rows and the day table are identical, ids stable (sorted keys). Test in Task 3.

---

### Task 1: Bench check, client side or server side per type (no code kept except the bench switch)

**Files:**
- Modify: `server/server.js` (bench switch `KHUX_CAMPAIGN_FORCE`, next to `BENCH_DROP_LUCK`)
- Create: `docs/notes/campaigns.md`

**Interfaces:**
- Produces: the table in `docs/notes/campaigns.md` «Who applies each type», one line per type 1/7/8/10/11/14/17/18. Each line
  says client applies / server applies / display only, with the AP rounding of type 7 powers 556, 5000 and 3500. It also
  records the meaning of stageType 1/5/6/7/19/20 as far as the bench shows it. Tasks 4-5 read this table.

- [ ] **Step 1:** add `KHUX_CAMPAIGN_FORCE` (comma-separated campaign ids) to `server.js`. When it is set, the ids are added to
  `campaigns` of `GET /campaign`, `/stage/start` and `/raid/start`. Log once at startup.
- [ ] **Step 2:** write bench rows into the bench master only (not the generator): one evCampaign row per type, ids
  95990-95999, copied from a real donor row of that type, with stageType 2 lists set to quest 130's stage. Bump the revision.
  Run `update-resources.ps1`, then relogin.
- [ ] **Step 3:** for each type, force its id and read the quest top: shown AP and balloon text. Play quest 130 and compare
  the Lux the client reports in `/stage/clear` (server log) with the same quest unforced; also compare drops (twice each, with
  `KHUX_BENCH_DROP_LUCK` off). Then fuse a Medal with and without types 11/14 and compare the EXP and munny the client shows
  with what it sends.
- [ ] **Step 4:** write the table and the stageType findings in `docs/notes/campaigns.md`, with screenshots in
  `D:\Progetto_Restauro_KH_UX\tmp\campaigns_bench\`. Remove the bench rows (regen), keep the switch.
- [ ] **Step 5:** commit `docs/notes/campaigns.md` and the `server.js` switch. Push.

### Task 2: Private calendar extract

**Files:**
- Create: `D:\Progetto_Restauro_KH_UX\tmp\relux_verify\campaign_calendar.py`
- Create: `D:\Progetto_Restauro_KH_UX\private\donations\relux_2026-11\verified\campaign_calendar_2021.json`
- Modify: `D:\Progetto_Restauro_KH_UX\private\donations\relux_2026-11\verified\VERIFY.md` (evCampaign line)

**Interfaces:**
- Consumes: the donor `pkg/server_master/evCampaign.json` (`Reddit Donators\ReLux Team\KHUX_Pacchetto_12-11-2026\KHUX_aggiornamento_compagno`),
  the 1.1.3 `evCampaign` (`external\thethiny_2026-10-13\KHUx-Server\data`), and the census
  `private\events\sources\event_census\event_census.json` (rows of type CAMP-AP 26, CAMP-SPATK 7, CELEB 86: `start`, `end`,
  `notices`, `rule_flags`), plus the notice text `private\events\sources\raid_census\work\notice_text.json`.
- Produces: `{ "_provenance": {...}, "kinds": [ { "key": str, "type": int, "power": int, "displayText": str, "stageType": int,
  "stageIds": [int], "days": ["YYYY-MM-DD"], "source": "donor"|"1.1.3"|"notice", "notices": [int] } ] }`. `stageIds` are the
  original ids truncated to `validStageId`; `days` are Pacific and sorted; `key` = `type|power|stageType|displayText|ids joined by ,`.

- [ ] **Step 1: pin the time zone of the row times.** The 2016 type 10 «Lux x 2» stageType 8 rows are the raid bonus hours,
  which docs/notes/raid.md gives in Pacific. Find the offset that maps their start hours onto those Pacific hours, and assert
  it in the script.
- [ ] **Step 2: group the rows by key.** A row covers every Pacific day its [startTime, endTime] touches, filtered by its week
  flags. Use the 1.1.3 rows instead of donor rows with the same campaignId (`source` "1.1.3").
- [ ] **Step 3: apply the census.** For each CAMP-AP / CAMP-SPATK / CELEB row, the days `start..end` must hold a kind of the
  type its rule_flags name (AP 0 → type 7 power 0; half → 5000; 1 AP → 3500; Sp. Atk → the type Task 1 found). If a kind is
  there, add the notice id to it. If none is there, add a kind with `source` "notice" and stageType 4. A donor run of the same
  type that overlaps the notice window but goes past it is trimmed to the window (the notice wins); log each trim.
  Celebrations list several bonuses: one kind per bonus their notice text names. When the text names none, log it and add
  nothing.
- [ ] **Step 4: checks the script asserts.** The total rows read are 18,051 donor plus 340 1.1.3. Every kind has at least one
  day. No day is outside 2016-03-01..2021-07-01.
- [ ] **Step 5: write and record.** Write the extract with `_provenance` (sources and SHA-256, the trims, the counts). Change the
  evCampaign line of VERIFY.md to «extracted 22-11, served in full by the author's decision». No repo commit; note the extract in
  HANDOFF in Task 6.

### Task 3: Generator `make-campaigns.js` (rows + day table)

**Files:**
- Create: `server/make-campaigns.js`
- Create: `server/test-make-campaigns.js`
- Modify: `server/make-game-tables.js:1110` (call `require('./make-campaigns').patch(OUT)` after make-ev-campaign)

**Interfaces:**
- Consumes: the extract of Task 2 (`process.env.KHUX_CAMPAIGN_CALENDAR`, default the private path); `game_data/events.json`
  (`entries[].quests[] {donorStageId, stageId, served}`, `entries[].rows[] {start, end, days?, stageIds, available}`); the
  `stage` table.
- Produces:
  - `buildCampaigns(calendar, ctx) -> { rows: evCampaignRow[], days: { [iso]: number[] }, dropped: { [reason]: number } }`
    with `ctx = { storyStageIds: Set<number>, eventStageOf: Map<orig, ours>, eventStagesOn: (iso) => number[] }`.
  - `patch(masterDir)` writes `evCampaign.json`, keeping every row outside 96000-97999, and `campaign_days.json` (server
    only: it has no MASTER_SCHEMA entry, so `masterTables()` does not send it).
  - Constants `CAMPAIGN_BASE = 96000`, `CAMPAIGN_MAX = 97999`.

- [ ] **Step 1: write the failing tests** in `test-make-campaigns.js`, on a small hand-made calendar and ctx:
  - a type 6 kind, a type 9 kind, a stageType 3 kind and a stageType 8 kind give no rows; `dropped.raid === 4`;
  - a stageType 2 kind with story id 1010 and an unknown event id 60110 gives one row with stageId [1010]; `dropped.unknownStage === 1`;
  - a stageType 4 kind on day D with `eventStagesOn(D)` = 7 stages gives 2 rows (5 + 2), stageType 2, and `days[D]` lists both ids;
  - a stageType 20 kind gives 1 row, stageType kept;
  - row ids are `CAMPAIGN_BASE + n` in key order; building twice gives deep-equal output (Review Focus 5);
  - field order and formats match `make-ev-campaign.js row()` (times «2015-01-01 00:00:00»..«2030-12-31 23:59:59», week
    flags 1, unused stageId slots 0);
  - overflow past 97999 throws.
- [ ] **Step 2: run** `node server/test-make-campaigns.js`. Expected: FAIL (module missing).
- [ ] **Step 3: implement** `buildCampaigns` and `patch`. A kind whose day lists map to different stage sets (stageType 4)
  becomes one row group per distinct list. `days` keeps only days with at least one row. Log the counts as make-ev-campaign does.
- [ ] **Step 4: run** the test. Expected: `test-make-campaigns: OK`.
- [ ] **Step 5: regenerate the master** (the command in HANDOFF «Master regen»), check the log line and the row count against the
  extract, bump the revision to 350, and commit the generator, the test and the make-game-tables change. Push.

### Task 4: Module `campaigns.js` (active ids and effects, pure)

**Files:**
- Create: `server/campaigns.js`
- Create: `server/test-campaigns.js`

**Interfaces:**
- Consumes: `campaign_days.json` and the `evCampaign` rows of Task 3; the type table of Task 1.
- Produces:
  - `activeIds(dayIso, daysTable) -> number[]`: `[]` when dayIso is null or not in the table.
  - `effectsFor(ids, rowsById, stageId) -> { apPower: number|null, lux: number, drop: number, fusionExp: number, fusionMunny: number }`.
    `apPower` is the lowest type 7 power among rows whose scope takes the stage (stageType 2 list, or the global stageTypes
    Task 1 found); the factors are power/10000, 1 when no row applies, and the highest one wins when several do (not multiplied).
  - `apWith(useAp, apPower) -> number`, with the rounding Task 1 recorded.
  - `SERVER_APPLIES`: a set of the types the server must apply (from Task 1).

- [ ] **Step 1: write the failing tests:**
  - `activeIds(null, t)` deep-equals `[]` (Review Focus 3);
  - two type 7 rows on one stage, powers 5000 and 0: `apPower` is 0 (Review Focus 1);
  - a row listing stage 1010 does not touch 1020;
  - `apWith(90, 556) === 5`, `apWith(90, 5000) === 45`, `apWith(3, 3500) === 1` (or Task 1's recorded values);
  - with no rows, all factors are 1 and `apPower` is null;
  - one day's ids on a fixed table: on day X, `activeIds` gives the ids and a later day gives a different set (Review Focus 2).
- [ ] **Step 2: run** `node server/test-campaigns.js`. Expected: FAIL.
- [ ] **Step 3: implement.**
- [ ] **Step 4: run** it. Expected: `test-campaigns: OK`.
- [ ] **Step 5: commit and push.**

### Task 5: Wire into the routes and apply the effects

**Files:**
- Modify: `server/server.js`:
  - `GET /campaign` (≈5808);
  - `respondStageStart` (≈2336-2390: `campaigns`, the useAp line, `luxMagnifications.campaign` if Task 1 says the client
    reads it);
  - `respondStageClear` (Lux, if server side);
  - `rollDropTypes` (≈1529, odds × drop factor, capped at `ODDS_ALWAYS`);
  - `respondMedalEnhance` (≈4151: EXP gain and munny cost).
- Modify: `server/test-raid-routes.js`, or a new `server/test-campaign-routes.js` following the route-test harness of
  `test-raid-routes.js`.

**Interfaces:**
- Consumes: Task 4 (`activeIds`, `effectsFor`, `apWith`, `SERVER_APPLIES`); `weekDateAt`, `storyCtx()`, `raid().campaignIds()`,
  `raid().stageAp()`.
- Produces: `campaignDayIds(realMs) -> number[]` in server.js (the story day's ids; [] on any read error, logged once).

- [ ] **Step 1: write the failing route tests:**
  - on a day with an AP 0 kind over story stage S, `/stage/start` of S lists the kind's id and charges 0 AP;
  - a raid stage on the same day is charged `raid().stageAp()` (Review Focus 4);
  - `/campaign` lists the raid ids plus the day ids, without repeats;
  - a type the client applies (per Task 1) does not change the server's numbers;
  - a type the server applies does, once.
- [ ] **Step 2: run.** Expected: FAIL.
- [ ] **Step 3: implement.** `campaigns` = `[...raid().campaignIds(), ...campaignDayIds()]`. The AP is `raid().stageAp()` for
  raid stages, else `apWith(useAp, effects.apPower)`. Each effect in `SERVER_APPLIES` goes at its site. A type found to be
  display only (rare enemies: `userRandomEnemies` is always [] today) is listed but has no effect; Task 6 says so in the
  Notices.
- [ ] **Step 4: run** the new tests plus `test-raid-routes.js`, `test-clock-server.js` and `test-event-dates.js`. Expected:
  all OK.
- [ ] **Step 5: bench.** On a story day with a known AP 0 Bonus Time (pick one from the extract) the quest top shows AP 0 and
  the balloon, and AP is not charged. On a Lux day, the Lux in the result is doubled once (compare with the log). Screenshots
  go to `tmp\campaigns_bench\`.
- [ ] **Step 6: commit and push.**

### Task 6: Notices, docs, handoff

**Files:**
- Modify: `server/routes-info-album.js` (the Events notice: a «Bonus Times» paragraph)
- Modify: `docs/ISSUES.md` (a new row for Part 9a, with the I-number after the last one), `docs/notes/campaigns.md`,
  `HANDOFF.md`, `README.md` / `README.it.md` (only the phase D row if this part closes a line there)
- Test: `server/test-info-album.js` (or the existing notices test: assert the paragraph is present)

- [ ] **Step 1: write the failing notice test.** It checks that the Events notice contains «Bonus Times» and «whole day».
- [ ] **Step 2: write the paragraph.** It says:
  - the original Bonus Times return on the days of your story week;
  - each one is open for the whole original day (Pacific), where the original ran for an hour or two;
  - they come from the original campaign data, and the official notice wins where they differ;
  - raids keep their own Bonus Time;
  - rare-enemy campaigns are shown but have no effect yet (if Task 1 found that).
- [ ] **Step 3: run** the test (OK). Update `docs/notes/campaigns.md` (generator, module, day table) and the HANDOFF (extract
  path, revision, how to regenerate). Commit and push.
