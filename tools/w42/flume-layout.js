#!/usr/bin/env node
// 42-2 Log Flume Plunge: a check that the park's furniture stands where it should.
//   node tools/w42/flume-layout.js [--list=1]
// Builds the level (drawing off) with the park kit's builders wrapped, so every tree, lamp, bench, bin, stall, booth,
// cart, hedge animal, bunch of balloons and tent reports where it was put. Fails when
//   - two of them stand in each other (their footprints overlap),
//   - a park tree's trunk is not on lawn (on a cobbled walk, the gravel towpath, sand, sawdust or in the water),
//   - anything is in the water, or a stall, booth, hedge animal or tent is on a walk.
// Prints how many of each stand in the park (so a change that empties the gardens shows up).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.stack || e)));
  await page.goto('file://' + path.resolve(opt('root', path.resolve(__dirname, '..', '..')), 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (!await page.evaluate(() => window.__pipbo.K3D.need())) console.log('3D failed: ' + await page.evaluate(() => window.__pipbo.K3D.why));
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D;
    const put = window.__put = [], wrap = (name, where, rad) => { const f = PARK[name]; PARK[name] = function (...a) { const [x, z, s] = where(a); put.push({ k: name, x, z, r: rad(a, s) }); return f.apply(this, a); }; };
    wrap('tree', a => [a[1], a[2], a[3] || 1], (a, s) => 0.4 * s);
    wrap('lamp', a => [a[2].x, a[2].z], () => 0.35);
    wrap('bench', a => [a[1], a[2]], () => 1.1);
    wrap('bin', a => [a[1], a[2]], () => 0.4);
    wrap('stall', a => [a[2].x, a[2].z], () => 2.6);
    wrap('booth', a => [a[2].x, a[2].z], () => 1.3);
    wrap('cart', a => [a[3].x, a[3].z], () => 0.95);
    wrap('hedgeAnimal', a => [a[1], a[2]], () => 1.6);
    wrap('balloons', a => [a[1], a[3]], () => 0.45);
    wrap('tent', a => [a[2].x, a[2].z, a[2].r || 5], (a, s) => s);
    // (the scene is built on the first drawn frame: drawing goes off again as soon as it stands)
    const b = PARKFLUME_SCENE.build; PARKFLUME_SCENE.build = (K, st) => { const o = b(K, st); window.__built = true; K3D.noRender = true; return o; };
    G.manual = true; G.cpuOn = [false, false];
    P.loadLevel(P.LEVELS.findIndex(l => l.mode === 'parkflume'));
  });
  await page.waitForFunction(() => window.__built, null, { timeout: 180000 });
  const r = await page.evaluate(() => {
    const put = window.__put;
    const kindAt = PARKFLUME_SCENE.kindAt || (() => '?'), bad = [], n = {};
    for (const o of put) {
      n[o.k] = (n[o.k] || 0) + 1; o.on = kindAt(o.x, o.z);
      const at = o.k + ' at ' + o.x.toFixed(1) + ', ' + o.z.toFixed(1);
      if (o.on === 'water') bad.push(at + ' is in the water');
      else if (o.k === 'tree' && o.on !== 'grass') bad.push(at + ' grows out of ' + o.on);
      else if (['stall', 'booth', 'hedgeAnimal', 'tent'].includes(o.k) && o.on === 'pave') bad.push(at + ' stands on a walk');
    }
    // overlaps (a grid of buckets)
    const B = 12, m = new Map();
    put.forEach((o, i) => { const k = Math.floor(o.x / B) + ',' + Math.floor(o.z / B); if (!m.has(k)) m.set(k, []); m.get(k).push(i); });
    put.forEach((o, i) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of m.get((Math.floor(o.x / B) + a) + ',' + (Math.floor(o.z / B) + b)) || []) { if (j <= i) continue; const q = put[j], d = Math.hypot(o.x - q.x, o.z - q.z); if (d < o.r + q.r - 0.05) bad.push(o.k + ' at ' + o.x.toFixed(1) + ', ' + o.z.toFixed(1) + ' overlaps ' + q.k + ' at ' + q.x.toFixed(1) + ', ' + q.z.toFixed(1) + ' (' + d.toFixed(2) + ' apart)'); } });
    return { n, bad, total: put.length, list: put.map(o => o.k + ' ' + o.x.toFixed(1) + ' ' + o.z.toFixed(1) + ' ' + o.on) };
  });
  console.log('stands in the park: ' + r.total + '  ' + JSON.stringify(r.n));
  if (opt('list', '')) console.log(r.list.join('\n'));
  for (const b of r.bad.slice(0, 40)) console.log('  BAD ' + b);
  if (errs.length) console.log('errors: ' + errs.slice(0, 5).join('\n'));
  const ok = !r.bad.length && !errs.length;
  console.log(ok ? 'layout ok' : 'layout FAILED (' + r.bad.length + ' problems)');
  await browser.close();
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
