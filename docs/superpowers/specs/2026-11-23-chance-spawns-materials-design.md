# Chance spawns and Collect-all-materials spots (short design)

Approved by the user on 23-11-2026.

## Intent

Some original event enemies only "can appear": Gold Tricholoma, extra Huge Fireworks, Eggcognito and Shenaneggan. Today we leave them off our maps entirely. The goal is to serve them randomly, as the original did. A separate goal is to give the "Collect all materials" quests their material spots.

## How the original worked (client RE, 23-11)

- **The response field.** The `POST /stage/start` response has `userRandomEnemies: [{ uniqueSymbolEnemyId: <squad uid> }]`. The parser is `FUN_007a1690` in WW 4.3.1.
- **What the client does with it.** The squad loader (`FUN_00e60610`) skips every squad whose uid (squad int [5]) is in that list. Map init (`FUN_00e5e1f4`) then lowers STG [8] and [9] to match, so "defeat all" stays correct.
- **The list means "remove these squads".** A squad that is not listed always appears.
- **The stage file does not say which squads were random.** The original server decided that, so the list of random squads must come from our sources.
- **A journal correction.** An old journal entry gave `userRandomEnemies` the keys `uniqueEnemyId` / `dropItemTypeIds` / `stealType`. That is wrong: those keys belong to `userEnemyDropItems`.
- **Working files.** Evidence is in `tmp/random_enemies/` (decompiled d1-d15.c and the squad scan).

## Approaches

- **A, chosen: remove squads at `/stage/start`.** The map holds every squad. At each start the server rolls the random ones and sends the uids to remove. This is the original mechanism, and it needs no resource rebuild for maps that already hold the squads.
- **B, rejected: several variants of each map.** The variants would need resource builds, the client could not pick between them per play, and it is not original.

## Design

1. **Probability: 50% per random squad, per start.** This is our choice; the original rate is unknown. The Notices declare it. The target squad is never removed.
2. **The server table.** Each stage gets its random squad uids, in a server data file listing stageId and its uids. `/stage/start` fills `userRandomEnemies` from that table. Every other stage keeps an empty list.
3. **Generated maps.** The "chance" rows that the private builder now leaves out (`genAreas.chanceLeftOut`: the 26 maps of 10b, EV-0121 700330, EV-0108 and its siblings, EV-0172, EV-0080, EV-0074) are placed back. Each one is a lone squad on the walk, and its uid goes into the table.
4. **Original JP/WW maps.** A squad becomes random only when a source says it "can appear": an official notice, khuxwiki chance rows, or footage, such as the 1-Year Anniversary Countdown Gold Tricholoma. The 0x80 squad flag is a hint, not proof.
5. **Objectives.** Objectives that count chance enemies are met across replays, as in the original. No change is needed.
6. **Materials.** "Collect all materials" quests get material spots: map section `materials` holds x, y, materialId and quantity.
   - The spots sit along the walk, in roughly the number seen in the videos, with fewer spots than units.
   - The quantities add up to the khuxwiki infobox totals, which are result totals (verified on 04/11/2017).
   - STG [15] equals the spot count.
   - The Notices declare the spots as rebuilt.
7. **Notices.** One line covers the 50% chance rule and the rebuilt material spots.

## Non-goals

- Exact original spot positions.
- Per-quest original probabilities.
- Multiplayer `userRandomEnemyLevel`.

## Left to the builder

- Spot placement heuristics.
- The table file name and its format.
- Which original-map squads qualify, settled per source and listed in the docs.
