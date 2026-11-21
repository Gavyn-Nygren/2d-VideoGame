#!/usr/bin/env node
// 43-4 Laser Tag Arena: whole matches with drawing off (K3D.noRender), the computer playing one or both sides.
// Usage: node tools/w43/laser-play.js [--skills=hard,normal] [--seeds=1,2,3] [--who=cpu|still|wander|camper|spam] [--side=0]
//        [--max=900] [--trace=10]
//   --skills=a,b   Pip's and Bo's computer skill (easy | normal | hard)
//   --who=...      a scripted person plays --side, the computer the other: still (presses nothing), wander (runs about at
//                  random, fires now and then), camper (stays in its start corner firing taps), spam (fires all the time
//                  while running about)
// Prints for each match: the winner and rounds, then for each computer side: tags (bank tags), shots, dodges, pickups,
// its worst second for changes of direction (more than 2 is a jitter bug), the longest it stood still in the open and the
// longest it went without firing in a live round.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const skills = opt('skills', 'normal,normal').split(','), seeds = opt('seeds', '1').split(',').map(Number);
const who = opt('who', 'cpu'), side = +opt('side', 0), maxT = +opt('max', 900), trace = +opt('trace', 0);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e.stack || e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const tot = { wins: [0, 0], n: 0 };
  for (const seed of seeds) {
    errors.length = 0;
    const r = await page.evaluate(async ({ skills, seed, who, side, maxT, trace }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D;
      const i = P.LEVELS.findIndex(l => l.mode === 'arcadelaser');
      window.__seed(seed * 7919);
      G.manual = true; K3D.noRender = true;
      P.CPU.errs.clear(); P.CPU.skillOf = skills.slice();
      G.cpuOn = [true, true];
      // a scripted person (plain presses, not the computer's brain)
      let pt = 0, hold = { t: 0 };
      P.CPU.filter = who === 'cpu' ? null : (p, out, dt) => {
        if (p.id !== side) return out;
        pt += dt;
        const R = Math.random;
        if (who === 'still') return {};
        if (who === 'camper') return { act: pt % 1.2 < 0.05 ? true : false, ax: Math.sin(pt) * 0.3, ay: Math.cos(pt * 0.7) * 0.3 };
        hold.t -= dt;
        if (hold.t <= 0) { hold = { t: 0.3 + R() * 0.9, ax: R() * 2 - 1, ay: R() * 2 - 1, act: who === 'spam' ? true : R() < 0.3, jump: R() < 0.1 }; }
        return { ax: hold.ax, ay: hold.ay, act: who === 'spam' ? (pt % 0.5 < 0.05) : hold.act && hold.t > 0.2, jump: hold.jump && hold.t > 0.25 };
      };
      delete G.results[i];
      P.loadLevel(i); G.introT = 0;
      const st = G.mst, DT = P.DT, log = [];
      const m = [0, 1].map(() => ({ dirs: [], worst: 0, still: 0, stillMax: 0, noShot: 0, noShotMax: 0, lastShots: 0, prev: null }));
      let n = 0;
      for (; n < maxT / DT && G.mode === 'play'; n++) {
        window.__inStep = true; P.step(DT); window.__inStep = false;
        if (n % 4000 === 0) await new Promise(r2 => setTimeout(r2, 0));
        const live = st.phase === 'live' || st.phase === 'gold';
        for (const id of [0, 1]) {
          if (who !== 'cpu' && id === side) continue;
          const h = st.heroes[id], q = m[id];
          if (!live) { q.still = 0; q.noShot = 0; q.prev = null; continue; }
          // changes of direction: the run turning more than 100 degrees, counted over the last second
          if (Math.hypot(h.vx, h.vz) > 1.2) {
            const a = Math.atan2(h.vz, h.vx);
            if (q.prev != null && Math.abs(Math.atan2(Math.sin(a - q.prev), Math.cos(a - q.prev))) > 1.75) q.dirs.push(st.t);
            q.prev = a;
          }
          while (q.dirs.length && q.dirs[0] < st.t - 1) q.dirs.shift();
          q.worst = Math.max(q.worst, q.dirs.length);
          // standing still in the open (not beside anything tall)
          const sp = Math.hypot(h.vx, h.vz), b2 = { x: h.x, z: h.z, r: 0.85 };
          const cover = st.sol.some(s => s.move === 'solid' && s.beam !== 'mirror' && ARCADELASER_ARENA.overlaps(s, b2));
          if (sp < 0.3 && !cover && !h.fire && h.air < 0) { q.still += DT; q.stillMax = Math.max(q.stillMax, q.still); } else q.still = 0;
          if (h.stat.shots > q.lastShots) { q.lastShots = h.stat.shots; q.noShot = 0; } else { q.noShot += DT; q.noShotMax = Math.max(q.noShotMax, q.noShot); }
        }
        if (trace && n % Math.round(trace / DT) === 0) log.push(st.phase + ' r' + st.round + ' ' + st.heroes.map(h => h.tags + '@' + h.x.toFixed(1) + ',' + h.z.toFixed(1)).join(' ') + ' w' + st.wins.join('-'));
      }
      P.CPU.filter = null;
      return { mode: G.mode, phase: st.phase, t: +(n * DT).toFixed(0), wins: st.wins.slice(), winner: st.winner, rounds: st.roundNo,
        stats: st.heroes.map(h => h.stat), m: m.map(q => ({ worst: q.worst, still: +q.stillMax.toFixed(1), noShot: +q.noShotMax.toFixed(1) })), log, errs: [...P.CPU.errs] };
    }, { skills, seed, who, side, maxT, trace });
    const names = ['Pip', 'Bo'];
    const w = r.wins[0] > r.wins[1] ? 0 : r.wins[1] > r.wins[0] ? 1 : -1;
    if (w >= 0) tot.wins[w]++; tot.n++;
    console.log(`seed ${seed}: ${w >= 0 ? names[w] + ' wins' : 'no winner'} ${r.wins.join('-')} after ${r.rounds} rounds, ${r.t} s (${r.mode}/${r.phase})`);
    for (const id of [0, 1]) {
      if (who !== 'cpu' && id === side) { console.log(`  ${names[id]} (${who}): tags ${r.stats[id].tags}, shots ${r.stats[id].shots}`); continue; }
      const s = r.stats[id], q = r.m[id];
      console.log(`  ${names[id]} (${skills[id]}): tags ${s.tags} (bank ${s.bank}), shots ${s.shots}, dodges ${s.dodges}, pickups ${s.pickups}, worst turns/s ${q.worst}${q.worst > 2 ? ' JITTER' : ''}, still in open ${q.still} s, longest without firing ${q.noShot} s`);
    }
    if (r.log.length) console.log('  ' + r.log.join('\n  '));
    if (r.errs.length || errors.length) console.log('  errors: ' + r.errs.concat(errors.slice(0, 6)).join('\n  '));
  }
  console.log(`total: Pip ${tot.wins[0]}, Bo ${tot.wins[1]} of ${tot.n}`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
