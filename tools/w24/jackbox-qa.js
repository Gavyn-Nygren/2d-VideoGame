#!/usr/bin/env node
// 24-2 Jack-in-the-Box Launch: the screens around the level, like a playtester sees them. Takes screenshots of the
// World 24 page card (with the 24-2 preview), the intro card, the pause card (1-player and 2-player), checks that
// speech bubbles only show in 1-player mode, plays the level to the results card with the computer at both controls,
// presses "Next level" and checks that 24-3 starts. Prints page errors.
// Usage: node tools/w24/jackbox-qa.js [--out=build/w24] [--w=960] [--h=540] [--touch=1]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const out = opt('out', 'build/w24'), vw = +opt('w', 960), vh = +opt('h', 540), touch = +opt('touch', 0);
const tag = 'qa-jackbox-' + vw + 'x' + vh;
fs.mkdirSync(out, { recursive: true });
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(Object.assign({ viewport: { width: vw, height: vh }, deviceScaleFactor: 1 }, touch ? { hasTouch: true } : {}));
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const shot = async name => { await page.waitForTimeout(400); const f = path.join(out, tag + '-' + name + '.png'); await page.screenshot({ path: f }); console.log('shot', f); };
  // the world page card with its preview
  await page.evaluate(() => { showWorld(23); });
  await page.waitForTimeout(1200);
  const card = await page.evaluate(() => {
    const b = document.querySelector('[data-act="level"][data-i="' + window.__pipbo.LEVELS.findIndex(l => l.name === 'Jack-in-the-Box Launch') + '"]');
    if (!b) return null;
    b.scrollIntoView({ block: 'center' });
    const cv = b.querySelector('canvas'), x = cv.getContext('2d'), d = x.getImageData(0, 0, cv.width, cv.height).data;
    let lit = 0; for (let i = 0; i < d.length; i += 4 * 37) if (d[i + 3] > 0) lit++;
    return { text: b.textContent.replace(/\s+/g, ' ').trim(), w: cv.width, lit };
  });
  ok(card && card.lit > 50, 'world page: the 24-2 card has a drawn preview (' + JSON.stringify(card) + ')');
  await shot('world');
  // 1-player as Pip: intro card, then play a little, bubbles, pause card
  const run = async (players, human, name) => {
    await page.evaluate(({ players, human }) => {
      const P = window.__pipbo, G = P.G;
      P.CPU.cfg.players = players; P.CPU.cfg.human = human; P.cpuApplyCfg();
      G.manual = true;
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Jack-in-the-Box Launch'));
      for (let i = 0; i < 30; i++) P.step(P.DT);
    }, { players, human });
    const intro = await page.evaluate(() => ({ introT: window.__pipbo.G.introT, cv: !!document.querySelector('canvas') }));
    await shot(name + '-intro');
    // play: the computer does both jobs (so the level moves on); in 2-player mode it's still the 2-player HUD
    const r = await page.evaluate(() => {
      const P = window.__pipbo, G = P.G;
      G.introT = 0;
      let maxB = 0;
      // the person presses ▼ now and then for 10 s (so the computer isn't waiting for them), then both are computers
      for (let i = 0; i < 60 * 25; i++) {
        if (i === 600) G.cpuOn = [true, true];
        if (i < 600) G.players[0].input.down = (i % 120) < 30;
        P.step(P.DT); const n = P.CPU.bubbles.filter(b => b && b.t > 0).length; if (n > maxB) maxB = n;
      }
      return { maxB, mode: G.mode };
    });
    await page.evaluate(({ players, human }) => { const P = window.__pipbo; P.CPU.cfg.players = players; P.CPU.cfg.human = human; P.cpuApplyCfg(); }, { players, human });
    await page.evaluate(() => window.__pipbo.pause());
    await shot(name + '-pause');
    const tip = await page.evaluate(() => document.querySelector('#overlay') ? document.querySelector('#overlay').textContent.replace(/\s+/g, ' ').trim().slice(0, 400) : '');
    console.log(name + ' pause card:', tip);
    await page.evaluate(() => window.__pipbo.resume());
    return Object.assign(r, { intro, tip });
  };
  const s1 = await run(1, 0, 'soloPip');
  ok(s1.maxB > 0, '1-player: the computer speaks in bubbles (' + s1.maxB + ')');
  ok(/You play Pip/.test(s1.tip), '1-player pause card says who you play');
  const s2 = await run(2, 0, 'duo');
  ok(s2.maxB === 0, '2-player: no speech bubbles (' + s2.maxB + ')');
  // to the results card with the computer at both controls, then "Next level"
  const r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G; G.cpuOn = [true, true];
    for (let i = 0; i < 60 * 400 && G.mode === 'play'; i++) P.step(P.DT);
    for (let i = 0; i < 400; i++) P.step(P.DT);
    return { mode: G.mode, stats: G.mst.stats && { stars: G.mst.stats.stars, boings: G.mst.stats.boings } };
  });
  ok(r.mode === 'result' || r.mode === 'clear', 'computer pair reaches the results card (' + JSON.stringify(r) + ')');
  await page.waitForTimeout(2200);
  await shot('results');
  const tiles = await page.evaluate(() => Array.from(document.querySelectorAll('#overlay .stat, #overlay .tile, #overlay [class*="stat"]')).map(e => e.textContent.replace(/\s+/g, ' ').trim()).slice(0, 12));
  console.log('result tiles:', JSON.stringify(tiles));
  await page.evaluate(() => { const b = document.querySelector('[data-act="next"]'); b.click(); });
  await page.waitForTimeout(500);
  const nx = await page.evaluate(() => { const P = window.__pipbo; return { mode: P.G.mode, code: P.levelCode(P.G.levelIndex), name: P.LEVELS[P.G.levelIndex].name }; });
  ok(nx.code === '24-3', '"Next level" goes on to 24-3 (' + JSON.stringify(nx) + ')');
  await shot('next');
  if (errors.length) { console.log('ERRORS:\n' + errors.join('\n')); fails++; }
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
