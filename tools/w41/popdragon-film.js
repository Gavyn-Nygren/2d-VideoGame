#!/usr/bin/env node
// 41-3 Paper Dragon Flight: pictures of a REAL flight. popdragon-shot.js drops the dragon at a spot (the clock stands
// still, the cat and the paws are wherever a fresh level has them); this one flies the level from the start with the
// computer in both seats and stops for a picture each time the dragon reaches one of the places asked for, so every
// picture shows what a player would see there: the camera where it really follows, the books mid-tip, the cat where it
// has got to. Headless Chromium with software WebGL (slow: a few seconds a picture).
//   node tools/w41/popdragon-film.js <out-dir> --at=30,112,300,... [--size=1280x720] [--dpr=1] [--wait=2.5] [--hide=hud]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2), dir = args.find(a => !a.startsWith('--')) || 'build/popdragon-film';
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const at = opt('at', '30,120,300,500,650,980,1080,1330,1430,1560,1720,1846,1912,2200').split(',').map(Number).sort((a, b) => a - b);
(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const [w, h] = opt('size', '1280x720').split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +opt('dpr', 1) });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html') + '?w41shot');
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G, null, { timeout: 60000 });
  await page.evaluate((hide) => {
    const { G, LEVELS, loadLevel } = window.__pipbo;
    G.cpuOn = [true, true];
    loadLevel(LEVELS.findIndex(l => l.mode === 'popdragon'), 'play'); hideOverlay(); G.manual = true; G.introT = 0; G.mode = 'play';
    if (hide) { G.level.def.ownPills = true; G.mst.noHud = true; const mb = document.getElementById('menuBtn'); if (mb) mb.style.visibility = 'hidden'; }
    K3D.need();
  }, (opt('hide', '') || '').includes('hud'));
  await page.waitForFunction(() => K3D.state === 'ready' || K3D.state === 'failed', null, { timeout: 120000 });
  for (const s of at) {
    // fly on to s (a picture's worth of flying at a time, so the camera and the dragon's body follow as in play)
    for (;;) {
      const r = await page.evaluate((to) => {
        const { G, step, DT } = window.__pipbo, st = G.mst;
        // (far from the next picture it flies on without drawing: only the last stretch is drawn as it goes)
        const far = to - st.s > 6;
        K3D.noRender = far;
        for (let k = 0; k < (far ? 2400 : 12) && st.s < to - (far ? 6 : 0) && G.mode === 'play' && st.phase !== 'catch'; k++) step(DT);
        if (far && to - st.s <= 6) { st.prime = st.s; if (K3D.K && K3D.K.pd) K3D.K.pd.cam = null; }   // (drawing again: the body and the camera start where they would be)
        return { s: st.s, phase: st.phase, mode: G.mode };
      }, s);
      if (r.s >= s || r.mode !== 'play' || r.phase === 'catch') break;
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(+opt('wait', 2.5) * 1000);
    const info = await page.evaluate(() => { const st = window.__pipbo.G.mst, r = K3D.R; return { s: +st.s.toFixed(0), t: +st.clock.toFixed(1), ox: +st.ox.toFixed(1), oy: +st.oy.toFixed(1), crumples: st.crumplesAll, calls: r ? r.info.render.calls : 0 }; });
    const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    const out = path.join(dir, String(s).padStart(4, '0') + '.png');
    await page.screenshot({ path: out, clip: box, timeout: 120000 });
    console.log(out, JSON.stringify(info));
  }
  if (errs.length) console.log('errors:\n' + [...new Set(errs)].slice(0, 12).join('\n'));
  await browser.close();
})();
