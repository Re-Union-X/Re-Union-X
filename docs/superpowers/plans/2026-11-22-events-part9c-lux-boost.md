# Events Part 9c: Lux Boost — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** The Home screen **Lux Boost** button works again: once per Pacific day, +5% Lux for 60 minutes, only in a party, not on the day the party was joined.

**Architecture:** A pure module `server/lux-boost.js` (status, activation, Lux factor) over `player.luxBoost`; `server.js` answers GET and PUT `/party/lux_up_time` (action 105) with it and multiplies the Lux of `/stage/clear`.

**Spec:** `docs/superpowers/specs/2026-11-22-campaigns-design.md` (goal 5, «Lux Boost», «Decisions taken»: offline party = the player only).

## Bench facts (spike 22-11, save `ls20`, `relogin.ps1 -LuxUp a,m,r`)

- GET `/party/lux_up_time` at every Home: `luxUp {magnification, available, restrictionKind}`.
- The button (Lux Boost, left of Quests) shows with `available` true, or with `restrictionKind` 1; with `available` false and kind 0/2 it is hidden.
- Pressing it opens the original confirmation «Party members get 5% more Lux for the next 60 minutes. The button resets at midnight.»; OK sends **PUT `/party/lux_up_time`** with no parameters (no other route).
- `magnification` 500 shows the banner «5% Lux Boost!» on Home: unit 1/10000 (500 = 5%).
- `restrictionKind` 1: pressing shows «You cannot use this feature on the day you joined the party.»

## Global Constraints

- Original rules (notices 20682, 30716, 30792): +5% for 60 minutes, once per day, available again after 12:00 a.m. PT; must be in a party; not on the day of joining (from v2.2.0).
- Offline: the party is only the player, so the boost applies to the player (spec decision); declared in the Notices.
- Docs and commits in English; commit and push every task.

## Review Focus

1. Pressed twice (double tap, retry of the PUT): one activation, the window not extended.
2. Pressed at 11:30 p.m. PT: the boost runs past midnight; the button is back after midnight, a new press restarts the 60 minutes.
3. Not in a party (no `player.party`): button hidden, PUT refused without changes.
4. A quest started inside the window and cleared after it: Lux follows the moment of the clear (as the Bonus Times Lux).
5. A save without `luxBoost` (old save): available today.

---

### Task 1: lux-boost.js

**Files:** Create `server/lux-boost.js`, `server/test-lux-boost.js`.

**Interfaces — Produces:** `status(state, nowMs, party) -> {magnification, available, restrictionKind}`; `activate(state, nowMs, party) -> {state, ok}`; `factor(state, nowMs) -> number`; constants `MAGNIFICATION = 500`, `DURATION_MS = 3600000`. `state = player.luxBoost = {day: 'YYYY-MM-DD' (Pacific day of the last use), at: ms}`; `party = player.party` (`createDate` ms).

- [ ] Step 1: failing tests: fresh state in a party → `{0, true, 0}`; after `activate` at t → `{500, false, 0}` and `factor` 1.05 until t+60 min, 1 at t+60 min; second `activate` the same Pacific day → `ok` false, `at` unchanged; next Pacific day → available true, magnification still 500 if inside the hour; no party → `{0, false, 0}` and activate refused; party created today (Pacific) → `{0, false, 1}`, created yesterday → available.
- [ ] Step 2: run, FAIL (module missing). Step 3: implement (Pacific day with `Intl.DateTimeFormat('en-CA', {timeZone: 'America/Los_Angeles'})`). Step 4: run, OK. Step 5: commit.

### Task 2: routes and Lux

**Files:** Modify `server/server.js` (route `/party/lux_up_time` GET and PUT, `/stage/clear` Lux × `factor`), remove the spike (`KHUX_LUXUP_SPIKE`, `-LuxUp`); `server/test-lux-boost.js` route part.

- [ ] Step 1: failing route test: GET then PUT then GET on a test save in a party → answers `{luxUp: {...}}` as Task 1, `player.luxBoost` saved; the `/stage/clear` Lux of a stub clear is ×1.05 inside the hour.
- [ ] Step 2-4: implement, run, commit.
- [ ] Step 5: bench: Home shows the button, OK → banner «5% Lux Boost!», button gone; a quest cleared inside the hour reports Lux × 1.05 (server log); relogin keeps the state. Check whether `luxMagnifications.party` 500 changes the Lux the client reports (if it does, the server must not multiply too: rule on the bench).

### Task 3: notice and docs

**Files:** `server/routes-info-album.js` + `server/test-notices.js` (Events notice section «Lux Boost»: once a day, 60 minutes, +5%, only you in your party, not on the day you create a party), `docs/NOTICES.md` export, `docs/notes/home_profilo.md` (bench facts above), ISSUES I-293, HANDOFF.
