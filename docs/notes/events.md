# Events (non-raid event quests): what the client needs

Status: mapping done 6 November 2026 (Events Part 1, Task 1). Read-only: the 4.3.1 master types (`recon/out/master_types_ww431.json`),
our notes, the private client notes and a donated Worldwide master snapshot of 2021 (untrusted, read only, no row copied here).
Raids are already served through the same Events tab, see [raid.md](raid.md); this note covers what a quest event needs **beyond** a raid.
Anything not proven on the bench is marked **(unverified)**. Design: `docs/superpowers/specs/2026-11-06-events-design.md`.

## How an event reaches the screen

- The Events tab sends `GET /stage/event` with `eventCategory` 2 (Special is 1; no other value was ever seen from the 4.3.1 client).
  The reply is built by the server (`events[]`, each with `stages[]`, `eventStageId`, `showIcon`, `bannerUrl`, `eventType`, `status`,
  `endTime`, `newStageId`, `isLock`, `complete`; see [server.md](server.md#eventi)). The list is not filtered by master category, time or weekday.
- Every `eventStageId` listed (and every stage in it) must exist in the master `evStage` / `stage` tables, or the client crashes.
  The event list banner opens the quest list of the event; `/stage/start` carries `eventId` = the `eventStageId`.
- A master table that breaks the schema is dropped as a whole ([raid.md](raid.md), «evStage rows and the client's master»):
  `evStage.stageId` is `int[5]`, so one row with more than 5 stage ids kills the table. Rule from the raids: keep the first 5 ids and put the
  full range in `stageStartId` / `stageEndId` (the server lists the stages itself).

## `evStage` fields (one row per event, or per day of a daily event)

All fields are mandatory in the master. What a non-raid quest event sets:

| Field | Raid rows | Quest events (pilot rows of the donated 2021 master) |
|---|---|---|
| `eventCategory` | 2 | 2, 3 or 4 in the donor (3 = most quest events, 4 = High Score). The client never filters by it in the list; **on tap, 4 selects the High Score mode, anything else is a plain quest list** (bench 30-10). So our rows keep 2 except High Score (4) |
| `eventType` | 2 (raid button, Raid Boards: raids only), 0 (catalog banner), our events: the donor value (07-11) | 1 on most quest events (daily, coins, quiz, Org XIII, time attack), 3 on the countdown dailies, High Score, the keyblade and the character-return events, **(unverified)** what the client does with 1 and 3 (the 30-10 note says 1/2/4 are board/raid modes: check on the bench before relying on it) |
| `validStageId`, `stageId[5]` | count and first 5 ids | same; with more than 5 stages the donor uses `validStageId` 0 and the range |
| `stageStartId`, `stageEndId` | first and last stage | same; the range is contiguous in stage ids but not in every id between |
| `validStageWidthId` | 0 | 1 on range rows (the donor), meaning «use the range» **(unverified)**; 0 on a one-stage daily row |
| `parentEventStageId` | 0 | a shared parent id on later events (grouping under an earlier event row); 0 on the earliest. The client use is not known **(unverified)**; the server can leave 0 |
| `resetFlag` | 0 | 1 on most of the pilot rows (progress reset), 0 on COIN and on the daily countdown. Client effect **(unverified)** |
| `startTime`, `endTime`, `endDispTime`, `boardEndTime` | all must parse as dates | `startTime`/`endTime` in the original period; `boardEndTime` equals `endTime` on all pilot rows (1 hour after the end only on raid rows); `endDispTime` is a sentinel (a year-2015 date) on 1,013 of 3,103 donor rows |
| `weekMonday`..`weekSunday`, `benefit*` | all 1, all 0 | all 1, benefit 0 on the pilot; the client never reads them (bench 30-10) |
| `scoreMedalListId`, `scoreStartReward`, `scoreEndReward`, `rankingId` | 0 | set only on the High Score row (a medal list id and three reward/ranking ids) |
| `mypageBanner` | 0 | a banner id (per family: 5500, 5600, 5700...) |
| `bannerUrl`, `detailUrl` | ours | `detailUrl` not empty gives the banner a Details button (WebView, no `?` in the URL) |
| `groupPattern`, `validMinute` | 0 | 0 on **every** one of the 3,103 donor rows: the client has no time-window use we need. A window shorter than a day (e.g. 45 minutes) is expressed by `startTime` / `endTime` only |
| `benefitId` | 0 | 0 on all pilot rows (100 on 89 other donor rows: campaigns) |

Time zone: the donor rows start at 07:00:00 (midnight Pacific in summer) and end at 06:59:59; the daily rows run 07:00 to 06:59:59 of the next day.
A daily event is **one `evStage` row per day**, each with one stage (the pilot countdown has 6 rows for 3 names).

## `stage` fields an event quest uses

Same row shape as a raid fight stage ([raid.md](raid.md), «Fight stages»), `stageKind` 2. What the pilot sets beyond that:

- **Cost**: `useAp` (5 on the pilot rows; the cost of an event stage is changed by `evCampaign`, as for raids).
- **Continue**: `disableContinue` 1 forbids continue (popup text 103000017, as on Proud). Set on High Score and the Org XIII challenge.
- **Level add**: `addLevel` (+N to the enemy level; the client adds it to the map's enemy levels, also on the event card TARGET panel: bench 23-11-2026). Set on boss-style quests (Titan, Shiva, Ramuh: 499 / 1999 / 4999).
- **Keyblade held**: `holdKeyblade` = a keyblade **series id**; without it the popup says «You need this Keyblade» and Start is disabled (no crash), see [mappe_storia.md](mappe_storia.md). The pilot COIN event uses series 1000..10000 (five stages).
- **Conditions**: `hardmodeRequire` (+ `hardmodeName`, `hardmodeComparison`, `hardmodeNum`): the codes are those of the Proud conditions (2 attribute, 3 darklight, 5 rarity, 6 guilt tier, 7 level, 8 STR, 9 DEF ...). Values on the pilot: 0 and 1 (no limit) on most, 10 on the Titan and Shiva hard stages. This is where an **attribute** restriction lives. **Deck cost** has no field in `stage`: the player's deck cost is checked by the client against `maxDeckCost` of the user data (`/stage/start`).
- **Turn limit, time limit, no-continue, chests, keyblade**: not stage fields but **objectives** (`submission*`). The codes seen on the pilot are the ones `make-story-oltre.js` already knows: 3 defeat N enemies, 4 defeat an enemy N times (id type 1), 5 / 6 special attacks at least / at most, 7 turn limit, 8 battle limit, 9 no damage, 10 no continue, 12 defeat the target in N turns, 13 single-hit damage, 17 chests, 25 equip a keyblade (id type 5), 28 clear in 1 turn, 29 Lux, 32 hits at most, 33 hits at least, 37 time limit in seconds. `combinedSubmissionFlag` 1 (all together) on the countdown, quiz and Egg Hunt.
- **Objective rewards**: `submissionRewardType` / `submissionItemId` / `submissionItemNum` with `validSubmission` 3. Reward types seen: 3 medal, 7, 15 Event Coins, 26, 28 Skip Ticket+, 33 Spirit part, 40. 15 is **not paid** on event quests until the event boards exist ([bacheche.md](bacheche.md)); never as Raid Coins (see «Calendar and routes»).
- **First-clear reward**: `validClearGetItem` with `clearGetItemType/Id/Num`: **0 on all 16 pilot events** (19 of 3,852 event-range donor stages have one; `validClearGetSphere`, `validClearGetTitle` never). So a quest event pays only through its objectives.
- **Drama**: `validBeforeDrama` / `validAfterDrama` set on the Quiz (every stage), the Dark-Winged and New Friend events: the dialogue ids point at drama files (**unverified**: whether our resources have them).
- **Map**: `stageBinId` 0 on most pilot rows; the quiz sets bins 740260-740262. The client loads `mappoi_stg<stageBinId>`, or `mappoi_stg<stageId>` when the bin is 0; the donor `mapName` is a placeholder («...»).
- **Boss**: `raidBoss` is a `raidSetting` id of the 2016 table (2000 = Behemoth ...). The client does not dereference it from a story or event row ([raid.md](raid.md), audit): our event stages should set 0.
- Music: `bgmField`, `bgmBattle`, `bgmBoss` ids per world.

## The 16 pilot events

Rows (census id, family, period, `evStage` rows, stages, notable fields). All are in category 2, 3 or 4 of the donor, none is in our master (no `stage` or `evStage` row), and none sets a first-clear reward.

| Census | Family | Period | evStage / stages | Notes |
|---|---|---|---|---|
| EV-0753 | CELEB | 04-01..04-07 | 6 / 6 | daily, one row per day, type 3, 3 objectives incl. chests/no-continue, combined |
| EV-0759 | COIN | 04-02..05-01 | 1 / 3 | `holdKeyblade` objective (equip a keyblade, id type 5), turn limit, no-continue; reward type 15 |
| EV-0760 | EQ | 04-04..04-14 | 1 / 10 | `addLevel` 99..1499, turn-limit objectives, parent row |
| EV-0761 | CELEB | 04-07..04-10 | 3 / 3 | daily, no-continue only |
| EV-0763 | QUIZ | 04-07..05-01 | 1 / 10 | before/after drama on the stages, combined objectives, own `stageBinId` |
| EV-0764 | CELEB | 04-07..04-14 | 1 / 12 | 12 stages, "defeat all within 1 turn" |
| EV-0765 | EQ | 04-07..04-15 | 1 / 3 | Beginner/Intermediate/Advanced: `addLevel` 499/1999/4999, `hardmodeRequire` 10 on the hard tier |
| EV-0771 | HSC | 04-12..04-19 | 1 / 1 | **category 4**, `scoreMedalListId`, `scoreStartReward`, `scoreEndReward`, `rankingId`, `disableContinue` 1, objectives on defeats, specials, Lux |
| EV-0772 | CELEB | 04-14..04-21 | 1 / 25 | story-style, drama, mixed objectives, many maps |
| EV-0774 | COIN | 04-14..04-24 | 1 / 5 | `holdKeyblade` 1000..10000, `addLevel` 999..1999, `hardmodeRequire` 1 |
| EV-0775 | EQ | 04-15..05-01 | 1 / 4 | time-limit objectives (code 37), `addLevel` 1999 |
| EV-0776 | EQ | 04-15..04-22 | 1 / 3 | as the Titan layout |
| EV-0777 | CELEB | 04-15..04-22 | 1 / 5 | defeat-an-enemy-N-times objectives (id type 1), combined |
| EV-0781 | STORY | 04-20..05-01 | 1 / 12 | `disableContinue` 1, `addLevel` 499..4999 |
| EV-0783 | KEY | 04-21..04-28 | 1 / 34 | 34 stages over several days, equip-a-keyblade objective, drama; more than 5 stages so range |
| EV-0784 | EQ | 04-22..05-01 | 1 / 3 | as the Titan layout |

**Values our master does not have** (all of them, for the 16 events): the `evStage` and `stage` rows themselves; the `raidBoss` settings they name; the
maps in our own WW resources (`stage_gen` holds none of the pilot map keys). The stage tables do not name enemies or drops: those come from the map files
(`mappoi_stg<key>*.bin`) and the `enemy` / `reward` tables.

**Map presence in the Japan 4.3.1 data** (re-derived 6 Nov; this replaces an earlier claim from the census field `maps_in_jp431`, which counted the single
value 0 of `stageBinId` and so understated it). Key per stage = `stageBinId`, or the stage id itself when `stageBinId` is 0 (the client loads
`mappoi_stg<key>`, see [mappe_storia.md](mappe_storia.md)). Stages / keys found in the JP 4.3.1 `stage/` folder / missing: EV-0753 6/6/0, EV-0759 3/3/0,
EV-0760 10/10/0, EV-0761 3/3/0, EV-0763 10/10/0 (own bins), EV-0764 12/12/0, EV-0765 3/3/0, EV-0771 1/1/0, EV-0772 25/25/0 (15 own bins), EV-0774 5/5/0,
EV-0775 4/4/0, EV-0776 3/3/0, EV-0777 5/5/0, EV-0781 12/12/0, EV-0783 34/34/0, EV-0784 3/3/0: **120 of 120 pilot stages have a map file**.
**Unverified**: that each file is the same quest content as the Worldwide event (the donor stage ids equal the JP file keys, but the JP and WW versions of a
quest can differ in enemies and drops), and that the file loads on the WW client (checked only by name, not opened). Per-stage ids stay in the private notes.

## Id ranges

Checked on our master (`server/master_data`, 6 Nov 2026):

- `stageId` and `eventStageId` are `int` in the types, and the server validates `int` as signed 32-bit (-2147483648..2147483647). The donor's largest stage id is 201,609,281, also in range.
- `evStage` ids used: 7000-7999 (Special), 8000-8999 (raids and the Raid Catalog). **20000-29999 is free** in `evStage` (the donor uses 200xxx-210xxx and 9100, no collision with 20000+r).
- `stage` ids used: 1010-39159 (story), 970000-989999 (Special, raids), 1000000-1039159 (Proud and its copies). **4,000,000-4,006,500 is free** in `stage` and in every table with a stage-id column (`evCampaign`, `theater`, `colosseumStage`, `multi*`: none above 1,039,159). Other id spaces of the raids (raidEnemy 2,000,000+, boards 3,000,000+, raidReward 200,000,000+) are different tables.
- Proposal confirmed: `evStage` 20000 + r (r = event row index, room for 10,000 rows) and `stage` 4000000 + n (room for the ~6,500 stages of the census, 4,000,000 to 4,009,999 in all). The two key spaces do not clash: the server must not look up an `eventId` in the stage table or the reverse.

## Open points for the next tasks

1. What `eventType` 1 and 3 do on the tap (board button? plain list?). Plan: serve 1 and check the quest list on the bench; if a raid-style button appears, use a different value.
2. Whether `parentEventStageId`, `resetFlag`, `validStageWidthId` have any client effect; start with the donor's values.
3. Daily events as several `evStage` rows: confirm `/stage/event` lists only the day's row (server decision, not client).
4. Drama ids of each pilot event: found/missing per event goes into the data, not into this note. Maps: the JP files exist for all 120 pilot stages; compare their enemies and drops with the WW quests before serving.
5. `eventCategory` 4 for High Score rows: confirm the tap opens the High Score mode with a stage row of `disableContinue` 1.
6. Reward type 15 (Event Coins) is not paid on event quests until the event boards exist (Task 4; the raids keep paying their own coin
   tables as before).
7. Event card images: made by Task 6 (see «Cards and maps» below); served once the user approves them.
8. Event map POI and reward rows: written by make-events.js in the master run (Task 6, see «Cards and maps» below).

## Calendar and routes (Events Part 1, Task 4: tests only, bench pending)

- **Index**: `server/game_data/events.json` (make-events.js), read once by `server.js` (`KHUX_EVENT_INDEX` overrides the path for tests);
  absent: the Events tab lists only the raids.
- **Order of the Events tab** (`/stage/event` category 2, `server/events-tab-order.js`, user 10-11-2026): Raid Catalog banner, Event
  Catalog banner, kept raid, kept event, then the week's raids (routes-raid.js) and the week's events (`routes-events.js`), then
  `save/event.json` (bench only). A kept card is recognised by its `-kept` banner copy.
- **Which events are listed** (`event-calendar.js`, the Shop week `shopFrom` / `shopTo` of `storyCtx()`, as the raids): every entry with an
  `evStage` row whose dates overlap the week, all of them (an event of three weeks stays three real weeks; no largest-overlap rule as for
  the weekly raids), with its served quests only. A short-window event (`days`) opens on the real weekday (Pacific) of its day inside the
  Shop week, all day, closed the day after; a quest with `days` of its own only on them. A daily event (one quest per original day,
  24 h windows, no `days`) is listed with every served quest for its whole period: no weekday restriction (ruling of 6 Nov).
- **Card**: `bannerUrl` `/web/event/img/v<EVENT_IMG_VERSION>/<evStageId>.png` (`event_config.json` `imgVersion`, the value of the evStage rows),
  `eventType` of `event_config.json` (2), `endTime` the end of the real day for a short-window event, else of the real week; `useAp` the quest's;
  crown as the Special tab (objectives 1..min(3, `validSubmission`)).
- **Rewards** (`onStageClear`, from `/stage/clear`): first-clear items once per quest (first entry in `player.events.cleared`), each objective
  reward once; type 15 (Event Coins) never paid, only logged. `server.js` skips its own first-clear and objective payment for stage ids
  4,000,000-4,009,999. Drops: the usual path, on every clear, through the POI of the quest's map key (`poiStageId`: `stageBinId`).
- **Save**: `player.events = {kept: censusId | null, cleared: {stageId: [missionIds]}}`, created at the first clear or keep; listing never
  writes it. `keep(evStageId)` / `unkeep()` / `catalogCtx()` (shared `rowState` of `calendar-util.js`: only a past event can be kept) are
  ready for the Event Catalog (Task 5); the kept event is listed first with the `-kept` card, a short-window one on the real weekday of its days.

## Cards and maps (Events Part 1, Task 6: files staged, nothing served)

- **Cards**: `recon/tools/make_event_banners.py --fetch` downloads the banner image of each entry's own notice (`noticeIds`; the notice
  list of `reference\banners\notices.json`, first image key that is not the shared page header) into a private folder, one request every
  2 s, cached, giving up after two failures; without `--fetch` it writes the 640x140 cards `server/game_data/event_img/<evStageId>.png`.
  `make_special_banners.py --section event` then writes the Event Catalog banner (`catalogEvStage` 20000) and a «KEPT EVENT» copy of
  every card. The Event Catalog banner has its own design, never the Raid Catalog layout (user, 6 Nov): cyan to green background, the
  game's Event Coin icon as emblem, a large white «EVENT CATALOG», the subtitle and the small TRAINING sticker. The KEPT tab is at the
  top left, or at the top right for the cards listed in `event_config.json` `keptTab` (the Quiz card, whose top left holds art).
  After a change: bump `imgVersion` in `event_config.json`.
- **Maps** are the original JP 4.3.1 files, not generated: `recon/tools/import_event_stages.py` reads `event_maps.json` (every candidate
  event stage, served or held back for its map; `key` = the stage row's `stageBinId`), takes `mappoi_stg<key>.bin` + `_NN.bin` (highest
  JP revision) and copies them under the same names (the client loads `mappoi_stg<stageBinId>`: the stage id 4,000,000+n is never in a
  file name). A stage is left out when its STG or a part is absent, a room is not served, or a map enemy is not in the master.
  Output `stage_gen\event_stages\` (`stage\`, `stage_poi_events.json`, `report.json`); `--stage-dir stage_gen\files\stage` copies the
  files into the resource staging. `gen_story_maps.py` is not used for event quests.
- **WW enemy on two maps** (user, 6 Nov: «they must have the WW enemy»): `event_config.json` `mapEnemySwaps` names, per map key, an
  enemy id of the JP map and the WW enemy of our master that replaces it (Dark-Winged Warrior - 7/12: Gummi Hammer -> Morning Star;
  Agrabah Mission #2: Bag O' Coal -> Bag O' Jewels). The import tool changes only that id in the enemy records of its copy (position,
  count, level, drop slot and uid stay; the JP files are never changed); make-events.js swaps the same id in the quest and labels it
  `wwEnemy`. A WW enemy missing from the master leaves the quest unserved (no substitute).
- **Serving rule** (make-events.js, master run): a quest is served only when the import report says its map is `imported`
  (else `why: "map not usable: <status>, <reason>"`), and every reward id of its map is in the master or in the record's original drop
  rows (else `why: "reward rows missing: <ids>"`). make-events.js writes those reward rows with the original contents and odds and
  merges the POI of the served maps into `server/game_data/stage_poi.json` in the same run, so POI and reward rows land together
  (`events.json` `own.reward` / `own.poi`; the next run drops them first). `make-game-tables.js` leaves those POI keys and reward ids
  out of its own generic reward rows. The import report is read from `D:\Progetto_Restauro_KH_UX\stage_gen\event_stages`
  (`KHUX_EVENT_MAPS` overrides it); without it no event quest is served.
- If `stage_poi.json` is regenerated with `stage_poi.py`, the next master run puts the event keys back (make-events.js).

## Bench of the pilot (Events Part 1, Task 7, 6 November 2026)

Resources **106** (a full version: the 16 approved event enemy families are in the static `enemy_gen` pack, which `-Quick` never rebuilds),
master **rev 277**, built with `KHUX_EVENT_ENEMIES=1`. The server log shows 106 valid tables (as before) and no `evStage` line.
Master: +44 event enemy rows; 5 events and 49 quests served.
Save `events1`: `maxpower` without the story clears above Q850 and without `gacha.rot`, so the first login gives the Shop week
2019-04-04..04-10. Screenshots are in `D:\Progetto_Restauro_KH_UX\screenshots\`.

- `events1_tab`, `events1_tab2`, `events1_tab3` (Events tab), in this order:
  - Raid Catalog and Event Catalog: the new full-colour cards display correctly;
  - the save's kept raid, then the weekly raid;
  - Countdown, Daily Event and Dark-Winged Warrior, the three pilot events of the week.
- `events1_details`, `events1_details2`: the Details of an event show «On this server» and the original notice.
- `events1_quests`: the Dark-Winged Warrior quest list (Powerwild LV 100, AP 5, served quests only).
- `events1_catalog`, `events1_catalog_event`, `events1_catalog_event2`: the Event Catalog, with its row states, «Not restored yet» rows and
  «Not served yet» quests with their reasons.
- `events1_special`: the Special Catalog card.
- One real week later (`relogin -Save events1 -RealNow 2026-11-10T20:00:00Z`, Shop week 04-11..04-17):
  - `events1_w2_catalog`: «Past event — can be kept»;
  - `events1_keep`: Keep;
  - `events1_kept`: the KEPT EVENT card in the tab.

Open points:
1. The quest list of an event shows the Raid Boards button (`eventType` 2 of `event_config.json`). **Raid spawns from event quests,
   decided 07-11 by the author: none, by default.** Research (private `events/sources/EVENT_RAID_SPAWNS.md`): notice 49535 ends raid
   spawns outside raid events from 2019-01-24 00:00 PT, and khuxwiki `raid=` (2750 event quest pages) stops at that date; before it, event
   quests did spawn (Behemoth / Behemoth Ω from the January 2017 events). The April 2019 re-runs of the pilot fall after it, so «no spawn»
   is original for them; for 2016-2018 runs it is a declared simplification (all events are served as re-runs on the same rule). The
   server already behaves this way (event quests add nothing to the raid counter). **Raid Boards button: not original on non-raid events,
   fixed 07-11 (rev 278).** Frames of original videos (private `reference/event_quest_screen/sources.md`: JP 2017-01 cup event, WW
   2018-04 Hidden Menace, 2018-09 Dark-Winged Warrior 12/12 (4:3, probable), 2019-09 Defeat Titan) show nothing at the top right of a
   non-raid event's quest list; raid events (JP 2017-01, WW 2018-01) show «Raid Boards», and «Event Coins Galore!» (2019-08) shows
   «Event Boards». In the client, `/stage/event` `eventType` 2 is the raid mode that builds `AdventureTop2_Raid_Button`. make-events now
   writes the donor eventType per entry (pilot: 3, the Daily Event 1; fallback `event_config.json` eventType 1, never 2) into the
   evStage row and the index, and routes-events serves it. Bench (rev 278, `events1_dww_list_no_raid_button`): no button on Dark-Winged
   Warrior (type 3), the quest still starts and clears. Not benched: a type 1 list (the Daily Event is not in the 04-11..17 week), and
   which value maps to «Event Boards» (needed with the Event Coin boards, Part 2+).
2. ~~The quest counter says «1/12» on an event with 9 served quests.~~ Not a bug (07-11): «1/12» is part of the original quest NAME
   («Dark-Winged Warrior - 1/12», donor row and khuxwiki alike), the client shows no counter.
3. ~~«Complete without having to continue» twice.~~ Original (07-11): the donor row has objectives [28, 10, 10] and khuxwiki DWW 1/12 lists
   obj 2 and obj 3 with that same text (rewards Huey 5★ and Moogle 6★).
4. The Details page says «the reasons are with the quests below», but the Details view has no quest table; the catalog page has one.
5. The Story progress on the Quests menu reads 1% on `events1`.

**Keyblade event save (07-11, rev 278).** Save `events2` = `maxpower` with story quests 856-979 removed (last story quest 855, period
2019-04-18; script `tmp/events_p1/mksave2.js`, private), `relogin -Save events2` on the real clock: Shop week 04-18..24 lists the weekly
raid, «A New Friend? Returns!» and «Keyblade Wielders Summer Adventure Returns!» (EV-0783, 20012, eventType 3). The Summer Adventure card
loads a few seconds late (first download of `v4/20012.png`), then shows (`events2_tab`). Its quest list opens on «DAY 1 - 1/3» (Dual
Blade LV 150, AP 5, objectives 1 turn / no continue / Equip the Starlight Keyblade) with no Raid Boards button (`events2_key_list`).
Played by Claude (07-11, user asked): Day 1 - 1/3 (stage 4000094) with Starlight +60 (picked with the side arrows of «Select a
Keyblade»), pet Steal on: one turn, the 3 objectives ticked including «Equip the Starlight Keyblade» (`events2_key1_results`), first
clear paid once (Moogle 6★ 90146, Huey 5★ 90025, Huey & Dewey & Louie 6★ 90016, `events2_key1_objectives`); drops Moogle x1, x1 and x5
(Steal x4) = +7 Moogle 90011 in the save, same as the client (`events2_key1_drops`); `events.cleared` 4000094 = [1,2,3]; raid state
unchanged (the client reports raidPoint 1458, ignored for event quests). Day unlock: every quest of the 2019 re-run has the same donor
window (04-21 07:00 .. 04-28 06:59 PT), so all 17 served quests are open at once (Day 1 - 2/3 opens with «Equip the Treasure Trove
Keyblade»); 17 of 34 are not served yet (maps not imported, enemies 11547 / 11026 missing).

**Quest played on the bench (07-11, save `events1`, `-RealNow 2026-11-10T20:00:00Z`, deck of `maxpower`, pet Steal x4 open).**
Dark-Winged Warrior 1/12 (stage 4000030 on map 734910, Powerwild LV 100, AP 5):
- first clear in one turn: the 3 objectives ticked, «Objective Complete!» Moogle 6★, Huey 5★, Huey & Dewey & Louie 6★ paid once
  (`events1_dww1_results`, `events1_dww1_objectives`); Lux and Munny as the client reported; raid, Raid Coins, raid points and draw
  points unchanged;
- **bug found and fixed (d8339ed):** the original drop row 62202 (Moogle 15%, Louie, Dewey, Huey 5% each, odds independent per
  position) was paid whole, x4 by the Steal: 16 medals, while CONGRATULATIONS showed «Moogle x4» and a nameless silver bag
  (`events1_dww1_drops_before_fix`). Now the odds are rolled at `/stage/start` (`rollDropTypes`) and `/stage/clear` pays the rolled
  positions only (test `server/test-drop-odds.js`);
- 6 replays after the fix: objectives never paid again, AP 5 each; 5 runs «No items gathered.» (`events1_dww1_replay`), 1 run «Huey x4»
  (Steal) = 4 Huey 1★ in the save (`events1_dww1_steal_huey`).
- Pre-existing test failures on HEAD 98e60b1 (same without the fix, to check in the final review): test-enemy-attack, test-enemy-mechanics,
  test-enemy-oltre, test-enemy-start-state, test-medal-renumber, test-raid-routes, test-special-server, test-trait-medals; test-keyblades
  runs over 300 s.

## Weekly gem quests of 2017-09..2018-02 (Events Part 2, Task 4)

The 22 weekly gem quests and the Moon Gem Cup of 11 Jan 2018 (EV-0367) have no donor evStage row, but the donor stage table holds
the same quest in a later run (`No Continues: Weekly Gem`, stages in order of the weeks) with its JP 4.3.1 map. The private builder
accepts a stage only when its map has exactly the enemy names and counts of the khuxwiki page and the same target; the quest then
takes AP, gem, objectives and world from the wiki page and the map, level (999) and Moogle 6★ reward from that stage row (label
`laterRun`). They keep their `w1` keys of event_ids.json. A quest is served only when its map is imported and all its enemies
are in the master (no substitute): 9 of 23 are served today. The Almighty Challenge (EV-0417) has no map in any source: not served (`wikiEmpty`).

## Event enemy models and SP Chip & Dale (Events Part 2, Task 5a, 7 November 2026)

- **Models**: the 36 event enemy models the user approved on the rendered review (17 of the pilot: 12 Organization XIII members,
  1026 Queen Bee Ω, 1547 Assault Dragon, 1555 Titan, 1564 Ramuh, 2009 guest Keyblade wielder; 19 of the gem quests) and 96
  Circus Clown are served from `recon/tools/extra_donors_events2.tsv` (`events2_export.py` from the private reconstruction
  manifest of `tmp\events_enemies`; rows: published path, container, rule, declared size, short rule label). `make_jp_enemies.py
  --events2` (default on, `''` off) takes each animation of the table WHOLE, before every other source (override priority:
  the table is the exact recipe the user approved), never mixing in another table; a texture without a usable row leaves
  the animation incomplete. Rules: `events2-jp` (own JP file, category 1), `events2-copy` (2), `events2-recon`, `events2-cand`,
  `events2-rescale` (212 off-size copies rescaled to EXACTLY the declared size, like dedup-rescale) and `events2-blank` (89
  fully transparent pieces for the slots still missing in the mandatory animations of the accepted partial models 282, 1032,
  1033, 1034, 1607), all category 3. Container `events2` = `D:\Progetto_Restauro_KH_UX\enemy_gen_src\events2` (rescaled,
  blank, frozen copies of raid_gen/enemy_x sources). 65 Cloudy Sunrise is complete with the standard rules.
- **Standard dead**: rule `std-dead` of `extra_donors_whole.tsv` (`whole_export.py`, label «std-dead (user-approved 07-11)»,
  category 3): 1568, 1570, 1572, 1573 (no dead anywhere) and 96 take the whole enemy/1/dead (Shadow smoke cloud).
- **Optional animations**: an atkSp with holes is not served (19 families: the client falls back to wait), as for every
  family; the notice draft names them. **2009** is an event guest ally (team flag 0x20) and joins `ally_families.json`
  (wait + atk1_o; move/knockback/dead from wait).
- **185 Enraged Elk**: no own model (user decision 07-11): `server/make-event-enemies.js DISPLAY_AS` {185: 184} shows the served
  story model 184 on its event rows (the private row keeps the donor displayId; the drawn gate checks 184).
- **Families**: `event_enemy_families.json` now lists 53 families, all approved (`partial`, `std_dead`, `no_b2016` for 96);
  the 11 pilot families of the dedup pending list moved to `extra_donors_dedup_approved.txt`.
- **Event rows**: the private builder (`tmp/events_p1/pilot/work/build_event_enemies.py`) now also writes the gem rows and the
  12 later-run map ids of Task 4: 590 rows, none missing. Regen 07-11: 116 of 897 quests served (58 before; gem 32, was 9);
  not served: mapUnusable 620, enemyMissing 115 (map enemies with no id, label mapIncomplete), mapKeyUsed 45, wikiEmpty 1.
- **SP Chip & Dale 6★ (90346)**: `server/medal-restored.js` clones our 90056 «Chip» 6★ (name, flavor, advantage, album 1702,
  enhanceAttack/enhanceDefense 1000; cost/minCost 999 like the siblings) only when `medal_gen\files\img\medal\Medal_L/S_90346`
  exist (master and package together); art from the Roboloid render (`fetch_medal_images.py`, `medal_map.json` 90346 -> 1796),
  no cut-in. Served with resources 107.
- **Riku & Moogle 6★ (90296)** (Events Part 3, Task 7a2, 8 November 2026): Gift Shadow drop (6.35%, reward 190804; the EV-0894 Sparkler 1507
  drops it at 100%, reward 190805) of the four «Event Coins plus Riku & Moogle» events (EV-0885/0894/0909/0925, Aug-Sep 2019). A Sell Medal (type 3,
  attribute none, upright, album 1588, Roboloid 1638), no stats and no Special Attack, sold for 500 Jewels (khuxwiki «Riku &
  Moogle»: «can be sold for 500 Jewels each»); not a Subslot Medal (I-169, type 10), so no dependency on that feature.
  `medal-restored.js` clones our 90016 «Moogle» 6★ (name, flavor, advantage, album 1588, sell 0, sellJewel 500, materialExp 0).
  Art: the original JP 4.3.1 files (`img/medal/Medal_S_90296.png` and the texture of `mixture/medal/compose/90296/Medal_L`,
  which is the medal's Medal_L byte for byte), BTF-encoded into `medal_gen\files\img\medal`; `medal_map.json` 90296 -> 1638.
  `server.js respondMedalSell` now credits `medal.sellJewel` to the Jewels (`freeStone`; no other medal of our master has it).
  Regen 08-11: 628 of 798 event quests (616 before); coin quests 94 of 114 (82): EV-0885, EV-0909, EV-0925 4 each; EV-0894
  still waits for the 1507 Sparkler (Task 7b). Board sets handed out 9 (6 before): + 2019-08, 2019-09, 2019-09b; 2019-08b is
  EV-0894's. The «Subslot Medal» cells of those boards stay left off (268 cells, unchanged): they are I-169, not this medal.

## One card per original evStage row (Events Part 2, Task 5, 7 November 2026)

User decision: the original event list showed one banner per original `evStage` row, so a record that bundles several donor
rows (18 Monthly Gem Quests records, Battle VS Ramuh, the 3rd Anniversary Countdown, the Daily Gem events) is no longer one card.

- `make-events.js` builds one `evStage` row per donor row of the record with a served quest (`allocateRows`); a record with no
  donor row (wiki-only, weekly 2017-18) keeps its single row. A quest goes to its donor row by its `evStageId`, else by the
  row's stage list / range (`stageRange`, added to the private records by the builder from the donor table). A row whose
  quests are all not served is not built; the raid / Special rule stays per record.
- Ids: the record id (`event_ids.json` `rows`) stays on one donor row, frozen in the private sidecar as `<censusId>#row`: the
  row whose banner was the record's card (migration of 7 Nov), else the first donor row. The other donor rows are numbered in
  `subRows` (`<censusId>/r+<offset from that row>`, no donor id), same number space; quest stage ids never change.
- Index (`events.json`, git-ignored): the catalogue keeps one entry per record (its id, notice, quests) with `rows`
  [{evStageId, donorEvStageId, start, end, days?, eventType, origCategory, parentEventStageId, bannerKey, stageIds, available}];
  each quest has the `evStageId` of its row. A row of a record with several rows has its own Pacific dates (a donor window past
  the record end, as the category 1 rows until 2037, ends with the record; the entry widens to cover a row that starts
  earlier); a single row keeps the record dates. Our rows keep `parentEventStageId` 0 (the donor value is only in the index:
  some December 2019 rows are children of another row of their month; client effect untested, bench).
- Routes: `/stage/event` lists one card per built row of the week (`event-calendar.js currentCards`: own dates, days and
  quests; own `eventStageId`, card and `eventType`); the kept event lists one KEPT card per row. Keep, Details and the notice
  page accept a row id (it opens its record). The details page lists the rows (card, dates, quests) under «Cards».
- Cards: `make_event_banners.py` writes one card per card id (the entry id and every built row) from the row's donor banner key
  (fetched as `row_<key>.png` into `reference\event_banners_ww`, or any `*_<key>.png` already there), else `--extra`, else for
  the entry id its notice banner; `make_special_banners.py --section event` writes the KEPT copies of every card id.
- Battle VS Ramuh (fix of 7 Nov): the census gave it the notices of the Iron Giant week and of the permanent Daily Quests, so
  it held their rows. The private builder now corrects its notice (its own row: Defeat Ramuh 1-10, not served until the Ramuh
  enemies are in the master); its old quest keys stay reserved in `event_ids.json` under `EV-1360~old/` (numbers never
  reused, no record reads them). Every donor row of a record now has its notice among the record's notices.
- Row owners (controller ruling, 7 Nov): a donor row belongs to the census event whose content it is, not to every record of its
  notice. The private builder (`ROW_OWNER`) keeps on a Monthly Gem record only its own «Clear All Challenges» row; the rows of
  the other events of the monthly notice go to their census row: the gem drop events (Magic / PSM / Power Gem) to their own GEM
  records, which are no longer shared rows; Event Coins Galore, Defeat X, New Year's Challenge, Keyblade Challenges, Org. XIII
  avatars, Daily Enhancement / Avatar Coin to census rows not selected yet (not built); the raid rows (eventType 2) to the raids.
  Quests that moved to a record keep their stage ids (key moved); the others keep them reserved under `<censusId>~old/`.
  The three «Event & Trait Medals» rows of June-August 2020 belong to the medal event of the month (EV-1154 Stitch Screen Debut
  Celebration, EV-1198 SN++ Aeleus, EV-1232 SN++ Dilan): their banner sits under that event's heading in the monthly notice and
  their quest gives its SN++ medal (fix round 1); not selected, so not built.
- Full map import (Task 5 Step 2, 7 Nov): with the event enemies in the master, `import_event_stages.py` imports 373 of 418
  candidate maps (43 skipped: rooms not served; 2 missing). Served after fix round 1: 534 of 684 quests (gem 441, pilot records
  93; before: 117). New check in make-events.js: the rooms of the map must be of the quest's world (`event_config.json`
  `roomWorlds`, a prefix missing there is another world; `neutralRooms` {DG: 1}: the Corridor of Darkness / DG_0100 arenas fit
  world 1, where the original quests stand on DG rooms alone, or any world when the map also has a room of the quest's world;
  `worldExceptions` by map key: EV-0282 and EV-0293, donor world kept on the Enchanted Dominion rooms of the later run's JP
  map), else `worldMismatch`. A script check of the new quests (world, event enemy models, no substitution, reward rows, AP /
  addLevel against the donor row or the documented khuxwiki AP, one record per map key) found no failure. The resource staging
  (`stage_gen\files\stage`) holds exactly the event maps of the import.
- Fix round 1: every record freezes the row of its id (`<censusId>#row`, one row too); stored row keys without it stop the run.
  A quest that matches no donor row is flagged `rowGuess` (warning; none today). Quests whose AP comes from the khuxwiki page of
  their run (the private record's conflict) carry the label `wikiAp`. The details page draws a card only for built rows.

## Bench of the gem quests (Events Part 2, Task 6, 8 November 2026)

Resources 107, master rev 281. Saves made from `maxpower` with the `mksave2.js` pattern (story quests above LIMIT removed, Shop
rotation reset): `gem1` = LIMIT 690 (tranche 2017-10-05, first Shop week 10-05..10-11), `gem2` = LIMIT 825 (tranche 2019-01-10,
week 01-10..01-16).

- `gem1_tab`/`gem1_tab6`: the week lists both Weekly Gem Quests (Oct. 2 Speed Gem, 20019; Oct. 9 Magic Gem, 20020) after the raids.
  On the first visit the Oct. 9 card stayed black (heart placeholder) although `/web/event/img/v5/20020.png` was served 200 with the
  right bytes; it showed on the next visit: the client's first-download delay, as for Summer Adventure (07-11), not a server fault.
- `gem1_list`: «No Continues: Weekly Gem», Malicious Spider LV 999 (round 8 model), AP 25, three «no continue» objectives
  (Magic Gem, Jewels, Moogle). **Fixed (dd6a811, rev 281):** the list showed an «Event Boards» button: the client turns
  `eventType` 1 into the board mode. The weekly gem records have no donor row (fallback 1) and the pilot type-1 events had it too;
  original videos show no button on non-board lists (Defeat Titan has donor 1). Now `servedEventTypes: [3]`: every event row is
  served 3 (plain list) until the event boards are served (Part 3); the donor value stays in `origEventType`.
- `gem_catalog`: Event Catalog, 95 events / 79 with quests served. **Fixed (6e71fa5):** the three Gem Boards records (no banner in
  the original notice) showed a broken-image icon; now a box «No card in the original».
- `gem2_tab`, `gem2_list`: «Monthly Gem Quests!» card; list «No Continues: Monthly Gem», Iron Giant LV 500, AP 5, quest
  thumbnails in a row, no board button.
- **Weekly gem quest played (gem1, Oct. 9 Magic Gem, stage 4000134):** Begin -> «Select a Keyblade» -> friends -> map (two rooms)
  -> Results with the three objectives. First clear: Magic Gem +1 (material 50), Jewels +30, Moogle medal, drops (Spring Water,
  Iron Ore), munny 4,617; score and clear missions [1,2,3] saved. Three replays: no objective paid again (gem and Jewels unchanged),
  drops and munny only. A reward row that looks empty for a moment is the client's bonus animation (the text fills in), not a fault.
- **Monthly gem quest crashed on Begin, fixed (rev 283, -Quick on resources 107):** a stage with `holdKeyblade` != 0 (event/story mode)
  opens the fixed-keyblade start popup `StartDeckEdit3Scene_ver330`, which WW serves without its children: the client crashed in
  GUIReader (320 event quests: the 84 Monthly Gem rows and 236 «Quest - N/15» / «Clear All Challenges» rows). Proud quests use
  StartDeckProudScene and were not affected. Imported from JP 4.3.1 (`jp_coco_layouts.txt`): StartDeckEdit3_Panel_KB(_Ad)_ver240,
  StartDeckEdit3_Deck_ver240, StartDeckEdit2_NotChangeKB_ver240, StartDeckEdit3_Rules_ver240 (+ NotChange_panel01/02,
  MMode_Rule_Panel_A). `noPartner` only hides the friend list and adds «*No borrowed Medals.»; the right box (Rules) shows only
  when `hardmodeRequire` != 0, so the short-lived 1 -> 0 mapping was reverted (1 = «No special attack restrictions.», a valid
  «no limit» code). Original frames: private `reference/quest_start_screen/` (WW 2018-05 Monthly Gem: «CONDITION» box, orange
  «Stroke of Midnight +25 Cannot change» plate; WW 2017-12 weekly: empty right area, as ours).
  Bench (`gem2_begin`): «This quest must be played with this Keyblade.», box with the three lines, «Starlight +60 Cannot change», lock,
  no friend column. Differences left: the box header reads «RULE» (JP texture) instead of the WW «CONDITION», no yellow frame,
  red plate instead of orange (user 08-11: keep the JP version, to declare in the Events notice). Played: Iron Giant LV 500, objectives paid once (Power Gem +1, Huey, Moogle), clear [1,2,3].

## Event Boards spike (Part 3, Task 1, 8 November 2026)

Bench of the client side of the event boards (sphere `type` 4) before the generator is written. Temporary server code
behind `event_config.json` `spike` (off by default; `server.js` `EVENT_SPIKE`, Task 5 replaces it): the event `censusId`
is served with `eventType` 1, the two boards of `server/test-fixtures/event_board_spike.json` are added to the master
`sphere`/`sphereArray`/`sphereMasu` tables, handed out on `GET /user/sphere` and on a check whose `boardTypes` has 4, paid
in `userPoint.stageSpherePoint`. Fixture: layout, costs and `openId`/`openParam` of the donor WW type-4 rows «Event Board 1/2»
(numbers only), our test ids 4999901/4999902 (Board 1 `openId` 3 / `openParam` 0, Board 2 `openId` 5 / `openParam` 4999901),
every cell and the completion pay Jewels, no card picture, `boardId` 4. The plan named EV-0759, which is not a served record;
EV-0760 «Defeat the Pink Possessor!» (donor `eventType` 1) was used. Save: copy `evboard1` of `events1`,
`-RealNow 2026-11-10T20:00:00Z` (week 2019-04-11..17). Master revisions 284 (variant A), 285 (B, C), 286 (spike off).
Frames: `D:\Progetto_Restauro_KH_UX\reference\event_boards\spike_*.png`.

- **Button.** With `eventType` 1 the quest list of the event shows the «Event Boards» button (right of the list, where raid
  events show «Raid Boards»). The tap sends `POST /user/sphere/reset {}`, `POST /user/sphere/check/170119
  {"checkTypes":[3],"boardTypes":[1]}` (close), then `{"checkTypes":[1,2],"boardTypes":[4,7]}`, and opens the list.
  Back from a board screen to the list sends `{"checkTypes":[1,2],"boardTypes":[4]}`. The home check after the Notices sends
  `{"checkTypes":[1,2],"boardTypes":[1,2,3,4,5,6,7,8,9,10,11]}`.
- **«Unlocked an Event Board!» popup.** Every type-4 entry of `userSphereDatas` in a check answer opens one
  «CONGRATULATIONS! Unlocked an Event Board!» popup with the card and `boardName` (home and board list alike, one per entry,
  also for Board 2 while Board 1 is not complete). The spike sent both boards on every check, so the popups came back each
  time: the real server must send a board in a check once (as `sphereNotified` does for type 1), and the full list only on
  `GET /user/sphere`.
- **List.** «Tap a board to view its details.»; one card per type-4 board the client holds, both with the NEW tag, title
  bar = `boardName`, «Event Coins» box with the coin icon (`SpherePointIcon_EV`, the Event Coin of the event cards) and the
  `stageSpherePoint` balance (500), «To Complete» = sum of the board's cell costs (10450 / 45900), «Nodes 0 / 19». Cards
  without `img/sphere_incentive/<id>.png` are the plain lilac frame (as the raid boards before their art). Empty list
  (variant C, no type-4 board handed out): «No Event Boards.».
- **Board screen.** Title «Event Board N», marquee «Complete the boards while the event lasts! All Event Coins will be lost
  when the event ends.», costs on the cells, «Event Coins» balance, reward line («Jewels / Jewel x 10»), Unlock grey when the
  balance is below the Target cell cost. Unlock sends `POST /user/sphere/update {"sphereBoardId":4999901,"releaseMasuId":19}`
  (node numbers as for type 1/5, first node after START = 19 on this layout); the answer's `userPoint` is shown at once
  (500 -> 400) with the «You received Jewel x 10!» popup; Jewels in the header updated on the next screen.
- **`openId` 5 / `openParam` is not enforced by the client.** Board 2 (`openId` 5, `openParam` = Board 1) is listed, opens,
  and with 5000 coins its Unlock is red and works (3600 left) while Board 1 is 1/19. The chain must be enforced by the server
  (hand out Board 2 only when Board 1 is complete, and refuse updates on it before).
- **`boardEndTime` is not read for the list.** Variant B (`boardEndTime` of the EV-0760 row 2015-01-02, master rev 285): the
  button, the list and both boards stay as in A, progress kept (1/19). So, as for raid boards, the server decides which type-4
  boards exist by handing their ids out; `endTime`/`boardEndTime` do not hide them.
- Not seen: the client never sent `checkTypes` 3 with `boardTypes` 4, so closing event boards at the end of an event must go
  through `GET /user/sphere` (replaces the list) or a `checkTypes [3]` answer of the first Event Boards check
  (`closeEventSphereBoardIds`, which the client reads whatever `boardTypes` is: untested).

## Event Coins and Event Boards served (Part 3, Task 5, 8 November 2026)

`server/routes-event-boards.js` replaces the spike (removed with its fixture and the `event_config.json` `spike` key). Not benched
yet (Task 7).

- **Coins.** Reward type 15 of an event quest goes into the balance of its entry's board set (`events.json` `entry.boardSet`):
  objectives and first-clear items once (`routes-events.js`), enemy drops on every clear (`grantItem(15, .., {coinSet})` in
  `/stage/clear`; 15 is now one of the enemy drop types, no row outside events has it). Without a set: logged, not paid, never
  Raid Coins (`raidSpherePoint` is type 16 only). Save `player.eventCoins {[setKey]: n}`; coins never expire.
- **Focus.** `/stage/start` of an event quest with a set sets `player.eventCoinFocus`. A set is available while a feeder event
  (`boardSets[set].censusIds`) is listed in the story week or is the kept event. Focus = the last started set if available, else the
  newest set of the week, else the kept event's. `userPoint.stageSpherePoint` = the focus balance (all other userPoint keys kept:
  test `userpoint_keys`).
- **Boards.** Only the focus set's boards are handed out (`player.eventSphere`, kept for good); a chained board (`chains`) only once
  the board before is complete. Check: `checkTypes` with 3 answers `closeEventSphereBoardIds` = every type-4 board sent or ever handed out that is not handed
  out now; a check without 3 whose `boardTypes` has 4 sends each newly handed-out board once (`player.eventSphereSent`); `GET /user/sphere`
  lists the handed-out boards and replaces `eventSphereSent`. Update: refused with no change when the board is not handed out
  (window, focus, chain), the node is invalid or open, or the set's balance is short; each cell paid once, the completion (index 22)
  once.
- Test: `server/test-event-board-routes.js`.

## Bench of the coin events (Part 3, Task 7)

- **Content (Task 7b, 8 November 2026, f0cb34e).** 1507 Sparkler user-approved (event_enemy_families.json, whole_export.py label,
  extra_donors_events2.tsv +139 rows); `make_jp_enemies.py`: 1507 complete (category 3 for the standard ground shadow).
  The four EV-0894 maps use the original JP rooms DB_0026_09..12_00, which have no story door: `make_jp_rooms.py` `EVENT_ROOMS`
  builds them with `--story-only` (they also let DAY 9 - 1/2 and 2/2, stages 730190/730191, be imported). Regen: 634 of 798
  event quests served (628), EV-0894 4 quests, board sets 10 (+2019-08b), eventType 1 entries 22.
- **No card for EV-0579 (20181)** (user 08-11): an entry with `noQuests` 'board' (announcement notice played only on the boards, no
  quest and no evStage row) gets no card from `make_event_banners.py` (test in test_make_event_banners.py); the Event Catalog shows the
  «No card in the original» box. Cards written: 138 (25 new coin cards, identical to the reviewed ones), imgVersion 6.
- **Keeping an October event from April 2019**: only a past event can be kept (`rowState`: a later event is 'later'), so the
  October 2019 set cannot be kept on an April 2019 save; the focus test uses an October 2018 coin event (EV-0603, set 2018-10).
- **Riku & Moogle on the bench**: no save tool can add it (`grant-all-medals.js` skips medals with sell 0); its sale is benched only
  with a save that got it from a drop (August-September 2019 events).
- **Resources 108 / master rev 287** (6ee7982): full build 5.04 GiB (41 parts), installed with update-resources + Download.
- **Bench (8 November 2026, save `coin1` = copy of `events1`, `relogin -Save coin1 -RealNow 2026-11-10T20:00:00Z`, week
  2019-04-11..17; battles played by Claude with the save's deck, user «giocale tu»).** Frames: `reference\event_boards\t7b_*.png`.
  - Events tab: the April 2019 coin events with their cards (Event Coins Galore 20187, Banish the Heartless 20188, Pink Possessor,
    Titan, Boss Time Attack, Shiva, Egg Hunt, Quiz...); the last cards of the long list draw only after a moment (lazy load, no bug).
    The Event Boards button shows on the eventType 1 entries.
  - «Unlocked an Event Board!» popup: **bug fixed (3d0529a)**: the login `GET /user/sphere` marked Board 1 as sent before the home
    check, so the popup never showed; now the list does not mark new boards and the home check pops it once (not again at the next
    login). Board 2 popped once when Board 1 was completed (back to the list); the six 2018-10 boards popped once each when the focus moved.
  - Board list: Board 1 only (Board 2 chained), Event Coins = the set balance (0, then 200...), To Complete 4100.
  - **Crash fixed (7dc0cf4)**: after the first unlock (cell 19, 100 coins, Sora & Chip & Dale) the client crashed (SIGSEGV, native)
    on OK and again on reopening the board: its cursor went to a pass-through node (a Booster cell left off: cost 0, rewardSelect 0).
    Pass-through nodes are now handed out already open (`openPassThrough`, also for older states); the board opens with the cursor on
    the next paid cell. Side effect: with the boosters open several paid cells of Board 1 are reachable at once (the original path
    order had boosters in between); the Event Catalog shows them as «Not restored yet» / done.
  - Coins: EV-0774 quest 1 first clear 3 objectives = 150 + 50 coins (balance 200, shown on the board screen); second clear pays
    no objective again (200 kept). Objective coins of 5 EV-0774 + 3 Titan + 2 Shiva + 5 Pink Possessor quests; Event Coins Galore
    Beginner also paid **enemy coin drops** (Event Coin x15 lines in CONGRATULATIONS; +2015 with the pet's Steal x4, which
    multiplies the coin drops too). Egg Hunt 1/5 «Clear All Challenges Together»: objectives failed (eggs not on the target path).
  - Cells: cell 2 (300, Trait Medal #95) by Unlock, then Unlock All («Use 3700 coins to unlock all nodes?») -> «You completed the
    board! You got a Boost Medal!» (Magic Mirror), Jewels +500 from the 1000 cell (5889 -> 6389); Board 2 handed out (COMPLETE ribbon
    on Board 1), opens, first cell 1400 -> Jewel x100 (6389 -> 6489).
  - Focus: `POST /web/event/keep/20185` (EV-0603 «Event Coins Galore!» Oct 2018; an October **2019** event cannot be kept on an
    April 2019 save: only past events can be kept), Kept card at the top, quest Beginner played: focus 2019-04 -> 2018-10, the Event
    Boards list shows the six 2018-10 boards (Cherub x2, P/S/M Booster, Re: Halloween Medals Board), April boards closed
    (`closeEventSphereBoardIds` 4000009, 4000010), balance 8. Then a Boss Time Attack quest (2019-04): focus back, Board 1 COMPLETE,
    Board 2 1/19, balance 515 (265 + 250): April progress kept.
  - Event Catalog: feeder pages list the boards with cells, costs, done marks and «Your Event Coins: N. One balance per board set,
    shared by 12 events; Event Coins never expire.»; the 20181 card is absent (404) and the «No card in the original» box is drawn.
    **Fixed (52e747f)**: the EV-0579 page did not list its set's boards (it promises them); it now uses `boardSetKey` for board-only
    announcements (6 boards of 2018-10).
  - Not checked: Riku & Moogle 6★ sale (no save tool can give a sell-0 medal; coordinator: later, with an Aug-Sep 2019 save);
    the board card art (`img/sphere_incentive`) is still the plain lilac frame.

### Boards with unpayable cells, informative notices (Task 7c, 8 November 2026)

User decisions 08-11 (4c5ce3f, master rev 288, 8f87e7f):
- **No pass-through cells.** In the donor WW master every cell of every type-4 board has a reward and a coin cost (Booster cells cost
  150-1000 coins); no original board had an empty or pre-opened cell. The pass-through cells of Task 3 / 7dc0cf4 let paid cells open
  out of the original path order, so `event-boards.js` now skips a board with ANY cell we cannot pay (`report.skipped`: `unpayable
  cells (Boosters: Part 6)`, `unmatched medal`, a bad index, a grid node without a cell); a board chained behind a skipped one is
  skipped too (`chained to a skipped board`), a skipped Board 2 leaves Board 1 served. The pre-open logic of 7dc0cf4 is gone;
  `routes-event-boards.js` keeps a guard: a board with a rewardSelect 0 node is never handed out, opened or bought (logged once).
  A board held in a save but no longer in the master is closed by the next check and never listed (tests).
- **Medal names of the donor study.** A medal cell whose donor name has a variant letter our master lacks uses the study's `ourName`
  when it gives exactly one medal of the same rarity: 5★ Halloween Sora A -> 22095 (x2), 5★ Halloween Goofy A -> 21095, so the
  «Re: Halloween Medals Board» of 2018-10 is served whole.
- **Event Catalog = playable events only.** An informative notice with no quest and no original card (`noQuests 'board'`: EV-0579
  «New Event Coins Available in October!», EV-0223, EV-0280, EV-0396 Gem Boards announcements) has no row and no page (404); 52e747f
  is reverted. Playable events whose quests are not served yet stay with their reason; the 2018-10 boards are listed on the pages of
  the playable 2018-10 events (EV-0582, 0588, 0589, 0603).
- **Regen** (`KHUX_EVENT_BOARDS=D:/Progetto_Restauro_KH_UX/tmp/events/boards/board_sets.json`, log `tmp\events\t7c\regen.log`):
  83 donor boards -> 53 built, 30 skipped (19 `no matched cells` = all of 2019-12, 6 `unpayable cells (Boosters: Part 6)` = 3 of
  2018-10 + Board 1 of 2019-04 / 2019-06 / 2019-10, 3 `chained to a skipped board` = their Board 2, 2 completion Booster = 2019-02);
  265 cells left off, all Boosters. **7 sets handed out** (2018-10 with 3 boards, 2019-08, 08b, 09, 09b, 11, 11b; 41 type-4 rows);
  2020-01 / 01b built but not handed out (no coin quest served: `noCoinSource`); 2019-02, 04, 06, 10, 12 not served (`boardsLater`,
  their entries eventType 3). Entries by eventType {1: 10, 3: 106}; catalogue 110 events (was 114). No resource change (event boards
  have no card art in the resources).
- **Bench** (save `coin1`, `relogin -Save coin1 -RealNow 2026-11-10T20:00:00Z`, rev 288, Download tapped; frames
  `screenshots\t7c_*.png`): `[master] 106 tabelle valide`. Focus fell to the kept EV-0603 (2018-10): «Unlocked an Event Board!»
  popped for the three 2018-10 boards (Cherub x2, Re: Halloween Medals Board). The April 2019 events show no Event Boards button.
  Event Boards list of the kept event: 3 boards, coins 8. Cursor moved over all 19 cells of each Cherub board and all 11 cells of the
  Halloween board: no crash; cell 1 of Cherub unlocked (5 coins, EXP Medal Huey & Dewey & Louie), the cursor moved to cell 2, no
  crash. Event Catalog: 110 events, June 2017 Gem Boards (EV-0223) and Sept. 25 Gem Boards (EV-0280) gone, EV-0242 (coin, with card)
  kept; `/web/event/event/20181` 404. EV-0603 page (via its card Details -> «See this event in the Event Catalog»): Event Boards
  section with the Cherub cells, costs, «Not unlocked» / «Unlocked» (cell 19).
- **Leftover on the test save `coin1` only:** the Halloween board 4000006 holds cells 2, 3, 14 unlocked by the 7dc0cf4 pre-open
  (they were the Halloween A cells, now paid medal cells): shown unlocked, never paid. 7dc0cf4 was never released, so only bench
  saves can hold this; clear them by hand if the save is reused.
- **Coins into held sets (coordinator 08-11).** A set whose boards are held (not handed out) still collects its Event Coins:
  `boardSetOf` falls back to the entry's `boardSetKey` and `addCoins` accepts a set that has member entries; the set is never
  handed out nor the focus, its entries stay eventType 3 (test `coins_paid_to_held_set`). Master unchanged (rev stays 288).
  Save `coin1`: the 7dc0cf4 leftovers on board 4000006 (cells 2, 3, 14) cleared by hand.

## Part 3 summary (event coins and boards, 8 November 2026)

Final state (rev 288, resources 108; plan `docs/superpowers/plans/2026-11-08-events-part3-coins.md`, ledger
`.superpowers/sdd/2026-11-08-events-part3-coins/progress.md`):
- **Coins.** Event Coins = reward type 15; Raid Coins moved to type 16 (same amounts). Objectives and first-clear items pay once,
  enemy drops at every clear (kept events included), into `player.eventCoins[set]`: one balance per board set, never expiring (the
  original lost them when the event ended; the client's board marquee still says so). A served event whose set is held
  (`boardSetKey` without a `boardSets` entry) pays into its set too; the balance is not shown until the boards are served.
- **Focus.** One set listed at a time: the set of the last event quest started, else the newest set of the story week, else the kept
  event's; `userPoint.stageSpherePoint` = that set's balance.
- **Boards.** 83 donor boards -> 53 built, 41 handed out in 7 sets (2018-10 with 3 of 6, 2019-08, 08b, 09, 09b, 11, 11b); each cell
  and each completion paid once; chains and windows enforced by the server. No pass-through cells: a board with any unpayable cell
  (265 Booster cells) is held with any board chained behind it (30 boards: all of 2019-12, 3 of 2018-10, both boards of 2019-04 /
  06 / 10, 2 of 2019-02) until Part 6 (Boosters, I-166). 2020-01 / 01b have no served coin quest (`noCoinSource`).
- **Content.** 47 missing event enemies served as event rows, new model 1507 Sparkler (user-approved; defeat = Shadow smoke cloud,
  standard ground shadow, both declared); Riku & Moogle 6★ Sell Medal 90296 (500 Jewels, `sellJewel`); EV-0894 rooms
  DB_0026_09..12. 95 events / 634 of 798 quests served; Event Catalog 110 events (informative notices without a banner left out;
  «shared by N events» counts only listed events, Task 8).
- **Notice.** «Events» (11/08) section «Event coins and boards» (counts from `events.json` via `eventNoticeFacts().coins`) and the
  Sparkler line in «Enemy graphics».
- **Open:** pet Steal x4 multiplies coin drops (+2015 on one Galore clear: check the original Steal rule); EV-0603 objective rewards
  pay 1 coin each (check the records); board card art is the plain lilac frame (`img/sphere_incentive` art missing); the Riku & Moogle
  sale not benched in the client; test-make-special and the 8 known failing tests; deferred minors in the ledger.
- **Lessons for Part 4.** Check what the original paid before inventing a fallback (the pass-through cells had to be undone: every
  original cell had a cost and a reward); a missing enemy is found and approved on a rendered review, never substituted; a feature
  half-served (boards without Boosters) is held back whole and declared in the notice; memory-heavy steps (resources build,
  update-resources) can be killed by the host: stop, free memory, resume, never chain taps after a kill.

## Map coverage (Events Part 4, Task 2, 8 November 2026)

- **Event rooms list.** `import_event_stages.py --rooms-out` (default `D:\Progetto_Restauro_KH_UX\tmp\events\maps\event_rooms.json`)
  writes the rooms of every event map it could read (imported or left out for its rooms) with their map keys; `make_jp_rooms.py`
  reads it (`--event-rooms`, `event_rooms_from_list`) in place of the four hand-listed DB_0026_09..12 rooms and builds them with
  `--story-only`. A missing list or a bad room name stops the run (rooms_gen removes the files of the rooms it does not plan).
  Order: import (list) -> `make_jp_rooms.py --story-only` -> import again with `--stage-dir`. Test: `test_make_jp_rooms.py`.
- **Other copies.** An STG or part missing from the JP 4.3.1 copy is taken from the WW 2016 bundle copy of the same bin (byte for
  byte, `copies` in the stage's report); the WW 2018 name index is listed in `tried` (names only). A stage left out gets `cause`
  (`by_cause` in the summary: STG absent, part N absent, rooms not served, ...), a missing one `tried`.
- **Result.** 162 event rooms in the list; rooms_gen 251 -> 267 complete rooms (+16: AG_0009_01_00, AG_0010_00_01, AG_0018_00_00,
  BC_0004_00_00, CD_0016_00_00, DB_0020_02_00, DB_0020_03_00, DB_0022_00_01, DB_0023_02_00, DB_0025_00_00, DB_0026_05_00,
  DB_0026_06_00, DB_0029_00_00, DG_0006_00_00, OC_0001_02_00, OC_0001_03_00; 1,938 files, +65 MB). Import: 470 -> 510 of 520 maps
  imported; left out: rooms not served 47 -> 7 (all DB_0000_01_00: 4 base1 tiles of its last column exist in no copy on disk),
  STG absent 3 (735820, 740280, 740282: only part 00 in any copy). 42 of the 49 «rooms not served» quests now have their map
  (served at the next master run if the world and reward checks pass).
- **Incomplete records.** The 106 quests with the record map status «STG header absent» (98) / «part 2 absent» (8) use 60 map keys:
  no other copy holds the missing files (55 keys have no file at all in any copy; 740260/740262 have parts 00-01 of 3). Survey of
  every copy tried: private `tmp\events\maps\INCOMPLETE.md`. They stay unserved (`mapUnusable`).

## Generator rules for the challenge events (Events Part 4, Task 4, 10 November 2026)

- **Booster only.** A quest is held as `boosterOnly` when all its objective and first-clear rewards are Boosters. Drops are not
  counted: a quest with drops and only a Booster objective is held too (review ruling, behaviour kept).

## Challenge events (Part 4, Task 6 preparation, 10 November 2026)

Everything up to the live master regen; the regen, resources 109 and the bench follow.
- **Record corrections** (private, from the card verification `tmp\events\t5p4\verify_nobanner.json`). The records are rebuilt
  with `build_challenge.py` (same builder, inputs of today), so only labels and `eventEnemyRows` follow the Task 3 enemy rows.
  - EV-0990 is the WW «Daily Gem Event! (12/23)»: census.py `NOTICE_FIX` gives notice 60751, so it gets its donor rows
    200852..200860, 27 donor quests and 9 cards from banner 98XLNkmVW. Its raid row 10263 goes to the raids (rowsMoved RAID).
  - EV-1163: the census khuxwiki match «High Score Challenge #61» (HSC, Part 8) is dropped (`wikiMatchDropped`).
  - The six «Chasm of Challenges: new quest» lines carry `scheduleLineOf` (the EV-1300 row they announce), so they are never
    built twice.
  - `short_2020.json` (Surprise events, Time Missions) is written into the sibling folder `tmp\events\records_later` until
    Task 7: `KHUX_EVENT_SRC` reads every `*.json` of the records folder, so a config exclusion was not needed.
- **Enemies.** The 15 approved challenge models are `approved: true` in `event_enemy_families.json`. 25, 135, 156 and 157 are
  complete with the generator's standard rules (`events2_export.py` SKIP, like 65). `extra_donors_events2.tsv` has 48 families.
  `make_jp_enemies.py` reports 314 complete, 0 incomplete. `build_event_enemies.py` adds 105 rows that waited for these models.
  The 12 models still missing stay held.
- **Maps and rooms.** The dry regen lists 1,467 candidate maps. The import (against the dry master, which has the new enemy rows)
  takes 1,449. 15 are left out for DB_0000_01_00 and 3 for STG absent. The rooms list grows from 162 to 208.
  rooms_gen has 272 complete rooms, 5 more: AG_0003_12_00, BC_0007_00_00, DB_0029_01_00, DB_0030_00_00 and DB_0030_02_00
  (543 files). `stage_gen\files\stage` holds the imported maps.
- **Quiz boards.** `recon/tools/make_quiz_dramas.py` gives each quiz stage its own drama and board ids. The plan
  `recon/tools/quiz_dramas.json` has 75 stages and 78 boards: dramas 1906101..1906178, pictures 39401..39478.
  - It writes `img/light/SEQ/<drama>.l`: the JP quiz script with the picture id (int 13) changed.
  - It writes the boards `img/light/NPC/<picture>.png` (private) and a generated transparent `30300.png`.
  - It writes `stage_gen\event_dramas.json` for `KHUX_EVENT_DRAMAS`. build-resources.ps1 runs it before btf_fix.
  - `event_config.json` quizDramas has 85 quest keys (EV-0763 included). Labels: quizBoard (khuxwiki text), quizBoardFootage,
    quizBoardScreenshot.
- **Cards.** `make_event_banners.py --all-rows --extra extra_part4_staging.json` on the dry index wrote 479 cards; the 138 old
  ones are byte-identical. make_special_banners `--section event` wrote 439 kept copies. imgVersion is 7.
- **Event Catalog.** Game-year tabs like the Raid Catalog's. The Story week's year opens first, and only its cards load.
  Real index: 324 events, 57.5 KB.
- **Dry regen** (copy of server/ at the repository's depth `tmp\t6r`, records copied; nothing live written):
  - 2,012 of 2,896 event quests served (634 of 798 before); 247 events with a served quest.
  - Challenge records: 2018 453 served, 2019 295, 2020 532, 2021 56 (1,336 of 2,272 quests).
  - Not served: mapUnusable 597, enemyMissing 146, mapKeyUsed 79, wikiEmpty 38, objectiveMismatch 18, boosterOnly 5,
    rewardTypeUnknown 1.
  - Quizzes: 53 served (EV-0484 14, EV-0500 7, EV-0538 14, EV-0624 9, EV-0910 7, EV-0763 2); the others are on the
    incomplete maps 720520 / 740260 / 740262 (mapUnusable).
    - **Shared answer maps** (coordinator ruling): every original quiz run sent its stages to the same answer maps 720510 /
      720520 / 720530 (and 740260-62). A quiz stage of another quiz record may share such a map key when the drops are equal;
      any other second record on a key still waits (make-events.js, test quiz_answer_map_shared).
    - **Quiz pages pinned by their answers** (build_challenge.py `quiz_pages_pinned`, private test `test_quiz_pin.py`).
      EV-0484 / EV-0500 share their stage names with EV-0538, so the run rules could not pin their bare khuxwiki pages, and
      the WW check held them. The bare page is now the page of the run when every quiz stage of the record has its page in
      quiz_texts.json and each page's answer is the exit of the stage's WW answer map (20 / 10 independent checks). The WW
      check then runs on that page's enemy list: it agrees on 720510 / 720530. The 720520 quests stay held (map incomplete).
  - 106 of 106 tables valid. Changed tables: stage, evStage, reward, enemy, enemyAttack.
  - Every stage and evStage id served before is unchanged. Only 4000021 and 4000027 change (their board drama).

## Surprise events and Time Missions (Part 4, Task 7 preparation, 10 November 2026)

Everything up to the live master regen; the regen, the resources and the bench follow.
- **Records.** `short_2020.json` (57 records: 51 Surprise events, 6 Time Missions, 2020-02..2021-02) is now in the records
  folder; `build_challenge.py` writes it there. Do not rerun the builder against a master that already holds the challenge
  enemy rows (since the Task 6 regen): it reads the live master, marks those enemies as present and shrinks
  `missing_challenge.json`, and a later `build_event_enemies.py` would then drop the rows. The Task 6 outputs are kept in
  `tmp\events\t6p4\rebuild`.
- **Surprise events are one-day events.** The donor master has ONE row per Surprise event, from 08:00 UTC to 07:59:59 UTC the
  next day, and every WW notice gave that whole Pacific day («12:00 a.m. to 11:59 p.m. (PT)»; the «15-60 minutes» of the
  plan was wrong, see the follow-up section below). The 12 h rule (`shortWindowHours`) did not see them: the event was listed
  for the whole Shop week. The builder now marks these records `shortWindow`, and make-events.js treats every donor row of such
  a record as a one-day row: the record is open on the Pacific day where its row starts (test
  `short_window_record_whole_day`; since the follow-up `oneDay`, no wholeDay label). It uses the start day only, because in summer
  08:00 UTC is 01:00 Pacific and the row would touch the next day. Time Missions need no mark: their donor rows are the hourly
  windows (6 targets x 4 hours a day), merged into one row per day (`short_rows_one_per_day`). Each day row lists all 18 or 21
  quests.
- **Calendar.** `test-event-calendar.js` `short_rows_generated_shape` uses the shapes of the dry index. EV-1055 is listed on
  Thursday 2020-03-05 from 00:00 to 23:59 Pacific, and not on 2020-03-06, its census end day. The Time Missions rows change
  every day.
- **Maps.** The dry regen lists 40 new candidate maps; all 40 are imported (1,489 of 1,507; same 15 + 3 left out as before),
  80 files in `stage_gen\files\stage`. No new room (event rooms list 208, unchanged). The maps are part of the generated
  pack, so `build-resources.ps1 -Quick` (or a full version) carries them; no static pack changes.
- **Dry regen** (`tmp\t7r`, nothing live written): 2,130 of 3,070 quests served (2,012 before), 254 events.
  - short_2020: 118 quests served in 7 events: EV-1055 (1 quest), the Time Missions EV-1075 (18), EV-1111, EV-1148, EV-1189,
    EV-1224 (21 each) and EV-1271 (15 of 21). 75 evStage rows.
  - Not served: 29 quests `enemyMissing` (26 Surprise events + 3 of EV-1271). The Surprise ones carry the Task 1 marker «no
    WW enemy list»: no khuxwiki page pinned to the run, so the map enemies stay unconfirmed. 21 `mapKeyUsed`: every Surprise
    event uses map 741710, and EV-1055 holds it. 6 `mapUnusable` (EV-1389/1398/1408 on map 743840 carry the same marker;
    3 of EV-1271).
  - Tables (dry run at imgVersion 8): only stage (+118) and evStage (+75) change. No served stage or evStage id moves;
    106 tables valid. With imgVersion 9 the live regen also changes the bannerUrl of every event row (v9).
- **Cards.** `make_event_banners.py --all-rows --extra` on the dry index: 125 new cards, each byte-identical to an approved
  staging card (`t5p4\event_img_staging_short`, different ids then). The 479 old cards are unchanged. make_special_banners
  `--section event` adds 125 kept copies; the catalogue banner is unchanged. imgVersion 8 -> 9.
- **Notice.** «Challenge events» gains the Surprise events / Time Missions line (counts from events.json, the whole day
  declared as not original).

## Surprise events, follow-up: shared map, confirmed enemies, community goals (Part 4, Task 7, 10 November 2026)

User decisions of 10 November 2026; everything up to the live master regen (dry run in `tmp\t7f`).
- **One whole day is original.** Every WW Surprise notice gave «12:00 a.m. to 11:59 p.m. (PT)» (62306, 64147, ...; research in
  `private\events\sources\surprise_2020\FINDINGS.md`). A `shortWindow` record whose rows are all whole days now gets `oneDay`
  (entry field) and no wholeDay label; wholeDay stays on the Time Missions, whose targets appeared at four set hours a day
  (notice 67747): declared as not original in the Events notice.
- **Shared map.** Every Surprise run used map 741710 (Cave of Wonders: Treasure Room; 743840 Beast's Castle: Fireplace for the
  Holiday Draw Tickets). A quest of another `shortWindow` record now shares the map key whatever its objective rewards (test
  `surprise_map_shared`); each keeps its own stage row. The drops are in the shared map file, so they must still be equal: all
  51 Surprise quests have the same drops (Gift Shadow / Bag O' Gifts drop slot 1, one Attack Prize chest, reward 80).
- **Enemies confirmed.** The khuxwiki pages of the 29 held quests list every run date, so they are pinned to these runs: 26 gem
  quests Gift Shadow x1 (target, Lv10), EV-1389 / 1398 / 1408 Bag O' Gifts x1 (target, Lv10; enemy 157 is in our master). The
  records are patched surgically by `tmp\events\challenge\patch_surprise.py` (idempotent; backup in
  `tmp\events\backup\t7f_before`); a rerun of build_challenge.py writes the marker back, so the patch must follow it.
- **Why EV-1389 / 1398 / 1408 were «map not usable».** No file was missing: the marker «(no WW enemy list)» has no enemy id, so
  the quests stopped before they became map candidates, and map 743840 was never in `event_maps.json`, never imported. With the
  marker gone the regen lists it, `import_event_stages.py` imports it (JP `mappoi_stg743840.bin` + `_00.bin`, room
  BC_0005_00_00 already served) and the next regen serves the three quests on the shared key.
- **Community goals** (user rule). The events whose result notice gives the number of players who cleared all objectives pay,
  once per event, the tier the original reached. Private data `tmp\events\community_bonus.json` (written by
  `tmp\events\challenge\make_community_bonus.py`, every quote checked against the notice text); make-events.js reads it
  (KHUX_EVENT_BONUS, default: next to the records folder) into `entry.communityBonus`; routes-events.js pays it into the
  Presents when every objective of the counted quests is cleared (`player.events.bonus`, once per event, kept events too; at
  login for an old save). Seven events: EV-1026 Summon Rush (732 players, 740 Jewels: «based on round number»), EV-1058
  Savage Vanguard (7,237), EV-1100 Sephiroth (8,529), EV-1127 Dragon Maleficent (7,701, also Draw Ticket x10), EV-1175 Mean
  Maiden (3,931; only its «Defeat the Mean Maiden» quests), EV-1221 Flame Core (4,370), EV-1243 Heartless Battle (4,026): all
  on the top tier (30 Power, Speed and Magic Gems). Left out: the FFBE collaboration (58199: goals counted in FFBE), the Union
  Challenges (tiers by Union), and two fixed completion rewards (61226, 68893: open question).
- **Dry regen** (`tmp\t7f`): 2,180 of 3,070 quests served (2,130 before), 304 events (254). +50 stage and +50 evStage rows (51
  Surprise events, all served; the 3 Holiday ones after the map import); no other row changes, event_ids.json unchanged (the
  ids were numbered in the Task 7 regen), 106 tables valid. Not served by reason: enemyMissing 175 -> 149, mapKeyUsed
  100 -> 79, mapUnusable 603 -> 600. The cards (and kept copies) of the 50 rows exist since Task 7 (`--all-rows`): no
  imgVersion change. Map import 1,490 of 1,508 (+743840); rooms unchanged (208). The new map goes into
  `stage_gen\files\stage` with `--stage-dir`, so `build-resources.ps1 -Quick` carries it.
- **Not added:** the 2020-05-15 Moon Gems run (notice 65678). The donor master has its row (201584, 2020-05-15 07:00 to
  05-16 06:59:59 UTC, stage 742560 «[Surprise Event] Moon Gems», map 741710, banner of the other Surprise rows), but the
  event census has no row for it (the notice is filed as the Proud Leviathan update), so it has no census id yet.
- **Added later (round g, below):** the 2020-05-15 Moon Gems run is EV-1532.

## Surprise events and completion rewards, second follow-up (Part 4, Task 7, 10 November 2026)

User decisions of 10 November 2026; everything up to the live master regen (dry run in `tmp\t7g`).
- **Holiday Draw Tickets.** The official notices of the three runs (72001, 72216, 72706) all say «Complete the challenge and
  receive 10 Holiday Draw Tickets!» (4 + 3 + 3 per run), as khuxwiki. The objectives of EV-1389 / EV-1398 / EV-1408 now pay
  type 41 id 1 (our Holiday Draw Ticket, `drawTickets.holiday`) instead of the donor value type 41 id 41 (paid here as a
  plain Draw Ticket). Record patch in `tmp\events\challenge\patch_surprise.py` (step 3, with the notice quote in each reward
  `note`), so it survives a rebuild like the other Surprise patches.
- **The 2020-05-15 Moon Gems run** is census row **EV-1532** (appended: no EV id moves; the notice 65678 was filed as the Proud
  Leviathan update only) and a record in `short_2020.json` (step 4 of patch_surprise.py): donor row 201584 (2020-05-15 07:00 to
  05-16 06:59:59 UTC), stage 742560 «[Surprise Event] Moon Gems» (equal to stage 741890 of EV-1036 but for its id), map 741710
  (shared, same drops), Gift Shadow x1, Moon Gem x1 per objective; khuxwiki lists May 15, 2020. Its card is the banner of the
  other Moon Gems runs (9ayfNxJF8): the new card and kept copy are byte-identical to theirs, no existing card changes, so no
  imgVersion change (the version only renews URLs whose picture changed).
- **Fixed completion rewards** use the community-goal mechanism: a `community_bonus.json` event with `kind: 'completion'`, the
  same `rewards` for every finisher (no count, no tiers) and `quests` (the name prefixes of the counted quests). make-events.js
  writes `communityBonus {kind: 'completion', count: null, rewards, ready, missing?}`: ready when every prefix has a quest and
  all are served; label `completionReward` (an original reward: the entry label stays); paid once into the Presents
  («Completion reward: ...»). The «Community goals» line of the Events notice (plain) lists them, worded as original.
  - **The Keyblade War Challenge Campaign** (notice 61226, census EV-1009: «Complete all of the challenges by Jan. 20 to receive
    every type of 1 Tier 10 Subslot Medals!», 3,847 winners): the six Kyroo [SAB LV 10] (Spirit / NM x Lord / Chef / Sir: our
    medals 311905, 301908, 311913, 301916, 301920, 311925; khuxwiki «The Keyblade War» names the same six). Counted: the eleven
    quests of The Keyblade War (khuxwiki: Battle vs. Master Aced, Looking for Master Gula Pt. 1-4, The Darkest Darklings, The
    Worst Nightmare, The Ultimate Test Pt. 1-4, part 3 by Union). Attached to EV-0929, the only record of The Keyblade War
    (parts 1-2, seven quests): **not ready** — the record has no start date (not listed) and part 3 is in no record.
  - **JP 5th Anniversary KHUX & KHDR Campaign** (notice 68893, census EV-1266): WW content (WW notice in English with Pacific
    times, rewards «Distributed to only KHUX» into the WW gift box). The challenge is the ten «Genie Jafar - n/10» quests of
    donor row 202665 (Sep. 3-15, 2020: their objectives give exactly «up to 30 Draw Tickets, and 30 Gems»); that row has no
    record yet (EV-1266 is a CELEB row), so the reward is kept in `pending` of community_bonus.json with its full list
    (3,000 Jewels, Draw Ticket x50, M-type = Sir Kyroo upright / reversed LV 7 x10, LV 8 x6, LV 9 x3, LV 10 x1, Power / Speed /
    Magic Gem x10, Sun and Moon Gem x1; the KHDR-only rewards left out) until its record is built.
- **Checks kept:** the Mean Maiden bonus counts only its ten «Defeat the Mean Maiden» quests (test community_bonus_attached,
  `questPrefix`; dry index: 10 of 15 quests); quests on a shared Surprise map must still have equal drops (test
  surprise_map_shared, «other drops: still a clash»).
- **Dry regen** (`tmp\t7g`): 2,181 of 3,071 quests served (2,180 of 3,070), 305 events (304); +1 stage row (4003301), +1 evStage
  row (22627), the three Holiday stage rows change only `submissionItemId` (41 -> 1); no other row changes, no served quest
  moves; event_ids.json +1 row, +1 entry, +1 check; 106 tables valid. No map import (741710 is served), no resource build.

## Part 4 summary (challenge and battle events, 10 November 2026)

Final state (rev 293, resources 110 + a `-Quick` pack with map 743840; plan
`docs/superpowers/plans/2026-11-09-events-part4-challenges.md`, ledger `.superpowers/sdd/2026-11-09-events-part4-challenges/progress.md`):
- **Data.** Private records `challenge_2018..2021.json` and `short_2020.json` (census EQ, KEY, QUIZ; built by
  `tmp\events\challenge\build_challenge.py`, then `patch_surprise.py`, which must be re-applied after every rebuild). Every donor quest
  cross-checked against khuxwiki: an unpinned page never sets enemies, objectives that disagree hold the quest (`objectiveMismatch`,
  CROSSCHECK.md, I-251).
- **Served.** 305 events, 2,181 of 3,071 quests (challenge events: 213 events, 1,564 of 2,340 quests; 2018 44 events / 453 quests,
  2019 45 / 372, 2020 109 / 675, 2021 15 / 64). Not served: mapUnusable 600, enemyMissing 149, mapKeyUsed 79, wikiEmpty 38,
  objectiveMismatch 18, boosterOnly 5, rewardTypeUnknown 1.
- **Maps.** Event rooms list (`event_rooms.json`) read by `make_jp_rooms.py`; other original copies tried for incomplete maps (one copy
  per map, a mix only when the shared files are identical); 1,490 of 1,508 candidate maps imported.
- **Enemies.** 15 new models approved by the user on rendered reviews (two rounds; Demon Tide repeats tentacle frame 14, declared);
  atkSp of Leviathan, Metal Giant and Jack in the Box completed; 12 models still missing (I-250); renders to recheck (I-252).
- **Rewards.** Payable types widened to what the server pays; a Booster reward goes once into `player.pendingBoosters` for Part 6
  (I-166), a Booster-only quest is held; an unknown reward type holds the quest and never reaches the client.
- **Quizzes.** No original WW quiz file survives: 75 boards (5 original screenshots, 5 redrawn from footage, 65 rebuilt from the
  khuxwiki text, style and typo fixes approved by the user), each quiz stage with its own drama (1906101..178) and picture
  (39401..478), made by `recon/tools/make_quiz_dramas.py`; quiz stages share the answer maps 720510 / 720530 as in the original.
- **Short events.** Surprise events open their whole Pacific day (original, every WW notice) and share map 741710 (743840 for the
  Holiday Draw Tickets runs, which pay the Holiday ticket); the 2020-05-15 Moon Gems run is EV-1532; Time Missions open all day
  (not original, declared).
- **Community goals and completion rewards.** 7 events pay once into the Presents the tier the original reached
  (`community_bonus.json`, KHUX_EVENT_BONUS); fixed completion rewards use the same mechanism (`kind: 'completion'`): The Keyblade
  War waits for its date and part 3 (I-247), the 5th-anniversary Genie Jafar quests wait for their record (I-248).
- **Catalogue and cards.** 479 cards after Task 6 and 125 for the short events (imgVersion 9); Event Catalog with game-year tabs (the story week's year opens first);
  KEPT RAID / KEPT EVENT tabs top left in their catalogue colours (variant B).
- **Notice.** «Events» section «Challenge events»: counts by year from `events.json`, quiz boards and their sources, Boosters later,
  Surprise events (whole day, original) and Time Missions (not original), community goals and completion rewards.
- **Open:** I-247 .. I-252; map 743840 bench look (I-249); the Part 3 open points still stand.

## I-251: khuxwiki / donor objective conflicts decided (10 November 2026)

User decisions (evidence table private `tmp\events\i251\DECISIONS.md`), applied in the private importer so a rerun reproduces them:
- **Precedence rule (new).** A donor stage used by ONE run only is that run's own game data: the donor value wins over a khuxwiki
  transcription unless a contemporary notice or banner contradicts it. The old order (notice > khuxwiki > donor) stays for stages
  reused by later runs, decided case by case. Written as a comment where it is applied (private pilot `build.py`, `P4_OBJ_DECIDED`).
- **Decided for the donor (20 quests).** Group A (wiki copy errors: EV-1236 Heartless of Speed / Magic, EV-0853 Lady Luck (3),
  EV-0450 Mean Maiden 9/10), group C (single-use stages: EV-0513 Coco 4/10 and 10/10, EV-0522 #2, EV-0584 Equipment Cost Challenge
  Returns x7, EV-0641 10/10, EV-0670 1/10, EV-0795 #4, EV-0904 Shiva 10/10, EV-0917 Titan 10/10) and DAY 10 (stage 730200, Moogle
  O' Glory in the 2018, 2019 and 2020 runs: the series' 7-keyblade rotation). The record keeps the donor objective and reward and
  carries `objectiveResolved` (a note) instead of `objectiveMismatch` (a hold); make-events.js needs no change
  (`test-make-events.js` `objective_resolved_is_served`).
- **Page pin fixes (separate change, `P4_PAGE_PIN`).** EV-0948 (October 2019) used the «(November 2019)» pages of EV-0968: now
  the bare «Big Bonus Challenge n/7» pages (Savage Vanguard, within 4 turns, as the donor and notice 58881). EV-1300 Round 3
  stages 355200-355203 used the «(Round 2)» pages: now the «(Round 3)» pages (Sun Gem / Moon Gem, Round 3 targets). EV-0483 720470
  now uses the (06/11/2018) page (Queen Bee, Defeat 13); 720460 has no page. Group B (11 quests) needs no objective decision after
  these pins.
- **Rerun without drift.** The builders read «our master» frozen as the Task 6 records saw it (private `our_master_snapshot.json`):
  a rerun against the live master no longer marks the event enemy rows as ours. `KHUX_CHALLENGE_OUT` writes a rerun to a scratch
  folder; zero drift was proven before the I-251 changes. A private check (`tmp\events\i251\check_i251.py`) proves the values.
- **Dry regen** (scratch copies, live files untouched): `objectiveMismatch` 18 -> 0. The released quests' maps were never imported, so
  the served totals stay 305 events / 2,181 quests until `import_event_stages.py` runs; with the maps imported on the dry index:
  307 events / 2,210 quests (+29: 26 of the 30 and EV-1300 355200-355202). Still held: EV-0450 722690, EV-0853 740643 (JP map
  incomplete), EV-0522 729920 (room DB_0000_01_00 not served), EV-0483 720460 (no khuxwiki page, enemies unconfirmed).
  event_ids.json unchanged. Live order: regen, `import_event_stages.py`, regen, bench.
- **Lessons for Part 5.** Never run `make_jp_enemies.py --ids` (it pruned enemy_gen and a master regen during the rebuild served only
  393 quests); a builder rerun against a master that already has the new enemy rows shrinks the missing list; read the original
  notices before trusting the plan's window rules (the Surprise «15-60 minutes» was wrong); a shared map is allowed when the drops
  are equal; banner art and notices decide reward mixes over the wiki.

## Generator rules for the Org XIII events and The Keyblade War (Events Part 5, Task 3, 10 November 2026)

`server/make-events.js` (plan `docs/superpowers/plans/2026-11-10-events-part5-orgxiii.md`, report
`.superpowers/sdd/2026-11-10-events-part5-orgxiii/task-3-report.md`):
- **Objectives.** An objective with `code: null` holds its quest (`objectiveUnmapped`, the text in `why`); no stopgap code, no
  text-to-code mapper (Task 1 found none: the 2016-17 runs are donor stage rows).
- **Generated maps** (`map.source 'generate'`, label `wikiRoom`). stageBinId = the quest's own stage id. Enemies from `wikiEnemies`
  (target counted once) by the make-special.js name rule (event rows never answer); an objective on an enemy id puts that id on
  the map for as many members as it counts. Unknown name, or a JP «variant» target the record names without Ω: `enemyMissing`, no
  entry. «Collect all materials» on a generated map: held (`mapUnusable`). Every other candidate goes into
  `game_data/event_gen_maps.json` (gen_story_maps.py config key `events`, the «special» list shape plus `roomCodes`, `censusId`).
  Served only when the gen_story_maps.py report (`<KHUX_EVENT_MAPS>/gen_report.json` or `KHUX_EVENT_GEN_REPORT`) lists its stageId
  with `event: true`.
- **JP twins** (`map.source 'jpTwin'`, label `jpTwinMap`) are served on the JP key and may share it with another record's quest
  (equal drops). A `levelShifted` twin (label `levelShifted`) gets its own key (its stage id) with `fromKey` = the JP file and
  `levelShift {from, to, delta}` in `event_maps.json`; it is served only when the import report marks that key `levelShifted: true`
  (contract for `import_event_stages.py`, Task 4: copy `fromKey` to the stage id and shift every enemy level).
- **Data-hole records** (`rec.dataHole`): a quest whose original stage row loaded another stage's map (`map.stageBinId`, the Daily
  XIII quests on the monthly maps) shares that map (equal drops). Other records keep the Part 4 rule.
- **Second notices.** `scheduleLineOf` -> reason `scheduleLine`: no row, no card, no catalogue row. `datesOf` dates the target
  (EV-0913 -> EV-0929 from 2019-09-03; with no end, the Pacific day its last donor row ends: 2019-10-03).
- **Rewards.** `rewardTypeAliases {18: 20, 19: 20}`: avatar sets and style parts are paid as avatar parts (type 20), each id as the
  row lists it (the ♂ part on one objective, the ♀ part on the other, as the Special quests), once.
- **Unions** (The Keyblade War Pt. 3). `unionQuests` give each index quest its `union` (1 Ursus, 2 Anguis, 3 Unicornis, 4 Vulpes,
  5 Leopardus); routes-events.js lists only the player's own Union version. `stagesOf` lists EV-0929's built quests on the EV-0941
  card (`sharedWith`). The record's `completionReward` joins the bonus list: `communityBonus.byUnion` / `readyUnions`, paid to a
  player when the common quests and their own Union's quests are done. I-253 item 2 fixed: a counted quest without objectives
  counts once cleared (playStatus).
- **Catalogue.** `catalogName` renames the Event Catalog row and page (EV-1089 «Challenge Organization XIII Pt.1»).
- **Fix round 1 (review).** Generated-map enemy ids are never picked silently: an explicit record id (`wikiEnemyIds {name: id}`,
  `targets[0].id`) wins; else one row (or same-stat rows) of the name; rows with different stats hold the quest (`enemyAmbiguous`,
  the candidates in `why`): 42 of the 55 candidate quests until Task 4 pins the ids. `datesOf.quests` opens only those quests on
  the line's date; the others get `openFrom` (their own donor row's Pacific day, EV-0929 740905 / 740910 on 2019-09-20), read by
  event-calendar.js. The bonus check counts the stage being cleared (server.js writes its playStatus after `onStageClear`). JP-twin
  map sharing is limited to `dataHole` records, as `binShare`.

## Maps and rooms for the Org XIII events and The Keyblade War (Events Part 5, Task 4, 10 November 2026)

- **Level-shifted twins.** `import_event_stages.py` reads an `event_maps.json` item with `fromKey` from the files of that JP map
  (any copy, enemy swaps keyed by `fromKey`) and writes them under the item's own key (its stage id): every enemy record level and
  STG [11] + `levelShift.delta` (at least 1); ids, positions, drops and uids stay; the JP folder never changes. The report entry
  carries `fromKey`, `levelShift`, `levelShifted: true`; a JP map whose levels are not all `from` is left out (cause `level shift`).
  Test: `test_import_event_stages.py` (Marluxia I, JP 68710 Lv 25 -> 4003322 Lv 20).
- **Generated maps in the build.** `build-resources.ps1` runs `gen_story_maps.py` with the `events` key on
  `server\game_data\event_gen_maps.json` after `make_quiz_dramas.py`: maps into `$sg\files\stage` (beside the Special maps; stage
  ids 4000000+ never touch an old key), report `<KHUX_EVENT_MAPS>\gen_report.json` (default `stage_gen\event_stages`), POI merged
  into `server\game_data\stage_poi.json` as the Special maps; `-DryRun` keeps report and POI inside the dry copy. Order for a live
  run: master regen (writes the list) -> resources build (maps + report) -> master regen again (serves them).
- **Explicit enemy ids.** The private builder pins `wikiEnemyIds` / `targets[0].id` only from evidence (CROSSCHECK.md «Explicit
  enemy ids»): the EV-0333 Daily XIII replay of the same member and level whose JP map holds the same names, counts and target
  (Larxene V / XII on 69650 / 69720, Xemnas III, VI, X, XII, XIII), and the Task 2 row 1701242 (Xemnas XI). 55 generated-map
  quests have no evidence; 40 of them stay `enemyAmbiguous`.
- **Rooms.** The event rooms list grows 208 -> 213; `make_jp_rooms.py --story-only` builds 4 new rooms (CD_0001_00_00,
  DB_0017_01_00, DB_0023_01_01, KG_0000_01_00; 575 files in the static `rooms_gen` pack, so a full resource version is needed).
- **Dry result** (`tmp\t5r`): import 1,726 of 1,812 maps (17 rooms not served, 3 STG absent, 66 part 0 absent); 17 generated maps
  (validate_maps 0 errors); 2,498 of 3,570 quests served (2,210 before, none lost). Org XIII 2016-17 186/242, 2018-19 65/186, 2020
  30/38, EV-0929 6/7, The Keyblade War 0/20 (5 boss maps imported but held `worldMismatch`: KG room vs quest world 13; 15 maps
  without part 0). The 592 new files in `stage_gen\files\stage` leave every old file byte-identical (md5).
- **Follow-up (user gate, 10 November 2026).**
  - *Part sources (dedup stubs).* The JP 4.3.1 extraction did not write its dedup stub records (4 bytes: «same data as record N»),
    so a part whose STG is present can be missing although the game had it as a byte copy of another part. A record's
    `map.partSources {part: {key, part, reconstructed, basis, why}}` goes into the `event_maps.json` item; `import_event_stages.py`
    fills an absent part from the named source part of the same copy, byte for byte (never a part the copy holds), and reports it
    (`partSources` per stage, summary `partSources` / `reconstructedParts`). The Keyblade War 14 maps (the only part with the
    STG's target: proven) and the Org XIII 2018-19 part 0 lobby of 107 quests: 37 with the only lobby of a stage with the same start
    point, 70 with the nearest of several equivalent same-event lobbies (`reconstructed: true`, record phrase «map part rebuilt» ->
    label `mapPartRebuilt`, declared in the Notice). Test: `test_import_event_stages.py` (740911 part 0 from 740920_00).
  - *Rooms of the generated maps.* The donor stage row's thumbId names the quest's start room (room * 10000 + variant * 100 + sub);
    the record's `thumbRoomCodes` come before the khuxwiki room-name codes in the `event_gen_maps.json` entry (make-events.js).
    The khuxwiki «Corridor of Darkness» now also matches DG_0100 / DG_0200_27 (reference/world_schema/areas.json); 7 Org XIII
    2016-17 quests use their exact JP map (Larxene V/XII, Xemnas III/VI/X/XII/XIII; the EV-0333 replay maps). Other candidates that
    lookup adds are not used until the user rules on them.
  - *Dry result.* Import 1,795 of 1,815 maps (69 with a part from its source, 28 of them rebuilt lobbies); 10 generated maps
    (validate_maps 0 errors); 2,609 of 3,570 quests served. Org XIII 2016-17 186/242 (10 generated), 2018-19 170/186, The Keyblade
    War 0/20 (19 maps imported, held `worldMismatch`). 193 new files in `stage_gen\files\stage`, every old file byte-identical (md5).
- **Follow-up 2 (user review of the generated maps, 10 November 2026).**
  - *Start and placement.* A record's `genLayout {room, start, groups, target, arena, targetWith {name: n}, source, why}` keeps the
    start and the placement of an original map of the same event and room (positions read from the JP 4.3.1 file, the quest's own
    enemies placed on them) or points measured on the original footage. make-events.js moves the `targetWith` members out of the
    normal groups into the entry's `targetWith` (they fight in the target's own team) and passes `layout`; gen_story_maps.py
    (`apply_layout`) refuses a layout of another room or a point not reachable from the start, and without a layout every map is
    byte-identical to before. Applied: Xaldin V (start on the bridge, target + 6 Armored Knights in one team: JP 704130, Xaldin
    III), Lexaeus V/VI/IX (JP 706720, Lexaeus II), Marluxia XII (footage: target above the start, the second Spook in its team below).
  - *Target ids from the footage.* The target card shows «Lux» at the quest level, which is the row's lux curve: Gargoyle Knight
    10015, Fat Bandit 10002, Cerberus 10112, Behemoth 11023 (1023 has the same lux at Lv 225: not excluded) pinned in the records.
  - *Dry result.* 10 generated maps, validate_maps 0 errors; 2,609 of 3,570 quests served (unchanged).
- **User decisions 1, 3, 6 (10 November 2026).**
  - *Marluxia XII run row (decision 1).* The original footage and khuxwiki show both Wandering Spooks of Organization XIII No. 11
    Marluxia XII as Speed; our 160110233 is Power. The run's own row 161210233 (Speed) exists only in the donated table: it is an
    event enemy row (private event_enemies.json, added in place; the full private builder rerun would drop Task 2 rows) and the
    record pins it for the target and the second Spook (`targets[0].id`, `wikiEnemyIds`). No stand-in (160310233 not used).
  - *The Keyblade War world (decision 3).* The donor stage rows of The Ultimate Test (740911/916/921/926) say worldId 13 with
    thumbId 100 (= KG_0000_01_00), and the donor world table names world 13 «KG» (our `roomWorlds` numbers KG 15): the 19 maps are
    `worldExceptions` entries, the evidence noted per key. The 18 other quests are now held `rewardRowsMissing` (reward 1905913:
    only the 740926 record carries its drop rows).
  - *Parts 1-4 maps from the JP dedup stubs (decision 6, I-254).* The map audit's 42 stub files (39 parts: Time Trial EV-0450
    rounds 1-9, Boss Time Attack EV-0478, KH Pop Quiz answer map 720520 part 2, EV-0763 740260/740262, Brainteaser 740878; 3 STG
    headers: 740280/740282 <- 740281, 735820 <- 735810) go through `partSources`: the part `stg` (source part null) is the STG
    header itself (`import_event_stages.py`, test 740280). The record builders read the same table (private
    `tmp\events\maps\dedup_stubs.json`), so the 68 quests carry their enemies, target and drops. 735820: five headers of the same
    event fit and differ only in field [7] (a running counter): the first is used, `reconstructed: true`, basis `stgCandidate`.
  - *Room DB_0000_01_00.* Its base1 tiles 013/026/039/052 (last column, rows 1-4: a band transparent in every other column and in
    DB_0000_00_00) were dropped as dedup stubs: `make_jp_rooms.py` `DEDUP_TILES` rebuilds them from a transparent 256x256 tile (the
    45-byte placeholder of every transparent tile), listed in the room report (`rebuilt_tiles`). 134 new files in the static
    `rooms_gen` pack: **the next resource version must be a FULL build**.
  - *Labels (make-events.js `mapRestoreLabels`).* From the import report: an exact stub copy -> `mapPartShared` (original data);
    a nearest candidate -> `partSourceLabels[basis]` (`stgCandidate` -> `mapHeaderRebuilt`), else `mapPartRebuilt`; a map on a room
    of `rebuiltRooms` (DB_0000_01_00) -> `roomTilesRebuilt`. All declared in the Notice.
  - *Dry result* (`tmp\t5r`). Import 1,854 of 1,854 maps (111 with a part or header from its source, 29 reconstructed); 10
    generated maps (Marluxia XII now on 161210233; validate_maps 0 errors); 2,714 of 3,570 quests served (2,609 before, none lost).
    Parts 1-4 record files: 2,217 (live 2,210 + EV-0929 6 + EV-0723/+6 of Part 5) -> 2,320: +98 (68 stub maps, 30 room quests)
    and 5 EV-0576 listings of the same DB maps; Org XIII 2018-19
    170 -> 171 (its room quest), The Keyblade War 0 -> 1. 137 new files in `stage_gen\files\stage`, all 9,078 old files
    byte-identical (md5). validate_maps: 52 of 59 new maps clean; 7 DB_0000_01_00 maps keep the «exit not walkable» errors of
    their original JP files (9 of 51 served original maps on the same DB rooms have them too).
- **User decisions 2 and 7, Keyblade War drops (10 November 2026).**
  - *Lexaeus IX (decision 2).* Target 11023 (HP 875,000 at Lv 225) proven on the footage: the Behemoth survives 836,558 shown
    damage and falls at 890,632, so 1023 (437,500) is excluded. The pin was already 11023; the record now carries this evidence.
  - *Same-series layout twins (decision 7).* EV-1287 Defeat Dragon Maleficent 1-10/10 and EV-1288 Defeat Ramuh 1-8/10 (Sept 2020)
    lost their maps (STG header absent). Each uses the map of another run of the same series (742530 May 2020; 743750 / 743754
    Nov 2020: same room, the target alone, map level 1, every difficulty on one map) with this run's own enemy row (2009T01561 /
    2009T01564 of the donated master, private event enemy rows with their attacks 1561051-1561056, 1561017, 1564060-1564061).
    Record `map.layoutTwin {fromKey, swaps, why}` -> make-events.js lists the own key with `fromKey`, `enemySwaps`, `layoutTwin`
    -> `import_event_stages.py` copies the twin under the own key with the enemy id replaced (STG [6] too) and reports
    `layoutTwin: true`; served only then. Label `seriesLayoutTwin` (layout reconstructed, enemy row original). Ramuh 9-10/10 held
    (twin of another series).
  - *The Keyblade War drops.* The Union quests and those whose fight part was absent at build time had no drop rows: the Org XIII
    builder now reads the drops from the map the import serves (own parts + the dedup-stub source part): reward 1905913 on all 18.
  - *Dry result.* 2,750 of 3,570 quests served (2,714 before, none lost): challenge_2020 538 -> 556 (+18), The Keyblade War
    1 -> 19; import 1,862 of 1,862 (8 layout twins); 16 new files in `stage_gen\files\stage`, every old file byte-identical;
    validate_maps 0 errors on the 8 twins and the 19 KW maps.
- **User decisions 4 and 5, part 1 (10 November 2026).**
  - *Same-run evidence for non-target rows.* A generated-map quest of the 2016-17 runs gets `wikiEnemyIds[name]` only when the
    same run's surviving original maps (own JP maps or JP twins of the same stages) use exactly one row for that name as a
    non-target (private builder, evidence in `wikiEnemyIdsWhy`); 8 quests pinned (Marluxia II, IV, V, VI, VII, IX, X; Xaldin VI
    Invisible only). Targets keep the 1xxxx band rule or a footage pin.
  - *Xigbar XIII (decision 5).* The JP replay of this stage (711050, Waterfront Park, warp portals, Black Copter Fleet) is used under
    the quest's own key with the WW target: the footage target card reads «Armored Archer LV 250, 298 Lux», the lux curve of 10024
    at Lv 250 (24: 2, 15024: 0). `map.layoutTwin.label` names the Notice label (`jpReplayLayoutTwin`, make-events.js); drops are
    the twin map's reward rows (62252, donor reward table).
  - *Dry result.* 2,758 of 3,570 quests served (2,750 before, none lost): Org XIII 2016-17 186 -> 194 (7 Marluxia generated
    maps, Xigbar XIII). validate_maps: the 7 generated maps 0 errors; 702930 keeps the «exit to part 0» errors of its JP map 711050.
  - *Not done yet.* Multi-room generated maps (wiki «x3/x4/x5» rooms and named areas, groups per room, chests), Xigbar III own
    maze, Xigbar IX on 711040 (Dark Plant row unproven); 34 quests still `enemyAmbiguous`.
  - *Footage verification (user 10-11, dry).* The private footage check (original footage of the Marluxia and Larxene runs) pins the
    target rows of the generated Marluxia quests (the run rows 16MM10233, MM = quest number, imported from the donated table) and
    serves Larxene II, III, VIII, X (XIII pinned to 11023). Non-target names never hit on footage keep their same-run row with the
    label `enemiesInferred`. The donated «little HP» run rows 2016120001 / 2016120033 / 2016121021 have HP 10, which the footage
    contradicts: their HP is the smallest value compatible with the footage at the measured level (Gigas Shadow 9,583 at Lv 100,
    Neoshadow 5,130 at Lv 150; Shadow only has an upper bound, so it takes the Neoshadow ratio), scaled over the levels as
    k x curveAt(base row) (make-enemy-oltre.js); every quest that fights them has the label `hpFromFootage`. Generator rule:
    a target pinned to the id of an enemy objective counts among that objective's members (the JP twins Larxene I / IV place
    «Defeat 5 ... little HP» as 4 run rows + the run-row target), so `genMapOf` places one member fewer. Vexen's 170420xxx rows are
    not this run's rows and are not used. Dry: 2,762 of 3,570 served (+4, none lost); validate_maps 21 generated maps 0 errors.
  - *Larxene XI (user 10-11, dry).* I-256 closed: the footage measures a normal Gigas Shadow at 200,000 HP at Lv 100 and
    184,000 at Lv 180, our 1021 curve exactly (the donated 70,000 is the 2018 variant 1801101021). HP gauge rule: one gauge = 20,000
    HP; the bar shows the top gauge, and the extra gauges are chips beside the level badge, at most 4 drawn and the rest as «+N».
    Larxene XI 502280 (Lv 180) = 12 normal Gigas 1021 + 2 little-HP decoys and the target 2016121021 (the objective «Defeat 3
    Gigas Shadows that have little HP» counts the target). Dry: 2,763 of 3,570 served (+1, none lost); validate_maps 22 generated
    maps 0 errors.
- **Multi-area generated maps (11 November 2026, dry).** Plan step «multi-room generator for event entries».
  - *Structure from khuxwiki.* The pages of 14 generated-map quests list the map as several areas: «Corridor of Darkness x5»
    (Xigbar II, IV, VI, VIII, X, XII), «x4» (Xigbar III), «x3» (Lexaeus I, IV, VII, X), «Corridor of Darkness B + A» with
    «A (Top)», «A (Bottom)», «A (3)» (Larxene IX), «Frozen Forest + Entrance» (Vexen IV), «Frozen Forest C / B / A + Entrance»
    (Vexen XI), with the groups and chests of each area. «xN» is N parts of the same room: Lexaeus XIII (same run, khuxwiki
    «x3») is JP 706830, three parts of DG_0200_27_00 with one enemy each; Larxene XII (khuxwiki (1)-(3)) is JP 69720, three parts
    of DG_0100_02_00. Rooms of the khuxwiki pictures: «Frozen Forest (3)» = BC_0012_02_00 (Vexen III, V, X, XII JP maps),
    «Frozen Forest» = BC_0012_00_00 (Vexen I, IV thumbs), so «(2)» = BC_0012_01_00 (the third variant, by elimination);
    Entrance = BC_0011_00_00 (Vexen XIII JP map); Larxene IX starts in its thumb room DG_0100_01_00 (B), A = DG_0100_02_00.
  - *Record and generator.* The private Org XIII builder (block 11h) writes `genAreas {areas: [{label, room, groups, chests,
    layout}], backExits, source, why}`; make-events.js `genAreasOf` turns it into `entry.areas` (ids by the one-room rule, per-name
    counts checked against the page, one target group whose other members fight in the target's team; label `wikiAreas`, Notice
    text in event_config.json); gen_story_maps.py `build_event_areas` writes one MAP part per area, chained by forward exits
    (the way back only between different rooms, as the originals 69670 / 300510 / 720430; none on a repeated room, as 706830 /
    69720), exit field 4 and the route left as the original multi-part maps. Layout points come from original maps of the same
    rooms: start, doors and arrivals as the files (doors at the room edge snapped to the walkable area, 25-57 units), team spots of
    non-boss teams of those maps spread over the area, the target team on a boss team spot. An exit closer than 200 to an enemy is
    moved (706830 has its portal on the enemy's spot; validate_maps rejects an enemy within 96 of an exit). Not rebuilt: Xigbar's
    warp portals inside an area (JP 711020 / 711040 have them as exits to the same part, WW positions unknown), the «hidden» flag of
    Vexen XI's Darkballs, the Wandering Spook hit countdown.
  - *Dry result.* All 14 quests stay held: 13 `enemyAmbiguous` (non-target names with several rows and no same-run evidence) and
    Lexaeus X `enemyMissing` (Ringmaster has no non-event row). Their maps were built only for the review page, with provisional
    rows (14 maps, 2-5 parts, validate_maps 0 errors, 0 warnings). Served list unchanged: 22 generated maps byte-identical,
    2,763 of 3,570 quests served.
  - *Served on footage rows (11 November 2026, dry, user approval 10-11).* The private footage check of the 14 quests (HP gauge
    chips, Lux per hit, kill / survive sums, target cards) gives their rows (private builder block 11i): a measured name takes its
    confirmed row; a name never fought, or whose base and 30xxx rows the footage cannot separate, takes the base row (every measured
    non-target of these runs is the base row) and is listed in the record's `enemiesInferred` (label `enemiesInferred`, per quest
    in the Notices). Every non-target name of the 14 is pinned, none is left to the 8xxxx band rule. Special cases: Xigbar VIII's
    Shadow is 20001 (3 gauges, 1 Lux, survives ~35k at Lv 200); Lexaeus VII's «CAUTION» Shadow fits none of our Shadow rows but
    the donated row 285 «Shadow» (Lux 10, 61,639 HP at Lv 175: 4 gauges, 3-4 Lux per hit), whose id is an Armored Knight in our
    master: it is imported as a private event row under a **new id 2140000285** (range 2,140,000,000 + donor id, reserved for
    donated rows rebuilt under a new id: above every id of our master, the donated and the JP tables, below 2^31), stats, Lux,
    attacks and countdown as donated, displayId 1 (the Shadow look; the donated displayId 285 draws the Armored Knight here); label
    `enemyRowRebuilt` (Notice text in event_config.json). The data has no separate «caution» field: the donated row carries a
    countdown attack (validUrgency 1), kept as is; whether the client shows CAUTION is checked on the bench (Task 6). Lexaeus X:
    Ringmaster 97 (8 gauges, Power, 50,675 -> 4 Lux; 10097 contradicted) and the target Wandering Spook 160410233 (card «LV 250,
    298 Lux» with the Power icon: the target-band curve with Power; 10233 is Magic; 160410233 / 160710233 / 161010233 /
    161310233 are identical rows).
  - *make-events.js fix (Lexaeus X).* `genMapOf` looks names up without the event rows (an event row never answers a name lookup),
    so a name whose only rows are event rows (Ringmaster 97 / 10097 / 1609197...) was reported «enemies not in the master» although
    the row exists. Now such a name is held as `enemyAmbiguous` with the line «event rows only, an explicit id is needed: ...» until
    the record pins it, and a target whose 1xxxx band holds only event rows no longer falls back silently to another row of the
    name (Lexaeus X had taken 160110233, the Marluxia I run row with another curve). Test: test-make-events.js
    `wiki_room_enemy_missing_held`.
  - *Dry result.* 14 more quests served: **2,777 of 3,570** (Org XIII 2016-17 199 -> 213, none lost); 36 generated maps
    (22 one-room unchanged byte for byte, 14 multi-area), validate_maps 0 errors (maps_x and rooms_gen; the 2 known «long route»
    warnings 4003337, 4003344). Review page private `tmp\events\p5d6\maps_review\index.html` (the real maps with their rows).
- **Task 4 closing review (11 November 2026, dry).** Private check `tmp\events\p5d7
eview_t4.py` over the 486 Part 5 quests
  (433 served, 36 on generated maps): every generated map uses master ids only (no placeholder), every served label has its
  Notice text, every layout twin / rebuilt part / shifted level carries its label, `wikiRoom` / `wikiAreas` / `enemiesInferred` /
  `hpFromFootage` / `enemyRowRebuilt` present exactly where the record calls for them, the gen report matches the generated
  entries one to one (exact room, no unknown enemy, enemy counts). Found and fixed: 9 generated-map targets came from the 1xxxx
  band rule without a pin: now pinned on the footage target cards (Xemnas I 10071, IX 10057; Vexen VII 10035, XI 10019; Xigbar
  II 10126, VIII 10126, X 10138; Lexaeus IV 10144, VII 10108; Lux read where the card shows it, else the attribute icon); Xaldin
  V's 6 Armored Knights had 80017 from the 8xxxx band rule with no footage: now the base row 17 (same strength at Lv 125) with
  `enemiesInferred`; the silent target fallback above. After the fixes the check reports nothing; served count unchanged.

## Cards of the Org XIII events and The Keyblade War (Events Part 5, Task 5, 11 November 2026)

Staging only; the served `event_img` folder is unchanged until the user approves the cards and Task 6 serves the quests.
- **Banners.** `make_event_banners.py --fetch --all-rows` on the Part 5 entries of the dry index (`tmp\t5r`) downloaded 47 notice
  and row banners privately into `reference\event_banners_ww`; every other own image of the 35 notices (avatar previews, the
  Revival member pictures, the second notices' images) was fetched too as evidence for the review (98 files in all).
- **Cards.** 33 new cards, none missing:
  - 2018-04..2020 and the Keyblade War Pt. 3 (18 cards): the banner of the original evStage row (donor `bannerKey`);
  - 2016-11..2017-12 (15 cards, the data hole: no donor row): the first own banner of the event's notice («13th of Each Month XIII
    Event, Number N, <member> is Here!», «DAILY XIII EVENT» for the XIII Revival). Each one was checked: it names the member and
    the run.
- **Second notices get no card** (tool fix, test in `test_make_event_banners.py`). `card_ids` and `wanted` now skip an entry with
  `scheduleLineOf`, as make-events.js and the Event Catalog already did. Before, EV-0648, EV-0678 and EV-0913 would have had
  cards made from their notices: two «XIII Falling Price Deal» shop banners and «The Keyblade War Part 1». The served EV-0929
  card «Part 1 & 2» covers the Part 1 dates.
- **imgVersion stays 9.** The whole dry index rebuilt with `--all-rows` gives 638 cards. The 605 cards already served are
  byte-identical, so no served picture changes. 20095 (EV-1530, undated) is not remade by the Part 4 extras file; its live card
  stays as it is.
- **EV-1103.** The record has two original rows. Row 201232 is the Jafar «Big Bonus Challenge» («Defeat Jafar 1/7..7/7» and a
  Bonus Quest, not built: the second-phase forms «Jafar (Cobra)» / «Jafar (Genie)» have no enemy id; tracked in I-257, not
  I-248, which is the 5th-anniversary «Genie Jafar» row 202665). Row 201231 is «Challenge Organization XIII Pt.2 - No.I ~ No.VI -»,
  built, card 22663. The Events tab lists only 22663. The Event Catalog draws the entry's own id, which is the Jafar banner. Four
  Part 4 entries already behave this way (EV-0478, EV-1032, EV-1086, EV-1249).
- **User decisions (10 November 2026).** The 33 cards are approved. EV-1103 and the four Part 4 entries keep the ORIGINAL
  first-row card in the Event Catalog even though that row is not playable yet (event-pages.js unchanged): the goal is to make
  every part playable (I-257), and the testers wait until the events are complete. EV-0913 keeps one card (the EV-0929 «Part 1 &
  2» card).
- **Card cross-check (Task 6 step A).** `tmp\events\p5t6\cardcheck.py` (private): all 33 staged cards equal a fresh build; each
  banner belongs to one of its entry's notices, notice date = start, member / run name in the notice title or the row's quests.
  Two flags, both checked and harmless: EV-0941 (notice 58489 carries its 2021 «Updated» date) and EV-1273 (umbrella notice
  69374 «JP 5th Anniversary Events and Campaign!»; the row banner itself reads «CHALLENGE ORGANIZATION XIII»).
- Review page (private): `tmp\events\orgxiii\cards.html`, grouped by year.

## Org XIII events served on the bench (Events Part 5, Task 6, 11 November 2026)

Local bench only (nothing published; the public play package is decided with the user later).
- **Master regen** (HANDOFF command, `KHUX_EVENT_ENEMIES=1`, `KHUX_EVENT_GEN_REPORT=tmp\events\p5d7\gen\event_stages\gen_report.json`;
  dry anchors and `server/event_ids.json` copied from `tmp\t5r` first, both supersets of the live files): 439 entries, **2,777 of
  3,570 quests served** (live before: 2,210), 36 generated maps listed. `events.json` byte-identical to the dry run. Tables changed:
  only stage, evStage, reward, enemy, enemyAttack (md5); no served stage or evStage id moved, none lost. The event row 2140000285
  (Lexaeus VII CAUTION Shadow) and its attacks 285020 / 285021 are in the master. 106 tables valid on the server.
- **Cards.** `make_event_banners.py --all-rows --extra tmp\events\t5p4\extra_part4_staging.json`: 638 cards, the 605 served ones
  unchanged, the 33 new ones byte-identical to the approved staging; `make_special_banners.py --section event`: 608 kept copies
  (76 new files, 0 changed, catalogue banner unchanged). imgVersion stays 9.
- **Resources 111** (full build, 2,015 s; 5.18 GiB in 41 parts): `gen_story_maps.py` in the build wrote the 36 event maps; its
  report and the 113 map files are byte-identical to `tmp\events\p5d7\gen`. A second regen with the build's report gives the same
  master (only the `enemy_display_orig.json` cache gained 170 missing keys, no row changed). Installed with `update-resources.ps1`
  (660 s), master revision **295** in the four session scripts.
- **Saves** (from `maxpower`, `tmp\events\p5t6\mksaves.js`: story quests above LIMIT removed, Shop rotation `gacha.rot` set so the
  Shop week holds the date): `org17` (LIMIT 540, week 2017-01-12..18: Xemnas XIII Event), `org18` (LIMIT 780, rot k 3, week
  2018-08-09..15: Axel NEW XIII), `org20` (LIMIT 940, rot k 1, week 2020-09-10..16: Challenge Organization XIII). The rotation
  week is counted from the real week: remake the saves in a later week.
- **Smoke (no battle), screenshots `D:\Progetto_Restauro_KH_UX\screenshots\t6p_*.png`.** org17: Events tab shows the «Xemnas is
  Here!» card; quest list (Xemnas I, target Possessors LV 50, 102 Lux), keyblade and friend screens, the generated map 4003348
  (DG_0100_02_00) loads with its TARGET marker, Give Up back to the list. Event Catalog: new cards in the Launch year (Marluxia,
  Larxene, Xemnas, Xigbar...), entry page and quest table open. org18: «CHALLENGE AXEL!!» card, Axel LV 500 boss card. org20:
  «Japanese ver. 5th Anniversary CHALLENGE ORGANIZATION XIII» card, Larxene 1/12 list. No crash.
- **Seen, to check:** (1) on org20 the Time Missions SP card (22459, Part 4, unchanged file, served 200) is drawn as the black
  heart placeholder in the Events tab; (2) the Xemnas I quest thumbnail shows a Daybreak Town fountain while its generated map is
  DG_0100_02_00 (thumbnail = donor thumbId).
- **Battle checks: the user's** (list in HANDOFF): Lexaeus VII CAUTION, the 14 multi-area quests, Larxene little-HP decoys,
  Marluxia run-row targets, the hpFromFootage rows.

### Battle checks on the bench (11 November 2026, master rev 295 / resources 111 + -Quick map rebuilds)

Played by hand on the bench (field and battle speed at max, maxpower deck). Two generator bugs found and fixed:
- **Guarded exits moved away** (commit bf964fb): `build_event_areas` moved an exit EXIT_KEEP (200) units from the enemy that
  stands on it in the original map, so Lexaeus IV could be crossed without fighting. The original exit is now kept when an
  enemy guards it (a doubt is logged), and `validate_maps.py` reports an enemy within TRIG of an exit as a warning («la
  sorveglia»), not an error. Benched: Lexaeus IV and VII, both guards fought, target in area 3.
- **Target battle not starting on contact** (commit cb09da1): generated event maps gave the target team a 120 x 80 arena polygon
  (arena field of the team record in the map file); the battle only started inside it, so a target that walked out of it never triggered. Original maps mostly
  use a zero polygon (JP 4.3.1: 3,379 zero vs 2,187 non-zero boss strips) and start the battle on contact. Event maps now write a
  zero polygon unless the layout gives one; Special maps keep theirs. Benched: Larxene IX target battle starts on contact.

Results:
| Check | Result |
|---|---|
| Lexaeus IV / VII (3 areas) | transitions, guards fought, target in area 3 |
| Lexaeus VII Shadow 2140000285 | Shadow look, Lv 175, 4 gauges as footage; CAUTION not seen (the team kills it in one turn; CAUTION needs HP < 20,000) |
| Larxene XI | normal Gigas Shadow Lv 180 «4 chips +5» (= 184,000 HP as footage), little-HP decoy one bar, all 3 objectives |
| Larxene IX (3 areas) | transitions, Wizard 2 gauges, target on contact (after cb09da1) |
| Xigbar II (5 areas, one room) | every transition, target Gummi Hammer in area 5 on contact |
| Vexen IV (2 areas, back exit) | Entrance back exit returns to Frozen Forest, forward again, target Defender on contact |
| Vexen XI (4 areas, back exits) | C -> B -> A -> Entrance, target Wayward Wardrobe on contact; in C the way to the exit (4363, 1266; original 4401, 1266) goes below the fallen log |
| Vexen XII (hpFromFootage) | little-HP Neoshadow 2016120033 at Lv 300 shows one bar, no chip (10,861 HP); the map holds 4 of them with the target, so «Defeat Neoshadow with little HP x 4» can be met |
| Marluxia II / IV / VI targets | run rows 16MM10233: Magic Lv 30 82 Lux, Power Lv 50 102 Lux, Speed Lv 70 119 Lux (rows give 82.6 / 102.7 / 119.6) |
| Wandering Spook look | user: a grey cloak in the wait animation; 21 downscaled pieces came from the grey recolour 5069, replaced by own purple frames (I-258) |
| First clear / replay | Larxene IX first clear +20 Jewels, replay +0; a run with no objective met pays nothing (Xigbar II) |

Bench notes: walk with a held drag (`Swipe` 3-5 s) toward the arrows, single taps move a few steps; the real target has the red
TARGET label (enemy id 10000 + base), same-name normal enemies wander too; in Larxene IX area 3 the back exit lies under the
target arrow. Time objectives were not judged (the hand-driven bench is far slower than a player).
Still to check: CAUTION with a weaker deck, Marluxia targets (attribute icon, Lux per hit), the hpFromFootage gauges of
Vexen III, Larxene I/IV/VIII and the Daily XIII quests.

### Battle checks of 14 November 2026 (master rev 317 / resources 119)

After the exact enemy graphics (13-11), the original quest music (13-11) and the status ailment table (I-273), on save `org20lx`
(= `org20` with EV-0097 kept):
- Larxene I (EV-0097, JP twin map, hpFromFootage Shadows Lv 25): field, battles, target, «Complete within 5 battles» x2 paid
  (Huey, 20 Jewels: the record lists the objective twice, as the wiki), drops; no crash.
- Challenge Organization XIII, No. XII Larxene 1/12 (Lv 500): exact atk1_o / atkSp / wait / dead; recorded with an empty Keyblade
  (`tmp\p5bench\lx.mp4`): counter slash and lightning special drawn complete. The white squares of her defeat are the
  original 21x24 white bitmap (pixel-identical to Xigbar 1607 dead, exact-twin): part of the Org XIII dead animation (user 14-11).
- Time Missions SP card 22459 now drawn (the black heart of 11-11 is gone).
Not judged: the hpFromFootage gauges of Larxene IV/VIII, Vexen III, Daily XIII (a max deck kills them in one hit; the
mechanism is the one benched on Vexen XII and Larxene XI).

## Part 5 summary (Org XIII events and The Keyblade War, 14 November 2026)

- Served: 32 Org XIII events / 451 of 504 quests (monthly XIII Events 2016-17 rebuilt from khuxwiki + JP 13-stage tables: 213/242,
  177 on the JP map of the same quest, 36 on reconstructed maps, 14 multi-area; NEW XIII 2018-19, SP Challenge, Final Challenge:
  183/198; Challenge Organization XIII 2020: 30/38), The Keyblade War part 3 per Union 25/26. All events: 349 / 2,843 of 3,570.
- Held: enemyAmbiguous 19, enemyMissing 2, mapUnusable 32 (reasons in the Event Catalog).
- Notice «Events», section «Org XIII events» (counts from events.json, groups in `event_config.json` `orgxiiiCensus`);
  its enemy-graphics paragraphs follow the exact import (the Lexaeus tint, Ribbitoad dot, Demon Tide frame, Leviathan glints,
  Metal Giant sparks claims removed; I-250 enemies back).
- Lessons: a map generator change needs a bench walk (guarded exits, zero arena polygon); a renamed/reused donor row needs its
  own id range (2140000000 + donor id); never rerun `build_event_enemies.py` (add rows with `add_run_row.py`).

## Boosters: client behaviour (Events Part 6, Task 1, 14 November 2026)

Study of the 4.3.1 client (private notes, nothing of the client in the repo) and a bench test with three hand-made test rows of
the `emblem` table, served for one session only (the test rows and the temporary server change were not committed). **The client
applies the Booster bonus by itself: the server only serves the `emblem` rows and the owned ids in `emblemIds`.**

- **Row.** 16 fields, all required (a missing one drops the row). `category` 1 = keyblade Booster, 2 = Medal Booster.
  `endTime` uses the usual `YYYY-MM-DD HH:MM:SS` form. An owned id without its row, or a reward of type 34 without its row, is
  read without a check: every served id needs its row.
- **Medal Booster** (`category` 2). `source` 0 = every Medal, else one of the Medal's `source` codes (the Booster groups of the
  Medal table). `attribute` 0 = all, 3 / 4 / 5 = Power / Speed / Magic, 6 / 7 = Upright / Reversed. `upperParam` in hundredths
  of a percent (+25% = 2500). It raises the **special attack**: the Medal Details page shows the cyan plate «+N%» (sum of the
  matching Boosters). It does not change a normal attack.
- **Keyblade Booster** (`category` 1). `keybladeCategory` = the keyblade family (`keyblade.category`, Lady Luck 301), `slot1..5`
  the slots it covers, `attribute` 2 = all-attribute match, `upperParam` in ten-thousandths of the slot multiplier (+2.00 = 20000).
  It is added to the slot multiplier, shown on the Equipment screen, and raises every attack of that slot.
- **Boosters list** (Profile, «Boosters»): one cell per owned id (icon, name, description, NEW, «Expires N days» countdown from
  `endTime`). The client never removes an expired Booster nor its bonus: **the server expires them** by leaving their ids out of
  `emblemIds`. The client merges the lists it receives without duplicates: send each id once (copies of a Booster stack only as
  different ids, as in the original data).
- **Responses carrying `emblemIds`:** `PUT /emblem/list` (at login and when the list opens), stage clear, sphere update, present
  receive, mission receive, Moogle Shop buy, advertisement, PvP start.

Bench (save `boost0`, master revision 319, test rows: «P Booster +25%» Medal / Power, «Booster Upright +10%» Medal / Upright,
«Lady Luck Booster +2.00» keyblade / Lady Luck all-attribute match slots 1-5):

| Check | Result | Frame |
|---|---|---|
| Boosters list | 3 cells, NEW, «Expires 13 days»; icon a placeholder (the `Emblem_*` pictures are not in the WW resources: Task 6) | `t6s_dialog` |
| Power Upright Medal (SN+ Illustrated Cloud) | plate «+35%» (25 + 10: different Boosters add up) | `t6s_plate_p` |
| Speed Upright Medal (SN+ Illustrated Riku) | plate «+10%» | `t6s_plate_su` |
| Speed Reversed Medal (SP Xion) | no plate | `t6s_plate_s` |
| Lady Luck +60 slots | ×6.300 / 6.400 / 7.000 / 7.500 / 7.800 with, ×4.300 / 4.400 / 5.000 / 5.500 / 5.800 without (+2.00 each; Treasure Trove unchanged) | `t6s_kb_on`, `t6s_kb_off` |
| Same normal attack, slot 1, Training Grounds | 320,9xx with, 218,158 without (x1.47 = 6.3 / 4.3); second hit about 87 thousand in both | `t6s_dmg_on`, `t6s_dmg_off` |

Still to check in the build task: a special attack with a Medal Booster (damage), the type 34 reward in an objective and on a
board cell, whether reopening the list drops a Booster expired meanwhile, and the «7★» Boosters (no rarity field: held).

## Boosters (Events Part 6, Tasks 2-7, 14 November 2026)

- **Records** (private builder `tmp\eventsoostersuild_boosters.py`, user gate 14-11): 288 Boosters paid by served sources, 0 held:
  19 from event quests (EV-0556, EV-0624, EV-1217), 265 Event Board cells (2018-10, 2019-02, 2019-04, 2019-06, 2019-10,
  2019-12), 4 Raid Board cells (HD Vanitas (EX+) +5% x3, Final Form Sora +5%). Effects from the donor descriptions (label
  `boosterEffect`); expiry from the event's notice (260; always the end of the event's month) or the event's window (28, label
  `boosterExpiryWindow`); the span from the start of the event to that expiry is how long a Booster lasts from when it is obtained
  (8 to 32 days). Raid cells named only by the wiki take distinct donor copies, lowest id first (label `boosterIdByName`, user 14-11).
- **Group Boosters**: the served medal rows get the donor Booster-group codes after their series code (`make-emblems.js`, user
  14-11): 126 medal rows (Mickey 181101, Sora & Peter Pan 190201, Sora & Chip & Dale 190322, Sora & Stitch 190530, Graveyard 191001).
- **Server**: `make-emblems.js` (rows, `game_data/boosters.json`, group codes), `boosters.js` (owned, once per source, same id
  renews, expiry by leaving the id out, pending Boosters granted at login), type 34 paid from quests (`routes-events.js`), Event Boards
  (`event-boards.js`) and Raid Boards (`raid-boards.js`) through `grantSphereReward`.
- **Icons**: `originals.tsv` section 55 (24 JP 4.3.1, imageId 30 and 52 from a community archive copy, user 14-11).
- **Master 321 / resources 121**: changed only emblem, medal, stage (4 rows with a type-34 reward), evStage and the three sphere
  tables; 2,843 quests as before. Event Board sets handed out: 11 (were 6). EV-1217 «Get Yourself a Booster» is no longer held for its
  Boosters but for its map (`mapUnusable`, not imported); the 2019-02 set is not handed out (no entry of it served as a board event).

Bench (instance 0, saves `boostold` = org20lx with a pending Booster [Mickey] +25% and EV-0556 kept, `boostexp` = the same, played
past the expiry):

| Check | Result | Frame |
|---|---|---|
| Login with a Booster recorded before Part 6 | granted once, log line; list shows its icon and «Expires 13 days» | `t6p_dialog` |
| Group Booster on a Mickey medal (SN++ - KH II King Mickey) | plate «+25%» | `t6p_plate_mickey` |
| Same on another medal (SN+ - Illustrated Cloud) | no plate | `t6p_plate_other` |
| EV-0556 1/10 objective 1 (type 34) | the Treasure Trove Booster icon in the objectives popup | `t6p_05` |
| Real clock past the expiry (`-RealNow 2026-11-29`) | «No current boosters.» | `t6p_expired` |

Played by Claude on the bench (user 14-11, saves `boostold` with EV-0624 kept, `boostbd` = + EV-0973 kept and 20,000 test Event
Coins in the 2019-12 set, `boostrd` = + WW-E38970-1 kept and 50,000 test Raid Coins; test balances only on these bench saves):

| Check | Result | Frame |
|---|---|---|
| EV-0624 5/15, objective 1 «Defeat the target enemy within 1 turn» (Mickey Booster icon on the objective) | cleared: `Booster [Mickey] +5%` (1811009) granted once, key `{stageId 4001669, objective 1}` | `t6b_15` |
| Same quest replayed, all objectives again | no grant | log |
| Boosters list after the clear (same session) | two Mickey Boosters; the new one shows «13 days» at once (session-span endTime) | `t6b_dialog2` |
| 2019-12 «Starlight Booster» Event Board, cell 1 (100 coins) | popup «Unlocked Starlight Booster +0.10!» with its original icon; granted once, key `{board 4000053, cell 18}`, 32 days | `t6b_30` |
| Starlight +60 slot 1 after it | x4.300 (x4.200 before: +0.10) | `t6b_38` |
| Gear Golem board «Booster [HD Vanitas (EX+)] 4/16/18», Unlock All | three copies granted (1804001-1804003, keys cells 16-18), 16 days | log |
| SP Xion (Speed Reversed) | plate «+15%» (3 x 5%); Upright medals no plate | `t6b_plate_rev3` |
| Boosters list with six | every icon shown, the community-archive icon 30 included | `t6b_dialog3` |

Noted: the 2019-12 Event Board cards have no picture (blank cards; board art of that set not served, a separate issue). The EV-0556
1/10 objectives (all together, 5 chests in 5 rooms) were not completed by bench automation; the special-attack damage with a Medal
Booster was not measured (automated taps did not trigger a special attack): the client study and the plates cover it.

## Part 6 summary (15 November 2026)

- 274 Boosters paid by served sources: 4 event quests (EV-0556, EV-0624 x3), 267 Event Board cells (completion rewards included),
  3 Raid Board cells (HD Vanitas (EX+) +5%). The private records hold 320: also the 15 Boosters of EV-1217 (held for its map,
  `mapUnusable`) and 30 P/S/M +3% of quests held for other reasons; they are paid when their quests are served.
- 15-11 fix: `build_boosters.py` scoped only cell rewards, so the two **completion** Boosters of 2019-02 ([Sora & Peter Pan] +18%
  1902117 and +34% 1902133) were unbuilt and the whole set stayed held (`boardsLater`, 5 served events without boards). Now board
  completions are in scope, and every event quest record is read (a held quest no longer drops its Boosters from the records).
  Master 323 (only emblem, evStage, sphere, sphereArray, sphereMasu changed; 2,843 quests as before): 12 sets handed out,
  0 boards skipped; cards 4000007 / 4000008 = JP 2300181 / 2300182 (resources 124).
- Expiry under the Story calendar (user question 15-11): a Booster from a board or event reached later (kept event, older set)
  lasts its full span from when it is obtained (`boosters.js` until = now + spanDays, real clock), so it still works; each
  source pays once ever.
- Notice: «Events» section «Boosters» (counts from boosters.json + master sphereMasu + served `boosterRewards`), Event coins
  paragraph without the «later update»; raid notice no longer lists the Final Form Sora Boosters among the JP-only rewards left
  off; Event Catalog `boardsLater` text neutral.

## Part 7 summary (avatar boards, 16 November 2026)

- **Served** (master revision 331, resources 130): 461 avatar boards from the private records (297 entries): 343 on sale for
  Jewels (outfit 227, gem 56, skill 46, medal 11, Jewel Booster 3), 118 free (Avatar Coin 34, Avatar Coin Booster 76, level 8).
  Windows on the story calendar; a week board counts down to the end of the story week (not original, user 15-11). Bought =
  kept for good. 29 boards held (24 Enhancement Set+ sets 3-6, 5 Draw Ticket: no dated notice); Medal Fusion Set 1 unmapped
  (no WW source). Start-Up Boost Board permanent, 100 Jewels (khuxwiki: on sale for good from 2.3.1, date unknown).
- **Skills:** 6 skills imported from the donor (1265-1270) keep an empty description (no text in any source).
- **Cards:** section 56 (445): 225 WW, 139 JP 4.3.1, 34 khuxwiki Avatar Coin cards, 4 Bad Guy Breaker; 42 cropped from
  screenshots (corners cleaned, light sharpening); 8 Skill Enhancement runs keep the plain card. KEPT twin cards = section 57.
- **Avatar Board Catalog** (Special tab, gold banner evStage 22929): boards left the Event Catalog (user 15-11); own keep,
  one entry, independent of the event keep; Bought / Not bought, node PROGRESS, board cards in rows and pages.
- **KEPT twins** (453, 5500000+n, `event_ids.json avatarTwins`): KEPT BOARD tab, no countdown, purchase and progress shared
  with the original; delivered with «Unlocked an Avatar Board!» on re-entering Avatar Boards (user 15-11); after an unkeep a
  bought board stays as its twin until the next login.
- **Notice (Task 7):** «Events» (11/16) sections «Avatar boards» and «Avatar Board Catalog» (`routes-info-album.js
  avatarNoticeFacts` / `avatarBoardLines`, counts from `avatar_boards.json` and `avatar_img/cards.json`); the Gem Boards
  sentence points to them; the Booster sources count the Avatar Board cells (79) apart from the raid cells; the BOARD entries
  are no longer counted as events in the «events in the data» figure (439). Player text no longer says «restored»: raid
  pages and notices «Not built yet», Special Catalog «Not built» (quests left out for good), Spirit deal page reworded.
  Only a server restart is needed (no regen, no resources).
- **Not benched:** a bought board in its own later week after an unkeep (needs a week change; covered by tests).

## Part 10a summary (events of 2016-11..2018-03, 22 November 2026)

Design `docs/superpowers/specs/2026-11-22-events-part10-design.md`, plan `docs/superpowers/plans/2026-11-22-events-part10a-records.md`, I-294.

- **Data hole, smaller than assumed.** The donated WW master keeps the stage rows of almost every quest of the period (calendar-ordered id
  blocks, one per khuxwiki run); only the evStage rows (dates: the notices) and the WW-only map files (50xxxx, 700xxx) are lost.
- **Private input and builder.** `tmp\events\part10\hole_input.py` (census fixes, census id -> donor stage block, windows; checked by
  `check_hole_input.py`) and `build_hole.py` (the data-hole path of the Part 5 Org XIII builder: pilot census/extract/build with `--twins`,
  JP maps by own key or by content via `jpmatch.py`, level-shifted twins (user rule 10-11), I-251, WW enemy check with `WW_SAME` and
  `mapEnemySwaps`, donor 2021 medal ids mapped to ours by name/rarity/attribute, boosted copies by bonus) -> `tmp\events
ecords\hole_2016_18.json`.
  Double run identical. EV-0152 «Coliseum Challenge for Gems» pages pinned in the pilot `build.py` (P4_PAGE_PIN, «(March 2017)» pages).
- **Server.** `make-events.js`: `map.source 'generateLater'` = held «map to generate (Events Part 10b)», never listed for generation;
  a reward medal of the same id whose name differs only by «Ver.» is that medal (KH Sora A = KH Sora Ver. A). `event_config.json`:
  `serve.censusIds` + 11 CELEB / SPEC / COLLAB quest events, `mapEnemySwaps` 715070 (Gummi Hammer -> Morning Star). `raid_config.json`
  `boostedMedals`: Maleficent B 6★ +1,000 STR (copy 1300918, donor 123256). Enemies: 12 donor rows added to the private event enemy file.
- **Served.** 153 of the 569 quests of the period (master revision 355, resources 143): the JP-map events (Maleficent, Tag Team,
  Coliseum One-on-One, KH 3D, maze, FFRK, Time Attack, Boss Time Attack, Consecutive Battle, Flower Snuggly, 6M, Evade!).
  Held: 401 «map to generate» (Part 10b), 11 WW enemy check (one enemy more / other), 4 level shifts refused by the import check
  (EV-0310 Advanced 3/4, EV-0398 x3). EV-0178 (30 «Colossal Creatures» quests, no donor rows) is wiki-only (Part 10b).
- **Notice.** «Events» section «Events of 2016-2018».
- **Cards** (user 22-11: every playable event must have its original card). The 67 playable events of the period had none:
  `make_event_banners.py --fetch` on their ids fetched the banner of each event's own notice (70 files, private
  `reference\event_banners_ww`), then the cards were built and checked one by one (the dates printed on each banner match the
  event). One wrong pick: the World of Final Fantasy notice 24589 opens with a 1340x924 game advert; its 640x140 «Special Avatar
  Event» banner (3rd image) is given by `--extra` (private `private\events\event_card_extra.json` {"23018": ...}). No other card
  came from an image of the wrong shape. The 52 entries still without a card are Avatar / Gem Boards (no quests; own catalogue).
  Every event with quests now has a card. imgVersion 10, master revision 356.

