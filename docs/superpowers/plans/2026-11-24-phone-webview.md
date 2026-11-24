# Phone layout of the in-game web pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** on a phone in landscape every in-game web page is the tablet layout reduced to 70 %, and the catalogs are a 3-column grid of cards; PC / tablet pages unchanged.

**Architecture:** one module `server/phone-css.js` holds the phone CSS (reduction, header in one line, tap floor, catalog grid) and `withPhone(html)`, which inserts it as the last `<style>` before `</head>`. Every HTML response of the server goes through `withPhone`, so no page head has to change. The existing portrait rules (`max-width` media queries) get a `min-height:481px` guard so they never fire on a phone in landscape.

**Tech Stack:** Node.js (server, no dependencies), plain CSS, test scripts `node server/test-*.js`.

**Spec:** `docs/superpowers/specs/2026-11-24-phone-webview-design.md`

## Global Constraints

- Phone = `@media (max-height:480px) and (max-width:900px)`; nothing in this plan may change a page outside that query.
- Reduction: `html{zoom:.7}` (CSS zoom, not transform).
- Catalog grid: `grid-template-columns:repeat(3,minmax(0,1fr))`; month headers `.ml` hidden only inside the catalog containers.
- Tap floor: main controls ≥ 30 CSS px of the reduced page.
- Portrait rules keep working on a portrait phone: guard = `and (min-height:481px)`.
- No tester pkg (publish / announce) in this plan: user approval of the whole round first (memory khux-phone-webview-round).
- Docs and commit messages in English; commits end with the Co-Authored-By line.

## Review Focus

- A tablet or the LDPlayer bench (frame ≥ 481 px high or > 900 px wide) must render byte-identical CSS behaviour: Task 1 test asserts the media query text; Task 4 bench compares a 1000x600 frame before/after.
- A phone in portrait (360x700 frame) keeps the portrait layout: Task 3 test asserts each guarded query; Task 4 checks a 360x700 frame.
- Pages that are not HTML (images, JSON, `/web/notices/shown`) must not be touched: Task 2 test feeds `withPhone` a body without `</head>` and a non-HTML response path.
- The Filters sheet (`position:fixed`) and the scroll helpers (`scrollIntoView`) must still work under zoom: Task 4 bench opens Filters and a year tab in the 640x320 frame and on LDPlayer.
- Hidden rows (`.hide`, filters) must stay hidden in the grid (no empty cells): Task 4 bench applies a filter in the 640x320 frame.

---

### Task 1: `server/phone-css.js`

**Files:**
- Create: `server/phone-css.js`
- Test: `server/test-phone-css.js`

**Interfaces:**
- Produces: `PHONE_MQ` (string `'(max-height:480px) and (max-width:900px)'`), `PHONE_CSS` (string, one `@media ${PHONE_MQ}{...}` block), `withPhone(html: string) -> string`.

- [ ] **Step 1: Write the failing test** `test-phone-css.js` (style of test-special-pages.js: `check(ok,msg)`, exit 1 on errors):
  - `PHONE_CSS.startsWith('@media (max-height:480px) and (max-width:900px){')` and it contains `html{zoom:.7}`.
  - it contains the grid rule for each catalog container: `#rows`, `#quests`, `#camps`, `.cat` with `repeat(3,minmax(0,1fr))`.
  - it hides `.ml` only as `#rows>.ml`, `#quests>.ml`, `#camps>.ml` (no bare `.ml{`).
  - `withPhone('<html><head><title>x</title></head><body>b</body></html>')` contains `<style>${PHONE_CSS}</style></head>` exactly once; calling `withPhone` twice gives the same string (idempotent, marker `data-phone`).
  - `withPhone('not found')` and `withPhone('<body>no head</body>')` return the input unchanged.
- [ ] **Step 2:** `node server/test-phone-css.js` → fails (module missing).
- [ ] **Step 3: Implement** `phone-css.js`. CSS inside the media query, from the approved spike:
  - `html{zoom:.7}`
  - header: `.hdr{display:flex;flex-wrap:nowrap;align-items:center;gap:12px}.hdr h1{flex:0 0 auto;margin:4px 0}.fbtn{flex:0 0 auto;width:auto}`; intro `p.n{font-size:13px;margin:2px 0 6px}`
  - tap floor: `.fbtn,.tab,.yc,.pk,.o,button{min-height:30px}`
  - grid on `#rows,#quests,#camps,.cat`: `display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:start`; every non-card child of these containers spans `grid-column:1/-1` (`#camps>h2,#camps>p,#camps>.yrs`); `.ml` hidden as above; `.hide` stays `display:none`.
  - cards `#rows>.row,#quests>.row,#camps>.row,.cat>.b`: `flex-direction:column;align-items:stretch;padding:6px 6px 8px;border-bottom:0;background:#06283e;border-radius:8px`; `.im` and `.im img` `width:100%;height:auto`; `.info` `font-size:14px;line-height:1.35`; `.d,.rp,.n` inside cards `font-size:12px`; `.go{display:none}`.
  - Use `!important` only where the pages' own rules win (the spike needed it on `.hdr`, `.fbtn`, `.im`).
  `withPhone`: insert `<style data-phone>` + CSS + `</style>` before the first `</head>`; return input unchanged if there is no `</head>` or the marker is already there.
