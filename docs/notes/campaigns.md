# Campaigns (Bonus Times), evCampaign

Events Part 9a ([design](../superpowers/specs/2026-11-22-campaigns-design.md), [plan](../superpowers/plans/2026-11-22-events-part9a-bonus-times.md)).
Research of 22 November 2026: what the WW 4.3.1 client does with each row (study of the client's behaviour, facts only), checked on
the bench where noted.

## How the client reads a campaign

- A row counts as active only when the server lists its id (`campaigns` of GET `/campaign`, action 143, and of `/stage/start`
  and `/raid/start`). The row's times and weekdays are never checked.
- A screen walks the listed ids in order and skips missing rows, rows of another type, and rows its scope filter rejects. For AP
  the **first** row that passes wins; there is no minimum or product. The Medal Fusion screen keeps the **last** row of each
  fusion type.
- Power: 0 gives 0. Otherwise value × power / 10000; AP rounds **up** and is never below 1 (90 × 556 → 6, 3 × 3500 → 2).

## Who applies each type

| type | text in the original data | client | server (Part 9a) |
|---|---|---|---|
| 1 | Rare items drop rate up! | balloon only | drop odds × power / 10000 (`rollDropTypes`) |
| 6 | Raid Boss Encounter x 2 | balloon (story / event / co-op screens) | not served: raids keep their own Bonus Time (routes-raid.js) |
| 7 | 0 AP! / 5 AP / Half AP / 1 AP | shows the changed AP (bench 22-11: Daily Challenge Cid 10 → 5 with a Half AP row) | charges the same AP at `/stage/start` (bench: −5 AP) |
| 8 | 100% Raid Boss Ω Encounter (2015 test rows) | balloon only | not served |
| 9 | Next Raid Level +2 / +5 | balloon on raid screens | not served (raid code) |
| 10 | Lux x 2, Big / Great Lux boost! | balloon only | Lux of `/stage/clear` × power / 10000 (bench 22-11: 19.5M → 39.0M) |
| 11 | Medal Fusion: EXP x 2 | fusion EXP shown × power / 10000 | the same on the EXP gained |
| 14 | Medal Fusion: Half Munny Cost | fusion munny shown × power / 10000 (bench: balloon on the Level Up screen) | the same on the munny charged |
| 17 | Limited-time bonus boost! (the Sp. Atk Bonus campaign) | `guiltProb` rows with `isCampaign` 1 get weight × power / 10000: power 0 leaves them out | the same in the guilt roll (`medal-guilt.js rollGuilt`) |
| 18 | Rare enemy encounter rate up! | balloon only | not served (its rows are co-op scope) |

`luxMagnifications.campaign` of `/stage/start` does not change the Lux the client reports at `/stage/clear` (bench 22-11, 0 and
20000 gave the same Lux), so it stays 0.

`guiltProb.isCampaign` is 1 on the rows below the khuxwiki campaign minimum of each tier (`medal-guilt.js GUILT_RANGES.campaignMin`):
during a Sp. Atk Bonus campaign the Special Attack Bonus never rolls below that minimum, as in the original notices («Raised SA
Bonus roll floors», 2017-03).

## Scopes (stageType)

| st | stages |
|---|---|
| 1 | none (fusion types; the stage is not checked) |
| 2 | the ids in `stageId[0..validStageId-1]` |
| 3 | the same list check, on raid screens (raid enemy ids) |
| 4 | every stage of the screen |
| 5 | every story quest (stageKind 1) |
| 6 | every event quest |
| 7 | every Coliseum stage |
| 8 | every raid boss |
| 9-18 | story chapters 1-10 |
| 19 | every Proud quest (stageKind 4) |
| 20 | every co-op (Union Cross) quest |

Screens accept: story 2, 4, 5, 9-19; event 2, 4, 6; co-op 4, 20; Coliseum 2, 4, 7; raid 3, 8.

## What we serve

- `server/make-campaigns.js`: the private calendar (kinds of the donated 2016-2021 table and of the 1.1.3 rows, with their
  original Pacific days; notices win where they disagree) becomes evCampaign rows **96000-97999** and `campaign_days.json`
  (server only, one list of ids per original day).
  - Raid kinds (types 6, 9; scopes 3, 8) are dropped.
  - AP kinds never list story or Proud quests: they cost 0 AP here, and the client could show 1.
  - Scopes 4 and 6 become explicit lists of the stages of the events running that day. They are never served as broad
    scopes, which would also take the Special quests.
  - Coliseum (7) and co-op (20) scopes are not served.
  - Each day lists its AP rows first, lowest power first.
- `server/campaigns.js`: the ids of the story day (`weekDateAt` of the Shop week on today's Pacific weekday), the AP charged, and
  the server-side factors.
- Bench switch: `relogin.ps1 -Campaigns 95990,95991` (env `KHUX_CAMPAIGN_FORCE`) lists those ids and applies them, whatever the
  day. Bench rows must be added to `master_data/evCampaign.json` by hand and removed afterwards: the generators keep every row
  outside their own ranges.
