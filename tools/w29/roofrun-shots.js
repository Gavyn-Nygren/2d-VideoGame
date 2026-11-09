#!/usr/bin/env node
// Screenshots of 29-1 Rooftop Moonlight Run played by a computer pair:
//   node tools/w29/roofrun-shots.js <t1,t2,...> [--person=0|1] [--w=1100 --h=640] [--tag=x] [--noisy=0|1] [--end]
// --person=N draws the picture as 1-player mode with N as the person (their prompts show), while the computer still
// presses both players' buttons, so every beat of the level can be looked at. --noisy=N makes player N clumsy (as in
// tools/cpu-test.js --who=noisy). --end plays on to the results card.
// Writes build/w29/roofrun-<tag><t>.png and prints the level's stats at each time.
'use strict';
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const args = process.argv.slice(2), times = (args.find(a => !a.startsWith('--')) || '3,10').split(',').map(Number);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: +opt('w', 1100), height: +opt('h', 640) } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => { let s = 7919; Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = path.resolve(__dirname, '../../build/w29'); fs.mkdirSync(out, { recursive: true });
  const person = opt('person', ''), tag = opt('tag', '');
  await page.evaluate(noisy => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'roofrun');
    G.manual = true; G.cpuOn = [true, true];
    if (noisy !== '') {
      const nz = { pause: 0, next: 3 + Math.random() * 6, wander: 0, wdir: 0, wnext: 6 + Math.random() * 8 }, who = +noisy;
      P.CPU.filter = (p, o, dt) => {
        if (p.id !== who) return o;
        if (nz.pause > 0) { nz.pause -= dt; return {}; }
        nz.next -= dt; if (nz.next <= 0) { nz.pause = 1 + Math.random() * 3; nz.next = 4 + Math.random() * 8; }
        nz.wnext -= dt; if (nz.wnext <= 0) { nz.wander = 0.4 + Math.random(); nz.wdir = Math.random() < 0.5 ? -1 : 1; nz.wnext = 6 + Math.random() * 10; }
        if (nz.wander > 0) { nz.wander -= dt; return { left: nz.wdir < 0, right: nz.wdir > 0 }; }
        if (Math.random() < 0.15 * dt) o.jump = true;
        if (Math.random() < 0.1 * dt) o.act = true;
        return o;
      };
    }
    P.loadLevel(i);
  }, opt('noisy', ''));
  let t = 0;
  const shot = async name => {
    if (person !== '') await page.evaluate(n => { window.__pipbo.G.cpuOn = [n !== 0, n !== 1]; }, +person);
    await page.waitForTimeout(120);
    await page.screenshot({ path: path.join(out, 'roofrun-' + tag + name + '.png') });
    await page.evaluate(() => { window.__pipbo.G.cpuOn = [true, true]; });
  };
  for (const tt of times) {
    const info = await page.evaluate(n => {
      const P = window.__pipbo, G = P.G;
      for (let k = 0; k < n && G.mode === 'play'; k++) P.step(P.DT);
      const st = G.mst;
      return { mode: G.mode, room: G.room, time: Math.round(G.time), gi: st.gi, states: st.run && st.run.map(r => r.st), stars: st.stars + '/' + st.totalStars, stats: st.stats };
    }, Math.round((tt - t) * 120));
    t = tt;
    await shot(String(tt));
    console.log(tt, JSON.stringify(info));
  }
  if (args.includes('--pause')) {
    await page.evaluate(() => { window.__pipbo.G.manual = false; window.__pipbo.pause(); });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(out, 'roofrun-' + tag + 'pause.png') });
    await page.evaluate(() => { window.__pipbo.G.manual = true; window.__pipbo.pause(); });
  }
  if (args.includes('--end')) {
    await page.evaluate(() => { const P = window.__pipbo, G = P.G; for (let k = 0; k < 120 * 600 && G.mode === 'play'; k++) P.step(P.DT); });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(out, 'roofrun-' + tag + 'end.png') });
  }
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
