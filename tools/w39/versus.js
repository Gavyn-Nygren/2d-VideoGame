#!/usr/bin/env node
// World 39 Gem Rush, computer against computer: node tools/w39/versus.js [--n=40] [--skills=normal,normal] [--seed0=1] [--round=K]
// Plays n matches and prints who won, then the totals of the level's own counters for each side (gem points, cells
// dug, times buried, cave-ins, lifts by the golem's fingers...), to look for a left/right bias and where it comes from.
// --round=K plays only twist K (0-4) in every round. --native uses the browser's own Math.random (no seeds).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const n = +opt('n', 40), skills = opt('skills', 'normal,normal').split(','), seed0 = +opt('seed0', 1), round = opt('round', '');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  if (!args.includes('--native')) await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let r = gen(1); window.__seed = n => { r = gen((n >>> 0) || 1); }; Math.random = () => r();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const tot = { wins: [0, 0], rounds: [0, 0] }, sum = {};
  for (let m = 0; m < n; m++) {
    const r = await page.evaluate(async ({ seed, skills, round }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'gemrush');
      if (window.__seed) window.__seed(seed * 7919);
      G.manual = true; G.cpuOn = [true, true]; P.CPU.skillOf = skills.slice();
      P.MODES.gemrush.testRound = round === '' ? null : +round;
      delete G.results[i]; P.loadLevel(i);
      let k = 0;
      while (G.mode === 'play' && k < 120 * 900) { for (let j = 0; j < 600 && G.mode === 'play'; j++, k++) P.step(P.DT); await new Promise(r => setTimeout(r, 0)); }
      P.MODES.gemrush.testRound = null;
      const st = G.mst;
      return { wins: G.match ? G.match.wins.slice() : null, stat: st.stat };
    }, { seed: seed0 + m, skills, round });
    if (!r.wins) continue;
    tot.wins[r.wins[0] > r.wins[1] ? 0 : 1]++; tot.rounds[0] += r.wins[0]; tot.rounds[1] += r.wins[1];
    for (const k in r.stat) if (Array.isArray(r.stat[k])) { sum[k] = sum[k] || [0, 0]; sum[k][0] += r.stat[k][0]; sum[k][1] += r.stat[k][1]; }
  }
  console.log(`${n} matches ${skills.join(' v ')}${round === '' ? '' : ' (twist ' + round + ' only)'}: Pip ${tot.wins[0]}, Bo ${tot.wins[1]}; rounds ${tot.rounds[0]}-${tot.rounds[1]}`);
  for (const k in sum) console.log('   ' + k.padEnd(8) + sum[k].join(' / '));
  if (errs.length) console.log('ERR', errs[0]);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
