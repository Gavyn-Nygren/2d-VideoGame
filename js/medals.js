/* Pip & Bo - Medals: every team level's Bronze, Silver and Gold goals, in one shared format, shown on the ready card
   (what each medal needs), on the results card (a ladder of the three medals with each goal ticked or not, and what the
   next medal needs) and on the world pages (the best medal a level has earned). */
'use strict';

/* ---------- the format ----------
   A team level gives its medal goals once, as `medals` on its MODES object (or on its LEVELS entry when it has no mode):

     medals: {
       bronze: 'Reach the castle',                  // what any finish earns (a short goal, shown with a tick)
       goals: [
         { key: 'time',   gold: 210, silver: 330 },                 // seconds; built in: "3:30 or faster"
         { key: 'boings', gold: 3,   silver: 10, word: 'Boing' },   // fewer is better: "3 or fewer Boings"
         { key: 'stars',  gold: 0.5, more: true, pct: true, word: 'the stars' },   // only Gold asks for it
       ],
     },

   Each goal names a value by `key`. Fewer (or faster) is better unless `more: true`. A goal leaves out `silver` (or
   `gold`) when that medal does not ask for it. Gold needs every gold goal met, Silver every silver goal, Bronze only
   the finish. The words come from the key and `word`; `pct: true` shows a fraction (0-1) as a percent; `text` replaces
   the goal's words entirely: text: n => `${n} or fewer gold helps`; `show: v => '+' + v` changes how your value reads;
   `gap: (v, n) => '...'` how the gap to the next medal reads.
   Built-in keys: time (G.time at the clear, or `def.medalTime`), falls (G.falls); golf levels: overPar; block
   building: squashes (squashes + traps); Robo Pong: robo (Robo's points; a lost match earns no medal). A mode gives every other value from
   its `medalValues()` hook at the end: medalValues() { return { boings: 5, stars: 0.6 }; } (it may also return
   time). A level that ended without earning even Bronze (a lost Robo Pong) returns { noMedal: true }.
   Keep `medals` a plain object so the ready card can read it before the level starts. */

const MEDAL_TIERS = ['bronze', 'silver', 'gold'];
const MEDAL_NAMES = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

// the level's medal goals, or null (versus levels have none)
function medalSpec(i) {
  const l = LEVELS[i];
  if (!l || l.kind === 'versus') return null;
  const m = l.medals || (l.mode && MODES[l.mode] && MODES[l.mode].medals);
  return m && Array.isArray(m.goals) ? m : null;
}

