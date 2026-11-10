#!/usr/bin/env node
// Debug helper for era 'moon': jumps to the era and evaluates an expression in the page.
//   node tools/w30/moon-dbg.js "<js expression using P, G, st, ph>" [seconds to simulate first with the computer pair]
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.MODES && window.__pipbo.MODES.timethief);
  const r = await page.evaluate(({ expr, secs }) => {
    const P = window.__pipbo, G = P.G, TT = P.MODES.timethief.test;
    G.manual = true; G.cpuOn = [true, true];
    TT.jump(7, { seed: 1 });
    const st = G.mst;
    for (let i = 0; i < secs * 120 && !st.cut; i++) P.step(P.DT);
    const ph = st.ph;
    try { return JSON.stringify(eval(expr)); } catch (e) { return 'ERR ' + e.stack; }
  }, { expr: process.argv[2] || 'ph.mode', secs: +(process.argv[3] || 0) });
  console.log(r);
  if (errs.length) console.log('PAGE MESSAGES:\n' + [...new Set(errs)].slice(0, 12).join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
