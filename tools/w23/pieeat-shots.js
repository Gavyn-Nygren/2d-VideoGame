#!/usr/bin/env node
// 23-4 Pie-Eating Contest: screenshots at a few moments (two computers playing), desktop 1280x720 and phones.
//   node tools/w23/pieeat-shots.js [--only=desk|phone]
// Writes build/w23/pe-*.png (deviceScaleFactor 1). Moments: the intro card, the round card, the 3-2-1, early in the
// round (key chips), mid-round, a hiccup, the round-end banner, a gold-help round card, round 4 and 5, the results card,
// 1-player mode (the computer's tag and bubble), and the same on a phone in landscape and portrait.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith('--only=')) || '').split('=')[1] || null;
(async () => {
  const browser = await chromium.launch();
  const out = path.resolve(__dirname, '..', '..', 'build', 'w23');
  fs.mkdirSync(out, { recursive: true });
  const errors = [];
  const views = [['desk', 1280, 720, false], ['phone-844x390', 844, 390, true], ['phone-390x844', 390, 844, true]].filter(v => !only || v[0].startsWith(only));
  for (const [tag, vw, vh, touch] of views) {
    const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1, hasTouch: touch });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(tag + ': ' + String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(tag + ': ' + m.text()); });
    await page.addInitScript(() => {
      const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
      let seeded = gen(77); Math.random = () => seeded();
    });
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    const shot = async name => { await page.waitForTimeout(120); await page.screenshot({ path: path.join(out, 'pe-' + tag + '-' + name + '.png') }); };
    // run until a condition holds (or a time limit), with both computers playing
    const until = (cond, max) => page.evaluate(({ cond, max }) => {
      const P = window.__pipbo, G = P.G, f = new Function('G', 'P', 'return ' + cond);
      let n = 0; while (G.mode === 'play' && !f(G, P) && n++ < max * 120) P.step(P.DT);
      return n;
    }, { cond, max });
    await page.evaluate(touch => {
      const P = window.__pipbo, G = P.G;
      if (touch) { try { P.enableTouch && P.enableTouch(); } catch (e) { /* fine */ } }
      G.manual = true;
      P.CPU.skillOf = ['normal', 'easy'];
      G.cpuOn = [true, true];
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pie-Eating Contest'));
      G.cpuOn = [true, true];
      P.fit && P.fit();
    }, touch);
    await until('G.introT < 1.6', 3); await shot('1-intro');
    await until('G.match.phase === "ready" && G.match.t > 0.4', 6); await shot('2-roundcard');
    await until('G.match.phase === "count" && G.match.t > 0.9', 6); await shot('3-count');
    await until('G.match.phase === "live" && G.mst.rt > 2.2', 6); await shot('4-early');
    await until('G.mst.pl.some(E => E.cheeks >= 5)', 20); await shot('5-cheeks');
    await until('G.mst.pl.some(E => E.hicT > 1.2)', 40); await shot('6-hiccup');
    await until('G.match.phase === "end" && G.match.t > 0.5', 60); await shot('7-roundend');
    if (tag === 'desk') {
      // round 2 card: the computer who lost gets gold
      await until('G.match.phase === "ready" && G.match.t > 0.4', 6); await shot('8-gold-card');
      await until('G.match.phase === "live" && G.mst.rt > 6', 30); await shot('9-gold-live');
      // jump to round 4 and 5 looks
      await page.evaluate(() => { const P = window.__pipbo; P.MODES.pieeat.testRound = 4; });
      await page.evaluate(() => { const P = window.__pipbo, G = P.G; P.loadLevel(G.levelIndex, 'play', { rematch: true }); G.cpuOn = [true, true]; });
      await until('G.match.phase === "live" && G.mst.rt > 7', 30); await shot('10-pumpkin');
      await until('G.mst.pl.some(E => E.pie >= 1 && E.left < 20)', 30); await shot('11-pumpkin-last');
      await page.evaluate(() => { const P = window.__pipbo; P.MODES.pieeat.testRound = 5; });
      await page.evaluate(() => { const P = window.__pipbo, G = P.G; P.loadLevel(G.levelIndex, 'play', { rematch: true }); G.cpuOn = [true, true]; });
      await until('G.match.phase === "live" && G.mst.pl.some(E => E.pie >= 2 && E.left < 12)', 40); await shot('12-final-cream');
      await page.evaluate(() => { window.__pipbo.MODES.pieeat.testRound = 0; });
      await until('G.mode !== "play"', 400);
      await page.waitForTimeout(1500); await shot('13-results');
      // 1-player mode: the person is Pip (idle), the computer plays Bo
      await page.evaluate(() => {
        const P = window.__pipbo, G = P.G;
        P.CPU.skillOf = [null, null];
        P.cpuSetCfg('players', 1); P.cpuSetCfg('human', 0); P.cpuSetCfg('skill', 'easy');
        P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pie-Eating Contest'));
        G.manual = true;
      });
      await until('G.match.phase === "count"', 6); await shot('14-solo-count');
      await until('G.match.phase === "live" && G.mst.rt > 3', 10); await shot('15-solo-live');
      await until('G.match.phase === "end" && G.match.t > 0.8', 70); await shot('16-solo-end');
      await page.evaluate(() => { const P = window.__pipbo; P.cpuSetCfg('players', 2); });
    }
    await ctx.close();
  }
  console.log('wrote ' + out);
  console.log(errors.length ? 'ERRORS\n' + errors.slice(0, 8).join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
