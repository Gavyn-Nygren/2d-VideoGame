#!/usr/bin/env node
// A/B frame cost of 30-1 The Time Thief per era (art pass, Nov 2026): tools/polish/perf-ab.js only sees era 1.
//   node tools/w30/era-perf-ab.js <treeA> <treeB> [eras, e.g. 2,3,4]  -> era, median ms (render + flush) at 10 s and 40 s
'use strict';
const path = require('path'); const { chromium } = require('playwright');
const [A, B, sel] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const open = async root => { const p = await b.newPage({ viewport: { width: 1280, height: 760 } }); await p.goto('file://' + path.resolve(root, 'index.html')); await p.waitForFunction(() => window.__pipbo && document.fonts.status === 'loaded'); return p; };
  const pa = await open(A), pb = await open(B);
  const eras = sel ? sel.split(',').map(Number) : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const measure = (p, era) => p.evaluate(async era => {
    const P = window.__pipbo, G = P.G;
    document.getElementById('overlay').classList.add('hidden'); G.manual = true;
    P.MODES.timethief.test.jump(era, { seed: 5 }); G.cpuOn = [true, true];
    const out = []; let sim = 0;
    for (const t of [10, 40]) {
      const n = Math.round((t - sim) / P.DT); for (let k = 0; k < n && G.mode === 'play'; k++) P.step(P.DT); sim = t;
      const c = document.getElementById('game').getContext('2d');
      for (let k = 0; k < 6; k++) { render(1 / 60); c.getImageData(0, 0, 1, 1); }
      const ts = []; for (let k = 0; k < 25; k++) { const t0 = performance.now(); render(1 / 60); c.getImageData(0, 0, 1, 1); ts.push(performance.now() - t0); }
      ts.sort((a, b) => a - b); out.push(ts[12]);
    }
    return out;
  }, era);
  for (const e of eras) {
    const ra = await measure(pa, e), rb = await measure(pb, e), f = r => r.map(x => x.toFixed(1).padStart(5)).join(' ');
    console.log('era ' + e, 'A', f(ra), '  B', f(rb), '  +' + Math.max(rb[0] - ra[0], rb[1] - ra[1]).toFixed(1));
  }
  await b.close();
})();
