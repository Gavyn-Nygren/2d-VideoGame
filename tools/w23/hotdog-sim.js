#!/usr/bin/env node
// Hot Dog Stand Rush bot runs: plays 23-3 with the computer at the controls (G.manual, step(DT)) and prints, per run,
// each shift's happy / served and whether its goal was met (*), the burns, spills, Biscuit snacks, gold help, the medal
// and the total time.
// Who plays: --who=pair (computer both), noisy (one side made clumsy like a distracted person: pauses, wanders, random
// presses; --clumsy=0|1 picks the side), slow (one side sees things 1.2 s late, walks in bursts and stops to look
// around, like a young kid), idle (Pip presses nothing; must not clear), masher (Pip mashes random buttons with the
// computer as Bo), wrong (side --clumsy walks the wrong way first at every new job; 2 = both), still (side
// --clumsy never walks, just presses the action twice a second).
// Usage: node tools/w23/hotdog-sim.js [--who=pair] [--seeds=1,2,3] [--clumsy=0|1|2] [--hes=1.2] [--max=600]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const hes = +opt('hes', 1.2), who = opt('who', 'pair'), seeds = opt('seeds', '1,2,3').split(',').map(Number), clumsy = +opt('clumsy', 0), maxT = +opt('max', 600);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1);
    window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const all = [];
  for (const seed of seeds) {
    const r = await page.evaluate(async ({ seed, who, clumsy, maxT, hes }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      G.manual = true;
      P.CPU.skillOf = [null, null];
      G.cpuOn = who === 'idle' || who === 'masher' ? [false, true] : [true, true];
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8, lag: [] };
      P.CPU.filter = null;
      if (who === 'noisy') P.CPU.filter = (p, out, dt) => {
        if (p.id !== clumsy) return out;
        if (nz.pause > 0) { nz.pause -= dt; return {}; }
        nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
        nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random() * 1; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
        if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
        if (Math.random() < 0.15 * dt) out.jump = true;
        if (Math.random() < 0.1 * dt) out.act = 'tap';
        return out;
      };
      // (a young kid: each new job makes them stop and look for --hes seconds or so, they walk in little bursts, and
      // every few seconds they look around for a moment; --clumsy=2 makes both players slow kids)
      const kid = [{}, {}];
      if (who === 'slow') P.CPU.filter = (p, out, dt) => {
        if (clumsy !== 2 && p.id !== clumsy) return out;
        const z = kid[p.id];
        const j = P.MODES.hotdog.job(G.mst, p.id), jk = j.k + (j.i != null ? j.i : '') + (j.t || '') + (j.c ? j.c.id : '');
        if (jk !== z.jk) { z.jk = jk; z.hes = hes * (0.6 + Math.random() * 0.8); }
        if (z.hes > 0) { z.hes -= dt; return {}; }
        if (z.pause > 0) { z.pause -= dt; return {}; }
        z.next = (z.next == null ? 3 + Math.random() * 5 : z.next) - dt;
        if (z.next <= 0) { z.pause = 1 + Math.random() * 2; z.next = 5 + Math.random() * 6; }
        z.burst = (z.burst || 0) - dt;
        if (z.burst < -0.25) z.burst = 0.5;
        if ((out.left || out.right) && z.burst < 0) return { act: out.act };
        return out;
      };
      // (wrong: each new job, first walks the wrong way for about 2 s; still: never walks, just presses the action
      // twice a second wherever it stands; both on side --clumsy)
      const wr = [{}, {}];
      if (who === 'wrong') P.CPU.filter = (p, out, dt) => {
        if (clumsy !== 2 && p.id !== clumsy) return out;
        const z = wr[p.id], j = P.MODES.hotdog.job(G.mst, p.id), jk = j.k + (j.t || '') + (j.c ? j.c.id : '');
        if (jk !== z.jk) { z.jk = jk; z.t = 1.5 + Math.random(); z.dir = j.x != null && j.x < p.x ? 1 : -1; }
        if (z.t > 0) { z.t -= dt; return { left: z.dir < 0, right: z.dir > 0 }; }
        return out;
      };
      if (who === 'still') P.CPU.filter = (p, out, dt) => {
        if (p.id !== clumsy) return out;
        const z = wr[p.id]; z.t = (z.t || 0) + dt;
        if (z.t > 0.5) { z.t = 0; return { act: 'tap' }; }
        return {};
      };
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Hot Dog Stand Rush'));
      const pip = G.players[0];
      const steps = Math.round(maxT / P.DT);
      let n = 0;
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 600 && n < steps && G.mode === 'play'; k++, n++) {
          if (who === 'idle') { for (const key in pip.input) pip.input[key] = false; }
          if (who === 'masher') {
            const inp = pip.input;
            if (Math.random() < P.DT * 2) { inp.left = Math.random() < 0.5; inp.right = !inp.left && Math.random() < 0.7; }
            const a = Math.random() < 0.5;
            if (a && !pip.prevAct) pip.pendingAct = true;
            pip.prevAct = a; inp.act = a;
          }
          P.step(P.DT);
        }
        await new Promise(res => setTimeout(res, 0));
      }
      const st = G.mst;
      return { mode: G.mode, simT: Math.round(n * P.DT), room: G.room, shifts: st.stats.shifts.map(s => s.title[0] + ':' + s.happy + '/' + (s.happy + s.missed) + (s.met ? '*' : '')),
        happy: st.stats.happy, missed: st.stats.missed, stars: st.stats.stars, burnt: st.stats.burnt, spills: st.stats.spills, biscuit: st.stats.biscuit, hints: st.stats.hints,
        medal: P.MODES.hotdog.medalOf(st), gold: st.goldUsed.join(','), made: st.stats.made, lemon: st.stats.lemon, cpuErrs: [...P.CPU.errs] };
    }, { seed, who, clumsy, maxT, hes });
    all.push(r);
    console.log(`s${seed} ${who}${who === 'noisy' || who === 'slow' ? clumsy : ''}: ${r.mode === 'clear' ? 'CLEARED' : 'not finished (shift ' + (r.room + 1) + ')'} ${r.simT}s  ${r.shifts.join(' ')}  happy ${r.happy} missed ${r.missed} stars ${r.stars}  burnt ${r.burnt} spills ${r.spills} biscuit ${r.biscuit} hints ${r.hints}  ${r.medal}  gold [${r.gold}]  made ${r.made} lemon ${r.lemon}${r.cpuErrs.length ? ' CPU ERR ' + r.cpuErrs : ''}`);
  }
  const cl = all.filter(r => r.mode === 'clear');
  console.log(`--- ${who}: cleared ${cl.length}/${all.length}` + (cl.length ? `, avg ${Math.round(cl.reduce((s, r) => s + r.simT, 0) / cl.length)} s, happy ${Math.round(100 * cl.reduce((s, r) => s + r.happy, 0) / Math.max(1, cl.reduce((s, r) => s + r.happy + r.missed, 0)))}%, medals ${cl.map(r => r.medal[0]).join('')}` : ''));
  console.log(errors.length ? 'ERRORS:\n' + errors.slice(0, 8).join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
