# Readable Notices (short design)

Approved by the user on 23-11-2026, based on mockups `tmp/notice_style/mockup.png` (v1, rejected for the list) and `mockup2.png` (v2, approved).

## Why

The in-game Notices (Other > Notices, `server/routes-info-album.js`) have grown into walls of text. «Events» alone is 7,189 words in 17 sections, and «Raid Bosses» is 2,534. The goal is notices that read in seconds, are easy to understand and look good, with no information lost.

## Approaches

- **Chosen: visual style plus light content restructuring.**
  - Every notice gets an «in short» box and closed sections with a one-line summary.
  - The «Events» notice is split into 7 notices.
  - The detailed text stays as it is, inside the sections.
- **Rejected: CSS only.** It is prettier, but a 7,000-word notice stays unreadable.
- **Rejected: rewrite every text from scratch.** It is long and risky, because those sentences record precise rulings.

## Design (as approved)

1. **The list is unchanged.** Rows keep date, tag and title as today. The split notices are normal rows; no grouped sub-rows (the user rejected them).
2. **The split of «Events».** It becomes 7 notices, all 11/16 IMPORTANT, in this order:
   1. **Event Quests: how they work** (renamed so it does not get confused with the others): lead, Opening hours, Event Catalog, Rewards, Event coins and boards, Boosters.
   2. Event Challenges & High Scores: Challenge events, High Score Challenges.
   3. Bonus Times & login bonuses: Bonus Times, Special login bonuses, Lux Boost.
   4. Events of 2016-2018: Events of 2016-2018, Gem quests, Org XIII events.
   5. Event enemies: Enemy graphics.
   6. Avatar boards: Avatar boards, Avatar Board Catalog.
   7. SP Chip & Dale.
   - Links to `#events` keep working: they open notice 1.
3. **The detail page, compact (mockup v2).**
   - **The «in short» box:** the existing `.lead` style, gold left border. It holds 1-3 short lines plus an optional numbers line, for example «539 events · 4,092 of 4,243 quests · 108 Event Boards», with the numbers in gold.
   - **The sections** are `<details>`, closed by default.
     - The summary row shows a cyan triangle, the section title in cyan bold, and on the right a short grey one-liner.
     - Opening a section shows the existing text as compact paragraphs.
   - **Status tags:** small rounded tags replace the bold «(not original)» / «rebuilt» phrases:
     - NOT ORIGINAL in violet;
     - REBUILT in orange;
     - LATER in grey.
     - No tag for «original», which is the default.
   - **What goes:** no icons, no legend, no stat cards.
4. **Notice body syntax** (body lines, backwards compatible):
   - `## Title | one-liner` is a section with a summary one-liner (without `|`: no one-liner).
   - The lines before the first `##` form the «in short» box.
   - A line `#= n label · n label` is the numbers line.
   - Inline `{not original}`, `{rebuilt}`, `{later}` become the tags.
5. **Content.** Each notice gets a short «in short» and one-liners. The long notices are done first: the 7 event notices, Raid Bosses, Story 526-979, Differences in detail, Special Quests, Campaign Rewards and Shop. In the existing sentences, the bold «not original» phrases are replaced by the tags; the words stay otherwise.
6. **Other outputs.** `docs/NOTICES.md` and the web export (`export-notices.js`) keep working: the markdown export prints the one-liners and tags as text.
7. **The pinned notice** keeps its gold style and cards, adapted to the same section syntax.

## Left to the builder

- Exact spacing and colours, within the mockup v2 look.
- The wording of the one-liners. They are short, and only facts already in the text.