## Part 10b summary (generated maps, drops and Event Boards of 2016-2018, 22 November 2026)

Plan `docs/superpowers/plans/2026-11-22-events-part10b-generated-maps.md`, ledger `.superpowers/sdd/2026-11-22-events-part10b-generated-maps/progress.md`, I-295.
- **Generated maps.** The private builder (`tmp/events/part10/build_hole.py`, steps 3b-3d) turns the 401 quests held in 10a into
  generated-map quests with the Part 8 page method (`tmp/events/hsc/gen_areas.py`): areas in khuxwiki page order, one group per
  enemy row with its LV, the target row last, rooms by name. Enemy rows only from evidence: the row the JP 4.3.1 event maps of
  2016-11..2018-03 place for the name in at least 90 % of at least 10 placements, else the HSC base row; targets: the 1xxxx row placed
  as target in at least 90 % of the JP maps' target placements. khuxwiki typo «RoomTarget enemy» read as room + target row.
  Result: 334 quests generated (64 without a khuxwiki page, 2 rooms without a code, 1 target row unread stay held); make-events.js:
  37 enemyAmbiguous, 14 page/area count mismatches, 10 «Collect all materials», 2 Large Fireworks missing; **292 served**.
- **Drops.** Only where the event's notice names a drop (EV-0094 Christmas Sora; EV-0095 / EV-0123 the medal of the day): normal
  enemies the 5★ at 500, the target the 6★ at 500, «random» days split; odds of the KH 3D rows 69300-69304 (EV-0134). Record field
  `genDrops {byName, target, rows}`, reward rows 2316000+, label `dropsCalibrated` (make-events.js, test gen_drops_calibrated);
  make-game-tables.js counts the reward ids of `event_gen_maps.json` as make-events rows. Goofy A / KH Sora A / Donald A have no
  5★/6★ here: no drop on their days.
