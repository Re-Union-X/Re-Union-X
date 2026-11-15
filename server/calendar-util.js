// Helpers shared by the raid and event calendars (raid-calendar.js, event-calendar.js): Pacific weekdays, day spans of census
// rows against the Shop week of storyCtx() (shopFrom / shopTo of server.js) and the catalogue state of a row (Raid Catalog,
// Event Catalog). Pure.
'use strict';

const PT = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short' });
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// weekday (0 Sunday) of a real moment in Pacific time, and of an ISO date
const ptWeekday = (ms) => WEEKDAYS.indexOf(PT.format(new Date(ms)));
const weekdayOf = (iso) => new Date(Date.parse(`${iso}T12:00:00Z`)).getUTCDay();

// days from a to b, both counted; days of [r.start, r.end] inside [from, to]
const days = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;
const overlap = (r, from, to) => days(r.start > from ? r.start : from, r.end < to ? r.end : to);
// last day of the Shop week (shopTo, or shopFrom when it is missing or before it)
const weekTo = ({ shopFrom, shopTo } = {}) => (shopTo && shopTo >= shopFrom ? shopTo : shopFrom);

// The original date of the Shop week that falls on the real weekday of nowMs (Pacific): a Shop week holds each weekday once, so
// a row of one original day opens on that real weekday (a daily raid showdown, a short-window event). null without nowMs or week.
function weekDateAt({ shopFrom, shopTo } = {}, nowMs) {
  if (!shopFrom || !Number.isFinite(nowMs)) return null;
  const to = weekTo({ shopFrom, shopTo }), wd = ptWeekday(nowMs);
  for (let d = Date.parse(`${shopFrom}T12:00:00Z`), n = 0; n < 7; d += 86400000, n++) {
    const iso = new Date(d).toISOString().slice(0, 10);
    if (iso > to) break;
    if (weekdayOf(iso) === wd) return iso;
  }
  return null;
}

// State of a catalogue row for the player: ctx {shopFrom, shopTo, current (census ids of the week: Set or array), kept}.
// removed: no available tier («Not built yet» in the Event Catalog, whatever the date); now: listed this Shop week; kept: the kept one;
// can: a week before the Shop week, which can be kept; other: dates inside the Shop week but not listed now (a row that lost
// the week to another, the Weekend-only and Daily rows of Task 10 off their day): reached by the Story, so never «later»;
// later: starts after the Shop week (also every row before the Story has a Shop week). A kept row counts as kept only while
// it is a past week (a save kept from a later Story stays inert).
function rowState(row, { shopFrom, shopTo, current, kept } = {}) {
  if (!row.available) return 'removed';
  const cur = current instanceof Set ? current : new Set(current || []);
  if (cur.has(row.censusId)) return 'now';
  if (shopFrom && row.end < shopFrom) return kept && kept === row.censusId ? 'kept' : 'can';
  return shopFrom && row.start <= weekTo({ shopFrom, shopTo }) ? 'other' : 'later';
}

// An informative notice of the records, not a playable event (user 08-11): no quest of its own, no original card (noQuests 'board',
// the signal that also leaves its card out in make_event_banners.py card_ids) and no evStage row with a card; Part 4 Task 4:
// noQuests 'notice' too; Part 5 Task 3: a second notice of an event (scheduleLineOf). Not in the Event Catalog (event-pages.js
// entriesOf); make-events.js avatarCatalog turns such an entry into the BOARD entry of its census id (Part 7 Task 5). One rule for both.
const informative = (e) => (['board', 'notice'].includes(e.noQuests) || !!e.scheduleLineOf) && !(e.quests || []).length && !(e.rows || []).some((r) => r.available);

module.exports = { ptWeekday, weekdayOf, days, overlap, weekTo, weekDateAt, rowState, informative };
