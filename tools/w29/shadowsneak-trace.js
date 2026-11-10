#!/usr/bin/env node
// Shadow Sneak debug run: node tools/w29/shadowsneak-trace.js [--seed=1] [--max=400] [--noisy=0|1 (who is clumsy)] [--room=0] [--dump=T,T2] [--solo]
// Plays the level with two computers and prints when each gate is passed, each spotting and catch, and (with --dump)
// the guards and the plan at those times.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(a.indexOf('=') + 1) : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = await page.evaluate(({ seed, maxT, noisy, room, dumps, ev }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'shadowsneak'), log = [];
    window.__seed(seed * 7919);
    G.manual = true; G.cpuOn = [true, true];
    const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8 };
    P.CPU.filter = noisy < 0 ? null : (p, o, dt) => {
      if (p.id !== noisy) return o;
      if (nz.pause > 0) { nz.pause -= dt; return {}; }
      nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
      nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random() * 1; nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
      if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
      if (Math.random() < 0.15 * dt) o.jump = true;
      if (Math.random() < 0.1 * dt) o.act = true;
      return o;
    };
    P.loadLevel(i);
    for (let r = 0; r < room; r++) { G.introT = 0; P.nextRoom(); }
    let lp = -1, lr = -1, sp = 0, ca = 0, t0 = 0;
    const T = () => G.time.toFixed(1);
    const dump = () => { const st = G.mst, pl = P.MODES.shadowsneak.plan(st); log.push('  DUMP ' + T() + ' room ' + G.room + ' post ' + st.P.k + ' sn ' + Math.round(st.sn.x - st.P.x0) + ' ' + st.sn.state + (st.sn.hidden ? ' hid' : '') + ' th ' + Math.round(st.th.x - st.P.x0) + ' mark ' + Math.round(st.th.mark - st.P.x0) + ' pouch ' + st.th.pouch.toFixed(1) + ' chase ' + !!st.chase + ' open ' + st.P.open + '\n    guards ' + st.P.guards.map(g => g.kind[0] + Math.round(g.x - st.P.x0) + (g.face > 0 ? '>' : '<') + g.state).join(' ') + ' dogs ' + st.P.dogs.map(d => Math.round(d.x - st.P.x0) + d.state).join(' ') + '\n    sneak ' + JSON.stringify(Object.assign({}, pl.sneak, { zone: pl.sneak.zone && Math.round(pl.sneak.zone.x0 - st.P.x0) })) + '\n    toss ' + JSON.stringify(pl.toss) + ' think ' + JSON.stringify(st.think)); };
    const steps = Math.round(maxT / P.DT);
    for (let n = 0; n < steps && G.mode === 'play'; n++) {
      P.step(P.DT);
      const st = G.mst; if (!st.P) continue;
      if (G.room !== lr) { lr = G.room; lp = -1; log.push(T() + ' ROOM ' + (G.room + 1) + ' ' + st.title); }
      if (st.P.k !== lp) { if (lp >= 0) log.push(T() + '   gate ' + (lp + 1) + ' passed in ' + (G.time - t0).toFixed(1) + 's'); lp = st.P.k; t0 = G.time; }
      if (st.stats.spotted !== sp) { sp = st.stats.spotted; log.push(T() + '   SPOTTED at ' + Math.round(st.sn.x - st.P.x0) + ' (post ' + (st.P.k + 1) + ')'); }
      if (st.stats.caught !== ca) { ca = st.stats.caught; log.push(T() + '   CAUGHT'); }
      if (dumps.some(d => Math.abs(G.time - d) < P.DT / 2)) dump();
    }
    if (G.mode === 'play') dump();
    if (ev) log.push('EVAL ' + JSON.stringify(eval(ev)));
    const res = G.results[i];
    log.push('END mode ' + G.mode + ' time ' + G.time.toFixed(1) + ' stats ' + JSON.stringify(G.mst.stats) + (res ? ' card ' + JSON.stringify(res.stats) : ''));
    return log;
  }, { seed: +opt('seed', 1), maxT: +opt('max', 400), noisy: +opt('noisy', -1), room: +opt('room', 0), ev: opt('eval', ''), dumps: opt('dump', '').split(',').filter(Boolean).map(Number) });
  console.log(out.join('\n'));
  if (errs.length) console.log('ERRORS', errs.slice(0, 5));
  await browser.close();
})();
