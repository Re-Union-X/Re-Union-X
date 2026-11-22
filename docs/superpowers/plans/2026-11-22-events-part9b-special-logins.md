# Events Part 9b: special logins and monthly missions by story date — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The special login bonuses of 2016-2021 (blue «Welcome!» popup) are paid once each on the original days of the player's story week, and the monthly Limited missions follow the story month.

**Architecture:** A private extract dates every special `loginBonus` row of the donated 2021 master (1.1.3 rows, khuxwiki periods, notices, descriptions). A generator writes the rows to `loginBonus.json` and their windows to a server-only `login_specials.json`. `login-bonus.js claim()` gains the specials of the story day (`weekDateAt(storyCtx(), now)`, as the Bonus Times), recorded once per row in the save. The Limited monthly slot is chosen by the story month when that month has an original campaign, else by today's rotation.

**Tech Stack:** Node (server, plain `assert` tests), Python 3 `-I` for the private extract, PowerShell bench scripts.

**Spec:** `docs/superpowers/specs/2026-11-22-campaigns-design.md` (goals 3 and 4, «Special logins», «Monthly missions», builder calls «Monthly missions», «Celebration rewards», «Login rows without dates»).

## Global Constraints

- Order of trust: official notice > khuxwiki > donated master (after cross-check) > reconstruction.
- «A one-time login or campaign reward taken twice (replays of the same story week, new week on the same day)» is an anti-goal.
- «Invented values presented as original» is an anti-goal: every reconstructed value is labelled and declared in the Notices.
- Every id sent in `loginBonus.specials` must exist in the `loginBonus` master (a missing row crashes the client).
- Donated and SE data stay outside the public repo: the extract and its script live under `D:\Progetto_Restauro_KH_UX\private` / `tmp`; the generator reads them through a default path overridable by env, and writes nothing when the file is absent.
- Docs and commit messages in English; every non-original behaviour explained in the in-game Notices.
- After a master regen: bump `[int]$Revision` in `tools/ldplayer/session/{cycle,relogin,run-server,update-resources}.ps1` (UTF-8 BOM); current 352.
- Git: `export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*'`; commit and push every task.

## Decisions taken while planning (rulings, check them)

- **Total rows Day 1,900-3,200 are not served.** The 27 donor rows have ids 1000293-1000319 (outside the original 200-292 pattern) and the service ran about 1,870 days (2016-04-07 to 2021-05-31): they cannot be original. Our 93 rows already reach Day 1,850.
- **A special row = a window, paid once.** The 1.1.3 master gives the original model: `bonusType 4`, `day 0`, `startDate`/`endDate` (e.g. 312 «Celebrating the new KH 2.8 trailer!» 2016-06-16 11:00 → 06-23 10:59 UTC). A row is paid on the first login bonus claim whose story day falls in its window. A series whose description names a daily range («every day from Nov. 24 - Nov. 29!», 6 rows) gives one day to each row in id order; other rows of a series share the window (e.g. «Free Jewels & Medal!» = two rewards on the same days).
- **Type 3 «Newcomer Campaign» (311, «50 Jewels per Day»)** is paid once per story day inside its 1.1.3 window (2016-04-07 → 2016-04-14).
- **Census login campaigns with no donor row** (e.g. 2016 «Get Free Jewels!» 200 jewels) are reconstructed only when the notice gives the amount and both dates: own ids 700-799, title from the notice, labelled reconstructed in the Notices. The others are listed in the extract report and not served.
- **Celebration rewards** come only through the dated special rows (and the Conditional Present campaigns already served); celebrations whose reward is in neither stay out, counted in the report.
- **Login day vs story day.** The login bonus day still changes at 08:00 UTC (I-176); the story day of the specials is computed at the moment of the claim (Pacific weekday, as the Bonus Times). A special day missed in real life is lost, as in the original.
- **Monthly slot.** Counters keep the real month (`missionPeriod`); only the slot shown follows the story month. The end date shown stays the real month end.

