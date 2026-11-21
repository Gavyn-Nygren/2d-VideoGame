#!/usr/bin/env node
// 43-4 Laser Tag Arena: whole matches with drawing off (K3D.noRender), the computer playing one or both sides.
// Usage: node tools/w43/laser-play.js [--skills=hard,normal] [--seeds=1,2,3] [--who=cpu|still|wander|camper|spam] [--side=0]
//        [--max=900] [--trace=10]
//   --skills=a,b   Pip's and Bo's computer skill (easy | normal | hard)
//   --who=...      a scripted person plays --side, the computer the other: still (presses nothing), wander (runs about at
//                  random, fires now and then), camper (stays in its start corner firing taps), spam (fires all the time
//                  while running about)
// Prints for each match: the winner and rounds (each round: its length, the tags and "gold" if it went to next tag wins), then for each computer side: tags (bank tags), shots, dodges, pickups,
// its worst second for changes of direction (more than 2 is a jitter bug), the longest it stood still in the open and the
// longest it went without firing in a live round.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const skills = opt('skills', 'normal,normal').split(','), seeds = opt('seeds', '1').split(',').map(Number);
const who = opt('who', 'cpu'), side = +opt('side', 0), maxT = +opt('max', 900), trace = +opt('trace', 0), why = args.includes('--why');
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
    const r = await page.evaluate(async ({ skills, seed, who, side, maxT, trace, why }) => {
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
      let n = 0, lastBeam = 0; const rounds = [], lastKind = [null, null];
      const miss = [0, 1].map(() => ({ hit: 0, dodged: 0, safe: 0 }));
      for (; n < maxT / DT && G.mode === 'play'; n++) {
        const rt0 = st.rt, tags0 = st.heroes ? st.heroes.map(h => h.tags) : [0, 0], ph0 = st.phase;
        window.__inStep = true; P.step(DT); window.__inStep = false;
        for (const id of [0, 1]) { const bb = P.CPU.st[id]; if (bb && bb.shot) lastKind[id] = bb.shot.kind + (bb.shot.n ? bb.shot.n : ''); }
        if (miss && st.beams) for (const bm of st.beams) {
          if (bm.n <= lastBeam) continue; lastBeam = bm.n;
          const o = st.heroes[1 - bm.who], c = miss[bm.who], kd = lastKind[bm.who] || '?';
          if (bm.hit) { c.hit++; continue; }
          if (bm.paths.some(pth => pth.passes.some(x => x.id === o.id && x.why === 'dodge'))) { c.dodged++; continue; }
          if (o.safe > 0) { c.safe++; continue; }
          let dmin = 1e9;
          for (const pth of bm.paths) for (const g of pth.segs) { const dx = g.x1 - g.x0, dz = g.z1 - g.z0, L2 = dx * dx + dz * dz || 1e-6, u = Math.max(0, Math.min(1, ((o.x - g.x0) * dx + (o.z - g.z0) * dz) / L2)); dmin = Math.min(dmin, Math.hypot(g.x0 + dx * u - o.x, g.z0 + dz * u - o.z)); }
          const seen = ARCADELASER_ARENA.clear(st.sol, st.heroes[bm.who].x, st.heroes[bm.who].z, o.x, o.z);
          const nm = (dmin < 0.7 ? (seen ? 'close' : 'ducked') : (seen ? 'wide' : 'blind')) + '-' + kd; c[nm] = (c[nm] || 0) + 1;
        }
        if ((ph0 === 'live' || ph0 === 'gold') && st.phase !== 'live' && st.phase !== 'gold') rounds.push(Math.round(rt0) + 's ' + st.heroes.map(h => h.tags).join('-') + (ph0 === 'gold' ? ' gold' : ''));
        if (n % 4000 === 0) await new Promise(r2 => setTimeout(r2, 0));
        const live = st.phase === 'live' || st.phase === 'gold';
        for (const id of [0, 1]) {
          if (who !== 'cpu' && id === side) continue;
          const h = st.heroes[id], q = m[id];
          if (!live) { q.still = 0; q.noShot = 0; q.prev = null; continue; }
          // changes of direction: the run turning more than 100 degrees, counted over the last second
          if (Math.hypot(h.vx, h.vz) > 1.2) {
            const a = Math.atan2(h.vz, h.vx);
            if (q.prev != null && Math.abs(Math.atan2(Math.sin(a - q.prev), Math.cos(a - q.prev))) > 1.75) {
              q.dirs.push(st.t);
              if (why && q.dirs.length > 2) { const b = P.CPU.st[id]; log.push(`${id} t${st.t.toFixed(2)} turns ${q.dirs.length} at ${h.x.toFixed(2)},${h.z.toFixed(2)} v ${h.vx.toFixed(1)},${h.vz.toFixed(1)} arrived ${b.arrived} cover ${b.map && b.map.cover[b.goalK]} mv ${b.mv.map(v => v.toFixed(2))} goal ${b.goalK} aimed ${b.aimedAt} side ${b.side} shot ${b.shot ? b.shot.kind : '-'} fire ${h.fire ? h.fire.st : '-'} stuck ${b.stuckT.toFixed(2)} air ${h.air.toFixed(2)}`); }
            }
            q.prev = a;
          }
          while (q.dirs.length && q.dirs[0] < st.t - 1) q.dirs.shift();
          q.worst = Math.max(q.worst, q.dirs.length);
          // standing still in the open (not beside anything tall)
          const sp = Math.hypot(h.vx, h.vz), b2 = { x: h.x, z: h.z, r: 0.85 };
          const cover = st.sol.some(s => s.move === 'solid' && s.beam !== 'mirror' && ARCADELASER_ARENA.overlaps(s, b2));
          if (sp < 0.3 && !cover && !h.fire && h.air < 0) { q.still += DT; q.stillMax = Math.max(q.stillMax, q.still); } else q.still = 0;
          if (h.stat.shots > q.lastShots) { q.lastShots = h.stat.shots; q.noShot = 0; } else { q.noShot += DT; if (q.noShot > q.noShotMax) { q.noShotMax = q.noShot; q.noShotAt = 'r' + st.round + ' t' + st.rt.toFixed(0) + ' ' + h.x.toFixed(1) + ',' + h.z.toFixed(1) + ' vs ' + st.heroes[1 - id].x.toFixed(1) + ',' + st.heroes[1 - id].z.toFixed(1) + ' rech ' + h.rech.toFixed(1) + ' nf ' + h.noFire.toFixed(1) + ' osafe ' + st.heroes[1 - id].safe.toFixed(1) + ' firing ' + st.firing + ' ' + st.phase; } }
        }
        if (trace && n % Math.round(trace / DT) === 0) {
          const hs = st.heroes, cl = ARCADELASER_ARENA.clear(st.sol, hs[0].x, hs[0].z, hs[1].x, hs[1].z);
          const bs = [0, 1].map(id => { const b = P.CPU.st[id]; if (!b || !b.map || b.goalK == null) return '-'; const nx = b.map.nx; return 'goal ' + (-ARCADELASER_ARENA.HX + (b.goalK % nx + 0.5) * 0.25).toFixed(1) + ',' + (-ARCADELASER_ARENA.HZ + (Math.floor(b.goalK / nx) + 0.5) * 0.25).toFixed(1) + ' see ' + (b.seeT || 0).toFixed(2) + ' shot ' + (b.shot ? b.shot.kind : '-') + ' rech ' + hs[id].rech.toFixed(1); });
          log.push(st.phase + ' r' + st.round + ' t' + st.rt.toFixed(0) + ' ' + hs.map(h => h.tags + '@' + h.x.toFixed(1) + ',' + h.z.toFixed(1)).join(' ') + ' clear ' + cl + ' | ' + bs.join(' | ') + ' w' + st.wins.join('-'));
        }
      }
      P.CPU.filter = null;
      return { mode: G.mode, phase: st.phase, t: +(n * DT).toFixed(0), wins: st.wins.slice(), winner: st.winner, rounds: st.roundNo,
        stats: st.heroes.map(h => h.stat), rl: rounds, miss, m: m.map(q => ({ worst: q.worst, still: +q.stillMax.toFixed(1), noShot: +q.noShotMax.toFixed(1), noShotAt: q.noShotAt })), log, errs: [...P.CPU.errs] };
    }, { skills, seed, who, side, maxT, trace, why });
    const names = ['Pip', 'Bo'];
    const w = r.wins[0] > r.wins[1] ? 0 : r.wins[1] > r.wins[0] ? 1 : -1;
    if (w >= 0) tot.wins[w]++; tot.n++;
    console.log(`seed ${seed}: ${w >= 0 ? names[w] + ' wins' : 'no winner'} ${r.wins.join('-')} after ${r.rounds} rounds, ${r.t} s (${r.mode}/${r.phase}); rounds ${r.rl.join(', ')}`);
    for (const id of [0, 1]) {
      if (who !== 'cpu' && id === side) { console.log(`  ${names[id]} (${who}): tags ${r.stats[id].tags}, shots ${r.stats[id].shots}`); continue; }
      const s = r.stats[id], q = r.m[id];
      console.log(`  ${names[id]} shots: ${Object.entries(r.miss[id]).map(([k, v]) => k + ' ' + v).join(', ')}`);
      console.log(`  ${names[id]} (${skills[id]}): tags ${s.tags} (bank ${s.bank}), shots ${s.shots}, dodges ${s.dodges}, pickups ${s.pickups}, worst turns/s ${q.worst}${q.worst > 2 ? ' JITTER' : ''}, still in open ${q.still} s, longest without firing ${q.noShot} s (${q.noShotAt})`);
    }
    if (r.log.length) console.log('  ' + r.log.join('\n  '));
    if (r.errs.length || errors.length) console.log('  errors: ' + r.errs.concat(errors.slice(0, 6)).join('\n  '));
  }
  console.log(`total: Pip ${tot.wins[0]}, Bo ${tot.wins[1]} of ${tot.n}`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
