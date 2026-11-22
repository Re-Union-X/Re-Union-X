// Events Part 9c (docs/superpowers/plans/2026-11-22-events-part9c-lux-boost.md): the Home «Lux Boost» button.
// Original rules (notices 20682, 30716, 30792): +5% Lux for the party for 60 minutes, once a day, usable again after
// 12:00 a.m. PT, only in a party, not on the day of joining it. Offline the party is only the player (spec decision).
// Client (bench 22-11): GET /party/lux_up_time (action 105) at every Home answers luxUp {magnification (1/10000: 500 shows
// «5% Lux Boost!»), available, restrictionKind (1 = «cannot use this feature on the day you joined the party»)}; the
// button shows when available or restrictionKind 1; OK on its confirmation sends PUT /party/lux_up_time (no parameters).
// State: player.luxBoost = {day: Pacific day of the last use, at: ms of the activation}.
'use strict';

const MAGNIFICATION = 500;
const DURATION_MS = 3600000;
const PT_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
const pacificDay = (ms) => PT_DAY.format(new Date(ms));

const active = (state, nowMs) => !!(state && typeof state.at === 'number' && nowMs >= state.at && nowMs < state.at + DURATION_MS);
const joinedToday = (party, nowMs) => !!(party && party.createDate && pacificDay(party.createDate) === pacificDay(nowMs));

function status(state, nowMs, party) {
  const restrictionKind = joinedToday(party, nowMs) ? 1 : 0;
  const available = !!party && !restrictionKind && !(state && state.day === pacificDay(nowMs));
  return { magnification: active(state, nowMs) ? MAGNIFICATION : 0, available, restrictionKind };
}

function activate(state, nowMs, party) {
  if (!status(state, nowMs, party).available) return { state: state || {}, ok: false };
  return { state: { day: pacificDay(nowMs), at: nowMs }, ok: true };
}

// Lux factor at a moment (the /stage/clear of a quest)
const factor = (state, nowMs) => (active(state, nowMs) ? 1 + MAGNIFICATION / 10000 : 1);

module.exports = { MAGNIFICATION, DURATION_MS, pacificDay, status, activate, factor };
