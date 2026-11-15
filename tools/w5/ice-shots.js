#!/usr/bin/env node
// 5-3 Ice Slide screenshots: each room a few seconds in (with the computer pair playing), saved to --out (build/ice-shots).
// Usage: node tools/w5/ice-shots.js [--out=dir] [--at=4] [--rooms=path/to/rooms.js] [--phone]
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const out = path.resolve(opt('out', 'build/ice-shots')), at = +opt('at', 4), phone = args.includes('--phone');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage(phone ? { viewport: { width: 844, height: 390 }, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => console.log('PAGE ERROR', String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  if (opt('rooms')) await page.evaluate(fs.readFileSync(opt('rooms'), 'utf8'));
  const n = await page.evaluate(() => { const P = window.__pipbo; const i = P.LEVELS.findIndex(l => l.name === 'Ice Slide'); if (window.__iceRooms) P.LEVELS[i].rooms = window.__iceRooms; return P.LEVELS[i].rooms.length; });
  for (let room = 0; room < n; room++) {
    await page.evaluate(({ room, at }) => {
      const P = window.__pipbo, G = P.G; const i = P.LEVELS.findIndex(l => l.name === 'Ice Slide');
      G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i);
      for (let k = 0; k < room; k++) P.nextRoom();
      for (let k = 0; k < at * 120 && G.mode === 'play'; k++) P.step(P.DT);
      G.manual = false;
    }, { room, at });
    await page.waitForTimeout(150);
    await page.evaluate(() => { window.__pipbo.G.manual = true; });
    const file = path.join(out, `room${room + 1}${phone ? '-phone' : ''}.png`);
    await page.screenshot({ path: file });
    console.log(file);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
