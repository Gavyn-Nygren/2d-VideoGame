#!/usr/bin/env node
// Kite Tandem: one player alone must never finish a stretch. The computer plays one seat with no idle stop, the other
// seat presses nothing (or, with --jumpy=1, a lone runner that runs to the pad and jumps and wiggles there).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const room of [0, 1, 2, 3]) for (const cpu of [0, 1]) {
    const r = await page.evaluate(({ room, cpu }) => {
      const P = window.__pipbo, G = P.G;
      G.manual = true; G.cpuOn = [cpu === 0, cpu === 1]; P.CPU.idleStop = 1e9;
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Kite Tandem'));
      for (let k = 0; k < room; k++) P.nextRoom();
      G.introT = 0;
      for (let n = 0; n < 200 / P.DT && G.mode === 'play' && G.room === room; n++) P.step(P.DT);
      const st = G.mst;
      return { room, cpu, role: st.runner === cpu ? 'runner' : 'rider', advanced: G.room !== room || G.mode !== 'play', rx: st.rx | 0, end: st.c.end.x0, got: st.c.end.got, best: 0 };
    }, { room, cpu });
    console.log(JSON.stringify(r));
  }
  // a lone person who runs to the pad and then jumps and wiggles (the computer rider does nothing at all)
  const r2 = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G;
    G.manual = true; G.cpuOn = [false, false];
    P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Kite Tandem'));
    G.introT = 0;
    const st = G.mst, p = G.players[st.runner];
    let best = 1e9;
    for (let n = 0; n < 200 / P.DT && G.room === 0; n++) {
      const pl = P.MODES.kite.plan(st), e = st.c.end;
      p.input.right = st.rx < e.pad1 - 5 || (n % 240 < 120); p.input.left = st.rx > e.pad0 + 20 && n % 240 >= 120;
      if (pl.jump && pl.jump.dist < 24) p.pendingJump = true;
      if (st.rx > e.pad0 && n % 50 === 0) p.pendingJump = true;
      P.step(P.DT);
      best = Math.min(best, Math.hypot((st.kx - e.flagX - 14) / 1.6, st.ky - e.flagY));
    }
    return { advanced: G.room !== 0, got: G.mst.c.end.got, closest: best | 0 };
  });
  console.log('lone jumpy runner:', JSON.stringify(r2));
  if (errors.length) console.log('ERRORS', errors);
  await browser.close();
})();
