#!/usr/bin/env node
// 29-4 Throwing Star Duel screenshots of every round, the intro, pause and results cards.
//   node tools/w29/starduel-look.js [--phone] [--solo]
// --phone: 844x390 touch phone (deviceScaleFactor 2); else a 960x540 page. --solo: 1-player mode set through the real
// settings (CPU.cfg + cpuApplyCfg, person plays Pip), so the computer's pad is hidden as it is for players.
// Writes build/w29/starduel-look[-phone][-solo]-<what>.png.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2), phone = args.includes('--phone'), solo = args.includes('--solo');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(phone ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : { viewport: { width: 960, height: 540 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (phone) await page.evaluate(() => { document.documentElement.classList.add('has-touch'); window.dispatchEvent(new Event('resize')); });
  const out = path.resolve(__dirname, '../../build/w29'); fs.mkdirSync(out, { recursive: true });
  const tag = 'starduel-look' + (phone ? '-phone' : '') + (solo ? '-solo' : '') + '-';
  const shot = async name => { await page.waitForTimeout(150); await page.screenshot({ path: path.join(out, tag + name + '.png') }); };
  // play with the computer at both seats, but show the person's view (cpuOn as the setting has it) while shooting
  const load = (round) => page.evaluate(({ solo, round }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'starduel');
    P.CPU.cfg.players = solo ? 1 : 2; P.CPU.cfg.human = 0; P.cpuApplyCfg();
    P.MODES.starduel.testRound = round; G.manual = true; P.loadLevel(i); P.MODES.starduel.testRound = null;
  }, { solo, round });
  const run = secs => page.evaluate(({ secs, solo }) => {
    const P = window.__pipbo, G = P.G;
    G.cpuOn = [true, true];
    for (let k = 0; k < secs * 120 && G.mode === 'play'; k++) P.step(P.DT);
    G.cpuOn = solo ? [false, true] : [false, false];
    return { mode: G.mode, round: G.match && G.match.round, t: G.mst.rt };
  }, { secs, solo });
  await load(null); await run(0.5); await shot('intro');
  await page.evaluate(() => { window.__pipbo.G.introT = 0; });
  for (let k = 0; k < 5; k++) {
    if (k) { await load(k); await page.evaluate(() => { window.__pipbo.G.introT = 0; }); }
    await run(k ? 11 : 9.4); await shot('round' + (k + 1));
  }
  await page.evaluate(() => window.__pipbo.pause()); await shot('pause');
  await page.evaluate(() => window.__pipbo.resume());
  await load(null); await page.evaluate(() => { window.__pipbo.G.introT = 0; });
  console.log(await run(900));
  await page.waitForTimeout(1500); await shot('results');
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
