// Order of the Events tab (GET /stage/event, category 2). User 10-11-2026: the catalog banners first, then the kept raid and the
// kept event, then the week's raids and the week's events. User 25-11-2026: the Coliseum Catalog banner is the first catalog
// banner (Coliseum Catalog, Raid Catalog, Event Catalog). User 26-11-2026: with the Game Catalog banner (make-game-catalog.js) it
// is the ONLY catalog banner, first; the Coliseum, Raid and Event Catalog banners are no longer listed (reached from its hub page).
// A catalog banner is a card of eventType 0; a kept card is the «-kept» copy of a banner (routes-raid.js, routes-events.js).
const isCatalog = (c) => c.eventType === 0;
const isKept = (c) => /-kept\.png$/.test(String(c.bannerUrl || ''));

// colosseumCatalog: the Coliseum Catalog banner (routes-colosseum.js catalogEvents), [] when it is not listed; gameCatalog: the
// Game Catalog banner (server.js gameCatalogEvents), [] when the master has no row for it (then the older banners are listed)
function eventsTabOrder(raids = [], eventCatalog = [], events = [], colosseumCatalog = [], gameCatalog = []) {
  const raidCatalog = raids.filter(isCatalog), raidRest = raids.filter((c) => !isCatalog(c));
  const catalogs = gameCatalog.length ? gameCatalog : [...colosseumCatalog, ...raidCatalog, ...eventCatalog];
  return [...catalogs,
    ...raidRest.filter(isKept), ...events.filter(isKept),
    ...raidRest.filter((c) => !isKept(c)), ...events.filter((c) => !isKept(c))];
}

module.exports = { eventsTabOrder, isKept };
