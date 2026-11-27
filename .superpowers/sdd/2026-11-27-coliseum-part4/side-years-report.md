# Year tabs: "you are here" pin, All years on open (27-11)

Catalogs with the year selector: Banner Catalog (gacha.js), Special Catalog (special-pages.js), Raid Catalog (raid-pages.js),
Event Catalog and Avatar Board Catalog (event-pages.js, board mode), Coliseum Catalog (colosseum-pages.js).

Not starting on All years: only the Event Catalog (and so, in board mode, the Avatar Board Catalog) opened on the year of the
Story week (`data-def` from `ctx.shopFrom`). Now `data-def="all"`. The other catalogs already started on All years.
Remembered tabs kept for BACK navigation only (a fresh open shows All years): Banner Catalog (sessionStorage restored only
with the `#c` hash, otherwise cleared), Coliseum (`#p<year>` / `#q<id>` hash), Raid (`#sec.year` hash), Event (hash of a row).

Change: `hereYear` / `hereMark` / `HERE_CSS` in gacha.js next to GAME_YEARS (re-exported by special-pages.js); the pin is
LOCATION_ICON in a `<span class="here" title/aria-label="Your Story is in this year">` before the tab name, absolutely positioned
(no layout change, phone tabs unchanged). Position = `ctx.shopFrom` (Story Shop week); none -> no pin; never on All years; a
year without a tab has none. server.js colosseumPageCtx now passes `shopFrom`.

Tests: event-pages (all-years default, data-def, pin, no position; Avatar Board Catalog), raid-pages, colosseum-pages,
special-pages, gacha (new checks). Existing tab regexes/expectations that assumed the year tab open first were updated.
Green: test-colosseum-pages, test-raid-pages, test-event-pages, test-special-pages, test-gacha, test-game-catalog,
plus routes / phone-css tests. RED seen on the event tests (default tab) after the expectation change; pin tests were written together with the code.

Files: server/gacha.js, special-pages.js, event-pages.js, raid-pages.js, colosseum-pages.js, server.js and the five test files.
