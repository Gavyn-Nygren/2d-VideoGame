#!/usr/bin/env node
// Wind-Up Train Ride sim: plays 24-1 with the computer at both jobs (or one made clumsy like a distracted person) and
// prints per-stretch times, clunks, stars, passengers and any stalls.
// Usage: node tools/w24/windtrain-sim.js [--seeds=1,2,3] [--noisy=0|1] [--clumsy=0|1] [--trace=2] [--max=900]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seeds = opt('seeds', '1').split(',').map(Number), noisy = +opt('noisy', 0), clumsy = +opt('clumsy', 0), trace = +opt('trace', 0), maxT = +opt('max', 900);
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
  for (const seed of seeds) {
    const r = await page.evaluate(({ seed, noisy, clumsy, trace, maxT }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      G.manual = true; G.cpuOn = [true, true];
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8 };
      P.CPU.filter = !noisy ? null : (p, out, dt) => {
        if (p.id !== clumsy) return out;
        if (nz.pause > 0) { nz.pause -= dt; return {}; }
        nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
        nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random() * 1; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
        if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0, jump: Math.random() < 0.3 }; }
        if (Math.random() < 0.3 * dt) out.act = 'tap';
        return out;
      };
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Wind-Up Train Ride'));
      const log = [];
      let n = 0, lastT = 0, ck = 0;
      while (n < maxT / P.DT && G.mode === 'play') {
        P.step(P.DT); n++;
        const st = G.mst;
        if (st.stats && st.stats.clunks > ck) { ck = st.stats.clunks; log.push(`  clunk r${G.room} t=${G.time.toFixed(1)} x=${st.tr.x | 0} plan=${P.MODES.windtrain.plan(st).why}`); }
        if (trace && n * P.DT - lastT >= trace) { lastT = n * P.DT; const pl = P.MODES.windtrain.plan(st); log.push(`  t=${G.time.toFixed(1)} r${G.room} ${st.state} nose=${st.tr.x | 0} v=${st.tr.v | 0} spring=${st.tr.spring.toFixed(2)} brake=${st.tr.brake} sw(${st.sw.x | 0},${st.sw.feet | 0} ${st.sw.ground}) plan=${pl.why} brk=${pl.brake} job=${pl.job ? pl.job.kind + '@' + (pl.job.x | 0) : '-'} rx=${pl.rx | 0} act=${pl.act}`); }
      }
      const st = G.mst, pl = P.MODES.windtrain.plan(st);
      return { mode: G.mode, t: G.time.toFixed(1), real: (n * P.DT).toFixed(0), room: G.room, stats: st.stats, stars: st.stars + '/' + st.starsAll, log, res: G.lmode.stats(),
        at: `nose=${st.tr.x | 0} v=${st.tr.v | 0} sw(${st.sw.x | 0},${st.sw.feet | 0}) plan=${pl.why} job=${pl.job ? pl.job.kind + '@' + (pl.job.x | 0) : '-'} rx=${pl.rx | 0}` };
    }, { seed, noisy, clumsy, trace, maxT });
    if (r.mode === 'play') bad++;
    console.log(`seed ${seed}: ${r.mode} t=${r.t} (sim ${r.real}s) room=${r.room} stars ${r.stars} clunks ${r.stats.clunks} pass ${r.stats.passengers} helps ${r.stats.helps} falls ${r.stats.falls} achoos ${r.stats.achoos} roomT ${r.stats.roomT.map(x => x && x.toFixed(1)).join(',')} ${r.mode === 'play' ? r.at : ''}`);
    if (r.log.length) console.log(r.log.join('\n'));
    console.log('  ' + JSON.stringify(r.res));
  }
  if (errors.length) { console.log('ERRORS', [...new Set(errors)].join('\n')); bad++; }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
