# Events, Part 7: Limited and Returning Avatar Boards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revised 15-11 after Task 1** (bench spike + census, `docs/notes/bacheche.md` «Limited avatar boards: client behaviour»; private `D:\Progetto_Restauro_KH_UX\tmp\events\avatar_boards\SPIKE.md`, `CENSUS.md`). User decisions 15-11: scope = every group below; the Jewel boards' «Offer ends in» counts down to the end of the story week.

**Goal:** The boards that were sold or handed out only for a time in the original come back on the player's story calendar:
- **Jewel boards (type 2)**, bought with Jewels in their window, then kept for good: the 227 limited and returning outfit boards, 80 Gem Boards (incl. Sun/Moon Gem and Enhancement Set+), 3 Jewel Booster Boards, 46 Skill Enhancement Boards, 12 medal boards;
- **hand-out boards (type 1)**, listed in their window, no purchase: 34 Avatar Coin Boards and 76 Avatar Coin Booster Boards;
- the 8 **level avatar boards** (type 1, original ids 2100119-2100126), permanent.

**Architecture:**
- Client (Task 1): a board is listed only when its id is in `userSphereDatas`. Type 1 ignores `price`, `openId`, `openParam` and the dates: a listed type-1 board is open. Type 2 shows the Jewel price and «Offer ends in N minutes» (from `endDatetime`) while `isBuy` 0; a tap opens the purchase popup `SphereBoard_Account_ver120` (missing in the WW resources: crash; the JP 4.3.1 original exists in `cocostudio/publish`), which sends `POST /user/sphere/buy {sphereBoardId}` and needs `userSphere` as a single object; with `isBuy` 1 the board opens. A board handed out in a `check` answer opens «Unlocked an Avatar Board!».
- A private builder writes the records (`tmp\events\avatar_boards\avatar_boards.json`); `server/avatar-boards.js` appends the rows (new ids 5000001+n, `event_ids.json` key `avatarBoards`; the level boards keep 2100119-2100126), decides per player which boards are listed (window of the story week, bought, kept), sells type 2, and rewrites `endDatetime` of the type-2 rows it serves to the end of the story week.
- The board scene, cells and Avatar Coin balance are the existing ones; `/user/sphere/update` learns type 2, and the cell reward «skill» (`rewardSelect` 0 with a skill id).

**Tech Stack:** Node server (`server/`), private Python builders (`python -I`), `recon/tools/import_jp_coco.py` + `jp_coco_layouts.txt` (JP layouts), LDPlayer bench instance 0.

**Spec:** `docs/superpowers/specs/2026-11-06-events-design.md`, part 7 («board windows, prices, "stays unlocked once bought"»), «How a player meets events», «Values» (nothing invented; every missing item searched until found), «Notices (mandatory)».

**Earlier plans:** `2026-11-08-events-part3-coins.md` (type-4 boards, `event_ids.json` `boards`), `2026-11-14-events-part6-boosters.md` (Booster cells pay type 34 through `boosters.js`).

**Issues:** `docs/ISSUES.md` I-245 (events), I-007 (Avatar Boards), I-265 (JP layout import precedent).

## Global Constraints

- Everything in the Part 2..6 Global Constraints still applies: worldwide only; order of trust notice > khuxwiki > donor after cross-check > JP twin > reconstruction; labels with `reconstructedWhy`, declared in the Notices; append-only ids in `event_ids.json`; no SE data in the repo (`server/master_data`, `server/game_data` git-ignored; donor names, notice texts private); bench rules (relogin only, AppAlive guard, SKIP every dialogue, revision only goes up — now 325); the master regen command of HANDOFF; commit plus push for each step after `git pull --rebase`.
- **Client code stays private.** Only behaviour enters `docs/notes`.
- **Nothing half-served (user, 08-11).** A board with a cell whose reward does not exist here is held, and so is a board chained after it.
- **Every missing item is searched until found** (user 06-11): e.g. donor medal 90135 (5★ Magic Broom) is not in our medal table; its board is held until it is found, never a substitute.
- **Prices as in the original.** A Jewel board costs its original Jewels (notice > khuxwiki > donor `price`, label `priceFromDonor`); none: held (`priceUnknown`). Never free where the original charged.
- **Bought once, kept for good.** `player.avatarBoardsBought` (ids); a bought board is listed in every later week, never charged twice.
- **Story-week windows** (user 15-11): a board is listed while its original window overlaps the story week; a Jewel board's `endDatetime` = the end of that story week, so the countdown is true; afterwards it is reachable only through the Event Catalog keep.
- **Do not announce boards on sale**: a not-bought type-2 board never travels in a `check` answer as a new entry.
- **Notices for every deviation** (story-week windows, the Event Catalog keep for past boards). Never the word «restored».
- **Out of scope:** Trait Medal Boards (240, Traits area); «Reached LV N!» (14, Lux level rewards); the Draw Ticket chain (5, no dated source: held, listed in the catalog with the reason).

