// Game Catalog banner (user 26-11): ONE catalog banner, the first of the Events tab, in place of the Coliseum / Raid / Event
// Catalog banners of the Events tab and the Special / Avatar Board Catalog banners of the Special tab. It is an evStage row like
// those banners (make-raid.js evStageRow): eventType 0, it holds the Training Grounds quest of make-special.js (a tap opens it) and
// its Details opens the hub page /web/catalog (game-catalog-pages.js), which leads to the five catalogues. The Banner Catalog stays
// in the Shop.
//   node server/make-game-catalog.js [master_dir]
// Run by make-game-tables.js after the other catalogue generators (it needs the Training Grounds stage of make-special.js). The
// older catalogue banner rows (6000, 7000, 8000, the Event and Avatar Board Catalog rows) stay in the master, no longer listed
// while this row is there (server.js gameCatalogEvents); a master without this row lists them as before.
// Picture: server/game_data/catalog_img/<GAME_CATALOG_EV>.png (git-ignored), written by
// recon/tools/make_special_banners.py --section game (also run by build-resources.ps1); after a change bump GAME_CATALOG_IMG_VERSION,
// then the master revision.
'use strict';
const fs = require('fs');
const path = require('path');

const GAME_CATALOG_EV = 5000, GAME_CATALOG_STAGE = 970000, GAME_CATALOG_URL = '/web/catalog', GAME_CATALOG_IMG_VERSION = 2;
const bannerPath = (version = GAME_CATALOG_IMG_VERSION) => `/web/catalog/img/v${version}/${GAME_CATALOG_EV}.png`;

// the banner row, null without the Training Grounds stage in the master
function bannerRow(masterStage) {
  if (!(masterStage || []).some((r) => r.stageId === GAME_CATALOG_STAGE)) return null;
  const { evStageRow } = require('./make-raid');
  const row = evStageRow(GAME_CATALOG_EV, [GAME_CATALOG_STAGE], { eventType: 0, detailUrl: GAME_CATALOG_URL });
  row.eventCategory = 2;
  row.bannerUrl = bannerPath();
  return row;
}

const readMaster = (file) => {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
  try { return JSON.parse(text); } catch (e) { throw new Error(`game catalog: ${file} is corrupt: ${e.message}`); }
};

// evStage: our row replaced (none without the Training Grounds stage), the other rows kept. Returns the row or null.
function patch(masterDir) {
  if (process.env.KHUX_GAME_CATALOG === '0') { console.log('game catalog: off (KHUX_GAME_CATALOG=0)'); return null; }
  const ev = readMaster(path.join(masterDir, 'evStage.json')).filter((r) => r.eventStageId !== GAME_CATALOG_EV);
  const row = bannerRow(readMaster(path.join(masterDir, 'stage.json')));
  fs.writeFileSync(path.join(masterDir, 'evStage.json'), JSON.stringify(row ? [...ev, row] : ev));
  if (row) console.log(`game catalog: banner evStage ${GAME_CATALOG_EV} (Training Grounds ${GAME_CATALOG_STAGE}, Details ${GAME_CATALOG_URL})`);
  else console.warn(`game catalog: no Game Catalog banner: the Training Grounds stage ${GAME_CATALOG_STAGE} is not in the master (make-special first)`);
  return row;
}

if (require.main === module) patch(process.argv[2] || path.join(__dirname, 'master_data'));

module.exports = { GAME_CATALOG_EV, GAME_CATALOG_STAGE, GAME_CATALOG_URL, GAME_CATALOG_IMG_VERSION, bannerPath, bannerRow, patch };
