#!/usr/bin/env node
// 18-4 Plank Duel: no leaks between levels, restart and pause. Loads Plank Duel, plays a bit, loads another versus
// level, comes back, restarts (R) mid-round and pauses (Esc); checks the state is fresh each time and no errors.
//   node tools/w18/plankduel-leak.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const checks = await page.evaluate(async () => {
    const P = window.__pipbo, G = P.G, out = [];
    const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
    const pd = P.LEVELS.findIndex(l => l.name === 'Plank Duel'), vs = P.LEVELS.findIndex(l => l.kind === 'versus' && !l.ownStep && l.match);
    G.manual = true; G.cpuOn = [true, true];
    const run = s => { for (let k = 0; k < Math.round(s / P.DT) && G.mode === 'play'; k++) P.step(P.DT); };
    P.loadLevel(pd); run(25);
    ok(G.mst.d && G.mst.stat.swings[0] + G.mst.stat.swings[1] > 0, 'plank duel plays (swings ' + G.mst.stat.swings + ')');
    P.loadLevel(vs); run(10);
    ok(!G.mst.d && !G.mst.stat?.swings, 'another level has no plank duel state');
    ok(G.players.some(p => p.alive), 'another level shows its players');
    P.loadLevel(pd); run(0.1);
    ok(G.mst.stat.swings[0] + G.mst.stat.swings[1] === 0 && G.match.round === 1 && G.match.wins.join() === '0,0', 'back on plank duel: fresh match');
    run(30);
    // R restart mid-round
    const r0 = G.match.round;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'r', code: 'KeyR' }));
    run(0.05);
    ok(G.match.round === 1 && G.mst.stat.hits.join() === '0,0', 'R restarts the match (was round ' + r0 + ')');
    run(6);
    P.pause();
    const t0 = G.match.timeLeft; run(2);
    ok(G.mode !== 'play' || G.match.timeLeft === t0, 'paused: the clock stops');
    P.resume(); run(1);
    ok(G.mode === 'play' && G.match.timeLeft < t0, 'resumed: the clock runs');
    return out;
  });
  console.log(checks.join('\n'));
  console.log(errors.length ? 'ERRORS ' + errors.join('\n') : 'no page errors');
  await browser.close();
  process.exit(checks.some(c => c.startsWith('FAIL')) || errors.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
