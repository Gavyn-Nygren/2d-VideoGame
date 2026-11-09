// node tools/w28/shot.js <levelCode> <seconds> [out.png] [--hold=right] : loads a level, steps with simple input, screenshots
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const [code, secs, out] = process.argv.slice(2);
  const hold = (process.argv.find(a => a.startsWith('--hold=')) || '--hold=').slice(7);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('file://' + path.resolve(__dirname, '..', '..', 'index.html'));
  await page.waitForFunction(() => window.__pipbo && window.__pipbo.G);
  const room = +((process.argv.find(a => a.startsWith('--room=')) || '--room=0').slice(7));
  await page.evaluate(r => { window.__room = r; }, room);
  const r = await page.evaluate(({ code, secs, hold }) => {
    const P = window.__pipbo, G = P.G;
    const i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === code);
    G.manual = true; if (hold === 'cpu') G.cpuOn = [true, true]; P.loadLevel(i);
    if (window.__room) for (let r = 0; r < window.__room; r++) P.nextRoom();
    const n = Math.round(+secs / P.DT);
    for (let k = 0; k < n; k++) {
      if (hold !== 'cpu') for (const p of G.players) { p.input.right = hold.includes('right'); }
      P.step(P.DT);
      if (G.mode !== 'play') break;
    }
    return { i, mode: G.mode, time: G.time, room: G.room, px: G.players.map(p => [Math.round(p.x), Math.round(p.y), p.alive]), cam: G.mst.camX, b: G.mst.b && { x: Math.round(G.mst.b.x), st: G.mst.b.state } };
  }, { code, secs, hold });
  await page.waitForTimeout(300);
  if (out) await page.locator('#game').screenshot({ path: out });
  console.log(JSON.stringify(r)); if (errs.length) console.log(errs.slice(0, 8).join('\n'));
  await browser.close();
})();
