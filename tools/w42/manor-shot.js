#!/usr/bin/env node
// 42-3 Spook Manor: a screenshot from headless Chromium with software WebGL (SwiftShader).
//   node tools/w42/manor-shot.js <simulated secs> <out.png> [--who=pair|idle] [--from=<clock index>] [--wait=3]
//        [--cam=eye.x,eye.y,eye.z,at.x,at.y,at.z[,fov]] [--lampoff] [--size=1280x720] [--dpr=1]
//        [--eval="js run in the page (G, st = G.mst, P = __pipbo) before the shot"] [--page=build/pip-and-bo.html]
// Plays <simulated secs> of the level with drawing off (the computer plays both, or nobody with --who=idle), then draws.
// --cam holds the camera still; --lampoff switches the lantern's light off (the comparison shot). Prints draw calls,
// triangles and any page errors.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), pos = args.filter(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x === '--' + k || x.startsWith('--' + k + '=')); return a ? (a.includes('=') ? a.slice(k.length + 3) : true) : d; };
(async () => {
  const [secs = '0', out = 'build/w42-manor.png'] = pos;
  const [w, h] = opt('size', '1280x720').split('x').map(Number);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +opt('dpr', 1) });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e.stack || e)));
  await page.addInitScript(() => { window.__k3dKeep = true; });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', opt('page', 'index.html')));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const ok = await page.evaluate(() => window.__pipbo.K3D.need());
  if (!ok) console.log('3D failed: ' + await page.evaluate(() => window.__pipbo.K3D.why));
  const r = await page.evaluate(async ({ secs, who, from }) => {
    const P = window.__pipbo, G = P.G, K3D = P.K3D;
    const i = P.LEVELS.findIndex(l => l.mode === 'parkmanor');
    G.manual = true; K3D.noRender = true;
    P.CPU.skillOf = [null, null];
    G.cpuOn = who === 'idle' ? [false, false] : [true, true];
    P.loadLevel(i);
    G.introT = 0;
    const st = G.mst;
    if (from > 0) { st.hasLantern = st.hasKey = true; st.restart = from; PARKMANOR.restartAt(st); }
    const steps = Math.round(secs / P.DT);
    for (let n = 0; n < steps && G.mode === 'play'; n++) {
      if (who === 'idle') for (const p of G.players) for (const key in p.input) p.input[key] = false;
      P.step(P.DT);
      if (n % 2000 === 0) await new Promise(r => setTimeout(r, 0));
    }
    K3D.noRender = false;
    return { mode: G.mode, zone: st.zone, t: +st.t.toFixed(1), wisps: st.wisps, at: G.players.map(p => p.b3.x.toFixed(1) + ',' + p.b3.z.toFixed(1)).join(' ') };
  }, { secs: +secs, who: opt('who', 'pair'), from: +opt('from', 0) });
  // hold the game still (no more steps) while the picture settles
  await page.evaluate(() => { const G = window.__pipbo.G; G.cpuOn = [false, false]; for (const p of G.players) for (const k in p.input) p.input[k] = false; });
  if (opt('eval', '')) await page.evaluate(src => { const P = window.__pipbo, G = P.G, st = G.mst; (new Function('P', 'G', 'st', src))(P, G, st); }, opt('eval', ''));
  const cam = opt('cam', '');
  if (cam) await page.evaluate(c => { const v = c.split(',').map(Number); PARKMANOR_SCENE.camOverride = { eye: v.slice(0, 3), at: v.slice(3, 6), fov: v[6] || 40 }; }, cam);
  if (opt('lampoff', false)) await page.evaluate(() => { PARKMANOR_SCENE.lampOff = true; });
  await page.waitForTimeout(+opt('wait', 3) * 1000);
  const info = await page.evaluate(() => { const r = window.__pipbo.K3D.R; return r ? { calls: r.info.render.calls, tris: r.info.render.triangles, tex: r.info.memory.textures, geo: r.info.memory.geometries } : null; });
  const box = await page.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => { window.__pipbo.K3D.freeze = true; r(); })));
  await page.screenshot({ path: out, clip: box, animations: 'allow', caret: 'initial', timeout: 180000 });
  console.log(out, JSON.stringify(r), JSON.stringify(info), errs.length ? '\nerrors: ' + errs.slice(0, 8).join('\n') : '');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
