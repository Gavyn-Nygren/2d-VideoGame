#!/usr/bin/env node
// World 39: plays a team level with a computer pair and, every time a stat counter in --watch goes up, prints the last
// second of the level (sampled every --every s) using --expr (st = G.mst, pl = the plan).
// (--watch=all prints the last 400 samples at the end)
// node tools/w39/trace.js <mode> --watch=tumbles,spills --expr="..." [--seed=1] [--max=400] [--every=0.1]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const mode = args.find(a => !a.startsWith('--'));
const watch = opt('watch', 'tumbles').split(','), expr = opt('expr', 'JSON.stringify(st.stats)'), seed = +opt('seed', 1), maxT = +opt('max', 400), every = +opt('every', 0.1);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('ERR', String(e)));
  await page.addInitScript(() => {
    const gen = s => () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    let r = gen(1); window.__seed = n => { r = gen((n >>> 0) || 1); }; Math.random = () => r();
  });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const lines = await page.evaluate(({ mode, watch, expr, seed, maxT, every }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === mode);
    window.__seed(seed * 7919);
    G.manual = true; G.cpuOn = [true, true]; P.CPU.skillOf = ['normal', 'normal'];
    P.loadLevel(i);
    const out = [], hist = [], last = {};
    let n = 0;
    const steps = Math.round(maxT / P.DT), every_n = Math.max(1, Math.round(every / P.DT));
    while (n < steps && G.mode === 'play') {
      P.step(P.DT); n++;
      const st = G.mst; if (!st.stats) continue;
      if (n % every_n === 0) { let pl = null; try { pl = P.MODES[mode].plan ? P.MODES[mode].plan(st) : null; } catch (e) {} let x; try { x = eval(expr); } catch (e) { x = 'ERR ' + e.message; } hist.push('  t=' + (n * P.DT).toFixed(2) + ' ' + x); if (hist.length > (watch[0] === 'all' ? 400 : Math.round(1.2 / every))) hist.shift(); }
      for (const w of watch) { const v = st.stats[w]; if (last[w] !== undefined && v > last[w]) { out.push('== ' + w + ' -> ' + v + ' at t=' + (n * P.DT).toFixed(2) + ' room ' + G.room); out.push(...hist); } last[w] = v; }
    }
    if (watch[0] === 'all') out.push(...hist);
    out.push('end: ' + G.mode + ' t=' + (n * P.DT).toFixed(1) + ' ' + JSON.stringify(G.mst.stats));
    return out;
  }, { mode, watch, expr, seed, maxT, every });
  console.log(lines.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