- **Event Boards.** 12 sets / 41 donor boards mapped to the coin events by notice evidence (`tmp/events/part10/hole_boards.json`,
  appended as sets «hole-*» by `add_hole_boards.py`); a data-hole record in a board set is a board event (eventType 1, test
  board_entry_data_hole). 8 sets handed out; EV-0074 / EV-0090 / EV-0121 / EV-0242 noCoinSource (coins were drops, or no quest).
  Board card pictures are blank (no boardArt yet).
- **Large Fireworks (user 22-11).** Donor rows 26 / 10026 (and Festive Fireworks target 10025) added to the private event enemy file; model 26 complete in JP 4.3.1, rendered and approved by the user (`recon/tools/event_enemy_families.json` family 26), built in enemy_gen (336 models), resources 145: EV-0108 Beginner / Intermediate and EV-0310 Beginner Round 3/4 served (bench p10f: four Large Fireworks Lv 50 on the generated map).
- **Served.** Period 725 of 905 quests (was 430), revision 359, resources 145. Bench p10e: HD Aqua Beginner on its generated map, 30
  Event Coins, HD Aqua Set 1 board.

## Part 8 summary (High Score Challenges, 16 November 2026)

- **Served** (master revision 340, resources 138): **67 High Score Challenges** of 2016-2021 (all 71 records built, 67 with a
  map; all events 417, 2,914 of 3,636 quests). Client behaviour in «High Score Challenge: client behaviour» above; routes in
  `server/routes-hsc.js` (stage clear `highScoreReward[]`, Rankings, `/ranking/reward/check` only on `type` 5, the result popup
  opens on Home by itself after `/mypage rankingHighScore` 1), thresholds in `server/ranked-rewards.js` (pure).
