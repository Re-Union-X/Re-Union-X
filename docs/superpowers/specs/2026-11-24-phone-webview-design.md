# Phone layout of the in-game web pages (design, 24 November 2026)

## Intent

The in-game web pages (Notices, event / raid / Special Details, the Catalogs) read well on PC and tablet, but on a
phone "everything is too big" and the Event Catalog is "not comfortable at all" (user, 24-11). Most testers play on a
phone, so these pages are what they consult to understand events, raids and rules.

## What we found on the user's phone (Galaxy A54, 2340x1080, density 450, system font 110 %)

- The game is always landscape. The WebView frame inside the popup is about **640 x 320 CSS px**.
- Our pages use 17-21 px text, 44 px buttons and 320 px banners, designed for a big frame: the Event Catalog shows
  title + full-width Filters + intro text on the whole first screen, then **one event per screen** (558 events).
- The existing narrow layout `NARROW_CSS` (special-pages.js, `@media (max-width:700px)`) targets a phone in
  **portrait** (full-width Filters, stacked parts). In landscape it fires because the frame is < 700 px wide and makes
  things worse.
- The WebView applies the system font scale (110 %) to the text on top of our sizes.

## Goals

1. On a phone in landscape every in-game page looks like the tablet layout, reduced (user picked 70 %).
2. The catalogs become a **3-column grid** of cards (banner on top, title, dates, state chips, buttons under it), about
   six events per screen, as in the approved spike (`D:\Progetto_Restauro_KH_UX\tmp\mobile\spike_catalog_compare.png`,
   option 3).
3. PC and tablet pages stay exactly as they are.

## Non-goals

- No redesign of the content (texts, sections, filters, rules stay the same).
- No change to the client or to the WebView settings (we serve HTML only).
- Beginner's Guide (I-192, on hold until all modes exist) is only reduced, not redesigned.

## Anti-goals

- Text so small it cannot be read on the phone, or buttons too small to tap.
- A tablet / PC page that changes because a rule matched it by mistake.

## Approaches (picked: 3)

1. **Reduce everything on phones** (one rule for every page, same layout as tablet): fastest, but the catalogs stay
   one event per row.
2. **A dedicated phone-landscape layout per page**: best result, long work, every page redone and benched.
3. **Mix (picked by the user 24-11):** approach 1 as the base for every page, plus a compact grid for the catalogs,
   the longest pages to scroll.

## Design

- **Phone detection:** a short frame, `@media (max-height:480px)` (landscape phone; tablets and PC are taller). Same
  rule in every page head, so no page is forgotten.
- **Reduction:** inside that media query `html{zoom:.7}` (Chromium WebView supports CSS zoom); the layout then has
  ~914 CSS px of width, i.e. the tablet layout. The portrait `NARROW_CSS` and the other `max-width` phone rules
  (gacha.js, event-pages.js HSC table, medal-gallery.js, routes-info-album.js) must not fire on a short frame: they
  get `and (min-height:481px)`.
- **Catalog grid** (Event Catalog, Raid Catalog, Special Catalog, Avatar Board Catalog, Banner Catalog): inside the
  same media query the rows container becomes `grid-template-columns:repeat(3,minmax(0,1fr))`; each row becomes a card
  (column flex, banner 100 % wide, rounded dark background, the coloured left border kept as the state cue, the «›»
  arrow hidden). Month headers (`.ml`) are hidden in the grid (user accepted option 3 without them; each card keeps
  its dates). Header in one line: title, Filters button (auto width) on the right.
- **One shared helper** for the phone CSS (base rule + catalog grid), used by every page head, so later pages get it
  for free.

## Calls made after the builder check (to confirm while reading)

- **Phone detection also needs a narrow frame:** `@media (max-height:480px) and (max-width:900px)`, so a short popup
  on a 7-8" tablet or a foldable is not caught; the LDPlayer bench (tablet-like frame) must keep today's layout.
- **Tap floor:** after the 70 % reduction the main buttons (Filters, Keep, Details, tabs, chips, the Filters sheet
  options and its close button) must stay at least 30 CSS px of the reduced page (≈ 21 px of the frame, ~6 mm on the
  A54); smaller controls get a counter-rule inside the media query.
- **WebView versions:** testers use recent phones (A54, S25 Ultra) and BlueStacks 5 / LDPlayer (Android 9). Non-standard
  CSS `zoom` works on both old and new Chromium; the pages' scroll helpers and the fixed Filters sheet are checked on
  the A54 and on the LDPlayer bench (old WebView) before the tester pkg. A `transform` fallback only if one of them
  breaks.
- **Both sections** of the Event / Special Catalog (campaigns `#camps` and quests `#quests`) become grids, for a single
  look.
- **Medal gallery** is not a catalog of events: reduced only, no grid (to revisit if the user finds it uncomfortable).
- The «hide `.ml`» rule is scoped to the catalog pages (gacha.js uses `.ml` for medal lists).

## Left to the builder

- The exact list of page heads (catalog-pages.js, gacha.js, keyblade-evo.js, legal-pages.js, medal-gallery.js,
  routes-info-album.js, server.js, special-pages.js, plus pages built elsewhere) and the row/card class names of each
  catalog (Event: `#rows .row` / `.im` / `.info` / `.ml`).
- Fine tuning of font sizes inside the cards so they stay readable at 70 % + 110 % system font.
- Tests in the existing page tests (the phone CSS is present, `NARROW_CSS` guarded by min-height).
- Check on the real phone through a private test pkg (not announced) before the tester pkg; then an in-game Notice
  is not needed (layout only, no game rule changes).
