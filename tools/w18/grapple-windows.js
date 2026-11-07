#!/usr/bin/env node
// 18-2 Grapple & Zip: how forgiving is each throw? For every hop it tries throws at many angles and powers (with the
// level's own hook rules, MODES.grapple.test.hookMove) at a few moments, and prints the best angle's catch window as
// power and as milliseconds of the meter, plus how many angles catch at all, for normal, gold and super gold rings.
// Usage: node tools/w18/grapple-windows.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERR', String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, M = P.MODES.grapple, GR = M.GRAPPLE, T = M.test;
    const i = P.LEVELS.findIndex(l => l.name === 'Grapple & Zip');
    G.manual = true; G.cpuOn = [true, true];
    P.loadLevel(i);
    const lines = [];
    const sim = (m, hop, ang, pow, t0) => {
      const from = m.ships[hop.from], h = T.hand(from, t0), a = ang * Math.PI / 180, v = GR.vMin + pow * (GR.vMax - GR.vMin);
      const hk = { x: h.x, y: h.y, vx: v * Math.cos(a), vy: -v * Math.sin(a), t: 0, near: 1e9 };
      const dt = 1 / 120;
      for (let j = 1; j < 420; j++) { const tt = t0 + j * dt; hk.t += dt; let hit = null; for (let s = 0; s < 2 && !hit; s++) hit = T.hookMove(m, hop, hk, tt - dt + dt * (s + 1) / 2, dt / 2); if (hit) return hit; }
      return 'far';
    };
    const tests = [['normal', 0], ['gold', 1], ['super', 2]];
    for (let room = 0; room < 4; room++) {
      if (room) P.nextRoom();
      const m = G.mst;
      for (let h = 0; h < m.hopN; h++) {
        grappleStartHop(m, h);
        const hop = m.hop, row = [];
        for (const [name, gold] of tests) {
          hop.gold = gold;
          let bestW = 0, bestA = 0, angles = 0, sumW = 0, n = 0; const at = { 15: 0, 30: 0, 45: 0, 60: 0 };
          for (const t0 of [0.3, 1.1, 1.9, 2.7, 3.5, 4.3]) {
            let ok = 0, bw = 0, ba = 0;
            for (let ang = -10; ang <= 78; ang += 1) {
              let run = 0, best = 0;
              for (let pw = 0.08; pw <= 1.0001; pw += 0.005) { if (sim(m, hop, ang, pw, t0) === 'ring') { run++; best = Math.max(best, run); } else run = 0; }
              if (best) ok++;
              if (at[ang] != null) at[ang] += best * 0.005 / 6;
              if (best > bw) { bw = best; ba = ang; }
            }
            sumW += bw; n++; angles += ok;
            if (bw > bestW) { bestW = bw; bestA = ba; }
          }
          const avgW = sumW / n * 0.005;
          row.push(name + ': best ' + (bestW * 0.005).toFixed(3) + ' pow @' + bestA + '° avg ' + avgW.toFixed(3) + ' (' + Math.round(avgW * GR.powPeriod * [1, GR.goldSlow, GR.superSlow][gold] / 2 * 1000) + ' ms) angles ' + (angles / n).toFixed(1) + ' at15/30/45/60 ' + Object.values(at).map(w => Math.round(w * GR.powPeriod * [1, GR.goldSlow, GR.superSlow][gold] / 2 * 1000)).join('/') + 'ms');
        }
        hop.gold = 0;
        lines.push('fleet ' + (room + 1) + ' hop ' + (h + 1) + ' ' + m.ships[h + 1].name + ' | ' + row.join(' | '));
      }
    }
    return lines;
  });
  console.log(out.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