- **Maps:** 27 lost maps generated from the khuxwiki pages (`wikiRoom` + `wikiAreas` + `hscBaseRows`): per-group levels, the 14
  three-path pages built branched (start area with one exit per path, layout of the JP three-path maps 300370/300390/300400),
  rooms Rocky Crag / Mine: Section 9 / Ballroom found in `reference/world_schema/areas.json`; per-member enemy rows (EV-0067
  Pumpkin Soldier by attribute, EV-0874 Ribbitoad 11588); 6 JP twin maps (`hscJpTwin`), level shifts (`levelShifted`),
  EV-0050 on JP story map 60422. Enemies: Chipper Chef 1513 and 129/172/248 approved on their renders (16-11).
- **Thresholds (user 16-11):** the original leaderboard borders, from the online evidence (private `tmp/events/hsc/online_scores`,
  230 rows for 63 events: Border Rank screens in videos, community posts), else the era pattern; brackets above rank 1,000
  lowered to the rank-1,000 border (rank 1 = that score), `originalScore` kept and shown («Original:» on the Details page); no
  threshold below half the lowest point milestone; the cap is at least the top milestone (#3, #47, #51). The ceiling model and
  the bench «reference deck» samples were dropped (the user: runs cannot be played in full on the bench). Point milestones
  unchanged. Private table `tmp/events/hsc/THRESHOLDS.md` approved by the user.
- **Score bonus medals:** the SCORE badge art imported from JP (§60); the served evStage closes the HSC rows not listed now so
  the client's bonus marks follow the listed HSC; Supernova forms count as their 7★ root (served `groupId`, 142 families, as
  the 2021 master); battle multiplier checked by the user (+26% medal: 36,291 -> 45,051 on the same hit).
