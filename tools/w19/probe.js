#!/usr/bin/env node
// Debug helper for the art pass: loads a level (and room), runs a JS snippet in the page and prints its result.
// Usage: node tools/w19/probe.js <code> <room 1..> "<js returning a value; G, P in scope>"
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const [code, room, js] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  page.on('pageerror', e => console.log('ERR', String(e.message)));
  await page.goto('file://' + path.join(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate(({ code, room, js }) => {
    const P = window.__pipbo, G = P.G;
    const i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === code);
    G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i); for (let n = 1; n < +room; n++) P.nextRoom(); G.introT = 0;
    for (let k = 0; k < 30; k++) P.step(P.DT);
    return JSON.stringify((new Function('G', 'P', js))(G, P));
  }, { code, room, js });
  console.log(r);
  await browser.close();
})();
