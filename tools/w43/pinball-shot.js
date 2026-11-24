#!/usr/bin/env node
// 43-2 Pinball Panic: a screenshot from headless Chromium with software WebGL (SwiftShader).
//   node tools/w43/pinball-shot.js <simulated secs> <out.png> [--seed=1] [--cam=ex,ey,ez,ax,ay,az[,fov]]
//        [--ballcam=side|front|behind|low|top|chase[:id]] [--eval="js run in the page before the shot"] [--size=1280x720]
//        [--wait=6] [--sec=N] (start at section N) [--dpr=1]
// Plays <simulated secs> of the climb with drawing off (the computer plays both), then draws. --cam holds the camera
// still; --ballcam frames one ball close up (the look shots). --eval can set the state up (G.mst) for a moment before
// the picture: helpers put(id, x, d, o) places a ball, at(x, d, h) gives a world point. Prints draw calls and any errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const [secs = '0', out = 'build/w43-pinball.png'] = pos;
  const [w, h] = opt('size', '1280x720').split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +opt('dpr', 1) });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e.stack || e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const ok = await page.evaluate(() => window.__pipbo.K3D.need());
  if (!ok) console.log('3D failed: ' + await page.evaluate(() => window.__pipbo.K3D.why));
  const r = await page.evaluate(async ({ secs, seed, sec }) => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D;
    const i = P.LEVELS.findIndex(l => l.mode === 'arcadepinball');
    window.__seed(seed * 7919);
    G.manual = true; K3D.noRender = true;
    P.CPU.errs && P.CPU.errs.clear(); P.CPU.skillOf = [null, null];
    G.cpuOn = [true, true];
    delete G.results[i];
    P.loadLevel(i);
    G.introT = 0;
    const st = G.mst, TB = PINBALL_TABLE;
    if (secs > 0 || sec >= 0) { st.phase = 'play'; st.phaseT = 0; }
    if (sec > 0) {
      const s0 = TB.sections[sec];
      for (const g of TB.gates) if (g.d < s0.d0) st.gate[g.id].latched = true;
      for (const s of TB.stairs) if (s.steps[0] < s0.d0) st.stairs[s.id].latched = true;
      for (const f of TB.flippers) if (TB.byId[f.cradle].d < s0.d0) st.ledge[f.id].latched = true;
      for (const b of TB.bridges) if (b.d0 < s0.d0) st.bridge[b.id].latched = true;
      TB.tilts.forEach((tl, k) => { if (tl.at < s0.d0) st.tilt.done[k] = true; });
      st.balls.forEach((b, k) => { b.x = s0.spawn[k][0]; b.d = s0.spawn[k][1]; b.sec = sec; });
      st.both = sec;
    }
    const steps = Math.round(secs / P.DT);
    for (let n = 0; n < steps && G.mode === 'play'; n++) { window.__inStep = true; P.step(P.DT); window.__inStep = false; if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0)); }
    K3D.noRender = false;
    return { mode: G.mode, phase: st.phase, t: +st.t.toFixed(1), balls: st.balls.map(b => [b.mode, +b.x.toFixed(1), +b.d.toFixed(1)]) };
  }, { secs: +secs, seed: +opt('seed', 1), sec: +opt('sec', -1) });
  await page.evaluate(() => {
    window.put = (id, x, d, o = {}) => { const b = window.__pipbo.G.mst.balls[id]; b.x = x; b.d = d; b.vx = o.vx || 0; b.vd = o.vd || 0; b.h = o.h || 0; b.mode = o.mode || 'roll'; if (o.seat) { b.mode = 'seat'; b.seat = o.seat; const c = PINBALL_TABLE.byId[o.seat]; b.x = c.x; b.d = c.d; } if (o.ride) { b.mode = 'ride'; b.rideH = o.h || 0; b.ride = { t: 0, dur: 1, arc: true, x0: x, x1: x, d0: d, d1: d, apex: 0, nx: 0 }; } return b; };
    window.at = (x, d, h = 0) => [x, PINBALL_TABLE.yAt(d) + h, -d];
  });
  if (opt('eval', '')) await page.evaluate(opt('eval', ''));
  const cam = opt('cam', ''), bc = opt('ballcam', '');
  if (cam) await page.evaluate(c => { const v = c.split(',').map(Number); PINBALL_SCENE.camOverride = { eye: v.slice(0, 3), at: v.slice(3, 6), fov: v[6] || 40 }; }, cam);
  if (bc) await page.evaluate(async spec => {
    // let the scene draw a frame so the ball's own mesh is where it is drawn (a ball in flight is high over the table)
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const [k0, id] = spec.split(':'), b = window.__pipbo.G.mst.balls[+(id || 0)], TB = PINBALL_TABLE, m = PINBALL_SCENE.SC.balls && PINBALL_SCENE.SC.balls[+(id || 0)];
    const p = m ? m.g.position : { x: b.x, y: TB.yAt(b.d) + b.h + TB.T.R, z: -b.d };
    const o = { side: [4.2, 0.6, 0], front: [0, 0.7, 4.4], behind: [0.6, 2.4, -4.8], low: [2.4, 0.2, 3.4], top: [0.4, 4.4, -2.6], chase: [2.8, -1.0, -6.5] }[k0];
    PINBALL_SCENE.camOverride = { eye: [p.x + o[0], p.y + o[1], p.z - o[2]], at: [p.x, p.y + (k0 === 'chase' ? 0.6 : -0.1), p.z], fov: 40 };
  }, bc);
  await page.evaluate(() => PINBALL_SCENE.snap());
  await page.waitForTimeout(+opt('wait', 6) * 1000);
  const info = await page.evaluate(() => { const r = window.__pipbo.K3D.R, K = window.__pipbo.K3D.K, f = v => v && [+v.x.toFixed(1), +v.y.toFixed(1), +v.z.toFixed(1)]; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries, cam: K && f(K.camera.position) } : null; });
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => { window.__pipbo.K3D.freeze = true; r(); })));
  await page.screenshot({ path: out, clip: box, animations: 'allow', caret: 'initial', timeout: 120000 });
  console.log(out, JSON.stringify(r), JSON.stringify(info), errs.length ? '\nerrors: ' + errs.slice(0, 8).join('\n') : '');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