## Review Focus

1. **A board bought in its window, then the story week moves on:** still listed, progress kept, no second charge (`bought_survives_window`).
2. **Not enough Jewels:** nothing charged, the client's «not enough Jewels» path (`buy_insufficient_jewels`).
3. **A crafted buy for a board outside the player's window and not kept:** refused (`buy_outside_window_refused`).
4. **A returning board (two windows, same donor board):** one id, one purchase, listed in both windows (`returning_board_one_id`).
5. **A check answer while a Jewel board is on sale:** the board is not in it (`check_never_announces_on_sale`).

---

### Task 1: Client spike and board census (user gate) — DONE 15-11 (commit 1e5116fb)

Findings in `docs/notes/bacheche.md`; scope and the countdown rule decided by the user (above).

### Task 2: Board records (private builder, user gate)

**Files:**
- Create (private): `D:\Progetto_Restauro_KH_UX\tmp\events\avatar_boards\build_avatar_boards.py`, output `avatar_boards.json`, `REPORT.md`

**Interfaces:**
- Produces: `avatar_boards.json` `{entries: [{censusId, key, group: 'outfit'|'gem'|'jewelBooster'|'skill'|'medal'|'avatarCoin'|'avatarCoinBooster'|'level', type: 1|2, window: [start, end] | null, price: number | null, boards: [{donorId, name, kindId, openId, openParam, detailUrl: '', cells: [{idx, cost, rewardSelect, rewardId, num}], completion}], sources: [..], labels: [..]}], held: [{donorId, name, why}], unmapped: [{donorId, name, why}]}`. `window` null only for the level boards.

- [ ] **Step 1:** Map each in-scope donor board (CENSUS.md §5) to its census rows by name, citing a source each (notice, khuxwiki board page); a returning board: one entry per window, same `donorId`.
- [ ] **Step 2:** Price from notice > khuxwiki > donor `price`; none: `held` `priceUnknown`.
- [ ] **Step 3:** Cells matched to our tables as `server/event-boards.js` does (Boosters via `game_data/boosters.json` byId; skills by skill id for `rewardSelect` 0); a reward not found: search it (medal 90135 first: JP 4.3.1, khuxwiki, donor medal rows), else the board goes to `held` with the reason.
- [ ] **Step 4:** Run twice: byte-identical. REPORT.md: entries per group and year, held with reasons. **Show it to the user**; wait.

### Task 3: Purchase popup layout (JP original)

**Files:**
- Modify: `recon/tools/jp_coco_layouts.txt` (add `SphereBoard_Account_ver120`), `docs/notes/bacheche.md`, the 4 session scripts (revision +1 if the master changes)

- [ ] **Step 1:** Import the JP 4.3.1 `cocostudio/publish/SphereBoard_Account_ver120.json` and the textures it cites, as I-265 did (`import_jp_coco.py`); check every widget name SPIKE.md lists is present; JP-only text ids get their English text from the WW text tables or a declared rebuild.
- [ ] **Step 2:** `build-resources.ps1 -Append`, `update-resources.ps1` (tap Download), relogin; bench with one hand-made type-2 row (not committed): the popup opens without a crash; note the request it sends. Restore master_data and relogin (revision +1).
- [ ] **Step 3:** Commit and push.

### Task 4: `server/avatar-boards.js`: rows, list, purchase

