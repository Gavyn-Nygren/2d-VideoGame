#!/usr/bin/env node
// 4-4 Paint the Floor: screenshots of every floor, played by two computers.
//   node tools/paint/shots.js [--at=22] [--name=floor] [--w=1280 --h=800] [--skills=normal,normal] [--seed=1]
// Writes build/paint/<name>-<n>.png (--name=floor), --at seconds into each round (one round per floor; ties replay the floor).
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +opt('w', 1280), height: +opt('h', 800) } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(seed => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    const r = gen(seed * 7919); Math.random = () => r();
  }, +opt('seed', 1));
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = path.resolve(__dirname, '../../build/paint'); fs.mkdirSync(out, { recursive: true });
  const n = await page.evaluate(skills => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'paint');
    G.manual = true; G.cpuOn = [true, true]; if (P.CPU) P.CPU.skillOf = skills;
    P.loadLevel(i); G.introT = 0;
    return P.LEVELS[i].floors.length;
  }, opt('skills', 'normal,normal').split(','));
  const at = +opt('at', 22);
  for (let f = 0; f < n; f++) {
    const ok = await page.evaluate(({ f, at }) => {
      const P = window.__pipbo, G = P.G;
      for (let k = 0; k < 120 * 400 && G.mode === 'play'; k++) {
        const m = G.match;
        if (m.phase === 'live' && G.mst.floorI === f && m.roundT >= at) return G.mst.floor.name;
        // skip ahead: end this round now and make the next one round f + 1 (floor f), with nobody near a win
        if (m.phase === 'live' && G.mst.floorI !== f) { m.round = f + 1; m.wins = [0, 0]; m.ties = 0; G.mst.count = [0, 0]; G.mst.lead = [0, 0]; m.timeLeft = 0.001; } // (a tied round replays this round number)
        P.step(P.DT);
      }
      return false;
    }, { f, at });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(out, opt('name', 'floor') + '-' + (f + 1) + '.png') });
    console.log('floor', f + 1, ok);
  }
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