## Review Focus

1. A save claimed in a story week that is replayed next real week (Shop week unchanged): the same special must not be paid again.
2. A special row whose reward id is missing from our master (medal, avatar part, Spirit part): the generator must drop it (popup icon crash), not serve it.
3. A save from before 9b (`player.loginBonus` without `specials`): the first claim works and pays only today's specials.
4. No Shop week yet (new player, `storyCtx()` without `shopFrom`): no specials, the daily/total bonus unchanged.
5. A story month before 2018-04 or after 2021-02: the monthly slot falls back to today's rotation (never empty).

---

### Task 1: Private extract of the special login windows

**Files:**
- Create: `D:\Progetto_Restauro_KH_UX\tmp\relux_verify\login_specials.py`
- Create: `D:\Progetto_Restauro_KH_UX\private\donations\relux_2026-11\verified\login_specials_2021.json`
- Modify: `D:\Progetto_Restauro_KH_UX\private\donations\relux_2026-11\verified\VERIFY.md` (section «Login specials»)

**Interfaces:**
- Produces: `login_specials_2021.json` = `{ "rows": [{ "loginBonusId": 312, "bonusType": 4, "title", "description", "comment", "rewardType", "rewardId", "rewardNum", "from": "2016-06-16", "to": "2016-06-22", "perDay": false, "source": "1.1.3" | "khuxwiki" | "notice 12345" | "description" | "manual: <reason>", "reconstructed": false }], "undated": [{ "loginBonusId", "title" }], "census": [{ "id": "EV-0007", "servedBy": [ids] | null, "why": "..." }] }`. `from`/`to` are Pacific days, inclusive. `perDay` true only for type 3.

Inputs: donor `Reddit Donators\ReLux Team\KHUX_pacchetto_18_11_2026\pkg\server_master\loginBonus.json` (bonusType 3/4, ids 311-621), `reference\login_bonus\loginBonus_1.1.3_decoded.json` (311-313 exact windows; UTC 11:00 = Pacific day start), `reference\login_bonus\khuxwiki_Login_Bonus.wikitext` («Login Bonus Period: MM/DD/YY - MM/DD/YY», matched by reward name), `private\events\sources\raid_census\work\notice_text.json` (post date + text; title or comment search), `private\events\sources\event_census\event_census.json` (CAMP-LOGIN rows).

- [ ] **Step 1: Write the script** (`python -I`, `sys.stdout.reconfigure(encoding='utf-8')`). Order per row: 1.1.3 window → khuxwiki period whose reward name matches the row's reward → notice whose text contains the row title or comment (period parsed from «Period», «from … - …», «until …»; a notice post date alone gives `from` only when the text says the bonus starts now) → dates in the row's `description` («from Nov. 24 - Nov. 29», year from the series neighbours) → `MANUAL` table in the script (one line per row, with the notice id or reason). Series: same title, ids in order; a daily-range description with N days and N rows → one day each. Prints counts per source and the undated rows.
- [ ] **Step 2: Run it**

Run: `python -I D:/Progetto_Restauro_KH_UX/tmp/relux_verify/login_specials.py`
Expected: every row of ids 311-621 either dated or in `undated`; 312 → 2016-06-16..2016-06-22, 313 → 2016-09-01..2016-09-30, 311 → 2016-04-07..2016-04-13 perDay; 659 «Sven Doll» series → 2018-12-25..2018-12-25 (khuxwiki 12/25/18 - 12/26/18 is the UTC end); no window outside 2016-04-07..2021-05-31.
- [ ] **Step 3: Cross-check 10 rows by hand** against their notices (2 per year), add a `MANUAL` line for every wrong match, re-run until they agree; write the counts, the 10 checks and the census coverage (29 rows: served by / reconstructed / not served and why) in VERIFY.md «Login specials».
- [ ] **Step 4: Commit** nothing public (private files); note the counts in the ledger.

