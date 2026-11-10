#!/usr/bin/env node
// Runaway Rickshaw: where things sit on screen over a computer-pair run (rider height, kite height, lowest near-lane
// thing on the right half), per stretch, to check the camera framing.  node tools/w29/rickshaw-frame.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, M = P.MODES.rickshaw, i = P.LEVELS.findIndex(l => l.mode === 'rickshaw');
    G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i);
    const rows = [];
    let n = 0;
    while (G.mode === 'play' && n < 120 * 400) {
      P.step(P.DT); n++;
      const st = G.mst; if (!st.c || st.state !== 'go') continue;
      const R = rows[G.room] || (rows[G.room] = { riderMin: 999, riderMax: 0, kiteMin: 999, kiteRiderGapMin: 999, nearRightMax: 0, rkMax: 0 });
      const rp = M.riderPt(st), ry = rp.y - st.cam.y;
      R.riderMin = Math.min(R.riderMin, ry); R.riderMax = Math.max(R.riderMax, ry);
      R.rkMax = Math.max(R.rkMax, st.rk.x - st.cam.x);
      for (const th of st.c.throws) if (th.dir === 'k' && (th.st === 'warn' || (th.st === 'thrown' && th.t < 0.6))) {
        R.kiteMin = Math.min(R.kiteMin, th.y - 54 - st.cam.y);
        if (Math.abs(th.x - st.rk.x) < 70 && !st.rk.air) R.kiteRiderGapMin = Math.min(R.kiteRiderGapMin, (rp.y - 40) - (th.y + 24));
      }
      const xr = st.cam.x + 640; R.nearRightMax = Math.max(R.nearRightMax, M.gy(st.c, xr) + 52 - st.cam.y);
    }
    return rows.map(o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)])));
  });
  console.log(JSON.stringify(r, null, 0));
  await browser.close();
})();
