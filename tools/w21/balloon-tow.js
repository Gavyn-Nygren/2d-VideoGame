#!/usr/bin/env node
// 21-1 Hot Air Balloon Climb: forces a sink off the bottom of the screen (twice from one checkpoint) and screenshots
// Gus the goose towing the balloon back, then checks the gold burner. Also forces two hard dock landings (gold cushion)
// and the gold rope over the dock. Usage: node tools/w21/balloon-tow.js [--out=build/w21]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const out = opt('out', 'build/w21');
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    G.manual = true; G.cpuOn = [true, true];
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Hot Air Balloon Climb'));
    P.nextRoom(); P.nextRoom(); // the storm climb: open sky above the checkpoint
    G.introT = 0;
    window.__run = (secs, f) => { for (let i = 0; i < Math.round(secs / P.DT); i++) { if (f) f(); P.step(P.DT); } };
    window.__burnOff = () => { P.CPU.filter = (p, o) => (p.id === G.mst.burner ? {} : o); };
    window.__burnOn = () => { P.CPU.filter = null; };
  });
  // climb past the checkpoint, then let the burner go cold
  await page.evaluate(() => { const G = window.__pipbo.G; let n = 0; while (G.mst.b.h < 2150 && n++ < 12000) window.__run(1 / 120); });
  const h0 = await page.evaluate(() => window.__pipbo.G.mst.b.h);
  console.log('climbed to', Math.round(h0));
  for (let k = 0; k < 2; k++) {
    await page.evaluate(() => { window.__burnOff(); const G = window.__pipbo.G; let n = 0; while (G.mst.state === 'ride' && n++ < 120 * 60) window.__run(1 / 120); });
    const s = await page.evaluate(() => { const st = window.__pipbo.G.mst; return { state: st.state, tows: st.stats.tows, gold: st.goldBurn }; });
    ok(s.state === 'tow', `tow ${k + 1}: Gus comes when the balloon sinks off the screen (${JSON.stringify(s)})`);
    await page.evaluate(() => window.__run(1.6));
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(out, 'balloon-tow-' + (k + 1) + '.png') });
    await page.evaluate(() => { window.__burnOn(); window.__run(3); });
    const s2 = await page.evaluate(() => { const st = window.__pipbo.G.mst; return { state: st.state, h: Math.round(st.b.h), cp: st.cp.h, gold: st.goldBurn, msg: st.msg && st.msg.text }; });
    ok(s2.state === 'ride' && Math.abs(s2.h - s2.cp) < 200, `tow ${k + 1}: back at the checkpoint (${JSON.stringify(s2)})`);
  }
  ok(await page.evaluate(() => window.__pipbo.G.mst.goldBurn), 'two tows from one checkpoint: gold burner');
  // the dock: drop onto it hard twice (gold cushion), then hover above it with the burner held (gold rope)
  await page.evaluate(() => {
    const G = window.__pipbo.G, st = G.mst, d = st.c.dock;
    window.__burnOff();
    for (let k = 0; k < 2; k++) { st.b.x = d.x; st.b.h = d.h + 120; st.b.vy = -150; st.b.vx = 0; st.b.heat = 0; st.cam = d.h - 250; window.__run(1.6); }
  });
  const d1 = await page.evaluate(() => { const st = window.__pipbo.G.mst; return { bounces: st.c.dock.bounces, gold: st.c.dock.gold, state: st.state }; });
  ok(d1.bounces >= 2 && d1.gold, 'two hard landings: gold cushion (' + JSON.stringify(d1) + ')');
  await page.screenshot({ path: path.join(out, 'balloon-cushion.png') });
  // a burner who never lets go over the dock: after a while the gold rope pulls the balloon down onto it
  const r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, st = G.mst, d = st.c.dock;
    P.CPU.filter = (p, o) => (p.id === st.burner ? { act: true } : o);
    st.b.x = d.x + 200; st.b.h = d.h + 60; st.b.vy = 0; st.b.heat = 0.8;
    let n = 0, rope = false;
    while (st.state === 'ride' && n++ < 120 * 60) { P.step(P.DT); if (st.reel) rope = true; }
    return { state: st.state, rope, helps: st.stats.helps, t: Math.round(n / 120) };
  });
  ok(r.rope && r.state === 'land', 'burner never lets go above the dock: the gold rope reels the balloon in (' + JSON.stringify(r) + ')');
  await browser.close();
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); fails++; }
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
