#!/usr/bin/env node
// Runaway Rickshaw: a computer pair plays the level and prints each stretch's time, speed and stats.
// node tools/w29/rickshaw-run.js [--solo=0|1] [--skip=steer|ride]   (--skip: that job's presses are dropped, to see what a missing partner costs)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = await page.evaluate(({ skip }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'rickshaw');
    G.manual = true; G.cpuOn = [true, true];
    P.CPU.filter = !skip ? null : (p, o) => ((skip === 'steer') === (p.id === G.mst.steer) ? {} : o);
    P.loadLevel(i);
    const rows = []; let room = 0, vSum = 0, n = 0, vMax = 0, steps = 0, frames = 0, ms = 0;
    while (G.mode === 'play' && steps < 120 * 900) {
      P.step(P.DT); steps++;
      const st = G.mst;
      if (st.state === 'go' && G.introT <= 0) { vSum += st.rk.v; n++; vMax = Math.max(vMax, st.rk.v); }
      if (G.room !== room) { rows.push({ room, len: Math.round(st.c.len), vAvg: Math.round(vSum / n), vMax: Math.round(vMax) }); room = G.room; vSum = 0; n = 0; vMax = 0; }
    }
    const st = G.mst;
    return { mode: G.mode, time: G.time.toFixed(1), rows, roomT: st.stats.roomT.map(x => +x.toFixed(1)), stats: st.stats, total: st.totalAll, cards: P.MODES.rickshaw.stats() };
  }, { skip: opt('skip', '') });
  console.log(JSON.stringify(out, null, 1));
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
