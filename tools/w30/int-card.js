#!/usr/bin/env node
// What moves while the room card holds (3.4 s -> 0.6 s)? For each era: st.ph, players, cam, thief right after setup
// vs at the first live tick after a real card (the era agents mostly tested with the card skipped).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const out = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test, res = {};
    G.manual = true; G.cpuOn = [true, true];
    const flat = (o, pre, acc, d = 0) => { if (d > 3 || o == null) return acc; for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') acc[pre + k] = v; else if (v && typeof v === 'object' && !ArrayBuffer.isView(v) && (!Array.isArray(v) || v.length <= 6)) flat(v, pre + k + '.', acc, d + 1); } return acc; };
    const snap = st => flat({ ph: st.ph, cam: st.cam, thief: { x: st.thief.x, y: st.thief.y, pose: st.thief.pose, item: st.thief.item }, p0: { x: G.players[0].x + st.cam.x, y: G.players[0].y + st.cam.y }, p1: { x: G.players[1].x + st.cam.x, y: G.players[1].y + st.cam.y }, phT: st.phT, stats: st.stats[st.phase], bumps: st.stats.bumps, team: st.stats.team }, '', {});
    for (let k = 0; k < 10; k++) {
      const st = TT.jump(k, { intro: true, seed: 5 });
      const a = snap(st); let n = 0;
      while (G.introT > 0.6 && n < 600) { P.step(P.DT); n++; }
      const b = snap(st), d = [];
      for (const key of Object.keys(b)) if (a[key] !== b[key]) { const x = a[key], y = b[key]; if (typeof y === 'number' && typeof x === 'number' && Math.abs(y - x) < 0.5) continue; d.push(key + ': ' + (typeof x === 'number' ? +x.toFixed(1) : x) + ' -> ' + (typeof y === 'number' ? +y.toFixed(1) : y)); }
      res[st.phase] = { steps: n, d };
    }
    return res;
  });
  for (const k of Object.keys(out)) console.log('== ' + k + ' (' + out[k].steps + ' ticks of card)\n   ' + out[k].d.join('\n   '));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
