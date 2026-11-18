#!/usr/bin/env node
// 42-1 Runaway Coaster: is the whole front car on screen all ride? Rides with the computer in both seats (drawing off),
// runs the play camera 60 times a second and projects the car's box (and the riders' hats) to the screen. Prints every
// place where part of it leaves the picture or comes too near its edge, and the worst spot.
//   node tools/w42/framing.js [--margin=12] [--reduced]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 960, height: 540 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => window.__pipbo.K3D.need());
  const r = await page.evaluate(async ({ margin, reduced }) => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D;
    G.manual = true; K3D.noRender = true; P.CPU.skillOf = [null, null]; G.cpuOn = [true, true];
    if (reduced) K3D.reduce = true;
    P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'parkcoaster'));
    // (the scene is built by the first drawn frame)
    K3D.noRender = false; G.introT = 0;
    for (let k = 0; k < 600 && !(K3D.K && K3D.K.pc); k++) await new Promise(r2 => setTimeout(r2, 50));
    K3D.noRender = true;
    const st = G.mst, K = K3D.K, out = [], PR = PARKCOASTER_ROUTE;
    let n = 0, worst = { m: 1e9 }, run = null;
    while (G.mode === 'play' && n < 120 * 400) {
      P.step(P.DT); n++;
      if (n % 2) continue;
      PARKCOASTER_SCENE.update(K, st, 1 / 60);
      K.camera.updateMatrixWorld(true);
      if (st.phase !== 'ride') continue;
      const f = PARKCOASTER.frame(st);
      let m = 1e9, behind = false;
      for (const ox of [-0.95, 0.95]) for (const oy of [0.1, 1.9]) for (const oz of [-1.3, 1.3]) {
        const p = [0, 1, 2].map(k => f.p[k] + f.br[k] * ox + f.bu[k] * (oy + st.air) + f.t[k] * oz), q = K3D.toScreen(p[0], p[1], p[2]);
        if (q.z > 1) behind = true;
        m = Math.min(m, q.x, 960 - q.x, q.y, 540 - q.y);
      }
      if (behind) m = -999;
      const c = K3D.toScreen(f.p[0] + f.bu[0] * (0.8 + st.air), f.p[1] + f.bu[1] * (0.8 + st.air), f.p[2] + f.bu[2] * (0.8 + st.air));
      if (m < worst.m) worst = { m: Math.round(m), s: Math.round(st.s), t: +(n / 120).toFixed(1) };
      if (m < margin) { if (!run) run = { s0: Math.round(st.s), t0: +(n / 120).toFixed(1), min: m }; if (m <= run.min) { run.min = m; run.c = [Math.round(c.x), Math.round(c.y)]; } run.s1 = Math.round(st.s); }
      else if (run) { out.push(run); run = null; }
      if (n % 6000 === 0) await new Promise(r2 => setTimeout(r2, 0));
    }
    if (run) out.push(run);
    const name = s => Object.entries(PR.at).reduce((b, [k, v]) => (Math.abs(v - s) < Math.abs(b[1] - s) ? [k, v] : b), ['', 1e9])[0];
    return { worst, out: out.map(o => `s ${o.s0}-${o.s1} (t ${o.t0}s, near ${name(o.s0)}): ${o.min < -900 ? 'behind the camera' : Math.round(o.min) + ' px from the edge'}, car middle at ${o.c} of 960x540`) };
  }, { margin: +opt('margin', 12), reduced: args.includes('--reduced') });
  console.log(r.out.length ? r.out.join('\n') : 'the whole car stays on screen');
  console.log('closest to the edge: ' + JSON.stringify(r.worst));
  if (errs.length) console.log('errors: ' + errs.slice(0, 3).join('\n'));
  await browser.close();
  process.exit(r.out.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
