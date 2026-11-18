#!/usr/bin/env node
// Screenshots of 41-3 Paper Dragon Flight from headless Chromium with software WebGL (slow: about 1 s a frame).
//   node tools/w41/popdragon-shot.js <out.png> [--s=40] [--ox=0] [--oy=0] [--shot=side|front|back|riders|wide|play]
//        [--size=1280x720] [--wait=4] [--eye=x,y,z --at=x,y,z --fov=40] [--phase=fly|takeoff] [--tuck=0] [--fire=0]
//        [--eval="js run in the page before the shot"] [--many=spec.json (a list of { out, ...same keys })]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const jobs = opt('many', '') ? JSON.parse(fs.readFileSync(opt('many'), 'utf8')) : [{ out: pos[0] || 'build/popdragon.png' }];
  const [w, h] = opt('size', '1280x720').split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +opt('dpr', 1) });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html') + '?w41shot');
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G, null, { timeout: 60000 });
  await page.evaluate(() => {
    const { G, LEVELS, loadLevel } = window.__pipbo;
    const i = LEVELS.findIndex(l => l.name === 'Paper Dragon Flight');
    loadLevel(i, 'play'); hideOverlay(); G.manual = true; G.introT = 0; G.mode = 'play';
    window.K3D = K3D; K3D.need();
  });
  await page.waitForFunction(() => K3D.state === 'ready' || K3D.state === 'failed', null, { timeout: 120000 });
  for (const j of jobs) {
    const o = k => j[k] != null ? j[k] : opt(k, null);
    await page.evaluate((o) => {
      const { G, step, DT } = window.__pipbo, st = G.mst, R = POPDRAGON_ROUTE;
      st.phase = o.phase || 'fly';
      if (o.s != null) st.s = +o.s; st.ox = +(o.ox || 0); st.oy = +(o.oy || 0);
      st.vx = +(o.vx || 0); st.vy = +(o.vy || 0); st.tuck = +(o.tuck || 0); st.fire = +(o.fire || 0); st.fireCd = o.fire ? 1 : 0;
      st.prime = null; st.prime = st.s; st.ox0 = st.ox;
      if (o.eye) st.camShot = { eye: o.eye.split(',').map(Number), at: o.at.split(',').map(Number), fov: +(o.fov || 40) };
      else if (o.shot === 'play' || !o.shot) st.camShot = null; else st.camShot = o.shot;
      const hud = !(o.hide || '').includes('hud'); G.level.def.ownPills = !hud; st.noHud = !hud; const mb = document.getElementById('menuBtn'); if (mb) mb.style.visibility = hud ? '' : 'hidden';
      if (o.evalJs) (0, eval)(o.evalJs);
      window.__shotFrames = 0;
    }, { s: o('s'), ox: o('ox'), oy: o('oy'), vx: o('vx'), vy: o('vy'), shot: o('shot'), eye: o('eye'), at: o('at'), fov: o('fov'), phase: o('phase'), tuck: o('tuck'), fire: o('fire'), hide: o('hide'), evalJs: o('eval') });
    await page.waitForTimeout(+(o('wait') || 4) * 1000);
    const info = await page.evaluate((dbg) => {
      const r = K3D.R, o = r ? { calls: r.info.render.calls, tris: r.info.render.triangles } : {};
      if (dbg && K3D.K && K3D.K.pd) { const pd = K3D.K.pd, f = v => v.toArray().map(x => +x.toFixed(1)); const h = new K3D.T.Vector3(); pd.dragon.userData.head.getWorldPosition(h);
        const tr = pd.dragon.userData.trail; o.eye = f(pd.cam.eye); o.at = f(pd.cam.at); o.head = f(h); o.tail = f(tr[tr.length - 1]); o.s = G.mst.s; o.ox = G.mst.ox; }
      return o; }, !!opt('debug', ''));
    const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    await page.screenshot({ path: o('out'), clip: box, timeout: 120000 });
    console.log(o('out'), JSON.stringify(info));
  }
  if (errs.length) console.log('errors:\n' + [...new Set(errs)].slice(0, 12).join('\n'));
  await browser.close();
})();
