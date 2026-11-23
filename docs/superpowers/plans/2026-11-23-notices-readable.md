# Readable Notices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the in-game Notices compact and readable, as in mockup v2: an «in short» box, closed sections with one-liners and status tags; split «Events» into 7 notices.

**Architecture:** `server/routes-info-album.js` `noticesPage` gains a small body syntax (summary lines, `## Title | one-liner`, `#=` numbers line, `{not original}`-style tags) rendered as `<details>` sections. The NOTICES data is rewritten for the long notices, and the «Events» body becomes 7 notices. `export-notices.js` prints the same data as markdown.

**Tech Stack:** Node (server), plain HTML/CSS for the Android 9 WebView (`<details>` is supported).

**Spec:** `docs/superpowers/specs/2026-11-23-notices-readable-design.md`

## Global Constraints

- The list rows are unchanged: date, tag colour and title, as today; no grouped rows.
- Sections are closed by default. No icons, no legend, no stat cards.
- Tags:
  - NOT ORIGINAL `#8a4fc2`;
  - REBUILT `#d07a12`;
  - LATER `#5c6b75`;
  - white bold, font 10-11 px, radius 3 px.
- Docs and commits are in English. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Git needs the `safe.directory` env.
- No information may be dropped: every existing body sentence stays inside some section; only the bold «not original» phrases become tags.

## Review Focus

1. **Old links.** `/web/notices#events` and the other slugs used by raid-pages, event-pages and help pages must still open the right notice. Test: slug aliases.
2. **The pinned notice** (gold, cards) must keep working with the new syntax. Test in Task 1.
3. **Old bodies.** A notice without any new syntax renders as before, minus nothing: a plain list inside a section. Test.
4. **Escaping.** `{…}` tags and `|` inside text must not break HTML escaping; a literal `|` in a title without a one-liner stays. Test.
5. **The markdown export** (`docs/NOTICES.md`) must not show raw `{not original}` or `#=`. Test in Task 4.

---

### Task 1: Renderer (syntax and CSS)

**Files:**
- Modify: `server/routes-info-album.js` (`noticesPage` `bodyHtml`, CSS, about line 1018)
- Test: `server/test-notices.js`

- [ ] **Step 1: Write the failing tests** in `test-notices.js`. Each test renders `noticesPage(now, {notices: [fixture]})`.
  - `notice_in_short_box`: lines before `##` → `class="brief"`; the `#= 539 events · 4,092 of 4,243 quests` line → `class="nums"` with `<b>539</b>`.
  - `notice_sections_details`: `## Rewards | once, original drop chances` → `<details><summary><span>Rewards</span><i>once, original drop chances</i></summary>`, closed (no `open`).
  - `notice_tags`: `{not original}` → `<span class="tag no">NOT ORIGINAL</span>`; `{rebuilt}` → `tag rb`; `{later}` → `tag la`; `{other}` stays as text.
  - `notice_escape`: `<b>` inside text is escaped; a `##` title containing `a | b | c` splits only at the first `|`.
  - `notice_pinned_cards`: a pinned notice still renders its gold row and cards.
- [ ] **Step 2:** Run `node server/test-notices.js`. Expected: FAIL on the new cases.
- [ ] **Step 3: Implement.** Replace the `<ul>/<li>` section rendering with `<details>` plus paragraphs (`.body p`), add the brief/nums/tags parsing and the CSS of mockup v2 (`tmp/notice_style/mockup2.html`, `.det` part).
- [ ] **Step 4:** Run `node server/test-notices.js`. Expected: OK. Also run `node server/test-help-pages.js` and `node server/test-raid-notices.js`.
- [ ] **Step 5: Commit** `feat(notices): compact detail page, in-short box, closed sections, status tags`.

### Task 2: Split «Events» into 7 notices

**Files:**
- Modify: `server/routes-info-album.js` (the `{ date: '11/16', tag: 'IMPORTANT', title: 'Events', ... }` entry, about line 705; the slug code in `noticesPage`)
- Test: `server/test-notices.js`

- [ ] **Step 1: Write the failing tests.**
  - `events_split_in_seven`: NOTICES has the 7 titles of the spec, in that order, all 11/16 IMPORTANT. The old title «Events» is gone.
  - Every section title of the old body appears in exactly one of them; the total word count is no lower than before, minus the replaced «not original» words.
  - `events_slug_alias`: the detail of «Event Quests: how they work» carries `data-s="event-quests-how-they-work"` and `data-a="events"`. The hash `#events` opens it (the alias is checked in the load script).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement.** Split the body by the spec's section groups. The fact functions (`eventNoticeLines` etc.) stay, called from the notice they belong to. Add an `alias` field to the notice and `data-a` to the detail, and match it in the load script.
- [ ] **Step 4:** Run `node server/test-notices.js`, `test-event-pages.js` and `test-raid-notices.js`. Expected: OK.
- [ ] **Step 5: Commit** `feat(notices): Events split into 7 notices`.

### Task 3: In short, one-liners and tags in the content

**Files:**
- Modify: `server/routes-info-album.js` (NOTICES bodies and the `*Lines` helpers they call)
- Test: `server/test-notices.js`

- [ ] **Step 1: Write the failing test** `notices_readable`.
  - Every notice of more than 300 words has 1-3 «in short» lines.
  - Every one of its `##` sections has a one-liner of at most 45 characters.
  - No body line contains `**not original**` (they became `{not original}`).
- [ ] **Step 2:** Run. Expected: FAIL, listing the notices.
- [ ] **Step 3: Write the content.**
  - Write the «in short» lines and one-liners from facts already in each notice.
  - Turn the bold «not original» / «rebuilt» / «not yet / later» phrases into tags.
  - Add numbers lines where the notice has headline counts (events served, raid bosses, etc., from the existing fact functions).
- [ ] **Step 4:** Run `node server/test-notices.js`. Expected: OK.
- [ ] **Step 5: Commit** `content(notices): in short, one-liners, status tags`.

### Task 4: Export, docs, live

**Files:**
- Modify: `server/export-notices.js`, `docs/NOTICES.md` (regenerated), `docs/notices/index.html` (regenerated), `HANDOFF.md`
- Test: `server/test-notices.js` (export part)

- [ ] **Step 1: Write the failing test** `export_markdown_clean`.
  - The markdown of a notice prints tags as `(not original)`, one-liners as `— one-liner` after the heading, and the numbers line as plain text.
  - No `{`, `#=` or `|` syntax is left.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3: Implement** in `export-notices.js` (and `noticesPage` with `web: true`), then run `node server/export-notices.js`.
- [ ] **Step 4: Live.** Restart the server through `relogin.ps1 -Tag notices -Save raid2 -Vip 1` (server code only, no resources), open Notices in the game, and check:
  - the list is unchanged except the 7 event rows;
  - a detail page is compact and its sections open;
  - BACK works;
  - the Event Catalog «Notices» link opens «Event Quests: how they work».
- [ ] **Step 5: Commit and push** the docs plus HANDOFF.
