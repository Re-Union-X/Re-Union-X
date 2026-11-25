# Coliseum (PvE) - design

Date: 2026-11-25. Issue: I-059 (gameplay), I-054 (entry screen, done). Research: [docs/notes/coliseum.md](../../notes/coliseum.md)
(client schema, requests, rules) and the private dossier `private\events\sources\coliseum\` (COLISEUM.md, RULES.md = the
original rules with sources, RELUX_COLISEUM.md = what the ReLux donation holds).

## Intent

Make the PvE Coliseum playable as it was: one season per month in the Olympus arena, Tiers of Rounds with enemies that
grow stronger every round, the one-turn shortcut, Coliseum Coins spent on the season's Coliseum boards, tier rewards,
and the monthly ranking. It is the next original game mode after story, Special, events and raids; the goal of the
project is to restore every original mode, and every deviation is declared in the in-game Notices.

## Goals

- All WW seasons 2016-04 .. 2021-06 (63 months), served in parts like the events (Part 1 first, then blocks of eras).
- The original rules (RULES.md, proven unless noted):
  - unlock at story quest 130;
  - **a lost or retired round is retried as often as you like**; the AP paid at start is not refunded; no Jewel continue (user 25-11 + RULES.md);
  - a cleared round cannot be replayed; a win in more than one turn unlocks only the next round;
  - **one-turn shortcut**: clearing every wave in one turn unlocks the next N rounds (N = the tier's `excellentUnlockCount`), also across tiers;
    the player may start any round of the unlocked window; clearing a round inside the window resets the window from there
    and locks the skipped rounds below it; **the skipped rounds pay their per-round coins and a skipped tier pays its tier
    rewards** (footage, not the ReLux server's in-tier rule);
  - enemy level = rounds of all earlier tiers + current round (client side, from `lvPerLoop` / `loopStageCount`);
  - AP per round per era (3-5 until 2017-04, 0 from 2017-05; 1 AP 2016-05-19..05-31 and 0 AP 2016-11-01..03 campaigns);
  - no friend medals, Keyblade chosen per round;
  - **monthly reset**: a season played for the first time starts at Tier 1 Round 1 with 0 coins (in the original the old
    season's coins were lost; here they stay with that season, see Season selection).
- **Season selection (user 25-11, choice A):** the season follows story progress like events and raids: the season is the
  calendar month of the current Shop week (same story-progress clock as the Special tab). When the Shop week moves into
  the next month, the new season starts. **The season follows the week shown, also when the Shop rotation loops back
  inside a story tranche** (e.g. quests 201-250 alternate April / May weeks): each season keeps its own progress and coins
  in the save, so going back resumes it and nothing is lost (user 25-11, option 1; deviation from the original monthly
  loss of coins, declared in the Notice). A week spanning two months counts for the month it starts in.
- **Coliseum Catalog (user 25-11):** like the Event and Raid Catalogs, a catalog of past seasons where one season can be
  kept; the kept season is the one the Coliseum tile plays until it is un-kept.
- **Ranking rewards become score thresholds** (standing rule, as for HSC and PvP): the metric is the original one (the
  last round cleared, as tier + round); each historical bracket becomes a threshold at its historical cutoff. Every served
  season must have `rankingReward` rows: the client's «Rewards» button crashes when the season's `rankingId` has none
  (ReLux finding).
- Coliseum boards with their original cells and costs, bought with the season's coins.
- The screens the client needs (Colosseum layouts, images, result scene) from the JP 4.3.1 data, as for the other modes.

## Non-goals

- PvP Coliseum (I-120) and Union Cross (I-056): separate projects.
- Side events held at the Coliseum (Hercules tag team, Moon Gem Cup, Battle vs. Cloud, Keyblade Challenge): those are
  event quests, handled with the events.
- A real multiplayer ranking: there is one player per server.

## Anti-goals

- Inventing a rule where an original one is known (e.g. the ReLux server's in-tier, unpaid shortcut, or its random season).
- Substituting enemies: every round's enemies are the original ones (exact ids); only stats may be estimated where no
  original row exists, as for the raids.
- Carrying over the ReLux package's altered values (tier coins x100, closeDate 2030, rankId «...», the 2016-11 set moved to
  20160401, the invented `rankingReward` and enemy rows): only original values, or our own declared estimates.

## Data sources and their status

| Data | Source | Status |
|---|---|---|
| Season and tier rows 2016-04 .. 2016-10 | 1.1.3 master (`colosseum`, `colosseumStage`) | proven |
| Season and tier rows 2016-11 .. 2021-06 | ReLux late WW master (73 seasons, 1,316 tier rows), cleaned of their edits; cross-checked with the wiki / notices | probable to proven per field |
| Stage sets (which `cl_stg` set a WW month played) | ReLux master + our research (gap months mapped) | proven |
| Stage files | JP 4.3.1 `cl_stg` (546 files) | proven |
| Stage files of 12 WW months with no original (2016-08..11, 2017-06..12, 2019-07) | **generated** from the wiki lineups (one wiki row = one wave, proven exact on 180 rounds); arena room fixed | deviation, declared |
| Enemy variant stats 2019-05 .. 2021-06 (and the 2017-10 ids) | ReLux master | proven for that era |
| Enemy variant stats 2016 .. 2019-04 | 1.1.3 rows where present; else the proven variant rule from the base enemy (same ATK/DEF/level knots, HP x3 at LV 300, LV 999 = 40/11 x LV 300); else estimated as for raids | mixed, declared |
| Boards | ReLux `sphere` type 3 (253 boards, = khuxwiki totals 252/252, = 1.1.3) mapped to months via the wiki | proven contents, month mapping probable |
| Ranking brackets and cutoffs | notices + wiki (COLISEUM.md) + reddit border analyses | brackets proven, cutoffs thin |

## Approaches considered

- **A, in parts like the events (chosen, user 25-11):** Part 1 = the whole mechanism (screens, rules, Catalog, boards,
  score thresholds) with the seasons whose data are all original; later parts add the remaining seasons by era.
  Trade-off: longer before all 63 seasons are in, but a mechanism error is caught on few seasons.
- **B, all 63 seasons at once:** fastest to complete, but an error spreads everywhere and the bench is huge.
- **C, one template season repeated:** quick, but against the restoration's purpose.

## Parts

- **Part 1:** framework + seasons **2016-04 .. 2016-07** (4 seasons: original master rows, original stage files, 1.1.3
  enemy rows, original boards). Starts with a **bench probe** (RULES/coliseum.md "Missing before implementation" item 1:
  what the client shows for a `colosseumStages` list of the unlocked window, the screen after an `isSkip` clear, the
  `clearColosseums` content for skipped rounds, status 1 with an empty list).
- **Part 2:** 2016-08 .. 2017-04 (generated maps for 2016-08..11; the extra tier of 2016-11; AP era end).
- **Part 3:** 2017-05 .. 2018-12 (0 AP; generated maps 2017-06..12; lump-sum coins from 2018-05).
- **Part 4:** 2019-01 .. 2021-06 (revamp 2019-05, ReLux enemy stats, Tier 10 title, generated map 2019-07, 9 stages from 2020-02).
The part boundaries may move when the data audit of each part shows a better cut; each part ends with a bench and a
tester package.

## Decided behaviour (builder: implement as written)

- **Round list (`/colosseum` 124):** the playable rounds = the unlocked window of the current tier/round, one
  `colosseumStages` element per playable round (`rank` = tier, `stageCount` = round in tier, `stageId` = the stage of that
  round, cycled through the season's set by `loopStageCount`, `useAp` = the tier's AP or the campaign AP). Exact shape
  confirmed by the Part 1 bench probe.
- **Loss (`/colosseum/retire` 127):** progress unchanged; AP not refunded.
- **Shortcut state machine (RULES.md Q3, proven):** the save holds, per season, the last round cleared (`last`) and the
  end of the unlocked window (`open`). A one-turn clear (`isSkip` 1) of round r sets `open` = r + N (N = the tier's
  `excellentUnlockCount`, counted across tier boundaries); a multi-turn clear of r sets `open` = r + 1. Rounds are counted
  as one sequence across tiers (tier t round k).
  - **124 list:** every round from `last` + 1 to `open` (a window of N rounds after a one-turn clear, one round otherwise).
  - **128 on round r (inside the window):** r and every skipped round between `last` + 1 and r - 1 become cleared; their
    per-round coins and the tier rewards of every tier completed by the jump are paid now; `clearColosseums` lists all of
    them (never empty); then `last` = r and the window is re-based from r (the rounds of the old window above r stay
    unlocked only if the new clear was one-turn and reaches them).
  - **Best progress** (ranking metric) = `last`, with the time it was reached.
- **Endless last tier:** served as in the master (999 rounds, `arrivalStageCount` 0 = «∞»); what happens after its last
  round is unknown and does not need a rule in practice.
- **Season save:** per season id: tier, round, unlocked window, cleared set, coins, board nodes bought, tier rewards
  obtained, best progress + the time it was reached (ranking tie-break). `userPoint.colosseumSpherePoint` shows the
  coins of the season being played.
- **Kept season:** progress and coins of a season are kept in the save (user 25-11, option 1), so keeping a past season
  resumes where the player left it; a season played for the first time starts at Tier 1 with 0 coins.
- **One live season:** the kept season when one is kept, otherwise the season of the story clock. Only the live season
  can be played; 124/125/139/140/180 read it, and its thresholds are paid while it is played. Each season has its own
  thresholds. *(my call)*
- **Ranking (139/140/180) and rewards:** the player's own entry from the season save (best progress, arrival time); the
  thresholds are paid as Presents when reached, like the HSC thresholds; the ranking screen lists the thresholds.
- **Notices:** a «Coliseum» notice declaring: season follows story progress, Coliseum Catalog and keep, coins per season
  kept in the save, ranking as thresholds, generated maps and estimated enemy stats where used.

## Left to the builder

- The exact web page and banner of the Coliseum Catalog (follow the Event / Raid Catalog design; place its banner with
  the other catalog banners in the Events tab unless the bench shows a better place).
- Threshold values per bracket from the cutoff data, documented with sources. Where a season or bracket has no cutoff,
  interpolate from the nearest seasons of the same era (same tier structure); every season gets `rankingReward` rows.
  Declared in the Notice. *(my call)*
- Module layout on the server (follow routes-raid.js / routes-events.js), master generation in make-game-tables.js, layout
  import through build-resources.
