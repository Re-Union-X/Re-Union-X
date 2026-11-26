// High Score Challenge routes (Events Part 8 Task 5; spec docs/superpowers/specs/2026-11-10-ranked-rewards-design.md, client facts
// docs/notes/events.md «High Score Challenge: client behaviour»). One player: the original leaderboard becomes score thresholds
// (server/ranked-rewards.js), read from the `hsc` block of the event's index entry (make-events.js, Task 6:
// {rankingId, milestones [{score, rewards, scoreRewardId}], brackets, thresholds} lowest bracket -> top).
// State: player.hsc = { [censusId]: { best, paidIndex, milestones: [paid milestone scores], result?: {rankingId, rank,
// rankingRewardId} } } (absent in older saves = nothing played). Only an HSC quest's score is stored (entryOfStage -> an entry with
// thresholds); the kept (Event Catalog) play counts for its own event id (HSC quests are never shared, make-events.js).
// Delivery (user gate 16-11):
//   - a run that reaches a new bracket pays the difference vs the bracket already paid (rewardsDue) into the Presents, text
//     «High Score Challenge: <event>: <bracket>», and arms the original «Score Ranking Results» popup: /ranking/reward/check sends
//     it once ({lastRankingResults [{lastRankingId, lastRank, lastUnionRank 0, pvpClass 0}], rankingRewardIds, openRankingIds}),
//     the next time the player opens Rankings, then never again;
//   - each newly reached point milestone (evScoreReward) is paid into the Presents once per event id and returned in /stage/clear
//     highScoreReward (the client adds «N points scored!» rows to the Congratulations screen).
// Screens: /stage/event highScoreRank and the ranking element's rank = the shown rank (ranked-rewards.js shownRank); the ranking
// element is the full player record of the client's High Score parser with the score in `lux` (deps.element, server.js); border =
// one row per threshold, top first, rank = the bracket's best rank (the rank shown once that threshold is reached), lux = the score
// needed; top = the player only. rankingTermStart/End = the HSC card's window in the player's week (its endTime, routes-events.js).
// The Rankings requests name no event: the HSC is the one last started or cleared when it is listed, else the first one listed.
'use strict';
const ranked = require('./ranked-rewards');

const DAY = 86400000;
const KEYS = { '/ranking/highscore': 'highscoreRanking', '/ranking/highscore/own': 'highscoreRankingOwn', '/ranking/highscore/border': 'highscoreRankingBorder' };

const ordinal = (n) => {
  const s = Number(n).toLocaleString('en-US'), m100 = n % 100, m10 = n % 10;
  return s + (m100 >= 11 && m100 <= 13 ? 'th' : m10 === 1 ? 'st' : m10 === 2 ? 'nd' : m10 === 3 ? 'rd' : 'th');
};
// ASCII ' - ' as in the client's own Rewards popup: the game font of the Present Box has no en dash (it drops it)
const bracketText = (b) => (b.startRank === b.endRank ? ordinal(b.startRank) : `${ordinal(b.startRank)} - ${ordinal(b.endRank)}`);
const needed = (t) => t.score;
const parseTime = (s) => Date.parse(String(s).replace(' ', 'T') + 'Z');

