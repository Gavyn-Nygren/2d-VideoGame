#!/usr/bin/env node
// Runaway Pigs sim: plays 23-2 with the computer at both seats (or one made clumsy / slow like a person) and prints
// per-chase times, wrong turns, claps, gold help and the medal.
// Usage: node tools/w23/pigherd-sim.js [--seeds=1,2,3] [--noisy=0|1] [--clumsy=0|1] [--slow=0|1] [--trace=2] [--room=0]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seeds = opt('seeds', '1').split(',').map(Number), noisy = +opt('noisy', 0), clumsy = +opt('clumsy', 0), slow = +opt('slow', 0), trace = +opt('trace', 0), room0 = +opt('room', 0);
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
  const all = [];
  for (const seed of seeds) {
    const r = await page.evaluate(({ seed, noisy, clumsy, slow, trace, room0 }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      G.manual = true; G.cpuOn = [true, true];
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8, lag: [] };
      P.CPU.filter = !(noisy || slow) ? null : (p, out, dt) => {
        if (p.id !== clumsy) return out;
        if (slow) { nz.lag.push(Object.assign({}, out)); const d = Math.round(0.35 / P.DT); if (nz.lag.length > d) out = nz.lag.shift(); else out = {}; if (Math.random() < 0.25 * dt) nz.pause = 0.6 + Math.random() * 1.2; }
        if (nz.pause > 0) { nz.pause -= dt; return {}; }
        if (noisy) {
          nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
          nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random() * 1; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
          if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0, up: Math.random() < 0.5 }; }
          if (Math.random() < 0.15 * dt) out.act = true;
        }
        return out;
      };
      const i = P.LEVELS.findIndex(l => l.name === 'Runaway Pigs');
      P.loadLevel(i);
      for (let k = 0; k < room0; k++) P.nextRoom();
      const log = [];
      let n = 0, lastT = 0, wr = 0, gl = 0;
      const M = P.MODES.pigherd;
      while (n < 900 / P.DT && G.mode === 'play') {
        P.step(P.DT); n++;
        const st = G.mst;
        if (st.stats.wrong > wr) { wr = st.stats.wrong; log.push(`  wrong r${G.room} t=${G.time.toFixed(1)} ${st.news ? st.news.s : ''}`); }
        if (st.goldUsed.length > gl) { gl = st.goldUsed.length; log.push(`  GOLD r${G.room} t=${G.time.toFixed(1)} ${st.goldUsed[gl - 1]}`); }
        if (trace && G.time - lastT >= trace && st.walls) {
          lastT = G.time;
          const pl = M.plan(st), j = pl.job;
          log.push(`  t=${G.time.toFixed(1)} r${G.room} ${st.state} job=${j ? j.kind + '@' + (j.x | 0) : '-'} block=${pl.block ? pl.block.id : '-'} herd n${pl.herd.n} x${pl.herd.minX | 0}-${pl.herd.maxX | 0} pigs=${st.pigs.map(q => q.state[0] + (q.x | 0) + ',' + (q.y | 0)).join(' ')} pip=${(G.players[0].x + st.camX) | 0},${G.players[0].y | 0} bo=${(G.players[1].x + st.camX) | 0},${G.players[1].y | 0}`);
        }
      }
      const st = G.mst;
      return { mode: G.mode, t: G.time.toFixed(1), room: G.room, stats: st.stats, gold: st.goldUsed, medal: M.medalOf(st), log, res: G.lmode.stats() };
    }, { seed, noisy, clumsy, slow, trace, room0 });
    const s = r.stats;
    all.push(+r.t);
    console.log(`seed ${seed}: ${r.mode} t=${r.t} room=${r.room} wrong ${s.wrong} penned ${s.penned}/${s.pigsAll} claps ${s.claps} gates ${s.gates} chaseT ${s.chaseT.map(x => x && x.toFixed(1)).join(',')} gold [${r.gold}] medal ${r.medal}`);
    if (r.log.length) console.log(r.log.slice(0, 120).join('\n'));
  }
  if (all.length > 1) console.log('mean t', (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1));
  if (errors.length) console.log('ERRORS', [...new Set(errors)].join('\n'));
  await browser.close();
})();
