// Events tab order (user 10-11; Coliseum Catalog first, user 25-11): Coliseum Catalog, Raid Catalog, Event Catalog, kept raid,
// kept event, then the week's raids and events.
const assert = require('assert');
const { eventsTabOrder } = require('./events-tab-order');

const card = (id, kept = false, eventType = 2) => ({ eventStageId: id, eventType, bannerUrl: `/web/x/img/v1/${id}${kept ? '-kept' : ''}.png` });
const raids = [card(8000, false, 0), card(8101, true), card(8102), card(8103)];
const catalog = [card(20000, false, 0)];
const events = [card(20500, true, 3), card(20501, false, 3), card(20502, false, 3)];

const ids = eventsTabOrder(raids, catalog, events).map((c) => c.eventStageId);
assert.deepStrictEqual(ids, [8000, 20000, 8101, 20500, 8102, 8103, 20501, 20502], 'catalogs, kept raid, kept event, week raids, week events');

// no Raid Catalog banner, nothing kept: catalogs first anyway, order of the rest unchanged
const ids2 = eventsTabOrder([card(8102), card(8103)], catalog, [card(20501, false, 3)]).map((c) => c.eventStageId);
assert.deepStrictEqual(ids2, [20000, 8102, 8103, 20501], 'without Raid Catalog and kept cards');

// the Coliseum Catalog banner (evStage 6000, user 25-11): the first catalog banner, before the Raid Catalog
const colosseum = [card(6000, false, 0)];
const ids3 = eventsTabOrder(raids, catalog, events, colosseum).map((c) => c.eventStageId);
assert.deepStrictEqual(ids3, [6000, 8000, 20000, 8101, 20500, 8102, 8103, 20501, 20502], 'Coliseum Catalog first');
const ids4 = eventsTabOrder([card(8102)], [], [], colosseum).map((c) => c.eventStageId);
assert.deepStrictEqual(ids4, [6000, 8102], 'Coliseum Catalog first without the other catalogs');

// empty lists
assert.deepStrictEqual(eventsTabOrder([], [], []), [], 'empty');
assert.deepStrictEqual(eventsTabOrder([], [], [], []), [], 'empty with the Coliseum list');
console.log('test-events-tab-order OK');