- **Notice:** «Events» section «High Score Challenges» (`eventHscLines`). JP logo «SCORE BONUS MEDAL» kept (user choice).
- **Open:** PvP Rankings unreachable (known PvP crash); Coliseum «Tier Rewards» `GET /colosseum/reward/list` unhandled
  («200 ERROR :125», separate issue); new-game crash after naming reported by a tester (not reproduced
  server-side, waiting for a log); `test-special-server` fails also before this part («VIP fissata senza VIP»).

## Event Board card pictures (14 November 2026)

User 14-11: the Event Board cards were the plain lilac frame since Part 3 (no `img/sphere_incentive/<id>.png` for the event board
ids; Roboloid has none of them; the worldwide resources we hold do not carry them). Search (private `tmp\eventsoards\wiki_cards`,
`wiki_shots`): the khuxwiki card pictures («Preview - …», 41 files) and the screenshots of the worldwide boards («Event Board - … KHUX»,
70 files), downloaded with the user's go, matched against the 3,244 JP 4.3.1 cards on the opaque pixels.

- 83 boards (69 served): 79 JP 4.3.1 originals (34 identical to the wiki card, 37 the same picture with the JP glow, checked one by
  one at full size, 8 found from the board screenshot), 2 khuxwiki cards (Cherub Male / Female: no JP card), 2 cut from the
  screenshot (Bad Guy Breaker Booster: the JP card has another drawing; Event Board 1 of October 2019: no JP card), label `boardArt`.
