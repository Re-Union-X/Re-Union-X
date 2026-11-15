// Home banner carousel: openBanners[] of GET /mypage (action 59). User 15-11-2026: «sì ai banner con la notice».
// One element per plate: { type, id, limitDate }. type 1 = evStage row (id = eventStageId, image = its bannerUrl, a tap opens
// Quests on that event: Special tab when the row's eventCategory is 1, else Events); type 2 = drawMedalType row (id =
// drawMedalTypeId, a tap opens Shop > Draw). Other types (Spirit Blind Box rows) are never sent. limitDate is the countdown
// end on the plate («6 days left»), 'YYYY-MM-DD HH:MM:SS' in fake time like every served date.
// The client shows 1-7 plates; 0 or more than 7 hide the area and leave two grey arrows on the home, so the list is capped at
// MAX and never empty (EVERGREEN fallback). A plate whose id has no row with an absolute bannerUrl in the served master is
// blank on the client: such ids are skipped.
// The original lists did not survive (no captured /mypage): selection and order are this server's (Notices, «not original»):
// the current Shop deals (at most SHOP_FIRST first, more only when events leave room), then the events and raids of the
// Events tab, then the open Special quests, in the order and with the end time of their tab.
'use strict';

const MAX = 7;
const SHOP_FIRST = 3;
// Evergreen plate when nothing else is live: the Raid Catalog banner (evStage 8000, eventCategory 2, master endTime 2030), else
// the Event Catalog banner (20000). They are always listed first in the Events tab (/stage/event category 2 has no unlock gate,
// unlike the Special tab before story mission 6), so the tap always finds them; their master rows have a bannerUrl.
const EVERGREEN = [8000, 20000];
const DATE_RE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

const absolute = (u) => /^https?:\/\/\S+$/.test(String(u || ''));

// shop: [{ drawMedalTypeId, limitDate }] in Shop order; events: cards of /stage/event category 2 (Events tab order);
// special: cards of /stage/event category 1; evStageRows / drawMedalTypeRows: served master rows (absolute bannerUrl);
// fallbackDate: limitDate of the evergreen plate when the Events tab does not list it; specialCatalogId: the Special tab's
// catalog card (Training Grounds), not a live quest (every Special card has eventType 0, so the catalog goes by id).
function homeBanners({ shop = [], events = [], special = [], evStageRows = [], drawMedalTypeRows = [], fallbackDate, specialCatalogId = 7000 }) {
  const evOk = new Set(evStageRows.filter((r) => absolute(r.bannerUrl)).map((r) => r.eventStageId));
  const drawOk = new Set(drawMedalTypeRows.filter((r) => absolute(r.bannerUrl)).map((r) => r.drawMedalTypeId));
  const seen = new Set();
  const take = (type, id, limitDate, ok) => {
    const key = `${type}:${id}`;
    if (!Number.isInteger(id) || !ok.has(id) || !DATE_RE.test(String(limitDate || '')) || seen.has(key)) return null;
    seen.add(key);
    return { type, id, limitDate };
  };
  const shopPlates = shop.map((s) => take(2, s.drawMedalTypeId, s.limitDate, drawOk)).filter(Boolean);
  // the Events tab's catalog cards (eventType 0) are not live events; locked Special quests (isLock 1) are not playable now
  const eventPlates = [...events.filter((c) => c.eventType !== 0), ...special.filter((c) => c.isLock !== 1 && c.eventStageId !== specialCatalogId)]
    .map((c) => take(1, c.eventStageId, c.endTime, evOk)).filter(Boolean);
  const nShop = Math.max(SHOP_FIRST, MAX - eventPlates.length);
  const out = [...shopPlates.slice(0, nShop), ...eventPlates].slice(0, MAX);
  if (out.length) return out;
  for (const id of EVERGREEN) {
    const card = events.find((c) => c.eventStageId === id);
    const date = DATE_RE.test(String(card?.endTime || '')) ? card.endTime : fallbackDate;
    if (evOk.has(id) && DATE_RE.test(String(date || ''))) return [{ type: 1, id, limitDate: date }];
  }
  return [];
}

module.exports = { homeBanners, MAX, SHOP_FIRST, EVERGREEN, DATE_RE };
