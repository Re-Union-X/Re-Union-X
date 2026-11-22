# Events Part 10: the 2016-11..2018-03 events — design

Part 10 of the events design ([2026-11-06-events-design.md](2026-11-06-events-design.md), «The work, in parts» item 10).
Research of 22 November 2026: four slices, synthesis in the private `tmp\events\part10\SUMMARY.md` (slices A-D md/json,
`social_goals.md`).

## Intent

Serve the events of November 2016 to March 2018, the period the census called the «data hole», on the player's Story week
like every other event. The author's goal stays the same as for Parts 1-9: every original event that can be played, with the
original data wherever it survives, and every reconstruction declared in the Notices.

## What the research changed

The hole is a **schedule and map hole, not a quest hole**:

- The donated ReLux WW master (`server_master/stage.json`, untrusted) keeps the stage rows of almost every quest of the period:
  objectives with conditions and rewards, AP, `addLevel`, world, special rules. Ids were handed out in calendar order, so each
  khuxwiki run maps to one block (7 rows for a Daily Challenge, 16 for a Gauntlet). Donor and khuxwiki agree on 256 of 260
  paired quests in slice A and on every checked quest in B and C.
- Lost: the `evStage` rows (dates; the notices give them) and the map files of the WW-only ids (50xxxx, 700xxx).
- JP-origin ids (63xxx-67xxx) and the 7xxxxx ids from 2017-11 have the original JP 4.3.1 maps; their drop rows exist in the
  donor `reward.json` (the KH 3D drops reproduce the notice rarities exactly).
- Event boards of the coin events are complete in the donor `sphere` / `sphereArray` / `sphereMasu`.
- Every enemy and reward medal exists in our master or in the donor tables (no substitution needed).

Verdicts on the 68 quest rows (EQ / COIN / COLLAB / SPEC): A 16, B 46, C 2, D 4.

## Goals

1. **Quest events of the period** (verdict A and B, 62 rows) served from the donor stage rows, dated by the notices, on JP maps
   where they exist and on generated maps elsewhere. C rows served for the part that has data (WOFF EV-0121; EV-0236 only its
   free medal, through the login specials if a row exists, else not served).
