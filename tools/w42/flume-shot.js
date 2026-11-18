#!/usr/bin/env node
// 42-2 Log Flume Plunge: a screenshot from headless Chromium with software WebGL (SwiftShader).
//   node tools/w42/flume-shot.js <simulated secs> <out.png> [--who=pair|idle|paddle] [--s=<metres along the channel>] [--x=<across>]
//        [--wait=4] [--cam=eye.x,eye.y,eye.z,at.x,at.y,at.z[,fov]] [--logcam=side|front|behind|wide|above]
//        [--size=1280x720] [--dpr=1] [--eval="js run in the page before the shot"] [--page=index.html]
// Plays <simulated secs> (drawing off; the computer paddles both seats, nobody with --who=idle, or a scripted pair
// stroking together every second with --who=paddle), or with --s puts the log straight at that place, riding.
// --cam holds the camera still; --logcam frames the log close up (the look shots). Prints draw calls and page errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const [secs = '0', out = 'build/w42-flume.png'] = pos;
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
  const r = await page.evaluate(async ({ secs, who, s, x }) => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D;
    const i = P.LEVELS.findIndex(l => l.mode === 'parkflume');
    G.manual = true; K3D.noRender = true;
    P.CPU.skillOf = [null, null];
    G.cpuOn = who === 'pair' ? [true, true] : [false, false];
    P.loadLevel(i);
    const st = G.mst;
    if (!window.__wrapped && typeof PARKFLUME_SCENE !== 'undefined') { window.__wrapped = true; const b = PARKFLUME_SCENE.build; PARKFLUME_SCENE.build = (K, s) => { window.__K = K; return b(K, s); }; }
    if (s != null) { st.phase = 'ride'; st.started = true; st.s = st.prevS = s; st.x = x || 0; st.restart = s; }
    const steps = Math.round(secs / P.DT);
    for (let n = 0; n < steps && G.mode === 'play'; n++) {
      if (who !== 'pair') for (const p of G.players) for (const key in p.input) p.input[key] = false;
      if (who === 'paddle' && n % Math.round(1 / P.DT) === 0) for (const p of G.players) p.pendingAct = true; // strokes together every second
      P.step(P.DT);
      if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0));
    }
    K3D.noRender = false; G.introT = 0;
    return { mode: G.mode, phase: st.phase, s: +st.s.toFixed(1), x: +st.x.toFixed(2), t: +st.t.toFixed(1), ducks: st.ducks, soaks: st.soaks, sinkings: st.sinkings, water: +st.water.toFixed(2) };
  }, { secs: +secs, who: opt('who', 'pair'), s: opt('s', null) != null ? +opt('s') : null, x: +opt('x', 0) });
  const cam = opt('cam', ''), logcam = opt('logcam', '');
  if (cam) await page.evaluate(c => { const v = c.split(',').map(Number); PARKFLUME_SCENE.camOverride = { eye: v.slice(0, 3), at: v.slice(3, 6), fov: v[6] || 50 }; }, cam);
  if (logcam) await page.evaluate(k => {
    // a camera fixed to the log: [sideways (+ = right), up, back (+ = behind)] for the eye, looking at the riders
    const st = window.__pipbo.G.mst, f = PARKFLUME_LOG.place(st), o = { side: [5.0, 1.8, -0.3], front: [2.4, 1.2, -4.8], behind: [-0.5, 2.6, 5.8], wide: [9, 5.5, -9], above: [2.5, 5.5, 4.5] }[k];
    const P = (a, b, c) => [f.p.x + f.right.x * a + f.up.x * b - f.fwd.x * c, f.p.y + f.right.y * a + f.up.y * b - f.fwd.y * c, f.p.z + f.right.z * a + f.up.z * b - f.fwd.z * c];
    PARKFLUME_SCENE.camOverride = { eye: P(o[0], o[1], o[2]), at: P(0, 0.7, 0), fov: 42 };
  }, logcam);
  if (opt('eval', '')) await page.evaluate(opt('eval', ''));
  await page.waitForTimeout(+opt('wait', 4) * 1000);
  const info = await page.evaluate(() => { const r = window.__pipbo.K3D.R; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries } : null; });
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => { window.__pipbo.K3D.freeze = true; r(); })));
  await page.screenshot({ path: out, clip: box, animations: 'allow', caret: 'initial', timeout: 120000 });
  console.log(out, JSON.stringify(r), JSON.stringify(info), errs.length ? '\nerrors: ' + errs.slice(0, 8).join('\n') : '');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
