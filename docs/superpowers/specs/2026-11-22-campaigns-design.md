# Events Part 9: campaigns, special logins, monthly missions, Lux Boost — design

Status: written 22 November 2026 after a conversation with the author. Decisions marked **(author)** come from the author;
**(builder's call)** marks proposals made while writing, open to change.

## Intent

Part 9 of the events design ([2026-11-06-events-design.md](2026-11-06-events-design.md), «Campaigns (S)»): bring back the
time-limited rules of the original game, the campaigns that made a day different from the next one. They follow the
player's story date like Shop, Special, Raids and Events. The author asked to include, in the same part, the special login
campaigns, the monthly event missions and the daily **Lux Boost** of the Home screen, which we never re-enabled
**(author, 22-11)**.

## Goals

1. **Bonus Times** (the ~18,000 rows of the 2021 `evCampaign` calendar): AP 0 / 5 / half, Lux x2 / x3, rare enemy
   encounters up, raid boss encounters x2 and next raid level +2 / +5, Medal Fusion EXP x2 and half munny cost, rare item
   drops x2, «Limited-time bonus boost!». Active on the original days of the player's story week.
2. **Campaigns announced in the notices** (event census): 26 «0 AP» campaigns, 7 «Sp. Atk Bonus» campaigns (with the
   munny reductions they bundled), the 86 celebrations (bundles of bonuses for anniversaries and releases).
3. **Special logins**: the 29 login campaigns of the census (20 served only as the base login bonus by I-176, 9 not
   served), with the 2021 `loginBonus` rows we lack (208: milestones beyond day 900, «Newcomer Campaign», type 4 specials
   such as «Mickey's Birthday Celebration», «Present from Santa!», «Free New Year's Jewels!»).
4. **Monthly event missions**: the 62 «Special Missions for <month>» campaigns (Spirit parts, Lux) replace the generic
   Limited missions rotation in their months.
5. **Lux Boost**: the Home screen button, +5% Lux for all party members for 60 minutes, once a day, available again after
   midnight Pacific; must be in a party; boosts of members stack; after joining a party it can be used only from the next
   day (notices 20682, 30716, 30792, 40729).

## Non-goals

- Resource balance (I-164): campaigns are restored as data; the study of the economy comes after **(events design)**.
- Shop purchase campaigns (172 census rows) and off-game contests: not gameplay **(events design)**.
- Raids, Union Cross, Coliseum, PvP features themselves (only their campaign bonuses are in scope).
- Japan-only campaigns.

## Anti-goals (a failure even if it works)

- A bonus applied twice: once by the client and once by the server (the client already applies some effects when a
  campaign is listed, e.g. it doubles Lux, see docs/notes/raid.md «Bonus time»).
- Campaigns of every year active at once, ignoring the story date.
- A one-time login or campaign reward taken twice (replays of the same story week, new week on the same day).
- Invented values presented as original: every reconstructed value is labelled and declared in the Notices.

## Decisions taken

- **Whole original day (author, 22-11).** A Bonus Time that ran for one hour is active for its whole original day
  (Pacific), like the Surprise events (the raid Bonus Time stays hour-based, see «Builder check»). Declared in the Notices.
- **Approach B (author, 22-11)**: campaign rows grouped by kind (below).
- **Lux Boost offline (builder's call, author agreed):** the party is only the player, so the +5% applies to the player;
  stacking with other members does not arise.
- **Order of trust** as in the events design: official notice > khuxwiki > donated master (after cross-check) > reconstruction.
  Where a notice and the 2021 calendar disagree on a day, the notice wins.
- **Donor calendar served in full (author, 22-11).** The evCampaign rows of the donated master are used even where no
  notice confirms them (only the 340 rows overlapping 1.1.3 could be cross-checked; 328 match), declared in the
  Notices as coming from the donated master; a notice still wins where it disagrees.
- **Days without rows (author, 22-11).** Where no source has evCampaign rows, only the Bonus Times announced in the notices
  are served; weeks without one stay without. No recurring pattern is reconstructed. Correction while planning (22-11): the
  donor table does cover 2016-09..2018-03 (100-360 rows a month, counted on startTime); the builder check had read the
  density of evStage. The rule therefore matters only before 2016-09 (1.1.3 rows and notices).

## How the client treats campaigns (known)

- The client shows a campaign as active only when the server lists its id (`campaigns` of `GET /campaign`, action 143, and
  of the quest start routes); it ignores the row's times and weekdays (make-ev-campaign.js header, bench 2026-11).
- With a type 7 campaign listed, the client shows the quest's AP as changed (power 0 = AP 0).
- With a Lux campaign listed the client multiplies the Lux it reports (raid notes: «No Lux campaign is served, so the client
  does not double it too»). The other types (encounters, drops, fusion, raid level) must each be checked: which side applies
  them is the first task of the plan.
- `GET /party/lux_up_time` (action 105) answers `luxUp {magnification, available, restrictionKind}`; the client asks it at
  every Home / quest list opening. The activation request is not in our schemas: found on the bench by serving
  `available: 1` and pressing the button (the server logs unknown requests). Layout `MyPage_LuxUp_ver131` (`Button_LuxUp`).

## Approaches considered

- **A. Every original row in the master (18,051), the server lists the day's rows.** Most literal; a few MB more master, and
  with the whole-day rule the many hourly rows of one day become duplicates with the same effect.
- **B. Rows grouped by kind — chosen (author).** One master row per distinct combination of type, power, display text,
  stage scope (stageType and stage list); a few hundred rows, each with its original text. A calendar (private extract) maps
  every original day to the kinds active that day. One server module computes the active kinds from the story date and applies
  the effects the client does not apply itself. Special logins, monthly missions and Lux Boost use the same calendar code.
- **C. One feature per bonus type.** Faster to start, but the calendar logic would be repeated in four or five places and a
  celebration that combines several bonuses would have to be reassembled by hand.

## Design (approach B)

### Data

- **Private extract** (`private/donations/relux_2026-11/verified/campaign_calendar_2021.json`, builder's call on the name):
  for each distinct kind its fields (type, power, displayText, stageType, validStageId, stageId[]) and the list of original
  Pacific days it was active. Stage ids are the original ones; the generator maps them to ours (story stages keep their ids;
  raid and event stages are mapped through make-raid / make-events, unknown ones dropped and counted).
- **Census campaigns** (CAMP-AP, CAMP-SPATK, CELEB, CAMP-LOGIN, MISSION rows): their days and contents from the notices;
  each celebration becomes the set of kinds (and rewards) its notice lists. Values a notice does not give are labelled
  reconstructed.
- **Master rows**: `evCampaign` keeps today's raid AP 0 rows (98000-98999) and gains the kind rows in their own id range
  (builder's call, e.g. 97000-97999); `loginBonus` gains the 2021 rows we lack; `mission` gains the monthly mission rows
  (sources: census, khuxwiki; the 2021 `mission` table has only the last months).

### Server

- **One module** (`campaigns.js`, builder's call): `activeKinds(storyDay)` from the extract and the census, used by `GET
  /campaign` and every route that lists campaigns (story, event, raid, Special starts), merged with the raid AP 0 rule.
- **Effects** applied where the client does not: AP charged at `/stage/start`, encounter rates (rare enemy, raid boss,
  raid level), drop odds, fusion EXP and munny cost; Lux only if the client does not multiply it (check first).
- **Special logins**: the login bonus code (I-176) pays a campaign's reward once per campaign (the player's record), on the
  first login of an original day in its window.
- **Monthly missions**: the Limited missions of a month are the original ones of that month when known, else today's rotation.
- **Lux Boost**: `/party/lux_up_time` answers `available` (once a day, reset at midnight Pacific of the real day), `magnification`
  (+5% for 60 minutes after activation), `restrictionKind` (not in a party / used today: values found on the bench); the
  activation route records the time; Lux earned in the hour is multiplied by 1.05 (server or client side, checked on the bench).

### Notices

- New section in «Events» (or its own notice, builder's call): Bonus Times open for the whole original day, the Lux Boost
  offline (only you in the party), every reconstructed value.

## Builder check (22-11): calls made while writing

- **Raids keep their own Bonus Time (builder's call).** routes-raid.js already runs the benched raid Bonus Time (four
  Pacific hours on the real clock, weekends, June 2020 all day; server-doubled raid Lux, +2 / +5 boss levels, story raid
  threshold 8600 → 6000). It stays the only authority for raid stages; the calendar's raid kinds (raid encounters x2, next
  raid level, Lux x2 on raid stages) are not applied to raids, so nothing is doubled. Note: the raid rule is hour-based,
  not whole-day; the whole-day rule of this part follows the Surprise events.
- **Scope of a day's kinds (builder's call).** The kinds of the story day apply to story quests and to the events of the
  current story week. Kept events, kept raids and Special quests get none (no bonus from another year). A broad kind
  (stageType 4, «every event stage») is narrowed to the current week's event stages, never Special.
- **Monthly missions (builder's call).** The Limited tab keeps its own counters; only the monthly slot follows the story
  month when that month has an original «Special Missions» campaign. The 35 «[Monthly] Obtain a total of N Lux» rows already
  in limited_rotation.json are the same family: folded into the 62, no duplicate. The weekly themed slot is unchanged.
- **Celebration rewards (builder's call).** A reward already paid by the Conditional Present campaigns (campaign-gifts.js,
  I-234) stays there; every other celebration or special login reward goes through the login bonus code, once per campaign.
- **Login rows without dates (builder's call).** The donor rewrote every loginBonus date: a 2021 row gets its days from the
  notice whose title matches; rows with no matching notice are dropped and counted in the generator log.
- **2016 rows (builder's call).** The 340 evCampaign rows of the 1.1.3 master (2016-03..09) join the calendar; where they
  overlap the donor rows they win.

## Left to the builder

- Mapping each campaign type to client or server side (bench checks per type, first task).
- The Lux Boost activation route and `restrictionKind` values (bench).
- Id ranges, file names, the grouping key details, how a story day picks the original day inside the week.
- Tests per part (calendar → active kinds; one-time rewards; AP and Lux applied once).
