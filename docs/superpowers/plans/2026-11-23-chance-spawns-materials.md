# Chance Spawns and Material Spots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve the original "can appear" enemies randomly through the original `userRandomEnemies` removal list, and give the "Collect all materials" event quests their material spots.

**Architecture:**
- Generated event maps carry the chance squads like any other squad. The generator lists their squad uids in `stage_poi.json` (`random`).
- For original maps, a curated repo table names the squad uids that a source says "can appear".
- `/stage/start` rolls 50% per listed uid and sends the ones to remove.
- Material spots are written into the MAP `materials` section of generated parts. Their quantities add up to the khuxwiki totals.

**Tech Stack:** Node (server, make-events), Python 3 (gen_story_maps, private patches), PowerShell (live pipeline).

**Spec:** `docs/superpowers/specs/2026-11-23-chance-spawns-materials-design.md`

## Global Constraints

- `userRandomEnemies` element is exactly `{ uniqueSymbolEnemyId: <squad uid> }` (squad int [5]); the list names squads to REMOVE.
- Probability 50% per random squad per `/stage/start`; the target squad is never listed.
- Stages with no random list send `[]`, as today, so the response for every other stage is byte-identical.
- Material spots per material: `ceil(units / 2)` spots. The units are split as evenly as possible, larger first. Example: 5 units give 3 spots, 2 + 2 + 1; this matches the 04/11/2017 footage (4 -> 2 spots, 2 -> 1, 5 -> 3).
- The STG header [15] equals the total number of material spots.
- A chance squad's source must be khuxwiki chance rows, an official notice, or footage; the 0x80 flag alone is not proof.
- Docs and commits are in English. Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Git needs `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=safe.directory GIT_CONFIG_VALUE_0='*'`.
- Private records stay in `D:\Progetto_Restauro_KH_UX\tmp\events\` (never in the repo). Write text with backslashes using Write or Edit, never a Bash heredoc.

## Review Focus

1. **A generated map whose chance group sits alone in an area with no other group.** The area must still be built; today the builder drops empty areas. The generator test covers it.
2. **The served counters.** `/stage/start` for a stage whose POI has `random` but no `enemies` list must not throw. The server test covers it.
3. **A regen run must not drop the `random` key or the material totals** of an earlier run (POI merge in make-events). The make-events test covers it.
4. **Removing a squad must never make a quest unclearable.** The target is never random, and "defeat all" is lowered by the client. The server test asserts that the target uid is never in the list even if it is listed by mistake.
5. **Material quests with a non-materials served objective** (donor objective kept, I-251) still get their spots, which are harmless. The census lists them.

---

### Task 1: Server sends the removal list

**Files:**
- Modify: `server/server.js` (near `startTreasures`, ~line 1632; `/stage/start` response ~line 2446; exports ~line 6269)
- Test: `server/test-random-enemies.js` (new)

**Interfaces:**
- Consumes: `STAGE_POI[stageBinId].random` (array of squad uids) and `.target` (squad uid of the target, optional), both written by Task 2.
- Produces: `stageRandomEnemies(stageId, rng = Math.random) -> [{ uniqueSymbolEnemyId }]`, exported.

- [ ] **Step 1: Write the failing test.** The test loads `server.js` the way the other tests do, e.g. `test-stage-drops`; set `STAGE_POI` entries directly.
  - `random_rolls_half`: POI `{random:[3,7], target: 9}`, rng returning 0.2 then 0.8 → `[{uniqueSymbolEnemyId:3}]`.
  - `random_never_target`: POI `{random:[9], target:9}`, rng 0 → `[]`.
  - `random_absent_empty`: a stage with no POI, and a POI with no `random` → `[]`.
  - `stage_start_sends_list`: `respondStageStart` for a POI with `random:[5]` and rng stubbed to 0 has `userRandomEnemies` `[{uniqueSymbolEnemyId:5}]`.
- [ ] **Step 2:** Run `node server/test-random-enemies.js`. Expected: FAIL, `stageRandomEnemies is not a function`.
- [ ] **Step 3: Implement `stageRandomEnemies`.** It uses `poiOf(stageId)` (so Proud rows map as for the chests) with threshold `rng() < 0.5` → removed. Wire it into `/stage/start` in place of `userRandomEnemies: []`, and add it to the exports.
- [ ] **Step 4:** Run the new test plus `node server/test-stage-drops.js` (or whichever existing tests cover `/stage/start`). Expected: PASS.
- [ ] **Step 5: Commit** `feat(server): userRandomEnemies removal list at /stage/start`.

### Task 2: Generator writes chance squads and material spots

**Files:**
- Modify: `recon/tools/gen_story_maps.py`:
  - `build_event_areas` (~1302-1510);
  - the one-area event path (~1536-1570, which calls `build_part`);
  - `mr_body` materials block (~676);
  - `poi_add` (~1210).
- Test: `recon/tools/test_gen_story_maps_events.py`

**Interfaces:**
- Consumes these event entry fields (`event_gen_maps.json`, written by Task 3):
  - `areas[k].enemies[i]` may be `{ "chance": true, "members": [...] }` or the list form. **Ruling for the executor:** keep today's list-of-members form and add a parallel `areas[k].chance: [i, ...]`, the indexes of the chance groups.
  - `areas[k].materials: [{ "materialId": int, "n": units }]`.
  - The one-area form gets `chance` and `materials` at the top level.
- Produces `stage_poi.json[sid]` with:
  - `random: [squadUid...]`, the area record uids of the chance groups;
  - `target: squadUid`, the target squad uid;
  - `materials: [{ materialId, number, map }]`, one entry per spot.

- [ ] **Step 1: Write the failing tests** (same fixture style as the existing event tests):
  - `chance_group_listed_in_poi`: a 2-area entry with a chance group in area 0 makes `POI[sid]['random']` == [that group's area uid]; the target uid is not in it; STG [8] counts the chance squad.
  - `chance_only_area_kept`: an area whose only group is a chance group still produces its part.
  - `material_spots_split`: area materials `[{materialId:A,n:5},{materialId:B,n:2}]` gives spots A [2,2,1] and B [2] (`ceil(n/2)` spots, so 3 + 1 = 4 spots, with the units split evenly, larger first). STG [15] == 4. Every spot is on a walkable pixel ≥ 96 from any exit.
  - `material_spots_one_area`: the same for the one-area path.
- [ ] **Step 2:** Run `python -I recon/tools/test_gen_story_maps_events.py`. Expected: the 4 new tests FAIL.
- [ ] **Step 3: Implement.**
  - **Material spots:** place them along the walk distance like chests do (`pool` / `by_d`, away from exits and enemies). Round-robin over the areas in order, or all in the single part.
  - **The `materials` block:** u32 n plus n × `<4i` (x, y, materialId, quantity).
  - **STG [15]:** the total number of spots.
  - **`poi_add`:** gains `random`, `target` and `materials`.
- [ ] **Step 4:** Run the test file. Expected: all PASS. Also run `python -I recon/tools/test_gen_story_maps.py`, if present, for no regressions.
- [ ] **Step 5: Commit** `feat(maps): chance squads and material spots on generated event maps`.

### Task 3: make-events carries chance groups, materials and the original-map table

**Files:**
- Modify: `server/make-events.js`:
  - `genAreasOf` (~818);
  - the one-area gen entry builder;
  - the POI merge (~1785-1860).
- Create: `server/random_squads.json`: `{ "<stageBinId>": { "uids": [int], "source": "text" } }`, starting empty `{}`.
- Test: `server/test-make-events.js`

**Interfaces:**
- Consumes these record fields (private, Task 4):
  - `genAreas.areas[k].groups[i].chance === true`, whose members carry an explicit `enemyId`;
  - `genAreas.areas[k].materials: [{materialId, n}]`;
  - one-area records: `map.materials` and the chance groups the same way.
- Produces `event_gen_maps.json` entries with `areas[k].chance` and `areas[k].materials` (Task 2's input), and `stage_poi.json[sid].random` for the original maps from `random_squads.json`.

- [ ] **Step 1: Write the failing tests.**
  - `gen_chance_group_passed`: a record area with a chance group (Eggcognito, `enemyId` given) passes the page-count check, because chance groups are left out of `inAreas` and the queue. The entry has `areas[0].chance == [index]` and the member's own id.
  - `gen_materials_passed`: the materials are copied verbatim.
  - `random_squads_merged`: `random_squads.json` `{ "300660": {uids:[1,3,5]} }` puts `random:[1,3,5]` on the merged POI of 300660. A uid equal to the POI target is dropped, with a warning line.
  - `poi_random_survives_regen`: a second merge keeps `random`.
- [ ] **Step 2:** Run `node server/test-make-events.js`. Expected: the new cases FAIL.
- [ ] **Step 3: Implement.** The POI target uid for original maps is the squad with flag bit 0 in the imported map, if the import report has it. Otherwise the stage's target enemy's squad from `stage_poi_events.json`.
- [ ] **Step 4:** Run `node server/test-make-events.js`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(events): chance groups, material spots and random_squads.json`.

