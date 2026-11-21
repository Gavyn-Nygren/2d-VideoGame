#!/usr/bin/env node
// 43-1 Coin Drop: a screenshot from headless Chromium with software WebGL (SwiftShader).
//   node tools/w43/shot.js <simulated secs> <out.png> [--who=pair|idle] [--s=<units along the chute>] [--x=<Pip's x>,<Bo's x>]
//        [--intro=<secs into the opening>] [--wait=4] [--cam=eye.x,eye.y,eye.z,at.x,at.y,at.z[,fov]]
//        [--coincam=side|front|behind|wide|above|jump] [--hop=<secs into Pip's jump>] [--size=1280x720] [--dpr=1] [--eval="js"] [--nocue]
// Plays <simulated secs> (drawing off; the computer rides both coins with --who=pair, nobody with --who=idle), or with
// --s puts the coins straight at that place, riding. --cam holds the camera still; --coincam frames the coins close up
// (the look shots). Prints draw calls and page errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const [secs = '0', out = 'build/w43-shot.png'] = pos;
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
  const r = await page.evaluate(async ({ secs, who, s, x, intro, hop }) => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D;
    const i = P.LEVELS.findIndex(l => l.mode === 'arcadecoin');
    G.manual = true; K3D.noRender = true;
    if (P.CPU) P.CPU.skillOf = [null, null];
    G.cpuOn = who === 'pair' ? [true, true] : [false, false];
    P.loadLevel(i);
    const st = G.mst;
    if (!window.__wrapped && typeof ARCADECOIN_SCENE !== 'undefined') { window.__wrapped = true; const b = ARCADECOIN_SCENE.build; ARCADECOIN_SCENE.build = (K, s2) => { window.__K = K; return b(K, s2); }; }
    if (intro != null) { st.phaseT = intro; st.t = intro; }
    else if (s != null) {
      st.phase = 'ride'; st.phaseT = 0; st.s = st.prevS = s; st.restart = s;
      if (x) { st.c[0].x = x[0]; st.c[1].x = x[1]; }
      st.pi = 0; while (st.pi < ARCADECOIN_ROUTE.lists.pickups.length && ARCADECOIN_ROUTE.lists.pickups[st.pi].s <= s) st.pi++;
    }
    const steps = Math.round(secs / P.DT);
    for (let n = 0; n < steps && G.mode === 'play'; n++) {
      if (who !== 'pair') for (const p of G.players) for (const key in p.input) p.input[key] = false;
      P.step(P.DT);
      if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0));
    }
    if (hop != null) { const c = st.c[0], S = ARCADECOIN.S; c.airT = S.AIR; c.airH = S.HOP_H; c.hopT = st.t - hop; c.air = S.AIR - hop; const u = 1 - c.air / c.airT; c.y = 4 * c.airH * u * (1 - u); }
    if (intro != null) window.__freezeIntro = intro;
    K3D.noRender = false; G.introT = 0;
    return { mode: G.mode, phase: st.phase, s: +st.s.toFixed(1), x: st.c.map(c => +c.x.toFixed(2)), t: +st.t.toFixed(1), coins: st.coins, wipes: st.wipes };
  }, { secs: +secs, who: opt('who', 'idle'), s: opt('s', null) != null ? +opt('s') : null, x: opt('x', '') ? opt('x').split(',').map(Number) : null, intro: opt('intro', null) != null ? +opt('intro') : null, hop: opt('hop', null) != null ? +opt('hop') : null });
  const cam = opt('cam', ''), coincam = opt('coincam', '');
  if (cam) await page.evaluate(c => { const v = c.split(',').map(Number); ARCADECOIN_SCENE.camOverride = { eye: v.slice(0, 3), at: v.slice(3, 6), fov: v[6] || 50 }; }, cam);
  if (coincam) await page.evaluate(k => {
    // a camera fixed to the pair: [right, up, back] for the eye, looking at the middle of the two coins
    const st = window.__pipbo.G.mst, f = ARCADECOIN_COINS.frame(st.s, (st.c[0].x + st.c[1].x) / 2, 0), T = window.__pipbo.K3D.T;
    const o = { side: [-7.2, 2.3, -6.2], front: [0.6, 1.8, -7.5], behind: [-0.4, 2.6, 7.2], wide: [11, 7.5, -12], above: [2.5, 8.5, 5.5], pip: [-3.6, 1.1, -3.2], jump: [-8.2, 2.4, -9.0] }[k];
    const P = (a, b, c) => f.p.clone().addScaledVector(f.r, a).addScaledVector(f.u, b).addScaledVector(f.t, -c).toArray();
    ARCADECOIN_SCENE.camOverride = { eye: P(o[0], o[1], o[2]), at: P(0, k === 'jump' ? 1.7 : 0.9, 0), fov: k === 'wide' ? 50 : k === 'jump' ? 44 : 40 };
  }, coincam);
  if (args.includes('--nocue')) await page.evaluate(() => { ARCADECOIN.cueNow = () => null; });
  if (opt('eval', '')) { const ev = await page.evaluate(opt('eval', '')); if (ev !== undefined) console.log('eval:', typeof ev === 'string' ? ev : JSON.stringify(ev)); }
  await page.waitForTimeout(+opt('wait', 4) * 1000);
  const info = await page.evaluate(() => { const r = window.__pipbo.K3D.R; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries } : null; });
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => { window.__pipbo.K3D.freeze = true; r(); })));
  await page.screenshot({ path: out, clip: box, animations: 'allow', caret: 'initial', timeout: 120000 });
  console.log(out, JSON.stringify(r), JSON.stringify(info), errs.length ? '\nerrors: ' + errs.slice(0, 8).join('\n') : '');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
