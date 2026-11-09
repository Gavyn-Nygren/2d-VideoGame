#!/usr/bin/env node
// 23-4 Pie-Eating Contest: try to break it with scripted "people" (both sides, or one side against the computer).
//   node tools/w23/pieeat-break.js [--seeds=1,2,3] [--only=mash] [--v=1]
// Checks: no page errors, no NaN, the cheeks / plate / jar stay in range, every match ends, every round ends inside
// the round clock, the results tiles agree with the match, and how often each script wins.
// Scripts ('cpu:easy' = the computer brain at that skill):
//   idle      presses nothing
//   mash      a kid hammering the bite button as fast as they can (about 9 presses a second), ▲ now and then
//   mashBoth  hammers both buttons (about 8 presses a second each)
//   turbo     a turbo button on both: a press every other step (60 a second)
//   biteOnly  bites steadily (0.3 s) and never gulps
//   steady    bites steadily (0.3 s), gulps whenever the cheeks are full, ignoring the claps
//   kid       a calm kid: bites every 0.4-0.55 s, gulps when the cheeks hold 3+ aiming at the clap (about ±0.12 s,
//             a little late), forgets a clap 10% of the time, looks away now and then
//   kidSlow   a slower, younger kid: bites every 0.5-0.75 s, gulps aiming at the clap (about ±0.16 s), forgets 15%
//   react     a kid who waits for the ring to glow and then presses (0.25-0.35 s reaction), bites every 0.45 s
//   grownup   a good grown-up: bites every 0.29-0.33 s, gulps on the clap (about ±0.06 s) with 2+ in the cheeks
//   pro       a very good grown-up: bites every 0.25-0.28 s, gulps on the clap (about ±0.045 s) with 1+ in the cheeks
//   randomKid a little kid pressing at random: bite every 0.15-0.7 s, ▲ about once a second, any time
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seeds = opt('seeds', '1,2,3,4,5,6').split(',').map(Number), only = opt('only', null), verbose = +opt('v', 0);
const CASES = [
  ['both idle', 'idle', 'idle'],
  ['both mash', 'mash', 'mash'],
  ['turbo vs turbo', 'turbo', 'turbo'],
  ['biteOnly vs idle', 'biteOnly', 'idle'],
  ['kid vs kid', 'kid', 'kid'],
  ['idle vs cpu easy', 'idle', 'cpu:easy'],
  ['mash vs cpu easy', 'mash', 'cpu:easy'],
  ['mashBoth vs cpu easy', 'mashBoth', 'cpu:easy'],
  ['turbo vs cpu easy', 'turbo', 'cpu:easy'],
  ['steady vs cpu easy', 'steady', 'cpu:easy'],
  ['mash vs cpu normal', 'mash', 'cpu:normal'],
  ['mashBoth vs cpu normal', 'mashBoth', 'cpu:normal'],
  ['turbo vs cpu normal', 'turbo', 'cpu:normal'],
  ['steady vs cpu normal', 'steady', 'cpu:normal'],
  ['kid vs cpu easy', 'kid', 'cpu:easy'],
  ['cpu easy vs kid', 'cpu:easy', 'kid'],
  ['kidSlow vs cpu easy', 'kidSlow', 'cpu:easy'],
  ['react vs cpu easy', 'react', 'cpu:easy'],
  ['kid vs cpu normal', 'kid', 'cpu:normal'],
  ['grownup vs cpu normal', 'grownup', 'cpu:normal'],
  ['grownup vs cpu hard', 'grownup', 'cpu:hard'],
  ['pro vs cpu hard', 'pro', 'cpu:hard'],
  ['cpu hard vs pro', 'cpu:hard', 'pro'],
  ['randomKid vs cpu easy', 'randomKid', 'cpu:easy'],
  ['cpu easy vs randomKid', 'cpu:easy', 'randomKid'],
  ['randomKid vs cpu normal', 'randomKid', 'cpu:normal'],
  ['kid vs mash', 'kid', 'mash'],
  ['steady vs mash', 'steady', 'mash'],
  ['kid vs steady', 'kid', 'steady'],
  ['grownup vs steady', 'grownup', 'steady'],
  ['cpu normal vs cpu easy', 'cpu:normal', 'cpu:easy'],
  ['cpu easy vs cpu hard', 'cpu:easy', 'cpu:hard'],
  ['cpu hard vs cpu normal', 'cpu:hard', 'cpu:normal'],
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  let bad = 0;
  for (const [name, a, b] of CASES) {
    if (only && !only.split(',').some(o => name.includes(o))) continue;
    const tally = { w: [0, 0, 0], rw: [0, 0], simT: [], probs: [], rt: [], hics: [0, 0], perf: [0, 0], glug: [0, 0] };
    for (const seed of seeds) {
      const r = await page.evaluate(({ seed, scripts }) => {
        const P = window.__pipbo, G = P.G, DT = P.DT;
        window.__seed(seed * 104729);
        // the scripts' own randomness never touches the game's seeded Math.random
        const KS = [(seed * 2654435761 >>> 0) || 1, (seed * 40503 + 977 >>> 0) || 1]; let who = 0;
        const kr = () => { let x = KS[who]; for (let i = 0; i < 3; i++) { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; } KS[who] = x; return x / 4294967296; };
        const kg = () => (kr() + kr() + kr() - 1.5) / 0.5;
        G.manual = true;
        P.CPU.skillOf = scripts.map(s => (s.startsWith('cpu:') ? s.slice(4) : null));
        P.MODES.pieeat.testRound = 0; P.MODES.pieeat.testNoHelp = false;
        G.cpuOn = scripts.map(s => s.startsWith('cpu:'));
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pie-Eating Contest'));
        G.cpuOn = scripts.map(s => s.startsWith('cpu:'));
        G.introT = 0;
        const T = P.MODES.pieeat.test, Q = T.PIEEAT;
        const K = [{}, {}], probs = [], rts = [];
        let n = 0, lastPh = null;
        const prob = s => { if (probs.length < 6 && !probs.includes(s)) probs.push(s); };
        // a person "kid-like" eater: gap = [lo, hi] bite gap, sd = gulp timing spread, late = average lateness,
        // need = cheeks before a gulp, forget = chance to skip a clap, away = chance a second to look away
        const eater = (k, me, st, o) => {
          const out = { act: false, jump: false };
          k.biteT = (k.biteT || 0) + DT;
          if (k.away > 0) { k.away -= DT; return out; }
          if (o.away && kr() < o.away * DT) { k.away = 0.5 + kr() * 1.2; return out; }
          const per = T.per(st), ph = st.bph, nextN = Math.max(1, Math.floor(ph) + 1), toClap = (nextN - ph) * per;
          if (o.react) {
            // waits for the glow, then reacts
            const on = T.onBeat(st, me);
            if (on && !k.sawGlow && me.cheeks >= o.need) { k.sawGlow = true; k.gulpAt = st.rt + o.react[0] + kr() * (o.react[1] - o.react[0]); }
            if (!on) k.sawGlow = false;
          } else if (k.plan !== nextN && toClap < 0.5 && (me.cheeks >= o.need || (me.left <= 0 && me.cheeks > 0))) {
            k.plan = nextN;
            k.gulpAt = kr() < o.forget ? null : st.rt + toClap + o.late + kg() * o.sd;
          }
          if (k.gulpAt != null && st.rt >= k.gulpAt) { k.gulpAt = null; out.jump = true; }
          if (!k.gap) k.gap = o.gap[0] + kr() * (o.gap[1] - o.gap[0]);
          if (k.biteT >= k.gap && !out.jump && me.cheeks < Q.cap) { out.act = true; k.biteT = 0; k.gap = o.gap[0] + kr() * (o.gap[1] - o.gap[0]); }
          return out;
        };
        const PEOPLE = {
          kid: { gap: [0.4, 0.55], sd: 0.12, late: 0.04, need: 3, forget: 0.1, away: 0.05 },
          kidSlow: { gap: [0.5, 0.75], sd: 0.16, late: 0.06, need: 3, forget: 0.15, away: 0.08 },
          react: { gap: [0.42, 0.5], need: 2, react: [0.25, 0.35], away: 0.04 },
          grownup: { gap: [0.29, 0.33], sd: 0.06, late: 0.01, need: 2, forget: 0.02, away: 0 },
          pro: { gap: [0.25, 0.28], sd: 0.045, late: 0, need: 1, forget: 0, away: 0 },
        };
        while (G.mode === 'play' && n < 120 * 600) {
          const st = G.mst, m = G.match;
          for (const p of G.players) {
            const sc = scripts[p.id]; if (sc.startsWith('cpu:')) continue;
            who = p.id;
            const inp = p.input, me = st.pl && st.pl[p.id], k = K[p.id];
            const wasA = inp.act, wasJ = inp.jump;
            for (const key in inp) inp[key] = false;
            const live = m && m.phase === 'live' && me;
            if (sc === 'mash') { k.t = (k.t || 0) + DT; if (k.t > 0.11) { inp.act = !wasA; k.t = 0; } else inp.act = wasA && k.t < 0.05; inp.jump = kr() < 1.5 * DT * 2 ? true : false; }
            else if (sc === 'mashBoth') { k.t = (k.t || 0) + DT; k.u = (k.u || 0) + DT; if (k.t > 0.125) { inp.act = true; k.t = 0; } if (k.u > 0.125 + 0.03 * kr()) { inp.jump = true; k.u = 0; } }
            else if (sc === 'randomKid' && live) { k.t = (k.t || 0) - DT; if (k.t <= 0) { inp.act = true; k.t = 0.15 + kr() * 0.55; } if (kr() < 1.0 * DT) inp.jump = true; }
            else if (sc === 'turbo') { inp.act = n % 2 === 0; inp.jump = n % 2 === 1; }
            else if (sc === 'biteOnly' && live) { k.t = (k.t || 0) + DT; if (k.t >= 0.3) { inp.act = true; k.t = 0; } }
            else if (sc === 'steady' && live) { k.t = (k.t || 0) + DT; if (me.cheeks >= Q.cap || (me.left <= 0 && me.cheeks > 0)) { k.g = (k.g || 0) + DT; if (k.g > 0.15) { inp.jump = true; k.g = 0; } } else if (k.t >= 0.3) { inp.act = true; k.t = 0; } }
            else if (PEOPLE[sc] && live) { const o = eater(k, me, st, PEOPLE[sc]); inp.act = o.act; inp.jump = o.jump; }
            if (!live && PEOPLE[sc]) { K[p.id] = {}; }
            if (inp.act && !wasA) { p.pendingAct = true; p.actAge = 0; }
            if (inp.jump && !wasJ) p.pendingJump = true;
            p.prevAct = inp.act; p.prevJump = inp.jump;
          }
          P.step(DT); n++;
          if (st.pl && m && m.phase === 'live') for (const E of st.pl) {
            for (const key of ['eaten', 'cheeks', 'left', 'H', 'hicT', 'gulpT', 'swapT']) if (!isFinite(E[key])) prob('NaN ' + key);
            if (E.cheeks < 0 || E.cheeks > Q.cap) prob('cheeks ' + E.cheeks);
            if (E.left < 0 || E.left > st.R.bites) prob('left ' + E.left);
            if (E.H < 0 || E.H > 1) prob('jar ' + E.H);
            if (E.eaten > st.goal) prob('ate more than the goal');
            if (E.pie >= st.R.pies) prob('pie index ' + E.pie);
          }
          if (m && m.phase === 'live' && m.roundT > 60.5) prob('round over 60 s');
          if (m && m.phase === 'end' && lastPh !== 'end') rts.push(+st.rt.toFixed(1));
          lastPh = m && m.phase;
        }
        const s = G.mst.stat, res = G.results[G.levelIndex];
        // the results tiles must agree with the match
        if (res && res.stats) {
          const rw = res.stats.find(x => x.label === 'Rounds won');
          if (!rw || rw.values.join('-') !== G.match.wins.join('-')) prob('results tile rounds ' + (rw && rw.values.join('-')) + ' vs ' + G.match.wins.join('-'));
        }
        return { done: G.mode !== 'play', wins: G.match.wins.slice(), simT: Math.round(n * DT), probs, rts, hics: s.hics.slice(), perf: s.perfect.slice(), glug: s.glugs.slice(),
          hist: G.match.history.map(h => h.winner + (h.tiebreak ? 't' : '') + ':' + h.reason + '@' + h.secs).join(' | ') };
      }, { seed, scripts: [a, b] });
      if (!r.done) r.probs.push('match never ended');
      tally.w[r.wins[0] > r.wins[1] ? 0 : r.wins[1] > r.wins[0] ? 1 : 2]++; tally.simT.push(r.simT); tally.rt.push(...r.rts);
      tally.rw[0] += r.wins[0]; tally.rw[1] += r.wins[1];
      for (const k of ['hics', 'perf', 'glug']) for (const i of [0, 1]) tally[k][i] += r[k][i];
      if (verbose) console.log('   s' + seed + ' ' + r.wins.join('-') + '  ' + r.hist);
      if (r.probs.length) tally.probs.push('s' + seed + ': ' + r.probs.join('; '));
    }
    const avg = tally.rt.length ? (tally.rt.reduce((x, y) => x + y, 0) / tally.rt.length).toFixed(0) : '-';
    console.log(`${name.padEnd(26)} matches Pip ${tally.w[0]} Bo ${tally.w[1]} draw ${tally.w[2]} | rounds ${tally.rw.join('-')} | avg round ${avg} s, match ~${Math.round(tally.simT.reduce((x, y) => x + y, 0) / tally.simT.length)} s | GULP! ${tally.perf.join('/')} glug ${tally.glug.join('/')} hic ${tally.hics.join('/')}` + (tally.probs.length ? '\n   PROBLEMS ' + tally.probs.join(' | ') : ''));
    if (tally.probs.length) bad++;
  }
  console.log(errors.length ? 'PAGE ERRORS\n' + errors.slice(0, 5).join('\n') : 'no page errors');
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
