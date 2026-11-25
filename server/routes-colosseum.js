// PvE Coliseum routes (Coliseum Part 1 Task 3; plan docs/superpowers/plans/2026-11-25-coliseum-part1.md, spec
// docs/superpowers/specs/2026-11-25-coliseum-design.md «Decided behaviour», client facts docs/notes/coliseum.md «Requests and
// responses»: every listed key is mandatory, or the client rejects the answer).
//   124 GET /colosseum (list), 125 GET /colosseum/reward/list (rewardList), 126 POST /colosseum/start, 127 POST /colosseum/retire,
//   128 POST /colosseum/clear, 139/140/180 GET /ranking/colosseum, /own, /border (ranking).
// Seasons: make-colosseum.js SEASONS (WW 2016-04 .. 2016-07 = colosseumStageId 800 .. 1100) whose colosseumStage row is served.
// One live season (liveSeason): the kept one (player.colosseum.kept, Coliseum Catalog) when it is served, else the season of the
// story clock (storyCtx().shopFrom month); none below story quest 130 or in a month with no served season (status 2, «This event
// is unavailable.»). Per season state: colosseum-rules.js seasonState (player.colosseum.seasons[id]).
// Rules: a loss / retire changes nothing and refunds no AP; a clear inside the window pays the cleared and skipped rounds and the
// completed tiers (colosseum-rules.js clear); a 128 outside the window (double tap, stale screen) pays nothing and answers the
// current state with the requested round in clearColosseums (never empty).
// Ranking: the original leaderboard as score thresholds on the best progress `last` (make-colosseum.js rankedOf, ranked-rewards.js):
// a bracket reached pays the difference into the Presents once (settle, at 128 and at every ranking request).
// End of the season shown by the client («Ends in %s» = master colosseumStage.closeDate): closeDate(realMs), the real Monday on
// which the story Shop week moves into another month (the shown week rotates every real Monday, gacha-data.js shopWindow; looked
// up to LOOKAHEAD_WEEKS ahead), else the end of this real week (as the raid and event cards, whose endTime is the week end); a
// kept season ends with the week too. server.js serves it in the live season's row (servedMasterRows 'colosseumStage').
'use strict';
const rules = require('./colosseum-rules');
const ranked = require('./ranked-rewards');
const { SEASONS, rankedOf } = require('./make-colosseum');
const { bracketText } = require('./routes-hsc');

