#!/usr/bin/env node
// Draw cost per era: avg ms of render() (whole frame) in headless Chromium while the computer pair plays.
//   node tools/w30/int-look-perf.js [desktop|phone] [eras] [--secs=150] [--off=drawBack,draw,drawTop,hud]
'use strict';
const path = require('path'); const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const ORDER = ['dino', 'henge', 'troy', 'olympics', 'vikings', 'davinci', 'wright', 'moon', 'finale', 'race'];
const dev = pos[0] || 'desktop', eras = pos[1] && pos[1] !== 'all' ? pos[1].split(',') : ORDER, secs = +opt('secs', 150), off = opt('off', '').split(',').filter(Boolean);
(async () => {
  const browser = await chromium.launch();
  for (const phase of eras) {
    const ctx = await browser.newContext(dev === 'phone' ? { viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 3 } : { viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
    if (dev === 'phone') await page.evaluate(() => { try { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); } catch (e) {} });
    const r = await page.evaluate(({ phase, secs, off }) => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
      G.manual = true; G.cpuOn = [true, true]; TT.jump(TT.TTH_ORDER.indexOf(phase), { seed: 3 }); G.cpuOn = [true, true];
      for (const k of off) TTH_PHASES[phase][k] = () => {};
      const st = G.mst, ts = [], bk = {}, cv = document.getElementById('game'), c2 = cv.getContext('2d');
      let f = 0, cutF = 0, cutSum = 0;
      for (; f < secs * 60 && G.mode === 'play' && (G.mst === st) && st.phase === phase; f++) {
        P.step(P.DT); P.step(P.DT); updateParticles(1 / 60);
        const t0 = performance.now(); render(1 / 60); c2.getImageData(0, 0, 1, 1); const d = performance.now() - t0;
        if (st.cut) { cutF++; cutSum += d; } else { ts.push(d); const b = Math.floor(st.phT / 15) * 15; (bk[b] || (bk[b] = [])).push(d); }
      }
      const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; const s = ts.slice().sort((a, b) => a - b);
      return { canvas: cv.width + 'x' + cv.height, frames: ts.length, avg: +avg(ts).toFixed(2), p95: +(s[Math.floor(s.length * 0.95)] || 0).toFixed(2), max: +(s[s.length - 1] || 0).toFixed(1),
        cut: cutF ? +(cutSum / cutF).toFixed(2) : null, by15s: Object.entries(bk).map(([k, a]) => k + ':' + avg(a).toFixed(1)).join(' '), parts: G.particles.length };
    }, { phase, secs, off });
    console.log(dev, phase, off.length ? 'OFF ' + off.join('+') : '', JSON.stringify(r)); if (errs.length) console.log('  ERR', errs.slice(0, 3).join(' ; '));
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
