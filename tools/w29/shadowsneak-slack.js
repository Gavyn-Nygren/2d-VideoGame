#!/usr/bin/env node
// Shadow Sneak: how long does each "Go now!" window stay open? node tools/w29/shadowsneak-slack.js
// A computer pair plays, but the sneaker is held back in its hiding spot for --hold seconds (default 0) every time the
// way opens. Prints, per hop, how long the plan said the way would stay open when it first said go.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(a.indexOf('=') + 1) : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const out = await page.evaluate(({ maxT, hold }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'shadowsneak'), log = [];
    G.manual = true; G.cpuOn = [true, true];
    let was = false, heldT = 0;
    P.CPU.filter = (p, o, dt) => { const st = G.mst; if (p.id !== st.sneak) return o; const sp = P.MODES.shadowsneak.plan(st).sneak; if (sp.mode === 'go' && sp.safe && st.sn.hidden && sp.left != null) { heldT += dt; if (heldT < hold) return {}; } else if (st.sn.hidden) heldT = 0; return o; };
    P.loadLevel(i);
    for (let n = 0; n < maxT * 120 && G.mode === 'play'; n++) {
      P.step(P.DT);
      const st = G.mst; if (!st.P) continue;
      const sp = P.MODES.shadowsneak.plan(st).sneak, go = sp.mode === 'go' && sp.safe && sp.left != null;
      if (go && !was) log.push(G.time.toFixed(1) + ' stretch ' + (G.room + 1) + ' post ' + (st.P.k + 1) + ' from ' + Math.round(st.sn.x - st.P.x0) + ' to ' + Math.round(sp.tx - st.P.x0) + ': open for ' + sp.left.toFixed(1) + ' s');
      was = go;
    }
    log.push('END ' + G.mode + ' ' + G.time.toFixed(1) + ' ' + JSON.stringify(G.mst.stats));
    return log;
  }, { maxT: +opt('max', 600), hold: +opt('hold', 0) });
  console.log(out.join('\n')); if (errs.length) console.log('ERRORS', errs.slice(0, 3));
  await browser.close();
})();
