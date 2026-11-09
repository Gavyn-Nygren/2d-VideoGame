#!/usr/bin/env node
// 24-2 Jack-in-the-Box Launch, 1-player mode: the person (Pip, then Bo) presses nothing; the computer (normal idle stop)
// must not climb alone, and the clock stops ("Taking a break"). Then the computer with a person who plays like the
// computer brain clears. Usage: node tools/w24/jackbox-solo.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const human of [0, 1]) {
    const page = await b.newPage(); const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
    await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
    const r = await page.evaluate(human => {
      const P = window.__pipbo, G = P.G;
      P.CPU.cfg.players = 1; P.CPU.cfg.human = human; P.cpuApplyCfg(); G.manual = true;
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Jack-in-the-Box Launch'));
      for (let i = 0; i < 300 * 120; i++) P.step(P.DT);
      const idle = { mode: G.mode, room: G.room, phase: G.mst.phase, time: Math.round(G.time), waiting: G.mst.waiting };
      return idle;
    }, human);
    const ok = r.mode === 'play' && r.room === 0 && r.time < 40 && !errors.length;
    if (!ok) bad++;
    console.log((ok ? 'ok   ' : 'BAD  ') + 'person ' + ['Pip', 'Bo'][human] + ' idle 300 s: ' + JSON.stringify(r) + (errors.length ? ' ERR ' + errors[0] : ''));
    await page.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
