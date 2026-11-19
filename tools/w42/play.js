#!/usr/bin/env node
// 42-1 Runaway Coaster: ride the whole level with computer riders (drawing off: K3D.noRender) and report how it went.
// Usage: node tools/w42/play.js [--who=pair|noisy|kid|idle] [--clumsy=0|1] [--max=400] [--seeds=1,2] [--trace=5]
//   pair   the computer rides both seats                      the level must finish with Gold-level tickets and few rattles
//   noisy  one seat (--clumsy, default Pip) is a distracted person: stops pressing now and then, mashes a lean
//   kid    one seat is the computer a whole half second late on every press
//   idle   Pip presses nothing: the ride never finishes (the brakes need both), it loops at the station
// Prints tickets, rattles, breakdowns, switches, brake loops, photos, the medal, and every Rattle's reason.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const who = opt('who', 'pair'), maxT = +opt('max', 400), seeds = opt('seeds', '1').split(',').map(Number);
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
  for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ who, maxT, seed, clumsy, trace }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D;
      const i = P.LEVELS.findIndex(l => l.mode === 'parkcoaster');
      window.__seed(seed * 7919);
      G.manual = true; K3D.noRender = true;
      P.CPU.errs.clear(); P.CPU.skillOf = [null, null];
      G.cpuOn = who === 'idle' ? [false, true] : [true, true];
      const nz = { pause: 0, next: 3 + Math.random() * 6 }, late = [];
      P.CPU.filter = (p, out, dt) => {
        if (p.id !== clumsy) return out;
        if (who === 'noisy') {
          if (nz.pause > 0) { nz.pause -= dt; return {}; }
          if ((nz.next -= dt) <= 0) { nz.pause = 0.5 + Math.random() * 1.5; nz.next = 5 + Math.random() * 8; }
          return out;
        }
        if (who === 'kid') { late.push(out); return late.length > 60 ? late.shift() : {}; }
        return out;
      };
      delete G.results[i];
      P.loadLevel(i);
      const steps = Math.round(maxT / P.DT), every = trace ? Math.round(trace / P.DT) : 0, lines = [], whys = [];
      let n = 0, lastR = 0;
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          window.__inStep = true;
          if (who === 'idle') { const p0 = G.players[0]; for (const key in p0.input) p0.input[key] = false; }
          P.step(P.DT);
          window.__inStep = false;
          const s = G.mst;
          if (s.rattles > lastR) { lastR = s.rattles; whys.push(s.lastWhy + '@' + Math.round(s.s)); }
          if (every && n % every === 0) lines.push(`${(n * P.DT).toFixed(1)}s ${s.phase} s=${s.s.toFixed(1)} v=${s.v.toFixed(1)} tilt ${s.tilt.toFixed(2)} bolts ${s.bolts} tickets ${s.tickets} ${P.CPU.bubbles.map(b => (b && b.t > 0 ? '"' + b.text + '"' : '')).join(' ')}`);
        }
        await new Promise(r => setTimeout(r, 0));
      }
      const s = G.mst, res = G.results[i];
      return { mode: G.mode, simT: +(n * P.DT).toFixed(1), phase: s.phase, s: s.s, cleared: !!res, medal: res && res.medal && res.medal.tier,
        tickets: s.tickets, max: PARKCOASTER.ticketsMax(), rattles: s.rattles, bds: s.breakdowns, sw: s.switches, loops: s.brakeLoops, photos: s.photos, bends: s.bendsGood, hops: s.hops,
        whys, cpuErrs: [...P.CPU.errs], trace: lines };
    }, { who, maxT, seed, clumsy, trace });
    if (r.trace.length) console.log(r.trace.join('\n'));
    console.log(`${who}${who === 'noisy' || who === 'kid' ? '(' + ['Pip', 'Bo'][r.clumsy || clumsy] + ')' : ''} s${seed}: ${r.cleared ? 'FINISHED' : 'NOT DONE (' + r.phase + ' at s=' + r.s.toFixed(1) + ')'} in ${r.simT}s  tickets ${r.tickets}/${r.max} (${Math.round(r.tickets / r.max * 100)}%)  rattles ${r.rattles}  breakdowns ${r.bds}  bends ${r.bends}  hops ${r.hops}  switches ${r.sw}  photos ${r.photos}  brake loops ${r.loops}${r.medal ? '  medal ' + r.medal : ''}${r.whys.length ? '\n  rattles: ' + r.whys.join(' ') : ''}${r.cpuErrs.length ? '\n  CPU ERR ' + r.cpuErrs : ''}${errors.length ? '\n  PAGE ERR ' + errors.slice(0, 3).join(' | ').slice(0, 600) : ''}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
