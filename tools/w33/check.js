#!/usr/bin/env node
// World 33 review checks for a computer pair: node tools/w33/check.js [modes] [--seeds=1,2,3] [--max=600]
// For each team level and seed it prints how it ended, the time, the level's end stats (to check that Gold is possible
// and every collectable can be reached), and the most held-key flips in any one second for each computer player
// (12 or more is a twitch: the plan depends on something the computer's own move changes).
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const modes = (args.find(a => !a.startsWith('--')) || 'tornadorun,floodclimb,whiteout').split(',');
const seeds = opt('seeds', '1,2,3').split(',').map(Number), maxT = +opt('max', 600);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); else if (args.includes('--logs')) console.log('   log: ' + m.text()); });
  if (args.includes('--logs')) await page.addInitScript(() => { window.__w33log = true; });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let r = gen(1); window.__seed = n => { r = gen((n >>> 0) || 1); }; Math.random = () => r();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  for (const mode of modes) for (const seed of seeds) {
    errs.length = 0;
    const r = await page.evaluate(async ({ mode, seed, maxT }) => {
      const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === mode);
      window.__seed(seed * 7919);
      G.manual = true; G.cpuOn = [true, true]; P.CPU.skillOf = ['normal', 'normal'];
      delete G.results[i];
      P.loadLevel(i);
      const flips = [[], []], last = [null, null];
      let n = 0; const steps = Math.round(maxT / P.DT);
      while (n < steps && G.mode === 'play') {
        for (let k = 0; k < 240 && G.mode === 'play'; k++, n++) {
          P.step(P.DT);
          for (const p of G.players) {
            const i2 = p.input, key = [i2.left, i2.right, i2.down, i2.jump, i2.act].map(Number).join('');
            if (last[p.id] !== null && key !== last[p.id]) flips[p.id].push(n * P.DT);
            last[p.id] = key;
          }
        }
        await new Promise(r => setTimeout(r, 0));
      }
      // the most flips inside any 1 s window
      const worst = fl => { let b = 0, j = 0, at = 0; for (let k = 0; k < fl.length; k++) { while (fl[k] - fl[j] > 1) j++; if (k - j + 1 > b) { b = k - j + 1; at = fl[j]; } } return b + (b >= 12 ? ' (at ' + at.toFixed(1) + 's)' : ''); };
      const res = G.results[i];
      let stats = '';
      try { stats = (P.MODES[mode].stats() || []).map(s => (typeof s === 'string' ? s : s.label + ': ' + (s.value || (s.values || []).join('/')))).join(' | '); } catch (e) { stats = 'ERR ' + e.message; }
      return { done: !!res, time: res ? Math.round(res.time) : null, room: G.room, stats, flips: [worst(flips[0]), worst(flips[1])], raw: JSON.stringify(G.mst.stats || {}) };
    }, { mode, seed, maxT });
    console.log(`${mode.padEnd(10)} s${seed}: ${r.done ? 'CLEARED ' + r.time + 's' : 'NOT done, room ' + (r.room + 1)}  flips/s Pip ${r.flips[0]} Bo ${r.flips[1]}${errs.length ? '  ERR ' + errs[0] : ''}`);
    console.log('   ' + r.stats);
    console.log('   ' + r.raw);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
