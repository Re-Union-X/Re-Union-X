# Events, Part 7: Limited and Returning Avatar Boards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The avatar boards that were sold or opened only for a time in the original come back on the player's story calendar:
- the limited and returning avatar boards (new outfits, collaboration outfits, seasonal boards), with their original price and window;
- the **Avatar Coin Boards** and the **Avatar Coin Booster Boards** (2020-21) and the **Jewel Booster Boards** (June 2019);
- the **Gem Boards** (2017-18, bought with Jewels; Part 2 Notice: «come with the Event Boards in a later update»);
- once bought or opened, a board **stays in the player's list for good**, as the original notices promised («remain unlocked once purchased»).

**Architecture:**
- Today the Avatar Boards list holds the 118 permanent type-1 boards copied from `server/tables` (`sphere`, `sphereArray`, `sphereMasu`). The donated WW master (`Reddit Donators\ReLux Team\...\server_master\sphere*.json`, private) holds 255 type-1 boards (137 we lack: 111 `openId` 3, 22 `openId` 2, 4 `openId` 5) and 608 type-2 boards with a Jewel `price` (Gem Boards and Trait Medal Boards). Its dates were rewritten to 2015..2099, so the windows come from the census, the notices and khuxwiki.
- A private builder (`D:\Progetto_Restauro_KH_UX\tmp\events\avatar_boards\build_avatar_boards.py`) writes `avatar_boards.json` records: one entry per census BOARD row (window, price, currency, boards with donor ids and cells). A new `server/avatar-boards.js` appends the rows (ids from `event_ids.json` key `avatarBoards`, in a free range picked in Task 1 Step 3) and decides per player which limited boards are in the list: the ones of the story week, plus every one bought or opened.
- The board scene, the cell rewards and the Avatar Coin balance are the existing ones (`docs/notes/bacheche.md`); only the list, the price and the window are new.

**Tech Stack:** Node server (`server/`), private Python builders (`python -I`), LDPlayer bench instance 0.

**Spec:** `docs/superpowers/specs/2026-11-06-events-design.md`, part 7 of «The work, in parts» («Limited and returning avatar boards (M, 277 rows): board windows, prices, "stays unlocked once bought"»), «How a player meets events» (story-week calendar, Event Catalog, one kept event), «Values» (nothing invented), «Notices (mandatory)».

**Earlier plans:** `2026-11-08-events-part3-coins.md` (type-4 boards, board sets, `event_ids.json` `boards`), `2026-11-14-events-part6-boosters.md` (Booster cells pay type 34 through `boosters.js`; Jewel and Avatar Coin Booster Boards left to this part).

**Issues:** `docs/ISSUES.md` I-245 (events), I-007 (Avatar Boards), I-265 (Filter popup, JP layout served).

**Field notes:** `docs/notes/bacheche.md` (client list rules, response 44, Raid Boards type 5), `docs/notes/events.md` («Part 3 summary», «Part 6 summary»).

## What is known and what is not

**Known (source):**
- Census (`private\events\sources\event_census\event_census.json`): 277 BOARD rows (2016: 16, 2017: 34, 2018: 46, 2019: 66, 2020: 85, 2021: 26, 4 undated); kinds from the census sheets: avatar boards (~120), «boards (avatar/medal/gem/skill)» 98, avatar/coin board events 20, Gem Boards 14 (EV-0252 .. EV-0464, EV-0574 «New Permanent Gem Boards!», EV-0754/0791 «Monthly Gem Boards!»), skill/VIP boards 11, spirit part event 1, Avatar Coin Booster Boards EV-1331 (2020-11), Avatar Coin Board EV-1487 (2021-02).
- Notices: limited boards cost Jewels (EV-0005 Zootopia 3,000 Jewels each, «no Avatar Coins needed, stay unlocked after purchase»); EV-0014 / EV-0023 «You will not need Avatar Coins to unlock nodes on these boards»; Jewel Booster Boards 3,000 Jewels (notice 54258), Avatar Coin Booster Boards (notice 71743).
- Donor `sphere` fields: `sphereBoardId, boardName, kindId, boardId, arryId, masuId, type, openId, openParam, price, detailUrl, startDatetime, endDatetime`. Our 118 boards are type 1 `openId` 1 `price` 0.
- Client (bacheche.md): a list update merges by `sphereBoardId`; `GET /user/sphere` replaces the list; `/user/sphere/check` with `checkTypes` 3 removes the ids of `closeEventSphereBoardIds`.

**Unknown (Task 1 settles it on the bench, or asks):**
- Whether the Avatar Boards list shows only the ids of `userSphereDatas` (as type 5) or every type-1 master row.
- What `openId` 2, 3 and 5 mean for type 1 (level / Lux requirement, purchase with `price`, chained to `openParam`), what the client shows for a priced board (button, currency icon), and which request buys it.
- Whether the client reads `startDatetime` / `endDatetime` for type 1 / type 2 (a countdown, a hidden board).
- How the client lists type 2 (Gem Boards): its own tab, or the Avatar Boards list with a filter.

## Global Constraints

