#!/usr/bin/env node
// 41-4 Paper Alien Invasion: plays the level in headless Chromium (software WebGL) and takes screenshots.
//   node tools/w41/popaliens-shot.js <out-dir> [--size=1280x720] [--dpr=1] [--only=name,name] [--smoke]
// Each shot is a little script (SHOTS below): it sets the level up with the rules' own state (the computer plays both
// heroes, or the heroes are placed by hand), runs the fixed clock, then poses the camera. --smoke just loads the level,
// plays 20 seconds with two computer heroes and reports errors.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const GL_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

// page-side helpers (run in the page)
function helpers() {
  const P = window.__pipbo;
  window.__pa = {
    P,
    open() {
      const i = P.LEVELS.findIndex(l => l.mode === 'popaliens');
      P.G.cpuOn = [true, true];
      P.startLevel(i);
      return i;
    },
    go() { P.Ready.armAt = 0; P.readyGo(); P.G.introT = 0; },
    run(secs, draw = false) {
      const n = Math.round(secs / P.DT);
      for (let k = 0; k < n; k++) { if (P.G.mode === 'play') P.step(P.DT); if (draw || k % 30 === 29) P.render(P.DT); }
    },
    frames(n) { for (let k = 0; k < n; k++) P.render(1 / 60); },
    st() { return P.G.mst; },
    // run the clock until fn() is true (at most secs), drawing now and then; returns how long it took
    until(fn, secs) {
      const n = Math.round(secs / P.DT);
      for (let k = 0; k < n; k++) { if (fn()) return k * P.DT; if (P.G.mode === 'play') P.step(P.DT); if (k % 30 === 29) P.render(P.DT); }
      return -1;
    },
    // a fresh start of the level, already marching (no shrink), with nothing on the page yet
    fresh(o = {}) {
      const i = P.LEVELS.findIndex(l => l.mode === 'popaliens');
      P.G.cpuOn = o.cpu === false ? [false, false] : [true, true];
      P.loadLevel(i); P.G.introT = 0;
      const st = P.G.mst; st.phase = 'march'; st.t = 4;
      P.render(1 / 60);
      return st;
    },
    place(k, x, z, aim) { const b = P.G.players[k].b3; b.x = x; b.z = z; b.y = 0; b.vx = b.vz = 0; P.G.mst.h[k].aim = aim; b.heading = aim; },
    alien(k, x, z, face, o = {}) {
      const st = P.G.mst, a = { id: st.nextId++, k, x, z, y: 0, vx: 0, vz: 0, hp: 2, st: 'live', t: 9, face, hold: 0, lastHit: [-9, -9], scorch: o.scorch || 0,
        zap: null, zapCd: 99, hopPh: 0, block: null, cap: k === 'shield', capA: face, think: 99, seed: o.seed || 0.3 };
      if (k === 'folder') { a.fold = o.fold || 0; a.st2 = o.st2 || 'back'; }
      Object.assign(a, o.set || {});
      st.aliens.push(a); return a;
    },
    cam(pos, at, focus) { P.G.mst.v3.camOverride = pos ? { pos, at, focus } : null; },
    hud(on) { document.getElementById('game').style.visibility = on ? '' : 'hidden'; },
    lastFx(kind, within) { const st = P.G.mst; return st.fx.some(f => f.kind === kind && P.G.time - f.t < within); },
  };
}

