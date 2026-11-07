#!/usr/bin/env node
// 18-3 Tide Pool Dig: a bot run with a per-room report (and optional screenshots), for tuning.
// Usage: node tools/w18/tidedig-run.js [--seed=1] [--who=pair|noisy|idle] [--clumsy=0] [--trace=5] [--shots=10,40,...]
//        [--size=1280x800] [--max=600]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const seed = +opt('seed', 1), who = opt('who', 'pair'), clumsy = +opt('clumsy', 0), trace = +opt('trace', 0), maxT = +opt('max', 600);
const shots = opt('shots', '').split(',').filter(Boolean).map(Number);
const [vw, vh] = opt('size', '1280x800').split('x').map(Number);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: vw, height: vh } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1);
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const idx = await page.evaluate(() => window.__pipbo.LEVELS.findIndex(l => l.name === 'Tide Pool Dig'));
  await page.evaluate(({ idx, seed, who, clumsy }) => {
    const P = window.__pipbo, G = P.G;
    window.__seed(seed * 7919);
    G.manual = true;
    G.cpuOn = who === 'idle' ? [false, true] : [true, true];
    const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8 };
    P.CPU.filter = who !== 'noisy' ? null : (p, out, dt) => {
      if (p.id !== clumsy) return out;
      if (nz.pause > 0) { nz.pause -= dt; return {}; }
      nz.next -= dt;
      if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
      nz.wnext -= dt;
      if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random() * 1; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
      if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
      if (Math.random() < 0.15 * dt) out.jump = true;
      if (Math.random() < 0.1 * dt) out.act = true;
      return out;
    };
    P.loadLevel(idx);
    window.__log = [];
  }, { idx, seed, who, clumsy });
  let t = 0, lastRoom = 0, shotI = 0;
  const DT = 1 / 120;
  while (t < maxT) {
    const r = await page.evaluate(({ n, trace }) => {
      const P = window.__pipbo, G = P.G, out = [];
      for (let k = 0; k < n && G.mode === 'play'; k++) {
        P.step(P.DT);
        const st = G.mst;
        if (trace && Math.round(G.time / P.DT) % Math.round(trace / P.DT) === 0 && st.holes) {
          const pl = P.MODES.tidedig.test.tidedigPlan(st);
          out.push(`${G.time.toFixed(1)}s r${G.room} jobs ${pl.jobs.map(j => j.k).join('/')} holes ${st.holes.map(h => h.depth + '/' + h.chest.depth + ' w' + Math.round(h.water)).join(' ')} wave ${st.wave.ph} crabs ${st.crabs.length} coins ${st.coins.length} stash ${st.stats.stash} wall ${st.wall ? st.wall.lv : '-'}  P ${Math.round(G.players[0].x)},${Math.round(G.players[0].y)} B ${Math.round(G.players[1].x)},${Math.round(G.players[1].y)}`);
        }
      }
      const st = G.mst;
      return { mode: G.mode, time: G.time, room: G.room, out, roomT: st.stats && st.stats.roomT.slice(), stats: st.stats && JSON.parse(JSON.stringify(st.stats)), res: G.results[G.levelIndex] || null };
    }, { n: 120, trace });
    t = r.time;
    for (const l of r.out) console.log(l);
    if (r.room !== lastRoom) { console.log(`-- room ${lastRoom + 1} done at ${t.toFixed(1)}s (room time ${r.roomT[lastRoom] && r.roomT[lastRoom].toFixed(1)}) stash ${r.stats.stash} steals ${r.stats.steals} floods ${r.stats.floods} gold ${r.stats.gold}`); lastRoom = r.room; }
    if (shotI < shots.length && t >= shots[shotI]) {
      await page.evaluate(() => { const P = window.__pipbo; P.G.manual = true; });
      await page.waitForTimeout(60);
      await page.screenshot({ path: path.resolve(__dirname, '..', '..', 'build', 'tidedig-' + Math.round(t) + 's.png') });
      console.log('shot at', t.toFixed(1));
      shotI++;
    }
    if (r.mode !== 'play') {
      console.log('END', r.mode, 'time', r.res && r.res.time && r.res.time.toFixed(1), 'roomT', r.roomT.map(x => x.toFixed(0)).join(','));
      console.log(JSON.stringify(r.res && r.res.stats));
      console.log(JSON.stringify(r.stats));
      break;
    }
  }
  if (t >= maxT) console.log('NOT CLEARED by', maxT, 's');
  if (errors.length) console.log('ERRORS:\n' + errors.slice(0, 10).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