const medalPlural = (n, w) => (n === 1 || /^the /.test(w) ? w : pluralWord(w));
// words for one goal at one tier: "3:30 or faster", "3 or fewer Boings", "No Boings", "At least 12 waves", "At least 50% of the stars"
function medalGoalText(g, tier) {
  const n = g[tier];
  if (typeof g.text === 'function') return g.text(n, tier);
  if (typeof g.text === 'string') return g.text;
  const fmt = medalFmt(g, n);
  if (g.key === 'time') return fmt + ' or faster';
  const w = g.word || g.key;
  if (g.more) return g.pct ? `At least ${fmt} of ${w}` : `At least ${fmt} ${medalPlural(n, w)}`;
  if (n === 0) return `No ${pluralWord(w)}`;
  if (n === 1) return `At most 1 ${w}`;
  return `${fmt} or fewer ${medalPlural(n, w)}`;
}
function medalFmt(g, v) {
  if (v == null || !isFinite(v)) return '–';
  if (g.show) return g.show(v);
  if (g.key === 'time' || g.fmt === 'time') { const s = Math.ceil(v - 1e-6); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  if (g.pct) return Math.round(v * 100) + '%';
  return String(Math.round(v * 100) / 100);
}
const medalMet = (g, v, n) => v != null && (g.more ? v >= n - 1e-9 : v <= n + 1e-9);
// how far a value is from a goal, in words: "52 seconds faster", "2 fewer Boings", "3 more waves", "20% more of the stars"
function medalGap(g, v, n) {
  if (g.gap) return g.gap(v, n);
  if (g.key === 'time' || g.fmt === 'time') { const s = Math.max(1, Math.ceil(v - n)); return s >= 90 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} faster` : `${s} second${s === 1 ? '' : 's'} faster`; }
  const w = g.word || g.key;
  if (g.pct) return `${Math.max(1, Math.ceil((n - v) * 100))}% more of ${w}`;
  const d = Math.max(1, Math.ceil(Math.abs(v - n) - 1e-9));
  return `${d} ${g.more ? 'more' : 'fewer'} ${medalPlural(d, w)}`;
}

// the medal a finished level earned: { tier: 0 none | 1 bronze | 2 silver | 3 gold, vals } (vals: the measured values)
function medalResult(spec, vals) {
  if (vals.noMedal) return { tier: 0, vals };
  const ok = t => spec.goals.every(g => g[t] == null || medalMet(g, vals[g.key], g[t]));
  return { tier: ok('gold') && ok('silver') ? 3 : ok('silver') ? 2 : 1, vals };
}
// at a level clear (js/main.js): the values, the medal, and the best medal kept for the world pages
function medalAtClear(i, rec) {
  const spec = medalSpec(i);
  if (!spec) return null;
  const def = G.level && G.level.def;
  const vals = { time: def && def.medalTime != null ? def.medalTime : rec.time, falls: rec.falls };
  // the built-in levels of Worlds 1-3: golf (strokes over par), block building (squashes and traps), Robo Pong (Robo's points)
  if (rec.golf) vals.overPar = rec.golf.strokes[0] + rec.golf.strokes[1] - rec.golf.pars[0] - rec.golf.pars[1];
  if (rec.build) vals.squashes = (rec.build.squashes || [0, 0]).concat(rec.build.pops || [0, 0]).reduce((a, b) => a + b, 0);
  if (rec.pong) { vals.robo = rec.pong.score[1]; if (!rec.pong.won) vals.noMedal = true; }
  Object.assign(vals, (G.lmode && hook('medalValues')) || {});
  const r = medalResult(spec, vals);
  const key = 'medal:' + LEVELS[i].name, prev = store.get(key) || 0;
  r.newBest = r.tier > prev;
  if (r.newBest) store.set(key, r.tier);
  return r;
}
const medalBest = i => (medalSpec(i) && store.get('medal:' + LEVELS[i].name)) || 0;

/* ---------- drawing ---------- */
const MEDAL_PAL = {
  gold: { rim: '#c98a0e', face: '#ffcf4a', hi: '#fff1b0', star: '#e9a514' },
  silver: { rim: '#8b95a5', face: '#e3e8ef', hi: '#ffffff', star: '#b4bdc9' },
  bronze: { rim: '#8f4f1f', face: '#e39a5c', hi: '#ffd2a8', star: '#c0743a' },
  off: { rim: '#3a3e46', face: '#545a65', hi: '#6a707b', star: '#454a54' },
};
const MEDAL_STAR = (() => {
  let d = '';
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 3.6 : 8; d += (k ? 'L' : 'M') + (20 + r * Math.cos(a)).toFixed(2) + ' ' + (34.5 + r * Math.sin(a)).toFixed(2); }
  return d + 'Z';
})();
// a medal on a ribbon (Pip's orange and Bo's blue); one not earned yet is grey with a little lock
function medalSVG(tier, got, size, cls) {
  const c = MEDAL_PAL[got ? tier : 'off'], ra = got ? '#ff6b4a' : '#4a4f58', rb = got ? '#5b95ff' : '#3f444d', rd = 'rgba(0,0,0,.22)';
  const lock = got ? '' : '<g transform="translate(29 43)"><circle r="7" fill="#22252b" stroke="#6a707b" stroke-width="1.5"/><rect x="-3.6" y="-1" width="7.2" height="5.4" rx="1.2" fill="#b4b9c4"/><path d="M-2.2 -1v-1.8a2.2 2.2 0 0 1 4.4 0v1.8" stroke="#b4b9c4" stroke-width="1.5" fill="none"/></g>';
  return `<svg class="medal ${got ? 'got' : 'off'}${cls ? ' ' + cls : ''}" width="${size}" height="${Math.round(size * 1.3)}" viewBox="0 0 40 52" role="img" aria-label="${MEDAL_NAMES[tier]}${got ? '' : ' (not earned yet)'}">`
    + `<path d="M8 0h9l7 20h-9z" fill="${ra}"/><path d="M8 0h9l1 3h-9z" fill="${rd}"/><path d="M23 0h9l-6 20h-9z" fill="${rb}"/><path d="M23 0h9l-1 3h-9z" fill="${rd}"/>`
    + `<circle cx="20" cy="34" r="16.5" fill="${c.rim}"/><circle cx="20" cy="34" r="13" fill="${c.face}"/><path d="${MEDAL_STAR}" fill="${c.star}"/>`
    + `<path d="M10.5 29 A10.5 10.5 0 0 1 17 24.2" stroke="${c.hi}" stroke-width="2.6" fill="none" stroke-linecap="round"/>${lock}</svg>`;
}

// the results card: the title, the three medals beside it, and the ladder (Gold at the top) with each goal ticked or not
function medalTitle(r) { return r && r.tier ? `${MEDAL_NAMES[MEDAL_TIERS[r.tier - 1]]} medal!` : ''; }
function medalShelfHTML(r) {
  const top = r.tier;
  return `<span class="medal-shelf">${MEDAL_TIERS.map((t, k) => medalSVG(t, k < top, k + 1 === top ? 48 : 38, k + 1 === top ? 'big' : '')).join('')}</span>`;
}
function medalLadderHTML(i, r) {
  const spec = medalSpec(i);
  if (!spec || !r) return '';
  const v = r.vals, next = r.tier < 3 ? MEDAL_TIERS[r.tier] : null;
  const chip = (g, t) => {
    const ok = medalMet(g, v[g.key], g[t]), txt = esc(medalGoalText(g, t));
    return ok ? `<span class="mchip ok"><span aria-hidden="true">✓</span> ${txt}</span>`
      : `<span class="mchip no">${txt} <span class="you">you ${esc(medalFmt(g, v[g.key]))}</span></span>`;
  };
  const rung = (t, k) => {
    const got = k < r.tier;
    const goals = t === 'bronze' ? (got ? `<span class="mchip ok"><span aria-hidden="true">✓</span> ${esc(spec.bronze || 'Finish the level')}</span>` : `<span class="mchip no">${esc(spec.bronze || 'Finish the level')}</span>`)
      : spec.goals.filter(g => g[t] != null).map(g => chip(g, t)).join('');
    const badge = got ? '<span class="mbadge"><span aria-hidden="true">✓</span> Earned</span>' : `<span class="mbadge">${t === next ? 'Next goal' : 'Locked'}</span>`;
    return `<div class="mrung ${t} ${got ? 'got' : 'off'}">${medalSVG(t, got, 36)}<span class="mnm">${MEDAL_NAMES[t]}</span><div class="mgoals">${goals}</div>${badge}</div>`;
  };
  let line;
  if (r.tier === 3) line = '<b>All three medals!</b> Every goal beaten.' + (LEVELS[i].noTime ? '' : ' Now beat your record time.');
  else if (r.tier === 0) line = `<b>No medal this time.</b> ${esc(spec.bronze || 'Finish the level')} for Bronze.`;
  else {
    const gaps = spec.goals.filter(g => g[next] != null && !medalMet(g, v[g.key], g[next])).map(g => medalGap(g, v[g.key], g[next]));
    line = `<b>${MEDAL_NAMES[next]} next:</b> ${esc(gaps.join(' and '))}.`;
  }
  return `<div class="medal-ladder">${MEDAL_TIERS.slice().reverse().map(t => rung(t, MEDAL_TIERS.indexOf(t))).join('')}</div><p class="medal-next">${line}</p>`;
}
// the ready card: one row with each medal's goals
function medalGoalsHTML(i) {
  const spec = medalSpec(i);
  if (!spec) return '';
  const best = medalBest(i);
  const row = t => {
    const words = t === 'bronze' ? (spec.bronze || 'Finish the level') : spec.goals.filter(g => g[t] != null).map((g, k) => { const w = medalGoalText(g, t); return k ? w.replace(/^(No|At least|At most|Every|Half) /, m => m.toLowerCase()) : w; }).join(', ');
    return `<span class="mg">${medalSVG(t, true, 18)}${esc(words)}</span>`;
  };
  const bestHTML = best ? `<span class="mg-best">Your best ${medalSVG(MEDAL_TIERS[best - 1], true, 22)}<b>${MEDAL_NAMES[MEDAL_TIERS[best - 1]]}</b></span>` : '';
  return `<div class="medal-goals"><span class="mg-hd">Medals</span>${MEDAL_TIERS.slice().reverse().map(row).join('')}${bestHTML}</div>`;
}

// the world map and world pages: how many levels have earned each medal (a Gold level counts for Silver and Bronze too)
function medalTallyHTML(levels) {
  const ls = levels.filter(i => medalSpec(i));
  if (!ls.length) return '';
  const n = MEDAL_TIERS.map((t, k) => ls.filter(i => medalBest(i) > k).length);
  return `<div class="medal-tally" aria-label="Medals: ${n[2]} gold, ${n[1]} silver, ${n[0]} bronze, out of ${ls.length} levels">${MEDAL_TIERS.slice().reverse().map(t => {
    const k = MEDAL_TIERS.indexOf(t);
    return `<span class="mt ${n[k] ? '' : 'none'}">${medalSVG(t, true, 20)}<b>${n[k]}</b><small>/${ls.length}</small></span>`;
  }).join('')}</div>`;
}

// a versus level's mark in a world tile's level dots: blue crossed swords (it never earns a medal)
const VERSUS_SWORDS = (() => {
  const one = '<path d="M2.5 2.5 L7 3.6 L17.2 13.8 L13.8 17.2 L3.6 7 Z" fill="#5b95ff"/><path d="M12.2 20.2 L20.2 12.2" stroke="#2f62c4" stroke-width="2.8" stroke-linecap="round"/>'
    + '<path d="M16 16 L20 20" stroke="#2f62c4" stroke-width="3" stroke-linecap="round"/><circle cx="21" cy="21" r="1.9" fill="#2f62c4"/>';
  return `<svg class="vs-swords" viewBox="0 0 24 24" aria-hidden="true">${one}<g transform="translate(24 0) scale(-1 1)">${one}</g></svg>`;
})();

// a team level's mark in a world tile's row: a little medal on a ribbon in its best medal, or an empty outline
function medalDotSVG(best) {
  if (best) return medalSVG(MEDAL_TIERS[best - 1], true, 14, 'mdot').replace(/<path d="M10\.5 29[^>]*>/, '');
  return '<svg class="medal mdot empty" width="14" height="18" viewBox="0 0 40 52" aria-hidden="true"><path d="M9.5 1.5h6.5l6 17h-6.5zM24 1.5h6.5l-5.5 17h-6.5z" fill="none" stroke="#7b818c" stroke-width="2.5" stroke-linejoin="round"/>'
    + '<circle cx="20" cy="34" r="15" fill="none" stroke="#7b818c" stroke-width="3"/></svg>';
}