// the look-gate shots: each runs in the page, then the picture is taken
const SHOTS = {
  'hero-front': () => { const st = __pa.fresh({ cpu: false }); __pa.hud(false); __pa.place(0, -0.62, -4, 0.25); __pa.place(1, 0.62, -4, -0.25);
    __pa.frames(2); __pa.cam([0, 0.75, -1.25], [0, 0.5, -4]); __pa.frames(12); },
  'hero-side': () => { __pa.fresh({ cpu: false }); __pa.hud(false); __pa.place(0, 0, -3.3, 0.1); __pa.place(1, 0, -4.9, 0.1);
    __pa.frames(2); __pa.cam([3.1, 0.8, -4.1], [0, 0.5, -4.1]); __pa.frames(12); },
  'hero-back': () => { __pa.fresh({ cpu: false }); __pa.hud(false); __pa.place(0, -0.62, -4, Math.PI + 0.3); __pa.place(1, 0.62, -4, Math.PI - 0.3);
    __pa.frames(2); __pa.cam([0.4, 1.1, -1.6], [0, 0.5, -4.4]); __pa.frames(12); },
  'hero-play': () => { __pa.fresh({ cpu: false }); __pa.place(0, -2, -2, Math.PI); __pa.place(1, 2, -2, Math.PI); __pa.frames(80); },
  'aliens-close': () => { __pa.fresh({ cpu: false }); __pa.hud(false); __pa.place(0, -6, 3, Math.PI); __pa.place(1, 6, 3, Math.PI);
    __pa.alien('grunt', -1.5, -10, 0.15); __pa.alien('folder', 0.1, -10.3, 0); __pa.alien('carrier', 1.7, -10, -0.15);
    __pa.frames(2); __pa.cam([0.1, 1.15, -6.2], [0.1, 0.55, -10.1]); __pa.frames(12); },
  'aliens-edge': () => { __pa.fresh({ cpu: false }); __pa.hud(false); __pa.place(0, -6, 3, Math.PI); __pa.place(1, 6, 3, Math.PI);
    __pa.alien('grunt', -1.1, -10, 0.15); __pa.alien('grunt', 0.6, -10.4, Math.PI / 2 - 0.06, { seed: 0.7 }); __pa.alien('carrier', 1.9, -9.8, 1.0, { scorch: 1 });
    __pa.frames(2); __pa.cam([0.3, 1.1, -6.6], [0.3, 0.55, -10.1]); __pa.frames(12); },
  'aliens-crumple': () => { __pa.fresh({ cpu: false }); __pa.hud(false); __pa.place(0, -6, 3, Math.PI); __pa.place(1, 6, 3, Math.PI);
    __pa.alien('grunt', -1.6, -10, 0.15); __pa.alien('folder', 1.6, -10, -0.2, { scorch: 1 });
    __pa.frames(2); const V = __pa.st().v3; V.crumN = 1e9;
    V.holdFx = true; V.crum = [{ a: { id: 999, k: 'grunt', x: 0, y: 0, z: -10.2, face: 0, scorch: 2, fold: 0 }, t: 0.105 }];
    __pa.cam([0, 1.15, -6.4], [0, 0.55, -10.1]); __pa.frames(1); },
  'folder-plane': () => { __pa.fresh({ cpu: false }); __pa.hud(false); __pa.place(0, -0.8, -5, Math.PI); __pa.place(1, 1.2, -5.6, Math.PI);
    __pa.alien('folder', -1.4, -10, 0.1, { fold: 0.5 }); __pa.alien('folder', 0.4, -10.2, 0.0, { fold: 3, st2: 'fold', set: { y: 1.2, from: { x: 0.4, z: -10.2 }, to: { x: 0, z: -2.5 }, ft: 0.8 } });
    __pa.alien('folder', 2.2, -9.6, -0.2, { fold: 3, st2: 'stuck', set: { y: 0 } });
    __pa.frames(2); __pa.cam([0.4, 1.5, -5.4], [0.3, 0.6, -10]); __pa.frames(12); },
  // the play camera in the Margin Fields (the computer plays both heroes)
  'play-grunts': () => { __pa.fresh(); const st = __pa.st();
    __pa.until(() => st.aliens.filter(a => a.st === 'live').length >= 3 && st.h.some(h => h.sinceShot < 0.05), 30); __pa.run(0.6, true); },
  'play-cross': () => { __pa.fresh(); const st = __pa.st();
    __pa.until(() => st.cz < -18 && __pa.lastFx('cross', 0.02), 60); __pa.run(0.05, true); },
  'play-grenade': () => { const st = __pa.fresh({ cpu: false }); st.evI = 99; __pa.place(0, -1.6, -1, Math.PI + 0.05); __pa.place(1, 2.2, -1.4, Math.PI);
    for (let i = 0; i < 9; i++) { const a = i * 2.4, d = 1.6 * Math.sqrt((i + 0.5) / 9); __pa.alien('grunt', -1.6 + Math.cos(a) * d, -8 + Math.sin(a) * d, (i % 3 - 1) * 0.3, { seed: i / 9 }); }
    __pa.alien('grunt', 4, -9, -0.3); __pa.alien('carrier', -6, -10, 0.4);
    st.h[0].gren = 2; paThrow(st, 0);
    __pa.until(() => __pa.lastFx('burst', 0.05), 4); __pa.run(0.1, true); },
  'play-folders': () => { __pa.fresh(); const st = __pa.st();
    __pa.until(() => st.aliens.some(a => a.k === 'folder' && a.st2 === 'fold' && a.ft > 0.6), 120); __pa.run(0.2, true); },
  // how tiny they are: low behind the pair, looking up the page at the saucer
  'wide-saucer': () => { __pa.fresh({ cpu: false }); __pa.hud(false); __pa.place(0, -0.6, -2, Math.PI); __pa.place(1, 0.7, -2.4, Math.PI);
    __pa.alien('grunt', -2, -12, 0); __pa.alien('grunt', 1, -13, 0, { seed: 0.6 }); __pa.alien('grunt', 3.5, -12.5, -0.2, { seed: 0.9 });
    __pa.frames(2); __pa.cam([-1.2, 1.0, 2.4], [1.5, 6, -60], [0, 0.5, -2.2]); __pa.frames(14); },
};

