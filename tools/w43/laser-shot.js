#!/usr/bin/env node
// 43-4 Laser Tag Arena: a screenshot from headless Chromium with software WebGL (SwiftShader).
//   node tools/w43/laser-shot.js <simulated secs> <out.png> [--round=1] [--seed=1] [--cpu=normal,normal]
//        [--cam=ex,ey,ez,ax,ay,az[,fov]] [--eval="js run in the page before the shot"] [--size=1280x720] [--wait=5]
// Starts the match at round --round with the start walls down (skipping the vesting room and the count), plays
// <simulated secs> with drawing off (the computer plays both if --cpu, else nobody moves), then draws. --cam holds the
// camera still. --eval can set a moment up with the helpers below. Prints draw calls, triangles and any page errors.
//   pose(id, x, z, face)          a hero at a place, facing an angle (radians; 0 = toward the camera, +Z)
//   aim(id, a)                    the hero holding fire, aiming along a (the dotted line)
//   tell(id, a)                   the hero in the tell (just let go)
//   beam(id, a, age)              a beam fired along a, age seconds ago (with its tag, scorches, sparks)
//   jump(id, air)                 the hero in the air (air seconds into the jump)
//   safe(id, s)                   the hero just tagged (s seconds of safe left)
//   lookAt(x, y, z, dist, yawDeg, pitchDeg, fov)   a camera looking at a point
//   bankShot(n, box)              Pip and Bo placed for a shot off n mirrors (returns the angle)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const [secs = '0', out = 'build/w43-laser.png'] = pos;
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
  await page.goto('file://' + path.resolve(__dirname, '..', '..', opt('page', 'index.html')));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const ok = await page.evaluate(() => window.__pipbo.K3D.need());
  if (!ok) console.log('3D failed: ' + await page.evaluate(() => window.__pipbo.K3D.why));
  const r = await page.evaluate(async ({ secs, seed, round, cpu }) => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D;
    const i = P.LEVELS.findIndex(l => l.mode === 'arcadelaser');
    window.__seed(seed * 7919);
    G.manual = true; K3D.noRender = true;
    if (cpu) { P.CPU.skillOf = cpu.split(','); G.cpuOn = [true, true]; } else G.cpuOn = [false, false];
    delete G.results[i];
    P.loadLevel(i);
    G.introT = 0;
    // past the framework's start
    for (let n = 0; n < 600 && G.mode === 'play' && !(G.match && G.match.phase === 'live'); n++) { window.__inStep = true; P.step(P.DT); window.__inStep = false; }
    const st = G.mst, AR = ARCADELASER_ARENA, CO = ARCADELASER;
    st.round = round; st.roundNo = round; st.layout = AR.layout(round); CO.resetPieces(st);
    CO.startCount(st); st.phase = 'live'; st.phaseT = 0; st.rt = 2; st.firing = true; st.startDown = 1; st.sol = AR.solids(st);
    const steps = Math.round(secs / P.DT);
    for (let n = 0; n < steps && G.mode === 'play'; n++) { window.__inStep = true; P.step(P.DT); window.__inStep = false; if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0)); }
    K3D.noRender = false; if (G.match) G.match.goT = 0;
    return { mode: G.mode, phase: st.phase, t: +st.t.toFixed(1), round: st.round, tags: st.heroes.map(h => h.tags), wins: st.wins };
  }, { secs: +secs, seed: +opt('seed', 1), round: +opt('round', 1), cpu: opt('cpu', '') });
  await page.evaluate(() => {
    const st = () => window.__pipbo.G.mst, CO = ARCADELASER, AR = ARCADELASER_ARENA;
    window.pose = (id, x, z, face) => { const h = st().heroes[id]; Object.assign(h, { x, z, face, vx: 0, vz: 0, air: -1, y: 0, fire: null, line: null }); st().sol = AR.solids(st()); return h; };
    window.aim = (id, a) => { const h = st().heroes[id]; h.face = a; h.fire = { st: 'aim', t: 1, a: CO.help(st(), h, a, true), base: a }; h.line = CO.path(st(), h, h.fire.a); return h.line; };
    window.tell = (id, a) => { const h = st().heroes[id]; h.face = a; h.fire = { st: 'tell', t: 0.16, a, base: a }; h.line = CO.path(st(), h, a); };
    window.beam = (id, a, age = 0.04) => {
      const s = st(), h = s.heroes[id], p = CO.path(s, h, a); s.fxN++; const n = s.fxN;
      s.beams.push({ who: id, t: s.t - age, paths: [p], used: {}, hit: p.hits.length > 0, n });
      s.fx.push({ k: 'fire', t: s.t - age, n, who: id, bounces: p.bounces });
      if (p.hits.length) { s.fxN++; s.fx.push({ k: 'tag', t: s.t - age, n: s.fxN, who: id, on: 1 - id, bank: p.hits[0].n >= 1, n2: p.hits[0].n, x: p.hits[0].x, z: p.hits[0].z }); s.lastTag = { by: id, n: p.hits[0].n, t: s.t - age }; }
      return p;
    };
    window.jump = (id, air) => { const h = st().heroes[id]; h.air = air; const u = air / CO.S.AIR; h.y = 4 * CO.S.JH * u * (1 - u); };
    window.safe = (id, s2) => { const h = st().heroes[id]; h.safe = s2; h.noFire = Math.max(0, s2 - 1); h.spinT = Math.max(0, s2 - 1.6); };
    // bankShot(n, box): places Pip and Bo (Pip inside box [x0, z0, x1, z1] if given, Bo anywhere on the other half) where
    // Pip has no straight shot but a shot off n mirrors tags Bo; returns the angle (aims there) or null
    window.bankShot = (n = 1, bx = null) => {
      const s = st(), H = s.heroes, AR2 = ARCADELASER_ARENA, free = (x, z) => { const b = { x, z, r: 0.45 }; return !AR2.collide(s.sol, b, true) && Math.abs(x) < AR2.HX - 0.6 && Math.abs(z) < AR2.HZ - 0.6; };
      for (let k = 0; k < 6000; k++) {
        const px = bx ? bx[0] + Math.random() * (bx[2] - bx[0]) : -AR2.HX + 1 + Math.random() * (AR2.HX - 2), pz = bx ? bx[1] + Math.random() * (bx[3] - bx[1]) : -AR2.HZ + 1 + Math.random() * (AR2.HZ * 2 - 2);
        const ox = Math.random() * (AR2.HX - 1), oz = -AR2.HZ + 1 + Math.random() * (AR2.HZ * 2 - 2);
        if (!free(px, pz) || !free(ox, oz) || Math.hypot(ox - px, oz - pz) < 4) continue;
        pose(0, px, pz, 0); pose(1, ox, oz, 0);
        if (AR2.clear(s.sol, px, pz, ox, oz)) continue;
        for (let i = 0; i < 720; i++) { const a = i / 720 * Math.PI * 2, p = CO.path(s, H[0], a); if (p.hits.length && p.hits[0].id === 1 && p.hits[0].n === n) { H[0].face = a; H[1].face = Math.atan2(px - ox, pz - oz); return a; } }
      }
      return null;
    };
    window.lookAt = (x, y, z, d, yaw, pitch, fov = 34) => { const a = yaw * Math.PI / 180, p = pitch * Math.PI / 180; ARCADELASER_SHOW.camOverride = { eye: [x + Math.sin(a) * Math.cos(p) * d, y + Math.sin(p) * d, z + Math.cos(a) * Math.cos(p) * d], at: [x, y, z], fov }; };
  });
  if (opt('eval', '')) await page.evaluate(opt('eval', ''));
  const cam = opt('cam', '');
  if (cam) await page.evaluate(c => { const v = c.split(',').map(Number); ARCADELASER_SHOW.camOverride = { eye: v.slice(0, 3), at: v.slice(3, 6), fov: v[6] || 38 }; }, cam);
  await page.evaluate(() => ARCADELASER_SHOW.snap());
  // a few drawn frames with the game held still (the effects settle), then the picture
  await page.waitForTimeout(+opt('wait', 5) * 1000);
  const info = await page.evaluate(() => { const r = window.__pipbo.K3D.R, K = window.__pipbo.K3D.K, f = v => v && [+v.x.toFixed(1), +v.y.toFixed(1), +v.z.toFixed(1)]; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries, cam: K && f(K.camera.position) } : null; });
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => { window.__pipbo.K3D.freeze = true; r(); })));
  await page.screenshot({ path: out, clip: box, animations: 'allow', caret: 'initial', timeout: 180000 });
  console.log(out, JSON.stringify(r), JSON.stringify(info), errs.length ? '\nerrors: ' + errs.slice(0, 8).join('\n') : '');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
