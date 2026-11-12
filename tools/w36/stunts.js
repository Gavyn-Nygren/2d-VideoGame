#!/usr/bin/env node
// 36-4 Stunt Show Showdown: each stunt alone, many times, at each Opponent skill.
//   node tools/w36/stunts.js [--n=20] [--stunts=0,1,2,3,4] [--skills=easy,normal,hard]
// Prints, per stunt and skill, the totals (min / median / max of 30), the bail rate and the mean of each judge, so the
// spreads of neighbouring skills can be compared (they should overlap a little, so matches are not foregone). Both
// players are the computer at the same skill (two samples per round), gold help off.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const N = +opt('n', 20), stunts = opt('stunts', '0,1,2,3,4').split(',').map(Number), skills = opt('skills', 'easy,normal,hard').split(',');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const si of stunts) for (const sk of skills) {
    const r = await page.evaluate(({ si, sk, N }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'stuntshow'), M = P.MODES.stuntshow;
      M.testStunt = si; M.testNoHelp = true;
      const tots = [], js = [[], [], []]; let bails = 0, timeouts = 0;
      for (let k = 0; k < Math.ceil(N / 2); k++) {
        G.manual = true; G.cpuOn = [true, true]; P.CPU.skillOf = [sk, sk];
        P.loadLevel(i);
        let n = 0;
        while (n < 60 / P.DT && G.mode === 'play' && !(G.match && G.match.phase === 'end')) { P.step(P.DT); n++; }
        for (const Pl of G.mst.pl || []) {
          if (!Pl.sc) { timeouts++; continue; }
          tots.push(Pl.sc.tot); js[0].push(Pl.sc.n); js[1].push(Pl.sc.s); js[2].push(Pl.sc.f); if (Pl.bail) bails++;
          if (Pl.sc.label === 'Out of time!') timeouts++;
        }
      }
      M.testStunt = null; M.testNoHelp = false;
      tots.sort((a, b) => a - b);
      const mean = a => (a.reduce((s, x) => s + x, 0) / Math.max(1, a.length)).toFixed(1);
      return { min: tots[0], med: tots[Math.floor(tots.length / 2)], max: tots[tots.length - 1], bails, timeouts, n: tots.length, j: js.map(mean), all: tots.join(' ') };
    }, { si, sk, N });
    console.log(`stunt ${si} ${sk.padEnd(6)} total ${r.min}/${r.med}/${r.max}  judges ${r.j.join(' ')}  bails ${r.bails}/${r.n}  timeouts ${r.timeouts}   [${r.all}]`);
  }
  if (errs.length) console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
