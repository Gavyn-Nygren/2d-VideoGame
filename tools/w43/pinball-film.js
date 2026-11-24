#!/usr/bin/env node
// 43-2 Pinball Panic: film a stretch of the climb frame by frame (the physics in motion: landings, bounces, clacks).
//   node tools/w43/pinball-film.js <start secs> <secs to film> <out dir> [--fps=30] [--seed=1] [--sec=N]
//        [--ballcam=side|front|behind|low|top|chase[:id]] [--cam=ex,ey,ez,ax,ay,az[,fov]] [--size=960x540] [--sheet=cols]
//        [--eval="js run in the page when filming starts"]
// Plays <start secs> with drawing off (the computer plays both), then steps the game and the scenery together at a
// fixed rate and saves every frame (f000.png ...). --ballcam follows that ball each frame. --sheet=N also writes
// sheet.png, every frame in a grid N wide (needs python3 with Pillow), handy for looking at a whole bounce at once.
'use strict';
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const [start = '0', len = '2', out = 'build/w43-film'] = pos;
  const fps = +opt('fps', 30), [w, h] = opt('size', '960x540').split('x').map(Number);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: w, height: h } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.stack || e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => window.__pipbo.K3D.need());
  await page.evaluate(async ({ start, seed, sec }) => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D;
    const i = P.LEVELS.findIndex(l => l.mode === 'arcadepinball');
    window.__seed(seed * 7919);
    G.manual = true; K3D.noRender = true; P.CPU.skillOf = [null, null]; G.cpuOn = [true, true];
    delete G.results[i]; P.loadLevel(i); G.introT = 0;
    const st = G.mst, TB = PINBALL_TABLE;
    st.phase = 'play'; st.phaseT = 0;
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
    const steps = Math.round(start / P.DT);
    for (let n = 0; n < steps && G.mode === 'play'; n++) { window.__inStep = true; P.step(P.DT); window.__inStep = false; if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0)); }
    // from here the scenery only moves when the film says so (a fixed step per frame)
    const M = P.MODES ? P.MODES.arcadepinball : null;
    window.__film = { go: false, dt: 0 };
    const draw = PINBALL_SCENE.update;
    PINBALL_SCENE.update = (K, s, dt) => { if (!window.__film.go) return; window.__film.go = false; draw(K, s, window.__film.dt); };
    K3D.noRender = false;
    void M;
  }, { start: +start, seed: +opt('seed', 1), sec: +opt('sec', -1) });
  if (opt('eval', '')) await page.evaluate(opt('eval', ''));
  const cam = opt('cam', ''), bc = opt('ballcam', '');
  if (cam) await page.evaluate(c => { const v = c.split(',').map(Number); PINBALL_SCENE.camOverride = { eye: v.slice(0, 3), at: v.slice(3, 6), fov: v[6] || 40 }; }, cam);
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  // warm up: a second of drawn frames with no time passing so the camera settles and every texture is up
  await page.evaluate(() => PINBALL_SCENE.snap());
  for (let k = 0; k < 4; k++) await page.evaluate(() => new Promise(r => { window.__film.go = true; window.__film.dt = 0.0001; requestAnimationFrame(() => requestAnimationFrame(r)); }));
  const frames = Math.round(+len * fps), per = Math.max(1, Math.round(1 / fps / (1 / 120)));
  const log = [];
  for (let f = 0; f < frames; f++) {
    const info = await page.evaluate(async ({ per, bc }) => {
      const P = window.__pipbo, G = P.G;
      for (let n = 0; n < per && G.mode === 'play'; n++) { window.__inStep = true; P.step(P.DT); window.__inStep = false; }
      if (bc) {
        const [k0, id] = bc.split(':'), m = PINBALL_SCENE.SC.balls[+(id || 0)], b = G.mst.balls[+(id || 0)], TB = PINBALL_TABLE;
        const p = { x: b.x, y: TB.yAt(b.d) + (b.mode === 'ride' ? (b.rideH || 0) : b.h) + TB.T.R, z: -b.d };
        const o = { side: [4.2, 0.6, 0], front: [0, 0.7, 4.4], behind: [0.6, 2.4, -4.8], low: [2.4, 0.2, 3.4], top: [0.4, 4.4, -2.6], chase: [2.8, -1.0, -6.5], wide: [6, 5, -12] }[k0];
        PINBALL_SCENE.camOverride = { eye: [p.x + o[0], p.y + o[1], p.z - o[2]], at: [p.x, p.y + (k0 === 'chase' ? 0.6 : -0.1), p.z], fov: 40 };
        void m;
      }
      await new Promise(r => { window.__film.go = true; window.__film.dt = per * P.DT; requestAnimationFrame(() => requestAnimationFrame(r)); });
      const st = G.mst;
      return { t: +st.t.toFixed(2), b: st.balls.map(b => [b.mode, +b.x.toFixed(2), +b.d.toFixed(2), +(b.mode === 'ride' ? (b.rideH || 0) : b.h).toFixed(2), +Math.hypot(b.vx, b.vd).toFixed(1)]) };
    }, { per, bc });
    await page.screenshot({ path: path.join(out, 'f' + String(f).padStart(3, '0') + '.png'), clip: box });
    log.push(f + ' ' + JSON.stringify(info));
  }
  fs.writeFileSync(path.join(out, 'log.txt'), log.join('\n') + '\n');
  console.log(log.slice(0, 3).join('\n') + '\n...\n' + log.slice(-2).join('\n'));
  const cols = +opt('sheet', 0);
  if (cols) {
    const py = `import sys,glob\nfrom PIL import Image\nfs=sorted(glob.glob(sys.argv[1]+'/f*.png'))\nim=[Image.open(f) for f in fs]\nc=int(sys.argv[2]);w,h=im[0].size;s=0.5\nW,H=int(w*s),int(h*s)\nr=(len(im)+c-1)//c\nS=Image.new('RGB',(W*c,H*r))\nfor i,m in enumerate(im): S.paste(m.resize((W,H)),((i%c)*W,(i//c)*H))\nS.save(sys.argv[1]+'/sheet.png')`;
    try { execFileSync('python3', ['-c', py, out, String(cols)]); console.log(path.join(out, 'sheet.png')); } catch (e) { console.log('sheet failed: ' + e.message); }
  }
  if (errs.length) console.log('errors:\n' + errs.slice(0, 6).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