function routesHsc({ player, savePlayer, entryOfStage, listed, addPresent, masterRows, realNow, serverTimeAt, clock, serverTime, send, ret, element, log = console.log }) {
  // the HSC entry of a stage: an index entry with an hsc block and thresholds, else null
  const hscOf = (stageId) => {
    const e = entryOfStage(Number(stageId));
    return e && e.hsc && (e.hsc.thresholds || []).length && (e.hsc.brackets || []).length === e.hsc.thresholds.length ? e : null;
  };
  const rec = (cid) => ((player.hsc || {})[cid]) || null;
  const bestOf = (cid) => (rec(cid) ? rec(cid).best : 0);
  const nameOf = (e) => e.name || e.censusId;
  let focusStage = null; // the HSC quest last started or cleared (the Rankings requests carry no event id)

  // the rankingReward id of bracket i (lowest -> top): master ranking.startRank..endRank is the id range, matched by rank
  function rankingRewardIdOf(e, i) {
    const b = e.hsc.brackets[i];
    const rk = masterRows('ranking').find((r) => r.rankingId === e.hsc.rankingId);
    if (!rk) return null;
    const row = masterRows('rankingReward').find((r) => r.rankingRewardId >= rk.startRank && r.rankingRewardId <= rk.endRank && r.startRank === b.startRank && r.endRank === b.endRank);
    return row ? row.rankingRewardId : null;
  }
  const pay = (r, text) => addPresent(r.type, r.id || 0, r.num, text, r.skillId || undefined, r.skillLv || undefined);

  // /stage/clear: score = getPoint.score of the run. -> the evScoreReward ids newly reached (highScoreReward); [] for any other stage
  // or a run worth nothing (0, not a number). The caller saves.
  function onClear(stageId, score) {
    const e = hscOf(stageId);
    if (!e) return [];
    focusStage = Number(stageId);
    const n = typeof score === 'number' ? score : (typeof score === 'string' && score.trim() !== '' ? Number(score) : NaN);
    if (!Number.isFinite(n) || n <= 0) return [];
    const cid = e.censusId, h = e.hsc, cur = rec(cid);
    const tmp = { [cid]: cur ? { best: cur.best, paidIndex: cur.paidIndex } : { best: -Infinity, paidIndex: -1 } };
    const r = ranked.record(tmp, cid, n, { thresholds: h.thresholds, brackets: h.brackets });
    const st = (player.hsc ||= {})[cid] = { ...(cur || {}), best: r.best, paidIndex: r.paidIndex, milestones: [...((cur && cur.milestones) || [])] };
    const before = cur ? cur.paidIndex : -1;
    if (r.paidIndex > before) { // a new bracket: its popup even when it adds no new items (review round 1, Minor 1)
      const text = `High Score Challenge: ${nameOf(e)}: ${bracketText(h.brackets[r.paidIndex])}`;
      for (const x of r.due) pay(x, text);
      st.result = { rankingId: h.rankingId, rank: ranked.shownRank(h.thresholds, r.best), rankingRewardId: rankingRewardIdOf(e, r.paidIndex) };
      log(`[hsc] ${cid}: score ${n}, best ${r.best}: bracket ${bracketText(h.brackets[r.paidIndex])} paid (${r.due.map((x) => `type ${x.type} id ${x.id || 0} x${x.num}`).join(', ')})`);
    }
    const ids = [];
    for (const m of [...(h.milestones || [])].sort((a, b) => a.score - b.score)) {
      if (r.best < m.score || st.milestones.includes(m.score)) continue;
      for (const x of m.rewards || []) pay(x, `High Score Challenge: ${nameOf(e)}: ${m.score.toLocaleString('en-US')} points`);
      st.milestones.push(m.score);
      if (m.scoreRewardId) ids.push(m.scoreRewardId);
      log(`[hsc] ${cid}: milestone ${m.score} points paid`);
    }
    return ids;
  }

  // /stage/start startStageData.highScore: the best score of the HSC (0 for any other stage)
  function startHighScore(stageId) {
    const e = hscOf(stageId);
    if (!e) return 0;
    focusStage = Number(stageId);
    return bestOf(e.censusId);
  }
  // /stage/event stages[].score of an HSC quest: its best score; null for any other quest (its Lux record stays)
  const bestOfStage = (stageId) => { const e = hscOf(stageId); return e ? bestOf(e.censusId) : null; };
  const highScoreRank = (cid, e = null) => {
    const x = e || (listedEntries().find((y) => y.censusId === cid));
    return x ? ranked.shownRank(x.hsc.thresholds, bestOf(x.censusId)) : 0;
  };

  // the listed HSC: [{entry, card}] in list order
  function listedHsc(cards) {
    const out = [];
    for (const c of cards || []) {
      for (const s of c.stages || []) {
        const e = hscOf(s.stageId);
        if (e && !out.some((x) => x.entry.censusId === e.censusId)) out.push({ entry: e, card: c, stageId: s.stageId });
      }
    }
    return out;
  }
  const listedEntries = () => listedHsc(safeListed()).map((x) => x.entry);
  function safeListed() { try { return listed(); } catch (err) { log(`[hsc] listing: ${err.message}`); return []; } }
  // the HSC of the Rankings screen: the focus when it is listed, else the first listed one
  function current(cards = safeListed()) {
    const l = listedHsc(cards);
    const f = focusStage && hscOf(focusStage);
    return (f && l.find((x) => x.entry.censusId === f.censusId)) || l[0] || null;
  }
  // /stage/event highScoreRank (category 2): the shown rank of the HSC listed; 0 without one
  function listedRank(cards) {
    const c = current(cards);
    return c ? highScoreRank(c.entry.censusId, c.entry) : 0;
  }

  // the ranking window: the card's endTime in the player's week, back one day (a daily card) or one week
  function term(c) {
    const realMs = realNow();
    if (!c) return { start: serverTimeAt(clock.weekEnd(realMs) - 7 * DAY), end: serverTimeAt(clock.weekEnd(realMs)) };
    const end = c.card.endTime, daily = end === serverTimeAt(clock.dayEnd(realMs));
    return { start: serverTimeAt(parseTime(end) - (daily ? DAY : 7 * DAY)), end };
  }
  // GET /ranking/highscore (top), /own, /border (actions 135/136/179)
  function respondRanking(res, p) {
    const key = KEYS[p] || KEYS['/ranking/highscore'];
    const c = current(), t = term(c), now = serverTime();
    const base = { rankingStatus: 2, rankingTermStart: t.start, rankingTermEnd: t.end, lastRank: 0, updateTime: now, nextUpdateTime: t.end };
    if (!c) return send(res, 200, { ret: ret(), [key]: { ...base, rankingDatas: [] } });
    const h = c.entry.hsc, best = bestOf(c.entry.censusId), rank = ranked.shownRank(h.thresholds, best);
    const rows = p.endsWith('/border') ? [...h.thresholds].reverse().map((x) => element(needed(x), x.startRank)) : [element(best, rank)];
    return send(res, 200, { ret: ret(), [key]: { ...base, rankingDatas: rows, lastRank: rank } });
  }
  // a «Score Ranking Results» popup waits (/mypage rankingRewards.rankingHighScore)
  const pendingResult = () => Object.values(player.hsc || {}).some((x) => x && x.result);
  // POST /ranking/reward/check (action 142): the waiting results, once. The action is also called by the Coliseum Daily
  // «Challenge», the PvP Ranking scene and the Lux/Party Rankings; the request names its ranking `type`. Bench log 16-11 (spike
  // pass 2, logs/server.log #81-#92): opening the HSC Rankings screen sends 142 {"type":5} FIRST, then 135/136/179, and the
  // popup opened from that 142 answer. So the results are sent (and cleared) only on a type 5 request; any other caller gets the
  // empty arrays and leaves them waiting.
  const HSC_CHECK_TYPE = 5;
  function respondRewardCheck(res, req = null) {
    const forHsc = Number(req && req.type) === HSC_CHECK_TYPE;
    const waiting = forHsc ? Object.entries(player.hsc || {}).filter(([, x]) => x && x.result) : [];
    const body = { ret: ret(), lastRankingResults: [], rankingRewardIds: [], openRankingIds: [], rankingReward: [] };
    for (const [cid, x] of waiting) {
      body.lastRankingResults.push({ lastRankingId: x.result.rankingId, lastRank: x.result.rank, lastUnionRank: 0, pvpClass: 0 });
      if (x.result.rankingRewardId) body.rankingRewardIds.push(x.result.rankingRewardId);
      body.openRankingIds.push(x.result.rankingId);
      delete x.result;
      log(`[hsc] ${cid}: Score Ranking Results shown`);
    }
    if (waiting.length) savePlayer();
    return send(res, 200, body);
  }
  // GET /stage/highscore/reward/list (action 112): the best score and the evScoreReward ids reached by it
  function respondRewardList(res) {
    const c = current();
    if (!c) return send(res, 200, { ret: ret(), getHighscore: 0, getHighscoreRewardIds: [] });
    const best = bestOf(c.entry.censusId);
    const ids = (c.entry.hsc.milestones || []).filter((m) => best >= m.score && m.scoreRewardId).sort((a, b) => a.score - b.score).map((m) => m.scoreRewardId);
    return send(res, 200, { ret: ret(), getHighscore: best, getHighscoreRewardIds: ids });
  }

  return { onClear, startHighScore, bestOfStage, highScoreRank, listedRank, respondRanking, respondRewardCheck, respondRewardList, pendingResult, isHscStage: (id) => !!hscOf(id) };
}

module.exports = routesHsc;
module.exports.HSC_KEYS = KEYS;
module.exports.bracketText = bracketText;
