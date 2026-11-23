# Events Part 10d: social prizes, 0 AP days, EV-0085 VIP set (short design)

Part 10d of [2026-11-22-events-part10-design.md](2026-11-22-events-part10-design.md) (goals 7, 8, 9; «Order of work» item 4).
Approved by the author on 23-11-2026.

## Intent

Close Part 10 with the three remaining pieces of the November 2016 - March 2018 period. These are the original rewards and
campaigns the notices and the official X account announced but our data does not serve yet. Every reconstruction is
declared in the Notices.

## Goals

1. **Social prizes**: pay the all-player rewards of the social goals that were reached (checked on X, 22-11):
   - EV-0195 Twitter Follower Challenge: Fantasia Mickey B + 2,000 Jewels, paid 2017-05-05;
   - EV-0307 Halloween retweets: 3,000 Jewels + Fantasia Mickey B, paid 2017-11-03;
   - EV-0379 #ChirithyMini: 60 bi-weekly quizzes 2018-01-26..2020-07-10, 200 Jewels each, each paid on its own date.
   The August 2017 retweet goal (EV-0254) is already paid by login specials 333/334: not added again.
2. **0 AP days** announced by the notices but missing from the donated campaign calendar: EV-0093, 0110, 0129, 0150, 0168,
   0197, 0230 (all of February 2017 included).
3. **EV-0085 Cyber Week VIP set** (2016-11-21..12-05): one more week-limited VIP campaign in the Special tab, same sets as
   C23990 (VIP Upgrade + Daily Chip & Dale + VIP Skill). The Jewel sale itself stays out.

## Non-goals and anti-goals

- No purchase bonuses, no Lux rankings, no raid 0 AP (raids keep our weekend rule, `routes-raid.js`).
- No reward paid twice (a social prize and a login special for the same payout).
- No prize lost when the Story week runs ahead of the payout date.

## Approaches

One sensible way: each piece extends the machinery that already serves its kind.

- Social prizes in the Conditional Present campaigns (`campaign_gifts.json`, I-234): they already open on the Story Shop week
  and pay once into the Presents. A login special (Part 9b) was rejected: it pays only on the login of that day, and one
  missed day loses the prize. A new route was rejected as needless.
- 0 AP days in the Part 9a calendar (`make-campaigns.js`): it already narrows «every event quest» rows to the stages of the
  events running that day. Editing the donated calendar file was rejected: it stays as donated. The notice days go in a
  separate private file that is merged in at build time.
- The VIP set in `special_periods.json` campaigns + the private catalogue row, like the 120 WW VIP campaigns.

## Design

- **`date` condition kind** (`campaign-gifts.js`): one unit as soon as the campaign is open (Story Shop week >= `start`).
  Each #ChirithyMini episode is its own campaign row (start = payout day), so it pays once. The six episodes marked «(?)» in
  the X scan are paid: each has a 200 Jewels tweet (author's call, approved).
- **Notice 0 AP days**: a private file (env `KHUX_CAMPAIGN_NOTICE_DAYS`) lists, per notice, its Pacific days and the kind
  «every event quest costs 0 AP». `make-campaigns.js` adds them to the calendar's days. Where a donated day already has an
  AP row, the notice row comes first (lowest power first, so 0 AP wins). Rule «the notice wins» also for EV-0129, where
  khuxwiki lists 7/3/5 AP quests. EV-0150 also names story, Proud and VIP quests: story and Proud already cost 0 here. VIP
  (Special) quests are not covered by the event-quest scope and stay as they are (declared).
- **C22565**: new campaign key with its own frozen evStageId after the last used one, parts `[{set: "chip-dale"}]`, dated
  2016-11-21..2016-12-05 (two weeks), banner of C23990.
- **Notices**: «Campaign Rewards» gains the social prizes (Twitter challenges, paid once in the Presents when the Story week
  reaches the payout date); the Bonus Times notice gains the notice-backed 0 AP days.
- **Docs**: `docs/notes/campaigns.md`, `docs/notes/events.md`, HANDOFF, README phase row when Part 10 closes.

## Left to the builder

Exact campaign ids of the social rows, the private file format of the notice days, the evStageId of C22565 and test
names.
