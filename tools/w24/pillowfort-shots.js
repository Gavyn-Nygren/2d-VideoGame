#!/usr/bin/env node
// 24-4 Pillow Fort Battle: screenshots (round card, mid-battle with the aim arc, a topple, results) at 960x540 and on
// phones (844x390 and 390x844 with touch). Computer vs computer plays so there is something to see.
//   node tools/w24/pillowfort-shots.js [--round=towers]   -> build/w24/pf-*.png
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const round = opt('round', null);
(async () => {
  const out = path.resolve(__dirname, '..', '..', 'build', 'w24');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const errors = [];
  for (const [name, vw, vh, touch] of [['960', 960, 540, false], ['844x390', 844, 390, true], ['390x844', 390, 844, true]]) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: touch, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ': ' + String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(name + ': ' + m.text()); });
    await page.addInitScript(() => {
      const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
      let seeded = gen(5); Math.random = () => seeded();
    });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    if (touch) await page.evaluate(() => { document.documentElement.classList.add('has-touch'); });
    await page.evaluate(round => {
      const P = window.__pipbo, G = P.G;
      G.manual = true;
      P.MODES.pillowfort.testRound = round;
      G.cpuOn = [false, true]; // Pip a person (shows key chips), Bo the computer
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pillow Fort Battle'));
      G.cpuOn = [false, true];
      G.introT = 0; P.fit();
      window.__run = (s, until) => { for (let k = 0; k < Math.round(s / P.DT); k++) { P.step(P.DT); if (until && until()) return true; } return false; };
    }, round);
    const shot = async tag => { await page.evaluate(() => window.__pipbo.render && window.__pipbo.render(0)); await page.waitForTimeout(60); await page.screenshot({ path: path.join(out, `pf-${name}-${tag}.png`) }); };
    await page.evaluate(() => window.__run(1.6));
    await shot('card');
    // Pip plays as a computer too from here (so both sides do things), but keep Pip's chips showing for a moment
    await page.evaluate(() => { const G = window.__pipbo.G; G.cpuOn = [true, true]; window.__run(6); });
    await shot('early');
    // wait until someone is aiming, then shoot
    await page.evaluate(() => { const G = window.__pipbo.G; window.__run(14, () => G.mst.pl.some(s => s.aim && s.holdT > 0.5)); });
    await shot('aim');
    await page.evaluate(() => { const G = window.__pipbo.G; window.__run(70, () => G.match.phase === 'end'); window.__run(0.6); });
    await shot('end');
    await ctx.close();
  }
  console.log(errors.length ? 'ERRORS\n' + errors.slice(0, 8).join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
