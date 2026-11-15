#!/usr/bin/env node
// 6-2 Tug of War balance check: Pip is a scripted person, Bo is the computer at --skill. Plays whole matches and counts wins.
//   node tools/w6/tug-check.js [--skill=normal] [--seeds=1..8] [--style=perfect,perfectMash,good,mash,sloppy]
// styles: perfect      one press per BOOM, dead on the beat, no mashing (Gavyn's "all perfects")
//         perfectMash  dead on the beat and mashing 6 presses/s between beats
//         good         one press per BOOM, timing spread 0.05 s (a good player)
//         sloppy       one press per BOOM, timing spread 0.10 s
//         mash         mashing 9 presses/s, no timing at all
//         kid          mashing 5 presses/s and trying every BOOM with a timing spread of 0.12 s
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const skill = opt('skill', 'normal');
const sArg = opt('seeds', '1..8'), seeds = sArg.includes('..') ? (([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i))(sArg.split('..').map(Number)) : sArg.split(',').map(Number);
const styles = opt('style', 'perfect,perfectMash,good,sloppy,kid,mash').split(',');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let seeded = gen(1); const other = gen(12345);
    window.__inStep = false; window.__seed = n => { seeded = gen((n >>> 0) || 1); };
    Math.random = () => (window.__inStep ? seeded() : other());
  });
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const style of styles) {
    const tally = { pip: 0, bo: 0, draw: 0, rounds: [0, 0], perfect: 0, heaves: 0 };
    for (const seed of seeds) {
      const r = await page.evaluate(({ style, skill, seed }) => {
        const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.name === 'Tug of War');
        window.__seed(seed * 7919); window.__inStep = true;
        G.manual = true; P.CPU.skillOf = ['normal', skill]; P.CPU.errs.clear(); G.cpuOn = [false, true];
        delete G.results[i]; P.loadLevel(i); window.__inStep = false;
        const pip = G.players[0], spread = { perfect: 0, perfectMash: 0, good: 0.05, sloppy: 0.1, mash: 0, kid: 0.12 }[style];
        const mash = { perfectMash: 6, mash: 9, kid: 5 }[style] || 0;
        const S = { id: -1, at: null, next: 0, t: -1 };
        const g = () => (Math.random() + Math.random() + Math.random() - 1.5) * 2;
        let n = 0;
        while (n < 60 / P.DT * 8 && G.mode === 'play') {
          window.__inStep = true;
          for (const k in pip.input) pip.input[k] = false;
          const st = G.mst, m = G.match;
          if (st && st.beat && m && m.phase === 'live' && st.hold[0]) {
            const b = st.beat, t = st.t;
            if (t < S.t) { S.id = -1; S.next = 0; }
            S.t = t;
            if (S.id !== b.id) { S.id = b.id; S.at = style === 'mash' ? null : b.next + Math.max(-0.2, Math.min(0.18, g() * spread)); }
            let press = false;
            if (S.at != null && st.used[0] !== b.id && t >= S.at) { press = true; S.at = null; }
            else if (mash && t >= S.next && !(S.at != null && t >= b.next - (b.wE != null ? b.wE : st.K.winE) - 0.02)) press = true;
            if (press) { pip.pendingAct = true; if (mash) S.next = t + 1 / mash; }
          }
          P.step(P.DT); window.__inStep = false; n++;
        }
        const res = G.results[i];
        return res ? { winner: res.winner, rounds: res.rounds, stats: res.stats } : { winner: null };
      }, { style, skill, seed });
      if (r.winner === 0) tally.pip++; else if (r.winner === 1) tally.bo++; else tally.draw++;
      if (r.rounds) { tally.rounds[0] += r.rounds[0]; tally.rounds[1] += r.rounds[1]; }
      if (process.env.STATS) console.log(seed, JSON.stringify(r.stats));
    }
    console.log(`${style.padEnd(12)} vs ${skill.padEnd(6)}: Pip ${tally.pip}  Bo ${tally.bo}  draw ${tally.draw}   rounds ${tally.rounds.join('-')}`);
  }
  if (errors.length) console.log('PAGE ERRORS', errors.slice(0, 3));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
