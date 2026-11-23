'use strict';
// Notice summaries and section one-liners for the in-game Notices
// (plan: «Notices readable», spec docs/superpowers/specs/2026-11-23-notices-readable-design.md).
// SUMMARY: 1-3 short lines shown at the top of a long notice (and of the event notices).
// ONELINER: a short summary beside each «##» section title of those notices; 'Overview'
// is the closed section that holds the lead (the lines before the first «##»).
// Keys must match NOTICES titles and section titles of server/routes-info-album.js exactly.

const SUMMARY = {
  'Campaign Rewards': [
    'Old campaigns are back: meet their condition and the reward goes to your **Present Box**.',
    'They start when your Story reaches them and **never end** {not original}.',
    'Each reward is given once, as soon as the condition is met.',
  ],
  'Raid Bosses': [
    'Weekly **Raid Bosses** follow your Story; they are solo for now and keep the damage you dealt.',
    'Monday to Friday raids cost their AP; on **weekends** they cost 0 AP with Bonus Time all day.',
    'Keep one past raid from the **Raid Catalog**; missing graphics and values are {rebuilt}.',
  ],
  'Event Quests: how they work': [
    'The original **Event Quests** are back in Quests > Events, following your Story week.',
    'Rewards are given once, drops keep their original chances, and **Event Coins** never expire.',
    'The **Event Catalog** lists every event; keep one past event at a time.',
  ],
  'Event Challenges & High Scores': [
    'Challenge, battle, quiz, Surprise and Time Missions events are back from 2016 to 2021.',
    '**High Score** rank brackets became score thresholds: reach one to get its rewards {not original}.',
  ],
  'Bonus Times & login bonuses': [
    'Original **Bonus Times** return on their days of your Story week, open the whole day.',
    '**Special login bonuses** are given once each, even for days you skipped.',
    'The **Lux Boost** button gives 5% more Lux for 60 minutes, once a day.',
  ],
  'Events of 2016-2018': [
    'The events of **late 2016 to early 2018** are back, rebuilt from later game data.',
    'Quests with no surviving map are played on **generated maps** from the community wiki {not original}.',
    'Gem Quests and the **Organization XIII** events are back too.',
  ],
  'Event enemies': [
    'Event enemies with incomplete graphics are **rebuilt** from the game\'s own files.',
    'Many now use the **exact original pictures**, thanks to the ReLux Team\'s index.',
  ],
  'Avatar boards': [
    'Limited **Avatar Boards** are back, following your Story week; a board you buy is yours for good.',
    'The **Avatar Board Catalog** in Special lets you keep one past board {not original}.',
  ],
  'SP Chip & Dale': [
    'The **SP Chip & Dale** 6★ Medal, an event reward, is back with a community render {rebuilt}.',
  ],
  'Spirit Parts': [
    'VIP Spirit Part quests now give the **Spirit part** on their banner, and many lost parts are back.',
    'The **Spirit Blind Box** deals return in the Shop and can be kept from the Banner Catalog.',
  ],
  'Draw Points': [
    'Sell Attack Medals of **Tier 2 or higher** for Draw Points; 100 points give one draw.',
    'Points start at Story Quest 895 and **never expire** {not original}.',
  ],
  'Special Quests': [
    'The **Special** tab shows one week of your Story period at a time, moving on every Monday.',
    'Most Special Quests need **VIP**, which cannot be earned until Union Cross is back.',
    'Keep one past quest from the **Special Catalog**; maps and drops are {rebuilt}.',
  ],
  'Story Quests 526-979': [
    'The Story goes on up to **Quest 979**, with original maps and rewards where they survive.',
    'From about Quest 900 you need a **very strong team**; lost parts are {rebuilt}.',
  ],
  'Differences from the original game': [
    'Re-Union X works **completely offline**: no other players and nothing is sold.',
    'Your **Story** is your calendar: Shop, Raids, Events and Special Quests show one week at a time.',
  ],
  'Differences in detail': [
    'Every rule that differs from the original game, topic by topic.',
    'No purchases, and presents **never expire** {not original}.',
  ],
  'Shop': [
    'The Shop shows one week of your Story period; every banner is in the **Banner Catalog**.',
    'Seasonal banners follow the **real calendar**, and you can keep one past banner.',
  ],
};

