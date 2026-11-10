#!/usr/bin/env node
// 29-4 Throwing Star Duel edge cases: restart (loadLevel) in the middle of every state, the level loaded twice in a row,
// pause / resume mid-rally, a NaN watch on every star and duelist, and a time-up round with nobody pressing.
// Usage: node tools/w29/starduel-edge.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'starduel'), out = [];
    const bad = () => { const st = G.mst; if (!st.pl) return ''; for (const D of st.pl) for (const k of ['x', 'h', 'vy', 'pouch', 'refT']) if (!Number.isFinite(D[k])) return 'duelist ' + k; for (const s of st.stars) if (!Number.isFinite(s.x) || !Number.isFinite(s.v)) return 'star'; return ''; };
    const run = (secs, until) => { for (let k = 0; k < secs * 120 && G.mode === 'play'; k++) { P.step(P.DT); const b = bad(); if (b) return 'NaN ' + b; if (until && until()) return 'hit'; } return G.mode; };
    G.manual = true; P.CPU.skillOf = ['hard', 'hard']; G.cpuOn = [true, true];
    // restart in the middle of: the intro, the countdown, a swing, a dizzy spin, a round-end banner, sudden death
    const states = {
      intro: () => G.introT > 0, count: () => G.match.phase === 'count', swing: () => G.mst.pl && G.mst.pl.some(D => D.swing && D.swing.ok),
      dizzy: () => G.mst.pl && G.mst.pl.some(D => D.dizzy > 0), banner: () => G.match.phase === 'end', round3: () => G.match.round >= 3 && G.match.phase === 'live',
    };
    for (const [name, cond] of Object.entries(states)) {
      P.loadLevel(i); if (name !== 'intro') G.introT = 0;
      const got = name === 'intro' ? 'hit' : run(300, cond);
      P.loadLevel(i); G.introT = 0;   // R
      const st = G.mst, fresh = st.pl.every(D => D.bonks === 0 && D.pouch === 3 && !D.gold) && st.stars.length === 0 && st.stat.throws[0] === 0 && G.match.round === 1 && st.course.name === 'First Bow';
      const after = run(400);
      out.push(name + ': reached ' + got + ', fresh after restart ' + fresh + ', then ' + after + ' round ' + G.match.round + ' ' + G.match.wins.join('-'));
    }
    // pause mid-rally and resume: nothing moves while paused
    P.loadLevel(i); G.introT = 0; run(300, () => G.mst.stars.length >= 2);
    const xs = G.mst.stars.map(s => s.x).join(); P.pause();
    for (let k = 0; k < 60; k++) P.step(P.DT);
    const still = G.mst.stars.map(s => s.x).join() === xs; P.resume(); const after = run(400);
    out.push('pause: stars frozen ' + still + ', then ' + after);
    // nobody presses: every round goes to time and is replayed, sudden death, then the match is called a draw
    G.cpuOn = [false, false]; P.loadLevel(i); G.introT = 0;
    out.push('idle pair: ' + run(900) + ' history ' + G.match.history.map(h => h.reason).join(' | '));
    P.CPU.skillOf = [null, null];
    return out;
  });
  console.log(r.join('\n'));
  console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
