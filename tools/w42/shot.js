#!/usr/bin/env node
// 42-1 Runaway Coaster: a screenshot from headless Chromium with software WebGL (SwiftShader).
//   node tools/w42/shot.js <simulated secs> <out.png> [--who=pair|idle] [--s=<metres along the track>] [--wait=4]
//        [--cam=eye.x,eye.y,eye.z,at.x,at.y,at.z[,fov]] [--carcam=side|front|behind|wide] [--size=1280x720] [--dpr=1]
//        [--eval="js run in the page before the shot"] [--page=build/pip-and-bo.html]
//        [--audit]   also list scenery pieces whose footprints overlap a lot (the placement check)
// Plays <simulated secs> of the ride (drawing off; the computer rides both seats, or nobody with --who=idle), or with --s
// puts the train straight at that place on the track, riding. --cam holds the camera still; --carcam frames the front
// car close up (the look shots). Prints draw calls, triangles and any page errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const [secs = '0', out = 'build/w42-shot.png'] = pos;
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
  if (args.includes('--audit')) await page.evaluate(() => { window.__w42audit = true; });
  const r = await page.evaluate(async ({ secs, who, s }) => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D;
    const i = P.LEVELS.findIndex(l => l.mode === 'parkcoaster');
    G.manual = true; K3D.noRender = true;
    P.CPU.skillOf = [null, null];
    G.cpuOn = who === 'idle' ? [false, false] : [true, true];
    P.loadLevel(i);
    const st = G.mst;
    if (s != null) { st.phase = 'ride'; st.started = true; st.s = st.prevS = s; st.v = PARKCOASTER_ROUTE.R.at(s).v; st.restart = s; }
    const steps = Math.round(secs / P.DT);
    for (let n = 0; n < steps && G.mode === 'play'; n++) {
      if (who === 'idle') for (const p of G.players) for (const key in p.input) p.input[key] = false;
      P.step(P.DT);
      if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0));
    }
    K3D.noRender = false; G.introT = 0;
    return { mode: G.mode, phase: st.phase, s: +st.s.toFixed(1), t: +st.t.toFixed(1), tickets: st.tickets, rattles: st.rattles, bolts: st.bolts };
  }, { secs: +secs, who: opt('who', 'pair'), s: opt('s', null) != null ? +opt('s') : null });
  const cam = opt('cam', ''), carcam = opt('carcam', '');
  if (cam) await page.evaluate(c => { const v = c.split(',').map(Number); PARKCOASTER_SCENE.camOverride = { eye: v.slice(0, 3), at: v.slice(3, 6), fov: v[6] || 50 }; }, cam);
  if (carcam) await page.evaluate(k => {
    // a camera fixed to the front car's frame: [sideways (+ = Bo's side), up, back (+ = behind)] for the eye, looking at the car
    const st = window.__pipbo.G.mst, f = PARKCOASTER.frame(st), o = { side: [5.2, 1.6, -0.2], front: [0.6, 1.5, -5.4], behind: [-0.4, 2.2, 5.6], wide: [9, 5, -9] }[k];
    const P = (a, b, c) => [f.p[0] + f.r[0] * a + f.u[0] * b - f.t[0] * c, f.p[1] + f.r[1] * a + f.u[1] * b - f.t[1] * c, f.p[2] + f.r[2] * a + f.u[2] * b - f.t[2] * c];
    PARKCOASTER_SCENE.camOverride = { eye: P(o[0], o[1], o[2]), at: P(0, 0.75, k === 'behind' ? -0.6 : 0.4), fov: 42 };
  }, carcam);
  if (opt('eval', '')) await page.evaluate(opt('eval', ''));
  await page.waitForTimeout(+opt('wait', 4) * 1000);
  const info = await page.evaluate(() => { const r = window.__pipbo.K3D.R; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries } : null; });
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => { window.__pipbo.K3D.freeze = true; r(); })));
  await page.screenshot({ path: out, clip: box, animations: 'allow', caret: 'initial', timeout: 120000 });
  if (args.includes('--audit')) console.log('audit', JSON.stringify(await page.evaluate(() => window.__w42audit)));
  console.log(out, JSON.stringify(r), JSON.stringify(info), errs.length ? '\nerrors: ' + errs.slice(0, 8).join('\n') : '');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