- Everything in the Part 2..6 Global Constraints still applies: worldwide only; order of trust notice > khuxwiki > donor after cross-check > JP twin > reconstruction; labels with `reconstructedWhy`, declared in the Notices; append-only ids in `event_ids.json`; no SE data in the repo (`server/master_data`, `server/game_data` git-ignored; donor names, notice texts private); bench rules (relogin only, AppAlive guard, SKIP every dialogue, revision only goes up); the master regen command of HANDOFF; commit plus push for each step after `git pull --rebase`.
- **Client code stays private.** Only the behaviour learned enters `docs/notes`.
- **Nothing half-served (user, 08-11).** A board with a cell whose reward does not exist here is not served, nor a board chained after it.
- **Prices as in the original.** A board sold for Jewels costs its original Jewels; a board opened with Avatar Coins or Event Coins costs those. Never free where the original charged, never a price invented: a board whose price no source gives is held (`priceUnknown`).
- **Bought once, kept for good.** The purchase is stored per player (`player.avatarBoardsOwned`), survives the window, and is never charged twice.
- **Notices for every deviation** (windows on the story calendar, a board reachable after its window through the Event Catalog). Never the word «restored».
- **Out of scope** (each to its own area, listed in the Event Catalog with the reason): Trait Medal Boards (type 2 «... Trait Medal N» and type 11: the Traits area); Tier Bonus and Coliseum Boards (type 3: Coliseum); Enhancement and Seasoned Wielder Boards (type 5 donor rows; our type 5 = Raid Boards); χ Boards (type 6: Union Cross); Magic Mirror / Magic Broom (type 9): Task 1 classifies them, the user decides.

## Review Focus

1. **A board bought in its window, then the story week moves on:** it stays listed, its progress kept, no second charge (`owned_survives_window`).
2. **Not enough Jewels for a priced board:** the client's own «not enough» path, nothing charged, nothing opened (`buy_insufficient_jewels`).
3. **A limited board whose window is later than the player's Story:** not listed, not buyable through a crafted request (`buy_outside_window_refused`).
4. **The same board in two census rows (a returning board):** one id, one ownership, listed in both windows (`returning_board_one_id`).
5. **An old save that already owns one of the 118 permanent boards with the same donor layout:** no duplicate entry in the list (`no_duplicate_with_permanent`).

---

### Task 1: Client spike and board census (user gate)

**Files:**
- Create (private): `D:\Progetto_Restauro_KH_UX\tmp\events\avatar_boards\SPIKE.md`, `CENSUS.md`
- Modify: `docs/notes/bacheche.md` (section «Limited avatar boards: client behaviour», behaviour only)

- [ ] **Step 1:** Bench with two hand-made type-1 rows (not committed): one `openId` 3 with `price` 3000, one `openId` 2. Record: listed or not without being in `userSphereDatas`; what the list and the detail show (price, currency, window); the request a purchase sends and the response it needs; what `endDatetime` in the past does. Same for one type-2 Gem Board row.
- [ ] **Step 2:** Classify the 137 missing donor type-1 boards and the 608 type-2 boards: limited/returning avatar, Avatar Coin, Booster, Gem, level reward (open 2), Draw Ticket, Trait (out of scope), with counts per kind and the census rows that name them.
- [ ] **Step 3:** Pick the id range for the new rows (not used by `sphere` today: 2100xxx type 1, 3000000+ raid, 4000000+ event boards) and write it in the plan.
- [ ] **Step 4:** **Show SPIKE.md and CENSUS.md to the user**; the user confirms the scope (which kinds), the purchase path and the Builder's calls below. Wait.

### Task 2: Board records (private builder)

**Files:**
- Create (private): `D:\Progetto_Restauro_KH_UX\tmp\events\avatar_boards\build_avatar_boards.py`, output `avatar_boards.json`, `REPORT.md`

**Interfaces:**
- Produces: `avatar_boards.json` `{entries: [{censusId, key, kind: 'limited'|'returning'|'avatarCoin'|'booster'|'gem'|'level', window: [start, end] | null, price: {currency: 'jewel'|'avatarCoin'|'eventCoin', amount} | null, boards: [{donorId, name, kindId, openId, openParam, cells: [{idx, cost, rewardSelect, rewardId, num}], completion}], sources: [..], labels: [..]}], unmapped: [{donorId, name, why}]}`.

- [ ] **Step 1:** Map each in-scope donor board to its census rows by name (khuxwiki board pages, notice board names), citing a source each; a board in two windows gets one entry per window with the same `donorId`.
- [ ] **Step 2:** Price and currency from the notice, else khuxwiki, else the donor `price` (label `priceFromDonor`); none: `priceUnknown`, held.
- [ ] **Step 3:** Cells: match each reward to our tables as `event-boards.js` does (Boosters by `boosters.json` byId); a cell with no item: the board is held (`cellUnmatched`).
- [ ] **Step 4:** Run twice: byte-identical. REPORT.md: entries per kind and year, held with reasons. **Show it to the user**; wait.

### Task 3: `server/avatar-boards.js`: rows, list, purchase

