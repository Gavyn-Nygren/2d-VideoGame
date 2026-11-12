#!/usr/bin/env node
// Prints a World 34 level's state every few seconds while a computer pair plays it:
// node tools/w34/trace.js <mode> [--seed=1] [--every=2] [--from=0] [--to=600] [--expr="..."]  (st = G.mst)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const mode = args.find(a => !a.startsWith('--')) || 'serpentchase';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  page.on('pageerror', e => console.log('ERR ' + e)); page.on('console', m => { if (m.type() === 'error') console.log('ERR ' + m.text()); });
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let r = gen(1); window.__seed = n => { r = gen((n >>> 0) || 1); }; Math.random = () => r();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const lines = await page.evaluate(({ mode, seed, every, from, to, expr }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === mode), out = [];
    window.__seed(seed * 7919);
    G.manual = true; G.cpuOn = [true, true]; P.CPU.skillOf = ['normal', 'normal'];
    P.loadLevel(i);
    const n = Math.round(to / P.DT), k = Math.round(every / P.DT);
    for (let s = 0; s < n && G.mode === 'play'; s++) {
      P.step(P.DT);
      const t = s * P.DT;
      if (t >= from && s % k === 0) { const st = G.mst; let x; try { x = JSON.stringify(eval(expr)); } catch (e) { x = 'ERR ' + e.message; } out.push('t=' + t.toFixed(1) + ' room ' + G.room + ' ' + x); }
    }
    out.push('end mode=' + G.mode + ' t=' + G.time.toFixed(1));
    return out;
  }, { mode, seed: +opt('seed', 1), every: +opt('every', 2), from: +opt('from', 0), to: +opt('to', 600), expr: opt('expr', 'st.state') });
  console.log(lines.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
