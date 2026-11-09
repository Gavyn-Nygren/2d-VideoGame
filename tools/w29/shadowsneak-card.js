const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: +process.argv[2] || 1100, height: +process.argv[3] || 640 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file:///home/user/2d-videogame/index.html'); await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  await page.evaluate(() => { const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex(l => l.mode === 'shadowsneak'); G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i); for (let r = 0; r < 3; r++) { G.introT = 0; P.nextRoom(); } G.time = 150; for (let k = 0; k < 120 * 90 && G.mode === 'play'; k++) P.step(P.DT); G.manual = false; });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: '/home/user/2d-videogame/build/w29/ss-card.png' });
  console.log(errs); await b.close();
})();
