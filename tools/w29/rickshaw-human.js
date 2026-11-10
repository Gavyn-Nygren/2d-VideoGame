#!/usr/bin/env node
// Runaway Rickshaw: a rough "good person" pair, to check the medal rule. Both players use the computer's plan, but
// every press is seen through a reaction delay, and each sword swing is timed by eye (a random error per star).
// node tools/w29/rickshaw-human.js [--react=0.25] [--sd=0.07] [--seeds=1,2,3] [--mash=1]  (mash: the rider aims right but just mashes swing)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const seed of opt('seeds', '1,2,3').split(',').map(Number)) {
    const r = await page.evaluate(({ seed, react, sd, mash }) => {
      window.__seed && window.__seed(seed * 7919);
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'rickshaw'), M = P.MODES.rickshaw;
      G.manual = true; G.cpuOn = [true, true];
      const lines = [[], []], gauss = () => { let u = 0; for (let k = 0; k < 6; k++) u += Math.random(); return (u - 3) / Math.sqrt(0.5); };
      let star = null, pressAt = 0;
      P.CPU.filter = (p, out, dt) => {
        const st = G.mst, ln = lines[p.id];
        ln.push(Object.assign({}, out)); const lag = Math.round(react / dt);
        const old = ln.length > lag ? ln.shift() : {};
        if (!st) return old;
        if (p.id === st.steer) {
          // the steerer swerves late, but hops by eye: aiming for about 0.2 s before the wheels reach the low thing
          const o = Object.assign({}, old); delete o.act;
          const rk = st.rk, v = Math.max(120, rk.v), pl = M.plan(st);
          const ob = st.c.obs.find(q => q.st === 'up' && M.OB[q.kind].low && q.x + M.OB[q.kind].w / 2 > rk.x + M.S.front && (q.lane === 2 || Math.abs(rk.ly - q.lane) < 0.6));
          const cn = st.c.canals.find(q => !q.ramp && q.x + 14 > rk.x);
          for (const q of [ob, cn]) {
            if (!q) continue;
            const d = (q === cn ? q.x + 14 - rk.x : q.x - M.OB[q.kind].w / 2 - rk.x - M.S.front) / v;
            if (q.aim === undefined) q.aim = 0.2 + gauss() * sd;
            if (d < 1.2 && d <= q.aim && !q.pressed && !rk.air) { q.pressed = true; o.act = 'tap'; }
          }
          if (pl.hop && pl.sWhy === 'hopbao') o.act = old.act;
          return o;
        }
        // the sword rider: aim and duck late, swing by eye
        const o = Object.assign({}, old); delete o.act;
        const pl = M.plan(st);
        if (pl.star && pl.star !== star) { star = pl.star; pressAt = 0.09 + gauss() * sd; }
        if (mash) { if (Math.floor(G.time * 10) % 2 === 0) o.act = true; return o; }
        if (star && star.st === 'fly' && star.T - star.t <= pressAt && !star.pressed) { star.pressed = true; o.act = 'tap'; }
        return o;
      };
      P.loadLevel(i);
      let n = 0;
      while (G.mode === 'play' && n < 120 * 700) { P.step(P.DT); n++; }
      const st = G.mst, s = st.stats;
      return { mode: G.mode, t: +G.time.toFixed(1), bao: st.bao + '/' + st.totalAll, spills: s.spills, crashes: s.crashes, hits: s.hits, gates: s.gates, greats: s.greats, helps: s.helps, medal: M.stats()[3] && M.stats()[3].value };
    }, { seed, react: +opt('react', 0.25), sd: +opt('sd', 0.07), mash: +opt('mash', 0) });
    console.log('seed', seed, JSON.stringify(r));
  }
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
