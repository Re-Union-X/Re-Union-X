// Event quest routes (Events Part 1, plan docs/superpowers/plans/2026-11-06-events-part1-framework.md Task 4): the event cards
// of the Events tab (/stage/event category 2, after the raids: server.js lists [...raid().events(), ...events, ...]) and the
// rewards of an event quest clear. The factory takes everything from server.js; state lives in player.events only:
//   player.events = {kept: censusId | null, cleared: {stageId: [missionIds]}, bonus?: {censusId: {paidAt, noticeId}}}
// Absent in older saves: the tab lists the served events with nothing cleared, and listing never writes the save.
// Rewards (spec, «Rewards»): the objective rewards and the first-clear items of the stage row (submission*, validClearGetItem,
// make-events.js) once per quest, paid here (server.js skips its own payment for event stages); drops on every clear by the
// usual /stage/clear path (the POI of the quest's map key, server.js poiStageId). Reward type 15 (Event Coins, Part 3 Task 5) is
// paid into the balance of the entry's board set (entry.boardSet, addEventCoins = routes-event-boards.js addCoins), never as Raid
// Coins; an entry without a set pays none (the objective counts as done, the coins are only logged).
// Boosters (Events Part 4 Task 4): an objective (or first-clear item) whose reward was a Booster pays nothing here (make-events.js
// writes type 0 in the stage row and names the Booster in the index quest, boosters [{objective, emblemName}], objective 0 = first
// clear); its clear records the Booster once in player.pendingBoosters [{emblemName, stageId, objective}] (absent in older saves =
// empty), for Part 6 to grant; a first-clear Booster carries its position (slot), so two stay two.
// Rewards the server cannot give now (fix round 1, I1: canPay(type, id) false, e.g. a Spirit part, type 33, with the pet off) are
// not lost: kept once per stage / objective (0: first clear) / position in player.pendingRewards [{stageId, objective, slot, type,
// id, num}], and paid once by payPending() when they can be given (server.js: at login).
// Community-goal bonus (user rule 10-11-2026): an entry with communityBonus {ready, stageIds, rewards} (make-events.js, from the
// official result notice) pays its rewards once into the Presents (addPresent) when every objective 1..min(3, validSubmission) of
// its stageIds is cleared, whether the event is in the Story week or kept from the Event Catalog; player.events.bonus
// {censusId: {paidAt, noticeId}} keeps it once per event. payBonuses() (server.js: at login) pays an old save already complete.
// A fixed completion reward (communityBonus.kind 'completion', user 10-11-2026: every player who completed all the challenges got
// it, notice 61226) is paid the same way, with its own Present text. Part 5 Task 3: per Union (communityBonus.byUnion, readyUnions:
// only the player's own Union version counts) and a quest of another Union (index quest `union`) is not listed for the player.
//   events (list), catalogEvents (the Event Catalog banner), onStageClear (rewards), isEventStage, keep / unkeep / catalogCtx /
//   pruneKept (Event Catalog, Task 5), payBonuses.
// Avatar Board Catalog (Events Part 7 Task 5b, user 15-11: boards are not playable events): its own keep, one entry with avatar
// boards at a time, independent of the kept event: player.avatarBoards = {kept: censusId | entry key | null} (absent in older
// saves). boardCatalogCtx / keepBoard / unkeepBoard / boardKept / pruneBoardKept; migrateKept moves a BOARD entry an older save
// kept through the shared Task 5 keep (player.events.kept) to the board keep (server.js: at login).
'use strict';
const timeWindows = require('./event-time-windows');
const fs = require('fs');
const path = require('path');
const calendar = require('./event-calendar');
const { rowState, ptWeekday, weekdayOf } = require('./calendar-util');
const special = require('./special');
const { windowInWeek } = require('./avatar-boards');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'event_config.json'), 'utf8'));
// Version segment of the event card URL (/web/event/img/v<N>/<evStageId>.png): the client caches banner images by URL. The same
// value make-events.js writes in the evStage rows (event_config.json imgVersion): bump it there when the cards change.
const EVENT_IMG_VERSION = CONFIG.imgVersion;
const EVENT_TYPE = CONFIG.eventType; // eventType of an index entry without one (make-events.js writes the donor value per entry)
const STAGE_FIRST = CONFIG.stageBase, STAGE_LAST = CONFIG.stageMax; // stage ids of the event quests
const COIN_TYPE = 15; // Event Coins: into the entry's board set (addEventCoins)

