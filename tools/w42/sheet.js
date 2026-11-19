#!/usr/bin/env node
// 42-1 Runaway Coaster: pictures from the play camera all along one ride, for the review's camera and readability
// check (is anything in the way of the car, can each sign be read, is any quarter of the picture empty).
//   node tools/w42/sheet.js [--every=6] [--from=0] [--to=235] [--out=build/w42-sheet] [--size=640x360] [--wait=2.5]
//        [--who=pair|idle] [--reduced] [--at=24,94,144]   (--at: just these moments)
// The computer rides both seats (or nobody with --who=idle, to see Rattles, Breakdowns and detours). Saves
// <out>/t<secs>.png every --every simulated seconds and prints where the train was and any page errors.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const [w, h] = opt('size', '640x360').split('x').map(Number), every = +opt('every', 6), from = +opt('from', 0), to = +opt('to', 235), out = opt('out', 'build/w42-sheet');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e.stack || e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => window.__pipbo.K3D.need());
  await page.evaluate(({ who, reduced }) => {
    const P = window.__pipbo, G = P.G;
    G.manual = true; P.K3D.noRender = true; P.CPU.skillOf = [null, null];
    if (reduced) P.K3D.reduce = true;
    G.cpuOn = who === 'idle' ? [false, false] : [true, true];
    P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'parkcoaster'));
    window.__t = 0;
    P.K3D.noRender = false; G.introT = 0;   // (the first drawn frame builds the scene)
  }, { who: opt('who', 'pair'), reduced: args.includes('--reduced') });
  await page.waitForFunction(() => window.__pipbo.K3D.K && window.__pipbo.K3D.K.pc, null, { timeout: 120000 });
  const times = opt('at', '') ? opt('at', '').split(',').map(Number) : null;
  for (let t = from, k = 0; times ? k < times.length : t <= to; t += every, k++) {
    if (times) t = times[k];
    const r = await page.evaluate(async ({ t, who }) => {
      const P = window.__pipbo, G = P.G, st = G.mst;
      P.K3D.freeze = false; P.K3D.noRender = true;
      // the last 1.5 s before the picture are drawn, so the camera and the scenery's own motion have settled
      while (window.__t < t && G.mode === 'play') {
        if (who === 'idle') for (const p of G.players) for (const key in p.input) p.input[key] = false;
        P.step(P.DT); window.__t += P.DT;
        // (software drawing manages about a frame a second, so the camera and the scenery's tickers are run here at
        // 60 a second for the last 1.5 s: the picture then shows the camera where a real ride would have it)
        if (t - window.__t < 1.5 && P.K3D.K && P.K3D.K.pc && Math.round(window.__t / P.DT) % 2 === 0) { PARKCOASTER_SCENE.update(P.K3D.K, st, 1 / 60); for (const f of P.K3D.K.tickers) f(1 / 60); }
        if (Math.round(window.__t / P.DT) % 3000 === 0) await new Promise(r => setTimeout(r, 0));
      }
      P.K3D.noRender = false; G.introT = 0;
      return { mode: G.mode, phase: st.phase, s: Math.round(st.s), det: st.det, bolts: st.bolts, tickets: st.tickets };
    }, { t, who: opt('who', 'pair') });
    await page.waitForTimeout(+opt('wait', 2.5) * 1000);
    const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => { window.__pipbo.K3D.freeze = true; r(); })));
    const file = path.join(out, 't' + String(t).padStart(3, '0') + '.png');
    await page.screenshot({ path: file, clip: box, timeout: 120000 });
    console.log(file, JSON.stringify(r));
    if (r.mode !== 'play') break;
  }
  if (errs.length) console.log('errors:\n' + [...new Set(errs)].slice(0, 8).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