- The worldwide December 2019 boards show the emblem-only cards (JP 2300227-2300245: the 16 keyblades, then P/S/M); the wiki card
  pictures of those boards are the versions with the Cid / Huey-Dewey-Louie medals (other runs): the screenshot rules.
- `event_config.json` `boardArt` (donor board id -> jp / loc), `event-boards.js` art, `make-events.js` writes
  `game_data/event_board_art.tsv`, imported by `build-resources.ps1` like the raid board cards.

## Avatar boards served (Events Part 7, Task 6, 15 November 2026)

Master revision 329, resources 128 (`build-resources.ps1 -Append`, 408 records: the 402 avatar board cards and the 6 Moogle Shop
tab / Traits row pictures of 905c5caf).

- **Regen.** make-game-tables (imports the 6 donor skills as 1265-1270), the private records rebuilt
  (`tmp\events\avatar_boards\build_avatar_boards.py`: 296 entries, 907 board windows), make-game-tables again with
  `KHUX_AVATAR_BOARDS`: **460 boards served** (342 on sale, 118 handed out, 8 of them the level boards), 0 held by the build,
  0 cells unmatched. The records hold 29 boards back (24 Enhancement Set+ sets 3-6: no notice dates the monthly sets after
  May 2019; 5 Draw Ticket boards: no notice dates them) and 2 unmapped (Medal Fusion Set 1: no source; Start-Up Boost Board:
  no dated source). Event Catalog: 264 BOARD entries (703 entries in all), `event_ids.json` +264 `rows`, +87 `avatarBoards`
  (append-only).
- **Skill texts.** The 6 imported skills keep an empty description: khuxwiki has no text for any of them (its only skill
  list, the «Medal» page, lacks these six names). To be declared in the notice.
- **Card pictures** (`recon/tools/originals.tsv` section 56, 402 lines; never drawn): 225 worldwide cards of the same board
  id (image archive, copied to `--loc` `img/sphere_incentive_av/`), 139 JP 4.3.1 cards with the same picture as the khuxwiki
  card of that board or run (Skill Enhancement runs by date section, Enhancement Set+, medal boards, Monstropolis, Jewel
  Boosters, the Avatar Coin Booster boards = the cards of the December 2019 Event Boards), 34 Avatar Coin Boards with the
  khuxwiki card (the JP card carries a Japanese date banner), 4 Bad Guy Breaker Booster boards with the card cut in Part 6.
  41 of the 50 got a gold-background card later (user 15-11): the khuxwiki Power / Magic Gem (Premium) pictures (2017 and 2018
  versions) and the Moon Gem Board, resized to 306x306 (`img\sphere_incentive_av`, review `screenshotsv_cards_gold_added.png`);
  then the 13 Speed Gem Premium boards and the Sun Gem Board, cut from the top-left corner of khuxwiki's board-layout screenshots
  (`Avatar Board - Speed Gem KHUX` for 2017, `... Speed Gem 2 KHUX` for 2018, `... Sun Gem Board KHUX`; review
  `screenshotsv_cards_cropped.png`).
  Prime - Halloween Sora is cut from the clean card in the purchase popup of a player video of 12 October 2018 (the list view
  draws «Offer ends» and the price over the card, the popup does not).
  8 boards keep the plain card: the 8 Skill Enhancement runs
  (2020-02-21, 2020-04-20, 2020-10-12, 2020-11-02): khuxwiki has no section for them and none of its board screenshots carries
  their skills. Review sheets: `screenshotsv_cards_found_1.png`, `av_cards_found_2.png`, `av_cards_missing.png`.

Bench (saves `avb19` = events2 with 30,000 test Jewels, story week of 18 April 2019; `avb20` = hol20g with 100 Jewels, week
of 17 December 2020; both bench only):

