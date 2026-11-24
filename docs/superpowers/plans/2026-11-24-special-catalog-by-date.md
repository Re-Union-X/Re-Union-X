# Special Catalog by date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the Special Catalog is one date-ordered grid where every card (a version of a permanent quest, or a VIP campaign) appears once, in the game year it started.

**Architecture:** only `server/special-pages.js` `catalogPage` and its page script change: cards are built per version (`f.versions`) for permanent families and per merged campaign as today, sorted by start date, all in `#quests`; `data-periods` holds the single game-year index of the start. The `#camps` section, its year chips and month labels go. `phone-css.js` drops its `#camps` rules.

**Tech Stack:** Node.js, plain ES5 page script, tests `node server/test-*.js` (headless Edge check in test-special-pages.js).

**Spec:** `docs/superpowers/specs/2026-11-24-special-catalog-by-date-design.md`

## Global Constraints

- Game year of a date = `gameYearOf(date)` (gacha.js, April 7 anniversary), tab index 0-5 = `GAME_YEARS`.
- Version start = `max(from of its first period, entries' from)`, end = `min(to of its last period, entries' to)`; week versions (`campaign` set) use their campaign week.
- Kept unchanged: statuses, Keep / Remove (now per version card), details page per family `/web/special/quest/<key>`, anchors `q<id>` for every entry, Filters, progress, search, the `.cr` class of campaign cards.
- Shared CSS (`.yc`, `.yrs`, `.camps`) stays: gacha.js and raid-pages.js use it.
- No tester pkg until the user approves the whole round.

## Review Focus

- A family whose versions each have a keepable entry: each card shows its own button; a pin moves the gold status across cards (khuxRow works on entries, not families).
- BACK from a details page lands on the card holding `q<id>` (no year chip to select any more).
- A search / SHOW filter hides cards without leaving the summary counts wrong (`N quests · M campaigns`).
- Week versions (`weekOf`) are dated by their week, not by the set's period.
- Phone grid: no leftover `#camps` rules.

---

### Task 1: cards per version, one grid by date

**Files:** Modify `server/special-pages.js` (`catalogPage`, `JS`, a `versionSpan` helper next to `versionYears`); Modify `server/test-special-pages.js`.

- [ ] **Step 1:** update the tests: rows = version cards + campaign cards; `data-periods` = one index (start year); date line of a version (`Tuesdays · Year 3 → Final months` style: day names when not every day, game-year names, `· VIP` / `· Free` only for mixed families); order by start date in `#quests`; no `id="camps"`, `class="yc"`, `class="ml"`; script without `yr` / `ycs`; headless check: SHOW filter and «All years» counts without chips. Real index: cards = versions of non-campaign families + campaign rows.
- [ ] **Step 2:** `node server/test-special-pages.js` → fails.
- [ ] **Step 3:** implement (`versionSpan(v, periods) -> [from, to]` full dates; `versionYears` uses it).
- [ ] **Step 4:** `node server/test-special-pages.js` → `ok`; other page tests green.
- [ ] **Step 5:** commit `feat(special): Special Catalog as one grid by date, one card per version`.

### Task 2: phone CSS without `#camps`

**Files:** Modify `server/phone-css.js`, `server/test-phone-css.js`.

- [ ] **Step 1:** tests no longer expect `#camps`; assert `PHONE_CSS` has no `#camps`.
- [ ] **Step 2:** run → fails. **Step 3:** remove the rules. **Step 4:** run → `ok`.
- [ ] **Step 5:** commit `refactor(web): drop the phone rules of the old VIP Campaigns section`.

### Task 3: check on screen

- [ ] PC (Chrome) and phone (adb reverse to the PC server): All years and a year tab, a filter, BACK from a details page, Keep on a version card. Screenshots to the user; HANDOFF / ISSUES, commit and push.
