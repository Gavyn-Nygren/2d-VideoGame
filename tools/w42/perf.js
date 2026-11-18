#!/usr/bin/env node
// 42-1 Runaway Coaster: how heavy each part of the ride is to draw. Puts the train at places along the track (riding),
// lets it run a moment with drawing on, and prints draw calls, triangles and the frame time at each, then the worst per
// stretch. Software WebGL (SwiftShader) is much slower than a real graphics card: read the milliseconds as "which place
// is heaviest", not as the frame rate a PC will get; draw calls and triangles are the same on any machine.
//   node tools/w42/perf.js [--step=60] [--size=1280x720] [--frames=12]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const [w, h] = opt('size', '1280x720').split('x').map(Number), step = +opt('step', 60), frames = +opt('frames', 12);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.stack || e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (!await page.evaluate(() => window.__pipbo.K3D.need())) { console.log('3D failed'); process.exit(1); }
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    G.cpuOn = [true, true]; P.CPU.skillOf = [null, null];
    P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'parkcoaster'));
  });
  await page.waitForFunction(() => window.__pipbo.K3D.R, null, { timeout: 120000 });
  const { len, parts } = await page.evaluate(() => ({ len: PARKCOASTER_ROUTE.R.len || PARKCOASTER_ROUTE.END, parts: PARKCOASTER_ROUTE.lists.parts.map(p => ({ name: p.name, s: p.s })) }));
  const rows = [];
  for (let s = 20; s < len - 20; s += step) {
    const r = await page.evaluate(async ({ s, frames }) => {
      const P = window.__pipbo, G = P.G, st = G.mst, R = P.K3D.R;
      st.phase = 'ride'; st.started = true; st.s = st.prevS = s; st.v = PARKCOASTER_ROUTE.R.at(s).v; st.restart = s; G.introT = 0;
      const tick = () => new Promise(r => requestAnimationFrame(r));
      for (let i = 0; i < 4; i++) await tick();
      let calls = 0, tris = 0; const t0 = performance.now();
      for (let i = 0; i < frames; i++) { await tick(); calls = Math.max(calls, R.info.render.calls); tris = Math.max(tris, R.info.render.triangles); }
      return { s: Math.round(s), calls, tris, ms: +((performance.now() - t0) / frames).toFixed(1) };
    }, { s, frames });
    r.part = parts.filter(p => p.s <= r.s).pop()?.name || 'station';
    rows.push(r); console.log(`s ${String(r.s).padStart(5)}  ${r.part.padEnd(16)} calls ${String(r.calls).padStart(5)}  tris ${String(r.tris).padStart(8)}  ${r.ms} ms`);
  }
  console.log('\nworst per stretch:');
  for (const p of [...new Set(rows.map(r => r.part))]) {
    const rs = rows.filter(r => r.part === p), mx = k => Math.max(...rs.map(r => r[k]));
    console.log(`  ${p.padEnd(16)} calls ${mx('calls')}  tris ${mx('tris')}  ${mx('ms')} ms`);
  }
  const mem = await page.evaluate(() => window.__pipbo.K3D.R.info.memory);
  console.log(`memory: ${mem.geometries} geometries, ${mem.textures} textures`);
  if (errs.length) console.log('errors:\n' + errs.slice(0, 8).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
