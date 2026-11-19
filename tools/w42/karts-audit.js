#!/usr/bin/env node
// 42-4 Go-Kart Grand Prix: the placement audit (the same idea as tools/w42/shot.js --audit for 42-1). Builds the
// park and lists: pairs of ground things whose footprints overlap a lot, trees and hedge animals not wholly on grass
// (the kit's ground mask, K.groundAll), and ground things standing inside the road's walls or a shortcut.
// Usage: node tools/w42/karts-audit.js [-v]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 640, height: 360 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => window.__pipbo.K3D.need());
  const r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D, T = K3D.T, TR = PARKKARTS_TRACK;
    G.manual = true; G.cpuOn = [true, true];
    // every kit thing the park sets on the ground, as it is placed: kind, spot, footprint radius
    const put = [], R = { tree: 1.3, hedgeAnimal: 1.7, bench: 1.0, bin: 0.4, lamp: 0.35, stall: 3.2, booth: 1.5, cart: 1.2, tent: 0, balloons: 0.5, robot: 0.6 };
    const wrap = (n, at) => { const f = PARK[n]; if (!f) return; PARK[n] = function (...a) { const p = at(a); const o = f.apply(this, a); if (p && isFinite(p[0])) put.push({ n, x: p[0], z: p[1], r: n === 'tent' ? (p[2] || 5) : R[n], o }); return o; }; };
    wrap('tree', a => [a[1], a[2]]); wrap('hedgeAnimal', a => [a[1], a[2]]); wrap('bench', a => [a[1], a[2]]); wrap('bin', a => [a[1], a[2]]); wrap('balloons', a => [a[1], a[3]]);
    wrap('lamp', a => [a[2].x, a[2].z]); wrap('stall', a => [a[2].x, a[2].z]); wrap('booth', a => [a[2].x, a[2].z]); wrap('tent', a => [a[2].x, a[2].z, a[2].r]); wrap('cart', a => [a[3].x, a[3].z]);
    P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'parkkarts')); G.introT = 0;
    P.render(0.001); if (K3D.R) K3D.R.render = () => {};
    const K = K3D.K, bx = [], b3 = new T.Box3(), sz = new T.Vector3(), c = new T.Vector3();
    const nameOf = o => o.name || (o.type + o.children.length + ':' + o.children.slice(0, 3).map(ch => (ch.geometry ? ch.geometry.type.replace('Geometry', '') : ch.type) + (ch.material && ch.material.color ? ch.material.color.getHexString() : '')).join(','));
    for (const o of K.root.children) {
      if (o.isInstancedMesh || o.isPoints || o.isSprite || o === K.glintIM || !o.visible) continue;
      b3.setFromObject(o); if (b3.isEmpty()) continue; b3.getSize(sz); b3.getCenter(c);
      if (sz.x > 30 || sz.z > 30 || sz.x * sz.z < 1.2 || b3.max.y < 0.5 || b3.min.y > 2) continue;
      bx.push({ x0: b3.min.x, x1: b3.max.x, z0: b3.min.z, z1: b3.max.z, a: sz.x * sz.z, n: nameOf(o), x: c.x, z: c.z, px: o.position.x, pz: o.position.z, h: b3.max.y });
    }
    const overlaps = [], offGrass = [], onRoad = [], rd = v => Math.round(v);
    for (let i = 0; i < bx.length; i++) for (let j = i + 1; j < bx.length; j++) {
      const A = bx[i], B = bx[j], ix = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), iz = Math.min(A.z1, B.z1) - Math.max(A.z0, B.z0);
      if (A.n === 'tree' && B.n === 'tree' && Math.hypot(A.px - B.px, A.pz - B.pz) > 2.2) continue;
      if (ix > 0 && iz > 0 && ix * iz > 0.4 * Math.min(A.a, B.a)) overlaps.push(`${A.n} (${rd(A.x)},${rd(A.z)} ${rd(A.x1 - A.x0)}x${rd(A.z1 - A.z0)})  with  ${B.n} (${rd(B.x)},${rd(B.z)} ${rd(B.x1 - B.x0)}x${rd(B.z1 - B.z0)})`);
    }
    const names = {};
    for (const A of bx) {
      names[A.n] = (names[A.n] || 0) + 1;
      if (/tree|hedge/i.test(A.n) && K.groundAll && !K.groundAll(A.px, A.pz, 0.8, 'grass')) offGrass.push(`${A.n} at ${rd(A.px)},${rd(A.pz)} on ${K.groundAt ? K.groundAt(A.px, A.pz) : '?'}`);
      // inside the walls of the main road or a shortcut (the footprint's middle)
      const wh = TR.where(A.x, A.z, null, -1), inside = Math.abs(wh.lat) < wh.w - 0.2 && (wh.on >= 0 || Math.hypot(A.x - TR.pos(wh.s, wh.lat)[0], A.z - TR.pos(wh.s, wh.lat)[1]) < 1);
      if (inside && A.h < 6) onRoad.push(`${A.n} at ${rd(A.x)},${rd(A.z)} (s ${rd(wh.s)}${wh.on >= 0 ? ' in ' + TR.branches[wh.on].name : ''} lat ${wh.lat.toFixed(1)} of ±${wh.w.toFixed(1)}, ${TR.PARTS[TR.partAt(wh.s)]})`);
    }
    // the kit things: on grass (trees, hedge animals), clear of the road and of each other
    const kit = { n: put.length, by: {}, offGrass: [], onRoad: [], clash: [] };
    for (const q of put) {
      kit.by[q.n] = (kit.by[q.n] || 0) + 1;
      // (robots, benches and lamps set down as part of a set piece are given their place after, at 0,0: skip those)
      if (q.x === 0 && q.z === 0) continue;
      if ((q.n === 'tree' || q.n === 'hedgeAnimal') && K.groundAll && !K.groundAll(q.x, q.z, q.n === 'tree' ? 0.9 : 1.4, 'grass')) kit.offGrass.push(`${q.n} at ${rd(q.x)},${rd(q.z)}`);
      const wh = TR.where(q.x, q.z, null, -1);
      let d = Math.abs(wh.lat) - wh.w;                      // > 0: outside the wall by that much
      if (wh.on < 0) { const pp = TR.pos(wh.s, wh.lat); if (Math.hypot(q.x - pp[0], q.z - pp[1]) > 1.5) d = 99; }
      if (d < q.r * 0.6) kit.onRoad.push(`${q.n} at ${rd(q.x)},${rd(q.z)}: ${d < 0 ? 'INSIDE the wall by ' + (-d).toFixed(1) : 'only ' + d.toFixed(1) + ' outside the wall'} (${TR.PARTS[TR.partAt(wh.s)]} s ${rd(wh.s)}${wh.on >= 0 ? ' ' + TR.branches[wh.on].name : ''})`);
    }
    for (let i = 0; i < put.length; i++) for (let j = i + 1; j < put.length; j++) {
      const A = put[i], B = put[j]; if ((A.x === 0 && A.z === 0) || (B.x === 0 && B.z === 0)) continue;
      const d = Math.hypot(A.x - B.x, A.z - B.z);
      if (A.n === 'tree' && B.n === 'tree') { if (d < 1.0) kit.clash.push(`tree + tree ${d.toFixed(1)} apart at ${rd(A.x)},${rd(A.z)}`); continue; }
      if ((A.n === 'lamp' && B.n === 'bin') || (A.n === 'bin' && B.n === 'lamp') || (A.n === 'bench' && B.n === 'lamp') || (A.n === 'lamp' && B.n === 'bench')) { if (d < 0.5) kit.clash.push(`${A.n} + ${B.n} ${d.toFixed(1)} apart at ${rd(A.x)},${rd(A.z)}`); continue; }
      if (d < (A.r + B.r) * 0.75) kit.clash.push(`${A.n} + ${B.n} ${d.toFixed(1)} apart at ${rd(A.x)},${rd(A.z)} (footprints ${A.r} and ${B.r})`);
    }
    return { n: bx.length, names, overlaps, offGrass, onRoad, kit };
  });
  const k = r.kit;
  console.log(`kit things placed: ${k.n} ${JSON.stringify(k.by)}`);
  console.log(`trees or hedge animals not wholly on grass: ${k.offGrass.length}`); k.offGrass.slice(0, 40).forEach(x => console.log('   ' + x));
  console.log(`kit things on or touching the road: ${k.onRoad.length}`); k.onRoad.slice(0, 60).forEach(x => console.log('   ' + x));
  console.log(`kit things standing in each other: ${k.clash.length}`); k.clash.slice(0, 60).forEach(x => console.log('   ' + x));
  if (!process.argv.includes('-v')) { await browser.close(); return; }
  console.log(`${r.n} ground things (bounding boxes; baked batches show as overlaps of their own parts)`);
  if (process.argv.includes('-v')) console.log(JSON.stringify(r.names));
  console.log(`overlapping pairs: ${r.overlaps.length}`); r.overlaps.slice(0, 60).forEach(x => console.log('   ' + x));
  console.log(`trees or hedges not wholly on grass: ${r.offGrass.length}`); r.offGrass.slice(0, 40).forEach(x => console.log('   ' + x));
  console.log(`things inside the road's walls: ${r.onRoad.length}`); r.onRoad.slice(0, 60).forEach(x => console.log('   ' + x));
  if (errs.length) console.log('PAGE ERR ' + errs.slice(0, 3).join(' | '));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