const ONELINER = {
  'Campaign Rewards': {
    'Overview': 'old rewards sent to your Present Box',
    'The campaigns': 'every campaign and its reward',
    'How they work': 'start with your Story, never end',
    'Not here yet': 'campaigns whose Medals are missing',
  },
  'Raid Bosses': {
    'Overview': 'weekly bosses, levels reset monthly',
    'Raid AP and Bonus Time': 'weekdays cost AP, weekends 0 AP',
    'Playing alone': 'solo fights, bosses keep their damage',
    'Event raids of 2016-2018': 'older raid events, open all day',
    'Graphics': 'rebuilt bosses and list banners',
    'Moves and stats': 'borrowed moves, rebuilt HP and ATK',
    'Raid Boards': 'original boards, dated titles',
    'Raid Catalog': 'list every raid, keep one past raid',
    'Raids not here yet': 'worldwide raids only for now',
  },
  'Event Quests: how they work': {
    'Overview': 'past events following your Story week',
    'Opening hours': 'open for the whole original day',
    'Event Catalog': 'list every event, keep one past event',
    'Rewards': 'once, original drop chances',
    'Event coins and boards': 'coins never expire',
    'Boosters': 'rebuilt effects, timed from pickup',
    'Event Catalog notes': 'what each catalog note means',
  },
  'Event Challenges & High Scores': {
    'Challenge events': 'battle, quiz and Surprise events',
    'High Score Challenges': 'rank brackets became score goals',
  },
  'Bonus Times & login bonuses': {
    'Bonus Times': 'original boosts, open all day',
    'Special login bonuses': 'once each, skipped days kept',
    'Lux Boost': '5% more Lux for 60 minutes, daily',
  },
  'Events of 2016-2018': {
    'Events of 2016-2018': 'old events on original or rebuilt maps',
    'Gem quests': 'weekly, monthly and daily Gem quests',
    'Org XIII events': 'the Organization XIII events, per Union',
  },
  'Event enemies': {
    'Enemy graphics': 'rebuilt and exact original graphics',
  },
  'Avatar boards': {
    'Avatar boards': 'weekly boards, bought ones kept',
    'Avatar Board Catalog': 'list past boards, keep one',
  },
  'SP Chip & Dale': {
    'SP Chip & Dale': '6★ enhancement Medal, rebuilt picture',
  },
  'Spirit Parts': {
    'Overview': 'the VIP quests give their Spirit parts',
    'Spirit Blind Box': 'deals in the Shop, one can be kept',
    'What is reconstructed': 'rebuilt pictures and titles',
  },
  'Draw Points': {
    'Overview': 'sell Medals, 100 points for a draw',
    'What is reconstructed': 'labels, icon, points never expire',
    'June 2021': 'last deals run to the end of service',
  },
  'Special Quests': {
    'Overview': 'opens after Story Quest 6',
    'What the tab shows': 'one week of your Story period',
    'Padlocks and weekdays': 'weekday quests on their own days',
    'VIP': 'earned by Weekly Missions, locked now',
    'Rewards': 'objective rewards given once',
    'Special Catalog': 'list every quest, keep one',
    'Maps': 'original rooms, rebuilt enemy spots',
    'Not available': 'the Adamantite and Mythril quests',
    'Other reconstructed parts': 'rebuilt drops and two banners',
  },
  'Story Quests 526-979': {
    'Overview': 'the Story goes on to Quest 979',
    'Quests': 'two rebuilt parts, one cutscene quest',
    'Enemy strength': 'tougher late enemies, rebuilt stats',
    'Enemy counters': 'counters that trigger enemy moves',
    'Enemy look': 'original looks, missing pieces rebuilt',
    'Allies and other characters': 'allies, map characters, translations',
    'Objectives and rewards': 'final 2021 rewards and objectives',
    'Worlds': 'original music, track choice rebuilt',
  },
  'Differences from the original game': {
    'Overview': 'offline, no other players, no purchases',
    '📅 Your Story is your calendar': 'one week of your period at a time',
    '🔄 Resets (UTC)': 'daily, weekly and monthly at 08:00',
    '📌 Catalogs: keep one of each': 'keep one past item in each Catalog',
    '⚔️ Raids': 'solo, free and doubled Lux on weekends',
    '🎉 Events': 'open all day, coins never expire',
    '💎 Shop and Jewels': 'no purchases, one free draw a day',
    '👑 VIP': 'from Weekly Missions, locked for now',
    '🎁 Nothing is lost': 'campaigns, coins and points last',
    '🧩 Reconstructed parts': 'lost parts rebuilt and marked',
  },
  'Differences in detail': {
    'Game and progress': 'offline server, max LV 999',
    'Medals': 'rebuilt effects, full artworks',
    'Raid Boards': 'rebuilt Medals and sparkles',
    'Shop and draws': 'rebuilt rates, presents for bonuses',
    'Seasonal and kept banners': 'real-calendar seasons, one kept banner',
    'Home banners': 'deals and quests of your Story week',
    'Purchases': 'nothing sold, presents never expire',
  },
  'Shop': {
    'Overview': 'the Banner Catalog, guarantees and odds',
    'Weekly rotation': 'one week of your Story period',
    'Seasonal banners': 'real-calendar windows',
    'Keep one banner in the Shop': 'one past banner stays every week',
    'Catalog filters': 'find banners by year, Medal or price',
  },
};

module.exports = { SUMMARY, ONELINER };
