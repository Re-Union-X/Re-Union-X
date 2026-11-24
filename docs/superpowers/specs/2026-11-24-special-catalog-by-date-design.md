# Special Catalog by date (design, 24 November 2026, approved by the user)

## Intent

The Special Catalog confuses the user, on PC too: (1) the VIP campaigns sit in a separate section under the quests
(«VIP Campaigns», its own year chips); (2) the permanent quests (Daily Challenge Cid, Evolve Medals...) belong to almost
every period, so every year tab shows nearly the same cards and changing year «seems to change nothing».

## Decision (user 24-11: option B, «what arrived in that year»)

Like the other catalogs (Event, Raid, Avatar Board, Banner): every card is one dated thing and appears once, in its
year; the year tabs filter by date.

- **One grid** (`#quests`): permanent quest versions and campaigns together, ordered by start date. The `#camps` section,
  its year chips (`.yc`, `yr` in the page script) and its month labels go away.
- **One card per version** of a permanent quest family (today one card per family with every version inside): the card
  belongs to the game year in which that version started (`data-periods` = that year only), and shows its span
  («Year 1 → Year 2», «Mondays from Year 3») on its date line. Example: «Evolve Medals: Legendary» = a card in Year 1
  (every day, years 1-2) and a card in Year 3 (Mondays, years 3-5); none in years 2, 4, 5. «Skill EXP»: Year 1, Year 3,
  Year 4.
- **Campaigns**: one card each as today (weeks of the same banner art merged), in the game year of their start date
  (game years run from the April 7 anniversary: `GAME_YEARS`, not the calendar year).
- **«All years»**: every version and campaign once, by date.
- Kept: statuses («Open today», «Opens on…», «Replaced by…», «VIP only — locked»), the Keep / Remove button of the
  keepable version, the details page per family (`/web/special/quest/<family key>`, anchors `q<id>` for BACK), the
  Filters sheet, progress, search.

## Approaches considered

- A — «what was in Special that year»: quests repeat in every year they existed, campaigns mixed in; rejected: the
  repetition is what confuses the user and no other catalog works that way.
- B — chosen (above).

## Left to the builder

- Start date of a version: the `from` of its first period (or the entries' `from` when later), as `versionYears`.
- The details page and the server (`special.js`, keeping rules) do not change; only `special-pages.js` catalogPage, its
  page script and `test-special-pages.js` (structure + the headless script checks of `#camps` / `.yc`).
- Phone CSS: drop the `#camps` rules of `phone-css.js` once the section is gone.
