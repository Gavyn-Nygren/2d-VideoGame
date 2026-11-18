#!/usr/bin/env node
// 41-3 Paper Dragon Flight: bot runs that say WHERE things went wrong (cpu-test.js only says how a run ended).
//
//   node tools/w41/popdragon-play.js [--who=cpu,slow0,slow1,idle0,idle1,noisy0,notail1,nofire0] [--seed=1] [--max=420]
//
//   cpu      the computer flies both seats
//   slowK    seat K (0 Pip, 1 Bo) is a slow kid: the computer's own choices, but a second late (and a little sloppy)
//   idleK    seat K presses nothing (the level must not clear: one rider can't fly the dragon alone)
//   noisyK   seat K looks away now and then and wanders the wrong way for a moment
//   notail1  Bo never swishes the tail (moths and dust bunnies stay on; no bats)
//   nofire0  Pip never breathes fire (webs and tissue tear as Crumples; the candle stays dark)
// Prints, per run: how it ended, the time, the medal, stars, Crumples with where and why, and bats.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const whos = opt('who', 'cpu').split(','), seed = +opt('seed', 1), maxT = +opt('max', 420);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const who of whos) {
    errors.length = 0;
    const t0 = Date.now();
    const r = await page.evaluate(async ({ who, seed, maxT }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'popdragon');
      window.__seed(seed * 7919); window.__inStep = true;
      G.manual = true; P.CPU.errs.clear();
      const seat = +who.slice(-1), kind = who.replace(/\d$/, '');
      G.cpuOn = kind === 'idle' ? [seat !== 0, seat !== 1] : [true, true];
      const q = [], nz = { pause: 0, next: 3, wander: 0, wdir: 0, wnext: 7 };
      P.CPU.filter = (p, out, dt) => {
        if (kind === 'notail' && p.id === 1) { const o = Object.assign({}, out); if (o.act) delete o.act; return o; }
        if (kind === 'nofire' && p.id === 0) { const o = Object.assign({}, out); if (o.act) delete o.act; return o; }
        if (p.id !== seat) return out;
        if (kind === 'slow') {
          // a second late, and it lets go a little early and pushes a little short
          q.push({ t: G.mst.clock, o: Object.assign({}, out) });
          while (q.length > 1 && G.mst.clock - q[1].t >= 1.0) q.shift();
          const o = q.length && G.mst.clock - q[0].t >= 1.0 ? Object.assign({}, q[0].o) : {};
          if (o.ax) o.ax *= 0.8; if (o.ay) o.ay *= 0.8;
          if (Math.random() < 0.5 * dt) return {};
          return o;
        }
        if (kind === 'noisy') {
          if (nz.pause > 0) { nz.pause -= dt; return {}; }
          nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 2; nz.next = 5 + Math.random() * 8; }
          nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random() * 0.8; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 7 + Math.random() * 10; }
          if (nz.wander > 0) { nz.wander -= dt; return seat === 0 ? { ax: nz.wdir } : { ay: nz.wdir }; }
        }
        return out;
      };
      delete G.results[i];
      P.loadLevel(i);
      window.__inStep = false;
      const M = P.MODES ? P.MODES.popdragon : window.MODES.popdragon, log = [];
      const crumple = M.crumple;
      M.crumple = function (st, hit) {
        const why = hit.paw ? 'paw ' + hit.paw.id : hit.moths ? 'three moths' : hit.web ? 'web ' + hit.web.burn : hit.mover ? 'mover ' + hit.mover.id : hit.sd ? 'solid ' + JSON.stringify(hit.sd).slice(0, 70) : '?';
        log.push({ s: Math.round(st.s), part: M.partAt(st.s), ox: +st.ox.toFixed(1), oy: +st.oy.toFixed(1), tuck: +st.tuck.toFixed(2), why });
        return crumple.call(this, st, hit);
      };
      const steps = Math.round(maxT / P.DT);
      let n = 0;
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) { window.__inStep = true; P.step(P.DT); window.__inStep = false; }
        await new Promise(r => setTimeout(r, 0));
      }
      M.crumple = crumple;
      const st = G.mst, res = G.results[i] || null;
      return { mode: G.mode, simT: Math.round(n * P.DT), s: Math.round(st.s), phase: st.phase, res: res && { time: Math.round(res.time), medal: res.medal && ['none', 'Bronze', 'Silver', 'Gold'][res.medal.tier], vals: res.medal && res.medal.vals },
        stars: st.stars + '/' + POPDRAGON_ROUTE.stars.length, crumples: st.crumplesAll, refolds: st.refolds, bats: st.bats, mothBats: st.mothBats, pawHits: st.pawHits, log, cpuErrs: [...P.CPU.errs] };
    }, { who, seed, maxT });
    const end = r.res ? `CLEARED ${r.res.time}s ${r.res.medal} ${JSON.stringify(r.res.vals)}` : `not finished (s ${r.s}, ${r.phase})`;
    console.log(`${who.padEnd(8)} ${end}  stars ${r.stars} crumples ${r.crumples} refolds ${r.refolds} bats ${r.bats} moths-off ${r.mothBats} paw-hits ${r.pawHits}  [sim ${r.simT}s wall ${Math.round((Date.now() - t0) / 1000)}s]${r.cpuErrs.length ? ' CPU ERR ' + r.cpuErrs.join(',') : ''}${errors.length ? ' PAGE ERR ' + errors.slice(0, 3).join(' | ').slice(0, 300) : ''}`);
    for (const c of r.log) console.log(`   crumple s ${c.s} (part ${c.part}) at ${c.ox},${c.oy} tuck ${c.tuck}: ${c.why}`);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
