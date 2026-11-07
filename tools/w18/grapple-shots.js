#!/usr/bin/env node
// Screenshots of 18-2 Grapple & Zip at a few moments, with the computer playing both (or scripted steps).
// Usage: node tools/w18/grapple-shots.js [--w=1280 --h=800] [--times=3,12,20] [--room=0] [--out=build/w18] [--solo=0|1|none] [--touch]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const flag = k => args.includes('--' + k);
(async () => {
  const w = +opt('w', 1280), h = +opt('h', 800), out = opt('out', 'build/w18'), room = +opt('room', 0);
  const times = opt('times', '3,10,16,22,30').split(',').map(Number);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const ctxOpts = { viewport: { width: w, height: h } };
  if (flag('touch')) Object.assign(ctxOpts, { hasTouch: true, isMobile: true });
  const page = await (await browser.newContext(ctxOpts)).newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    let s = 7; const gen = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    Math.random = gen;
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const solo = opt('solo', '');
  await page.evaluate(({ room, solo }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.name === 'Grapple & Zip');
    G.manual = true;
    G.cpuOn = solo === '' ? [true, true] : solo === 'none' ? [false, false] : solo === '0' ? [false, true] : [true, false];
    P.loadLevel(i);
    for (let k = 0; k < room; k++) P.nextRoom();
    window.__simT = 0;
  }, { room, solo });
  for (const t of times) {
    await page.evaluate(t => {
      const P = window.__pipbo, G = P.G;
      while (window.__simT < t && G.mode === 'play') { P.step(P.DT); window.__simT += P.DT; }
    }, t);
    await page.waitForTimeout(120);
    const info = await page.evaluate(() => { const G = window.__pipbo.G, st = G.mst; return { mode: G.mode, room: G.room, hop: st.hop && st.hop.i, phase: st.hop && st.hop.phase, t: G.time.toFixed(1) }; });
    const f = path.join(out, `grapple-${w}x${h}-r${room}-t${t}.png`);
    await page.screenshot({ path: f });
    console.log(f, JSON.stringify(info));
  }
  if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
