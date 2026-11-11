#!/usr/bin/env node
// Traces a World 31 level played by the computer: node tools/w31/trace.js <mode|name> [--secs=60] [--every=2] [--solo] [--expr="..."]
// Prints G.time, room and a summary of both players every --every simulated seconds (and any page errors).
// --expr is a JS expression evaluated in the page with st = G.mst, printed each line.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const args = process.argv.slice(2), lv = args.find(a => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(({ lv, solo }) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === lv || l.name === lv || l.mode === lv);
    G.manual = true; G.cpuOn = solo ? [false, true] : [true, true]; P.loadLevel(i);
  }, { lv, solo: args.includes('--solo') });
  const secs = +opt('secs', 60), every = +opt('every', 2), expr = opt('expr', '');
  for (let t = 0; t < secs; t += every) {
    const r = await page.evaluate(({ n, expr }) => {
      const P = window.__pipbo, G = P.G;
      for (let k = 0; k < n && G.mode === 'play'; k++) P.step(P.DT);
      const st = G.mst;
      let x = '';
      try { x = expr ? JSON.stringify(eval(expr)) : ''; } catch (e) { x = 'ERR ' + e.message; }
      return { mode: G.mode, time: G.time.toFixed(1), room: G.room, x };
    }, { n: Math.round(every * 120), expr });
    console.log(r.time, r.mode, 'room', r.room, r.x);
    if (r.mode !== 'play') break;
  }
  if (errs.length) console.log('errors:', errs.slice(0, 5));
  await browser.close();
})();
