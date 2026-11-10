#!/usr/bin/env node
// 29-2 Shadow Sneak chases: in every post of every stretch, the computer sneaker is made to dash out of the start
// gatehouse until it is spotted, then the computer pair plays the chase. Prints how each chase ended (escaped / caught),
// how long it lasted, and the slides, hops and bonks in it. --noslide: the sneaker never slides; --nothrow: no bonks.
// Usage: node tools/w29/shadowsneak-chase.js [--noslide] [--nothrow] [--rush=0.6,1.2,2]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(a.indexOf('=') + 1) : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = await page.evaluate(({ noslide, nothrow, rushes, dists }) => {
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'shadowsneak'), rows = [];
    G.manual = true; G.cpuOn = [true, true];
    let tot = { n: 0, esc: 0, caught: 0, dur: 0, slides: 0, hops: 0, bonks: 0 };
    for (let room = 0; room < 4; room++) for (let post = 0; post < 3; post++) for (const rush of rushes.concat(dists.map(d => -d))) {
      P.loadLevel(i); for (let r = 0; r < room; r++) P.nextRoom(); G.introT = 0;
      const st0 = G.mst;
      // skip to the post: open the gates before it and put both through
      for (let k = 0; k < post; k++) { const q = st0.P; q.open = true; q.openT = 1; st0.sn.x = q.gate + 40; st0.th.x = q.gate + 40; P.step(P.DT); }
      const st = G.mst, s0 = Object.assign({}, st.stats);
      let t = 0;
      if (rush < 0) { const g = st.P.guards.find(q => q.state !== 'sleep'); if (!g) continue; st.sn.x = clamp(g.x + g.face * -rush, st.P.x0 + 20, st.P.gate - 30); st.sn.hidden = false; st.sn.zone = null; }
      P.CPU.filter = (p, o) => {
        if (p.id === st.sneak && !st.chase && st.stats.spotted === s0.spotted) return t < Math.abs(rush) || rush < 0 ? {} : { right: true, act: true };
        if (p.id === st.sneak && noslide) o.down = false;
        if (p.id === st.thr && nothrow && st.chase) o.act = false;
        return o;
      };
      let n = 0, t0 = -1, tl = -1, end = '';
      while (n < 120 * 40 && G.mode === 'play') {
        P.step(P.DT); n++; t += P.DT;
        if (st.chase && t0 < 0) t0 = t;
        if (st.chase && st.chase.lose != null && tl < 0) tl = t;
        if (t0 >= 0 && !st.chase) { end = st.stats.caught > s0.caught ? 'caught' : 'escaped'; break; }
      }
      if (!end) { rows.push('stretch ' + (room + 1) + ' post ' + (post + 1) + ' rush ' + rush + ': ' + (t0 < 0 ? 'never spotted' : 'chase still going')); continue; }
      const d = t - t0, run = (tl < 0 ? t : tl) - t0, sl = st.stats.slides - s0.slides, hp = st.stats.hops - s0.hops, bk = st.stats.bonks - s0.bonks;
      tot.n++; tot[end === 'caught' ? 'caught' : 'esc']++; tot.dur += d; tot.run = (tot.run || 0) + run; tot.slides += sl; tot.hops += hp; tot.bonks += bk;
      rows.push('stretch ' + (room + 1) + ' post ' + (post + 1) + ' rush ' + rush + ': ' + end + ' after ' + d.toFixed(1) + 's (run ' + run.toFixed(1) + 's) at ' + Math.round(st.sn.x - st.P.x0) + '  slides ' + sl + ' hops ' + hp + ' bonks ' + bk);
    }
    P.CPU.filter = null;
    rows.push('TOTAL ' + tot.n + ' chases: escaped ' + tot.esc + ', caught ' + tot.caught + ', avg ' + (tot.dur / Math.max(1, tot.n)).toFixed(1) + 's (running ' + ((tot.run || 0) / Math.max(1, tot.n)).toFixed(1) + 's), slides ' + tot.slides + ', hops over guards ' + tot.hops + ', bonks ' + tot.bonks);
    return rows;
  }, { dists: opt('dist', '60,120,170').split(',').filter(Boolean).map(Number), noslide: args.includes('--noslide'), nothrow: args.includes('--nothrow'), rushes: opt('rush', '0.6,2').split(',').map(Number) });
  console.log(out.join('\n'));
  console.log(errs.length ? 'ERRORS ' + errs.slice(0, 5).join(' | ') : 'no page errors');
  await browser.close();
})();
