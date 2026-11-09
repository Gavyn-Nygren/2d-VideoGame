#!/usr/bin/env node
// Wind-Up Train Ride screenshots: starts 24-1 with G.manual and the computer at both jobs (or 1-player with --solo=1,
// the person idle) and saves screenshots (deviceScaleFactor 1) to build/w24/.
// Usage: node tools/w24/windtrain-shots.js [--at=3,12,30] [--room=0] [--w=960] [--h=540] [--touch=1] [--intro=1] [--tag=x] [--solo=1] [--result=1]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const at = opt('at', '3,12,30').split(',').map(Number), room = +opt('room', 0), vw = +opt('w', 960), vh = +opt('h', 540);
const touch = +opt('touch', 0), intro = +opt('intro', 0), tag = opt('tag', ''), solo = +opt('solo', 0), out = 'build/w24';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const co = { viewport: { width: vw, height: vh }, deviceScaleFactor: 1 };
  if (touch) Object.assign(co, { hasTouch: true });
  const page = await browser.newPage(co);
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen(4242);
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (touch) await page.evaluate(() => { document.documentElement.classList.add('has-touch'); window.dispatchEvent(new Event('resize')); });
  await page.evaluate(({ room, intro, solo }) => {
    const P = window.__pipbo, G = P.G;
    if (solo) { P.CPU.cfg.players = 1; P.CPU.cfg.human = 1; P.cpuApplyCfg(); } else { P.CPU.cfg.players = 2; P.cpuApplyCfg(); }
    G.manual = true;
    G.cpuOn = solo ? [true, false] : [true, true];
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Wind-Up Train Ride'));
    G.cpuOn = solo ? [true, false] : [true, true];
    for (let k = 0; k < room; k++) P.nextRoom();
    if (!intro) G.introT = 0;
    window.__simT = 0;
  }, { room, intro, solo });
  for (const t of at) {
    await page.evaluate(t => {
      const P = window.__pipbo, G = P.G;
      // (in 1-player shots the person keeps "pressing" so the computer doesn't wait)
      while (window.__simT < t && (G.mode === 'play' || G.mode === 'clear')) { if (G.cpuOn[0] !== G.cpuOn[1]) G.mst.personT = G.time; P.step(P.DT); window.__simT += P.DT; }
    }, t);
    await page.waitForTimeout(await page.evaluate(() => window.__pipbo.G.mode === 'clear') ? 2200 : 250);
    const f = path.join(out, 'windtrain-' + (tag ? tag + '-' : '') + 'r' + room + '-' + t + 's-' + vw + 'x' + vh + (touch ? '-touch' : '') + '.png');
    await page.screenshot({ path: f });
    const info = await page.evaluate(() => { const P = window.__pipbo, G = P.G, st = G.mst; return { mode: G.mode, room: G.room, time: +G.time.toFixed(1), state: st.state, plan: st.c && P.MODES.windtrain.plan(st).why, stars: st.stars, clunks: st.stats && st.stats.clunks, actBtns: [...document.querySelectorAll('.tbtn-act')].map(b => b.textContent + ':' + (b.offsetParent ? 'shown' : 'hidden')) }; });
    console.log(f, JSON.stringify(info));
  }
  if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
