#!/usr/bin/env node
// 42-3 Spook Manor: how heavy each room is to draw. Starts the pair at each clock (the restart points: gate, hall,
// corridor, dining room, kitchen, gallery, library, attic, ballroom, last waltz), lets the computer play a few seconds
// with drawing on, and prints draw calls, triangles and the frame time there. Software WebGL (SwiftShader) is much
// slower than a real graphics card: read the milliseconds as "which room is heaviest", not as a PC's frame rate;
// draw calls and triangles are the same on any machine.
//   node tools/w42/manor-perf.js [--secs=4] [--size=1280x720] [--frames=12]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const [w, h] = opt('size', '1280x720').split('x').map(Number), secs = +opt('secs', 4), frames = +opt('frames', 12);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const rows = [], errs = [];
  for (let from = 0; from < 10; from++) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
    page.on('pageerror', e => errs.push(String(e.stack || e)));
    await page.addInitScript(() => { window.__k3dKeep = true; });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    if (!await page.evaluate(() => window.__pipbo.K3D.need())) { console.log('3D failed'); process.exit(1); }
    const r = await page.evaluate(async ({ from, secs, frames }) => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D;
      G.manual = true; K3D.noRender = true; G.cpuOn = [true, true]; P.CPU.skillOf = [null, null];
      P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'parkmanor')); G.introT = 0;
      const st = G.mst;
      if (from > 0) { st.hasLantern = st.hasKey = true; st.restart = from; PARKMANOR.restartAt(st); }
      for (let n = 0; n < Math.round(secs / P.DT) && G.mode === 'play'; n++) P.step(P.DT);
      K3D.noRender = false;
      // draw frames by hand and time them
      const ms = [];
      for (let i = 0; i < frames; i++) { const t0 = performance.now(); P.step(P.DT); if (K3D.drawNow) K3D.drawNow(); else await new Promise(q => requestAnimationFrame(q)); ms.push(performance.now() - t0); }
      const R = K3D.R; ms.sort((a, b) => a - b);
      return { zone: st.zone, calls: R.info.render.calls, tris: R.info.render.triangles, ms: ms[ms.length >> 1] };
    }, { from, secs, frames });
    rows.push(Object.assign({ from }, r));
    console.log(`clock ${from}  ${r.zone.padEnd(9)} calls ${String(r.calls).padStart(5)}  tris ${String(r.tris).padStart(8)}  ${r.ms.toFixed(0)} ms`);
    await page.close();
  }
  const worst = rows.reduce((a, b) => (b.calls > a.calls ? b : a));
  console.log(`heaviest: ${worst.zone} (${worst.calls} calls, ${worst.tris} triangles)`);
  if (errs.length) console.log('PAGE ERR ' + errs.slice(0, 3).join(' | ').slice(0, 600));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
