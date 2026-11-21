#!/usr/bin/env node
// 43-1 Coin Drop: how heavy each part of the ride is to draw. One browser, the level loaded once, the coins put at a
// list of places in turn; for each: draw calls, triangles, textures and the time a frame takes here (software WebGL,
// so the times only compare places with each other, they are not a real PC's frame times).
//   node tools/w43/perf.js [s ...]        (no s: a spread of places along the whole ride, and two moments of the opening)
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..', '..');
const ctx = { console, Math }; vm.createContext(ctx);
for (const f of ['js/3d/rail.js', 'js/levels/world43/arcadecoin-route.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8').replace(/^const (\w+) =/m, 'globalThis.$1 ='), ctx);
const A = ctx.ARCADECOIN_ROUTE.at;
const want = process.argv.slice(2).map(Number).filter(n => !isNaN(n));
const places = want.length ? want.map(s => ({ s })) : [{ intro: 1.6 }, { intro: 11 }, ...[3, 40, 96, 124, A.split1a + 6, A.spring1 - 3, A.brink - 2, A.gears + 10, A.city - 10, 930, A.ck5 + 6, 1060, A.pillars, A.spring3 - 4, A.box + 20, A.start - 30].map(s => ({ s: +s.toFixed(1) }))];
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e.stack || e)));
  await page.goto('file://' + path.join(root, 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => window.__pipbo.K3D.need());
  console.log('place            calls     tris   tex   geo   ms/frame');
  for (const pl of places) {
    const r = await page.evaluate(async pl => {
      const P = window.__pipbo, G = P.G, K3D = P.K3D;
      if (!G.mst || G.lmode !== MODES.arcadecoin) { G.manual = true; G.cpuOn = [false, false]; P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'arcadecoin')); }
      const st = G.mst;
      if (pl.intro != null) { st.phase = 'intro'; st.phaseT = pl.intro; st.t = pl.intro; }
      else { st.phase = 'ride'; st.phaseT = 0; st.s = st.prevS = pl.s; st.restart = pl.s; st.c[0].x = -1.6; st.c[1].x = 1.6; }
      K3D.noRender = false; G.introT = 0;
      const frames = []; let last = performance.now();
      await new Promise(res => { let n = 0; const f = () => { const now = performance.now(); frames.push(now - last); last = now; if (++n < 12) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      const i = K3D.R.info;
      return { calls: i.render.calls, tris: i.render.triangles, tex: i.memory.textures, geo: i.memory.geometries, ms: frames.slice(4).reduce((a, b) => a + b, 0) / (frames.length - 4) };
    }, pl);
    const name = pl.intro != null ? 'intro ' + pl.intro : 's ' + pl.s;
    console.log(name.padEnd(14) + String(r.calls).padStart(8) + String(r.tris).padStart(10) + String(r.tex).padStart(6) + String(r.geo).padStart(6) + r.ms.toFixed(0).padStart(10));
  }
  if (errs.length) console.log('page errors:\n' + errs.slice(0, 6).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
