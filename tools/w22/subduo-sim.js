#!/usr/bin/env node
// Submarine Duo sim: plays 22-1 with the computer at both seats (or one made clumsy like a distracted person) and prints
// per-stretch times, bonks, pearls and any stalls. Usage: node tools/w22/subduo-sim.js [--seeds=1,2,3] [--noisy=0|1] [--clumsy=0|1] [--trace=2]
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
        if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0, up: Math.random() < 0.5 }; }
        if (Math.random() < 0.15 * dt) out.act = 'tap';
        return out;
      };
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Submarine Duo'));
      const log = [];
      let n = 0, lastT = 0, bk = 0;
      while (n < 900 / P.DT && G.mode === 'play') {
        P.step(P.DT); n++;
        const st = G.mst;
        if (st.stats && st.stats.bonks > bk) { bk = st.stats.bonks; log.push(`  bonk r${G.room} t=${G.time.toFixed(1)} x=${st.sub.x | 0} y=${st.sub.y | 0} v=${Math.hypot(st.sub.vx, st.sub.vy) | 0} plan=${P.MODES.subduo.plan(st).why}`); }
        if (trace && G.time - lastT >= trace) { lastT = G.time; const pl = P.MODES.subduo.plan(st); log.push(`  t=${G.time.toFixed(1)} r${G.room} ${st.state} sub(${st.sub.x | 0},${st.sub.y | 0}) v(${st.sub.vx | 0},${st.sub.vy | 0}) claw(${st.claw.x | 0},${st.claw.y | 0}) hold=${st.claw.hold ? st.claw.hold.kind : '-'} plan=${pl.why} s(${pl.sx | 0},${pl.sy | 0}) t(${pl.tx | 0},${pl.ty | 0})`); }
      }
      const st = G.mst;
      return { mode: G.mode, t: G.time.toFixed(1), room: G.room, stats: st.stats, pearls: st.pearls + '/' + st.pearlsAll, log, res: G.lmode.stats(), at: `sub(${st.sub.x | 0},${st.sub.y | 0}) plan=${P.MODES.subduo.plan(st).why}` };
    }, { seed, noisy, clumsy, trace });
    console.log(`seed ${seed}: ${r.mode} t=${r.t} room=${r.room} pearls ${r.pearls} bonks ${r.stats.bonks} helps ${r.stats.helps} roomT ${r.stats.roomT.map(x => x && x.toFixed(1)).join(',')} ${r.mode === 'play' ? r.at : ''}`);
    console.log(r.log.join('\n'));
    console.log('  ' + JSON.stringify(r.res));
  }
  if (errors.length) console.log('ERRORS', [...new Set(errors)].join('\n'));
  await browser.close();
})();