### Task 2: Generator of the special rows

**Files:**
- Create: `server/make-login-specials.js`
- Create: `server/test-make-login-specials.js`
- Modify: `server/make-game-tables.js` (call right after `make-login-bonus` patch)

**Interfaces:**
- Consumes: the Task 1 extract (env `KHUX_LOGIN_SPECIALS`, default the private path).
- Produces: `buildSpecials(extract, ctx) -> { rows, windows, dropped }`; `patch(masterDir, file)`; `loginBonus.json` keeps rows with `bonusType` 1/2 and gains the special rows (`startDate '2016-04-07 00:00:00'`, `endDate '2099-12-31 23:59:59'`, `day 0`, the 14 fields of `make-login-bonus.js FIELDS`); server-only `master_data/login_specials.json` = `{ "<loginBonusId>": { "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "perDay": bool } }`. `ctx = { medalIds: Set, avatarPartIds: Set, petPartIds: Set }`.

- [ ] **Step 1: Write the failing test** `test-make-login-specials.js`:

```js
const ex = { rows: [
  { loginBonusId: 312, bonusType: 4, title: 'Celebrating the new KH 2.8 trailer!', description: 'Free HD Aqua Medal!', comment: 'x', rewardType: 3, rewardId: 23175, rewardNum: 1, from: '2016-06-16', to: '2016-06-22', perDay: false },
  { loginBonusId: 313, bonusType: 4, title: 'Back to school!', description: '1,000 free Jewels!', comment: 'y', rewardType: 2, rewardId: 0, rewardNum: 1000, from: '2016-09-01', to: '2016-09-30', perDay: false },
  { loginBonusId: 404, bonusType: 4, title: 'Special Gift!', description: 'Anna Snuggly', comment: 'z', rewardType: 20, rewardId: 999999, rewardNum: 1, from: '2019-02-25', to: '2019-02-28', perDay: false },
  { loginBonusId: 311, bonusType: 3, title: 'Newcomer Campaign', description: 'Receive 50 Jewels per Day!', comment: 'n', rewardType: 2, rewardId: 0, rewardNum: 50, from: '2016-04-07', to: '2016-04-13', perDay: true },
], undated: [{ loginBonusId: 500 }] };
const ctx = { medalIds: new Set([23175]), avatarPartIds: new Set([209123]), petPartIds: new Set() };
const out = buildSpecials(ex, ctx);
assert.deepStrictEqual(out.rows.map((r) => r.loginBonusId), [311, 312, 313], 'unknown avatar part dropped, id order');
assert.deepStrictEqual(out.windows['312'], { from: '2016-06-16', to: '2016-06-22', perDay: false });
assert.strictEqual(out.windows['311'].perDay, true);
assert.strictEqual(out.dropped.unknownReward, 1);
assert.strictEqual(out.rows[1].day, 0);
assert.strictEqual(out.rows[1].endDate, '2099-12-31 23:59:59');
// patch keeps Daily/Total rows and replaces old special rows (idempotent)
```

plus a `patch` round trip on a temp dir with a `loginBonus.json` holding one Daily, one Total and a stale special row: after two `patch` calls the file has Daily, Total and the 3 specials once; with the extract absent the specials are removed and `login_specials.json` is `{}`.

- [ ] **Step 2: Run it** — `node server/test-make-login-specials.js` — Expected: FAIL, `Cannot find module './make-login-specials'`.
- [ ] **Step 3: Implement `make-login-specials.js`.** Reward check by type: 3 medal ids, 20 avatar parts (`avatarParts.json` or the master table the server pays from: use the table `grantItem` type 20 relies on), 33 `petParts`; 2/40/41/42 always kept. Log `login specials: N rows, dropped {...}`.
- [ ] **Step 4: Run it** — Expected: `test-make-login-specials: OK`.
- [ ] **Step 5: Wire into make-game-tables.js** after the `make-login-bonus` patch; commit `feat(events): special login rows from the dated 2021 extract (Part 9b)`.