2. **Two Daily Challenge runs without a census row** (#12 2017-01-02, #16 2017-02-13): added to the census and served.
3. **Seven CELEB rows that are quest events** (EV-0094, 0108, 0112, 0138, 0172, 0178, 0423).
4. **Three Damage Contests** (EV-0238, 0309, 0352) as score quests on the High Score code of Part 8 (rank brackets become
   score thresholds, as the ranked-rewards design says).
5. **Six Booster Challenges** (5 quests each, EV-0411 10) with their Booster emblem rows from the donor (Part 6 code).
6. **Event coins and boards** of the coin events of the period (EV-0074, 0090, 0121, 0153, 0240, 0256, 0289, Gauntlet
   boards Power / Speed / Magic Gem) on the Part 3 code.
7. **0 AP days announced by the notices** that the donated campaign calendar lacks (all of 2017-02 and days of 2016-12,
   2017-01, 03, 05, 07: EV-0093, 0110, 0129, 0150, 0168, 0197, 0230) added to the Part 9a calendar (rule «the notice wins»).
8. **Social-goal rewards** verified on X (all reached): 80k followers (Fantasia Mickey B + 2,000 Jewels, 2017-05), Halloween
   retweets (3,000 Jewels + Fantasia Mickey B, 2017-11-03), and the 60 bi-weekly #ChirithyMini quizzes 2018-01-26..2020-07-10
   (200 Jewels each). Paid through the Conditional Present campaigns (I-234: once, when the Story week reaches the payout date,
   never lost when the Story runs ahead), in the Presents, no popup. The August 2017 retweet goal is already paid (login specials
   333/334).
9. **EV-0085 Cyber Week VIP sets** (2016-11-21..12-05) added as one more VIP campaign if its data suffice.
10. **Census fixes**: EV-0391 not WW (dropped), EV-0265 a raid notice merged by mistake (dropped, same run as EV-0268), EV-0075
    merged into EV-0074, EV-0152 renamed and redated (Coliseum Challenge for Gems 03-06..03-12, notice 25838), EV-0090 quests
    from 11-25, five khuxwiki runs moved one week (Gauntlet #6 -> EV-0196, #7 -> EV-0211, DC #23 -> EV-0218, Gauntlet #8 ->
    EV-0242, #9 -> EV-0258).

## Non-goals

- The 21 Lux ranking weeks (Deluxe Solo and Party Ranking): they wait for a future Rankings area (author 22-11).
- Shop purchase campaigns, off-game contests without an all-player reward (events design).
- EV-0283 come-back quests (no data anywhere), EV-0166 purchase bonus.
- Gating the daily / weekly missions by their 2017-11-09 start: they stay, declared in the Notices (author 22-11).
- Medal storage cap by Story date: unchanged (author 22-11).

## Anti-goals

- An enemy replaced by another one (every missing enemy is imported from the donor or the quest is held).
- A generated map, a reconstructed time window or a drop rate presented as original.
- A reward paid twice (a social goal and a login special for the same payout; a coin board bought on two windows).
- Japan-only content served as WW.

## Decisions taken (author, 22-11)

- Generated maps for the WW-only quests, from the khuxwiki enemy lists, rooms and levels, with the Org XIII / Part 5 method;
  declared reconstructed.
- Drop rates of generated quests calibrated on the original KH 3D drop rows (event medals, materials).
- Special mechanics served in Part 10: Classic Goofy bonus hours, Classic Donald 12-hour windows (times never published:
  reconstructed and declared), the raid summons of EV-0117 (Eggcognito) and WOFF EV-0121 (Adventurer).
- **Everything open for the whole event (author 22-11):** the daily quests, the Gauntlet tiers (originally released Mon / Tue /
  Thu / Sat) and the date-unlocked sets (Challenge, Corridor of Darkness, Wonderland maze) are all listed for the whole event
  period, as the 2018-2021 events (ruling of 6 Nov); the original release days are named in the Notices.
- **WOFF EV-0121 (author 22-11):** first look for the missing enemies (JP twin maps, donor rows, footage) before deciding;
  research running (`tmp\events\part10\woff\WOFF.md`).
- Damage Contests, Booster Challenges and the CELEB quest events are in Part 10.
- 0 AP days from the notices added to the calendar.
- Social-goal prizes paid (verified on X).
- Lux ranking weeks deferred; missions kept before 2017-11-09; storage cap unchanged; EV-0085 VIP set added if possible.

## Approaches considered

- **A. Extend the Part 4 challenge pipeline — chosen (builder's call).** The private `build_challenge.py` already turns census
  rows + donor stage rows + khuxwiki pages into event records (`tmp\events\records\*.json`) that `make-events.js` serves, with the
  JP-map import (`import_event_stages.py`) and the generated maps (`gen_story_maps.py`, `event_gen_maps.json`) of Part 5. Part
  10 adds a selection for 2016-11..2018-03, the donor id-block matcher (run -> block), dates from the notices, and the record
  fields for the new mechanics. One pipeline, the same checks (WW enemy check, map coverage, objective conflicts I-251).
- **B. A separate builder for the period.** Cleaner start, but it would repeat the enemy check, map import and record shape.
- **C. Hand-written records.** Only reasonable for the few one-off events; does not scale to 62 rows.

## Design

### Data (private, `tmp\events\part10` and `tmp\events\records`)

- **Block matcher**: census row -> khuxwiki run -> donor stage id block, by calendar order and objective agreement; conflicts
  listed (I-251 rule: donor AP wins where khuxwiki footnotes a 0 AP campaign).
- **Dates** from the notices (evStage windows: Pacific days; daily quests one day each; Gauntlet tier release days).
- **Maps**: JP-id quests import the JP 4.3.1 map (level shift where the WW level differs, as Daily Challenge #23 «Evade!»
  JP twins 708110..708170 with levels 25 vs 100); WW-only quests get generated maps (khuxwiki enemy list with the
  `{{tar|X|1}}<br>{{e|X|4}}` parser fix, rooms of the run, level from `addLevel` / khuxwiki notes). The Wonderland maze
  wrong-path rooms (7 maps lack the room with 7 Possessors) and the EV-0410 rounds 1-4 (round-5 map of the same attribute, an
  inference) are labelled.
- **Imports from the donor** (with the cross-check rule of the events design): enemies 16072001, 160710140, 10129, 11035, 11574,
  11575, 180311575, 1027, 18011505, 18011523, 18011541, Large Fireworks; Booster emblem rows (1710xx, 1712004-006, 1801xx,
  1802xx, 1803xxx); Boosted Classic Donald / Maleficent B (123186/7, 123256/7); title 12185 «Record Keeper»; medal ids 90135 ->
  300948, 90136 -> 300913 (the 2021 -> ours mapping of Part 9b).
- **Boards** of the coin events from the donor sphere tables (one-day boards in id order, declared).
- **Social rewards** as Conditional Present campaign rows (`campaign_gifts.json`), dated by the X posts (`social_goals.md`).
- **0 AP days** as notice kinds in the Part 9a campaign calendar.

### Server

- No new route expected: `make-events.js` serves the records (calendar, Event Catalog, cards, notices), Part 3 coins and boards,
  Part 6 Boosters, Part 8 score quests, Part 9 calendar and presents.
- New record features, each with its own tests: time windows inside a day (Classic Donald, Classic Goofy bonus hours), raid
  summon of a quest (the Part 4 Surprise / raid spawn code where it fits). No date unlocks or tier gates (everything open).

### Notices

- «Events» section for the 2016-2018 events: counts, generated maps, reconstructed windows and drop rates, the social prizes
  (Twitter challenges, paid once in the Presents), the missions shown before their 2017-11 start.

## Order of work (proposed sub-parts)

1. **10a**: census fixes, block matcher, records for the A rows on JP maps (Maleficent, Tag Team, Coliseum One-on-One, KH 3D,
   FFRK, Boss Time Attack, Time Attack, Consecutive Battle, 6M present quests), imports; bench.
2. **10b**: generated maps for the B rows (Daily Challenges, Gauntlets, Super Challenges, Corridor, maze), drop calibration;
   coin events and boards.
3. **10c**: special mechanics (Classic Goofy / Donald windows, raid summons), Damage Contests,
   Booster Challenges, CELEB quest events.
4. **10d**: social prizes, 0 AP days, EV-0085 VIP set, notices, docs.

## Builder check (22-11): calls made while writing

- **Coin events EV-0099 (Santa Sora, boards 2310030-032, 10 khuxwiki quests), EV-0125 (HD Aqua, boards 2310036-037) and
  EV-0087 (Moana Board 1 = board 1 of EV-0090) are in scope (builder's call)**: slice D handed them to the coin events; they
  join goal 6 in 10b. EV-0094 (Christmas Sora) and EV-0099 are merged only if their notices and quests prove the same run.
- **Raid summons (builder's call).** Eggcognito and Adventurer are already served raid bosses (`raids.json`, `raidEnemy`): the
  summon reuses a served raid row of the same boss whose HP is original for that period; without one, the quest is served without
  the summon and the Notices say so (raids goal: original HP only, nothing invented).
- **JP map vs khuxwiki (builder's call, the Part 4 WW enemy check).** The Wonderland maze rooms missing from 7 JP maps and the
  one-enemy differences of Maleficent Pt. 9 / Pt. 11 and Legendary follow the existing check: `agree` / `confirmed` served, a
  difference without a cited rule held (`heldBack`), listed in the Event Catalog.
- **Rooms with no known code (builder's call).** A quest whose room has no code (The Beast's Room, EV-0193 day 4) is held, never
  moved to another room. «Castle: Terrace» (EV-0214) uses its JP map; its Magic Broom 5★ reward is donor 90135 = our 300948.

## Left to the builder

- The exact record fields for windows, unlocks and tiers; id ranges of new evStage rows; how a generated map places enemies.
- The reconstructed Classic Donald window times (to declare); drop rates beyond the KH 3D calibration.
- Whether EV-0236's free medal has a login special row; EV-0085 data sufficiency.