| Check | Result | Screenshots |
|---|---|---|
| Outfit / skill / gem boards on sale listed with price and countdown | «Offer ends in 13 hours», 2000 / 3500 / 2500 Jewels | t6_av1, t6_av3 |
| «Offer ends in» vs Moogle Shop countdown | same: 13 hours (Shop rows «13 hours left»); a month later 4 days on both | t6_ms_traits, t6_m6, t6_m5 |
| Buy (Skill Enhancement Board A) | popup «Spend 2000 Jewels», «Purchased Avatar Board!», Jewels 30,000 → 28,000 on screen at once | t6_buy1-3 |
| Open, unlock a skill cell | «You got a Skill Medal!» (Attack Boost VIII Max, skill level 20 = maxLv) | t6_open1, t6_node1-2 |
| Gem Board (Enhancement Set+ 1: Magic Gems) | bought (28,000 → 24,500), Unlock All, «Unlocked Magic Gem!» | t6_gem5-7 |
| Level boards (285-300) | announced at login («Unlocked an Avatar Board!» Pastry Cook ... Chip Snuggly) | t6_home2, t6_pop6 |
| `-RealNow` a month later | bought boards still listed; ended boards gone (KH II Cloud / Tifa, the 1 May 2019 Set+ runs; count 154 → 151); the chained Set+ 2 stays hidden behind Set+ 1 | t6_m6-9, t6_scan_names2 |
| Avatar Coin Booster Board (M Booster, Dec. 2020) | 200 Avatar Coins, «Unlocked M Booster +30%!», completion 6★ Chip | t6_d3, t6_b1-5 |
| Refused purchase (100 Jewels, 1500 board) | the client refuses by itself («You don't have enough Jewels. Would you like to buy some?»), no request, no «200 ERROR :73» | t6_r1 |
| Kept BOARD entry (Nov. 2020 Avatar Coin / Booster boards) | Event Catalog FIND «Treasure», «Keep in Events» → «Kept: its boards are in Avatar Boards»; 21 boards announced on the home, count 172 → 193 | t6_k6-12, t6_kpop3 |
| Event Catalog load (165 KB) | page drawn 2.7-3.8 s after the tap | t6_cl1-6 |
| Moogle Shop JP art (905c5caf) | Traits rows gold and blue drawn with rounded corners and a small gap under the frame; tabs JP art, on and off; no crash | t6_ms_traits, t6_ms_items |

## Avatar Board Catalog (Events Part 7, Task 5b)

User decision 15-11: avatar boards are not playable events, so they leave the Event Catalog.
- **Event Catalog:** events only (no BOARD entry, no undated board list). Its intro links to the Avatar Board Catalog. On the real data it is 111 KB packed (was 165 KB).
- **Avatar Board Catalog** (`event-pages.js boardCatalogPage`, `GET /web/avatar/catalog`): every entry with avatar boards (the 264 BOARD entries plus EV-0741, an event that also sold boards), with the Task 5 status lines, «Unlocks after the previous board», «On sale this week» from `listState`, the prices of each window and the undated held boards at the end. TYPE filter by board group. Details: `GET /web/avatar/board/<evStageId>`. 84 KB packed on the real data.
- **Entry points:** its own banner in the Special tab, right after the Special Catalog banner (user 15-11). The block under the intro of the Special Catalog page and the line at the top of the Event Catalog were removed (user 23-11): the banner is the only way in.
  - The banner is an evStage made by make-events.js (`avatarCatalog`): eventCategory 1, eventType 0, the Training Grounds 970000 as the Special / Event / Raid Catalog banners, Details `/web/avatar/catalog`. Its id is the `event_ids.json` `rows` number of `@avatarBoardCatalog` (append-only). `events.json` `avatarCatalog`; routes-events.js `withAvatarCatalog` puts it in the Special tab list; it is neither a home plate nor counted in the Special Progress.
  - Its picture (user 15-11): our own banner in the gold catalogue family, in GOLD (`make_special_banners.py avatar_option`: gold rays, the Avatar Coin of the game UI behind the avatars of three original board cards, the family title, subtitle, TRAINING sticker and frame). `recon/tools/make_avatar_catalog_banner.py` writes it to `game_data/event_img/<id>.png` after the regen (id = `evStageBase` + `event_ids.json` rows `@avatarBoardCatalog`); `--montage` gives `screenshots\avb_catalog_banner_gold.png` (the four catalogue banners).
- **BACK:** the catalogue rows carry its origin (`?from=catalog&cat=special|event`), so BACK returns to the catalogue with its own BACK bar; an event page links to its Avatar Board page with `?from=event`.
- **Package save:** `make-package-save.js` clears `avatarBoards.kept` too.
- **Own keep:** `player.avatarBoards.kept` (routes-events.js `keepBoard` / `unkeepBoard`, POST `/web/avatar/keep/<id>` and `/web/avatar/unkeep`). One entry at a time, independent of `player.events.kept`. `avatarKept()` and the sphere body cache key read it. An older save whose `events.kept` holds a BOARD entry is read as the board keep and moved at login (`migrateKept`); one that kept an event with served boards (EV-0741) keeps the event and gets the same key as board keep (once: `player.avatarBoards` marks the save as migrated). An entry whose boards are all held is «Not built yet», never keepable.
- **Bench fixes:** the keep messages say «Leave and re-enter Avatar Boards»; a kept entry's boards join `avatarBoardsSent` silently (`avatar-boards.js markKept`), so the next check pops no «Unlocked an Avatar Board!».

## Avatar Board Catalog cards and filters (Events Part 7, Task 5c, 15 November 2026)

User 15-11: the rows showed «No card in the original» because a BOARD entry has no event card.
- **Cards:** `recon/tools/make_avatar_card_web.py` copies the board cards the client shows in Avatar Boards (`img/sphere_incentive/<id>.png`) into `server/game_data/avatar_img/<sphereBoardId>.png` (git-ignored).
  - It reads the section 56 rows of `originals.tsv` with the reader of `import_originals.py`, so the sources and the resolution are the same as in the resources build.
  - It only resizes, to at most 160 px. It takes only the boards of `avatar_boards.json` and writes `cards.json` {version, ids}.
  - It is re-runnable: run it again after the loc cards change (corner cleaning). Stale cards are removed and the version changes with the pictures. The server reads `cards.json` at request time: no restart, no master regen, no resources build.
  - Real data: 445 cards (~44 KB each). The 8 Skill Enhancement runs have the plain card and show a neutral box.
- **Route:** `GET /web/avatar/img/v<version>/<sphereBoardId>.png` (`server.js respondAvatarCard`). Only numeric ids are accepted, other names and paths give 404. It sends `Cache-Control: public, max-age=3600`, as the other image routes do.
- **Board table:** the Avatar Boards table has the class `ab` (card | Board | Dates | Price | Status). Board and Dates wrap; Price stays on one line. Page budget test: 120 KB packed (`board_catalog_size_budget`).
- **Catalogue row:** up to 3 served boards' cards side by side at the row height (70 px), «+N» for the others. An entry with no served board shows a «No card» box, never «in the original».
  - The card ids, the «+N» number and the row marks are packed apart (`catalog-pages.js packCatalog` `fields.c` / `cm` / `a`), so the rows still share their templates.
  - `kxImgs` loads every card of a shown row (`data-src`, `loading="lazy"`). The page is about 104-110 KB packed on the real data (was 84 KB).
- **Board page:** each board line has its card (64 px) before the name, price and status. A held board or a plain card shows the neutral box. A BOARD entry has no event banner; an event that also sold boards keeps its card, with the «No card» fallback.
- **Filters:**
  - SHOW «Bought» / «Not bought» (`avatar-boards.js owned`). A board on sale counts once it is in `avatarBoardsBought`. A free board (type 1) counts once it is in `avatarBoardsSent` or has a node unlocked.
    - Bought = at least one board of the entry owned. Not bought = at least one served board not owned yet, so a partly bought entry is under both. The rule is in the sheet's help text.
  - The state options stay, because each one selects board entries: In Avatar Boards now, Can be kept now, Kept, Later in the Story, Not built yet. None was dropped.
  - PROGRESS is counted on the nodes (`avatar-boards.js progress`): Completed (every served board complete, crown on the row), In progress (a node unlocked), Not started.
  - FIND «Board, character or outfit name», matching the entry name, the board group and the board names. No event wording is left in the panel.

## Start-Up Boost Board, catalogue banner and keep delivery (Events Part 7, Task 6b, 15 November 2026)

Master revision **330**, resources **129** (incremental on 128: 43 records = the 42 new cards of section 56 and the
Start-Up Boost Board card). Regen: the r328 HANDOFF line (`KHUX_WORLDTOUR=0`) plus `KHUX_AVATAR_BOARDS`.
- **Start-Up Boost Board** (donor 2510000, user ruling 15-11): khuxwiki «permanently available from version 2.3.1»; the date of
  2.3.1 is in none of our sources, so the entry `startUpBoost/medal` is listed in every story week (window 2016-04-07, the first
  Shop story week, to 2021-06-29, end of service), 100 Jewels, label `permanentFromWiki` with its `reconstructedWhy`. 19 nodes at
  0 Avatar Coins: 8 x «Increase Keyblade cost capacity by 5» (rewardSelect 22, value 5) and 11 x 6★ Cid 10 (medal 90078),
  completion 6★ Cid 10. The builder checks these counts and stops if the donor row differs. Served id 5000453; card = khuxwiki
  «Preview - Start-Up Boost Board» (the original file is already 306x306). «Medal Fusion Set 1» (2500001) stays unmapped.
- **Builder fix:** `build_avatar_boards.py` read our served `sphere` rows as standard boards; after a regen with
  `KHUX_AVATAR_BOARDS` the served avatar boards (5000000-5999999, level 2100119-2100126) are in it and 25 entries vanished
  (avatarCoin runs 2020-21 and level 285-300). Those ids are now left out of that read: 297 entries (296 + Start-Up), 29 held,
  1 unmapped, the other 296 entries byte-identical to Task 6.
- **No weekly countdown** (`avatar-boards.js servedRow`): a type-2 row gets the end of the story week only when one of its
  windows is in the story week. A permanent board (`index.permanent`) and a board listed only through the kept catalogue entry
  keep the row's far end (2099-12-31): the client then draws the card **with no «Offer ends» plate at all** (bench: Start-Up
  Boost Board, Sun / Moon Gem Board, Prime - Halloween Sora), next to week boards that say «Offer ends in 10 hours».
- **Kept boards reach the client** (`markKept` / `check`): the client asks `GET /user/sphere` only at login, so a board kept
  mid-session was never delivered (Task 5b had marked it as sent). The kept boards now wait in `player.avatarBoardsKeptPending`:
  the home check (boardTypes 1-11) skips them, the Avatar Boards list check (boardTypes [1,2,6,8,10,11], sent on entering the
  list) delivers them, on sale or not; a login list delivers them too. The client shows one «Unlocked an Avatar Board!» per
  delivered board, in the list (not on the home).
- **Avatar Board Catalog banner**: evStage **22929** (`@avatarBoardCatalog` 2929; the Start-Up entry took 2928 first),
  picture `game_data/event_img/22929.png` from `make_avatar_catalog_banner.py`.

| Check | Result | Screenshots (D:\Progetto_Restauro_KH_UX\screenshots) |
|---|---|---|
| Special tab | gold «Avatar Board Catalog» banner right after the Special Catalog banner; both open the Training Grounds, no error | t6b_sp1, t6b_sp2, t6b_sp4 |
| Banner Details | opens the Avatar Board Catalog (266 entries, no BACK bar from the banner); entry page BACK returns to the list | t6b_cat1, t6b_det1, t6b_back1 |
| Event Catalog | 415 events, no BOARD entry; link to the Avatar Board Catalog | t6b_evc1 |
| Login migration (avb20) | `events.kept` EV-1331 moved to `avatarBoards.kept` at login (log «moved to the Avatar Board Catalog keep») | — |
| Keep a past entry | «Kept! Leave and re-enter Avatar Boards to see it.»; no popup on the home | t6b_keep1, t6b_keep2, t6b_home6 |
| Re-enter Avatar Boards | kept boards delivered with one popup each (Prime - Halloween Sora; Power / Speed / Magic Gem Oct. 2017), listed at the original price (8000, 5000) with no countdown | t6b_av12, t6b_pop1-4, t6b_halloween, t6b_kept_vs_week |
| Event keep vs board keep | event keep EV-1095 leaves the board keep EV-0591; board keep EV-0311 leaves the event keep | t6b_evkeep, t6b_keep3 |
| Cards | Start-Up, Sun Gem, Moon Gem (gold), Prime - Halloween Sora, Power / Magic Gem gold (2017), Speed Gem (cropped) | t6b_startup1, t6b_kept_vs_week, t6b_pop1-3 |
| Start-Up Boost Board | listed with no countdown, 100 Jewels, bought (100 -> 0), «Keyblade cost capacity increased by 5!», Unlock All 19/19, completion «You got a Cost Medal!» (Cid 10); Equipment Cost 80/461 -> 80/501 (+40) | t6b_cost1, t6b_buy1, t6b_buy2, t6b_open1, t6b_node1, t6b_all1, t6b_equip0, t6b_equip1 |

## KEPT twin boards (Events Part 7, Task 6c, 15 November 2026)

User design 15-11: a board listed in Avatar Boards **only because of the Avatar Board Catalog keep** shows its own card with a
«KEPT BOARD» tab and no countdown; its progress is the original's, so nothing can be earned twice.
- **Twin rows** (`avatar-boards.js buildAvatarBoards`): every served board except the 8 level boards (never listed through the
  keep) gets a twin with its own `sphere` / `sphereArray` / `sphereMasu` rows, same layout and rewards: sphereBoardId = arryId =
  masuId = **5500000 + n**, `event_ids.json avatarTwins {"<donorId>": n}` (append-only; a new twin takes the number of its
  original, so twin = original + 500000; a taken number gives the next free one). The originals are now capped at 5499999. The
  index keeps the twin in `index[original].twin` (twins are not index keys: the Event Catalog joins by donor id). A chained twin
  opens after the twin of the board before it. Regen log: «+461 boards (...) and 453 KEPT twins».
- **Which one is listed** (per player, per call; `listState` / `listedIds`): 'week' (a window in the story week) = the ORIGINAL
  with the week countdown; listed only through the keep ('kept') = the TWIN, far end (no «Offer ends» plate), price of the kept
  window; both = the original only; bought, outside its weeks, not kept = the original (far end, no tab); bought, outside its
  weeks and kept = the twin ('kept', no longer 'bought'). Original and twin are never listed together. Hand-out (type 1) boards
  follow the same rule.
- **Shared state**: buy / update / complete / owned / progress resolve a twin to its original. A purchase through the twin is
  stored on the original (`avatarBoardsBought`), charged once at the kept window's price; progress lives in
  `avatarSphere[original]` (the twin's own userSphereBoardId is `avatarSphere[original].twinId`, so the client never sees two
  entries with one id); the rewards are paid from the original's `sphereMasu` row (one Booster / skill key per cell), each node
  and the completion once across the pair. A buy or unlock is accepted on either id while the pair is listed (the client may
  still hold the other one until the close check). `GET /user/sphere` answers the twin with the original's progress under the
  twin id (`server.js sphereState` -> `sphereOf`); the Lux level path never opens a twin as a standard board.
- **Delivery and close (ruling, Task 6b decision kept):** the brief said «a kept twin is marked sent silently»; the 6b user
  decision (15-11) supersedes it: `markKept` puts the TWIN ids in `avatarBoardsKeptPending` and the Avatar Boards list check
  announces them with one «Unlocked an Avatar Board!» each. When the keep turns a held original into its twin, the list close
  check (checkTypes 3) closes the original; an unkeep closes the twin and never an original still in its week.
- **Cards**: `recon/tools/make_avatar_kept_cards.py` (re-runnable: run it again whenever a section 56 card changes) draws the
  section 56 card with `make_special_banners.avatar_kept_tab` (KEPT_STYLES 'avatar': band y 14..44 brown / amber (150,78,18) ->
  (70,30,6), catalogue frame gold lines, catalogue-title gold «KEPT BOARD» on a brown outline, font 19; the banner tabs are
  pixel-identical after the `_tab` geometry options) into the private `raid_loc\img\sphere_incentive_kept\<twinId>.png`, and
  `--write-tsv` makes **originals.tsv section 57** again (445 loc rows). The 8 Skill Enhancement Boards without an original card
  keep the plain card on both. Review sheet: `screenshots\av_kept_twins.png` (12 boards, original | twin).
- **Serve** (controller, after the card cleaning): master regen first (the r328 HANDOFF line plus `KHUX_AVATAR_BOARDS`,
  revision +1: it writes `event_ids.json avatarTwins`), then `python -I recon/tools/make_avatar_kept_cards.py --write-tsv` on the
  cleaned cards (it takes the twin ids from `avatarTwins` only and stops with an error before the regen), `build-resources.ps1
  -Append`, update-resources, relogin. Bench: still to do (see the Task 6c report).
- **Fix round 1:** unkeeping a bought board gives its original back silently (marked sent by the check, no «Unlocked an Avatar
  Board!» for a board the player owns); a hand-out board delivered as its twin counts as owned (catalogue filter); the twin
  rows are left out of the Booster-cell count of the Events notice.

### KEPT twin boards served and benched (master revision 331, resources 130, 16 November 2026)

Regen: the r328 line plus `KHUX_AVATAR_BOARDS` («+461 boards (type 2: 343, type 1: 118) and 453 KEPT twins»), `event_ids.json
avatarTwins` 453 (n = the avatarBoards number). Twin cards made again from the cleaned section 56 cards (445). `build-resources.ps1
-Append` -> resources **130**: 487 records, 68 MB (445 twin cards + the 42 cleaned loc cards), 1804 s (first cached run: the
raid-model stamp and the btf_fix states were made, `import_jp_coco` 457 s, `resource_pack` 321 s, `import_originals` 270 s,
`btf_fix` 245 s). Bench save `avb20` with 20000 test Jewels (pre-6c copy `tmp\t6c_saves\avb20.pre6c.json`).

| Check | Result | Screenshots (D:\Progetto_Restauro_KH_UX\screenshots) |
|---|---|---|
| Kept entry EV-0311 at login | Power / Speed / Magic Gem (Oct. 2017) listed as KEPT BOARD cards, 2000 Jewels, no «Offer ends» plate; this week's Festive Robe / Gold «Offer ends in 8 hours»; no popup on the home | t6c_av1, t6c_av2, t6c_av6 |
| Buy through a twin | KEPT Power Gem: «Spend 2000 Jewels», 20000 -> 18000 once; save: bought 5000094 (the original id) | t6c_buy1, t6c_buy2 |
| Unlock on the twin | «Unlocked Power Gem!»; save: `avatarSphere[5000094].unlock [19]`, no twin key | t6c_open1, t6c_node1 |
| Unkeep, re-enter | Speed / Magic twins gone (176 -> 174); the bought Power Gem stays as its twin, 1/19, until the next login | t6c_unk2 |
| Login after the unkeep | the Power Gem back as itself, no popup (174) | t6c_home3, t6c_av8 |
| Re-keep | one «Unlocked an Avatar Board!» per twin with the KEPT card; Power Gem twin 1/19 (progress kept), Jewels unchanged | t6c_rk1, t6c_rk4, t6c_rk5 |
| NEW flag | the client marks every newly added id «NEW» (the twins after a keep); it keeps the flag per id | t6c_rk4, t6c_moon |
| Cleaned cards | Gem 2017 / 2018, Sun, Moon, Prime - Halloween Sora twins: no coloured corners | t6c_sun2, t6c_moon, t6c_hs1, t6c_g18b |
| Avatar Board Catalog | board cards in the rows; Filters Bought + In progress = 2 entries (Gem Boards Oct. 2017, Avatar Coin Booster Boards); entry page table Board / Dates / Price / Status, Power Gem «Bought» | t6c_cat1, t6c_f2, t6c_f3, t6c_page2 |
| Crash | none (no tombstone, game alive to the end) | t6c_end |

**Bug found and fixed on the bench (6c5bfa05):** after the unkeep the bought Power Gem vanished from Avatar Boards (173). The fix
round 1 «silent» path marked it sent on the server, but the client learns a board only from a check answer (a popup) or the
login list. Now a bought board stays listed as the twin the client holds until the next login list, which gives the original
back with no popup (re-benched: t6c_unk2, t6c_av8). Not benched: a bought board in its own later week (needs a week change; covered
by `twin_buy_once` / `twin_unkeep_bought_no_popup`).

## High Score Challenge: client behaviour (Events Part 8, Task 1, 16 November 2026)

Bench spike on one hand-built HSC row (evStage eventCategory 4, a cloned easy quest, ranking with 2 brackets, 2 score rewards),
resources 133, then two passes with stub server answers. Screenshots `t8s_*` (private).

- **Layouts.** A tap on an eventCategory 4 card loads `publish/AdventureTop2_HiScore_Button.json` without a check; WW served
  none of the High Score layouts, so the client crashed (SIGSEGV in the layout reader). The 9 JP 4.3.1 layouts of the event
  button, the bonus-medal deck panels and the battle score panels are imported (`recon/tools/jp_coco_layouts.txt`, resources
  133); their textures carry no Japanese text. The ranking layouts were already served.
- **Quest view.** «Current: Nth  Goal: Mth» bar (Current from `/stage/event highScoreRank`; Goal = the next bracket up, the
  lowest bracket when unranked) with a Rewards button (popup: the goal bracket and its `rankingReward`), the «High Score» bar
  (= `/stage/event stages[].score`: the server must send the HSC best there, not the best Lux), Rankings and Rewards buttons.
- **Ranking tables.** `ranking.startRank..endRank` is the range of `rankingReward` ids; `rankingReward.startRank/endRank` are
  ranks. Confirmed by the goal popup and the «Ranking Rewards» list.
- **Rankings screen** (`/ranking/highscore`, `/own`, `/border`, actions 135/136/179): root `{rankingDatas[], rankingStatus,
  rankingTermStart, rankingTermEnd, lastRank}`; each row is the full player record of the High Score parser (userData,
  userAvatar, rank, userMedals, userSkills, userKeyblade, petBaseSlotMedal, supportUserMedals, supportUserSkills, pet,
  emblemIds) ending with `lux` = **the score shown**. A Lux-ranking row fails the whole parse («200 ERROR :135»). «Ends in» =
  `rankingTermEnd`.
- **End-of-event result.** `/ranking/reward/check` `{lastRankingResults[{lastRankingId, lastRank, lastUnionRank, pvpClass}],
  rankingRewardIds[], openRankingIds[]}` opens the original «Congratulations! Score Ranking Results — Your Rank — bracket
  rewards» popup when the Rankings screen opens; it shows again on every answer that carries it (the server sends it once).
- **Point milestones.** `/stage/highscore/reward/list` `{getHighscore, getHighscoreRewardIds[]}` feeds the «High Score Rewards»
  list (evScoreReward rows; «Ends in» = evStage endTime). `/stage/clear highScoreReward[]` (evScoreReward ids) adds «N points
  scored! <reward>» rows to the Congratulations screen after Results: the original milestone delivery.
  `/stage/start startStageData.highScore` is the best score.
