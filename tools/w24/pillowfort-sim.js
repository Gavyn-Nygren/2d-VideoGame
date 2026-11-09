#!/usr/bin/env node
// 24-4 Pillow Fort Battle: computer vs computer matches with per-round detail (round times, reasons, stats).
//   node tools/w24/pillowfort-sim.js [--skills=hard,easy] [--seeds=1,2,3] [--round=towers] [--nohelp=1] [--quiet=1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const skills = opt('skills', 'hard,hard').split(','), seeds = opt('seeds', '1').split(',').map(Number);
const round = opt('round', null), nohelp = !!+opt('nohelp', 0), quiet = !!+opt('quiet', 0);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); window.__seed = n => { seeded = gen((n >>> 0) || 1); }; Math.random = () => seeded();
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const tot = { w: [0, 0], draw: 0 }, rt = [], reasons = {};
  for (const seed of seeds) {
    const r = await page.evaluate(({ seed, skills, round, nohelp }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      G.manual = true;
      P.CPU.skillOf = skills.slice();
      P.MODES.pillowfort.testRound = round; P.MODES.pillowfort.testNoHelp = nohelp;
      G.cpuOn = [true, true];
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pillow Fort Battle'));
      G.cpuOn = [true, true];
      G.introT = 0;
      const rounds = [];
      let lastPh = null, n = 0;
      while (G.mode === 'play' && n < 120 * 900) {
        P.step(P.DT); n++;
        const m = G.match, st = G.mst;
        if (m.phase === 'end' && lastPh !== 'end') {
          const cnt = k => st.fort[k].reduce((a, c) => a + c.length, 0);
          rounds.push({ r: m.round, key: st.key, t: +st.rt.toFixed(1), end: m.end.winner + ':' + m.end.reason, blocks: [cnt(0), cnt(1)], wob: st.ted.map(t => t.wob), gold: st.gold.slice() });
        }
        lastPh = m.phase;
      }
      const s = G.mst.stat;
      return { wins: G.match ? G.match.wins : [0, 0], mode: G.mode, rounds, stat: { hits: s.hits, knocked: s.knocked, built: s.built, fwumps: s.fwumps, throws: s.throws, wob: s.wobbles, direct: s.direct, topples: s.topples }, simT: Math.round(n * P.DT) };
    }, { seed, skills, round, nohelp });
    console.log(`seed ${seed}: ${r.wins.join('-')}  sim ${r.simT}s  ${JSON.stringify(r.stat)}`);
    for (const x of r.rounds) {
      if (!quiet) console.log(`   r${x.r} ${x.key}: ${x.t}s  ${x.end}  blocks ${x.blocks.join('/')} wob ${x.wob.join('/')}${x.gold[0] || x.gold[1] ? ' gold ' + x.gold.join('/') : ''}`);
      rt.push(x.t); const rk = x.end.replace(/\(.*\)/, '').replace(/^\d+:|^-1:/, ''); reasons[rk] = (reasons[rk] || 0) + 1;
    }
    if (r.wins[0] === r.wins[1]) tot.draw++; else tot.w[r.wins[0] > r.wins[1] ? 0 : 1]++;
  }
  console.log(`matches: Pip ${tot.w[0]}  Bo ${tot.w[1]}  draws ${tot.draw}  (${skills.join(' vs ')})  rounds ${Math.min(...rt)}-${Math.max(...rt)} s, avg ${(rt.reduce((a, b) => a + b, 0) / rt.length).toFixed(1)}`);
  console.log('round ends: ' + JSON.stringify(reasons));
  console.log(errors.length ? 'ERRORS\n' + errors.slice(0, 5).join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