const BOOSTER_TYPE = 34; // a Booster reward (master emblem; Events Part 6, boosters.js)
function routesEvents({ player, savePlayer, masterRows, eventIndex, storyWeek, realNow, serverTimeAt, clock, stageState, grantItem, grantObjective, addEventCoins = null, canPay = null, addPresent = null, grantBooster = null, avatarBoardState = null, markBoardsSent = null, hscBest = null, webBase, log = console.log }) {
  // read-only view of player.events (an older save has none: nothing kept, nothing cleared); state() creates it to write
  const view = () => player.events || { kept: null, cleared: {} };
  const state = () => {
    player.events ||= {};
    if (player.events.kept === undefined) player.events.kept = null;
    player.events.cleared ||= {};
    return player.events;
  };
  const entries = () => (eventIndex() || {}).entries || [];
  const isEventStage = (stageId) => { const id = Number(stageId); return id >= STAGE_FIRST && id <= STAGE_LAST; };
  const stageRow = (id) => masterRows('stage').find((r) => r.stageId === id);
  // the index entry of an event quest, and the board set its Event Coins go to: entry.boardSet when the set is handed out, else
  // entry.boardSetKey (a set whose boards are held until Part 6: coins still paid into its balance, coordinator 08-11); null without one
  // (a quest shared by a rerun, make-events.js sharedWith: the entry that built its stage row)
  const entryOfStage = (stageId) => {
    const id = Number(stageId);
    return entries().find((e) => (e.quests || []).some((q) => q.stageId === id && !q.sharedWith))
      || entries().find((e) => (e.quests || []).some((q) => q.stageId === id) || (e.stageIds || []).includes(id)) || null;
  };
  const boardSetOf = (stageId) => { const e = entryOfStage(stageId) || {}; return e.boardSet || e.boardSetKey || null; };
  // the Boosters of an event quest (index quest boosters) and the ones recorded for Part 6; reading never writes the save
  const boostersOf = (stageId) => { const id = Number(stageId), e = entryOfStage(id); return ((e && (e.quests || []).find((q) => q.stageId === id)) || {}).boosters || []; };
  const pendingBoosters = () => (Array.isArray(player.pendingBoosters) ? player.pendingBoosters : []);
  const slotOf = (x) => x.slot || 0;
  function recordBooster(stageId, b) {
    const list = Array.isArray(player.pendingBoosters) ? player.pendingBoosters : (player.pendingBoosters = []);
    if (list.some((x) => x.stageId === stageId && x.objective === b.objective && slotOf(x) === slotOf(b))) return;
    list.push({ emblemName: b.emblemName, stageId, objective: b.objective, ...(b.objective === 0 ? { slot: slotOf(b) } : {}) });
    log(`[event] ${stageId}: ${b.objective ? `objective ${b.objective}` : 'first-clear item'} is a Booster (${b.emblemName}): recorded for the Boosters (Part 6)`);
  }
  // a reward that cannot be given now: kept once (stage, objective, position), paid by payPending
  const payable = (type, id) => !canPay || canPay(type, id);
  function recordPending(stageId, objective, slot, type, id, num) {
    const list = Array.isArray(player.pendingRewards) ? player.pendingRewards : (player.pendingRewards = []);
    if (list.some((x) => x.stageId === stageId && x.objective === objective && x.slot === slot)) return;
    list.push({ stageId, objective, slot, type, id, num });
    log(`[event] ${stageId}: ${objective ? `objective ${objective}` : 'first-clear item'} (type ${type} id ${id}) cannot be given now: kept for later`);
  }
  // pays every kept reward that can be given now, once; -> how many (the caller saves when > 0)
  function payPending() {
    const list = Array.isArray(player.pendingRewards) ? player.pendingRewards : [];
    const ready = list.filter((x) => payable(x.type, x.id));
    if (!ready.length) return 0;
    player.pendingRewards = list.filter((x) => !ready.includes(x));
    for (const x of ready) { grantItem(x.type, x.id, x.num); log(`[event] ${x.stageId}: kept reward type ${x.type} id ${x.id} paid`); }
    return ready.length;
  }

  // the community-goal bonus of an entry (communityBonus ready): paid once into the Presents when every objective of its counted
  // quests is cleared; -> true when paid now. Without addPresent (an older wiring) nothing is paid nor recorded.
  // A counted quest is done when its objectives 1..min(3, validSubmission) are cleared, or, with no objective, when it was cleared
  // (playStatus of stageState; I-253 item 2: a counted quest without objectives could never pay before). Per Union (Part 5 Task 3,
  // The Keyblade War completion reward, user 10-11-2026): communityBonus.byUnion {unionId: [stage ids]} adds the quests of the
  // player's own Union only (player.unionId), and the reward is due only when that Union's quests are all served (readyUnions).
  const ownUnion = () => Number(player.unionId) || 0;
  const unionIds = (cb) => (cb.byUnion ? (cb.byUnion[ownUnion()] || []) : []);
  // now: the stage cleared by this call (onStageClear runs before server.js writes its stageScores, so its playStatus is not
  // there yet: fix round 1 of the Task 3 review), counted as cleared
  const bonusDone = (cb, now = null) => {
    const cleared = view().cleared || {};
    const ids = [...(cb.stageIds || []), ...unionIds(cb)];
    if (cb.byUnion && !unionIds(cb).length) return false;
    return ids.length > 0 && ids.every((id) => special.stageDone({ clearMissionIds: cleared[id] || [], playStatus: id === now ? 1 : (stageState(id) || {}).playStatus || 0 },
      (stageRow(id) || {}).validSubmission || 0));
  };
  const bonusReady = (cb) => (cb.byUnion ? (cb.readyUnions || []).includes(ownUnion()) : !!cb.ready);
  function payBonus(e, now = null) {
    const cb = e && e.communityBonus;
    if (!addPresent || !cb || !bonusReady(cb) || !(cb.rewards || []).length) return false;
    if (((player.events || {}).bonus || {})[e.censusId] || !bonusDone(cb, now)) return false;
    const ev = state();
    ev.bonus ||= {};
    ev.bonus[e.censusId] = { paidAt: realNow(), noticeId: cb.noticeId || null };
    const what = cb.kind === 'completion' ? 'Completion reward' : 'Community goal bonus';
    for (const r of cb.rewards) addPresent(r.type, r.id, r.num, `${what}: ${cb.name || e.name || e.censusId}`);
    log(`[event] ${e.censusId}: ${what.toLowerCase()} paid (${cb.rewards.map((r) => `${r.name || `type ${r.type} id ${r.id}`} x${r.num}`).join(', ')})`);
    return true;
  }
  // every entry whose bonus is due (an old save complete before the bonus existed); -> how many paid (the caller saves when > 0)
  const payBonuses = () => entries().filter((e) => payBonus(e)).length;

  // From respondStageClear, after its objective rules (Lux objectives, all-together flag): cleared = the objective ids of this
  // clear. Pays the first-clear items (first clear of this quest) and the objectives never paid before; the caller saves.
  // false for any other stage.
  function onStageClear(stageId, cleared = []) {
    if (!isEventStage(stageId)) return false;
    const id = Number(stageId), row = stageRow(id), ev = state();
    const before = ev.cleared[id];
    // Event Coins (type 15) go into the balance of the entry's board set (routes-event-boards.js); an entry without a set
    // pays none (logged), never Raid Coins
    const setKey = boardSetOf(id);
    const pay = (type, what, fn, num) => {
      if (type !== COIN_TYPE) { fn(); return; }
      if (setKey && addEventCoins && addEventCoins(setKey, num)) return;
      log(`[event] ${id}: ${what} in Event Coins x${num} not paid (no board set)`);
    };
    if (!row) log(`[event] ${id}: no stage row, no reward`);
    const boosters = boostersOf(id);
    if (row && before === undefined) {
      for (const b of boosters.filter((x) => x.objective === 0)) recordBooster(id, b);
      for (let i = 0; i < (row.validClearGetItem || 0); i++) {
        const type = row.clearGetItemType[i];
        // a built Booster (type 34, Part 6): boosters.js grants it once for this item (same key as a Booster recorded before)
        if (type === BOOSTER_TYPE && grantBooster) { grantBooster(row.clearGetItemId[i], { stageId: id, objective: 0, slot: i }); continue; }
        if (!payable(type, row.clearGetItemId[i])) { recordPending(id, 0, i, type, row.clearGetItemId[i], row.clearGetItemNum[i]); continue; }
        pay(type, 'first-clear item', () => grantItem(type, row.clearGetItemId[i], row.clearGetItemNum[i]), row.clearGetItemNum[i]);
      }
    }
    // no stage row (a master not rebuilt yet): nothing paid and nothing recorded, so the first-clear items and the objectives
    // are paid at the first clear with the row (review of Task 4)
    if (!row) return true;
    const done = before || [];
    const fresh = [...new Set(cleared)].filter((n) => n >= 1 && n <= 3 && !done.includes(n)).sort((a, b) => a - b);
    for (const n of fresh) {
      const b = boosters.find((x) => x.objective === n);
      if (b) { recordBooster(id, b); continue; }
      const t = row.submissionRewardType?.[n - 1];
      if (t === BOOSTER_TYPE && grantBooster) { grantBooster(row.submissionItemId[n - 1], { stageId: id, objective: n }); continue; }
      if (!payable(t, row.submissionItemId?.[n - 1])) { recordPending(id, n, 0, t, row.submissionItemId[n - 1], row.submissionItemNum?.[n - 1]); continue; }
      pay(row.submissionRewardType?.[n - 1], `objective ${n}`, () => grantObjective(row, n), row.submissionItemNum?.[n - 1]);
    }
    ev.cleared[id] = [...new Set([...done, ...fresh])].sort((a, b) => a - b);
    // the community-goal bonus of every entry that counts this quest
    for (const e of entries()) {
      const cb = e.communityBonus || {};
      if ((cb.stageIds || []).includes(id) || unionIds(cb).includes(id)) payBonus(e, id);
    }
    return true;
  }

  // The events of the player's Shop week (event-calendar.js): storyWeek() is {shopFrom, shopTo} of storyCtx() in server.js
  const currentEntries = (realMs = realNow()) => calendar.currentEntries(eventIndex(), storyWeek(), realMs);
  // Event Catalog (Task 5): player.events.kept = the census id of the kept event (one at a time, as the Raid Catalog), served only
  // while it is a past event of the Story (rowState 'kept'), with all its served quests: a short-window one on the real weekday of
  // its days, as the raids kept from the catalogue open on their real days
  const entryOf = (censusId) => entries().find((e) => e.censusId === censusId);
  // kept: null when the index no longer has that census id (a record dropped): inert here, cleared by pruneKept; a BOARD entry an
  // older save kept here (Task 5 shared keep) is the board keep (boardKept), never the kept event
  // Avatar boards (Part 7 Task 5, Task 5b): an entry with boards (avatar-boards.js catalogIndex: entry.boards) is «now» in the Avatar
  // Board Catalog while one of its served boards has a window in the story week (on sale or handed out there), and is kept there
  // once past (one at a time, its own keep): the kept value is its census id, or its entry key when khuxwiki alone dates it (the id
  // make-events.js gives it). The listing's own decision (avatarBoardState(sphereBoardId) = avatar-boards.js listState for this
  // player, wired in server.js; without it, the window test alone): a board of this entry's window in the story week is 'week' when
  // it is listed, 'chain' when the board before it is not complete («Unlocks after the previous board»), so «On sale this week»
  // matches GET /user/sphere
  const hasBoards = (e) => !!e && ((e.boards || []).length > 0 || (e.avatarBoards || []).length > 0);
  const boardOnly = (e) => hasBoards(e) && !(e.quests || []).length;
  const boardStates = (e, week) => (e && e.available ? (e.boards || []) : []).filter((b) => b.served && windowInWeek(b.window, week))
    .map((b) => (avatarBoardState ? avatarBoardState(b.sphereBoardId) : 'week'));
  const boardKeepable = (e) => !!(e && e.available && (e.boards || []).some((b) => b.served));
  // the event keep, without a BOARD entry an older save holds there
  const eventKept = () => { const k = view().kept || null, e = k && entryOf(k); return e && !boardOnly(e) ? k : null; };
  function catalogCtx(realMs = realNow()) {
    const { shopFrom, shopTo } = storyWeek(), kept = eventKept();
    const current = new Set(currentEntries(realMs).map((e) => e.censusId));
    return { shopFrom, shopTo, current, kept };
  }
  // the board keep (read only): player.avatarBoards.kept, else a BOARD entry an older save kept through the shared keep (moved by
  // migrateKept); null when neither
  // an older save (no player.avatarBoards yet) that kept an event with served boards: Task 5 listed its boards with the event
  const servedBoards = (e) => !!e && (e.boards || []).some((b) => b.served);
  function boardKept() {
    const ab = player.avatarBoards;
    if (ab && ab.kept) return ab.kept;
    const old = view().kept, e = old && entryOf(old);
    if (e && boardOnly(e)) return old;
    return !ab && e && servedBoards(e) ? old : null;
  }
  // Once per save (player.avatarBoards is created by the first run, so it never runs twice): an older save's BOARD entry in
  // player.events.kept is moved to the board keep (kept there unless the board keep already holds one) and the event keep
  // cleared; a kept EVENT with served boards (EV-0741 kind, fix round 1) stays kept and its key is copied to the board keep, so
  // the save keeps both. Saved when a keep is moved or copied; -> true then
  function migrateKept() {
    const old = (player.events || {}).kept, e = old && entryOf(old);
    if (e && boardOnly(e)) {
      const ab = player.avatarBoards ||= {};
      if (!ab.kept) ab.kept = old;
      player.events.kept = null;
      savePlayer();
      log(`[event] kept ${old} is an avatar board entry: moved to the Avatar Board Catalog keep`);
      return true;
    }
    if (player.avatarBoards) return false;
    const copy = servedBoards(e) ? old : null;
    // the marker alone is saved with the next write (the login save, or the keep that follows): a run that copies nothing is redone
    // identically until then
    player.avatarBoards = { kept: copy };
    if (!copy) return false;
    savePlayer();
    log(`[event] kept event ${old} sells avatar boards: its boards are kept in the Avatar Board Catalog too`);
    return true;
  }
  function boardCatalogCtx(realMs = realNow()) {
    const { shopFrom, shopTo } = storyWeek(), kept = boardKept();
    const current = new Set(), boardLocked = new Set();
    for (const e of entries()) {
      if (!e.boards) continue;
      const states = boardStates(e, { shopFrom, shopTo });
      if (states.includes('week')) current.add(e.censusId);
      else if (states.includes('chain')) boardLocked.add(e.censusId);
    }
    return { shopFrom, shopTo, current, boardLocked, kept: kept && entryOf(kept) ? kept : null };
  }
  // POST /web/avatar/keep/<evStageId>: only a past entry with a served board (why: now, other, later, removed); keeping one replaces
  // the kept board entry, never the kept event. The boards it lists wait for the check of the Avatar Boards list (markBoardsSent,
  // server.js: avatar-boards.js markKept): the home check never announces them (the Task 6 bench saw 21 popups in a row there); the
  // list check delivers them when the player re-enters Avatar Boards, one «Unlocked an Avatar Board!» each (Task 6b bench)
  function keepBoard(evStageId) {
    const id = Number(evStageId), e = entryById(id);
    if (!e || !hasBoards(e)) return { code: 404, body: { ok: false, why: 'unknown entry' } };
    const st = boardKeepable(e) ? rowState(e, { ...boardCatalogCtx(), kept: null }) : 'removed';
    if (st !== 'can') return { code: 409, body: { ok: false, why: st } };
    migrateKept();
    (player.avatarBoards ||= {}).kept = e.censusId;
    if (markBoardsSent) markBoardsSent(e.censusId);
    savePlayer();
    log(`[event] Avatar Board Catalog: ${e.censusId} kept`);
    return { code: 200, body: { ok: true } };
  }
  function unkeepBoard() {
    migrateKept();
    (player.avatarBoards ||= {}).kept = null;
    if (markBoardsSent) markBoardsSent(null); // the kept boards not delivered yet stop waiting (Task 6b fix round 1)
    savePlayer();
    return { code: 200, body: { ok: true } };
  }
  // GET /web/avatar/catalog: the older keep moved, a kept entry the index no longer has cleared (saved)
  function pruneBoardKept() {
    let changed = migrateKept();
    const kept = (player.avatarBoards || {}).kept;
    if (kept && !entryOf(kept)) {
      player.avatarBoards.kept = null;
      savePlayer();
      log(`[event] Avatar Board Catalog: kept ${kept} is not in the index any more, cleared`);
      changed = true;
    }
    return changed;
  }
  // GET /web/event/catalog: a kept census id the index no longer has is cleared (saved), so the save holds no dead id; listing the
  // Events tab never writes the save
  function pruneKept() {
    if (migrateKept()) return true;
    const kept = view().kept;
    if (!kept || entryOf(kept)) return false;
    state().kept = null;
    savePlayer();
    log(`[event] Event Catalog: kept ${kept} is not in the index any more, cleared`);
    return true;
  }
  function keptEntry(realMs = realNow()) {
    const c = catalogCtx(realMs), e = c.kept && entryOf(c.kept);
    return e && calendar.listable(e) && rowState(e, c) === 'kept' ? e : null;
  }
  // the kept event's open cards, one per built row (Part 2 Task 5): its dates are past, so `days` (row or quest) are read as real
  // weekdays (Pacific). [{row, quests}]
  function keptCards(e, realMs) {
    // «open» time windows inside the day (Events Part 10c): a kept event follows them as in its own week (review I3)
    if (e.timeWindows && !timeWindows.openNow(e.timeWindows, realMs)) return [];
    const wd = ptWeekday(realMs);
    const onDay = (ds) => !Array.isArray(ds) || !ds.length || ds.some((d) => weekdayOf(d) === wd);
    return calendar.builtRows(e).map((row) => {
      const ids = new Set(row.stageIds || []);
      return { row, quests: onDay(row.days) ? (e.quests || []).filter((q) => q.served && ids.has(q.stageId) && onDay(q.days)) : [] };
    }).filter((c) => c.quests.length);
  }
  // an entry by its id or by the id of one of its rows (the Details and Keep buttons of a row card)
  const entryById = (id) => entries().find((x) => x.evStageId === id || (x.rows || []).some((r) => r.evStageId === id));
  // POST /web/event/keep/<evStageId> and /web/event/unkeep (Task 5 buttons): {code, body {ok, why?}}. Only a past event with a
  // served quest can be kept (else why: now, other, later, removed; a BOARD entry: avatarBoards, kept from the Avatar Board Catalog,
  // Task 5b); keeping one replaces the previous kept event, never the kept board entry.
  function keep(evStageId) {
    const id = Number(evStageId), e = entryById(id);
    if (!e) return { code: 404, body: { ok: false, why: 'unknown event' } };
    if (boardOnly(e)) return { code: 409, body: { ok: false, why: 'avatarBoards' } };
    const st = calendar.listable(e) ? rowState(e, { ...catalogCtx(), kept: null }) : 'removed';
    if (st !== 'can') return { code: 409, body: { ok: false, why: st } };
    migrateKept();
    state().kept = e.censusId;
    savePlayer();
    log(`[event] Event Catalog: ${e.censusId} kept`);
    return { code: 200, body: { ok: true } };
  }
  function unkeep() {
    migrateKept();
    state().kept = null;
    savePlayer();
    return { code: 200, body: { ok: true } };
  }

  // /stage/event category 2, after the raids: the kept event (its cards with the KEPT tab), then one card per built original
  // evStage row (Part 2 Task 5: own eventStageId, card, eventType) of the events of the week, with its open served quests. endTime: the end of the real day when the entry or one of its open quests has days (a short-window
  // event or quest; `days: []` is no days), else of the real week (as the raids).
  function events(realMs = realNow()) {
    const cleared = view().cleared || {};
    const stageOf = (q) => {
      const st = stageState(q.stageId);
      // a High Score quest shows its HSC best in the «High Score» bar (hscBest, routes-hsc.js: null for any other quest)
      const hs = hscBest ? hscBest(q.stageId) : null;
      return { stageId: q.stageId, useAp: Number(q.ap) || 0, score: hs == null ? st.score : hs, playStatus: st.playStatus, clearMissionIds: [...(cleared[q.stageId] || [])] };
    };
    const objectives = (id) => Math.min(3, (stageRow(id) || {}).validSubmission || 0);
    const hasDays = (x) => Array.isArray(x.days) && x.days.length > 0;
    const card = (e, row, quests, kept = false) => {
      const stages = quests.map(stageOf);
      return {
        stages,
        eventStageId: row.evStageId,
        showIcon: 1,
        bannerUrl: `${webBase}/web/event/img/v${EVENT_IMG_VERSION}/${row.evStageId}${kept ? '-kept' : ''}.png`,
        eventType: Number.isInteger(row.eventType) ? row.eventType : Number.isInteger(e.eventType) ? e.eventType : EVENT_TYPE,
        status: 1,
        // a card with «open» time windows (Events Part 10c) also ends with the real day: the next list reads the windows again
        endTime: serverTimeAt(hasDays(row) || quests.some(hasDays) || (e.timeWindows || []).some((w) => w.effect === 'open') ? clock.dayEnd(realMs) : clock.weekEnd(realMs)),
        newStageId: 0,
        isLock: 0,
        // crown (as the Special tab): every quest with its objectives 1..min(3, validSubmission) done
        complete: stages.length && stages.every((s) => special.stageDone(s, objectives(s.stageId))) ? 1 : 0,
      };
    };
    // a quest of another Union (index quest `union`, make-events.js: The Keyblade War part 3, one version per Union) is not listed:
    // each player sees only their own Union's version (the server builds the list, the client shows what it gets); a card left
    // with no quest is not listed
    const own = (qs) => qs.filter((q) => !q.union || q.union === ownUnion());
    const kept = keptEntry(realMs);
    return [...(kept ? keptCards(kept, realMs).map((c) => ({ ...c, quests: own(c.quests) })).filter((c) => c.quests.length).map((c) => card(kept, c.row, c.quests, true)) : []),
      ...calendar.currentCards(eventIndex(), storyWeek(), realMs).map((c) => ({ ...c, quests: own(c.quests) })).filter((c) => c.quests.length).map((c) => card(c.entry, c.row, c.quests))];
  }

  // The Event Catalog banner (index.catalog of make-events.js: eventType 0, Details -> /web/event/catalog, a tap opens its Training
  // Grounds quest): server.js lists it second in category 2, right after the Raid Catalog banner. None without index.catalog.
  function catalogEvents() {
    const cat = (eventIndex() || {}).catalog;
    if (!cat || !cat.evStageId || !(cat.stageIds || []).length) return [];
    const stages = cat.stageIds.map((id, i) => { const st = stageState(id); return { stageId: id, useAp: Number((cat.useAp || [])[i]) || 0, score: st.score, playStatus: st.playStatus, clearMissionIds: st.clearMissionIds || [] }; });
    return [{ stages, eventStageId: cat.evStageId, showIcon: 1, bannerUrl: `${webBase}/web/event/img/v${EVENT_IMG_VERSION}/${cat.evStageId}.png`, eventType: 0, status: 1,
      endTime: serverTimeAt(clock.weekEnd(realNow())), newStageId: 0, isLock: 0, complete: 0 }];
  }

  // I-298 (tester 22-11): both catalog banners show the stars of their Training Grounds (objectives done: stageState clearMissionIds)
  // The Avatar Board Catalog banner (Task 5b, index.avatarCatalog of make-events.js: eventType 0, Details -> /web/avatar/catalog, a
  // tap opens the Training Grounds): in the Special tab, right after the Special Catalog banner (special.js lists it first), until
  // the end of the day as that banner. None without index.avatarCatalog.
  const avatarCatalogId = () => ((eventIndex() || {}).avatarCatalog || {}).evStageId || null;
  function avatarCatalogEvents() {
    const cat = (eventIndex() || {}).avatarCatalog;
    if (!cat || !cat.evStageId || !(cat.stageIds || []).length) return [];
    const stages = cat.stageIds.map((id, i) => { const st = stageState(id); return { stageId: id, useAp: Number((cat.useAp || [])[i]) || 0, score: st.score, playStatus: st.playStatus, clearMissionIds: st.clearMissionIds || [] }; });
    return [{ stages, eventStageId: cat.evStageId, showIcon: 1, bannerUrl: `${webBase}/web/event/img/v${EVENT_IMG_VERSION}/${cat.evStageId}.png`, eventType: 0, status: 1,
      endTime: serverTimeAt(clock.dayEnd(realNow())), newStageId: 0, isLock: 0, complete: 0 }];
  }
  // the Special tab's list with the banner after its first card (the Special Catalog banner); an empty list (tab locked) stays empty
  const withAvatarCatalog = (list) => (list.length ? [list[0], ...avatarCatalogEvents(), ...list.slice(1)] : list);

  return { events, catalogEvents, avatarCatalogEvents, avatarCatalogId, withAvatarCatalog, onStageClear, isEventStage, keep, unkeep, catalogCtx, pruneKept, keptEntry, entryOfStage, boardSetOf, currentEntries, pendingBoosters, payPending, payBonuses,
    boardCatalogCtx, keepBoard, unkeepBoard, boardKept, migrateKept, pruneBoardKept };
}

module.exports = routesEvents;
module.exports.EVENT_IMG_VERSION = EVENT_IMG_VERSION;