- **Deck.** «SCORE BONUS MEDAL» panel from the evMedalList rows whose `listId` = the stage's `scoreMedalListId`: `display` 1..3
  is the panel slot (two rows with the same slot overwrite each other), «+N%» = `rate` / 100 (2600 = +26%). An orange «Medals»
  button (list of the `display` 0 rows) appears when at least one row has `display` 0. Every row of the list counts. The
  «SCORE +N%» deck total (StartDeckHiScore_Deck_ver230, node `Panel_HS`) is drawn on `Hs_Total_Bonus_Panel.png`, which no WW copy
  holds: imported from JP 4.3.1 (originals.tsv §60, user report 16-11, video reference). The deck total and the battle multiplier
  read the played stage's own `scoreMedalListId`; a medal counts when its medalId or its groupId equals the row's `medalId` (5
  deck slots, the friend's medal, the pet base-slot medal). The bonus marks of the medal views, medal lists and «High Score» sort
  come instead from ONE evStage row of eventCategory 4 whose start..end holds now (the client reads a single list): the server serves
  every HSC row not listed now (story week, kept event) with its end in 2015, so the marks follow the listed HSC. The client takes
  the **first** open row (bench 22-11: kept 22952 won over 22998; the 16-11 reading «the higher id» came from a stale master). **I-287
  (user 22-11, option B):** with two or more HSC listed the served evStage gets a **phantom row 5999** (category 4, before every HSC
  row, below every evStage id, copy of the first listed row with `scoreMedalListId` 19999) and the served evMedalList a merged list
  19999 (every listed HSC's medals, the highest rate of a medal, `display` 0, ids 9999000+); the real rows keep their own lists, so
  the deck panel and the battle multiplier are unchanged. The phantom is not in the server's Events list, so no card shows. **The
  client downloads the master only when the global revision changes** (`respondMaster`): a login whose listed HSC set differs from
  the previous one raises the revision by one (`player.hscListRev`, signature `player.hscListSig`; ~40 MB master download), else a
  keep kept the client's old master (kept HSC closed, no phantom). Benched 22-11 on `kbfix` (22998 week + kept 22952): the Medal
  List «Score» sort marks +26/+23/+21/+19/+14% from both lists (`server/test-hsc-served-evstage.js` parts 3-4). The JP logo «SCORE BONUS MEDAL» stays (WW read
  «ASSIST MEDALS»; kept by the user's choice, 16-11).
  Supernova forms count as their 7★ root, as in the original master (2021 donor: SN / SN+ / SN++ and their copies carry
  groupId = the root; star and Prime 6★→7★ chains do not): our master keeps groupId 0 on them (it means «copy of» to 25 of our
  readers), so server.js serves the medal table with the root groupId on those rows (medal-boost.js `supernovaRoots`, 142
  families, `server/test-supernova-groups.js`), and the dot-material check of /user/medal/enhance uses the same groups.
- **Battle score.** Only in an eventCategory 4 stage. Each hit pays floor(damage / max HP × the enemy's `score` at its level)
  until that score is paid, plus a kill bonus; everything is multiplied by M = (10000 + the `rate` of the deck's bonus medals) /
  10000 and dropped as score prizes that the HUD counts when collected; `/stage/clear getPoint.score` carries the total. Each payment (after M) drops as stars: 1,000 or less only small stars (`cocostudio/publish/ScorePrize01.png`, prize table index 12), above 1,000 big ones first (`ScorePrize02.png`, index 13). The battle total counts every payment, the HUD only the collected stars: without `ScorePrize01.png` (in no WW copy, imported from JP 4.3.1, originals.tsv §61, I-275) payments of 1,000 or less showed no star and the HUD stayed 0 on low-score enemies, while the run total was right. The
  enemy `score` field is an original level curve like `lux`; the spike's cloned enemies really had score 1, so the HUD stayed 0
  and the run scored 4. HSC quests need their original enemies (donor curves, 163 of the 311 HSC enemies are not in our master
  yet); the bench needs a real HSC stage.

## High Score Challenge maps rebuilt (Events Part 8, user decisions 16 November 2026)

- **Why maps are lost.** The served HSC maps are JP-range ids (300xxx) that the JP 4.3.1 files kept. The 2016-17 worldwide runs
  used WW-only ids (590xxx) delivered per event; no file of them is in any copy we hold (JP 4.3.1, WW 2016 container, WW 4.4.0
  OBB, WW 2020 index, IPAs, JP 5.0.1, donated packs: searched by name and by content).
- **Rebuilt (private records, `map_recon.py` of the HSC builder):**
  - EV-0395 (300380, own JP map): parts 15, 16, 19-24 were dropped by the JP extraction; no exit leads into them and parts 0-29
    hold every enemy and chest the STG counts. Filled from the map's own spare empty parts 27 / 28 (`partSources`, basis
    `hscSparePart` -> label `mapPartSpare`).
  - EV-0140 (590140) <- JP-only HSC map 300270, EV-0247 (590230) <- 300260: `map.layoutTwin` with label `hscJpTwin`; same
    target, level and world.
  - EV-0300 (300150) <- 300250 with level shift +300 (card 300 -> 600) and EV-0395 (its own 300380, -700 to the page's 1300):
    `levelShiftMixed` in event_config.json lets `import_event_stages.py` shift a layout whose enemies have several levels (only the
    card level must equal `from`).
  - EV-0050 (590060) <- JP story map 60422 (Playing Cards 10169 alone in The Queen's Castle, the page's room), +10 to level 150.
- **Generated (rulings 16-11-2026):** the maps lost in every source are generated multi-area maps (`genAreas`, labels
  `wikiRoom` / `wikiAreas`) from the run's own khuxwiki page: areas in page order (the target's area last), one group per enemy
  row with its «LV n» (make-events.js `genAreasOf` passes a group's `level` to its members; gen_story_maps.py `build_event_areas`
  writes it), chests per area, rooms by name (area_names_master.json, the quest's world first, served rooms only). Enemy rows by
  name (`wikiEnemyIds`, label `hscBaseRows`): the row the JP HSC maps 300000-300499 place for that name (one row for at least 90 % of
  its placements), else its only row under 10000; the target its 1xxxx row.
- **Branched maps (16-11-2026).** 14 pages give one path per attribute (khuxwiki tabs). As the JP three-path HSC maps 300370 /
  300390 / 300400 (a start part whose exits lead to three chains that end in one target part), the record gets a start area with
  no enemies (DG_0100_02_00, as 300370's start), each path's areas in page order and the common target area last; an area's
  `next` lists the later areas its exits lead to. make-events.js `genAreasOf` checks and passes `next` (and holds a map whose target
  area is not the last); gen_story_maps.py `build_event_areas` writes one exit per `next` (the doors of a branch area at least
  HUB_GAP = 400 apart), field4 = parts left to the target + 1 over the shortest branch.
- **Rooms.** Rocky Crag (DW_0020_00_00), Mine: Section 9 (DW_0005_06_00) and Ballroom (BC_0004_00_00) come from
  reference/world_schema/areas.json (the room schema, khuxwiki area names matched to the room pictures); all three are served.
- **Result (dry run 16-11-2026):** 25 generated maps (validate_maps 0 errors); held EV-0067 (Jack O' Lantern / Pumpkin Soldier:
  several rows, no evidence), EV-0874 (Ribbitoad: event rows only).
- **Held:** EV-0395 until Chipper Chef (displayId 1513) has a model; EV-0247 needs the event enemy rows 199 / 240 (served
  models) in the master.

## Part 10c summary (special mechanics, Damage Contests, Booster Challenges of 2016-2018, 22 November 2026)

Plan `docs/superpowers/plans/2026-11-22-events-part10c-special-mechanics.md`. Period 2016-11..2018-03: **751 of 905** quests served
(725 after 10b). Resources 147, revision 360.

- **Booster Challenges** (EV-0319, 0332, 0350, 0369, 0392, 0411): Part 6 code unchanged; the private Booster builder matched a
  block's Boosters by donor stage id (it built only the first of a non-consecutive block). Quests whose Booster-paying objective is
  held (enemy missing / ambiguous) leave the event listed without Boosters; the Notices count only challenges that pay one.
- **Damage Contests** (EV-0238 / 0309 / 0352, «Test Your Might»): the client runs them as High Score runs (2019 donor evStage rows:
  eventCategory 4, eventType 3). Records come from the private HSC builder (type HSC, `hsc.damageContest`), donor stages
  703910 / 705710 / 707110 in id = date order; July / October use the December JP map 707110 (no other map survives, label
  hscJpTwin); thresholds calibrated (group B1, interpolated). Label `damageContest`. Not benched yet (the bench save's Story week
  is before July 2017).
- **«chance» rows** of the khuxwiki pages (Eggcognito / Shenaneggan random spawns) are never placed as fixed enemies (private
  builder, `genAreas.chanceLeftOut`): 26 generated maps of 10b changed.
- **WOFF EV-0121**: Beginner / Intermediate on generated maps (the 2017 footage agrees fight by fight), Advanced held (footage not
  countable at 480p). **EV-0423** 2nd Anniversary countdown: 7 generated maps from its pages (= the donor rows).
- **Raid summons** (WOFF Adventurer, Daily Challenge #13 Eggcognitos): no served raid row has the strength of January 2017, so no
  summon; quest label `raidSummonLater`; no spawn code.
- **Time windows inside the day** (`server/event-time-windows.js`, record / entry `timeWindows`, Pacific clock, both minutes
  inside, a window across midnight open on both sides): `open` lists the entry (and a kept copy) only inside it (Classic Donald,
  12:00-23:59 PT, reconstructed: label `openWindowsReconstructed`); `dropBoost` multiplies drop odds below 100% in
  `rollDropTypes` (Classic Goofy Bonus Time 12:00-13:59 / 20:00-21:59 PT, notice 23795, x2 assumed). Goofy's generated quests drop
  nothing yet, so the label is `bonusHoursLater`.
- «Collect all materials» (objective code 18) counts enemy material drops: generated maps with it stay held.
- Open: contest bench on a later save; WOFF Advanced; 41 ambiguous enemy names (`tmp/events/part10/gen_held.md`); Goofy medal
  drops; card endTime vs window end in daylight time (minor); M5 «Open all treasure chests» with 0 chests to bench.


### Skill objectives (bench 23-11-2026)

- Objective code 14 «Trigger the skill %s» (dataType 3, idType 6, id = skillId): the client fills in the skill name from the
  `%s` template; a record text with the bare id is printed as is, so `make-events.js` turns «Trigger the skill N» into the
  template (test `objective_text_skill_id`).
- The client clears it only for the exact skill id: «ATK B XIV Max & Poison» (1168) does not count for «Poison» (1104).
  The original rows use the same ids (7 rows on 1104, 44 on 1101 Attack Boost II), so this is original behaviour.
  The objective is reported in `clearMissionIds` of `/stage/clear`; the `14_0` condition stays 0 even when it is met.

### Stage row fields copied from the story reference row (bench 23-11-2026)

- Event and raid stage rows start from a story row of the world (`storyRefs`). Its `hideIcon` leaked: the reference rows of
  worlds 5 and 6 («A Job for Two Heroes», «A Frosty Monstrosity») hide their boss, so 1303 event quests and 793 raid quests
  showed the TARGET as «???». `make-events.js` now writes `hideIcon` 0 (the records carry none; the donor rows seen have 0),
  `make-raid.js` the donor stage's own value or 0 (tests `stage_hide_icon_not_inherited`, `raid_stage_hide_icon`).
- Generated maps (Part 10b) place the enemies at the quest's own level (khuxwiki), which already includes the donor's
  `addLevel`: the stage row now has `addLevel` 0 on them (49 quests showed e.g. LV 400 + 390 = 790; test `gen_map_no_add_level`).
- Event cards of Part 10c (evStage 23074-23082) built from the original notice banners (`make_event_banners.py --fetch --ids`),
  checked one by one; KEPT copies by `make_special_banners.py --section event`.

## Part 10d summary (social prizes, 0 AP days, EV-0085 VIP set, 23 November 2026)

Plan `docs/superpowers/plans/2026-11-23-events-part10d-social-ap-vip.md`, spec `2026-11-23-events-part10d-design.md`.
Part 10 (events of 2016-11..2018-03) is complete with 10a-10d.

- **Social-goal prizes** (checked on the official X account): new Conditional Present kind `date` in `campaign-gifts.js`
  (one unit once the campaign is open). 64 rows with `"source": "x"` in `campaign_gifts.json`: 80,000 followers
  (Fantasia Mickey B + 2,000 Jewels, 2017-05-05), Halloween Screenshot Contest retweets (3,000 Jewels + Fantasia Mickey B,
  2017-11-03), 62 #ChirithyMini quizzes 2018-01..2020-07 (200 Jewels each, paid on the Sunday the result was announced;
  the research header said 60, its list has 62 dates: all paid). The August 2017 retweet goal stays paid only by login
  specials 333/334. Notice «Campaign Rewards» lists them.
- **0 AP days**: nothing to add. The seven notices (EV-0093, 0110, 0129, 0150, 0168, 0197, 0230) are already in the Part 9a
  calendar (docs/notes/campaigns.md «Notice-backed 0 AP days»).
- **EV-0085 Cyber Week VIP set**: campaign C22565 (evStageId 7621, stages 976210-976214), the Chip & Dale set like C23990,
  2016-11-21..12-04; private catalogue row E22565-1 in `special_quests.json`. The Jewel sale is not served.

## Unbuilt event quests, rounds 1-2 (23 November 2026)

Plan `docs/superpowers/plans/2026-11-23-events-unbuilt-round2.md`; user rulings of 23-11 (A1, A2, Hidden Menace part fill,
month-prefix enemy ids from mid-2018, EV-0941 JP twin). Served quests 3,405 (rev 365) -> 3,804 (rev 366): 399 added, none
lost or changed (served-quest diff on censusId + quest key: stage id, AP, level, evStage). Bench rev 366 (user played):
EV-0921 Vs. Cloud Round 1 (A2), EV-0098 Corridor of Darkness Round 1 (JP twin), EV-0568 Swiftstriker: Power, EV-0429 Hidden
Menace Intermediate #4 (filled corridor parts walked to the Gold Tricholoma of part 16, all objectives).

- **Repo rules** (make-events.js, tests in test-make-events.js): `binShare` also outside the data hole when the map is the holder
  quest's own map (`prior.ownKey === mapKey`); the medal resolver falls back from «Name A» to «Name»; labels `otherRunWiki`
  (A1) and `prefixVersion` (D3) with their `reconstructedWhy` text (the Events notice lists every used label).
- **Private record patches, outside the repo. Re-apply them, in this order, after any rerun of the record builders**
  (`tmp\events\challenge\build_challenge.py`, `tmp\events\part10\build_hole.py`, `tmp\events\hsc\build_hsc.py`):
  1. `tmp\events\hsc\build_hsc.py` CENSUS_ERRORS (EV-0187, EV-0685 Shop deals: not events) - in the builder itself;
  2. `tmp\events\challenge\patch_ww_ruling.py` (A1/A2, 268 quests);
  3. `tmp\events_p1\pilot\work\build.py` P10_PAGE_PIN + `tmp\events\unbuilt\pins_r2.json` (made by `pins_r2.py`: 52 page pins
     of the 2016-18 hole, a pin needs the day/ordinal AND the objective match) - read by build_hole.py;
  4. `tmp\events\unbuilt\r2_splice.py` (EV-0429 Hidden Menace, EV-0568/0615/0918/1109 Swiftstriker rebuilt from the donor
     rows with I-251; EV-0931 + its Time Trial 741230; Hidden Menace `map.partSources` from `r2_donor\hm_partsources.json`
     and the Shadow target id 10001 from the donor row when a filled part carries the Shadow);
  5. `tmp\events\unbuilt\patch_prefix_ids.py` (39 quests, wikiEnemyIds / target id by the event's YYMM id prefix).
  Enemy rows: `tmp\events\part10\add_census_rows.py`, `add_r2_rows.py`, `add_prefix_rows.py` (44 rows, all with a served model).
- **Hidden Menace (EV-0429)**: 8 complete maps; 10 filled from the Legendary map of the same world (empty corridor parts, same part
  index; label mapPartRebuilt); still held: 711610/711740/711750 (no Shadow in any part), 711620/630/640/660 (foreign enemy
  parts), 711680/700/780 (no STG header). The record enemy lists predate the fill (import report `map_only`); the map files
  carry the Shadow and the Gold Tricholoma.
- **Month-prefix quests on generated maps** (user 23-11, option 1; rev **368**, resources 154, 3,843 served): no JP file holds
  their STG header (map audit 10-11: group «none»), so `tmp\events\unbuilt\patch_prefix_gen.py` (patch 6, after
  patch_prefix_ids.py) sets `map.source: generate` and the room of the donor stage row's thumbId (build_hole.py thumb_room
  rule: exactly one served room); label wikiRoom. 31 served; held: EV-1005 Day 4/5 (thumbId 0 / two served rooms), EV-0872
  Beach Fun 6/10 and 9/10 (Watermelon rows with no month prefix).
- **Remaining-quests audit, no-ruling fixes** (user 23-11 «vai con le 90»; rev **369**, resources 155, 3,925 served: +82, none
  lost or changed). Audit: `tmp\events\unbuilt\remaining\remaining.json` (one row per unserved quest: blocker, fix, evidence).
  - Patch 7 `patch_g1_annotations.py`: 58 quests whose complete JP map was never imported because no-id annotation rows («(no WW
    enemy) JP X», «(no WW enemy list)», khuxwiki count/name variants) made make-events hold them before listing the map; the
    rows move to `wikiOnlyEnemies`.
  - Patch 8 `patch_thumb_gen.py`: generated maps in the thumbId room for EV-0744 ×2, EV-1001 ×5, EV-0392 (EV-0080 / EV-0172 now
    stop on the Gold Tricholoma versions: ruling).
  - Patch 9 `patch_levelshift_addlevel.py`: EV-0310 / EV-0398 ×3 levelShifted from/to in map-file levels (build_hole.py wrote
    them with addLevel; rerun the patch after it).
  - make-events.js: shared-map drops compared without the builder note `inOurMaster` (EV-0529 ×6, EV-1237 ×2 on EV-0783's maps);
    a donor «X A» medal is our «X» when id and rarity match (EV-0123 Pence/Hayner/Olette A).
  - Room DB_0030_01_00 built by `make_jp_rooms.py --story-only` (63 files; EV-1373).
  - Left out: EV-1433 / EV-1501 (a map none of the quests owns: the Part 4 rule `map_key_shared_quest` holds it; needs the
    user), EV-0429 711610 / 711740 / 711750 (no Shadow in any part), EV-0929 (needs an enemy row import).
- **Rules 1 and 2** (user 23-11, approved): patch 10 `tmp\events\unbuilt\patch_rules12.py` (records; report
  `unbuilt\rules12_report.json`) and `tmp\events\part10\add_rules12_rows.py` (76 donor WW rows, all with a served model; reads
  `unbuilt\rules12_rows.json`). Rule 1: a donor row of the name with the event's YYMM id prefix, imported and pinned, also for
  names that are not ambiguous (label prefixVersion); several month rows with the same stats = held, never a pick. Rule 2: an
  ambiguous name with no month row takes the row the JP 4.3.1 maps of the period (event windows starting within 183 days) place
  in the same role (target / not target), at least 90 % of at least 10 placements (label jpPeriodVersion, reason in the Notices).
  Quests with every name resolved get the generated map (thumbId room, else the one khuxwiki room code). A quest with any held
  name gets no map.
- **Research 3 (A/B/C, user 23-11, approved as recommended)**, research in `tmp\events\unbuilt\research3\`. Patches 11-13, applied
  in this order after patch 10: `patch_research_c.py` (right-run page re-pins with ordinal + objectives: EV-0683, EV-0742,
  EV-0875, EV-1216, EV-0410; room ties by the codes the JP maps use; thumbId 0 = room XX_0000_00_00; R1 cases where the right
  page agrees with the JP map: khuxwiki-only rows to `wikiOnlyEnemies` / `wikiOtherRunRows`), `patch_research_b.py` (rule 2 window
  365 days, >= 90 % of >= 10 placements per quest leave-one-out, level check; the same-event ladder: one month row per quest
  level, label monthRowOrder), `patch_research_a.py` (month rows are difficulty tiers: each row belongs to one event, the tier
  never goes down as the level rises; only high / medium-high picks, label monthRowOrder; also re-pins 740688, 740753, 740756,
  served before on generic rows). Rows: `tmp\events\part10\add_rules12_rows.py`, `add_research_b_rows.py`,
  `add_research_a_rows.py` (event_enemies.json 2,096 rows).
- **Research 3 D (online, original videos; user 23-11)**: patch 14 `patch_research_d.py` (after patch 13): EV-0417 on donor row
  530010 (Assault Dragon Lv 2000 alone, Corridor of Darkness, AP 5 by I-251; the wiki-only key EV-0417/w1 is `retiredKeys`),
  EV-0121 700330 enemy list counted from the footage (chance enemies left out), «Angry Adventurer» = Adventurer (EV-0622,
  EV-0737; EV-0999 held: no January 2020 row), EV-0156 704190 / EV-0202 706830 follow the video over the JP maps. Each quest
  carries `researchDWhy` with the video and timestamp. Next (approved, own plan): chance spawns random as in the original
  (official notice «can appear»), Collect-all-materials spots with the khuxwiki unit totals (declared rebuilt).
- **Still held**: EV-0941 (Union twin of 740926, sharing would merge it);
  the 18 materials pins (`pins_r2_skipped.json`); EV-0108 / EV-0417 (no source).

## Chance spawns and material spots (23 November 2026)

Plan `docs/superpowers/plans/2026-11-23-chance-spawns-materials.md`, design
`docs/superpowers/specs/2026-11-23-chance-spawns-materials-design.md`.

### How the original worked

The client reverse-engineering (WW 4.3.1) shows how the original handled these enemies:

- **The removal list.** `POST /stage/start` `userRandomEnemies` is `[{uniqueSymbolEnemyId}]`, the list of squads the client **removes** for this play.
  - The id is the squad uid (squad int [5]).
  - The client lowers STG [8]/[9] itself (`FUN_007a1690` parser, `FUN_00e60610` loader, `FUN_00e5e1f4` counters).
  - The stage file does not say which squads were random: the original server decided.
- **Our server.** `server.js` `stageRandomEnemies` sends each uid of the stage POI `random` list with probability 1/2 (our rate). It never sends the POI `target`.
- **Generated maps.** A genAreas group `chance: true` (members with their own `enemyId`) is written as a normal squad, and its uid goes into POI `random`.
  - Material spots: `areas[].materials [{materialId, n}]`, written into the MAP `materials` section as `ceil(n/2)` spots per material, split evenly; STG [15] is the spot count.
  - The rule matches the 04/11/2017 footage: 4 units in 2 spots, 2 in 1, 5 in 3.
  - Labels: `chanceSpawns`, `materialSpots`.
- **Original maps.** `server/random_squads.json` `{stageBinId: {uids, target, source}}` lists only the squads a public source says «can appear». At present that is 11 maps, from khuxwiki chance rows and notices 67064 / 67953.
- **Collect all materials.** The 20 served original maps with this objective already hold spots equal to STG [15] and to the infobox totals. Generated quests with code 18 are now served when their genAreas has materials.

### Other species on original maps (24 November 2026)

The user approved (24-11) making the khuxwiki {{chance}} squads of the other species random too (Gift Shadow, Prize Egg, the
Pretenders, Sparkler, Icy Beast, Iron Giant, Gold Hammer Frame, Martial Monkey), at the same rate 1/2.

- Private patch 18 `tmp\events\unbuilt\patch_chance_other_species.py`, run after patch 15 (which rewrites `random_squads.json`
  from the GT/Fireworks rows only). It adds 64 maps (68 quests): the census rows whose {{chance}} members equal, name for name,
  the candidate squads of the original map, none of them the target squad. `random_squads.json` now lists 75 maps.
- No objective of those quests names a chance species.
- Left as they are (12): EV-0546 and EV-0994 (maps generated from the page list, no genAreas: a chance squad would be invented),
  EV-0999 (its Adventurer is already a chance group), EV-1131 742540 (the page's Gold Hammer Frame has no squad of its own on the
  original map).
- The 83 census rows with no source naming the random squad stay fixed (user 24-11: never guessed).

### Private patch 15

`tmp\events\unbuilt\patch_chance_materials.py`, run after patch 14. It is idempotent (backup `r2_bak/*.pre15`) and reads the census `tmp\events\unbuilt\chance_materials\census.json`. It does three things:

- moves `genAreas.chanceLeftOut` back into the areas as chance groups;
- adds the census materials to the census area, or to the first area;
- writes `server/random_squads.json`.

### Left out and listed

- **No genAreas.** EV-1007 x4, EV-0080, EV-0172, EV-0108 (records without genAreas) and EV-0182 (materials).
- **Guessed rows.** The Power-attribute Gold Tricholoma of EV-0090 501860, whose row would be a guess.
- **Census rows for a later decision.** 83 `noSource` rows, among them the HSC 0x80 Gold Tricholoma squads 300660-300770, and 80 `otherSpeciesOriginal` rows (Gift Shadow, Prize Egg, Pretenders).

## EV-0242 Magic Gems Challenge Event (I-310, 24 November 2026)

The census gave EV-0242 no quests (`noQuests 'coin'`, «quests in no source»); a tester saw it as «Not built yet». It is khuxwiki
«Challenge Event #8»: the notice's «4 quests of increasing difficulty» are 4 tiers (Beginner, Intermediate, Advanced, Legendary)
of 4 rounds each. The donated WW master keeps the 16 stage rows 511080..511230 and the 16 khuxwiki pages «… Round n/4 (July
2017)» agree with them (AP 5, the 3 objectives of 10 Event Coins each); all enemies exist in our master. The maps are lost:
generated maps in Daybreak Town, Corridor of Darkness (the donor thumbId room, as EV-0211), label wikiRoom. The Magic Gem Board
2310052 (set `hole-2017-07-magicgem`, 480 coins = 16 x 3 x 10) is now handed out (it was `noCoinSource`). The tiers opened on
7/31, 8/1, 8/3 and 8/5 in the original: here all 16 are open the whole event, like EV-0258 / EV-0279 (user 24-11; already
declared in the Notices, «Events of 2016-2018»). The khuxwiki series «Defeat Enemies to get Magic Gems!» is another event
(Dec 2019, Feb 2020, May 2020), linked by name only: unlinked in the census.

- Builder inputs: `tmp\events\part10\hole_input.py` CELEB `EV-0242`; pilot `tmp\events_p1\pilot\work\build.py` P10_PAGE_PIN for
  the 16 «(July 2017)» pages (the GEM page rule took the bare pages of other runs) and a SPLITS guard (a `--ids` run without
  EV-0988 / EV-1165).
- **Private record patches #23**, after #22, in order: **#23a** `tmp\events\unbuilt\i310\patch_i310_gem.py` (EV-0242 out of
  records/gem.json), **#23b** `splice_i310.py` (the EV-0242 record of a `KHUX_HOLE_OUT=…\i310\hole_out` build_hole.py run into
  the live hole_2016_18.json), **#23c** `patch_i310_census.py` (census unlink).
- Master regen: 4,260 of 4,260 event quests served; only additions (16 stage, 1 evStage, 1 board); stage ids 4004500..4004515,
  evStage 20015, board 4000110.
- Board card (user 24-11: the board had no picture): the khuxwiki card «Preview - Magic Gem Board» is 144 px (grainy at 306 on the
  bench, user), so it is redrawn at full size: the 306 px card of the June Speed Gem Board (2310043, the same Chip / Dale / Magic
  Mirror / Cid medals and layout) with its gem replaced by the Magic Gem of the 306 px khuxwiki card «Preview - Magic Gem (Cross)»
  (private script `tmp\eventboards\missing_art\scripts\magicgem_card.py`; the bottom band of the gem, hidden by «x15» on that card,
  from the khuxwiki card of this board aligned on the medals), `boardArt` 2310052 (loc), label boardArt; resources 177.
  The full board needs all 48 objectives (480 coins), as in the original.

## Game Catalog (26 November 2026)

User request 26-11: the catalogues were split between the Special tab (Special Catalog, Avatar Board Catalog) and the Events tab
(Coliseum Catalog, Raid Catalog, Event Catalog). They now have one hub; the **Banner Catalog** stays in the Shop.

- **Banner.** `server/make-game-catalog.js` writes evStage **5000** (`GAME_CATALOG_EV`; free id below the Coliseum Catalog 6000):
  eventType 0, eventCategory 2, the Training Grounds stage 970000 of make-special.js (a tap opens it, as the catalogue banners did),
  `detailUrl` `/web/catalog`, `bannerUrl` `/web/catalog/img/v1/5000.png` (`GAME_CATALOG_IMG_VERSION`). Run by make-game-tables.js
  after make-colosseum (`KHUX_GAME_CATALOG=0`: off); re-runnable (its own row replaced, nothing else touched). Without the stage 970000
  in the master no row (warning).
- **Listing** (server.js `gameCatalogEvents`, `eventsTabNow`; events-tab-order.js 5th argument): when the served master has the row,
  the Events tab lists the Game Catalog banner **first and alone** among the catalogue banners (no 6000 / 8000 / 20000 cards), then
  the kept raid, the kept event, the week's raids and events; the Special tab no longer lists the Special Catalog banner (7000) nor the
  Avatar Board Catalog banner (`specialEventsNow`). The older banner rows stay in the master, unlisted; a master without row 5000
  lists the older banners as before (no crash window between server and master). Home banners and the tabs' Progress use the same
  list (the Training Grounds now count in the Events Progress only).
- **Hub page** `GET /web/catalog` (server/game-catalog-pages.js `hubPage`, cards built by server.js `gameCatalogCards`): one card per
  catalogue in the order Coliseum, Raid, Event, Avatar Board, Special, as `#rows>.row` (the phone 3-column card grid of phone-css.js
  applies): its banner picture (6000 / 8000 / 20000 / the Avatar Board Catalog row / 7000), a one-line description, the count of the
  catalogue's own summary (seasons; raids + Japan-only raids; events; entries + boards; quests + campaigns, the Special count computed
  like its card list, special-pages.js `catalogFacts`), the kept item (or «No … kept»), the coin chip of its header (Coliseum Coins of
  the live season, Raid / Event / Avatar Coins; none for Special) and, before Story Quest 130, «The Coliseum opens at Story Quest 130».
  A catalogue whose data fails is left out of the page (logged). The hub has no BACK bar of its own (the game's BACK closes it).
- **BACK.** The five catalogue list pages show a BACK bar to `/web/catalog` while the banner is served (game-catalog-pages.js
  `withHubBack`, with the bar CSS of the detail pages); the Avatar Board Catalog opened with `?from=special|event` keeps its own BACK.
  Detail pages are unchanged (their BACK returns to their catalogue, whose BACK returns to the hub).
- **Picture** `server/game_data/catalog_img/5000.png` (git-ignored), `python -I recon/tools/make_special_banners.py --section game`
  (also run by build-resources.ps1; test `recon/tools/test_make_game_catalog_banner.py`): the catalogue family (gold title «GAME
  CATALOG», subtitle, TRAINING sticker, gold frame) on royal blue -> violet with gold rays, and the five catalogue emblems (Coliseum
  Coin, Raid Coin, Moogle medal, Event Coin, Avatar Coin, original UI pieces of the local JP data). After a change bump
  `GAME_CATALOG_IMG_VERSION`, then the master revision. Route `/web/catalog/img/v<N>/<id>.png` (numeric ids only, else 404).
- **Notices:** new «Game Catalog» (11/26, INFORMATION, not original); the rules card «Catalogs: keep one of each» and the sections
  Event / Raid / Coliseum / Avatar Board / Special Catalog say they open from the Game Catalog banner of the Events tab.
- **Tests:** server/test-game-catalog.js (generator, tab order, hub page, BACK bars; the server wiring on a scratch copy of
  master_data made of hard links with row 5000 added), test-notices.js.

### Raid and Event Board web cards in the resources build

The boards tables of the Raid / Event Catalog detail pages show the board cards from `server/game_data/raid_board_img` and
`event_board_img` (+ cards.json). Since 26-11 build-resources.ps1 writes them, next to the Coliseum web cards:
`python -I recon/tools/make_avatar_card_web.py --tsv server/game_data/<raid|event>_board_art.tsv --jp <jp_data> --b16
<ref_work>/bundle2016/files --loc D:\Progetto_Restauro_KH_UX\raid_loc --out server/game_data/<raid|event>_board_img --all --strict`.
A card with no source stops the build (`--strict`), and so does a missing list (regenerate the master first). Before, they were
made by hand (26-11: 501 raid and 115 event cards).
