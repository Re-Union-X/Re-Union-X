// Login bonus (I-176): regole pure, usate da server.js (POST /login/bonus, azione 65, e acquirableLoginBonus di
// /khux/login e /user/create). Ricerca: docs/notes/home_profilo.md#login-bonus.
// - giorno del login bonus = giorno delle missioni (clock.dayIndex, cambio alle 08:00 UTC; l'originale cambiava alle
//   4:00 a.m. PT: scelta dell'utente 20-10, spiegata nelle Notices);
// - Total = giorni di login (uno per giorno), Daily = ciclo di 5 che avanza a ogni login senza azzerarsi se si salta un
//   giorno (scelta dell'utente 20-10: negli screenshot originali il Daily e' sempre (Total - 1) mod 5 + 1);
// - premi nei Presents (commento «Daily Login Bonus Reward», reference\presents\presents_list_01.png).
'use strict';

const MAX_POPUPS = 5; // special login popups shown by one claim (user 22-11); the others only in the Presents

const DAILY_COMMENT = 'Daily Login Bonus Reward';
const TOTAL_COMMENT = 'Total Login Bonus Reward';

const cycleDay = (total) => ((Math.max(1, total) - 1) % 5) + 1;

// stato nel salvataggio: player.loginBonus = { lastDay (indice del giorno dell'ultimo login bonus), total }
const fresh = () => ({ lastDay: null, total: 0 });

// a lastDay later than today means the clock went back (a save from a bench run with -RealNow in the future, or a phone
// whose date was wrong): today counts as a new day, otherwise the bonus would hide for weeks (tester report 15-11)
const acquirable = (state, day) => !state || state.lastDay === null || state.lastDay === undefined || day !== state.lastDay;

// Events Part 9b: special logins (bonusType 3/4, blue «Welcome!» popup). windows {"<id>": {from, to, perDay}} gives each
// row its original Pacific days (make-login-specials.js); a row is due when the story day is inside them and it was never
// paid (state.specials {"<id>": storyDay}; perDay rows, the Newcomer Campaign, once per story day: key "<id>@<day>").
// force: bench ids (KHUX_LOGIN_SPECIAL_FORCE), due whatever the day, still once. Only ids with a master row (crash otherwise).
// Catch-up (user 22-11): with since = the last story day seen at a claim (state.specialsSeen), a once-only row is due when its
// window meets (since, storyDay]: the specials of the story weeks passed since the last login are paid at the next one.
// perDay rows (Newcomer) only for storyDay itself. Order: oldest window first, then id.
function dueSpecials(state, storyDay, windows, rows, force = [], since = null) {
  const paid = (state && state.specials) || {};
  const exists = new Set(rows.filter((r) => r.bonusType === 3 || r.bonusType === 4).map((r) => r.loginBonusId));
  const from = since && storyDay && since < storyDay ? since : null; // exclusive lower bound of the catch-up
  const out = [];
  for (const id of exists) {
    const w = (windows || {})[id];
    const today = storyDay && w && w.from <= storyDay && storyDay <= w.to;
    const passed = from && w && !w.perDay && w.to > from && w.from <= storyDay;
    if (!today && !passed && !force.includes(id)) continue;
    const key = w && w.perDay && storyDay ? `${id}@${storyDay}` : String(id);
    if (!(key in paid)) out.push({ id, key, at: (w && w.from) || '' });
  }
  return out.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id - b.id));
}

// Riscossione del giorno `day`: { state, rewards: [{type, id, num, comment, special?}], response } (response = loginBonus
// del client). Lo stesso giorno una seconda volta (rete, riavvio) da' la stessa risposta senza premi.
// opts {storyDay, windows, force}: the special logins of the story day (dueSpecials), only on a new login day.
function claim(state, day, rows, opts = {}) {
  const s = { ...fresh(), ...(state || {}) };
  const rewards = [];
  const byId = new Map(rows.map((r) => [r.loginBonusId, r]));
  const daily = rows.filter((r) => r.bonusType === 1).sort((a, b) => a.day - b.day);
  const totals = rows.filter((r) => r.bonusType === 2);
  if (acquirable(s, day)) {
    s.total += 1;
    s.lastDay = day;
    const d = daily.find((r) => r.day === cycleDay(s.total));
    const t = totals.find((r) => r.day === s.total);
    if (d) rewards.push({ type: d.rewardType, id: d.rewardId, num: d.rewardNum, comment: DAILY_COMMENT });
    if (t) rewards.push({ type: t.rewardType, id: t.rewardId, num: t.rewardNum, comment: TOTAL_COMMENT });
    const due = dueSpecials(s, opts.storyDay || null, opts.windows, rows, opts.force || [], s.specialsSeen || null);
    s.specials = { ...(s.specials || {}) };
    for (const { id, key } of due) {
      const r = byId.get(id);
      s.specials[key] = opts.storyDay || 'bench';
      rewards.push({ type: r.rewardType, id: r.rewardId, num: r.rewardNum, comment: r.comment || r.title, special: id });
    }
    // the blue popups: the first MAX_POPUPS (every reward is already in the Presents)
    s.lastSpecials = due.slice(0, MAX_POPUPS).map((x) => x.id);
    if (opts.storyDay && !(s.specialsSeen && s.specialsSeen > opts.storyDay)) s.specialsSeen = opts.storyDay;
  }
  const d = daily.find((r) => r.day === cycleDay(s.total));
  const t = totals.find((r) => r.day === s.total);
  // ogni id mandato deve esistere nel master (riga mancante = crash del client): 0 = nessuna riga
  const response = {
    continue: { loginBonusId: d ? d.loginBonusId : 0, dayCount: s.total ? cycleDay(s.total) : 0 },
    total: { loginBonusId: t ? t.loginBonusId : 0, dayCount: s.total },
    specials: [...(s.lastSpecials || [])],
  };
  return { state: s, rewards, response };
}

module.exports = { DAILY_COMMENT, TOTAL_COMMENT, cycleDay, fresh, acquirable, claim, dueSpecials, MAX_POPUPS };
