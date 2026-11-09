#!/usr/bin/env node
// 23-4 Pie-Eating Contest: computer vs computer matches with per-round detail (round times, reasons, gulps, hiccups).
//   node tools/w23/pieeat-sim.js [--skills=hard,easy] [--seeds=1,2,3] [--round=3] [--nohelp=1] [--v=1]
// Prints each match and a summary line: wins per side, round time range and average, GULP!s / Glugs / hiccups per side.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const skills = opt('skills', 'hard,hard').split(','), seeds = opt('seeds', '1').split(',').map(Number);
const round = +opt('round', 0), nohelp = !!+opt('nohelp', 0), verbose = +opt('v', 0);
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
  const tot = { w: [0, 0, 0] }, rt = [], agg = { perfect: [0, 0], glugs: [0, 0], hics: [0, 0], full: [0, 0], rounds: [0, 0] };
  for (const seed of seeds) {
    const r = await page.evaluate(({ seed, skills, round, nohelp }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      G.manual = true;
      P.CPU.skillOf = skills.slice();
      P.MODES.pieeat.testRound = round; P.MODES.pieeat.testNoHelp = nohelp;
      G.cpuOn = [true, true];
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Pie-Eating Contest'));
      G.cpuOn = [true, true];
      G.introT = 0;
      const rounds = [];
      let lastPh = null, n = 0;
      while (G.mode === 'play' && n < 120 * 900) {
        P.step(P.DT); n++;
        const m = G.match, st = G.mst;
        if (m.phase === 'end' && lastPh !== 'end') {
          rounds.push({ r: m.round, name: st.R.name, t: +st.rt.toFixed(1), end: m.end.winner + ':' + m.end.reason,
            eaten: st.pl.map(E => E.eaten + '/' + st.goal), gold: st.pl.map(E => E.gold) });
        }
        lastPh = m.phase;
      }
      const s = G.mst.stat;
      return { wins: G.match.wins, rounds, stat: { perfect: s.perfect, glugs: s.glugs, hics: s.hics, full: s.full, bonus: s.bonus, streak: s.bestStreak }, simT: Math.round(n * P.DT), res: G.results[G.levelIndex] && G.results[G.levelIndex].stats };
    }, { seed, skills, round, nohelp });
    console.log(`seed ${seed}: ${r.wins.join('-')}  sim ${r.simT}s  ${JSON.stringify(r.stat)}`);
    for (const x of r.rounds) { if (verbose) console.log(`   r${x.r} ${x.name}: ${x.t}s  ${x.end}  eaten ${x.eaten.join(' / ')}${x.gold.some(Boolean) ? ' gold ' + x.gold.join('/') : ''}`); if (!x.end.startsWith('-1')) rt.push(x.t); }
    if (verbose && r.res) console.log('   results: ' + JSON.stringify(r.res));
    tot.w[r.wins[0] > r.wins[1] ? 0 : r.wins[1] > r.wins[0] ? 1 : 2]++;
    for (const k of ['perfect', 'glugs', 'hics', 'full']) for (const i of [0, 1]) agg[k][i] += r.stat[k][i];
    for (const i of [0, 1]) agg.rounds[i] += r.wins[i];
  }
  const avg = rt.length ? (rt.reduce((a, b) => a + b, 0) / rt.length).toFixed(1) : '-';
  console.log(`matches: Pip ${tot.w[0]}  Bo ${tot.w[1]}  draw ${tot.w[2]}  (${skills.join(' vs ')})  rounds ${agg.rounds.join('-')}, round time ${Math.min(...rt)}-${Math.max(...rt)} s avg ${avg}`);
  console.log(`per side over all matches: GULP! ${agg.perfect.join('/')}  glugs ${agg.glugs.join('/')}  hiccups ${agg.hics.join('/')}  too full ${agg.full.join('/')}`);
  console.log(errors.length ? 'ERRORS\n' + errors.slice(0, 5).join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
