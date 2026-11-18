#!/usr/bin/env node
// 41-3 Paper Dragon Flight: draw calls and triangles at points along the flight (headless SwiftShader, so the numbers
// are counts, not frame times). Prints one row per place, and with --top the groups that cost the most calls there.
//   node tools/w41/popdragon-perf.js [--at=takeoff,shelf,...|s numbers] [--top]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k)); return a ? (a.split('=')[1] || true) : d; };
const AT = String(opt('at', 'desk,lamp,web,shelf,tunnel,chess,bedroom,mobile,pounce,slot2,window,climb,tis1,gap,vane,chim,dive,end')).split(',');
const TOP = !!opt('top', false);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await p.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await p.evaluate(() => { const { G, LEVELS, loadLevel } = window.__pipbo; loadLevel(LEVELS.findIndex(l => l.mode === 'popdragon'), 'play'); hideOverlay(); G.manual = true; G.introT = 0; G.mode = 'play'; K3D.need(); });
  await p.waitForFunction(() => K3D.state === 'ready', null, { timeout: 120000 });
  console.log('place        s      calls   tris(k)');
  for (const at of AT) {
    const s = await p.evaluate(at => {
      const R = POPDRAGON_ROUTE, pl = Object.assign({ desk: 30, lamp: R.place.lamp || 120, end: R.len - 8 }, R.place);
      return isFinite(+at) ? +at : pl[at] != null ? pl[at] : null;
    }, at);
    if (s == null) { console.log(at.padEnd(12) + ' unknown place'); continue; }
    await p.evaluate(s => { const st = window.__pipbo.G.mst; st.phase = 'fly'; st.s = s; st.safe = 99; K3D.K.pd.cam = null; }, s);
    await p.waitForTimeout(1200);
    const r = await p.evaluate(top => {
      const K = K3D.K, pd = K.pd, info = K3D.R.info.render, out = { calls: info.calls, tris: Math.round(info.triangles / 1000) };
      if (top) {
        const art = pd.art, c = {};
        const zn = new Map(); for (const [name, z] of Object.entries(art.zone || {})) { zn.set(z.still, 'zone ' + name + ' still'); zn.set(z.live, 'zone ' + name + ' live'); }
        const lab = o => { for (let q = o; q; q = q.parent) { if (q === pd.dragon) return 'dragon+riders'; if (zn.has(q.parent)) return zn.get(q.parent) + (zn.get(q.parent).endsWith('live') ? ':' + (q.name || q.parent.children.indexOf(q)) : ''); if (q.parent === art.still) return 'still'; if (q.parent === art.live) return 'live:' + (q.name || art.live.children.indexOf(q)); } return 'other'; };
        // only what the camera can see (roughly the draw calls; shadow passes come on top)
        const cam = K.camera; cam.updateMatrixWorld();
        const fr = new K3D.T.Frustum().setFromProjectionMatrix(new K3D.T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
        K.scene.traverseVisible(o => {
          if (!(o.isMesh || o.isSprite || o.isPoints || o.isLine)) return;
          if (o.frustumCulled && !(o.isSprite ? fr.intersectsSprite(o) : fr.intersectsObject(o))) return;
          const k = lab(o); c[k] = (c[k] || 0) + 1; out.seen = (out.seen || 0) + 1;
        });
        let cast = 0; K.scene.traverseVisible(o => { if (o.castShadow && (o.isMesh)) cast++; }); out.cast = cast;
        out.top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => k + ' ' + n).join(', ');
      }
      return out;
    }, TOP);
    console.log(`${at.padEnd(12)} ${String(Math.round(s)).padStart(5)}  ${String(r.calls).padStart(6)}  ${String(r.tris).padStart(7)}` + (r.top ? `  (seen ${r.seen}, shadow casters ${r.cast})\n     ` + r.top : ''));
  }
  if (errs.length) console.log('PAGE ERRORS: ' + errs.slice(0, 3).join(' | '));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
