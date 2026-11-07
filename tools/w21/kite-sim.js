#!/usr/bin/env node
// Kite Tandem sim: plays 21-2 with the computer at both seats (or a clumsy one) and prints per-stretch details.
// Usage: node tools/w21/kite-sim.js [--seeds=1,2,3] [--noisy=0|1] [--clumsy=0|1] [--trace=1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seeds = opt('seeds', '1').split(',').map(Number), noisy = +opt('noisy', 0), clumsy = +opt('clumsy', 0), trace = +opt('trace', 0);
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
  for (const seed of seeds) {
    const r = await page.evaluate(({ seed, noisy, clumsy, trace }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      G.manual = true; G.cpuOn = [true, true];
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8 };
      P.CPU.filter = !noisy ? null : (p, out, dt) => {
        if (p.id !== clumsy) return out;
        if (nz.pause > 0) { nz.pause -= dt; return {}; }
        nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
        nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random() * 1; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
        if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
        if (Math.random() < 0.15 * dt) out.jump = true; if (Math.random() < 0.1 * dt) out.act = true;
        return out;
      };
      const i = P.LEVELS.findIndex(l => l.name === 'Kite Tandem');
      P.loadLevel(i);
      const log = [];
      let n = 0, lastT = 0, room = 0, tg = 0;
      while (n < 600 / P.DT && G.mode === 'play') {
        P.step(P.DT); n++;
        const st = G.mst;
        if (st.stats && st.stats.tangles > tg) { tg = st.stats.tangles; const o = st.c.obs.filter(o => st.kx > o.x0 - 60 && st.kx < o.x1 + 60).map(o => o.kind).join('/'); log.push(`  tangle r${G.room} t=${G.time.toFixed(1)} kx=${st.kx | 0} kh=${(P.MODES.kite.gy(st, st.kx) - st.ky) | 0} near=${o} L=${st.L | 0} up=${st.up | 0}`); }
        if (G.room !== room) { room = G.room; }
        if (trace && G.time - lastT >= trace) { lastT = G.time; log.push(`  t=${G.time.toFixed(1)} r${G.room} ${st.state} rx=${st.rx | 0} vx=${st.vx | 0} kx=${st.kx | 0} kh=${(P.MODES.kite.gy(st, st.kx) - st.ky) | 0} L=${st.L | 0} th=${st.th.toFixed(2)} up=${st.up | 0}`); }
      }
      const st = G.mst;
      return { mode: G.mode, t: G.time.toFixed(1), room: G.room, stats: st.stats, stars: st.stars + '/' + st.starsAll, rings: st.rings + '/' + st.ringsAll, log, res: G.lmode.stats() };
    }, { seed, noisy, clumsy, trace });
    console.log(`seed ${seed}: ${r.mode} t=${r.t} room=${r.room} stars ${r.stars} rings ${r.rings} tangles ${r.stats.tangles} oops ${r.stats.oops} helps ${r.stats.helps} roomT ${r.stats.roomT.map(x => x && x.toFixed(1)).join(',')}`);
    console.log(r.log.join('\n'));
    console.log('  ' + JSON.stringify(r.res));
  }
  if (errors.length) console.log('ERRORS', errors.join('\n'));
  await browser.close();
})();
