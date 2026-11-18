#!/usr/bin/env node
// The per-page cost table for 41-2 Page Turner Chase: a computer pair plays the whole level, and every --every seconds
// a frame is drawn and measured (draw calls, triangles, textures, geometries; the time of a game step and of a draw).
// Headless Chromium draws with software WebGL, so the times only compare pages with each other; the counts are exact.
//   node tools/w41/chase-perf.js [--every=1.5] [--size=1920x1080] [--top]     --top: also the biggest draw-call groups
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const [w, h] = opt('size', '1920x1080').split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => { window.__k3dKeep = true; });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => { const P = window.__pipbo; P.G.manual = true; P.G.cpuOn = [true, true]; P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'popchase')); P.G.introT = 0; });
  await page.waitForFunction(() => ['ready', 'failed'].includes(window.__pipbo.K3D.state), null, { timeout: 120000 });
  const rows = await page.evaluate(async ({ every, top }) => {
    const P = window.__pipbo, G = P.G, DT = P.DT, R = P.K3D.R, out = [];
    let next = 0.5;
    for (let n = 0; n < 200 / DT && G.mode !== 'clear' && G.mode !== 'result'; n++) {
      const t0 = performance.now(); P.step(DT); const ts = performance.now() - t0;
      if (G.mst && G.mst.T >= next && G.mode === 'play') {
        next = G.mst.T + every;
        const t1 = performance.now(); P.render(DT); const tr = performance.now() - t1;
        const row = { k: G.mst.k, T: +G.mst.T.toFixed(1), calls: R.info.render.calls, tris: R.info.render.triangles, tex: R.info.memory.textures, geo: R.info.memory.geometries, stepMs: +ts.toFixed(2), drawMs: +tr.toFixed(1) };
        if (top) {
          const by = {}, scene = P.K3D.K.scene;
          scene.traverseVisible(o => { if (!o.isMesh && !o.isInstancedMesh && !o.isSprite && !o.isLine && !o.isPoints) return; let p = o; while (p.parent && p.parent !== scene) p = p.parent; const key = p.name || p.type; by[key] = (by[key] || 0) + 1; });
          row.top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => k + ':' + v).join(' ');
        }
        out.push(row);
      }
    }
    return out;
  }, { every: +opt('every', 1.5), top: args.includes('--top') });
  const names = ['Wood', 'Castle', 'Sea', 'The End'];
  console.log('page      frames  calls avg/max  triangles max  textures  geometries  step ms avg  draw ms avg (software GL)');
  for (let k = 0; k < 4; k++) {
    const r = rows.filter(x => x.k === k); if (!r.length) continue;
    const avg = f => r.reduce((s, x) => s + x[f], 0) / r.length, max = f => Math.max(...r.map(x => x[f]));
    console.log(names[k].padEnd(10) + String(r.length).padStart(6) + ('  ' + Math.round(avg('calls')) + '/' + max('calls')).padStart(15) + String(max('tris')).padStart(15) + String(max('tex')).padStart(10) + String(max('geo')).padStart(12) + avg('stepMs').toFixed(2).padStart(13) + avg('drawMs').toFixed(0).padStart(13));
  }
  if (args.includes('--top')) for (const r of rows) console.log(r.k, r.T, r.calls, r.top);
  if (errs.length) console.log('errors:\n' + errs.slice(0, 10).join('\n'));
  await browser.close();
})();
