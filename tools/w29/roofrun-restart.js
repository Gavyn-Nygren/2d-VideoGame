#!/usr/bin/env node
// 29-1 Rooftop Moonlight Run: restart (loadLevel again), "next room" and pause in the middle of every beat, then the
// computer pair plays on; each run must clear with no page errors. Usage: node tools/w29/roofrun-restart.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'roofrun'), out = [];
    G.manual = true; G.cpuOn = [true, true]; P.CPU.filter = null;
    const run = s => { for (let n = 0; n < s * 120 && G.mode === 'play'; n++) P.step(P.DT); };
    const states = () => G.mst.run.map(q => q.st).join('/') + ' hook ' + G.mst.hook.state;
    for (const t of [3, 6.2, 7.4, 8.1, 9.3, 10.4, 31, 45, 70]) for (const how of ['restart', 'next', 'pause', 'twice']) {
      P.loadLevel(i); run(t);
      const at = 'stretch ' + (G.room + 1) + ' ' + states();
      if (how === 'restart') P.loadLevel(i);
      else if (how === 'twice') { P.loadLevel(i); P.loadLevel(i); }
      else if (how === 'next') { if (G.room < 3) P.nextRoom(); }
      else { G.manual = false; P.pause(); P.resume(); G.manual = true; }
      const fresh = how === 'restart' || how === 'twice' ? G.mst.stats.throws === 0 && G.mst.stars === 0 && G.room === 0 : true;
      run(400);
      out.push(how.padEnd(7) + ' at ' + String(t).padEnd(4) + ' (' + at + '): ' + (G.mode === 'play' ? 'NOT CLEAR ' + states() : 'clear ' + Math.round(G.time) + 's') + (fresh ? '' : ' NOT FRESH'));
    }
    return out;
  });
  console.log(r.join('\n'));
  console.log(errs.length ? 'ERRORS ' + errs.slice(0, 5).join(' | ') : 'no page errors');
  await browser.close();
})();
