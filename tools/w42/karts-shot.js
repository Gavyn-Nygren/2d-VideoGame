#!/usr/bin/env node
// 42-4 Go-Kart Grand Prix: a screenshot from headless Chromium with software WebGL (SwiftShader).
//   node tools/w42/karts-shot.js <simulated secs> <out.png> [--skills=hard,hard] [--seed=1] [--cam=ex,ey,ez,ax,ay,az[,fov]]
//        [--kartcam=side|front|behind|wide|low[:id]] [--eval="js run in the page before the shot"] [--size=1280x720]
//        [--wait=4] [--page=index.html]
// Plays <simulated secs> of the race with drawing off (the computer drives both karts), then draws. --cam holds the
// camera still; --kartcam frames one kart close up (the look shots). --eval can set the state up (G.mst) for a moment
// (a drift, a prize, the danger band) before the picture. Prints draw calls, triangles and any page errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const [secs = '0', out = 'build/w42-karts.png'] = pos;
  const [w, h] = opt('size', '1280x720').split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +opt('dpr', 1) });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e.stack || e)));
  await page.addInitScript((seed) => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', opt('page', 'index.html')));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const ok = await page.evaluate(() => window.__pipbo.K3D.need());
  if (!ok) console.log('3D failed: ' + await page.evaluate(() => window.__pipbo.K3D.why));
  const r = await page.evaluate(async ({ secs, skills, seed }) => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D;
    const i = P.LEVELS.findIndex(l => l.mode === 'parkkarts');
    window.__seed(seed * 7919);
    G.manual = true; K3D.noRender = true;
    P.CPU.errs && P.CPU.errs.clear();
    P.CPU.skillOf = skills.slice();
    G.cpuOn = [true, true];
    delete G.results[i];
    P.loadLevel(i);
    G.introT = 0;
    const steps = Math.round(secs / P.DT);
    for (let n = 0; n < steps && G.mode === 'play'; n++) { window.__inStep = true; P.step(P.DT); window.__inStep = false; if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0)); }
    K3D.noRender = false;
    const st = G.mst;
    return { mode: G.mode, phase: st.phase, t: +st.t.toFixed(1), flags: st.flags, karts: st.karts.map(k => ({ s: +k.s.toFixed(1), lat: +k.lat.toFixed(1), v: +k.v.toFixed(1), part: PARKKARTS_TRACK.partAt(k.s) })), gap: +st.gap.toFixed(1) };
  }, { secs: +secs, skills: opt('skills', 'hard,hard').split(','), seed: +opt('seed', 1) });
  // helpers for --eval: put(id, s, lat, o) sets a kart on the road at s (o: { v, drift, spark, on: branch, bs })
  await page.evaluate(() => {
    window.put = (id, s, lat, o = {}) => {
      const st = window.__pipbo.G.mst, k = st.karts[id], TR = PARKKARTS_TRACK;
      if (o.bs != null) { const B = TR.branches[o.on || 0], g = B.at(o.bs); k.on = o.on || 0; k.bs = o.bs; k.s = B.mainS(o.bs); k.lat = lat; k.x = g.x + g.rx * lat; k.z = g.z + g.rz * lat; k.yaw = g.yaw; }
      else { const f = TR.at(s), p = TR.pos(s, lat); k.on = -1; k.s = TR.wrap(s); k.lat = lat; k.x = p[0]; k.z = p[1]; k.yaw = f.yaw + (o.yaw || 0); }
      k.prog = (k.lap || 0) * TR.L + k.s; k.v = o.v != null ? o.v : 13; k.drift = o.drift || 0; k.spark = o.spark || 0; k.driftT = o.drift ? 1.2 : 0; k.crane = null; k.lock = null;
      st.lead = st.karts[0].prog >= st.karts[1].prog ? 0 : 1; st.gap = Math.abs(st.karts[0].prog - st.karts[1].prog);
      return k;
    };
  });
  if (opt('eval', '')) await page.evaluate(opt('eval', ''));
  const cam = opt('cam', ''), kc = opt('kartcam', '');
  if (cam) await page.evaluate(c => { const v = c.split(',').map(Number); PARKKARTS_SCENE.camOverride = { eye: v.slice(0, 3), at: v.slice(3, 6), fov: v[6] || 50 }; }, cam);
  if (kc) await page.evaluate(spec => {
    // a camera fixed to a kart: [sideways (+ = its left), up, back (+ = behind)] for the eye, looking at the kart
    const [k0, id] = spec.split(':'), k = window.__pipbo.G.mst.karts[+(id || 0)], y = PARKKARTS_WORLD.Y(k.s);
    const o = { side: [4.2, 1.3, -0.4], front: [0.8, 1.2, -4.4], behind: [-0.6, 1.9, 4.8], wide: [7, 4, -7], low: [2.2, 0.5, -3.4] }[k0];
    const fx = Math.sin(k.yaw), fz = Math.cos(k.yaw), lx = Math.cos(k.yaw), lz = -Math.sin(k.yaw);
    const P = (a, b, c) => [k.x + lx * a - fx * c, y + b, k.z + lz * a - fz * c];
    PARKKARTS_SCENE.camOverride = { eye: P(o[0], o[1], o[2]), at: P(0, 0.75, k0 === 'behind' ? -0.8 : 0), fov: 40 };
  }, kc);
  await page.evaluate(() => PARKKARTS_SCENE.snap());
  await page.waitForTimeout(+opt('wait', 6) * 1000);
  const info = await page.evaluate(() => { const r = window.__pipbo.K3D.R, K = window.__pipbo.K3D.K, f = v => v && [+v.x.toFixed(1), +v.y.toFixed(1), +v.z.toFixed(1)]; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries, cam: K && f(K.camera.position), karts: K && K.pk && K.pk.karts.map(k => f(k.g.position)) } : null; });
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => { window.__pipbo.K3D.freeze = true; r(); })));
  await page.screenshot({ path: out, clip: box, animations: 'allow', caret: 'initial', timeout: 120000 });
  console.log(out, JSON.stringify(r), JSON.stringify(info), errs.length ? '\nerrors: ' + errs.slice(0, 8).join('\n') : '');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