**Files:**
- Create: `server/avatar-boards.js`, `server/test-avatar-boards.js`
- Modify: `server/make-game-tables.js` (append the rows after the raid boards; `KHUX_AVATAR_BOARDS` = the records file), `server/event_ids.json` (key `avatarBoards`, ids 5000001+n), `server/server.js` (`GET /user/sphere`, `/user/sphere/check`, new `POST /user/sphere/buy`, `/user/sphere/update` for type 2 and the skill reward, the `/master/sphere` rows' `endDatetime`)

**Interfaces:**
- Consumes: `avatar_boards.json` (Task 2), `boosters.json` byId, `storyCtx` (shopFrom / shopTo), `player.avatarBoardsBought`, the kept event.
- Produces: `buildAvatarBoards({records, master, ids, boosters}) -> {sphereRows, arrayRows, masuRows, art, index}`; `game_data/avatar_boards.json` `{index: {[sphereBoardId]: {key, group, type, window, price}}, report}`; `listedIds(player, storyCtx, kept) -> number[]`; `buy(player, sphereBoardId, storyCtx, kept) -> {ok: true, userSphere} | {ok: false, why: 'jewels'|'window'|'bought'|'unknown'}`; `servedEndDatetime(row, storyCtx) -> string`.

**Decisions after Task 2 (user 15-11):** records `D:\Progetto_Restauro_KH_UX	mp\eventsvatar_boardsvatar_boards.json` (290 entries, 373 boards served, 116 held; each board also carries `grid`, `boardId`, `how`; level entries `level`; `censusId` may be null: 13 windows from khuxwiki only, label `windowFromWiki`). A skill cell is a **medal reward** (`rewardSelect` 3, the 6★ Scrooge medal) with `rewardExpand` 3, `rewardExpandId` = our skill id and `medalCategory`: the masu rows carry them and the board reward grant gives the medal with its skill. The 6 skills that exist only in the donated master (donor ids 1198, 1237, 1238, 1267, 1268, 1269) are imported from it (user 15-11) by a make-game-tables patch reading the private donor file, label `skillFromDonor`, declared in the notice. The 79 Booster boards wait for their Booster rows (the Part 6 Booster records gain the avatar-board cells; controller task before the Task 6 regen). The Set+ 2 boards keep a donor `openParam` to remap to the new ids.

- [ ] **Step 1: Write the failing tests** in `test-avatar-boards.js`: `rows_have_23_entries`, `ids_append_only`, `level_boards_keep_original_ids`, `listed_in_window_only`, `bought_survives_window`, `buy_charges_once`, `buy_insufficient_jewels`, `buy_outside_window_refused`, `returning_board_one_id`, `check_never_announces_on_sale`, `end_datetime_is_story_week_end`, `type2_node_unlock_accepted`, `skill_cell_grants_medal_with_skill`, `donor_skills_imported`, `chained_open_param_remapped`, `null_census_window_from_wiki`, `held_board_not_built`.
- [ ] **Step 2:** Run `node server/test-avatar-boards.js`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement the module and the routes (buy response: `userSphere` a single object, plus the mandatory keys of response 44 if it returns the inventory, `docs/notes/bacheche.md`).
- [ ] **Step 4:** Run it and `test-event-boards.js`, `test-raid-boards.js`, `test-boosters.js`, `test-avatar-update.js`. Expected: all OK.
- [ ] **Step 5:** Commit and push.

### Task 5: Event Catalog: BOARD entries and keep

**Files:**
- Modify: `server/make-events.js` (BOARD census rows as catalog entries with their boards), `server/event-pages.js`, `server/test-event-pages.js`, `server/test-make-events.js`

- [ ] **Step 1:** Failing tests `board_entry_listed`, `board_entry_keepable`: a BOARD entry with a served board shows its boards and price and can be kept (one kept event at a time, shared with event keep); keeping it lists its boards for sale at the original price; a held board shows its reason.
- [ ] **Step 2:** Implement; run both test files. Expected: OK. Commit and push.

### Task 6: Cards, master, resources, bench (user)

**Files:**
- Modify: `recon/tools/originals.tsv` (new section: board cards `img/sphere_incentive/<id>.png` from JP 4.3.1 / Roboloid / khuxwiki screenshots, as the Event Board cards), the 4 session scripts (revision +1)

- [ ] **Step 1:** Card pictures for every served board; a missing card is asked about, never drawn. Review page for the user.
- [ ] **Step 2:** Master regen (HANDOFF command + `KHUX_AVATAR_BOARDS`), revision +1, `build-resources.ps1 -Append`, `update-resources.ps1` (tap Download), relogin.
- [ ] **Step 3:** Bench on a save in a 2019 story week: an outfit board listed with price and countdown, bought (Jewels down once), opened, a node unlocked; still listed after `-RealNow` a month later; a Gem Board; a Skill Enhancement cell paying its skill; an Avatar Coin Booster Board granting its Booster; a level board; a kept BOARD entry from the Event Catalog. Screenshots and a table in `docs/notes/events.md`.

### Task 7: Notice, docs, next part

**Files:**
- Modify: `server/routes-info-album.js` («Events» notice: section «Avatar boards», counts from `game_data/avatar_boards.json`; the Gem Boards sentence of «Gem quests» updated), `server/test-notices.js`, `README.md`, `README.it.md` (parts 1-7), `docs/ISSUES.md` (I-245 Part 7), `HANDOFF.md`, `docs/notes/events.md` («Part 7 summary»)
- Create: `docs/superpowers/plans/<date>-events-part8-high-score.md`

- [ ] **Step 1:** Notice lines and test; `node server/test-notices.js`, `node server/export-notices.js --check`. Expected: OK, up to date.
- [ ] **Step 2:** Docs; commit and push; a tester package when the user says so.
- [ ] **Step 3:** Write the Part 8 plan (High Score Challenge, with `docs/superpowers/specs/2026-11-10-ranked-rewards-design.md`).

## Builder's calls (confirmed by the user 15-11 unless noted)

1. **Windows on the story calendar**; Jewel boards count down to the end of the story week (user 15-11).
2. **Past boards through the Event Catalog keep**, at the original price; declared as not original.
3. **Bought = kept for good**; no refund, no second charge.
4. **Scope** = the groups of the Goal (user 15-11); Trait Medal Boards, «Reached LV N!» and the Draw Ticket chain out.
5. **Level boards** handed out when the player's level reaches the board's level (`openParam`, to confirm in Task 2 from the donor rows and khuxwiki); not a purchase.
