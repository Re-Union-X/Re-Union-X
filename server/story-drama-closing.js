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

// I-014: dramas served by the generated pack (build-resources.ps1 -> stage_gen\files): SEQ dialogue scripts
// img/light/SEQ/<id>.l and lwf cutscenes lwf/drama/<id>/<id>.lwf (recon/tools/import_story_dramas.py imports the 1-525 ones
// from the 2016 package; make_quiz_dramas.py the event quiz boards). Missing folder -> empty set.
const path = require('path');
function packDramas(dir) {
  const out = new Set();
  const list = (p) => { try { return fs.readdirSync(p); } catch { return []; } };
  for (const f of list(path.join(dir, 'img', 'light', 'SEQ'))) {
    const m = /^(\d+)\.l$/.exec(f);
    if (m) out.add(Number(m[1]));
  }
  for (const d of list(path.join(dir, 'lwf', 'drama'))) {
    if (/^\d+$/.test(d) && fs.existsSync(path.join(dir, 'lwf', 'drama', d, `${d}.lwf`))) out.add(Number(d));
  }
  return out;
}

// I-333 on the openings the row keeps: one the overlay lists as the quest's closing scene leaves the before list and is
// served once, after the clear (addClosing). No overlay for the stage -> unchanged.
function moveClosingAfter(s, overlayClosing) {
  if (!overlayClosing || !overlayClosing.size || !s.validBeforeDrama) return;
  const ids = (s.beforeDramaId || []).slice(0, s.validBeforeDrama);
  const types = (s.beforeDramaType || []).slice(0, s.validBeforeDrama);
  const moved = [];
  const keep = [];
  ids.forEach((id, i) => (overlayClosing.has(id) ? moved : keep).push([id, types[i] || 0]));
  if (!moved.length) return;
  s.beforeDramaId = keep.map((k) => k[0]);
  s.beforeDramaType = keep.map((k) => k[1]);
  s.validBeforeDrama = keep.length;
  addClosing(s, moved);
}

// the 2021 story fields carry a closing list (Quests 34, 200, 350): merged with ours, never dropping an id our row serves
// (e.g. the dialogues restored by I-014). Both orders are kept: before one of our ids that the 2021 list holds, the 2021
// ids preceding it come first; the 2021 ids left over go last. Max 5.
function mergeAfter(s, r) {
  const ours = (s.afterDramaId || []).slice(0, s.validAfterDrama).map((id, i) => [id, (s.afterDramaType || [])[i] || 0]);
  const theirs = (r.afterDramaId || []).slice(0, r.validAfterDrama).map((id, i) => [id, (r.afterDramaType || [])[i] || 0])
    .filter(([id]) => id);
  const out = [];
  const add = (d) => { if (!out.some((o) => o[0] === d[0])) out.push(d); };
  let j = 0;
  for (const d of ours) {
    const k = theirs.findIndex((t) => t[0] === d[0]);
    if (k >= 0) { for (; j < k; j++) add(theirs[j]); j = Math.max(j, k + 1); }
    add(d);
  }
  for (; j < theirs.length; j++) add(theirs[j]);
  const keep = out.filter(([id]) => id).slice(0, 5);
  s.afterDramaId = keep.map((d) => d[0]);
  s.afterDramaType = keep.map((d) => d[1]);
  s.validAfterDrama = keep.length;
}

module.exports = { closingByStage, theaterOpenings, addClosing, packDramas, moveClosingAfter, mergeAfter };
