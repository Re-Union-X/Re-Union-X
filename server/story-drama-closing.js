// Opening/closing rule for the story rows 1-525 (I-333, 27-11-2026). The theater lists a quest's opening and closing
// cutscenes together, so make-game-tables.js may use it as the fallback for a missing opening only with cutscenes that
// the original row plays AFTER the clear. The original split is the private overlay drama_per_quest.json (the same one
// make-story-oltre.js uses for 526-979); it also covers 1-525 (Quest 34: opening 1011531 is a dialogue missing from the
// resources, 2101101 "A New Accessory" is a closing cutscene).
'use strict';
const fs = require('fs');

const OVERLAY = process.env.KHUX_DRAMA_OLTRE
  || 'D:/Progetto_Restauro_KH_UX/reference/world_schema/oltre525/drama_per_quest.json';

// stageId -> Set of closing drama ids (overlay "after"); empty map when the overlay is not there (public checkout)
function closingByStage(file = OVERLAY) {
  const out = new Map();
  let ov = null;
  try { ov = typeof file === 'string' ? JSON.parse(fs.readFileSync(file, 'utf8')) : file; } catch { return out; }
  for (const q of Object.values((ov && ov.quests) || {})) {
    if (!q || !q.stageId) continue;
    const set = out.get(q.stageId) || new Set();
    for (const [id] of q.after || []) if (id) set.add(id);
    out.set(q.stageId, set);
  }
  return out;
}

// Theater rows usable as the opening of stage row s: all cutscenes served, none closing (the row's own after list or the
// overlay). Returns { rows, closing } where closing = overlay closing ids the theater holds for the stage (to be served once, after).
function theaterOpenings(s, theaterRows, dramas, rowClosing, overlayClosing) {
  const ov = overlayClosing || new Set();
  const rows = theaterRows.filter((t) => t.dramaId.every((d) => dramas.has(d) && !rowClosing.has(d) && !ov.has(d)));
  const closing = [];
  for (const t of theaterRows) t.dramaId.forEach((d, i) => {
    if (ov.has(d) && dramas.has(d) && !rowClosing.has(d)) closing.push([d, (t.dramaType || [])[i] || 0]);
  });
  return { rows, closing };
}

// append the overlay closing cutscenes the row lost to its after list, once (never twice, max 5 per side)
function addClosing(s, closing) {
  for (const [id, t] of closing) {
    const have = (s.afterDramaId || []).slice(0, s.validAfterDrama);
    if (have.includes(id) || have.length >= 5) continue;
    s.afterDramaId = [...have, id];
    s.afterDramaType = [...(s.afterDramaType || []).slice(0, have.length), t];
    s.validAfterDrama = have.length + 1;
  }
}

module.exports = { closingByStage, theaterOpenings, addClosing };
