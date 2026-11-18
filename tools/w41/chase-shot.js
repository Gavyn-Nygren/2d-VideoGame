#!/usr/bin/env node
// Screenshots of 41-2 Page Turner Chase in headless Chromium with software WebGL (slow: about 1 s a frame).
//   node tools/w41/chase-shot.js <out.png> [--page=0] [--run=secs] [--auto] [--size=1280x720] [--pos=x,z,x,z] [--roll=x]
//        [--preset=top|front|wide|pip|bo|pair|hand] [--eval="js"]
//   --run: play that many seconds first with both players run by a simple script (or the computer, --cpu)
//   --pos: put Pip and Bo there (after the run); --roll: put the Roll's edge there
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const out = pos[0] || 'build/chase.png';
  const [w, h] = opt('size', '1280x720').split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +opt('dpr', 1) });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => { window.__k3dKeep = true; });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(({ pg, cpu }) => {
    const P = window.__pipbo, i = P.LEVELS.findIndex(l => l.mode === 'popchase');
    P.G.manual = true;
    if (cpu) P.G.cpuOn = [true, true];
    P.loadLevel(i); P.G.introT = 0;
    window.__pc = { i, pg };
  }, { pg: +opt('page', 0), cpu: args.includes('--cpu') });
  await page.waitForFunction(() => ['ready', 'failed'].includes(window.__pipbo.K3D.state), null, { timeout: 120000 });
  const res = await page.evaluate(async ({ pg, run, posS, roll, evalS, preS, preset }) => {
    const P = window.__pipbo, G = P.G, st = () => G.mst;
    for (let k = 0; k < pg; k++) { G.room = k; } // (pages: jump straight there)
    if (pg) { G.room = pg - 1; P.nextRoom ? P.nextRoom() : null; G.introT = 0; }
    const DT = P.DT;
    // a simple scripted pair: run along the route, pull tabs for each other
    const steps = Math.round(run / DT);
    for (let n = 0; n < steps; n++) {
      if (!G.cpuOn || !G.cpuOn[0]) for (const p of G.players) { p.input = { right: true }; }
      P.step(DT);
    }
    if (posS) {
      const a = posS.split(',').map(Number);
      G.players.forEach((p, k) => { P.MOVER3.spawn(p, a[k * 2], 0, a[k * 2 + 1]); p.b3.heading = Math.PI / 2; p.pc.mode = 'run'; p.input = {}; });
      // reveal everything up to the lead + 14 at once (as if they ran here), but keep the strips just reached opening
      st().revealX = -1e9; st().T += 0.01; P.step(DT);
      st().T += 3;
    }
    if (roll != null) st().rollX = roll;
    if (preS) eval(preS);
    if (preset) P.K3D.K && window.__pipbo.MODES.popchase && (window.POPCHASE_ART || null);
    if (preset) { const A = window.__pcArt; if (A) A.usePreset(preset); }
    for (let k = 0; k < 40; k++) P.render(1 / 30);
    let ev = null; if (evalS) ev = eval(evalS);
    return { ev, roll: st().rollX, T: st().T, p: G.players.map(p => p.b3 && [p.b3.x.toFixed(1), p.b3.z.toFixed(1), p.pc.mode]) };
  }, { pg: +opt('page', 0), run: +opt('run', 0), posS: opt('pos', ''), roll: opt('roll', null) == null ? null : +opt('roll'), evalS: opt('eval', ''), preS: opt('pre', ''), preset: opt('preset', '') });
  const preset = opt('preset', '');
  if (preset) await page.evaluate(p => { window.__preset = p; }, preset);
  const info = await page.evaluate(() => { const r = window.__pipbo.K3D.R; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries } : null; });
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await page.screenshot({ path: out, clip: box, timeout: 120000 });
  console.log(out, JSON.stringify(res), JSON.stringify(info), errs.length ? '\nerrors: ' + errs.slice(0, 12).join('\n') : '');
  await browser.close();
})();
