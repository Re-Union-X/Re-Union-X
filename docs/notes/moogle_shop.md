# Moogle Shop (Items and Traits)

References: `reference\moogle_shop\` (moogle_shop_01.png, jp410_136.png). Taps in
[banco.md](banco.md#tocchi).

<a id="dati"></a>
## Data and API

- `server/make-moogleshop.js` generates `moogleshop` and `shuffleskill` (from the khuxwiki; no public
  dump). Fields: `type` 1 Traits / 2 Items; `payType` 1 jewel (2 munny: hypothesis); `itemType` as in the
  rewards (5 material, 3 medal); `frameType` 1 = blue row (Panel), otherwise gold
  (Panel_Rare/SkillPanel_Rare/Count_Rare); `display` 1 = shows «N days left» until `endDate`;
  `count` = possible exchanges. `shuffleskill.category` = icon `img/kakusei/Kakusei_Icon%04d` (10
  gauge, 20 HP, 30-50 resistances, 60/61 ground/aerial, 70 raid, 80 extra attack, 90 STR, 100 DEF);
  `shuffleskill.type` must be 1, otherwise the row does not appear.
- `GET /moogleshop/list` -> active rows `{moogleshopId, limitCount}` (empty = «No items available.»).
- `POST /moogleshop/buy` (248) `{moogleshopId, userMedalId, userShuffleSkillId (0 = free slot)}` ->
  `shuffleskillUserMedals`, `userMedals` (each element with `userShuffleSkills`:
  userShuffleSkillId, shuffleSkillId, userMedalId, getDatetime, type 0), `userSkills`,
  `userMaterials`, `emblemIds`, `guiltBurstFirst/MaxUserMedalIds`, `userData.userPoint`. The server
  saves into `player.medalTraits[userMedalId]`; cost and count are deducted only on success, otherwise
  only `ret` («200 ERROR :248»).

<a id="schermata"></a>
## Screen

- Scene `MoogleShopScene_ver410` generated; the moogle on the right = `Moogle_Fla`, `lwf/mogshop/mog_wait`
  (empty LWF: the moogle is not visible). Plate `LB_Munnies` (with `Txt_MunniesPossessed_Label`/
  `Txt_Munnies`) is in the layout but does not appear on the bench.
- Rows: item rows and trait rows; the item icon goes into `Panel_Item` (LuxBoard, AVT, Incentive, Medal,
  KB, Stamp, Icon_Skill). Generated
  textures `Mogshop_plate1`, `But29`/`But31` (trait rows), copies `But30` (= But01).
- No `Txt_Count_Cus` Label in the layouts: the client creates it from `Txt_Count`. In trait
  names «%» must be doubled (they go through printf).
- Confirmation `MoogleShop_Traits_AddCheck.json` (also with
  `LB_Jewel`), result «Received ...».
- Currency of the Items (I-122): **always jewels**, without looking at `payType`. The item row only writes
  the price into `Jewel` > `Txt_Jewel` and loads no icons: the icon is the layout's one.
  The confirmation popup uses text 106220414 «Spend N Jewels in exchange for X?», puts the owned jewels
  (free + purchased) into `Txt_CrownPossessed_Label` and always hides `LB_Munnies`,
  `Txt_MunniesPossessed_Label`, `Txt_Munnies`. Original: WW `moogle_shop_01.png` (Rainbow Gem x10 =
  100 jewels, «Exchange Jewels for materials and traits!»); JP row `MoogleShop_Item_Panel` with
  `Ico_jewel.png`. The munny in the rows came from the textures: in `cocostudio/publish` the numbering
  is not the same as in `img/incentive` (publish `IncentiveIcon_01` = jewel, served WW; JP publish
  `IncentiveIcon_02` = munny, `img/incentive/IncentiveIcon_02` = jewel). Our `Jewel_Icon`
  pointed to `IncentiveIcon_02.png` (copy of the `img/incentive` jewel in `COPIES`), but
  `import_jp_coco.py` overwrites it with the JP `IncentiveIcon_02` (munny) for the JP layouts that
  use it. Now the generated layouts use `IncentiveIcon_01.png` and the 02 copy is gone.

<a id="righe-items"></a>
## Items rows (I-102)

- Since 15-11 the row is the JP 4.3.1 original `MoogleShop_Item_Panel` (resources 127): blue `Win13` panel (gold `Win29`
  for `frameType` != 1), dark name bar `MogShop_Bar`, jewel plate `Result_Clear_Km_Panel1` with `Ico_jewel`, red
  `But30` «Exchange», black icon square (`Mogshop_plate1`, 112x112: medals fill it). Bench: same look as
  `reference\moogle_shop\moogle_shop_01.png` (`screenshots\ms_20_montage_ref_vs_bench.png`), Exchange popup ok.
- The client turns the ImageView `But_Buy` into its own button and loads `img/ui/But30_Off/_On/_Disable.png` into it
  (9-slice); absent from the WW resources, which was the crash 0x2c of the plain import (13-10). `jp_coco_layouts.txt`
  `patch=moogle_item` copies them from the JP `But30` art. `ImageButton_Buy1` and `ImageButton_LockMask` are created by
  the client (an existing one is removed), `Row_Base`/`Name_Plate` are not looked up: the generated row in
  `make_layouts.py` is only a fallback.
- Lock: `LockMask` (over the Exchange button, `Lock_icon` = `img/ui/ShopBut_Lock(_Disable).png`) is shown by the
  client for a row whose exchanges are used up; our Items rows have no limit (`count` 0), so it never shows today.

<a id="schede-righe-trait"></a>
## Tabs and Traits row backgrounds (I-102, prepared 15-11, bench pending)

- Tabs: the client puts its own button into the ImageViews `tab1`/`tab2` of `MoogleShop_Win_ver410` and loads
  `img/ui/Mogshop_tab_Off/_On.png` (capital O, natural size, no 9-slice; layout size 220x61). Served so far: our
  generated 200x48 tabs (`make_textures.py` `mog_tab`), thinner border and smaller radius than the original (tester
  report 12-11). The JP art `Mogshop_tab_off/_on` (220x61) matches `moogle_shop_01.png`: `patch=moogle_tabs` on
  `MoogleShopScene_ver410` copies it to `img/ui` (`screenshots\ms_30_tabs_ref_ours_jp.png`).
- Traits rows: the client loads `img/ui/But29_*` (blue) / `But31_*` (gold) into the 9-slice `Panel`/`Panel_Rare`
  (700x100, capInsetsX 30). Ours were 704x106 bitmaps (`mog_row`): the cap insets cannot shrink them, so each row
  drew ~106 tall and the first one touched the list frame (user report 15-11, «first row cut at the top»).
  `patch=moogle_traits` serves the JP 60x100 art instead (`screenshots\ms_31_traits_rows_ref_bench_jp.png`). The
  list position (`Area_Traits`) and the row pitch (110, set by the client) are the original ones.

<a id="trait"></a>
## Trait exchange

- Tapping the row (already checks the price: «You don't have enough Jewels»), «Select Medal» (grey
  with no row chosen) opens `MoogleShop_Traits_MedalSelect_Pop_ver410` (generated by
  `trait_medal_select_popup` in `make_layouts.py`).
- Grid `MiniMedalScrollView`: a **tap** opens the detail; the **choice is made by dragging** the medal
  onto the slot on the left (the drop must land inside `MedalArea` > `Medal1`, size 176x176), which fills
  `KakuseiSkill_Window`.
- Veiled medals (grey 100,100,100): medal type 9/10 (support) or `spShuffleskillSlot` 0.
- **Crash on «Select Medal» (I-121, 14-10): it was not the layout.** Before opening the list the client
  requests `GET /user/skill` (action 13), which the server did not handle: the skill list
  stayed empty and the cell of a medal with a skill (Scrooge with a computed skill since 12-10,
  Overwrite) asked for skill row 0 and crashed. The server now answers with the full `userSkills`; the original JP popup stays.
- Full slots: `MoogleShop_Traits_OverwriteCheck_ver410` (OK = `Button_Draw`/`Txt_Draw`,
  `Txt_Wording2` «Replace X with Y?»; the slot is chosen by tapping the trait row).

- Wait after «Set Trait» (bench 14-10): the response of `POST /moogleshop/buy` (248) contained the whole lists
  of medals/skills/materials; the client applies them entry by entry (upsert, O(n^2) with ~2076 medals) and stayed
  stuck for **5.8 s** from the tap on OK to the result. Now `inventorySnapshot`/`inventoryBlocks` send only the changed entries:
  **0.9 s**, and the medal list stays whole (2076/2243 after the exchange: for 248 too it is an upsert).
  With a normal inventory (hundreds of medals) the original wait would have been a fraction of a second:
  the delay came from the test inventory with all medals (KHUX_MEDALS_ALL).

<a id="aperti"></a>
## Open

Closed 29-10 (ISSUES I-021): moogle, `LB_Munnies` and long trait names fine on the bench; the timed offers
(`display` 1) get `endDate` = next Monday 08:00 in fake time when the master is served, and their exchanges
reset each real week (`moogleshopBought` + `moogleshopWeek` in the save). Red cursor
of the slot to replace (armature `MedalInfo_Anim`, `animeCursor`) wider than the window; special
traits (Spirit Training) not handled (ISSUES I-043).

<a id="trait-medal"></a>
## Trait Medals in the Moogle Shop (research 20-10, postponed to I-164)

User's decision (20-10): it will be done together with the resource balancing (I-164). Original offers found
(notices in `reference\banners\notices.json`, khuxwiki in `reference\trait_medals\`; full list in
`D:\Progetto_Restauro_KH_UX\tmp\tm\MOOGLE_TRAIT.md` and `moogle_trait_offers.json`):
- 25-10-2019 (notice 59270): Trait Medal #155 x30 for 300 jewels, once, during the deal of the same medal.
- 22-11-2019 (60076, Black Friday): «99 Trait Medal per 1.000 jewel», daily lineup; numbers not written.
- 17 and 24-02-2020 (63137/63138): 12 Trait Medals from past deals, x15 for 800 jewels, no limit, one week each.
- 7-12-2020 / 7-3-2021 (khuxwiki, Limited-Time tab): 35 rows x10 for 1,000 jewels, no limit (#282-#313 and
  some old ones).
- #189-#313 (khuxwiki): 102 periods «Moogle Shop from X to Y» (30-3-2020 / 1-3-2021), almost always those of the deal;
  price and quantity unknown for Mar-Nov 2020.
- The WJE «Moogle Shop Sale» sales (500/100/1,000 jewels) are of Traits, not of Trait Medals. No VIP condition
  written for Trait Medals.