### Task 3: claim() pays the specials of the story day once

**Files:**
- Modify: `server/login-bonus.js`
- Modify: `server/test-login-bonus.js`

**Interfaces:**
- Consumes: `windows` from Task 2 (`{id: {from, to, perDay}}`).
- Produces: `claim(state, day, rows, opts = {}) -> { state, rewards, response }` with `opts = { storyDay: 'YYYY-MM-DD' | null, windows, force: number[] }`; `state.specials = { "<id>": "<storyDay of payment>" }` (perDay rows: key `"<id>@<storyDay>"`); `dueSpecials(state, storyDay, windows, rows, force) -> id[]`; each paid reward has `comment` = the row's `comment` and `special: id`. `response.specials` = the ids paid by this claim, in id order (ids of rows present in `rows` only).

- [ ] **Step 1: Write the failing tests** (append to test-login-bonus.js, with special rows 312/313/311 as in Task 2 and windows):
  - claim on storyDay '2016-06-18': rewards include `{type:3,id:23175,num:1}`, `response.specials` `[312]`, `state.specials['312'] === '2016-06-18'`.
  - the next real day, same storyDay '2016-06-18' (replayed week): no 312 reward, `specials: []` (Review Focus 1).
  - storyDay '2016-06-23': `specials: []` (after the window).
  - storyDay null (no Shop week): `specials: []`, Daily/Total unchanged (Review Focus 4).
  - state without `specials` (pre-9b save) on '2016-06-18': pays 312 once (Review Focus 3).
  - perDay 311: storyDay '2016-04-07' pays 50, '2016-04-08' pays 50 again, '2016-04-08' replayed pays nothing.
  - same day already claimed (`acquirable` false): no specials even with a due row.
  - `force: [313]` on storyDay null pays 313 once; a window id missing from `rows` is never listed.
- [ ] **Step 2: Run** `node server/test-login-bonus.js` — Expected: FAIL on the first new check.
- [ ] **Step 3: Implement** in login-bonus.js (specials only inside the `acquirable` branch; the response of a repeated same-day call lists the specials paid by the first call of that day: keep them in `state.lastSpecials`).
- [ ] **Step 4: Run** — Expected: `test-login-bonus: OK` (no other output).
- [ ] **Step 5: Commit** `feat(login-bonus): special login rewards of the story day, once each (Part 9b)`.

### Task 4: Server wiring, bench switch, popup bench

**Files:**
- Modify: `server/server.js` (`respondLoginBonus`, a `readLoginSpecials()` with mtime cache like `readCampaignDays()`)
- Modify: `tools/ldplayer/session/run-server.ps1`, `relogin.ps1` (param `-LoginSpecials '312,313'` → env `KHUX_LOGIN_SPECIAL_FORCE`)
- Modify: `server/test-login-bonus.js` (the existing route part, if it drives `respondLoginBonus`)

**Interfaces:**
- Consumes: Task 3 `claim(..., { storyDay, windows, force })`; `weekDateAt(storyCtx(), realNow())` from `calendar-util.js` (as `campaigns.js`).
- Produces: presents with the row's `comment`; log line `[login bonus] specials: 312 ...`.

- [ ] **Step 1: Failing route check** in test-login-bonus.js (or its route section): with a stub `login_specials.json` and a story week containing 2016-06-18, `respondLoginBonus` answers `specials: [312]` and adds a present with comment «Free KH 2.8 Trailer Celebration Medal». Run, expect FAIL.
- [ ] **Step 2: Implement** the wiring; storyDay errors (no week) → null. Run, expect OK.
- [ ] **Step 3: Regen the master** (command in the HANDOFF «Restarting» / 9a plan), bump revision 352 → 353 in the 4 scripts; check `loginBonus.json` row count and `login_specials.json` keys.
- [ ] **Step 4: Bench.** Copy save `org20` to `ls20` with `loginBonus.lastDay` null; `relogin.ps1 -Tag ls -Save ls20 -LoginSpecials '312,333,334,580'` (one medal, a two-row same-window pair, a daily series row). Expected: the blue «Welcome!» popup for each id with title, description and reward icon (compare with `reference\login_bonus\login_bonus_special_yt_03.jpg`), the presents in the Present Box with the row comments, a second relogin the same day with no popup. If the client crashes or shows nothing: `tombstone.ps1`, record the finding in docs/notes/home_profilo.md and stop the task for a ruling.
- [ ] **Step 5: Commit** server, scripts, revision; push.