(async () => {
  const [out = 'build/popaliens'] = pos;
  const [w, h] = opt('size', '1280x720').split('x').map(Number);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: GL_ARGS });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +opt('dpr', 1) });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.stack || e)));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => { window.__pipbo.G.manual = true; });
  await page.evaluate(helpers);
  await page.evaluate(() => __pa.open());
  await page.waitForFunction(() => ['ready', 'failed'].includes(window.__pipbo.K3D.state), null, { timeout: 120000 });
  await page.evaluate(() => __pa.go());
  if (args.includes('--smoke')) {
    for (let s = 0; s < 20; s += 2) {
      await page.evaluate(() => __pa.run(2));
      const r = await page.evaluate(() => { const st = __pa.st(), P = __pa.P; return { mode: P.G.mode, phase: st.phase, t: +st.t.toFixed(1), cz: +st.cz.toFixed(1), aliens: st.aliens.filter(a => a.st === 'live').length, kills: st.kills, ch: st.h.map(q => q.charge), flat: st.h.map(q => !!q.flat), pos: P.G.players.map(p => [+p.b3.x.toFixed(1), +p.b3.z.toFixed(1)]) }; });
      console.log(JSON.stringify(r));
      if (errs.length) break;
    }
    await page.evaluate(() => __pa.frames(3));
    await page.screenshot({ path: path.join(out, 'smoke.png') });
  }
  else {
    const only = opt('only', '') ? opt('only', '').split(',') : Object.keys(SHOTS);
    for (const name of only) {
      const t0 = Date.now();
      await page.evaluate(`(${SHOTS[name].toString()})()`);
      const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
      await page.screenshot({ path: path.join(out, name + '.png'), clip: box });
      await page.evaluate(() => { __pa.hud(true); });
      console.log(name, ((Date.now() - t0) / 1000).toFixed(1) + 's', errs.length ? errs.length + ' errors' : '');
    }
  }
  console.log(errs.length ? 'errors:\n' + errs.slice(0, 8).join('\n') : 'no errors');
  await browser.close();
})();
