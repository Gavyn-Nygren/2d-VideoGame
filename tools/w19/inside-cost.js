// node tools/w19/inside-cost.js <tree> <code:room> <fn,fn> [t]  -> ms per frame spent inside each named global drawing function, in any room (median of 5 batches of 30 frames)
const path = require('path'); const { chromium } = require(require.resolve('playwright', { paths: [process.cwd()] }));
const [tree, cr, fns, tt] = process.argv.slice(2); const [code, room] = cr.split(':');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 760 } });
  await p.goto('file://' + path.resolve(tree, 'index.html')); await p.waitForFunction(() => window.__pipbo && document.fonts.status === 'loaded');
  const r = await p.evaluate(([code, room, names, at]) => {
    const P = window.__pipbo, G = P.G, i = P.LEVELS.findIndex((l, k) => P.levelCode(k) === code);
    document.getElementById('overlay').classList.add('hidden'); G.manual = true; G.cpuOn = [true, true]; P.loadLevel(i); for (let n = 1; n < room; n++) P.nextRoom(); G.introT = 0;
    const n = Math.round(at / P.DT); for (let k = 0; k < n && G.mode === 'play'; k++) P.step(P.DT);
    const c = document.getElementById('game').getContext('2d'); const out = {};
    for (const nm of names) {
      const orig = (0, eval)(nm); let acc = 0;
      window.__w = function () { c.getImageData(0, 0, 1, 1); const t0 = performance.now(); const r = orig.apply(this, arguments); c.getImageData(0, 0, 1, 1); acc += performance.now() - t0; return r; };
      (0, eval)(nm + ' = window.__w');
      for (let k = 0; k < 6; k++) render(1 / 60);
      const bs = []; for (let q = 0; q < 5; q++) { acc = 0; for (let k = 0; k < 30; k++) render(1 / 60); bs.push(acc / 30); }
      bs.sort((a, b) => a - b); out[nm] = bs[2];
      window.__o = orig; (0, eval)(nm + ' = window.__o');
    }
    return out;
  }, [code, +room || 1, fns.split(','), +(tt || 8)]);
  console.log(path.basename(path.resolve(tree)).padEnd(14), cr, JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, +v.toFixed(2)]))));
  await b.close();
})();