### Task 5: Monthly Limited slot by story month

**Files:**
- Modify: `server/make-limited-missions.js` (rotation gains `monthlyMonths: ['2018-04', ...]` from the M-group periods)
- Modify: `server/limited_rotation.json` (regenerated)
- Modify: `server/server.js` (`limitedActive`, the monthly `endMs` in the mission rows)
- Modify: `server/test-limited.js`

**Interfaces:**
- Produces: pure `monthlySlot(storyDayIso, realMonthIndex, months) -> index` exported for tests (in `server.js` test exports or a small helper next to `limitedActive`): `months.indexOf(storyDayIso.slice(0, 7))` when ≥ 0, else `realMonthIndex % months.length`; `limitedActive` uses it for `kind 'monthly'`.

- [ ] **Step 1: Failing tests** in test-limited.js: `monthlySlot('2018-04-10', 7, M) === 0`; `('2021-02-27', 7, M) === 34`; `('2017-12-01', 7, M) === 7 % 35` (before the campaigns: rotation, Review Focus 5); `(null, 40, M) === 40 % 35`; regenerated rotation has `monthlyMonths.length === monthly.length` and `monthlyMonths[0] === '2018-04'`.
- [ ] **Step 2: Run** `node server/test-limited.js` — Expected: FAIL.
- [ ] **Step 3: Implement**; the monthly row `endDate` becomes the real month end (`clock.monthEndOf(mi)`) whatever the slot; run `node server/make-limited-missions.js` (writes rotation and mission tables; check the row count is unchanged).
- [ ] **Step 4: Run** test-limited.js and test-missions (if present) — Expected: OK.
- [ ] **Step 5: Bench** on `org20`: Missions → Limited shows the «[Monthly]» rows of the story month of the save (story week month from the server log), not the real-month rotation. Commit and push.

### Task 6: Notice, docs, ISSUES, HANDOFF

**Files:**
- Modify: `server/routes-info-album.js` (Events notice, section «## Special login bonuses»: counts from `login_specials.json` and the loginBonus master; whole-day rule; story day; reconstructed rows named; the Total Day 1,900+ rows not served and why; monthly missions follow the story month from April 2018)
- Modify: `server/test-notices.js`
- Modify: `docs/NOTICES.md`, `docs/notes/home_profilo.md` («Login bonus»: specials, popup bench result), `docs/notes/campaigns.md` (link), `ISSUES.md` (new row I-292 Part 9b, DONE when benched), `HANDOFF.md`, README phase D row if the part closes.

- [ ] **Step 1: Failing notice test**: the Events notice contains «Special login bonuses» and the served count from a stub `login_specials.json` with 3 rows («3 special login bonuses»). Run `node server/test-notices.js`, expect FAIL.
- [ ] **Step 2: Implement** `loginSpecialFacts(dir)` / `loginSpecialLines(f)` next to `bonusTimeFacts`; run, expect OK.
- [ ] **Step 3: Docs + full suite** `for f in server/test-*.js; do node $f; done` (known pre-existing failures: raid-routes «wiring», enemy-attack, enemy-mechanics, enemy-start-state, make-banners, make-special, medal-renumber, special-server, trait-medals, warrant-strip — name any other).
- [ ] **Step 4: Commit and push**; HANDOFF START HERE → 9c (Lux Boost).
