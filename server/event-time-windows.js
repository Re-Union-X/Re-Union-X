// Time windows inside a day of an event (Events Part 10c Task 5; record / index entry `timeWindows`). Pure.
// [{from: 'HH:MM', to: 'HH:MM', effect: 'open' | 'dropBoost', factor?}] read on the real Pacific clock, both minutes inside
// (12:00-13:59 is two hours); from > to crosses midnight (open on both sides of it).
// - open: the entry's quests are listed only inside one of its open windows (Classic Donald, reconstructed);
// - dropBoost: inside it the drop odds of the entry's quests are multiplied by `factor` (Classic Goofy Bonus Time, notice 23795).
'use strict';
const { local } = require('./raid-windows');

const EFFECTS = ['open', 'dropBoost'];
const minute = (s) => {
  const m = /^(\d\d):(\d\d)$/.exec(String(s));
  const v = m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  if (!(m && Number(m[1]) < 24 && Number(m[2]) < 60)) throw new Error(`event time windows: ${s} is not HH:MM`);
  return v;
};
// throws on a malformed list (make-events.js checks the records with it)
function check(windows) {
  for (const w of windows || []) {
    minute(w.from); minute(w.to);
    if (!EFFECTS.includes(w.effect)) throw new Error(`event time windows: effect ${w.effect} is not ${EFFECTS.join(' / ')}`);
    if (w.effect === 'dropBoost' && !(Number(w.factor) > 1)) throw new Error(`event time windows: dropBoost ${w.from}-${w.to} needs a factor above 1`);
  }
  return windows;
}
function inside(w, ms) {
  const t = local(ms, 'PT').minute, a = minute(w.from), b = minute(w.to);
  return a <= b ? t >= a && t <= b : t >= a || t <= b;
}
const ofEffect = (windows, effect) => (windows || []).filter((w) => w.effect === effect);
// no open window: always open; no clock: open (as a plain event without a clock)
function openNow(windows, ms) {
  const open = ofEffect(windows, 'open');
  return !open.length || !Number.isFinite(ms) || open.some((w) => inside(w, ms));
}
function dropFactor(windows, ms) {
  if (!Number.isFinite(ms)) return 1;
  return ofEffect(windows, 'dropBoost').filter((w) => inside(w, ms)).reduce((f, w) => Math.max(f, Number(w.factor)), 1);
}

module.exports = { check, inside, openNow, dropFactor };
