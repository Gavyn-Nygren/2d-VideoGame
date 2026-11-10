#!/usr/bin/env node
// Throwing Star Duel extra screenshots: node tools/w29/starduel-shots.js [--phone] [--solo]
// Writes build/w29/starduel-x-<what>.png: a lantern round, the pause card and the results card (with --phone: a touch
// phone in landscape, 844x390, so the touch pads and the bigger HUD show).
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2), phone = args.includes('--phone'), solo = args.includes('--solo');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(phone ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 1100, height: 640 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = path.resolve(__dirname, '../../build/w29'); fs.mkdirSync(out, { recursive: true });
  const tag = 'starduel-x' + (phone ? '-phone' : '') + (solo ? '-solo' : '') + '-';
  const shot = async name => { await page.waitForTimeout(120); await page.screenshot({ path: path.join(out, tag + name + '.png') }); };
  await page.evaluate(solo => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'starduel');
    G.manual = true; G.cpuOn = solo ? [false, true] : [true, true]; P.loadLevel(i);
  }, solo);
  const run = (secs, untilRound) => page.evaluate(({ secs, untilRound }) => {
    const P = window.__pipbo, G = P.G;
    for (let k = 0; k < secs * 120 && G.mode === 'play'; k++) { P.step(P.DT); if (untilRound && G.match.round >= untilRound && G.match.phase === 'live' && G.mst.rt > 4 && G.mst.stars.length >= 2) break; }
    return { mode: G.mode, round: G.match && G.match.round };
  }, { secs, untilRound });
  await run(1.2); await shot('intro');
  await run(8); await shot('round1');
  console.log(await run(200, 2)); await shot('lantern');
  await page.evaluate(() => window.__pipbo.pause()); await shot('pause');
  await page.evaluate(() => { const P = window.__pipbo; (P.resume || P.pause)(); });
  console.log(await run(900)); await shot('results');
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
