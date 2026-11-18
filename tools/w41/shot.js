#!/usr/bin/env node
// 41-1 Carry It Together: a screenshot of a page in play, from headless Chromium with software WebGL (SwiftShader).
//   node tools/w41/shot.js <page 1-4> <simulated secs> <out.png> [--wait=4] [--size=1280x720] [--dpr=1] [--who=pair|idle]
//                          [--eval="js run in the page before the shot"] [--page=build/pip-and-bo.html]
// The computer plays both heroes (drawing off) for <simulated secs> from the start of the page, then the picture is
// drawn for --wait wall-clock seconds (the camera settles) and taken. Prints draw calls, triangles and any page errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const [pg = '1', secs = '0', out = 'build/w41-shot.png'] = pos;
  const [w, h] = opt('size', '1280x720').split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +opt('dpr', 1) });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e.stack || e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', opt('page', 'index.html')));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const ok = await page.evaluate(() => window.__pipbo.K3D.need());
  if (!ok) console.log('3D failed: ' + await page.evaluate(() => window.__pipbo.K3D.why));
  const r = await page.evaluate(async ({ pg, secs, who }) => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D;
    const i = P.LEVELS.findIndex(l => l.mode === 'popcarry');
    G.manual = true; K3D.noRender = true;
    P.CPU.skillOf = [null, null];
    G.cpuOn = who === 'idle' ? [false, false] : [true, true];
    P.loadLevel(i);
    for (let k = 1; k < pg; k++) P.nextRoom();
    const steps = Math.round(secs / P.DT), room = G.room;
    for (let n = 0; n < steps && G.mode === 'play' && G.room === room; n++) {
      if (who === 'idle') for (const p of G.players) for (const key in p.input) p.input[key] = false;
      P.step(P.DT);
      if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0));
    }
    K3D.noRender = false;
    return { mode: G.mode, room: G.room, s: G.mst && G.mst.s };
  }, { pg: +pg, secs: +secs, who: opt('who', 'pair') });
  if (opt('eval', '')) await page.evaluate(opt('eval', ''));
  await page.waitForTimeout(+opt('wait', 4) * 1000);
  const info = await page.evaluate(() => { const r = window.__pipbo.K3D.R; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries } : null; });
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => { window.__pipbo.K3D.freeze = true; r(); })));
  await page.screenshot({ path: out, clip: box, animations: 'allow', caret: 'initial', timeout: 120000 });
  console.log(out, JSON.stringify(r), JSON.stringify(info), errs.length ? '\nerrors: ' + errs.slice(0, 8).join('\n') : '');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
