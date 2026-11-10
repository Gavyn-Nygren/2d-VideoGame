#!/usr/bin/env node
// 30-1 era 'wright': how long does a frame's drawing take? The computer pair plays; every 1/60 s the whole frame is
// rendered (render(dt): the era's scene + the core HUD) and timed, drawing included (software canvas in headless Chromium).   node tools/w30/wright-perf.js [--phone] [--secs=60] [--off=drawBack,draw,drawTop,hud]
// --off switches some of the era's drawing hooks off, to see what each costs.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), phone = args.includes('--phone');
const secs = +((args.find(a => a.startsWith('--secs=')) || '--secs=60').split('=')[1]);
const off = ((args.find(a => a.startsWith('--off=')) || '--off=').split('=')[1]).split(',').filter(Boolean);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(phone ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const r = await page.evaluate(({ secs, off }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
    G.manual = true; G.cpuOn = [true, true];
    TT.jump('wright', { seed: 3 }); G.cpuOn = [true, true];
    for (const k of off) TT.TTH_PHASES.wright[k] = () => {};
    const st = G.mst, ts = [], byMode = {}, cv2 = document.getElementById('game').getContext('2d');
    for (let f = 0; f < secs * 60 && G.mst === st && !st.cut; f++) {
      P.step(P.DT); P.step(P.DT); updateParticles(1 / 60);
      const t0 = performance.now(); render(1 / 60); cv2.getImageData(0, 0, 1, 1); const d = performance.now() - t0;   // (reading a pixel makes the canvas finish drawing)
      ts.push(d); const m = st.ph.mode; (byMode[m] || (byMode[m] = [])).push(d);
    }
    ts.sort((a, b) => a - b);
    const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
    return { frames: ts.length, avg: +avg(ts).toFixed(2), p95: +ts[Math.floor(ts.length * 0.95)].toFixed(2), max: +ts[ts.length - 1].toFixed(2),
      byMode: Object.fromEntries(Object.entries(byMode).map(([k, a]) => [k, +avg(a).toFixed(2)])), particles: G.particles.length, obs: st.ph.obs.length };
  }, { secs, off });
  console.log((phone ? 'phone  ' : 'desktop') + (off.length ? ' without ' + off.join('+') : ' whole frame (scene + HUD)') + ', ms:', JSON.stringify(r));
  if (errs.length) console.log('PAGE ERRORS:\n' + errs.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