### Task 4: Census and private record patch 15

**Files (private, `D:\Progetto_Restauro_KH_UX\tmp\events\unbuilt\`):**
- Create: `chance_materials/census.json` and `patch_chance_materials.py` (patch #15: idempotent, backups in `r2_bak`).
- Modify (repo): `server/random_squads.json` with the original-map entries.

- [ ] **Step 1: Chance census.** List every record quest with:
  - a `genAreas.chanceLeftOut` (the 26 maps of 10b, plus EV-0121 700330);
  - the research-D chance quests EV-0108 (502830/502840/502850: single Huge Fireworks squads), EV-0172, EV-0080, EV-0074;
  - served original maps holding Gold Tricholoma, Huge Fireworks, Eggcognito or Shenaneggan where a source says "can appear". The 1-Year Anniversary Countdown notice is in `research3/D/report.txt` Q4; the 0x80 candidates 300660-300770 are in `tmp/random_enemies/scan/`.

  Each row gets its source; a row without one is left out and listed.
- [ ] **Step 2: Materials census.** List every event quest, served or held, whose khuxwiki objectives name "Collect all materials". Give its map source and the infobox material totals: page fields such as `|brokenbiscuit=4`, mapped to materialIds through the existing material-name table used by make-events. Generated maps only; original maps keep their own sections.
- [ ] **Step 3: Write `patch_chance_materials.py`.**
  - Move `chanceLeftOut` back into its area as a group with `chance: true`. If the area was dropped, insert it back in page order. Members get an `enemyId` resolved from `event_enemies.json`, preferring the month row.
  - Add the chance groups for EV-0108/0172/0080/0074.
  - Write `materials` per area: all on the area named by the page, else the first area.

  Run it twice; the second run reports 0 changes.
- [ ] **Step 4: Add the original-map entries** to `server/random_squads.json`, each with its `source`. Commit `data(events): random squads of the original maps (sources)`.

### Task 5: Notices, docs, live run and bench

**Files:**
- Modify: the Notices text that lists event deviations (`server/event_config.json` labelPhrases / the events notice), `docs/notes/events.md` (new section «Chance spawns and material spots», patch #15 in the re-apply order), `docs/notes/battaglia.md` and `docs/journal/fino-al-2026-10-11.md` (fix the `userRandomEnemies` keys: `{uniqueSymbolEnemyId}`), HANDOFF.md, and the session scripts (revision bump).

- [ ] **Step 1: Notice line.** «Rare enemies that "can appear" (Gold Tricholoma, extra Huge Fireworks, Eggcognito, Shenaneggan) appear at random, as in the original; the chance is ours (1 in 2), the original rate is unknown. The material spots of the "Collect all materials" quests are rebuilt: their totals match the original results, their positions do not.» Add a test assert in `server/test-event-pages.js` (or the notices test) that the line is present.
- [ ] **Step 2: Live order** (backup `tmp\master_bak_r373`, regen, import_event_stages, `build-resources.ps1 -Append`, regen, served diff with additions only and the changed maps listed, revision 373, update-resources, relogin `-Tag r373 -Save raid2 -Vip 1`).
- [ ] **Step 3: Bench with the user.**
  - EV-0121 Advanced: start it 3 times. Eggcognito / Huge Shenaneggan vary, and the target is always there.
  - A materials quest: pick up the spots; the result screen shows the khuxwiki totals and the objective is met.
  - A Countdown quest with Gold Tricholoma, if one is listed.
- [ ] **Step 4: Commit and push** the docs plus HANDOFF; update memory `khux-unbuilt-quest-rulings`.
