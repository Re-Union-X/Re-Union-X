'use strict';
// I-317 (user 25-11): the quest-list thumbnail of a Special / event / raid quest = the icon of the room its map is played in, or
// the closest one. The client loads img/adventure/stage/stage_select_ico_<worldId>_<thumbId>.png with the stage row's own worldId,
// so a room of another world (Castle of Dreams raids moved to world 1, a Dwarf Woodlands room in a world-4 event) or a room whose
// icon only exists for another variant needs care. picker(thumbs)(roomCode, worldId) -> thumbId or null (nothing better: the
// caller keeps its row's thumbId). Order, per candidate room (the exact room XX_AAAA_BB_CC first, then its _BB_00 sub-variant, the
// _00_00 variant and the other served variants of room AAAA, lowest first):
//   1. the room is of the row's world and stage_select_ico_<worldId>_<thumb> is served -> thumb (I-313 / I-316 rule);
//   2. the room is of another world W and stage_select_ico_<W>_<thumb> is served -> a copy of that icon under the row's world,
//      thumbId W * COPY_BASE + thumb (no clash with the row world's own icons: room numbers stay under 1,000 -> thumbs < 10^7).
//      The copies are collected in pick.copies (destination name -> source name) and written by the builders as an
//      import_originals.py list (copyLines), imported by tools/ldplayer/session/build-resources.ps1.
// A room prefix this module does not know is taken as of the row's world (as before). Served icons: the resource index
// (names_v4.tsv), the JP 4.3.1 img/adventure/stage and the 2016 English bundle (recon/tools/originals.tsv section 1 imports both).
const fs = require('fs');
const path = require('path');

const COPY_BASE = 10000000;
// room prefix -> world of its icons (make-story-oltre.js ROOM_WORLD; DG = the Corridor of Darkness rooms of the world-1 story rows
// 492-500, KG = the world-13 room of the JP Keyblade War rows, event_config.json)
function roomWorlds() {
  return { ...require('./make-story-oltre').ROOM_WORLD, DG: 1, KG: 13 };
}

// served icons: Set of '<worldId>_<thumbId>' (null when no source is found: callers change nothing)
function readServed(namesPath, jpRoot, b16Root) {
  const so = require('./make-story-oltre');
  const set = so.readThumbs(namesPath, jpRoot);
  const dir = b16Root && path.join(b16Root, 'img', 'adventure', 'stage');
  if (!dir || !fs.existsSync(dir)) return set;
  const out = set || new Set();
  for (const f of fs.readdirSync(dir)) {
    const m = /^stage_select_ico_(\d+)_(\d+)\.png$/.exec(f);
    if (m) out.add(`${m[1]}_${m[2]}`);
  }
  return out;
}

// the default sources (outside the repo): KHUX_RESOURCE_NAMES, KHUX_JP_ROOT / jp_data, KHUX_B16_ROOT / <ref_work>/bundle2016/files
function defaultServed() {
  const lp = require('./local-paths');
  return readServed(process.env.KHUX_RESOURCE_NAMES || 'D:\\Progetto_Restauro_KH_UX\\resource_data\\names_v4.tsv',
    process.env.KHUX_JP_ROOT || lp.localPath('jp_data'), process.env.KHUX_B16_ROOT || lp.localPath('ref_work', 'bundle2016', 'files'));
}

function picker(thumbs) {
  const { thumbForRoom } = require('./make-story-oltre');
  const worlds = roomWorlds();
  const copies = new Map();
  const pick = (room, worldId) => {
    const t = thumbForRoom(room);
    if (t === null || !thumbs || !Number.isInteger(worldId)) return null;
    const w = worlds[String(room).slice(0, 2)] || worldId;
    const num = Math.floor(t / 10000);
    const cands = [t, t - (t % 100), num * 10000];
    const others = [];
    for (const k of thumbs) {
      const [kw, kt] = k.split('_').map(Number);
      if (kw === w && Math.floor(kt / 10000) === num && kt < num * 10000 + 10000) others.push(kt);
    }
    for (const c of [...cands, ...others.sort((a, b) => a - b)]) {
      if (!thumbs.has(`${w}_${c}`)) continue;
      if (w === worldId) return c;
      const id = w * COPY_BASE + c;
      copies.set(`${worldId}_${id}`, `${w}_${c}`);
      return id;
    }
    return null;
  };
  pick.copies = copies;
  return pick;
}

// import_originals.py list (columns as recon/tools/originals.tsv): the 2016 English icon first (as originals.tsv, where b16 wins),
// else the JP one
function copyLines(copies, what) {
  const lines = [`# Quest-list icons of ${what} rooms of another world (I-317), written by server/quest-thumbs.js copyLines.`,
    '# stage_select_ico_<row world>_<W * 10000000 + thumb> = a copy of stage_select_ico_<W>_<thumb>; columns as recon/tools/originals.tsv.'];
  for (const [dest, src] of [...(copies || new Map())].sort()) {
    lines.push(`img/adventure/stage/stage_select_ico_${dest}.png\tb16,jp\timg/adventure/stage/stage_select_ico_${src}.png`);
  }
  return lines.join('\n') + '\n';
}

module.exports = { COPY_BASE, roomWorlds, readServed, defaultServed, picker, copyLines };
