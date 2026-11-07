#!/usr/bin/env node
// Close-up screenshots of 18-4 Plank Duel poses, driven by scripted keys (no computer), for checking the art.
//   node tools/w18/plankduel-pose.js [--out=build/w18]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const out = path.resolve('build/w18');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.name === 'Plank Duel');
    G.manual = true; G.cpuOn = [false, false];
    P.loadLevel(i);
    G.introT = 0;
    window.__run = (secs, keys) => {
      const n = Math.round(secs / P.DT);
      for (let k = 0; k < n; k++) {
        for (const id of [0, 1]) {
          const p = G.players[id], want = (keys && keys[id]) || {};
          for (const key of ['left', 'right', 'down', 'up']) p.input[key] = !!want[key];
          const a = !!want.act, j = !!want.jump;
          if (a && !p.prevAct) { p.pendingAct = true; p.actAge = 0; } p.prevAct = a; p.input.act = a;
          if (j && !p.prevJump) p.pendingJump = true; p.prevJump = j; p.input.jump = j;
        }
        P.step(P.DT);
      }
    };
    window.__run(4.5); // through Round 1 and 3-2-1
  });
  const clip = { x: 340, y: 330, width: 600, height: 340 };
  const shot = async (name, full) => { await page.waitForTimeout(80); await page.screenshot({ path: path.join(out, 'pose-' + name + '.png'), clip: full ? undefined : clip }); };
  await page.evaluate(() => window.__run(0.6, [{ right: true }, { left: true }]));
  await shot('a-guards-high');
  await page.evaluate(() => window.__run(0.3, [{}, { down: true }]));
  await shot('b-bo-low');
  await page.evaluate(() => window.__run(0.25, [{ act: true }, { down: true }]));
  await shot('c-pip-windup-high');
  await page.evaluate(() => window.__run(0.25, [{}, { down: true }]));
  await shot('d-pip-strike');
  await page.evaluate(() => window.__run(1.0, [{}, {}]));
  await page.evaluate(() => window.__run(0.2, [{ down: true, act: true }, {}]));
  await shot('e-pip-windup-low');
  await page.evaluate(() => window.__run(0.3, [{ down: true }, { jump: true }]));
  await shot('f-bo-hop');
  await page.evaluate(() => window.__run(1.0, [{}, {}]));
  await page.evaluate(() => window.__run(0.9, [{}, { act: true }]));
  await shot('g-bo-charge');
  await page.evaluate(() => window.__run(0.12, [{}, {}]));
  await shot('h-bo-lunge');
  await page.evaluate(() => window.__run(0.4, [{}, {}]));
  await shot('i-after-lunge', true);
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
