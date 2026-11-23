# Events Part 10d: social prizes, 0 AP days, EV-0085 VIP set — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pay the reached social-goal prizes in the Presents, confirm the notice-backed 0 AP days and serve the EV-0085
Cyber Week VIP set. With this, Part 10 is done.

**Architecture:** The social prizes become Conditional Present campaign rows (`server/campaign_gifts.json`) with a new
condition kind `date`. The 0 AP days are already in the Part 9a calendar: one task checks the end days against the notices
and records the result. The VIP set is one more week-limited VIP campaign (`special_periods.json` + private catalogue row).

**Tech Stack:** Node.js server (plain `check()` test scripts), private JSON data, PowerShell bench scripts.

**Spec:** [docs/superpowers/specs/2026-11-23-events-part10d-design.md](../specs/2026-11-23-events-part10d-design.md)

## Global Constraints

- No reward paid twice: EV-0254 (August 2017 retweets) stays paid only by login specials 333/334.
- A campaign opens when the Story Shop week reaches `start` and never closes (I-234); presents arrive once.
- Every non-original choice is declared in the Notices (memory: notices for deviations).
- Private data (`private\`, `tmp\`) is never committed; the public repo gets no notice texts copied verbatim beyond short
  paraphrases; docs and commits in English, commits as «Re-Union X».
- Before the regen: back up master_data, events.json, raids.json to `D:\Progetto_Restauro_KH_UX\tmp\master_bak_r364`; after
  it, revision 364 in `tools/ldplayer/session/{cycle,relogin,run-server,update-resources}.ps1`.

## Review Focus

- A save whose Story week is already past 2020-07 gets all 60 #ChirithyMini prizes at once: 60 presents of 200 Jewels,
  each with its own campaign name. Test in Task 1: the 62 social rows all open -> 62 `due` entries, each with exactly its
  own reward rows.
- A save that already received a social prize must not get it again after a server restart (state in
  `player.campaignGifts[id].units`). Test in Task 1: second `due` call returns nothing.
- A `date` campaign whose start is later than the Story week stays closed (`openCampaigns`). Test in Task 1.
- C22565 must not shift the frozen evStageIds of the other 120 campaigns (banner and quest ids follow evStageId). Test in
  Task 3.
- The last day of each 0 AP window: decided from the notice end time, not guessed (Task 2).

---

### Task 1: `date` condition kind + social prize rows + notice

**Files:**
- Modify: `server/campaign-gifts.js` (header comment kinds list; `earned()` switch)
- Modify: `server/campaign_gifts.json` (62 new rows)
- Modify: `server/routes-info-album.js` («Campaign Rewards» notice body)
- Test: `server/test-campaign-gifts.js`, `server/test-notices.js`

**Interfaces:**
- Produces: condition `{ "kind": "date" }` -> `earned()` returns `{ units: 1 }` (the campaign is only evaluated when open).

- [ ] **Step 1: Failing tests** in `server/test-campaign-gifts.js`, pure-rules section:
  - `date` kind: `comp(mk({ kind: 'date' }, [{ jewels: 200 }]))`, first `sent()` -> one row `{type:2,id:0,num:200}`,
    second `sent()` with the same `given` -> `[]`.
  - closed before start: `cg.openCampaigns(c, '2017-12-31', {})` with `start: '2018-01-28'` -> `[]`; with `'2018-01-28'` -> 1.
  - real-data section: `byId.get('follower80k-2017')` reward = Fantasia Mickey B 6★ + `{type:2,num:2000}`;
    `byId.get('halloween-rt-2017')` = `{type:2,num:3000}` + Fantasia Mickey B; 60 ids matching `/^chirithymini-/`, each
    reward exactly `[{"type":2,"id":0,"num":200}]`, starts strictly increasing; no id containing `retweet-2017-08`.
- [ ] **Step 2:** `node server/test-campaign-gifts.js` -> FAIL (`date` units 0, ids missing).
- [ ] **Step 3: Implement** `case 'date': return { units: 1 };` in `earned()`, plus the header line
  «- date: one unit once the campaign is open (social-goal prizes paid to every player on a date)».
- [ ] **Step 4: Rows** in `campaign_gifts.json`, after the 2017 rows in date order, `condition: {"kind": "date"}`:
  - `follower80k-2017`, notice 0 (X post), name «Twitter Follower Challenge: 80,000 followers», start `2017-05-05`,
    reward Fantasia Mickey B rare 6 num 1 + jewels 2000;
  - `halloween-rt-2017`, name «Halloween Screenshot Contest: retweet goals», start `2017-11-03`, reward jewels 3000 +
    Fantasia Mickey B rare 6 num 1;
  - `chirithymini-YYYY-MM-DD` × 60, name «#ChirithyMini quiz (Month D, YYYY)», start = episode Friday + 2 days (the
    Sunday the result was announced; builder's call), reward jewels 200. Episode Fridays: the 60 dates of the private
    `tmp\events\part10\social_goals.md` (the six «(?)» included).
  - Add `"source": "x"` on these rows and keep `notice` absent; check the `load`/`compile` path tolerates a row without
    `notice` (it is only used in the notes).
- [ ] **Step 5: Notice**: in `routes-info-album.js` «Campaign Rewards», add under «## The campaigns»:
  - '**Fantasia Mickey B and 2,000 Jewels**: the 80,000 followers goal of the official Twitter account (May 2017).'
  - '**3,000 Jewels and Fantasia Mickey B**: the retweet goals of the Halloween Screenshot Contest (November 2017).'
  - '**200 Jewels** for each **#ChirithyMini** Twitter quiz, every two weeks from January 2018 to July 2020 (60 quizzes): every goal was reached, so every player gets them.'
  and in the intro sentence add «or a goal reached by the players on Twitter». Test in `test-notices.js`: the body matches
  `/#ChirithyMini/` and `/80,000 followers/`.
- [ ] **Step 6:** `node server/test-campaign-gifts.js` and `node server/test-notices.js` -> OK.
- [ ] **Step 7: Commit** «Events Part 10d: social-goal prizes as date campaigns».

### Task 2: 0 AP days — check the end days, record

**Files:**
- Modify: `docs/notes/campaigns.md` (Part 9a section), `docs/notes/events.md`
- Private, only if a day must be added: the Part 9a calendar builder input (notice day list), never the donated file.

- [ ] **Step 1:** For notices 23537, 23798, 24842, 26485, 26837, 27764, 30118, read the end date and time from the private
  notice texts (`private\events\sources` / census notices). Calendar today covers each window except its last day
  (2016-12-26, 2017-01-09, 2017-02-13, 2017-04-03, 2017-05-15, 2017-07-18; EV-0150 fully covered).
- [ ] **Step 2:** Rule: if the notice ends before 12:00 PT of the last day, the day stays out (the story day is a whole
  day); otherwise add the day to the calendar's notice merge and regenerate in Task 4. Record the verdict per notice.
- [ ] **Step 3:** Script check against the served tables: for every day of the seven windows (as decided), `campaign_days.json`
  lists at least one evCampaign row with type 7, power 0 (Python one-liner as in the research of 23-11). Expected: all present.
- [ ] **Step 4: Docs**: in `docs/notes/campaigns.md` add «Notice-backed 0 AP days (Part 10d)»: the seven 2016-2017 0 AP
  notices are already merged by the Part 9a calendar; the slice D «holes» were an error of the census check; end days per
  the rule above; raids keep the weekend rule; VIP (Special) quests of EV-0150 are not covered (declared).
- [ ] **Step 5: Commit** «Events Part 10d: 0 AP notice days checked».

### Task 3: EV-0085 Cyber Week VIP set (C22565)

**Files:**
- Modify (private): `D:\Progetto_Restauro_KH_UX\private\events\special\special_quests.json` `vip_limited_campaigns_ww`:
  insert `{"id": "E22565-1", "notice": 22565, "date": "2016-11-21", "title": "HUGE Cyber Week Savings on Jewels!", "start": "2016-11-21", "end": "2016-12-05"}` between the rows of notices 21829 and 23990 (UTF-8, keep formatting).
- Modify: `server/special_periods.json` `campaigns`: `"C22565": {"evStageId": 7621, "banner": "Special - VIP Upgrade your Medals banner KHUX.png", "parts": [{"set": "chip-dale"}], "_note": "EV-0085 Cyber Week (Part 10d): VIP Upgrade + Daily Chip & Dale + VIP Skill via the WJE; Upgrade and Skill are the permanent VIP entries, the new content is the Chip & Dale challenge; two weeks; the Jewel sale is not served"}`
  after C21829.
- Modify: `server/make-special.js` comments «120 WW» -> «121 WW», «7501-7620» -> «7501-7621».
- Test: `server/test-special-periods.js` (count 118 -> 119 with banner), `server/test-make-special.js`.

- [ ] **Step 1: Failing test** in `test-special-periods.js`: `CAMP` has `C22565` with evStageId 7621 and parts
  `[{set:'chip-dale'}]`; count of campaigns with a banner 119; every other campaign keeps its evStageId (assert the
  evStageId of C21829 = 7505 and C23990 = 7506 unchanged).
- [ ] **Step 2:** `node server/test-special-periods.js` -> FAIL.
- [ ] **Step 3:** Edit `special_periods.json`, the private catalogue and the comments.
- [ ] **Step 4:** `node server/test-special-periods.js && node server/test-make-special.js && node server/test-special.js` -> OK.
  Then `node server/make-special.js` dry run is part of the Task 4 regen; check its log line lists 121 campaigns.
- [ ] **Step 5: Notices**: the Special notice line on week-limited VIP campaigns needs no change if it gives no count;
  if it says 120, make it 121 (grep `limited VIP campaigns` in `routes-info-album.js` / `special-pages.js`).
- [ ] **Step 6: Commit** «Events Part 10d: EV-0085 Cyber Week VIP set».

### Task 4: Regen, suite, bench, docs

**Files:**
- Modify: `tools/ldplayer/session/{cycle,relogin,run-server,update-resources}.ps1` (`[int]$Revision = 364`)
- Modify: `docs/notes/events.md`, `HANDOFF.md`, `README.md`, `README.it.md` (phase D row: Part 10 done, date 2026-11-23)

- [ ] **Step 1:** Back up master_data, `server/game_data/events.json`, `raids.json` to `tmp\master_bak_r364`.
- [ ] **Step 2:** Regen with the standard env (HANDOFF) into `tmp\events\part10\regen_10d.log`; check the log lines
  «special: … 121 campaigns» and «campaigns: … Bonus Time rows» (unchanged unless Task 2 added days).
- [ ] **Step 3:** Full server suite (`tmp\events\part10\suite.sh`) -> all OK.
- [ ] **Step 4:** Revision 364; `update-resources`; relogin `-Save p10g` (Story ~Q715, December 2017).
- [ ] **Step 5: Bench**: Present Box shows «Campaign: Twitter Follower Challenge…» (Fantasia Mickey B + 2,000 Jewels) and
  «Campaign: Halloween Screenshot Contest…» (3,000 Jewels + Fantasia Mickey B), no #ChirithyMini yet; Notices «Campaign
  Rewards» shows the new lines. The Special tab rotation for 2016-11 is not reachable from p10g: check C22565 in
  `game_data/special.json` (evStageId 7621, 5 Chip & Dale quests) instead.
- [ ] **Step 6: Docs**: `docs/notes/events.md` Part 10 status «done (10a-10d)»; HANDOFF top line (revision 364, Part 10
  closed, next step); README phase D rows.
- [ ] **Step 7: Commit + push** «Events Part 10d: regen r364, Part 10 done».