**Files:**
- Create: `server/avatar-boards.js`, `server/test-avatar-boards.js`
- Modify: `server/make-game-tables.js` (append the rows after the raid boards, `KHUX_AVATAR_BOARDS` = the records file), `server/event_ids.json` (key `avatarBoards`), `server/server.js` (`/user/sphere`, `/user/sphere/check`, the purchase route found in Task 1)

**Interfaces:**
- Consumes: `avatar_boards.json` (Task 2), `boosters.json` byId, `storyCtx` (shopFrom / shopTo), `player.avatarBoardsOwned`.
- Produces: `buildAvatarBoards({records, master, ids, boosters}) -> {sphereRows, arrayRows, masuRows, art, index}`; `game_data/avatar_boards.json` `index` = `{[sphereBoardId]: {key, window, price}}`; `listedIds(player, storyCtx) -> number[]`; `buy(player, sphereBoardId, storyCtx) -> {ok, why?}`.

- [ ] **Step 1: Write the failing tests** in `test-avatar-boards.js`: `rows_have_23_entries`, `ids_append_only`, `listed_in_window_only`, `owned_survives_window`, `buy_charges_once`, `buy_insufficient_jewels`, `buy_outside_window_refused`, `returning_board_one_id`, `no_duplicate_with_permanent`, `held_board_not_built`.
- [ ] **Step 2:** Run `node server/test-avatar-boards.js`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement the module and the routes; the purchase follows the response shape found in Task 1 (all mandatory keys of response 44 when it returns the inventory).
- [ ] **Step 4:** Run `node server/test-avatar-boards.js` and the board tests (`test-event-boards.js`, `test-raid-boards.js`, `test-boosters.js`). Expected: all OK.
- [ ] **Step 5:** Commit and push.

### Task 4: Event Catalog and kept boards

**Files:**
- Modify: `server/event-pages.js`, `server/make-events.js` (BOARD census rows as catalog entries with their boards), `server/test-event-pages.js`

- [ ] **Step 1:** Failing test `board_entry_keepable`: a BOARD entry with a served board shows its boards and can be kept; keeping it lists its boards (not bought) for purchase, as a kept event lists its quests.
- [ ] **Step 2:** Implement; a held board shows its reason (`priceUnknown`, `cellUnmatched`).
- [ ] **Step 3:** Run `node server/test-event-pages.js` and `node server/test-make-events.js`. Expected: OK. Commit and push.

### Task 5: Cards, master, resources, bench (user)

**Files:**
- Modify: `recon/tools/originals.tsv` (new section: board cards `img/sphere_incentive/<id>.png` from Roboloid / JP 4.3.1 / khuxwiki, as the Event Board cards), the 4 session scripts (revision +1)

- [ ] **Step 1:** Card pictures for every served board; a missing card is asked about, never drawn. Review page for the user.
- [ ] **Step 2:** Master regen (HANDOFF command + `KHUX_AVATAR_BOARDS`), revision +1, `build-resources.ps1 -Append`, `update-resources.ps1` (tap Download), relogin.
- [ ] **Step 3:** Bench on a save in a 2019 story week: a limited board listed in its window, bought with Jewels (balance down once), still listed after `-RealNow` a month later; a Gem Board; an Avatar Coin Booster Board granting its Booster; a kept BOARD entry from the Event Catalog. Screenshots, `docs/notes/events.md` table.

### Task 6: Notice, docs, next part

**Files:**
- Modify: `server/routes-info-album.js` («Events» notice: section «Avatar boards», counts from `avatar_boards.json`; the Gem Boards sentence of «Gem quests» updated), `server/test-notices.js`, `README.md`, `README.it.md` (parts 1-7), `docs/ISSUES.md` (I-245 Part 7), `HANDOFF.md`, `docs/notes/events.md` («Part 7 summary»)
- Create: `docs/superpowers/plans/<date>-events-part8-high-score.md`

- [ ] **Step 1:** Notice lines and test; `node server/test-notices.js`, `node server/export-notices.js --check`. Expected: OK, up to date.
- [ ] **Step 2:** Docs; commit and push; publish a tester package when the user says so.
- [ ] **Step 3:** Write the Part 8 plan (High Score Challenge, with the ranked-rewards spec `2026-11-10-ranked-rewards-design.md`).

## Builder's calls (to confirm at review)

1. **Windows on the story calendar.** A limited board is listed (and buyable) while its original window overlaps the story week, like events; a returning board in each of its windows.
2. **Past boards through the Event Catalog.** A BOARD census row is a catalog entry; keeping it lists its boards for purchase at the original price (one kept event at a time, shared with the event keep). Declared as not original.
3. **Ownership.** Bought or opened = in `player.avatarBoardsOwned` for good, listed in every week after; no refund, no second charge.
4. **Gem Boards** are in this part (type 2 with a Jewel price); the Trait Medal Boards of type 2/11 are not (Traits area).
5. **Level boards** (`openId` 2, «Reached LV 800!», «Christmas Night»): in scope only if Task 1 shows they are type-1 avatar boards opened by a level and the census or a notice dates them; else out (listed in CENSUS.md).
