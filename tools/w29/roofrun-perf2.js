'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(__dirname, '../../index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const r = await page.evaluate(() => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'roofrun'), K = NINJA;
    G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i);
    for (let n = 0; n < 120 * 50; n++) P.step(P.DT);
    const c = document.getElementById('game').getContext('2d'), M = P.MODES.roofrun, st = G.mst, out = {};
    const time = (name, f) => { const t0 = performance.now(); for (let n = 0; n < 200; n++) { f(); c.getImageData(0, 0, 1, 1); } out[name] = +((performance.now() - t0) / 200).toFixed(2); };
    time('flush only', () => {});
    time('sky', () => K.sky(st.cam.x, 1, { moonX: 700, moonY: 132, moonR: 58 }));
    time('skyline', () => K.skyline(st.cam.x, { y: 446 }));
    time('town', () => K.town(st.cam.x, { y: 492 }));
    time('draw', () => M.draw());
    time('drawTop', () => M.drawTop());
    time('hud', () => M.hud());
    time('render', () => render());
    const names = ['roof', 'lantern', 'hayCart', 'rope', 'ninja', 'hook'];
    for (const nm of names) { const f = K[nm]; let tot = 0, cnt = 0; K[nm] = function () { const t0 = performance.now(); const v = f.apply(this, arguments); tot += performance.now() - t0; cnt++; return v; }; for (let n = 0; n < 100; n++) render(); K[nm] = f; out[nm + ' (unflushed, per frame)'] = +(tot / 100).toFixed(3) + ' x' + cnt / 100; }
    return out;
  });
  console.log(r);
  await browser.close();
})();
