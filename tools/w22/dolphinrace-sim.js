#!/usr/bin/env node
// 22-4 Dolphin Race: computer vs computer matches with per-round detail (round times, reasons, stats).
//   node tools/w22/dolphinrace-sim.js [--skills=hard,easy] [--seeds=1,2,3] [--course=reef] [--trace=1] [--nohelp=1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const skills = opt('skills', 'hard,hard').split(','), seeds = opt('seeds', '1').split(',').map(Number);
const course = opt('course', null), trace = +opt('trace', 0), nohelp = !!+opt('nohelp', 0);
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
  const tot = { w: [0, 0] }, rt = [];
  for (const seed of seeds) {
    const r = await page.evaluate(({ seed, skills, course, trace, nohelp }) => {
      const P = window.__pipbo, G = P.G;
      window.__seed(seed * 7919);
      G.manual = true;
      P.CPU.skillOf = skills.slice();
      P.MODES.dolphinrace.testCourse = course; P.MODES.dolphinrace.testNoHelp = nohelp;
      G.cpuOn = [true, true];
      P.loadLevel(P.LEVELS.findIndex(l => l.name === 'Dolphin Race'));
      G.cpuOn = [true, true];
      G.introT = 0;
      const rounds = [], lines = [];
      let lastPh = null, n = 0;
      while (G.mode === 'play' && n < 120 * 900) {
        P.step(P.DT); n++;
        const m = G.match, st = G.mst;
        if (trace && m.phase === 'live' && n % Math.round(trace / P.DT) === 0) lines.push(`r${m.round} ${st.rt.toFixed(1)}s ` + st.pl.map(q => `${['P', 'B'][q.k]} x${Math.round(q.x)} y${Math.round(q.y)} sp${Math.round(q.sp)}${q.air ? ' AIR' : ''}${q.tail ? ' TAIL' : ''}`).join(' | '));
        if (m.phase === 'end' && lastPh !== 'end') {
          rounds.push({ r: m.round, course: st.course.key, len: st.course.len, t: +st.rt.toFixed(1), end: m.end.winner + ':' + m.end.reason,
            x: st.pl.map(q => Math.round(q.x)), pull: st.pl.map(q => Math.round(q.pulled)), hoops: st.course.hoops.length });
        }
        lastPh = m.phase;
      }
      const s = G.mst.stat;
      return { wins: G.match.wins, rounds, stat: { hoops: s.hoops, bumps: s.bumps, flips: s.flips, starts: s.starts, best: s.best.map(Math.round), tail: s.tail.map(v => +v.toFixed(1)), bonks: s.bonks }, simT: Math.round(n * P.DT), lines };
    }, { seed, skills, course, trace, nohelp });
    if (r.lines.length) console.log(r.lines.join('\n'));
    console.log(`seed ${seed}: ${r.wins.join('-')}  sim ${r.simT}s  ${JSON.stringify(r.stat)}`);
    for (const x of r.rounds) { console.log(`   r${x.r} ${x.course} len ${x.len} (${x.hoops} hoops): ${x.t}s  ${x.end}  x ${x.x.join('/')} pulled ${x.pull.join('/')}`); rt.push(x.t); }
    tot.w[r.wins[0] > r.wins[1] ? 0 : 1]++;
  }
  console.log(`matches: Pip ${tot.w[0]}  Bo ${tot.w[1]}   (${skills.join(' vs ')})  rounds ${Math.min(...rt)}-${Math.max(...rt)} s, avg ${(rt.reduce((a, b) => a + b, 0) / rt.length).toFixed(1)}`);
  console.log(errors.length ? 'ERRORS\n' + errors.slice(0, 5).join('\n') : 'no page errors');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
