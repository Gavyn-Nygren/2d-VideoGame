#!/usr/bin/env node
// Checks the 3D foundation (js/3d/) in headless Chromium with software WebGL (SwiftShader). A small test level made
// here (MODES.k3dtest, a floor, a step and a gap) stands in for a real one, so this runs before any 3D level exists.
//   lazy        the title and a 2D level never fetch three.js, never make canvas#game3d, never make a WebGL context
//   ready       opening a 3D level from the menus shows "Loading..." on its ready card, then the normal card; the
//               ready buttons do nothing until the 3D kit is in
//   play        the level draws in 3D under a see-through 2D canvas; name tags get screen spots
//   pause       pausing stops the 3D frame (no draw3d, no renders) and the game clock
//   back2d      going to a 2D level frees the scene and hides canvas#game3d
//   memory      20 loads of the 3D level: GPU geometries, textures and shader programs stay flat
//   lost        a lost WebGL context that comes back rebuilds the scene
//   norender    K3D.noRender = true plays exactly the same (same positions every step) as with drawing on
//   mover       the 3D mover: step up, wall slide, no tunnelling, jump height like the 2D jump, edge teeter
//   nav         path finding: walks round a wall, jumps a gap, steers a body to the goal with stick input; a wide gap
//               (jumped from the take-off, never walked into) and a drop off a tall ledge, from four grid offsets
//   dim         the scrim that dims the game behind a card still sits above canvas#game (and under the touch pads)
//   fail        WebGL switched off: the plain card ("This world needs 3D graphics...") with a way back to the map
//   bundle      (--bundle) the same lazy/play checks on build/pip-and-bo.html (run node tools/bundle.js first)
// Usage (from the repo folder): node tools/k3d/check.js [--only=lazy,memory] [--bundle]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const only = opt('only', '') ? opt('only', '').split(',') : null;
const want = k => !only || only.includes(k);
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const results = [];
const report = (name, ok, info) => { results.push({ name, ok }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

// the test level and its mode, added to the running game (page context)
function addTestLevel() {
  const P = window.__pipbo, { LEVELS, MODES, K3D, MOVER3 } = P;
  const map = Array.from({ length: 18 }, (_, y) => y === 16 ? '.'.repeat(10) + '1' + '.'.repeat(10) + '2' + '.'.repeat(10) : '.'.repeat(32));
  LEVELS.push({ name: '3D test', world: 0, kind: 'team', mode: 'k3dtest', ownStep: true, view3d: true, touch: 'stick', noFalls: true,
    tip: 'A test page for the 3D kit.', map });
  window.__k3dTest = LEVELS.length - 1;
  MODES.k3dtest = {
    scene3dOpts: { bg: '#3a3343', fov: 26 },
    setup(st) {
      st.t = 0; st.draws = 0; st.scenes = 0;
      st.w = MOVER3.world([
        { x: 0, z: 0, w: 14, d: 10, y0: -1, y1: 0 },              // the floor
        { x: 3, z: -1, w: 2, d: 2, y0: 0, y1: 0.18 },             // a low step (walk up)
        { x: -3, z: -2, w: 1, d: 4, y0: 0, y1: 1.6 },             // a wall
        { x: 0, z: -9, w: 14, d: 6, y0: -1, y1: 0 },              // past a gap of 2 units
      ]);
      P.G.players.forEach((p, k) => MOVER3.spawn(p, k ? 1 : -1, 0, 2));
    },
    step(dt) {
      const st = P.G.mst; st.t += dt; K3D.heading = 0;
      for (const p of P.G.players) MOVER3.step(p, st.w, dt);
      MOVER3.separate(P.G.players[0].b3, P.G.players[1].b3);
    },
    scene3d(K) {
      const st = P.G.mst, T = K3D.T; st.scenes++;
      for (const s of st.w.solids) {
        const m = K3D.mesh(new T.BoxGeometry(s.w, s.y1 - s.y0, s.d), K3D.toon(s.y1 > 1 ? '#5d8a4a' : '#e8dcc0'), { receive: true, cast: true });
        m.position.set(s.x, (s.y0 + s.y1) / 2, s.z); K.add(m);
      }
      st.heroes = [0, 1].map(id => { const h = K3D.hero(id); K.add(h); K3D.seeThrough(h, id ? '#4a8fe0' : '#f08a3c'); return h; });
      st.blobs = [0, 1].map(id => K.add(K3D.blob(id ? '#4a8fe0' : '#f08a3c')));
      st.rig = K3D.cams.follow({ pitch: 50 });
      st.rig.snap();
    },
    draw3d(K, dt) {
      const st = P.G.mst; st.draws++;
      P.G.players.forEach((p, k) => {
        const b = p.b3;
        K3D.heroPose(st.heroes[k], { x: b.x, y: b.y, z: b.z, heading: b.heading, speed: Math.hypot(b.vx, b.vz), vy: b.vy, land: b.land }, dt);
        K3D.placeBlob(st.blobs[k], b.x, b.y, b.z, 0);
        const s = K3D.toScreen(b.x, b.y + MOVER3.h, b.z); p.x = s.x - p.w / 2; p.y = s.y - p.h;
      });
      st.rig.update(K, dt, P.G.players.map(p => p.b3));
    },
  };
}

async function openPage(browser, o = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [], fetched = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('request', r => fetched.push(r.url()));
  if (o.noGL) await page.addInitScript(() => { window.__k3dNoGL = true; });
  await page.addInitScript(() => {
    // count WebGL contexts made anywhere on the page
    window.__glMade = 0;
    const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...a) { if (/webgl/.test(kind)) window.__glMade++; return gc.call(this, kind, ...a); };
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', o.file || 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(addTestLevel);
  return { page, errs, fetched };
}
// run n drawn frames by hand (the live loop is stopped: G.manual)
const frames = (page, n, stepIt = true) => page.evaluate(({ n, stepIt }) => {
  const P = window.__pipbo;
  for (let k = 0; k < n; k++) { if (stepIt && P.G.mode === 'play') P.step(P.DT); P.render(1 / 60); }
}, { n, stepIt });
const waitReady = page => page.waitForFunction(() => ['ready', 'failed'].includes(window.__pipbo.K3D.state), null, { timeout: 120000 });

(async () => {
  const browser = await chromium.launch({ args: GL_ARGS });
  const files = opt('bundle', null) !== null || args.includes('--bundle') ? ['index.html', 'build/pip-and-bo.html'] : ['index.html'];
  for (const file of files) {
    const tag = file === 'index.html' ? '' : ' [bundle]';
    const { page, errs, fetched } = await openPage(browser, { file });
    await page.evaluate(() => { window.__pipbo.G.manual = true; });

    if (want('lazy')) {
      await page.evaluate(() => { const P = window.__pipbo; P.loadLevel(0); });
      await frames(page, 30);
      const r = await page.evaluate(() => ({ state: window.__pipbo.K3D.state, canvas: !!document.getElementById('game3d'), three: !!window.THREE, gl: window.__glMade }));
      const got = fetched.some(u => /three\.min\.js|js\/3d\/kit\.js/.test(u));
      report('lazy' + tag, r.state === 'none' && !r.canvas && !r.three && r.gl === 0 && !got, JSON.stringify(r) + (got ? ' (fetched three)' : ''));
    }
    if (want('dim') && !tag) {
      // canvas#game got a z-index for the 3D canvas under it: the scrim that dims the game behind a card must stay above it
      const r = await page.evaluate(() => { const st = document.getElementById('stage'); return { scrim: +getComputedStyle(st, '::after').zIndex, game: +getComputedStyle(document.getElementById('game')).zIndex, pads: +getComputedStyle(document.getElementById('padPip')).zIndex }; });
      report('dim', r.scrim > r.game && r.scrim < r.pads, JSON.stringify(r));
    }

    // the 3D level from the menus: the ready card loads the kit
    await page.evaluate(() => { const P = window.__pipbo; P.startLevel(window.__k3dTest); });
    const early = await page.evaluate(() => ({ foot: (document.querySelector('[data-ready-foot]') || {}).textContent, state: window.__pipbo.K3D.state }));
    await page.evaluate(() => window.__pipbo.readyPress(0)); // too early: must not count
    const pressedEarly = await page.evaluate(() => window.__pipbo.Ready.ok[0]);
    await waitReady(page);
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => ({ foot: (document.querySelector('[data-ready-foot]') || {}).textContent, state: window.__pipbo.K3D.state }));
    if (want('ready')) report('ready' + tag, early.state === 'loading' && /Loading/.test(early.foot) && !pressedEarly && after.state === 'ready' && !/Loading/.test(after.foot),
      'card while loading: "' + early.foot + '", after: "' + after.foot + '"' + (pressedEarly ? ' (an early press counted)' : ''));
    await page.evaluate(() => { const P = window.__pipbo; P.Ready.armAt = 0; P.readyGo(); });

    if (want('play')) {
      await frames(page, 40);
      const r = await page.evaluate(() => {
        const P = window.__pipbo, K3D = P.K3D, c3 = document.getElementById('game3d');
        // the 2D canvas is see-through over the picture: a corner pixel has no colour
        const g = document.getElementById('game').getContext('2d'), px = g.getImageData(4, Math.round(g.canvas.height / 2), 1, 1).data;
        return { mode: P.G.mode, draws: P.G.mst.draws, calls: K3D.R.info.render.calls, shown: c3 && c3.style.display !== 'none', alpha2d: px[3],
          tag: [P.G.players[0].x, P.G.players[0].y].map(Math.round), t: +P.G.mst.t.toFixed(2) };
      });
      const tagOk = r.tag[0] > 100 && r.tag[0] < 860 && r.tag[1] > 20 && r.tag[1] < 520;
      report('play' + tag, r.mode === 'play' && r.draws >= 40 && r.calls > 5 && r.shown && r.alpha2d === 0 && tagOk && r.t > 0.3, JSON.stringify(r));
      if (!tag && opt('shot', null)) await page.screenshot({ path: opt('shot', '') });
    }
    if (tag) { report('errors' + tag, !errs.length, errs.slice(0, 4).join(' | ')); await page.close(); continue; }

    if (want('pause')) {
      const r = await page.evaluate(() => {
        const P = window.__pipbo, R = P.K3D.R; P.pause();
        const d0 = P.G.mst.draws, f0 = R.info.render.frame, t0 = P.G.mst.t;
        for (let k = 0; k < 20; k++) { if (P.G.mode === 'play') P.step(P.DT); P.render(1 / 60); }
        const out = { draws: P.G.mst.draws - d0, frames: R.info.render.frame - f0, t: P.G.mst.t - t0 };
        P.resume(); return out;
      });
      report('pause', r.draws === 0 && r.frames === 0 && r.t === 0, JSON.stringify(r));
    }

    if (want('lost')) {
      // (the live loop still draws every animation frame, so the rebuild may come before the hand-run frames below)
      const s0 = await page.evaluate(() => { window.__lose = window.__pipbo.K3D.R.getContext().getExtension('WEBGL_lose_context'); window.__lose.loseContext(); return window.__pipbo.G.mst.scenes; });
      await page.waitForFunction(() => window.__pipbo.K3D.lost);
      await frames(page, 5);
      await page.evaluate(() => window.__lose.restoreContext());
      await page.waitForFunction(() => !window.__pipbo.K3D.lost, null, { timeout: 20000 });
      await frames(page, 5);
      const r = await page.evaluate(() => ({ scenes: window.__pipbo.G.mst.scenes, calls: window.__pipbo.K3D.R.info.render.calls }));
      report('lost', r.scenes === s0 + 1 && r.calls > 5, JSON.stringify(r));
    }

    if (want('memory')) {
      const counts = [];
      for (let k = 0; k < 20; k++) {
        await page.evaluate(() => { const P = window.__pipbo; P.loadLevel(window.__k3dTest); P.G.introT = 0; });
        await frames(page, 3);
        counts.push(await page.evaluate(() => { const m = window.__pipbo.K3D.R.info; return [m.memory.geometries, m.memory.textures, m.programs.length]; }));
      }
      const a = counts[2], z = counts[19];
      report('memory', z.every((v, i) => v <= a[i]), 'after load 3: ' + a.join('/') + ', after load 20: ' + z.join('/') + ' (geometries/textures/programs)');
    }

    if (want('back2d')) {
      await page.evaluate(() => { window.__pipbo.loadLevel(0); });
      await frames(page, 3);
      const r = await page.evaluate(() => ({ K: !!window.__pipbo.K3D.K, shown: document.getElementById('game3d').style.display !== 'none', geos: window.__pipbo.K3D.R.info.memory.geometries }));
      report('back2d', !r.K && !r.shown, JSON.stringify(r));
    }

    if (want('norender')) {
      // the same scripted presses, once drawing every step and once with K3D.noRender: every step must match
      const run = noRender => page.evaluate(noRender => {
        const P = window.__pipbo, K3D = P.K3D; K3D.noRender = noRender;
        P.loadLevel(window.__k3dTest); P.G.introT = 0;
        const out = [];
        for (let n = 0; n < 600; n++) {
          const ph = Math.floor(n / 60);
          P.G.players.forEach((p, k) => {
            p.input = { left: ph % 4 === 1, right: ph % 4 === 3, up: ph % 3 === 0, down: ph % 5 === 2, jump: n % 90 < 20, ax: k ? Math.sin(n / 50) : 0, ay: k ? Math.cos(n / 70) : 0 };
            if (n % 90 === 0) p.pendingJump = true;
          });
          P.step(P.DT);
          if (!noRender) P.render(P.DT);
          out.push(P.G.players.map(p => [p.b3.x, p.b3.y, p.b3.z].map(v => v.toFixed(5)).join(',')).join(';'));
        }
        K3D.noRender = false;
        return out;
      }, noRender);
      const a = await run(false), b = await run(true);
      const diff = a.findIndex((s, k) => s !== b[k]);
      report('norender', diff < 0, diff < 0 ? '600 steps match' : 'first differs at step ' + diff + ': ' + a[diff] + ' vs ' + b[diff]);
    }

    if (want('mover')) {
      const r = await page.evaluate(() => {
        const { MOVER3, K3D, PHYS, DT } = window.__pipbo, out = {};
        const run = (w, p, n, input) => { for (let k = 0; k < n; k++) { p.input = typeof input === 'function' ? input(k) : input; MOVER3.step(p, w, DT); } return p.b3; };
        K3D.heading = 0;
        const flat = () => MOVER3.world([{ x: 0, z: 0, w: 40, d: 40, y0: -1, y1: 0 }]);
        // step up onto 0.18, not onto 0.3
        let w = flat(); MOVER3.add(w, { x: 0, z: -3, w: 4, d: 2, y0: 0, y1: 0.18 }); MOVER3.add(w, { x: 0, z: -5, w: 4, d: 2, y0: 0.18, y1: 0.5 });
        let p = {}; MOVER3.spawn(p, 0, 0, 0); run(w, p, 240, { up: true });
        out.stepUp = +p.b3.y.toFixed(2); out.blocked = +p.b3.z.toFixed(2);
        // wall slide: push diagonally into a long wall, keep moving along it
        w = flat(); MOVER3.add(w, { x: 0, z: -2, w: 30, d: 1, y0: 0, y1: 2 });
        p = {}; MOVER3.spawn(p, 0, 0, 0); run(w, p, 240, { up: true, right: true });
        out.slideX = +p.b3.x.toFixed(2); out.slideZ = +p.b3.z.toFixed(2);
        // no tunnelling: a thin wall at full fall speed sideways
        w = flat(); MOVER3.add(w, { x: 3, z: 0, w: 0.1, d: 10, y0: 0, y1: 2 });
        p = {}; MOVER3.spawn(p, 0, 0, 0); p.b3.vx = 40; run(w, p, 60, { right: true });
        out.tunnel = p.b3.x > 3;
        // jump height like the 2D jump (v^2 / 2g in units, with the button held)
        w = flat(); p = {}; MOVER3.spawn(p, 0, 0, 0); p.pendingJump = true;
        let top = 0; run(w, p, 120, k => { top = Math.max(top, p.b3.y); return { jump: true }; });
        out.jump = +top.toFixed(2); out.jumpWant = +((PHYS.jumpV * PHYS.jumpV) / (2 * PHYS.g) / K3D.U).toFixed(2);
        // edge teeter: walking off a 1-unit drop holds them 0.3 s, letting go saves them; still pushing steps off
        w = MOVER3.world([{ x: 0, z: 0, w: 4, d: 4, y0: -1, y1: 0 }, { x: 0, z: 0, w: 40, d: 40, y0: -3, y1: -1 }]);
        p = {}; MOVER3.spawn(p, 0, 0, 0); let whoa = 0, at = -1;
        run(w, p, 200, k => { if (p.b3.whoa) { whoa++; if (at < 0) at = k; } return { right: at < 0 || k < at + 18 }; }); // let go 0.15 s into the teeter
        out.teeterSaved = whoa === 1 && p.b3.y === 0;
        p = {}; MOVER3.spawn(p, 0, 0, 0); run(w, p, 300, { right: true });
        out.teeterFell = p.b3.y === -1;
        return out;
      });
      const ok = r.stepUp === 0.18 && r.blocked > -3.8 && r.blocked < -3.5 && r.slideX > 3 && r.slideZ > -1.6 && !r.tunnel && Math.abs(r.jump - r.jumpWant) < 0.15 && r.teeterSaved && r.teeterFell;
      report('mover', ok, JSON.stringify(r));
    }

    if (want('nav')) {
      const r = await page.evaluate(() => {
        const { MOVER3, K3D, DT } = window.__pipbo, nav3 = window.__pipbo.cpuNav3, out = {};
        K3D.heading = 0.7; // a turned camera: steering must still arrive
        const w = MOVER3.world([
          { x: 0, z: 0, w: 12, d: 12, y0: -1, y1: 0 },
          { x: 0, z: -2, w: 8, d: 0.6, y0: 0, y1: 2 },            // a wall across the way
          { x: 0, z: -10, w: 12, d: 6, y0: -1, y1: 0 },           // over a 1-unit gap
          { x: 3, z: -10, w: 2, d: 2, y0: 0, y1: 0.6 },           // a box to hop onto
        ]);
        const n = nav3.build(w, { x0: -7, z0: -14, x1: 7, z1: 7 });
        const path = nav3.path(n, { x: 0, y: 0, z: 2 }, { x: 3, y: 0.6, z: -10 });
        out.found = !!path; out.hows = path ? [...new Set(path.map(q => q.how))].join(',') : '';
        const p = {}; MOVER3.spawn(p, 0, 0, 2);
        let k = 0, prevJ = false;
        for (; k < 120 * 20 && path && path.length; k++) {
          const o = nav3.follow(p, path, {});
          if (o.done) break;
          const j = !!o.jump;
          p.input = { ax: o.ax, ay: o.ay, jump: j };
          if (j && !prevJ) p.pendingJump = true; prevJ = j;
          MOVER3.step(p, w, DT);
        }
        out.secs = +(k * DT).toFixed(1); out.end = [p.b3.x, p.b3.y, p.b3.z].map(v => +v.toFixed(2));
        out.arrived = Math.hypot(p.b3.x - 3, p.b3.z + 10) < 0.6 && Math.abs(p.b3.y - 0.6) < 0.05;
        // a wide gap (1.5 units: the jump has to come at the take-off, before the lip) and then a drop off a 3-unit
        // ledge, from several places against the cell grid: the body must arrive every time and never fall in the gap
        const drive = (w2, from, to) => {
          const n2 = nav3.build(w2, { x0: -4, z0: -14, x1: 4, z1: 12 }), path2 = nav3.path(n2, from, to);
          if (!path2) return 'no path';
          const hows = path2.map(q => q.how).join(','), q = {}; MOVER3.spawn(q, from.x, from.y, from.z);
          let pj = false, low = 0;
          for (let s = 0; s < 120 * 15; s++) {
            const o = nav3.follow(q, path2, {}); if (o.done && q.b3.ground) break;
            const j = !o.done && !!o.jump; q.input = o.done ? {} : { ax: o.ax, ay: o.ay, jump: j };
            if (j && !pj) q.pendingJump = true; pj = j;
            MOVER3.step(q, w2, DT); low = Math.min(low, q.b3.y);
          }
          return Math.hypot(q.b3.x - to.x, q.b3.z - to.z) < 0.7 && Math.abs(q.b3.y - to.y) < 0.1 && low > to.y - 0.5 ? '' : 'ended at ' + [q.b3.x, q.b3.y, q.b3.z].map(v => v.toFixed(2)) + ' (' + hows + ')';
        };
        out.wide = []; out.drop = [];
        for (const off of [0, 0.13, 0.25, 0.37]) {
          const pit = { x: 0, z: 0, w: 40, d: 40, y0: -9, y1: -8 };
          const gapW = MOVER3.world([{ x: 0, z: 5 + off, w: 6, d: 10, y0: -1, y1: 0 }, { x: 0, z: -6.5 + off, w: 6, d: 10, y0: -1, y1: 0 }, pit]);
          const e1 = drive(gapW, { x: 0.3, y: 0, z: 4 }, { x: -1, y: 0, z: -5 }); if (e1) out.wide.push(off + ': ' + e1);
          const dropW = MOVER3.world([{ x: 0, z: 5 + off, w: 6, d: 10, y0: -4, y1: 0 }, { x: 0, z: -4, w: 8, d: 16, y0: -4, y1: -3 }]);
          const e2 = drive(dropW, { x: 0, y: 0, z: 5 }, { x: 2, y: -3, z: -8 }); if (e2) out.drop.push(off + ': ' + e2);
        }
        K3D.heading = 0;
        return out;
      });
      report('nav', r.found && /jump/.test(r.hows) && r.arrived && !r.wide.length && !r.drop.length, JSON.stringify(r));
    }
    report('errors', !errs.length, errs.slice(0, 4).join(' | '));
    await page.close();
  }

  if (want('fail')) {
    const { page, errs } = await openPage(browser, { noGL: true });
    await page.evaluate(() => { window.__pipbo.G.manual = true; window.__pipbo.startLevel(window.__k3dTest); });
    await waitReady(page);
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => ({ text: (document.querySelector('.k3d-fail') || {}).textContent || '', gl: window.__glMade, state: window.__pipbo.K3D.state }));
    await page.click('.k3d-fail [data-act="ready-back"]');
    const back = await page.evaluate(() => ({ mode: window.__pipbo.G.mode, card: !!document.querySelector('.k3d-fail') }));
    report('fail', r.state === 'failed' && /This world needs 3D graphics, which this device or browser has switched off\./.test(r.text) && back.mode === 'title' && !back.card,
      JSON.stringify({ ...r, text: r.text.trim().replace(/\s+/g, ' '), back }));
    report('errors (fail page)', !errs.filter(e => !/3D unavailable/.test(e)).length, errs.join(' | '));
    await page.close();
  }
  await browser.close();
  const bad = results.filter(r => !r.ok);
  console.log(bad.length ? bad.length + ' of ' + results.length + ' checks failed' : 'All ' + results.length + ' checks passed');
  process.exit(bad.length ? 1 : 0);
})();