const UNLOCK_QUEST = 130; // story quest that opens the Coliseum (notices, bench; the tile popup's test)
const STATUS_OPEN = 1, STATUS_UNAVAILABLE = 2;
const COIN = 17; // Coliseum Coins (colosseum-rules.js counts them into the season's coins itself)
const LOOKAHEAD_WEEKS = 12;
const DAY = 86400000;
const KEYS = { '/ranking/colosseum': 'colosseumRanking', '/ranking/colosseum/own': 'colosseumRankingOwn', '/ranking/colosseum/border': 'colosseumRankingBorder' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (m) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const avatarType = (t) => t === 19 || t === 20 || t === 23;

// deps: player, savePlayer, masterRows, storyWeek () -> {storyQuest, shopFrom}, shopFromAtWeek (realWeekIndex) -> shopFrom (no side
// effect), realNow, serverTime, serverTimeAt, clock {weekIndex, weekEnd, weekStartOf}, userPointData, userDetailData,
// stageResumptionData, inventoryBlocks, inventorySnapshot (now) -> snapshot before the rewards, userKeybladesData, send, ret, apNow, changeAp, campaignIds, battlePoints (getPoint, burst) ->
// lux, beginBattle (userKeybladeId), grantItem ({type, id, num, skillId, skillLv}), addPresent ({type, id, num, skillId, skillLv}, text),
// element (now, rank, userColosseum, arrivalTime) -> ranking entry, titleIds () -> owned title ids, log
function routesColosseum({ player, savePlayer, masterRows, storyWeek, shopFromAtWeek = null, realNow, serverTime, serverTimeAt, clock,
  userPointData, userDetailData, stageResumptionData, inventoryBlocks, inventorySnapshot = () => null, userKeybladesData, send, ret, apNow, changeAp, campaignIds = () => [],
  battlePoints, beginBattle = () => {}, grantItem, addPresent, element, titleIds = () => player.titles || [], log = console.log }) {
  const root = () => (player.colosseum ||= {});
  const stageRow = (id) => masterRows('colosseumStage').find((r) => r.colosseumStageId === id) || null;
  // a season served: in SEASONS and with its colosseumStage + tier rows
  function season(id) {
    const s = SEASONS.find((x) => x.colosseumStageId === Number(id));
    const stage = s && stageRow(s.colosseumStageId);
    if (!stage) return null;
    const rows = masterRows('colosseum').filter((t) => t.colosseumStageId === stage.colosseumStageId
      && t.colosseumId >= stage.headColosseumId && t.colosseumId <= stage.termColosseumId);
    if (!rows.length) return null;
    return { id: stage.colosseumStageId, month: s.month, stage, rows, tiers: rules.tiersOf({ stage, tiers: rows }) };
  }
  const seasonOfMonth = (month) => { const s = SEASONS.find((x) => x.month === month); return s ? season(s.colosseumStageId) : null; };
  const storyMonth = () => String(storyWeek().shopFrom || '').slice(0, 7);
  const unlocked = () => Number(storyWeek().storyQuest) >= UNLOCK_QUEST;

  // the live season {id, month, stage, rows, tiers, kept} or null (locked, or a month with no served season)
  function liveSeason() {
    if (!unlocked()) return null;
    const kept = root().kept ? season(root().kept) : null;
    if (kept) return { ...kept, kept: true };
    const s = seasonOfMonth(storyMonth());
    return s ? { ...s, kept: false } : null;
  }
  const stateOf = (s) => rules.seasonState(player, s.id);
  const coinsOf = () => { const s = liveSeason(); return s ? stateOf(s).coins : 0; };
  // «Tier N Bonus» boards (routes-colosseum-boards.js): Tier N of the live season reached = round 1 of Tier N playable (Tier N-1
  // complete: last >= the round before it); false without a live season or a Tier N
  function tierReached(tier) {
    const s = liveSeason();
    if (!s || !s.tiers.some((t) => t.tier === Number(tier))) return false;
    return stateOf(s).last >= rules.globalRound(s.tiers, Number(tier), 1) - 1;
  }
  // Coliseum boards (routes-colosseum-boards.js): n coins of the live season; false (nothing spent) when short or no season live
  function spendCoins(num) {
    const s = liveSeason(), n = Number(num);
    if (!s || !Number.isFinite(n) || n < 0) return false;
    const st = stateOf(s);
    if (st.coins < n) return false;
    st.coins -= n;
    return true;
  }
  // reward type 17 outside a Coliseum clear (grantItem of server.js): into the live season
  function addCoins(num) {
    const s = liveSeason(), n = Number(num) || 0;
    if (!n) return false;
    if (!s) { log(`[colosseum] ${n} Coliseum Coins with no live season: not paid`); return false; }
    stateOf(s).coins += n;
    savePlayer();
    return true;
  }

  // progress shown (userColosseum): the last round cleared as tier / round in tier / global round; a new season = Tier 1, 0
  function userColosseum(s, last) {
    if (!last) return { userRank: s.tiers[0].tier, userStageCount: 0, userStageTotalCount: 0 };
    const tr = rules.tierRound(s.tiers, last);
    return { userRank: tr.tier, userStageCount: tr.round, userStageTotalCount: last };
  }
  // {brackets, thresholds} of a season from its served ranking rows (null without them)
  function rankedOfSeason(s) {
    const rk = masterRows('ranking').find((r) => r.rankingId === s.stage.rankingId);
    if (!rk) return null;
    const rewards = masterRows('rankingReward').filter((r) => r.rankingRewardId >= rk.startRank && r.rankingRewardId <= rk.endRank);
    return rewards.length ? rankedOf(s.rows, rewards) : null;
  }
  const shownRank = (s, st) => { const r = st.last > 0 && rankedOfSeason(s); return r ? ranked.shownRank(r.thresholds, st.last) : 0; };
  // a bracket newly reached by the best progress: the difference into the Presents, once (state st.ranked = {best, paidIndex})
  function settle(s, st) {
    const r = rankedOfSeason(s);
    if (!r || st.last <= 0) return [];
    const box = { [s.id]: st.ranked || { best: -Infinity, paidIndex: -1 } };
    const before = box[s.id].paidIndex;
    const out = ranked.record(box, s.id, st.last, r);
    st.ranked = { best: out.best, paidIndex: out.paidIndex };
    if (out.paidIndex > before) {
      const text = `Coliseum ${monthName(s.month)}: ${bracketText(r.brackets[out.paidIndex])}`;
      for (const x of out.due) addPresent(x, text);
      log(`[colosseum] ${s.id}: progress ${st.last}: bracket ${bracketText(r.brackets[out.paidIndex])} paid (${out.due.map((x) => `type ${x.type} id ${x.id || 0} x${x.num}`).join(', ')})`);
    }
    return out.due;
  }

  // end of the live season, real ms (see the header); start: the same walk backwards
  function seasonBounds(realMs = realNow(), s = liveSeason()) {
    const w = clock.weekIndex(realMs);
    const weekRange = { start: clock.weekStartOf(w), end: clock.weekEnd(realMs) };
    if (!s || s.kept || !shopFromAtWeek) return weekRange;
    const monthAt = (k) => { try { return String(shopFromAtWeek(w + k) || '').slice(0, 7); } catch (e) { return null; } };
    let end = weekRange.end, start = weekRange.start;
    for (let k = 1; k <= LOOKAHEAD_WEEKS; k++) {
      const m = monthAt(k);
      if (m === null) break;
      if (m !== s.month) { end = clock.weekStartOf(w + k); break; }
    } // no change ahead (the story stays in this month): the week's end, as the raid and event cards
    for (let k = 1; k <= LOOKAHEAD_WEEKS; k++) {
      const m = monthAt(-k);
      if (m === null || m !== s.month) { start = clock.weekStartOf(w - k + 1); break; }
    }
    return { start, end };
  }
  // closeDate / rankingCloseDate of the live season's served master row (fake time), null without one
  function closeDate(realMs = realNow()) {
    const s = liveSeason();
    return s ? { colosseumStageId: s.id, date: serverTimeAt(seasonBounds(realMs, s).end) } : null;
  }

  const unavailable = () => ({ colosseumInfo: { colosseumStageId: 0, status: STATUS_UNAVAILABLE }, colosseumStages: [], colosseumRank: 0,
    userColosseum: { userRank: 0, userStageCount: 0, userStageTotalCount: 0 } });
  function stagesOf(s, st) {
    return rules.playable(s.tiers, st).map((p) => {
      const t = s.tiers.find((x) => x.tier === p.tier);
      return { rank: p.tier, stageCount: p.round, stageId: s.stage.stageId[p.stageIndex] || s.stage.stageId[0], useAp: t.ap };
    });
  }
  // GET /colosseum (124)
  function list(res) {
    const s = liveSeason();
    if (!s) return send(res, 200, { ret: ret(), ...unavailable() });
    const st = stateOf(s);
    send(res, 200, {
      ret: ret(),
      colosseumInfo: { colosseumStageId: s.id, status: STATUS_OPEN },
      colosseumStages: stagesOf(s, st),
      colosseumRank: shownRank(s, st),
      userColosseum: userColosseum(s, st.last),
    });
  }
  // GET /colosseum/reward/list (125): the tiers whose reward was obtained, ascending (the client binary-searches it)
  function rewardList(res) {
    const s = liveSeason();
    const ids = s ? [...stateOf(s).tierRewards].sort((a, b) => a - b) : [];
    send(res, 200, { ret: ret(), getRewardRankIds: ids });
  }

  const int = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
  // POST /colosseum/start (126) {rank, stageCount, stageId, userKeybladeId}
  function start(res, body) {
    const now = serverTime(), s = liveSeason();
    const tier = int(body?.rank), round = int(body?.stageCount);
    const st = s && stateOf(s);
    const open = st ? rules.playable(s.tiers, st).some((p) => p.tier === tier && p.round === round) : false;
    const t = s && s.tiers.find((x) => x.tier === tier);
    const ap = t ? Number(t.ap) || 0 : 0;
    if (!open || apNow() < ap) {
      // missing fields on purpose: the client stops with an error instead of playing a round the server does not count
      log(`[colosseum] start refused: season ${s ? s.id : 'none'}, tier ${body?.rank} round ${body?.stageCount}, AP ${apNow()} of ${ap}`);
      return send(res, 200, { ret: ret(), userData: { userPoint: userPointData(now) } });
    }
    if (ap) changeAp(-ap);
    const userKeybladeId = Number(body?.userKeybladeId) || 0;
    root().fight = { season: s.id, tier, round, stageId: Number(body?.stageId) || 0 };
    beginBattle(userKeybladeId);
    savePlayer();
    log(`[colosseum] ${s.id}: tier ${tier} round ${round} started (-${ap} AP)`);
    send(res, 200, {
      ret: ret(),
      userData: { userPoint: userPointData(now) },
      colosseumInfo: { colosseumStageId: s.id, status: STATUS_OPEN },
      userColosseum: userColosseum(s, st.last),
      userTreasures: [],
      startColosseumData: { rank: tier, stageCount: round, stageId: Number(body?.stageId) || 0, userKeybladeId },
      campaigns: campaignIds(),
    });
  }
  // POST /colosseum/retire (127) {burst}: a loss or Give Up; progress and AP unchanged, the keyblade keeps its gauge
  function retire(res, body) {
    if (root().fight) { log(`[colosseum] tier ${root().fight.tier} round ${root().fight.round} lost or given up: nothing changes`); root().fight = null; savePlayer(); }
    send(res, 200, { ret: ret(), userKeyblades: userKeybladesData(), userData: { stageResumption: stageResumptionData() } });
  }
  // POST /colosseum/clear (128)
  function clear(res, body) {
    const now = serverTime(), fight = root().fight;
    // only the rows the rewards touch (as every other reward route): the full lists were ~1 MB, ~30 s of black screen (bench 25-11)
    const snap = inventorySnapshot(now);
    const titlesBefore = new Set(titleIds());
    const tier = int(body?.rank), round = int(body?.stageCount);
    const s = fight ? season(fight.season) : null;
    let clearColosseums = [], getLux = 0, avatar = false;
    if (s && fight.tier === tier && fight.round === round) {
      root().fight = null;
      const st = stateOf(s);
      const out = rules.clear(s.tiers, st, { tier, round, oneTurn: !!body?.isSkip && body.isSkip !== '0' }, new Date(realNow()).toISOString());
      getLux = battlePoints({ lux: body?.lux }, body?.burst);
      if (out.ok) {
        clearColosseums = out.cleared.map((c) => ({ rank: c.tier, stageCount: c.round }));
        // non-coin items of the cleared rounds and of the completed tiers (coins are in st.coins already)
        const items = [...out.cleared.flatMap((c) => s.tiers.find((x) => x.tier === c.tier).roundReward), ...out.tierItems.flatMap((x) => x.items)]
          .filter((it) => it.type !== COIN);
        for (const it of items) { grantItem(it); if (avatarType(it.type)) avatar = true; }
        settle(s, st);
        log(`[colosseum] ${s.id}: tier ${tier} round ${round} cleared${body?.isSkip ? ' in one turn' : ''}: ${out.cleared.length} round(s), +${out.coins} coins`
          + `${out.tierRewards.length ? `, tier reward(s) ${out.tierRewards.join(', ')}` : ''}; window ${st.last + 1}..${st.open}`);
      } else log(`[colosseum] ${s.id}: tier ${tier} round ${round} is outside the window: nothing paid`);
    } else {
      log(`[colosseum] clear of tier ${body?.rank} round ${body?.stageCount} with no matching round started (${fight ? `${fight.tier}/${fight.round}` : 'none'}): nothing paid`);
      if (fight) root().fight = null;
    }
    // never empty: the round asked for when nothing was cleared now (a retried or stale request)
    if (!clearColosseums.length) clearColosseums = [{ rank: Number.isFinite(tier) ? tier : 0, stageCount: Number.isFinite(round) ? round : 0 }];
    savePlayer();
    const inv = inventoryBlocks(now, snap);
    send(res, 200, {
      ret: ret(),
      userData: { userPoint: userPointData(now), userDetail: userDetailData(), stageResumption: stageResumptionData() },
      clearColosseums,
      userMaterials: inv.userMaterials,
      userMedals: inv.userMedals,
      userSkills: inv.userSkills,
      // only the titles of this clear: the client opens one popup per entry (I-220)
      userTitles: inv.userTitles.filter((x) => !titlesBefore.has(x.titleId) && titleIds().includes(x.titleId)),
      userKeyblades: inv.userKeyblades,
      userDecks: inv.userDecks,
      userAvatarParts: avatar ? inv.userAvatarParts : [],
      subslotMaxNum: inv.subslotMaxNum,
      userKeybladeSubslots: inv.userKeybladeSubslots,
      getLux,
    });
  }

  // GET /ranking/colosseum (139 top), /own (140), /border (180): the player's own entry (best progress, the time it was reached);
  // border = one row per threshold, top first (rank = the bracket's best rank, progress = the round needed)
  function ranking(res, p) {
    const key = KEYS[p] || KEYS['/ranking/colosseum'];
    const now = serverTime(), realMs = realNow(), s = liveSeason();
    const b = seasonBounds(realMs, s);
    const base = { rankingStatus: 2, rankingTermStart: serverTimeAt(b.start), rankingTermEnd: serverTimeAt(b.end), lastRank: 0, updateTime: now, nextUpdateTime: serverTimeAt(b.end) };
    if (!s) return send(res, 200, { ret: ret(), [key]: { ...base, rankingDatas: [] } });
    const st = stateOf(s);
    if (settle(s, st).length) savePlayer();
    const r = rankedOfSeason(s), rank = shownRank(s, st);
    const arrival = st.bestAt ? serverTimeAt(Date.parse(st.bestAt)) : now;
    const rows = p.endsWith('/border') && r
      ? [...r.thresholds].reverse().map((x) => element(now, x.startRank, userColosseum(s, x.score), now))
      : [element(now, rank, userColosseum(s, st.last), arrival)];
    send(res, 200, { ret: ret(), [key]: { ...base, rankingDatas: rows, lastRank: rank } });
  }

  // Coliseum Catalog (Task 6 builds the page on these): a served season can be kept when it is a past month of the story clock
  function catalogCtx() {
    return { storyMonth: storyMonth(), unlocked: unlocked(), kept: root().kept || null, live: (liveSeason() || {}).id || null };
  }
  function rowState(s, c = catalogCtx()) {
    if (c.kept === s.id) return 'kept';
    if (s.month === c.storyMonth) return 'now';
    return s.month < c.storyMonth ? 'can' : 'later';
  }
  function catalogCard(id) {
    const s = season(id);
    if (!s) return null;
    const st = rules.seasonState(player, s.id);
    return { colosseumStageId: s.id, month: s.month, state: rowState(s), coins: st.coins, ...userColosseum(s, st.last), tierRewards: [...st.tierRewards].sort((a, b) => a - b) };
  }
  function keep(id) {
    const s = season(id);
    if (!s) return { code: 404, body: { ok: false, why: 'unknown season' } };
    const c = catalogCtx();
    if (!c.unlocked) return { code: 409, body: { ok: false, why: 'locked' } };
    const why = rowState(s, { ...c, kept: null });
    if (why !== 'can') return { code: 409, body: { ok: false, why } };
    root().kept = s.id;
    root().fight = null;
    savePlayer();
    log(`[colosseum] Coliseum Catalog: season ${s.id} (${s.month}) kept`);
    return { code: 200, body: { ok: true } };
  }
  function unkeep() {
    root().kept = null;
    root().fight = null;
    savePlayer();
    return { code: 200, body: { ok: true } };
  }

  return { list, rewardList, start, retire, clear, ranking, liveSeason, coinsOf, spendCoins, tierReached, addCoins, closeDate, seasonBounds, keep, unkeep, catalogCtx, catalogCard,
    seasons: () => SEASONS.map((x) => season(x.colosseumStageId)).filter(Boolean) };
}

module.exports = routesColosseum;
module.exports.RANKING_KEYS = KEYS;
module.exports.UNLOCK_QUEST = UNLOCK_QUEST;
