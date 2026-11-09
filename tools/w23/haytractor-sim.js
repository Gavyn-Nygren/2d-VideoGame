#!/usr/bin/env node
// Tractor & Trailer sim: plays 23-1 with the computer in both seats (or one made clumsy like a distracted person) and
// prints per-field times, items delivered, spills, misses, gold help and the medal.
// Usage: node tools/w23/haytractor-sim.js [--seeds=1,2,3] [--noisy=0|1] [--clumsy=0|1] [--trace=2]
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
      const P = window.__pipbo, G = P.G, M = P.MODES.haytractor;
      window.__seed(seed * 7919);
      G.manual = true; G.cpuOn = [true, true];
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8 };
      P.CPU.filter = !noisy ? null : (p, out, dt) => {
        if (p.id !== clumsy) return out;
        if (nz.pause > 0) { nz.pause -= dt; return {}; }
        nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
        nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random() * 1; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
        if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
        if (Math.random() < 0.15 * dt) out.act = 'tap';
        return out;
      };
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Tractor & Trailer'));
      const log = [];
      let n = 0, lastT = 0, sp = 0, room = 0, d0 = 0;
      while (n < 900 / P.DT && G.mode === 'play') {
        P.step(P.DT); n++;
        const st = G.mst;
        if (st.stats.spills > sp) { sp = st.stats.spills; log.push(`  spill f${G.room + 1} t=${G.time.toFixed(1)} s=${st.tr.s | 0} v=${st.tr.v | 0} stack=${st.stack.length}`); }
        if (G.room !== room) { log.push(`  field ${room + 1}: ${st.stats.roomT[room].toFixed(1)}s delivered ${st.delivered - d0}`); d0 = st.delivered; room = G.room; }
        if (trace && G.time - lastT >= trace) { lastT = G.time; const pl = M.plan(st); log.push(`  t=${G.time.toFixed(1)} f${G.room + 1} ${st.state} s=${st.tr.s | 0} v=${st.tr.v | 0} u=${st.cat.u | 0} stack=${st.stack.length} wob=${st.wob.toFixed(2)} items=${st.items.length} d=${pl.dWhy} c=${pl.cWhy} uW=${pl.uWant | 0}`); }
      }
      const st = G.mst;
      if (G.mode !== 'play') log.push(`  field ${room + 1}: ${(st.stats.roomT[room] || 0).toFixed(1)}s delivered ${st.delivered - d0}`);
      return { mode: G.mode, t: G.time.toFixed(1), room: G.room, stats: st.stats, del: st.delivered + '/' + st.totalAll, log, res: G.lmode.stats() };
    }, { seed, noisy, clumsy, trace });
    const s = r.stats;
    console.log(`seed ${seed}: ${r.mode} t=${r.t} field=${r.room + 1} delivered ${r.del} caught ${s.caught} scooped ${s.scooped} missed ${s.missed} spills ${s.spills} hard ${s.hard} stolen ${s.stolen} shooed ${s.shooed} helps ${s.helps} corn ${s.corn}`);
    console.log(r.log.join('\n'));
    console.log('  ' + JSON.stringify(r.res));
  }
  if (errors.length) console.log('ERRORS', [...new Set(errors)].join('\n'));
  await browser.close();
})();
