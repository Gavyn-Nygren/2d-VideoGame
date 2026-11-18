#!/usr/bin/env node
// 41-1 Carry It Together: play pages with computer players (drawing off: K3D.noRender) and report how each went.
// Usage: node tools/w41/play.js <page 1-4 | all> [--who=pair|noisy|kid|idle] [--clumsy=0|1] [--max=240] [--seeds=1,2]
//        [--trace=2]   prints both players, the pencil and the bubbles every 2 simulated seconds
//   pair   the computer plays both                     every page and the whole level must clear
//   noisy  one side (--clumsy, default Pip) is a distracted person: stops, wanders, lets go now and then
//   kid    one side (--clumsy) is the computer a whole second late on every press (a one-second-slow kid)
//   idle   Pip presses nothing: the computer must never clear the level alone
// "all" plays the whole level from page 1; a page number starts on that page.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const which = args.find(a => !a.startsWith('--')) || 'all';
const who = opt('who', 'pair'), maxT = +opt('max', which === 'all' ? 600 : 240), seeds = opt('seeds', '1').split(',').map(Number);
const clumsy = +opt('clumsy', 0), trace = +opt('trace', 0);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const pages = which === 'all' ? [0] : [+which - 1];
  for (const pg of pages) for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ pg, who, maxT, seed, clumsy, trace, all }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D;
      const i = P.LEVELS.findIndex(l => l.mode === 'popcarry');
      window.__seed(seed * 7919); window.__inStep = true;
      G.manual = true; K3D.noRender = true;
      P.CPU.errs.clear(); P.CPU.skillOf = [null, null];
      G.cpuOn = who === 'idle' ? [false, true] : [true, true];
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wnext: 5 + Math.random() * 6, ax: 0, ay: 0 };
      const late = [];
      P.CPU.filter = (p, out, dt) => {
        if (p.id !== clumsy) return out;
        if (who === 'noisy') {
          if (nz.pause > 0) { nz.pause -= dt; return {}; }
          if ((nz.next -= dt) <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
          if ((nz.wnext -= dt) <= 0) { nz.wander = 0.4 + Math.random() * 0.9; const a = Math.random() * 6.28; nz.ax = Math.cos(a); nz.ay = Math.sin(a); nz.wnext = 5 + Math.random() * 8; }
          if (nz.wander > 0) { nz.wander -= dt; return { ax: nz.ax, ay: nz.ay }; }
          if (Math.random() < 0.06 * dt) out = Object.assign({}, out, { act: true });
          return out;
        }
        if (who === 'kid') { late.push(out); return late.length > 120 ? late.shift() : {}; }
        return out;
      };
      delete G.results[i];
      P.loadLevel(i);
      for (let k = 0; k < pg; k++) P.nextRoom();
      window.__inStep = false;
      const st = () => G.mst;
      const steps = Math.round(maxT / P.DT), every = trace ? Math.round(trace / P.DT) : 0, lines = [];
      let n = 0; const room0 = G.room, roomT = [];
      let t0 = 0;
      while (n < steps && G.mode === 'play' && (all || G.room === room0)) {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play' && (all || G.room === room0); k++, n++) {
          window.__inStep = true;
          if (who === 'idle') { const p0 = G.players[0]; for (const key in p0.input) p0.input[key] = false; }
          const r0 = G.room;
          P.step(P.DT);
          window.__inStep = false;
          if (G.room !== r0) { roomT.push(+(n * P.DT - t0).toFixed(1)); t0 = n * P.DT; }
          if (every && n % every === 0) {
            const s = st(), f = q => q.x.toFixed(1) + ',' + q.z.toFixed(1) + (q.y > 0.05 ? '^' + q.y.toFixed(1) : '');
            lines.push(`${(n * P.DT).toFixed(1)}s p${s.k + 1} s=${s.s.toFixed(1)} hold ${s.hold}  Pip ${f(G.players[0].b3)}  Bo ${f(G.players[1].b3)}  pen ${s.pen.x.toFixed(1)},${s.pen.z.toFixed(1)} a${(s.pen.a * 57.3).toFixed(0)}  drops ${s.stats.drops} bumps ${s.stats.bumps}${s.train ? " train " + (s.train.on ? s.train.x.toFixed(1) : s.train.warn ? "warn" : "-") : ""}${s.lines.map(l => ' ' + l.id + ':' + l.n + '/' + l.dots.length).join('')} ${P.CPU.bubbles.map(b => (b && b.t > 0 ? '"' + b.text + '"' : '')).join(' ')}`);
          }
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const s = st();
      return { mode: G.mode, simT: +(n * P.DT).toFixed(1), room: G.room, roomT, cleared: !!G.results[i], res: G.results[i] ? { time: Math.round(G.results[i].time), medal: G.results[i].medal && G.results[i].medal.tier } : null,
        drops: s.stats.drops, bumps: s.stats.bumps, lines: s.stats.lines, why: s.stats.why, cpuErrs: [...P.CPU.errs], trace: lines, s: s.s, k: s.k };
    }, { pg, who, maxT, seed, clumsy, trace, all: which === 'all' });
    if (r.trace.length) console.log(r.trace.join('\n'));
    const label = which === 'all' ? 'level' : 'page ' + (pg + 1);
    const done = which === 'all' ? r.cleared : r.room > pg || r.cleared;
    console.log(`${label} ${who}${who === 'noisy' || who === 'kid' ? '(' + ['Pip', 'Bo'][clumsy] + ')' : ''} s${seed}: ${done ? 'CLEARED' : 'NOT DONE (page ' + (r.k + 1) + ' at s=' + r.s.toFixed(1) + ')'} in ${r.simT}s  pages ${r.roomT.join(' / ')}  drops ${r.drops} ${r.why.join(',')}  bumps ${r.bumps}  lines ${r.lines}${r.res ? ' medal ' + r.res.medal : ''}${r.cpuErrs.length ? ' CPU ERR ' + r.cpuErrs : ''}${errors.length ? ' PAGE ERR ' + errors.slice(0, 3).join(' | ').slice(0, 400) : ''}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
