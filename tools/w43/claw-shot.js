#!/usr/bin/env node
// 43-3 Claw Machine Rescue: a screenshot from headless Chromium with software WebGL (SwiftShader).
//   node tools/w43/claw-shot.js <out.png> [--secs=0] [--who=idle|pair] [--intro=<secs into the opening>]
//        [--eval="js run in the page (P, G, st = G.mst, CO = ARCADECLAW) before the shot"] [--after=<secs played after it>]
//        [--cam=eye.x,eye.y,eye.z,at.x,at.y,at.z[,fov]] [--size=1280x720] [--dpr=1] [--wait=2] [--nohud]
// Plays <secs> of the level with drawing off (nobody at the controls with --who=idle, the computer with --who=pair),
// runs --eval (to set up a moment: Bo's spot, the claw holding a toy...), plays --after more seconds, then draws.
// --cam holds the camera still. Prints draw calls, triangles, prize count and any page errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x === '--' + k || x.startsWith('--' + k + '=')); return a ? (a.includes('=') ? a.slice(k.length + 3) : true) : d; };
(async () => {
  const [out = 'build/w43-claw.png'] = pos;
  const [w, h] = opt('size', '1280x720').split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +opt('dpr', 1) });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e.stack || e)));
  await page.addInitScript(() => { window.__k3dKeep = true; });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', opt('page', 'index.html')));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const ok = await page.evaluate(() => window.__pipbo.K3D.need());
  if (!ok) console.log('3D failed: ' + await page.evaluate(() => window.__pipbo.K3D.why));
  const play = async (secs, who) => page.evaluate(async ({ secs, who }) => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D;
    K3D.noRender = true;
    const steps = Math.round(secs / P.DT);
    for (let n = 0; n < steps && G.mode === 'play'; n++) {
      if (who === 'idle') for (const p of G.players) for (const key in p.input) p.input[key] = false;
      P.step(P.DT);
      if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0));
    }
    K3D.noRender = false;
  }, { secs, who });
  const intro = opt('intro', null);
  await page.evaluate(({ who, intro }) => {
    const P = window.__pipbo, G = P.G;
    const i = P.LEVELS.findIndex(l => l.mode === 'arcadeclaw');
    G.manual = true; P.K3D.noRender = true;
    P.CPU.skillOf = [null, null];
    G.cpuOn = who === 'idle' ? [false, false] : [true, true];
    P.loadLevel(i);
    G.introT = 0;
    const st = G.mst;
    if (intro == null) { st.phase = 'play'; st.phaseT = 0; } else st.phaseT = +intro;
  }, { who: opt('who', 'idle'), intro });
  await play(+opt('secs', 0), opt('who', 'idle'));
  if (opt('eval', '')) await page.evaluate(src => { const P = window.__pipbo, G = P.G, st = G.mst; (new Function('P', 'G', 'st', 'CO', src))(P, G, st, window.ARCADECLAW); }, opt('eval', ''));
  if (+opt('after', 0) > 0) await play(+opt('after', 0), 'idle');
  // hold the game still (no more steps) while the picture settles
  await page.evaluate(() => { const G = window.__pipbo.G; G.cpuOn = [false, false]; for (const p of G.players) for (const k in p.input) p.input[k] = false; });
  const cam = opt('cam', '');
  if (cam) await page.evaluate(c => { const v = c.split(',').map(Number); ARCADECLAW_SCENE.camOverride = { eye: v.slice(0, 3), at: v.slice(3, 6), fov: v[6] || 50 }; }, cam);
  if (opt('nohud', false)) await page.evaluate(() => { const c = document.getElementById('game'); if (c) c.style.opacity = '0'; });
  await page.waitForTimeout(+opt('wait', 2) * 1000);
  const info = await page.evaluate(() => { const r = window.__pipbo.K3D.R, SC = typeof ARCADECLAW_SCENE !== 'undefined' ? ARCADECLAW_SCENE.SC : null; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries, prizes: SC && SC.heaps ? SC.heaps.count : null, camD: SC && SC.camD ? +SC.camD.toFixed(1) : null } : null; });
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => { window.__pipbo.K3D.freeze = true; r(); })));
  await page.screenshot({ path: out, clip: box, animations: 'allow', caret: 'initial', timeout: 240000 });
  const st = await page.evaluate(() => { const G = window.__pipbo.G, st = G.mst, b = G.players[1].b3; return { mode: G.mode, phase: st.phase, t: +st.t.toFixed(1), bo: [b.x, b.y, b.z].map(v => +v.toFixed(2)), claw: [st.claw.u, st.claw.s].map(v => +v.toFixed(2)), freed: st.freed }; });
  console.log(out, JSON.stringify(st), JSON.stringify(info), errs.length ? '\nerrors: ' + errs.slice(0, 10).join('\n') : '');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
