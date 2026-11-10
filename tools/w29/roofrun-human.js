#!/usr/bin/env node
// How forgiving is 29-1 Rooftop Moonlight Run for people? node tools/w29/roofrun-human.js
//   1 windows: at every gap the thrower waits 6 s and the swinger 5 s before acting, and the script measures how long
//     the "Throw!" (green ring) and "Leap!" windows stay open each time they open (seconds: shortest / median).
//   2 late: a computer pair whose throw and leap come `late` seconds after the window opens (a person's reaction
//     time), for late = 0.1, 0.15, 0.2, 0.25: clears? time, whoops, misses, helps, medal.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const win = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'roofrun');
    G.manual = true; G.cpuOn = [true, true];
    const rows = [], cur = { key: '', aimT: 0, ropeT: 0, th: [], lp: [], thOn: 0, lpOn: 0 };
    const flush = () => { if (cur.key) rows.push({ gap: cur.key, th: cur.th.slice(), lp: cur.lp.slice() }); };
    P.CPU.filter = (p, o, dt) => {
      const st = G.mst; if (!st || !st.c || !st.c.gaps[st.gi]) return o;
      const pl = P.MODES.roofrun.plan(st), key = (G.room + 1) + '.' + (st.gi + 1) + ' ' + st.c.gaps[st.gi].kind;
      if (key !== cur.key) { flush(); Object.assign(cur, { key, aimT: 0, ropeT: 0, th: [], lp: [], thOn: 0, lpOn: 0 }); }
      if (p.id === st.thr && pl.phase === 'throw' && pl.aiming) {
        cur.aimT += dt;
        if (pl.throwNow) cur.thOn += dt; else if (cur.thOn) { cur.th.push(cur.thOn); cur.thOn = 0; }
        if (cur.aimT < 6) o.act = false;
      }
      if (p.id === st.swg && pl.onRope) {
        cur.ropeT += dt;
        if (pl.letGo) cur.lpOn += dt; else if (cur.lpOn) { cur.lp.push(cur.lpOn); cur.lpOn = 0; }
        if (cur.ropeT < 5) o.act = false;
      }
      return o;
    };
    P.loadLevel(i);
    for (let n = 0; n < 120 * 900 && G.mode === 'play'; n++) P.step(P.DT);
    flush(); P.CPU.filter = null;
    const f = a => { if (!a.length) return 'never'; const s = a.slice().sort((x, y) => x - y); return s[0].toFixed(2) + ' / ' + s[s.length >> 1].toFixed(2) + ' (x' + s.length + ')'; };
    return { mode: G.mode, rows: rows.map(r => r.gap.padEnd(10) + ' throw ' + f(r.th).padEnd(20) + ' leap ' + f(r.lp)) };
  });
  console.log('windows (shortest / median seconds):', win.mode); console.log(win.rows.join('\n'));
  for (const late of [0.1, 0.2, 0.25, 0.3, 0.35]) {
    const r = await page.evaluate(late => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'roofrun');
      G.manual = true; G.cpuOn = [true, true];
      const on = [0, 0], fire = [0, 0];
      P.CPU.filter = (p, o, dt) => {
        const st = G.mst; if (!st || !st.c) return o;
        const pl = P.MODES.roofrun.plan(st), k = p.id;
        const want = (p.id === st.thr && pl.phase === 'throw' && pl.throwNow) || (p.id === st.swg && pl.onRope && pl.letGo);
        const timing = (p.id === st.thr && pl.phase === 'throw') || (p.id === st.swg && pl.onRope);
        if (!timing) { on[k] = 0; fire[k] = 0; return o; }
        o.act = false;
        if (fire[k] > 0) { fire[k] -= dt; if (fire[k] <= 0) { o.act = 'tap'; fire[k] = 0; on[k] = 1; } return o; }
        if (want && !on[k]) fire[k] = late;
        if (!want) on[k] = 0;
        return o;
      };
      P.loadLevel(i);
      for (let n = 0; n < 120 * 900 && G.mode === 'play'; n++) P.step(P.DT);
      P.CPU.filter = null;
      const s = G.mst.stats, st = G.mst;
      return { mode: G.mode, time: Math.round(G.time), whoops: s.whoops, throws: s.hits + '/' + s.throws, helps: s.helps, stars: st.stars + '/' + st.totalStars, medal: P.MODES.roofrun.stats()[3].value };
    }, late);
    console.log('late', late, JSON.stringify(r));
  }
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
