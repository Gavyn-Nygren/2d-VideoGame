#!/usr/bin/env node
// Era 'wright' picture book: the computer pair plays and the script takes a screenshot at named moments (a gust
// blowing, a flock, a falling sandbag, the photographer, a landing, the swap, the catch, the grab ...), plus a few
// forced ones (a wing scrape, a hot engine, an engine-out). Desktop by default; --phone for 844x390 with touch pads.
//   node tools/w30/wright-shots.js [--phone] [--seed=1] [--only=gust,catch]      -> build/w30/wright/m-<name>.png
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const phone = args.includes('--phone'), only = opt('only', '') ? opt('only', '').split(',') : null;
// name, when (a JS condition on ph / st), optional "force" (JS run when the condition first holds), wait s after it
const MOMENTS = [
  ['rail', 'ph.mode === "rail" && ph.v > 150', '', 0],
  ['gust', 'ph.flight === 0 && ph.gust && ph.gust.tel <= 0 && ph.gust.t > 0.5', 'ph.tilt = 0.5 * ph.gust.dir', 0],
  ['photo', 'ph.photo && ph.photo.flash > 0.3', '', 0],
  ['land', 'ph.mode === "rest" && ph.modeT > 0.5', '', 0],
  ['swap', 'ph.mode === "rail" && ph.flight === 1 && ph.swap > 0 && ph.swap < 0.4', '', 0],
  ['dune', 'ph.flight === 1 && ph.dunes.some(d => d.x - ph.x > 60 && d.x - ph.x < 260)', '', 0],
  ['flock', 'ph.obs.some(o => o.kind === "gulls" && !o.scat && o.warn <= 0 && o.x - ph.x < 330)', '', 0],
  ['flockwarn', 'ph.flight >= 2 && ph.obs.some(o => o.kind === "gulls" && o.warn > 0.2 && o.warn < 0.6)', '', 0],
  ['bag', 'ph.obs.some(o => o.kind === "bag" && o.state === "fall" && o.x - ph.x < 300)', '', 0],
  ['down', 'ph.gust && ph.gust.kind === "down" && ph.gust.tel <= 0 && ph.gust.t > 0.4', '', 0],
  ['scrape', 'ph.flight === 2 && ph.mode === "fly" && ph.d > 2600', 'ph.tilt = -0.95; ph.overT = 5', 0.45],
  ['back', 'ph.mode === "back" && ph.modeT > 0.4', '', 0],
  ['hot', 'ph.flight === 2 && ph.mode === "fly" && ph.d > 4300', 'ph.heat = 1; ph.hot = 2.6', 0.5],
  ['out', 'ph.flight === 3 && ph.mode === "fly" && ph.d > 900', 'ph.spin = 0; ph.y = 400; ph.free = 0; G.cpuOn = [false, false]', 2.2],
  ['catch', 'ph.catch && ph.catch.near && ph.catch.fill > 0.5', '', 0],
  ['grab', 'ph.mode === "grab" && ph.modeT > 0.42', '', 0],
  ['won', 'ph.mode === "won" && ph.modeT > 0.5', '', 0],
  ['leave', 'st.cut && st.cut.t > 2.2', '', 0],
];
(async () => {
  const outDir = path.resolve(__dirname, '..', '..', 'build', 'w30', 'wright');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext(phone ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  if (phone) await page.evaluate(() => { try { enableTouch(); Pads.lastNonPad = 'touch'; setKind('touch'); } catch (e) { /* older builds */ } });
  for (const [name, when, force, wait] of MOMENTS) {
    if (only && !only.includes(name)) continue;
    const r = await page.evaluate(({ when, force, wait, seed }) => {
      const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test, DT = P.DT;
      window.__seed(seed * 7919); G.manual = true; G.cpuOn = [true, true]; P.CPU.filter = null;
      TT.jump(TT.TTH_ORDER.indexOf('wright'), {}); G.cpuOn = [true, true];
      const st = G.mst, cond = new Function('ph', 'st', 'G', 'return ' + when), f = force ? new Function('ph', 'st', 'G', force) : null;
      window.__inStep = true;
      let hit = false, n = 0;
      for (; n < 420 / DT; n++) { P.step(DT); if (G.mst !== st || G.mode !== 'play') break; if (cond(st.ph, st, G)) { hit = true; break; } }
      if (hit && f) f(st.ph, st, G);
      if (hit) for (let k = 0; k < wait / DT; k++) P.step(DT);
      window.__inStep = false;
      return { hit, t: Math.round(st.phT * 10) / 10, mode: st.ph.mode };
    }, { when, force, wait, seed: +opt('seed', 1) });
    await page.waitForTimeout(250);
    const file = path.join(outDir, (phone ? 'p-' : 'm-') + name + '.png');
    if (r.hit) { if (phone) await page.screenshot({ path: file }); else await page.locator('#game').screenshot({ path: file }); }
    console.log(name.padEnd(10), r.hit ? 'at ' + r.t + ' s (' + r.mode + ') -> ' + file : 'NEVER HAPPENED');
  }
  if (errs.length) console.log('PAGE MESSAGES:\n' + errs.slice(0, 10).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