- [ ] **Step 4:** `node server/test-phone-css.js` → `ok`.
- [ ] **Step 5: Commit** `feat(web): phone layout CSS for the in-game pages (70 % + catalog grid)`.

### Task 2: every HTML response through `withPhone`

**Files:**
- Modify: `server/server.js` (the `html` / `page` helpers and the direct `writeHead(... 'text/html'...)` sites at about lines 2200, 3726, 5032, 5334, 5371, 5438, 5477, 5876, 5882), `server/keyblade-evo.js:319`
- Test: `server/test-phone-css.js` (add)

**Interfaces:**
- Consumes: `withPhone` (Task 1).

- [ ] **Step 1: Add the failing test:** read `server.js` and `keyblade-evo.js` as text; for every line with `'Content-Type': 'text/html` whose body is a page (not the `'not found'` 404 helpers), assert the buffer is built from `withPhone(`; report the line numbers that are not.
- [ ] **Step 2:** run → fails, listing the sites.
- [ ] **Step 3:** wrap the page bodies with `withPhone(...)` (`require('./phone-css')` once at the top of each file). 404 helpers stay as they are.
- [ ] **Step 4:** `node server/test-phone-css.js` → `ok`; the page tests still pass: `node server/test-special-pages.js`, `node server/test-event-pages.js`, `node server/test-raid-pages.js`, `node server/test-notices.js`, `node server/test-help-pages.js`.
- [ ] **Step 5: Commit** `feat(web): serve every in-game page with the phone CSS`.

### Task 3: portrait rules never fire on a phone in landscape

**Files:**
- Modify: `server/special-pages.js:642` (`NARROW_CSS`), `server/gacha.js:427` (`PAGE_NARROW_CSS`) and `:819`, `server/event-pages.js:537`, `server/medal-gallery.js:271`, `server/routes-info-album.js:1068,1168`
- Test: `server/test-phone-css.js` (add)

- [ ] **Step 1: Add the failing test:** scan those files (and every other `server/*.js` except tests) for `@media` queries using `max-width`; each must also contain `min-height:481px`. Update the assertion in `test-event-pages.js:395` to the new query text.
- [ ] **Step 2:** run → fails listing the unguarded queries.
- [ ] **Step 3:** rewrite each as `@media (max-width:700px) and (min-height:481px){` (600px stays 600px in routes-info-album.js).
- [ ] **Step 4:** `node server/test-phone-css.js` and the page tests of Task 2 Step 4 → pass.
- [ ] **Step 5: Commit** `fix(web): portrait phone rules only on tall frames`.

### Task 4: check on screen (no pkg)

**Files:** none in git (screenshots in `D:\Progetto_Restauro_KH_UX\tmp\mobile\`).

- [ ] **Step 1:** restart the bench server (relogin `-Save kbslots`; server-only change, no resources).
- [ ] **Step 2: Chrome frames page** (same origin, opened from a `http://127.0.0.1/web/...` tab, iframes of real size so the media queries see them): for Notices, Event / Raid / Special / Avatar Board / Banner Catalog, an event Details, a raid Details, Help: a 640x320 frame (phone), a 1000x600 frame (tablet / LDPlayer) and a 360x700 frame (portrait). Expected: 640x320 = reduced, catalogs in 3 columns, header in one line; 1000x600 and 360x700 = as before the change (compare with screenshots taken before Step 1). Open Filters, pick a filter and a year tab in the 640x320 frames: sheet usable, no empty grid cells.
- [ ] **Step 3: LDPlayer bench:** Events → Event Catalog Details and Notices: unchanged look.
- [ ] **Step 4: user's phone** (adb): the phone is pointed at the PC server through `adb reverse`; if that is not possible, stop and ask the user (no publish). Screenshots of Notices and Event Catalog.
- [ ] **Step 5:** fine-tune font sizes / tap floor in `phone-css.js` from what the phone shows (test of Task 1 kept green), commit `fix(web): phone layout tuning after the phone check`.
- [ ] **Step 6:** show the user the screenshots; then the Medal Gallery look together (spec: reduced only, to revisit). HANDOFF + ISSUES line (new issue «phone layout of the web pages»), commit and push.
