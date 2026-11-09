#!/usr/bin/env node
// 22-4 Dolphin Race: 1-player mode through the real settings (Players 1, You play Pip / Bo, Opponent Easy / Normal /
// Hard) with a person who presses nothing: the computer must race on (noIdleStop) and every match must end.
//   node tools/w22/dolphinrace-solo.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const human of [0, 1]) for (const skill of ['easy', 'normal', 'hard']) {
    const r = await page.evaluate(({ human, skill }) => {
      const P = window.__pipbo, G = P.G;
      G.manual = true;
      P.cpuSetCfg('players', 1); P.cpuSetCfg('human', human); P.cpuSetCfg('skill', skill);
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Dolphin Race'));
      G.introT = 0;
      let n = 0; while (G.mode === 'play' && n++ < 120 * 600) P.step(P.DT);
      return { cpuOn: G.cpuOn.slice(), done: G.mode !== 'play', wins: G.match.wins.slice(), secs: Math.round(n * P.DT) };
    }, { human, skill });
    console.log(`you play ${['Pip', 'Bo'][human]}, opponent ${skill}: cpuOn ${r.cpuOn} ended=${r.done} ${r.wins.join('-')} in ${r.secs} s`);
  }
  console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
