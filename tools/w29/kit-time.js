#!/usr/bin/env node
// Times the World 29 kit painters (ms per call, headless Chromium): node tools/w29/kit-time.js
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const res = await page.evaluate(() => {
    /* global NINJA, ctx, W, H */
    const P = window.__pipbo; P.G.manual = true; P.loadLevel(0);
    const K = NINJA, t = 1.3, out = {};
    const time = (name, fn) => { ctx.getImageData(0, 0, 1, 1); const t0 = performance.now(); for (let i = 0; i < 60; i++) fn(i); ctx.getImageData(0, 0, 1, 1); out[name] = +((performance.now() - t0) / 60).toFixed(2); };
    time('sky', i => K.sky(i * 30, t)); time('skyline', i => K.skyline(i * 30)); time('town', i => K.town(i * 30));
    time('roof x3', () => { K.roof(20, 300, 250); K.roof(420, 340, 200); K.roof(700, 280, 240); });
    time('wall', () => K.wall(100, 330, 300, 200)); time('ground stone', () => K.ground(0, W, 440, 'stone'));
    time('bamboo', () => K.bamboo(700, 520, 230, t, 3)); time('stall', () => K.stall(330, 540, 120)); time('lanterns x6', () => K.lanterns(100, 100, 500, 100, 6, t));
    time('dojo', () => K.dojo(t)); time('tatami', () => K.ground(0, W, 440, 'tatami', H));
    time('ninja x2', () => { K.ninja(0, 300, 400, { pose: 'run' }); K.ninja(1, 400, 400, { pose: 'sword' }); });
    time('guard x4 + cone', () => { for (let k = 0; k < 4; k++) { K.cone(100 + k * 200, 380, 0, 150, 0.4); K.guard(100 + k * 200, 400, { state: 'patrol', lantern: true }); } });
    time('shuriken x12', () => { for (let k = 0; k < 12; k++) K.shuriken(60 + k * 70, 300, 11, k, { id: k % 2, trail: 0 }); });
    time('hayCart + gong', () => { K.hayCart(300, 500); K.gong(600, 400, 30, { hit: 0.5 }); });
    return out;
  });
  console.log(res);
  await browser.close();
})();
